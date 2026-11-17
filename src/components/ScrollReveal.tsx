import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

// ============================================================================
// Context Definitions
// ============================================================================
interface ScrollRevealContextValue {
  isIntersected: boolean;
  forceVisible: boolean;
  staggerMs: number;
  durationSec: number;
}

const ScrollRevealContext = createContext<ScrollRevealContextValue>({
  isIntersected: false,
  forceVisible: false,
  staggerMs: 110,
  durationSec: 0.65,
});

// ============================================================================
// RevealGroup: Center-Aligned Staggered Entrance Manager
// ============================================================================
export interface RevealGroupProps {
  children: ReactNode;
  className?: string;
  forceVisible?: boolean;
  staggerMs?: number;
  baseDelayMs?: number;
  durationSec?: number;
  threshold?: number;
  rootMargin?: string;
  style?: CSSProperties;
  role?: string;
  'aria-label'?: string;
}

export function RevealGroup({
  children,
  className = '',
  forceVisible = false,
  staggerMs = 110,
  durationSec = 0.65,
  threshold = 0.05,
  rootMargin = '0px 0px -30% 0px',
  style,
  role,
  'aria-label': ariaLabel,
}: RevealGroupProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isIntersected, setIsIntersected] = useState(forceVisible);
  const [isNearBottomActive, setIsNearBottomActive] = useState(false);

  // 1. Bidirectional IntersectionObserver (-30% bottom margin, 0.05 threshold)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsIntersected(true);
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsIntersected(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Active when intersecting trigger zone (above 30% from viewport bottom)
        // OR when scrolled past the top of the viewport (so it never flickers at the top)
        const active = entry.isIntersecting || entry.boundingClientRect.top < 0;
        setIsIntersected(active);
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  // 2. Bottom-of-page safety override: when near the bottom of document
  useEffect(() => {
    let rafId: number;

    const checkBottom = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const scrollY = window.scrollY || window.pageYOffset || 0;
        const vh = window.innerHeight || 800;
        const docHeight = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.offsetHeight
        );
        const nearBottom = scrollY + vh >= docHeight - 40;

        if (nearBottom) {
          const rect = containerRef.current.getBoundingClientRect();
          if (rect.top < vh) {
            setIsNearBottomActive(true);
            return;
          }
        }
        setIsNearBottomActive(false);
      });
    };

    window.addEventListener('scroll', checkBottom, { passive: true });
    window.addEventListener('resize', checkBottom, { passive: true });
    checkBottom();

    return () => {
      window.removeEventListener('scroll', checkBottom);
      window.removeEventListener('resize', checkBottom);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const active = forceVisible || isNearBottomActive || isIntersected;

  return (
    <ScrollRevealContext.Provider
      value={{
        isIntersected: active,
        forceVisible,
        staggerMs,
        durationSec,
      }}
    >
      <div
        ref={containerRef}
        className={className}
        style={style}
        role={role}
        aria-label={ariaLabel}
      >
        {children}
      </div>
    </ScrollRevealContext.Provider>
  );
}

// ============================================================================
// RevealItem: Pure GPU Transform Sequential Stagger Element (100% Opacity)
// ============================================================================
export interface RevealItemProps {
  children: ReactNode;
  className?: string;
  index?: number;
  delayMs?: number;
  durationSec?: number;
  threshold?: number;
  rootMargin?: string;
  forceVisible?: boolean;
  style?: CSSProperties;
}

export function RevealItem({
  children,
  className = '',
  index = 0,
  delayMs,
  durationSec: itemDurationSec,
  threshold = 0.05,
  rootMargin = '0px 0px -30% 0px',
  forceVisible = false,
  style: userStyle,
}: RevealItemProps) {
  const selfRef = useRef<HTMLDivElement>(null);
  const groupContext = useContext(ScrollRevealContext);
  const hasGroup = groupContext.staggerMs !== undefined;

  const [selfIntersected, setSelfIntersected] = useState(forceVisible);

  // Standalone fallback if used outside of a RevealGroup
  useEffect(() => {
    if (hasGroup) return;

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSelfIntersected(true);
      return;
    }

    const el = selfRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setSelfIntersected(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const active = entry.isIntersecting || entry.boundingClientRect.top < 0;
        setSelfIntersected(active);
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasGroup, threshold, rootMargin]);

  const active =
    forceVisible || (hasGroup ? groupContext.isIntersected : selfIntersected);

  const durationSec = itemDurationSec ?? groupContext.durationSec ?? 0.65;
  const staggerMs = groupContext.staggerMs ?? 110;
  const calculatedDelay = delayMs !== undefined ? delayMs : index * staggerMs;

  const itemStyle: CSSProperties = {
    // 100% opacity throughout - zero graying or dimming
    opacity: 1,
    // Pure GPU geometric transform: translateY(38px) scale(0.975) -> translateY(0) scale(1)
    transform: active
      ? 'translate3d(0, 0, 0) scale(1)'
      : 'translate3d(0, 38px, 0) scale(0.975)',
    transition: active
      ? `transform ${durationSec}s cubic-bezier(0.16, 1, 0.3, 1)`
      : 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
    transitionDelay: active ? `${calculatedDelay}ms` : '0ms',
    willChange: 'transform',
    ...userStyle,
  };

  return (
    <div ref={selfRef} style={itemStyle} className={className}>
      {children}
    </div>
  );
}
