import { useState, useRef, type ChangeEvent, type KeyboardEvent } from 'react';
import {
  AlertCircle,
  Briefcase,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code2,
  Film,
  GraduationCap,
  Laptop,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  SkipBack,
  SkipForward,
  Sparkles,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import type {
  EducationItem,
  ExperienceItem,
  GearSpecSheetData,
  SoftwareToolType,
  SoftwareToolEntry,
  StillsItem,
} from '../../types/portfolio';
import {
  compressImageToWebP,
  formatBytes,
  resolveSafeUploadedImageUrl,
  type CompressionResult,
} from '../../utils/imageCompression';
import { DEFAULT_SOFTWARE_TOOLS } from '../../data/defaultContent';
import {
  renderSoftwareIcon,
  detectSoftware,
  isValidSvg,
  parseToolEntry,
} from '../../utils/softwareIcons';
import {
  formatVideoDuration,
  normalizeDropboxUrl,
  getVideoProxyUrl,
} from '../../utils/videoEmbed';

interface StillsAndGearTabProps {
  stills: StillsItem[];
  gear: GearSpecSheetData;
  tools?: SoftwareToolType[];
  experience?: ExperienceItem[];
  education?: EducationItem[];
  onAddStill: (still: StillsItem) => void;
  onDeleteStill: (id: string) => void;
  onUpdateStills: (stills: StillsItem[]) => void;
  onUpdateGear: (gear: GearSpecSheetData) => void;
  onUpdateTools?: (tools: SoftwareToolType[]) => void;
  onUpdateExperience?: (experience: ExperienceItem[]) => void;
  onUpdateEducation?: (education: EducationItem[]) => void;
}

export function StillsAndGearTab({
  stills,
  gear,
  tools = DEFAULT_SOFTWARE_TOOLS,
  experience = [],
  education = [],
  onAddStill,
  onDeleteStill,
  onUpdateStills,
  onUpdateGear,
  onUpdateTools,
  onUpdateExperience,
  onUpdateEducation,
}: StillsAndGearTabProps) {
  // Stills upload state
  const [newStillAlt, setNewStillAlt] = useState('');
  const [uploadingStill, setUploadingStill] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);
  const [uploadedBatchCount, setUploadedBatchCount] = useState<number | null>(null);
  const [stillCompression, setStillCompression] = useState<CompressionResult | null>(null);
  const [stillUploadError, setStillUploadError] = useState<string | null>(null);

  // Gear item inputs
  const [newCameraItem, setNewCameraItem] = useState('');
  const [newStabilizerItem, setNewStabilizerItem] = useState('');
  const [newAudioItem, setNewAudioItem] = useState('');

  // Software tools input & custom SVG editing
  const [newToolItem, setNewToolItem] = useState('');
  const [newToolSvg, setNewToolSvg] = useState('');
  const [isAddingCustomSvg, setIsAddingCustomSvg] = useState(false);
  const [editingToolIndex, setEditingToolIndex] = useState<number | null>(null);
  const [editingToolName, setEditingToolName] = useState('');
  const [editingToolSvg, setEditingToolSvg] = useState('');

  // Video Frame Extractor State
  const [extractorVideoUrlInput, setExtractorVideoUrlInput] = useState('');
  const [extractorActiveSrc, setExtractorActiveSrc] = useState<string | null>(null);
  const [extractorIsLocalFile, setExtractorIsLocalFile] = useState(false);
  const [extractorIsPlaying, setExtractorIsPlaying] = useState(false);
  const [extractorCurrentTime, setExtractorCurrentTime] = useState(0);
  const [extractorDuration, setExtractorDuration] = useState(0);
  const [extractorCapturing, setExtractorCapturing] = useState(false);
  const [extractorCaptureSuccess, setExtractorCaptureSuccess] = useState<string | null>(null);
  const [extractorError, setExtractorError] = useState<string | null>(null);
  const [extractorFrameTitle, setExtractorFrameTitle] = useState('');
  const [extractorUsingProxy, setExtractorUsingProxy] = useState(false);
  const extractorVideoRef = useRef<HTMLVideoElement>(null);

  // Load video URL into extractor
  const handleLoadExtractorUrl = (urlToLoad?: string) => {
    const targetUrl = (urlToLoad || extractorVideoUrlInput).trim();
    if (!targetUrl) return;

    setExtractorError(null);
    setExtractorCaptureSuccess(null);
    setExtractorIsLocalFile(false);
    setExtractorUsingProxy(false);

    // Direct stream normalization
    const streamUrl = normalizeDropboxUrl(targetUrl);
    setExtractorActiveSrc(streamUrl);
  };

  // Load local video file into extractor
  const handleSelectLocalVideoFile = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const objectUrl = URL.createObjectURL(file);
    setExtractorError(null);
    setExtractorCaptureSuccess(null);
    setExtractorIsLocalFile(true);
    setExtractorUsingProxy(false);
    setExtractorActiveSrc(objectUrl);
    setExtractorFrameTitle(file.name.replace(/\.[^/.]+$/, ''));
  };

  // Precise frame-by-frame stepping (0.04s per 25fps editing standard)
  const handleStepFrame = (offsetSeconds: number) => {
    const video = extractorVideoRef.current;
    if (!video) return;

    video.pause();
    setExtractorIsPlaying(false);
    const newTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + offsetSeconds));
    video.currentTime = newTime;
    setExtractorCurrentTime(newTime);
  };

  // Toggle Play / Pause
  const handleTogglePlayExtractor = () => {
    const video = extractorVideoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
      setExtractorIsPlaying(true);
    } else {
      video.pause();
      setExtractorIsPlaying(false);
    }
  };

  // Capture current frame at native resolution, compress to WebP < 500KB and add to Stills
  const handleCaptureFrameToStills = async () => {
    const video = extractorVideoRef.current;
    if (!video) return;

    try {
      setExtractorCapturing(true);
      setExtractorError(null);
      setExtractorCaptureSuccess(null);

      // Create offscreen canvas at native video dimensions
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

      // Convert canvas to WebP blob
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

      // Direct canvas WebP fallback (0.82)
      const canvasFallbackDataUrl = (() => {
        try {
          const url = canvas.toDataURL('image/webp', 0.82);
          return url && url.startsWith('data:image/') ? url : '';
        } catch {
          return '';
        }
      })();

      // Compress to WebP < 500KB
      const frameTimeStr = formatVideoDuration(video.currentTime);
      const safeTimeName = frameTimeStr.replace(':', '-');
      const tempFile = new File([blob], `frame-${safeTimeName}.webp`, { type: 'image/webp' });
      const compResult = await compressImageToWebP(tempFile, 1920, 500 * 1024);

      const safeInlineFallback = compResult.dataUrl || canvasFallbackDataUrl;

      // Upload to R2 and verify via Image() before accepting the URL
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

      const finalUrl = await resolveSafeUploadedImageUrl(uploadedUrl, safeInlineFallback);

      // Title determination
      const title = extractorFrameTitle.trim() || `Frame at ${frameTimeStr}`;

      const newStill: StillsItem = {
        id: `still-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        src: finalUrl,
        alt: title,
        row: 'top',
        year: new Date().getFullYear().toString(),
      };

      onAddStill(newStill);
      setExtractorCaptureSuccess(
        `Đã chụp và lưu thành công "${title}" (${width}x${height}, ${formatBytes(compResult.compressedSize)} WebP) vào danh sách Stills!`
      );
    } catch (err: unknown) {
      console.error('Frame capture error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);

      // Check if it's CORS security error
      if (
        (errMsg.includes('SecurityError') || errMsg.includes('tainted') || errMsg.includes('cross-origin')) &&
        extractorActiveSrc &&
        !extractorUsingProxy &&
        !extractorIsLocalFile
      ) {
        // Automatically switch to proxy route
        setExtractorUsingProxy(true);
        const proxyUrl = getVideoProxyUrl(extractorActiveSrc);
        setExtractorActiveSrc(proxyUrl);
        setExtractorError('Đang tự động kích hoạt Proxy luồng video để vượt qua giới hạn CORS của Canvas. Vui lòng bấm chụp lại sau 1-2 giây!');
      } else {
        setExtractorError(`Lỗi chụp frame: ${errMsg}`);
      }
    } finally {
      setExtractorCapturing(false);
    }
  };

  // Handle still upload with automatic client-side WebP compression (<500KB) and batch multiple files support
  const handleUploadStill = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);

    try {
      setUploadingStill(true);
      setStillUploadError(null);
      setStillCompression(null);
      setUploadedBatchCount(null);

      let lastCompressionResult: CompressionResult | null = null;
      const baseAlt = newStillAlt.trim();

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        setUploadProgressText(
          fileList.length > 1
            ? `Đang nén & Upload (${i + 1}/${fileList.length}): ${file.name}...`
            : `Đang nén & Upload: ${file.name}...`
        );

        // 1. Compress image to WebP under 500KB on the client
        const result = await compressImageToWebP(file, 1920, 500 * 1024);
        lastCompressionResult = result;

        // 2. Upload to Cloudflare R2 and verify URL loads cleanly as an image
        const formData = new FormData();
        formData.append('file', result.file);

        let uploadedUrl: string | undefined;

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
          console.warn('R2 upload notice, using local WebP preview:', uploadErr);
        }

        const finalUrl = await resolveSafeUploadedImageUrl(uploadedUrl, result.dataUrl);

        // 3. Determine alt/title: if empty, automatically use filename without extension
        const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        let frameTitle = fileNameWithoutExt;
        if (baseAlt) {
          frameTitle = fileList.length > 1 ? `${baseAlt} (${i + 1})` : baseAlt;
        }

        // 4. Add to stills list
        const newStill: StillsItem = {
          id: `still-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          src: finalUrl,
          alt: frameTitle,
          row: 'top',
          year: new Date().getFullYear().toString(),
        };

        onAddStill(newStill);
      }

      setStillCompression(lastCompressionResult);
      setUploadedBatchCount(fileList.length);
      setNewStillAlt('');
    } catch (err: any) {
      setStillUploadError(err?.message || 'Không thể upload ảnh stills');
    } finally {
      setUploadingStill(false);
      setUploadProgressText(null);
      e.target.value = '';
    }
  };

  // Reorder still frames
  const handleMoveStill = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stills.length) return;
    const nextStills = [...stills];
    const [moved] = nextStills.splice(index, 1);
    nextStills.splice(targetIndex, 0, moved);
    onUpdateStills(nextStills);
  };

  // Gear management helpers (100% PRESERVED)
  const handleAddGearItem = (category: keyof GearSpecSheetData, value: string) => {
    if (!value.trim()) return;
    const currentItems = gear[category] || [];
    onUpdateGear({
      ...gear,
      [category]: [...currentItems, value.trim()],
    });
  };

  const handleRemoveGearItem = (category: keyof GearSpecSheetData, indexToRemove: number) => {
    const currentItems = gear[category] || [];
    onUpdateGear({
      ...gear,
      [category]: currentItems.filter((_, idx) => idx !== indexToRemove),
    });
  };

  // Software Tools management helpers (supports both auto icons and user custom SVG code)
  const handleAddToolItem = (nameValue: string, svgValue?: string) => {
    const trimmedName = nameValue.trim();
    if (!trimmedName || !onUpdateTools) return;

    // Check if tool already exists by name
    const exists = tools.some((t) => parseToolEntry(t).name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) return;

    const trimmedSvg = svgValue?.trim();
    const newEntry: SoftwareToolType = trimmedSvg ? { name: trimmedName, customSvg: trimmedSvg } : trimmedName;

    onUpdateTools([...tools, newEntry]);
    setNewToolItem('');
    setNewToolSvg('');
    setIsAddingCustomSvg(false);
  };

  const handleRemoveToolItem = (indexToRemove: number) => {
    if (!onUpdateTools) return;
    onUpdateTools(tools.filter((_, idx) => idx !== indexToRemove));
    if (editingToolIndex === indexToRemove) {
      setEditingToolIndex(null);
    }
  };

  const handleStartEditTool = (index: number) => {
    const entry = parseToolEntry(tools[index]);
    setEditingToolIndex(index);
    setEditingToolName(entry.name);
    setEditingToolSvg(entry.customSvg || '');
  };

  const handleSaveEditTool = () => {
    if (editingToolIndex === null || !onUpdateTools) return;
    const trimmedName = editingToolName.trim();
    if (!trimmedName) return;

    const trimmedSvg = editingToolSvg.trim();
    const updatedEntry: SoftwareToolType = trimmedSvg
      ? { name: trimmedName, customSvg: trimmedSvg }
      : trimmedName;

    const newTools = [...tools];
    newTools[editingToolIndex] = updatedEntry;
    onUpdateTools(newTools);
    setEditingToolIndex(null);
  };

  const handleClearCustomSvgInEdit = () => {
    setEditingToolSvg('');
  };

  const handleResetTools = () => {
    if (!onUpdateTools) return;
    onUpdateTools(DEFAULT_SOFTWARE_TOOLS);
    setEditingToolIndex(null);
  };

  // Experience management helpers
  const handleAddExperience = () => {
    if (!onUpdateExperience) return;
    const newItem: ExperienceItem = {
      id: `exp-${Date.now()}`,
      period: '2025 – Nay',
      role: 'Vị trí đảm nhiệm mới',
      companyOrClients: 'Tên Đơn vị / Agency',
      scope: 'Mô tả đầu việc thực chiến, vai trò sản xuất hoặc hậu kỳ...',
    };
    onUpdateExperience([newItem, ...experience]);
  };

  const handleUpdateExperienceItem = (id: string, partial: Partial<ExperienceItem>) => {
    if (!onUpdateExperience) return;
    onUpdateExperience(
      experience.map((item) => (item.id === id ? { ...item, ...partial } : item))
    );
  };

  const handleDeleteExperience = (id: string) => {
    if (!onUpdateExperience) return;
    onUpdateExperience(experience.filter((item) => item.id !== id));
  };

  // Education management helpers
  const handleAddEducation = () => {
    if (!onUpdateEducation) return;
    const newItem: EducationItem = {
      id: `edu-${Date.now()}`,
      period: '2022 – 2026',
      degree: 'Bằng cấp / Chứng chỉ mới',
      institution: 'Tên trường / Cơ sở đào tạo',
      description: 'Mô tả chuyên ngành hoặc chứng chỉ kỹ thuật...',
    };
    onUpdateEducation([newItem, ...education]);
  };

  const handleUpdateEducationItem = (id: string, partial: Partial<EducationItem>) => {
    if (!onUpdateEducation) return;
    onUpdateEducation(
      education.map((item) => (item.id === id ? { ...item, ...partial } : item))
    );
  };

  const handleDeleteEducation = (id: string) => {
    if (!onUpdateEducation) return;
    onUpdateEducation(education.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-10 w-full">
      {/* SECTION 1: SELECTED FRAMES (INTERACTIVE ACCORDION STILLS) */}
      <section className="bg-white rounded-2xl border border-black/[0.07] p-6 sm:p-8 space-y-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
        <div className="border-b border-black/8 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-bricolage text-lg sm:text-xl font-bold text-[#111111] uppercase tracking-tight">
              1. Quản lý Ảnh Stills (Selected Frames)
            </h2>
            <p className="text-xs text-[#666666] mt-0.5">
              Dải khung hình điện ảnh giãn nở (Interactive Accordion) hiển thị ngay bên dưới Hero.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-black/5 text-[#555555] shrink-0 self-start sm:self-auto">
            Tổng: {stills.length} frames
          </span>
        </div>

        {/* Upload New Frame with WebP Compression (Zero Top/Bot row selection) */}
        <div className="bg-[#F9F9FB] p-4 sm:p-5 rounded-xl border border-black/[0.07] space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
            Thêm ảnh Still / Frame mới (Tự động nén WebP &lt; 500KB)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs items-end">
            <div className="sm:col-span-8 space-y-1">
              <label className="font-medium text-[#444444]">Mô tả / Tên frame</label>
              <input
                type="text"
                value={newStillAlt}
                onChange={(e) => setNewStillAlt(e.target.value)}
                placeholder="VD: TVC neon stage, Sunset car headlights... (hoặc bỏ trống để lấy tên file)"
                className="w-full px-3 py-2.5 rounded-lg bg-white border border-black/10 text-xs text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-2 focus:ring-black/5 transition-all"
              />
            </div>

            <div className="sm:col-span-4 flex flex-col justify-end">
              <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#111111] hover:bg-black/85 text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-98 w-full">
                <Upload className="w-3.5 h-3.5 text-white" />
                <span>
                  {uploadingStill
                    ? uploadProgressText || 'Đang nén & Upload...'
                    : 'Chọn file ảnh để nén & thêm'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploadingStill}
                  onChange={handleUploadStill}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {uploadedBatchCount && uploadedBatchCount > 1 ? (
            <div className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-800 p-2.5 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Đã tự động nén WebP và thêm thành công <strong>{uploadedBatchCount} ảnh Stills</strong> vào dải Accordion (Dưới 500KB chuẩn Cloudflare R2).
              </span>
            </div>
          ) : stillCompression ? (
            <div className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-800 p-2.5 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Đã nén WebP: {formatBytes(stillCompression.originalSize)} →{' '}
                <strong>{formatBytes(stillCompression.compressedSize)}</strong> (Giảm{' '}
                {stillCompression.savingsPercent}%, dưới 500KB sẵn sàng đưa vào gallery).
              </span>
            </div>
          ) : null}

          {stillUploadError && (
            <div className="flex items-center gap-2 text-xs bg-amber-50 text-amber-800 p-2.5 rounded-lg border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{stillUploadError}</span>
            </div>
          )}
        </div>

        {/* Trích xuất & Chụp Frame trực tiếp từ Link Video Dropbox / MP4 */}
        <div className="bg-[#F9F9FB] p-4 sm:p-5 rounded-xl border border-black/[0.07] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#2563EB]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                Trích xuất &amp; Chụp Frame trực tiếp từ Link Video Dropbox
              </h3>
            </div>
            {extractorActiveSrc && (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0 self-start sm:self-auto">
                {extractorIsLocalFile
                  ? 'File Video từ máy'
                  : extractorUsingProxy
                  ? 'Video qua Proxy CORS'
                  : 'Direct Stream MP4'}
              </span>
            )}
          </div>

          <p className="text-xs text-[#666666]">
            Dán link video Dropbox hoặc chọn file MP4 từ máy. Tua chính xác từng khung hình (1 frame = 0.04s) và bấm chụp để tự động nén WebP dưới 500KB lưu thẳng vào dải ảnh Stills.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs items-end">
            <div className="sm:col-span-8 space-y-1">
              <label className="font-medium text-[#444444]">Dán link video Dropbox (hoặc link MP4 trực tiếp)</label>
              <input
                type="text"
                value={extractorVideoUrlInput}
                onChange={(e) => setExtractorVideoUrlInput(e.target.value)}
                placeholder="VD: https://www.dropbox.com/scl/fi/.../video.mp4?rlkey=... hoặc link MP4"
                className="w-full px-3 py-2.5 rounded-lg bg-white border border-black/10 text-xs text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-2 focus:ring-black/5 transition-all font-mono"
              />
            </div>

            <div className="sm:col-span-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleLoadExtractorUrl()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-98"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Tải Video</span>
              </button>

              <label
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-white border border-black/15 hover:bg-black/5 text-[#222222] text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-98 whitespace-nowrap"
                title="Chọn file video từ máy để không tốn băng thông mạng"
              >
                <Film className="w-3.5 h-3.5 text-[#555555]" />
                <span>Chọn File</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleSelectLocalVideoFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Player, Scrubber & Frame Stepper */}
          {extractorActiveSrc && (
            <div className="space-y-3 pt-3 border-t border-black/8">
              {/* 16:9 Video Player Viewport */}
              <div className="relative aspect-video max-h-[380px] mx-auto bg-black rounded-xl overflow-hidden shadow-inner border border-black/15 flex items-center justify-center">
                <video
                  ref={extractorVideoRef}
                  src={extractorActiveSrc}
                  crossOrigin="anonymous"
                  playsInline
                  preload="metadata"
                  onTimeUpdate={(e) => setExtractorCurrentTime(e.currentTarget.currentTime)}
                  onDurationChange={(e) => setExtractorDuration(e.currentTarget.duration)}
                  onPlay={() => setExtractorIsPlaying(true)}
                  onPause={() => setExtractorIsPlaying(false)}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Scrubber Controls */}
              <div className="space-y-2 bg-white p-3 rounded-lg border border-black/8">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTogglePlayExtractor}
                    className="p-2 rounded-lg bg-black/5 hover:bg-black/10 text-[#111111] transition-colors cursor-pointer"
                    title={extractorIsPlaying ? 'Tạm dừng' : 'Phát'}
                  >
                    {extractorIsPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5" />
                    )}
                  </button>

                  <input
                    type="range"
                    min={0}
                    max={extractorDuration || 100}
                    step={0.04}
                    value={extractorCurrentTime}
                    onChange={(e) => {
                      const newTime = parseFloat(e.target.value);
                      if (extractorVideoRef.current) {
                        extractorVideoRef.current.currentTime = newTime;
                      }
                      setExtractorCurrentTime(newTime);
                    }}
                    className="flex-1 accent-[#2563EB] cursor-pointer"
                  />

                  <div className="text-[11px] font-mono font-semibold text-[#555555] whitespace-nowrap">
                    {formatVideoDuration(extractorCurrentTime)} / {formatVideoDuration(extractorDuration)}
                  </div>
                </div>

                {/* Frame stepping buttons & Capture CTA */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/5">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStepFrame(-0.04)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-black/5 hover:bg-black/10 text-xs font-medium text-[#222222] transition-colors cursor-pointer"
                      title="Lùi 1 Frame (0.04 giây)"
                    >
                      <SkipBack className="w-3.5 h-3.5 text-[#555555]" />
                      <span>-1 Frame (0.04s)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStepFrame(0.04)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-black/5 hover:bg-black/10 text-xs font-medium text-[#222222] transition-colors cursor-pointer"
                      title="Tiến 1 Frame (0.04 giây)"
                    >
                      <span>+1 Frame (0.04s)</span>
                      <SkipForward className="w-3.5 h-3.5 text-[#555555]" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-1 sm:max-w-md justify-end">
                    <input
                      type="text"
                      value={extractorFrameTitle}
                      onChange={(e) => setExtractorFrameTitle(e.target.value)}
                      placeholder={`Mô tả / Tên frame (VD: Frame at ${formatVideoDuration(extractorCurrentTime)})`}
                      className="w-full px-2.5 py-1.5 rounded-md bg-[#F9F9FB] border border-black/10 text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                    />

                    <button
                      type="button"
                      disabled={extractorCapturing}
                      onClick={handleCaptureFrameToStills}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#111111] hover:bg-black/85 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-98"
                    >
                      <Camera className="w-3.5 h-3.5 text-white" />
                      <span>{extractorCapturing ? 'Đang chụp...' : '📸 Chụp Frame này & Thêm vào Stills'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {extractorCaptureSuccess && (
            <div className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-800 p-2.5 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{extractorCaptureSuccess}</span>
            </div>
          )}

          {extractorError && (
            <div className="flex items-center gap-2 text-xs bg-amber-50 text-amber-800 p-2.5 rounded-lg border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{extractorError}</span>
            </div>
          )}
        </div>

        {/* Current Stills Grid (Numbered Frame 01, Frame 02, reorderable, no Top/Bot labels) */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
            {stills.map((still, idx) => (
              <div
                key={still.id}
                className="group relative aspect-[16/10] rounded-xl overflow-hidden bg-black border border-black/10 shadow-2xs"
              >
                <img
                  src={still.src}
                  alt={still.alt}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Always-visible top-left Frame index badge */}
                <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-[#111111]/90 backdrop-blur-md text-white text-[10px] font-bold tabular-nums shadow-sm border border-white/15">
                  Frame {String(idx + 1).padStart(2, '0')}
                </div>

                {/* Hover overlay with action controls (Reorder Left, Reorder Right, Delete) */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/70 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between z-20">
                  <div className="flex items-center justify-end gap-1">
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => handleMoveStill(idx, 'left')}
                        className="p-1 rounded-md bg-white/20 text-white hover:bg-white/40 transition-colors shadow-xs cursor-pointer"
                        title="Dời sang trái"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {idx < stills.length - 1 && (
                      <button
                        type="button"
                        onClick={() => handleMoveStill(idx, 'right')}
                        className="p-1 rounded-md bg-white/20 text-white hover:bg-white/40 transition-colors shadow-xs cursor-pointer"
                        title="Dời sang phải"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteStill(still.id)}
                      className="p-1 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors shadow-xs cursor-pointer ml-1"
                      title="Xóa frame này"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-[10px] text-white">
                    <span className="block font-bold line-clamp-1">{still.alt}</span>
                    <span className="text-white/60">Accordion Frame</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 2: GEAR SPEC SHEET (THIẾT BỊ TÁC NGHIỆP CÁ NHÂN) - 100% PRESERVED */}
      <section className="bg-white rounded-2xl border border-black/[0.07] p-6 sm:p-8 space-y-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
        <div className="border-b border-black/8 pb-4">
          <h2 className="font-bricolage text-lg sm:text-xl font-bold text-[#111111] uppercase tracking-tight">
            2. Thiết bị tác nghiệp cá nhân (Gear Spec Sheet)
          </h2>
          <p className="text-xs text-[#666666] mt-0.5">
            Quản lý các thẻ thiết bị (badges) hiển thị tại dải thông số kỹ thuật ngang ở cuối mục Hồ sơ.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Camera & Lens */}
          <div className="space-y-3 bg-[#FAFAFC] p-4 rounded-xl border border-black/[0.08] flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                  Camera &amp; Lens
                </h3>
                <span className="text-[10px] text-[#777777] font-semibold">
                  {gear.cameraAndLens.length} món
                </span>
              </div>

              {/* Tag list */}
              <div className="flex flex-wrap gap-1.5">
                {gear.cameraAndLens.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-black/10 text-xs font-bold text-[#111111] shadow-[0_1px_2px_rgba(0,0,0,0.03)] group"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveGearItem('cameraAndLens', idx)}
                      className="text-[#999999] hover:text-red-600 transition-colors cursor-pointer"
                      title="Xóa thiết bị"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Add tag input */}
            <div className="pt-2 border-t border-black/6 flex items-center gap-1.5">
              <input
                type="text"
                value={newCameraItem}
                onChange={(e) => setNewCameraItem(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddGearItem('cameraAndLens', newCameraItem);
                    setNewCameraItem('');
                  }
                }}
                placeholder="Thêm lens / body mới..."
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-white border border-black/10 text-xs text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-2 focus:ring-black/5 transition-all"
              />
              <button
                type="button"
                onClick={() => {
                  handleAddGearItem('cameraAndLens', newCameraItem);
                  setNewCameraItem('');
                }}
                className="p-1.5 rounded-lg bg-[#111111] text-white hover:bg-black/80 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Column 2: Chống rung */}
          <div className="space-y-3 bg-[#FAFAFC] p-4 rounded-xl border border-black/[0.08] flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                  Chống rung
                </h3>
                <span className="text-[10px] text-[#777777] font-semibold">
                  {gear.stabilizer.length} món
                </span>
              </div>

              {/* Tag list */}
              <div className="flex flex-wrap gap-1.5">
                {gear.stabilizer.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-black/10 text-xs font-bold text-[#111111] shadow-[0_1px_2px_rgba(0,0,0,0.03)] group"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveGearItem('stabilizer', idx)}
                      className="text-[#999999] hover:text-red-600 transition-colors cursor-pointer"
                      title="Xóa thiết bị"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Add tag input */}
            <div className="pt-2 border-t border-black/6 flex items-center gap-1.5">
              <input
                type="text"
                value={newStabilizerItem}
                onChange={(e) => setNewStabilizerItem(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddGearItem('stabilizer', newStabilizerItem);
                    setNewStabilizerItem('');
                  }
                }}
                placeholder="Thêm gimbal / phụ kiện..."
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-white border border-black/10 text-xs text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-2 focus:ring-black/5 transition-all"
              />
              <button
                type="button"
                onClick={() => {
                  handleAddGearItem('stabilizer', newStabilizerItem);
                  setNewStabilizerItem('');
                }}
                className="p-1.5 rounded-lg bg-[#111111] text-white hover:bg-black/80 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Column 3: Thu âm & Ánh sáng */}
          <div className="space-y-3 bg-[#FAFAFC] p-4 rounded-xl border border-black/[0.08] flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                  Thu âm &amp; Ánh sáng
                </h3>
                <span className="text-[10px] text-[#777777] font-semibold">
                  {gear.audioAndLight.length} món
                </span>
              </div>

              {/* Tag list */}
              <div className="flex flex-wrap gap-1.5">
                {gear.audioAndLight.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-black/10 text-xs font-bold text-[#111111] shadow-[0_1px_2px_rgba(0,0,0,0.03)] group"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveGearItem('audioAndLight', idx)}
                      className="text-[#999999] hover:text-red-600 transition-colors cursor-pointer"
                      title="Xóa thiết bị"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Add tag input */}
            <div className="pt-2 border-t border-black/6 flex items-center gap-1.5">
              <input
                type="text"
                value={newAudioItem}
                onChange={(e) => setNewAudioItem(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddGearItem('audioAndLight', newAudioItem);
                    setNewAudioItem('');
                  }
                }}
                placeholder="Thêm micro / filter..."
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-white border border-black/10 text-xs text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-2 focus:ring-black/5 transition-all"
              />
              <button
                type="button"
                onClick={() => {
                  handleAddGearItem('audioAndLight', newAudioItem);
                  setNewAudioItem('');
                }}
                className="p-1.5 rounded-lg bg-[#111111] text-white hover:bg-black/80 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: CÔNG CỤ PHẦN MỀM CHUYÊN DỤNG */}
      <section className="bg-white rounded-2xl border border-black/[0.07] p-6 sm:p-8 space-y-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
        <div className="border-b border-black/8 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Laptop className="w-4 h-4 text-[#2563EB]" />
              <h2 className="font-bricolage text-lg sm:text-xl font-bold text-[#111111] uppercase tracking-tight">
                3. Công cụ phần mềm chuyên dụng
              </h2>
            </div>
            <p className="text-xs text-[#666666] mt-0.5">
              Quản lý các thẻ phần mềm (badges) hiển thị tại mục Năng lực thực chiến cho Agency ngoài trang chủ.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetTools}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/10 bg-[#F9F9FB] hover:bg-black/5 text-xs font-semibold text-[#555555] hover:text-[#111111] transition-all cursor-pointer self-start sm:self-auto"
            title="Khôi phục 5 phần mềm chuẩn"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi phục chuẩn 5 phần mềm</span>
          </button>
        </div>

        <div className="bg-[#FAFAFC] p-5 rounded-xl border border-black/[0.08] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#111111]">
              Danh sách phần mềm đang kích hoạt ({tools.length})
            </span>
            <span className="text-[11px] text-[#777777]">
              Hỗ trợ tự động nhận diện hoặc tùy chỉnh dán mã SVG riêng
            </span>
          </div>

          {/* Software pills list */}
          <div className="flex flex-wrap gap-2">
            {tools.map((tool, idx) => {
              const entry = parseToolEntry(tool);
              const isEditing = editingToolIndex === idx;
              const hasCustomSvg = Boolean(entry.customSvg && isValidSvg(entry.customSvg));

              return (
                <div
                  key={idx}
                  className={`inline-flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs group ${
                    isEditing
                      ? 'bg-blue-50 border-[#2563EB] text-[#2563EB] ring-2 ring-[#2563EB]/20'
                      : hasCustomSvg
                      ? 'bg-white border-[#2563EB]/40 text-[#111111] hover:border-[#2563EB]'
                      : 'bg-white border-black/10 text-[#111111] hover:border-black/25'
                  }`}
                >
                  <span className="shrink-0">{renderSoftwareIcon(entry.name, 'sm', '', entry.customSvg)}</span>
                  <span className="truncate max-w-[170px]">{entry.name}</span>

                  {hasCustomSvg && (
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded bg-[#2563EB]/10 text-[#2563EB] font-bold tracking-tight uppercase shrink-0"
                      title="Đang dùng mã icon SVG tùy chỉnh"
                    >
                      SVG
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => (isEditing ? setEditingToolIndex(null) : handleStartEditTool(idx))}
                    className="p-1 rounded-md hover:bg-black/5 text-black/50 hover:text-[#2563EB] transition-colors cursor-pointer ml-0.5 shrink-0"
                    title="Tùy chỉnh mã SVG hoặc đổi tên"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveToolItem(idx)}
                    className="p-1 rounded-md hover:bg-red-50 text-black/40 hover:text-red-600 transition-colors cursor-pointer text-sm leading-none shrink-0"
                    title={`Xóa ${entry.name}`}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          {/* Inline Custom SVG & Tool Name Editor */}
          {editingToolIndex !== null && (
            <div className="p-4 sm:p-5 rounded-xl bg-white border border-[#2563EB]/30 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-black/8 pb-3">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-[#2563EB]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                    Tùy chỉnh Icon SVG &amp; Tên phần mềm: <span className="text-[#2563EB]">{editingToolName}</span>
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingToolIndex(null)}
                  className="text-black/40 hover:text-black/80 text-sm font-bold cursor-pointer"
                  title="Đóng bảng sửa"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                {/* Cột trái: Tên & Mã SVG */}
                <div className="md:col-span-8 space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-black/60 mb-1">
                      Tên phần mềm hiển thị
                    </label>
                    <input
                      type="text"
                      value={editingToolName}
                      onChange={(e) => setEditingToolName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#F9F9FB] border border-black/10 text-xs font-bold text-[#111111] focus:bg-white focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-black/60">
                        Mã Icon SVG tùy chỉnh (&lt;svg ...&gt;)
                      </label>
                      {editingToolSvg.trim() && (
                        <button
                          type="button"
                          onClick={handleClearCustomSvgInEdit}
                          className="text-[11px] text-red-600 hover:underline font-semibold cursor-pointer"
                        >
                          Gỡ mã SVG (Quay về icon tự động)
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={5}
                      value={editingToolSvg}
                      onChange={(e) => setEditingToolSvg(e.target.value)}
                      placeholder='Dán toàn bộ mã SVG tại đây, ví dụ: <svg viewBox="0 0 24 24" ...>...</svg>'
                      className="w-full px-3 py-2 rounded-lg bg-[#F9F9FB] border border-black/10 font-mono text-[11px] text-[#111111] focus:bg-white focus:outline-none focus:border-[#2563EB] resize-y"
                    />
                    <p className="text-[11px] text-black/50 mt-1">
                      Hỗ trợ dán mã SVG trực tiếp. Nếu để trống, hệ thống sẽ tự động tìm và gắn icon chính hãng theo tên phần mềm.
                    </p>
                  </div>
                </div>

                {/* Cột phải: Khung xem trước icon thực tế */}
                <div className="md:col-span-4 p-4 rounded-xl bg-[#F9F9FB] border border-black/8 space-y-3 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-black/50">
                    Xem trước Icon thực tế
                  </span>

                  <div className="w-14 h-14 rounded-2xl bg-white border border-black/10 flex items-center justify-center p-2.5 shadow-xs">
                    {renderSoftwareIcon(editingToolName || 'Tool', 'lg', '', editingToolSvg.trim() || undefined)}
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-bold text-[#111111] block truncate max-w-[180px]">
                      {editingToolName || 'Tên phần mềm'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full inline-block font-semibold bg-black/5 text-black/60">
                      {editingToolSvg.trim() && isValidSvg(editingToolSvg)
                        ? '✓ Mã SVG tùy chỉnh'
                        : 'Tự động theo tên'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/8">
                <button
                  type="button"
                  onClick={() => setEditingToolIndex(null)}
                  className="px-3 py-1.5 rounded-lg border border-black/10 text-xs font-semibold text-black/70 hover:bg-black/5 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditTool}
                  className="px-4 py-1.5 rounded-lg bg-[#2563EB] text-white hover:bg-blue-700 text-xs font-bold shadow-xs cursor-pointer"
                >
                  Lưu thay đổi thẻ này
                </button>
              </div>
            </div>
          )}

          {/* Add software tool input with optional custom SVG drawer */}
          <div className="pt-3 border-t border-black/8 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-xl">
              <input
                type="text"
                value={newToolItem}
                onChange={(e) => setNewToolItem(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter' && !isAddingCustomSvg) {
                    e.preventDefault();
                    handleAddToolItem(newToolItem, newToolSvg);
                  }
                }}
                placeholder="VD: Adobe Premiere Pro, Blender, Unreal Engine..."
                className="flex-1 px-3 py-2 rounded-lg bg-white border border-black/10 text-xs text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-2 focus:ring-black/5 transition-all"
              />

              <button
                type="button"
                onClick={() => setIsAddingCustomSvg(!isAddingCustomSvg)}
                className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
                  isAddingCustomSvg || newToolSvg.trim()
                    ? 'bg-[#2563EB]/10 border-[#2563EB] text-[#2563EB]'
                    : 'bg-white border-black/10 text-black/70 hover:border-black/25'
                }`}
                title="Dán mã icon SVG tùy chỉnh cho phần mềm này"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{isAddingCustomSvg ? 'Thu gọn mã SVG' : '+ Thêm mã SVG riêng'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddToolItem(newToolItem, newToolSvg)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#111111] text-white hover:bg-black/80 text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm thẻ</span>
              </button>
            </div>

            {/* Expandable Custom SVG Box when adding */}
            {isAddingCustomSvg && (
              <div className="p-3.5 rounded-xl bg-white border border-black/10 space-y-2 max-w-xl shadow-xs">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-black/60 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-[#2563EB]" />
                    Dán mã SVG tùy chỉnh cho "{newToolItem || 'phần mềm mới'}"
                  </label>
                  {newToolSvg.trim() && (
                    <button
                      type="button"
                      onClick={() => setNewToolSvg('')}
                      className="text-[10px] text-red-600 hover:underline font-semibold cursor-pointer"
                    >
                      Xóa mã SVG
                    </button>
                  )}
                </div>

                <textarea
                  rows={3}
                  value={newToolSvg}
                  onChange={(e) => setNewToolSvg(e.target.value)}
                  placeholder='Dán toàn bộ mã SVG tại đây, ví dụ: <svg viewBox="0 0 24 24" ...>...</svg>'
                  className="w-full px-3 py-2 rounded-lg bg-[#F9F9FB] border border-black/10 font-mono text-[11px] text-[#111111] focus:bg-white focus:outline-none focus:border-[#2563EB] resize-y"
                />

                {newToolSvg.trim().length > 0 && (
                  <div className="flex items-center gap-2 pt-1 text-xs">
                    <span className="text-[11px] text-black/50">Xem trước icon:</span>
                    <span className="p-1 rounded-md bg-[#F9F9FB] border border-black/10 inline-flex items-center justify-center">
                      {renderSoftwareIcon(newToolItem || 'Tool', 'sm', '', newToolSvg)}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-600">
                      {isValidSvg(newToolSvg) ? '✓ Mã SVG hợp lệ' : '⚠️ Vui lòng dán thẻ <svg>...</svg> đầy đủ'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Live auto-detection feedback (when not using custom SVG) */}
            {newToolItem.trim().length > 0 && !newToolSvg.trim() && (
              <div className="flex items-center gap-2 text-xs text-[#555555]">
                <span className="text-[11px] text-[#777777]">Tự động nhận diện:</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-black/10 font-bold text-[#111111] shadow-2xs">
                  {renderSoftwareIcon(newToolItem, 'sm')}
                  <span>{detectSoftware(newToolItem).canonicalName}</span>
                </span>
              </div>
            )}

            {/* Quick-add popular suggestions */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-[#666666]">
              <span className="text-[11px] text-[#888888]">Gợi ý thêm nhanh:</span>
              {[
                'Adobe Premiere Pro',
                'Final Cut Pro',
                'Blender',
                'Cinema 4D',
                'Adobe Audition',
                'Adobe Media Encoder',
                'Adobe Lightroom',
                'Figma',
              ]
                .filter((preset) => !tools.some((t) => parseToolEntry(t).name.toLowerCase() === preset.toLowerCase()))
                .slice(0, 5)
                .map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleAddToolItem(preset)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-black/10 hover:border-black/25 text-[11px] font-medium text-[#333333] hover:text-[#111111] transition-all cursor-pointer shadow-2xs active:scale-98"
                  >
                    {renderSoftwareIcon(preset, 'xs')}
                    <span>+ {preset}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: KINH NGHIỆM LÀM VIỆC */}
      <section className="bg-white rounded-2xl border border-black/[0.07] p-6 sm:p-8 space-y-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
        <div className="border-b border-black/8 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#2563EB]" />
              <h2 className="font-bricolage text-lg sm:text-xl font-bold text-[#111111] uppercase tracking-tight">
                4. Kinh nghiệm làm việc
              </h2>
            </div>
            <p className="text-xs text-[#666666] mt-0.5">
              Hơn 5 năm kinh nghiệm thực chiến cùng Agency &amp; Production House tại TP. Hồ Chí Minh.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddExperience}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer self-start sm:self-auto active:scale-98"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm cột mốc kinh nghiệm</span>
          </button>
        </div>

        <div className="space-y-4">
          {experience.map((exp, idx) => (
            <div
              key={exp.id || idx}
              className="p-5 rounded-xl bg-[#FAFAFC] border border-black/[0.08] space-y-4 relative group"
            >
              <div className="flex items-center justify-between border-b border-black/6 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                  <span className="font-bricolage text-xs font-bold uppercase tracking-wider text-[#111111]">
                    Cột mốc #{String(idx + 1).padStart(2, '0')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteExperience(exp.id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
                  title="Xóa cột mốc này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-4 space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3F3F46]">
                    Mốc thời gian
                  </label>
                  <input
                    type="text"
                    value={exp.period}
                    onChange={(e) => handleUpdateExperienceItem(exp.id, { period: e.target.value })}
                    placeholder="2024 – Nay"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-black/10 text-xs font-bold text-[#2563EB] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all tabular-nums"
                  />
                </div>

                <div className="sm:col-span-8 space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3F3F46]">
                    Vị trí đảm nhiệm
                  </label>
                  <input
                    type="text"
                    value={exp.role}
                    onChange={(e) => handleUpdateExperienceItem(exp.id, { role: e.target.value })}
                    placeholder="Senior Video Editor & Motion Designer"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-black/10 text-xs font-semibold text-[#111113] focus:outline-none focus:border-[#111111] focus:ring-2 focus:ring-black/5 transition-all"
                  />
                </div>

                <div className="sm:col-span-12 space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3F3F46]">
                    Đơn vị công tác / Agency
                  </label>
                  <input
                    type="text"
                    value={exp.companyOrClients}
                    onChange={(e) =>
                      handleUpdateExperienceItem(exp.id, { companyOrClients: e.target.value })
                    }
                    placeholder="Creative Agencies & Production Houses tại TP.HCM"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-black/10 text-xs font-medium text-[#3F3F46] focus:outline-none focus:border-[#111111] focus:ring-2 focus:ring-black/5 transition-all"
                  />
                </div>

                <div className="sm:col-span-12 space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3F3F46]">
                    Mô tả phạm vi công việc
                  </label>
                  <textarea
                    rows={2}
                    value={exp.scope}
                    onChange={(e) => handleUpdateExperienceItem(exp.id, { scope: e.target.value })}
                    placeholder="Phối hợp cùng Creative Director và Art Director bàn giao master TVC, cutdown 9:16..."
                    className="w-full px-3 py-2 rounded-lg bg-white border border-black/10 text-xs text-[#71717A] leading-relaxed focus:outline-none focus:border-[#111111] focus:ring-2 focus:ring-black/5 transition-all resize-y"
                  />
                </div>
              </div>
            </div>
          ))}

          {experience.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-black/10 rounded-xl text-xs text-black/50">
              Chưa có cột mốc kinh nghiệm nào. Bấm nút phía trên để thêm mới.
            </div>
          )}
        </div>
      </section>

      {/* SECTION 5: HỌC VẤN & ĐÀO TẠO */}
      <section className="bg-white rounded-2xl border border-black/[0.07] p-6 sm:p-8 space-y-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
        <div className="border-b border-black/8 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#2563EB]" />
              <h2 className="font-bricolage text-lg sm:text-xl font-bold text-[#111111] uppercase tracking-tight">
                5. Học vấn &amp; Đào tạo
              </h2>
            </div>
            <p className="text-xs text-[#666666] mt-0.5">
              Nền tảng thiết kế thị giác bài bản kết hợp chứng chỉ công nghệ hình ảnh chuẩn quốc tế.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddEducation}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer self-start sm:self-auto active:scale-98"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm học vấn / chứng chỉ</span>
          </button>
        </div>

        <div className="space-y-4">
          {education.map((edu, idx) => (
            <div
              key={edu.id || idx}
              className="p-5 rounded-xl bg-[#FAFAFC] border border-black/[0.08] space-y-4 relative group"
            >
              <div className="flex items-center justify-between border-b border-black/6 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                  <span className="font-bricolage text-xs font-bold uppercase tracking-wider text-[#111111]">
                    Học vấn #{String(idx + 1).padStart(2, '0')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteEducation(edu.id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
                  title="Xóa học vấn này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-4 space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3F3F46]">
                    Niên khóa / Năm
                  </label>
                  <input
                    type="text"
                    value={edu.period}
                    onChange={(e) => handleUpdateEducationItem(edu.id, { period: e.target.value })}
                    placeholder="2018 – 2022"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-black/10 text-xs font-bold text-[#2563EB] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all tabular-nums"
                  />
                </div>

                <div className="sm:col-span-8 space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3F3F46]">
                    Bằng cấp / Chứng chỉ
                  </label>
                  <input
                    type="text"
                    value={edu.degree}
                    onChange={(e) => handleUpdateEducationItem(edu.id, { degree: e.target.value })}
                    placeholder="Cử nhân Thiết kế Đồ họa & Truyền thông Đa phương tiện"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-black/10 text-xs font-semibold text-[#111113] focus:outline-none focus:border-[#111111] focus:ring-2 focus:ring-black/5 transition-all"
                  />
                </div>

                <div className="sm:col-span-12 space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3F3F46]">
                    Trường / Cơ sở đào tạo (Sửa trực tiếp tên trường tại đây)
                  </label>
                  <input
                    type="text"
                    value={edu.institution}
                    onChange={(e) =>
                      handleUpdateEducationItem(edu.id, { institution: e.target.value })
                    }
                    placeholder="Đại học Kiến Trúc TP.HCM (hoặc [Tên trường Đại học của bạn])"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-black/10 text-xs font-medium text-[#3F3F46] focus:outline-none focus:border-[#111111] focus:ring-2 focus:ring-black/5 transition-all"
                  />
                </div>

                <div className="sm:col-span-12 space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3F3F46]">
                    Mô tả chi tiết chuyên ngành
                  </label>
                  <textarea
                    rows={2}
                    value={edu.description}
                    onChange={(e) =>
                      handleUpdateEducationItem(edu.id, { description: e.target.value })
                    }
                    placeholder="Chuyên ngành Đồ họa động, Tư duy bố cục & Typography..."
                    className="w-full px-3 py-2 rounded-lg bg-white border border-black/10 text-xs text-[#71717A] leading-relaxed focus:outline-none focus:border-[#111111] focus:ring-2 focus:ring-black/5 transition-all resize-y"
                  />
                </div>
              </div>
            </div>
          ))}

          {education.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-black/10 rounded-xl text-xs text-black/50">
              Chưa có thông tin học vấn nào. Bấm nút phía trên để thêm mới.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
