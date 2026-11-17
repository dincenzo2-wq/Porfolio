/**
 * Utility functions for SVG cleaning, auto-cropping, color inversion,
 * favicon generation, and dynamic favicon cache-busting updates.
 */

export interface FaviconOptions {
  darkSquare: boolean;
  padding: number; // percentage 8 - 30
  autoRemoveWhite: boolean;
  theme?: 'dark' | 'light'; // 'dark': #111111 bg + #F7F6F2 icon; 'light': #F7F6F2 bg + #111111 icon
}

/**
 * Loại bỏ thẻ <rect> hoặc <path> đóng vai trò là nền trắng trong file SVG.
 * Nhận diện các màu: white, #fff, #ffffff, #FFFFFF, rgb(255, 255, 255).
 */
export function cleanSvgWhiteBackground(svgString: string): string {
  if (!svgString || typeof svgString !== 'string') return '';

  let cleaned = svgString;

  // 1. Gỡ bỏ thẻ <path> hoặc <rect> bao trùm canvas có fill trắng
  // Ví dụ: <path fill="white" d="M0 0L1024 0L1024 1024L0 1024L0 0Z"/>
  cleaned = cleaned.replace(
    /<path[^>]*fill\s*=\s*["'](?:#ffffff|#fff|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))["'][^>]*d\s*=\s*["']M0\s+0L\d+[^"']*["'][^>]*\/?>/gi,
    ''
  );

  // 2. Gỡ bỏ thẻ <rect> nền trắng (width="100%", width="1024", etc.)
  cleaned = cleaned.replace(
    /<rect[^>]*fill\s*=\s*["'](?:#ffffff|#fff|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))["'][^>]*\/?>/gi,
    ''
  );

  // 3. Gỡ bỏ rect với style="fill:white" hoặc style="fill:#ffffff"
  cleaned = cleaned.replace(
    /<rect[^>]*style\s*=\s*["'][^"']*fill\s*:\s*(?:#ffffff|#fff|white)[^"']*["'][^>]*\/?>/gi,
    ''
  );

  // 4. Gỡ bỏ metadata C2PA / RDF nếu có để tối ưu dung lượng
  cleaned = cleaned.replace(/<metadata>[\s\S]*?<\/metadata>/gi, '');

  return cleaned.trim();
}

/**
 * Tính toán bounding box từ các lệnh path d="..." và các thẻ hình học cơ bản (fallback cho Node/SSR).
 */
export function computeSvgPathBoundingBox(svgString: string): string | null {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let found = false;

  // 1. Path d="..."
  const pathMatches = svgString.matchAll(/d\s*=\s*["']([^"']+)["']/g);
  for (const pm of pathMatches) {
    const d = pm[1];
    const matches = d.matchAll(/[MLHVCSQTAZmlhvcsqtaz]([^MLHVCSQTAZmlhvcsqtaz]+)/g);
    for (const m of matches) {
      const nums = m[1].trim().split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));
      for (let i = 0; i < nums.length - 1; i += 2) {
        const x = nums[i], y = nums[i + 1];
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  // 2. Circles / Ellipses
  const circleMatches = svgString.matchAll(/<circle[^>]*cx=["']([^"']+)["'][^>]*cy=["']([^"']+)["'][^>]*r=["']([^"']+)["']/gi);
  for (const cm of circleMatches) {
    const cx = Number(cm[1]), cy = Number(cm[2]), r = Number(cm[3]);
    if (!isNaN(cx) && !isNaN(cy) && !isNaN(r)) {
      minX = Math.min(minX, cx - r);
      maxX = Math.max(maxX, cx + r);
      minY = Math.min(minY, cy - r);
      maxY = Math.max(maxY, cy + r);
      found = true;
    }
  }

  // 3. Rects
  const rectMatches = svgString.matchAll(/<rect[^>]*x=["']([^"']+)["'][^>]*y=["']([^"']+)["'][^>]*width=["']([^"']+)["'][^>]*height=["']([^"']+)["']/gi);
  for (const rm of rectMatches) {
    const x = Number(rm[1]), y = Number(rm[2]), w = Number(rm[3]), h = Number(rm[4]);
    if (!isNaN(x) && !isNaN(y) && !isNaN(w) && !isNaN(h)) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + w);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + h);
      found = true;
    }
  }

  // 4. Polygons
  const polyMatches = svgString.matchAll(/points\s*=\s*["']([^"']+)["']/gi);
  for (const pm of polyMatches) {
    const nums = pm[1].trim().split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));
    for (let i = 0; i < nums.length - 1; i += 2) {
      const x = nums[i], y = nums[i + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      found = true;
    }
  }

  if (found && minX < maxX && minY < maxY) {
    const width = maxX - minX;
    const height = maxY - minY;
    const maxDim = Math.max(width, height);
    const cx = minX + width / 2;
    const cy = minY + height / 2;
    const sqX = Number((cx - maxDim / 2).toFixed(2));
    const sqY = Number((cy - maxDim / 2).toFixed(2));
    const sqDim = Number(maxDim.toFixed(2));
    return `${sqX} ${sqY} ${sqDim} ${sqDim}`;
  }

  return null;
}

