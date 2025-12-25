// src/components/StudentDashboard.jsx
import React, { useEffect, useState, useRef } from "react";
import { QrCode, BookOpen, CheckCircle, Loader2, History } from "lucide-react";
import {
  fetchAllCourses,
  fetchEnrollmentsByStudent,
  enrollStudentFirestore,
  fetchAttendanceByStudent,
  fetchActiveCourses,
} from "../services/firebase";

export default function StudentDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("id");
  const [profile, setProfile] = useState({});
  const [courses, setCourses] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [loadingCourseId, setLoadingCourseId] = useState(null);
  const [history, setHistory] = useState([]);
  const qrRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    setProfile({
      fullName: user.fullName,
      matricNumber: user.matricNumber,
      department: user.department,
    });

    (async () => {
      const active = await fetchActiveCourses();
      setCourses(active);
      const enrolls = await fetchEnrollmentsByStudent(user.uid);
      setMyCourses(enrolls.map((e) => e.courseId));
      const att = await fetchAttendanceByStudent(user.uid);
      setHistory(att || []);
    })();
  }, [user]);

  useEffect(() => {
    if (activeTab === "id") {
      setTimeout(() => {
        if (window.QRCode && qrRef.current) {
          qrRef.current.innerHTML = "";
          // QR contains the student's uid, name and matric number
          const payload = JSON.stringify({
            uid: user.uid,
            fullName: profile.fullName,
            matricNumber: profile.matricNumber,
          });
          new window.QRCode(qrRef.current, {
            text: payload,
            width: 160,
            height: 160,
          });
        }
      }, 100);
    }
  }, [activeTab, user.uid, profile.fullName, profile.matricNumber]);

  const enroll = async (course) => {
    if (!user || !course) return;

    setLoadingCourseId(course.id);

    try {
      await enrollStudentFirestore({
        studentId: user.uid,
        studentName: profile.fullName,
        matricNumber: profile.matricNumber,
        courseId: course.id,
        courseName: course.name,
      });

      setMyCourses((prev) => [...prev, course.id]);
    } catch (err) {
      alert(err.message || "Could not enroll");
    } finally {
      setLoadingCourseId(null);
    }
  };

  return (
    <div className="pb-20">
      <div className="bg-white p-6 sticky top-0 shadow-sm z-10 max-w-md mx-auto">
        <h1 className="text-xl font-bold">Student Portal</h1>
        <p className="text-sm text-slate-500">
          {profile.fullName} | {profile.matricNumber}
        </p>
      </div>

      <div className="p-4 space-y-6">
        {activeTab === "id" && (
          <div className="flex flex-col items-center">
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
              <h2 className="text-center font-bold mb-4">DIGITAL ID</h2>
              <div
                ref={qrRef}
                className="w-40 h-40 bg-slate-100 mx-auto flex items-center justify-center"
              >
                Loading...
              </div>
              <p className="text-center mt-4 font-bold text-lg">
                {profile.fullName}
              </p>
              <p className="text-center text-slate-500">{profile.department}</p>
            </div>
          </div>
        )}

        {activeTab === "courses" && (
          <div className="space-y-3 w-full sm:max-w-2xl mx-auto">
            {courses.map((c) => {
              const isEnrolled = myCourses.includes(c.id);
              return (
                <div
                  key={c.id}
                  className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-bold">{c.code}</h3>
                    <p className="text-sm">{c.name}</p>
                  </div>
                  <button
                    onClick={() => enroll(c)}
                    disabled={isEnrolled || loadingCourseId === c.id}
                    className={`px-4 py-2 rounded text-sm flex items-center gap-2 justify-center
                              ${
                                isEnrolled
                                  ? "bg-green-100 text-green-700 cursor-not-allowed"
                                  : "bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                              }
                            `}
                  >
                    {loadingCourseId === c.id && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}

                    {loadingCourseId === c.id
                      ? "Enrolling..."
                      : isEnrolled
                      ? "Enrolled"
                      : "Join"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-3">
            {history.map((r) => (
              <div
                key={r.id}
                className="bg-white p-4 rounded-xl border-l-4 border-green-500 flex justify-between"
              >
                <div>
                  <h3 className="font-bold">{r.courseName}</h3>
                  <p className="text-xs">
                    {new Date(r.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center text-green-600 gap-1">
                  <CheckCircle size={14} />
                  <span className="text-xs font-bold">Present</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 w-full bg-white dark:bg-gray-900 border border-gray-600/20 flex justify-around p-3 z-10">
        <button
          onClick={() => setActiveTab("courses")}
          className={`flex flex-col items-center cursor-pointer ${
            activeTab === "courses" ? "text-indigo-700" : "text-gray-600"
          }`}
        >
          <BookOpen size={20} />
          <span className="text-xs">Courses</span>
        </button>
        <button
          onClick={() => setActiveTab("id")}
          className={`flex flex-col items-center cursor-pointer ${
            activeTab === "id" ? "text-indigo-700" : "text-gray-600"
          }`}
        >
          <QrCode size={24} />
          <span className="text-xs">ID</span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center cursor-pointer ${
            activeTab === "history" ? "text-indigo-700" : "text-gray-600"
          }`}
        >
          <History size={20} />
          <span className="text-xs">History</span>
        </button>
      </div>
    </div>
  );
}
