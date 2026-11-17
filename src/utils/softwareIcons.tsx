import React from 'react';
import { Laptop } from 'lucide-react';
import type { SoftwareToolType, SoftwareToolEntry } from '../types/portfolio';

export type SoftwareId =
  | 'premiere'
  | 'davinci'
  | 'after-effects'
  | 'photoshop'
  | 'illustrator'
  | 'capcut'
  | 'final-cut'
  | 'audition'
  | 'media-encoder'
  | 'lightroom'
  | 'blender'
  | 'cinema-4d'
  | 'figma'
  | 'procreate'
  | 'notion'
  | 'unreal'
  | 'avid'
  | 'generic';

export interface SoftwareMatchInfo {
  id: SoftwareId;
  canonicalName: string;
  category: 'editing' | 'vfx' | 'design' | '3d' | 'audio' | 'utility';
  brandColor: string;
}

/**
 * Intelligent fuzzy matcher for video production & creative software.
 * Handles common typos (e.g. "obe premier pro"), abbreviations ("pr", "ae", "fcp", "c4d"),
 * and full official product names.
 */
export function detectSoftware(rawName: string): SoftwareMatchInfo {
  if (!rawName || typeof rawName !== 'string') {
    return {
      id: 'generic',
      canonicalName: 'Công cụ sáng tạo',
      category: 'utility',
      brandColor: '#0B1120',
    };
  }

  const raw = rawName.trim().toLowerCase();
  // Strip diacritics and non-alphanumeric chars
  const normalized = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cleaned = normalized.replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens = cleaned.split(' ').filter(Boolean);

  // 1. Adobe Premiere Pro (handles "obe premier pro", "premiere", "premier", "pr", "premiere pro")
  if (
    cleaned.includes('premier') ||
    cleaned.includes('premiere') ||
    tokens.includes('pr') ||
    cleaned.includes('adobe pr') ||
    cleaned.includes('obe premier')
  ) {
    return {
      id: 'premiere',
      canonicalName: 'Adobe Premiere Pro',
      category: 'editing',
      brandColor: '#00005B',
    };
  }

  // 2. DaVinci Resolve Studio (handles "davinci", "resolve", "blackmagic", "bmd")
  if (
    cleaned.includes('davinci') ||
    cleaned.includes('resolve') ||
    cleaned.includes('blackmagic') ||
    tokens.includes('bmd')
  ) {
    return {
      id: 'davinci',
      canonicalName: 'DaVinci Resolve Studio',
      category: 'editing',
      brandColor: '#0B1120',
    };
  }

  // 3. Adobe After Effects (handles "after effects", "after effect", "aftereffects", "ae")
  if (
    cleaned.includes('after effect') ||
    cleaned.includes('aftereffect') ||
    cleaned.includes('after fx') ||
    tokens.includes('ae') ||
    cleaned.includes('adobe ae')
  ) {
    return {
      id: 'after-effects',
      canonicalName: 'Adobe After Effects',
      category: 'vfx',
      brandColor: '#00005B',
    };
  }

  // 4. Adobe Photoshop (handles "photoshop", "ps")
  if (cleaned.includes('photoshop') || tokens.includes('ps') || cleaned.includes('adobe ps')) {
    return {
      id: 'photoshop',
      canonicalName: 'Adobe Photoshop',
      category: 'design',
      brandColor: '#001E36',
    };
  }

  // 5. Adobe Illustrator (handles "illustrator", "ai")
  if (cleaned.includes('illustrator') || tokens.includes('ai') || cleaned.includes('adobe ai')) {
    return {
      id: 'illustrator',
      canonicalName: 'Adobe Illustrator',
      category: 'design',
      brandColor: '#330000',
    };
  }

  // 6. CapCut (handles "capcut", "cap cut")
  if (cleaned.includes('capcut') || cleaned.includes('cap cut')) {
    return {
      id: 'capcut',
      canonicalName: 'CapCut Desktop / Pro',
      category: 'editing',
      brandColor: '#000000',
    };
  }

  // 7. Apple Final Cut Pro (handles "final cut", "final cut pro", "fcp", "fcpx")
  if (
    cleaned.includes('final cut') ||
    cleaned.includes('finalcut') ||
    tokens.includes('fcp') ||
    tokens.includes('fcpx') ||
    tokens.includes('fcp7')
  ) {
    return {
      id: 'final-cut',
      canonicalName: 'Final Cut Pro',
      category: 'editing',
      brandColor: '#18181B',
    };
  }

  // 8. Adobe Audition (handles "audition", "au")
  if (cleaned.includes('audition') || tokens.includes('au') || cleaned.includes('adobe au')) {
    return {
      id: 'audition',
      canonicalName: 'Adobe Audition',
      category: 'audio',
      brandColor: '#002B24',
    };
  }

  // 9. Adobe Media Encoder (handles "media encoder", "encoder", "ame")
  if (
    cleaned.includes('media encoder') ||
    cleaned.includes('mediaencoder') ||
    tokens.includes('ame') ||
    (tokens.includes('encoder') && !tokens.includes('live'))
  ) {
    return {
      id: 'media-encoder',
      canonicalName: 'Adobe Media Encoder',
      category: 'utility',
      brandColor: '#001E36',
    };
  }

  // 10. Adobe Lightroom (handles "lightroom", "lr")
  if (cleaned.includes('lightroom') || tokens.includes('lr') || cleaned.includes('adobe lr')) {
    return {
      id: 'lightroom',
      canonicalName: 'Adobe Lightroom',
      category: 'design',
      brandColor: '#001E36',
    };
  }

  // 11. Blender (handles "blender", "blender 3d")
  if (cleaned.includes('blender')) {
    return {
      id: 'blender',
      canonicalName: 'Blender 3D',
      category: '3d',
      brandColor: '#0F172A',
    };
  }

  // 12. Cinema 4D (handles "cinema 4d", "cinema4d", "c4d", "maxon c4d")
  if (
    cleaned.includes('cinema 4d') ||
    cleaned.includes('cinema4d') ||
    tokens.includes('c4d') ||
    cleaned.includes('maxon')
  ) {
    return {
      id: 'cinema-4d',
      canonicalName: 'Maxon Cinema 4D',
      category: '3d',
      brandColor: '#001333',
    };
  }

  // 13. Figma (handles "figma")
  if (cleaned.includes('figma')) {
    return {
      id: 'figma',
      canonicalName: 'Figma',
      category: 'design',
      brandColor: '#18181B',
    };
  }

  // 14. Procreate (handles "procreate")
  if (cleaned.includes('procreate')) {
    return {
      id: 'procreate',
      canonicalName: 'Procreate',
      category: 'design',
      brandColor: '#09090B',
    };
  }

  // 15. Notion (handles "notion")
  if (cleaned.includes('notion')) {
    return {
      id: 'notion',
      canonicalName: 'Notion',
      category: 'utility',
      brandColor: '#18181B',
    };
  }

  // 16. Unreal Engine (handles "unreal", "ue5", "ue4")
  if (cleaned.includes('unreal') || tokens.includes('ue5') || tokens.includes('ue4')) {
    return {
      id: 'unreal',
      canonicalName: 'Unreal Engine',
      category: '3d',
      brandColor: '#0E1117',
    };
  }

  // 17. Avid Media Composer (handles "avid", "media composer")
  if (cleaned.includes('avid') || cleaned.includes('media composer')) {
    return {
      id: 'avid',
      canonicalName: 'Avid Media Composer',
      category: 'editing',
      brandColor: '#491B6D',
    };
  }

  // Default fallback
  return {
    id: 'generic',
    canonicalName: rawName.trim(),
    category: 'utility',
    brandColor: '#0B1120',
  };
}

