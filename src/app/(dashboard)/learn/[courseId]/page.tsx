"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import {
  getCourse,
  getCourseTopics,
  getUserProgress,
  saveQuizSession,
} from "@/lib/firestore";
import { Course, Topic, LearnerProgress } from "@/types";
import {
  BookOpen, ChevronLeft, Brain, CheckCircle2,
  Lock, GraduationCap, BarChart3, TrendingUp,
  User, LogOut, Zap, Layers,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function CourseDetailPage() {
  const { user, loading, clearUser } = useAuthStore();
  const router = useRouter();
  const { courseId } = useParams<{ courseId: string }>();

  const [course, setCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, LearnerProgress>>({});
  const [fetching, setFetching] = useState(true);
  const [startingQuiz, setStartingQuiz] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !courseId) return;
    Promise.all([
      getCourse(courseId),
      getCourseTopics(courseId),
      getUserProgress(user.uid),
    ]).then(([c, t, progress]) => {
      setCourse(c);
      setTopics(t);
      // Build a map of topicId -> progress for quick lookup
      const map: Record<string, LearnerProgress> = {};
      progress.forEach((p) => { map[p.topicId] = p; });
      setProgressMap(map);
    }).finally(() => setFetching(false));
  }, [user, courseId]);

  const handleSignOut = async () => {
    await signOut(auth);
    clearUser();
    router.replace("/login");
  };

  /** Unlocked if no prerequisites OR all prerequisites mastered */
  const isUnlocked = (topic: Topic) => {
    if (!topic.prerequisiteIds?.length) return true;
    return topic.prerequisiteIds.every(
      (pid) => progressMap[pid]?.mastered === true
    );
  };

  const handleStartQuiz = async (topic: Topic) => {
    if (!user) return;
    setStartingQuiz(topic.id);
    try {
      // Create a session doc, then navigate with topicId__courseId__sessionId
      const sessionId = await saveQuizSession({
        uid: user.uid,
        topicId: topic.id,
        courseId,
        questions: [],
        answers: {},
        currentIndex: 0,
        score: 0,
        completed: false,
        startedAt: new Date(),
      });
      router.push(`/quiz/${topic.id}__${courseId}__${sessionId}`);
    } finally {
      setStartingQuiz(null);
    }
  };

  const navItems = [
    { icon: BarChart3, label: "Dashboard", href: "/dashboard" },
    { icon: BookOpen, label: "My courses", href: "/learn", active: true },
    { icon: TrendingUp, label: "Progress", href: "/progress" },
    { icon: User, label: "Profile", href: "/profile" },
  ];

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Sidebar */}
      <aside className="w-60 border-r border-white/5 flex flex-col py-6 px-4 fixed h-full">
        <div className="flex items-center gap-2 px-2 mb-8">
          <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center">
            <GraduationCap size={14} className="text-white" />
          </div>
          <span className="font-bold text-white text-sm tracking-tight">PLPAC</span>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map(({ icon: Icon, label, href, active }) => (
            <button
              key={label}
              onClick={() => router.push(href)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full text-left ${
                active
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500/20"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
        <div className="border-t border-white/5 pt-4 mt-4">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-purple-600/30 border border-purple-500/30 flex items-center justify-center text-purple-300 text-xs font-bold">
              {user.displayName?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user.displayName}</p>
              <p className="text-slate-500 text-xs truncate">{user.role}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors text-sm w-full"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-60 p-8">
        <button
          onClick={() => router.push("/learn")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mb-6 transition-colors"
        >
          <ChevronLeft size={16} /> Back to courses
        </button>

        {fetching ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Course header */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <Brain size={22} className="text-purple-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white mb-1">{course?.title}</h1>
                  <p className="text-slate-400 text-sm leading-relaxed">{course?.description}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Layers size={11} /> {topics.length} topics
                    </span>
                    <span className="text-slate-700">·</span>
                    <span className="text-xs text-slate-500">Adaptive difficulty</span>
                    <span className="text-slate-700">·</span>
                    <span className="text-xs bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                      Free
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Topics */}
            <h2 className="text-white font-semibold mb-4">Course topics</h2>

            {topics.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
                  <BookOpen size={24} className="text-purple-400" />
                </div>
                <p className="text-white font-semibold">No topics yet</p>
                <p className="text-slate-500 text-sm mt-1">
                  The instructor hasn't added topics yet.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {topics.map((topic, idx) => {
                  const unlocked = isUnlocked(topic);
                  const progress = progressMap[topic.id];
                  const mastery = progress?.masteryScore ?? null;
                  const mastered = progress?.mastered ?? false;
                  const isStarting = startingQuiz === topic.id;

                  return (
                    <div
                      key={topic.id}
                      className={`bg-white/5 border rounded-2xl p-5 transition-all ${
                        unlocked ? "border-white/10 hover:border-purple-500/20" : "border-white/5 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Index / status icon */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                          mastered
                            ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                            : unlocked
                            ? "bg-purple-500/10 border border-purple-500/20 text-purple-400"
                            : "bg-white/5 border border-white/10 text-slate-600"
                        }`}>
                          {mastered ? <CheckCircle2 size={16} /> : !unlocked ? <Lock size={14} /> : idx + 1}
                        </div>

                        {/* Title + mastery bar */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white text-sm font-medium">{topic.title}</span>
                            {mastered && (
                              <span className="text-xs border px-2 py-0.5 rounded-full bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                                Mastered
                              </span>
                            )}
                            {!mastered && mastery !== null && (
                              <span className="text-xs border px-2 py-0.5 rounded-full bg-yellow-500/10 border-yellow-500/20 text-yellow-400">
                                {mastery}% mastery
                              </span>
                            )}
                            {!unlocked && (
                              <span className="text-xs border px-2 py-0.5 rounded-full bg-slate-500/10 border-slate-500/20 text-slate-500">
                                Complete previous topic first
                              </span>
                            )}
                          </div>
                          {mastery !== null && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-purple-500 rounded-full transition-all"
                                  style={{ width: `${mastery}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-600">{mastery}%</span>
                            </div>
                          )}
                        </div>

                        {/* Quiz button */}
                        {unlocked && (
                          <button
                            onClick={() => handleStartQuiz(topic)}
                            disabled={isStarting}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors shrink-0"
                          >
                            {isStarting ? (
                              <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <Zap size={13} />
                            )}
                            {mastery !== null ? "Retake quiz" : "Start quiz"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}