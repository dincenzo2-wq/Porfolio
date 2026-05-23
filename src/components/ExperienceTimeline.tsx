import React, { useRef, useEffect, useState } from "react";
import { Experience, AppTheme } from "../types";
import { Calendar, Briefcase, GraduationCap, Video, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { formatTitleCase } from "../utils/titleCase";

interface ExperienceTimelineProps {
  workExperienceData: Experience[];
  educationData: Experience[];
  theme: AppTheme;
}

// Programmatically repairs text truncation or data slicing bugs on Vietnamese descriptions
const cleanDescription = (desc: string) => {
  if (!desc) return "";
  let clean = desc.trim();
  
  // Fix database slicing issues where first letters were cut off during sync/migrations
  if (clean.toLowerCase().startsWith("hịu trách nhiệm")) {
    clean = "Chịu trách nhiệm" + clean.substring("hịu trách nhiệm".length);
  } else if (clean.toLowerCase().startsWith("ấm máy")) {
    clean = "Bấm máy" + clean.substring("ấm máy".length);
  } else if (clean.toLowerCase().startsWith("ử lý toàn bộ")) {
    clean = "Xử lý toàn bộ" + clean.substring("ử lý toàn bộ".length);
  }
  
  // Capitalize the first letter if it is lowercase
  if (clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return clean;
};

export default function ExperienceTimeline({ workExperienceData, educationData, theme }: ExperienceTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Helper selectors to keep styling uniform and mapped to the current theme palette
  const getAccentTextColor = (themeId: string) => {
    switch (themeId) {
      case "emerald": return "text-emerald-600";
      case "coral": return "text-rose-600";
      case "violet": return "text-violet-600";
      case "nord": return "text-cyan-600 font-medium";
      case "cinema":
      default:
        return "text-sky-600";
    }
  };

  const getAccentBorderHover = (themeId: string) => {
    switch (themeId) {
      case "emerald": return "group-hover:border-emerald-500 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.35)]";
      case "coral": return "group-hover:border-rose-500 group-hover:shadow-[0_0_15px_rgba(244,63,94,0.35)]";
      case "violet": return "group-hover:border-violet-500 group-hover:shadow-[0_0_15px_rgba(139,92,246,0.35)]";
      case "nord": return "group-hover:border-cyan-500 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.35)]";
      case "cinema":
      default:
        return "group-hover:border-sky-500 group-hover:shadow-[0_0_15px_rgba(56,189,248,0.35)]";
    }
  };

  const getDotColor = (themeId: string) => {
    switch (themeId) {
      case "emerald": return "bg-emerald-500";
      case "coral": return "bg-rose-500";
      case "violet": return "bg-violet-500";
      case "nord": return "bg-cyan-500";
      case "cinema":
      default:
        return "bg-sky-500";
    }
  };

  const getActiveRingColor = (themeId: string) => {
    switch (themeId) {
      case "emerald": return "border-emerald-500 ring-emerald-500/5";
      case "coral": return "border-rose-500 ring-rose-500/5";
      case "violet": return "border-violet-500 ring-violet-500/5";
      case "nord": return "border-cyan-500 ring-cyan-500/5";
      case "cinema":
      default:
        return "border-sky-400 ring-sky-500/5";
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollLeft = target.scrollLeft;
    const cardWidth = 340; // width of each card
    const newIndex = Math.round(scrollLeft / cardWidth);
    if (newIndex >= 0 && newIndex < sortedWork.length) {
      setActiveIndex(newIndex);
    }
  };

  const handleDotClick = (index: number) => {
    const container = containerRef.current;
    if (container) {
      const cardWidth = 340;
      container.scrollTo({
        left: index * cardWidth,
        behavior: "smooth"
      });
      setActiveIndex(index);
    }
  };

  const scrollPrev = () => {
    const container = containerRef.current;
    if (container) {
      container.scrollBy({ left: -340, behavior: "smooth" });
    }
  };

  const scrollNext = () => {
    const container = containerRef.current;
    if (container) {
      container.scrollBy({ left: 340, behavior: "smooth" });
    }
  };

  // Wheel event listener to redirect vertical scroll to horizontal scroll on the Work track
  // AND Mouse drag-to-scroll gesture logic
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      
      // Check if we are on a screen width that uses desktop columns
      if (window.innerWidth >= 1024) {
        e.preventDefault();
        container.scrollLeft += e.deltaY * 1.2;
      }
    };

    // Mouse drag scroll variables
    let isDown = false;
    let startX = 0;
    let scrollLeftState = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDown = true;
      container.style.scrollBehavior = "auto"; // temporary override to avoid drag lag
      startX = e.pageX - container.offsetLeft;
      scrollLeftState = container.scrollLeft;
    };

    const handleMouseLeave = () => {
      isDown = false;
      container.style.scrollBehavior = "";
    };

    const handleMouseUp = () => {
      isDown = false;
      container.style.scrollBehavior = "";
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 1.5; // Drag sensitivity
      container.scrollLeft = scrollLeftState - walk;
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("mousedown", handleMouseDown);
    container.addEventListener("mouseleave", handleMouseLeave);
    container.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("mousemove", handleMouseMove);

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("mousedown", handleMouseDown);
      container.removeEventListener("mouseleave", handleMouseLeave);
      container.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const sortedWork = [...workExperienceData].sort((a, b) => {
    const getStartYear = (periodStr: string) => {
      const match = periodStr.match(/\d{4}/);
      return match ? parseInt(match[0], 10) : 9999;
    };
    return getStartYear(a.period) - getStartYear(b.period);
  });

  const sortedEdu = [...educationData].sort((a, b) => {
    const getStartYear = (periodStr: string) => {
      const match = periodStr.match(/\d{4}/);
      return match ? parseInt(match[0], 10) : 9999;
    };
    return getStartYear(a.period) - getStartYear(b.period);
  });

  return (
    <section id="experience-section" className="py-24 border-t border-slate-200 px-4 bg-slate-50/50">
      <div className="max-w-[82rem] mx-auto">
        
        {/* Section title header */}
        <div className="text-left mb-16 select-none max-w-xl">
          <p className={`text-[13px] font-bold font-mono uppercase tracking-[0.2em] mb-3 ${getAccentTextColor(theme.id)}`}>
            PROFESSIONAL ROADMAP
          </p>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold font-display tracking-[-0.05em] leading-none text-slate-900">
            Hành trình Sự nghiệp
          </h2>
          <p className="text-slate-600 text-[14px] mt-3 leading-relaxed">
            Giao diện phân phối đa luồng mô phỏng bảng biên tập chuyên nghiệp.
          </p>
        </div>

        {/* 2-Column Editor Interface Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
          
          {/* CỘT BÊN TRÁI: FIXED METADATA PANEL (Học vấn) */}
          <div className={`lg:col-span-4 p-8 rounded-2xl border flex flex-col justify-between transition-all duration-300 ${theme.cardBg}`}>
            <div>
              <div className="text-[13px] font-semibold font-mono tracking-[0.2em] text-slate-500 uppercase flex items-center gap-2 border-b border-slate-200 pb-3 mb-6">
                <GraduationCap className={`h-4 w-4 ${getAccentTextColor(theme.id)}`} />
                <span>HỌC VẤN NỀN TẢNG</span>
              </div>

              <div className="space-y-8">
                {sortedEdu.map((edu) => (
                  <div key={edu.id} className="group py-2 snap-start snap-always flex-shrink-0">
                    <div className="flex items-center gap-1.5 text-[13px] text-slate-500 font-mono mb-2">
                      <Calendar className={`h-3.5 w-3.5 opacity-60 ${getAccentTextColor(theme.id)}`} />
                      <span>{edu.period}</span>
                    </div>
                    <h4 className="text-[14px] font-bold text-slate-900 transition-colors duration-250 select-text">
                      {edu.role ? formatTitleCase(edu.role) : "Học sinh hệ chính quy"}
                    </h4>
                    <p className={`text-[13px] sm:text-[14px] font-semibold font-sans tracking-wide mt-1.5 select-text font-medium ${getAccentTextColor(theme.id)}`}>
                      {formatTitleCase(edu.company)}
                    </p>
                    {edu.description && (
                      <p className="text-[13px] text-slate-500 font-light mt-3 leading-relaxed select-text border-l border-slate-200 pl-3">
                        {cleanDescription(edu.description)}
                      </p>
                    )}
                  </div>
                ))}
                {sortedEdu.length === 0 && (
                  <p className="text-[13px] text-slate-400 italic select-none">Chưa có thông tin học vấn</p>
                )}
              </div>
            </div>
          </div>

          {/* CỘT BÊN PHẢI: ROLLING WORK TIMELINE TRACK (Sự nghiệp) */}
          <div className={`lg:col-span-8 p-8 rounded-2xl border flex flex-col justify-between select-text relative overflow-hidden transition-all duration-300 ${theme.cardBg}`}>
            
            <div className="w-full">
              <div className="text-[13px] font-semibold font-mono tracking-[0.2em] text-slate-500 uppercase flex items-center gap-2 border-b border-slate-200 pb-3 mb-2">
                <Video className={`h-4 w-4 ${getAccentTextColor(theme.id)}`} />
                <span>KINH NGHIỆM THỰC CHIẾN</span>
              </div>

              {sortedWork.length > 0 ? (
                <div className="relative group/track select-none py-2 flex flex-col justify-center min-h-[340px] mt-6">
                  
                  {/* Floating Prev Button */}
                  <button 
                    onClick={scrollPrev} 
                    className="absolute left-2 top-[48%] -translate-y-1/2 z-30 h-9 w-9 rounded-full bg-white/95 border border-slate-200 flex items-center justify-center shadow-md hover:bg-slate-50 active:scale-95 transition-all cursor-pointer opacity-0 group-hover/track:opacity-100"
                    aria-label="Xem mốc thời gian trước"
                    title="Mốc trước"
                  >
                    <ChevronLeft className="h-5 w-5 text-slate-600" />
                  </button>

                  {/* Floating Next Button */}
                  <button 
                    onClick={scrollNext} 
                    className="absolute right-2 top-[48%] -translate-y-1/2 z-30 h-9 w-9 rounded-full bg-white/95 border border-slate-200 flex items-center justify-center shadow-md hover:bg-slate-50 active:scale-95 transition-all cursor-pointer opacity-0 group-hover/track:opacity-100"
                    aria-label="Xem mốc thời gian sau"
                    title="Mốc sau"
                  >
                    <ChevronRight className="h-5 w-5 text-slate-600" />
                  </button>

                  {/* Scroll Container with scroll affordance padding */}
                  <div 
                    ref={containerRef}
                    onScroll={handleScroll}
                    className="flex overflow-x-auto gap-0 pb-6 pt-8 cursor-grab active:cursor-grabbing scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth snap-x snap-mandatory pl-2 pr-20 relative z-10"
                  >
                    {/* Premiere/DaVinci inspired Editor Timeline Track Line */}
                    <div 
                      className="absolute top-[26px] h-[2px] bg-slate-200 z-0 pointer-events-none"
                      style={{
                        left: `calc(${(100 / sortedWork.length) / 2}% + 8px)`,
                        right: `calc(${(100 / sortedWork.length) / 2}% + 8px)`,
                        width: `calc(100% - ${100 / sortedWork.length}%)`
                      }}
                    >
                      {/* Timeline Ruler Tick marks */}
                      <div className="absolute inset-x-0 h-1.5 -top-[2px] flex justify-between px-2 opacity-25">
                        {Array.from({ length: sortedWork.length * 5 }).map((_, i) => (
                          <div key={i} className="w-[1px] h-full bg-slate-400" />
                        ))}
                      </div>
                    </div>

                    {sortedWork.map((exp, idx) => {
                      const isActive = activeIndex === idx;
                      return (
                        <div 
                          key={exp.id} 
                          className="relative flex-shrink-0 w-[340px] snap-start snap-always flex flex-col items-center text-center px-4 group"
                        >
                          {/* Playhead Diamond Keyframe Node */}
                          <div className="relative mb-6 z-10 flex items-center justify-center h-5">
                            <div 
                              onClick={() => handleDotClick(idx)}
                              className={`h-4 w-4 rotate-45 border-2 bg-white flex items-center justify-center transition-all duration-300 cursor-pointer ${
                                isActive 
                                  ? `${getActiveRingColor(theme.id)} scale-125 shadow-lg` 
                                  : `border-slate-300 hover:border-slate-450 hover:scale-110`
                              }`}
                            >
                              <div className={`h-1.5 w-1.5 rotate-45 transition-all duration-300 ${
                                isActive ? getDotColor(theme.id) : "bg-slate-400 group-hover:bg-slate-600"
                              }`} />
                            </div>
                            
                            {/* Playhead vertical guide line */}
                            <div className={`absolute top-5 w-[1px] h-3 transition-all duration-300 ${
                              isActive ? "bg-sky-500/50" : "bg-slate-200 group-hover:bg-slate-350"
                            }`} />
                          </div>

                          {/* Interactive Card Style for Work */}
                          <div 
                            className={`flex flex-col items-center mt-2 px-5 py-5 rounded-xl border w-full transition-all duration-300 ${
                              isActive
                                ? `bg-white shadow-md scale-[1.02] z-20 ring-4 ${getActiveRingColor(theme.id)}`
                                : "bg-slate-50/70 border-slate-200/80 scale-[0.98] opacity-80 hover:opacity-100 hover:scale-[1] hover:bg-white hover:shadow-sm"
                            }`}
                          >
                            
                            {/* Line 1: Period with Calendar */}
                            <div className="flex items-center gap-1.5 text-[13px] text-slate-500 font-mono mb-2 group-hover:text-slate-750 transition-colors duration-200">
                              <Calendar className={`h-3.5 w-3.5 opacity-60 ${getAccentTextColor(theme.id)}`} />
                              <span>{exp.period}</span>
                            </div>

                            {/* Line 2: Role / Position */}
                            <h4 className="text-[14px] font-bold text-slate-800 transition-colors duration-200 select-text">
                              {formatTitleCase(exp.role)}
                            </h4>

                            {/* Line 3: Studio / Company */}
                            <span className={`text-[13px] sm:text-[14px] font-semibold font-sans tracking-wide mt-1.5 inline-block select-text font-medium ${getAccentTextColor(theme.id)}`}>
                              {formatTitleCase(exp.company)}
                            </span>

                            {/* Full Vietnamese Description (No Truncation) */}
                            {exp.description && (
                              <p className="text-[13px] text-slate-500 font-light mt-3 leading-relaxed text-center select-text max-w-[280px]">
                                {cleanDescription(exp.description)}
                              </p>
                            )}
                          </div>

                        </div>
                      );
                    })}

                    {/* Trailing Spacer to ensure the last card can be fully viewed without getting cut */}
                    <div className="w-24 flex-shrink-0" />
                  </div>

                  {/* Gradient cover at the right edge of the horizontal scroll for better scroll indicator */}
                  <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white via-white/40 to-transparent pointer-events-none z-20" />
                  
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-3xl mt-4">
                  <p className="text-[14px] text-slate-400">[ TIMELINE_WORK_EMPTY ]</p>
                </div>
              )}

              {/* Pagination Dots outside of the scroll region but inside the panel */}
              {sortedWork.length > 0 && (
                <div className="w-full flex justify-center items-center gap-2 mt-6 mb-2 z-30 relative select-none">
                  {sortedWork.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleDotClick(idx)}
                      className={`transition-all duration-300 cursor-pointer outline-none border-none ${
                        activeIndex === idx
                          ? `${getDotColor(theme.id)} w-5 h-1.5 rounded-full`
                          : "bg-slate-300 hover:bg-slate-400 w-1.5 h-1.5 rounded-full"
                      }`}
                      title={`Đến mốc ${idx + 1}`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
