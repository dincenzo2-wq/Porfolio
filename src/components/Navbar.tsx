import { useEffect, useMemo, useState } from 'react';
import { Mail } from 'lucide-react';
import { ARTIST_PROFILE } from '../data/portfolioData';
import type { SiteBrandingData } from '../types/portfolio';
import { cleanSvgWhiteBackground, invertSvgColors, autoCropSvgViewBox } from '../utils/brandingLogic';

interface NavbarProps {
  onOpenContact: () => void;
  branding?: SiteBrandingData;
}

export function Navbar({ onOpenContact, branding }: NavbarProps) {
  const [isDarkStage, setIsDarkStage] = useState(true);
  const [vietnamTime, setVietnamTime] = useState('');

  // Processed logo SVG for the adaptive Navbar
  const renderedLogoSvg = useMemo(() => {
    if (!branding?.logoSvg) return null;
    let svg = branding.logoSvg;
    if (branding.autoRemoveWhiteBg) {
      svg = cleanSvgWhiteBackground(svg);
    }
    // Tự động cắt sát viewBox loại bỏ lề trống để logo hiển thị đúng tỉ lệ
    svg = autoCropSvgViewBox(svg);

    if (isDarkStage && branding.invertNavbarColor) {
      svg = invertSvgColors(svg, '#F7F6F2');
    } else if (!isDarkStage && branding.invertNavbarColor) {
      svg = invertSvgColors(svg, '#111111');
    }
    const height = branding.logoHeight || 24;
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
    branding?.invertNavbarColor,
    branding?.logoHeight,
    isDarkStage,
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

  // Adaptive scroll detection: completely transparent in Hero, frosted light glass when scrolled to content
  useEffect(() => {
    const handleScroll = () => {
      const duAnEl = document.getElementById('du-an');
      if (duAnEl) {
        const rect = duAnEl.getBoundingClientRect();
        setIsDarkStage(rect.top > 60);
      } else {
        setIsDarkStage(window.scrollY < window.innerHeight * 0.8);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return (
    <header
      className={`hero-reveal-navbar fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
        isDarkStage
          ? 'bg-black/45 backdrop-blur-md border-b border-white/10 py-4 md:py-5 text-white/90 shadow-sm'
          : 'bg-[#F7F6F2]/90 backdrop-blur-md border-b border-black/10 py-4 md:py-5 text-[#111111] shadow-xs'
      }`}
    >
      <div className="w-full px-6 md:px-12 flex items-center justify-between gap-4 text-xs">
        {/* Left: QUOC VINH Logo + Location & Live Vietnam Time + Direct Email */}
        <div className="flex items-center gap-5 sm:gap-6 md:gap-7">
          <a
            href="#"
            aria-label="Về đầu trang Trần Quốc Vinh"
            className="group inline-flex items-center gap-2.5 shrink-0"
          >
            {renderedLogoSvg && (
              <span
                className="shrink-0 flex items-center justify-center transition-transform group-hover:scale-105"
                dangerouslySetInnerHTML={{ __html: renderedLogoSvg }}
              />
            )}
            {branding?.showBrandName !== false && (
              <span
                className={`font-bricolage text-lg md:text-xl tracking-[-0.03em] font-extrabold uppercase transition-colors ${
                  isDarkStage
                    ? 'text-white group-hover:text-white/80'
                    : 'text-[#111111] group-hover:text-black/75'
                }`}
              >
                {branding?.brandName || 'QUỐC VINH'}
              </span>
            )}
          </a>

          {/* Location + Live Real-time Clock (Asia/Ho_Chi_Minh) in Plus Jakarta Sans */}
          <div
            className={`hidden sm:flex items-center gap-2 text-sm font-medium transition-colors ${
              isDarkStage ? 'text-white/80' : 'text-[#111111]'
            }`}
          >
            <span>TP. Hồ Chí Minh</span>
            <span className={isDarkStage ? 'text-white/40' : 'text-black/30'}>·</span>
            <span
              className={`tabular-nums font-semibold ${
                isDarkStage ? 'text-white/90' : 'text-[#111111]'
              }`}
            >
              {vietnamTime || '00:00:00'}
            </span>
          </div>

          {/* Direct Email Link */}
          <a
            href={`mailto:${ARTIST_PROFILE.email}`}
            className={`hidden lg:inline-flex items-center gap-2 text-sm font-medium transition-colors ${
              isDarkStage
                ? 'text-white/80 hover:text-white'
                : 'text-[#111111] hover:text-[#2563EB]'
            }`}
          >
            <Mail
              className={`w-4 h-4 ${
                isDarkStage ? 'text-white/80' : 'text-[#111111]'
              }`}
            />
            <span>{ARTIST_PROFILE.email}</span>
          </a>
        </div>

        {/* Right: Quick Scroll Links & Contact Button */}
        <div className="flex items-center gap-6 sm:gap-8">
          <nav
            aria-label="Điều hướng trang"
            className={`hidden md:flex items-center gap-6 md:gap-8 text-sm font-semibold transition-colors ${
              isDarkStage ? 'text-white/80' : 'text-[#111111]'
            }`}
          >
            <a
              href="#stills"
              className={`transition-colors hover:underline underline-offset-4 decoration-current ${
                isDarkStage ? 'hover:text-white' : 'hover:text-[#2563EB]'
              }`}
            >
              Stills
            </a>
            <a
              href="#du-an"
              className={`transition-colors hover:underline underline-offset-4 decoration-current ${
                isDarkStage ? 'hover:text-white' : 'hover:text-[#2563EB]'
              }`}
            >
              Dự án
            </a>
            <a
              href="#dich-vu"
              className={`transition-colors hover:underline underline-offset-4 decoration-current ${
                isDarkStage ? 'hover:text-white' : 'hover:text-[#2563EB]'
              }`}
            >
              Dịch vụ
            </a>
            <a
              href="#ho-so"
              className={`transition-colors hover:underline underline-offset-4 decoration-current ${
                isDarkStage ? 'hover:text-white' : 'hover:text-[#2563EB]'
              }`}
            >
              Hồ sơ
            </a>
          </nav>

          <button
            type="button"
            onClick={onOpenContact}
            className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-95 ${
              isDarkStage
                ? 'bg-white text-[#111111] hover:bg-[#3B82F6] hover:text-white'
                : 'bg-[#111111] text-white hover:bg-[#2563EB]'
            }`}
          >
            Liên hệ
          </button>
        </div>
      </div>
    </header>
  );
}
