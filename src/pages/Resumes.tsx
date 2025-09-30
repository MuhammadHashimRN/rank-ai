import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Upload, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Job {
  id: string;
  title: string;
}

const Resumes = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    checkAuth();
    loadJobs();
  }, []);

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
    } catch (error) {
      console.error("Error loading jobs:", error);
      toast.error("Failed to load jobs");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      if (!validTypes.includes(selectedFile.type)) {
        toast.error("Please upload a PDF, DOC, DOCX, or TXT file");
        return;
      }
      
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !selectedJob) {
      toast.error("Please select a file and job");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload file to storage
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Read file as base64 for better parsing of PDFs and Word docs
      const arrayBuffer = await file.arrayBuffer();
      const base64Content = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Call parse-resume edge function
      const { data: parseData, error: parseError } = await supabase.functions.invoke("parse-resume", {
        body: { 
          fileContent: base64Content, 
          fileName: file.name,
          fileType: file.type 
        }
      });

      if (parseError) throw parseError;

      const parsed = parseData.parsedData;

      // Insert resume into database
      const { data: resumeData, error: insertError } = await supabase
        .from("resumes")
        .insert({
          file_path: fileName,
          file_name: file.name,
          parsed_name: parsed.name,
          parsed_email: parsed.email,
          parsed_phone: parsed.phone,
          parsed_education: parsed.education,
          parsed_skills: parsed.skills,
          parsed_experience: parsed.experience,
          parsed_certifications: parsed.certifications,
          parsed_projects: parsed.projects,
          linked_job_id: selectedJob,
          uploaded_by: user.id
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Get job details for ranking
      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", selectedJob)
        .single();

      if (jobError) throw jobError;

      // Call rank-resume edge function
      toast.info("Ranking candidate with AI...");
      
      const { data: rankData, error: rankError } = await supabase.functions.invoke("rank-resume", {
        body: { 
          resume: resumeData,
          job: jobData
        }
      });

      if (rankError) throw rankError;

      // Update resume with ranking score
      await supabase
        .from("resumes")
        .update({ ranking_score: rankData.score })
        .eq("id", resumeData.id);

      // Insert ranking log
      await supabase.from("ranking_logs").insert({
        resume_id: resumeData.id,
        job_id: selectedJob,
        score: rankData.score,
        explanation: rankData.explanation
      });

      toast.success(`Resume uploaded and ranked! Score: ${rankData.score}/100`);
      setIsOpen(false);
      setFile(null);
      setSelectedJob("");
      navigate("/rankings");
      
    } catch (error: any) {
      console.error("Error uploading resume:", error);
      toast.error(error.message || "Failed to upload resume");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Resume Upload</h1>
          <div className="w-24" />
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Card className="max-w-2xl mx-auto p-8">
          <div className="text-center mb-8">
            <div className="bg-accent/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-accent" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Upload Resume</h2>
            <p className="text-muted-foreground">
              Upload a candidate's resume for AI-powered parsing and ranking
            </p>
          </div>

          <form onSubmit={handleUpload} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Job Position
              </label>
              <Select value={selectedJob} onValueChange={setSelectedJob} required>
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
              {jobs.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  No jobs available. <button type="button" onClick={() => navigate("/jobs")} className="text-primary hover:underline">Create one first</button>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Upload Resume File
              </label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <Input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.txt"
                  required
                  className="cursor-pointer"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  PDF, DOC, DOCX, or TXT (max 10MB)
                </p>
                {file && (
                  <p className="text-sm font-medium text-primary mt-2">
                    Selected: {file.name}
                  </p>
                )}
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={loading || !file || !selectedJob || jobs.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing with AI...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Upload & Rank with AI
                </>
              )}
            </Button>

            <div className="bg-primary/10 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                How it works:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Resume is securely uploaded to Supabase Storage</li>
                <li>AI (Gemini 2.5 Flash) extracts structured data</li>
                <li>Hybrid ranking: rule-based + semantic AI analysis</li>
                <li>Score and detailed explanation generated</li>
              </ol>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
};

export default Resumes;