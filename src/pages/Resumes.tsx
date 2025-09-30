import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, ArrowLeft, Loader2, Sparkles, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface Job {
  id: string;
  title: string;
}

interface UploadStatus {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  score?: number;
}

const Resumes = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [uploading, setUploading] = useState(false);

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
    const selectedFiles = Array.from(e.target.files || []);
    
    // Validate file types and sizes
    const validFiles: File[] = [];
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    
    for (const file of selectedFiles) {
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name}: Invalid file type. Please upload PDF, DOC, DOCX, or TXT`);
        continue;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: File too large (max 10MB)`);
        continue;
      }
      
      validFiles.push(file);
    }
    
    setFiles(validFiles);
    setUploadStatuses(validFiles.map(file => ({
      file,
      status: 'pending',
      progress: 0
    })));
  };

  const uploadSingleResume = async (file: File, index: number): Promise<void> => {
    try {
      setUploadStatuses(prev => prev.map((status, i) => 
        i === index ? { ...status, status: 'uploading', progress: 10 } : status
      ));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload file to storage
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      setUploadStatuses(prev => prev.map((status, i) => 
        i === index ? { ...status, progress: 20 } : status
      ));

      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setUploadStatuses(prev => prev.map((status, i) => 
        i === index ? { ...status, progress: 40 } : status
      ));

      // Parse resume
      const { data: parseData, error: parseError } = await supabase.functions.invoke("parse-resume", {
        body: { 
          filePath: fileName,
          fileName: file.name,
          fileType: file.type 
        }
      });

      if (parseError) throw parseError;

      const parsed = parseData.parsedData;
      
      setUploadStatuses(prev => prev.map((status, i) => 
        i === index ? { ...status, progress: 60 } : status
      ));

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

      setUploadStatuses(prev => prev.map((status, i) => 
        i === index ? { ...status, progress: 80 } : status
      ));

      // Get job details and rank
      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", selectedJob)
        .single();

      if (jobError) throw jobError;

      const { data: rankData, error: rankError } = await supabase.functions.invoke("rank-resume", {
        body: { 
          resume: resumeData,
          job: jobData
        }
      });

      if (rankError) throw rankError;

      // Update with score
      await supabase
        .from("resumes")
        .update({ ranking_score: rankData.score })
        .eq("id", resumeData.id);

      await supabase.from("ranking_logs").insert({
        resume_id: resumeData.id,
        job_id: selectedJob,
        score: rankData.score,
        explanation: rankData.explanation
      });

      setUploadStatuses(prev => prev.map((status, i) => 
        i === index ? { ...status, status: 'success', progress: 100, score: rankData.score } : status
      ));

    } catch (error: any) {
      console.error(`Error uploading ${file.name}:`, error);
      setUploadStatuses(prev => prev.map((status, i) => 
        i === index ? { ...status, status: 'error', error: error.message || "Upload failed" } : status
      ));
    }
  };

  const handleBatchUpload = async () => {
    if (files.length === 0 || !selectedJob) {
      toast.error("Please select files and a job");
      return;
    }

    setUploading(true);

    // Upload files sequentially to avoid rate limits
    for (let i = 0; i < files.length; i++) {
      await uploadSingleResume(files[i], i);
    }

    const successCount = uploadStatuses.filter(s => s.status === 'success').length;
    const errorCount = uploadStatuses.filter(s => s.status === 'error').length;

    toast.success(`Uploaded ${successCount} resume(s) successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
    setUploading(false);

    if (successCount > 0) {
      setTimeout(() => navigate("/rankings"), 2000);
    }
  };

  const getStatusIcon = (status: UploadStatus['status']) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'error': return <XCircle className="h-5 w-5 text-destructive" />;
      case 'uploading': return <Loader2 className="h-5 w-5 animate-spin" />;
      default: return <Clock className="h-5 w-5 text-muted-foreground" />;
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
        <Card className="max-w-3xl mx-auto p-8">
          <div className="text-center mb-8">
            <div className="bg-accent/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-accent" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Batch Resume Upload</h2>
            <p className="text-muted-foreground">
              Upload multiple resumes at once for AI-powered parsing and ranking
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Job Position
              </label>
              <Select value={selectedJob} onValueChange={setSelectedJob} required disabled={uploading}>
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
                Upload Resume Files
              </label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <Input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.txt"
                  multiple
                  disabled={uploading}
                  className="cursor-pointer"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  PDF, DOC, DOCX, or TXT (max 10MB each)
                </p>
                {files.length > 0 && (
                  <p className="text-sm font-medium text-primary mt-2">
                    {files.length} file(s) selected
                  </p>
                )}
              </div>
            </div>

            {uploadStatuses.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Upload Progress</h3>
                <div className="space-y-3">
                  {uploadStatuses.map((status, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      {getStatusIcon(status.status)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{status.file.name}</span>
                          {status.score && (
                            <span className="text-sm font-bold text-success">Score: {status.score}</span>
                          )}
                        </div>
                        {status.status === 'uploading' && (
                          <Progress value={status.progress} className="h-2" />
                        )}
                        {status.error && (
                          <p className="text-xs text-destructive">{status.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Button 
              onClick={handleBatchUpload}
              className="w-full" 
              size="lg"
              disabled={uploading || files.length === 0 || !selectedJob || jobs.length === 0}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing {uploadStatuses.filter(s => s.status === 'success').length + 1} / {files.length}...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Upload & Rank {files.length} Resume{files.length !== 1 ? 's' : ''} with AI
                </>
              )}
            </Button>

            <div className="bg-primary/10 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Batch Upload Features:
              </p>
              <ul className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Upload multiple resumes simultaneously</li>
                <li>Real-time progress tracking per file</li>
                <li>AI parsing and ranking for each resume</li>
                <li>Automatic error handling and reporting</li>
              </ul>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Resumes;