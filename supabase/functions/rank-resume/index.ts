import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resume, job } = await req.json();
    console.log("Ranking resume for job:", job.title);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Step 1: Rule-based filtering
    let ruleScore = 0;
    const penalties = [];
    
    // Check experience
    const candidateExp = resume.parsed_experience || 0;
    const requiredExp = job.required_experience || 0;
    
    if (candidateExp >= requiredExp) {
      ruleScore += 30;
    } else {
      const diff = requiredExp - candidateExp;
      penalties.push(`${diff} years less experience than required`);
      ruleScore += Math.max(0, 30 - (diff * 5));
    }

    // Check skills match
    const candidateSkills = (resume.parsed_skills || []).map((s: string) => s.toLowerCase());
    const requiredSkills = (job.required_skills || []).map((s: string) => s.toLowerCase());
    
    const matchedSkills = requiredSkills.filter((rs: string) => 
      candidateSkills.some((cs: string) => cs.includes(rs) || rs.includes(cs))
    );
    
    const skillMatchPercentage = requiredSkills.length > 0 
      ? (matchedSkills.length / requiredSkills.length) * 40
      : 20;
    
    ruleScore += skillMatchPercentage;
    
    if (matchedSkills.length < requiredSkills.length) {
      const missing = requiredSkills.filter((rs: string) => !matchedSkills.includes(rs));
      penalties.push(`Missing skills: ${missing.join(", ")}`);
    }

    // Step 2: AI-based semantic matching
    const aiPrompt = `You are an expert recruiter. Analyze the semantic match between this candidate and job.

Job: ${job.title}
Description: ${job.description}
Required Skills: ${requiredSkills.join(", ")}

Candidate:
Name: ${resume.parsed_name}
Skills: ${candidateSkills.join(", ")}
Experience: ${candidateExp} years
Education: ${JSON.stringify(resume.parsed_education)}

Rate the semantic fit on a scale of 0-30 points. Consider:
- Transferable skills
- Industry relevance
- Career trajectory
- Education alignment

Return ONLY a JSON object:
{
  "aiScore": <number 0-30>,
  "reasoning": "<brief explanation>"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert recruiter. Return only valid JSON." },
          { role: "user", content: aiPrompt }
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

    const cleanContent = content.trim().replace(/```json\n?|\n?```/g, "");
    const aiResult = JSON.parse(cleanContent);

    // Calculate final score
    const finalScore = Math.min(100, Math.round(ruleScore + (aiResult.aiScore || 0)));

    // Build explanation
    const explanation = `
**Overall Score: ${finalScore}/100**

**Rule-Based Analysis (${Math.round(ruleScore)}/70):**
- Experience Match: ${candidateExp >= requiredExp ? '✓' : '✗'} (${candidateExp} vs ${requiredExp} years required)
- Skills Match: ${matchedSkills.length}/${requiredSkills.length} required skills
${penalties.length > 0 ? '\n**Issues:**\n' + penalties.map(p => `- ${p}`).join('\n') : ''}

**AI Semantic Analysis (${Math.round(aiResult.aiScore || 0)}/30):**
${aiResult.reasoning}

**Matched Skills:** ${matchedSkills.join(", ") || "None"}
${matchedSkills.length < requiredSkills.length ? `\n**Missing Skills:** ${requiredSkills.filter((rs: string) => !matchedSkills.includes(rs)).join(", ")}` : ''}
    `.trim();

    console.log("Ranking complete. Score:", finalScore);

    return new Response(
      JSON.stringify({ 
        score: finalScore,
        explanation,
        matchedSkills: matchedSkills.length,
        totalSkills: requiredSkills.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in rank-resume:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to rank resume";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});