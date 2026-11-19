import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import type { PortfolioProject } from '../types/portfolio';
import { formatDeliverableRoles } from '../utils/portfolioLogic';

interface CategoryFanCarouselProps {
  projects: PortfolioProject[];
  isVertical: boolean;
  onSelectProject: (project: PortfolioProject) => void;
  categoryTitle: string;
}

interface FanSlot {
  slotKey: string;
  sourceIndex: number;
  project: PortfolioProject;
}

const MIN_FAN_SLOTS = 5;

export function CategoryFanCarousel({
  projects,
  isVertical,
  onSelectProject,
  categoryTitle,
}: CategoryFanCarouselProps) {
  // If fewer than 5 projects, duplicate into slots so the fan always has full left/right wings
  const fanSlots: FanSlot[] = useMemo(() => {
    if (projects.length === 0) return [];
    const slots: FanSlot[] = [];
    let repeat = 0;
    while (slots.length < Math.max(MIN_FAN_SLOTS, projects.length)) {
      for (let i = 0; i < projects.length; i++) {
        slots.push({
          slotKey: `${projects[i].id}-slot-${slots.length}`,
          sourceIndex: i,
          project: projects[i],
        });
      }
      repeat++;
      if (repeat > 5) break;
    }
    return slots;
  }, [projects]);

  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;

  const totalSlots = fanSlots.length;

  const stepPrev = () => {
    if (totalSlots === 0) return;
    setActiveIndex((prev) => (prev - 1 + totalSlots) % totalSlots);
  };

  const stepNext = () => {
    if (totalSlots === 0) return;
    setActiveIndex((prev) => (prev + 1) % totalSlots);
  };

  // Keyboard navigation when user is focused or hovered
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;
      // Only handle if container or child is focused or mouse is inside
      if (
        container.matches(':hover') ||
        container.contains(document.activeElement)
      ) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          stepPrev();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          stepNext();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalSlots]);

  if (projects.length === 0 || fanSlots.length === 0) return null;

  const activeSlot = fanSlots[activeIndex % totalSlots];
  const activeProject = activeSlot?.project || projects[0];

  /**
   * Exact 3D Fan Transformation Math extracted from Framer CMS Fan Carousel:
   * - Center (diff = 0): scale 1.0, zIndex 10, rotZ 0, rotY 0
   * - Flank 1 (diff = ±1): scale 0.88, zIndex 8, downward arc y (+20px), rotZ (±6.5deg), rotY (∓13deg)
   * - Flank 2 (diff = ±2): scale 0.76, zIndex 6, downward arc y (+50px), rotZ (±13deg), rotY (∓22deg)
   * - Hidden (|diff| > 2): opacity 0, scale 0.65, pointerEvents none
   */
  const getFanTransform = (slotIndex: number) => {
    let diff = ((slotIndex - activeIndex) % totalSlots + totalSlots) % totalSlots;
    if (diff > totalSlots / 2) diff -= totalSlots;

    const absDiff = Math.abs(diff);

    // Responsive horizontal spacing multiplier
    const xStep = isVertical
      ? isMobile
        ? 110
        : isTablet
        ? 145
        : 175
      : isMobile
      ? 140
      : isTablet
      ? 200
      : 240;

    const yStep = isVertical ? 22 : 18;
    const rotZStep = isVertical ? 6.8 : 5.5;
    const rotYStep = isVertical ? 13 : 11;

    if (diff === 0) {
      return {
        x: 0,
        y: 0,
        z: 0,
        rotateZ: 0,
        rotateY: 0,
        scale: 1,
        opacity: 1,
        zIndex: 20,
        isCenter: true,
        diff: 0,
      };
    }

    if (absDiff === 1) {
      const sign = Math.sign(diff);
      return {
        x: sign * xStep,
        y: yStep,
        z: -50,
        rotateZ: sign * rotZStep,
        rotateY: -sign * rotYStep,
        scale: 0.88,
        opacity: 0.95,
        zIndex: 10,
        isCenter: false,
        diff,
      };
    }

    if (absDiff === 2) {
      const sign = Math.sign(diff);
      return {
        x: sign * xStep * 1.82,
        y: yStep * 2.3,
        z: -110,
        rotateZ: sign * rotZStep * 1.95,
        rotateY: -sign * rotYStep * 1.7,
        scale: 0.76,
        opacity: 0.8,
        zIndex: 5,
        isCenter: false,
        diff,
      };
    }

    // Hidden behind cards
    const sign = Math.sign(diff) || 1;
    return {
      x: sign * xStep * 2.2,
      y: yStep * 3.2,
      z: -180,
      rotateZ: sign * rotZStep * 2.4,
      rotateY: -sign * rotYStep * 2.1,
      scale: 0.65,
      opacity: 0,
      zIndex: 1,
      isCenter: false,
      diff,
    };
  };

  const handleCardClick = (slotIndex: number, project: PortfolioProject) => {
    let diff = ((slotIndex - activeIndex) % totalSlots + totalSlots) % totalSlots;
    if (diff > totalSlots / 2) diff -= totalSlots;

    if (diff === 0) {
      // Click center card opens the project video modal
      onSelectProject(project);
    } else {
      // Click flanking card brings that card directly to the center
      setActiveIndex(slotIndex);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full py-4 select-none overflow-hidden flex flex-col items-center"
    >
      {/* 3D Fan Stage with Framer Perspective */}
      <div
        style={{
          perspective: '1200px',
          perspectiveOrigin: '50% 50%',
        }}
        className={`relative w-full flex items-center justify-center overflow-visible ${
          isVertical
            ? 'h-[340px] sm:h-[400px] md:h-[450px] lg:h-[480px]'
            : 'h-[240px] sm:h-[300px] md:h-[350px] lg:h-[380px]'
        }`}
      >
        <div
          style={{ transformStyle: 'preserve-3d' }}
          className="relative w-full h-full flex items-center justify-center"
        >
          {fanSlots.map((slot, i) => {
            const transform = getFanTransform(i);
            const isClickable = Math.abs(transform.diff) <= 2;

            return (
              <motion.div
                key={slot.slotKey}
                initial={false}
                animate={{
                  x: transform.x,
                  y: transform.y,
                  z: transform.z,
                  rotateZ: transform.rotateZ,
                  rotateY: transform.rotateY,
                  scale: transform.scale,
                  opacity: transform.opacity,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 26,
                  mass: 0.85,
                }}
                style={{
                  zIndex: transform.zIndex,
                  transformStyle: 'preserve-3d',
                  willChange: 'transform, opacity',
                  pointerEvents: isClickable ? 'auto' : 'none',
                }}
                className={`group absolute cursor-pointer rounded-[24px] overflow-hidden bg-black border border-black/10 transition-shadow duration-300 ${
                  transform.isCenter
                    ? 'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.38),0_10px_20px_-5px_rgba(0,0,0,0.22)] hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.48)] hover:border-[#2563EB]/40'
                    : 'shadow-[0_15px_30px_-8px_rgba(0,0,0,0.22)] hover:opacity-100 hover:brightness-105'
                } ${
                  isVertical
                    ? 'w-[190px] h-[285px] sm:w-[240px] sm:h-[360px] md:w-[275px] md:h-[410px] lg:w-[290px] lg:h-[435px]'
                    : 'w-[260px] h-[162px] sm:w-[350px] sm:h-[218px] md:w-[420px] md:h-[262px] lg:w-[460px] lg:h-[288px]'
                }`}
                onClick={() => handleCardClick(i, slot.project)}
                role="button"
                tabIndex={transform.isCenter ? 0 : -1}
                aria-label={
                  transform.isCenter
                    ? `Xem chi tiết video ${slot.project.title}`
                    : `Chuyển tới dự án ${slot.project.title}`
                }
              >
                {/* Project Image */}
                <img
                  src={slot.project.coverImage}
                  alt={slot.project.title}
                  loading="eager"
                  draggable={false}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.dataset.hasFallenBack !== 'true') {
                      target.dataset.hasFallenBack = 'true';
                      target.src = '/assets/images/reel_saigon_neon_1794581940924.jpg';
                    }
                  }}
                  className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />

                {/* Subtle Vignette on side cards for realistic depth */}
                {!transform.isCenter && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-black/15 transition-opacity duration-300 group-hover:opacity-0 pointer-events-none"
                  />
                )}

                {/* Center Card Play Button on Hover */}
                {transform.isCenter && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/25"
                  >
                    <span className="w-13 h-13 rounded-full bg-white/95 backdrop-blur-md text-[#2563EB] flex items-center justify-center shadow-xl transition-transform duration-300 group-hover:scale-110">
                      <Play className="w-5 h-5 fill-current translate-x-0.5" />
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Synchronized CMS Fan Caption & Bottom Controls Bar */}
      <div className="mt-4 sm:mt-6 w-full max-w-xl px-4 flex items-center justify-between gap-4">
        {/* Left Arrow Button */}
        <button
          type="button"
          onClick={stepPrev}
          aria-label={`Dự án trước trong ${categoryTitle}`}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/90 hover:bg-black text-white shadow-md hover:shadow-lg border border-white/10 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-[#2563EB]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Center Animated Caption */}
        <div className="flex-1 min-w-0 text-center px-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeProject.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center"
            >
              {activeProject.clientOrAgency && (
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#2563EB] truncate max-w-full">
                  {activeProject.clientOrAgency}
                </span>
              )}
              <h4 className="font-bricolage text-sm sm:text-base md:text-lg font-bold text-[var(--morph-ink,#111111)] tracking-tight truncate max-w-full mt-0.5">
                {activeProject.title}
              </h4>
              <div className="flex items-center justify-center gap-2 mt-1 text-[11px] sm:text-xs text-[var(--morph-ink-muted,#555555)]">
                <span className="truncate max-w-[200px] sm:max-w-none">
                  {formatDeliverableRoles(activeProject.deliverableRole)}
                </span>
                <span>·</span>
                <span className="tabular-nums font-semibold">
                  {activeProject.duration} ({activeProject.year})
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Arrow Button */}
        <button
          type="button"
          onClick={stepNext}
          aria-label={`Dự án kế tiếp trong ${categoryTitle}`}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/90 hover:bg-black text-white shadow-md hover:shadow-lg border border-white/10 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-[#2563EB]"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Counter & Hint */}
      <div className="mt-2 text-center text-[11px] text-[var(--morph-ink-muted,#777777)] font-medium">
        <span className="tabular-nums font-semibold">
          {String((activeIndex % projects.length) + 1).padStart(2, '0')} /{' '}
          {String(projects.length).padStart(2, '0')} DỰ ÁN
        </span>
        <span className="mx-2">·</span>
        <span>Bấm thẻ ở giữa hoặc tên dự án để phát video</span>
      </div>
    </div>
  );
}
