import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { PortfolioProject } from '../types/portfolio';
import { parseVideoUrl } from '../utils/videoEmbed';
import { formatDeliverableRoles } from '../utils/portfolioLogic';

interface ProjectLightboxProps {
  project: PortfolioProject | null;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}

function isVerticalByMetadata(project: PortfolioProject): boolean {
  if (project.aspectRatio === '9:16') return true;
  const cat = (project.category || '').trim();
  return /9\s*:\s*16|social\s*9|reels?|tiktok|shorts?/i.test(cat);
}

export function ProjectLightbox({ project, onClose, onNavigate }: ProjectLightboxProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [detectedVertical, setDetectedVertical] = useState<boolean | null>(null);

  // Stop & release active video playback cleanly
  const stopVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      video.pause();
    } catch {}
  };

  const handleClose = () => {
    stopVideo();
    onClose();
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    stopVideo();
    onNavigate(direction);
  };

  // Reset runtime orientation detection whenever project changes
  useEffect(() => {
    setDetectedVertical(null);
  }, [project?.id, project?.videoUrl]);

  // Lock background page scroll while lightbox is open
  useEffect(() => {
    if (!project) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [project]);

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

  const isVertical = project
    ? detectedVertical !== null
      ? detectedVertical
      : isVerticalByMetadata(project)
    : false;

  const parsedVideo = project ? parseVideoUrl(project.videoUrl) : null;
  const directSrc = project ? parsedVideo?.directUrl || project.videoUrl : undefined;
  const formattedRoles = project ? formatDeliverableRoles(project.deliverableRole) : '';

  const handleVideoLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      setDetectedVertical(video.videoHeight > video.videoWidth);
    }
  };

  // Render media element: native <video controls> with object-contain bg-black (no cropped edges, no center play button)
  const renderMedia = () => {
    if (!project || !parsedVideo) return null;

    if (parsedVideo.type === 'youtube' || parsedVideo.type === 'vimeo' || parsedVideo.type === 'gdrive') {
      return (
        <iframe
          src={parsedVideo.embedUrl}
          title={project.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full border-0 bg-black"
        />
      );
    }

    if (parsedVideo.type === 'direct' && directSrc) {
      return (
        <video
          ref={videoRef}
          key={directSrc}
          src={directSrc}
          poster={project.coverImage || undefined}
          controls
          autoPlay
          playsInline
          preload="metadata"
          onLoadedMetadata={handleVideoLoadedMetadata}
          className="w-full h-full object-contain bg-black"
        />
      );
    }

    return (
      <img
        src={project.coverImage}
        alt={project.title}
        className="w-full h-full object-contain bg-black"
      />
    );
  };

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          key="project-lightbox-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`Chi tiết dự án ${project.title}`}
          onClick={handleClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md overflow-y-auto flex items-center justify-center p-3 sm:p-6"
        >
          <motion.div
            key={project.id}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`w-full bg-[#09090B] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.85)] text-[#F7F6F2] transition-[max-width] duration-300 ${
              isVertical
                ? 'max-w-[420px] p-4 sm:p-5 space-y-4'
                : 'max-w-4xl p-4 sm:p-6 space-y-4 sm:space-y-5'
            }`}
          >
            {/* Top Bar: Category pill + Ratio badge at left, Close button at right */}
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[#F7F6F2] text-xs font-bold uppercase tracking-wider font-sans truncate">
                  {project.category}
                </span>
                <span className="text-xs font-semibold tabular-nums text-white/70 font-sans shrink-0">
                  {isVertical ? '9:16' : '16:9'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleClose}
                aria-label="Đóng trình chiếu (Esc)"
                title="Đóng (Esc)"
                className="p-2 rounded-full border border-white/12 bg-white/[0.04] text-white/75 hover:text-white hover:border-white/30 hover:bg-white/12 transition-all cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Media Stage: 100% uncropped object-contain on pure black canvas */}
            <div className="w-full flex justify-center">
              <div
                className={`relative w-full overflow-hidden rounded-xl bg-black border border-white/10 flex items-center justify-center ${
                  isVertical
                    ? 'aspect-[9/16] max-h-[78vh]'
                    : 'aspect-[16/9] max-h-[78vh]'
                }`}
              >
                {renderMedia()}
              </div>
            </div>

            {/* Project Details: High-contrast Dark Studio editorial typography */}
            <div className="space-y-3 pt-0.5">
              <h2 className="font-bricolage text-lg sm:text-2xl text-[#F7F6F2] font-extrabold tracking-tight uppercase leading-snug">
                {project.title}
              </h2>

              {project.agencyBrief && (
                <p className="text-sm text-white/70 leading-relaxed">
                  {project.agencyBrief}
                </p>
              )}

              {/* Metadata bar + Prev / Next project controls */}
              <div
                className={`pt-3.5 border-t border-white/10 flex gap-3.5 text-xs ${
                  isVertical
                    ? 'flex-col'
                    : 'flex-col sm:flex-row sm:items-center justify-between'
                }`}
              >
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 leading-relaxed">
                  {project.clientOrAgency?.trim() && (
                    <div>
                      <span className="text-white/55">Khách hàng:</span>{' '}
                      <span className="font-semibold text-[#F7F6F2]">
                        {project.clientOrAgency.trim()}
                      </span>
                    </div>
                  )}
                  {formattedRoles && (
                    <div>
                      <span className="text-white/55">Vai trò:</span>{' '}
                      <span className="font-semibold text-[#F7F6F2]">
                        {formattedRoles}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-white/55">Năm:</span>{' '}
                    <span className="font-semibold text-[#F7F6F2] tabular-nums">
                      {project.year}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/55">Thời lượng:</span>{' '}
                    <span className="font-semibold text-[#F7F6F2] tabular-nums">
                      {project.duration}
                    </span>
                  </div>
                </div>

                {/* Prev / Next Navigation Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleNavigate('prev')}
                    title="Dự án trước (←)"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-white/15 bg-white/[0.04] text-white/85 hover:text-white hover:border-white/30 hover:bg-white/10 transition-all cursor-pointer text-xs font-semibold"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Trước</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigate('next')}
                    title="Dự án tiếp theo (→)"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#F7F6F2] text-[#09090B] hover:bg-[#3B82F6] hover:text-white transition-all cursor-pointer text-xs font-bold shadow-xs active:scale-95"
                  >
                    <span>Tiếp theo</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
