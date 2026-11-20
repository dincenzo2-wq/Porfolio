import { useState, useRef, type ChangeEvent } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Edit3,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Check,
  Camera,
} from 'lucide-react';
import type { AspectRatioType, PortfolioProject } from '../../types/portfolio';
import {
  compressImageToWebP,
  formatBytes,
  resolveSafeUploadedImageUrl,
  type CompressionResult,
} from '../../utils/imageCompression';
import {
  parseVideoUrl,
  formatVideoDuration,
  normalizeDropboxUrl,
  detectAspectRatioFromVideoUrl,
} from '../../utils/videoEmbed';
import {
  parseDeliverableRoles,
  formatDeliverableRoles,
  suggestAspectRatioForCategory,
  DEFAULT_SUGGESTED_BRANDS,
  toggleClientOrAgency,
  getCategoryMeta,
  capitalizeWords,
} from '../../utils/portfolioLogic';

interface ProjectsTabProps {
  projects: PortfolioProject[];
  categories?: string[];
  categorySubtitles?: Record<string, string>;
  roles?: string[];
  onAddProject: (project: PortfolioProject) => void;
  onUpdateProject: (id: string, partial: Partial<PortfolioProject>) => void;
  onDeleteProject: (id: string) => void;
  onReorderProjects?: (projects: PortfolioProject[]) => void;
  onUpdateCategories?: (categories: string[], categorySubtitles?: Record<string, string>) => void;
  onUpdateCategorySubtitles?: (categorySubtitles: Record<string, string>) => void;
  onUpdateRoles?: (roles: string[]) => void;
  onMarkUnsaved?: () => void;
}

const DEFAULT_CATEGORIES: string[] = [
  'TVC',
  'Social 9:16',
  'Event Recap',
  'Wedding',
  'Cá Nhân',
];

const DEFAULT_SUGGESTED_ROLES: string[] = [
  'Quay phim',
  'Dựng phim',
  'Color Grading',
  'Motion / VFX',
  'Âm thanh',
  'Đạo diễn hình ảnh',
];

