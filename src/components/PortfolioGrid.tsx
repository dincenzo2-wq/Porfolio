import React, { useState, useMemo } from "react";
import { Project, AppTheme } from "../types";
import { formatCategory } from "../utils/titleCase";
import { 
  ExternalLink, 
  Github, 
  Search, 
  Layers, 
  SlidersHorizontal, 
  Play, 
  Clock, 
  Tv, 
  X, 
  Sliders, 
  Eye, 
  EyeOff, 
  Sparkles, 
  RotateCcw,
  Camera,
  Film,
  Volume2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface PortfolioGridProps {
  projects: Project[];
  theme: AppTheme;
}

export default function PortfolioGrid({ projects, theme }: PortfolioGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("Tất cả");
  const [searchTerm, setSearchTerm] = useState<string>("");
  
  // Interactive Lightbox States
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Retrieve unique categories plus "Tất cả" dynamically from real DB projects, sorted by predefined order
  const categories = useMemo(() => {
    const PREDEFINED_ORDER = [
      "TVC",
      "COMMERCIAL",
      "TRAVEL",
      "WEDDING",
      "SOCIAL",
      "CINEMATIC REEL",
      "MUSIC VIDEO",
      "SHORT FILM",
      "DOCUMENTARY",
      "VIDEOGRAPHY"
    ];

    const cats = new Set<string>();
    projects.forEach((p) => {
      if (p.category) {
        let cat = p.category.trim().toUpperCase();
        cats.add(cat);
      }
    });

    const sortedCats = Array.from(cats).sort((a, b) => {
      const indexA = PREDEFINED_ORDER.indexOf(a);
      const indexB = PREDEFINED_ORDER.indexOf(b);
      const finalIndexA = indexA === -1 ? 999 : indexA;
      const finalIndexB = indexB === -1 ? 999 : indexB;
      return finalIndexA - finalIndexB;
    });

    return ["Tất cả", ...sortedCats];
  }, [projects]);

  // Real-time project filtration (case-insensitive and normalized for robust Cloudflare D1 sync)
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      let pCat = p.category ? p.category.trim().toUpperCase() : "";

      let selCat = selectedCategory ? selectedCategory.trim().toUpperCase() : "";

      const matchCat = 
        selectedCategory === "Tất cả" || 
        selectedCategory === "All" || 
        (pCat === selCat);

      const matchSearch = 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (Array.isArray(p.tags) && p.tags.some((t) => typeof t === "string" && t.toLowerCase().includes(searchTerm.toLowerCase())));
      return matchCat && matchSearch;
    });
  }, [projects, selectedCategory, searchTerm]);

  return (
    <section id="projects-section" className="py-24 border-t border-slate-200 px-4 bg-slate-50">
      <div className="max-w-[82rem] mx-auto">
        
        {/* Header Elements */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-16 select-none">
          <div>
            <p className="text-[13px] font-bold text-sky-600 font-mono uppercase tracking-[0.2em] mb-3">GALLERY EXHIBITION</p>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold font-display tracking-[-0.05em] leading-none text-slate-900">Tác phẩm & Thước phim</h2>
            <p className="text-[14px] sm:text-sm text-slate-600 mt-3 max-w-sm">Tuyển tập những dự án video, TVC thương hiệu và thước phim nghệ thuật đã qua xử lý hậu kỳ chuyên sâu.</p>
          </div>

          {/* Quick Real-time Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm dự án, định dạng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-[13px] text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-sky-500 focus:outline-hidden transition-all duration-300 shadow-xs"
            />
          </div>
        </div>

        {/* Categories filtration system with dynamically synchronized categories */}
        <div className="flex flex-wrap items-center gap-2 mb-10 select-none">
          <div className="flex items-center gap-1.5 text-[13px] text-slate-500 mr-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" /> Bộ lọc:
          </div>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-5 py-2 text-[13px] font-semibold transition-all duration-300 cursor-pointer ${
                selectedCategory === cat
                  ? "bg-slate-900 text-white font-semibold shadow-xs scale-102"
                  : "bg-white border border-slate-200 text-slate-600 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              {cat === "Tất cả" ? "Tất cả" : formatCategory(cat)}
            </button>
          ))}
        </div>

        {/* Interactive Listing Grid - pure 16:9 thumbnail cover cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((p) => (
              <motion.div
                layout="position"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                key={`${selectedCategory}-${p.id}`}
                onClick={() => setSelectedProject(p)}
                className="group flex flex-col cursor-pointer transition-all duration-300 hover:-translate-y-1"
              >
                {/* KHỐI ẢNH THUMBNAIL (ASPECT VIDEO BOX CỐ ĐỊNH 16:9 CHỐNG MÉO/STRETCH) */}
                <div className="relative overflow-hidden rounded-xl aspect-[16/9] bg-slate-100 border border-slate-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.04)] group-hover:shadow-[0_12px_30px_rgba(0,0,0,0.1)] group-hover:border-slate-300/50 transition-all duration-300 group">
                  {/* Crisp inner border bounding ring to separate bright image edges from the light background */}
                  <div className="absolute inset-0 rounded-xl ring-1 ring-black/5 ring-inset pointer-events-none z-10" />
                  {/* 100% card filling standard 16:9 aspect ratio picture */}
                  <img 
                    src={p.thumbnailUrl || "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&q=80&w=600"}
                    alt={p.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 select-none filter brightness-[1.05] contrast-[1.02] saturate-[1.03] group-hover:scale-105 group-hover:brightness-[1.08]"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src.includes("maxresdefault.jpg")) {
                        target.src = target.src.replace("maxresdefault.jpg", "hqdefault.jpg");
                      }
                    }}
                  />

                  {/* Play Button Overlay on Hover */}
                  <div className="absolute inset-0 bg-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center pointer-events-none z-20">
                    <div className="h-11 w-11 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md scale-90 group-hover:scale-100 transition-transform duration-300">
                      <Play className="h-4 w-4 text-slate-800 fill-slate-800 translate-x-0.5" />
                    </div>
                  </div>

                  {/* Left/Right Overlays */}
                  <div className="absolute top-3 left-3 flex gap-2 select-none z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[13px] font-bold font-mono bg-slate-900/80 text-sky-400 shadow-sm uppercase">
                      <Tv className="h-3.5 w-3.5" /> {p.resolution || "4K UHD"}
                    </span>
                  </div>
                  {p.duration && (
                    <div className="absolute top-3 right-3 flex gap-2 select-none z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[13px] font-bold font-mono bg-slate-900/80 text-white shadow-sm">
                        <Clock className="h-3.5 w-3.5 text-slate-400" /> {p.duration}
                      </span>
                    </div>
                  )}
                </div>

                {/* KHỐI THÔNG TIN CHỮ PHÍA DƯỚI (TEXT CONTAINER) */}
                <div className="mt-3 px-1 text-left">
                  {/* DÒNG 1 (TÊN DỰ ÁN) */}
                  <h3 className="text-slate-900 font-medium text-base truncate" title={p.title}>
                    {p.title}
                  </h3>
                  {/* DÒNG 2 (METADATA) */}
                  <p className="text-slate-500 text-sm mt-0.5">
                    {formatCategory(p.category)} • {p.year || "2025"}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty filtration status view */}
        {filteredProjects.length === 0 && (
          <div className="text-center py-16 border border-dashed border-slate-200 rounded-3xl bg-white">
            <p className="text-[14px] text-slate-400 font-mono">Không tìm thấy tác phẩm nào phù hợp khẩu vị tìm kiếm.</p>
          </div>
        )}

      </div>

      {/* CINEMATIC VIDEO PLAYBACK LIGHTBOX POPUP */}
      <AnimatePresence>
        {selectedProject && (
          <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden flex items-center justify-center p-4">
            {/* Soft dark blur-glass backdrop overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProject(null)}
              className="fixed inset-0 bg-black/90 backdrop-blur-md"
            />

            {/* Main Interactive Lightbox Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="relative w-full max-w-4xl bg-[#09090b] rounded-3xl border border-neutral-800/80 shadow-[0_0_50px_rgba(0,0,0,0.85)] overflow-hidden z-10 flex flex-col"
            >
              {/* Close Button at top-right */}
              <button 
                onClick={() => setSelectedProject(null)}
                className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-black/60 backdrop-blur-md border border-neutral-800 text-neutral-400 hover:text-white hover:scale-105 hover:bg-black/85 transition-all cursor-pointer"
                title="Đóng trình phát"
              >
                <X className="h-5 w-5" />
              </button>

              {/* 16:9 Aspect ratio Video viewport projection */}
              <div className="relative aspect-video w-full bg-black border-b border-neutral-900 select-none">
                {selectedProject.youtubeEmbedUrl ? (
                  <iframe
                    src={selectedProject.youtubeEmbedUrl.includes('?') 
                      ? `${selectedProject.youtubeEmbedUrl}&autoplay=1` 
                      : `${selectedProject.youtubeEmbedUrl}?autoplay=1`
                    }
                    title={selectedProject.title}
                    className="absolute inset-0 w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-neutral-950">
                    <Film className="h-12 w-12 text-zinc-600 mb-3 animate-pulse" />
                    <p className="text-[14px] font-semibold text-neutral-400">Dự án này chưa được liên kết định dạng Video trực tiếp.</p>
                    <img 
                      src={selectedProject.thumbnailUrl || "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&q=80&w=1200"}
                      alt={selectedProject.title}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src.includes("maxresdefault.jpg")) {
                          target.src = target.src.replace("maxresdefault.jpg", "hqdefault.jpg");
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Interactive Metadata and Cinematic Details strip */}
              <div className="p-6 md:p-8 space-y-5 bg-[#0d0d0f]/95 text-left max-h-[40vh] overflow-y-auto">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2.5">
                    {/* Meta tags with premium visual design */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-extrabold font-mono bg-sky-500/10 text-sky-400 border border-sky-400/20 uppercase tracking-wider">
                        {formatCategory(selectedProject.category)}
                      </span>
                      {selectedProject.year && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[13px] font-bold font-mono bg-neutral-900 text-neutral-400 border border-neutral-800">
                          {selectedProject.year}
                        </span>
                      )}
                      {selectedProject.resolution && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[13px] font-bold font-mono bg-neutral-900 text-neutral-400 border border-neutral-800">
                          <Tv className="h-3.5 w-3.5 text-neutral-500" /> {selectedProject.resolution}
                        </span>
                      )}
                      {selectedProject.duration && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[13px] font-bold font-mono bg-neutral-900 text-neutral-400 border border-neutral-800">
                          <Clock className="h-3.5 w-3.5 text-neutral-500" /> {selectedProject.duration}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl md:text-2xl font-bold font-display text-white tracking-tight leading-snug">
                      {selectedProject.title}
                    </h3>
                  </div>
                </div>

                {/* Separator line */}
                <div className="h-[1px] bg-neutral-900 w-full" />

                {/* Project Description text */}
                {selectedProject.description && 
                  !selectedProject.description.includes("được thực hiện tỉ mỉ") && 
                  !selectedProject.description.includes("Dự án phim thể loại") && (
                  <p className="text-neutral-300 text-sm leading-relaxed max-w-4xl whitespace-pre-line font-medium">
                    {selectedProject.description}
                  </p>
                )}

                {/* Info Grid - 2 columns symmetric (each side exactly 2 rows) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 pt-4 border-t border-neutral-900 text-[13px] sm:text-sm select-text">
                  {/* Column 1 */}
                  <div className="space-y-2.5">
                    <div className="flex items-baseline gap-1.5 font-light text-neutral-300">
                      <span className="text-slate-500 font-normal shrink-0">Khách hàng (Client):</span>
                      <span className="leading-relaxed">{selectedProject.client || "Nha khoa Sài Gòn"}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 font-light text-neutral-300">
                      <span className="text-slate-500 font-normal shrink-0">Vai trò (Role):</span>
                      <span className="leading-relaxed">{selectedProject.role || "Video Editor & Director"}</span>
                    </div>
                  </div>
                  {/* Column 2 */}
                  <div className="space-y-2.5">
                    <div className="flex items-baseline gap-1.5 font-light text-neutral-300">
                      <span className="text-slate-500 font-normal shrink-0">Thông số (Specs):</span>
                      <span className="leading-relaxed">
                        {selectedProject.resolution || "16:9"} | {selectedProject.duration || "45s"}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5 font-light text-neutral-300">
                      <span className="text-slate-500 font-normal shrink-0">Nền tảng (Platform):</span>
                      <span className="leading-relaxed">{selectedProject.platform || "Facebook, YouTube Shorts"}</span>
                    </div>
                  </div>
                </div>


              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
