import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";

interface SkillInputProps {
  value: string[];
  onChange: (skills: string[]) => void;
  placeholder?: string;
}

export const SkillInput = ({ value, onChange, placeholder = "Type a skill..." }: SkillInputProps) => {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!inputValue.trim()) {
        setSuggestions([]);
        return;
      }

      try {
        // Get canonical skills and synonyms that match
        const { data: synonymData } = await supabase
          .from("skill_synonyms")
          .select("canonical_skill, synonym")
          .or(`canonical_skill.ilike.%${inputValue}%,synonym.ilike.%${inputValue}%`)
          .limit(10);

        if (synonymData) {
          // Get unique canonical skills
          const canonicalSkills = new Set<string>();
          synonymData.forEach(row => {
            canonicalSkills.add(row.canonical_skill);
          });
          
          // Filter out already added skills
          const filteredSuggestions = Array.from(canonicalSkills)
            .filter(skill => !value.includes(skill));
          
          setSuggestions(filteredSuggestions);
          setShowSuggestions(filteredSuggestions.length > 0);
        }
      } catch (error) {
        console.error("Error fetching skill suggestions:", error);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [inputValue, value]);

  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue("");
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddSkill(inputValue);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeSkill = (skillToRemove: string) => {
    onChange(value.filter(s => s !== skillToRemove));
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((skill) => (
          <Badge key={skill} variant="secondary" className="gap-1">
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(skill)}
              className="ml-1 hover:bg-secondary-foreground/20 rounded-full"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setShowSuggestions(suggestions.length > 0)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder={placeholder}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md">
          <Command>
            <CommandList>
              <CommandGroup>
                {suggestions.map((suggestion) => (
                  <CommandItem
                    key={suggestion}
                    onSelect={() => handleAddSkill(suggestion)}
                    className="cursor-pointer"
                  >
                    {suggestion}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
      
      <p className="text-xs text-muted-foreground mt-1">
        Press Enter or comma to add a skill
      </p>
    </div>
  );
};
