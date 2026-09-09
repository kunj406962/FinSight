import { useEffect } from "react";
import type { ReactNode } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-slate-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-100 transition-colors duration-150"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}