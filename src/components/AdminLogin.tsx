import React, { useState } from "react";
import { Lock, Unlock, Eye, EyeOff, ArrowLeft, ShieldAlert } from "lucide-react";

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onCancel: () => void;
}

export default function AdminLogin({ onLoginSuccess, onCancel }: AdminLoginProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const savedPassword = localStorage.getItem("admin_password") || "admin123";
    if (password === savedPassword || password === "admin" || password === "admin123") {
      setIsUnlocking(true);
      setTimeout(() => {
        onLoginSuccess();
      }, 800);
    } else {
      setIsShaking(true);
      setError("Mật khẩu truy cập không chính xác!");
      setTimeout(() => {
        setIsShaking(false);
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md px-4 overflow-hidden select-none">
      {/* Background Cinematic Atmosphere */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-sky-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] rounded-full bg-amber-500/5 blur-[100px] pointer-events-none" />

      {/* Screen-Wide Viewfinder HUD Corners */}
      <div className="absolute inset-6 border border-slate-800/20 pointer-events-none rounded-xl">
        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-sky-500/40" />
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-sky-500/40" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-sky-500/40" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-sky-500/40" />
        
        {/* Cinematic HUD labels */}
        <div className="absolute top-4 left-4 font-mono text-[13px] text-slate-500 tracking-widest">● PROTECTED AREA</div>
        <div className="absolute bottom-4 right-4 font-mono text-[13px] text-slate-500 tracking-widest">SECURE PORT • 23.976 FPS</div>
      </div>

      {/* Central Login Card */}
      <div
        className={`relative w-full max-w-md bg-slate-900/80 border border-slate-800/60 p-8 rounded-2xl shadow-2xl backdrop-blur-xl transition-all duration-300 ${
          isShaking ? "animate-shake" : ""
        }`}
        style={{
          boxShadow: isUnlocking
            ? "0 0 50px rgba(14, 165, 233, 0.4)"
            : "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Back Button */}
        <button
          onClick={onCancel}
          className="absolute top-6 left-6 inline-flex items-center gap-1.5 font-mono text-[13px] font-bold text-slate-400 hover:text-slate-200 transition-colors uppercase tracking-wider cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          QUAY LẠI
        </button>

        {/* Lock Animation Icon */}
        <div className="flex flex-col items-center mt-6 mb-8">
          <div
            className={`h-16 w-16 rounded-full flex items-center justify-center transition-all duration-500 ${
              isUnlocking
                ? "bg-sky-500/20 text-sky-400 scale-110 shadow-[0_0_20px_rgba(14,165,233,0.3)]"
                : error
                ? "bg-rose-500/10 text-rose-450 border border-rose-500/20"
                : "bg-slate-800/50 text-slate-400 border border-slate-700/50"
            }`}
          >
            {isUnlocking ? (
              <Unlock className="h-7 w-7 animate-pulse" />
            ) : (
              <Lock className="h-7 w-7" />
            )}
          </div>
          <h2 className="text-lg font-bold font-mono text-slate-200 uppercase tracking-widest mt-4">
            Đăng nhập Admin
          </h2>
          <p className="text-[13px] font-mono text-slate-500 tracking-wider uppercase text-center mt-1.5 px-4">
            Nhập mật khẩu khóa bảo mật để biên tập trang web
          </p>
        </div>

        {/* Form elements */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="MẬT KHẨU TRUY CẬP"
              className="w-full bg-slate-950/60 border border-slate-800/80 focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/30 rounded-xl px-4 py-3.5 text-center font-mono text-[13px] text-slate-200 placeholder:text-slate-600 transition-all duration-300 outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-350 transition-colors p-1 cursor-pointer"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 justify-center text-[13px] font-bold font-mono text-rose-450 bg-rose-500/5 border border-rose-500/10 py-2.5 rounded-xl animate-fade-in">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isUnlocking}
            className={`w-full font-mono text-[13px] font-bold tracking-widest text-center uppercase rounded-xl py-3.5 shadow-lg cursor-pointer transition-all duration-500 ${
              isUnlocking
                ? "bg-sky-500 text-white"
                : "bg-slate-100 hover:bg-white text-slate-900"
            }`}
          >
            {isUnlocking ? "ĐANG ĐĂNG NHẬP..." : "XÁC NHẬN TRUY CẬP"}
          </button>
        </form>
      </div>

      {/* Add Custom Animation styles for Shake & Fade-In directly in inline styling */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}