/**
 * Tính toán vùng bao thực tế (tight square bounding box) của các biểu tượng trong SVG.
 * Trong môi trường browser: tận dụng getBBox() trên DOM để đạt độ chuẩn xác 100%.
 * Trong Node.js/SSR: dùng computeSvgPathBoundingBox làm fallback.
 */
export function computeSvgTightViewBox(svgString: string): string | null {
  if (!svgString || typeof svgString !== 'string') return null;

  const cleaned = cleanSvgWhiteBackground(svgString);

  // 1. Thử dùng getBBox() trên browser DOM
  if (typeof document !== 'undefined') {
    try {
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = '1000px';
      container.style.height = '1000px';
      container.style.visibility = 'hidden';
      container.style.pointerEvents = 'none';

      container.innerHTML = cleaned;
      const svgEl = container.querySelector('svg');
      if (svgEl) {
        document.body.appendChild(container);
        try {
          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          while (svgEl.firstChild) {
            g.appendChild(svgEl.firstChild);
          }
          svgEl.appendChild(g);

          const bbox = g.getBBox();
          if (bbox && bbox.width > 0 && bbox.height > 0) {
            const maxDim = Math.max(bbox.width, bbox.height);
            const cx = bbox.x + bbox.width / 2;
            const cy = bbox.y + bbox.height / 2;
            const sqX = Number((cx - maxDim / 2).toFixed(2));
            const sqY = Number((cy - maxDim / 2).toFixed(2));
            const sqDim = Number(maxDim.toFixed(2));
            return `${sqX} ${sqY} ${sqDim} ${sqDim}`;
          }
        } finally {
          document.body.removeChild(container);
        }
      }
    } catch {
      // Fallback
    }
  }

  // 2. Fallback sang tính toán tọa độ path
  return computeSvgPathBoundingBox(cleaned);
}

/**
 * Tự động cắt sát khung hình (viewBox) của SVG, loại bỏ khoảng trắng thừa xung quanh biểu tượng.
 * Giữ nguyên tỉ lệ khung hình (vuông hóa có tâm ở trung tâm biểu tượng).
 */
export function autoCropSvgViewBox(svgString: string): string {
  if (!svgString || typeof svgString !== 'string') return '';

  const cleaned = cleanSvgWhiteBackground(svgString);
  const tightViewBox = computeSvgTightViewBox(cleaned);

  if (tightViewBox) {
    if (/viewBox\s*=\s*["'][^"']+["']/i.test(cleaned)) {
      return cleaned.replace(/viewBox\s*=\s*["'][^"']+["']/i, `viewBox="${tightViewBox}"`);
    } else {
      return cleaned.replace(/<svg\b/i, `<svg viewBox="${tightViewBox}" `);
    }
  }

  return cleaned;
}

