import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, ArrowUpRight } from 'lucide-react';
import { ARTIST_PROFILE } from '../data/portfolioData';
import type { SiteBrandingData } from '../types/portfolio';
import { cleanSvgWhiteBackground, invertSvgColors, autoCropSvgViewBox } from '../utils/brandingLogic';

interface NavbarProps {
  onOpenContact: () => void;
  branding?: SiteBrandingData;
  email?: string;
  location?: string;
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

const NAV_ITEMS = [
  { href: '#stills', label: 'Stills', desc: 'Khung hình 3D' },
  { href: '#du-an', label: 'Dự án', desc: 'Commercial & 9:16' },
  { href: '#dich-vu', label: 'Dịch vụ', desc: 'Đầu việc thực chiến' },
  { href: '#ho-so', label: 'Hồ sơ', desc: 'Thiết bị & Kinh nghiệm' },
];

export function Navbar({ onOpenContact, branding, email, location }: NavbarProps) {
  const contactEmail = (email && email.trim()) || ARTIST_PROFILE.email;
  const displayLocation = (location && location.trim()) || ARTIST_PROFILE.location;
  const [vietnamTime, setVietnamTime] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  // Processed logo SVG for the dark capsule Navbar
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

    const height = branding.logoHeight || 22;
    svg = svg.replace(/<svg\b([^>]*)>/i, (_match, attrs) => {
      const cleanAttrs = attrs
        .replace(/\bwidth\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\bheight\s*=\s*["'][^"']*["']/gi, '')
        .trim();
      return `<svg ${cleanAttrs} style="height: ${height}px; width: auto; max-height: 100%; display: block;">`;
    });
    return svg;
  }, [
    branding?.logoSvg,
    branding?.autoRemoveWhiteBg,
    branding?.logoHeight,
  ]);

  // Live ticking clock in Vietnam timezone (Asia/Ho_Chi_Minh)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      setVietnamTime(formatter.format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile menu on Escape key or click outside
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  return (
    <header className="hero-reveal-navbar fixed top-4 sm:top-5 md:top-6 inset-x-0 z-50 flex justify-center px-3.5 sm:px-6 pointer-events-none">
      <div
        ref={navRef}
        className={`pointer-events-auto w-full max-w-5xl bg-[#09090B]/92 backdrop-blur-2xl border border-white/12 shadow-[0_20px_50px_rgba(0,0,0,0.6)] transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          mobileMenuOpen ? 'rounded-[26px] p-3 sm:p-3.5' : 'rounded-full p-2 sm:p-2.5'
        }`}
      >
        {/* Main Capsule Row */}
        <div className="flex items-center justify-between gap-3 sm:gap-4 pl-3 sm:pl-4 pr-1.5 sm:pr-2">
          {/* Left: Brand Logo & Wordmark */}
          <a
            href="#"
            aria-label="Về đầu trang Trần Quốc Vinh"
            className="group flex items-center gap-2.5 shrink-0 select-none py-1 focus-visible:outline-2 focus-visible:outline-[#3B82F6] rounded-full"
          >
            {renderedLogoSvg && (
              <span
                className="shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
                dangerouslySetInnerHTML={{ __html: renderedLogoSvg }}
              />
            )}
            {branding?.showBrandName !== false && (
              <span className="font-bricolage text-base sm:text-lg md:text-xl tracking-[-0.03em] font-extrabold uppercase text-white transition-opacity group-hover:opacity-85">
                {branding?.brandName || 'QUỐC VINH'}
              </span>
            )}
            <span className="hidden xl:inline-flex items-center gap-1.5 pl-3 border-l border-white/10 text-xs font-medium text-white/50">
              <span>{displayLocation}</span>
              <span className="text-white/30">·</span>
              <span className="tabular-nums font-semibold text-white/70">{vietnamTime || '00:00:00'}</span>
            </span>
          </a>

          {/* Center: Framer-style Sub-Pill Navigation with Staggered Rolling Text */}
          <nav
            aria-label="Điều hướng trang"
            className="hidden md:flex items-center gap-1 p-1 rounded-full bg-white/[0.08] border border-white/10 shadow-inner"
          >
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="group relative px-4 py-1.5 rounded-full text-xs lg:text-sm font-semibold text-white/80 hover:text-white hover:bg-white/15 transition-all duration-300 focus-visible:outline-2 focus-visible:outline-[#3B82F6]"
              >
                <RollingText text={item.label} highlightClass="text-[#3B82F6]" />
              </a>
            ))}
          </nav>

          {/* Right: Quick CTA & Mobile Hamburger Toggle */}
          <div className="flex items-center gap-2">
            {/* Direct Email link on Desktop */}
            <a
              href={`mailto:${contactEmail}`}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white transition-colors"
            >
              <span>{contactEmail}</span>
            </a>

            {/* Desktop Contact CTA Button with Rolling Text & Arrow */}
            <button
              type="button"
              onClick={onOpenContact}
              className="group hidden sm:inline-flex items-center gap-2 px-5 py-2 md:py-2.5 rounded-full bg-white text-black text-xs md:text-sm font-bold tracking-wide hover:bg-[#3B82F6] hover:text-white transition-all duration-300 shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#3B82F6]"
            >
              <RollingText text="Liên hệ" highlightClass="text-white" />
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>

            {/* Mobile Menu Toggle Button (+ morphs to ×) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
              className="sm:hidden w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 border border-white/12 flex items-center justify-center text-white transition-all duration-300 cursor-pointer active:scale-90 focus-visible:outline-2 focus-visible:outline-[#3B82F6]"
            >
              <Plus
                className={`w-5 h-5 transition-transform duration-300 ease-out ${
                  mobileMenuOpen ? 'rotate-45' : 'rotate-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Mobile Morphing Card Menu Panel */}
        {mobileMenuOpen && (
          <div className="sm:hidden mt-3 pt-3 border-t border-white/10 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-200">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold text-white/85 hover:text-white hover:bg-white/10 active:bg-white/15 transition-colors"
              >
                <span>{item.label}</span>
                <span className="text-xs text-white/40">{item.desc}</span>
              </a>
            ))}

            <div className="pt-2 mt-1 border-t border-white/10 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenContact();
                }}
                className="w-full py-3 rounded-full bg-white text-black font-bold text-sm hover:bg-[#3B82F6] hover:text-white transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Liên hệ dự án</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-between px-3 text-[11px] text-white/50 pt-0.5">
                <span>{displayLocation}</span>
                <span className="tabular-nums font-semibold text-white/70">{vietnamTime}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
