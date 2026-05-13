"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import {
  getTopicQuestions,
  updateQuizSession,
  upsertProgress,
  awardXP,
} from "@/lib/firestore";
import {
  adaptDifficulty,
  selectNextQuestion,
  calculateMastery,
  hasMastered,
} from "@/lib/adaptiveEngine";
import { QuizQuestion, AdaptiveState } from "@/types";
import {
  Brain,
  CheckCircle,
  XCircle,
  ChevronRight,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
} from "lucide-react";

const difficultyLabel: Record<number, string> = {
  1: "Beginner",
  2: "Easy",
  3: "Intermediate",
  4: "Hard",
  5: "Advanced",
};

const difficultyColor: Record<number, string> = {
  1: "text-green-400",
  2: "text-teal-400",
  3: "text-amber-400",
  4: "text-orange-400",
  5: "text-red-400",
};

export default function QuizPage() {
  const { user, loading, updateUser } = useAuthStore();
  const router = useRouter();
  const { quizId } = useParams<{ quizId: string }>();

  const [topicId, courseId, sessionId] = quizId?.split("__") ?? [];

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [answeredIds, setAnsweredIds] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [fetching, setFetching] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [difficultyChange, setDifficultyChange] = useState<"up" | "down" | null>(null);
  const [masteryScore, setMasteryScore] = useState(0);
  const [mastered, setMastered] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  const [adaptive, setAdaptive] = useState<AdaptiveState>({
    currentDifficulty: 1,
    correctStreak: 0,
    incorrectStreak: 0,
    masteryScore: 0,
  });

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (topicId) {
      getTopicQuestions(topicId)
        .then((qs) => {
          setQuestions(qs);
          if (qs.length > 0) {
            const first = selectNextQuestion(qs, [], 1);
            setCurrentQuestion(first);
          }
        })
        .finally(() => setFetching(false));
    }
  }, [topicId]);

  const handleNext = useCallback(async () => {
    if (!currentQuestion || selectedAnswer === null) return;

    const wasCorrect = selectedAnswer === currentQuestion.correctIndex;
    const newAnswers = { ...answers, [currentQuestion.id]: selectedAnswer };
    const newAnsweredIds = [...answeredIds, currentQuestion.id];

    const prevDifficulty = adaptive.currentDifficulty;
    const newAdaptive = adaptDifficulty(adaptive, wasCorrect);

    setAnswers(newAnswers);
    setAnsweredIds(newAnsweredIds);
    setAdaptive(newAdaptive);

    if (newAdaptive.currentDifficulty > prevDifficulty) {
      setDifficultyChange("up");
    } else if (newAdaptive.currentDifficulty < prevDifficulty) {
      setDifficultyChange("down");
    } else {
      setDifficultyChange(null);
    }

    if (newAnsweredIds.length >= Math.min(10, questions.length)) {
      const finalMastery = calculateMastery(newAnswers, questions.filter(q => newAnsweredIds.includes(q.id)));
      const isMastered = hasMastered(finalMastery, 70);

      setMasteryScore(finalMastery);
      setMastered(isMastered);
      setCompleted(true);

      if (sessionId && user) {
        await updateQuizSession(sessionId, {
          answers: newAnswers,
          completed: true,
          score: finalMastery,
        });
        await upsertProgress(user.uid, topicId, {
          masteryScore: finalMastery,
          mastered: isMastered,
          attempts: 1,
        });
        const { xp, streak } = await awardXP(user.uid, finalMastery);
        const bonus = finalMastery >= 70 ? 20 : finalMastery >= 40 ? 10 : 0;
        setXpEarned(10 + bonus);
        updateUser({ xp, streak });
      }
      return;
    }

    const next = selectNextQuestion(
      questions,
      newAnsweredIds,
      newAdaptive.currentDifficulty
    );
    setCurrentQuestion(next);
    setSelectedAnswer(null);
    setAnswered(false);
  }, [currentQuestion, selectedAnswer, answers, answeredIds, adaptive, questions, sessionId, user, topicId, updateUser]);

  const handleSelect = (index: number) => {
    if (answered) return;
    setSelectedAnswer(index);
    setAnswered(true);
  };

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4 mx-auto">
            <Brain size={28} className="text-purple-400" />
          </div>
          <p className="text-white font-semibold text-lg">No questions yet</p>
          <p className="text-slate-500 text-sm mt-2">
            This topic has no quiz questions added yet.
          </p>
          <button
            onClick={() => router.back()}
            className="mt-6 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 mx-auto ${mastered ? "bg-green-500/10 border border-green-500/20" : "bg-amber-500/10 border border-amber-500/20"}`}>
            <Trophy size={36} className={mastered ? "text-green-400" : "text-amber-400"} />
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">
            {mastered ? "Topic mastered!" : "Quiz complete!"}
          </h1>
          <p className="text-slate-500 text-sm mb-4">
            {mastered
              ? "Great work! You've demonstrated mastery of this topic."
              : "Keep practising to improve your mastery score."}
          </p>

          {xpEarned > 0 && (
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm font-semibold px-4 py-2 rounded-full mb-6">
              <Star size={14} className="text-amber-400" />
              +{xpEarned} XP earned
            </div>
          )}

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm">Mastery score</span>
              <span className={`text-2xl font-bold ${mastered ? "text-green-400" : "text-amber-400"}`}>
                {masteryScore}%
              </span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2 mb-4">
              <div
                className={`h-2 rounded-full transition-all ${mastered ? "bg-green-500" : "bg-amber-500"}`}
                style={{ width: `${masteryScore}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-white font-bold">{answeredIds.length}</p>
                <p className="text-slate-500 text-xs">Questions</p>
              </div>
              <div>
                <p className="text-white font-bold">
                  {Object.entries(answers).filter(([id, ans]) => {
                    const q = questions.find((q) => q.id === id);
                    return q && ans === q.correctIndex;
                  }).length}
                </p>
                <p className="text-slate-500 text-xs">Correct</p>
              </div>
              <div>
                <p className="text-white font-bold">
                  {difficultyLabel[adaptive.currentDifficulty]}
                </p>
                <p className="text-slate-500 text-xs">Final level</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => router.push("/learn")}
              className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              Continue learning
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progress = (answeredIds.length / Math.min(10, questions.length)) * 100;

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center">
              <Brain size={14} className="text-white" />
            </div>
            <span className="text-white font-semibold text-sm">Adaptive quiz</span>
          </div>
          <div className="flex items-center gap-3">
            {difficultyChange === "up" && (
              <span className="flex items-center gap-1 text-green-400 text-xs">
                <TrendingUp size={12} /> Level up
              </span>
            )}
            {difficultyChange === "down" && (
              <span className="flex items-center gap-1 text-amber-400 text-xs">
                <TrendingDown size={12} /> Adjusted
              </span>
            )}
            {difficultyChange === null && answeredIds.length > 0 && (
              <span className="flex items-center gap-1 text-slate-500 text-xs">
                <Minus size={12} /> Steady
              </span>
            )}
            <span className={`text-xs font-medium ${difficultyColor[adaptive.currentDifficulty]}`}>
              {difficultyLabel[adaptive.currentDifficulty]}
            </span>
          </div>
        </div>

        <div className="w-full bg-white/5 rounded-full h-1.5 mb-8">
          <div
            className="h-1.5 rounded-full bg-purple-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {currentQuestion && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <span className="text-slate-500 text-xs">
                Question {answeredIds.length + 1} of {Math.min(10, questions.length)}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full border ${
                adaptive.currentDifficulty === 1 ? "text-green-400 bg-green-500/10 border-green-500/20" :
                adaptive.currentDifficulty === 2 ? "text-teal-400 bg-teal-500/10 border-teal-500/20" :
                adaptive.currentDifficulty === 3 ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                adaptive.currentDifficulty === 4 ? "text-orange-400 bg-orange-500/10 border-orange-500/20" :
                "text-red-400 bg-red-500/10 border-red-500/20"
              }`}>
                {difficultyLabel[adaptive.currentDifficulty]}
              </span>
            </div>

            <h2 className="text-white font-semibold text-lg mb-6 leading-relaxed">
              {currentQuestion.question}
            </h2>

            <div className="flex flex-col gap-3 mb-6">
              {currentQuestion.options.map((option, index) => {
                let style = "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20";
                if (answered) {
                  if (index === currentQuestion.correctIndex) {
                    style = "bg-green-500/10 border-green-500/30 text-green-300";
                  } else if (index === selectedAnswer && index !== currentQuestion.correctIndex) {
                    style = "bg-red-500/10 border-red-500/30 text-red-300";
                  } else {
                    style = "bg-white/5 border-white/5 text-slate-600";
                  }
                } else if (selectedAnswer === index) {
                  style = "bg-purple-500/10 border-purple-500/30 text-purple-300";
                }
                return (
                  <button
                    key={index}
                    onClick={() => handleSelect(index)}
                    disabled={answered}
                    className={`w-full text-left px-5 py-4 rounded-xl border transition-all text-sm font-medium flex items-center justify-between ${style}`}
                  >
                    <span>{option}</span>
                    {answered && index === currentQuestion.correctIndex && (
                      <CheckCircle size={16} className="text-green-400 shrink-0" />
                    )}
                    {answered && index === selectedAnswer && index !== currentQuestion.correctIndex && (
                      <XCircle size={16} className="text-red-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {answered && currentQuestion.explanation && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 mb-6">
                <p className="text-blue-300 text-sm leading-relaxed">
                  💡 {currentQuestion.explanation}
                </p>
              </div>
            )}

            {answered && (
              <button
                onClick={handleNext}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {answeredIds.length + 1 >= Math.min(10, questions.length)
                  ? "See results"
                  : "Next question"}
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}