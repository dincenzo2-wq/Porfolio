import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { StillsItem } from '../types/portfolio';
import { DEFAULT_STILLS } from '../data/defaultContent';

interface StillsGallerySectionProps {
  stills?: StillsItem[];
}

interface CarouselSlot {
  slotKey: string;
  sourceIndex: number;
  item: StillsItem;
}

const MIN_RING_SLOTS = 9;
const AUTO_GLIDE_SPEED = 0.25; // cards per second (~4s per frame, calm cinematic glide)

export function StillsGallerySection({ stills }: StillsGallerySectionProps) {
  // 1. Source frames from Admin (Tab 3 Stills) or default frames
  const sourceFrames = useMemo(() => {
    const raw = stills && stills.length > 0 ? stills : DEFAULT_STILLS;
    return raw.filter((item) => Boolean(item && item.src));
  }, [stills]);

  // Repeat frames seamlessly if fewer than MIN_RING_SLOTS so the 3D arc never shows gaps
  const ringSlots: CarouselSlot[] = useMemo(() => {
    if (sourceFrames.length === 0) return [];
    const slots: CarouselSlot[] = [];
    let repeat = 0;
    while (slots.length < Math.max(MIN_RING_SLOTS, sourceFrames.length)) {
      for (let i = 0; i < sourceFrames.length; i++) {
        slots.push({
          slotKey: `${sourceFrames[i].id || i}-r${repeat}-${slots.length}`,
          sourceIndex: i,
          item: sourceFrames[i],
        });
      }
      repeat++;
      if (repeat > 10) break;
    }
    return slots;
  }, [sourceFrames]);

  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Continuous physics state stored in refs for zero-jank 60fps updates (no React re-render per frame)
  const offsetRef = useRef<number>(0);
  const velocityRef = useRef<number>(AUTO_GLIDE_SPEED);
  const isHoveredRef = useRef<boolean>(false);
  const isInViewRef = useRef<boolean>(true);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragLastXRef = useRef<number>(0);
  const dragLastTimeRef = useRef<number>(0);
  const dragTotalDistRef = useRef<number>(0);
  const reducedMotionRef = useRef<boolean>(false);

  const [isDraggingUI, setIsDraggingUI] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const lightboxOpenRef = useRef<boolean>(false);

  useEffect(() => {
    lightboxOpenRef.current = lightboxIndex !== null;
  }, [lightboxIndex]);

  // Honor prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      reducedMotionRef.current = mq.matches;
    };
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  // Pause GPU animation automatically when scrolled out of view
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isInViewRef.current = entry.isIntersecting;
      },
      { rootMargin: '120px 0px 120px 0px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Apply 3D depth-blur arc transforms directly to card DOM nodes
  const layoutCards = useCallback(() => {
    const count = ringSlots.length;
    if (count === 0) return;

    const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const isMobile = vw < 640;
    const isTablet = vw >= 640 && vw < 1024;

    // Responsive 3D spacing tuned so center card blooms cleanly with crisp breathing gaps around flanking 3D cards
    const centerGap = isMobile ? 250 : isTablet ? 355 : 460;
    const sideStep = isMobile ? 168 : isTablet ? 225 : 275;
    const zStep = isMobile ? 150 : 195;

    const currentOffset = offsetRef.current;

    for (let i = 0; i < count; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;

      // Wrap signed distance cleanly into [-count/2, +count/2]
      let d = ((i - currentOffset) % count + count) % count;
      if (d > count / 2) d -= count;

      const absD = Math.abs(d);
      const sign = d < 0 ? -1 : d > 0 ? 1 : 0;

      // Hide far-side cards behind the ring to save GPU paint
      if (absD > 4.6) {
        el.style.opacity = '0';
        el.style.visibility = 'hidden';
        el.style.pointerEvents = 'none';
        continue;
      }

      const firstUnit = Math.min(absD, 1);
      const restUnits = Math.max(0, absD - 1);
      const tx = sign * (firstUnit * centerGap + restUnits * sideStep);
      const tz = -Math.min(absD * zStep, 1100);
      const rotY = -sign * Math.min(72, absD * 34);

      // Center foreground focal bloom (1.22x at d=0, smoothly settling to 1.0x at |d|>=1)
      const centerProximity = Math.max(0, 1 - absD);
      const smoothBloom = centerProximity * centerProximity * (3 - 2 * centerProximity);
      const scale = 1 + smoothBloom * (isMobile ? 0.14 : 0.22);

      // Smooth horizon fade past ±3.1 cards
      let opacity = 1;
      if (absD > 3.1) {
        opacity = Math.max(0, 1 - (absD - 3.1) / 1.4);
      }

      const zIndex = Math.round(1000 - absD * 100);

      el.style.visibility = 'visible';
      el.style.pointerEvents = opacity > 0.15 ? 'auto' : 'none';
      el.style.opacity = opacity.toFixed(3);
      el.style.zIndex = String(zIndex);
      el.style.transform = `translate3d(${tx.toFixed(2)}px, 0px, ${tz.toFixed(2)}px) rotateY(${rotY.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
    }
  }, [ringSlots.length]);

  // Continuous 60fps requestAnimationFrame loop with velvety hover deceleration & drag inertia
  useEffect(() => {
    if (ringSlots.length === 0) return;

    let rafId = 0;
    let lastTime = performance.now();

    // Initial synchronous layout
    layoutCards();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05); // clamp dt on tab resume
      lastTime = now;

      if (isInViewRef.current && !lightboxOpenRef.current && !document.hidden) {
        if (!isDraggingRef.current) {
          const targetSpeed =
            reducedMotionRef.current || isHoveredRef.current ? 0 : AUTO_GLIDE_SPEED;
          // Smooth exponential easing toward target velocity (silky brake on hover, smooth inertia after drag)
          const damping = 1 - Math.exp(-5.5 * dt);
          velocityRef.current += (targetSpeed - velocityRef.current) * damping;

          if (Math.abs(velocityRef.current) > 0.0004) {
            offsetRef.current += velocityRef.current * dt;
            layoutCards();
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

  const activePointerIdRef = useRef<number | null>(null);

  // Pointer drag / touch swipe handlers with natural momentum (captures only after real drag > 5px so button clicks never get swallowed)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    isDraggingRef.current = true;
    activePointerIdRef.current = e.pointerId;
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

    // Activate grab state & capture only once real horizontal drag begins (> 5px)
    if (dragTotalDistRef.current > 5) {
      if (prevDist <= 5) {
        setIsDraggingUI(true);
        velocityRef.current = 0;
        if (activePointerIdRef.current !== null) {
          try {
            e.currentTarget.setPointerCapture?.(activePointerIdRef.current);
          } catch {}
        }
      }
      const pxPerCard = window.innerWidth < 640 ? 220 : 320;
      const deltaCards = -dx / pxPerCard;
      offsetRef.current += deltaCards;
      velocityRef.current = Math.max(-2.8, Math.min(2.8, deltaCards / dt));
      layoutCards();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    activePointerIdRef.current = null;
    setIsDraggingUI(false);
    try {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      }
    } catch {}
  };

  const handleCardClick = (sourceIndex: number) => {
    // Ignore click if the user just dragged/swiped the carousel
    if (dragTotalDistRef.current > 8) return;
    setLightboxIndex(sourceIndex);
  };

  // Lock page scroll & enable keyboard navigation inside full-screen Lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) =>
          prev !== null ? (prev - 1 + sourceFrames.length) % sourceFrames.length : null
        );
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) =>
          prev !== null ? (prev + 1) % sourceFrames.length : null
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxIndex, sourceFrames.length]);

  const handlePrevLightbox = () => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev - 1 + sourceFrames.length) % sourceFrames.length : null
    );
  };

  const handleNextLightbox = () => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev + 1) % sourceFrames.length : null
    );
  };

  const formatIndex = (idx: number) => String(idx + 1).padStart(2, '0');

  const currentLightboxFrame =
    lightboxIndex !== null && sourceFrames[lightboxIndex]
      ? sourceFrames[lightboxIndex]
      : null;

  if (sourceFrames.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      id="stills"
      aria-label="Khung hình chọn lọc 3D Depth Blur Carousel"
      className="relative w-full bg-transparent pt-14 sm:pt-16 md:pt-20 pb-12 sm:pb-16 md:pb-20 select-none overflow-x-clip overflow-y-visible"
    >
      <div id="frames" className="absolute -top-24" aria-hidden="true" />

      {/* Top Progressive Blur & Seamless Feather connecting Hero (#09090B) into 3D Stage */}
      <div
        aria-hidden="true"
        style={{
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          maskImage: 'linear-gradient(to bottom, black 0%, rgba(0,0,0,0.5) 45%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, rgba(0,0,0,0.5) 45%, transparent 100%)',
        }}
        className="pointer-events-none absolute inset-x-0 top-0 h-20 sm:h-24 z-[1105]"
      />
      <div
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(to bottom, var(--morph-bg, #09090B) 0%, var(--morph-bg-mid, rgba(9,9,11,0.52)) 55%, transparent 100%)',
        }}
        className="pointer-events-none absolute inset-x-0 top-0 h-20 sm:h-24 z-[1106]"
      />

      {/* 3D Depth Blur Stage: Continuous smooth glide, hover pause, drag/swipe & click-to-zoom */}
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
          perspective: '820px',
          perspectiveOrigin: '50% 50%',
          touchAction: 'pan-y',
        }}
        className={`relative w-full h-[320px] sm:h-[410px] md:h-[480px] lg:h-[540px] xl:h-[570px] flex items-center justify-center overflow-visible ${
          isDraggingUI ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {/* Cinematic Ambient Floor Shadow Pool (Grounded depth anchor for 3D carousel) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2 sm:bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 w-[85%] sm:w-[78%] md:w-[72%] max-w-5xl h-20 sm:h-24 md:h-28 rounded-full bg-black/45 blur-[45px] sm:blur-[65px] md:blur-[80px] -z-10"
        />

        {/* 3D Preserve Space */}
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
              onClick={() => handleCardClick(slot.sourceIndex)}
              aria-label={`Phóng to khung hình ${slot.item.title || formatIndex(slot.sourceIndex)}`}
              style={{
                willChange: 'transform, opacity',
                backfaceVisibility: 'hidden',
              }}
              className="group absolute w-[220px] h-[148px] sm:w-[310px] sm:h-[206px] md:w-[380px] md:h-[252px] lg:w-[420px] lg:h-[278px] rounded-[18px] overflow-hidden bg-[#111113] border border-white/12 shadow-[0_12px_24px_-6px_rgba(0,0,0,0.5),0_28px_56px_-10px_rgba(0,0,0,0.72),0_60px_96px_-16px_rgba(0,0,0,0.65)] focus-visible:outline-2 focus-visible:outline-[#3B82F6] focus-visible:outline-offset-2"
            >
              <img
                src={slot.item.src}
                alt={slot.item.alt || slot.item.title || `Khung hình ${slot.sourceIndex + 1}`}
                loading="eager"
                draggable={false}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.opacity = '0';
                }}
                className="w-full h-full object-cover pointer-events-none select-none transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              />
            </button>
          ))}
        </div>

        {/* Cinematic Depth-of-Field Edge Blur (Left 22% — follows live --morph-bg seamlessly) */}
        <div
          aria-hidden="true"
          style={{
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            maskImage: 'linear-gradient(to right, black 12%, rgba(0,0,0,0.55) 52%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, black 12%, rgba(0,0,0,0.55) 52%, transparent 100%)',
          }}
          className="pointer-events-none absolute inset-y-0 left-0 w-[16%] sm:w-[21%] md:w-[23%] z-[1100]"
        />
        <div
          aria-hidden="true"
          style={{
            background:
              'linear-gradient(to right, var(--morph-bg, #09090B) 0%, var(--morph-bg-mid, rgba(9,9,11,0.52)) 50%, transparent 100%)',
          }}
          className="pointer-events-none absolute inset-y-0 left-0 w-[10%] sm:w-[13%] z-[1101]"
        />

        {/* Cinematic Depth-of-Field Edge Blur (Right 22% — follows live --morph-bg seamlessly) */}
        <div
          aria-hidden="true"
          style={{
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            maskImage: 'linear-gradient(to left, black 12%, rgba(0,0,0,0.55) 52%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to left, black 12%, rgba(0,0,0,0.55) 52%, transparent 100%)',
          }}
          className="pointer-events-none absolute inset-y-0 right-0 w-[16%] sm:w-[21%] md:w-[23%] z-[1100]"
        />
        <div
          aria-hidden="true"
          style={{
            background:
              'linear-gradient(to left, var(--morph-bg, #09090B) 0%, var(--morph-bg-mid, rgba(9,9,11,0.52)) 50%, transparent 100%)',
          }}
          className="pointer-events-none absolute inset-y-0 right-0 w-[10%] sm:w-[13%] z-[1101]"
        />
      </div>

      {/* Lightbox phóng to xem ảnh gốc toàn màn hình */}
      {lightboxIndex !== null && currentLightboxFrame && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Xem khung hình chọn lọc toàn màn hình"
          className="fixed inset-0 z-50 bg-[#09090B]/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 md:p-8"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Thanh điều khiển trên cùng */}
          <div
            className="max-w-7xl w-full mx-auto flex items-center justify-between gap-4 pb-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-md bg-white/10 border border-white/15 font-bricolage text-xs sm:text-sm font-bold text-white/90 tracking-wider tabular-nums">
                {formatIndex(lightboxIndex)} / {formatIndex(sourceFrames.length - 1)}
              </span>
              {currentLightboxFrame.title && (
                <h3 className="font-bricolage text-sm sm:text-base md:text-lg font-bold text-white uppercase tracking-wide truncate max-w-[200px] sm:max-w-sm md:max-w-lg">
                  {currentLightboxFrame.title}
                </h3>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden md:inline-block text-xs text-white/55 font-sans font-medium">
                [ESC] Đóng · [← / →] Chuyển ảnh
              </span>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                aria-label="Đóng cửa sổ xem ảnh"
                className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer border border-white/10 focus-visible:outline-2 focus-visible:outline-[#3B82F6]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Vùng ảnh chính phóng to toàn khung */}
          <div
            className="relative flex-1 flex items-center justify-center py-2 px-2 sm:px-12 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handlePrevLightbox}
              aria-label="Ảnh trước"
              className="absolute left-2 sm:left-4 z-10 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/15 transition-all cursor-pointer backdrop-blur-md focus-visible:outline-2 focus-visible:outline-[#3B82F6]"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <div className="relative max-h-[80vh] md:max-h-[82vh] max-w-full flex items-center justify-center">
              <img
                src={currentLightboxFrame.src}
                alt={currentLightboxFrame.alt || `Khung hình ${lightboxIndex + 1}`}
                className="max-h-[80vh] md:max-h-[82vh] max-w-[94vw] object-contain rounded-lg sm:rounded-xl shadow-2xl border border-white/10"
              />
            </div>

            <button
              type="button"
              onClick={handleNextLightbox}
              aria-label="Ảnh kế tiếp"
              className="absolute right-2 sm:right-4 z-10 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/15 transition-all cursor-pointer backdrop-blur-md focus-visible:outline-2 focus-visible:outline-[#3B82F6]"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Dòng chú thích đáy Lightbox */}
          <div
            className="max-w-7xl w-full mx-auto pt-3 border-t border-white/10 flex items-center justify-between text-xs sm:text-sm text-white/70"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="line-clamp-1">
              {currentLightboxFrame.alt || currentLightboxFrame.title || 'Khung hình chọn lọc'}
            </p>
            <span className="text-white/60 font-sans font-semibold text-xs tabular-nums shrink-0 ml-4">
              {currentLightboxFrame.year || '2025'}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
