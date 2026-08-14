import React from "react";

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Left Column - Financial Value Statement & Preview */}
      <div className="hidden lg:flex lg:col-span-7 flex-col justify-between p-12 border-r border-slate-900 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900/40 relative overflow-hidden">
        {/* Background Subtle Accent Grid Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />

        {/* Top Branding Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold font-mono text-sm">
              FS
            </div>
            <span className="font-semibold text-slate-100 tracking-tight text-lg">FinSight</span>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>ML Engine v3.5 Active</span>
          </div>
        </div>

        {/* Middle Feature Showcase Showcase */}
        <div className="relative z-10 max-w-xl space-y-8 my-auto py-12">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 tracking-wider uppercase bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Automated Financial Intelligence
          </div>
          
          <h1 className="text-4xl font-bold tracking-tight text-slate-100 leading-[1.15]">
            Turn raw bank exports into precise spending intelligence.
          </h1>

          <p className="text-slate-400 text-sm leading-relaxed">
            FinSight normalizes statement exports, runs isolation-forest anomaly detection across spend categories, and produces clear, deterministic financial forecasts without cloud spreadsheet overhead.
          </p>

          {/* SaaS Micro Dashboard Mock */}
          <div className="p-4 bg-slate-900/90 border border-slate-800/80 rounded-xl space-y-3 font-mono text-xs shadow-2xl backdrop-blur-sm">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
              <span className="text-slate-400">Monthly Spend Analysis</span>
              <span className="text-emerald-400 font-medium">+18.4% YoY</span>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800/50">
                <p className="text-[10px] text-slate-500 uppercase">Actual Spend</p>
                <p className="text-sm font-semibold text-slate-200 mt-1">$4,281.50</p>
              </div>
              <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800/50">
                <p className="text-[10px] text-slate-500 uppercase">Forecast Model</p>
                <p className="text-sm font-semibold text-slate-300 mt-1">$4,110.00</p>
              </div>
              <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800/50">
                <p className="text-[10px] text-slate-500 uppercase">Anomalies Detected</p>
                <p className="text-sm font-semibold text-rose-400 mt-1">1 flagged</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500">
          <span>© FinSight Analytics Engine</span>
          <div className="flex gap-4 font-mono text-[11px]">
            <span>FastAPI Core</span>
            <span>•</span>
            <span>Supabase Auth</span>
            <span>•</span>
            <span>Gemini Insights</span>
          </div>
        </div>
      </div>

      {/* Right Column - Form Container */}
      <div className="col-span-12 lg:col-span-5 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">{children}</div>
      </div>
    </div>
  );
};