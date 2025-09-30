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

    let textContent: string;

    // Extract text based on file type
    if (fileType === "application/pdf") {
      try {
        // Use pdf-parse from npm via esm.sh for PDF extraction
        const pdfParse = (await import("https://esm.sh/pdf-parse@1.1.1")).default;
        const arrayBuffer = await fileData.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const pdfData = await pdfParse(uint8Array);
        textContent = pdfData.text;
        console.log("PDF text extracted, length:", textContent.length, "pages:", pdfData.numpages);
      } catch (pdfError) {
        console.error("PDF extraction error:", pdfError);
        throw new Error("Failed to extract text from PDF. The file may be encrypted or corrupted.");
      }
    } else if (fileType === "text/plain") {
      textContent = await fileData.text();
    } else if (
      fileType === "application/msword" ||
      fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      try {
        // For .docx files, use mammoth
        if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          const mammoth = await import("https://esm.sh/mammoth@1.8.0");
          const arrayBuffer = await fileData.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          textContent = result.value;
          console.log("DOCX text extracted, length:", textContent.length);
        } else {
          // For .doc files, try to read as text (limited support)
          textContent = await fileData.text();
          console.log("DOC file read as text, length:", textContent.length);
        }
      } catch (docError) {
        console.error("Word document extraction error:", docError);
        throw new Error("Failed to extract text from Word document");
      }
    } else {
      textContent = await fileData.text();
    }

    if (!textContent || textContent.trim().length < 50) {
      console.warn("Extracted text is too short or empty. Preview:", textContent?.substring(0, 200));
      throw new Error("Could not extract readable text from the document. Please ensure the file is not corrupted, encrypted, or password-protected.");
    }

    console.log("Content preview (first 500 chars):", textContent.substring(0, 500));

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

CRITICAL INSTRUCTIONS:
- Extract ALL information present in the resume
- For experience: count the TOTAL years based on all work/internship/project dates. If they are a student with no work experience, set to 0.
- For skills: extract ALL technical and soft skills mentioned anywhere in the resume
- For education: include ALL degrees, even if currently enrolled or in progress
- Be thorough - do not return null/empty values if information clearly exists in the text
- Look carefully for: name (usually at top), email addresses, phone numbers, university names, job titles, programming languages, frameworks, tools
- Check the ENTIRE document including: summary, experience section, projects, education, skills section

Return ONLY the JSON object, no markdown formatting, no explanations.`
          },
          {
            role: "user",
            content: `Parse this resume thoroughly and extract ALL available information:\n\n${textContent}`
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
