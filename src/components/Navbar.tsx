import { useMemo } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { SiteBrandingData } from '../types/portfolio';
import { cleanSvgWhiteBackground, invertSvgColors, autoCropSvgViewBox } from '../utils/brandingLogic';

interface NavbarProps {
  onOpenContact: () => void;
  branding?: SiteBrandingData;
  email?: string;
  location?: string;
  position?: 'fixed' | 'absolute';
}

interface RollingTextProps {
  text: string;
  className?: string;
  highlightClass?: string;
}

/**
 * Signature Staggered Rolling Text (Ticker Over) inspired by Framer Modern Navbar.
 * Creates an elegant cascading split-flap roll effect on hover.
 */
function RollingText({ text, className = '', highlightClass = 'text-white' }: RollingTextProps) {
  const letters = useMemo(() => Array.from(text), [text]);

  return (
    <span
      className={`relative inline-flex overflow-hidden h-[1.3em] leading-[1.3em] select-none ${className}`}
      aria-label={text}
    >
      <span className="inline-flex" aria-hidden="true">
        {letters.map((char, i) => (
          <span
            key={i}
            className="inline-flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:-translate-y-1/2"
            style={{
              transitionDelay: `${i * 20}ms`,
            }}
          >
            <span className="inline-block h-[1.3em] leading-[1.3em]">
              {char === ' ' ? '\u00A0' : char}
            </span>
            <span className={`inline-block h-[1.3em] leading-[1.3em] ${highlightClass}`}>
              {char === ' ' ? '\u00A0' : char}
            </span>
          </span>
        ))}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}

export function Navbar({ onOpenContact, branding, position = 'absolute' }: NavbarProps) {
  // Processed logo SVG for the dark glass capsule
  const renderedLogoSvg = useMemo(() => {
    if (!branding?.logoSvg) return null;
    let svg = branding.logoSvg;
    if (branding.autoRemoveWhiteBg) {
      svg = cleanSvgWhiteBackground(svg);
    }
    // Tự động cắt sát viewBox loại bỏ lề trống để logo hiển thị đúng tỉ lệ
    svg = autoCropSvgViewBox(svg);

    // Luôn hiển thị màu trắng/sáng trên nền đen capsule
    svg = invertSvgColors(svg, '#F7F6F2');

    // Tỉ lệ chiều cao biểu tượng cân bằng quang học với cap-height của chữ
    const height = branding.logoHeight || 20;
    svg = svg.replace(/<svg\b([^>]*)>/i, (_match, attrs) => {
      const cleanAttrs = attrs
        .replace(/\bwidth\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\bheight\s*=\s*["'][^"']*["']/gi, '')
        .trim();
      return `<svg ${cleanAttrs} style="height: ${height}px; width: auto; max-height: 100%; display: block;">`;
    });
    return svg;
  }, [branding?.logoSvg, branding?.autoRemoveWhiteBg, branding?.logoHeight]);

  const handleScrollToTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`hero-reveal-navbar ${
        position === 'fixed' ? 'fixed' : 'absolute'
      } top-3.5 sm:top-5 md:top-6 inset-x-0 z-20 pointer-events-none px-4 sm:px-6 md:px-8 max-w-7xl mx-auto flex items-center justify-between`}
    >
      {/* Left: Pure Brand Logo & Wordmark (Borderless, Cinematic, Natural Float) */}
      <a
        href="#"
        onClick={handleScrollToTop}
        aria-label="Về đầu trang Trần Quốc Vinh"
        className="pointer-events-auto group inline-flex items-center gap-2.5 sm:gap-3 py-1 select-none transition-all duration-300 focus-visible:outline-2 focus-visible:outline-[#3B82F6] rounded-md"
      >
        {renderedLogoSvg && (
          <span
            className="shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
            dangerouslySetInnerHTML={{ __html: renderedLogoSvg }}
          />
        )}
        {branding?.showBrandName !== false && (
          <span className="font-bricolage text-sm sm:text-base tracking-[0.04em] font-extrabold uppercase text-white transition-opacity group-hover:opacity-85 inline-flex items-center leading-none drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
            {branding?.brandName || 'QUỐC VINH'}
          </span>
        )}
      </a>

      {/* Right: Floating Contact CTA Pill Button */}
      <button
        type="button"
        onClick={onOpenContact}
        aria-label="Mở hộp thoại liên hệ"
        className="pointer-events-auto group inline-flex items-center gap-1.5 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-white text-[#111111] hover:bg-[#2563EB] hover:text-white text-xs sm:text-sm font-bold tracking-wide shadow-[0_8px_24px_rgba(0,0,0,0.2)] hover:shadow-[0_12px_32px_rgba(37,99,235,0.4)] transition-all duration-300 hover:scale-[1.03] active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#3B82F6]"
      >
        <RollingText text="Liên hệ" highlightClass="text-white" />
        <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </button>
    </header>
  );
}
