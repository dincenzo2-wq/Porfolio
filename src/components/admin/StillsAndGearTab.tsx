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
  Image as ImageIcon,
  Laptop,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  X,
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
import {
  filterValidImageFiles,
  generateFrameTitle,
  createStillsItem,
  mergeNewStillsWithExisting,
} from '../../utils/stillsBatchLogic';
import { DEFAULT_SOFTWARE_TOOLS } from '../../data/defaultContent';
import {
  renderSoftwareIcon,
  detectSoftware,
  isValidSvg,
  parseToolEntry,
} from '../../utils/softwareIcons';

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
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number>(0);
  const [uploadedBatchStats, setUploadedBatchStats] = useState<{
    count: number;
    originalBytes: number;
    compressedBytes: number;
    savingsPercent: number;
  } | null>(null);
  const [stillUploadError, setStillUploadError] = useState<string | null>(null);

  // Stills inline rename state
  const [editingStillId, setEditingStillId] = useState<string | null>(null);
  const [editingStillTitle, setEditingStillTitle] = useState('');

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

  // Stills Drag & Drop State & Refs
  const [isDraggingStills, setIsDraggingStills] = useState(false);
  const stillDragDepthRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core handler: process and upload still files to Cloudflare R2 with WebP compression
  const handleProcessAndUploadStillFiles = async (fileList: File[]) => {
    if (!fileList || fileList.length === 0) return;

    // Filter valid image files using dedicated utility
    const validFiles = filterValidImageFiles(fileList);

    if (validFiles.length === 0) {
      setStillUploadError(
        'Không tìm thấy file ảnh hợp lệ. Vui lòng chọn hoặc kéo thả file ảnh (.jpg, .png, .webp, .avif, .heic).'
      );
      return;
    }

    try {
      setUploadingStill(true);
      setStillUploadError(null);
      setUploadedBatchStats(null);
      setUploadProgressPercent(0);

      const baseAlt = newStillAlt.trim();
      const newStillsBatch: StillsItem[] = [];
      const failedFileNames: string[] = [];
      let totalOriginalBytes = 0;
      let totalCompressedBytes = 0;

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const stepPercent = Math.round(((i) / validFiles.length) * 100);
        setUploadProgressPercent(stepPercent);
        setUploadProgressText(
          validFiles.length > 1
            ? `[${i + 1}/${validFiles.length}] Đang nén WebP & tải lên Cloudflare R2: ${file.name}...`
            : `Đang nén WebP & tải lên Cloudflare R2: ${file.name}...`
        );

        try {
          // 1. Compress image to WebP under 500KB on the client
          const result = await compressImageToWebP(file, 1920, 500 * 1024);
          totalOriginalBytes += result.originalSize;
          totalCompressedBytes += result.compressedSize;

          // 2. Upload to Cloudflare R2 endpoint /api/upload
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
          const frameTitle = generateFrameTitle(file.name, baseAlt, i, validFiles.length);

          // 4. Create complete StillsItem with both title and alt set
          const newStill = createStillsItem({
            id: `still-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
            src: finalUrl,
            title: frameTitle,
          });

          newStillsBatch.push(newStill);
        } catch (fileErr) {
          console.error(`Lỗi khi xử lý file ${file.name}:`, fileErr);
          failedFileNames.push(file.name);
        }
      }

      setUploadProgressPercent(100);

      // 5. Merge new stills into the gallery in natural order (Frame 01, Frame 02...)
      if (newStillsBatch.length > 0) {
        const mergedStills = mergeNewStillsWithExisting(newStillsBatch, stills);
        onUpdateStills(mergedStills);

        const savingsPercent = totalOriginalBytes > 0
          ? Math.max(0, Math.round(((totalOriginalBytes - totalCompressedBytes) / totalOriginalBytes) * 100))
          : 0;

        setUploadedBatchStats({
          count: newStillsBatch.length,
          originalBytes: totalOriginalBytes,
          compressedBytes: totalCompressedBytes,
          savingsPercent,
        });

        setNewStillAlt('');
      }

      if (failedFileNames.length > 0) {
        setStillUploadError(
          `Không thể xử lý ${failedFileNames.length} file: ${failedFileNames.join(', ')}. Các file còn lại đã được tải lên thành công.`
        );
      }
    } catch (err: unknown) {
      console.error('Lỗi khi tải ảnh stills lên Cloudflare R2:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setStillUploadError(errMsg || 'Không thể upload ảnh stills lên Cloudflare R2');
    } finally {
      setUploadingStill(false);
      setUploadProgressText(null);
      setUploadProgressPercent(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle still upload from file input
  const handleUploadStill = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await handleProcessAndUploadStillFiles(Array.from(files));
    e.target.value = '';
  };

  const handleStillDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    stillDragDepthRef.current += 1;
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    setIsDraggingStills(true);
  };

  const handleStillDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    if (!isDraggingStills) setIsDraggingStills(true);
  };

  const handleStillDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    stillDragDepthRef.current = Math.max(0, stillDragDepthRef.current - 1);
    if (stillDragDepthRef.current === 0) {
      setIsDraggingStills(false);
    }
  };

  const handleStillDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    stillDragDepthRef.current = 0;
    setIsDraggingStills(false);
    if (uploadingStill) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await handleProcessAndUploadStillFiles(Array.from(files));
    }
  };

  // Delete still frame with optional R2 asset cleanup
  const handleDeleteStillWithCleanup = (still: StillsItem) => {
    if (still.src && (still.src.includes('/uploads/') || still.src.includes('/media/'))) {
      fetch(`/api/upload?url=${encodeURIComponent(still.src)}`, { method: 'DELETE' }).catch(() => {});
    }
    onDeleteStill(still.id);
  };

  // Inline rename handlers for Stills
  const handleStartEditStill = (still: StillsItem) => {
    setEditingStillId(still.id);
    setEditingStillTitle(still.title || still.alt || '');
  };

  const handleSaveEditStill = () => {
    if (!editingStillId) return;
    const trimmed = editingStillTitle.trim();
    if (!trimmed) {
      setEditingStillId(null);
      return;
    }
    const updated = stills.map((s) =>
      s.id === editingStillId ? { ...s, title: trimmed, alt: trimmed } : s
    );
    onUpdateStills(updated);
    setEditingStillId(null);
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
      {/* SECTION 1: SELECTED FRAMES (16:9 CINEMA ARCWAVE CAROUSEL) */}
      <section className="bg-white rounded-2xl border border-black/[0.07] p-6 sm:p-8 space-y-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
        <div className="border-b border-black/8 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-bricolage text-lg sm:text-xl font-bold text-[#111111] uppercase tracking-tight">
              1. Quản lý Ảnh Stills (Selected Frames)
            </h2>
            <p className="text-xs text-[#666666] mt-0.5">
              Dải khung hình điện ảnh 16:9 ArcWave 3D Amphitheater Carousel hiển thị ngay bên dưới Hero.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-black/5 text-[#555555] shrink-0 self-start sm:self-auto">
            Tổng: {stills.length} frames
          </span>
        </div>

        {/* Studio Stills Uploader (Tải trực tiếp khung hình điện ảnh lên Cloudflare R2 qua Drag & Drop) */}
        <div className="bg-[#111111] text-white p-5 sm:p-7 rounded-2xl border border-white/10 space-y-5 shadow-xl relative overflow-hidden">
          {/* Subtle Ambient Studio Glow */}
          <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 bg-[#38BDF8]/10 rounded-full blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 bg-[#2563EB]/10 rounded-full blur-3xl" />

          {/* Header with Title and Optional Prefix Input */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                  Tải Khung hình Điện ảnh lên Cloudflare R2
                </h3>
              </div>
              <p className="text-[11px] text-white/60">
                Kéo &amp; thả trực tiếp các frame hình ảnh 16:9 vào đây · Nén WebP tự động &lt; 500KB
              </p>
            </div>

            <div className="w-full sm:w-80">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-white/70 flex items-center justify-between">
                  <span>Tiền tố / Tên frame</span>
                  <span className="text-[10px] text-white/40 font-normal">(Để trống sẽ lấy tên file)</span>
                </label>
                <input
                  type="text"
                  value={newStillAlt}
                  onChange={(e) => setNewStillAlt(e.target.value)}
                  placeholder="VD: TVC Neon Stage, Sunset Car..."
                  className="w-full px-3 py-2 rounded-lg bg-[#1A1A1C] border border-white/15 text-xs text-white placeholder:text-white/35 focus:outline-none focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Interactive Drag & Drop Dropzone Area */}
          <div
            tabIndex={0}
            role="button"
            aria-label="Kéo thả hoặc nhấp để tải khung hình lên Cloudflare R2"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onClick={() => {
              if (!uploadingStill) {
                fileInputRef.current?.click();
              }
            }}
            onDragEnter={handleStillDragEnter}
            onDragOver={handleStillDragOver}
            onDragLeave={handleStillDragLeave}
            onDrop={handleStillDrop}
            className={`group relative flex flex-col items-center justify-center p-8 sm:p-12 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer text-center select-none overflow-hidden ${
              isDraggingStills
                ? 'border-[#38BDF8] bg-[#38BDF8]/15 shadow-[0_0_35px_rgba(56,189,248,0.3)] ring-2 ring-[#38BDF8]/40 scale-[1.008]'
                : 'border-white/20 bg-[#161618] hover:border-white/40 hover:bg-[#1A1A1E]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              disabled={uploadingStill}
              onChange={handleUploadStill}
              className="hidden"
            />

            {/* Dragging Active Overlay (pointer-events-none prevents any event flicker) */}
            {isDraggingStills && (
              <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center space-y-3 bg-[#111111]/90 backdrop-blur-xs p-4">
                <div className="w-16 h-16 rounded-2xl bg-[#38BDF8] text-[#111111] flex items-center justify-center shadow-lg shadow-cyan-500/30 animate-bounce">
                  <Upload className="w-8 h-8" />
                </div>
                <p className="text-sm font-bold text-white">
                  Thả các frame hình ảnh vào đây để nén WebP &amp; tải lên Cloudflare R2
                </p>
                <span className="text-xs text-[#38BDF8] font-semibold bg-white/10 px-3 py-1 rounded-full border border-cyan-400/30">
                  Tự động đồng bộ dải ArcWave Gallery theo đúng thứ tự
                </span>
              </div>
            )}

            {/* Uploading Progress State */}
            {uploadingStill ? (
              <div className="pointer-events-none flex flex-col items-center justify-center space-y-3.5 py-4 w-full max-w-md mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center shadow-md border border-white/15">
                  <RefreshCw className="w-7 h-7 text-[#38BDF8] animate-spin" />
                </div>
                <div className="space-y-1.5 w-full text-center">
                  <p className="text-sm font-bold text-white line-clamp-1">
                    {uploadProgressText || 'Đang nén WebP & tải lên Cloudflare R2...'}
                  </p>
                  <p className="text-xs text-white/60">
                    Vui lòng đợi giây lát, các khung hình đang được tối ưu chuẩn WebP dưới 500KB
                  </p>
                  {/* Visual Progress Bar */}
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className="bg-gradient-to-r from-[#2563EB] to-[#38BDF8] h-full transition-all duration-300 rounded-full"
                      style={{ width: `${Math.max(10, uploadProgressPercent)}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Idle Dropzone Content (pointer-events-none on children ensures rock-solid single target) */
              <div className="pointer-events-none flex flex-col items-center justify-center space-y-3.5">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/15 text-white flex items-center justify-center shadow-md group-hover:scale-105 group-hover:bg-[#38BDF8] group-hover:text-[#111111] group-hover:border-[#38BDF8] transition-all duration-200">
                  <Upload className="w-6 h-6 text-[#38BDF8] group-hover:text-[#111111] transition-colors" />
                </div>

                <div className="space-y-1">
                  <p className="text-sm sm:text-base font-bold text-white">
                    Kéo &amp; thả các khung hình (frames) vào đây
                  </p>
                  <p className="text-xs text-white/60">
                    hoặc <span className="text-[#38BDF8] font-bold underline underline-offset-2">bấm vào đây để chọn file từ máy</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] text-white/70">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-white/5 border border-white/10 font-medium">
                    ☁️ Cloudflare R2 Storage
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-white/5 border border-white/10 font-medium text-[#38BDF8]">
                    🎬 Chuẩn 16:9 WebP &lt; 500KB
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-white/5 border border-white/10 font-medium">
                    📁 JPG, PNG, WEBP, AVIF
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-medium">
                    ⚡ Kéo thả nhiều ảnh cùng lúc
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Feedback Banners */}
          {uploadedBatchStats && (
            <div className="flex items-center justify-between gap-3 text-xs bg-emerald-950/60 text-emerald-200 p-3.5 rounded-xl border border-emerald-500/30 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Đã tự động nén WebP và tải lên Cloudflare R2 thành công{' '}
                  <strong>{uploadedBatchStats.count} khung hình</strong> vào dải Gallery! (
                  {formatBytes(uploadedBatchStats.originalBytes)} →{' '}
                  <strong>{formatBytes(uploadedBatchStats.compressedBytes)}</strong>, tiết kiệm{' '}
                  {uploadedBatchStats.savingsPercent}% dung lượng).
                </span>
              </div>
              <button
                type="button"
                onClick={() => setUploadedBatchStats(null)}
                className="text-emerald-300 hover:text-white font-bold px-2 py-0.5 rounded cursor-pointer transition-colors"
                title="Đóng thông báo"
              >
                ×
              </button>
            </div>
          )}

          {stillUploadError && (
            <div className="flex items-center justify-between gap-3 text-xs bg-amber-950/60 text-amber-200 p-3.5 rounded-xl border border-amber-500/30 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{stillUploadError}</span>
              </div>
              <button
                type="button"
                onClick={() => setStillUploadError(null)}
                className="text-amber-300 hover:text-white font-bold px-2 py-0.5 rounded cursor-pointer transition-colors"
                title="Đóng thông báo"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Current Stills Grid (Numbered Frame 01, Frame 02, reorderable, editable) */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
              Danh sách khung hình Stills ({stills.length})
            </h3>
            <span className="text-[11px] text-[#777777]">
              Hover vào ảnh để đổi thứ tự, chỉnh sửa tên hoặc xóa frame
            </span>
          </div>

          {stills.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 bg-[#FAFAFC] rounded-xl border border-dashed border-black/10 text-center space-y-2">
              <ImageIcon className="w-8 h-8 text-black/30" />
              <p className="text-xs font-bold text-[#111111]">Chưa có khung hình Stills nào</p>
              <p className="text-xs text-[#777777] max-w-sm">
                Hãy kéo thả ảnh vào khu vực phía trên để nén WebP và tải trực tiếp lên Cloudflare R2.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
              {stills.map((still, idx) => (
                <div
                  key={still.id}
                  className="group relative aspect-video rounded-xl overflow-hidden bg-black border border-black/10 shadow-2xs"
                >
                  <img
                    src={still.src}
                    alt={still.alt || still.title || `Frame ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Always-visible top-left Frame index badge */}
                  <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-[#111111]/90 backdrop-blur-md text-white text-[10px] font-bold tabular-nums shadow-sm border border-white/15">
                    Frame {String(idx + 1).padStart(2, '0')}
                  </div>

                  {/* Hover overlay with action controls (Reorder Left, Reorder Right, Edit, Delete) */}
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
                        onClick={() => handleStartEditStill(still)}
                        className="p-1 rounded-md bg-white/20 text-white hover:bg-[#38BDF8] hover:text-[#111111] transition-colors shadow-xs cursor-pointer"
                        title="Đổi tên frame này"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStillWithCleanup(still)}
                        className="p-1 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors shadow-xs cursor-pointer ml-1"
                        title="Xóa frame này"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-[10px] text-white">
                      <span className="block font-bold line-clamp-1">{still.title || still.alt}</span>
                      <span className="text-white/60">16:9 Cinema Frame</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal chỉnh sửa tên frame */}
        {editingStillId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-md bg-[#161618] text-white border border-white/15 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-[#38BDF8]" />
                  <span>Đổi tên khung hình (Frame Title)</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingStillId(null)}
                  className="text-white/60 hover:text-white p-1 rounded-md cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/80">Tên hiển thị trên thẻ và Lightbox</label>
                <input
                  type="text"
                  value={editingStillTitle}
                  onChange={(e) => setEditingStillTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEditStill();
                    if (e.key === 'Escape') setEditingStillId(null);
                  }}
                  autoFocus
                  placeholder="VD: TVC Neon Stage, Cinematic Sunset..."
                  className="w-full px-3 py-2 rounded-lg bg-[#222226] border border-white/20 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/20 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStillId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditStill}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#38BDF8] text-[#111111] hover:bg-cyan-300 transition-colors shadow-sm cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        )}
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
