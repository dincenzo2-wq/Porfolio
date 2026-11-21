import type { StillsItem } from '../types/portfolio';

/**
 * Filters a list of files to only include valid image types.
 */
export function filterValidImageFiles<T extends { name: string; type?: string }>(files: T[]): T[] {
  if (!files || !Array.isArray(files)) return [];
  return files.filter((f) => {
    const mime = f.type ? f.type.toLowerCase() : '';
    const name = f.name ? f.name.toLowerCase() : '';
    return (
      mime.startsWith('image/') ||
      /\.(jpe?g|png|webp|avif|heic|tiff|bmp|gif)$/i.test(name)
    );
  });
}

/**
 * Generates an appropriate frame title.
 * If baseAlt is provided:
 *   - single file: "baseAlt"
 *   - multiple files: "baseAlt (1)", "baseAlt (2)", etc.
 * If baseAlt is empty, strips extension from original filename.
 */
export function generateFrameTitle(
  originalFileName: string,
  baseAlt?: string,
  index: number = 0,
  totalCount: number = 1
): string {
  const trimmedAlt = (baseAlt || '').trim();
  if (trimmedAlt) {
    return totalCount > 1 ? `${trimmedAlt} (${index + 1})` : trimmedAlt;
  }
  // Strip file extension
  const nameWithoutExt = (originalFileName || '').replace(/\.[^/.]+$/, '').trim();
  return nameWithoutExt || `Khung hình ${index + 1}`;
}

/**
 * Creates a complete StillsItem with both title and alt set.
 */
export function createStillsItem(params: {
  id?: string;
  src: string;
  title: string;
  year?: string;
  row?: 'top' | 'bottom';
}): StillsItem {
  const currentYear = new Date().getFullYear().toString();
  return {
    id: params.id || `still-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    src: params.src,
    alt: params.title,
    title: params.title,
    row: params.row || 'top',
    year: params.year || currentYear,
  };
}

/**
 * Merges newly uploaded stills in front of existing stills,
 * preserving natural chronological order of the uploaded batch.
 * [new1, new2, new3] + [existingA, existingB] => [new1, new2, new3, existingA, existingB]
 */
export function mergeNewStillsWithExisting(
  newStills: StillsItem[],
  existingStills: StillsItem[]
): StillsItem[] {
  const safeNew = Array.isArray(newStills) ? newStills : [];
  const safeExisting = Array.isArray(existingStills) ? existingStills : [];
  return [...safeNew, ...safeExisting];
}
