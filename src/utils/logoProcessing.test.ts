import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  processLogoPixels,
  computeScaledDimensions,
  computeSafeTrimBox,
} from './logoProcessing';

describe('processLogoPixels', () => {
  it('punches out white negative space inside a colored logo and turns colored pixels pure white', () => {
    const width = 5;
    const height = 5;
    const data = new Uint8ClampedArray(width * height * 4);

    // Fill center 3x3 with blue
    for (let y = 1; y <= 3; y++) {
      for (let x = 1; x <= 3; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 0;
        data[idx + 1] = 100;
        data[idx + 2] = 255;
        data[idx + 3] = 255;
      }
    }

    // Center pixel (2,2): white tooth inside blue plus
    const centerIdx = (2 * width + 2) * 4;
    data[centerIdx] = 255;
    data[centerIdx + 1] = 255;
    data[centerIdx + 2] = 255;
    data[centerIdx + 3] = 255;

    const bbox = processLogoPixels(data, width, height);

    assert.strictEqual(data[centerIdx + 3], 0, 'Center white pixel must be punched out to alpha = 0');

    const bluePixelIdx = (1 * width + 1) * 4;
    assert.strictEqual(data[bluePixelIdx], 255);
    assert.strictEqual(data[bluePixelIdx + 1], 255);
    assert.strictEqual(data[bluePixelIdx + 2], 255);
    assert.strictEqual(data[bluePixelIdx + 3], 255);

    assert.strictEqual(bbox.minX, 1);
    assert.strictEqual(bbox.minY, 1);
    assert.strictEqual(bbox.maxX, 3);
    assert.strictEqual(bbox.maxY, 3);
    assert.strictEqual(bbox.width, 3);
    assert.strictEqual(bbox.height, 3);
    assert.strictEqual(bbox.hasContent, true);
  });

  it('preserves an already all-white logo on transparent background', () => {
    const width = 4;
    const height = 4;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 1; y <= 2; y++) {
      for (let x = 1; x <= 2; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = 255;
      }
    }

    const bbox = processLogoPixels(data, width, height);

    const px = (1 * width + 1) * 4;
    assert.strictEqual(data[px], 255);
    assert.strictEqual(data[px + 1], 255);
    assert.strictEqual(data[px + 2], 255);
    assert.strictEqual(data[px + 3], 255);

    assert.strictEqual(bbox.minX, 1);
    assert.strictEqual(bbox.minY, 1);
    assert.strictEqual(bbox.maxX, 2);
    assert.strictEqual(bbox.maxY, 2);
    assert.strictEqual(bbox.hasContent, true);
  });

  it('clears faint pixels with alpha <= 25 and keeps visible semi-transparent pixels intact', () => {
    const width = 3;
    const height = 3;
    const data = new Uint8ClampedArray(width * height * 4);

    // Faint halo pixel at (0,0) with alpha = 25 -> must be cleared
    data[0] = 20;
    data[1] = 20;
    data[2] = 20;
    data[3] = 25;

    // Visible pixel at (1,1) with alpha = 180 -> must turn pure white preserving alpha
    const idx = (1 * width + 1) * 4;
    data[idx] = 20;
    data[idx + 1] = 20;
    data[idx + 2] = 20;
    data[idx + 3] = 180;

    const bbox = processLogoPixels(data, width, height);

    assert.strictEqual(data[3], 0, 'Pixels with alpha <= 25 should be cleared');
    assert.strictEqual(data[idx], 255);
    assert.strictEqual(data[idx + 1], 255);
    assert.strictEqual(data[idx + 2], 255);
    assert.strictEqual(data[idx + 3], 180);
    assert.strictEqual(bbox.hasContent, true);
    assert.strictEqual(bbox.minX, 1);
    assert.strictEqual(bbox.maxX, 1);
  });

  it('handles fully transparent images safely without returning negative dimensions', () => {
    const width = 10;
    const height = 8;
    const data = new Uint8ClampedArray(width * height * 4);

    const bbox = processLogoPixels(data, width, height);
    assert.strictEqual(bbox.hasContent, false);
    assert.strictEqual(bbox.width, 0);
    assert.strictEqual(bbox.height, 0);

    const safeTrim = computeSafeTrimBox(bbox, width, height);
    assert.strictEqual(safeTrim.isTrimmed, false);
    assert.strictEqual(safeTrim.x, 0);
    assert.strictEqual(safeTrim.y, 0);
    assert.strictEqual(safeTrim.width, 10);
    assert.strictEqual(safeTrim.height, 8);
  });
});

describe('computeScaledDimensions', () => {
  it('caps height at 140px while preserving aspect ratio for large logos', () => {
    const scaled = computeScaledDimensions(1400, 700, 140);
    assert.deepStrictEqual(scaled, { width: 280, height: 140 });
  });

  it('does not upscale logos already <= 140px tall', () => {
    const scaled = computeScaledDimensions(220, 80, 140);
    assert.deepStrictEqual(scaled, { width: 220, height: 80 });
  });
});
