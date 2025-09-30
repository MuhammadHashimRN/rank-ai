import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileContent, fileName } = await req.json();
    console.log("Parsing resume:", fileName);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Call Lovable AI Gateway with Gemini Flash (free during promo!)
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert resume parser. Extract structured information from resumes and return ONLY valid JSON.
            
Return format:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "phone number or null",
  "education": [{"degree": "...", "institution": "...", "year": "..."}],
  "skills": ["skill1", "skill2"],
  "experience": 5,
  "certifications": ["cert1", "cert2"],
  "projects": [{"name": "...", "description": "...", "technologies": []}]
}

Return ONLY the JSON object, no markdown formatting, no explanations.`
          },
          {
            role: "user",
            content: `Parse this resume:\n\n${fileContent}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    // Clean and parse JSON response
    const cleanContent = content.trim().replace(/```json\n?|\n?```/g, "");
    const parsedData = JSON.parse(cleanContent);

    console.log("Parsed resume data:", parsedData);

    return new Response(
      JSON.stringify({ parsedData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in parse-resume:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to parse resume";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});