import React, { useId, useState } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id, type = "text", ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const [showPassword, setShowPassword] = useState(false);

    const isPasswordType = type === "password";
    const inputType = isPasswordType ? (showPassword ? "text" : "password") : type;

    return (
      <div className="space-y-1.5 w-full">
        <div className="flex justify-between items-center text-xs font-medium text-slate-300">
          <label htmlFor={inputId}>{label}</label>
          {hint && <span className="text-slate-500 font-normal">{hint}</span>}
        </div>
        
        <div className="relative flex items-center">
          <input
            id={inputId}
            ref={ref}
            type={inputType}
            className={`w-full px-3 py-2 bg-slate-900/80 border text-sm font-sans rounded-md text-slate-100 placeholder-slate-500 transition-all duration-150 ease-in-out outline-none focus:ring-2 focus:ring-emerald-500/20 ${
              isPasswordType ? "pr-10" : ""
            } ${
              error
                ? "border-rose-500/80 focus:border-rose-500"
                : "border-slate-800 focus:border-slate-600 hover:border-slate-700"
            } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            {...props}
          />

          {isPasswordType && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2.5 text-slate-400 hover:text-slate-200 focus:outline-none p-1 transition-colors"
            >
              {showPassword ? (
                /* Eye Off Icon */
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                  <line x1="3" y1="3" x2="21" y2="21" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                /* Eye Open Icon */
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          )}
        </div>

        {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";