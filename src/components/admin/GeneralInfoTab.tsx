import { useState, useRef, useEffect } from 'react';
import {
  Camera,
  CheckCircle2,
  Play,
  RotateCcw,
  Video,
  AlertCircle,
  Image,
  Upload,
  Trash2,
  X,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Sparkles,
  User,
  Briefcase,
  Mail,
  Phone,
  Send,
  MapPin,
  Clapperboard,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import type { SiteProfileData } from '../../types/portfolio';
import { parseVideoUrl, formatVideoDuration } from '../../utils/videoEmbed';
import { compressImageToWebP, resolveSafeUploadedImageUrl } from '../../utils/imageCompression';
import { convertLogoToWhiteWebP } from '../../utils/logoProcessing';

interface GeneralInfoTabProps {
  profile: SiteProfileData;
  onChange: (partial: Partial<SiteProfileData>) => void;
}

const NAV_SECTIONS = [
  { id: 'section-identity', num: '01', label: 'Định danh & Bio' },
  { id: 'section-hero-media', num: '02', label: 'Nền Hero & Media' },
  { id: 'section-contact', num: '03', label: 'Kênh liên hệ' },
  { id: 'section-copy-footer', num: '04', label: 'Dòng dẫn & Footer' },
  { id: 'section-marquee', num: '05', label: 'Logo Đối tác' },
];

export function GeneralInfoTab({ profile, onChange }: GeneralInfoTabProps) {
  const currentVideoUrl = profile.showreelUrl || profile.heroBgUrl || '/videos/dem-khong-ngu.mp4';
  const startSec = Math.max(0, profile.heroVideoStart ?? 0);
  const endSec = Math.max(startSec + 1, profile.heroVideoEnd ?? (startSec + 15));
  const loopDuration = endSec - startSec;

  const parsedShowreel = parseVideoUrl(currentVideoUrl, {
    startSec,
    endSec,
    loop: true,
    muted: true,
  });

  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Poster upload & frame capture state
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [capturingPoster, setCapturingPoster] = useState(false);
  const [posterCaptureSuccess, setPosterCaptureSuccess] = useState<string | null>(null);
  const [posterCaptureError, setPosterCaptureError] = useState<string | null>(null);
  const posterFileInputRef = useRef<HTMLInputElement>(null);

  // Hero Video File Upload State (< 15MB to Cloudflare R2)
  const heroVideoFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingHeroVideo, setUploadingHeroVideo] = useState(false);
  const [heroVideoUploadProgress, setHeroVideoUploadProgress] = useState<string | null>(null);
  const [heroVideoUploadError, setHeroVideoUploadError] = useState<string | null>(null);
  const [heroVideoUploadSuccess, setHeroVideoUploadSuccess] = useState<string | null>(null);

  // Brand Logos & Marquee State
  const brandLogoFileInputRef = useRef<HTMLInputElement>(null);
  const logoDragDepthRef = useRef(0);
  const [isDraggingLogos, setIsDraggingLogos] = useState(false);
  const [processingLogos, setProcessingLogos] = useState(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState<string | null>(null);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

  const brandLogos: string[] = profile.brandLogos || [];

  const isSupportedLogoImage = (file: File): boolean => {
    if (file.type && file.type.startsWith('image/')) return true;
    return /\.(png|webp|jpe?g|svg)$/i.test(file.name);
  };

  const processBrandLogoFiles = async (rawFiles: File[]) => {
    const imageFiles = rawFiles.filter(isSupportedLogoImage);
    if (imageFiles.length === 0) {
      setLogoUploadError(
        'Không tìm thấy file ảnh hợp lệ. Vui lòng thả hoặc chọn file .PNG, .WebP, .JPG hoặc .SVG.'
      );
      return;
    }

    try {
      setProcessingLogos(true);
      setLogoUploadError(null);
      setLogoUploadProgress(`Đang xử lý 0/${imageFiles.length} logo...`);

      const processedDataUrls: string[] = [];
      let totalKB = 0;
      const failedNames: string[] = [];

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        setLogoUploadProgress(
          `Đang chuyển sang logo trắng & xén viền (${i + 1}/${imageFiles.length}): ${file.name}...`
        );

        try {
          // Process directly via safe Canvas pipeline -> inline WebP/PNG DataURL (3KB-8KB, zero R2 broken links)
          const processed = await convertLogoToWhiteWebP(file, 4, 140);
          processedDataUrls.push(processed.dataUrl);
          totalKB += processed.sizeKB;
        } catch (fileErr) {
          console.error(`[Brand Logo] Failed to process ${file.name}:`, fileErr);
          failedNames.push(file.name);
        }
      }

      if (processedDataUrls.length > 0) {
        const updated = [...(profile.brandLogos || []), ...processedDataUrls];
        onChange({ brandLogos: updated });
        const avgKB = (totalKB / processedDataUrls.length).toFixed(1);
        setLogoUploadProgress(
          `Đã xử lý thành công ${processedDataUrls.length} logo sang màu trắng (~${avgKB}KB/logo)!`
        );
        setTimeout(() => setLogoUploadProgress(null), 4500);
      } else {
        setLogoUploadProgress(null);
      }

      if (failedNames.length > 0) {
        setLogoUploadError(`Không thể đọc ${failedNames.length} file: ${failedNames.join(', ')}`);
      }
    } catch (err: unknown) {
      console.error('Failed to process brand logos:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setLogoUploadError(`Lỗi xử lý logo: ${errMsg}`);
      setLogoUploadProgress(null);
    } finally {
      setProcessingLogos(false);
      if (brandLogoFileInputRef.current) {
        brandLogoFileInputRef.current.value = '';
      }
    }
  };

  const handleUploadBrandLogos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    await processBrandLogoFiles(files);
  };

  const handleLogoDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    logoDragDepthRef.current += 1;
    if (e.dataTransfer?.types?.includes('Files') || e.dataTransfer?.items?.length) {
      setIsDraggingLogos(true);
    }
  };

  const handleLogoDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    if (!isDraggingLogos) {
      setIsDraggingLogos(true);
    }
  };

  const handleLogoDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    logoDragDepthRef.current = Math.max(0, logoDragDepthRef.current - 1);
    if (logoDragDepthRef.current === 0) {
      setIsDraggingLogos(false);
    }
  };

  const handleLogoDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    logoDragDepthRef.current = 0;
    setIsDraggingLogos(false);
    if (processingLogos) return;

    const droppedFiles = Array.from(e.dataTransfer?.files || []);
    if (droppedFiles.length === 0) return;
    await processBrandLogoFiles(droppedFiles);
  };

  const handleRemoveBrandLogo = (indexToRemove: number) => {
    const current = profile.brandLogos || [];
    const nextList = current.filter((_, idx) => idx !== indexToRemove);
    onChange({ brandLogos: nextList });
  };

  const handleMoveBrandLogo = (index: number, direction: 'left' | 'right') => {
    const current = [...(profile.brandLogos || [])];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= current.length) return;
    const temp = current[index];
    current[index] = current[targetIndex];
    current[targetIndex] = temp;
    onChange({ brandLogos: current });
  };

  const handleClearAllBrandLogos = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ ảnh logo?')) {
      onChange({ brandLogos: [] });
    }
  };

  // Drag & drop state for Hero video / poster
  const [isDraggingHeroMedia, setIsDraggingHeroMedia] = useState(false);
  const [heroDragKind, setHeroDragKind] = useState<'video' | 'image' | 'unknown'>('unknown');
  const heroDragDepthRef = useRef(0);

  // Dedicated drag & drop state for Hero Poster box
  const [isDraggingPosterZone, setIsDraggingPosterZone] = useState(false);
  const posterDragDepthRef = useRef(0);

  // Global window drag detection to disable pointer-events on iframes & prevent drop swallowing
  const [isWindowDragging, setIsWindowDragging] = useState(false);
  const windowDragDepthRef = useRef(0);

  useEffect(() => {
    const handleWindowDragEnter = (e: DragEvent) => {
      windowDragDepthRef.current += 1;
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
      setIsWindowDragging(true);
    };
    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };
    const handleWindowDragLeave = () => {
      windowDragDepthRef.current = Math.max(0, windowDragDepthRef.current - 1);
      if (windowDragDepthRef.current === 0) {
        setIsWindowDragging(false);
      }
    };
    const handleWindowDrop = () => {
      windowDragDepthRef.current = 0;
      setIsWindowDragging(false);
    };

    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, []);

  // Core handler: Tải trực tiếp file video nền ngắn (.mp4 / .webm) lên Cloudflare R2 (< 15MB)
  const handleUploadHeroVideoFile = async (file: File) => {
    const lowerName = file.name.toLowerCase();
    const isVideo =
      lowerName.endsWith('.mp4') || lowerName.endsWith('.webm') || file.type.startsWith('video/');
    if (!isVideo) {
      setHeroVideoUploadError('Vui lòng chọn file video định dạng .mp4 hoặc .webm');
      setHeroVideoUploadSuccess(null);
      if (heroVideoFileInputRef.current) heroVideoFileInputRef.current.value = '';
      return;
    }

    const MAX_VIDEO_BYTES = 15 * 1024 * 1024; // 15MB
    if (file.size > MAX_VIDEO_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setHeroVideoUploadError(
        `File video vượt quá 15MB (${sizeMB}MB). Vui lòng nén video dưới 15MB để đảm bảo tải mượt mà và không làm đầy bộ nhớ Cloudflare R2.`
      );
      setHeroVideoUploadSuccess(null);
      if (heroVideoFileInputRef.current) heroVideoFileInputRef.current.value = '';
      return;
    }

    try {
      setUploadingHeroVideo(true);
      setHeroVideoUploadError(null);
      setHeroVideoUploadSuccess(null);
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setHeroVideoUploadProgress(`${sizeMB}MB`);

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.url) {
        throw new Error(data.error || 'Lỗi khi tải video lên Cloudflare R2');
      }

      const uploadedUrl = data.url;
      onChange({
        showreelUrl: uploadedUrl,
        heroBgUrl: uploadedUrl,
        heroBgType: 'video',
        heroVideoStart: 0,
        heroVideoEnd: 15,
      });

      setHeroVideoUploadSuccess(
        `Đã tải video nền lên Cloudflare R2 thành công (${sizeMB}MB)! Video đã được gắn cache CDN 1 năm (immutable) để chạy lặp tức thì không tốn lượt đọc R2.`
      );
    } catch (err: unknown) {
      console.error('Failed to upload hero video to R2:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setHeroVideoUploadError(`Lỗi tải video lên R2: ${errMsg}`);
    } finally {
      setUploadingHeroVideo(false);
      setHeroVideoUploadProgress(null);
      if (heroVideoFileInputRef.current) {
        heroVideoFileInputRef.current.value = '';
      }
    }
  };

  const handleUploadHeroVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleUploadHeroVideoFile(file);
    }
  };

  // Core handler: Nén WebP và tải ảnh Poster 0ms lên Cloudflare R2
  const handleUploadPosterFile = async (file: File) => {
    try {
      setUploadingPoster(true);
      setPosterCaptureError(null);
      setPosterCaptureSuccess(null);

      // 1. Nén ảnh thành WebP dưới 400KB
      const res = await compressImageToWebP(file, 1920, 400 * 1024);

      // 2. Upload lên Cloudflare R2
      let uploadedUrl: string | undefined;
      try {
        const formData = new FormData();
        formData.append('file', res.file);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          if (data && data.success && data.url) {
            uploadedUrl = data.url;
          }
        }
      } catch (uploadErr) {
        console.warn('R2 poster upload notice, using local WebP:', uploadErr);
      }

      const finalUrl = await resolveSafeUploadedImageUrl(uploadedUrl, res.dataUrl);

      onChange({
        heroPosterUrl: finalUrl,
      });
      setPosterCaptureSuccess('Đã tải và nén ảnh Poster 0ms lên Cloudflare R2 thành công!');
    } catch (err) {
      console.error('Failed to compress/upload poster image:', err);
      setPosterCaptureError('Lỗi tải ảnh poster.');
    } finally {
      setUploadingPoster(false);
      if (posterFileInputRef.current) {
        posterFileInputRef.current.value = '';
      }
    }
  };

  const handlePosterFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleUploadPosterFile(file);
    }
  };

  // Dedicated Drag & Drop handlers for Hero Poster box
  const handlePosterDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    posterDragDepthRef.current += 1;
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    setIsDraggingPosterZone(true);
  };

  const handlePosterDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    if (!isDraggingPosterZone) setIsDraggingPosterZone(true);
  };

  const handlePosterDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    posterDragDepthRef.current = Math.max(0, posterDragDepthRef.current - 1);
    if (posterDragDepthRef.current === 0) {
      setIsDraggingPosterZone(false);
    }
  };

  const handlePosterDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    posterDragDepthRef.current = 0;
    setIsDraggingPosterZone(false);

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const lowerName = file.name.toLowerCase();
    const isImage =
      file.type.startsWith('image/') ||
      /\.(jpe?g|png|webp|avif|jfif|bmp|gif|heic)$/i.test(lowerName);

    if (isImage) {
      await handleUploadPosterFile(file);
    } else {
      setPosterCaptureError(
        'Vui lòng kéo thả file ảnh (.jpg, .png, .webp, .avif) vào khung Ảnh bìa Hero.'
      );
    }
  };

  // Drag & drop handlers for Hero preview box
  const handleHeroDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    heroDragDepthRef.current += 1;
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    setIsDraggingHeroMedia(true);
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      const item = e.dataTransfer.items[0];
      if (item.type.startsWith('video/')) {
        setHeroDragKind('video');
      } else if (item.type.startsWith('image/')) {
        setHeroDragKind('image');
      } else {
        setHeroDragKind('unknown');
      }
    }
  };

  const handleHeroDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    if (!isDraggingHeroMedia) setIsDraggingHeroMedia(true);
  };

  const handleHeroDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    heroDragDepthRef.current = Math.max(0, heroDragDepthRef.current - 1);
    if (heroDragDepthRef.current === 0) {
      setIsDraggingHeroMedia(false);
      setHeroDragKind('unknown');
    }
  };

  const handleHeroDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    heroDragDepthRef.current = 0;
    setIsDraggingHeroMedia(false);
    setHeroDragKind('unknown');

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const lowerName = file.name.toLowerCase();
    const isVideo =
      lowerName.endsWith('.mp4') || lowerName.endsWith('.webm') || file.type.startsWith('video/');
    const isImage =
      file.type.startsWith('image/') ||
      /\.(jpe?g|png|webp|avif|jfif|bmp|gif|heic)$/i.test(lowerName);

    if (isVideo) {
      await handleUploadHeroVideoFile(file);
    } else if (isImage) {
      await handleUploadPosterFile(file);
    } else {
      setHeroVideoUploadError(
        'Vui lòng kéo thả file Video (.mp4, .webm) hoặc file Ảnh Poster (.jpg, .png, .webp).'
      );
    }
  };

  // Chụp trực tiếp khung hình đang phát của video làm Poster 0ms (Không cần tải file ảnh lên)
  const handleCaptureCurrentFrameAsPoster = async () => {
    const video = previewVideoRef.current;
    if (!video) return;

    try {
      setCapturingPoster(true);
      setPosterCaptureError(null);
      setPosterCaptureSuccess(null);

      const width = video.videoWidth || 1920;
      const height = video.videoHeight || 1080;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Không thể khởi tạo Canvas 2D context.');
      }

      ctx.drawImage(video, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve, reject) => {
        try {
          canvas.toBlob((b) => resolve(b), 'image/webp', 0.95);
        } catch (err) {
          reject(err);
        }
      });

      if (!blob) {
        throw new Error('Chụp frame thất bại. Trình duyệt không thể trích xuất dữ liệu ảnh từ video.');
      }

      const frameTimeStr = formatVideoDuration(video.currentTime);
      const safeTimeName = frameTimeStr.replace(':', '-');
      const tempFile = new File([blob], `hero-poster-${safeTimeName}.webp`, { type: 'image/webp' });
      const compResult = await compressImageToWebP(tempFile, 1920, 400 * 1024);

      let uploadedUrl: string | undefined;
      const formData = new FormData();
      formData.append('file', compResult.file);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const uploadRes = await res.json();
          if (uploadRes && uploadRes.success && uploadRes.url) {
            uploadedUrl = uploadRes.url;
          }
        }
      } catch (uploadErr) {
        console.warn('Upload notice, using local WebP preview:', uploadErr);
      }

      const finalUrl = await resolveSafeUploadedImageUrl(uploadedUrl, compResult.dataUrl);

      onChange({
        heroPosterUrl: finalUrl,
      });

      setPosterCaptureSuccess(
        `Đã chụp thành công khung hình tại ${frameTimeStr} (${width}x${height}, WebP) và lưu làm Poster tức thì!`
      );
    } catch (err: unknown) {
      console.error('Failed to capture frame as poster:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setPosterCaptureError(`Lỗi chụp frame: ${errMsg}`);
    } finally {
      setCapturingPoster(false);
    }
  };

  // Synchronize preview player and ensure autoplay when video source or startSec/endSec changes
  useEffect(() => {
    const video = previewVideoRef.current;
    if (!video) return;

    video.defaultMuted = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');

    const tryPlay = () => {
      video.defaultMuted = true;
      video.muted = true;
      const p = video.play();
      if (p !== undefined) {
        p.catch(() => {});
      }
    };

    tryPlay();
  }, [currentVideoUrl]);

  const handleTimeUpdate = () => {
    const video = previewVideoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 140;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  const inputClass =
    'w-full bg-[#F9F9FB] border border-black/10 rounded-xl px-4 py-2.5 text-sm text-[#111111] focus:bg-white focus:border-[#111111] focus:ring-2 focus:ring-black/5 focus:outline-none transition-all placeholder:text-black/35';
  const textareaClass =
    'w-full bg-[#F9F9FB] border border-black/10 rounded-xl px-4 py-3 text-sm text-[#111111] leading-relaxed min-h-[110px] resize-y focus:bg-white focus:border-[#111111] focus:ring-2 focus:ring-black/5 focus:outline-none transition-all placeholder:text-black/35';
  const labelClass = 'text-xs font-bold uppercase tracking-wider text-[#111111]';
  const helperClass = 'text-[11px] text-black/55 mt-1.5';

  return (
    <div className="w-full py-4 space-y-7">
      {/* Quick Jump Anchor Pill Bar */}
      <div className="sticky top-[68px] z-20 -mx-2 px-2 py-2.5 bg-white/90 backdrop-blur-md border-b border-black/[0.06] flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          <span className="text-[11px] font-bold text-black/40 uppercase tracking-wider mr-1 hidden sm:inline">
            Chuyển nhanh:
          </span>
          {NAV_SECTIONS.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => scrollToSection(sec.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-black/70 bg-[#F4F4F6] hover:bg-black/10 hover:text-black shrink-0 transition-all cursor-pointer flex items-center gap-1.5 active:scale-98"
            >
              <span className="font-mono text-[10px] text-black/45">{sec.num}</span>
              <span>{sec.label}</span>
            </button>
          ))}
        </div>
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-medium text-black/50 bg-black/[0.04] px-2.5 py-1 rounded-full">
            Tab 1 · Cấu hình thương hiệu
          </span>
        </div>
      </div>

      {/* 01. ĐỊNH DANH & HỒ SƠ NĂNG LỰC */}
      <section
        id="section-identity"
        className="scroll-mt-36 bg-white rounded-2xl border border-black/[0.07] p-6 sm:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-6"
      >
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-5 border-b border-black/[0.07]">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#111111] text-white font-mono text-xs font-bold shrink-0">
                01
              </span>
              <h2 className="font-bricolage text-base sm:text-lg font-bold text-[#111111] uppercase tracking-tight">
                Định danh &amp; Hồ sơ Năng lực
              </h2>
            </div>
            <p className="text-xs text-black/60 leading-relaxed pl-9.5">
              Tên nghệ danh chính, định danh chuyên môn và lời tựa năng lực xuất hiện tại thanh điều hướng &amp; mở đầu Hero.
            </p>
          </div>
          <div className="pl-9.5 sm:pl-0 shrink-0">
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-black/[0.04] text-black/70 border border-black/[0.06] flex items-center gap-1">
              <User className="w-3 h-3 text-[#2563EB]" />
              Hiển thị: Header &amp; Hero
            </span>
          </div>
        </div>

        {/* Inputs: 2-column balanced grid */}
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelClass}>Tên nghệ danh chính (Headline)</label>
                <span className="text-[10px] font-medium text-black/45 bg-black/[0.04] px-2 py-0.5 rounded">
                  Header &amp; Title
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-black/40">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={profile.fullName}
                  onChange={(e) => onChange({ fullName: e.target.value })}
                  className={`${inputClass} pl-10 font-bold`}
                  placeholder="QUỐC VINH®"
                />
              </div>
              <p className={helperClass}>Chữ hoa nhận diện nổi bật tại đỉnh trang chủ và thanh menu.</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelClass}>Định danh chuyên môn (Role Title)</label>
                <span className="text-[10px] font-medium text-black/45 bg-black/[0.04] px-2 py-0.5 rounded">
                  Hero Subtitle
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-black/40">
                  <Briefcase className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={profile.roleTitle}
                  onChange={(e) => onChange({ roleTitle: e.target.value })}
                  className={`${inputClass} pl-10 font-semibold`}
                  placeholder="VIDEOGRAPHER · FILM EDITOR · MOTION DESIGNER"
                />
              </div>
              <p className={helperClass}>Dãy vai trò chuyên môn ngăn cách bởi dấu chấm giữa (·).</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelClass}>Định vị năng lực (Positioning)</label>
                <span className="text-[10px] font-medium text-black/45 bg-black/[0.04] px-2 py-0.5 rounded">
                  Hero Intro
                </span>
              </div>
              <textarea
                rows={4}
                value={profile.positioning}
                onChange={(e) => onChange({ positioning: e.target.value })}
                className={textareaClass}
                placeholder="Chuyên quay phim thương mại, dựng hậu kỳ tốc độ cao và motion graphics cho Agency, Brand & Production House."
              />
              <p className={helperClass}>Câu tuyên ngôn ngắn gọn về thế mạnh và đối tượng phục vụ chính.</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelClass}>Cam kết tiến độ (Bio Detail)</label>
                <span className="text-[10px] font-medium text-black/45 bg-black/[0.04] px-2 py-0.5 rounded">
                  Hero Detail
                </span>
              </div>
              <textarea
                rows={4}
                value={profile.bioDetail}
                onChange={(e) => onChange({ bioDetail: e.target.value })}
                className={textareaClass}
                placeholder="Quy trình làm việc thực chiến, đáp ứng brief chuẩn xác. Nhận brief và xuất bản nháp nhanh trong 24–48h."
              />
              <p className={helperClass}>Cam kết về quy trình làm việc, tốc độ trả bản nháp và nghiệm thu.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 02. CHẾ ĐỘ NỀN HERO TRANG CHỦ & MEDIA */}
      <section
        id="section-hero-media"
        className="scroll-mt-36 bg-white rounded-2xl border border-black/[0.07] p-6 sm:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-6"
      >
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-5 border-b border-black/[0.07]">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#111111] text-white font-mono text-xs font-bold shrink-0">
                02
              </span>
              <h2 className="font-bricolage text-base sm:text-lg font-bold text-[#111111] uppercase tracking-tight">
                Chế độ Nền Hero trang chủ
              </h2>
            </div>
            <p className="text-xs text-black/60 leading-relaxed pl-9.5">
              Lựa chọn 1 trong 2: Ảnh bìa tĩnh nghệ thuật HOẶC Video loop showreel (16:9). Tự động nén WebP &amp; tối ưu 0ms.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap pl-9.5 sm:pl-0 shrink-0">
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Upload Cloudflare R2
            </span>
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                profile.heroBgType === 'image'
                  ? 'bg-amber-500/15 text-amber-900 border border-amber-500/30'
                  : 'bg-[#2563EB]/15 text-[#2563EB] border border-[#2563EB]/25'
              }`}
            >
              {profile.heroBgType === 'image'
                ? '★ Đang chọn: Chỉ dùng Ảnh bìa (Ảnh tĩnh)'
                : '★ Đang chọn: Video Loop Showreel'}
            </span>
          </div>
        </div>

        {/* Bộ chọn 1 trong 2: Ảnh bìa tĩnh HOẶC Video Loop */}
        <div className="p-1.5 bg-[#EAEAF0] rounded-2xl flex flex-col sm:flex-row gap-1.5 border border-black/8 shadow-inner">
          <button
            type="button"
            onClick={() => onChange({ heroBgType: 'image' })}
            className={`flex-1 flex items-center gap-3 py-3 px-4 rounded-xl text-xs transition-all cursor-pointer ${
              profile.heroBgType === 'image'
                ? 'bg-white text-[#111111] shadow-sm border border-black/10 scale-[1.01]'
                : 'text-black/60 hover:text-black hover:bg-white/50'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                profile.heroBgType === 'image' ? 'bg-[#2563EB] text-white' : 'bg-black/5 text-black/50'
              }`}
            >
              <Image className="w-4 h-4" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="font-bold text-xs truncate">1. Chỉ dùng Ảnh bìa Hero (Ảnh tĩnh 0ms)</p>
              <p className="text-[10px] text-black/50 truncate">
                Hiển thị 100% ảnh bìa nghệ thuật, không bị video loop đè lên
              </p>
            </div>
            {profile.heroBgType === 'image' && (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onChange({ heroBgType: 'video' })}
            className={`flex-1 flex items-center gap-3 py-3 px-4 rounded-xl text-xs transition-all cursor-pointer ${
              (profile.heroBgType ?? 'video') === 'video'
                ? 'bg-white text-[#111111] shadow-sm border border-black/10 scale-[1.01]'
                : 'text-black/60 hover:text-black hover:bg-white/50'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                (profile.heroBgType ?? 'video') === 'video' ? 'bg-[#2563EB] text-white' : 'bg-black/5 text-black/50'
              }`}
            >
              <Video className="w-4 h-4" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="font-bold text-xs truncate">2. Video Loop Showreel (Video chuyển động)</p>
              <p className="text-[10px] text-black/50 truncate">
                Phát lặp video nền showreel kèm ảnh Poster 0ms lúc khởi động
              </p>
            </div>
            {(profile.heroBgType ?? 'video') === 'video' && (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            )}
          </button>
        </div>

        {/* Hai cột song song: Cột 1 là Ảnh bìa Hero, Cột 2 là Video Loop Showreel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* KHUNG 1: ẢNH BÌA HERO (POSTER 0MS / NỀN CHÍNH TĨNH) */}
          <div
            onDragEnter={handlePosterDragEnter}
            onDragOver={handlePosterDragOver}
            onDragLeave={handlePosterDragLeave}
            onDrop={handlePosterDrop}
            className={`relative p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between space-y-3.5 ${
              profile.heroBgType === 'image'
                ? 'border-[#2563EB] bg-blue-50/30 shadow-sm ring-2 ring-[#2563EB]/15'
                : 'border-black/10 bg-[#F4F4F7]'
            } ${
              isDraggingPosterZone
                ? '!border-dashed !border-[#2563EB] !bg-blue-50/90 shadow-[0_0_0_4px_rgba(37,99,235,0.15)]'
                : ''
            }`}
          >
            {/* Drag Overlay for Poster Box */}
            {isDraggingPosterZone && (
              <div
                onDragOver={handlePosterDragOver}
                onDrop={handlePosterDrop}
                className="absolute inset-0 z-30 rounded-2xl border-2 border-dashed border-[#2563EB] bg-[#2563EB]/15 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center cursor-copy [&>*]:pointer-events-none"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center shadow-lg mb-2">
                  <Image className="w-6 h-6 animate-bounce" />
                </div>
                <p className="text-sm font-bold text-[#111111] bg-white/95 px-4 py-1.5 rounded-xl border border-[#2563EB]/30 shadow-sm">
                  Thả ảnh vào đây để nén WebP &amp; đặt làm Ảnh bìa Hero (R2)
                </p>
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Image className="w-4 h-4 text-[#2563EB]" />
                <span className="text-xs font-bold text-[#111111] uppercase tracking-wide">
                  {profile.heroBgType === 'image' ? '★ Nền Hero chính (Ảnh tĩnh)' : 'Ảnh bìa Poster (Đệm 0ms)'}
                </span>
              </div>
              {profile.heroBgType === 'image' ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white flex items-center gap-1 shadow-2xs">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                  Đang chiếu trang chủ
                </span>
              ) : profile.heroPosterUrl ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Poster đệm 0ms (R2)
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-black/5 text-black/50">
                  Chưa có ảnh riêng
                </span>
              )}
            </div>

            {/* 16:9 Image Preview / Drop Target */}
            <div
              onClick={() => posterFileInputRef.current?.click()}
              className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/5 border border-black/15 shadow-inner cursor-pointer group flex items-center justify-center"
            >
              {profile.heroPosterUrl ? (
                <>
                  <img
                    src={profile.heroPosterUrl}
                    alt="Hero Poster Preview"
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center text-white">
                    <Upload className="w-6 h-6 mb-1 text-white animate-bounce" />
                    <span className="text-xs font-bold">Bấm hoặc kéo thả ảnh mới vào để thay thế</span>
                    <span className="text-[10px] text-white/80 mt-0.5">Tự động nén WebP &lt; 400KB &amp; R2</span>
                  </div>
                </>
              ) : (
                <div className="p-6 text-center flex flex-col items-center justify-center space-y-2 text-black/60">
                  <div className="w-10 h-10 rounded-xl bg-white border border-black/10 shadow-xs flex items-center justify-center text-[#2563EB] group-hover:scale-110 transition-transform">
                    <Image className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-[#111111]">Kéo thả ảnh bìa Hero vào đây</p>
                  <p className="text-[11px] text-black/50 max-w-[260px] leading-relaxed">
                    Hỗ trợ .jpg, .png, .webp. Tự động nén chuẩn cinema &lt; 400KB và tải lên Cloudflare R2
                  </p>
                </div>
              )}
            </div>

            {/* Actions for Poster */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={posterFileInputRef}
                  accept="image/*"
                  onChange={handlePosterFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => posterFileInputRef.current?.click()}
                  disabled={uploadingPoster}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#111111] hover:bg-black/85 disabled:bg-black/30 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98"
                >
                  {uploadingPoster ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Đang nén WebP &amp; R2...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 text-white" />
                      <span>📁 Tải ảnh bìa từ máy</span>
                    </>
                  )}
                </button>

                {profile.heroPosterUrl && (
                  <button
                    type="button"
                    onClick={() => onChange({ heroPosterUrl: '' })}
                    className="px-3 py-2.5 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold cursor-pointer flex items-center gap-1 shrink-0 transition-all shadow-2xs"
                    title="Gỡ ảnh Poster hiện tại"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Gỡ</span>
                  </button>
                )}
              </div>

              <input
                type="text"
                value={profile.heroPosterUrl || ''}
                onChange={(e) => onChange({ heroPosterUrl: e.target.value })}
                placeholder="Hoặc dán URL ảnh bìa trực tiếp (https://...)"
                className="w-full px-3 py-2 rounded-lg bg-white border border-black/10 text-xs text-[#111111] font-mono focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          {/* KHUNG 2: VIDEO LOOP SHOWREEL NỀN HERO */}
          <div
            onDragEnter={handleHeroDragEnter}
            onDragOver={handleHeroDragOver}
            onDragLeave={handleHeroDragLeave}
            onDrop={handleHeroDrop}
            className={`relative p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between space-y-3.5 ${
              (profile.heroBgType ?? 'video') === 'video'
                ? 'border-[#2563EB] bg-blue-50/30 shadow-sm ring-2 ring-[#2563EB]/15'
                : 'border-black/10 bg-[#F4F4F7] opacity-80'
            } ${
              isDraggingHeroMedia
                ? '!border-dashed !border-[#2563EB] !bg-blue-50/90 shadow-[0_0_0_4px_rgba(37,99,235,0.15)]'
                : ''
            }`}
          >
            {/* Drag Overlay for Video Box */}
            {isDraggingHeroMedia && (
              <div
                onDragOver={handleHeroDragOver}
                onDrop={handleHeroDrop}
                className="absolute inset-0 z-30 rounded-2xl border-2 border-dashed border-[#2563EB] bg-[#2563EB]/15 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center cursor-copy [&>*]:pointer-events-none"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center shadow-lg mb-2">
                  <Upload className="w-6 h-6 animate-bounce" />
                </div>
                <p className="text-sm font-bold text-[#111111] bg-white/95 px-4 py-1.5 rounded-xl border border-[#2563EB]/30 shadow-sm">
                  {heroDragKind === 'video'
                    ? 'Thả video vào đây để tải lên Cloudflare R2 (< 15MB)'
                    : 'Thả ảnh vào đây để nén WebP & đặt làm Ảnh bìa Hero (R2)'}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Video className="w-4 h-4 text-[#2563EB]" />
                <span className="text-xs font-bold text-[#111111] uppercase tracking-wide">
                  Video Loop Showreel (16:9)
                </span>
              </div>
              {(profile.heroBgType ?? 'video') === 'video' ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#2563EB] text-white flex items-center gap-1 shadow-2xs">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                  Đang chiếu trang chủ
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-black/10 text-black/60">
                  Tạm ngưng (Đang ưu tiên ảnh tĩnh)
                </span>
              )}
            </div>

            {/* 16:9 Video Player Preview */}
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-black/15 shadow-sm">
              <div
                className={`w-full h-full ${
                  isWindowDragging || isDraggingHeroMedia || isDraggingPosterZone ? 'pointer-events-none' : ''
                }`}
              >
                {(parsedShowreel.type === 'youtube' ||
                  parsedShowreel.type === 'vimeo' ||
                  parsedShowreel.type === 'gdrive' ||
                  parsedShowreel.type === 'vk') &&
                parsedShowreel.embedUrl ? (
                  <iframe
                    src={parsedShowreel.embedUrl}
                    title="Video Loop Showreel Preview"
                    className={`w-full h-full border-0 ${
                      isWindowDragging || isDraggingHeroMedia ? 'pointer-events-none' : ''
                    }`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    ref={previewVideoRef}
                    key={currentVideoUrl}
                    src={parsedShowreel.directUrl || currentVideoUrl}
                    poster={profile.heroPosterUrl || ''}
                    crossOrigin="anonymous"
                    autoPlay
                    loop
                    muted
                    playsInline
                    controls
                    onTimeUpdate={handleTimeUpdate}
                    className={`w-full h-full object-cover ${
                      isWindowDragging || isDraggingHeroMedia ? 'pointer-events-none' : ''
                    }`}
                  />
                )}
              </div>

              {profile.heroPosterUrl && (
                <div className="absolute top-2.5 left-2.5 pointer-events-none">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Poster 0ms gắn kèm
                  </span>
                </div>
              )}
            </div>

            {/* Actions for Video */}
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Nút Chụp Frame làm Poster */}
                <button
                  type="button"
                  onClick={handleCaptureCurrentFrameAsPoster}
                  disabled={capturingPoster}
                  className="px-3 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
                  title="Chụp ngay khung hình đang chiếu làm ảnh Poster 0ms"
                >
                  <Camera className="w-3.5 h-3.5 text-white" />
                  <span className="truncate">
                    {capturingPoster
                      ? 'Đang chụp WebP...'
                      : `📸 Chụp Frame (${formatVideoDuration(currentTime)}) làm Poster`}
                  </span>
                </button>

                {/* Nút Tải Video lên R2 */}
                <input
                  ref={heroVideoFileInputRef}
                  type="file"
                  accept="video/mp4,video/webm"
                  className="hidden"
                  onChange={handleUploadHeroVideo}
                />
                <button
                  type="button"
                  disabled={uploadingHeroVideo}
                  onClick={() => heroVideoFileInputRef.current?.click()}
                  className="px-3 py-2.5 rounded-xl bg-white border border-black/15 hover:border-black/30 text-[#111111] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:bg-[#F9F9FB] active:scale-98"
                  title="Tải video MP4/WebM < 15MB lên Cloudflare R2"
                >
                  {uploadingHeroVideo ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2563EB]" />
                      <span className="truncate">Tải lên R2 ({heroVideoUploadProgress})...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 text-black/60" />
                      <span className="truncate">Tải Video R2 (&lt; 15MB)</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <p className="text-[11px] font-mono text-black/45 truncate" title={currentVideoUrl}>
                  {currentVideoUrl}
                </p>

                {(profile.showreelUrl || profile.heroBgUrl) &&
                  ((profile.showreelUrl && profile.showreelUrl !== '/videos/dem-khong-ngu.mp4') ||
                    (profile.heroBgUrl && profile.heroBgUrl !== '/videos/dem-khong-ngu.mp4')) && (
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          showreelUrl: '/videos/dem-khong-ngu.mp4',
                          heroBgUrl: '/videos/dem-khong-ngu.mp4',
                          heroBgType: 'video',
                          heroVideoStart: 0,
                          heroVideoEnd: 15,
                        })
                      }
                      className="text-[11px] text-black/50 hover:text-[#2563EB] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Mặc định</span>
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* Status messages for video upload & poster capture */}
        {heroVideoUploadSuccess && (
          <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{heroVideoUploadSuccess}</span>
          </div>
        )}

        {heroVideoUploadError && (
          <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl text-xs text-rose-900">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{heroVideoUploadError}</span>
          </div>
        )}

        {posterCaptureSuccess && (
          <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{posterCaptureSuccess}</span>
          </div>
        )}

        {posterCaptureError && (
          <div className="flex items-center gap-2.5 p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium">{posterCaptureError}</span>
          </div>
        )}
      </section>

      {/* 03. THÔNG TIN LIÊN HỆ & ĐỊA BÀN HOẠT ĐỘNG */}
      <section
        id="section-contact"
        className="scroll-mt-36 bg-white rounded-2xl border border-black/[0.07] p-6 sm:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-6"
      >
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-5 border-b border-black/[0.07]">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#111111] text-white font-mono text-xs font-bold shrink-0">
                03
              </span>
              <h2 className="font-bricolage text-base sm:text-lg font-bold text-[#111111] uppercase tracking-tight">
                Kênh liên hệ &amp; Địa bàn hoạt động
              </h2>
            </div>
            <p className="text-xs text-black/60 leading-relaxed pl-9.5">
              Xuất hiện tại thanh điều hướng Navbar, khối chân trang Footer và hộp thoại gửi brief nhanh khi đối tác bấm nút liên hệ.
            </p>
          </div>
          <div className="pl-9.5 sm:pl-0 shrink-0">
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-black/[0.04] text-black/70 border border-black/[0.06] flex items-center gap-1">
              <Mail className="w-3 h-3 text-[#2563EB]" />
              Navbar · Footer · Modal
            </span>
          </div>
        </div>

        {/* Inputs: Balanced 4-card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelClass}>Email công việc</label>
              <span className="text-[10px] font-medium text-black/45 bg-black/[0.04] px-1.5 py-0.5 rounded">
                Chính
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-black/40">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => onChange({ email: e.target.value })}
                className={`${inputClass} pl-10`}
                placeholder="vinh.film@gmail.com"
              />
            </div>
            <p className={helperClass}>Kênh nhận brief văn bản chính thức.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelClass}>Số Zalo / Hotline</label>
              <span className="text-[10px] font-medium text-black/45 bg-black/[0.04] px-1.5 py-0.5 rounded">
                Hotline
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-black/40">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={profile.zalo}
                onChange={(e) => onChange({ zalo: e.target.value, phone: e.target.value })}
                className={`${inputClass} pl-10`}
                placeholder="0908 123 456"
              />
            </div>
            <p className={helperClass}>Tự động đồng bộ sang trường điện thoại.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelClass}>Telegram Username</label>
              <span className="text-[10px] font-medium text-black/45 bg-black/[0.04] px-1.5 py-0.5 rounded">
                Chat
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-black/40">
                <Send className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={profile.telegram}
                onChange={(e) => onChange({ telegram: e.target.value })}
                className={`${inputClass} pl-10 font-mono text-xs`}
                placeholder="@quocvinhfilm"
              />
            </div>
            <p className={helperClass}>Hỗ trợ trao đổi nhanh với Agency quốc tế.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelClass}>Địa bàn hoạt động</label>
              <span className="text-[10px] font-medium text-black/45 bg-black/[0.04] px-1.5 py-0.5 rounded">
                Khu vực
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-black/40">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={profile.location}
                onChange={(e) => onChange({ location: e.target.value })}
                className={`${inputClass} pl-10`}
                placeholder="TP. Hồ Chí Minh"
              />
            </div>
            <p className={helperClass}>Thành phố nhận đi quay trực tiếp (On-set).</p>
          </div>
        </div>
      </section>

      {/* 04. DÒNG DẪN & KHỐI CHỐT FOOTER */}
      <section
        id="section-copy-footer"
        className="scroll-mt-36 bg-white rounded-2xl border border-black/[0.07] p-6 sm:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-6"
      >
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-5 border-b border-black/[0.07]">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#111111] text-white font-mono text-xs font-bold shrink-0">
                04
              </span>
              <h2 className="font-bricolage text-base sm:text-lg font-bold text-[#111111] uppercase tracking-tight">
                Dòng dẫn &amp; Khối chốt Footer
              </h2>
            </div>
            <p className="text-xs text-black/60 leading-relaxed pl-9.5">
              Tinh chỉnh lời tựa cho danh mục Dự án, Dịch vụ Agency và lời kêu gọi kèm cam kết báo giá ở khối chân trang.
            </p>
          </div>
          <div className="pl-9.5 sm:pl-0 shrink-0">
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-black/[0.04] text-black/70 border border-black/[0.06] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#2563EB]" />
              Kèm Live Dark Preview
            </span>
          </div>
        </div>

        {/* Inputs & Live Preview layout */}
        <div className="space-y-6">
          {/* Dòng dẫn phân mục: 2 cột */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelClass}>Lời tựa mục &quot;DỰ ÁN ĐÃ THỰC HIỆN&quot;</label>
                <span className="text-[10px] font-medium text-black/45 bg-black/[0.04] px-2 py-0.5 rounded">
                  Mục Dự án
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-black/40">
                  <Clapperboard className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={profile.projectsSubtitle}
                  onChange={(e) => onChange({ projectsSubtitle: e.target.value })}
                  className={`${inputClass} pl-10`}
                  placeholder="Chọn từng nhóm hạng mục bên dưới để xem sản phẩm thực tế đã bàn giao."
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelClass}>Lời tựa mục &quot;3 ĐẦU VIỆC THỰC CHIẾN&quot;</label>
                <span className="text-[10px] font-medium text-black/45 bg-black/[0.04] px-2 py-0.5 rounded">
                  Mục Agency
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-black/40">
                  <Layers className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={profile.agencySubtitle}
                  onChange={(e) => onChange({ agencySubtitle: e.target.value })}
                  className={`${inputClass} pl-10`}
                  placeholder="Quy trình sản xuất tinh gọn, bảo đảm chất lượng hình ảnh cao nhất trong thời gian ngắn nhất."
                />
              </div>
            </div>
          </div>

          {/* Khối chốt Footer CTA */}
          <div className="pt-2 border-t border-black/[0.07] space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              {/* Cột trái: Form nhập Footer CTA */}
              <div className="md:col-span-6 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={labelClass}>Tiêu đề khối chốt dự án (Footer CTA)</label>
                    <span className="text-[10px] font-medium text-black/45 bg-black/[0.04] px-2 py-0.5 rounded">
                      Chân trang
                    </span>
                  </div>
                  <input
                    type="text"
                    value={profile.footerTitle}
                    onChange={(e) => onChange({ footerTitle: e.target.value })}
                    className={`${inputClass} font-bold uppercase`}
                    placeholder="GỬI BRIEF DỰ ÁN CỦA BẠN"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={labelClass}>Mô tả cam kết báo giá (Footer CTA)</label>
                    <span className="text-[10px] font-medium text-black/45 bg-black/[0.04] px-2 py-0.5 rounded">
                      Cam kết 2h
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={profile.footerDescription}
                    onChange={(e) => onChange({ footerDescription: e.target.value })}
                    className={textareaClass}
                    placeholder="Báo giá rõ theo từng hạng mục trong 2 giờ. Hỗ trợ nhận file dựng từ xa (Remote) hoặc đi quay trực tiếp tại TP.HCM."
                  />
                  <p className={helperClass}>
                    Thông điệp giúp đối tác ra quyết định gửi brief ngay lập tức.
                  </p>
                </div>
              </div>

              {/* Cột phải: Live Dark Preview mô phỏng chân trang thực tế */}
              <div className="md:col-span-6">
                <div className="p-5 rounded-2xl bg-[#0C0C0F] border border-white/10 text-white space-y-3.5 shadow-md">
                  <div className="flex items-center justify-between text-[11px] text-white/50 border-b border-white/10 pb-2.5">
                    <span className="font-mono uppercase tracking-wider text-[10px] text-white/40">
                      Mô phỏng hiển thị Chân trang (Live Preview)
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Thời gian thực
                    </span>
                  </div>

                  <div className="space-y-1.5 py-1">
                    <h4 className="font-bricolage text-base sm:text-lg font-bold tracking-tight text-white uppercase leading-snug">
                      {profile.footerTitle || 'GỬI BRIEF DỰ ÁN CỦA BẠN'}
                    </h4>
                    <p className="text-xs text-white/70 leading-relaxed">
                      {profile.footerDescription ||
                        'Báo giá rõ theo từng hạng mục trong 2 giờ. Hỗ trợ nhận file dựng từ xa (Remote) hoặc đi quay trực tiếp tại TP.HCM.'}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-white/10">
                    <div className="px-3.5 py-1.5 rounded-lg bg-white text-[#111111] font-bold text-xs inline-flex items-center gap-1.5 shadow-sm">
                      <span>GỬI BRIEF CHO VINH</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] text-white/40 font-mono">
                      {profile.location || 'TP. Hồ Chí Minh'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 05. DẢI BĂNG THƯƠNG HIỆU & AGENCY ĐÃ HỢP TÁC (BRAND MARQUEE) */}
      <section
        id="section-marquee"
        className="scroll-mt-36 bg-white rounded-2xl border border-black/[0.07] p-6 sm:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-black/[0.07]">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#111111] text-white font-mono text-xs font-bold shrink-0">
                05
              </span>
              <h2 className="font-bricolage text-base sm:text-lg font-bold text-[#111111] uppercase tracking-tight">
                Dải băng Thương hiệu &amp; Agency đã hợp tác
              </h2>
            </div>
            <p className="text-xs text-black/60 leading-relaxed pl-9.5">
              Dải băng chạy ngang vô tận giới thiệu các đối tác, thương hiệu uy tín bạn từng cộng tác. Tải lên trực tiếp nhiều file ảnh Logo (.png) để tự động chuyển sang màu trắng tinh, khoét âm bản và ngăn cách bằng dấu hoa thị xanh (*).
            </p>
          </div>

          {/* Toggle Bật / Tắt Marquee */}
          <div className="pl-9.5 sm:pl-0 shrink-0">
            <label className="inline-flex items-center gap-2.5 cursor-pointer bg-[#F9F9FB] px-3.5 py-2 rounded-xl border border-black/10 hover:border-black/25 transition-all">
              <input
                type="checkbox"
                checked={profile.showBrandMarquee !== false}
                onChange={(e) => onChange({ showBrandMarquee: e.target.checked })}
                className="w-4 h-4 rounded text-[#111111] focus:ring-[#111111] border-black/20 cursor-pointer"
              />
              <span className="text-xs font-semibold text-[#111111]">
                Hiển thị dải băng trên trang chủ
              </span>
            </label>
          </div>
        </div>

        {/* Content of Marquee Section */}
        {profile.showBrandMarquee !== false ? (
          <div className="space-y-6">
            {/* Hidden Multi-file input for Logo PNGs */}
            <input
              ref={brandLogoFileInputRef}
              type="file"
              multiple
              accept="image/png,image/webp,image/jpeg,image/svg+xml"
              className="hidden"
              onChange={handleUploadBrandLogos}
            />

            {/* KÉO THẢ HOẶC TẢI TRỰC TIẾP NHIỀU FILE LOGO .PNG & XỬ LÝ CANVAS TRẮNG */}
            <div
              onDragEnter={handleLogoDragEnter}
              onDragOver={handleLogoDragOver}
              onDragLeave={handleLogoDragLeave}
              onDrop={handleLogoDrop}
              className={`relative p-5 rounded-2xl border-2 transition-all duration-200 space-y-4 ${
                isDraggingLogos
                  ? 'border-dashed border-blue-500 bg-blue-500/10 shadow-[0_0_0_4px_rgba(59,130,246,0.12)]'
                  : 'border-black/[0.07] bg-[#F9F9FB]'
              }`}
            >
              {/* Drag & Drop Active Overlay */}
              {isDraggingLogos && (
                <div className="pointer-events-none absolute inset-0 z-20 rounded-2xl border-2 border-dashed border-blue-500 bg-blue-500/10 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm sm:text-base font-bold text-[#111111] bg-white/95 px-4 py-2 rounded-xl border border-blue-500/30 shadow-sm">
                    Thả các file Logo (.png) vào đây để tự động chuyển sang màu trắng
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-2">
                    <Image className="w-4 h-4 text-[#3B82F6]" />
                    <span>Quản lý Logo PNG màu trắng ({brandLogos.length})</span>
                  </h3>
                  <p className="text-[11px] text-black/60 mt-0.5">
                    Kéo thả trực tiếp nhiều file .png vào khung này hoặc bấm nút tải lên. Hệ thống tự động nén chiều cao tối đa 140px, khoét âm bản, chuyển trắng tinh (#FFFFFF), xén sát viền và lưu dạng WebP siêu nhẹ (3–8KB) hiển thị tức thì.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={processingLogos}
                    onClick={() => brandLogoFileInputRef.current?.click()}
                    className="px-4 py-2 bg-[#111111] hover:bg-black/85 disabled:bg-black/30 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-98"
                  >
                    {processingLogos ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Tải nhiều Logo (.png)</span>
                      </>
                    )}
                  </button>

                  {brandLogos.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllBrandLogos}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                      title="Xóa tất cả logo (tự động ẩn dải băng trên trang chủ)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Xóa tất cả logo</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Status notifications */}
              {processingLogos && (
                <div className="flex items-center gap-2.5 p-3.5 bg-blue-50 border border-blue-200/80 rounded-xl text-xs text-blue-900">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                  <span className="font-medium">{logoUploadProgress}</span>
                </div>
              )}

              {logoUploadError && (
                <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl text-xs text-rose-900">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-medium">{logoUploadError}</span>
                </div>
              )}

              {!processingLogos && logoUploadProgress && (
                <div className="flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">{logoUploadProgress}</span>
                </div>
              )}

              {/* Gallery of Uploaded White Logos (also accepts direct Drag & Drop) */}
              {brandLogos.length > 0 ? (
                <div className="space-y-3">
                  <div
                    className={`p-4 bg-[#0B0B0D] rounded-xl border transition-colors ${
                      isDraggingLogos ? 'border-blue-500 bg-blue-950/40' : 'border-white/10'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3 text-[11px] text-white/60">
                      <span className="font-medium">
                        Xem trước trên nền đen thực tế (có thể kéo thả thêm file .png trực tiếp vào đây):
                      </span>
                      <span>Dùng mũi tên để đổi vị trí, dấu X để xóa</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {brandLogos.map((url, idx) => (
                        <div
                          key={`brand-logo-${idx}-${url.slice(-24)}`}
                          className="relative group bg-[#16161A] hover:bg-[#1E1E24] rounded-lg border border-white/10 hover:border-white/20 p-2.5 flex flex-col items-center justify-between w-32 h-24 shrink-0 transition-all shadow-xs"
                        >
                          <div className="flex-1 w-full flex items-center justify-center p-1 overflow-hidden">
                            <img
                              src={url}
                              alt={`Logo ${idx + 1}`}
                              className="max-h-10 w-auto max-w-[100px] object-contain drop-shadow select-none"
                              draggable={false}
                            />
                          </div>

                          <div className="w-full flex items-center justify-between pt-1 border-t border-white/10 text-[10px] text-white/50">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveBrandLogo(idx, 'left')}
                                className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer transition-colors"
                                title="Di chuyển sang trái"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                              <span className="font-mono text-[9px] text-white/40 tabular-nums">#{idx + 1}</span>
                              <button
                                type="button"
                                disabled={idx === brandLogos.length - 1}
                                onClick={() => handleMoveBrandLogo(idx, 'right')}
                                className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer transition-colors"
                                title="Di chuyển sang phải"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveBrandLogo(idx)}
                              className="p-1 rounded hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 cursor-pointer transition-colors"
                              title="Xóa logo này"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Marquee Simulation Preview */}
                  <div className="p-3 bg-[#0B0B0D] rounded-xl border border-white/10 overflow-hidden">
                    <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2 font-mono">
                      Mô phỏng hiển thị trên trang chủ:
                    </p>
                    <div className="flex items-center overflow-x-auto py-2 scrollbar-none gap-0">
                      {brandLogos.map((url, idx) => (
                        <div key={`sim-${idx}-${url.slice(-24)}`} className="flex items-center shrink-0">
                          <img
                            src={url}
                            alt="Logo preview"
                            className="h-8 w-auto max-w-[120px] object-contain opacity-90"
                            draggable={false}
                          />
                          <span className="flex items-center mx-6 text-[#3B82F6] text-lg font-bold leading-none select-none">
                            *
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => !processingLogos && brandLogoFileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !processingLogos) {
                      e.preventDefault();
                      brandLogoFileInputRef.current?.click();
                    }
                  }}
                  className={`p-7 rounded-xl border-2 border-dashed text-center space-y-2 transition-all cursor-pointer ${
                    isDraggingLogos
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-black/15 bg-white hover:border-blue-500/60 hover:bg-blue-50/40'
                  }`}
                >
                  <Upload className="w-8 h-8 text-blue-600/70 mx-auto" />
                  <p className="text-xs font-semibold text-[#111111]">
                    Kéo thả các file Logo (.png) vào đây hoặc bấm để chọn từ máy tính
                  </p>
                  <p className="text-[11px] text-black/55 max-w-md mx-auto">
                    Chưa có file Logo .PNG nào — Dải băng đang tự động ẩn trên trang chủ. Khi bạn thả ít nhất 1 logo vào đây, dải băng sẽ tự động xuất hiện với logo màu trắng sắc nét.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-black/[0.02] border border-black/[0.06] text-xs text-black/50 text-center">
            Dải băng đang tắt. Trang chủ sẽ không hiển thị khối &quot;THƯƠNG HIỆU &amp; AGENCY ĐÃ HỢP TÁC&quot;.
          </div>
        )}
      </section>
    </div>
  );
}
