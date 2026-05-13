import { AdaptiveState, QuizQuestion } from "@/types";

// Adjusts difficulty based on performance
export function adaptDifficulty(
  state: AdaptiveState,
  wasCorrect: boolean
): AdaptiveState {
  let { currentDifficulty, correctStreak, incorrectStreak, masteryScore } =
    state;

  if (wasCorrect) {
    correctStreak += 1;
    incorrectStreak = 0;
    masteryScore = Math.min(100, masteryScore + 10);

    // Increase difficulty after 3 correct in a row
    if (correctStreak >= 3 && currentDifficulty < 5) {
      currentDifficulty = (currentDifficulty + 1) as 1 | 2 | 3 | 4 | 5;
      correctStreak = 0;
    }
  } else {
    incorrectStreak += 1;
    correctStreak = 0;
    masteryScore = Math.max(0, masteryScore - 5);

    // Decrease difficulty after 2 wrong in a row
    if (incorrectStreak >= 2 && currentDifficulty > 1) {
      currentDifficulty = (currentDifficulty - 1) as 1 | 2 | 3 | 4 | 5;
      incorrectStreak = 0;
    }
  }

  return { currentDifficulty, correctStreak, incorrectStreak, masteryScore };
}

// Pick next question based on current difficulty
export function selectNextQuestion(
  questions: QuizQuestion[],
  answeredIds: string[],
  targetDifficulty: number
): QuizQuestion | null {
  const unanswered = questions.filter((q) => !answeredIds.includes(q.id));
  if (unanswered.length === 0) return null;

  // Try exact difficulty match first
  const exact = unanswered.filter(
    (q) => q.difficultyLevel === targetDifficulty
  );
  if (exact.length > 0) {
    return exact[Math.floor(Math.random() * exact.length)];
  }

  // Fall back to closest difficulty
  const sorted = unanswered.sort(
    (a, b) =>
      Math.abs(a.difficultyLevel - targetDifficulty) -
      Math.abs(b.difficultyLevel - targetDifficulty)
  );
  return sorted[0];
}

// Calculate final mastery score
export function calculateMastery(
  answers: Record<string, number>,
  questions: QuizQuestion[]
): number {
  if (questions.length === 0) return 0;
  const answered = questions.filter((q) => answers[q.id] !== undefined);
  if (answered.length === 0) return 0;

  const correct = answered.filter(
    (q) => answers[q.id] === q.correctIndex
  ).length;

  // Weight by difficulty
  const weightedScore = answered.reduce((acc, q) => {
    const isCorrect = answers[q.id] === q.correctIndex;
    return acc + (isCorrect ? q.difficultyLevel : 0);
  }, 0);

  const maxWeightedScore = answered.reduce(
    (acc, q) => acc + q.difficultyLevel,
    0
  );

  const rawScore = (correct / answered.length) * 100;
  const weightedPercent =
    maxWeightedScore > 0 ? (weightedScore / maxWeightedScore) * 100 : 0;

  // Blend raw and weighted
  return Math.round(rawScore * 0.4 + weightedPercent * 0.6);
}

// Check if learner has mastered the topic
export function hasMastered(
  masteryScore: number,
  threshold: number
): boolean {
  return masteryScore >= threshold;
}