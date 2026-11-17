/**
 * Client-Side WebP Image Compressor
 * Automatically resizes & compresses images to WebP under 500KB before Cloudflare R2 upload.
 */

export interface CompressionResult {
  file: File;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
  width: number;
  height: number;
}

export async function compressImageToWebP(
  sourceFile: File,
  maxDimension: number = 1920,
  maxSizeBytes: number = 500 * 1024 // 500 KB target threshold
): Promise<CompressionResult> {
  const originalSize = sourceFile.size;

  // 1. Load image into HTMLImageElement
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(sourceFile);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Không thể đọc file ảnh đã chọn'));
    };
    img.src = objectUrl;
  });

  // 2. Calculate aspect-ratio bounded dimensions
  let { width, height } = image;
  if (width > maxDimension || height > maxDimension) {
    if (width >= height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  // 3. Render onto canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is not available');
  }

  // Enable high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, width, height);

  // 4. Iteratively find quality that ensures < 500KB
  let quality = 0.85;
  let compressedBlob: Blob | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    compressedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/webp', quality);
    });

    if (compressedBlob && compressedBlob.size <= maxSizeBytes) {
      break;
    }

    // Step down quality if still exceeds threshold
    quality -= 0.15;
    if (quality < 0.35) quality = 0.35;
  }

  // If still above 500KB (e.g. extremely complex noise/detail), resize canvas down by 20%
  if (compressedBlob && compressedBlob.size > maxSizeBytes) {
    canvas.width = Math.round(width * 0.8);
    canvas.height = Math.round(height * 0.8);
    const retryCtx = canvas.getContext('2d');
    if (retryCtx) {
      retryCtx.imageSmoothingEnabled = true;
      retryCtx.imageSmoothingQuality = 'high';
      retryCtx.drawImage(image, 0, 0, canvas.width, canvas.height);
      compressedBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/webp', 0.65);
      });
    }
  }

  if (!compressedBlob) {
    throw new Error('Không thể nén file ảnh sang định dạng WebP');
  }

  // 5. Generate output File & DataURL
  const cleanBaseName = sourceFile.name.replace(/\.[^/.]+$/, '');
  const webpFileName = `${cleanBaseName}.webp`;
  const compressedFile = new File([compressedBlob], webpFileName, {
    type: 'image/webp',
    lastModified: Date.now(),
  });

  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(compressedBlob!);
  });

  const compressedSize = compressedBlob.size;
  const savingsPercent = Math.max(
    0,
    Math.round(((originalSize - compressedSize) / originalSize) * 100)
  );

  return {
    file: compressedFile,
    dataUrl,
    originalSize,
    compressedSize,
    savingsPercent,
    width: canvas.width,
    height: canvas.height,
  };
}

export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
