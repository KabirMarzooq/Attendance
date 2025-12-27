// src/services/firebase.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";

// import {
//   collection,
//   doc,
//   addDoc,
//   getDocs,
//   query,
//   where,
//   orderBy,
// } from "firebase/firestore";

import {
  getFirestore,
  addDoc,
  collection,
  serverTimestamp,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  doc,
  query,
  where,
  orderBy,
  enableIndexedDbPersistence
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const RESTRICT_TO_ENGINEERING = true;

// Try enabling offline persistence (IndexedDB). If it fails, fail silently.
try {
  enableIndexedDbPersistence(db).catch((err) => {
    // multi-tab or browser not supported
    console.warn("Firestore persistence not enabled:", err.message);
  });
} catch (e) {
  console.warn("Persistence setup error:", e?.message || e);
}

/* -- Helpers used by app -- */

// create user in Auth and also create profile doc in 'users' collection
export async function registerWithEmail({ email, password, fullName, matricNumber, department, role }) {
  const isStudent = role === "student";
  const cleanMatric = matricNumber ? matricNumber.trim().toUpperCase() : null;

  // 🔒 TEMPORARY ENGINEERING RESTRICTION
  if (
    RESTRICT_TO_ENGINEERING &&
    isStudent &&
    cleanMatric &&
    !cleanMatric.startsWith("ENG")
  ) {
    throw new Error(
      "Registration is currently restricted to Engineering students only."
    );
  }

  // 1. PRE-CHECK: Only for students
  if (isStudent && cleanMatric) {
    const indexCheckRef = doc(db, "matricIndex", cleanMatric);
    const indexDoc = await getDoc(indexCheckRef);

    if (indexDoc.exists()) {
      throw new Error("Invalid matric number. Please confirm");
    }
  }

  // 2. Create Auth User
  const credential = await createUserWithEmailAndPassword(auth, email.toLowerCase(), password);

  try {
    const uid = credential.user.uid;
    const batch = writeBatch(db);

    // User Profile
    const userRef = doc(db, "users", uid);
    const userDoc = {
      fullName,
      matricNumber: cleanMatric || "",
      department: department || "",
      role: role || "student",
      email
    };
    batch.set(userRef, userDoc);

    // 3. Only create the Index Document for students
    if (isStudent && cleanMatric) {
      const indexRef = doc(db, "matricIndex", cleanMatric);
      batch.set(indexRef, { uid: uid });
    }

    await batch.commit();
    await sendEmailVerification(credential.user);
    // return { uid, ...userDoc };

    return {
      success: true,
      message: "Registration successful. Please verify your email."
    };

  } catch (error) {
    // Cleanup if the write fails
    await deleteUser(credential.user);
    if (error.code === 'permission-denied') {
      throw new Error("Registration failed: Matric number already in use.");
    }
    throw error;
  }
}

// sign in and return profile doc
export async function loginWithEmail({ email, password }) {
  const cred = await signInWithEmailAndPassword(auth, email.toLowerCase(), password);

  if (!cred.user.emailVerified) {
    await sendEmailVerification(cred.user);
    throw new Error(
      "Email not verified. We have sent you a verification link."
    );
  }

  const uid = cred.user.uid;
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) {
    // profile missing — return minimal
    return { uid, email };
  }
  return { uid, ...snap.data() };
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email.toLowerCase());
}

// get user profile by uid
export async function fetchUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
}

// courses collection helpers
export async function createCourseFirestore(course) {
  const ref = await addDoc(collection(db, "courses"), {
    ...course,
    active: true,
    createdAt: serverTimestamp(),
  });

  return {
    id: ref.id,
    ...course,
    active: true,
    createdAt: new Date(), // local fallback
  };
}
export async function fetchAllCourses() {
  const q = query(
    collection(db, "courses"),
    orderBy("createdAt", "desc") // newest first
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function fetchActiveCourses() {
  const q = query(
    collection(db, "courses"),
    where("active", "==", true),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// enrollments
export async function enrollStudentFirestore({ studentId, studentName, matricNumber, courseId, courseName }) {
  // prevent duplicates client-side by querying
  const q = query(collection(db, "enrollments"), where("studentId", "==", studentId), where("courseId", "==", courseId));
  const results = await getDocs(q);
  if (!results.empty) throw new Error("Already enrolled");
  return addDoc(collection(db, "enrollments"), {
    studentId, studentName, matricNumber, courseId, courseName, enrolledAt: new Date().toISOString()
  });
}
export async function fetchEnrollmentsByStudent(studentId) {
  const q = query(collection(db, "enrollments"), where("studentId", "==", studentId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function fetchEnrollmentsByCourse(courseId) {
  const q = query(collection(db, "enrollments"), where("courseId", "==", courseId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// attendance
export async function markAttendanceFirestore({ studentId, fullName, matricNumber, courseId, date }) {
  // check duplicate
  const q = query(collection(db, "attendance"), where("studentId", "==", studentId), where("courseId", "==", courseId), where("date", "==", date));
  const exist = await getDocs(q);
  if (!exist.empty) throw new Error("Already marked");
  return addDoc(collection(db, "attendance"), {
    studentId, fullName, matricNumber, courseId, date, status: "present", timestamp: new Date().toISOString()
  });
}
export async function fetchAttendanceByStudent(studentId) {
  const q = query(collection(db, "attendance"), where("studentId", "==", studentId), orderBy("timestamp", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function fetchAttendanceByCourse(courseId) {
  const q = query(collection(db, "attendance"), where("courseId", "==", courseId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// summary helper (client-side): takes courseId -> returns attendance grouped by student & distinct dates
export async function fetchCourseSummaryFirestore(courseId) {
  const attendance = await fetchAttendanceByCourse(courseId);
  const enrollments = await fetchEnrollmentsByCourse(courseId);
  const sessionDates = Array.from(new Set(attendance.map(a => a.date))).sort();
  const totalClasses = sessionDates.length;
  const students = enrollments.map(e => {
    const attended = attendance.filter(a => a.studentId === e.studentId).length;
    const percentage = totalClasses ? Math.round((attended / totalClasses) * 100) : 0;
    return {
      studentId: e.studentId,
      studentName: e.studentName,
      matricNumber: e.matricNumber,
      attended,
      percentage
    };
  });
  return { courseId, totalClasses, sessionDates, students };
}

// export auth listener helper
export function onAuthChanged(cb) {
  return onAuthStateChanged(auth, cb);
}
