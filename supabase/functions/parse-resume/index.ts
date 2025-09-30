import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { extractText } from "https://esm.sh/unpdf@0.11.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filePath, fileName, fileType } = await req.json();
    console.log("Parsing resume:", fileName, "Type:", fileType);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Required environment variables not configured");
    }

    // Create Supabase client with service role to download file
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("resumes")
      .download(filePath);

    if (downloadError) {
      console.error("Error downloading file:", downloadError);
      throw new Error("Failed to download file from storage");
    }

    console.log("File downloaded, size:", fileData.size);

    // Extract text from the file based on type
    let textContent = "";
    
    if (fileType === "application/pdf") {
      console.log("Extracting text from PDF using unpdf...");
      const arrayBuffer = await fileData.arrayBuffer();
      const { text } = await extractText(new Uint8Array(arrayBuffer), { mergePages: true });
      textContent = text;
      console.log("PDF text extracted, length:", textContent.length);
    } else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      console.log("Processing DOCX file...");
      // For DOCX, we'll use mammoth
      const arrayBuffer = await fileData.arrayBuffer();
      const mammoth = await import("https://esm.sh/mammoth@1.8.0");
      const result = await mammoth.extractRawText({ arrayBuffer });
      textContent = result.value;
      console.log("DOCX text extracted, length:", textContent.length);
    } else {
      // For plain text files
      textContent = await fileData.text();
      console.log("Plain text extracted, length:", textContent.length);
    }

    if (!textContent || textContent.trim().length < 10) {
      throw new Error("Could not extract meaningful text from the file");
    }

    // Call Lovable AI Gateway with Gemini Flash
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
            content: `You are an expert resume parser. Extract structured information from the document and return ONLY valid JSON.
            
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

CRITICAL INSTRUCTIONS:
- Extract ALL information present in the resume/document
- For experience: count the TOTAL years based on all work/internship/project dates. If student with no work experience, set to 0.
- For skills: extract ALL technical and soft skills mentioned anywhere in the document
- For education: include ALL degrees, even if in progress or currently enrolled
- Be thorough - do not return null/empty values if information exists
- Look carefully for: name (usually at top), email addresses, phone numbers, university names, job titles, technologies, programming languages
- Check the ENTIRE document including: summary, experience section, projects, education, skills section

Return ONLY the JSON object, no markdown formatting, no explanations.`
          },
          {
            role: "user",
            content: `Parse this resume (${fileName}) and extract ALL available information. Be thorough and check every section.

Resume content:
${textContent}`
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
      
      throw new Error(`AI Gateway error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI response received, length:", content.length);

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
