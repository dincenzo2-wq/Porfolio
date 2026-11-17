import { useEffect, useMemo, useRef } from 'react';

interface ScrollRevealTextProps {
  text: string;
  className?: string;
  as?: 'p' | 'div' | 'span';
}

export function ScrollRevealText({
  text,
  className = '',
  as: Component = 'p',
}: ScrollRevealTextProps) {
  const containerRef = useRef<HTMLElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // Split string into words preserving natural spacing and diacritics
  const words = useMemo(() => text.split(' ').filter(Boolean), [text]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Honor reduced-motion preference
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      wordRefs.current.forEach((el) => {
        if (el) el.style.opacity = '1';
      });
      return;
    }

    let rafId: number;

    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const vh = window.innerHeight || 800;

        // Reveal timeline: starts at 85% viewport (entering from bottom), finishes at 35% viewport (upper middle)
        const start = vh * 0.85;
        const end = vh * 0.35;
        const progress = Math.min(Math.max((start - rect.top) / (start - end), 0), 1);

        const totalWords = words.length;
        if (totalWords === 0) return;

        // Window size determines how smoothly words illuminate sequentially
        const windowSpread = Math.max(0.15, 1 / totalWords);

        for (let i = 0; i < totalWords; i++) {
          const el = wordRefs.current[i];
          if (!el) continue;

          // Normalized center point for this word across progress (0 -> 1)
          const wordCenter = i / Math.max(totalWords - 1, 1);
          const startP = wordCenter * (1 - windowSpread);
          const endP = startP + windowSpread;
          const wordP = Math.min(Math.max((progress - startP) / (endP - startP), 0), 1);
          const opacity = 0.18 + wordP * 0.82; // 0.18 -> 1.0

          el.style.opacity = opacity.toFixed(3);
        }
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
  }, [words]);

  return (
    <Component ref={containerRef as any} className={className}>
      {words.map((word, index) => (
        <span key={index} className="inline">
          <span
            ref={(el) => {
              wordRefs.current[index] = el;
            }}
            className="inline-block transition-opacity duration-150 will-change-[opacity]"
            style={{ opacity: 0.18 }}
          >
            {word}
          </span>
          {index < words.length - 1 && ' '}
        </span>
      ))}
    </Component>
  );
}
