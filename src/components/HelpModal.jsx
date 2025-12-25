import { motion, AnimatePresence } from "framer-motion";

export default function HelpModal({ open, setOpen }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 40, scale: 0.9, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 40, scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="bg-white max-w-xs rounded-2xl p-6 animate-fade-in fixed bottom-13 right-12 z-10 shadow-sm shadow-gray-800/50"
        >
          <div className="flex justify-center items-center mb-4">
            <h2 className="font-bold text-lg text-indigo-600">Need Help?</h2>
          </div>

          <div className="space-y-3 text-sm text-slate-700">
            <p className="font-semibold">How to set up your account:</p>
            <ol className="list-decimal list-inside space-y-3">
              <li>Register using your email and password.</li>
              <li>Select your role (Student or Lecturer).</li>
              <li>Fill in your details correctly.</li>
              <li>Login to access your dashboard.</li>
            </ol>

            <div className="pt-3 border-t border-t-slate-700/30">
              <p className="mt-4 text-sm">
                Support: <b className="text-indigo-600">+234 91 266 26571</b>
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
