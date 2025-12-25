// src/App.jsx
import React, { useEffect, useState } from "react";
import PdfService from "./services/pdf";
import AuthForm from "./components/AuthForm";
import StudentDashboard from "./components/StudentDashboard";
import LecturerDashboard from "./components/LecturerDashboard";
import { LogOut, Database } from "lucide-react";
import LoadingOverlay from "./components/loadingOverlay";
import { onAuthChanged, fetchUserProfile } from "./services/firebase";
import { signOut } from "firebase/auth";
import { auth } from "./services/firebase";

export default function App() {
  const [user, setUser] = useState(null); // will hold { uid, fullName, ... }
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewLoading, setViewLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await PdfService.init();
      // QR lib (keep)
      await new Promise((resolve) => {
        const s = document.createElement("script");
        s.src =
          "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
        s.onload = resolve;
        document.head.appendChild(s);
      });
      setLoading(false);
    };
    init();

    // Auth listener
    const unsub = onAuthChanged(async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setRole(null);
        setViewLoading(false);
        setAuthReady(true);
        return;
      }

      const profile = await fetchUserProfile(fbUser.uid);
      if (profile) {
        setUser({ uid: fbUser.uid, ...profile });
        setRole(profile.role);
      } else {
        setUser({ uid: fbUser.uid, email: fbUser.email });
        setRole(null);
      }

      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  if (loading || !authReady) {
    return <LoadingOverlay text="Initializing App..." />;
  }

  if (!user && !viewLoading) {
    return <AuthForm setUser={setUser} setRole={setRole} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      {viewLoading && <LoadingOverlay text="Logging Out..." />}
      <nav className="bg-white dark:bg-gray-900 px-4 py-4 flex justify-between items-center shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
          <Database className="text-indigo-600 w-5 h-5" /> AttendanceSQL
        </div>
        <button
          onClick={async () => {
            try {
              setViewLoading(true); // show overlay FIRST

              await new Promise((r) => setTimeout(r, 1200)); // UX delay

              await signOut(auth); // auth listener will handle redirect
            } catch (err) {
              alert("Logout failed: " + err.message);
              setViewLoading(false);
            }
          }}
          className="text-slate-500 hover:text-purple-600 cursor-pointer transition-all ease-in-out duration-200"
        >
          <LogOut size={20} />
        </button>
      </nav>
      {role === "student" ? (
        <StudentDashboard user={user} />
      ) : (
        <LecturerDashboard user={user} />
      )}
    </div>
  );
}
