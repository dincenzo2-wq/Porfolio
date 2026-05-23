import React from "react";
import { Sparkles, Mail, ArrowRight, Settings, Film, Facebook, Instagram, MessageCircle } from "lucide-react";
import { UserProfile, AppTheme } from "../types";
import { motion } from "motion/react";

interface HeroProps {
  profile: UserProfile;
  theme: AppTheme;
  onOpenCustomizer: () => void;
}

export default function Hero({ profile, theme, onOpenCustomizer }: HeroProps) {
  const displayName = profile.name.includes(" - ") 
    ? profile.name.split(" - ")[0] 
    : profile.name;

  const displayRole = profile.name.includes(" - ") 
    ? profile.name.split(" - ")[1] 
    : (profile.role || "Editor & Videographer");

  // Dynamic light leak glow colors based on the currently selected theme
  const getLightLeakColor = (themeId: string) => {
    switch (themeId) {
      case "emerald":
        return "from-emerald-300/15 via-teal-200/5 to-transparent";
      case "coral":
        return "from-rose-300/15 via-orange-200/5 to-transparent";
      case "violet":
        return "from-violet-300/15 via-indigo-200/5 to-transparent";
      case "nord":
        return "from-cyan-300/15 via-sky-200/5 to-transparent";
      case "cinema":
      default:
        return "from-sky-300/15 via-blue-200/5 to-transparent";
    }
  };

  // Dynamic border and glow colors for the avatar based on theme
  const getAvatarThemeStyle = (themeId: string) => {
    switch (themeId) {
      case "emerald":
        return {
          border: "border-emerald-400/40",
          glow: "bg-emerald-400/15"
        };
      case "coral":
        return {
          border: "border-rose-400/40",
          glow: "bg-rose-400/15"
        };
      case "violet":
        return {
          border: "border-violet-400/40",
          glow: "bg-violet-400/15"
        };
      case "nord":
        return {
          border: "border-cyan-400/40",
          glow: "bg-cyan-400/15"
        };
      case "cinema":
      default:
        return {
          border: "border-sky-400/40",
          glow: "bg-sky-400/15"
        };
    }
  };

  const avatarStyle = getAvatarThemeStyle(theme.id);

  return (
    <section id="hero-section" className={`relative min-h-[90vh] md:min-h-screen flex items-center pt-28 pb-20 overflow-hidden px-4 md:px-12 ${theme.bg}`}>
      
{/* Cinematic Ambient Drifting Light Leaks */}
      <div className={`absolute -top-32 -left-32 w-80 h-80 rounded-full bg-gradient-to-br ${getLightLeakColor(theme.id)} blur-3xl opacity-70 animate-pulse pointer-events-none`} style={{ animationDuration: "8s" }} />
      <div className={`absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-gradient-to-tl ${getLightLeakColor(theme.id)} blur-3xl opacity-60 animate-pulse pointer-events-none`} style={{ animationDuration: "12s" }} />


<div className="relative z-10 w-full max-w-[82rem] mx-auto flex flex-col items-center justify-center">

        <div className="w-full text-center flex flex-col items-center justify-center space-y-14 md:space-y-20">
          
          {/* 1. THÊM ẢNH ĐẠI DIỆN CĂN GIỮA - NÂNG KÍCH THƯỚC TO HƠN & TỰ ĐỘNG KHỚP THEME */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative select-none"
          >
            <div className={`relative w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 rounded-full p-1.5 bg-white border-2 ${avatarStyle.border} shadow-md flex items-center justify-center overflow-hidden transition-all duration-300`}>
              {profile.avatarUrl && (
                <img 
                  src={profile.avatarUrl}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-full"
                />
              )}
            </div>
            {/* Soft dynamic decorative glow */}
            <div className={`absolute inset-0 -z-10 ${avatarStyle.glow} blur-2xl rounded-full transition-all duration-300`} />
          </motion.div>

          {/* Structured Text & Identity with Grand Display typography - Centered */}
          <div className="space-y-6 select-none flex flex-col items-center text-center">
            {/* Tên riêng lớn, đậm trọn trên 1 hàng duy nhất */}
            <motion.h1 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold font-display tracking-[-0.04em] leading-[1.05] text-slate-900"
            >
              {displayName}
            </motion.h1>

            {/* Chức danh ở hàng thứ hai ngay dưới tên */}
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-sm sm:text-base font-bold tracking-[0.25em] text-sky-600 uppercase font-mono flex items-center justify-center gap-2.5"
            >
              {displayRole}
            </motion.p>
            
            {/* Đoạn văn mô tả phụ */}
            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="text-base sm:text-lg md:text-xl font-medium tracking-tight text-slate-600 max-w-2xl leading-relaxed pt-2"
            >
              {profile.subtitle}
            </motion.p>
          </div>

          {/* Social Links Panel - Centered */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="flex flex-wrap items-center justify-center gap-3 select-none w-full"
          >
            {profile.facebookUrl && (
              <a 
                href={profile.facebookUrl.startsWith("http") ? profile.facebookUrl : `https://${profile.facebookUrl}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-full bg-white hover:bg-slate-100 border border-slate-200 px-5 py-2.5 text-[13px] font-semibold text-slate-600 hover:text-slate-900 transition-all shadow-sm"
              >
                <Facebook className="h-3.5 w-3.5 text-sky-600" /> Facebook
              </a>
            )}
            {profile.instagramUrl && (
              <a 
                href={profile.instagramUrl.startsWith("http") ? profile.instagramUrl : `https://${profile.instagramUrl}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-full bg-white hover:bg-slate-100 border border-slate-200 px-5 py-2.5 text-[13px] font-semibold text-slate-600 hover:text-slate-900 transition-all shadow-sm"
              >
                <Instagram className="h-3.5 w-3.5 text-pink-500" /> Instagram
              </a>
            )}
            {profile.zaloNumber && (
              <a 
                href={`https://zalo.me/${profile.zaloNumber}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-full bg-white hover:bg-slate-100 border border-slate-200 px-5 py-2.5 text-[13px] font-semibold text-slate-600 hover:text-slate-900 transition-all shadow-sm"
              >
                <MessageCircle className="h-3.5 w-3.5 text-sky-600" /> Zalo
              </a>
            )}
            
            <a 
              href={`mailto:${profile.email}`}
              className="flex items-center gap-2 rounded-full bg-white hover:bg-slate-100 border border-slate-200 px-5 py-2.5 text-[13px] font-semibold text-slate-600 hover:text-slate-900 transition-all shadow-sm"
            >
              <Mail className="h-3.5 w-3.5 text-slate-500" /> Email
            </a>
          </motion.div>

          {/* Action Toolbar - Centered CTA Button */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 select-none w-full max-w-sm sm:max-w-none pt-2"
          >
            {/* Dark CTA Pill Button Primary (extremely premium contrast) */}
            <a 
              href="#projects-section"
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 font-semibold text-[13px] px-8 py-3.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-md hover:shadow-lg transition-all"
            >
              <Film className="h-4 w-4" /> <span>Xem tác phẩm nổi bật</span> <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
