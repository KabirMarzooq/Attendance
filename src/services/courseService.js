import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export async function deactivateCourseFirestore(courseId) {
  await updateDoc(doc(db, "courses", courseId), {
    active: false
  });
}

export async function countEnrollmentsByCourse(courseId) {
  const q = query(
    collection(db, "enrollments"),
    where("courseId", "==", courseId)
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
}