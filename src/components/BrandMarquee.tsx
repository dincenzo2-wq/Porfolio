import { useMemo, useState } from 'react';
import type { PortfolioProject } from '../types/portfolio';
import { extractUniqueBrands } from '../utils/portfolioLogic';

export const DEFAULT_BRAND_MARQUEE: string[] = [
  'DENTSU REDDER',
  'PEPSICO VIETNAM',
  'HAVAS VIETNAM',
  'VINFAST',
  'OGILVY VIETNAM',
  'HEINEKEN SILVER',
  'STUDIO 09',
  'VNG GAMES',
  'TECH IN ASIA',
  'T&A OGILVY',
  "L'OFFICIEL VIETNAM",
  'VIBE NATION',
  'TIGER BEER VIETNAM',
];

interface BrandMarqueeProps {
  projects?: PortfolioProject[];
  collaboratorsText?: string;
  brands?: string[];
}

export function BrandMarquee({ projects, collaboratorsText, brands }: BrandMarqueeProps) {
  const [isHovered, setIsHovered] = useState(false);

  const brandsList = useMemo(() => {
    if (brands && brands.length > 0) return brands;
    if (projects && projects.length > 0) {
      const extracted = extractUniqueBrands(projects, collaboratorsText);
      if (extracted && extracted.length > 0) {
        return extracted.map((b) => b.toUpperCase());
      }
    }
    return DEFAULT_BRAND_MARQUEE;
  }, [brands, projects, collaboratorsText]);

  return (
    <section
      aria-label="Thương hiệu và Agency đã hợp tác"
      className="w-full bg-[#0B0B0D] border-y border-white/10 py-10 md:py-14 overflow-hidden select-none"
    >
      {/* 2. Tiêu đề phụ: Tăng cỡ chữ lên text-xs md:text-sm, tạo khoảng cách dưới rộng rãi mb-5 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mb-5 flex items-center justify-center gap-2.5">
        <span
          className="w-2 h-2 rounded-full bg-[#3B82F6] shrink-0"
          aria-hidden="true"
        />
        <span className="text-xs md:text-sm font-medium tracking-[0.25em] text-white/60 uppercase font-sans">
          THƯƠNG HIỆU &amp; AGENCY ĐÃ HỢP TÁC
        </span>
      </div>

      {/* 1. Marquee Track với hiệu ứng mask làm mờ dần tự nhiên ở hai mép 12% - 88% */}
      <div
        className="brand-marquee-container relative w-full overflow-hidden"
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className="flex w-max animate-brand-marquee"
          style={{ animationPlayState: isHovered ? 'paused' : 'running' }}
        >
          {/* Đúng 2 bản sao duy nhất trong DOM để chạy vòng lặp vô tận translateX(-50%) mượt 60fps mà nhẹ trang */}
          {[0, 1].map((copyIdx) => (
            <div
              key={copyIdx}
              aria-hidden={copyIdx > 0}
              className="flex shrink-0 items-center"
            >
              {brandsList.map((brand, idx) => {
                return (
                  <span
                    key={`${copyIdx}-${brand}-${idx}`}
                    className="inline-flex items-center"
                  >
                    <span
                      className="font-bricolage text-xl md:text-2xl font-bold tracking-wider uppercase text-[#F7F6F2]/85 hover:text-white hover:scale-105 transition-all duration-200 cursor-default px-2 py-1 whitespace-nowrap"
                    >
                      {brand}
                    </span>
                    <span
                      className="mx-4 sm:mx-6 md:mx-8 text-[#3B82F6] font-bold text-lg md:text-xl select-none shrink-0"
                      aria-hidden="true"
                    >
                      *
                    </span>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
