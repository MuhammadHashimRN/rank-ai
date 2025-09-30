import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { TrendingUp, TrendingDown, Minus, ArrowLeft, Mail, Phone, Briefcase, Trash2, Star, FileText, Filter, Search } from "lucide-react";
import { toast } from "sonner";
import { ResumeViewer } from "@/components/ResumeViewer";
import { CandidateNotes } from "@/components/CandidateNotes";
import { ExportButton } from "@/components/ExportButton";

interface Job {
  id: string;
  title: string;
}

interface Resume {
  id: string;
  parsed_name: string;
  parsed_email: string;
  parsed_phone: string;
  parsed_skills: string[];
  parsed_experience: number;
  ranking_score: number;
  created_at: string;
  file_path: string;
  file_name: string;
}

interface RankingLog {
  explanation: string;
}

const Rankings = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [allResumes, setAllResumes] = useState<Resume[]>([]);
  const [filteredResumes, setFilteredResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [rankingLog, setRankingLog] = useState<RankingLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [scoreRange, setScoreRange] = useState([0, 100]);
  const [minExperience, setMinExperience] = useState(0);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    checkAuth();
    loadJobs();
    loadFavorites();
  }, []);

  useEffect(() => {
    if (selectedJob) {
      loadResumes();
    }
  }, [selectedJob]);

  useEffect(() => {
    applyFilters();
  }, [allResumes, searchQuery, scoreRange, minExperience, selectedSkills, showFavoritesOnly, favorites]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJobs(data || []);
      
      if (data && data.length > 0) {
        setSelectedJob(data[0].id);
      }
    } catch (error) {
      console.error("Error loading jobs:", error);
    }
  };

  const loadResumes = async () => {
    if (!selectedJob) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("resumes")
        .select("*")
        .eq("linked_job_id", selectedJob)
        .order("ranking_score", { ascending: false, nullsFirst: false });

      if (error) throw error;
      setAllResumes(data || []);
    } catch (error) {
      console.error("Error loading resumes:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("candidate_favorites")
      .select("resume_id")
      .eq("user_id", user.id);

    if (!error && data) {
      setFavorites(new Set(data.map(f => f.resume_id)));
    }
  };

  const applyFilters = () => {
    let filtered = [...allResumes];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.parsed_name?.toLowerCase().includes(query) ||
        r.parsed_email?.toLowerCase().includes(query) ||
        r.parsed_skills.some(s => s.toLowerCase().includes(query))
      );
    }

    // Score range filter
    filtered = filtered.filter(r =>
      r.ranking_score >= scoreRange[0] && r.ranking_score <= scoreRange[1]
    );

    // Experience filter
    filtered = filtered.filter(r =>
      (r.parsed_experience || 0) >= minExperience
    );

    // Skills filter
    if (selectedSkills.length > 0) {
      filtered = filtered.filter(r =>
        selectedSkills.some(skill =>
          r.parsed_skills.map(s => s.toLowerCase()).includes(skill.toLowerCase())
        )
      );
    }

    // Favorites filter
    if (showFavoritesOnly) {
      filtered = filtered.filter(r => favorites.has(r.id));
    }

    setFilteredResumes(filtered);
  };

  const loadRankingDetails = async (resume: Resume) => {
    try {
      const { data, error } = await supabase
        .from("ranking_logs")
        .select("explanation")
        .eq("resume_id", resume.id)
        .eq("job_id", selectedJob)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      setRankingLog(data);
      setSelectedResume(resume);
    } catch (error) {
      console.error("Error loading ranking details:", error);
    }
  };

  const toggleFavorite = async (resumeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const isFavorited = favorites.has(resumeId);

    if (isFavorited) {
      await supabase
        .from("candidate_favorites")
        .delete()
        .eq("resume_id", resumeId)
        .eq("user_id", user.id);
      
      setFavorites(prev => {
        const next = new Set(prev);
        next.delete(resumeId);
        return next;
      });
    } else {
      await supabase
        .from("candidate_favorites")
        .insert({ resume_id: resumeId, user_id: user.id });
      
      setFavorites(prev => new Set(prev).add(resumeId));
    }
  };

  const handleDelete = async (resumeId: string, resumeName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete ${resumeName}'s resume?`)) return;

    try {
      const { error: logsError } = await supabase
        .from("ranking_logs")
        .delete()
        .eq("resume_id", resumeId);

      if (logsError) throw logsError;

      const { error: resumeError } = await supabase
        .from("resumes")
        .delete()
        .eq("id", resumeId);

      if (resumeError) throw resumeError;

      toast.success("Candidate deleted successfully!");
      
      if (selectedResume?.id === resumeId) {
        setSelectedResume(null);
        setRankingLog(null);
      }
      
      loadResumes();
    } catch (error) {
      console.error("Error deleting candidate:", error);
      toast.error("Failed to delete candidate");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return TrendingUp;
    if (score >= 60) return Minus;
    return TrendingDown;
  };

  const allSkills = Array.from(new Set(allResumes.flatMap(r => r.parsed_skills)));
  const selectedJobTitle = jobs.find(j => j.id === selectedJob)?.title || "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Candidate Rankings</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={showFavoritesOnly ? "bg-primary text-primary-foreground" : ""}
            >
              <Star className="h-4 w-4" fill={showFavoritesOnly ? "currentColor" : "none"} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="flex gap-4 mb-6">
          <Card className="flex-1 p-6">
            <label className="block text-sm font-medium mb-2">Select Job Position</label>
            <Select value={selectedJob} onValueChange={setSelectedJob}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a job..." />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>
          <div className="flex items-end">
            <ExportButton resumes={filteredResumes} jobTitle={selectedJobTitle} />
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="p-6 mb-6 animate-fade-in">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Advanced Filters
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Name, email, or skills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Score Range: {scoreRange[0]}-{scoreRange[1]}
                </label>
                <Slider
                  value={scoreRange}
                  onValueChange={setScoreRange}
                  min={0}
                  max={100}
                  step={5}
                  className="mt-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Min Experience: {minExperience} years
                </label>
                <Slider
                  value={[minExperience]}
                  onValueChange={([val]) => setMinExperience(val)}
                  min={0}
                  max={20}
                  step={1}
                  className="mt-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Filter by Skill</label>
                <Select 
                  value={selectedSkills[0] || ""} 
                  onValueChange={(val) => setSelectedSkills(val ? [val] : [])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All skills" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All skills</SelectItem>
                    {allSkills.slice(0, 20).map((skill) => (
                      <SelectItem key={skill} value={skill}>
                        {skill}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setScoreRange([0, 100]);
                  setMinExperience(0);
                  setSelectedSkills([]);
                }}
              >
                Clear Filters
              </Button>
              <div className="text-sm text-muted-foreground flex items-center">
                Showing {filteredResumes.length} of {allResumes.length} candidates
              </div>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredResumes.length === 0 ? (
          <Card className="p-12 text-center">
            <Briefcase className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">
              {allResumes.length === 0 ? "No candidates yet" : "No candidates match filters"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {allResumes.length === 0 
                ? "Upload resumes to see AI-powered rankings"
                : "Try adjusting your filters"
              }
            </p>
            {allResumes.length === 0 && (
              <Button onClick={() => navigate("/resumes")}>Upload Resume</Button>
            )}
          </Card>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Candidates ({filteredResumes.length})</h2>
              {filteredResumes.map((resume, idx) => {
                const ScoreIcon = getScoreIcon(resume.ranking_score);
                const isFavorited = favorites.has(resume.id);
                return (
                  <Card
                    key={resume.id}
                    className={`p-6 cursor-pointer transition-all hover:shadow-elegant ${
                      selectedResume?.id === resume.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => loadRankingDetails(resume)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center font-bold text-primary">
                          #{idx + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{resume.parsed_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {resume.parsed_experience} years exp
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right mr-2">
                          <div className={`text-2xl font-bold flex items-center gap-1 ${getScoreColor(resume.ranking_score)}`}>
                            <ScoreIcon className="h-6 w-6" />
                            {resume.ranking_score}
                          </div>
                          <p className="text-xs text-muted-foreground">Match Score</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => toggleFavorite(resume.id, e)}
                          className="hover:bg-yellow-100 dark:hover:bg-yellow-900/20"
                        >
                          <Star className="h-4 w-4" fill={isFavorited ? "currentColor" : "none"} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDelete(resume.id, resume.parsed_name, e)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {resume.parsed_email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{resume.parsed_email}</span>
                        </div>
                      )}
                      {resume.parsed_phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{resume.parsed_phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {resume.parsed_skills.slice(0, 5).map((skill, idx) => (
                        <Badge key={idx} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                      {resume.parsed_skills.length > 5 && (
                        <Badge variant="outline">+{resume.parsed_skills.length - 5}</Badge>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="lg:sticky lg:top-24 h-fit space-y-4">
              {selectedResume && rankingLog ? (
                <>
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold">Ranking Explanation</h2>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowViewer(!showViewer)}
                        className="gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        {showViewer ? "Hide" : "View"} Resume
                      </Button>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap font-sans text-sm">
                        {rankingLog.explanation}
                      </pre>
                    </div>
                  </Card>

                  {showViewer && (
                    <ResumeViewer
                      filePath={selectedResume.file_path}
                      fileName={selectedResume.file_name}
                      onClose={() => setShowViewer(false)}
                    />
                  )}

                  <CandidateNotes resumeId={selectedResume.id} />
                </>
              ) : (
                <Card className="p-12 text-center">
                  <TrendingUp className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Select a candidate to view detailed AI ranking analysis
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Rankings;