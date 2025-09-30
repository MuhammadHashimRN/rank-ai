import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface Resume {
  id: string;
  parsed_name: string;
  parsed_email: string;
  parsed_phone: string;
  parsed_skills: string[];
  parsed_experience: number;
  ranking_score: number;
}

interface ExportButtonProps {
  resumes: Resume[];
  jobTitle: string;
}

export const ExportButton = ({ resumes, jobTitle }: ExportButtonProps) => {
  const handleExport = () => {
    if (resumes.length === 0) {
      toast.error("No candidates to export");
      return;
    }

    // Create CSV content
    const headers = ["Rank", "Name", "Email", "Phone", "Experience (years)", "Top Skills", "Score"];
    const rows = resumes.map((resume, idx) => [
      idx + 1,
      resume.parsed_name || "N/A",
      resume.parsed_email || "N/A",
      resume.parsed_phone || "N/A",
      resume.parsed_experience || 0,
      resume.parsed_skills.slice(0, 5).join("; "),
      resume.ranking_score
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${jobTitle.replace(/\s+/g, "_")}_Rankings_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    toast.success("Rankings exported successfully");
  };

  return (
    <Button onClick={handleExport} variant="outline" className="gap-2">
      <Download className="h-4 w-4" />
      Export CSV
    </Button>
  );
};