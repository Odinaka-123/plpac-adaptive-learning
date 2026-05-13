"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getUserProgress, getUserSessions, getCourseTopics, getCourses } from "@/lib/firestore";
import { LearnerProgress, QuizSession, Topic, Course } from "@/types";
import Sidebar from "@/components/dashboard/Sidebar";
import {
  TrendingUp, Brain, Trophy, Clock, CheckCircle2,
  XCircle, BookOpen, Zap, ChevronRight,
} from "lucide-react";

interface EnrichedProgress extends LearnerProgress {
  topicTitle: string;
  courseTitle: string;
  courseId: string;
}

export default function ProgressPage() {
  const { user, loading } = useAuthStore();
  const router = useRouter();

  const [progress, setProgress] = useState<EnrichedProgress[]>([]);
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [topicMap, setTopicMap] = useState<Record<string, string>>({});
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    Promise.all([
      getUserProgress(user.uid),
      getUserSessions(user.uid),
      getCourses(),
    ]).then(async ([rawProgress, rawSessions, courses]) => {
      setSessions(rawSessions);

      const tMap: Record<string, { title: string; courseId: string }> = {};
      await Promise.all(
        courses.map(async (course: Course) => {
          const topics = await getCourseTopics(course.id);
          topics.forEach((t: Topic) => {
            tMap[t.id] = { title: t.title, courseId: course.id };
          });
        })
      );

      const courseMap: Record<string, string> = {};
      courses.forEach((c: Course) => { courseMap[c.id] = c.title; });

      // flat topicId → title map for session enrichment
      const flatTopicMap: Record<string, string> = {};
      Object.entries(tMap).forEach(([id, val]) => { flatTopicMap[id] = val.title; });
      setTopicMap(flatTopicMap);

      const enriched: EnrichedProgress[] = rawProgress.map((p) => ({
        ...p,
        topicTitle: tMap[p.topicId]?.title ?? "Unknown topic",
        courseId: tMap[p.topicId]?.courseId ?? "",
        courseTitle: courseMap[tMap[p.topicId]?.courseId ?? ""] ?? "Unknown course",
      }));

      enriched.sort((a, b) => {
        if (a.mastered !== b.mastered) return a.mastered ? 1 : -1;
        return b.masteryScore - a.masteryScore;
      });

      setProgress(enriched);
    }).finally(() => setFetching(false));
  }, [user]);

  const mastered = progress.filter((p) => p.mastered).length;
  const inProgress = progress.filter((p) => !p.mastered && p.masteryScore > 0).length;
  const totalSessions = sessions.length;
  const avgScore =
    sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + (s.score ?? 0), 0) / sessions.length)
      : 0;

  const stats = [
    { label: "Topics mastered", value: mastered, icon: Trophy, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    { label: "In progress", value: inProgress, icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    { label: "Quizzes taken", value: totalSessions, icon: Brain, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
    { label: "Avg score", value: `${avgScore}%`, icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  ];

  const getMasteryColor = (score: number) => {
    if (score >= 70) return "bg-emerald-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  const getMasteryLabel = (p: EnrichedProgress) => {
    if (p.mastered) return { text: "Mastered", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" };
    if (p.masteryScore >= 40) return { text: "Learning", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" };
    return { text: "Needs work", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" };
  };

  const formatDate = (val: any) => {
    if (!val) return "—";
    const d = val?.toDate ? val.toDate() : new Date(val);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      <Sidebar />

      <main className="flex-1 ml-60 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Your progress</h1>
          <p className="text-slate-500 text-sm mt-1">
            Track your mastery across all topics and courses
          </p>
        </div>

        {fetching ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {stats.map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className={`rounded-2xl border p-5 ${bg} flex flex-col gap-3`}>
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                    <Icon size={18} className={color} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{value}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-white font-semibold mb-5">Topic mastery</h2>

                {progress.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3">
                      <BookOpen size={20} className="text-purple-400" />
                    </div>
                    <p className="text-slate-400 text-sm font-medium">No progress yet</p>
                    <p className="text-slate-600 text-xs mt-1">Take a quiz to start tracking your mastery</p>
                    <button
                      onClick={() => router.push("/learn")}
                      className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-xl transition-colors"
                    >
                      Browse courses
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {progress.map((p) => {
                      const label = getMasteryLabel(p);
                      return (
                        <div key={p.topicId} className="bg-white/5 border border-white/5 rounded-xl p-4">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-white text-sm font-medium truncate">
                                  {p.topicTitle}
                                </span>
                                <span className={`text-xs border px-2 py-0.5 rounded-full shrink-0 ${label.bg} ${label.color}`}>
                                  {label.text}
                                </span>
                              </div>
                              <p className="text-slate-600 text-xs mt-0.5">{p.courseTitle}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-white font-bold text-sm">{p.masteryScore}%</span>
                              <button
                                onClick={() => router.push(`/learn/${p.courseId}`)}
                                className="text-purple-400 hover:text-purple-300 transition-colors"
                              >
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${getMasteryColor(p.masteryScore)}`}
                              style={{ width: `${p.masteryScore}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-slate-600 text-xs">{p.attempts} attempt{p.attempts !== 1 ? "s" : ""}</span>
                            <span className="text-slate-600 text-xs">{formatDate(p.lastAttemptAt)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-white font-semibold mb-5">Recent quizzes</h2>

                {sessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-3">
                      <Clock size={20} className="text-teal-400" />
                    </div>
                    <p className="text-slate-400 text-sm font-medium">No quizzes yet</p>
                    <p className="text-slate-600 text-xs mt-1">Completed quizzes appear here</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {sessions.slice(0, 8).map((s) => {
                      const passed = (s.score ?? 0) >= 70;
                      return (
                        <div key={s.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            passed ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"
                          }`}>
                            {passed
                              ? <CheckCircle2 size={14} className="text-emerald-400" />
                              : <XCircle size={14} className="text-red-400" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-medium truncate">
                              {topicMap[s.topicId] ?? "Quiz"}
                            </p>
                            <p className="text-slate-600 text-xs">{formatDate(s.startedAt)}</p>
                          </div>
                          <span className={`text-xs font-bold shrink-0 ${passed ? "text-emerald-400" : "text-red-400"}`}>
                            {s.score ?? 0}%
                          </span>
                        </div>
                      );
                    })}
                    {sessions.length > 8 && (
                      <p className="text-slate-600 text-xs text-center pt-1">
                        +{sessions.length - 8} more sessions
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}