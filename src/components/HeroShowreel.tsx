import { useEffect, useMemo, useRef, useState } from 'react';
import { Navbar } from './Navbar';
import { parseVideoUrl } from '../utils/videoEmbed';
import { getCategoryMeta, normalizeCategoryKey } from '../utils/portfolioLogic';
import type { HeroBgType, SiteBrandingData } from '../types/portfolio';
import defaultCinemaPoster from '../assets/images/reel_saigon_neon_1794581940924.jpg';

interface ServiceChipItem {
  id: string;
  label: string;
}

const DEFAULT_HERO_CATEGORIES: string[] = [
  'TVC',
  'Social 9:16',
  'Event Recap',
  'Wedding',
  'Cá Nhân',
];

interface HeroShowreelProps {
  onSelectCategory?: (categoryId: string) => void;
  categories?: string[];
  headline?: string;
  roleTitle?: string;
  intro?: string;
  showreelEnabled?: boolean;
  showreelUrl?: string;
  showreelLabel?: string;
  heroBgUrl?: string;
  heroBgType?: HeroBgType;
  heroPosterUrl?: string;
  heroVideoStart?: number;
  heroVideoEnd?: number;
  branding?: SiteBrandingData;
  onOpenContact?: () => void;
}

export function HeroShowreel({
  onSelectCategory,
  categories,
  headline,
  roleTitle,
  intro,
  showreelUrl,
  heroBgUrl,
  heroPosterUrl,
  heroVideoStart = 0,
  heroVideoEnd = 15,
  branding,
  onOpenContact,
}: HeroShowreelProps) {
  const serviceChips: ServiceChipItem[] = useMemo(() => {
    const source = categories && categories.length > 0 ? categories : DEFAULT_HERO_CATEGORIES;
    return source.slice(0, 5).map((cat, idx) => {
      const meta = getCategoryMeta(cat);
      return {
        id: normalizeCategoryKey(cat) || `cat-${idx + 1}`,
        label: meta.title || cat,
      };
    });
  }, [categories]);
  const curtainContentRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const startSec = Math.max(0, heroVideoStart ?? 0);
  const endSec = Math.max(startSec + 1, heroVideoEnd ?? startSec + 15);

  const activeVideoUrl = heroBgUrl || showreelUrl || '/videos/dem-khong-ngu.mp4';
  const parsedVideo = parseVideoUrl(activeVideoUrl, {
    startSec,
    endSec,
    muted: true,
    loop: true,
  });

  // Effective Instant Poster: custom poster if provided, else fallback cinema still to eliminate black screen
  const effectivePoster = heroPosterUrl || defaultCinemaPoster;

  // Bulletproof HTML5 Video Autoplay & In-Out Loop Enforcer
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Reset video playing state when source changes
    setIsVideoPlaying(false);

    // 1. Explicitly force muted, playsInline and preload on the DOM object
    video.defaultMuted = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('preload', 'auto');

    const tryPlay = () => {
      if (!video) return;
      video.defaultMuted = true;
      video.muted = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsVideoPlaying(true);
          })
          .catch(() => {
            // If browser policy blocked immediate autoplay, activate on first user interaction
            const onFirstInteraction = () => {
              if (!video) return;
              video.defaultMuted = true;
              video.muted = true;
              video
                .play()
                .then(() => setIsVideoPlaying(true))
                .catch(() => {});
              window.removeEventListener('pointerdown', onFirstInteraction);
              window.removeEventListener('click', onFirstInteraction);
              window.removeEventListener('scroll', onFirstInteraction);
              window.removeEventListener('touchstart', onFirstInteraction);
            };
            window.addEventListener('pointerdown', onFirstInteraction, { once: true, passive: true });
            window.addEventListener('click', onFirstInteraction, { once: true, passive: true });
            window.addEventListener('scroll', onFirstInteraction, { once: true, passive: true });
            window.addEventListener('touchstart', onFirstInteraction, { once: true, passive: true });
          });
      }
    };

    let isLoopSeeking = false;

    const handleLoadedMetadata = () => {
      if (startSec > 0 && Math.abs(video.currentTime - startSec) > 0.3) {
        isLoopSeeking = true;
        video.currentTime = startSec;
      }
      tryPlay();
    };

    const handleCanPlay = () => {
      tryPlay();
    };

    const handlePlaying = () => {
      setIsVideoPlaying(true);
    };

    const handleSeeked = () => {
      isLoopSeeking = false;
      tryPlay();
    };

    const handleTimeUpdate = () => {
      if (video.currentTime > 0.1) {
        setIsVideoPlaying(true);
      }
      if (isLoopSeeking) return;

      // When reaching end of trimmed loop, seek back to startSec cleanly once
      if (video.currentTime >= endSec) {
        isLoopSeeking = true;
        video.currentTime = startSec;
        return;
      }

      // If drifted before startSec by more than 0.5s, seek cleanly once
      if (startSec > 0 && video.currentTime < startSec - 0.5) {
        isLoopSeeking = true;
        video.currentTime = startSec;
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('timeupdate', handleTimeUpdate);

    // Initial attempt to play immediately upon mount/source change
    tryPlay();

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [startSec, endSec, parsedVideo.directUrl, activeVideoUrl]);

  // Hero Curtain Cover: scale(1) -> scale(0.96), opacity: 1 -> 0.4, and gentle parallax lift on scroll down
  useEffect(() => {
    let rafId: number;

    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!curtainContentRef.current) return;

        // Honor reduced-motion preference
        if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          curtainContentRef.current.style.transform = 'scale(1)';
          curtainContentRef.current.style.opacity = '1';
          return;
        }

        const vh = window.innerHeight || 800;
        const progress = Math.min(Math.max(window.scrollY / vh, 0), 1);
        const scale = 1 - progress * 0.04; // 1 -> 0.96
        const opacity = 1 - progress * 0.65; // 1 -> 0.35
        const translateY = -progress * 42; // Gentle parallax lift so content retreats gracefully

        curtainContentRef.current.style.transform = `scale(${scale}) translateY(${translateY}px)`;
        curtainContentRef.current.style.opacity = `${opacity}`;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const handleChipClick = (categoryId: string) => {
    if (onSelectCategory) {
      onSelectCategory(categoryId);
    } else {
      const el = document.getElementById('du-an');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <section
      aria-label="Hero Showreel"
      className="hero-viewport-pinned sticky top-0 z-0 h-[100svh] w-full overflow-hidden bg-[#09090B]"
    >
      <div
        ref={curtainContentRef}
        style={{
          backgroundImage: `url(${effectivePoster})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        className="hero-curtain-layer relative h-full w-full flex flex-col justify-end will-change-[transform,opacity] bg-cover bg-center"
      >
        {/* Top Header: Brand Logo & Contact CTA anchored directly to Hero */}
        {onOpenContact && (
          <Navbar
            onOpenContact={onOpenContact}
            branding={branding}
            position="absolute"
          />
        )}

        {/* 1. Cinematic Hero Background: 100% Video Loop Showreel */}
        {(parsedVideo.type === 'youtube' ||
          parsedVideo.type === 'vimeo' ||
          parsedVideo.type === 'gdrive' ||
          parsedVideo.type === 'vk') &&
        parsedVideo.embedUrl ? (
          <iframe
            key={parsedVideo.embedUrl}
            src={parsedVideo.embedUrl}
            title="Hero Background Video"
            className="hero-reveal-bg absolute inset-0 w-full h-full object-cover pointer-events-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        ) : (
          <video
            ref={videoRef}
            key={parsedVideo.directUrl || activeVideoUrl}
            src={parsedVideo.directUrl || activeVideoUrl}
            poster={effectivePoster}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className={`hero-reveal-bg absolute inset-0 w-full h-full object-cover object-center pointer-events-none transition-opacity duration-700 ${
              isVideoPlaying ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* Lớp phủ Gradient đen đa điểm (Multi-stop Eased Bottom Gradient) làm nổi bật hoàn hảo chữ và nút trên nền váy cưới */}
        <div
          aria-hidden="true"
          style={{
            background:
              'linear-gradient(to top, #09090B 0%, rgba(9, 9, 11, 0.92) 28%, rgba(9, 9, 11, 0.65) 58%, rgba(9, 9, 11, 0.2) 82%, transparent 100%)',
          }}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] z-[1] will-change-[opacity]"
        />

        {/* Lớp nối đáy đặc (#09090B) xóa hoàn toàn vết cắt ngang giữa đáy Hero và dải 6 khung hình Stills */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-36 z-[2] bg-gradient-to-t from-[#09090B] via-[#09090B]/80 to-transparent"
        />

        {/* 2. Centered Editorial Distilled Hero Content với khoảng cách an toàn, không bị cấn đáy hoặc che khuất */}
        <div className="relative z-10 w-full px-4 sm:px-6 md:px-10 pb-12 sm:pb-16 md:pb-20 lg:pb-24 flex flex-col items-center justify-center text-center opacity-100 select-none">
          {/* Centered Editorial Masthead Headline TRẦN QUỐC VINH in Bricolage Grotesque */}
          <h1 className="hero-reveal-headline font-bricolage text-[clamp(2.2rem,7.5vw,7.2rem)] font-extrabold leading-[0.94] tracking-[-0.03em] text-white uppercase whitespace-nowrap text-center drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] opacity-100 mb-2.5 sm:mb-3 md:mb-4">
            {headline || 'TRẦN QUỐC VINH'}
          </h1>

          {/* Dòng Nghề nghiệp (Định danh chuyên môn) căn giữa sắc nét */}
          <p className="hero-reveal-role mb-4 sm:mb-5 md:mb-6 text-xs md:text-sm lg:text-base font-medium uppercase tracking-[0.28em] text-white/90 text-center drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] select-none">
            {roleTitle && roleTitle !== 'VIDEOGRAPHER · EDITOR · MOTION'
              ? roleTitle
              : 'VIDEOGRAPHER · FILM EDITOR · MOTION DESIGNER'}
          </p>

          {/* 4 Nút điều hướng nhanh căn giữa cân xứng tuyệt đối theo trục giữa */}
          <div
            className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 max-w-2xl mx-auto"
            role="list"
            aria-label="Danh mục dịch vụ chính"
          >
            {serviceChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleChipClick(chip.id)}
                role="listitem"
                className="hero-reveal-chip bg-white/12 backdrop-blur-md border border-white/25 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white shadow-xs whitespace-nowrap hover:-translate-y-0.5 hover:border-[#3B82F6] hover:bg-[#3B82F6]/30 active:scale-95 transition-all duration-300 cursor-pointer drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
