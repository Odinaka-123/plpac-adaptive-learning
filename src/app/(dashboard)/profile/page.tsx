"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getUserProgress, getUserSessions } from "@/lib/firestore";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LearningStyle } from "@/types";
import Sidebar from "@/components/dashboard/Sidebar";
import {
  User, Brain, Zap, Eye, Headphones,
  BookOpen, Activity, Star, Flame,
  CheckCircle2, Trophy, TrendingUp, Save,
} from "lucide-react";

const learningStyles: {
  value: LearningStyle;
  label: string;
  description: string;
  icon: any;
  color: string;
  bg: string;
}[] = [
  {
    value: "visual",
    label: "Visual",
    description: "You learn best through diagrams, charts, and seeing information laid out spatially.",
    icon: Eye,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/30",
  },
  {
    value: "auditory",
    label: "Auditory",
    description: "You learn best by listening, discussing, and talking through concepts.",
    icon: Headphones,
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/30",
  },
  {
    value: "reading",
    label: "Reading / Writing",
    description: "You learn best through reading text and taking written notes.",
    icon: BookOpen,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/30",
  },
  {
    value: "kinesthetic",
    label: "Kinesthetic",
    description: "You learn best through practice, hands-on activities, and doing.",
    icon: Activity,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/30",
  },
];

export default function ProfilePage() {
  const { user, loading, updateUser } = useAuthStore();
  const router = useRouter();

  const [selectedStyle, setSelectedStyle] = useState<LearningStyle | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setSelectedStyle(user.learningStyle ?? null);
    Promise.all([
      getUserProgress(user.uid),
      getUserSessions(user.uid),
    ]).then(([progress, sessions]) => {
      setMasteredCount(progress.filter((p: any) => p.mastered).length);
      setSessionCount(sessions.length);
      setAvgScore(
        sessions.length > 0
          ? Math.round(sessions.reduce((sum: number, s: any) => sum + (s.score ?? 0), 0) / sessions.length)
          : 0
      );
    }).finally(() => setFetching(false));
  }, [user]);

  const handleSave = async () => {
    if (!user || !selectedStyle) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        learningStyle: selectedStyle,
      });
      updateUser({ learningStyle: selectedStyle });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = [
    { label: "XP earned", value: user.xp ?? 0, icon: Star, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    { label: "Day streak", value: user.streak ?? 0, icon: Flame, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
    { label: "Topics mastered", value: fetching ? "—" : masteredCount, icon: Trophy, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    { label: "Avg score", value: fetching ? "—" : `${avgScore}%`, icon: TrendingUp, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      <Sidebar />

      <main className="flex-1 ml-60 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Profile</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your learning preferences and view your stats
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="flex flex-col gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-purple-600/30 border border-purple-500/30 flex items-center justify-center text-purple-300 text-2xl font-bold mb-4">
                  {user.displayName?.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-white font-semibold text-lg">{user.displayName}</h2>
                <p className="text-slate-500 text-sm">{user.email}</p>
                <span className="mt-2 text-xs bg-purple-500/10 border border-purple-500/20 text-purple-300 px-3 py-1 rounded-full capitalize">
                  {user.role}
                </span>
                {user.learningStyle && (
                  <span className="mt-2 text-xs bg-white/5 border border-white/10 text-slate-400 px-3 py-1 rounded-full capitalize">
                    {user.learningStyle} learner
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {stats.map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className={`rounded-2xl border p-4 ${bg} flex flex-col gap-2`}>
                  <Icon size={16} className={color} />
                  <div>
                    <p className="text-xl font-bold text-white">{value}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} className="text-purple-400" />
                <span className="text-white text-sm font-medium">Quizzes taken</span>
              </div>
              <p className="text-3xl font-bold text-white">{fetching ? "—" : sessionCount}</p>
              <p className="text-slate-500 text-xs mt-1">Total quiz sessions completed</p>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Brain size={15} className="text-purple-400" />
              </div>
              <div>
                <h2 className="text-white font-semibold">Learning style</h2>
                <p className="text-slate-500 text-xs">
                  Select how you learn best — this personalises your experience
                </p>
              </div>
            </div>

            <div className="h-px bg-white/5 my-5" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {learningStyles.map(({ value, label, description, icon: Icon, color, bg }) => {
                const selected = selectedStyle === value;
                return (
                  <button
                    key={value}
                    onClick={() => setSelectedStyle(value)}
                    className={`text-left p-5 rounded-2xl border transition-all ${
                      selected
                        ? `${bg} ring-1 ring-white/20`
                        : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${selected ? bg : "bg-white/5"}`}>
                        <Icon size={17} className={selected ? color : "text-slate-500"} />
                      </div>
                      {selected && <CheckCircle2 size={16} className={color} />}
                    </div>
                    <p className={`font-semibold text-sm mb-1 ${selected ? "text-white" : "text-slate-300"}`}>
                      {label}
                    </p>
                    <p className="text-slate-500 text-xs leading-relaxed">{description}</p>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleSave}
              disabled={!selectedStyle || saving || selectedStyle === user.learningStyle}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : saved ? (
                <CheckCircle2 size={15} />
              ) : (
                <Save size={15} />
              )}
              {saved ? "Saved!" : saving ? "Saving…" : "Save preference"}
            </button>

            {user.learningStyle && selectedStyle === user.learningStyle && (
              <p className="text-slate-600 text-xs mt-3">
                Your current style is <span className="text-slate-400 capitalize">{user.learningStyle}</span>. Select a different one to update.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}