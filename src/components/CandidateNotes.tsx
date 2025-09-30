import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Note {
  id: string;
  note: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface CandidateNotesProps {
  resumeId: string;
}

export const CandidateNotes = ({ resumeId }: CandidateNotesProps) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    loadNotes();
    getCurrentUser();
  }, [resumeId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadNotes = async () => {
    const { data, error } = await supabase
      .from("candidate_notes")
      .select("*")
      .eq("resume_id", resumeId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading notes:", error);
    } else {
      setNotes(data || []);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("You must be logged in to add notes");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("candidate_notes")
      .insert({
        resume_id: resumeId,
        user_id: user.id,
        note: newNote.trim()
      });

    if (error) {
      toast.error("Failed to add note");
      console.error("Error adding note:", error);
    } else {
      toast.success("Note added successfully");
      setNewNote("");
      loadNotes();
    }
    setLoading(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    const { error } = await supabase
      .from("candidate_notes")
      .delete()
      .eq("id", noteId);

    if (error) {
      toast.error("Failed to delete note");
      console.error("Error deleting note:", error);
    } else {
      toast.success("Note deleted");
      loadNotes();
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5" />
        <h3 className="font-semibold">Notes & Comments</h3>
      </div>

      <div className="space-y-4">
        <div>
          <Textarea
            placeholder="Add a note about this candidate..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="mb-2"
          />
          <Button onClick={handleAddNote} disabled={loading || !newNote.trim()}>
            Add Note
          </Button>
        </div>

        <div className="space-y-3">
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes yet</p>
          ) : (
            notes.map((note) => (
              <Card key={note.id} className="p-3">
                <div className="flex justify-between items-start gap-2">
                  <p className="text-sm flex-1">{note.note}</p>
                  {note.user_id === currentUserId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteNote(note.id)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(note.created_at).toLocaleString()}
                </p>
              </Card>
            ))
          )}
        </div>
      </div>
    </Card>
  );
};