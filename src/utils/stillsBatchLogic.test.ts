import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterValidImageFiles,
  generateFrameTitle,
  createStillsItem,
  mergeNewStillsWithExisting,
} from './stillsBatchLogic';
import type { StillsItem } from '../types/portfolio';

test('filterValidImageFiles accepts valid images and rejects non-images', () => {
  const files = [
    { name: 'photo1.jpg', type: 'image/jpeg' },
    { name: 'photo2.png', type: 'image/png' },
    { name: 'photo3.webp', type: 'image/webp' },
    { name: 'photo4.AVIF', type: '' },
    { name: 'photo5.heic', type: '' },
    { name: 'document.pdf', type: 'application/pdf' },
    { name: 'video.mp4', type: 'video/mp4' },
    { name: 'script.txt', type: 'text/plain' },
  ];

  const filtered = filterValidImageFiles(files);
  assert.equal(filtered.length, 5);
  assert.equal(filtered[0].name, 'photo1.jpg');
  assert.equal(filtered[1].name, 'photo2.png');
  assert.equal(filtered[2].name, 'photo3.webp');
  assert.equal(filtered[3].name, 'photo4.AVIF');
  assert.equal(filtered[4].name, 'photo5.heic');
});

test('generateFrameTitle uses filename without extension when baseAlt is empty', () => {
  assert.equal(generateFrameTitle('Sunset_Beach.jpg'), 'Sunset_Beach');
  assert.equal(generateFrameTitle('tv-commercial-scene.webp', ''), 'tv-commercial-scene');
  assert.equal(generateFrameTitle('my.frame.01.png', '   '), 'my.frame.01');
});

test('generateFrameTitle formats sequence numbers when baseAlt is provided for multiple files', () => {
  assert.equal(generateFrameTitle('file1.png', 'Cyberpunk Neon', 0, 1), 'Cyberpunk Neon');
  assert.equal(generateFrameTitle('file1.png', 'Cyberpunk Neon', 0, 3), 'Cyberpunk Neon (1)');
  assert.equal(generateFrameTitle('file2.png', 'Cyberpunk Neon', 1, 3), 'Cyberpunk Neon (2)');
  assert.equal(generateFrameTitle('file3.png', 'Cyberpunk Neon', 2, 3), 'Cyberpunk Neon (3)');
});

test('createStillsItem sets both alt and title identically and assigns valid year and row', () => {
  const item = createStillsItem({
    id: 'custom-id-1',
    src: 'https://r2.example.com/uploads/frame1.webp',
    title: 'Autumn Rain Macro',
    year: '2025',
  });

  assert.equal(item.id, 'custom-id-1');
  assert.equal(item.src, 'https://r2.example.com/uploads/frame1.webp');
  assert.equal(item.title, 'Autumn Rain Macro');
  assert.equal(item.alt, 'Autumn Rain Macro');
  assert.equal(item.year, '2025');
  assert.equal(item.row, 'top');
});

test('mergeNewStillsWithExisting maintains uploaded batch order at the front of gallery', () => {
  const existing: StillsItem[] = [
    { id: 'old-1', src: 'old1.jpg', alt: 'Old 1', title: 'Old 1', row: 'top', year: '2024' },
    { id: 'old-2', src: 'old2.jpg', alt: 'Old 2', title: 'Old 2', row: 'bottom', year: '2024' },
  ];

  const batch: StillsItem[] = [
    { id: 'batch-1', src: 'batch1.webp', alt: 'Batch 1', title: 'Batch 1', row: 'top', year: '2026' },
    { id: 'batch-2', src: 'batch2.webp', alt: 'Batch 2', title: 'Batch 2', row: 'top', year: '2026' },
    { id: 'batch-3', src: 'batch3.webp', alt: 'Batch 3', title: 'Batch 3', row: 'top', year: '2026' },
  ];

  const merged = mergeNewStillsWithExisting(batch, existing);

  assert.equal(merged.length, 5);
  // Verify order: batch items first in natural sequence, followed by existing items
  assert.equal(merged[0].id, 'batch-1');
  assert.equal(merged[1].id, 'batch-2');
  assert.equal(merged[2].id, 'batch-3');
  assert.equal(merged[3].id, 'old-1');
  assert.equal(merged[4].id, 'old-2');
});
