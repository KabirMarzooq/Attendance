import { Loader2 } from "lucide-react";

export default function LoadingOverlay({ text = "Loading..." }) {
  return (
    <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      <p className="mt-4 text-sm text-slate-600 font-medium">{text}</p>
    </div>
  );
}
