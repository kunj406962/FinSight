interface PasswordStrengthMeterProps {
  password: string;
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const requirements = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { label: "One lowercase letter", met: /[a-z]/.test(password) },
    { label: "One number", met: /[0-9]/.test(password) },
    { label: "One special character (!@#$%^&*)", met: /[^A-Za-z0-9]/.test(password) },
  ];

  const passedCount = requirements.filter((r) => r.met).length;

  const getStrengthLabel = () => {
    if (password.length === 0) return { label: "", color: "bg-slate-800" };
    if (passedCount <= 2) return { label: "Weak", color: "bg-rose-500", textColor: "text-rose-400" };
    if (passedCount <= 4) return { label: "Fair", color: "bg-amber-500", textColor: "text-amber-400" };
    return { label: "Strong", color: "bg-emerald-500", textColor: "text-emerald-400" };
  };

  const strength = getStrengthLabel();

  if (!password) return null;

  return (
    <div className="space-y-2 pt-1">
      {/* Visual Strength Bar */}
      <div className="flex items-center justify-between text-[11px] font-mono">
        <span className="text-slate-400">Password Strength:</span>
        <span className={`font-semibold ${strength.textColor}`}>{strength.label}</span>
      </div>

      <div className="grid grid-cols-5 gap-1 h-1.5">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`h-full rounded-full transition-all duration-300 ${
              level <= passedCount ? strength.color : "bg-slate-800"
            }`}
          />
        ))}
      </div>

      {/* Requirement List */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1">
        {requirements.map((req, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px]">
            <span className={req.met ? "text-emerald-400" : "text-slate-600"}>
              {req.met ? "✓" : "•"}
            </span>
            <span className={req.met ? "text-slate-300" : "text-slate-500"}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}