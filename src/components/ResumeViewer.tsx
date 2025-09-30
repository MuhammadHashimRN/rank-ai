import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Download, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface ResumeViewerProps {
  filePath: string;
  fileName: string;
  onClose: () => void;
}

export const ResumeViewer = ({ filePath, fileName, onClose }: ResumeViewerProps) => {
  const [fileUrl, setFileUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getFileUrl = async () => {
      const { data } = await supabase.storage
        .from("resumes")
        .createSignedUrl(filePath, 3600); // 1 hour expiry
      
      if (data?.signedUrl) {
        setFileUrl(data.signedUrl);
      }
      setLoading(false);
    };

    getFileUrl();
  }, [filePath]);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    link.click();
  };

  return (
    <Card className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold truncate flex-1">{fileName}</h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={handleDownload} title="Download">
            <Download className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => window.open(fileUrl, '_blank')}
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <iframe
          src={fileUrl}
          className="w-full flex-1 border rounded-lg"
          title={fileName}
        />
      )}
    </Card>
  );
};