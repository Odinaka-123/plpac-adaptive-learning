import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Course, Topic, LearnerProgress } from "@/types";
import { QuizQuestion, QuizSession } from "@/types";

// ── Courses ──────────────────────────────────────────────
export async function createCourse(
  data: Omit<Course, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "courses"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getCourses(): Promise<Course[]> {
  const snap = await getDocs(
    query(collection(db, "courses"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Course));
}

export async function getCourse(id: string): Promise<Course | null> {
  const snap = await getDoc(doc(db, "courses", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Course) : null;
}

export async function getInstructorCourses(
  instructorId: string
): Promise<Course[]> {
  const snap = await getDocs(
    query(
      collection(db, "courses"),
      where("instructorId", "==", instructorId),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Course));
}

// ── Topics ───────────────────────────────────────────────
export async function addTopic(
  courseId: string,
  topic: Omit<Topic, "id" | "courseId">
): Promise<string> {
  const ref = await addDoc(collection(db, "topics"), {
    ...topic,
    courseId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getCourseTopics(courseId: string): Promise<Topic[]> {
  const snap = await getDocs(
    query(collection(db, "topics"), where("courseId", "==", courseId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Topic));
}

// ── Learner Progress ─────────────────────────────────────
export async function upsertProgress(
  uid: string,
  topicId: string,
  data: Partial<LearnerProgress>
): Promise<void> {
  const ref = doc(db, "progress", `${uid}_${topicId}`);
  await setDoc(ref, {
    uid,
    topicId,
    masteryScore: 0,
    attempts: 0,
    mastered: false,
    ...data,
    lastAttemptAt: serverTimestamp(),
  }, { merge: true });
}

export async function getUserProgress(
  uid: string
): Promise<LearnerProgress[]> {
  const snap = await getDocs(
    query(collection(db, "progress"), where("uid", "==", uid))
  );
  return snap.docs.map((d) => ({ ...d.data() } as LearnerProgress));
}

export async function getTopicProgress(
  uid: string,
  topicId: string
): Promise<LearnerProgress | null> {
  const snap = await getDoc(doc(db, "progress", `${uid}_${topicId}`));
  return snap.exists() ? (snap.data() as LearnerProgress) : null;
}

// ── Quiz Questions ────────────────────────────────────────
export async function addQuizQuestion(
  question: Omit<QuizQuestion, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "questions"), {
    ...question,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getTopicQuestions(
  topicId: string
): Promise<QuizQuestion[]> {
  const snap = await getDocs(
    query(collection(db, "questions"), where("topicId", "==", topicId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as QuizQuestion));
}

// ── Quiz Sessions ─────────────────────────────────────────
export async function saveQuizSession(
  session: Omit<QuizSession, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "sessions"), {
    ...session,
    startedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateQuizSession(
  id: string,
  data: Partial<QuizSession>
): Promise<void> {
  await updateDoc(doc(db, "sessions", id), data);
}

export async function getUserSessions(
  uid: string
): Promise<QuizSession[]> {
  const snap = await getDocs(
    query(
      collection(db, "sessions"),
      where("uid", "==", uid),
      orderBy("startedAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as QuizSession));
}

// ── Gamification ──────────────────────────────────────────
export async function awardXP(
  uid: string,
  masteryScore: number
): Promise<{ xp: number; streak: number }> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { xp: 0, streak: 0 };

  const data = snap.data();
  const prevXP: number = data.xp ?? 0;
  const prevStreak: number = data.streak ?? 0;
  const lastActive: any = data.lastActiveDate ?? null;

  // XP: 10 base + bonus for mastery
  const bonus = masteryScore >= 70 ? 20 : masteryScore >= 40 ? 10 : 0;
  const earned = 10 + bonus;
  const newXP = prevXP + earned;

  // Streak: increment if last active was yesterday, reset if gap > 1 day, keep if same day
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  let newStreak = prevStreak;
  if (lastActive) {
    const last = lastActive?.toDate ? lastActive.toDate() : new Date(lastActive);
    last.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - last.getTime()) / 86400000);
    if (diffDays === 1) newStreak = prevStreak + 1;
    else if (diffDays > 1) newStreak = 1;
    // diffDays === 0 means same day, keep streak as-is
  } else {
    newStreak = 1;
  }

  await updateDoc(ref, {
    xp: newXP,
    streak: newStreak,
    lastActiveDate: serverTimestamp(),
  });

  return { xp: newXP, streak: newStreak };
}

// ── User ──────────────────────────────────────────────────
export async function getUserProfile(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

// ── Instructor Analytics ──────────────────────────────────
export async function getCourseProgress(topicIds: string[]): Promise<LearnerProgress[]> {
  if (topicIds.length === 0) return [];
  // Firestore 'in' supports max 30 items, chunk if needed
  const chunks: string[][] = [];
  for (let i = 0; i < topicIds.length; i += 30) {
    chunks.push(topicIds.slice(i, i + 30));
  }
  const results = await Promise.all(
    chunks.map((chunk) =>
      getDocs(query(collection(db, "progress"), where("topicId", "in", chunk)))
    )
  );
  return results.flatMap((snap) =>
    snap.docs.map((d) => ({ ...d.data() } as LearnerProgress))
  );
}