/**
 * ArcWave 3D Cylindrical Geometry & Infinite Ring Logic
 * Specifically engineered for 16:9 widescreen cinematic frames
 */

export interface CylinderParams {
  R: number;
  deltaThetaDeg: number;
  deltaThetaRad: number;
  isMobile: boolean;
  isTablet: boolean;
}

export const MIN_RING_SLOTS = 16;
export const AUTO_GLIDE_SPEED = 0.22; // cards per second (~4.5s per frame, serene cinematic drift)

/**
 * Computes ArcWave 3D cylindrical geometry based on viewport width.
 * Calibrated specifically for 16:9 widescreen cinema frames across all 5 responsive tiers:
 * - mobile (<640px): 270px width -> R=820, deltaTheta=20.00° (gap ~18.6px)
 * - sm (640-767px): 340px width -> R=1060, deltaTheta=19.20° (gap ~18.1px)
 * - md (768-1023px): 390px width -> R=1240, deltaTheta=18.70° (gap ~17.9px)
 * - lg (1024-1279px): 440px width -> R=1420, deltaTheta=18.35° (gap ~18.2px)
 * - xl (>=1280px): 480px width -> R=1560, deltaTheta=18.15° (gap ~17.9px)
 *
 * Produces a razor-sharp, uniform ~18px slit gap between adjacent frames in an amphitheater curve
 * while eliminating 3D keystone/perspective distortion and card collisions.
 */
export function getCylinderParams(vw: number): CylinderParams {
  if (vw < 640) {
    const R = 820;
    const deltaThetaDeg = 20.0;
    const deltaThetaRad = (deltaThetaDeg * Math.PI) / 180;
    return { R, deltaThetaDeg, deltaThetaRad, isMobile: true, isTablet: false };
  }

  if (vw < 768) {
    const R = 1060;
    const deltaThetaDeg = 19.2;
    const deltaThetaRad = (deltaThetaDeg * Math.PI) / 180;
    return { R, deltaThetaDeg, deltaThetaRad, isMobile: false, isTablet: true };
  }

  if (vw < 1024) {
    const R = 1240;
    const deltaThetaDeg = 18.7;
    const deltaThetaRad = (deltaThetaDeg * Math.PI) / 180;
    return { R, deltaThetaDeg, deltaThetaRad, isMobile: false, isTablet: true };
  }

  if (vw < 1280) {
    const R = 1420;
    const deltaThetaDeg = 18.35;
    const deltaThetaRad = (deltaThetaDeg * Math.PI) / 180;
    return { R, deltaThetaDeg, deltaThetaRad, isMobile: false, isTablet: false };
  }

  const R = 1560;
  const deltaThetaDeg = 18.15;
  const deltaThetaRad = (deltaThetaDeg * Math.PI) / 180;
  return { R, deltaThetaDeg, deltaThetaRad, isMobile: false, isTablet: false };
}

/**
 * Returns tactile horizontal drag pixels required to scroll one card.
 * Calibrated 1:1 with 16:9 widescreen card physical widths.
 */
export function getDragPxPerCard(vw: number): number {
  if (vw < 640) return 270;
  if (vw < 768) return 340;
  if (vw < 1024) return 390;
  if (vw < 1280) return 440;
  return 480;
}

/**
 * Calculates projected 2D gap (in pixels) between the center card (0 deg) and flank card 1 (deltaTheta).
 */
export function getProjectedCardGap(R: number, deltaThetaDeg: number, cardWidth: number): number {
  const deltaRad = (deltaThetaDeg * Math.PI) / 180;
  const c0Right = cardWidth / 2;
  const c1Center = R * Math.sin(deltaRad);
  const c1Left = c1Center - (cardWidth / 2) * Math.cos(deltaRad);
  return c1Left - c0Right;
}

/**
 * Seamlessly loops and generates carousel slots so cylindrical ArcWave concave arc never has gaps.
 */
export function generateCarouselSlots<T extends { id?: string }>(
  items: T[],
  minSlots: number = MIN_RING_SLOTS
): Array<{ slotKey: string; sourceIndex: number; item: T }> {
  if (!items || items.length === 0) return [];

  const slots: Array<{ slotKey: string; sourceIndex: number; item: T }> = [];
  let repeat = 0;

  while (slots.length < Math.max(minSlots, items.length)) {
    for (let i = 0; i < items.length; i++) {
      slots.push({
        slotKey: `${items[i].id || i}-r${repeat}-${slots.length}`,
        sourceIndex: i,
        item: items[i],
      });
    }
    repeat++;
    if (repeat > 25) break;
  }

  return slots;
}
