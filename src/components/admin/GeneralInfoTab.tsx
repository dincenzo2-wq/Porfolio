import { useState, useRef, useEffect } from 'react';
import {
  Camera,
  CheckCircle2,
  Clock,
  Film,
  Play,
  RotateCcw,
  Scissors,
  Sparkles,
  Video,
  Youtube,
  AlertCircle,
  ExternalLink,
  FastForward,
  Rewind,
  SlidersHorizontal,
  Image,
  Upload,
  Trash2,
  Plus,
  X,
  ArrowLeft,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import type { SiteProfileData } from '../../types/portfolio';
import { parseVideoUrl, formatVideoDuration } from '../../utils/videoEmbed';
import { compressImageToWebP } from '../../utils/imageCompression';
import { convertLogoToWhiteWebP } from '../../utils/logoProcessing';
import { DEFAULT_BRAND_MARQUEE } from '../BrandMarquee';

interface GeneralInfoTabProps {
  profile: SiteProfileData;
  onChange: (partial: Partial<SiteProfileData>) => void;
}

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
  const [currentTime, setCurrentTime] = useState<number>(startSec);
  const [totalDuration, setTotalDuration] = useState<number | null>(null);

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
  const [processingLogos, setProcessingLogos] = useState(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState<string | null>(null);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

  const brandLogos: string[] = profile.brandLogos || [];

  const handleUploadBrandLogos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setProcessingLogos(true);
      setLogoUploadError(null);
      setLogoUploadProgress(`Bắt đầu xử lý 0/${files.length} logo...`);

      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setLogoUploadProgress(`Đang chuyển sang logo trắng & xén viền (${i + 1}/${files.length}): ${file.name}...`);

        // Process through canvas pipeline: white recoloring + negative space punchout + auto-trim
        const processed = await convertLogoToWhiteWebP(file);

        // Upload to Cloudflare R2
        let finalUrl = processed.dataUrl;
        const formData = new FormData();
        formData.append('file', processed.file);

        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.success && data?.url) {
              finalUrl = data.url;
            }
          }
        } catch (uploadErr) {
          console.warn('[Brand Logo Upload] Failed to upload to R2, using WebP data URL:', uploadErr);
        }

        uploadedUrls.push(finalUrl);
      }

      const updated = [...(profile.brandLogos || []), ...uploadedUrls];
      onChange({ brandLogos: updated });
      setLogoUploadProgress(`Đã xử lý và tải lên thành công ${files.length} logo!`);
      setTimeout(() => setLogoUploadProgress(null), 4000);
    } catch (err: unknown) {
      console.error('Failed to process/upload brand logos:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setLogoUploadError(`Lỗi xử lý logo: ${errMsg}`);
    } finally {
      setProcessingLogos(false);
      if (brandLogoFileInputRef.current) {
        brandLogoFileInputRef.current.value = '';
      }
    }
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
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ ảnh logo để quay về dải băng chữ?')) {
      onChange({ brandLogos: [] });
    }
  };

  // Marquee Brands List Parsing & Management (Separate from individual project clients)
  const [newMarqueeBrand, setNewMarqueeBrand] = useState('');

  const marqueeBrands: string[] =
    profile.collaboratorsText && profile.collaboratorsText.trim()
      ? profile.collaboratorsText
          .split(/[·•,\n]/)
          .map((s) => s.trim().replace(/LOUTUS/i, 'LOTUS'))
          .filter(Boolean)
      : DEFAULT_BRAND_MARQUEE.map((b) => b.replace(/LOUTUS/i, 'LOTUS'));

  const handleAddMarqueeBrand = () => {
    const trimmed = newMarqueeBrand.trim().replace(/LOUTUS/i, 'LOTUS');
    if (!trimmed) return;
    if (marqueeBrands.some((b) => b.toLowerCase() === trimmed.toLowerCase())) {
      setNewMarqueeBrand('');
      return;
    }
    const nextList = [...marqueeBrands, trimmed];
    onChange({ collaboratorsText: nextList.join(' · ') });
    setNewMarqueeBrand('');
  };

  const handleRemoveMarqueeBrand = (brandToRemove: string) => {
    const nextList = marqueeBrands.filter((b) => b !== brandToRemove);
    onChange({ collaboratorsText: nextList.join(' · ') });
  };

  const handleResetMarqueeBrands = () => {
    onChange({ collaboratorsText: DEFAULT_BRAND_MARQUEE.map((b) => b.replace(/LOUTUS/i, 'LOTUS')).join(' · ') });
  };

  // Tải trực tiếp file video nền ngắn (.mp4 / .webm) lên Cloudflare R2 (< 15MB)
  const handleUploadHeroVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Kiểm tra định dạng video (.mp4 hoặc .webm)
    const lowerName = file.name.toLowerCase();
    const isVideo =
      lowerName.endsWith('.mp4') || lowerName.endsWith('.webm') || file.type.startsWith('video/');
    if (!isVideo) {
      setHeroVideoUploadError('Vui lòng chọn file video định dạng .mp4 hoặc .webm');
      setHeroVideoUploadSuccess(null);
      if (heroVideoFileInputRef.current) heroVideoFileInputRef.current.value = '';
      return;
    }

    // 2. Kiểm tra giới hạn dung lượng < 15MB (để không vượt giới hạn API Worker và không làm đầy R2)
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

  const handlePosterFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingPoster(true);
      setPosterCaptureError(null);
      setPosterCaptureSuccess(null);
      const res = await compressImageToWebP(file, 1920, 300 * 1024);
      onChange({
        heroPosterUrl: res.dataUrl,
      });
      setPosterCaptureSuccess('Đã tải và nén ảnh Poster thành công!');
    } catch (err) {
      console.error('Failed to compress poster image:', err);
      setPosterCaptureError('Lỗi tải ảnh poster.');
    } finally {
      setUploadingPoster(false);
      if (posterFileInputRef.current) {
        posterFileInputRef.current.value = '';
      }
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

      let finalUrl = compResult.dataUrl;
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
            finalUrl = uploadRes.url;
          }
        }
      } catch (uploadErr) {
        console.warn('Upload notice, using local WebP preview:', uploadErr);
      }

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

    if (video.currentTime < startSec || video.currentTime >= endSec) {
      video.currentTime = startSec;
    }
    tryPlay();
  }, [currentVideoUrl, startSec, endSec]);

  const isLoopSeekingRef = useRef(false);

  const handleTimeUpdate = () => {
    const video = previewVideoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);

    if (isLoopSeekingRef.current) return;

    if (video.currentTime >= endSec) {
      isLoopSeekingRef.current = true;
      video.currentTime = startSec;
      return;
    }

    if (startSec > 0 && video.currentTime < startSec - 0.5) {
      isLoopSeekingRef.current = true;
      video.currentTime = startSec;
    }
  };

  const handleSeeked = () => {
    isLoopSeekingRef.current = false;
    const video = previewVideoRef.current;
    if (!video) return;
    video.defaultMuted = true;
    video.muted = true;
    video.play().catch(() => {});
  };

  const handleLoadedMetadata = () => {
    const video = previewVideoRef.current;
    if (!video) return;
    setTotalDuration(video.duration);
    if (startSec > 0 && video.currentTime < startSec) {
      video.currentTime = startSec;
    }
    video.defaultMuted = true;
    video.muted = true;
    video.play().catch(() => {});
  };

  const setInPoint = (newStart: number) => {
    const safeStart = Math.max(0, Math.round(newStart));
    let safeEnd = endSec;
    if (safeEnd <= safeStart) {
      safeEnd = safeStart + 15;
    }
    onChange({
      heroVideoStart: safeStart,
      heroVideoEnd: safeEnd,
    });
    if (previewVideoRef.current) {
      previewVideoRef.current.currentTime = safeStart;
    }
  };

  const setOutPoint = (newEnd: number) => {
    const safeEnd = Math.max(startSec + 1, Math.round(newEnd));
    onChange({
      heroVideoEnd: safeEnd,
    });
  };

  const snapTo15Seconds = () => {
    onChange({
      heroVideoEnd: startSec + 15,
    });
  };

  const seekToStart = () => {
    if (previewVideoRef.current) {
      previewVideoRef.current.currentTime = startSec;
      previewVideoRef.current.play().catch(() => {});
    }
  };

  const setInFromCurrent = () => {
    const current = Math.floor(currentTime);
    setInPoint(current);
  };

  const setOutFromCurrent = () => {
    const current = Math.ceil(currentTime);
    setOutPoint(current);
  };

  const set15sFromCurrent = () => {
    const current = Math.floor(currentTime);
    onChange({
      heroVideoStart: current,
      heroVideoEnd: current + 15,
    });
    if (previewVideoRef.current) {
      previewVideoRef.current.currentTime = current;
    }
  };

  const loopPresets = [
    { label: '15s Chuẩn (00:00 – 00:15)', start: 0, end: 15 },
    { label: '15s Cao trào (00:05 – 00:20)', start: 5, end: 20 },
    { label: '15s Giữa (00:10 – 00:25)', start: 10, end: 25 },
    { label: '10s Ngắn (00:00 – 00:10)', start: 0, end: 10 },
    { label: '20s Mở rộng (00:00 – 00:20)', start: 0, end: 20 },
  ];
  const inputClass =
    'w-full bg-[#F9F9FB] border border-black/10 rounded-xl px-4 py-3 text-sm text-[#111111] focus:bg-white focus:border-[#111111] focus:ring-2 focus:ring-black/5 focus:outline-none transition-all placeholder:text-black/35';
  const textareaClass =
    'w-full bg-[#F9F9FB] border border-black/10 rounded-xl px-4 py-3 text-sm text-[#111111] leading-relaxed min-h-[116px] resize-y focus:bg-white focus:border-[#111111] focus:ring-2 focus:ring-black/5 focus:outline-none transition-all placeholder:text-black/35';
  const labelClass = 'block text-xs font-bold uppercase tracking-wider text-[#111111] mb-1.5';
  const helperClass = 'text-[11px] text-black/55 mt-1.5';

  return (
    <div className="w-full py-4 space-y-6">
      {/* 1. HERO & ĐỊNH VỊ THƯƠNG HIỆU */}
      <section className="bg-white rounded-2xl border border-black/[0.07] p-6 sm:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.03)] grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cột trái: Tiêu đề & Vị trí */}
        <div className="lg:col-span-4 space-y-2 lg:sticky lg:top-[128px]">
          <h2 className="font-bricolage text-lg sm:text-xl font-bold text-[#111111] uppercase tracking-tight">
            1. HERO &amp; ĐỊNH VỊ THƯƠNG HIỆU
          </h2>
          <p className="text-xs sm:text-sm text-black/60 leading-relaxed">
            Các nội dung xuất hiện nổi bật tại phần đầu trang (Hero Showreel), thanh định danh thương hiệu và phần tóm tắt hồ sơ năng lực.
          </p>
        </div>

        {/* Cột phải: Các ô nhập liệu */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Tên nghệ danh chính (Headline)</label>
              <input
                type="text"
                value={profile.fullName}
                onChange={(e) => onChange({ fullName: e.target.value })}
                className={`${inputClass} font-bold`}
                placeholder="QUỐC VINH®"
              />
            </div>

            <div>
              <label className={labelClass}>Định danh chuyên môn (Role Title)</label>
              <input
                type="text"
                value={profile.roleTitle}
                onChange={(e) => onChange({ roleTitle: e.target.value })}
                className={inputClass}
                placeholder="VIDEOGRAPHER · FILM EDITOR · MOTION DESIGNER"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Định vị năng lực (Positioning)</label>
              <textarea
                rows={5}
                value={profile.positioning}
                onChange={(e) => onChange({ positioning: e.target.value })}
                className={`${textareaClass} min-h-[135px]`}
                placeholder="Chuyên quay phim thương mại, dựng hậu kỳ tốc độ cao và motion graphics cho Agency, Brand & Production House."
              />
            </div>

            <div>
              <label className={labelClass}>Cam kết tiến độ (Bio Detail)</label>
              <textarea
                rows={5}
                value={profile.bioDetail}
                onChange={(e) => onChange({ bioDetail: e.target.value })}
                className={`${textareaClass} min-h-[135px]`}
                placeholder="Quy trình làm việc thực chiến, đáp ứng brief chuẩn xác. Nhận brief và xuất bản nháp nhanh trong 24–48h."
              />
            </div>
          </div>

          {/* Cụm điều khiển: Video Loop Showreel Nền Hero */}
          <div className="pt-6 border-t border-black/8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-[#2563EB]" />
                <h3 className="font-bricolage text-sm font-bold text-[#111111] uppercase tracking-wide">
                  Video Loop Showreel nền Hero
                </h3>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#2563EB]/10 text-[#2563EB] self-start sm:self-auto">
                Không dùng ảnh bìa · 100% Video Loop
              </span>
            </div>

            <p className="text-xs text-black/60 leading-relaxed">
              Trang web sử dụng trực tiếp video loop điện ảnh làm nền chuyển động toàn màn hình cho Hero. Bạn có thể dán link YouTube, Vimeo, Dropbox hoặc link file MP4 trực tiếp, hệ thống sẽ tự động nhận diện và cho phép bạn cắt đoạn khoảng 15 giây để video chạy lặp liên tục.
            </p>

            {/* Video Loop Showreel URL & Reset */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className={labelClass}>
                  Link Video Loop Showreel (YouTube / Vimeo / Dropbox / Direct MP4)
                </label>
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
                      className="inline-flex items-center gap-1.5 text-xs text-[#2563EB] hover:underline font-semibold cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Khôi phục video mặc định</span>
                    </button>
                  )}
              </div>

              {/* Input URL + Nút Tải Video lên R2 (< 15MB) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <input
                  type="text"
                  value={profile.showreelUrl || profile.heroBgUrl || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange({
                      showreelUrl: val,
                      heroBgUrl: val,
                      heroBgType: 'video',
                    });
                  }}
                  className={`flex-1 ${inputClass}`}
                  placeholder="VD: https://youtu.be/... hoặc /media/uploads/... hoặc /videos/dem-khong-ngu.mp4"
                />

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
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#111111] hover:bg-black/85 disabled:bg-black/30 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer active:scale-98 shrink-0"
                  title="Chọn file video MP4 hoặc WebM dưới 15MB tải trực tiếp lên Cloudflare R2"
                >
                  {uploadingHeroVideo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Đang tải lên R2 ({heroVideoUploadProgress})...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-white" />
                      <span>📁 Tải Video nền lên R2 (&lt; 15MB)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Status messages for video upload */}
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

              {/* TỰ ĐỘNG NHẬN DIỆN NỀN TẢNG VIDEO (AUTO-DETECTION BADGE) */}
              <div className="p-3.5 rounded-xl border bg-[#F9F9FB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-2.5">
                  {parsedShowreel.type === 'youtube' ? (
                    <div className="w-7 h-7 rounded-lg bg-red-600/10 text-red-600 flex items-center justify-center shrink-0">
                      <Youtube className="w-4 h-4" />
                    </div>
                  ) : parsedShowreel.type === 'vimeo' ? (
                    <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
                      <Film className="w-4 h-4" />
                    </div>
                  ) : parsedShowreel.type === 'gdrive' ? (
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                      <Video className="w-4 h-4" />
                    </div>
                  ) : parsedShowreel.isDropbox ? (
                    <div className="w-7 h-7 rounded-lg bg-blue-600/10 text-[#2563EB] flex items-center justify-center shrink-0">
                      <Video className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-emerald-600/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[#111111]">
                        {parsedShowreel.type === 'youtube'
                          ? 'Đã nhận diện: YouTube Video'
                          : parsedShowreel.type === 'vimeo'
                          ? 'Đã nhận diện: Vimeo Video'
                          : parsedShowreel.type === 'gdrive'
                          ? 'Đã nhận diện: Google Drive Video'
                          : parsedShowreel.isDropbox
                          ? 'Đã nhận diện: Dropbox MP4 Direct Stream'
                          : 'Đã nhận diện: File Video MP4 / WebM Trực Tiếp'}
                      </span>
                      {parsedShowreel.videoId && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 text-black/60">
                          ID: {parsedShowreel.videoId}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-black/55 leading-tight">
                      {parsedShowreel.type === 'youtube'
                        ? 'Tự động tối ưu nhúng không quảng cáo và lặp theo khoảng thời gian đã cắt bên dưới.'
                        : parsedShowreel.type === 'vimeo'
                        ? 'Tự động kích hoạt player Vimeo điện ảnh không viền và áp dụng mốc bắt đầu.'
                        : parsedShowreel.isDropbox
                        ? 'Link Dropbox đã được tự động chuẩn hóa sang raw=1 để stream mượt mà không bị tải file.'
                        : 'Hỗ trợ cắt chính xác từng giây và phát lặp 15 giây mượt mà không độ trễ.'}
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 self-start sm:self-auto">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Sẵn sàng phát Loop
                </span>
              </div>

              {/* Quick Select Presets for high quality internal videos */}
              <div className="pt-1 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-black/50 block">
                  Chọn nhanh video loop chất lượng cao có sẵn trong web:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { label: 'Đêm Không Ngủ (1.1MB · Khuyên dùng)', url: '/videos/dem-khong-ngu.mp4' },
                    { label: 'Crimson Stage (740KB)', url: '/videos/crimson-stage.mp4' },
                    { label: 'Dusk Motion (800KB)', url: '/videos/dusk-motion.mp4' },
                    { label: 'Doorway Sunbeam (1.5MB)', url: '/videos/doorway-sunbeam.mp4' },
                    { label: 'Chuyến Xe Cuối Ngày (480KB)', url: '/videos/chuyen-xe-cuoi-ngay.mp4' },
                  ].map((preset) => {
                    const isSelected = (profile.showreelUrl || profile.heroBgUrl) === preset.url;
                    return (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() =>
                          onChange({
                            showreelUrl: preset.url,
                            heroBgUrl: preset.url,
                            heroBgType: 'video',
                          })
                        }
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                            : 'bg-[#F9F9FB] border-black/10 text-black/75 hover:bg-white hover:border-black/25'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ẢNH POSTER FRAME NẠP TỨC THÌ (0ms INSTANT POSTER) */}
              <div className="p-4 rounded-xl border border-black/10 bg-[#F9F9FB] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-[#2563EB]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                      Ảnh Poster Frame nạp tức thì (0ms Instant Poster)
                    </span>
                  </div>
                  {profile.heroPosterUrl && (
                    <button
                      type="button"
                      onClick={() => onChange({ heroPosterUrl: '' })}
                      className="inline-flex items-center gap-1 text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Gỡ ảnh Poster</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-black/60 leading-relaxed">
                  Hiển thị ngay lập tức trong <strong>0 giây</strong> khi vừa F5 tải lại trang. Loại bỏ 100% hiện tượng màn hình đen trong 1–2 giây lúc trình duyệt chờ kết nối luồng video dung lượng lớn từ Dropbox.
                </p>

                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Nút Chụp trực tiếp từ Video đang phát */}
                    <button
                      type="button"
                      onClick={handleCaptureCurrentFrameAsPoster}
                      disabled={capturingPoster}
                      className="px-4 py-2.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs shrink-0 active:scale-98 disabled:opacity-50"
                      title="Chụp ngay khung hình đang chiếu ở trình phát bên dưới làm ảnh Poster 0ms mà không cần tải file lên"
                    >
                      <Camera className="w-3.5 h-3.5 text-white" />
                      <span>
                        {capturingPoster
                          ? 'Đang chụp...'
                          : `📸 Chụp Frame đang phát (${formatVideoDuration(currentTime)}) làm Poster`}
                      </span>
                    </button>

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
                      className="px-3.5 py-2.5 rounded-lg bg-white border border-black/15 hover:border-[#2563EB] hover:text-[#2563EB] text-xs font-semibold text-[#111111] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>{uploadingPoster ? 'Đang nén WebP...' : 'Tải file từ máy'}</span>
                    </button>
                  </div>

                  {/* Ô nhập link ảnh bìa frame chiếm trọn 100% bề ngang */}
                  <input
                    type="text"
                    value={profile.heroPosterUrl || ''}
                    onChange={(e) => onChange({ heroPosterUrl: e.target.value })}
                    className="w-full bg-white border border-black/10 rounded-lg px-3.5 py-2.5 text-xs text-[#111111] placeholder:text-black/35 focus:outline-none focus:border-[#2563EB]"
                    placeholder="Hoặc dán link ảnh bìa frame 00:00:00..."
                  />
                </div>

                {posterCaptureSuccess && (
                  <div className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-800 p-2.5 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{posterCaptureSuccess}</span>
                  </div>
                )}

                {posterCaptureError && (
                  <div className="flex items-center gap-2 text-xs bg-amber-50 text-amber-800 p-2.5 rounded-lg border border-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{posterCaptureError}</span>
                  </div>
                )}

                {profile.heroPosterUrl && (
                  <div className="flex items-center gap-3 pt-1">
                    <img
                      src={profile.heroPosterUrl}
                      alt="Hero Video Poster Preview"
                      className="w-24 h-14 object-cover rounded-lg border border-black/15 shadow-xs"
                    />
                    <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Đã kích hoạt Poster Frame · Trang chủ sẽ sáng đẹp ngay 0ms khi reload</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* KHỐI CẮT ĐOẠN VIDEO LOOP (IN - OUT TRIMMER - ~15 GIÂY) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#F4F4F7] border border-black/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center shrink-0">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                      Cắt đoạn Video Loop (In - Out Trimmer · ~15 giây)
                    </h4>
                    <p className="text-[11px] text-black/55">
                      Giới hạn đoạn video phát lặp làm nền Hero. Video sẽ chỉ phát trong khoảng này và quay lại từ đầu.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full border ${
                      loopDuration === 15
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : loopDuration >= 10 && loopDuration <= 20
                        ? 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/30'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    Thời lượng loop: {loopDuration}s {loopDuration === 15 ? '✓ Chuẩn' : ''}
                  </span>
                </div>
              </div>

              {/* Hàng ngang gọn gàng: Mốc Bắt đầu – Kết thúc & Nút Lấy 15s từ mốc đang phát */}
              <div className="p-3 bg-white border border-black/10 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#111111]">
                  <span className="font-bold flex items-center gap-1.5 text-black/75 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
                    Bắt đầu:
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={endSec - 1}
                      value={startSec}
                      onChange={(e) => setInPoint(Number(e.target.value) || 0)}
                      className="w-20 bg-[#F9F9FB] border border-black/15 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-center focus:bg-white focus:outline-none focus:border-[#2563EB]"
                    />
                    <span className="font-mono text-[11px] text-black/50">s ({formatVideoDuration(startSec)})</span>
                  </div>

                  <span className="text-black/30 font-bold px-1 select-none">—</span>

                  <span className="font-bold flex items-center gap-1.5 text-black/75 shrink-0">
                    Kết thúc:
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={startSec + 1}
                      value={endSec}
                      onChange={(e) => setOutPoint(Number(e.target.value) || startSec + 15)}
                      className="w-20 bg-[#F9F9FB] border border-black/15 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-center focus:bg-white focus:outline-none focus:border-[#2563EB]"
                    />
                    <span className="font-mono text-[11px] text-black/50">s ({formatVideoDuration(endSec)})</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={set15sFromCurrent}
                  className="px-3.5 py-2 rounded-lg bg-[#2563EB]/10 hover:bg-[#2563EB] text-[#2563EB] hover:text-white border border-[#2563EB]/25 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-xs active:scale-98"
                  title="Cắt lấy 15 giây phát tiếp theo từ khung hình video hiện tại"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>📍 Lấy 15s từ mốc đang phát ({formatVideoDuration(currentTime)})</span>
                </button>
              </div>

              {/* Dãy 5 nút chọn nhanh khoảng 15 giây */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-black/55 flex items-center gap-1.5 mr-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                  Chọn nhanh khoảng 15s:
                </span>
                {loopPresets.map((preset) => {
                  const isActive = startSec === preset.start && endSec === preset.end;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() =>
                        onChange({
                          heroVideoStart: preset.start,
                          heroVideoEnd: preset.end,
                        })
                      }
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                          : 'bg-white border-black/10 text-black/75 hover:border-black/30 hover:bg-[#F9F9FB]'
                      }`}
                    >
                      {isActive ? '✓ ' : ''}
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Video Loop Preview */}
            <div className="p-4 rounded-xl bg-[#F9F9FB] border border-black/8 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                    Xem trước Video Loop nền Hero ({loopDuration} giây)
                  </span>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#2563EB]/10 text-[#2563EB]">
                  {formatVideoDuration(startSec)} ➔ {formatVideoDuration(endSec)} · {loopDuration}s
                </span>
              </div>

              <div className="relative aspect-[21/9] sm:aspect-[16/7] w-full max-w-2xl mx-auto rounded-xl overflow-hidden bg-black border border-black/15 shadow-sm">
                {(parsedShowreel.type === 'youtube' ||
                  parsedShowreel.type === 'vimeo' ||
                  parsedShowreel.type === 'gdrive') &&
                parsedShowreel.embedUrl ? (
                  <iframe
                    key={`${parsedShowreel.embedUrl}-${startSec}-${endSec}`}
                    src={parsedShowreel.embedUrl}
                    title="Video Loop Showreel Preview"
                    className="w-full h-full border-0"
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
                    onSeeked={handleSeeked}
                    onLoadedMetadata={handleLoadedMetadata}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute top-2.5 right-2.5 pointer-events-none">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Auto Loop: {formatVideoDuration(startSec)} – {formatVideoDuration(endSec)} ({loopDuration}s)
                  </span>
                </div>
              </div>

              {/* Player Quick Controls & Scrub Bar for Direct Video */}
              {parsedShowreel.type === 'direct' && (
                <div className="p-3 rounded-lg bg-white border border-black/8 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-black/80">
                      Đang phát: {formatVideoDuration(currentTime)}
                    </span>
                    <span className="text-black/40">/</span>
                    <span className="font-mono text-black/60">
                      Vùng loop: {formatVideoDuration(startSec)} ➔ {formatVideoDuration(endSec)} ({loopDuration}s)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={seekToStart}
                      className="px-2.5 py-1 rounded-md bg-[#F9F9FB] hover:bg-black/5 border border-black/10 font-medium text-black/70 cursor-pointer flex items-center gap-1"
                    >
                      <Rewind className="w-3 h-3" />
                      <span>Về mốc In</span>
                    </button>
                    <button
                      type="button"
                      onClick={set15sFromCurrent}
                      className="px-2.5 py-1 rounded-md bg-[#2563EB]/10 hover:bg-[#2563EB]/20 border border-[#2563EB]/20 font-semibold text-[#2563EB] cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Lấy 15s từ đây</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCaptureCurrentFrameAsPoster}
                      disabled={capturingPoster}
                      className="px-3 py-1 rounded-md bg-[#2563EB] hover:bg-blue-700 text-white font-bold cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                      title="Chụp ngay khung hình đang chiếu làm ảnh Poster 0ms"
                    >
                      <Camera className="w-3 h-3 text-white" />
                      <span>{capturingPoster ? 'Đang chụp...' : '📸 Chụp Frame này làm Poster 0ms'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. THÔNG TIN LIÊN HỆ & KÊNH TRAO ĐỔI */}
      <section className="bg-white rounded-2xl border border-black/[0.07] p-6 sm:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.03)] grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cột trái */}
        <div className="lg:col-span-4 space-y-2 lg:sticky lg:top-[128px]">
          <h2 className="font-bricolage text-lg sm:text-xl font-bold text-[#111111] uppercase tracking-tight">
            2. THÔNG TIN LIÊN HỆ &amp; KÊNH TRAO ĐỔI
          </h2>
          <p className="text-xs sm:text-sm text-black/60 leading-relaxed">
            Xuất hiện tại thanh điều hướng Navbar, chân trang Footer và hộp thoại gửi brief nhanh khi đối tác bấm nút Liên hệ.
          </p>
        </div>

        {/* Cột phải */}
        <div className="lg:col-span-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Email công việc</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => onChange({ email: e.target.value })}
                className={inputClass}
                placeholder="vinh.film@gmail.com"
              />
            </div>

            <div>
              <label className={labelClass}>Số Zalo / Hotline liên hệ</label>
              <input
                type="text"
                value={profile.zalo}
                onChange={(e) => onChange({ zalo: e.target.value, phone: e.target.value })}
                className={inputClass}
                placeholder="0908 123 456"
              />
            </div>

            <div>
              <label className={labelClass}>Telegram Username</label>
              <input
                type="text"
                value={profile.telegram}
                onChange={(e) => onChange({ telegram: e.target.value })}
                className={inputClass}
                placeholder="@quocvinhfilm"
              />
            </div>

            <div>
              <label className={labelClass}>Địa bàn hoạt động chính</label>
              <input
                type="text"
                value={profile.location}
                onChange={(e) => onChange({ location: e.target.value })}
                className={inputClass}
                placeholder="TP. Hồ Chí Minh"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. DÒNG DẪN & CHÂN TRANG */}
      <section className="bg-white rounded-2xl border border-black/[0.07] p-6 sm:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.03)] grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cột trái */}
        <div className="lg:col-span-4 space-y-2 lg:sticky lg:top-[128px]">
          <h2 className="font-bricolage text-lg sm:text-xl font-bold text-[#111111] uppercase tracking-tight">
            3. DÒNG DẪN &amp; CHÂN TRANG
          </h2>
          <p className="text-xs sm:text-sm text-black/60 leading-relaxed">
            Tinh chỉnh lời tựa cho danh mục Dự án, Dịch vụ Agency và lời kêu gọi kèm cam kết báo giá ở khối chân trang (Footer CTA).
          </p>
        </div>

        {/* Cột phải */}
        <div className="lg:col-span-8 space-y-6">
          <div>
            <label className={labelClass}>Dòng mô tả dưới tiêu đề &quot;DỰ ÁN ĐÃ THỰC HIỆN&quot;</label>
            <input
              type="text"
              value={profile.projectsSubtitle}
              onChange={(e) => onChange({ projectsSubtitle: e.target.value })}
              className={inputClass}
              placeholder="Chọn từng nhóm hạng mục bên dưới để xem sản phẩm thực tế đã bàn giao."
            />
          </div>

          <div>
            <label className={labelClass}>Dòng mô tả dưới tiêu đề &quot;3 ĐẦU VIỆC THỰC CHIẾN CHO AGENCY&quot;</label>
            <input
              type="text"
              value={profile.agencySubtitle}
              onChange={(e) => onChange({ agencySubtitle: e.target.value })}
              className={inputClass}
              placeholder="Quy trình sản xuất tinh gọn, bảo đảm chất lượng hình ảnh cao nhất trong thời gian ngắn nhất."
            />
          </div>

          {/* Tách Tiêu đề khối chốt dự án thành hàng ngang phía trên */}
          <div>
            <label className={labelClass}>Tiêu đề khối chốt dự án (Footer CTA)</label>
            <input
              type="text"
              value={profile.footerTitle}
              onChange={(e) => onChange({ footerTitle: e.target.value })}
              className={`${inputClass} font-bold uppercase`}
              placeholder="GỬI BRIEF DỰ ÁN CỦA BẠN"
            />
          </div>

          {/* Đặt Mô tả cam kết báo giá trải rộng toàn chiều ngang bên dưới */}
          <div>
            <label className={labelClass}>Mô tả cam kết báo giá (Footer CTA)</label>
            <textarea
              rows={3}
              value={profile.footerDescription}
              onChange={(e) => onChange({ footerDescription: e.target.value })}
              className={textareaClass}
              placeholder="Báo giá rõ theo từng hạng mục trong 2 giờ. Hỗ trợ nhận file dựng từ xa (Remote) hoặc đi quay trực tiếp tại TP.HCM."
            />
            <p className={helperClass}>
              Hiển thị với độ tương phản cao, rõ nét toàn câu ở khu vực chân trang.
            </p>
          </div>
        </div>
      </section>

      {/* 4. DẢI BĂNG THƯƠNG HIỆU & AGENCY ĐÃ HỢP TÁC (BRAND MARQUEE) — TÁCH BIỆT HOÀN TOÀN VỚI DỰ ÁN */}
      <section className="bg-white rounded-2xl border border-black/[0.07] p-6 sm:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.07]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
              <h2 className="font-bricolage text-base sm:text-lg font-bold text-[#111111] uppercase tracking-tight">
                Dải băng Thương hiệu &amp; Agency đã hợp tác (Brand Marquee)
              </h2>
            </div>
            <p className="text-xs text-black/60 mt-1 max-w-2xl leading-relaxed">
              Dải băng chạy ngang vô tận giới thiệu các đối tác, thương hiệu uy tín bạn từng cộng tác. Tải lên trực tiếp nhiều file ảnh Logo (.png) để tự động chuyển sang màu trắng tinh, khoét âm bản và ngăn cách bằng dấu hoa thị xanh (*).
            </p>
          </div>

          {/* Toggle Bật / Tắt Marquee */}
          <label className="inline-flex items-center gap-2.5 cursor-pointer shrink-0 self-start sm:self-auto bg-[#F9F9FB] px-3.5 py-2 rounded-xl border border-black/10 hover:border-black/25 transition-all">
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

            {/* PHẦN 1: TẢI TRỰC TIẾP NHIỀU FILE LOGO .PNG & XỬ LÝ CANVAS TRẮNG */}
            <div className="bg-[#F9F9FB] p-5 rounded-2xl border border-black/[0.07] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-2">
                    <Image className="w-4 h-4 text-[#3B82F6]" />
                    <span>Quản lý Logo PNG màu trắng ({brandLogos.length})</span>
                  </h3>
                  <p className="text-[11px] text-black/60 mt-0.5">
                    Tải trực tiếp nhiều file .png lên Cloudflare R2 (không cần gõ tên). Hệ thống dùng Canvas tự động đục thủng chi tiết âm bản bên trong, đổi toàn bộ sang trắng tinh (#FFFFFF) và xén sát viền thừa.
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
                      title="Xóa tất cả logo để quay về dải băng chữ"
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

              {/* Gallery of Uploaded White Logos */}
              {brandLogos.length > 0 ? (
                <div className="space-y-3">
                  <div className="p-4 bg-[#0B0B0D] rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-3 text-[11px] text-white/60">
                      <span className="font-medium">Xem trước trên nền đen thực tế:</span>
                      <span>Dùng mũi tên để đổi vị trí, dấu X để xóa</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {brandLogos.map((url, idx) => (
                        <div
                          key={`${url}-${idx}`}
                          className="relative group bg-[#16161A] hover:bg-[#1E1E24] rounded-lg border border-white/10 hover:border-white/20 p-2.5 flex flex-col items-center justify-between w-32 h-24 shrink-0 transition-all shadow-xs"
                        >
                          <div className="flex-1 w-full flex items-center justify-center p-1">
                            <img
                              src={url}
                              alt={`Logo ${idx + 1}`}
                              className="max-h-10 w-auto max-w-[100px] object-contain drop-shadow select-none"
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
                              <span className="font-mono text-[9px] text-white/40">#{idx + 1}</span>
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
                        <div key={`sim-${url}-${idx}`} className="flex items-center shrink-0">
                          <img
                            src={url}
                            alt="Logo preview"
                            className="h-8 w-auto max-w-[120px] object-contain opacity-90"
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
                <div className="p-6 rounded-xl border border-dashed border-black/15 bg-white text-center space-y-2">
                  <Image className="w-8 h-8 text-black/30 mx-auto" />
                  <p className="text-xs font-semibold text-[#111111]">
                    Chưa có file Logo .PNG nào
                  </p>
                  <p className="text-[11px] text-black/50 max-w-md mx-auto">
                    Bấm nút <strong>&quot;Tải nhiều Logo (.png)&quot;</strong> ở trên để chọn đồng thời nhiều file logo thương hiệu. Trang chủ hiện đang tạm hiển thị dải chữ dự phòng bên dưới.
                  </p>
                </div>
              )}
            </div>

            {/* PHẦN 2: DẢI CHỮ DỰ PHÒNG (FALLBACK KHI CHƯA CÓ LOGO PNG) */}
            <div className="space-y-4 pt-2 border-t border-black/[0.07]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-[#111111] flex items-center gap-1.5">
                    <span>Dải băng chữ dự phòng</span>
                    {brandLogos.length > 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        Đang tạm ẩn trên trang chủ (ưu tiên Logo PNG)
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-black/50 mt-0.5">
                    {brandLogos.length > 0
                      ? 'Dải chữ này sẽ tự động hiển thị lại nếu bạn xóa toàn bộ các logo PNG ở trên.'
                      : 'Đang hiển thị trên trang chủ dưới dạng chữ in hoa cách nhau bởi dấu *.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleResetMarqueeBrands}
                  className="text-[11px] font-semibold text-black/50 hover:text-[#111111] transition-colors cursor-pointer flex items-center gap-1 self-start sm:self-auto"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Khôi phục dải chữ gốc</span>
                </button>
              </div>

              {/* Input thêm thương hiệu mới vào dải băng chữ */}
              <div className="flex items-center gap-2 max-w-xl">
                <input
                  type="text"
                  value={newMarqueeBrand}
                  onChange={(e) => setNewMarqueeBrand(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMarqueeBrand();
                    }
                  }}
                  placeholder="VD: Samsung, Shopee, Honda..."
                  className="flex-1 px-3.5 py-2 rounded-lg bg-white border border-black/10 text-xs text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-2 focus:ring-black/5 font-medium transition-all"
                />
                <button
                  type="button"
                  onClick={handleAddMarqueeBrand}
                  className="px-4 py-2 bg-[#111111] hover:bg-black/85 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-98 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm chữ</span>
                </button>
              </div>

              {/* Danh sách thẻ thương hiệu chữ */}
              <div className="flex flex-wrap items-center gap-2 p-3 bg-[#F9F9FB] rounded-xl border border-black/[0.07] min-h-[50px]">
                {marqueeBrands.length === 0 ? (
                  <p className="text-xs text-black/45 italic py-1">
                    Chưa có thương hiệu nào. Bấm &quot;Khôi phục dải chữ gốc&quot; hoặc nhập thương hiệu mới ở trên.
                  </p>
                ) : (
                  marqueeBrands.map((brand) => (
                    <span
                      key={brand}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-black/10 text-xs font-semibold text-[#111111] shadow-2xs group hover:border-black/30 transition-all"
                    >
                      <span>{brand}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMarqueeBrand(brand)}
                        className="text-black/40 hover:text-rose-600 transition-colors cursor-pointer p-0.5"
                        title={`Xóa ${brand} khỏi dải băng`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
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
