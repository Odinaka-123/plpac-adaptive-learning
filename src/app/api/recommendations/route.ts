import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface RecommendationRequest {
  learningStyle: string;
  weakTopics: Array<{ title: string; masteryScore: number; attempts: number }>;
  masteredTopics: Array<{ title: string }>;
  recentSessions: Array<{ topicTitle: string; score: number }>;
  xp: number;
  streak: number;
}

export async function POST(req: NextRequest) {
  try {
    const body: RecommendationRequest = await req.json();
    const { learningStyle, weakTopics, masteredTopics, recentSessions, xp, streak } = body;

    const styleDescriptions: Record<string, string> = {
      visual: "visual learner (learns best through diagrams, charts, and spatial representations)",
      auditory: "auditory learner (learns best through discussion, verbal explanation, and listening)",
      reading: "reading/writing learner (learns best through written materials, notes, and text)",
      kinesthetic: "kinesthetic learner (learns best through hands-on practice and real-world application)",
    };

    const styleDesc = styleDescriptions[learningStyle] ?? `${learningStyle} learner`;

    const weakSection =
      weakTopics.length > 0
        ? `Struggling with (lowest mastery first):\n${weakTopics
            .map(
              (t) =>
                `  - "${t.title}": ${Math.round(t.masteryScore * 100)}% mastery after ${t.attempts} attempt${t.attempts !== 1 ? "s" : ""}`
            )
            .join("\n")}`
        : "No weak topics identified yet — student is doing well overall.";

    const masteredSection =
      masteredTopics.length > 0
        ? `Already mastered: ${masteredTopics.map((t) => `"${t.title}"`).join(", ")}`
        : "No topics fully mastered yet.";

    const recentSection =
      recentSessions.length > 0
        ? `Recent quiz scores:\n${recentSessions
            .slice(0, 3)
            .map((s) => `  - "${s.topicTitle}": ${Math.round(s.score)}%`)
            .join("\n")}`
        : "No recent quiz activity.";

    const prompt = `You are an expert adaptive learning coach. Generate exactly 3 personalised, actionable learning recommendations.

Student profile:
- Learning style: ${styleDesc}
- XP: ${xp}, Current streak: ${streak} day${streak !== 1 ? "s" : ""}
- ${weakSection}
- ${masteredSection}
- ${recentSection}

Rules:
1. Each recommendation must be 1–2 sentences, specific and immediately actionable
2. Tailor each suggestion to the student's learning style — mention the style-appropriate approach explicitly
3. If there are weak topics, prioritise them; otherwise suggest advancement or challenge topics
4. Be encouraging but concrete — avoid generic advice like "practice more"
5. Return ONLY a valid JSON array of exactly 3 strings. No markdown, no preamble, no explanation.

Example format: ["Recommendation one.", "Recommendation two.", "Recommendation three."]`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("") ?? "";

    const clean = text.replace(/```json|```/g, "").trim();
    const recommendations: string[] = JSON.parse(clean);

    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      throw new Error("Invalid response shape from Claude");
    }

    return NextResponse.json({ recommendations });
  } catch (err) {
    console.error("[recommendations] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}