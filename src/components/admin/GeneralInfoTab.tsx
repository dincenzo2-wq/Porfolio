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
} from 'lucide-react';
import type { SiteProfileData } from '../../types/portfolio';
import { parseVideoUrl, formatVideoDuration } from '../../utils/videoEmbed';
import { compressImageToWebP, resolveSafeUploadedImageUrl } from '../../utils/imageCompression';
import { convertLogoToWhiteWebP } from '../../utils/logoProcessing';

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
            Nội dung định danh thương hiệu, hồ sơ năng lực và video loop nền Hero.
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
                rows={6}
                value={profile.positioning}
                onChange={(e) => onChange({ positioning: e.target.value })}
                className={`${textareaClass} min-h-[160px]`}
                placeholder="Chuyên quay phim thương mại, dựng hậu kỳ tốc độ cao và motion graphics cho Agency, Brand & Production House."
              />
            </div>

            <div>
              <label className={labelClass}>Cam kết tiến độ (Bio Detail)</label>
              <textarea
                rows={6}
                value={profile.bioDetail}
                onChange={(e) => onChange({ bioDetail: e.target.value })}
                className={`${textareaClass} min-h-[160px]`}
                placeholder="Quy trình làm việc thực chiến, đáp ứng brief chuẩn xác. Nhận brief và xuất bản nháp nhanh trong 24–48h."
              />
            </div>
          </div>

          {/* Cụm điều khiển: Video Loop Showreel Nền Hero (1 Khung duy nhất) */}
          <div className="pt-6 border-t border-black/8 space-y-4">
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
              Video nền Hero chất lượng cao lưu trữ tại Cloudflare R2 với bộ đệm CDN toàn cầu. Tải trực tiếp video mới hoặc chụp khung hình đang phát làm ảnh bìa Poster nạp tức thì 0ms.
            </p>

            {/* Khung duy nhất: Video 16:9 xem trước đặt cạnh 2 nút thao tác chính */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#F4F4F7] border border-black/10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
                {/* Khung phát xem trước video nền hiện tại (16:9 gọn gàng) */}
                <div className="lg:col-span-7">
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-black/15 shadow-sm">
                    {(parsedShowreel.type === 'youtube' ||
                      parsedShowreel.type === 'vimeo' ||
                      parsedShowreel.type === 'gdrive') &&
                    parsedShowreel.embedUrl ? (
                      <iframe
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
                        className="w-full h-full object-cover"
                      />
                    )}

                    {profile.heroPosterUrl && (
                      <div className="absolute top-2.5 left-2.5 pointer-events-none">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Poster 0ms đang bật
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cạnh 2 nút thao tác chính */}
                <div className="lg:col-span-5 space-y-3">
                  {/* Nút 1: [📁 Tải Video nền lên R2 (< 15MB)] */}
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
                    className="w-full px-4 py-3 rounded-xl bg-[#111111] hover:bg-black/85 disabled:bg-black/30 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98"
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

                  {/* Nút 2: [📸 Chụp Frame đang phát làm Poster 0ms] */}
                  <button
                    type="button"
                    onClick={handleCaptureCurrentFrameAsPoster}
                    disabled={capturingPoster}
                    className="w-full px-4 py-3 rounded-xl bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98"
                    title="Chụp ngay khung hình đang chiếu ở trình phát bên cạnh làm ảnh Poster 0ms"
                  >
                    <Camera className="w-4 h-4 text-white" />
                    <span>
                      {capturingPoster
                        ? 'Đang chụp WebP...'
                        : `📸 Chụp Frame đang phát (${formatVideoDuration(currentTime)}) làm Poster 0ms`}
                    </span>
                  </button>

                  {/* Kèm nút phụ tải ảnh Poster từ máy nếu cần */}
                  <div className="flex items-center gap-2 pt-0.5">
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
                      className="flex-1 px-3 py-2 rounded-lg bg-white border border-black/15 hover:border-black/30 text-xs font-semibold text-black/75 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs hover:bg-[#F9F9FB] transition-all"
                    >
                      <Image className="w-3.5 h-3.5 text-black/50" />
                      <span>{uploadingPoster ? 'Đang nén WebP...' : 'Tải Poster từ máy'}</span>
                    </button>

                    {profile.heroPosterUrl && (
                      <button
                        type="button"
                        onClick={() => onChange({ heroPosterUrl: '' })}
                        className="px-3 py-2 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold cursor-pointer flex items-center gap-1 shrink-0 transition-all shadow-2xs"
                        title="Gỡ ảnh Poster hiện tại"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Gỡ</span>
                      </button>
                    )}
                  </div>

                  {/* Nguồn video ngầm & Khôi phục mặc định */}
                  <div className="pt-2 border-t border-black/8 space-y-1">
                    <p className="text-[11px] font-mono text-black/45 truncate" title={currentVideoUrl}>
                      Nguồn video: {currentVideoUrl}
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
                          className="text-[11px] text-black/50 hover:text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Khôi phục video mặc định (/videos/dem-khong-ngu.mp4)</span>
                        </button>
                      )}
                  </div>
                </div>
              </div>

              {/* Status messages for video upload & poster capture */}
              {heroVideoUploadSuccess && (
                <div className="mt-3 flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">{heroVideoUploadSuccess}</span>
                </div>
              )}

              {heroVideoUploadError && (
                <div className="mt-3 flex items-center gap-2.5 p-3 bg-rose-50 border border-rose-200/80 rounded-xl text-xs text-rose-900">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-medium">{heroVideoUploadError}</span>
                </div>
              )}

              {posterCaptureSuccess && (
                <div className="mt-3 flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">{posterCaptureSuccess}</span>
                </div>
              )}

              {posterCaptureError && (
                <div className="mt-3 flex items-center gap-2.5 p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-medium">{posterCaptureError}</span>
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

            {/* PHẦN 1: KÉO THẢ HOẶC TẢI TRỰC TIẾP NHIỀU FILE LOGO .PNG & XỬ LÝ CANVAS TRẮNG */}
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
