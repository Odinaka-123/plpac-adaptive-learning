"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import {
  getInstructorCourses,
  getCourseTopics,
  getCourseProgress,
} from "@/lib/firestore";
import { Course, Topic, LearnerProgress } from "@/types";
import {
  GraduationCap,
  BarChart3,
  Users,
  BookOpen,
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  LogOut,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const difficultyColor: Record<number, string> = {
  1: "text-green-400 bg-green-500/10 border-green-500/20",
  2: "text-teal-400 bg-teal-500/10 border-teal-500/20",
  3: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  4: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  5: "text-red-400 bg-red-500/10 border-red-500/20",
};

const difficultyLabel: Record<number, string> = {
  1: "Beginner", 2: "Easy", 3: "Intermediate", 4: "Hard", 5: "Advanced",
};

interface TopicStat {
  topic: Topic;
  courseName: string;
  courseId: string;
  totalAttempts: number;
  uniqueStudents: number;
  masteredCount: number;
  strugglingCount: number;
  avgMastery: number;
}

export default function InstructorAnalyticsPage() {
  const { user, loading, clearUser } = useAuthStore();
  const router = useRouter();

  const [stats, setStats] = useState<TopicStat[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [fetching, setFetching] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string>("all");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && user.role !== "instructor") router.replace("/dashboard");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user?.uid) return;
    async function load() {
      try {
        const allCourses = await getInstructorCourses(user!.uid);
        setCourses(allCourses);

        const topicsByCourse = await Promise.all(
          allCourses.map((c) =>
            getCourseTopics(c.id).then((topics) => ({ course: c, topics }))
          )
        );

        const allTopics: { topic: Topic; courseName: string; courseId: string }[] =
          topicsByCourse.flatMap(({ course, topics }) =>
            topics.map((t) => ({ topic: t, courseName: course.title, courseId: course.id }))
          );

        const topicIds = allTopics.map((t) => t.topic.id);
        const allProgress = await getCourseProgress(topicIds);

        const built: TopicStat[] = allTopics.map(({ topic, courseName, courseId }) => {
          const rows = allProgress.filter((p) => p.topicId === topic.id);
          const uniqueStudents = new Set(rows.map((p) => p.uid)).size;
          const masteredCount = rows.filter((p) => p.mastered).length;
          const strugglingCount = rows.filter(
            (p) => !p.mastered && p.attempts > 0 && p.masteryScore < 40
          ).length;
          const avgMastery =
            rows.length > 0
              ? Math.round(rows.reduce((a, p) => a + p.masteryScore, 0) / rows.length)
              : 0;
          const totalAttempts = rows.reduce((a, p) => a + p.attempts, 0);

          return { topic, courseName, courseId, totalAttempts, uniqueStudents, masteredCount, strugglingCount, avgMastery };
        });

        setStats(built);
      } finally {
        setFetching(false);
      }
    }
    load();
  }, [user?.uid]);

  const handleSignOut = async () => {
    await signOut(auth);
    clearUser();
    router.replace("/login");
  };

  const navItems = [
    { icon: BarChart3, label: "Overview", href: "/instructor/courses", active: false },
    { icon: Users, label: "Analytics", href: "/instructor/analytics", active: true },
  ];

  const filtered = selectedCourse === "all"
    ? stats
    : stats.filter((s) => s.courseId === selectedCourse);

  const totalMastered = filtered.reduce((a, s) => a + s.masteredCount, 0);
  const totalStruggling = filtered.reduce((a, s) => a + s.strugglingCount, 0);
  const overallAvg =
    filtered.length > 0
      ? Math.round(filtered.reduce((a, s) => a + s.avgMastery, 0) / filtered.length)
      : 0;

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Instructor Sidebar */}
      <aside className="w-60 border-r border-white/5 flex flex-col py-6 px-4 fixed h-full bg-[#0a0a0f] z-10">
        <div className="flex items-center gap-2 px-2 mb-8">
          <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center">
            <GraduationCap size={14} className="text-white" />
          </div>
          <span className="font-bold text-white text-sm tracking-tight">PLPAC</span>
          <span className="ml-auto text-xs bg-purple-500/20 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full">
            Instructor
          </span>
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
              <p className="text-slate-500 text-xs truncate">Instructor</p>
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Analytics</h1>
            <p className="text-slate-500 text-sm mt-1">
              Student progress across all your courses
            </p>
          </div>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
          >
            <option value="all" className="bg-[#111118]">All courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#111118]">{c.title}</option>
            ))}
          </select>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Topics tracked", value: filtered.length, icon: BookOpen, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
            { label: "Avg mastery", value: fetching ? "—" : `${overallAvg}%`, icon: TrendingUp, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
            { label: "Mastered", value: fetching ? "—" : totalMastered, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
            { label: "Struggling", value: fetching ? "—" : totalStruggling, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
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

        {/* Topic breakdown */}
        {fetching ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white/5 border border-white/10 rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3">
              <Brain size={20} className="text-purple-400" />
            </div>
            <p className="text-slate-400 text-sm font-medium">No data yet</p>
            <p className="text-slate-600 text-xs mt-1">
              Students need to attempt quizzes before analytics appear
            </p>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5">
              <h2 className="text-white font-semibold text-sm">
                Topic breakdown — sorted by lowest mastery first
              </h2>
            </div>
            <div className="divide-y divide-white/5">
              {filtered
                .sort((a, b) => a.avgMastery - b.avgMastery)
                .map((s) => (
                  <div key={s.topic.id} className="px-6 py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white text-sm font-medium truncate">
                          {s.topic.title}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${difficultyColor[s.topic.difficultyLevel]}`}>
                          {difficultyLabel[s.topic.difficultyLevel]}
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs truncate">{s.courseName}</p>
                    </div>

                    {/* Mastery bar */}
                    <div className="w-36 hidden md:block">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500">Avg mastery</span>
                        <span className={`text-xs font-bold ${
                          s.avgMastery >= 70 ? "text-emerald-400" :
                          s.avgMastery >= 40 ? "text-amber-400" : "text-red-400"
                        }`}>
                          {s.avgMastery}%
                        </span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            s.avgMastery >= 70 ? "bg-emerald-500" :
                            s.avgMastery >= 40 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${s.avgMastery}%` }}
                        />
                      </div>
                    </div>

                    {/* Counters */}
                    <div className="flex items-center gap-5 shrink-0">
                      <div className="text-center hidden lg:block">
                        <p className="text-white text-sm font-bold">{s.uniqueStudents}</p>
                        <p className="text-slate-600 text-xs">Students</p>
                      </div>
                      <div className="text-center hidden lg:block">
                        <p className="text-emerald-400 text-sm font-bold">{s.masteredCount}</p>
                        <p className="text-slate-600 text-xs">Mastered</p>
                      </div>
                      <div className="text-center hidden lg:block">
                        <p className="text-red-400 text-sm font-bold">{s.strugglingCount}</p>
                        <p className="text-slate-600 text-xs">Struggling</p>
                      </div>
                      <div className="text-center">
                        <p className="text-white text-sm font-bold">{s.totalAttempts}</p>
                        <p className="text-slate-600 text-xs">Attempts</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}