import { useMemo, useState } from 'react';

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
  showBrandMarquee?: boolean;
  collaboratorsText?: string;
  brands?: string[];
  brandLogos?: string[];
}

export function BrandMarquee({
  showBrandMarquee = true,
  collaboratorsText,
  brands,
  brandLogos,
}: BrandMarqueeProps) {
  const [isHovered, setIsHovered] = useState(false);

  const hasLogos = Boolean(brandLogos && brandLogos.length > 0);

  // When logo images are provided, repeat logos to ensure smooth infinite loop without blank gaps
  const displayLogos = useMemo(() => {
    if (!brandLogos || brandLogos.length === 0) return [];
    let result = [...brandLogos];
    while (result.length < 8) {
      result = [...result, ...brandLogos];
    }
    return result;
  }, [brandLogos]);

  // Fallback text brands with spelling correction for 'LOUTUS' -> 'LOTUS'
  const brandsList = useMemo(() => {
    const fixSpelling = (name: string) => name.replace(/LOUTUS/i, 'LOTUS');

    if (brands && brands.length > 0) {
      return brands.map((b) => fixSpelling(b.toUpperCase()));
    }
    if (collaboratorsText && collaboratorsText.trim()) {
      const parsed = collaboratorsText
        .split(/[·•,\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (parsed.length > 0) {
        return parsed.map((b) => fixSpelling(b.toUpperCase()));
      }
    }
    return DEFAULT_BRAND_MARQUEE;
  }, [brands, collaboratorsText]);

  if (showBrandMarquee === false) {
    return null;
  }

  return (
    <section
      aria-label="Thương hiệu và Agency đã hợp tác"
      className="w-full bg-[#0B0B0D] border-y border-white/10 py-10 md:py-14 overflow-hidden select-none"
    >
      {/* Tiêu đề phụ dải băng */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mb-6 flex items-center justify-center gap-2.5">
        <span
          className="w-2 h-2 rounded-full bg-[#3B82F6] shrink-0"
          aria-hidden="true"
        />
        <span className="text-xs md:text-sm font-medium tracking-[0.25em] text-white/60 uppercase font-sans">
          THƯƠNG HIỆU &amp; AGENCY ĐÃ HỢP TÁC
        </span>
      </div>

      {/* Marquee Track với hiệu ứng mask làm mờ dần tự nhiên ở hai mép 12% - 88% */}
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
          {/* Đúng 2 bản sao duy nhất trong DOM để chạy vòng lặp vô tận translateX(-50%) mượt 60fps */}
          {[0, 1].map((copyIdx) => (
            <div
              key={copyIdx}
              aria-hidden={copyIdx > 0}
              className="flex shrink-0 items-center"
            >
              {hasLogos
                ? displayLogos.map((logoUrl, idx) => (
                    <span
                      key={`${copyIdx}-${logoUrl}-${idx}`}
                      className="inline-flex items-center shrink-0"
                    >
                      <img
                        src={logoUrl}
                        alt="Logo đối tác"
                        className="h-10 md:h-12 w-auto max-w-[180px] object-contain opacity-90 hover:opacity-100 transition-opacity filter drop-shadow-sm select-none"
                        loading="lazy"
                        draggable={false}
                      />
                      <span
                        className="flex items-center mx-8 md:mx-12 text-[#3B82F6] text-xl md:text-2xl font-bold leading-none select-none shrink-0"
                        aria-hidden="true"
                      >
                        *
                      </span>
                    </span>
                  ))
                : brandsList.map((brand, idx) => (
                    <span
                      key={`${copyIdx}-${brand}-${idx}`}
                      className="inline-flex items-center shrink-0"
                    >
                      <span className="font-bricolage text-xl md:text-2xl font-bold tracking-wider uppercase text-[#F7F6F2]/85 hover:text-white hover:scale-105 transition-all duration-200 cursor-default px-2 py-1 whitespace-nowrap">
                        {brand}
                      </span>
                      <span
                        className="flex items-center mx-8 md:mx-12 text-[#3B82F6] text-xl md:text-2xl font-bold leading-none select-none shrink-0"
                        aria-hidden="true"
                      >
                        *
                      </span>
                    </span>
                  ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
