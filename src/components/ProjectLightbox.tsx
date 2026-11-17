import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
import type { PortfolioProject } from '../types/portfolio';
import { parseVideoUrl } from '../utils/videoEmbed';
import { formatDeliverableRoles } from '../utils/portfolioLogic';

interface ProjectLightboxProps {
  project: PortfolioProject | null;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}

export function ProjectLightbox({ project, onClose, onNavigate }: ProjectLightboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Plyr | null>(null);

  // Cleanly stop & destroy Plyr player instance
  const destroyPlayer = () => {
    if (playerRef.current) {
      try {
        playerRef.current.stop();
        playerRef.current.destroy();
      } catch (err) {
        console.warn('Error destroying Plyr instance:', err);
      }
      playerRef.current = null;
    }
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
  };

  const handleClose = () => {
    destroyPlayer();
    onClose();
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    destroyPlayer();
    onNavigate(direction);
  };

  // Keyboard navigation: Esc to close, ArrowLeft / ArrowRight to switch projects
  useEffect(() => {
    if (!project) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNavigate('next');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleNavigate('prev');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [project, onClose, onNavigate]);

  // Plyr video player lifecycle with complete DOM isolation from React reconciliation
  useEffect(() => {
    if (!project) {
      destroyPlayer();
      return;
    }

    const parsedVideo = parseVideoUrl(project.videoUrl);
    const isDirectVideo = parsedVideo.type === 'direct' && !!project.videoUrl;

    if (!isDirectVideo || !containerRef.current) {
      destroyPlayer();
      return;
    }

    destroyPlayer();

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      const src = parsedVideo.directUrl || project.videoUrl;
      if (!src) return;

      const videoEl = document.createElement('video');
      videoEl.src = src;
      if (project.coverImage) {
        videoEl.poster = project.coverImage;
      }
      videoEl.playsInline = true;
      videoEl.preload = 'metadata';
      videoEl.className = 'w-full h-full object-cover';
      containerRef.current.appendChild(videoEl);

      try {
        const player = new Plyr(videoEl, {
          controls: [
            'play-large',
            'play',
            'progress',
            'current-time',
            'mute',
            'volume',
            'fullscreen',
          ],
          hideControls: true,
          resetOnEnd: true,
          keyboard: { focused: true, global: false },
          tooltips: { controls: true, seek: true },
          autoplay: true,
        });

        playerRef.current = player;
      } catch (err) {
        console.warn('Failed to initialize Plyr player:', err);
      }
    }

    return () => {
      destroyPlayer();
    };
  }, [project?.id, project?.videoUrl, project?.aspectRatio]);

  if (!project) return null;

  const isVertical = project.aspectRatio === '9:16';

  // Helper to render media element (YouTube / Vimeo / Plyr Direct Video / Image)
  const renderMedia = () => {
    const parsedVideo = parseVideoUrl(project.videoUrl);
    if (parsedVideo.type === 'youtube' || parsedVideo.type === 'vimeo') {
      return (
        <iframe
          src={parsedVideo.embedUrl}
          title={project.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full border-0"
        />
      );
    }

    if (parsedVideo.type === 'direct' && project.videoUrl) {
      return (
        <div
          ref={containerRef}
          className="w-full h-full flex items-center justify-center bg-black overflow-hidden"
        />
      );
    }

    return (
      <img
        src={project.coverImage}
        alt={project.title}
        className="w-full h-full object-cover"
      />
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Chi tiết dự án ${project.title}`}
        onClick={handleClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-y-auto flex items-center justify-center p-3 sm:p-6"
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className={`w-full bg-white border border-black/10 rounded-2xl shadow-2xl text-[#111111] ${
            isVertical
              ? 'max-w-3xl p-5 sm:p-6 space-y-4'
              : 'max-w-4xl p-5 sm:p-7 space-y-5'
          }`}
        >
          {/* Top Bar: Category badge at left, Close button at right (Clean, no duplicates) */}
          <div className="flex items-center justify-between gap-4 border-b border-black/8 pb-3.5">
            <span className="px-3 py-1 rounded-full bg-[#111111] text-white text-xs font-semibold uppercase tracking-wider font-mono">
              {project.category}
            </span>

            <button
              type="button"
              onClick={handleClose}
              aria-label="Đóng trình chiếu (Esc)"
              title="Đóng (Esc)"
              className="p-1.5 rounded-full border border-black/10 text-[#666666] hover:text-[#111111] hover:border-black/30 hover:bg-black/5 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Conditional Layout: Vertical (9:16) vs Horizontal (16:9) */}
          {isVertical ? (
            /* 9:16 Adaptive 2-Column Split: Video left (col-5), Details right (col-7) */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Left Column: Vertical 9:16 Video Frame */}
              <div className="md:col-span-5 flex justify-center">
                <div className="w-full max-w-[260px] sm:max-w-[280px] aspect-[9/16] max-h-[72vh] mx-auto rounded-xl overflow-hidden bg-black shadow-lg relative border border-black/10 flex items-center justify-center">
                  {renderMedia()}
                </div>
              </div>

              {/* Right Column: Title, Brief, Specs & Navigation */}
              <div className="md:col-span-7 flex flex-col justify-center space-y-4">
                {/* Tiêu đề */}
                <h2 className="font-bricolage text-xl sm:text-2xl text-[#111111] font-bold tracking-tight uppercase leading-snug">
                  {project.title}
                </h2>

                {/* Dòng 1: Mô tả ngắn dự án */}
                {project.agencyBrief && (
                  <p className="text-sm text-[#555555] leading-relaxed">
                    {project.agencyBrief}
                  </p>
                )}

                {/* Dòng 2: Thanh thông số gồm Khách hàng / Agency, Vai trò, Năm, Thời lượng */}
                <div className="pt-3 border-t border-black/8 space-y-2 text-xs text-[#666666]">
                  {project.clientOrAgency?.trim() && (
                    <div>
                      <span className="text-black/45">Khách hàng / Agency:</span>{' '}
                      <span className="font-semibold text-[#111111]">
                        {project.clientOrAgency.trim()}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-black/45">Vai trò đảm nhiệm:</span>{' '}
                    <span className="font-semibold text-[#111111]">
                      {formatDeliverableRoles(project.deliverableRole)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 pt-0.5">
                    <div>
                      <span className="text-black/45">Năm:</span>{' '}
                      <span className="font-semibold text-[#111111] tabular-nums">
                        {project.year}
                      </span>
                    </div>
                    <span className="text-black/20">·</span>
                    <div>
                      <span className="text-black/45">Thời lượng:</span>{' '}
                      <span className="font-semibold text-[#111111] tabular-nums">
                        {project.duration}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Nút chuyển dự án */}
                <div className="pt-2 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleNavigate('prev')}
                    title="Dự án trước (←)"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-black/10 text-xs font-semibold text-[#555555] hover:text-[#111111] hover:border-black/30 hover:bg-black/5 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Dự án trước</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigate('next')}
                    title="Dự án tiếp theo (→)"
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#111111] text-white hover:bg-black/85 text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-98"
                  >
                    <span>Dự án tiếp theo</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* 16:9 Standard Layout: Video centered (16:9), Details stacked below */
            <div className="space-y-4">
              {/* Media Frame (16:9) */}
              <div className="w-full flex justify-center bg-[#F7F6F2] rounded-xl overflow-hidden border border-black/6 p-2">
                <div className="relative w-full aspect-[16/9] overflow-hidden rounded-lg bg-black">
                  {renderMedia()}
                </div>
              </div>

              {/* Project Details */}
              <div className="space-y-3 pt-1">
                {/* Tiêu đề video */}
                <h2 className="font-bricolage text-xl sm:text-2xl text-[#111111] font-bold tracking-tight uppercase leading-snug">
                  {project.title}
                </h2>

                {/* Dòng 1: Mô tả ngắn dự án */}
                {project.agencyBrief && (
                  <p className="text-sm text-[#555555] leading-relaxed">
                    {project.agencyBrief}
                  </p>
                )}

                {/* Dòng 2: Thanh thông số gồm Khách hàng / Agency, Vai trò, Năm, Thời lượng + Nút điều hướng */}
                <div className="pt-3 border-t border-black/8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#666666]">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 leading-normal">
                    {project.clientOrAgency?.trim() && (
                      <>
                        <div>
                          <span className="text-black/45">Khách hàng / Agency:</span>{' '}
                          <span className="font-semibold text-[#111111]">
                            {project.clientOrAgency.trim()}
                          </span>
                        </div>
                        <span className="text-black/20 hidden sm:inline">·</span>
                      </>
                    )}
                    <div>
                      <span className="text-black/45">Vai trò:</span>{' '}
                      <span className="font-semibold text-[#111111]">
                        {formatDeliverableRoles(project.deliverableRole)}
                      </span>
                    </div>
                    <span className="text-black/20 hidden sm:inline">·</span>
                    <div>
                      <span className="text-black/45">Năm:</span>{' '}
                      <span className="font-semibold text-[#111111] tabular-nums">
                        {project.year}
                      </span>
                    </div>
                    <span className="text-black/20 hidden sm:inline">·</span>
                    <div>
                      <span className="text-black/45">Thời lượng:</span>{' '}
                      <span className="font-semibold text-[#111111] tabular-nums">
                        {project.duration}
                      </span>
                    </div>
                  </div>

                  {/* Nút chuyển dự án */}
                  <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => handleNavigate('prev')}
                      title="Dự án trước (←)"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-black/10 text-[#555555] hover:text-[#111111] hover:border-black/25 hover:bg-black/5 transition-all cursor-pointer text-xs font-medium"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Trước</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigate('next')}
                      title="Dự án tiếp theo (→)"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-black/10 text-[#555555] hover:text-[#111111] hover:border-black/25 hover:bg-black/5 transition-all cursor-pointer text-xs font-medium"
                    >
                      <span>Tiếp</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
