export async function processComplaintTriage(description) {
    const apiKey = import.meta.env.VITE_CLAUDE_API_KEY;
    if (!apiKey) {
        // Fallback mockup if API key is not present
        return {
            category: "Other",
            severity: "Medium",
            suggestedDepartment: "General Ward",
            estimatedSLAHours: 72,
            summary: "Extracted basic summary due to missing API key."
        };
    }

    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                "dangerously-allow-browser": "true"
            },
            body: JSON.stringify({
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 1024,
                temperature: 0,
                system: `You are an AI Triage Agent for CivicTrust, India's premier grievance platform. 
Read the complaint description and accurately classify it. 
CRITICAL RULE: You MUST return a pure JSON object without markdown formatting or code blocks.
The JSON object must match this schema exactly:
{
  "category": "Roads|Water|Sanitation|Electricity|Other",
  "severity": "Low|Medium|High|Emergency",
  "suggestedDepartment": "string",
  "estimatedSLAHours": number based on severity (Emergency:12, High:24, Medium:72, Low:168),
  "summary": "1-2 sentence maximum concise summary of the issue"
}`,
                messages: [
                    {
                        role: "user",
                        content: `Analyze this civic complaint:\n\n${description}`
                    }
                ]
            })
        });

        const data = await response.json();
        const rawJsonText = data.content[0].text;
        const parsed = JSON.parse(rawJsonText);
        return parsed;

    } catch (e) {
        console.error("Claude Triage Execution Error:", e);
        // Fallback default
        return {
            category: "Other",
            severity: "Medium",
            suggestedDepartment: "General Ward",
            estimatedSLAHours: 72,
            summary: "Failed to parse API logic."
        };
    }
}

export async function analyzeGrievance(description) {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{ role: "user", content: `Return ONLY valid JSON, no markdown: {"category":"Roads|Sanitation|Water|Electricity|Other","severity":"Low|Medium|High|Emergency","suggestedDepartment":"string","estimatedSLAHours":72,"summary":"string"}. Grievance: ${description}` }]
      })
    });
    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";
    return JSON.parse(text.replace(/```json|```/g,"").trim());
  } catch {
    return { category:"General", severity:"Medium", suggestedDepartment:"Municipal", estimatedSLAHours:72, summary:description };
  }
}
