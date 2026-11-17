---
name: Trần Quốc Vinh — Creative Studio Showcase
description: Minimalist, airy, light design studio showcase tailored for creative agencies and brands
colors:
  primary: "#2563EB"
  primary-hover: "#1D4ED8"
  surface-base: "#F7F6F2"
  surface-dark: "#0A0A0A"
  surface-card: "#FFFFFF"
  surface-subtle: "#EFEFEA"
  text-primary: "#111111"
  text-secondary: "#555555"
  text-muted: "#777777"
  border-hairline: "rgba(0, 0, 0, 0.08)"
typography:
  display:
    fontFamily: "'Bricolage Grotesque', sans-serif"
    fontWeight: 800
    letterSpacing: "-0.03em"
    textTransform: "uppercase"
  body:
    fontFamily: "'Plus Jakarta Sans', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
---

# Design System

## Overview
A minimalist, high-craft Creative Studio Showcase tailored specifically for advertising agencies, creative directors, and brand producers. Shifted from dark arthouse cinema to an airy, studio off-white (`#F7F6F2`) gallery with charcoal typography (`#111111`), hairline dividers (`border-black/8`), and a single punchy Cobalt Blue accent (`#2563EB`).

## Colors
- **Main Surface**: Studio Off-White (`#F7F6F2`) for generous breathing room.
- **Card Surface**: Pure White (`#FFFFFF`) with subtle 1px hairline border.
- **Primary Text**: Deep Charcoal (`#111111`) for maximum contrast and readability.
- **Secondary Text**: Neutral Slate (`#555555`) for subtitles and descriptions.
- **Accent**: Cobalt Blue (`#2563EB`) reserved strictly for key action buttons and active states.

## Typography
- **Name & Headings**: `Bricolage Grotesque` (`wght 700..800, uppercase, tracking -0.025em to -0.03em`) for punchy, distinct Design Studio character.
- **Interface, Body & Numbers**: `Plus Jakarta Sans` with `tabular-nums` for editorial clarity, navigation, metrics, and metadata. Strictly 2 fonts only.

## Layout & Rhythm
- Compact adaptive header:
  - On dark Hero: edge-to-edge transparent with `text-white/70`, live ticking Vietnam clock with glowing emerald indicator (`bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]`), and white pill contact button.
  - When scrolled over light surfaces (`#du-an`): automatically adapts to frosted studio glass (`bg-[#F7F6F2]/85 backdrop-blur-md border-b border-black/10`) with deep charcoal `#111111` typography and dark emerald indicator for flawless contrast.
- Design-Grid placed directly below header with unadulterated footage (zero gradient overlay, zero text superimposed on media).
- Metadata row neatly placed underneath each video card with title, format pill (`TVC`, `Social 9:16`, `Motion`, `Event Recap`), and agency client.
- Bottom section featuring 3 actionable agency services, 5 software tool icons on light background, hairline experience list, education, and location ("TP. Hồ Chí Minh").

## Motion & Interaction
- **Hero Curtain Cover**: HeroShowreel is anchored as a `sticky top-0 z-0` stage. As the user scrolls, `requestAnimationFrame` drives a GPU-accelerated micro-scale (`scale(1) -> scale(0.96)`) and dimming (`opacity: 1 -> 0.4`), allowing the subsequent content layer (`relative z-10 shadow-[0_-24px_48px_rgba(0,0,0,0.85)]`) to slide up and cover it like a physical theatre curtain.
- **Viewport Focus Dimming**: Downstream content sections (`ProjectsAccordionSection`, `OverviewAndSkills`, `Footer`) are monitored via `IntersectionObserver` with `rootMargin: "-15% 0px -15% 0px"`. The active section in the central 70% viewport reading zone blooms to `opacity: 1, scale(1)`, while inactive sections smoothly rest at `opacity: 0.28, scale(0.985)` with `transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)`. Heights remain 100% fluid to support accordion expansion.

## Quality Floor
- Contrast: Body text meets WCAG AA (≥ 4.5:1).
- No dark gradients over footage.
- No equipment bragging (no 24 FPS, RED V-Raptor, 35mm grain, SONY FX icons).