/**
 * Đảo màu các chi tiết tối/đen trong SVG sang màu chỉ định.
 */
export function invertSvgColors(svgString: string, targetColor = '#F7F6F2'): string {
  if (!svgString || typeof svgString !== 'string') return '';
  return colorizeSvgContent(svgString, targetColor);
}

/**
 * Ép cứng màu sắc của toàn bộ chi tiết trong biểu tượng thành một mã màu nhất định,
 * loại bỏ hoàn toàn currentColor và các màu đen (#000, #111) để tránh bị chìm trên nền tối.
 */
export function colorizeSvgContent(svgOrInnerString: string, targetColor: string): string {
  if (!svgOrInnerString || typeof svgOrInnerString !== 'string') return '';

  let result = svgOrInnerString;

  // 1. Thay thế mọi giá trị currentColor
  result = result.replace(/fill\s*=\s*["']currentColor["']/gi, `fill="${targetColor}"`);
  result = result.replace(/stroke\s*=\s*["']currentColor["']/gi, `stroke="${targetColor}"`);

  // 2. Thay thế các fill tối
  result = result.replace(
    /fill\s*=\s*["'](?:#000000|#000|black|#111111|#111|#0A0A0A|#0B0B0D|#222222|#1a1a1a|#18181b|#27272a|#333333|#333)["']/gi,
    `fill="${targetColor}"`
  );

  // 3. Thay thế các stroke tối
  result = result.replace(
    /stroke\s*=\s*["'](?:#000000|#000|black|#111111|#111|#0A0A0A|#0B0B0D|#222222|#1a1a1a|#18181b|#27272a|#333333|#333)["']/gi,
    `stroke="${targetColor}"`
  );

  // 4. Thay thế style inline
  result = result.replace(
    /style\s*=\s*["']([^"']*)["']/gi,
    (_match, styles: string) => {
      let updated = styles
        .replace(/fill\s*:\s*(?:currentColor|#000000|#000|black|#111111|#111)/gi, `fill: ${targetColor}`)
        .replace(/stroke\s*:\s*(?:currentColor|#000000|#000|black|#111111|#111)/gi, `stroke: ${targetColor}`);
      return `style="${updated}"`;
    }
  );

  // 5. Thêm fill="..." cho các thẻ hình vẽ không hề có thuộc tính fill và không có stroke (tránh trình duyệt mặc định tô màu đen)
  // Chỉ áp dụng cho các thẻ không có fill=
  result = result.replace(
    /<(path|polygon|circle|ellipse|rect)(?![^>]*\bfill\s*=)([^>]*?)(\/?>)/gi,
    (_match, tag, rest, end) => {
      // Nếu có stroke và fill="none" thì không gán fill
      if (/stroke\s*=/i.test(rest) && /fill\s*:\s*none/i.test(rest)) {
        return `<${tag}${rest}${end}`;
      }
      return `<${tag} fill="${targetColor}"${rest}${end}`;
    }
  );

  return result;
}

/**
 * Trích xuất thuộc tính viewBox từ mã SVG, mặc định '0 0 1024 1024' nếu không có.
 */
export function extractSvgViewBox(svgString: string): string {
  const match = svgString.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  const widthMatch = svgString.match(/width\s*=\s*["'](\d+)["']/i);
  const heightMatch = svgString.match(/height\s*=\s*["'](\d+)["']/i);
  if (widthMatch && heightMatch) {
    return `0 0 ${widthMatch[1]} ${heightMatch[1]}`;
  }
  return '0 0 64 64';
}

/**
 * Trích xuất phần nội dung bên trong của thẻ <svg>...</svg>
 */
export function extractSvgInnerContent(svgString: string): string {
  const match = svgString.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return svgString;
}

/**
 * Tự động tạo bản SVG cho Favicon:
 * - Hỗ trợ 2 phong cách:
 *   + Nền tối Studio: nền vuông bo góc nhẹ #111111 (rx="14") + biểu tượng màu kem sáng #F7F6F2
 *   + Nền kem tương phản: nền vuông bo góc nhẹ #F7F6F2 + biểu tượng màu đen #111111 (cực nổi trên thanh tab tối)
 * - Tự động tính toán viewBox cắt sát (tight viewBox) để biểu tượng to, sắc nét ở padding 10% - 12%
 * - Tuyệt đối không dùng currentColor để chống lỗi chìm màu đen khi nhúng thẻ <img> hay <link rel="icon">
 */
export function generateFaviconSvg(
  svgString: string,
  options: FaviconOptions = { darkSquare: true, padding: 12, autoRemoveWhite: true, theme: 'dark' }
): string {
  if (!svgString || typeof svgString !== 'string') return '';

  let processed = svgString;

  if (options.autoRemoveWhite) {
    processed = cleanSvgWhiteBackground(processed);
  }

  // Tự động cắt sát viewBox nếu có khoảng trắng thừa
  const tightViewBox = computeSvgTightViewBox(processed) || extractSvgViewBox(processed);
  const innerContent = extractSvgInnerContent(processed);

  const isLightTheme = options.theme === 'light';
  const bgColor = isLightTheme ? '#F7F6F2' : '#111111';
  const iconColor = isLightTheme ? '#111111' : '#F7F6F2';

  // Ép cứng màu sắc biểu tượng
  const colorizedInner = colorizeSvgContent(innerContent, iconColor);

  if (!options.darkSquare) {
    // Favicon trong suốt chuẩn vector
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${tightViewBox}" width="64" height="64"><g fill="${iconColor}" color="${iconColor}">${colorizedInner}</g></svg>`;
  }

  // Khung 64x64 với padding tùy chọn (mặc định 12% cho biểu tượng to, sắc nét)
  const padPercent = Math.max(8, Math.min(30, options.padding ?? 12));
  const pad = Number(((64 * padPercent) / 100).toFixed(1));
  const innerSize = Number((64 - pad * 2).toFixed(1));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="14" fill="${bgColor}"/>
  <svg x="${pad}" y="${pad}" width="${innerSize}" height="${innerSize}" viewBox="${tightViewBox}">
    <g fill="${iconColor}" color="${iconColor}">
      ${colorizedInner}
    </g>
  </svg>
</svg>`.trim();
}

/**
 * Chuyển đổi chuỗi SVG thành chuẩn Data URL
 */
export function svgToDataUrl(svgString: string): string {
  if (!svgString) return '';
  const clean = svgString.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(clean)}`;
}

/**
 * Cập nhật thẻ <link rel="icon"> và <link rel="apple-touch-icon"> trong <head>
 * Kèm tham số ?v=${Date.now()} để ép trình duyệt cập nhật tức thì, tránh dính cache.
 */
export function updateHeadFavicon(faviconDataUrlOrPath: string): void {
  if (typeof document === 'undefined' || !faviconDataUrlOrPath) return;

  const version = Date.now();
  const urlWithCacheBuster = faviconDataUrlOrPath.startsWith('data:')
    ? `${faviconDataUrlOrPath}#v=${version}`
    : `${faviconDataUrlOrPath}${faviconDataUrlOrPath.includes('?') ? '&' : '?'}v=${version}`;

  // 1. rel="icon"
  let iconLink = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!iconLink) {
    iconLink = document.createElement('link');
    iconLink.rel = 'icon';
    document.head.appendChild(iconLink);
  }
  iconLink.type = faviconDataUrlOrPath.startsWith('data:image/svg')
    ? 'image/svg+xml'
    : 'image/png';
  iconLink.href = urlWithCacheBuster;

  // 2. rel="apple-touch-icon"
  let appleLink = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
  if (!appleLink) {
    appleLink = document.createElement('link');
    appleLink.rel = 'apple-touch-icon';
    document.head.appendChild(appleLink);
  }
  appleLink.href = urlWithCacheBuster;
}
