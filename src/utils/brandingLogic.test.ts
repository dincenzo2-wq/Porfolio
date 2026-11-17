import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanSvgWhiteBackground,
  invertSvgColors,
  autoCropSvgViewBox,
  colorizeSvgContent,
  generateFaviconSvg,
  svgToDataUrl,
} from './brandingLogic';

test('cleanSvgWhiteBackground removes white background path and rect', () => {
  const inputSvg = `<svg viewBox="0 0 100 100"><path fill="white" d="M0 0L1024 0L1024 1024L0 1024L0 0Z"/><path d="M10 10L90 90" fill="#000"/></svg>`;
  const result = cleanSvgWhiteBackground(inputSvg);
  assert.ok(!result.includes('fill="white"'));
  assert.ok(result.includes('M10 10L90 90'));
});

test('cleanSvgWhiteBackground removes rect with fill white or #fff', () => {
  const inputSvg = `<svg><rect width="100%" height="100%" fill="#ffffff"/><circle cx="50" cy="50" r="20" fill="red"/></svg>`;
  const result = cleanSvgWhiteBackground(inputSvg);
  assert.ok(!result.includes('<rect'));
  assert.ok(result.includes('<circle'));
});

test('invertSvgColors converts dark colors to target color #F7F6F2', () => {
  const inputSvg = `<svg><path d="..." fill="#111111"/><path d="..." stroke="#000000"/></svg>`;
  const result = invertSvgColors(inputSvg, '#F7F6F2');
  assert.ok(result.includes('fill="#F7F6F2"'));
  assert.ok(result.includes('stroke="#F7F6F2"'));
  assert.ok(!result.includes('#111111'));
  assert.ok(!result.includes('#000000'));
});

test('colorizeSvgContent replaces currentColor, dark colors, and injects fill for unstyled paths', () => {
  const input = `<path d="M10 10L90 90"/><path d="M20 20" fill="currentColor"/><path d="M30 30" fill="#000000"/>`;
  const result = colorizeSvgContent(input, '#F7F6F2');
  assert.ok(!result.includes('currentColor'));
  assert.ok(!result.includes('#000000'));
  // All paths have fill="#F7F6F2"
  assert.strictEqual((result.match(/fill="#F7F6F2"/g) || []).length, 3);
});

test('autoCropSvgViewBox calculates tight square viewBox around inner paths', () => {
  const inputSvg = `<svg viewBox="0 0 1024 1024"><path fill="white" d="M0 0L1024 0L1024 1024L0 1024L0 0Z"/><path d="M200 300L600 300L600 700L200 700Z"/></svg>`;
  const result = autoCropSvgViewBox(inputSvg);
  assert.ok(!result.includes('viewBox="0 0 1024 1024"'));
  // Bounds: x: 200..600 (w: 400), y: 300..700 (h: 400). Square viewBox should be "200 300 400 400"
  assert.ok(result.includes('viewBox="200 300 400 400"'));
});

test('generateFaviconSvg creates dark square with cream icon and never currentColor', () => {
  // Input with unstyled path + path with currentColor
  const inputSvg = `<svg viewBox="0 0 1024 1024"><path d="M200 200L800 800"/><path d="M300 300" fill="currentColor"/></svg>`;
  const result = generateFaviconSvg(inputSvg, {
    darkSquare: true,
    padding: 12,
    autoRemoveWhite: true,
    theme: 'dark',
  });
  assert.ok(result.includes('viewBox="0 0 64 64"'));
  assert.ok(result.includes('<rect width="64" height="64" rx="14" fill="#111111"'));
  assert.ok(!result.includes('currentColor'));
  assert.ok(result.includes('fill="#F7F6F2"'));
});

test('generateFaviconSvg creates light square with dark icon when theme is light', () => {
  const inputSvg = `<svg viewBox="0 0 100 100"><path d="M20 20L80 80" fill="black"/></svg>`;
  const result = generateFaviconSvg(inputSvg, {
    darkSquare: true,
    padding: 12,
    autoRemoveWhite: true,
    theme: 'light',
  });
  assert.ok(result.includes('<rect width="64" height="64" rx="14" fill="#F7F6F2"'));
  assert.ok(result.includes('fill="#111111"'));
});

test('svgToDataUrl formats valid data url', () => {
  const svg = `<svg viewBox="0 0 10 10"></svg>`;
  const url = svgToDataUrl(svg);
  assert.ok(url.startsWith('data:image/svg+xml;charset=utf-8,'));
  assert.ok(url.includes('%3Csvg'));
});
