"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getCourse, addTopic, getCourseTopics } from "@/lib/firestore";
import { Course, Topic } from "@/types";
import { addQuizQuestion } from "@/lib/firestore";
import {
  GraduationCap,
  Plus,
  ArrowLeft,
  Layers,
  X,
  Loader2,
  Lock,
  Unlock,
} from "lucide-react";

const difficultyLabel: Record<number, string> = {
  1: "Beginner",
  2: "Easy",
  3: "Intermediate",
  4: "Hard",
  5: "Advanced",
};

const difficultyColor: Record<number, string> = {
  1: "text-green-400 bg-green-500/10 border-green-500/20",
  2: "text-teal-400 bg-teal-500/10 border-teal-500/20",
  3: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  4: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  5: "text-red-400 bg-red-500/10 border-red-500/20",
};

export default function CourseDetailPage() {
  const { user, loading } = useAuthStore();
  const router = useRouter();
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    difficultyLevel: 1 as 1 | 2 | 3 | 4 | 5,
    contentType: "text" as "text" | "video" | "quiz" | "simulation",
    masteryThreshold: 80,
  });
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [questionForm, setQuestionForm] = useState({
    question: "",
    options: ["", "", "", ""],
    correctIndex: 0,
    explanation: "",
    difficultyLevel: 1 as 1 | 2 | 3 | 4 | 5,
  });

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (courseId) {
      Promise.all([getCourse(courseId), getCourseTopics(courseId)])
        .then(([c, t]) => {
          setCourse(c);
          setTopics(t);
        })
        .finally(() => setFetching(false));
    }
  }, [courseId]);

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    setAdding(true);
    setError("");
    try {
      const id = await addTopic(courseId, {
        title: form.title,
        difficultyLevel: form.difficultyLevel,
        contentType: form.contentType,
        masteryThreshold: form.masteryThreshold,
        prerequisiteIds: [],
      });
      const newTopic: Topic = {
        id,
        courseId,
        ...form,
        prerequisiteIds: [],
      };
      setTopics((prev) => [...prev, newTopic]);
      setShowModal(false);
      setForm({
        title: "",
        difficultyLevel: 1,
        contentType: "text",
        masteryThreshold: 80,
      });
    } catch {
      setError("Failed to add topic. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopicId) return;
    setAddingQuestion(true);
    try {
      await addQuizQuestion({
        topicId: selectedTopicId,
        question: questionForm.question,
        options: questionForm.options,
        correctIndex: questionForm.correctIndex,
        explanation: questionForm.explanation,
        difficultyLevel: questionForm.difficultyLevel,
      });
      setShowQuestionModal(false);
      setQuestionForm({
        question: "",
        options: ["", "", "", ""],
        correctIndex: 0,
        explanation: "",
        difficultyLevel: 1,
      });
    } catch {
      setError("Failed to add question.");
    } finally {
      setAddingQuestion(false);
    }
  };

  if (loading || !user || fetching) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] px-8 py-8 max-w-4xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.push("/instructor/courses")}
        className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm mb-8"
      >
        <ArrowLeft size={15} />
        Back to courses
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
              <GraduationCap size={14} className="text-white" />
            </div>
            <span className="text-slate-500 text-sm">Course editor</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{course?.title}</h1>
          <p className="text-slate-500 text-sm mt-1 max-w-xl">
            {course?.description}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors shrink-0"
        >
          <Plus size={15} />
          Add topic
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total topics", value: topics.length, icon: Layers },
          {
            label: "Avg difficulty",
            value:
              topics.length ?
                (
                  topics.reduce((a, t) => a + t.difficultyLevel, 0) /
                  topics.length
                ).toFixed(1)
              : "—",
            icon: GraduationCap,
          },
          {
            label: "Content types",
            value: [...new Set(topics.map((t) => t.contentType))].length || "—",
            icon: Layers,
          },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Icon size={16} className="text-purple-400" />
            </div>
            <div>
              <p className="text-white font-bold text-lg">{value}</p>
              <p className="text-slate-500 text-xs">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Topics list */}
      <div>
        <h2 className="text-white font-semibold mb-4">
          Topics ({topics.length})
        </h2>

        {topics.length === 0 ?
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white/5 border border-white/10 rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3">
              <Layers size={20} className="text-purple-400" />
            </div>
            <p className="text-slate-400 text-sm font-medium">No topics yet</p>
            <p className="text-slate-600 text-xs mt-1">
              Add your first topic to build the course
            </p>
          </div>
        : <div className="flex flex-col gap-3">
            {topics.map((topic, index) => (
              <div
                key={topic.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4"
              >
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 text-xs font-bold shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">
                    {topic.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500 capitalize">
                      {topic.contentType}
                    </span>
                    <span className="text-slate-700">·</span>
                    <span className="text-xs text-slate-500">
                      Mastery: {topic.masteryThreshold}%
                    </span>
                  </div>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full border ${difficultyColor[topic.difficultyLevel]}`}
                >
                  {difficultyLabel[topic.difficultyLevel]}
                </span>
                <button
                  onClick={() => {
                    setSelectedTopicId(topic.id);
                    setShowQuestionModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 text-xs font-medium rounded-lg transition-colors shrink-0"
                >
                  <Plus size={12} />
                  Add question
                </button>
              </div>
            ))}
          </div>
        }
      </div>

      {/* Add topic modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-[#111118] border border-white/10 rounded-2xl p-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-bold text-lg">Add topic</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setError("");
                }}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddTopic} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">
                  Topic title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Introduction to Arrays"
                  value={form.title}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title: e.target.value }))
                  }
                  required
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-300">
                    Difficulty
                  </label>
                  <select
                    value={form.difficultyLevel}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        difficultyLevel: Number(e.target.value) as
                          | 1
                          | 2
                          | 3
                          | 4
                          | 5,
                      }))
                    }
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n} className="bg-[#111118]">
                        {difficultyLabel[n]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-300">
                    Content type
                  </label>
                  <select
                    value={form.contentType}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        contentType: e.target.value as Topic["contentType"],
                      }))
                    }
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                  >
                    {["text", "video", "quiz", "simulation"].map((t) => (
                      <option
                        key={t}
                        value={t}
                        className="bg-[#111118] capitalize"
                      >
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">
                  Mastery threshold — {form.masteryThreshold}%
                </label>
                <input
                  type="range"
                  min={50}
                  max={100}
                  step={5}
                  value={form.masteryThreshold}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      masteryThreshold: Number(e.target.value),
                    }))
                  }
                  className="accent-purple-500"
                />
                <div className="flex justify-between text-xs text-slate-600">
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setError("");
                  }}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {adding && <Loader2 size={14} className="animate-spin" />}
                  {adding ? "Adding..." : "Add topic"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showQuestionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
          <div className="bg-[#111118] border border-white/10 rounded-2xl p-8 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-bold text-lg">
                Add quiz question
              </h2>
              <button
                onClick={() => setShowQuestionModal(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddQuestion} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">
                  Question
                </label>
                <textarea
                  placeholder="e.g. What is the time complexity of binary search?"
                  value={questionForm.question}
                  onChange={(e) =>
                    setQuestionForm((p) => ({ ...p, question: e.target.value }))
                  }
                  required
                  rows={3}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-purple-500 transition-colors resize-none"
                />
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-sm font-medium text-slate-300">
                  Answer options
                </label>
                {questionForm.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="correct"
                      checked={questionForm.correctIndex === i}
                      onChange={() =>
                        setQuestionForm((p) => ({ ...p, correctIndex: i }))
                      }
                      className="accent-purple-500 shrink-0"
                    />
                    <input
                      type="text"
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const opts = [...questionForm.options];
                        opts[i] = e.target.value;
                        setQuestionForm((p) => ({ ...p, options: opts }));
                      }}
                      required
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                ))}
                <p className="text-slate-600 text-xs">
                  Select the radio button next to the correct answer
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">
                  Explanation (shown after answering)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Binary search divides the search space in half each time..."
                  value={questionForm.explanation}
                  onChange={(e) =>
                    setQuestionForm((p) => ({
                      ...p,
                      explanation: e.target.value,
                    }))
                  }
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">
                  Difficulty
                </label>
                <select
                  value={questionForm.difficultyLevel}
                  onChange={(e) =>
                    setQuestionForm((p) => ({
                      ...p,
                      difficultyLevel: Number(e.target.value) as
                        | 1
                        | 2
                        | 3
                        | 4
                        | 5,
                    }))
                  }
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n} className="bg-[#111118]">
                      {difficultyLabel[n]}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingQuestion}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {addingQuestion && (
                    <Loader2 size={14} className="animate-spin" />
                  )}
                  {addingQuestion ? "Saving..." : "Save question"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
