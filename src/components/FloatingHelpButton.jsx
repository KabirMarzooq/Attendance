// imports 
import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { useState } from "react";

export default function FloatingHelpButton({ open, setOpen }) {
  const locked = open;
  const [paused, setPaused] = useState(false); // handle mouseOver

  return (
    <div className="fixed bottom-1 right-3 z-20 flex flex-col items-center">
      <motion.button
        onClick={() => setOpen((prev) => !prev)}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        className="bg-indigo-600 text-white p-3 rounded-xl shadow-lg cursor-pointer"
        animate={
          locked
            ? { scale: 1 }
            : paused
            ? {}
            : {
                y: [0, -28, 0],
                scaleX: [1, 1, 1.15],
                scaleY: [1, 1, 0.85],
                rotate: [0, 0, -6, 0],
              }
        }
        transition={{
          duration: 1.4,
          ease: "easeInOut",
          repeat: locked ? 0 : paused ? 0 : Infinity,
        }}
        whileHover={{
          rotate: [0, -4, 4, -3, 3, 0],
          transition: { duration: 0.4 },
          scale: 1.1,
        }}
        whileTap={{
          scale: 0.95,
        }}
      >
        <HelpCircle size={24} />
      </motion.button>

      <motion.div
        className="mt-2 h-2 w-10 rounded-full bg-black/20 dark:bg-gray-800/40"
        animate={
          locked
            ? { scaleX: 1, opacity: 0.35 }
            : paused
            ? { scaleX: 1, opacity: 0.35 }
            : {
                scaleX: [1, 0.6, 1.2],
                opacity: [0.35, 0.15, 0.45],
              }
        }
        transition={{
          duration: 1.4,
          ease: "easeInOut",
          repeat: locked ? 0 : paused ? 0 : Infinity,
        }}
      />
    </div>
  );
}
