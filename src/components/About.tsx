import React from "react";
import { UserProfile, AppTheme } from "../types";
import { MapPin, Mail, Facebook, Instagram, Sparkles, Clapperboard, Lightbulb, Compass, PenTool } from "lucide-react";
import { motion } from "motion/react";
import { SkillIcon } from "./SkillIcon";

interface AboutProps {
  profile: UserProfile;
  theme: AppTheme;
}

export default function About({ profile, theme }: AboutProps) {
  const skillCategories = React.useMemo(() => {
    const map: Record<string, typeof profile.skills> = {};
    profile.skills.forEach((sk) => {
      if (!map[sk.category]) map[sk.category] = [];
      map[sk.category].push(sk);
    });
    return map;
  }, [profile.skills]);

  return (
    <section id="about-section" className="relative py-24 px-4 bg-slate-50 border-t border-slate-200 overflow-hidden">
      {/* Light leak accents */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-sky-400/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-sky-400/10 blur-3xl pointer-events-none" />
      <div className="max-w-[82rem] mx-auto relative z-10">

        <div className="text-left mb-16 select-none max-w-2xl">
          <p className="text-[13px] font-bold text-sky-600 font-mono uppercase tracking-[0.2em] mb-3">CONCEPTS & CREATIVITY</p>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold font-display tracking-[-0.05em] leading-none text-slate-900">
            Nhãn quan điện ảnh & Câu chuyện của tôi.
          </h2>
          <p className="text-slate-500 text-[14px] sm:text-sm md:text-md mt-4 leading-relaxed max-w-md">
            Biến từng thước phim thô thành tác phẩm nghệ thuật có nhịp điệu và cảm xúc lôi cuốn.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

          <div className="lg:col-span-7 rounded-[20px] border border-slate-200 bg-white shadow-sm flex flex-col justify-between overflow-hidden">
            {/* Still frame / moodboard */}
            <div className="relative w-full aspect-[16/9] overflow-hidden bg-slate-100">
              <img
                src={profile.aboutStillImage || "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=1200"}
                alt="Cinematic moodboard"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white/70 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-5">
                <span className="text-[11px] font-bold font-mono text-slate-500/70 uppercase tracking-[0.15em] bg-white/70 backdrop-blur-sm px-2.5 py-1 rounded-md border border-white/50">
                  {profile.aboutStillImage ? "Cinematic Still" : "Moodboard"}
                </span>
              </div>
            </div>
            <div className="p-8 md:p-10">
              <div className="flex items-center gap-2 mb-6 text-[13px] font-semibold text-slate-500 font-mono">
                <Sparkles className="h-4 w-4 text-sky-500" />
                <span>{profile.aboutTagline || "NỔI BẬT & CHUYÊN NGHIỆP"}</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 tracking-[-0.03em] mb-8 leading-tight">
                {profile.aboutTitle || "Kể những câu chuyện độc bản bằng ngôn ngữ hình ảnh và nhịp điệu chuyển động."}
              </h3>

              <div className="grid grid-cols-3 gap-4 mt-8">
                {[
                  { value: profile.aboutClients || `${profile.workExperienceData.length}+`, label: "Khách hàng" },
                  { value: profile.aboutProjects || `${profile.projects.length}+`, label: "Dự án đã thực hiện" },
                  { value: profile.aboutExperience || `${(() => { const years = profile.workExperienceData.map(e => { const s = e.period.match(/(\d{4})/); return s ? parseInt(s[1]) : 2022; }); const min = Math.min(...years); const max = Math.max(...years, new Date().getFullYear()); return max - min; })()}+`, label: "Năm kinh nghiệm" }
                ].map((stat) => (
                  <div key={stat.label} className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-2xl sm:text-3xl font-bold font-display text-sky-600 tracking-[-0.02em]">{stat.value}</span>
                    <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mt-1 text-center">{stat.label}</span>
                  </div>
                ))}
              </div>

              <div className="h-[1px] bg-slate-200 my-8" />
              <p className="text-[13px] sm:text-[14px] text-slate-500 leading-relaxed font-normal italic">
                "{profile.aboutMini || "Không có set quay nào quá nhỏ, không có dự án nào quá lớn — chỉ có câu chuyện đáng được kể."}"
              </p>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-[20px] border border-slate-200 bg-white p-8 shadow-sm flex flex-col justify-between">
            <div className="space-y-6">
              <h4 className="text-[13px] font-bold font-mono tracking-wider text-sky-600 uppercase border-b border-slate-200 pb-3">
                THÔNG TIN LIÊN KẾT
              </h4>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-200 shrink-0 mt-0.5">
                  <MapPin className="h-4 w-4 text-sky-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-slate-500 font-bold uppercase leading-none font-mono">ĐỊA BÀN HOẠT ĐỘNG</p>
                  <p className="text-[14px] font-semibold text-slate-800 mt-1.5 leading-normal break-words">{profile.location || "TP. Hồ Chí Minh, Việt Nam"}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-200 shrink-0 mt-0.5">
                  <Mail className="h-4 w-4 text-sky-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-slate-500 font-bold uppercase leading-none font-mono">EMAIL CÁ NHÂN</p>
                  <p className="text-[14px] font-semibold text-slate-800 mt-1.5 leading-normal break-all">{profile.email || "vinh.editor@gmail.com"}</p>
                </div>
              </div>

              {profile.facebookUrl && (
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-200 shrink-0 mt-0.5">
                    <Facebook className="h-4 w-4 text-sky-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-slate-500 font-bold uppercase leading-none font-mono">FACEBOOK REPRESENTATIVE</p>
                    <a
                      href={profile.facebookUrl.startsWith("http") ? profile.facebookUrl : `https://${profile.facebookUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[14px] font-semibold text-slate-800 hover:text-sky-600 hover:underline mt-1.5 block leading-normal break-all"
                    >
                      {profile.facebookUrl}
                    </a>
                  </div>
                </div>
              )}

              {profile.instagramUrl && (
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-200 shrink-0 mt-0.5">
                    <Instagram className="h-4 w-4 text-sky-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-slate-500 font-bold uppercase leading-none font-mono">INSTAGRAM DIARY</p>
                    <a
                      href={profile.instagramUrl.startsWith("http") ? profile.instagramUrl : `https://${profile.instagramUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[14px] font-semibold text-slate-800 hover:text-sky-600 hover:underline mt-1.5 block leading-normal break-all"
                    >
                      {profile.instagramUrl}
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="h-[1px] bg-slate-200 my-6" />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[13px] font-bold font-mono tracking-widest text-emerald-600 uppercase">{profile.aboutStatusText || "SẴN SÀNG HỢP TÁC"}</span>
              </div>
              <p className="text-[13px] text-slate-500 leading-relaxed">
                {profile.aboutStatusLabel || "Đang nhận các dự án biên tập video thương hiệu, lookbook cinematic reels, TVC quảng cáo và làm việc dài hạn cùng các đơn vị chuyên nghiệp."}
              </p>
              <a
                href="#contact-section"
                className="w-full flex items-center justify-center text-[13px] font-bold font-mono bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl transition-all shadow-sm"
              >
                Gửi lời mời hợp tác
              </a>
            </div>
          </div>

        </div>

        <div className="mt-16 bg-white border border-slate-200 rounded-[20px] p-8 md:p-10 select-none shadow-sm">
          <h3 className="text-xl font-bold font-display text-slate-900 mb-8 border-b border-slate-200 pb-4 tracking-[-0.01em]">
            Chuyên Môn & Công Cụ Sản Xuất
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">

            <div className="lg:col-span-5 space-y-6">
              <h4 className="text-[13px] font-bold font-mono tracking-wider text-sky-600 uppercase flex items-center gap-2">
                <span>⚡</span> TƯ DUY & CHUYÊN MÔN (CREATIVE EXPERTISE)
              </h4>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: "Dựng Phim Cinematic", icon: Clapperboard },
                  { name: "Tư Duy Storytelling", icon: Lightbulb },
                  { name: "Sáng Tạo Học Hỏi", icon: Compass },
                  { name: "Viết Kịch Bản", icon: PenTool }
                ].map((skill, idx) => {
                  const IconComponent = skill.icon;
                  return (
                    <motion.div
                      key={skill.name}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: idx * 0.05 }}
                      className="group relative flex flex-col items-center justify-center p-4 min-h-[92px] rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-sky-700 hover:bg-white hover:border-sky-300 hover:translate-y-[-2px] hover:shadow-sm transition-all duration-300 text-[13px] font-mono font-bold tracking-tight text-center cursor-default"
                    >
                      <IconComponent className="h-5 w-5 text-sky-500/60 group-hover:text-sky-500 transition-colors duration-300 mb-2 shrink-0" />
                      <span>{skill.name}</span>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <h4 className="text-[13px] font-bold font-mono tracking-wider text-sky-600 uppercase flex items-center gap-2">
                <span>🛠️</span> CÔNG CỤ PHẦN MỀM (DIGITAL SUITE)
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {profile.skills.map((skill, index) => {
                  let formattedName = skill.name;
                  const norm = skill.name.toLowerCase().trim();

                  if (norm.includes("davinci") || norm.includes("resolve")) {
                    formattedName = "DaVinci Resolve";
                  } else if (norm.includes("premiere")) {
                    formattedName = "Adobe Premiere";
                  } else if (norm.includes("photoshop")) {
                    formattedName = "Adobe Photoshop";
                  } else if (norm.includes("lightroom")) {
                    formattedName = "Adobe Lightroom";
                  } else if (norm.includes("after effects") || norm.includes("aftereffects") || norm.includes("ae") || norm.includes("effect")) {
                    formattedName = "Adobe After Effects";
                  } else if (norm.includes("capcut")) {
                    formattedName = "CapCut";
                  } else {
                    formattedName = skill.name
                      .toLowerCase()
                      .split(" ")
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(" ");
                  }

                  return (
                    <motion.div
                      key={skill.name}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: index * 0.04 }}
                      className="group relative flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 border border-slate-200 transition-all duration-300 hover:bg-white hover:border-sky-300 hover:translate-y-[-2px] hover:shadow-sm"
                    >
                      <div className="h-10 w-10 flex items-center justify-center transition-all duration-300 transform group-hover:scale-105">
                        <SkillIcon name={formattedName} className="w-8 h-8" iconColor={skill.iconColor} />
                      </div>

                      <span className="mt-2.5 text-[13px] font-bold font-mono text-slate-700 transition-colors duration-300 tracking-tight text-center">
                        {formattedName}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
