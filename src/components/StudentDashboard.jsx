// src/components/StudentDashboard.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  QrCode,
  BookOpen,
  CheckCircle,
  Loader2,
  History,
  UserRound,
  GraduationCap,
  Download,
  User,
  Save,
  Camera,
  Search,
} from "lucide-react";
import {
  fetchAllCourses,
  fetchEnrollmentsByStudent,
  enrollStudentFirestore,
  fetchAttendanceByStudent,
  fetchActiveCourses,
  db,
} from "../services/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import QRCode from "qrcode";
import jsPDF from "jspdf";

export default function StudentDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("id");
  const [profile, setProfile] = useState({});
  const [courses, setCourses] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [loadingCourseId, setLoadingCourseId] = useState(null);
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCourses, setFilteredCourses] = useState([]);
  const qrRef = useRef(null);

  // Profile Edit State
  const [editLevel, setEditLevel] = useState("100");
  const [editImage, setEditImage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size should be less than 2MB");
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload a valid image file");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => setEditImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async () => {
    setIsSaving(true);

    try {
      const userRef = doc(db, "users", user.uid);

      // Prepare update data
      const updateData = {
        level: editLevel,
      };

      // Only add profileImage if it exists
      if (editImage) {
        updateData.profileImage = editImage;
      }

      // Update Firestore
      await updateDoc(userRef, updateData);

      // Update local state
      setProfile((prev) => ({
        ...prev,
        level: editLevel,
        ...(editImage && { profileImage: editImage }),
      }));

      toast.success("Profile updated successfully!");

      // Wait 2 seconds before redirecting to ID card tab
      setTimeout(() => {
        setActiveTab("id");
        setIsSaving(false);
      }, 2000);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
      setIsSaving(false);
    }
  };

  const ReportService = {
    downloadIdCard: async (elementId, fullName) => {
      const element = document.getElementById(elementId);
      if (!element) {
        console.error("Element not found:", elementId);
        toast.error("Could not find ID card element");
        return;
      }

      setIsDownloading(true);

      try {
        const loadingToast = toast.loading("Generating PDF...");

        // Import dom-to-image
        const domtoimage = (await import("dom-to-image")).default;

        // Convert element to blob with high quality
        const blob = await domtoimage.toBlob(element, {
          quality: 1,
          style: {
            borderRadius: "16px",
          },
        });

        // Convert blob to data URL
        const reader = new FileReader();
        reader.readAsDataURL(blob);

        reader.onloadend = () => {
          const imgData = reader.result;

          // Standard portrait ID card dimensions
          const cardWidth = 85.6;
          const cardHeight = 127;

          // Create PDF with portrait ID card dimensions
          const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: [cardWidth, cardHeight],
          });

          // Add image to fill entire card with no margins
          pdf.addImage(imgData, "PNG", 0, 0, cardWidth, cardHeight);

          pdf.save(`${fullName}_ID_Card.pdf`);

          toast.dismiss(loadingToast);
          toast.success("ID Card downloaded successfully!");
        };

        setTimeout(() => {
          setIsDownloading(false);
        }, 2000);
      } catch (error) {
        console.error("Error generating PDF:", error);
        toast.dismiss();
        toast.error("Failed to download ID card");
        setIsDownloading(false);
      }
    },
  };

  useEffect(() => {
    if (!user) return;

    // Fetch user data from Firestore to get stored level and profileImage
    const fetchUserData = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();

          setProfile({
            fullName: user.fullName || userData.fullName,
            matricNumber: user.matricNumber || userData.matricNumber,
            faculty: user.faculty || userData.faculty,
            department: user.department || userData.department,
            level: userData.level || (user.role === "student" ? "100" : ""),
            profileImage: userData.profileImage || null,
          });

          // Set edit states to current values
          setEditLevel(
            userData.level || (user.role === "student" ? "100" : "")
          );
          setEditImage(userData.profileImage || null);
        } else {
          // If no document exists, use default values
          setProfile({
            fullName: user.fullName,
            matricNumber: user.matricNumber,
            faculty: user.faculty,
            department: user.department,
            level: user.role === "student" ? "100" : "",
            profileImage: null,
          });
          setEditLevel(user.role === "student" ? "100" : "");
          setEditImage(null);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.error("Could not load profile data");
      }
    };

    fetchUserData();

    (async () => {
      try {
        const active = await fetchActiveCourses(user.department);
        const filteredCourses = active.filter(
          (course) =>
            course.targetDepartments.includes(user.department) &&
            course.enrollmentOpen === true
        );
        setCourses(filteredCourses);
        setFilteredCourses(filteredCourses);

        const enrolls = await fetchEnrollmentsByStudent(user.uid);
        setMyCourses(enrolls.map((e) => e.courseId));

        const att = await fetchAttendanceByStudent(user.uid);
        setHistory(att || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Could not fetch data");
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCourses(courses);
      return;
    }

    const term = searchTerm.toLowerCase();

    const matching = courses.filter(
      (course) =>
        course.code.toLowerCase().includes(term) ||
        course.name.toLowerCase().includes(term)
    );

    const nonMatching = courses.filter(
      (course) =>
        !course.code.toLowerCase().includes(term) &&
        !course.name.toLowerCase().includes(term)
    );

    setFilteredCourses([...matching, ...nonMatching]);
  }, [searchTerm, courses]);

  useEffect(() => {
    if (!history || history.length === 0) {
      setFilteredHistory([]);
      return;
    }

    // Sort by timestamp (most recent first)
    const sortedHistory = [...history].sort((a, b) => {
      const dateA = a.timestamp?.toDate
        ? a.timestamp.toDate()
        : new Date(a.timestamp || 0);
      const dateB = b.timestamp?.toDate
        ? b.timestamp.toDate()
        : new Date(b.timestamp || 0);
      return dateB - dateA; 
    });

    // Filter by search term
    if (!historySearchTerm.trim()) {
      setFilteredHistory(sortedHistory);
      return;
    }

    const term = historySearchTerm.toLowerCase();
    const matching = sortedHistory.filter((record) =>
      record.courseCode?.toLowerCase().includes(term)
    );

    const nonMatching = sortedHistory.filter(
      (record) => !record.courseCode?.toLowerCase().includes(term)
    );

    setFilteredHistory([...matching, ...nonMatching]);
  }, [historySearchTerm, history]);

  useEffect(() => {
    if (activeTab === "id") {
      setTimeout(() => {
        if (!qrRef.current) return;

        qrRef.current.innerHTML = "";

        const canvas = document.createElement("canvas");
        qrRef.current.appendChild(canvas);

        QRCode.toCanvas(
          canvas,
          JSON.stringify({
            uid: user.uid,
            fullName: profile.fullName,
            matricNumber: profile.matricNumber,
            department: profile.department,
          }),
          { width: 160 },
          (err) => {
            if (err) console.error(err);
          }
        );
      }, 100);
    }
  }, [
    activeTab,
    user.uid,
    profile.fullName,
    profile.matricNumber,
    profile.department,
  ]);

  const enroll = async (course) => {
    if (!user || !course) return;

    setLoadingCourseId(course.id);

    try {
      await enrollStudentFirestore({
        studentId: user.uid,
        studentName: profile.fullName,
        matricNumber: profile.matricNumber,
        courseId: course.id,
        courseCode: course.code,
      });

      setMyCourses((prev) => [...prev, course.id]);
    } catch (err) {
      toast.error(err.message || "Could not enroll");
    } finally {
      setLoadingCourseId(null);
    }
  };

  return (
    <div className="pb-20">
      <div className="bg-white p-6 sticky top-0 shadow-sm z-10 flex justify-between items-center sm:max-w-lg max-w-md mx-auto">
        <div>
          <h1 className="text-xl font-bold">Student Portal</h1>
          <p className="text-sm text-slate-500">
            {profile.fullName} | {profile.matricNumber}
          </p>
          <p className="text-xs text-slate-500">{profile.level} Level</p>
        </div>
        {profile.profileImage && (
          <img
            src={profile.profileImage}
            alt="Profile"
            className="w-16 h-16 rounded-full object-cover border-2 border-indigo-100"
          />
        )}
      </div>

      <div className="p-4 space-y-6">
        {/* DIGITAL ID TAB */}
        {activeTab === "id" && (
          <div className="flex flex-col items-center gap-6">
            <div
              id="student-id-card"
              className="bg-white w-full relative"
              style={{
                maxWidth: "340px",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow:
                  "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                border: "1px solid #e2e8f0",
              }}
            >
              {/* Lamination shine overlay */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)",
                  mixBlendMode: "overlay",
                  pointerEvents: "none",
                  zIndex: 10,
                  borderRadius: "16px",
                }}
              />

              {/* Header */}
              <div
                style={{
                  background: "#312e81",
                  padding: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  color: "white",
                  position: "relative",
                  borderTopLeftRadius: "16px",
                  borderTopRightRadius: "16px",
                }}
              >
                <div
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    padding: "8px",
                    borderRadius: "50%",
                  }}
                >
                  <GraduationCap size={24} />
                </div>
                <div>
                  <h2
                    style={{
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      fontSize: "14px",
                      margin: 0,
                      lineHeight: "1.2",
                    }}
                  >
                    Faculty of {profile.faculty}
                  </h2>
                  <p
                    style={{
                      fontSize: "10px",
                      color: "#c7d2fe",
                      margin: 0,
                    }}
                  >
                    Student Identity Card
                  </p>
                </div>
              </div>

              {/* Content */}
              <div
                style={{
                  padding: "24px",
                  position: "relative",
                  background: "white",
                }}
              >
                <div style={{ display: "flex", gap: "16px" }}>
                  <div
                    style={{
                      width: "96px",
                      height: "128px",
                      background: "#e2e8f0",
                      borderRadius: "8px",
                      overflow: "hidden",
                      border: "2px solid #f1f5f9",
                      boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
                      flexShrink: 0,
                    }}
                  >
                    {profile.profileImage ? (
                      <img
                        src={profile.profileImage}
                        alt="ID"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#94a3b8",
                        }}
                      >
                        <User size={32} />
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: "10px",
                          textTransform: "uppercase",
                          color: "#94a3b8",
                          fontWeight: "bold",
                          margin: "0 0 2px 0",
                        }}
                      >
                        Name
                      </p>
                      <p
                        style={{
                          fontWeight: "bold",
                          color: "#0f172a",
                          lineHeight: "1.25",
                          margin: 0,
                          fontSize: "14px",
                        }}
                      >
                        {profile.fullName}
                      </p>
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: "10px",
                          textTransform: "uppercase",
                          color: "#94a3b8",
                          fontWeight: "bold",
                          margin: "0 0 2px 0",
                        }}
                      >
                        Matric No
                      </p>
                      <p
                        style={{
                          fontFamily: "monospace",
                          fontSize: "13px",
                          color: "#334155",
                          margin: 0,
                        }}
                      >
                        {profile.matricNumber}
                      </p>
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: "10px",
                          textTransform: "uppercase",
                          color: "#94a3b8",
                          fontWeight: "bold",
                          margin: "0 0 2px 0",
                        }}
                      >
                        Department
                      </p>
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#334155",
                          lineHeight: "1.25",
                          margin: 0,
                        }}
                      >
                        {profile.department}
                      </p>
                    </div>
                    <div
                      style={{
                        background: "#eef2ff",
                        color: "#4338ca",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        display: "inline-flex",
                        fontSize: "12px",
                        fontWeight: "bold",
                        marginTop: "4px",
                        width: "fit-content",
                      }}
                    >
                      {profile.level} Level
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "24px",
                    paddingTop: "16px",
                    borderTop: "1px dashed #cbd5e1",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                    <p style={{ margin: "0 0 4px 0" }}>
                      Valid for current session
                    </p>
                    <p style={{ margin: 0 }}>Scan for attendance</p>
                  </div>
                  <div
                    ref={qrRef}
                    style={{
                      background: "white",
                      boxShadow:
                        "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                      borderRadius: "16px",
                      padding: "8px",
                    }}
                  >
                    Loading...
                  </div>
                </div>
              </div>

              {/* Background watermark */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 0,
                  opacity: 0.02,
                  pointerEvents: "none",
                }}
              >
                <GraduationCap size={200} />
              </div>
            </div>

            <button
              onClick={async () => {
                await ReportService.downloadIdCard(
                  "student-id-card",
                  profile.fullName
                );
              }}
              disabled={isDownloading}
              className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-lg hover:bg-slate-800 transition-all active:scale-95 active:bg-slate-700 cursor-pointer ease-in-out duration-300 disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Download ID Card
                </>
              )}
            </button>
          </div>
        )}

        {/* COURSES TAB */}
        {activeTab === "courses" && (
          <div className="space-y-3 w-full sm:max-w-2xl mx-auto">
            <div className="bg-white p-2 rounded-lg border border-gray-200 flex items-center gap-2 sticky top-20 shadow-sm z-20 max-w-xl mx-auto">
              <Search size={18} className="text-slate-400" />
              <input
                placeholder="Search course code or name..."
                className="flex-1 outline-none text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="text-slate-400 hover:text-slate-600 text-xs font-semibold px-2"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={16} className="text-slate-500" />
              <h3 className="font-bold text-slate-700">
                {searchTerm
                  ? `Showing results for "${searchTerm}"`
                  : `Courses for ${profile.department}`}
              </h3>
            </div>

            {filteredCourses.length === 0 && (
              <div className="text-center py-10">
                <p className="text-slate-400 text-sm italic">
                  No courses available for enrollment.
                </p>
                <p className="text-slate-400 text-sm italic">
                  No courses found.
                </p>
              </div>
            )}

            {filteredCourses.map((c) => {
              const isEnrolled = myCourses.includes(c.id);
              const isMatch =
                searchTerm &&
                (c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  c.name.toLowerCase().includes(searchTerm.toLowerCase()));

              return (
                <div
                  key={c.id}
                  className={`bg-white p-4 rounded-xl shadow-sm flex justify-between items-center transition-all ${
                    isMatch ? "ring-2 ring-indigo-400 shadow-md" : ""
                  }`}
                >
                  <div>
                    <h3
                      className={`font-bold ${
                        isMatch ? "text-indigo-700" : ""
                      }`}
                    >
                      {c.code}
                    </h3>
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

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <div className="bg-white p-6 rounded-xl shadow-sm border space-y-6 max-w-md mx-auto border-gray-300">
            <h2 className="font-bold text-lg border-b pb-2">Edit Profile</h2>

            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-indigo-100 relative">
                {editImage ? (
                  <img
                    src={editImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={40} className="text-slate-300" />
                )}
                <label className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer transition-opacity">
                  <Camera className="text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
              <p className="text-xs text-slate-500">
                Tap image to upload new photo
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Current Level
              </label>
              <select
                value={editLevel}
                onChange={(e) => setEditLevel(e.target.value)}
                className="w-full p-3 border-2 rounded-lg bg-slate-50 cursor-pointer accent-indigo-600 border-gray-300 focus:border-2 focus:border-indigo-600 transition-all ease-in-out duration-300"
              >
                <option value="100">100 Level</option>
                <option value="200">200 Level</option>
                <option value="300">300 Level</option>
                <option value="400">400 Level</option>
                <option value="500">500 Level</option>
              </select>
            </div>

            <button
              onClick={saveProfile}
              disabled={isSaving}
              className="w-full bg-indigo-600 hover:bg-indigo-600/95 active:bg-indigo-700 text-white py-3 rounded-lg font-bold flex justify-center items-center cursor-pointer gap-2 transition-all ease-in-out duration-300 disabled:bg-indigo-400 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div className="space-y-3 w-full sm:max-w-2xl mx-auto">
            {/* Search Bar */}
            <div className="bg-white p-2 rounded-lg border border-gray-200 flex items-center gap-2 sticky top-20 shadow-sm z-20 max-w-xl mx-auto">
              <Search size={18} className="text-slate-400" />
              <input
                placeholder="Search course name..."
                className="flex-1 outline-none text-sm"
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
              />
              {historySearchTerm && (
                <button
                  onClick={() => setHistorySearchTerm("")}
                  className="text-slate-400 hover:text-slate-600 text-xs font-semibold px-2"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <History size={16} className="text-slate-500" />
              <h3 className="font-bold text-slate-700">
                {historySearchTerm
                  ? `Showing results for "${historySearchTerm}"`
                  : "Attendance History"}
              </h3>
            </div>

            {filteredHistory.length === 0 && !historySearchTerm && (
              <p className="text-center text-slate-500 italic py-10">
                No attendance history available.
              </p>
            )}

            {filteredHistory.length === 0 && historySearchTerm && (
              <p className="text-center text-slate-400 italic py-10">
                No matching attendance records found.
              </p>
            )}

            {/* Attendance Records */}
            {filteredHistory.map((r) => {
              const isMatch =
                historySearchTerm &&
                r.courseCode
                  ?.toLowerCase()
                  .includes(historySearchTerm.toLowerCase());

              // Format the date properly
              let displayDate = "Date not available";
              let displayTime = "";

              try {
                if (r.timestamp) {
                  // Handle Firestore Timestamp
                  const date = r.timestamp.toDate
                    ? r.timestamp.toDate()
                    : new Date(r.timestamp);
                  displayDate = date.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  });
                  displayTime = date.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                } else if (r.date) {
                  // Fallback to date field
                  displayDate = r.date;
                }
              } catch (error) {
                console.error("Error formatting date:", error);
              }

              return (
                <div
                  key={r.id}
                  className={`bg-white p-4 rounded-xl border-l-4 border-green-500 transition-all ${
                    isMatch ? "ring-2 ring-indigo-400 shadow-md" : "shadow-sm"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3
                        className={`font-bold ${
                          isMatch ? "text-indigo-700" : ""
                        }`}
                      >
                        {r.courseCode || "Unknown Course"}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {displayDate}
                        {displayTime && (
                          <span className="ml-2">• {displayTime}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center text-green-600 gap-1">
                      <CheckCircle size={16} />
                      <span className="text-xs font-bold">Present</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 w-full bg-white dark:bg-gray-900 border border-gray-600/20 flex justify-around p-3 z-10">
        <button
          onClick={() => setActiveTab("courses")}
          className={`flex flex-col items-center cursor-pointer ${
            activeTab === "courses" ? "text-indigo-600 " : "text-slate-400"
          }`}
        >
          <div
            className={`${
              activeTab === "courses"
                ? "bg-indigo-700 p-2 rounded-full -mt-8 text-white shadow-lg border-4 border-slate-100 transition-all ease-in-out duration-300"
                : " "
            }`}
          >
            <BookOpen size={20} />
          </div>
          <span
            className={`${
              activeTab === "courses" ? "text-[10px] font-bold" : "text-xs"
            }`}
          >
            Courses
          </span>
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex flex-col items-center cursor-pointer ${
            activeTab === "profile" ? "text-indigo-600" : "text-slate-400"
          }`}
        >
          <div
            className={`${
              activeTab === "profile"
                ? "bg-indigo-700 p-2 rounded-full -mt-8 text-white shadow-lg border-4 border-slate-100 transition-all ease-in-out duration-300"
                : " "
            }`}
          >
            <UserRound size={24} />
          </div>
          <span
            className={`${
              activeTab === "profile" ? "text-[10px] font-bold" : "text-xs"
            }`}
          >
            Profile
          </span>
        </button>
        <button
          onClick={() => setActiveTab("id")}
          className={`flex flex-col items-center cursor-pointer ${
            activeTab === "id" ? "text-indigo-600" : "text-slate-400"
          }`}
        >
          <div
            className={`${
              activeTab === "id"
                ? "bg-indigo-700 p-2 rounded-full -mt-8 text-white shadow-lg border-4 border-slate-100 transition-all ease-in-out duration-300"
                : " "
            }`}
          >
            <QrCode size={24} />
          </div>
          <span
            className={`${
              activeTab === "id" ? "text-[10px] font-bold" : "text-xs"
            }`}
          >
            ID Card
          </span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center cursor-pointer ${
            activeTab === "history" ? "text-indigo-600" : "text-slate-400"
          }`}
        >
          <div
            className={`${
              activeTab === "history"
                ? "bg-indigo-700 p-2 rounded-full -mt-8 text-white shadow-lg border-4 border-slate-100 transition-all ease-in-out duration-300"
                : " "
            }`}
          >
            <History size={20} />
          </div>
          <span
            className={`${
              activeTab === "history" ? "text-[10px] font-bold" : "text-xs"
            }`}
          >
            History
          </span>
        </button>
      </div>
    </div>
  );
}
