import { useEffect, useRef, useState } from 'react';
import type { StillsItem } from '../types/portfolio';
import reelSaigonNeon from '../assets/images/reel_saigon_neon_1794581940924.jpg';
import reelHighlandMist from '../assets/images/reel_highland_mist_1794581940559.jpg';
import reelMonochromeStage from '../assets/images/reel_monochrome_stage_1794581942937.jpg';
import reelDesertSilhouette from '../assets/images/reel_desert_silhouette_1794581941944.jpg';
import projectAtelierGlass from '../assets/images/project_atelier_glass_1794581943445.jpg';
import frameCrimsonStage from '../assets/images/frame_crimson_stage_1794594695664.jpg';
import frameDuskMotion from '../assets/images/frame_dusk_motion_1794594695412.jpg';
import frameTwilightSmile from '../assets/images/frame_twilight_smile_1794594694410.jpg';
import frameAmberProfile from '../assets/images/frame_amber_profile_1794594695410.jpg';
import frameDoorwaySunbeam from '../assets/images/frame_doorway_sunbeam_1794594695283.jpg';

const ROW_TOP = [
  { id: 'top-1', src: reelSaigonNeon, alt: 'Commercial TVC neon setup', row: 'top' as const },
  { id: 'top-2', src: reelHighlandMist, alt: 'Highland brand cinematography', row: 'top' as const },
  { id: 'top-3', src: reelDesertSilhouette, alt: 'Automotive sunset headlights', row: 'top' as const },
  { id: 'top-4', src: frameDuskMotion, alt: 'Motion graphic visual effects', row: 'top' as const },
  { id: 'top-5', src: projectAtelierGlass, alt: 'Product commercial studio lighting', row: 'top' as const },
];

const ROW_BOTTOM = [
  { id: 'bot-1', src: reelMonochromeStage, alt: 'High contrast studio performance', row: 'bottom' as const },
  { id: 'bot-2', src: frameCrimsonStage, alt: 'Concert event stage lighting', row: 'bottom' as const },
  { id: 'bot-3', src: frameTwilightSmile, alt: 'Fashion campaign portrait', row: 'bottom' as const },
  { id: 'bot-4', src: frameAmberProfile, alt: 'Warm amber product macro', row: 'bottom' as const },
  { id: 'bot-5', src: frameDoorwaySunbeam, alt: 'Architectural studio set lighting', row: 'bottom' as const },
];

interface DualRowMarqueeProps {
  stills?: StillsItem[];
}

export function DualRowMarquee({ stills }: DualRowMarqueeProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const topSource = stills && stills.length > 0 ? stills.filter((s) => s.row === 'top') : ROW_TOP;
  const bottomSource = stills && stills.length > 0 ? stills.filter((s) => s.row === 'bottom') : ROW_BOTTOM;

  // Duplicate for seamless 50% loop
  const topFrames = [...topSource, ...topSource];
  const bottomFrames = [...bottomSource, ...bottomSource];

  return (
    <section
      id="frames"
      ref={sectionRef}
      aria-label="Hai dải khung hình sản phẩm chạy ngược chiều"
      className="relative w-full bg-[#0A0A0A] pt-6 pb-12 overflow-hidden space-y-4 sm:space-y-5 border-b border-black/20 select-none"
    >
      {/* Row 1: Right to Left (marquee-left) */}
      <div className="marquee-row relative w-full overflow-hidden flex">
        <div
          className={`flex gap-3 sm:gap-4 shrink-0 ${
            inView ? 'animate-marquee-left' : ''
          }`}
          style={{ animationPlayState: inView ? undefined : 'paused' }}
        >
          {topFrames.map((frame, idx) => (
            <div
              key={`${frame.id}-${idx}`}
              className="w-[260px] sm:w-[320px] md:w-[380px] aspect-[16/10] shrink-0 rounded-xl overflow-hidden border border-white/10 bg-[#141414] shadow-md group"
            >
              <img
                src={frame.src}
                alt={frame.alt}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Row 2: Left to Right (marquee-right) */}
      <div className="marquee-row relative w-full overflow-hidden flex">
        <div
          className={`flex gap-3 sm:gap-4 shrink-0 ${
            inView ? 'animate-marquee-right' : ''
          }`}
          style={{ animationPlayState: inView ? undefined : 'paused' }}
        >
          {bottomFrames.map((frame, idx) => (
            <div
              key={`${frame.id}-${idx}`}
              className="w-[260px] sm:w-[320px] md:w-[380px] aspect-[16/10] shrink-0 rounded-xl overflow-hidden border border-white/10 bg-[#141414] shadow-md group"
            >
              <img
                src={frame.src}
                alt={frame.alt}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
