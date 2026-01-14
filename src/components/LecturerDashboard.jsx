// src/components/LecturerDashboard.jsx
import React, { useEffect, useState } from "react";
import PdfService from "../services/pdf";
import { getTodayDate } from "../utils/helpers";
import { withMinDelay } from "../utils/withMinDelay";
import { ClipboardMinus, Plus, Download, Loader2, Trash2 } from "lucide-react";
import LoadingOverlay from "./loadingOverlay";
import { toUpper, toWordCase } from "../utils/textFormatters.js";
import {
  createCourseFirestore,
  fetchAllCourses,
  fetchEnrollmentsByCourse,
  markAttendanceFirestore,
  fetchCourseSummaryFirestore,
} from "../services/firebase";

import {
  deactivateCourseFirestore,
  countEnrollmentsByCourse,
} from "../services/courseService";
import toast from "react-hot-toast";

/**
 * ============================================================================
 * CONFIGURATION: UNIVERSITY STRUCTURE
 * Edit this object to add/remove Faculties and Departments
 * ============================================================================
 */
const UNIVERSITY_DATA = {
  "Engineering & Technology": [
    "Computer Engineering",
    "Electrical Engineering",
    "Mechanical Engineering",
    "Civil Engineering",
  ],
  Education: [
    "Science Education",
    "Arts Education",
    "Educational Management",
    "Guidance & Counseling",
  ],
  Science: ["Computer Science", "Microbiology", "Physics", "Mathematics"],
  Arts: ["English", "History", "Philosophy"],
};

