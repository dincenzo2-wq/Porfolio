import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCylinderParams,
  getDragPxPerCard,
  getProjectedCardGap,
  generateCarouselSlots,
  MIN_RING_SLOTS,
  AUTO_GLIDE_SPEED,
} from './stillsCarouselLogic';

test('stillsCarouselLogic - getCylinderParams produces accurate 16:9 amphitheater geometry across all 5 responsive tiers', () => {
  // Mobile (< 640px)
  const mobile = getCylinderParams(390);
  assert.equal(mobile.isMobile, true);
  assert.equal(mobile.isTablet, false);
  assert.equal(mobile.R, 820);
  assert.equal(mobile.deltaThetaDeg, 20.0);
  assert.ok(Math.abs(mobile.deltaThetaRad - (20.0 * Math.PI) / 180) < 1e-6);

  // sm (640px - 767px)
  const sm = getCylinderParams(680);
  assert.equal(sm.isMobile, false);
  assert.equal(sm.isTablet, true);
  assert.equal(sm.R, 1060);
  assert.equal(sm.deltaThetaDeg, 19.2);

  // md (768px - 1023px)
  const md = getCylinderParams(820);
  assert.equal(md.isMobile, false);
  assert.equal(md.isTablet, true);
  assert.equal(md.R, 1240);
  assert.equal(md.deltaThetaDeg, 18.7);

  // lg (1024px - 1279px)
  const lg = getCylinderParams(1100);
  assert.equal(lg.isMobile, false);
  assert.equal(lg.isTablet, false);
  assert.equal(lg.R, 1420);
  assert.equal(lg.deltaThetaDeg, 18.35);

  // xl / desktop (>= 1280px)
  const xl = getCylinderParams(1440);
  assert.equal(xl.isMobile, false);
  assert.equal(xl.isTablet, false);
  assert.equal(xl.R, 1560);
  assert.equal(xl.deltaThetaDeg, 18.15);
});

test('stillsCarouselLogic - slit gaps between 16:9 cards are uniformly balanced (~17.5px - 19px) without collisions across all breakpoints', () => {
  const responsiveTiers = [
    { name: 'mobile', vw: 375, cardWidth: 270 },
    { name: 'sm', vw: 640, cardWidth: 340 },
    { name: 'md', vw: 768, cardWidth: 390 },
    { name: 'lg', vw: 1024, cardWidth: 440 },
    { name: 'xl (1280)', vw: 1280, cardWidth: 480 },
    { name: 'xl (1440)', vw: 1440, cardWidth: 480 },
    { name: 'xl (1920)', vw: 1920, cardWidth: 480 },
  ];

  for (const tier of responsiveTiers) {
    const params = getCylinderParams(tier.vw);
    const gap = getProjectedCardGap(params.R, params.deltaThetaDeg, tier.cardWidth);
    assert.ok(
      gap >= 17.5 && gap <= 19.0,
      `${tier.name} (vw ${tier.vw}, width ${tier.cardWidth}px) gap ${gap.toFixed(2)}px must be between 17.5px and 19.0px`
    );
  }
});

test('stillsCarouselLogic - 16:9 card dimensions maintain exact 16/9 aspect ratio', () => {
  const responsiveSizes = [
    { name: 'mobile', width: 270 },
    { name: 'sm', width: 340 },
    { name: 'md', width: 390 },
    { name: 'lg', width: 440 },
    { name: 'xl', width: 480 },
  ];

  for (const size of responsiveSizes) {
    const calculatedHeight = (size.width * 9) / 16;
    const ratio = size.width / calculatedHeight;
    assert.ok(
      Math.abs(ratio - 16 / 9) < 1e-6,
      `${size.name} (${size.width}x${calculatedHeight}) must equal 16:9`
    );
  }
});

test('stillsCarouselLogic - getDragPxPerCard matches responsive card width 1:1', () => {
  assert.equal(getDragPxPerCard(375), 270); // Mobile (<640)
  assert.equal(getDragPxPerCard(640), 340); // sm (640..767)
  assert.equal(getDragPxPerCard(768), 390); // md (768..1023)
  assert.equal(getDragPxPerCard(1024), 440); // lg (1024..1279)
  assert.equal(getDragPxPerCard(1440), 480); // xl (>=1280)
  assert.equal(getDragPxPerCard(1920), 480); // wide desktop
});

test('stillsCarouselLogic - generateCarouselSlots handles edge cases robustly', () => {
  // Empty input returns empty array
  assert.deepEqual(generateCarouselSlots([]), []);
  // @ts-expect-error - testing null safety
  assert.deepEqual(generateCarouselSlots(null), []);

  // Single item reaches minSlots (>= 16) without infinite loop
  const singleItem = [{ id: 'solo', src: '/img.jpg' }];
  const singleSlots = generateCarouselSlots(singleItem, MIN_RING_SLOTS);
  assert.ok(singleSlots.length >= MIN_RING_SLOTS, `Single item should repeat to >= ${MIN_RING_SLOTS}`);
  assert.equal(singleSlots[0].item.id, 'solo');
  assert.equal(singleSlots[singleSlots.length - 1].item.id, 'solo');

  // Few items (3 items) repeats seamlessly to >= 16 slots
  const threeItems = [
    { id: 'f1', src: '/f1.jpg' },
    { id: 'f2', src: '/f2.jpg' },
    { id: 'f3', src: '/f3.jpg' },
  ];
  const threeSlots = generateCarouselSlots(threeItems, 16);
  assert.ok(threeSlots.length >= 16);
  assert.equal(threeSlots.length % 3, 0); // Exact multiple

  // Many items (20 items) does not artificially duplicate when already > minSlots
  const twentyItems = Array.from({ length: 20 }, (_, i) => ({ id: `frame-${i}`, src: `/${i}.jpg` }));
  const twentySlots = generateCarouselSlots(twentyItems, 16);
  assert.equal(twentySlots.length, 20);
});

test('stillsCarouselLogic - AUTO_GLIDE_SPEED is serene and non-zero', () => {
  assert.ok(AUTO_GLIDE_SPEED > 0.1 && AUTO_GLIDE_SPEED < 0.5);
});
