export type UserRole = "student" | "instructor" | "admin";

export type LearningStyle = "visual" | "auditory" | "reading" | "kinesthetic";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  learningStyle?: LearningStyle;
  xp: number;
  streak: number;
  createdAt: Date;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructorId: string;
  topics: Topic[];
  createdAt: Date;
}

export interface Topic {
  id: string;
  courseId: string;
  title: string;
  difficultyLevel: 1 | 2 | 3 | 4 | 5;
  contentType: "text" | "video" | "quiz" | "simulation";
  prerequisiteIds: string[];
  masteryThreshold: number;
}

export interface LearnerProgress {
  uid: string;
  topicId: string;
  masteryScore: number;
  attempts: number;
  lastAttemptAt: Date;
  mastered: boolean;
}

export interface QuizQuestion {
  id: string;
  topicId: string;
  question: string;
  options: string[];
  correctIndex: number;
  difficultyLevel: 1 | 2 | 3 | 4 | 5;
  explanation: string;
}

export interface QuizSession {
  id: string;
  uid: string;
  topicId: string;
  courseId: string;
  questions: QuizQuestion[];
  answers: Record<string, number>;
  currentIndex: number;
  score: number;
  completed: boolean;
  startedAt: Date;
  completedAt?: Date;
}

export interface AdaptiveState {
  currentDifficulty: 1 | 2 | 3 | 4 | 5;
  correctStreak: number;
  incorrectStreak: number;
  masteryScore: number;
}