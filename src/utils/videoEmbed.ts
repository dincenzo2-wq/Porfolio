/**
 * Smart Video Embed & URL Parser
 * Supports YouTube, Vimeo, and direct video links (.mp4, .webm).
 */

export interface ParsedVideo {
  type: 'youtube' | 'vimeo' | 'gdrive' | 'vk' | 'direct' | 'none';
  embedUrl?: string;
  directUrl?: string;
  videoId?: string;
  platformName?: string;
  isDropbox?: boolean;
  isShorts?: boolean;
  isVkClip?: boolean;
  startSec?: number;
  endSec?: number;
}

export interface VideoParseOptions {
  startSec?: number;
  endSec?: number;
  muted?: boolean;
  loop?: boolean;
}

/**
 * Detects whether a video URL represents a vertical 9:16 video (e.g. YouTube Shorts, TikTok, Instagram Reels)
 * or horizontal 16:9 (standard YouTube/Vimeo). Returns null if indeterminate (e.g. direct MP4 where metadata is needed).
 */
export function detectAspectRatioFromVideoUrl(url?: string): '9:16' | '16:9' | null {
  if (!url || typeof url !== 'string') return null;
  const clean = url.trim().toLowerCase();
  if (
    clean.includes('/shorts/') ||
    clean.includes('tiktok.com') ||
    clean.includes('/reel/') ||
    clean.includes('/reels/') ||
    clean.includes('vk.com/clip') ||
    clean.includes('vkvideo.ru/clip') ||
    clean.includes('/clip-') ||
    clean.includes('/clip/')
  ) {
    return '9:16';
  }
  if (
    clean.includes('youtube.com/watch') ||
    clean.includes('youtu.be/') ||
    clean.includes('vimeo.com') ||
    clean.includes('vk.com/video') ||
    clean.includes('vkvideo.ru/video') ||
    clean.includes('video_ext.php')
  ) {
    return '16:9';
  }
  return null;
}

/**
 * Normalizes Dropbox share links into direct streaming MP4 URLs.
 * Converts www.dropbox.com to dl.dropboxusercontent.com (eliminates 302 redirects)
 * and strips dl=0/1 while preserving rlkey and all other query parameters.
 * E.g.:
 * https://www.dropbox.com/scl/fi/xyz/video.mp4?rlkey=abc&dl=0
 * -> https://dl.dropboxusercontent.com/scl/fi/xyz/video.mp4?rlkey=abc
 */
export function normalizeDropboxUrl(url?: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed.includes('dropbox.com') && !trimmed.includes('dropboxusercontent.com')) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes('dropbox.com') || parsed.hostname.includes('dropboxusercontent.com')) {
      parsed.hostname = 'dl.dropboxusercontent.com';
      parsed.searchParams.delete('dl');
      return parsed.toString();
    }
  } catch {
    // Regex fallback if URL constructor fails
    let res = trimmed.replace(/https?:\/\/(?:www\.)?dropbox\.com/i, 'https://dl.dropboxusercontent.com');
    res = res.replace(/[?&]dl=[01]/i, '');
    return res;
  }

  return trimmed;
}

/**
 * Direct stream helper for Dropbox URLs
 */
export function convertToDropboxStreamUrl(url?: string): string {
  return normalizeDropboxUrl(url);
}

/**
 * Returns proxy URL for cross-origin videos to bypass CORS on HTML5 <canvas>
 */
export function getVideoProxyUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:') || trimmed.startsWith('/api/')) {
    return trimmed;
  }
  const streamUrl = normalizeDropboxUrl(trimmed);
  return `/api/video-proxy?url=${encodeURIComponent(streamUrl)}`;
}

