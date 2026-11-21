import test from 'node:test';
import assert from 'node:assert/strict';
import { formatBytes, resolveSafeUploadedImageUrl } from './imageCompression';

test('formatBytes formats 0 and byte units correctly', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(500), '500 B');
  assert.equal(formatBytes(1024), '1 KB');
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(formatBytes(1024 * 1024), '1 MB');
  assert.equal(formatBytes(2.5 * 1024 * 1024), '2.5 MB');
});

test('resolveSafeUploadedImageUrl falls back to dataUrl when uploadedUrl is empty or undefined', async () => {
  const fallback = 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAQAcJaACdLoAAP7/1AAA';
  
  const result1 = await resolveSafeUploadedImageUrl(undefined, fallback);
  assert.equal(result1, fallback);

  const result2 = await resolveSafeUploadedImageUrl('', fallback);
  assert.equal(result2, fallback);

  const result3 = await resolveSafeUploadedImageUrl('   ', fallback);
  assert.equal(result3, fallback);
});

test('resolveSafeUploadedImageUrl preserves data:image/ directly without network check', async () => {
  const dataUrl = 'data:image/webp;base64,AAA';
  const fallback = 'data:image/webp;base64,BBB';
  const result = await resolveSafeUploadedImageUrl(dataUrl, fallback);
  assert.equal(result, dataUrl);
});

test('resolveSafeUploadedImageUrl falls back to dataUrl in non-browser environment for HTTP URL', async () => {
  const httpUrl = 'https://example.com/stills/frame.webp';
  const fallback = 'data:image/webp;base64,FALLBACK';
  // In node environment, window is undefined so verifyImageUrlLoads returns false
  const result = await resolveSafeUploadedImageUrl(httpUrl, fallback);
  assert.equal(result, fallback);
});
