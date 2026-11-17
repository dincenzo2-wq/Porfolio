import { useEffect, useRef, useState, type ReactNode } from 'react';

interface MaskedRevealTitleProps {
  children: ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'span' | 'div';
}

export function MaskedRevealTitle({
  children,
  className = '',
  as: Component = 'h2',
}: MaskedRevealTitleProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    // Honor reduced-motion preference
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsVisible(true);
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    // If already in viewport on mount, reveal immediately
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // once: true
        }
      },
      {
        threshold: 0,
        rootMargin: '0px 0px 50px 0px',
      }
    );

    observer.observe(el);

    // Guaranteed fallback: reveal after timeout so title never stays hidden in edge cases
    const fallbackTimer = setTimeout(() => {
      setIsVisible(true);
    }, 800);

    return () => {
      observer.disconnect();
      clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="overflow-hidden pt-2.5 pb-1 -mt-2.5 -mb-1">
      <Component
        className={`will-change-transform transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        } ${className}`}
      >
        {children}
      </Component>
    </div>
  );
}
