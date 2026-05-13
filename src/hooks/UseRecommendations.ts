import { useState, useCallback } from "react";
import { getUserProgress, getUserSessions, getCourses, getCourseTopics } from "@/lib/firestore";
import { Course, Topic } from "@/types";

export interface Recommendation {
  text: string;
}

interface UseRecommendationsReturn {
  recommendations: string[];
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
}

export function useRecommendations(
  uid: string,
  learningStyle: string | undefined,
  xp: number,
  streak: number
): UseRecommendationsReturn {
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!uid || !learningStyle) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch all data in parallel
      const [rawProgress, sessions, courses] = await Promise.all([
        getUserProgress(uid),
        getUserSessions(uid),
        getCourses(),
      ]);

      // 2. Build a topicId → title map across all courses
      const topicMap: Record<string, string> = {};
      await Promise.all(
        courses.map(async (c: Course) => {
          const topics: Topic[] = await getCourseTopics(c.id);
          topics.forEach((t) => {
            topicMap[t.id] = t.title;
          });
        })
      );

      // 3. Classify weak vs mastered topics
      const weakTopics = rawProgress
        .filter((p: any) => !p.mastered && (p.masteryScore ?? 0) < 0.7)
        .sort((a: any, b: any) => (a.masteryScore ?? 0) - (b.masteryScore ?? 0))
        .slice(0, 5)
        .map((p: any) => ({
          title: topicMap[p.topicId] ?? p.topicId,
          masteryScore: p.masteryScore ?? 0,
          attempts: p.attempts ?? 0,
        }));

      const masteredTopics = rawProgress
        .filter((p: any) => p.mastered)
        .map((p: any) => ({ title: topicMap[p.topicId] ?? p.topicId }));

      // 4. Enrich recent sessions with topic titles
      const recentSessions = sessions
        .filter((s: any) => s.completed)
        .slice(0, 5)
        .map((s: any) => ({
          topicTitle: topicMap[s.topicId] ?? s.topicId,
          score: s.score ?? 0,
        }));

      // 5. Call the server-side API route (keeps API key off the client)
      const res = await window.fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          learningStyle,
          weakTopics,
          masteredTopics,
          recentSessions,
          xp,
          streak,
        }),
      });

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      const data = await res.json();

      if (!Array.isArray(data.recommendations)) {
        throw new Error("Unexpected response shape");
      }

      setRecommendations(data.recommendations);
    } catch (err) {
      console.error("[useRecommendations]", err);
      setError("Could not load recommendations. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [uid, learningStyle, xp, streak]);

  return { recommendations, loading, error, fetch };
}