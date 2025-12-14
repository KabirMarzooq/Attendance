// src/components/AuthForm.jsx
import React, { useState } from "react";
import { Database, Eye, EyeOff } from "lucide-react";
import { registerWithEmail, loginWithEmail } from "../services/firebase";
import LoadingOverlay from "./loadingOverlay";

export default function AuthForm({ setUser, setRole }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    matricNumber: "",
    faculty: "",
    department: "",
  });
  const [selectedRole, setSelectedRole] = useState("student");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (isRegistering) {
        // register via firebase helper
        const profile = await registerWithEmail({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          matricNumber: formData.matricNumber,
          department: formData.department,
          role: selectedRole === "student" ? "student" : "lecturer",
        });
        setUser({ uid: profile.uid, ...profile });
        setRole(profile.role);
      } else {
        // login
        const profile = await loginWithEmail({
          email: formData.email,
          password: formData.password,
        });
        setUser({ uid: profile.uid, ...profile });
        setRole(profile.role);
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        {viewLoading && <LoadingOverlay text="Authenticating User..." />}
        <div className="text-center mb-8">
          <div className="bg-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Database className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            Attendance<span className="text-indigo-600">SQL</span>
          </h1>
        </div>
        <form onSubmit={handleAuth} className="space-y-4 mt-4">
          <input
            type="email"
            required
            className="w-full p-3 border rounded-lg border-gray-500/20 focus:outline-offset-2 focus:outline-indigo-600"
            placeholder="Enter Email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              className="w-full p-3 border rounded-lg border-gray-500/20 focus:outline-offset-2 focus:outline-indigo-600"
              placeholder="Enter Password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {isRegistering && (
            <div className="animate-fade-in space-y-4">
              <input
                type="text"
                required
                className="w-full p-3 border rounded-lg border-gray-500/20 focus:outline-offset-2 focus:outline-indigo-600"
                placeholder="Enter You Full Name"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
              />
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedRole("student")}
                  className={`p-3 rounded-lg border-2 cursor-pointer ${
                    selectedRole === "student"
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200"
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole("lecturer")}
                  className={`p-3 rounded-lg border-2 cursor-pointer ${
                    selectedRole === "lecturer"
                      ? "border-purple-500 bg-purple-50"
                      : "border-slate-200"
                  }`}
                >
                  Lecturer
                </button>
              </div>

              {selectedRole === "student" && (
                <div className="space-y-2 bg-slate-50 p-4 rounded-xl">
                  <input
                    className="w-full p-2 border rounded border-gray-500/20 focus:outline-offset-2 focus:outline-indigo-600"
                    placeholder="Matric No"
                    value={formData.matricNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, matricNumber: e.target.value })
                    }
                  />
                  <input
                    className="w-full p-2 border rounded border-gray-500/20 focus:outline-offset-2 focus:outline-indigo-600"
                    placeholder="Department"
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                  />
                </div>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            onClick={async () => {
              setViewLoading(true);

              await new Promise((r) => setTimeout(r, 5000)); // UX delay

              setViewLoading(false);
            }}
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 cursor-pointer focus:outline-offset-2 focus:outline-offset-indigo-700"
          >
            {isRegistering ? "Register" : "Login"}
          </button>
        </form>
        <button
          onClick={async () => {
            setViewLoading(true);

            await new Promise((r) => setTimeout(r, 200)); // UX delay

            setIsRegistering(!isRegistering);
            setViewLoading(false);
          }}
          className="block w-full text-center mt-4 text-slate-600 text-sm cursor-pointer"
        >
          {isRegistering
            ? "Have an account? Login"
            : "Need an account? Register"}
        </button>
      </div>
    </div>
  );
}