export type SoftwareIconSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<SoftwareIconSize, string> = {
  xs: 'w-4 h-4 rounded-sm',
  sm: 'w-5 h-5 rounded-md',
  md: 'w-7 h-7 sm:w-8 sm:h-8 rounded-lg',
  lg: 'w-10 h-10 rounded-xl',
};

/**
 * Validates whether a string is non-empty and contains an SVG markup.
 */
export function isValidSvg(rawSvg?: string): boolean {
  if (!rawSvg || typeof rawSvg !== 'string') return false;
  const s = rawSvg.trim().toLowerCase();
  return s.includes('<svg') && s.includes('</svg>');
}

/**
 * Formats custom SVG string to scale fluidly with CSS within any icon container.
 */
export function formatCustomSvgForIcon(rawSvg: string): string {
  if (!rawSvg || typeof rawSvg !== 'string') return '';
  let svg = rawSvg.trim();
  if (!svg.toLowerCase().includes('<svg')) return '';

  // Sanitize potential script tags or event handlers
  svg = svg.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  svg = svg.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '');
  svg = svg.replace(/javascript\s*:/gi, '');

  svg = svg.replace(/<svg\b([^>]*)>/i, (_match, attrs) => {
    const hasViewBox = /viewBox\s*=/i.test(attrs);
    const widthMatch = attrs.match(/width\s*=\s*["']?(\d+)/i);
    const heightMatch = attrs.match(/height\s*=\s*["']?(\d+)/i);

    let cleanAttrs = attrs
      .replace(/\bwidth\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\bheight\s*=\s*["'][^"']*["']/gi, '')
      .trim();

    if (!hasViewBox && widthMatch && heightMatch) {
      cleanAttrs += ` viewBox="0 0 ${widthMatch[1]} ${heightMatch[1]}"`;
    }

    return `<svg ${cleanAttrs} style="width: 100%; height: 100%; max-width: 100%; max-height: 100%; display: block;">`;
  });

  return svg;
}

/**
 * Helper to normalize any software tool entry (whether string or object) into SoftwareToolEntry.
 */
export function parseToolEntry(tool: SoftwareToolType): SoftwareToolEntry {
  if (typeof tool === 'string') {
    return { name: tool.trim() };
  }
  if (tool && typeof tool === 'object') {
    return {
      name: (tool.name || '').trim(),
      customSvg: tool.customSvg?.trim() || undefined,
    };
  }
  return { name: '' };
}

/**
 * High-fidelity, official-styled SVG icons for creative software.
 * Supports custom SVG overrides when provided by the user, and auto-detects otherwise.
 * Shared seamlessly across both /admin management and Homepage display.
 */
export function renderSoftwareIcon(
  name: string,
  size: SoftwareIconSize = 'md',
  className = '',
  customSvg?: string
): React.ReactElement {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  // 1. If customSvg is provided and valid, render the user's custom SVG
  if (customSvg && isValidSvg(customSvg)) {
    const formatted = formatCustomSvgForIcon(customSvg);
    return (
      <div
        className={`${sizeClass} flex items-center justify-center shrink-0 overflow-hidden shadow-2xs ${className}`}
        title={`${name} (Custom SVG)`}
        dangerouslySetInnerHTML={{ __html: formatted }}
      />
    );
  }

  // 2. Otherwise auto-detect by software name
  const match = detectSoftware(name);

  switch (match.id) {
    case 'premiere': {
      // Official Adobe Premiere Pro "Pr" badge (Deep navy #00005B background with magenta #EA77FF "Pr")
      return (
        <div
          className={`${sizeClass} overflow-hidden shrink-0 shadow-2xs ${className}`}
          title="Adobe Premiere Pro"
        >
          <svg
            viewBox="0 0 83 80"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Adobe CC 2024/2026 outer container */}
            <path
              d="M67.5214 0H14.5299C6.50526 0 0 6.50526 0 14.5299V65.4701C0 73.4947 6.50526 80 14.5299 80H67.5214C75.546 80 82.0513 73.4947 82.0513 65.4701V14.5299C82.0513 6.50526 75.546 0 67.5214 0Z"
              fill="#00005B"
            />
            {/* Capital "P" in #EA77FF */}
            <path
              d="M18.4758 56.1007V20.9284C18.4758 20.6721 18.5859 20.5431 18.8061 20.5431C19.3926 20.5431 19.928 20.5345 20.7357 20.5156C21.5425 20.4975 22.414 20.4792 23.3502 20.4606C24.286 20.4424 25.2768 20.4241 26.3226 20.4055C27.3683 20.3874 28.4049 20.3783 29.4324 20.3779C32.2207 20.3779 34.5692 20.7265 36.4778 21.4238C38.1996 22.0062 39.7697 22.9651 41.074 24.2309C42.1797 25.3281 43.0341 26.6521 43.5784 28.1115C44.0933 29.5318 44.3542 31.0316 44.3491 32.5424C44.3491 35.4786 43.6702 37.9005 42.3125 39.808C40.9458 41.7235 39.0247 43.1739 36.8082 43.9638C34.4964 44.8264 31.9274 45.1189 29.1022 45.1189C28.2946 45.1189 27.7258 45.1098 27.3958 45.0914C27.0656 45.0733 26.5703 45.0641 25.9098 45.0639V56.0457C25.9194 56.113 25.9132 56.1816 25.8917 56.2461C25.8702 56.3106 25.834 56.3692 25.7859 56.4172C25.7378 56.4653 25.6792 56.5015 25.6147 56.523C25.5502 56.5445 25.4816 56.5507 25.4143 56.5411H18.8611C18.604 56.5411 18.4758 56.3948 18.4758 56.1007ZM25.9098 27.1482V38.62C26.3862 38.657 26.8265 38.6753 27.2307 38.675H29.0471C30.3836 38.6706 31.7113 38.4586 32.9828 38.0467C34.0732 37.7228 35.0476 37.0923 35.7899 36.2303C36.5054 35.3866 36.8632 34.2124 36.8633 32.7076C36.8923 31.6428 36.6153 30.5921 36.065 29.6802C35.4866 28.7983 34.6506 28.1161 33.6707 27.7262C32.3913 27.2289 31.0246 26.9949 29.6526 27.0382C28.7718 27.0382 27.9921 27.0473 27.3134 27.0656C26.6339 27.0846 26.1661 27.1121 25.9098 27.1482Z"
              fill="#EA77FF"
            />
            {/* Lowercase "r" in #EA77FF */}
            <path
              d="M48.2 29.8 H55.4 V35.2 C56.6 33.1 58.3 31.4 60.5 30.3 C62.5 29.2 64.8 28.8 67.2 29.0 V36.2 C65.0 35.8 62.7 36.2 60.8 37.3 C58.8 38.6 56.7 40.8 55.4 43.6 V56.4 H48.2 V29.8 Z"
              fill="#EA77FF"
            />
          </svg>
        </div>
      );
    }

    case 'davinci': {
      // Iconic DaVinci Resolve 3-blade color pinwheel
      return (
        <div
          className={`${sizeClass} rounded-lg bg-[#0B1120] border border-white/10 flex items-center justify-center p-1 shrink-0 ${className}`}
          title="DaVinci Resolve Studio"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* DaVinci Outer Border Frame */}
            <path
              d="M17.621 0 5.977.004c-1.37 0-2.756.345-3.762 1.11a4.925 4.925 0 0 0-1.61 2.003C.233 3.93 0 5.02 0 5.951l.012 12.2c.002 1.604.479 3.057 1.461 4.112.984 1.056 2.462 1.683 4.331 1.691L16.856 24c1.26.005 3.095-.036 4.303-.714 1.075-.605 2.025-1.556 2.497-2.984.278-.84.345-2.084.344-3.147l-.021-11.13c-.002-.888-.15-2.023-.547-2.934-.425-.976-1.181-1.815-2.322-2.425C20.353.26 19.123 0 17.622 0zm0 .93c1.378 0 2.538.295 3.04.565.977.523 1.544 1.166 1.889 1.96.315.721.47 1.793.473 2.572l.018 11.13c.002 1.013-.097 2.257-.298 2.86-.396 1.202-1.146 1.946-2.063 2.462-.814.457-2.612.593-3.82.588l-11.05-.044c-1.657-.007-2.832-.534-3.626-1.386-.792-.851-1.212-2.06-1.212-3.485L.999 5.95c0-.829.196-1.827.474-2.437.345-.757.75-1.207 1.365-1.674C3.585 1.27 4.868.97 6.08.97z"
              fill="#FFFFFF"
            />
            {/* Top blade: Sky blue */}
            <path
              d="M11.961 4.353c-1.976.089-3.204 1.658-3.214 3.29.019 1.443 1.635 3.481 2.884 4.53.12.099.154.109.33.18.062.025.198-.047.327-.135.36-.245.993-.947 1.648-1.738a7.67 7.67 0 0 0 1.031-1.683c.409-.89.261-1.599.235-1.888a3.983 3.983 0 0 0-.99-1.692 3.36 3.36 0 0 0-2.251-.864z"
              fill="#38BDF8"
            />
            {/* Left blade: Rose / red */}
            <path
              d="M7.701 12.313a6.201 6.201 0 0 0-.752.047c-.596.078-.932.273-1.29.51a3.177 3.177 0 0 0-1.365 1.979c-.075.552-.086 1.053.033 1.507.433 1.389 1.326 2.222 2.847 2.452.636.028 1.37-.063 1.99-.45 1.269-.782 2.08-3.17 2.412-4.742.053-.176.035-.357-.013-.42-.005-.067-.044-.113-.19-.183-.398-.192-1.32-.417-2.375-.6a7.68 7.68 0 0 0-1.297-.1z"
              fill="#F43F5E"
            />
            {/* Right blade: Gold yellow */}
            <path
              d="M16.133 12.275a10.185 10.185 0 0 0-3.244.61c-.15.058-.26.1-.374.17-.057.036-.11.135-.105.292.017.433.29 1.278.624 2.27.384 1.135 1.066 2.27 1.844 2.74a3.23 3.23 0 0 0 2.53.342c.832-.243 1.595-.868 1.962-1.546.986-1.818.19-3.548-1.121-4.417-.447-.296-1.133-.445-1.89-.46-.074 0-.15-.002-.226-.001z"
              fill="#FACC15"
            />
          </svg>
        </div>
      );
    }

    case 'after-effects': {
      // Official Adobe After Effects "Ae" badge
      return (
        <div
          className={`${sizeClass} overflow-hidden shrink-0 shadow-2xs ${className}`}
          title="Adobe After Effects"
        >
          <svg
            viewBox="0 0 83 80"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M67.5214 0H14.5299C6.50526 0 0 6.50526 0 14.5299V65.4701C0 73.4947 6.50526 80 14.5299 80H67.5214C75.546 80 82.0513 73.4947 82.0513 65.4701V14.5299C82.0513 6.50526 75.546 0 67.5214 0Z"
              fill="#00005B"
            />
            <path
              d="M32.9624 47.8634H20.2474L17.6604 55.915C17.6252 56.0616 17.54 56.1913 17.4194 56.2817C17.2988 56.3721 17.1504 56.4177 16.9999 56.4104H10.5599C10.1927 56.4104 10.0642 56.2086 10.1746 55.805L21.1832 24.2314C21.2932 23.9012 21.4034 23.5783 21.5134 23.156C21.6576 22.4216 21.7313 21.6752 21.7336 20.9268C21.7261 20.8745 21.731 20.8212 21.7477 20.771C21.7644 20.7209 21.7926 20.6753 21.83 20.6379C21.8674 20.6005 21.9129 20.5723 21.9631 20.5556C22.0132 20.5389 22.0666 20.534 22.1189 20.5415H30.8708C31.127 20.5415 31.2738 20.6332 31.3111 20.8168L43.8058 55.86C43.9158 56.2272 43.8057 56.4107 43.4756 56.4104H36.32C36.1971 56.4241 36.0734 56.3925 35.9721 56.3216C35.8708 56.2507 35.7988 56.1453 35.7696 56.0251L32.9624 47.8634ZM22.2291 41.0745H30.9258C30.7056 40.3409 30.4487 39.5152 30.1551 38.5975C29.861 37.6807 29.5491 36.6991 29.2194 35.6527C28.8892 34.607 28.559 33.5611 28.2287 32.5153C27.8985 31.4695 27.5957 30.4604 27.3204 29.4879C27.0453 28.5161 26.7976 27.6263 26.5774 26.8184H26.5223C26.2126 28.305 25.8268 29.7747 25.3664 31.2218C24.8521 32.8731 24.3292 34.5611 23.7977 36.2857C23.2654 38.011 22.7425 39.6072 22.2291 41.0745Z"
              fill="#9999FF"
            />
            <path
              d="M64.0619 44.7295H53.2185C53.3513 45.8024 53.7076 46.8355 54.2644 47.7622C54.8799 48.6798 55.7504 49.3973 56.7687 49.8263C58.1487 50.4234 59.6413 50.716 61.1447 50.684C62.3374 50.6611 63.5256 50.5306 64.6949 50.2942C65.7407 50.153 66.7656 49.8858 67.7473 49.4985C67.9304 49.3523 68.0226 49.4435 68.0226 49.7737V55.0028C68.0316 55.1452 68.0031 55.2876 67.9399 55.4156C67.8769 55.5157 67.7923 55.6003 67.6922 55.6632C66.6033 56.1456 65.4574 56.4869 64.2821 56.6791C62.6854 56.979 61.0627 57.1173 59.4383 57.092C56.8323 57.092 54.6489 56.6883 52.8882 55.881C51.2236 55.1477 49.7535 54.0357 48.5949 52.6335C47.5127 51.3123 46.7077 49.7866 46.228 48.1475C45.753 46.5297 45.512 44.8522 45.5125 43.1661C45.5074 41.3251 45.7954 39.4949 46.3657 37.7444C46.9149 36.0369 47.7834 34.4492 48.9252 33.0658C50.0513 31.6985 51.4595 30.5908 53.0534 29.8182C54.6677 29.0296 56.5761 28.7466 58.7778 28.7466C60.6037 28.7005 62.4173 29.0576 64.0894 29.7924C65.4955 30.3921 66.7333 31.3269 67.6947 32.5153C68.5965 33.679 69.2859 34.9927 69.7313 36.3959C70.165 37.7481 70.3878 39.1591 70.3918 40.5791C70.3918 41.3867 70.3643 42.1206 70.3092 42.7808C70.2543 43.4413 70.2084 43.9183 70.1716 44.2119C70.1574 44.3333 70.099 44.4452 70.0077 44.5263C69.9163 44.6075 69.7984 44.6523 69.6762 44.6523C69.456 44.6523 69.0799 44.6798 68.5479 44.7349C68.0155 44.7899 67.355 44.8266 66.5664 44.8449C65.7768 44.8638 64.9426 44.7295 64.0619 44.7295ZM53.2185 39.7153H60.4291C61.3098 39.7153 61.9611 39.7061 62.383 39.6878C62.6654 39.6595 62.938 39.5692 63.1813 39.4232V39.0929C63.1702 38.6624 63.096 38.2359 62.9611 37.827C62.6641 36.8879 62.0671 36.0723 61.2616 35.5055C60.4561 34.9387 59.4869 34.652 58.5027 34.6895C57.5764 34.6335 56.6538 34.8483 55.8474 35.3077C55.0411 35.7671 54.3858 36.4511 53.9616 37.2765C53.5845 38.0442 53.3336 38.8677 53.2185 39.7153Z"
              fill="#9999FF"
            />
          </svg>
        </div>
      );
    }

    case 'photoshop': {
      // Official Adobe Photoshop "Ps" badge
      return (
        <div
          className={`${sizeClass} overflow-hidden shrink-0 shadow-2xs ${className}`}
          title="Adobe Photoshop"
        >
          <svg
            viewBox="0 0 83 80"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M67.5214 0H14.5299C6.50526 0 0 6.50526 0 14.5299V65.4701C0 73.4947 6.50526 80 14.5299 80H67.5214C75.546 80 82.0513 73.4947 82.0513 65.4701V14.5299C82.0513 6.50526 75.546 0 67.5214 0Z"
              fill="#001E36"
            />
            <path
              d="M18.4758 56.1007V20.9284C18.4758 20.6721 18.5859 20.5431 18.8061 20.5431C19.3926 20.5431 19.928 20.5345 20.7357 20.5156C21.5425 20.4975 22.414 20.4792 23.3502 20.4606C24.286 20.4424 25.2768 20.4241 26.3226 20.4055C27.3683 20.3874 28.4049 20.3783 29.4324 20.3779C32.2207 20.3779 34.5692 20.7265 36.4778 21.4238C38.1996 22.0062 39.7697 22.9651 41.074 24.2309C42.1797 25.3281 43.0341 26.6521 43.5784 28.1115C44.0933 29.5318 44.3542 31.0316 44.3491 32.5424C44.3491 35.4786 43.6702 37.9005 42.3125 39.808C40.9458 41.7235 39.0247 43.1739 36.8082 43.9638C34.4964 44.8264 31.9274 45.1189 29.1022 45.1189C28.2946 45.1189 27.7258 45.1098 27.3958 45.0914C27.0656 45.0733 26.5703 45.0641 25.9098 45.0639V56.0457C25.9194 56.113 25.9132 56.1816 25.8917 56.2461C25.8702 56.3106 25.834 56.3692 25.7859 56.4172C25.7378 56.4653 25.6792 56.5015 25.6147 56.523C25.5502 56.5445 25.4816 56.5507 25.4143 56.5411H18.8611C18.604 56.5411 18.4758 56.3948 18.4758 56.1007ZM25.9098 27.1482V38.62C26.3862 38.657 26.8265 38.6753 27.2307 38.675H29.0471C30.3836 38.6706 31.7113 38.4586 32.9828 38.0467C34.0732 37.7228 35.0476 37.0923 35.7899 36.2303C36.5054 35.3866 36.8632 34.2124 36.8633 32.7076C36.8923 31.6428 36.6153 30.5921 36.065 29.6802C35.4866 28.7983 34.6506 28.1161 33.6707 27.7262C32.3913 27.2289 31.0246 26.9949 29.6526 27.0382C28.7718 27.0382 27.9921 27.0473 27.3134 27.0656C26.6339 27.0846 26.1661 27.1121 25.9098 27.1482Z"
              fill="#31A8FF"
            />
            <path
              d="M65.6311 36.534C64.5967 36.0025 63.495 35.6137 62.3561 35.3781C61.1011 35.0902 59.8181 34.9425 58.5306 34.9377C57.8342 34.9189 57.1387 35.0023 56.4665 35.1855C56.0386 35.2807 55.6583 35.5245 55.3931 35.8735C55.2137 36.1526 55.1182 36.4774 55.118 36.8092C55.128 37.1311 55.2441 37.4407 55.4482 37.6899C55.7697 38.066 56.1626 38.3747 56.604 38.5981C57.3888 39.0207 58.1975 39.3975 59.0259 39.7265C60.8732 40.3449 62.6384 41.1858 64.2825 42.2309C65.4025 42.9378 66.3293 43.9119 66.9796 45.0656C67.5265 46.1581 67.8003 47.3669 67.7778 48.5884C67.8107 50.2013 67.3498 51.7858 66.4568 53.1294C65.5007 54.4933 64.1728 55.5537 62.6312 56.1842C60.961 56.9179 58.8969 57.2849 56.439 57.2851C54.8775 57.3009 53.3186 57.1533 51.7878 56.8448C50.5818 56.6236 49.4077 56.2539 48.2926 55.7439C48.1722 55.6818 48.0721 55.5867 48.0039 55.4697C47.9356 55.3527 47.9021 55.2187 47.9073 55.0834V49.1388C47.9007 49.0806 47.91 49.0217 47.9342 48.9683C47.9585 48.915 47.9968 48.8693 48.045 48.836C48.0923 48.8093 48.1466 48.7976 48.2006 48.8026C48.2547 48.8075 48.306 48.8288 48.3477 48.8636C49.6646 49.6401 51.0945 50.2065 52.5859 50.5424C53.9005 50.8719 55.2489 51.0473 56.604 51.0653C57.8881 51.0653 58.833 50.9001 59.4387 50.5699C59.7123 50.4447 59.9437 50.2429 60.1049 49.9889C60.2661 49.7349 60.3502 49.4396 60.347 49.1388C60.347 48.6623 60.0718 48.2037 59.5214 47.7627C58.971 47.3224 57.8518 46.7903 56.1637 46.1664C54.4354 45.5649 52.7967 44.7317 51.2924 43.6896C50.2165 42.9413 49.3305 41.9516 48.7054 40.7998C48.1641 39.7152 47.8904 38.5167 47.9073 37.3046C47.9042 35.8482 48.3043 34.4194 49.0632 33.1764C49.9284 31.8076 51.1709 30.718 52.641 30.039C54.2553 29.2322 56.2735 28.8286 58.6958 28.828C60.1143 28.8166 61.5315 28.9178 62.934 29.1307C63.9497 29.2596 64.9426 29.5281 65.8847 29.9289C65.9594 29.9503 66.0281 29.9888 66.0854 30.0413C66.1427 30.0939 66.1871 30.159 66.2149 30.2316C66.2521 30.366 66.2706 30.5049 66.27 30.6444V36.2037C66.2738 36.2684 66.2605 36.333 66.2316 36.3909C66.2026 36.4489 66.1589 36.4982 66.1049 36.534C66.0313 36.5706 65.9502 36.5897 65.868 36.5897C65.7858 36.5897 65.7047 36.5706 65.6311 36.534Z"
              fill="#31A8FF"
            />
          </svg>
        </div>
      );
    }

    case 'illustrator': {
      // Official Adobe Illustrator "Ai" badge
      return (
        <div
          className={`${sizeClass} overflow-hidden shrink-0 shadow-2xs ${className}`}
          title="Adobe Illustrator"
        >
          <svg
            viewBox="0 0 83 80"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M67.5214 0H14.5299C6.50526 0 0 6.50526 0 14.5299V65.4701C0 73.4947 6.50526 80 14.5299 80H67.5214C75.546 80 82.0513 73.4947 82.0513 65.4701V14.5299C82.0513 6.50526 75.546 0 67.5214 0Z"
              fill="#330000"
            />
            <path
              d="M39.7607 48.0096H27.0459L24.4589 56.0459C24.4237 56.1924 24.3384 56.3221 24.2178 56.4125C24.0972 56.503 23.9489 56.5485 23.7984 56.5413H17.3584C16.9911 56.5413 16.8627 56.3395 16.9731 55.9358L27.9815 24.2312C28.0917 23.901 28.2018 23.5249 28.3119 23.1028C28.4559 22.3684 28.5296 21.622 28.5321 20.8736C28.5246 20.8213 28.5294 20.7679 28.5461 20.7178C28.5629 20.6676 28.591 20.6221 28.6284 20.5847C28.6658 20.5473 28.7114 20.5191 28.7615 20.5024C28.8117 20.4856 28.865 20.4808 28.9174 20.4883H37.669C37.9255 20.4883 38.0722 20.58 38.1094 20.7635L50.6042 55.9908C50.7143 56.3581 50.6041 56.5416 50.2739 56.5413H43.1183C42.9954 56.5549 42.8717 56.5233 42.7704 56.4524C42.6692 56.3815 42.5971 56.2761 42.5679 56.156L39.7607 48.0096ZM29.0274 41.0743H37.7241C37.504 40.3407 37.2471 39.515 36.9536 38.5973C36.6594 37.6805 36.3476 36.6989 36.0179 35.6525C35.6876 34.6068 35.3572 33.561 35.027 32.5151C34.6968 31.4693 34.3941 30.4602 34.1189 29.4877C33.8436 28.5159 33.5959 27.6261 33.3759 26.8182H33.3208C33.0109 28.3048 32.6251 29.7745 32.1649 31.2216C31.6506 32.8729 31.1276 34.5609 30.5961 36.2855C30.0637 38.0108 29.5408 39.6071 29.0274 41.0743Z"
              fill="#FF9A00"
            />
            <path
              d="M58.0343 26.3229C57.4729 26.3455 56.9131 26.2493 56.3914 26.0406C55.8697 25.8319 55.398 25.5155 55.007 25.112C54.6171 24.691 54.3142 24.1971 54.1158 23.6587C53.9174 23.1202 53.8274 22.5479 53.851 21.9746C53.831 21.4069 53.9309 20.8414 54.1443 20.315C54.3577 19.7886 54.6798 19.3131 55.0894 18.9197C55.4951 18.5303 55.974 18.2252 56.4984 18.0221C57.0227 17.8189 57.5822 17.7218 58.1443 17.7363C59.4654 17.7363 60.5021 18.1307 61.2543 18.9197C61.634 19.3297 61.9291 19.8105 62.1227 20.3347C62.3163 20.8589 62.4046 21.4162 62.3826 21.9746C62.4056 22.5501 62.3127 23.1245 62.1094 23.6634C61.9061 24.2024 61.5966 24.695 61.1992 25.112C60.7839 25.5214 60.2882 25.8404 59.7435 26.0488C59.1988 26.2572 58.6169 26.3505 58.0343 26.3229ZM54.2362 55.9909V29.6805C54.2362 29.3503 54.3825 29.1851 54.6766 29.1851H61.4469C61.7403 29.1851 61.887 29.3502 61.8873 29.6805V55.9909C61.8873 56.3582 61.7405 56.5416 61.4469 56.5414H54.7317C54.4015 56.5414 54.2364 56.3579 54.2362 55.9909Z"
              fill="#FF9A00"
            />
          </svg>
        </div>
      );
    }

    case 'capcut': {
      // Official CapCut Desktop / Pro ribbon clapper
      return (
        <div
          className={`${sizeClass} rounded-lg bg-black border border-white/10 flex items-center justify-center p-1.5 shrink-0 overflow-hidden ${className}`}
          title="CapCut Desktop / Pro"
        >
          <svg
            viewBox="0 0 24.5 24"
            className="w-full h-full text-white"
            fill="currentColor"
            fillRule="evenodd"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M24.189 6.442V2.671l-4.535 2.383V4.91c.002-1.505-1.078-2.411-2.638-2.411H2.64C.993 2.5 0 3.407 0 4.91V8.72L6.354 12 0 15.316v3.8C0 20.595 1 21.5 2.64 21.5h14.373c1.56 0 2.639-.907 2.639-2.382v-.197l4.536 2.409v-3.828L13.64 12 24.19 6.443zM9.982 13.873l7.797 4.083H2.157l7.825-4.083zm7.741-7.828l-7.742 4.057-7.825-4.057h15.567z" />
          </svg>
        </div>
      );
    }

    case 'final-cut': {
      // Apple Final Cut Pro iconic rainbow clapperboard
      return (
        <div
          className={`${sizeClass} rounded-lg bg-[#18181B] border border-white/10 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-2xs ${className}`}
          title="Apple Final Cut Pro"
        >
          <svg
            viewBox="0 0 48 48"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Clapper base */}
            <rect x="4" y="8" width="40" height="32" rx="6" fill="#202024" />
            {/* Clapper stripes on top stick */}
            <path d="M7 10 L13 18 H9 L5 12.5 C4.4 11.7 4.6 10.6 5.4 10.1 C5.9 9.8 6.5 9.8 7 10 Z" fill="#FFFFFF" />
            <path d="M17 10 L23 18 H18 L12 10 H17 Z" fill="#FFFFFF" />
            <path d="M27 10 L33 18 H28 L22 10 H27 Z" fill="#FFFFFF" />
            <path d="M37 10 L43 18 H38 L32 10 H37 Z" fill="#FFFFFF" />
            {/* Dividing hairline */}
            <line x1="4" y1="18" x2="44" y2="18" stroke="#000000" strokeWidth="1.5" />
            {/* Apple Vibrant Rainbow Spectrum Bar */}
            <g transform="translate(6, 23)">
              <rect x="0" y="0" width="6" height="12" rx="1" fill="#FACC15" />
              <rect x="6" y="0" width="6" height="12" rx="1" fill="#FB923C" />
              <rect x="12" y="0" width="6" height="12" rx="1" fill="#F43F5E" />
              <rect x="18" y="0" width="6" height="12" rx="1" fill="#C084FC" />
              <rect x="24" y="0" width="6" height="12" rx="1" fill="#38BDF8" />
              <rect x="30" y="0" width="6" height="12" rx="1" fill="#4ADE80" />
            </g>
          </svg>
        </div>
      );
    }

    case 'audition': {
      // Adobe Audition "Au" badge
      return (
        <div
          className={`${sizeClass} overflow-hidden shrink-0 shadow-2xs ${className}`}
          title="Adobe Audition"
        >
          <svg
            viewBox="0 0 83 80"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M67.5214 0H14.5299C6.50526 0 0 6.50526 0 14.5299V65.4701C0 73.4947 6.50526 80 14.5299 80H67.5214C75.546 80 82.0513 73.4947 82.0513 65.4701V14.5299C82.0513 6.50526 75.546 0 67.5214 0Z"
              fill="#002B24"
            />
            {/* Letter "A" */}
            <path
              d="M36.76 48.0H24.04L21.45 56.04C21.41 56.19 21.33 56.32 21.21 56.41C21.09 56.5 20.94 56.54 20.79 56.54H14.35C13.99 56.54 13.86 56.33 13.97 55.93L24.98 24.23C25.09 23.9 25.2 23.52 25.31 23.1C25.45 22.36 25.52 21.62 25.53 20.87H34.66C34.92 20.87 35.07 20.97 35.1 21.15L47.6 55.99C47.71 56.35 47.6 56.54 47.27 56.54H40.11L36.76 48.0ZM26.02 41.07H34.72L30.34 26.81H30.28L26.02 41.07Z"
              fill="#00E5C9"
            />
            {/* Letter "u" */}
            <path
              d="M51.2 30.5H57.8V44.2C57.8 45.8 58.2 47.1 59.0 48.0C59.8 48.8 61.0 49.3 62.4 49.3C63.8 49.3 65.0 48.8 65.8 48.0C66.6 47.1 67.0 45.8 67.0 44.2V30.5H73.6V44.5C73.6 48.2 72.5 51.1 70.4 53.1C68.3 55.1 65.6 56.1 62.4 56.1C59.1 56.1 56.4 55.1 54.3 53.1C52.2 51.1 51.2 48.2 51.2 44.5V30.5Z"
              fill="#00E5C9"
            />
          </svg>
        </div>
      );
    }

    case 'media-encoder': {
      // Adobe Media Encoder "Me" badge
      return (
        <div
          className={`${sizeClass} overflow-hidden shrink-0 shadow-2xs ${className}`}
          title="Adobe Media Encoder"
        >
          <svg
            viewBox="0 0 83 80"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M67.5214 0H14.5299C6.50526 0 0 6.50526 0 14.5299V65.4701C0 73.4947 6.50526 80 14.5299 80H67.5214C75.546 80 82.0513 73.4947 82.0513 65.4701V14.5299C82.0513 6.50526 75.546 0 67.5214 0Z"
              fill="#001E36"
            />
            {/* Capital "M" */}
            <path
              d="M16.5 56.0V21.0H23.5L30.2 42.5H30.4L37.1 21.0H44.1V56.0H37.5V32.0H37.3L32.2 48.5H28.4L23.3 32.0H23.1V56.0H16.5Z"
              fill="#CC77FF"
            />
            {/* Lowercase "e" */}
            <path
              d="M64.06 44.72H53.21C53.35 45.8 53.7 46.83 54.26 47.76C54.87 48.67 55.75 49.39 56.76 49.82C58.14 50.42 59.64 50.71 61.14 50.68C62.33 50.66 63.52 50.53 64.69 50.29V55.0C63.5 55.6 62.1 56.0 60.5 56.2C58.5 56.4 56.5 56.3 54.7 55.6C51.2 54.2 48.5 50.8 48.5 45.8C48.5 40.8 51.2 37.0 55.0 35.2C56.8 34.3 58.8 33.9 60.8 33.9C64.5 33.9 67.5 35.8 68.8 39.5C69.5 41.5 69.5 43.8 69.5 44.7H64.06ZM53.21 40.5H63.8C63.6 38.6 62.4 37.5 60.4 37.5C58.4 37.5 54.8 38.4 53.21 40.5Z"
              fill="#CC77FF"
            />
          </svg>
        </div>
      );
    }

    case 'lightroom': {
      // Adobe Lightroom "Lr" badge
      return (
        <div
          className={`${sizeClass} overflow-hidden shrink-0 shadow-2xs ${className}`}
          title="Adobe Lightroom"
        >
          <svg
            viewBox="0 0 83 80"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M67.5214 0H14.5299C6.50526 0 0 6.50526 0 14.5299V65.4701C0 73.4947 6.50526 80 14.5299 80H67.5214C75.546 80 82.0513 73.4947 82.0513 65.4701V14.5299C82.0513 6.50526 75.546 0 67.5214 0Z"
              fill="#001E36"
            />
            {/* Capital "L" */}
            <path
              d="M19.0 21.0H26.0V49.0H41.5V56.0H19.0V21.0Z"
              fill="#31A8FF"
            />
            {/* Lowercase "r" */}
            <path
              d="M47.2 29.8H54.4V35.2C55.6 33.1 57.3 31.4 59.5 30.3C61.5 29.2 63.8 28.8 66.2 29.0V36.2C64.0 35.8 61.7 36.2 59.8 37.3C57.8 38.6 55.7 40.8 54.4 43.6V56.4H47.2V29.8Z"
              fill="#31A8FF"
            />
          </svg>
        </div>
      );
    }

    case 'blender': {
      // Blender 3D logo
      return (
        <div
          className={`${sizeClass} rounded-lg bg-[#0F172A] border border-white/10 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-2xs ${className}`}
          title="Blender 3D"
        >
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Blender Orange Petals */}
            <path
              d="M50 20 C54 20 57 23 57 27 C57 32 50 42 50 42 C50 42 43 32 43 27 C43 23 46 20 50 20 Z"
              fill="#F97316"
            />
            <path
              d="M26 34 C29 31 33 32 36 35 C40 39 42 50 42 50 C42 50 32 48 28 44 C24 41 23 37 26 34 Z"
              fill="#F97316"
            />
            <path
              d="M74 34 C77 37 76 41 72 44 C68 48 58 50 58 50 C58 50 60 39 64 35 C67 32 71 31 74 34 Z"
              fill="#F97316"
            />
            {/* Outer Ring */}
            <circle cx="50" cy="58" r="22" fill="#EA580C" />
            <circle cx="50" cy="58" r="15" fill="#0F172A" />
            {/* Blue Center Core */}
            <circle cx="50" cy="58" r="9" fill="#2563EB" />
          </svg>
        </div>
      );
    }

    case 'cinema-4d': {
      // Maxon Cinema 4D blue cube
      return (
        <div
          className={`${sizeClass} rounded-lg bg-[#001333] border border-white/10 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-2xs ${className}`}
          title="Maxon Cinema 4D"
        >
          <svg
            viewBox="0 0 48 48"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Isometric 3D Cube */}
            {/* Top Face */}
            <path d="M24 6L40 15L24 24L8 15L24 6Z" fill="#38BDF8" />
            {/* Left Face */}
            <path d="M8 15L24 24V42L8 33V15Z" fill="#0284C7" />
            {/* Right Face */}
            <path d="M24 24L40 15V33L24 42V24Z" fill="#0369A1" />
            {/* Inner dynamic C4D cutout */}
            <path d="M24 16L32 20.5L24 25L16 20.5L24 16Z" fill="#E0F2FE" />
          </svg>
        </div>
      );
    }

    case 'figma': {
      // Figma official 5-color badge
      return (
        <div
          className={`${sizeClass} rounded-lg bg-[#18181B] border border-white/10 flex items-center justify-center p-1.5 shrink-0 overflow-hidden shadow-2xs ${className}`}
          title="Figma"
        >
          <svg
            viewBox="0 0 38 57"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE" />
            <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83" />
            <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262" />
            <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E" />
            <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF" />
          </svg>
        </div>
      );
    }

    case 'procreate': {
      // Procreate colorful brush plume
      return (
        <div
          className={`${sizeClass} rounded-lg bg-[#09090B] border border-white/10 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-2xs ${className}`}
          title="Procreate"
        >
          <svg
            viewBox="0 0 48 48"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 36 C16 32 20 22 28 12 C34 4 40 6 42 8 C44 10 46 16 38 22 C28 30 18 34 14 38 Z"
              fill="url(#procreate_grad)"
            />
            <defs>
              <linearGradient id="procreate_grad" x1="12" y1="36" x2="42" y2="8" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="35%" stopColor="#A855F7" />
                <stop offset="70%" stopColor="#EC4899" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      );
    }

    case 'notion': {
      // Notion icon
      return (
        <div
          className={`${sizeClass} rounded-lg bg-white border border-black/15 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-2xs ${className}`}
          title="Notion"
        >
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="15" y="15" width="70" height="70" rx="14" fill="#000000" />
            <path
              d="M36 32 L58 58 V32 H66 V68 H58 L36 42 V68 H28 V32 H36 Z"
              fill="#FFFFFF"
            />
          </svg>
        </div>
      );
    }

    case 'unreal': {
      // Unreal Engine "U" badge
      return (
        <div
          className={`${sizeClass} rounded-lg bg-[#0E1117] border border-white/10 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-2xs ${className}`}
          title="Unreal Engine"
        >
          <svg
            viewBox="0 0 48 48"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="24" cy="24" r="18" stroke="#FFFFFF" strokeWidth="2.5" />
            <path
              d="M18 16 V26 C18 29.3 20.7 32 24 32 C27.3 32 30 29.3 30 26 V16 H26 V26 C26 27.1 25.1 28 24 28 C22.9 28 22 27.1 22 26 V16 H18 Z"
              fill="#FFFFFF"
            />
          </svg>
        </div>
      );
    }

    case 'avid': {
      // Avid Media Composer badge
      return (
        <div
          className={`${sizeClass} rounded-lg bg-[#491B6D] border border-white/10 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-2xs ${className}`}
          title="Avid Media Composer"
        >
          <svg
            viewBox="0 0 48 48"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M14 34 L24 14 L34 34 H28 L24 25 L20 34 H14 Z" fill="#D8B4FE" />
          </svg>
        </div>
      );
    }

    default: {
      // Sleek fallback creative tool badge with brand accent
      return (
        <div
          className={`${sizeClass} rounded-lg bg-[#0B1120] border border-white/10 flex items-center justify-center p-1 shrink-0 shadow-2xs ${className}`}
          title={name}
        >
          <Laptop className="w-3.5 h-3.5 text-[#2563EB]" />
        </div>
      );
    }
  }
}
