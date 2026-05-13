import Link from "next/link";
import {
  Brain,
  BarChart3,
  Crosshair,
  Sparkles,
  ArrowRight,
  GraduationCap,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Adaptive content",
    desc: "Difficulty adjusts in real time based on your performance",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
  },
  {
    icon: BarChart3,
    title: "Mastery tracking",
    desc: "Advance only when you truly understand the material",
    color: "text-teal-400",
    bg: "bg-teal-500/10 border-teal-500/20",
  },
  {
    icon: Crosshair,
    title: "Personalised paths",
    desc: "AI recommends your next best learning step",
    color: "text-pink-400",
    bg: "bg-pink-500/10 border-pink-500/20",
  },
];

const stats = [
  { value: "28%", label: "improvement in learning outcomes" },
  { value: "42%", label: "higher course completion rates" },
  { value: "250+", label: "students tested in pilot study" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
            <GraduationCap size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">PLPAC</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-sm bg-purple-600 hover:bg-purple-500 transition-colors px-4 py-2 rounded-lg font-medium"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-4 pt-28 pb-20">
        <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5 mb-8">
          <Sparkles size={13} className="text-purple-400" />
          <span className="text-purple-300 text-xs font-medium">
            AI-powered adaptive education
          </span>
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold leading-tight max-w-3xl mb-6">
          Learning that adapts{" "}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-pink-400">
            to you
          </span>
        </h1>

        <p className="text-slate-400 text-lg max-w-xl mb-10 leading-relaxed">
          PLPAC uses machine learning to personalise your content, pace, and
          assessments in real time — so every learner gets exactly what they
          need.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold transition-colors"
          >
            Start learning free
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-semibold transition-colors"
          >
            Sign in to dashboard
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/5 border-y border-white/5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-[#0a0a0f] flex flex-col items-center justify-center py-10 px-6 text-center"
          >
            <span className="text-4xl font-bold text-white mb-2">{s.value}</span>
            <span className="text-slate-500 text-sm">{s.label}</span>
          </div>
        ))}
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto w-full px-6 py-24">
        <h2 className="text-2xl font-bold text-center mb-3">
          Everything your learning needs
        </h2>
        <p className="text-slate-500 text-center text-sm mb-12">
          Built for tertiary students. Powered by AI.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc, color, bg }) => (
            <div
              key={title}
              className={`rounded-2xl border p-6 ${bg} flex flex-col gap-4`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/5`}
              >
                <Icon size={20} className={color} />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/5 px-8 py-6 flex items-center justify-between text-slate-600 text-xs">
        <span>© 2025 PLPAC · Ewaleifoh Anointed Eromosele</span>
        <span>SCN/CSC/220161</span>
      </footer>
    </main>
  );
}