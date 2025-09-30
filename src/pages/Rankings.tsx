import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, ArrowLeft, Mail, Phone, Briefcase, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
}

interface RankingLog {
  explanation: string;
}

const Rankings = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<string | null>(null);
  const [rankingLog, setRankingLog] = useState<RankingLog | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAuth();
    loadJobs();
  }, []);

  useEffect(() => {
    if (selectedJob) {
      loadResumes();
    }
  }, [selectedJob]);

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
      setResumes(data || []);
    } catch (error) {
      console.error("Error loading resumes:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadRankingDetails = async (resumeId: string) => {
    try {
      const { data, error } = await supabase
        .from("ranking_logs")
        .select("explanation")
        .eq("resume_id", resumeId)
        .eq("job_id", selectedJob)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      setRankingLog(data);
      setSelectedResume(resumeId);
    } catch (error) {
      console.error("Error loading ranking details:", error);
    }
  };

  const handleDelete = async (resumeId: string, resumeName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click event
    
    if (!confirm(`Are you sure you want to delete ${resumeName}'s resume?`)) return;

    try {
      // Delete ranking logs first (foreign key constraint)
      await supabase
        .from("ranking_logs")
        .delete()
        .eq("resume_id", resumeId);

      // Delete the resume
      const { error } = await supabase
        .from("resumes")
        .delete()
        .eq("id", resumeId);

      if (error) throw error;

      toast.success("Candidate deleted successfully!");
      
      // Clear selected resume if it was the deleted one
      if (selectedResume === resumeId) {
        setSelectedResume(null);
        setRankingLog(null);
      }
      
      // Reload the resumes list
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Candidate Rankings</h1>
          <div className="w-24" />
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Card className="p-6 mb-6">
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

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : resumes.length === 0 ? (
          <Card className="p-12 text-center">
            <Briefcase className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No candidates yet</h3>
            <p className="text-muted-foreground mb-6">Upload resumes to see AI-powered rankings</p>
            <Button onClick={() => navigate("/resumes")}>Upload Resume</Button>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Candidates ({resumes.length})</h2>
              {resumes.map((resume, idx) => {
                const ScoreIcon = getScoreIcon(resume.ranking_score);
                return (
                  <Card
                    key={resume.id}
                    className={`p-6 cursor-pointer transition-all hover:shadow-elegant ${
                      selectedResume === resume.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => loadRankingDetails(resume.id)}
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
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className={`text-2xl font-bold flex items-center gap-1 ${getScoreColor(resume.ranking_score)}`}>
                            <ScoreIcon className="h-6 w-6" />
                            {resume.ranking_score}
                          </div>
                          <p className="text-xs text-muted-foreground">Match Score</p>
                        </div>
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

            <div className="lg:sticky lg:top-24 h-fit">
              {selectedResume && rankingLog ? (
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Ranking Explanation</h2>
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm">
                      {rankingLog.explanation}
                    </pre>
                  </div>
                </Card>
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