import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { transcripts } = req.body;
    if (!transcripts || typeof transcripts !== "string") {
      return res.status(400).json({ error: "Missing transcript text." });
    }

    const client = getGeminiClient();

    const prompt = `
You are a professional Content Creator and AI Producer. You are given a full transcript of a screen recording / video tutorial.
Your job is to read this transcript and generate a highly polished package of digital assets for this recording:

1. A catchy, clickable, and SEO-friendly Video Title (provide 3 options).
2. A structured video description (including a professional introduction, a bulleted list of key highlights, and social media hashtags).
3. A sequence of Timeline Chapters (with timestamps if available, or approximate thematic milestones, e.g., [00:00] Introduction, [01:15] Demo, etc.) based on the content flow.

Here is the full transcript:
---
${transcripts}
---

Provide the result as a styled JSON object conforming to this structure:
{
  "titles": ["Option 1", "Option 2", "Option 3"],
  "description": "Engaging description...",
  "chapters": [
    { "timestamp": "00:00", "title": "Introduction" },
    ...
  ]
}
`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titles: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            description: { type: Type.STRING },
            chapters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  timestamp: { type: Type.STRING },
                  title: { type: Type.STRING }
                },
                required: ["timestamp", "title"]
              }
            }
          },
          required: ["titles", "description", "chapters"]
        }
      }
    });

    const text = response.text || "{}";
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Error generating summary:", error);
    res.status(500).json({ error: error.message || "Failed to generate video bundle" });
  }
}
