import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

interface ViewportFocusSectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
  as?: 'div' | 'section' | 'article';
}

export function ViewportFocusSection({
  children,
  className = '',
  id,
  as: Component = 'div',
}: ViewportFocusSectionProps) {
  const containerRef = useRef<HTMLElement>(null);
  // Default to true on initial render to prevent flash of dimmed content
  const [isFocused, setIsFocused] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Honor reduced-motion preference
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsFocused(true);
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setIsFocused(true);
      return;
    }

    // Gentle Viewport Focus: Active whenever comfortably visible (-6% top/bottom margin)
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFocused(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: '-6% 0px -6% 0px',
        threshold: 0,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const focusStyle: CSSProperties = {
    opacity: isFocused ? 1 : 0.92,
    transform: isFocused ? 'translateY(0) scale(1)' : 'scale(0.996)',
    transition: 'opacity 0.45s ease, transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
    transformOrigin: 'center center',
    willChange: 'opacity, transform',
  };

  return (
    <Component
      id={id}
      ref={containerRef as any}
      style={focusStyle}
      className={`w-full ${className}`}
    >
      {children}
    </Component>
  );
}
