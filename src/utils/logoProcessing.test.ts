import { describe, it } from 'node:test';
import assert from 'node:assert';
import { processLogoPixels } from './logoProcessing';

describe('processLogoPixels', () => {
  it('punches out white negative space inside a colored logo and turns colored pixels pure white', () => {
    // Create a 5x5 image
    // Background: transparent (alpha = 0)
    // Outer border of 3x3 at center: Blue (R: 0, G: 100, B: 255, A: 255)
    // Center pixel at (2, 2): White tooth (R: 255, G: 255, B: 255, A: 255)
    const width = 5;
    const height = 5;
    const data = new Uint8ClampedArray(width * height * 4);

    // Fill center 3x3 with blue
    for (let y = 1; y <= 3; y++) {
      for (let x = 1; x <= 3; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 0;     // R
        data[idx + 1] = 100; // G
        data[idx + 2] = 255; // B
        data[idx + 3] = 255; // A
      }
    }

    // Set center pixel (2,2) to white
    const centerIdx = (2 * width + 2) * 4;
    data[centerIdx] = 255;
    data[centerIdx + 1] = 255;
    data[centerIdx + 2] = 255;
    data[centerIdx + 3] = 255;

    const bbox = processLogoPixels(data, width, height);

    // Center pixel should be punched out to transparent (alpha = 0)
    assert.strictEqual(data[centerIdx + 3], 0, 'Center white pixel must be punched out to alpha = 0');

    // Surrounding colored pixels should be converted to pure white (#FFFFFF)
    const bluePixelIdx = (1 * width + 1) * 4;
    assert.strictEqual(data[bluePixelIdx], 255);
    assert.strictEqual(data[bluePixelIdx + 1], 255);
    assert.strictEqual(data[bluePixelIdx + 2], 255);
    assert.strictEqual(data[bluePixelIdx + 3], 255);

    // Bounding box should span from x: 1..3, y: 1..3
    assert.strictEqual(bbox.minX, 1);
    assert.strictEqual(bbox.minY, 1);
    assert.strictEqual(bbox.maxX, 3);
    assert.strictEqual(bbox.maxY, 3);
    assert.strictEqual(bbox.width, 3);
    assert.strictEqual(bbox.height, 3);
    assert.strictEqual(bbox.hasContent, true);
  });

  it('preserves an already all-white logo on transparent background', () => {
    // 4x4 image with a 2x2 white square at (1,1) to (2,2)
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

    // White pixels should NOT be erased since there were no colored pixels
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

  it('turns dark/black logos into pure white with intact alpha', () => {
    const width = 3;
    const height = 3;
    const data = new Uint8ClampedArray(width * height * 4);

    // One semi-transparent black pixel at (1, 1)
    const idx = (1 * width + 1) * 4;
    data[idx] = 20;
    data[idx + 1] = 20;
    data[idx + 2] = 20;
    data[idx + 3] = 180; // semi-transparent

    const bbox = processLogoPixels(data, width, height);

    assert.strictEqual(data[idx], 255);
    assert.strictEqual(data[idx + 1], 255);
    assert.strictEqual(data[idx + 2], 255);
    assert.strictEqual(data[idx + 3], 180, 'Original alpha should be preserved for anti-aliasing');
    assert.strictEqual(bbox.hasContent, true);
    assert.strictEqual(bbox.minX, 1);
    assert.strictEqual(bbox.maxX, 1);
  });
});
