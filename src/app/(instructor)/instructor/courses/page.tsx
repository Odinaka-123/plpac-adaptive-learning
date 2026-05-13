"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { createCourse, getInstructorCourses } from "@/lib/firestore";
import { Course } from "@/types";
import {
  GraduationCap,
  Plus,
  BookOpen,
  Layers,
  Clock,
  X,
  Loader2,
  LogOut,
  BarChart3,
  Users,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function InstructorCoursesPage() {
  const { user, loading, clearUser } = useAuthStore();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", description: "" });

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && user.role !== "instructor") router.replace("/dashboard");
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === "instructor") {
      getInstructorCourses(user.uid)
        .then(setCourses)
        .finally(() => setFetching(false));
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut(auth);
    clearUser();
    router.replace("/login");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCreating(true);
    setError("");
    try {
      const id = await createCourse({
        title: form.title,
        description: form.description,
        instructorId: user.uid,
        topics: [],
      });
      router.push(`/instructor/courses/${id}`);
    } catch {
      setError("Failed to create course. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const navItems = [
    { icon: BarChart3, label: "Overview", href: "/instructor/courses", active: true },
    { icon: Users, label: "Analytics", href: "/instructor/analytics", active: false },
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
            <h1 className="text-2xl font-bold text-white">My courses</h1>
            <p className="text-slate-500 text-sm mt-1">
              Create and manage your adaptive courses
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={16} />
            New course
          </button>
        </div>

        {fetching ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
              <BookOpen size={28} className="text-purple-400" />
            </div>
            <p className="text-white font-semibold text-lg">No courses yet</p>
            <p className="text-slate-500 text-sm mt-2 max-w-sm">
              Create your first adaptive course and start helping students learn smarter.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus size={15} />
              Create first course
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {courses.map((course) => (
              <div
                key={course.id}
                onClick={() => router.push(`/instructor/courses/${course.id}`)}
                className="bg-white/5 border border-white/10 hover:border-purple-500/30 rounded-2xl p-6 cursor-pointer transition-all hover:bg-white/[0.07] group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
                  <BookOpen size={18} className="text-purple-400" />
                </div>
                <h3 className="text-white font-semibold mb-2 group-hover:text-purple-300 transition-colors">
                  {course.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-2">
                  {course.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <Layers size={11} />
                    {course.topics?.length ?? 0} topics
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    Adaptive
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create course modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-[#111118] border border-white/10 rounded-2xl p-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-bold text-lg">Create new course</h2>
              <button
                onClick={() => { setShowModal(false); setError(""); }}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">
                  Course title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Introduction to Data Structures"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  required
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">
                  Description
                </label>
                <textarea
                  placeholder="What will students learn in this course?"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  required
                  rows={4}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-purple-500 transition-colors resize-none"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setError(""); }}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {creating && <Loader2 size={14} className="animate-spin" />}
                  {creating ? "Creating..." : "Create course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}