export function ProjectsTab({
  projects,
  categories: inputCategories = DEFAULT_CATEGORIES,
  roles: inputRoles = DEFAULT_SUGGESTED_ROLES,
  categorySubtitles,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onReorderProjects,
  onUpdateCategories,
  onUpdateCategorySubtitles,
  onUpdateRoles,
  onMarkUnsaved,
}: ProjectsTabProps) {
  const categories = inputCategories && inputCategories.length > 0 ? inputCategories : DEFAULT_CATEGORIES;
  const availableRoles = inputRoles && inputRoles.length > 0 ? inputRoles : DEFAULT_SUGGESTED_ROLES;
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [editingProject, setEditingProject] = useState<PortfolioProject | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [clientTypeMode, setClientTypeMode] = useState<'independent' | 'commercial'>('commercial');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<CompressionResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [failedCoverUrl, setFailedCoverUrl] = useState<string | null>(null);

  // Video Frame Capture State
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const [videoReadyState, setVideoReadyState] = useState<number>(0);
  const [isCapturingFrame, setIsCapturingFrame] = useState(false);
  const [captureSuccessMsg, setCaptureSuccessMsg] = useState<string | null>(null);

  // Category Management Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [newCategorySubtitleInput, setNewCategorySubtitleInput] = useState('');
  const [renamingCategory, setRenamingCategory] = useState<{ oldName: string; newName: string; subtitle?: string } | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<{ name: string; projectCount: number } | null>(null);
  const [categoryActionError, setCategoryActionError] = useState<string | null>(null);
  const [categoryActionSuccess, setCategoryActionSuccess] = useState<string | null>(null);

  // Role Management Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [newRoleInput, setNewRoleInput] = useState('');
  const [renamingRole, setRenamingRole] = useState<{ oldName: string; newName: string } | null>(null);
  const [deletingRole, setDeletingRole] = useState<{ name: string; projectCount: number } | null>(null);
  const [roleActionError, setRoleActionError] = useState<string | null>(null);
  const [roleActionSuccess, setRoleActionSuccess] = useState<string | null>(null);

  // Deliverable Roles (Multi-select Pills) State
  const [isAddingCustomRole, setIsAddingCustomRole] = useState(false);
  const [customRoleInput, setCustomRoleInput] = useState('');

  // Deliverable Roles Helpers
  const selectedRoles = editingProject
    ? parseDeliverableRoles(editingProject.deliverableRole)
    : [];

  const allVisibleRoles = Array.from(new Set([...availableRoles, ...selectedRoles]));

  const toggleRole = (role: string) => {
    if (!editingProject) return;
    const current = parseDeliverableRoles(editingProject.deliverableRole);
    const next = current.includes(role)
      ? current.filter((r) => r !== role)
      : [...current, role];
    setEditingProject({
      ...editingProject,
      deliverableRole: next,
    });
  };

  const handleAddCustomRole = () => {
    const trimmed = customRoleInput.trim();
    if (!trimmed) {
      setIsAddingCustomRole(false);
      return;
    }

    // 1. Add to available suggested roles if not already present
    if (!availableRoles.some((r) => r.toLowerCase() === trimmed.toLowerCase())) {
      const updated = [...availableRoles, trimmed];
      if (onUpdateRoles) {
        onUpdateRoles(updated);
      }
    }

    // 2. Select this role for current project
    if (editingProject) {
      const current = parseDeliverableRoles(editingProject.deliverableRole);
      if (!current.includes(trimmed)) {
        setEditingProject({
          ...editingProject,
          deliverableRole: [...current, trimmed],
        });
      }
    }

    setCustomRoleInput('');
    setIsAddingCustomRole(false);
  };

  // Add new category
  const handleAddCategory = () => {
    const trimmed = newCategoryInput.trim();
    const trimmedSubtitle = newCategorySubtitleInput.trim();
    if (!trimmed) {
      setCategoryActionError('Vui lòng nhập tên danh mục.');
      return;
    }
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setCategoryActionError(`Danh mục "${trimmed}" đã tồn tại.`);
      return;
    }
    const updated = [...categories, trimmed];
    const updatedSubtitles = { ...(categorySubtitles || {}) };
    if (trimmedSubtitle) {
      updatedSubtitles[trimmed] = trimmedSubtitle;
    }
    if (onUpdateCategories) {
      onUpdateCategories(updated, updatedSubtitles);
    }
    if (onUpdateCategorySubtitles) {
      onUpdateCategorySubtitles(updatedSubtitles);
    }
    if (onMarkUnsaved) {
      onMarkUnsaved();
    }
    setNewCategoryInput('');
    setNewCategorySubtitleInput('');
    setCategoryActionError(null);
    setCategoryActionSuccess(`Đã thêm danh mục "${trimmed}" thành công!`);
  };

  // Update subtitle for a category
  const handleUpdateSubtitle = (cat: string, newSubtitle: string) => {
    const updatedSubtitles = {
      ...(categorySubtitles || {}),
      [cat]: newSubtitle,
    };
    if (onUpdateCategories) {
      onUpdateCategories(categories, updatedSubtitles);
    }
    if (onUpdateCategorySubtitles) {
      onUpdateCategorySubtitles(updatedSubtitles);
    }
    if (onMarkUnsaved) {
      onMarkUnsaved();
    }
  };

  // Rename category & automatically migrate all associated projects
  const handleRenameCategory = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) {
      setRenamingCategory(null);
      return;
    }
    if (categories.some((c) => c !== oldName && c.toLowerCase() === trimmed.toLowerCase())) {
      setCategoryActionError(`Danh mục "${trimmed}" đã tồn tại.`);
      return;
    }

    // 1. Update categories array & migrate subtitle
    const updatedCategories = categories.map((c) => (c === oldName ? trimmed : c));
    const updatedSubtitles = { ...(categorySubtitles || {}) };
    if (updatedSubtitles[oldName] !== undefined) {
      updatedSubtitles[trimmed] = updatedSubtitles[oldName];
      delete updatedSubtitles[oldName];
    }
    if (onUpdateCategories) {
      onUpdateCategories(updatedCategories, updatedSubtitles);
    }
    if (onUpdateCategorySubtitles) {
      onUpdateCategorySubtitles(updatedSubtitles);
    }

    // 2. Automatically migrate all projects tagged with oldName to trimmed
    let migratedCount = 0;
    const updatedProjects = projects.map((p) => {
      if (p.category === oldName) {
        migratedCount++;
        return { ...p, category: trimmed };
      }
      return p;
    });

    if (migratedCount > 0 && onReorderProjects) {
      onReorderProjects(updatedProjects);
    }

    // 3. Update current filter / editing modal selection if needed
    if (selectedCategory === oldName) {
      setSelectedCategory(trimmed);
    }
    if (editingProject && editingProject.category === oldName) {
      setEditingProject({ ...editingProject, category: trimmed });
    }

    setRenamingCategory(null);
    setCategoryActionError(null);
    setCategoryActionSuccess(
      migratedCount > 0
        ? `Đã đổi tên thành "${trimmed}" và cập nhật cho ${migratedCount} dự án!`
        : `Đã đổi tên thành "${trimmed}"!`
    );
  };

  // Reorder category order (Move Up / Down)
  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= categories.length) return;
    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);
    if (onUpdateCategories) {
      onUpdateCategories(reordered);
    }
    if (onMarkUnsaved) {
      onMarkUnsaved();
    }
  };

  // Close Category Management Modal & trigger unsaved warning
  const handleCloseCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setRenamingCategory(null);
    setDeletingCategory(null);
    setCategoryActionError(null);
    setCategoryActionSuccess(null);
    if (onMarkUnsaved) {
      onMarkUnsaved();
    }
  };

  // Delete category (only allowed if 0 projects)
  const handleDeleteCategory = (catToDelete: string) => {
    if (categories.length <= 1) {
      setCategoryActionError('Cần giữ lại ít nhất 1 danh mục trong hệ thống.');
      return;
    }

    const remainingCategories = categories.filter((c) => c !== catToDelete);
    const updatedSubtitles = { ...(categorySubtitles || {}) };
    delete updatedSubtitles[catToDelete];

    if (onUpdateCategories) {
      onUpdateCategories(remainingCategories, updatedSubtitles);
    }
    if (onUpdateCategorySubtitles) {
      onUpdateCategorySubtitles(updatedSubtitles);
    }

    if (selectedCategory === catToDelete) {
      setSelectedCategory('Tất cả');
    }
    if (editingProject && editingProject.category === catToDelete) {
      setEditingProject({ ...editingProject, category: remainingCategories[0] || 'TVC' });
    }

    setDeletingCategory(null);
    setCategoryActionError(null);
    setCategoryActionSuccess(`Đã xóa danh mục "${catToDelete}" thành công!`);
    if (onMarkUnsaved) {
      onMarkUnsaved();
    }
  };

  // Add new role
  const handleAddRole = () => {
    const trimmed = newRoleInput.trim();
    if (!trimmed) {
      setRoleActionError('Vui lòng nhập tên vai trò.');
      return;
    }
    if (availableRoles.some((r) => r.toLowerCase() === trimmed.toLowerCase())) {
      setRoleActionError(`Vai trò "${trimmed}" đã tồn tại.`);
      return;
    }
    const updated = [...availableRoles, trimmed];
    if (onUpdateRoles) {
      onUpdateRoles(updated);
    }
    if (onMarkUnsaved) {
      onMarkUnsaved();
    }
    setNewRoleInput('');
    setRoleActionError(null);
    setRoleActionSuccess(`Đã thêm vai trò "${trimmed}" thành công!`);
  };

  // Move role Up / Down
  const handleMoveRole = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= availableRoles.length) return;
    const reordered = [...availableRoles];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);
    if (onUpdateRoles) {
      onUpdateRoles(reordered);
    }
    if (onMarkUnsaved) {
      onMarkUnsaved();
    }
  };

  // Rename role & automatically update all projects tagged with oldName
  const handleRenameRole = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) {
      setRenamingRole(null);
      return;
    }
    if (availableRoles.some((r) => r !== oldName && r.toLowerCase() === trimmed.toLowerCase())) {
      setRoleActionError(`Vai trò "${trimmed}" đã tồn tại.`);
      return;
    }

    // 1. Update available roles array
    const updatedRoles = availableRoles.map((r) => (r === oldName ? trimmed : r));
    if (onUpdateRoles) {
      onUpdateRoles(updatedRoles);
    }

    // 2. Automatically update all projects tagged with oldName
    let migratedCount = 0;
    const updatedProjects = projects.map((p) => {
      const pRoles = parseDeliverableRoles(p.deliverableRole);
      if (pRoles.includes(oldName)) {
        migratedCount++;
        const nextRoles = pRoles.map((r) => (r === oldName ? trimmed : r));
        return {
          ...p,
          deliverableRole: nextRoles,
        };
      }
      return p;
    });

    if (migratedCount > 0 && onReorderProjects) {
      onReorderProjects(updatedProjects);
    }

    // 3. Update current editing project if needed
    if (editingProject) {
      const curRoles = parseDeliverableRoles(editingProject.deliverableRole);
      if (curRoles.includes(oldName)) {
        setEditingProject({
          ...editingProject,
          deliverableRole: curRoles.map((r) => (r === oldName ? trimmed : r)),
        });
      }
    }

    if (onMarkUnsaved) {
      onMarkUnsaved();
    }

    setRenamingRole(null);
    setRoleActionError(null);
    setRoleActionSuccess(
      migratedCount > 0
        ? `Đã đổi tên thành "${trimmed}" và cập nhật cho ${migratedCount} dự án!`
        : `Đã đổi tên thành "${trimmed}"!`
    );
  };

  // Delete role (safe: only if projectCount === 0)
  const handleDeleteRole = (roleToDelete: string) => {
    if (availableRoles.length <= 1) {
      setRoleActionError('Cần giữ lại ít nhất 1 vai trò trong hệ thống.');
      return;
    }

    const remainingRoles = availableRoles.filter((r) => r !== roleToDelete);
    if (onUpdateRoles) {
      onUpdateRoles(remainingRoles);
    }

    if (editingProject) {
      const curRoles = parseDeliverableRoles(editingProject.deliverableRole);
      if (curRoles.includes(roleToDelete)) {
        setEditingProject({
          ...editingProject,
          deliverableRole: curRoles.filter((r) => r !== roleToDelete),
        });
      }
    }

    if (onMarkUnsaved) {
      onMarkUnsaved();
    }

    setDeletingRole(null);
    setRoleActionError(null);
    setRoleActionSuccess(`Đã xóa vai trò "${roleToDelete}" thành công!`);
  };

  // Close Role Management Modal & trigger unsaved warning
  const handleCloseRoleModal = () => {
    setIsRoleModalOpen(false);
    setRenamingRole(null);
    setDeletingRole(null);
    setRoleActionError(null);
    setRoleActionSuccess(null);
    if (onMarkUnsaved) {
      onMarkUnsaved();
    }
  };

  const filteredProjects =
    selectedCategory === 'Tất cả'
      ? projects
      : projects.filter((p) => p.category === selectedCategory);

  const handleOpenCreate = () => {
    const newId = `project-${Date.now()}`;
    const initialCategory =
      selectedCategory && selectedCategory !== 'Tất cả'
        ? selectedCategory
        : categories[0] || 'TVC';
    const isIndie =
      initialCategory.toLowerCase().includes('wedding') ||
      initialCategory.toLowerCase().includes('cá nhân') ||
      initialCategory.toLowerCase().includes('personal');

    const emptyProject: PortfolioProject = {
      id: newId,
      title: '',
      clientOrAgency: '',
      category: initialCategory,
      aspectRatio: suggestAspectRatioForCategory(initialCategory),
      gridSpan: 'col-span-12 md:col-span-6',
      year: new Date().getFullYear().toString(),
      duration: '',
      deliverableRole: [], // Không tự chọn sẵn vai trò: để người dùng tự chọn đúng vai trò thực tế
      coverImage: '',
      videoUrl: '',
      agencyBrief: '',
      hidden: false,
    };
    setEditingProject(emptyProject);
    setIsCreatingNew(true);
    setClientTypeMode(isIndie ? 'independent' : 'commercial');
    setCompressionInfo(null);
    setUploadError(null);
    setIsAddingCustomRole(false);
    setCustomRoleInput('');
    setVideoReadyState(0);
    setIsCapturingFrame(false);
    setCaptureSuccessMsg(null);
  };

  const handleOpenEdit = (project: PortfolioProject) => {
    setEditingProject({ ...project });
    setIsCreatingNew(false);
    const client = (project.clientOrAgency || '').trim().toLowerCase();
    const isIndie =
      !client ||
      client.includes('wedding') ||
      client.includes('khách lẻ') ||
      client.includes('độc lập') ||
      client.includes('cặp đôi');
    setClientTypeMode(isIndie ? 'independent' : 'commercial');
    setCompressionInfo(null);
    setUploadError(null);
    setIsAddingCustomRole(false);
    setCustomRoleInput('');
    setVideoReadyState(0);
    setIsCapturingFrame(false);
    setCaptureSuccessMsg(null);
  };

  // Capture current video frame and set as project cover image
  const handleCaptureFrameAsCover = async () => {
    const video = videoPreviewRef.current;
    if (!video || video.readyState < 2 || !editingProject) return;

    try {
      setIsCapturingFrame(true);
      setUploadError(null);
      setCaptureSuccessMsg(null);

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Không thể khởi tạo Canvas 2D để chụp ảnh');

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to WebP blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/webp', 0.85);
      });

      if (!blob) throw new Error('Trình duyệt không thể kết xuất khung hình WebP');

      const currentTimeSec = Math.floor(video.currentTime);
      const formattedTime = formatVideoDuration(video.currentTime) || `${currentTimeSec}s`;
      const cleanTitle = (editingProject.title || 'project')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .toLowerCase();
      const fileName = `${cleanTitle}_frame_${currentTimeSec}s.webp`;

      const file = new File([blob], fileName, { type: 'image/webp' });

      // Direct canvas WebP fallback (0.82) guaranteed to render even if R2 is unavailable
      const canvasFallbackDataUrl = (() => {
        try {
          const url = canvas.toDataURL('image/webp', 0.82);
          return url && url.startsWith('data:image/') ? url : '';
        } catch {
          return '';
        }
      })();

      // Compress to WebP < 500KB (handles resize/compression if raw 4K frame is large)
      const compressionResult = await compressImageToWebP(file, 1920, 500 * 1024);
      setCompressionInfo(compressionResult);

      const safeInlineFallback = compressionResult.dataUrl || canvasFallbackDataUrl;

      // Upload to Cloudflare R2 and verify that the returned URL actually loads as an image
      const formData = new FormData();
      formData.append('file', compressionResult.file);

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

      const finalUrl = await resolveSafeUploadedImageUrl(uploadedUrl, safeInlineFallback);

      // Optionally delete old R2 cover image if present
      const oldCover = editingProject.coverImage;
      if (oldCover && (oldCover.includes('/uploads/') || oldCover.includes('/media/'))) {
        try {
          fetch(`/api/upload?url=${encodeURIComponent(oldCover)}`, { method: 'DELETE' }).catch(() => {});
        } catch {}
      }

      // Update editing project cover image
      setEditingProject((prev) => (prev ? { ...prev, coverImage: finalUrl } : null));

      setCaptureSuccessMsg(`Đã chụp frame tại [${formattedTime}] làm ảnh bìa thành công!`);
      if (onMarkUnsaved) {
        onMarkUnsaved();
      }
    } catch (err: any) {
      console.error('Frame capture error:', err);
      setUploadError(
        `Không thể chụp frame video: ${err?.message || 'Lỗi xử lý điểm ảnh'}. Hãy đảm bảo video đã tải xong.`
      );
    } finally {
      setIsCapturingFrame(false);
    }
  };

  // Auto-detect and format video duration & aspect ratio when direct MP4 video loads metadata
  const handleVideoLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    if (!video) return;

    let nextDuration: string | undefined;
    if (
      typeof video.duration === 'number' &&
      !isNaN(video.duration) &&
      isFinite(video.duration) &&
      video.duration > 0
    ) {
      const formatted = formatVideoDuration(video.duration);
      if (formatted) {
        nextDuration = formatted;
      }
    }

    // Auto-detect aspect ratio from pixel dimensions
    const width = video.videoWidth;
    const height = video.videoHeight;
    let detectedRatio: AspectRatioType | undefined;
    if (width > 0 && height > 0) {
      detectedRatio = height > width ? '9:16' : '16:9';
    }

    setEditingProject((prev) => {
      if (!prev) return null;
      const updates: Partial<PortfolioProject> = {};
      if (nextDuration && prev.duration !== nextDuration) {
        updates.duration = nextDuration;
      }
      if (detectedRatio && prev.aspectRatio !== detectedRatio) {
        updates.aspectRatio = detectedRatio;
      }
      // Không tự ý đổi tab danh mục: giữ nguyên 100% danh mục do người dùng chọn
      return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
    });
  };

  // Auto-detect aspect ratio & auto-fetch YouTube cover thumbnail (0MB storage)
  // Tuyệt đối KHÔNG tự động chuyển tab/danh mục: giữ nguyên lựa chọn danh mục của người dùng
  const handleVideoUrlChange = (rawVal: string) => {
    let cleanVal = rawVal.trim();
    // Tự động bóc tách đường link sạch bên trong thuộc tính src nếu người dùng dán nguyên đoạn mã <iframe ...>
    const iframeMatch = cleanVal.match(/<iframe[^>]*\bsrc=["']([^"']+)["']/i);
    if (iframeMatch && iframeMatch[1]) {
      cleanVal = iframeMatch[1].trim();
    }

    const normalized = normalizeDropboxUrl(cleanVal);
    const detectedRatio = detectAspectRatioFromVideoUrl(normalized);
    const parsed = parseVideoUrl(normalized);

    setEditingProject((prev) => {
      if (!prev) return null;
      const updates: Partial<PortfolioProject> = { videoUrl: normalized };

      if (detectedRatio && prev.aspectRatio !== detectedRatio) {
        updates.aspectRatio = detectedRatio;
      }

      // Tự động gán ảnh bìa YouTube gốc nếu chưa có ảnh bìa hoặc đang dùng ảnh từ YouTube
      if (parsed.type === 'youtube' && parsed.videoId) {
        if (!prev.coverImage || prev.coverImage.includes('img.youtube.com')) {
          updates.coverImage = `https://img.youtube.com/vi/${parsed.videoId}/maxresdefault.jpg`;
        }
      }

      return { ...prev, ...updates };
    });
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editingProject.title.trim()) return;

    const projectToSave: PortfolioProject = {
      ...editingProject,
      title: capitalizeWords(editingProject.title.trim()),
      clientOrAgency: editingProject.clientOrAgency
        ? capitalizeWords(editingProject.clientOrAgency.trim())
        : '',
    };

    if (isCreatingNew) {
      onAddProject(projectToSave);
    } else {
      onUpdateProject(projectToSave.id, projectToSave);
    }

    if (onMarkUnsaved) {
      onMarkUnsaved();
    }

    setEditingProject(null);
  };

  // Reorder projects (Move Up / Down)
  const handleMoveProject = (projectId: string, direction: 'up' | 'down') => {
    const currentFilteredIdx = filteredProjects.findIndex((p) => p.id === projectId);
    if (currentFilteredIdx === -1) return;

    const targetFilteredIdx = direction === 'up' ? currentFilteredIdx - 1 : currentFilteredIdx + 1;
    if (targetFilteredIdx < 0 || targetFilteredIdx >= filteredProjects.length) return;

    const targetProject = filteredProjects[targetFilteredIdx];

    const globalCurrentIdx = projects.findIndex((p) => p.id === projectId);
    const globalTargetIdx = projects.findIndex((p) => p.id === targetProject.id);

    if (globalCurrentIdx === -1 || globalTargetIdx === -1) return;

    const newProjects = [...projects];
    const temp = newProjects[globalCurrentIdx];
    newProjects[globalCurrentIdx] = newProjects[globalTargetIdx];
    newProjects[globalTargetIdx] = temp;

    if (onReorderProjects) {
      onReorderProjects(newProjects);
    }
  };

  // Toggle Visibility (Show / Hide)
  const handleToggleVisibility = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    onUpdateProject(projectId, { hidden: !project.hidden });
  };

  // Helper to determine video source badge
  const getVideoSourceMeta = (videoUrl?: string) => {
    if (!videoUrl || !videoUrl.trim()) {
      return { label: 'Chưa có link video', hasValid: false };
    }
    const parsed = parseVideoUrl(videoUrl);
    if (parsed.type === 'youtube') {
      return { label: 'YouTube', hasValid: true };
    }
    if (parsed.type === 'vimeo') {
      return { label: 'Vimeo', hasValid: true };
    }
    if (parsed.type === 'gdrive') {
      return { label: 'Google Drive', hasValid: true };
    }
    if (parsed.type === 'vk') {
      return { label: parsed.isShorts ? 'VK Clip 9:16' : 'VK Video', hasValid: true };
    }
    if (parsed.type === 'direct') {
      if (parsed.isDropbox) {
        return { label: 'Dropbox MP4', hasValid: true };
      }
      return { label: 'MP4 / R2', hasValid: true };
    }
    return { label: 'Chưa có link video', hasValid: false };
  };

  // Handle client-side WebP compression & upload to Cloudflare R2
  const handleImageFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let compressedResult: CompressionResult | null = null;

    try {
      setUploadingImage(true);
      setUploadError(null);

      // 1. Compress image to WebP under 500KB on the client
      compressedResult = await compressImageToWebP(file, 1920, 500 * 1024);
      setCompressionInfo(compressedResult);

      // 2. Upload compressed file to Cloudflare R2 and verify image actually renders
      const formData = new FormData();
      formData.append('file', compressedResult.file);

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
      } catch (networkErr) {
        console.warn('R2 upload network notice, falling back to inline WebP:', networkErr);
      }

      const finalUrl = await resolveSafeUploadedImageUrl(uploadedUrl, compressedResult.dataUrl);
      if (editingProject) {
        setEditingProject((prev) => (prev ? { ...prev, coverImage: finalUrl } : null));
      }
    } catch (err: any) {
      console.warn('Image upload notice:', err);
      // Even if compression/upload encounters an error, fall back to compressed DataURL if available
      if (editingProject && compressedResult?.dataUrl) {
        setEditingProject((prev) =>
          prev ? { ...prev, coverImage: compressedResult!.dataUrl } : null
        );
      } else {
        setUploadError(err?.message || 'Không thể xử lý ảnh đã chọn');
      }
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Action Bar: Flat row with thin bottom border */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.07] pb-4">
        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory('Tất cả')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedCategory === 'Tất cả'
                ? 'bg-[#111111] text-white shadow-xs'
                : 'bg-white hover:bg-black/5 text-black/70 hover:text-[#111111] border border-black/[0.07] shadow-2xs'
            }`}
          >
            Tất cả ({projects.length})
          </button>
          {categories.map((cat) => {
            const count = projects.filter((p) => p.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#111111] text-white shadow-xs'
                    : 'bg-white hover:bg-black/5 text-black/70 hover:text-[#111111] border border-black/[0.07] shadow-2xs'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}

          {/* Manage Categories Button beside category filter bar */}
          <button
            type="button"
            onClick={() => {
              setCategoryActionError(null);
              setCategoryActionSuccess(null);
              setIsCategoryModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-black/60 hover:text-[#111111] bg-black/5 hover:bg-black/10 transition-all cursor-pointer ml-1"
            title="Quản lý & Chỉnh sửa phân loại danh mục"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Quản lý danh mục</span>
          </button>
        </div>

        {/* Add Project Button in Midnight Black */}
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#111111] text-white hover:bg-black/85 text-xs font-semibold transition-all shadow-xs shrink-0 cursor-pointer active:scale-98"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm dự án mới</span>
        </button>
      </div>

      {/* 2. Projects Grid List: Smart Grid - 4 columns for vertical/social, 3 columns for mixed/horizontal */}
      <div
        className={`grid gap-5 ${
          selectedCategory.toLowerCase().includes('social') ||
          (filteredProjects.length > 0 && filteredProjects.every((p) => p.aspectRatio === '9:16'))
            ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}
      >
        {filteredProjects.map((project, idx) => {
          const videoMeta = getVideoSourceMeta(project.videoUrl);
          const isFirst = idx === 0;
          const isLast = idx === filteredProjects.length - 1;
          const isVertical = project.aspectRatio === '9:16';

          return (
            <div
              key={project.id}
              className={`bg-white rounded-2xl border overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md flex flex-col justify-between transition-all group ${
                project.hidden
                  ? 'border-black/[0.07] opacity-75 hover:opacity-100'
                  : 'border-black/[0.07] hover:border-black/25'
              }`}
            >
              <div>
                {/* Thumbnail Preview: True 9:16 for vertical or 16:9 for horizontal */}
                <div
                  className={`relative ${
                    isVertical ? 'h-80 sm:h-96 bg-[#0B0B0D]' : 'aspect-[16/9] bg-[#141414]'
                  } overflow-hidden flex items-center justify-center w-full group/thumb`}
                >
                  {isVertical ? (
                    <>
                      {/* Ambient blur backdrop for 9:16 vertical smartphone frame */}
                      {project.coverImage && (
                        <img
                          src={project.coverImage}
                          alt=""
                          aria-hidden="true"
                          className="absolute inset-0 w-full h-full object-cover blur-xl opacity-35 scale-125 select-none pointer-events-none"
                        />
                      )}
                      {project.coverImage ? (
                        <img
                          src={project.coverImage}
                          alt={project.title}
                          className="relative z-1 h-full w-auto aspect-[9/16] object-cover rounded-md shadow-2xl border border-white/10 group-hover:scale-[1.02] transition-transform duration-300"
                        />
                      ) : (
                        <div className="relative z-1 w-full h-full flex flex-col items-center justify-center text-white/35 text-xs font-medium gap-1">
                          <Upload className="w-5 h-5 opacity-40" />
                          <span>Chưa có ảnh bìa</span>
                        </div>
                      )}
                    </>
                  ) : (
                    project.coverImage ? (
                      <img
                        src={project.coverImage}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/30 text-xs font-medium">
                        Chưa có ảnh bìa
                      </div>
                    )
                  )}

                  {/* Top-left Badges: Category & Aspect Ratio */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                    <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
                      {project.category}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md backdrop-blur-md text-[10px] font-bold tabular-nums ${
                        isVertical
                          ? 'bg-[#2563EB] text-white shadow-xs'
                          : 'bg-white/90 text-[#111111]'
                      }`}
                    >
                      {project.aspectRatio}
                    </span>
                  </div>

                  {/* Top-right Draft/Hidden Badge */}
                  {project.hidden && (
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-amber-500/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider shadow-xs z-10">
                      Tạm ẩn
                    </div>
                  )}
                </div>

                {/* Project Info */}
                <div className="p-4 sm:p-5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bricolage text-base font-bold text-[#111111] line-clamp-1">
                      {project.title}
                    </h3>
                    <span className="text-xs text-black/50 font-bold tabular-nums shrink-0">
                      {project.year}
                    </span>
                  </div>

                  <p className="text-xs text-black/60 font-medium line-clamp-1">
                    {project.clientOrAgency?.trim() ? (
                      <>
                        <span>{project.clientOrAgency.trim()}</span>
                        {project.deliverableRole && (
                          <>
                            <span className="mx-1.5 text-black/30">·</span>
                            <span className="text-black/75">
                              {formatDeliverableRoles(project.deliverableRole)}
                            </span>
                          </>
                        )}
                      </>
                    ) : (
                      project.deliverableRole && (
                        <span className="text-black/75">
                          {formatDeliverableRoles(project.deliverableRole)}
                        </span>
                      )
                    )}
                  </p>

                  <p className="text-xs text-black/75 line-clamp-2 leading-relaxed">
                    {project.agencyBrief}
                  </p>

                  {/* Meta Line: Duration & Video Source Badge */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/6 text-xs">
                    <span className="text-black/50 font-medium tabular-nums text-[11px]">
                      {project.duration}
                    </span>

                    {/* Clean Video Source Badge with Emerald Dot */}
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#F9F9FB] border border-black/8 text-[10px] font-semibold text-black/75">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          videoMeta.hasValid
                            ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                            : 'bg-black/30'
                        }`}
                      />
                      <span>{videoMeta.label}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Bottom Quick Action Bar */}
              <div className="px-4 py-3 bg-[#F9F9FB] border-t border-black/[0.07] flex items-center justify-between text-xs">
                {/* Left: Reorder Up/Down + Toggle Visibility */}
                <div className="flex items-center gap-2">
                  {/* Up / Down Order Buttons */}
                  <div className="inline-flex items-center rounded-lg border border-black/12 bg-white overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveProject(project.id, 'up')}
                      className="p-1.5 text-black/60 hover:text-[#111111] hover:bg-black/5 disabled:opacity-25 disabled:hover:bg-transparent transition-colors cursor-pointer"
                      title="Di chuyển lên trên (Ưu tiên hiển thị)"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-[1px] h-3.5 bg-black/12" />
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMoveProject(project.id, 'down')}
                      className="p-1.5 text-black/60 hover:text-[#111111] hover:bg-black/5 disabled:opacity-25 disabled:hover:bg-transparent transition-colors cursor-pointer"
                      title="Di chuyển xuống dưới"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Visibility Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(project.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                      project.hidden
                        ? 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100 shadow-2xs'
                        : 'bg-white border-black/12 text-black/80 hover:text-[#111111] hover:border-black/25 shadow-2xs'
                    }`}
                    title={project.hidden ? 'Dự án đang ẩn (Bấm để hiển thị ngoài trang chủ)' : 'Dự án đang hiển thị (Bấm để tạm ẩn)'}
                  >
                    {project.hidden ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                        <span>Tạm ẩn</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Hiển thị</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Right: Edit & Delete Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(project)}
                    className="p-1.5 rounded-lg text-black/65 hover:text-[#111111] hover:bg-black/5 border border-transparent hover:border-black/10 transition-colors cursor-pointer"
                    title="Chỉnh sửa dự án"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Bạn có chắc muốn xóa dự án "${project.title}"?`)) {
                        onDeleteProject(project.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                    title="Xóa dự án"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Edit / Create Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-2xl bg-white border border-black/[0.07] rounded-2xl shadow-2xl text-[#111111] my-auto flex flex-col h-[90vh] max-h-[90vh] overflow-hidden">
            {/* Header: Pinned at top */}
            <div className="shrink-0 border-b border-black/[0.07] px-6 py-4 bg-white flex items-center justify-between">
              <h2 className="font-bricolage text-xl font-bold text-[#111111] uppercase tracking-tight">
                {isCreatingNew ? 'Thêm dự án mới' : 'Chỉnh sửa dự án'}
              </h2>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="p-1.5 rounded-lg hover:bg-black/5 text-[#555555] hover:text-[#111111] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form with scrollable body and pinned footer */}
            <form onSubmit={handleSaveModal} className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5 text-xs sm:text-sm">
                {/* Row 1: Title */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-[#111111]">Tên dự án *</label>
                    <button
                      type="button"
                      onClick={() => {
                        if (editingProject && editingProject.title) {
                          setEditingProject({
                            ...editingProject,
                            title: capitalizeWords(editingProject.title),
                          });
                        }
                      }}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-black/60 hover:text-[#111111] hover:underline cursor-pointer"
                      title="Bấm để tự động viết hoa chữ cái đầu của mỗi từ"
                    >
                      <span className="font-mono bg-black/5 px-1.5 py-0.5 rounded border border-black/10 text-[10px] font-bold">
                        Aa
                      </span>
                      <span>Viết hoa từng chữ</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={editingProject.title}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, title: e.target.value })
                    }
                    onBlur={(e) => {
                      const val = e.target.value;
                      const formatted = capitalizeWords(val);
                      if (formatted !== val) {
                        setEditingProject((prev) => (prev ? { ...prev, title: formatted } : null));
                      }
                    }}
                    placeholder="VD: Pepsi Electric Blue — Summer Launch..."
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#F9F9FB] border border-black/10 text-sm font-semibold text-[#111111] focus:bg-white focus:outline-none focus:border-[#111111] focus:ring-2 focus:ring-black/5 transition-all"
                  />
                  <p className="text-[11px] text-black/45">
                    Tự động viết hoa chữ cái đầu mỗi từ khi gõ xong hoặc dán tên dự án (Title Case)
                  </p>
                </div>

                {/* Row 1b: Phân định riêng biệt: Khách lẻ / Độc lập HOẶC Thương hiệu & Agency */}
                <div className="space-y-3.5 bg-[#F9F9FB] p-4 sm:p-5 rounded-xl border border-black/[0.07]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <label className="block font-semibold text-[#111111]">
                        Khách hàng / Thương hiệu
                      </label>
                      <span className="text-[11px] text-black/50 font-medium">
                        Chọn riêng biệt giữa nhóm Khách lẻ (Đám cưới / Cá nhân) và Thương hiệu đối tác (Commercial)
                      </span>
                    </div>

                    {/* Segmented Switch: Chọn 1 trong 2 nhóm riêng biệt */}
                    <div className="inline-flex p-1 bg-black/[0.06] rounded-xl border border-black/5 text-xs font-semibold shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setClientTypeMode('independent');
                        }}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          clientTypeMode === 'independent'
                            ? 'bg-white text-[#111111] shadow-xs'
                            : 'text-black/60 hover:text-black'
                        }`}
                      >
                        Khách lẻ / Độc lập
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setClientTypeMode('commercial');
                        }}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          clientTypeMode === 'commercial'
                            ? 'bg-white text-[#111111] shadow-xs'
                            : 'text-black/60 hover:text-black'
                        }`}
                      >
                        Thương hiệu &amp; Agency đối tác
                      </button>
                    </div>
                  </div>

                  {/* NHÁNH 1: KHÁCH LẺ / ĐỘC LẬP (ĐÁM CƯỚI / CÁ NHÂN) */}
                  {clientTypeMode === 'independent' ? (
                    <div className="space-y-2.5 pt-1 border-t border-black/[0.06]">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-black/45 block">
                        Tùy chọn Khách lẻ / Đám cưới (Không hiển thị Brand thương mại trên web)
                      </span>

                      {/* Các nút chọn nhanh riêng biệt cho Khách lẻ */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingProject({ ...editingProject, clientOrAgency: '' })}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-98 inline-flex items-center gap-1.5 ${
                            !editingProject.clientOrAgency?.trim()
                              ? 'bg-rose-50 text-rose-700 border border-rose-300 shadow-2xs'
                              : 'bg-white border border-black/12 text-black/75 hover:border-black hover:text-[#111111]'
                          }`}
                        >
                          <EyeOff className="w-3 h-3" />
                          <span>Không hiển thị tên khách (Mặc định cho Đám cưới)</span>
                        </button>

                        {['Wedding · Cặp đôi', 'Khách lẻ / Cá nhân', 'Dự án độc lập'].map((preset) => {
                          const isActive = editingProject.clientOrAgency?.trim() === preset;
                          return (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                setEditingProject({
                                  ...editingProject,
                                  clientOrAgency: isActive ? '' : preset,
                                });
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-98 inline-flex items-center gap-1.5 ${
                                isActive
                                  ? 'bg-[#111111] text-white shadow-xs'
                                  : 'bg-white border border-black/12 text-black/75 hover:border-black hover:text-[#111111]'
                              }`}
                            >
                              <span>{preset}</span>
                            </button>
                          );
                        })}
                      </div>

                      <p className="text-[11px] text-black/50 italic pt-0.5">
                        * Nhóm này hoạt động độc lập: không ảnh hưởng đến phân loại danh mục, không tạo thêm tab mới và không đưa vào danh sách Brand.
                      </p>
                    </div>
                  ) : (
                    /* NHÁNH 2: THƯƠNG HIỆU & AGENCY ĐỐI TÁC (DOANH NGHIỆP / AGENCY) */
                    <div className="space-y-2.5 pt-1 border-t border-black/[0.06]">
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-black/45 block">
                          Tên Thương hiệu / Doanh nghiệp / Agency đối tác
                        </span>
                        <input
                          type="text"
                          value={editingProject.clientOrAgency || ''}
                          onChange={(e) =>
                            setEditingProject({ ...editingProject, clientOrAgency: e.target.value })
                          }
                          onBlur={(e) => {
                            const val = e.target.value;
                            const formatted = capitalizeWords(val);
                            if (formatted !== val) {
                              setEditingProject((prev) =>
                                prev ? { ...prev, clientOrAgency: formatted } : null
                              );
                            }
                          }}
                          placeholder="VD: Dentsu Redder · PepsiCo Vietnam hoặc VinFast..."
                          className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-black/10 text-sm text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-2 focus:ring-black/5 transition-all font-medium"
                        />
                      </div>

                      {/* Các thẻ Brand mẫu thuần thương mại (TUYỆT ĐỐI KHÔNG CÓ WEDDING) */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] text-black/50 font-medium block">
                          Bấm chọn nhanh hoặc kết hợp Agency + Brand:
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          {DEFAULT_SUGGESTED_BRANDS.map((brand) => {
                            const cur = editingProject.clientOrAgency || '';
                            const isActive = cur.toLowerCase().includes(brand.toLowerCase());
                            return (
                              <button
                                key={brand}
                                type="button"
                                onClick={() => {
                                  const next = toggleClientOrAgency(editingProject.clientOrAgency, brand);
                                  setEditingProject({ ...editingProject, clientOrAgency: next });
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-98 inline-flex items-center gap-1.5 ${
                                  isActive
                                    ? 'bg-[#111111] text-white shadow-xs'
                                    : 'bg-white border border-black/12 text-black/75 hover:border-black hover:text-[#111111]'
                                }`}
                              >
                                <span>{brand}</span>
                                {isActive && <Check className="w-3 h-3 text-white" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Row 2: Category Selectable Pills with Manage Button & 1-touch Auto Aspect Ratio */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block font-semibold text-[#111111]">Phân loại danh mục</label>
                      <span className="text-[11px] text-black/50 font-medium">
                        Bấm 1 chạm để chọn và tự động gợi ý tỷ lệ khung hình tương ứng
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryActionError(null);
                        setCategoryActionSuccess(null);
                        setIsCategoryModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-black/60 hover:text-[#111111] transition-colors cursor-pointer shrink-0"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Quản lý danh mục</span>
                    </button>
                  </div>

                  {/* Selectable Category Pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    {categories.map((c) => {
                      const isSelected = editingProject.category === c;
                      const suggestedRatio = suggestAspectRatioForCategory(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setEditingProject({
                              ...editingProject,
                              category: c,
                              aspectRatio: suggestedRatio,
                            });
                          }}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-98 inline-flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-[#111111] text-white shadow-xs'
                              : 'bg-white border border-black/12 text-black/75 hover:border-black hover:text-[#111111]'
                          }`}
                        >
                          <span>{c}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-black/5 text-black/50'
                            }`}
                          >
                            {suggestedRatio}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Row 2b: Aspect Ratio, Year & Duration in 3 Equal Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block font-semibold text-[#111111]">Tỷ lệ khung hình</label>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                        {editingProject.aspectRatio === '9:16' ? 'Dọc Social' : 'Ngang TVC'}
                      </span>
                    </div>
                    <select
                      value={editingProject.aspectRatio}
                      onChange={(e) =>
                        setEditingProject({
                          ...editingProject,
                          aspectRatio: e.target.value as AspectRatioType,
                        })
                      }
                      className="w-full px-3 py-2.5 rounded-lg bg-[#F9F9FB] border border-black/10 text-sm text-[#111111] focus:bg-white focus:outline-none focus:border-[#111111] focus:ring-2 focus:ring-black/5 transition-all"
                    >
                      <option value="16:9">16:9 (Ngang TVC)</option>
                      <option value="9:16">9:16 (Dọc Social)</option>
                    </select>
                    <p className="text-[11px] text-black/45">
                      Tự động gợi ý từ danh mục ({editingProject.category})
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-semibold text-[#111111]">Năm thực hiện</label>
                    <input
                      type="text"
                      value={editingProject.year}
                      onChange={(e) =>
                        setEditingProject({ ...editingProject, year: e.target.value })
                      }
                      placeholder="2025"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#F9F9FB] border border-black/10 text-sm text-[#111111] focus:bg-white focus:outline-none focus:border-[#111111] focus:ring-2 focus:ring-black/5 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block font-semibold text-[#111111]">Thời lượng video</label>
                    </div>
                    <input
                      type="text"
                      value={editingProject.duration}
                      onChange={(e) =>
                        setEditingProject({ ...editingProject, duration: e.target.value })
                      }
                      placeholder="00:30, 00:45..."
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#F9F9FB] border border-black/10 text-sm text-[#111111] focus:bg-white focus:outline-none focus:border-[#111111] focus:ring-2 focus:ring-black/5 transition-all"
                    />
                    <p className="text-[11px] text-black/50">
                      Tự động bắt từ file MP4 / Dropbox
                    </p>
                  </div>
                </div>

                {/* Row 3: Video URL (YouTube, Vimeo, Google Drive, MP4 direct) */}
                <div className="space-y-2.5 bg-[#F9F9FB] p-4 sm:p-5 rounded-xl border border-black/[0.07]">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block font-semibold text-[#111111]">
                      Đường link Video (YouTube / Vimeo / VK Video / Google Drive / MP4)
                    </label>
                    <span className="bg-black/5 text-black/65 px-2.5 py-0.5 rounded-md text-[11px] font-medium shrink-0">
                      Hỗ trợ YouTube / Vimeo / VK / Drive / Dropbox / MP4
                    </span>
                  </div>

                  <input
                    type="text"
                    inputMode="url"
                    value={editingProject.videoUrl || ''}
                    onChange={(e) => handleVideoUrlChange(e.target.value)}
                    onBlur={(e) => handleVideoUrlChange(e.target.value)}
                    placeholder="https://vk.ru/video_ext.php... hoặc link YouTube, Vimeo, Drive, Dropbox, MP4"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-black/10 text-sm text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-2 focus:ring-black/5 transition-all font-mono text-xs"
                  />

                  <p className="text-[11px] text-[#777777] leading-relaxed">
                    Hỗ trợ YouTube (bao gồm Shorts tự nhận diện 9:16), Vimeo, VK Video &amp; VK Clip (vk.com / vk.ru / vkvideo.ru), Google Drive (cần bật quyền &quot;Bất kỳ ai có liên kết đều có thể xem&quot;), Dropbox MP4 và link file MP4 từ Cloudflare R2.
                  </p>

                  {/* VK Video Embedding Tip */}
                  {editingProject.videoUrl && parseVideoUrl(editingProject.videoUrl).type === 'vk' && (
                    !parseVideoUrl(editingProject.videoUrl).embedUrl?.includes('hash=') ? (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-900 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-amber-900">
                            Lưu ý khi nhúng video VK để tránh bị hỏi Captcha/Robot:
                          </p>
                          <p className="mt-0.5 text-amber-800 leading-relaxed">
                            VK bảo vệ video bằng mã bảo mật <code>hash</code>. Bạn nên vào video trên VK, bấm <strong>Chia sẻ (Share) &rarr; Mã nhúng (Embed)</strong> và copy cả đoạn mã iframe (hoặc link <code>video_ext.php?...&amp;hash=...</code>) dán vào đây để phát trực tiếp mượt mà.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-900 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <span>Đã nhận diện mã xác thực <strong>hash</strong> từ VK — video sẽ phát mượt mà không bị hỏi Captcha robot.</span>
                      </div>
                    )
                  )}

                  {/* Inline Video Preview (YouTube, Vimeo, Direct MP4) */}
                  {editingProject.videoUrl && parseVideoUrl(editingProject.videoUrl).type !== 'none' && (() => {
                    const parsed = parseVideoUrl(editingProject.videoUrl);
                    const isDirectOrDropbox = parsed.type === 'direct';
                    const directVideoSrc = parsed.directUrl || editingProject.videoUrl;
                    // In admin preview, route through /api/admin/video-proxy?url=... so crossOrigin canvas captures work without CORS tainting
                    const previewVideoSrc = isDirectOrDropbox && directVideoSrc
                      ? (directVideoSrc.startsWith('/') || directVideoSrc.startsWith('data:')
                          ? directVideoSrc
                          : `/api/admin/video-proxy?url=${encodeURIComponent(directVideoSrc)}`)
                      : directVideoSrc;
                    const isFrameCapturable = Boolean(isDirectOrDropbox && videoReadyState >= 2 && !isCapturingFrame);

                    return (
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                          <p className="text-[11px] font-bold text-[#333333] flex items-center gap-1.5 flex-wrap">
                            <span>Xem trước video:</span>
                            <span className="font-semibold text-black/75">
                              {parsed.type === 'youtube'
                                ? parsed.isShorts
                                  ? 'YouTube Shorts'
                                  : 'YouTube'
                                : parsed.type === 'vimeo'
                                ? 'Vimeo'
                                : parsed.type === 'gdrive'
                                ? 'Google Drive'
                                : parsed.type === 'vk'
                                ? parsed.isShorts
                                  ? 'VK Clip 9:16'
                                  : 'VK Video'
                                : parsed.isDropbox
                                ? 'Dropbox MP4'
                                : 'File MP4 / Trực tiếp'}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                editingProject.aspectRatio === '9:16'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-black/5 text-black/60 border border-black/10'
                              }`}
                            >
                              {editingProject.aspectRatio === '9:16' ? 'Dọc 9:16' : 'Ngang 16:9'}
                            </span>
                          </p>
                          <div className="flex items-center gap-2">
                            {/* Button: Chụp frame này làm ảnh bìa */}
                            {isDirectOrDropbox && (
                              <button
                                type="button"
                                disabled={!isFrameCapturable}
                                onClick={handleCaptureFrameAsCover}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                                  isFrameCapturable
                                    ? 'bg-[#111111] hover:bg-black/85 text-white shadow-xs cursor-pointer active:scale-98'
                                    : 'bg-black/5 text-black/35 cursor-not-allowed'
                                }`}
                                title={
                                  isFrameCapturable
                                    ? 'Bấm để chụp khung hình hiện tại trên video và đặt làm ảnh bìa'
                                    : 'Cần phát hoặc tua video để sẵn sàng chụp'
                                }
                              >
                                <Camera className="w-3.5 h-3.5" />
                                <span>{isCapturingFrame ? 'Đang chụp...' : 'Chụp frame này làm ảnh bìa'}</span>
                              </button>
                            )}

                            {/* Button: Lấy Thumbnail YouTube làm ảnh bìa */}
                            {parsed.type === 'youtube' && parsed.videoId && (
                              <button
                                type="button"
                                onClick={() => {
                                  const ytCover = `https://img.youtube.com/vi/${parsed.videoId}/maxresdefault.jpg`;
                                  setEditingProject((prev) => (prev ? { ...prev, coverImage: ytCover } : null));
                                  setFailedCoverUrl(null);
                                  setCaptureSuccessMsg('Đã lấy ảnh bìa HD từ YouTube (0MB dung lượng)!');
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs cursor-pointer active:scale-98 transition-all"
                                title="Lấy ảnh bìa gốc chất lượng cao từ YouTube (tiết kiệm 100% dung lượng)"
                              >
                                <Camera className="w-3.5 h-3.5" />
                                <span>Lấy bìa YouTube (0MB)</span>
                              </button>
                            )}

                            <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                              <span>Sẵn sàng phát</span>
                            </span>
                          </div>
                        </div>
                        {/* Video Player: Adaptively 9:16 vertical or 16:9 horizontal */}
                        <div
                          className={`w-full ${
                            editingProject.aspectRatio === '9:16'
                              ? 'max-w-[240px] aspect-[9/16]'
                              : 'max-w-md aspect-video'
                          } mx-auto rounded-xl overflow-hidden bg-black border border-black/10 shadow-md transition-all`}
                        >
                          {parsed.type === 'youtube' || parsed.type === 'vimeo' || parsed.type === 'gdrive' || parsed.type === 'vk' ? (
                            <div className="relative w-full h-full">
                              <iframe
                                src={parsed.embedUrl}
                                className="w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                allowFullScreen
                              />
                              {parsed.type === 'gdrive' && (
                                <div
                                  aria-hidden="true"
                                  className="absolute top-0 right-0 w-16 h-16 z-20 pointer-events-auto bg-transparent cursor-default"
                                />
                              )}
                            </div>
                          ) : (
                            <video
                              ref={videoPreviewRef}
                              crossOrigin="anonymous"
                              src={previewVideoSrc}
                              controls
                              preload="metadata"
                              onLoadedMetadata={(e) => {
                                handleVideoLoadedMetadata(e);
                                setVideoReadyState(e.currentTarget.readyState);
                              }}
                              onLoadedData={(e) => setVideoReadyState(e.currentTarget.readyState)}
                              onCanPlay={(e) => setVideoReadyState(e.currentTarget.readyState)}
                              onSeeked={(e) => setVideoReadyState(e.currentTarget.readyState)}
                              className="w-full h-full object-contain bg-black"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Row 4: Cover Image with Horizontal 2-Column Split */}
                <div className="space-y-3 bg-[#F9F9FB] p-4 sm:p-5 rounded-xl border border-black/[0.07]">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-[#111111]">
                      Ảnh bìa dự án (Cover Image)
                    </label>
                    <span className="text-[11px] text-black/50 font-medium">Tự động nén WebP &lt; 500KB</span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    {/* Bên trái: Khung xem trước ảnh bìa (tự động 9:16 dọc hoặc 16:9 ngang) */}
                    <div
                      className={`${
                        editingProject.aspectRatio === '9:16'
                          ? 'w-28 h-48 sm:w-32 sm:h-56 aspect-[9/16]'
                          : 'w-40 h-24 sm:w-48 sm:h-28 aspect-[16/9]'
                      } rounded-xl overflow-hidden border border-black/10 bg-black/5 shrink-0 relative flex items-center justify-center shadow-md transition-all`}
                    >
                      {editingProject.coverImage && failedCoverUrl !== editingProject.coverImage ? (
                        <img
                          key={editingProject.coverImage}
                          src={editingProject.coverImage}
                          alt="Xem trước ảnh bìa"
                          onError={() => {
                            if (editingProject.coverImage?.includes('maxresdefault.jpg')) {
                              // Tự động fallback sang hqdefault nếu video không có bản maxres
                              const fallbackUrl = editingProject.coverImage.replace('maxresdefault.jpg', 'hqdefault.jpg');
                              setEditingProject((prev) => (prev ? { ...prev, coverImage: fallbackUrl } : null));
                              return;
                            }
                            setFailedCoverUrl(editingProject.coverImage);
                            setUploadError(
                              'Ảnh bìa không tồn tại trên R2 (404) hoặc đường dẫn không hợp lệ. Vui lòng bấm "Chụp frame này làm ảnh bìa" hoặc tải ảnh mới.'
                            );
                          }}
                          onLoad={() => {
                            if (failedCoverUrl === editingProject.coverImage) {
                              setFailedCoverUrl(null);
                            }
                          }}
                          className="w-full h-full object-cover"
                        />
                      ) : editingProject.coverImage && failedCoverUrl === editingProject.coverImage ? (
                        <div className="flex flex-col items-center justify-center text-rose-600 text-[10px] font-semibold gap-1 text-center p-2 bg-rose-50 w-full h-full">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>Ảnh không tồn tại (404)</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-black/35 text-[10px] font-medium gap-1 text-center p-1">
                          <Upload className="w-4 h-4 opacity-50" />
                          <span>Chưa có ảnh</span>
                        </div>
                      )}
                      {editingProject.aspectRatio === '9:16' && (
                        <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-[#2563EB]/90 text-white text-[9px] font-bold shadow-xs">
                          9:16 Dọc
                        </span>
                      )}
                    </div>

                    {/* Bên phải: Nút tải ảnh từ máy + Nút lấy từ YouTube (nếu có) + Ô nhập link URL bên dưới */}
                    <div className="flex-1 w-full space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#111111] hover:bg-black/85 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs shrink-0 active:scale-98">
                          <Upload className="w-3.5 h-3.5 text-white" />
                          <span>{uploadingImage ? 'Đang nén WebP...' : 'Tải ảnh từ máy (Tự nén WebP)'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingImage}
                            onChange={handleImageFileChange}
                            className="hidden"
                          />
                        </label>

                        {/* Nút lấy lại ảnh bìa YouTube */}
                        {editingProject.videoUrl && parseVideoUrl(editingProject.videoUrl).type === 'youtube' && (() => {
                          const ytParsed = parseVideoUrl(editingProject.videoUrl);
                          if (!ytParsed.videoId) return null;
                          const ytCover = `https://img.youtube.com/vi/${ytParsed.videoId}/maxresdefault.jpg`;
                          const isAlreadyUsing = Boolean(editingProject.coverImage?.includes(ytParsed.videoId));
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProject((prev) => (prev ? { ...prev, coverImage: ytCover } : null));
                                setFailedCoverUrl(null);
                                setCaptureSuccessMsg('Đã lấy ảnh bìa HD từ YouTube (0MB dung lượng)!');
                              }}
                              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer active:scale-98 ${
                                isAlreadyUsing
                                  ? 'bg-red-50 text-red-700 border-red-200 shadow-xs'
                                  : 'bg-white text-red-600 hover:bg-red-50 border-red-200'
                              }`}
                              title="Tự động lấy ảnh bìa gốc của video YouTube này (tiết kiệm 100% dung lượng)"
                            >
                              <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                              <span>{isAlreadyUsing ? 'Đang dùng bìa YouTube (0MB)' : 'Lấy bìa YouTube (0MB)'}</span>
                            </button>
                          );
                        })()}
                      </div>

                      <input
                        type="text"
                        value={editingProject.coverImage}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, coverImage: e.target.value })
                        }
                        placeholder="Hoặc dán URL ảnh trực tiếp (VD: https://...)"
                        className="w-full px-3.5 py-2 rounded-lg bg-white border border-black/10 text-xs text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-2 focus:ring-black/5 transition-all"
                      />
                    </div>
                  </div>

                  {/* Capture Success notice */}
                  {captureSuccessMsg && (
                    <div className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-800 p-2.5 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{captureSuccessMsg}</span>
                    </div>
                  )}

                  {/* Compression stats notice */}
                  {compressionInfo && (
                    <div className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-800 p-2.5 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Đã tự động nén sang WebP: {formatBytes(compressionInfo.originalSize)} →{' '}
                        <strong>{formatBytes(compressionInfo.compressedSize)}</strong> (Giảm{' '}
                        {compressionInfo.savingsPercent}%, dưới 500KB chuẩn Cloudflare R2)
                      </span>
                    </div>
                  )}

                  {uploadError && (
                    <div className="flex items-center gap-2 text-xs bg-amber-50 text-amber-800 p-2.5 rounded-lg border border-amber-200">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}
                </div>

                {/* Row 5: Deliverable Roles (Multi-select Pills) */}
                <div className="space-y-2.5 col-span-full bg-[#F9F9FB] p-4 sm:p-5 rounded-xl border border-black/[0.07]">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <label className="block font-semibold text-[#111111]">
                        Vai trò đảm nhiệm (Deliverable Roles)
                      </label>
                      <span className="text-[11px] text-black/50 font-medium">
                        Bấm để chọn nhiều vai trò cùng lúc (Không tự chọn sẵn ép buộc)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-black/5 text-[#111111] border border-black/10 px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider">
                        {selectedRoles.length} vai trò đã chọn
                      </span>

                      {selectedRoles.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (editingProject) {
                              setEditingProject({ ...editingProject, deliverableRole: [] });
                            }
                          }}
                          className="px-2 py-0.5 text-[11px] font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/60 rounded-md border border-red-200/60 transition-colors cursor-pointer"
                          title="Bỏ chọn toàn bộ vai trò"
                        >
                          Bỏ chọn tất cả
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (editingProject) {
                              setEditingProject({
                                ...editingProject,
                                deliverableRole: ['Quay phim', 'Dựng phim'],
                              });
                            }
                          }}
                          className="px-2 py-0.5 text-[11px] font-semibold text-black/75 hover:text-[#111111] bg-black/5 hover:bg-black/10 rounded-md border border-black/10 transition-colors cursor-pointer"
                          title="Chọn nhanh vai trò phổ biến"
                        >
                          + Mặc định (Quay & Dựng)
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setRoleActionError(null);
                          setRoleActionSuccess(null);
                          setIsRoleModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-black/60 hover:text-[#111111] transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Quản lý vai trò</span>
                      </button>
                    </div>
                  </div>

                  {/* Multi-select Pills List */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {allVisibleRoles.map((role) => {
                      const isSelected = selectedRoles.includes(role);
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => toggleRole(role)}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none active:scale-98 ${
                            isSelected
                              ? 'bg-[#111111] text-white shadow-xs'
                              : 'bg-white border border-black/12 text-black/75 hover:border-black hover:text-[#111111]'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
                          <span>{role}</span>
                        </button>
                      );
                    })}

                    {/* Inline Add Custom Role Button / Form */}
                    {isAddingCustomRole ? (
                      <div className="inline-flex items-center gap-1.5 bg-white p-1 rounded-xl border border-black/20 shadow-xs">
                        <input
                          type="text"
                          autoFocus
                          value={customRoleInput}
                          onChange={(e) => setCustomRoleInput(e.target.value)}
                          placeholder="VD: Flycam, Multi-cam..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCustomRole();
                            } else if (e.key === 'Escape') {
                              setIsAddingCustomRole(false);
                              setCustomRoleInput('');
                            }
                          }}
                          className="px-2.5 py-1 text-xs text-[#111111] font-medium bg-transparent focus:outline-none w-36 sm:w-44"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomRole}
                          className="p-1.5 rounded-lg bg-[#111111] hover:bg-black/85 text-white transition-colors cursor-pointer"
                          title="Lưu vai trò mới"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingCustomRole(false);
                            setCustomRoleInput('');
                          }}
                          className="p-1.5 rounded-lg text-black/50 hover:text-black hover:bg-black/5 transition-colors cursor-pointer"
                          title="Hủy"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCustomRole(true);
                          setCustomRoleInput('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-black/25 text-xs font-semibold text-black/60 hover:text-black hover:border-black/50 bg-white/60 hover:bg-white transition-all cursor-pointer active:scale-98"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm vai trò</span>
                      </button>
                    )}
                  </div>

                  {/* Visual preview of formatted roles */}
                  <div className="pt-1 text-[11px] text-black/55 flex items-center gap-1.5">
                    <span className="text-black/40">Hiển thị thực tế:</span>
                    <span className="font-semibold text-black/85">
                      {selectedRoles.length > 0
                        ? selectedRoles.join(' · ')
                        : 'Chưa có vai trò nào được chọn'}
                    </span>
                  </div>
                </div>

                {/* Row 6: Agency Brief */}
                <div className="space-y-1.5">
                  <label className="block font-semibold text-[#111111]">Brief tóm tắt từ Agency</label>
                  <textarea
                    rows={3}
                    value={editingProject.agencyBrief}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, agencyBrief: e.target.value })
                    }
                    placeholder="Mô tả ngắn gọn yêu cầu và kết quả bàn giao của dự án..."
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#F9F9FB] border border-black/10 text-sm text-[#111111] leading-relaxed focus:bg-white focus:outline-none focus:border-[#111111] focus:ring-2 focus:ring-black/5 transition-all"
                  />
                </div>
              </div>

              {/* Footer: Pinned at bottom */}
              <div className="shrink-0 border-t border-black/[0.07] px-6 py-4 bg-[#F9F9FB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 rounded-xl border border-black/10 bg-white hover:bg-black/5 text-xs font-semibold text-[#555555] transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-[#111111] hover:bg-black/85 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98"
                >
                  {isCreatingNew ? 'Thêm vào danh sách' : 'Cập nhật dự án'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QUẢN LÝ PHÂN LOẠI DANH MỤC (CATEGORY MANAGEMENT) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-black/[0.07] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header: Pinned at top */}
            <div className="shrink-0 bg-white border-b border-black/[0.07] px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold tracking-wider text-[#111111] uppercase">
                  QUẢN LÝ PHÂN LOẠI DANH MỤC
                </h3>
                <p className="text-[11px] text-black/50 mt-0.5">
                  Tự động đồng bộ với bộ lọc trang chủ và danh sách dự án.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseCategoryModal}
                className="w-8 h-8 rounded-full border border-black/10 flex items-center justify-center text-black/60 hover:text-black hover:bg-black/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Alert Feedback Banners */}
              {categoryActionSuccess && (
                <div className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="flex-1">{categoryActionSuccess}</span>
                  <button
                    type="button"
                    onClick={() => setCategoryActionSuccess(null)}
                    className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {categoryActionError && (
                <div className="flex items-center gap-2 text-xs bg-amber-50 text-amber-800 p-3 rounded-xl border border-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="flex-1">{categoryActionError}</span>
                  <button
                    type="button"
                    onClick={() => setCategoryActionError(null)}
                    className="text-amber-700 hover:text-amber-900 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Add New Category Box */}
              <div className="bg-[#F9F9FB] p-4 rounded-xl border border-black/[0.07] space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-black/70">
                    Thêm phân loại mới
                  </label>
                  <span className="text-[11px] text-black/40">
                    Kèm thuật ngữ sản xuất chuyên ngành
                  </span>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newCategoryInput}
                    onChange={(e) => {
                      setNewCategoryInput(e.target.value);
                      if (categoryActionError) setCategoryActionError(null);
                    }}
                    placeholder="Tên danh mục (VD: Documentary, 3D Animation, Music Video...)"
                    className="w-full px-3.5 py-2 rounded-lg bg-white border border-black/10 text-xs text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-2 focus:ring-black/5 transition-all font-semibold"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newCategorySubtitleInput}
                      onChange={(e) => {
                        setNewCategorySubtitleInput(e.target.value);
                        if (categoryActionError) setCategoryActionError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCategory();
                        }
                      }}
                      placeholder="Mô tả phụ chuyên ngành (để trống nếu muốn ẩn dấu —)"
                      className="flex-1 px-3.5 py-2 rounded-lg bg-white border border-black/10 text-xs text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-2 focus:ring-black/5 transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="px-4 py-2 bg-[#111111] hover:bg-black/85 text-white rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Existing Categories List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-black/60">
                    Danh sách phân loại ({categories.length})
                  </h4>
                  <span className="text-[11px] text-black/40">
                    Thứ tự hiển thị & mô tả phụ trên trang chủ
                  </span>
                </div>

                <div className="space-y-2">
                  {categories.map((cat, catIdx) => {
                    const projectCount = projects.filter((p) => p.category === cat).length;
                    const isRenaming = renamingCategory?.oldName === cat;
                    const isDeleting = deletingCategory?.name === cat;
                    const effectiveMeta = getCategoryMeta(cat, categorySubtitles);
                    const currentCustomSub = categorySubtitles?.[cat];
                    const activeSubtitle = currentCustomSub !== undefined ? currentCustomSub : effectiveMeta.subtitle;

                    return (
                      <div
                        key={cat}
                        className="bg-[#F9F9FB] rounded-xl border border-black/[0.07] p-3 sm:p-3.5 space-y-2.5 shadow-2xs"
                      >
                        {/* Renaming Mode */}
                        {isRenaming ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                autoFocus
                                value={renamingCategory.newName}
                                onChange={(e) =>
                                  setRenamingCategory({ ...renamingCategory, newName: e.target.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleRenameCategory(cat, renamingCategory.newName);
                                  } else if (e.key === 'Escape') {
                                    setRenamingCategory(null);
                                  }
                                }}
                                className="flex-1 px-3 py-1.5 rounded-lg bg-[#F7F6F2] border border-black/20 text-xs text-[#111111] font-semibold focus:outline-none focus:border-[#111111]"
                              />
                              <button
                                type="button"
                                onClick={() => handleRenameCategory(cat, renamingCategory.newName)}
                                className="px-3 py-1.5 bg-[#111111] hover:bg-black/85 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Check className="w-3 h-3" />
                                <span>Lưu</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setRenamingCategory(null)}
                                className="px-3 py-1.5 border border-black/10 hover:bg-black/5 text-[#555555] rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                              >
                                Hủy
                              </button>
                            </div>
                            <p className="text-[11px] text-amber-700 bg-amber-50/60 p-2 rounded-lg border border-amber-200/60">
                              ℹ Tự động đổi tên và cập nhật phân loại này cho toàn bộ dự án hiện hữu.
                            </p>
                          </div>
                        ) : isDeleting ? (
                          /* Delete Confirmation Mode */
                          <div className="space-y-2.5 bg-red-50/70 p-3 rounded-lg border border-red-200/80">
                            <div className="text-xs text-red-900 leading-relaxed font-medium">
                              Xác nhận xóa danh mục "<strong>{cat}</strong>" khỏi hệ thống?
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => setDeletingCategory(null)}
                                className="px-3 py-1.5 border border-black/10 hover:bg-white text-xs font-semibold text-[#555555] rounded-lg cursor-pointer transition-colors"
                              >
                                Hủy bỏ
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(cat)}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                              >
                                Xác nhận xóa
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Standard View Mode */
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                {/* Reorder Up / Down Controls */}
                                <div className="flex items-center gap-0.5 shrink-0 bg-[#F7F6F2] p-0.5 rounded-lg border border-black/8">
                                  <button
                                    type="button"
                                    disabled={catIdx === 0}
                                    onClick={() => handleMoveCategory(catIdx, 'up')}
                                    className={`p-1 rounded-md transition-colors ${
                                      catIdx === 0
                                        ? 'text-black/15 cursor-not-allowed'
                                        : 'text-black/60 hover:text-black hover:bg-black/5 cursor-pointer'
                                    }`}
                                    title={catIdx === 0 ? 'Đang ở đầu danh sách' : 'Di chuyển lên'}
                                    aria-label={`Di chuyển danh mục ${cat} lên`}
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={catIdx === categories.length - 1}
                                    onClick={() => handleMoveCategory(catIdx, 'down')}
                                    className={`p-1 rounded-md transition-colors ${
                                      catIdx === categories.length - 1
                                        ? 'text-black/15 cursor-not-allowed'
                                        : 'text-black/60 hover:text-black hover:bg-black/5 cursor-pointer'
                                    }`}
                                    title={catIdx === categories.length - 1 ? 'Đang ở cuối danh sách' : 'Di chuyển xuống'}
                                    aria-label={`Di chuyển danh mục ${cat} xuống`}
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <span className="font-semibold text-xs text-[#111111] truncate">
                                  {cat}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 text-black/60 font-medium shrink-0">
                                  {projectCount} dự án
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRenamingCategory({ oldName: cat, newName: cat });
                                    setDeletingCategory(null);
                                    setCategoryActionError(null);
                                    setCategoryActionSuccess(null);
                                  }}
                                  className="p-1.5 text-black/50 hover:text-black hover:bg-black/5 rounded-md transition-colors cursor-pointer"
                                  title="Đổi tên danh mục"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {projectCount > 0 ? (
                                  <button
                                    type="button"
                                    disabled
                                    className="p-1.5 text-black/30 opacity-30 cursor-not-allowed rounded-md transition-colors"
                                    title="Cần chuyển hết dự án sang mục khác trước khi xóa"
                                    aria-label={`Không thể xóa danh mục ${cat} vì đang có ${projectCount} dự án`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (categories.length <= 1) {
                                        setCategoryActionError('Cần giữ lại ít nhất 1 danh mục trong hệ thống.');
                                        return;
                                      }
                                      setDeletingCategory({ name: cat, projectCount: 0 });
                                      setRenamingCategory(null);
                                      setCategoryActionError(null);
                                      setCategoryActionSuccess(null);
                                    }}
                                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                    title="Xóa danh mục"
                                    aria-label={`Xóa danh mục ${cat}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Subtitle Customization Input */}
                            <div className="pt-2 border-t border-black/[0.06] space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-black/50">
                                  Mô tả phụ hạng mục
                                </label>
                                <span className="text-[10px] text-black/40 font-medium truncate max-w-[260px]">
                                  {activeSubtitle?.trim() ? (
                                    <span className="text-emerald-700 font-semibold">
                                      Hiển thị: — {activeSubtitle.trim()}
                                    </span>
                                  ) : (
                                    <span className="text-amber-700 font-semibold">(Để trống: Ẩn dấu —)</span>
                                  )}
                                </span>
                              </div>
                              <input
                                type="text"
                                value={activeSubtitle}
                                onChange={(e) => handleUpdateSubtitle(cat, e.target.value)}
                                placeholder="Nhập thuật ngữ chuyên ngành (để trống nếu muốn ẩn dấu —)"
                                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-black/15 text-xs text-[#111111] placeholder:text-black/35 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all font-normal"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer: Pinned at bottom */}
            <div className="shrink-0 bg-white border-t border-black/[0.07] px-6 py-3.5 flex items-center justify-between">
              <span className="text-[11px] text-black/45 hidden sm:inline">
                Nhấn <strong>Lưu thay đổi</strong> ở thanh trên cùng để lưu lên D1.
              </span>
              <button
                type="button"
                onClick={handleCloseCategoryModal}
                className="w-full sm:w-auto px-5 py-2 bg-[#111111] hover:bg-black/85 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98"
              >
                Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QUẢN LÝ THẺ VAI TRÒ (ROLE MANAGEMENT) */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-black/[0.07] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header: Pinned at top */}
            <div className="shrink-0 bg-white border-b border-black/[0.07] px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold tracking-wider text-[#111111] uppercase">
                  QUẢN LÝ THẺ VAI TRÒ
                </h3>
                <p className="text-[11px] text-black/50 mt-0.5">
                  Tự động đồng bộ với danh sách vai trò dự án và Cloudflare D1.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseRoleModal}
                className="w-8 h-8 rounded-full border border-black/10 flex items-center justify-center text-black/60 hover:text-black hover:bg-black/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body: Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Alert Feedback Banners */}
              {roleActionSuccess && (
                <div className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="flex-1">{roleActionSuccess}</span>
                  <button
                    type="button"
                    onClick={() => setRoleActionSuccess(null)}
                    className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {roleActionError && (
                <div className="flex items-center gap-2 text-xs bg-amber-50 text-amber-800 p-3 rounded-xl border border-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="flex-1">{roleActionError}</span>
                  <button
                    type="button"
                    onClick={() => setRoleActionError(null)}
                    className="text-amber-700 hover:text-amber-900 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Add New Role Box */}
              <div className="bg-[#F9F9FB] p-4 rounded-xl border border-black/[0.07] space-y-2.5 shadow-2xs">
                <label className="block text-xs font-semibold text-[#111111]">
                  Thêm vai trò mới
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newRoleInput}
                    onChange={(e) => {
                      setNewRoleInput(e.target.value);
                      if (roleActionError) setRoleActionError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRole();
                      }
                    }}
                    placeholder="VD: Đạo diễn hình ảnh, Drone Operator, Colorist..."
                    className="flex-1 px-3.5 py-2 rounded-lg bg-white border border-black/10 text-xs text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-2 focus:ring-black/5 transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleAddRole}
                    className="px-4 py-2 bg-[#111111] hover:bg-black/85 text-white rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm</span>
                  </button>
                </div>
              </div>

              {/* Existing Roles List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-black/60">
                    Danh sách vai trò ({availableRoles.length})
                  </h4>
                  <span className="text-[11px] text-black/40">
                    Thứ tự hiển thị trong modal chỉnh sửa
                  </span>
                </div>

                <div className="space-y-2">
                  {availableRoles.map((role, roleIdx) => {
                    const projectCount = projects.filter((p) =>
                      parseDeliverableRoles(p.deliverableRole).includes(role)
                    ).length;
                    const isRenaming = renamingRole?.oldName === role;
                    const isDeleting = deletingRole?.name === role;

                    return (
                      <div
                        key={role}
                        className="bg-[#F9F9FB] rounded-xl border border-black/[0.07] p-3 sm:p-3.5 space-y-2.5 shadow-2xs"
                      >
                        {/* Renaming Mode */}
                        {isRenaming ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                autoFocus
                                value={renamingRole.newName}
                                onChange={(e) =>
                                  setRenamingRole({ ...renamingRole, newName: e.target.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleRenameRole(role, renamingRole.newName);
                                  } else if (e.key === 'Escape') {
                                    setRenamingRole(null);
                                  }
                                }}
                                className="flex-1 px-3 py-1.5 rounded-lg bg-[#F7F6F2] border border-black/20 text-xs text-[#111111] font-semibold focus:outline-none focus:border-[#111111]"
                              />
                              <button
                                type="button"
                                onClick={() => handleRenameRole(role, renamingRole.newName)}
                                className="px-3 py-1.5 bg-[#111111] hover:bg-black/85 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Check className="w-3 h-3" />
                                <span>Lưu</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setRenamingRole(null)}
                                className="px-3 py-1.5 border border-black/10 hover:bg-black/5 text-[#555555] rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                              >
                                Hủy
                              </button>
                            </div>
                            <p className="text-[11px] text-amber-700 bg-amber-50/60 p-2 rounded-lg border border-amber-200/60">
                              ℹ Tự động đổi tên và cập nhật vai trò này cho toàn bộ dự án đang sử dụng.
                            </p>
                          </div>
                        ) : isDeleting ? (
                          /* Delete Confirmation Mode */
                          <div className="space-y-2.5 bg-red-50/70 p-3 rounded-lg border border-red-200/80">
                            <div className="text-xs text-red-900 leading-relaxed font-medium">
                              Xác nhận xóa vai trò "<strong>{role}</strong>" khỏi danh sách gợi ý?
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => setDeletingRole(null)}
                                className="px-3 py-1.5 border border-black/10 hover:bg-white text-xs font-semibold text-[#555555] rounded-lg cursor-pointer transition-colors"
                              >
                                Hủy bỏ
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRole(role)}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                              >
                                Xác nhận xóa
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Standard View Mode */
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              {/* Reorder Up / Down Controls */}
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  disabled={roleIdx === 0}
                                  onClick={() => handleMoveRole(roleIdx, 'up')}
                                  className={`p-1 rounded-md transition-colors ${
                                    roleIdx === 0
                                      ? 'text-black/15 cursor-not-allowed'
                                      : 'text-black/60 hover:text-black hover:bg-black/5 cursor-pointer'
                                  }`}
                                  title={roleIdx === 0 ? 'Đang ở đầu danh sách' : 'Di chuyển lên'}
                                  aria-label={`Di chuyển vai trò ${role} lên`}
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={roleIdx === availableRoles.length - 1}
                                  onClick={() => handleMoveRole(roleIdx, 'down')}
                                  className={`p-1 rounded-md transition-colors ${
                                    roleIdx === availableRoles.length - 1
                                      ? 'text-black/15 cursor-not-allowed'
                                      : 'text-black/60 hover:text-black hover:bg-black/5 cursor-pointer'
                                  }`}
                                  title={roleIdx === availableRoles.length - 1 ? 'Đang ở cuối danh sách' : 'Di chuyển xuống'}
                                  aria-label={`Di chuyển vai trò ${role} xuống`}
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <span className="font-semibold text-xs text-[#111111] truncate">
                                {role}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 text-black/60 font-medium shrink-0">
                                {projectCount} dự án
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setRenamingRole({ oldName: role, newName: role });
                                  setDeletingRole(null);
                                  setRoleActionError(null);
                                  setRoleActionSuccess(null);
                                }}
                                className="p-1.5 text-black/50 hover:text-black hover:bg-black/5 rounded-md transition-colors cursor-pointer"
                                title="Đổi tên vai trò"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {projectCount > 0 ? (
                                <button
                                  type="button"
                                  disabled
                                  className="p-1.5 text-black/30 opacity-30 cursor-not-allowed rounded-md transition-colors"
                                  title="Cần gỡ khỏi các dự án trước khi xóa vai trò này"
                                  aria-label={`Không thể xóa vai trò ${role} vì đang có ${projectCount} dự án sử dụng`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (availableRoles.length <= 1) {
                                      setRoleActionError('Cần giữ lại ít nhất 1 vai trò trong hệ thống.');
                                      return;
                                    }
                                    setDeletingRole({ name: role, projectCount: 0 });
                                    setRenamingRole(null);
                                    setRoleActionError(null);
                                    setRoleActionSuccess(null);
                                  }}
                                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                  title="Xóa vai trò"
                                  aria-label={`Xóa vai trò ${role}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer: Pinned at bottom */}
            <div className="shrink-0 bg-white border-t border-black/[0.07] px-6 py-3.5 flex items-center justify-between">
              <span className="text-[11px] text-black/45 hidden sm:inline">
                Nhấn <strong>Lưu thay đổi</strong> ở thanh trên cùng để lưu lên D1.
              </span>
              <button
                type="button"
                onClick={handleCloseRoleModal}
                className="w-full sm:w-auto px-5 py-2 bg-[#111111] hover:bg-black/85 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98"
              >
                Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
