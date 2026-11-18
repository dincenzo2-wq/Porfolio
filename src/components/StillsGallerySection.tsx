import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { StillsItem } from '../types/portfolio';
import { DEFAULT_STILLS } from '../data/defaultContent';

interface StillsGallerySectionProps {
  stills?: StillsItem[];
}

export function StillsGallerySection({ stills }: StillsGallerySectionProps) {
  // 1. 6 khung hình chọn lọc nhất (Zero-text gallery frames)
  const activeStills = useMemo(() => {
    const source = stills && stills.length > 0 ? stills : DEFAULT_STILLS;
    return source.slice(0, 6);
  }, [stills]);

  // 2. Trạng thái mặc định: activeIndex = 1 (khung hình thứ 2 bung rộng sẵn khi tải trang)
  const [activeIndex, setActiveIndex] = useState<number>(1);

  // 3. Trạng thái tạm dừng chuyển cảnh tự động khi người dùng rê chuột vào khu vực dải ảnh
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // 4. Trạng thái Lightbox phóng to xem chi tiết ảnh gốc toàn màn hình sạch sẽ
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Nhận diện kích thước màn hình để kích hoạt Accordion giãn nở trên Desktop (>= 768px)
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(typeof window !== 'undefined' && window.innerWidth >= 768);
    };
    checkIsDesktop();
    window.addEventListener('resize', checkIsDesktop);
    return () => window.removeEventListener('resize', checkIsDesktop);
  }, []);

  // Motion kép 1: Auto-Cycle Accordion - Tự động chuyển activeIndex tuần hoàn mỗi 3500ms khi không rê chuột
  useEffect(() => {
    if (isPaused || lightboxIndex !== null) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % activeStills.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [isPaused, lightboxIndex, activeStills.length]);

  // Khóa cuộn trang và lắng nghe phím tắt điều hướng khi Lightbox đang mở
  useEffect(() => {
    if (lightboxIndex === null) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) =>
          prev !== null ? (prev - 1 + activeStills.length) % activeStills.length : null
        );
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) =>
          prev !== null ? (prev + 1) % activeStills.length : null
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxIndex, activeStills.length]);

  const handlePrevLightbox = () => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev - 1 + activeStills.length) % activeStills.length : null
    );
  };

  const handleNextLightbox = () => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev + 1) % activeStills.length : null
    );
  };

  const formatIndex = (idx: number) => String(idx + 1).padStart(2, '0');

  const currentLightboxFrame =
    lightboxIndex !== null && activeStills[lightboxIndex]
      ? activeStills[lightboxIndex]
      : null;

  return (
    <section
      id="stills"
      aria-label="Khung hình chọn lọc Stills Gallery"
      className="relative w-full bg-[#09090B] py-12 sm:py-14 md:py-16 border-b border-white/10 select-none overflow-hidden"
    >
      <div id="frames" className="absolute -top-24" aria-hidden="true" />

      {/* 
        Dải 6 khung hình thuần thị giác (Zero-text) kết hợp Motion kép:
        - Auto-Cycle Accordion: tự động chuyển tuần hoàn mỗi 3500ms (tạm dừng khi rê chuột).
        - Ken Burns Dolly Zoom: ảnh active tự động zoom chậm scale-100 -> scale-110 (4000ms ease-out).
        - Thuần thị giác: 100% không chứa số thứ tự, tiêu đề hay gradient đè lên ảnh như phòng trưng bày tranh.
      */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="w-full flex gap-3.5 overflow-x-auto md:overflow-hidden snap-x snap-mandatory md:snap-none md:h-[420px] lg:h-[460px] pb-3 md:pb-0 [scrollbar-width:none] [-ms-overflow-style:none]"
        >
          {activeStills.map((frame, idx) => {
            const isActive = activeIndex === idx;

            return (
              <div
                key={frame.id || idx}
                role="button"
                tabIndex={0}
                aria-label={`Khung hình điện ảnh ${idx + 1}${
                  isActive ? ' (Đang mở rộng, bấm để phóng to)' : ''
                }`}
                onMouseEnter={() => {
                  if (isDesktop) setActiveIndex(idx);
                }}
                onClick={() => {
                  if (!isDesktop) {
                    setLightboxIndex(idx);
                  } else if (isActive) {
                    setLightboxIndex(idx);
                  } else {
                    setActiveIndex(idx);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!isDesktop || isActive) {
                      setLightboxIndex(idx);
                    } else {
                      setActiveIndex(idx);
                    }
                  }
                }}
                style={isDesktop ? { flex: isActive ? 6.5 : 1 } : undefined}
                className={`group relative overflow-hidden rounded-xl md:rounded-2xl border transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-2 focus-visible:outline-[#3B82F6] focus-visible:outline-offset-2 bg-[#0A0A0A] ${
                  /* Mobile: 85vw, snap-center, aspect-video */
                  'flex-none w-[85vw] sm:w-[70vw] aspect-video snap-center md:snap-align-none md:w-auto md:aspect-auto md:h-full'
                } ${
                  isDesktop && isActive
                    ? 'md:flex-[6.5] border-white/40 shadow-2xl cursor-zoom-in'
                    : isDesktop
                    ? 'md:flex-1 border-white/10 hover:border-white/25 cursor-pointer'
                    : 'border-white/15 cursor-pointer shadow-lg'
                }`}
              >
                {/* Ảnh điện ảnh thuần túy, zero-text, scale-[1.01] triệt tiêu viền mép trên, kết hợp Ken Burns Dolly Zoom */}
                <img
                  src={frame.src}
                  alt={frame.alt || `Khung hình chọn lọc ${idx + 1}`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className={`w-full h-full object-cover transition-all ease-out ${
                    isDesktop
                      ? isActive
                        ? 'scale-110 brightness-100 duration-[4000ms]'
                        : 'scale-100 brightness-75 duration-700 group-hover:brightness-90'
                      : 'scale-100 brightness-100 duration-700'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Cửa sổ Lightbox phóng to ảnh gốc toàn màn hình kèm tiêu đề dự án */}
      {lightboxIndex !== null && currentLightboxFrame && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Xem ảnh gốc toàn màn hình khung số ${lightboxIndex + 1} - ${currentLightboxFrame.title}`}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 md:p-8 animate-fadeIn"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Thanh trên cùng: Số thứ tự + Tên dự án góc trái & Phím tắt + Nút đóng góc phải */}
          <div
            className="max-w-7xl w-full mx-auto flex items-center justify-between text-white pb-3 sm:pb-4 border-b border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-md bg-white/10 border border-white/15 font-bricolage text-xs sm:text-sm font-bold text-white/90 tracking-wider">
                {formatIndex(lightboxIndex)} / {formatIndex(activeStills.length - 1)}
              </span>
              <h3 className="font-bricolage text-sm sm:text-base md:text-lg font-bold text-white uppercase tracking-wide truncate max-w-[200px] sm:max-w-sm md:max-w-lg">
                {currentLightboxFrame.title}
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden md:inline-block text-xs text-white/40 font-mono">
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
            {/* Nút lùi ảnh trước */}
            <button
              type="button"
              onClick={handlePrevLightbox}
              aria-label="Ảnh trước"
              className="absolute left-2 sm:left-4 z-10 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/15 transition-all cursor-pointer backdrop-blur-md focus-visible:outline-2 focus-visible:outline-[#3B82F6]"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Khung ảnh phóng to */}
            <div className="relative max-h-[80vh] md:max-h-[82vh] max-w-full flex items-center justify-center">
              <img
                src={currentLightboxFrame.src}
                alt={currentLightboxFrame.alt || `Khung hình ${lightboxIndex + 1}`}
                className="max-h-[80vh] md:max-h-[82vh] max-w-[94vw] object-contain rounded-lg sm:rounded-xl shadow-2xl border border-white/10"
              />
            </div>

            {/* Nút tiến ảnh kế tiếp */}
            <button
              type="button"
              onClick={handleNextLightbox}
              aria-label="Ảnh kế tiếp"
              className="absolute right-2 sm:right-4 z-10 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/15 transition-all cursor-pointer backdrop-blur-md focus-visible:outline-2 focus-visible:outline-[#3B82F6]"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Dòng chú thích đáy Lightbox: bối cảnh ánh sáng & bối cảnh quay */}
          <div
            className="max-w-7xl w-full mx-auto pt-3 border-t border-white/10 flex items-center justify-between text-xs sm:text-sm text-white/70"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="line-clamp-1">
              {currentLightboxFrame.alt || currentLightboxFrame.title}
            </p>
            <span className="text-white/40 font-mono text-xs tabular-nums shrink-0 ml-4">
              {currentLightboxFrame.year || '2025'}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
