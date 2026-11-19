import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import type { PortfolioProject } from '../types/portfolio';
import { formatDeliverableRoles } from '../utils/portfolioLogic';

interface Category3DCarouselProps {
  projects: PortfolioProject[];
  isVertical: boolean;
  onSelectProject: (project: PortfolioProject) => void;
  categoryTitle: string;
}

interface ProjectSlot {
  slotKey: string;
  sourceIndex: number;
  project: PortfolioProject;
}

const MIN_RING_SLOTS = 8;
const AUTO_GLIDE_SPEED = 0.18; // cards per second (velvety gentle drift)

export function Category3DCarousel({
  projects,
  isVertical,
  onSelectProject,
  categoryTitle,
}: Category3DCarouselProps) {
  // 1. Repeat projects into a seamless cylindrical ring of 8-12 slots so the 3D arc never breaks
  const ringSlots: ProjectSlot[] = useMemo(() => {
    if (projects.length === 0) return [];
    const slots: ProjectSlot[] = [];
    let repeat = 0;
    while (slots.length < Math.max(MIN_RING_SLOTS, projects.length * 2)) {
      for (let i = 0; i < projects.length; i++) {
        slots.push({
          slotKey: `${projects[i].id}-r${repeat}-${slots.length}`,
          sourceIndex: i,
          project: projects[i],
        });
      }
      repeat++;
      if (repeat > 8) break;
    }
    return slots;
  }, [projects]);

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Physics refs for zero-jank 60fps DOM updates without React re-renders
  const offsetRef = useRef<number>(0);
  const velocityRef = useRef<number>(AUTO_GLIDE_SPEED);
  const targetOffsetRef = useRef<number | null>(null);
  const isHoveredRef = useRef<boolean>(false);
  const isInViewRef = useRef<boolean>(true);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragLastXRef = useRef<number>(0);
  const dragLastTimeRef = useRef<number>(0);
  const dragTotalDistRef = useRef<number>(0);

  const [isDraggingUI, setIsDraggingUI] = useState(false);
  const [activeCenterIndex, setActiveCenterIndex] = useState(0);

  // Apply 3D Cylindrical Concave Arc transforms directly to card DOM nodes
  const layoutCards = useCallback(() => {
    const count = ringSlots.length;
    if (count === 0) return;

    const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const isMobile = vw < 640;
    const isTablet = vw >= 640 && vw < 1024;

    // Radius and angular step calibrated for vertical vs landscape cards
    const R = isVertical
      ? (isMobile ? 550 : isTablet ? 800 : 1050)
      : (isMobile ? 750 : isTablet ? 1100 : 1400);

    const deltaThetaDeg = isVertical
      ? (isMobile ? 19 : isTablet ? 17 : 15.5)
      : (isMobile ? 21 : isTablet ? 19 : 18.2);

    const deltaThetaRad = (deltaThetaDeg * Math.PI) / 180;
    const currentOffset = offsetRef.current;

    let closestDistance = Infinity;
    let closestSourceIdx = 0;

    for (let i = 0; i < count; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;

      let d = ((i - currentOffset) % count + count) % count;
      if (d > count / 2) d -= count;

      if (Math.abs(d) < closestDistance) {
        closestDistance = Math.abs(d);
        closestSourceIdx = ringSlots[i].sourceIndex;
      }

      const thetaRad = d * deltaThetaRad;
      const thetaDeg = d * deltaThetaDeg;
      const absThetaDeg = Math.abs(thetaDeg);

      // Hide cards beyond horizon arc to optimize rendering
      if (absThetaDeg > 75) {
        el.style.opacity = '0';
        el.style.visibility = 'hidden';
        el.style.pointerEvents = 'none';
        continue;
      }

      const tx = R * Math.sin(thetaRad);
      const tz = R * (Math.cos(thetaRad) - 1);
      const rotY = thetaDeg;

      // Atmospheric falloff
      const normalizedAngle = absThetaDeg / 60;
      const blurPx = Math.min(3.5, Math.pow(Math.max(0, normalizedAngle - 0.2), 1.4) * 4);
      const opacity = Math.max(0.35, 1 - Math.pow(normalizedAngle, 1.4) * 0.65);
      const zIndex = Math.round(500 - absThetaDeg * 5);

      el.style.visibility = 'visible';
      el.style.pointerEvents = opacity > 0.4 ? 'auto' : 'none';
      el.style.opacity = opacity.toFixed(3);
      el.style.filter = blurPx > 0.3 ? `blur(${blurPx.toFixed(2)}px)` : 'none';
      el.style.zIndex = String(zIndex);
      el.style.transform = `translate3d(${tx.toFixed(2)}px, 0px, ${tz.toFixed(2)}px) rotateY(${rotY.toFixed(2)}deg)`;
    }

    setActiveCenterIndex(closestSourceIdx);
  }, [ringSlots, isVertical]);

  // Pause when out of view
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isInViewRef.current = entry.isIntersecting;
      },
      { rootMargin: '80px 0px 80px 0px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Continuous 60fps requestAnimationFrame loop
  useEffect(() => {
    if (ringSlots.length === 0) return;

    let rafId = 0;
    let lastTime = performance.now();
    layoutCards();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (isInViewRef.current && !document.hidden) {
        if (!isDraggingRef.current) {
          if (targetOffsetRef.current !== null) {
            const diff = targetOffsetRef.current - offsetRef.current;
            if (Math.abs(diff) < 0.003) {
              offsetRef.current = targetOffsetRef.current;
              targetOffsetRef.current = null;
            } else {
              offsetRef.current += diff * Math.min(1, dt * 8);
            }
            layoutCards();
          } else {
            // Velocity deceleration & subtle gentle drift
            if (Math.abs(velocityRef.current) > 0.001) {
              offsetRef.current += velocityRef.current * dt;
              const decay = Math.exp(-3.2 * dt);
              velocityRef.current *= decay;
              layoutCards();
            } else if (!isHoveredRef.current) {
              // Gentle auto-glide
              offsetRef.current += AUTO_GLIDE_SPEED * dt;
              layoutCards();
            }
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    const handleResize = () => layoutCards();
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [layoutCards, ringSlots.length]);

  // Pointer drag / swipe handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    isDraggingRef.current = true;
    targetOffsetRef.current = null;
    dragStartXRef.current = e.clientX;
    dragLastXRef.current = e.clientX;
    dragLastTimeRef.current = performance.now();
    dragTotalDistRef.current = 0;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const now = performance.now();
    const dx = e.clientX - dragLastXRef.current;
    const dt = Math.max((now - dragLastTimeRef.current) / 1000, 0.008);

    const prevDist = dragTotalDistRef.current;
    dragTotalDistRef.current += Math.abs(dx);
    dragLastXRef.current = e.clientX;
    dragLastTimeRef.current = now;

    if (dragTotalDistRef.current > 5) {
      if (prevDist <= 5) {
        setIsDraggingUI(true);
        velocityRef.current = 0;
      }
      const pxPerCard = window.innerWidth < 640 ? 190 : isVertical ? 260 : 360;
      const deltaCards = -dx / pxPerCard;
      offsetRef.current += deltaCards;
      velocityRef.current = Math.max(-2.8, Math.min(2.8, deltaCards / dt));
      layoutCards();
    }
  };

  const handlePointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDraggingUI(false);
  };

  // Click card: bring to center if flanking; launch lightbox if already at center
  const handleCardClick = (project: PortfolioProject, slotIndex: number) => {
    if (dragTotalDistRef.current > 8) return;

    const count = ringSlots.length;
    let d = ((slotIndex - offsetRef.current) % count + count) % count;
    if (d > count / 2) d -= count;

    if (Math.abs(d) <= 0.35) {
      onSelectProject(project);
    } else {
      targetOffsetRef.current = offsetRef.current + d;
    }
  };

  // Step Prev / Next buttons
  const stepPrev = () => {
    targetOffsetRef.current = Math.round(offsetRef.current) - 1;
  };

  const stepNext = () => {
    targetOffsetRef.current = Math.round(offsetRef.current) + 1;
  };

  if (projects.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="relative w-full py-4 select-none overflow-hidden"
    >
      {/* 3D Arc Stage Container */}
      <div
        onMouseEnter={() => {
          isHoveredRef.current = true;
        }}
        onMouseLeave={() => {
          isHoveredRef.current = false;
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          perspective: '1200px',
          perspectiveOrigin: '50% 50%',
          touchAction: 'pan-y',
        }}
        className={`relative w-full flex items-center justify-center overflow-visible ${
          isVertical
            ? 'h-[330px] sm:h-[400px] md:h-[460px] lg:h-[480px]'
            : 'h-[230px] sm:h-[280px] md:h-[330px] lg:h-[360px]'
        } ${isDraggingUI ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        {/* 3D Cylindrical Preserve Space */}
        <div
          style={{ transformStyle: 'preserve-3d' }}
          className="relative w-full h-full flex items-center justify-center"
        >
          {ringSlots.map((slot, i) => (
            <button
              key={slot.slotKey}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              type="button"
              onClick={() => handleCardClick(slot.project, i)}
              aria-label={`Xem dự án ${slot.project.title}`}
              style={{
                willChange: 'transform, opacity, filter',
                backfaceVisibility: 'hidden',
              }}
              className={`group absolute rounded-[16px] overflow-hidden bg-black border border-black/10 shadow-[0_12px_36px_rgba(0,0,0,0.18)] hover:shadow-[0_16px_44px_rgba(0,0,0,0.25)] focus-visible:outline-2 focus-visible:outline-[#2563EB] focus-visible:outline-offset-2 cursor-pointer transition-[border-color,box-shadow] duration-300 hover:border-[#2563EB]/40 ${
                isVertical
                  ? 'w-[175px] h-[275px] sm:w-[220px] sm:h-[350px] md:w-[260px] md:h-[420px] lg:w-[275px] lg:h-[440px]'
                  : 'w-[260px] h-[165px] sm:w-[340px] sm:h-[215px] md:w-[400px] md:h-[255px] lg:w-[440px] lg:h-[280px]'
              }`}
            >
              {/* Media Thumbnail */}
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
                className="w-full h-full object-cover pointer-events-none select-none transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />

              {/* Floating Frosted Play Indicator on Hover */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20"
              >
                <span className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-md text-black flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110">
                  <Play className="w-5 h-5 fill-current translate-x-0.5 text-[#2563EB]" />
                </span>
              </div>

              {/* Lower Third Editorial Caption Veil */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col justify-end p-3.5 sm:p-4 text-left transition-all duration-300"
              >
                {slot.project.clientOrAgency && (
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-blue-400 truncate">
                    {slot.project.clientOrAgency}
                  </span>
                )}
                <h4 className="font-bricolage text-xs sm:text-sm md:text-base font-bold text-white tracking-tight line-clamp-1 mt-0.5">
                  {slot.project.title}
                </h4>
                <div className="flex items-center justify-between gap-2 mt-1 text-[11px] text-white/70">
                  <span className="truncate font-medium">
                    {formatDeliverableRoles(slot.project.deliverableRole)}
                  </span>
                  <span className="shrink-0 tabular-nums px-1.5 py-0.5 rounded bg-white/15 text-white/90 font-semibold text-[10px]">
                    {slot.project.duration} · {slot.project.year}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Dynamic Horizon Fade Masks (Follows --morph-bg) */}
        <div
          aria-hidden="true"
          style={{
            background:
              'linear-gradient(to right, var(--morph-bg, #F7F6F2) 0%, var(--morph-bg, #F7F6F2) 20%, transparent 100%)',
          }}
          className="pointer-events-none absolute inset-y-0 left-0 w-[10%] sm:w-[14%] md:w-[16%] z-[600]"
        />
        <div
          aria-hidden="true"
          style={{
            background:
              'linear-gradient(to left, var(--morph-bg, #F7F6F2) 0%, var(--morph-bg, #F7F6F2) 20%, transparent 100%)',
          }}
          className="pointer-events-none absolute inset-y-0 right-0 w-[10%] sm:w-[14%] md:w-[16%] z-[600]"
        />

        {/* Left & Right Step Buttons for Quick Click Navigation */}
        <button
          type="button"
          onClick={stepPrev}
          aria-label={`Dự án trước trong ${categoryTitle}`}
          className="absolute left-2 sm:left-4 z-[700] w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white text-black shadow-md hover:shadow-lg border border-black/10 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#2563EB]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={stepNext}
          aria-label={`Dự án kế tiếp trong ${categoryTitle}`}
          className="absolute right-2 sm:right-4 z-[700] w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white text-black shadow-md hover:shadow-lg border border-black/10 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#2563EB]"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Sub-bar Indicator: Project Counter & Drag / Play Hint */}
      <div className="mt-2 flex items-center justify-between px-2 text-xs text-[var(--morph-ink-muted,#555555)]">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
          <span>Bấm vào thẻ giữa để xem video</span>
        </span>

        <span className="tabular-nums font-semibold tracking-wider">
          {String(activeCenterIndex + 1).padStart(2, '0')} / {String(projects.length).padStart(2, '0')} DỰ ÁN
        </span>
      </div>
    </div>
  );
}