export default function LecturerDashboard({ user }) {
  const [view, setView] = useState("list");
  const [viewLoading, setViewLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [reportDate, setReportDate] = useState(getTodayDate());
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [newCourse, setNewCourse] = useState({ code: "", name: "" });
  const [enrollmentCounts, setEnrollmentCounts] = useState({});
  const [selectedTargetDepts, setSelectedTargetDepts] = useState([]);

  useEffect(() => {
    (async () => {
      const all = await fetchAllCourses();
      const mine = (all || []).filter((c) => c.lecturerId === user.uid);

      const counts = {};
      for (const course of mine) {
        counts[course.id] = await countEnrollmentsByCourse(course.id);
      }

      setEnrollmentCounts(counts);
      setCourses(mine);
    })();

    // load scanner script
    // const s = document.createElement("script");
    // s.src = "https://unpkg.com/html5-qrcode";
    // document.body.appendChild(s);
  }, [user.uid, view]);

  const toggleDeptSelection = (dept) => {
    if (selectedTargetDepts.includes(dept)) {
      setSelectedTargetDepts(selectedTargetDepts.filter((d) => d !== dept));
    } else {
      setSelectedTargetDepts([...selectedTargetDepts, dept]);
    }
  };

  const validate = () => {
    const { code, name } = newCourse;

    // Common required fields
    if (!code || !name) {
      return "Fields cannot be empty.";
    }

    return null; // valid
  };

  const createCourse = async (e) => {
    e.preventDefault();

    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    if (selectedTargetDepts.length === 0)
      return toast.error("Please select at least one department.");

    setActionLoading(true);

    try {
      const newCourseDoc = await withMinDelay(
        createCourseFirestore({
          code: toUpper(newCourse.code),
          name: toWordCase(newCourse.name),
          lecturerId: user.uid,
          lecturerName: user.fullName,
          targetDepartments: selectedTargetDepts,
        }),
        700
      );

      // REAL TIME UPDATE
      setCourses((prev) => [newCourseDoc, ...prev]);
      setSelectedTargetDepts([]);
      setView("list");
    } finally {
      setActionLoading(false);
    }
  };

  const sortedCourses = [...courses].sort(
    (a, b) =>
      (b.createdAt?.seconds || b.createdAt?.getTime?.() || 0) -
      (a.createdAt?.seconds || a.createdAt?.getTime?.() || 0)
  );

  const startScanner = () => {
    setTimeout(() => {
      if (!window.Html5QrcodeScanner) {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/html5-qrcode";
        script.onload = () => toast.success("Scanner ready");
        script.onerror = () => toast.error("Failed to load scanner library");
        document.body.appendChild(script);
        return;
      }

      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then(() => {
          const scanner = new window.Html5QrcodeScanner(
            "reader",
            {
              fps: 15,
              qrbox: { width: 300, height: 300 },
              aspectRatio: 1.0,
            },
            false
          );
          scanner.render((text) => handleScan(text), console.warn);
        })

        .catch((err) => {
          toast.error("Camera access denied. Please allow camera permissions.");
          console.error(err);
        });
    }, 400);
  };

  const handleScan = async (scanned) => {
    if (!selectedCourse) return toast.error("Select a course first");

    let data;
    try {
      data = JSON.parse(scanned);
      if (!data.uid || !data.fullName || !data.matricNumber) {
        throw new Error("Missing required fields in QR code");
      }
    } catch (e) {
      return setScanResult({ error: e.message || "Invalid QR code" });
    }

    const { uid: studentId, fullName, matricNumber } = data;

    let enrolled;
    try {
      enrolled = await fetchEnrollmentsByCourse(selectedCourse.id);
    } catch (err) {
      return setScanResult({ error: "Failed to verify enrollment" });
    }

    const valid = (enrolled || []).find((e) => e.studentId === studentId);
    if (!valid)
      return setScanResult({ error: "Student not enrolled in this course" });

    const today = getTodayDate();
    try {
      const alreadyMarked = await checkAttendanceExists({
        studentId,
        courseId: selectedCourse.id,
        date: today,
      });
      if (alreadyMarked) {
        return setScanResult({ error: "Attendance already marked for today" });
      }

      await markAttendanceFirestore({
        studentId,
        fullName,
        matricNumber,
        courseId: selectedCourse.id,
        date: today,
      });
      setScanResult({ success: true, student: { studentName: fullName } });
      toast.success(`Attendance marked for ${fullName}`);
    } catch (err) {
      setScanResult({ error: err.message || "Error marking attendance" });
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="bg-purple-800 text-white p-6 flex justify-between items-center sticky top-0 shadow-sm z-10">
        <div>
          <h1 className="font-bold text-xl">Lecturer Portal</h1>
          <p className="text-xs opacity-75">SQL Mode</p>
        </div>
        <button
          onClick={() =>
            setView((prev) => (prev === "create" ? "list" : "create"))
          }
          className="bg-white/20 active:bg-white/30 p-2 rounded-full cursor-pointer"
        >
          {view === "create" ? <Trash2 size={20} /> : <Plus size={20} />}
        </button>
      </div>

      <div className="p-4">
        {view === "create" && (
          <form
            onSubmit={createCourse}
            className="bg-white p-6 rounded-xl shadow space-y-4"
          >
            <h3 className="font-bold text-lg">Create New Course</h3>
            <input
              placeholder="Course Code"
              className="border p-2 w-full rounded-lg border-gray-500/20 focus:outline-offset-2 focus:outline-purple-600"
              onChange={(e) =>
                setNewCourse({ ...newCourse, code: e.target.value })
              }
            />
            <input
              placeholder="Course Title"
              className="border p-2 w-full rounded-lg border-gray-500/20 focus:outline-offset-2 focus:outline-purple-600"
              onChange={(e) =>
                setNewCourse({ ...newCourse, name: e.target.value })
              }
            />
            <div className="bg-slate-50 p-4 rounded-xl border border-gray-300">
              <label className="block text-sm font-bold mb-2">
                Target Departments
              </label>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {Object.keys(UNIVERSITY_DATA).map((fac) => (
                  <div key={fac}>
                    <h4 className="text-xs font-bold text-purple-600 uppercase mt-2 mb-1">
                      {fac}
                    </h4>
                    {UNIVERSITY_DATA[fac].map((dept) => (
                      <label
                        key={dept}
                        className="flex items-center gap-2 text-sm p-1 hover:bg-slate-100 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTargetDepts.includes(dept)}
                          onChange={() => toggleDeptSelection(dept)}
                          className="w-4 h-4 text-purple-600 cursor-pointer accent-purple-600"
                        />
                        {dept}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <button
              disabled={actionLoading}
              className="bg-purple-600 text-white w-full py-2 rounded-lg flex justify-center items-center gap-2 focus:outline-offset-2 focus:outline-purple-600 cursor-pointer hover:bg-purple-700"
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {actionLoading ? "Creating..." : "Create Course"}
            </button>
          </form>
        )}

        {view === "list" && (
          <div className="space-y-4">
            {courses.length === 0 && (
              <p className="text-center italic text-slate-400 py-10">
                No courses created...
              </p>
            )}
            {courses.map((c) => (
              <div
                key={c.id}
                onClick={async () => {
                  setViewLoading(true);
                  setSelectedCourse(c);

                  await new Promise((r) => setTimeout(r, 400)); // UX delay

                  setView("dashboard");
                  setViewLoading(false);
                }}
                className="bg-white p-5 cursor-pointer rounded-xl shadow border border-gray-800/20 text-gray-800 hover:border-purple-400 transition-all ease-in-out duration-300 flex justify-between items-center"
              >
                {viewLoading && <LoadingOverlay text="Loading course..." />}
                <div>
                  <h3 className="font-bold text-lg">
                    <span>{c.code}</span>
                    <span className="text-sm bg-purple-100 text-purple-700 p-1 ml-1 rounded-full">
                      ({enrollmentCounts[c.id] ?? 0})
                    </span>
                  </h3>
                  <p>{c.name}</p>
                  {!c.active && (
                    <p className="text-sm text-red-500 mt-1">Class Closed</p>
                  )}
                </div>

                {c.active && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await deactivateCourseFirestore(c.id);
                      setCourses((prev) =>
                        prev.map((x) =>
                          x.id === c.id ? { ...x, active: false } : x
                        )
                      );
                    }}
                    className="cursor-pointer"
                  >
                    <ClipboardMinus className="text-purple-800" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {view === "dashboard" && selectedCourse && (
          <div className="space-y-4">
            <button className="cursor-pointer" onClick={() => setView("list")}>
              &larr; Back
            </button>
            <h2 className="text-2xl font-bold">{selectedCourse.code}</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setView("scanner")}
                className="bg-purple-600 text-white p-6 rounded-xl font-bold cursor-pointer hover:bg-purple-700 transition-all ease-in-out duration-200"
                aria-label="Open Scanner"
              >
                Scan
              </button>
              <button
                onClick={() => setView("reports")}
                className="bg-slate-100 p-6 rounded-xl font-bold border text-gray-600 border-gray-400 cursor-pointer hover:text-purple-600 hover:border-purple-600 transition-all ease-in-out duration-200"
                aria-label="View Reports"
              >
                Reports
              </button>
            </div>
          </div>
        )}

        {view === "scanner" && (
          <div>
            <button
              className="cursor-pointer"
              onClick={() => setView("dashboard")}
            >
              &larr; Done
            </button>
            <div className="bg-black text-white p-4 rounded-xl mt-2 min-h-[300px]">
              <div id="reader"></div>
              {!scanResult ? (
                <button
                  onClick={startScanner}
                  className="bg-purple-500 w-full py-2 rounded mt-20 cursor-pointer"
                >
                  Start Camera
                </button>
              ) : (
                <button
                  onClick={() => {
                    setScanResult(null); // Reset scan result
                    startScanner(); // Restart scanner
                  }}
                  className="bg-purple-500 w-full py-2 rounded mt-4 cursor-pointer"
                >
                  Restart Scanner
                </button>
              )}
              {scanResult && (
                <div
                  className={`p-4 mt-4 rounded ${
                    scanResult.success ? "bg-green-600" : "bg-red-600"
                  }`}
                >
                  {scanResult.success ? (
                    <>
                      <p>Attendance marked for:</p>
                      <p className="font-bold">
                        {scanResult.student.studentName}
                      </p>
                      <p>Matric Number: {scanResult.student.matricNumber}</p>
                    </>
                  ) : (
                    scanResult.error
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {view === "reports" && (
          <div className="space-y-6">
            <button
              className="cursor-pointer"
              onClick={() => setView("dashboard")}
            >
              &larr; Back
            </button>
            <div className="bg-white p-4 rounded-xl shadow">
              <h3 className="font-bold mb-2">Daily Report</h3>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="border border-gray-200 shadow-sm p-2 rounded-md flex-1 cursor-pointer"
                />
                <button
                  onClick={() => {
                    if (!reportDate) {
                      toast.error("Please select a date for the report.");
                      return;
                    }
                    PdfService.generateDailyReport(
                      selectedCourse,
                      reportDate,
                      user.fullName
                    );
                  }}
                  className="bg-purple-600 text-white p-2 rounded cursor-pointer"
                  disabled={!reportDate}
                  aria-label="Generate Daily Report"
                >
                  <Download size={20} />
                </button>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow">
              <h3 className="font-bold mb-2">Full Summary</h3>
              <button
                onClick={async () => {
                  setLoadingSummary(true);
                  try {
                    await PdfService.generateSummary(selectedCourse);
                    toast.success("Summary report downloaded.");
                  } catch (error) {
                    toast.error("Failed to generate summary report.");
                  } finally {
                    setLoadingSummary(false);
                  }
                }}
                className={`bg-slate-800 text-white w-full py-2 rounded cursor-pointer hover:bg-slate-900 transition-all ease-in-out duration-300 ${
                  loadingSummary ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={loadingSummary}
              >
                {loadingSummary ? "Generating..." : "Download PDF"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
