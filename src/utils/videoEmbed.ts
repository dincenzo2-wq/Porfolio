/**
 * Smart Video Embed & URL Parser
 * Supports YouTube, Vimeo, and direct video links (.mp4, .webm).
 */

export interface ParsedVideo {
  type: 'youtube' | 'vimeo' | 'gdrive' | 'direct' | 'none';
  embedUrl?: string;
  directUrl?: string;
  videoId?: string;
  platformName?: string;
  isDropbox?: boolean;
  isShorts?: boolean;
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
    clean.includes('/reels/')
  ) {
    return '9:16';
  }
  if (
    clean.includes('youtube.com/watch') ||
    clean.includes('youtu.be/') ||
    clean.includes('vimeo.com')
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

  const cleanUrl = url.trim();

  // 1. YouTube Match
  // Matches: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
  const ytMatch = cleanUrl.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    const startParam = options?.startSec ? `&start=${Math.floor(options.startSec)}` : '';
    const endParam = options?.endSec ? `&end=${Math.ceil(options.endSec)}` : '';
    const loopParam = options?.loop !== false ? `&loop=1&playlist=${videoId}` : '';
    const muteParam = options?.muted !== false ? '&mute=1' : '';
    return {
      type: 'youtube',
      videoId,
      platformName: cleanUrl.includes('/shorts/') ? 'YouTube Shorts' : 'YouTube',
      isShorts: cleanUrl.includes('/shorts/'),
      startSec: options?.startSec,
      endSec: options?.endSec,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1${muteParam}&rel=0&modestbranding=1&playsinline=1${startParam}${endParam}${loopParam}`,
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
    const loopParam = options?.loop !== false ? '&loop=1' : '';
    const muteParam = options?.muted !== false ? '&muted=1' : '';
    return {
      type: 'vimeo',
      videoId,
      platformName: 'Vimeo',
      startSec: options?.startSec,
      endSec: options?.endSec,
      embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1${muteParam}&autopause=0&title=0&byline=0&portrait=0&color=2563eb${loopParam}${timeHash}`,
    };
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