export function parseVideoUrl(url?: string, options?: VideoParseOptions): ParsedVideo {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return { type: 'none' };
  }

  let cleanUrl = url.trim();

  // If user pasted an iframe embed code (e.g. <iframe src="https://vk.com/video_ext.php..."></iframe>)
  const iframeSrcMatch = cleanUrl.match(/<iframe[^>]*\bsrc=["']([^"']+)["']/i);
  if (iframeSrcMatch && iframeSrcMatch[1]) {
    cleanUrl = iframeSrcMatch[1].trim();
  }

  // 1. YouTube Match
  // Matches: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
  const ytMatch = cleanUrl.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    const startParam = options?.startSec ? `&start=${Math.floor(options.startSec)}` : '';
    const endParam = options?.endSec ? `&end=${Math.ceil(options.endSec)}` : '';
    const loopParam = options?.loop ? `&loop=1&playlist=${videoId}` : '';
    const muteParam = options?.muted ? '&mute=1' : '';
    return {
      type: 'youtube',
      videoId,
      platformName: cleanUrl.includes('/shorts/') ? 'YouTube Shorts' : 'YouTube',
      isShorts: cleanUrl.includes('/shorts/'),
      startSec: options?.startSec,
      endSec: options?.endSec,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1${muteParam}&rel=0&modestbranding=1&playsinline=1&vq=hd1080${startParam}${endParam}${loopParam}`,
    };
  }

  // 2. Vimeo Match
  // Matches: vimeo.com/12345678, player.vimeo.com/video/12345678
  const vimeoMatch = cleanUrl.match(
    /(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^/]*\/videos\/|album\/\d+\/video\/|video\/|))(\d+)/
  );
  if (vimeoMatch && vimeoMatch[1]) {
    const videoId = vimeoMatch[1];
    const timeHash = options?.startSec ? `#t=${Math.floor(options.startSec)}s` : '';
    const loopParam = options?.loop ? '&loop=1' : '';
    const muteParam = options?.muted ? '&muted=1' : '';
    return {
      type: 'vimeo',
      videoId,
      platformName: 'Vimeo',
      startSec: options?.startSec,
      endSec: options?.endSec,
      embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1${muteParam}&autopause=0&title=0&byline=0&portrait=0&color=2563eb&quality=1080p${loopParam}${timeHash}`,
    };
  }

  // 3. VKontakte / VK Video Match
  // Matches:
  // - vk.com/video-12345_67890, vkvideo.ru/video-12345_67890
  // - vk.com/clip-12345_67890, vkvideo.ru/clip-12345_67890
  // - vk.com/video_ext.php?oid=...&id=...&hash=...
  // - vkvideo.ru/video_ext.php?oid=...&id=...&hash=...
  if (/(?:vk\.com|vkvideo\.ru)/i.test(cleanUrl)) {
    // 3a. Direct video_ext.php embed link
    if (cleanUrl.includes('video_ext.php')) {
      try {
        const parsed = new URL(cleanUrl);
        const oid = parsed.searchParams.get('oid') || '';
        const id = parsed.searchParams.get('id') || '';
        const hash = parsed.searchParams.get('hash') || '';
        const hd = parsed.searchParams.get('hd') || '2';
        const isClip = cleanUrl.includes('clip') || parsed.searchParams.get('clip') === '1';

        const hashParam = hash ? `&hash=${encodeURIComponent(hash)}` : '';
        const loopParam = options?.loop ? '&loop=1' : '';
        const embedUrl = `https://vk.com/video_ext.php?oid=${oid}&id=${id}${hashParam}&hd=${hd}&autoplay=1${loopParam}`;

        return {
          type: 'vk',
          videoId: `${oid}_${id}`,
          platformName: isClip ? 'VK Clip' : 'VK Video',
          isShorts: isClip,
          isVkClip: isClip,
          startSec: options?.startSec,
          endSec: options?.endSec,
          embedUrl,
        };
      } catch {
        // Fall through to regex
      }
    }

    // 3b. Standard watch or clip link: video{oid}_{id} or clip{oid}_{id}
    const vkStandardMatch = cleanUrl.match(/(?:vk\.com|vkvideo\.ru)\/(?:video|clip)(-?\d+)_(\d+)/i);
    if (vkStandardMatch) {
      const oid = vkStandardMatch[1];
      const id = vkStandardMatch[2];
      const isClip = cleanUrl.includes('/clip');

      let hash = '';
      try {
        const parsed = new URL(cleanUrl);
        hash = parsed.searchParams.get('hash') || '';
      } catch {}

      const hashParam = hash ? `&hash=${encodeURIComponent(hash)}` : '';
      const loopParam = options?.loop ? '&loop=1' : '';
      const embedUrl = `https://vk.com/video_ext.php?oid=${oid}&id=${id}${hashParam}&hd=2&autoplay=1${loopParam}`;

      return {
        type: 'vk',
        videoId: `${oid}_${id}`,
        platformName: isClip ? 'VK Clip' : 'VK Video',
        isShorts: isClip,
        isVkClip: isClip,
        startSec: options?.startSec,
        endSec: options?.endSec,
        embedUrl,
      };
    }
  }

  // 3. Google Drive Match
  // Matches: drive.google.com/file/d/FILE_ID/..., drive.google.com/open?id=FILE_ID, drive.google.com/uc?id=FILE_ID
  const gdriveMatch = cleanUrl.match(
    /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)|docs\.google\.com\/file\/d\/)([a-zA-Z0-9_-]+)/
  );
  if (gdriveMatch && gdriveMatch[1]) {
    const fileId = gdriveMatch[1];
    return {
      type: 'gdrive',
      videoId: fileId,
      platformName: 'Google Drive Video',
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      startSec: options?.startSec,
      endSec: options?.endSec,
    };
  }

  // 4. Dropbox Direct Stream Match
  if (cleanUrl.includes('dropbox.com')) {
    const normalizedUrl = normalizeDropboxUrl(cleanUrl);
    return {
      type: 'direct',
      directUrl: normalizedUrl,
      platformName: 'Dropbox MP4',
      isDropbox: true,
      startSec: options?.startSec,
      endSec: options?.endSec,
    };
  }

  // 4. Direct Video File (or relative path like /videos/xyz.mp4)
  return {
    type: 'direct',
    directUrl: cleanUrl,
    platformName: 'Direct Video File (MP4/WebM)',
    startSec: options?.startSec,
    endSec: options?.endSec,
  };
}

/**
 * Formats a video duration in seconds to MM:SS (or HH:MM:SS if >= 1 hour).
 * E.g. 10 -> "00:10", 75 -> "01:15", 3665 -> "01:01:05"
 */
export function formatVideoDuration(seconds: number): string {
  if (typeof seconds !== 'number' || isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
    return '00:00';
  }

  const totalSeconds = Math.round(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
