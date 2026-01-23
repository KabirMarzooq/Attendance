// imports
import React, { useState } from "react";
import { Database, Eye, EyeOff, ChevronDown } from "lucide-react";
import {
  registerWithEmail,
  loginWithEmail,
  resetPassword,
} from "../services/firebase";
import LoadingOverlay from "./loadingOverlay";
import FloatingHelpButton from "./FloatingHelpButton";
import HelpModal from "./HelpModal";
import { toLower, toUpper, toWordCase } from "../utils/textFormatters.js";
import toast from "react-hot-toast";
import { getFirebaseErrorMessage } from "../utils/firebaseErrors";

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

export default function AuthForm({ setUser, setRole }) {
  // constants
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
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // input fields validation to prevent blank inputs
  const validateForm = () => {
    const { email, password, fullName, matricNumber, department } = formData;

    // Login validation
    if (!isRegistering) {
      if (!email || !password) {
        return "All fields are required.";
      }
      return null;
    }

    // Common required fields
    if (!email || !password || !fullName) {
      return "All fields are required.";
    }

    // Student-specific validation
    if (selectedRole === "student") {
      if (!matricNumber) {
        return "Matric number is required.";
      }
    }

    if (selectedRole === "student" && (!selectedFaculty || !selectedDept)) {
      return "Faculty and Department are required.";
    }

    return null; 
  };

  // Handling User authentication
  const handleAuth = async (e) => {
    e.preventDefault();

    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    setBusy(true);
    setViewLoading(true);

    try {
      if (isRegistering) {
        const profile = await registerWithEmail({
          email: toLower(formData.email),
          password: formData.password,
          fullName: toWordCase(formData.fullName),
          matricNumber:
            selectedRole === "student" ? toUpper(formData.matricNumber) : "",
          department:
            selectedRole === "student" ? toWordCase(selectedDept) : "",
          faculty:
            selectedRole === "student" ? toWordCase(selectedFaculty) : "",
          role: selectedRole,
        });

        toast.success(
          "Registration successful. Check your email to verify your account."
        );
      } else {
        const profile = await loginWithEmail({
          email: toLower(formData.email),
          password: formData.password,
        });

        toast.success("Login successful. Welcome back!");
        setUser({ uid: profile.uid, ...profile });
        setRole(profile.role);
      }
    } catch (err) {
      const message = getFirebaseErrorMessage(err);
      toast.error(message);
    } finally {
      setBusy(false);
      setViewLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
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
            className="w-full p-3 border rounded-lg border-gray-500/20 focus:outline-offset-2 focus:outline-indigo-600"
            placeholder="Enter Email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            onBlur={() =>
              setFormData((prev) => ({
                ...prev,
                email: toLower(prev.email),
              }))
            }
          />

          {/* Password Reset  */}
          {!isRegistering && (
            <a
              type="button"
              className="text-indigo-600 cursor-pointer"
              onClick={async () => {
                if (!formData.email) {
                  toast.success("Enter your email first");
                  return;
                }

                try {
                  await resetPassword(formData.email);
                  toast.success("Password reset link sent to your email.");
                } catch (err) {
                  toast.error(err.message);
                }
              }}
            >
              Forgot Password?
            </a>
          )}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              minLength={8}
              className="w-full p-3 border rounded-lg border-gray-500/20 focus:outline-offset-2 focus:outline-indigo-600"
              placeholder="Enter Password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />

            {/* hide/show password  */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {isRegistering && formData.password.length < 8 && (
            <p className="text-xs text-gray-500 italic -mt-3">
              Password Must Be at Least 8 Characters Long
            </p>
          )}
          {isRegistering && (
            <div className="animate-fade-in space-y-4">
              <input
                type="text"
                className="w-full p-3 border rounded-lg border-gray-500/20 focus:outline-offset-2 focus:outline-indigo-600"
                placeholder="Enter You Full Name"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                onBlur={() =>
                  setFormData((prev) => ({
                    ...prev,
                    fullName: toWordCase(prev.fullName),
                  }))
                }
              />
              {/* role based selection */}
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
              {/* if role === student */}
              {selectedRole === "student" && (
                <div className="space-y-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <input
                    className="w-full p-2 border rounded bg-white border-gray-500/20 focus:outline-offset-2 focus:outline-indigo-600"
                    placeholder="Matric No"
                    value={formData.matricNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, matricNumber: e.target.value })
                    }
                    onBlur={() =>
                      setFormData((prev) => ({
                        ...prev,
                        matricNumber: toUpper(prev.matricNumber),
                      }))
                    }
                  />
                  {/* Faculty Selection */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Faculty
                    </label>
                    <div className="relative">
                      <select
                        className="w-full p-2 border rounded appearance-none cursor-pointer bg-white border-gray-500/20 focus:outline-offset-2 focus:outline-indigo-600"
                        value={selectedFaculty}
                        onChange={(e) => {
                          setSelectedFaculty(e.target.value);
                          setSelectedDept("");
                        }}
                      >
                        <option value="">-- Select Faculty --</option>
                        {Object.keys(UNIVERSITY_DATA).map((fac) => (
                          <option key={fac} value={fac}>
                            {fac}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Department Selection */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Department
                    </label>
                    <div className="relative">
                      <select
                        className="w-full p-2 border rounded appearance-none cursor-pointer bg-white border-gray-500/20 focus:outline-offset-2 focus:outline-indigo-600"
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                        disabled={!selectedFaculty}
                      >
                        <option value="">-- Select Department --</option>
                        {selectedFaculty &&
                          UNIVERSITY_DATA[selectedFaculty].map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
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

      {/* help modal  */}
      <FloatingHelpButton open={helpOpen} setOpen={setHelpOpen} />
      <HelpModal open={helpOpen} setOpen={setHelpOpen} />

      {/* footer */}
      <footer className="text-center text-sm text-gray-500 py-4">
        © {new Date().getFullYear()} NUESA, Federal University Lokoja. All
        rights reserved.
      </footer>
    </div>
  );
}
