export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  hasContent: boolean;
}

/**
 * Pure function to process logo pixel buffer in-place:
 * 1. Detect if image contains colored/dark pixels.
 * 2. If colored/dark pixels exist:
 *    - Solid white pixels (R > 240, G > 240, B > 240) are punched out to alpha = 0
 *      (e.g., negative space cutout like a white tooth inside a blue plus).
 *    - All remaining non-transparent pixels are recolored to pure white (#FFFFFF),
 *      preserving original alpha for smooth anti-aliased edges.
 * 3. If image was already monochrome white (no colored pixels):
 *    - White pixels are preserved without punching out.
 * 4. Calculates the tight bounding box around visible pixels (alpha > 10).
 */
export function processLogoPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  whiteThreshold: number = 240
): BoundingBox {
  const totalPixels = width * height;
  let coloredOrDarkCount = 0;

  // Pass 1: detect if image has colored / dark pixels (non-white with opacity)
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const a = data[idx + 3];
    if (a > 20) {
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (r <= whiteThreshold || g <= whiteThreshold || b <= whiteThreshold) {
        coloredOrDarkCount++;
      }
    }
  }

  const hasColoredOrDark = coloredOrDarkCount > 0;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  // Pass 2: process pixels & compute bounding box
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const a = data[idx + 3];

      if (a <= 20) {
        data[idx + 3] = 0;
        continue;
      }

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const isNearWhite = r > whiteThreshold && g > whiteThreshold && b > whiteThreshold;

      if (hasColoredOrDark) {
        if (isNearWhite) {
          // Negative space cutout: punch out white details inside colored emblems to transparent
          data[idx + 3] = 0;
        } else {
          // Colored/dark shape turned to pure white, retaining original anti-aliased alpha
          data[idx] = 255;
          data[idx + 1] = 255;
          data[idx + 2] = 255;

          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      } else {
        // Image was already all-white on transparent
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const hasContent = maxX >= minX && maxY >= minY;
  return {
    minX: hasContent ? minX : 0,
    minY: hasContent ? minY : 0,
    maxX: hasContent ? maxX : width - 1,
    maxY: hasContent ? maxY : height - 1,
    width: hasContent ? maxX - minX + 1 : 0,
    height: hasContent ? maxY - minY + 1 : 0,
    hasContent,
  };
}

export interface ProcessedLogoResult {
  file: File;
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Browser-side canvas pipeline:
 * Converts an uploaded logo file to pure white with negative space punchout,
 * auto-trims whitespace edges, and exports as lightweight WebP.
 */
export async function convertLogoToWhiteWebP(
  file: File,
  padding: number = 4
): Promise<ProcessedLogoResult> {
  if (typeof window === 'undefined' || !window.document) {
    throw new Error('convertLogoToWhiteWebP must be executed in a browser environment');
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      if (!width || !height) {
        reject(new Error('Kích thước ảnh logo không hợp lệ'));
        return;
      }

      // Step 1: Draw to initial processing canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        reject(new Error('Không thể khởi tạo Canvas 2D context'));
        return;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, width, height);
      const bbox = processLogoPixels(imageData.data, width, height);

      // Put transformed pixels back
      ctx.putImageData(imageData, 0, 0);

      // Step 2: Auto-trim to bounding box with safe padding
      const trimmedCanvas = document.createElement('canvas');
      const cropW = bbox.hasContent ? bbox.width : width;
      const cropH = bbox.hasContent ? bbox.height : height;
      const cropX = bbox.hasContent ? bbox.minX : 0;
      const cropY = bbox.hasContent ? bbox.minY : 0;

      const finalW = cropW + padding * 2;
      const finalH = cropH + padding * 2;

      trimmedCanvas.width = finalW;
      trimmedCanvas.height = finalH;

      const trimmedCtx = trimmedCanvas.getContext('2d');
      if (!trimmedCtx) {
        reject(new Error('Không thể khởi tạo Trimmed Canvas context'));
        return;
      }

      trimmedCtx.clearRect(0, 0, finalW, finalH);
      trimmedCtx.drawImage(
        canvas,
        cropX,
        cropY,
        cropW,
        cropH,
        padding,
        padding,
        cropW,
        cropH
      );

      // Step 3: Export to lightweight WebP
      const cleanBaseName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      const exportName = `${cleanBaseName}-white.webp`;

      trimmedCanvas.toBlob(
        (blob) => {
          if (!blob) {
            // Fallback to PNG data URL if toBlob fails
            const dataUrl = trimmedCanvas.toDataURL('image/png');
            resolve({
              file: file,
              dataUrl,
              width: finalW,
              height: finalH,
            });
            return;
          }

          const processedFile = new File([blob], exportName, {
            type: 'image/webp',
            lastModified: Date.now(),
          });
          const dataUrl = trimmedCanvas.toDataURL('image/webp', 0.92);

          resolve({
            file: processedFile,
            dataUrl,
            width: finalW,
            height: finalH,
          });
        },
        'image/webp',
        0.92
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Không thể tải hoặc giải mã file ảnh: ${file.name}`));
    };

    img.src = objectUrl;
  });
}
