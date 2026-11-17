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
import { compressImageToWebP, formatBytes, type CompressionResult } from '../../utils/imageCompression';
import { parseVideoUrl, formatVideoDuration, normalizeDropboxUrl } from '../../utils/videoEmbed';
import {
  parseDeliverableRoles,
  formatDeliverableRoles,
  suggestAspectRatioForCategory,
} from '../../utils/portfolioLogic';

interface ProjectsTabProps {
  projects: PortfolioProject[];
  categories?: string[];
  roles?: string[];
  onAddProject: (project: PortfolioProject) => void;
  onUpdateProject: (id: string, partial: Partial<PortfolioProject>) => void;
  onDeleteProject: (id: string) => void;
  onReorderProjects?: (projects: PortfolioProject[]) => void;
  onUpdateCategories?: (categories: string[]) => void;
  onUpdateRoles?: (roles: string[]) => void;
  onMarkUnsaved?: () => void;
}

const DEFAULT_CATEGORIES: string[] = [
  'TVC',
  'Social 9:16',
  'Motion',
  'Event Recap',
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
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onReorderProjects,
  onUpdateCategories,
  onUpdateRoles,
  onMarkUnsaved,
}: ProjectsTabProps) {
  const categories = inputCategories && inputCategories.length > 0 ? inputCategories : DEFAULT_CATEGORIES;
  const availableRoles = inputRoles && inputRoles.length > 0 ? inputRoles : DEFAULT_SUGGESTED_ROLES;
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [editingProject, setEditingProject] = useState<PortfolioProject | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<CompressionResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Video Frame Capture State
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const [videoReadyState, setVideoReadyState] = useState<number>(0);
  const [isCapturingFrame, setIsCapturingFrame] = useState(false);
  const [captureSuccessMsg, setCaptureSuccessMsg] = useState<string | null>(null);

  // Category Management Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [renamingCategory, setRenamingCategory] = useState<{ oldName: string; newName: string } | null>(null);
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
    if (!trimmed) {
      setCategoryActionError('Vui lòng nhập tên danh mục.');
      return;
    }
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setCategoryActionError(`Danh mục "${trimmed}" đã tồn tại.`);
      return;
    }
    const updated = [...categories, trimmed];
    if (onUpdateCategories) {
      onUpdateCategories(updated);
    }
    setNewCategoryInput('');
    setCategoryActionError(null);
    setCategoryActionSuccess(`Đã thêm danh mục "${trimmed}" thành công!`);
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

    // 1. Update categories array
    const updatedCategories = categories.map((c) => (c === oldName ? trimmed : c));
    if (onUpdateCategories) {
      onUpdateCategories(updatedCategories);
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

    if (onUpdateCategories) {
      onUpdateCategories(remainingCategories);
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
    const emptyProject: PortfolioProject = {
      id: newId,
      title: '',
      clientOrAgency: '',
      category: categories[0] || 'TVC',
      aspectRatio: '16:9',
      gridSpan: 'col-span-12 md:col-span-6',
      year: new Date().getFullYear().toString(),
      duration: '00:30',
      deliverableRole: ['Quay phim', 'Dựng phim'],
      coverImage: '',
      videoUrl: '',
      agencyBrief: '',
      hidden: false,
    };
    setEditingProject(emptyProject);
    setIsCreatingNew(true);
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

      // Compress to WebP < 500KB (handles resize/compression if raw 4K frame is large)
      const compressionResult = await compressImageToWebP(file, 1920, 500 * 1024);
      setCompressionInfo(compressionResult);

      // Upload to Cloudflare R2
      const formData = new FormData();
      formData.append('file', compressionResult.file);

      let finalUrl = compressionResult.dataUrl;

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
        console.warn('R2 upload notice, using local WebP preview:', uploadErr);
      }

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

  // Auto-detect and format video duration when direct MP4 video loads metadata
  const handleVideoLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    if (
      video &&
      typeof video.duration === 'number' &&
      !isNaN(video.duration) &&
      isFinite(video.duration) &&
      video.duration > 0
    ) {
      const formatted = formatVideoDuration(video.duration);
      if (formatted) {
        setEditingProject((prev) => (prev ? { ...prev, duration: formatted } : null));
      }
    }
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editingProject.title.trim()) return;

    if (isCreatingNew) {
      onAddProject(editingProject);
    } else {
      onUpdateProject(editingProject.id, editingProject);
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

    try {
      setUploadingImage(true);
      setUploadError(null);

      // 1. Compress image to WebP under 500KB on the client
      const result = await compressImageToWebP(file, 1920, 500 * 1024);
      setCompressionInfo(result);

      // 2. Upload compressed file to Cloudflare R2
      const formData = new FormData();
      formData.append('file', result.file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload thất bại (HTTP ${res.status})`);
      }

      const uploadRes = await res.json();
      if (uploadRes && uploadRes.success && uploadRes.url) {
        if (editingProject) {
          setEditingProject({ ...editingProject, coverImage: uploadRes.url });
        }
      } else {
        // Fallback to compressed DataURL if R2 is not bound in dev
        if (editingProject) {
          setEditingProject({ ...editingProject, coverImage: result.dataUrl });
        }
      }
    } catch (err: any) {
      console.warn('Image upload notice:', err);
      // Even if network upload fails, use the compressed WebP dataUrl for immediate local preview
      if (editingProject && compressionInfo) {
        setEditingProject({ ...editingProject, coverImage: compressionInfo.dataUrl });
      }
      setUploadError(err?.message || 'Không thể upload ảnh lên Cloudflare R2');
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

      {/* 2. Projects Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProjects.map((project, idx) => {
          const videoMeta = getVideoSourceMeta(project.videoUrl);
          const isFirst = idx === 0;
          const isLast = idx === filteredProjects.length - 1;

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
                {/* Thumbnail Preview (Clean, without noisy text overlay) */}
                <div className="relative aspect-[16/9] bg-[#141414] overflow-hidden">
                  {project.coverImage ? (
                    <img
                      src={project.coverImage}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30 text-xs font-medium">
                      Chưa có ảnh bìa
                    </div>
                  )}

                  {/* Top-left Badges: Category & Aspect Ratio */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
                      {project.category}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-md text-[#111111] text-[10px] font-bold tabular-nums">
                      {project.aspectRatio}
                    </span>
                  </div>

                  {/* Top-right Draft/Hidden Badge */}
                  {project.hidden && (
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-amber-500/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider shadow-xs">
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
                  <label className="block font-semibold text-[#111111]">Tên dự án *</label>
                  <input
                    type="text"
                    required
                    value={editingProject.title}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, title: e.target.value })
                    }
                    placeholder="VD: Pepsi Electric Blue — Summer Launch..."
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#F9F9FB] border border-black/10 text-sm font-semibold text-[#111111] focus:bg-white focus:outline-none focus:border-[#111111] focus:ring-2 focus:ring-black/5 transition-all"
                  />
                </div>

                {/* Row 1b: Khách hàng / Thương hiệu của riêng dự án này (Tùy chọn) */}
                <div className="space-y-3 bg-[#F9F9FB] p-4 sm:p-5 rounded-xl border border-black/[0.07]">
                  <div>
                    <label className="block font-semibold text-[#111111]">
                      Khách hàng / Thương hiệu của riêng dự án này{' '}
                      <span className="text-[11px] font-normal text-black/50">(Tùy chọn — Chỉ điền cho Commercial/TVC)</span>
                    </label>
                    <span className="text-[11px] text-black/50 font-medium">
                      Dự án Đám cưới / Khách lẻ / Độc lập: để trống (web tự ẩn Brand). Chỉ điền Brand khi làm dự án Commercial.
                    </span>
                  </div>

                  {/* Manual input for custom typing */}
                  <input
                    type="text"
                    value={editingProject.clientOrAgency || ''}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, clientOrAgency: e.target.value })
                    }
                    placeholder="Để trống nếu là Đám cưới / Khách lẻ, hoặc điền tên Brand (VD: PepsiCo, VinFast...)"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-black/10 text-sm text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-2 focus:ring-black/5 transition-all font-medium"
                  />

                  {/* Hành động nhanh: 1 chạm xóa trắng cho Khách lẻ / Đám cưới */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
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
                      <span>Không hiển thị Brand (Khách lẻ / Đám cưới)</span>
                    </button>
                  </div>
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

                {/* Row 3: Video URL (YouTube, Vimeo, MP4 direct) */}
                <div className="space-y-2.5 bg-[#F9F9FB] p-4 sm:p-5 rounded-xl border border-black/[0.07]">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block font-semibold text-[#111111]">
                      Đường link Video (YouTube / Vimeo / MP4 trực tiếp)
                    </label>
                    <span className="bg-black/5 text-black/65 px-2.5 py-0.5 rounded-md text-[11px] font-medium shrink-0">
                      Hỗ trợ MP4 / Dropbox / YouTube
                    </span>
                  </div>

                  <input
                    type="url"
                    value={editingProject.videoUrl || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const normalized = normalizeDropboxUrl(val);
                      setEditingProject({ ...editingProject, videoUrl: normalized });
                    }}
                    onBlur={(e) => {
                      const val = e.target.value;
                      const normalized = normalizeDropboxUrl(val);
                      if (normalized !== val) {
                        setEditingProject({ ...editingProject, videoUrl: normalized });
                      }
                    }}
                    placeholder="https://www.youtube.com/... hoặc link Vimeo, Dropbox, MP4"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-black/10 text-sm text-[#111111] focus:outline-none focus:border-[#111111] focus:ring-2 focus:ring-black/5 transition-all"
                  />

                  <p className="text-[11px] text-[#777777] leading-relaxed">
                    Hỗ trợ link YouTube, Vimeo, Dropbox (tự động chuyển sang luồng phát trực tiếp) hoặc link file MP4 từ Cloudflare R2.
                  </p>

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
                          <p className="text-[11px] font-bold text-[#333333]">
                            Xem trước video ({
                              parsed.type === 'youtube'
                                ? 'YouTube'
                                : parsed.type === 'vimeo'
                                ? 'Vimeo'
                                : parsed.isDropbox
                                ? 'Dropbox MP4'
                                : 'File MP4 / Trực tiếp'
                            }):
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

                            <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                              <span>Sẵn sàng phát</span>
                            </span>
                          </div>
                        </div>
                        <div className="w-full max-w-md aspect-video rounded-xl overflow-hidden bg-black border border-black/10 shadow-xs">
                          {parsed.type === 'youtube' || parsed.type === 'vimeo' ? (
                            <iframe
                              src={parsed.embedUrl}
                              className="w-full h-full border-0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
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
                              className="w-full h-full object-cover"
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
                    {/* Bên trái: Khung xem trước ảnh bìa tỷ lệ 16:9 rõ nét */}
                    <div className="w-36 h-20 rounded-lg overflow-hidden border border-black/10 bg-black/5 shrink-0 relative flex items-center justify-center shadow-2xs">
                      {editingProject.coverImage ? (
                        <img
                          src={editingProject.coverImage}
                          alt="Xem trước ảnh bìa"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-black/35 text-[10px] font-medium gap-1 text-center p-1">
                          <Upload className="w-4 h-4 opacity-50" />
                          <span>Chưa có ảnh</span>
                        </div>
                      )}
                    </div>

                    {/* Bên phải: Nút tải ảnh từ máy + Ô nhập link URL bên dưới */}
                    <div className="flex-1 w-full space-y-2">
                      <div className="flex items-center gap-2">
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
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block font-semibold text-[#111111]">
                        Vai trò đảm nhiệm (Deliverable Roles)
                      </label>
                      <span className="text-[11px] text-black/50 font-medium">
                        Bấm để chọn nhiều vai trò cùng lúc (Multi-select)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-black/5 text-[#111111] border border-black/10 px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider">
                        {selectedRoles.length} vai trò đã chọn
                      </span>
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
              <div className="bg-[#F9F9FB] p-4 rounded-xl border border-black/[0.07] space-y-2.5 shadow-2xs">
                <label className="block text-xs font-semibold text-[#111111]">
                  Thêm phân loại mới
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCategoryInput}
                    onChange={(e) => {
                      setNewCategoryInput(e.target.value);
                      if (categoryActionError) setCategoryActionError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCategory();
                      }
                    }}
                    placeholder="VD: Documentary, 3D Animation, Travel Film..."
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

              {/* Existing Categories List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-black/60">
                    Danh sách phân loại ({categories.length})
                  </h4>
                  <span className="text-[11px] text-black/40">
                    Thứ tự hiển thị trên bộ lọc trang chủ
                  </span>
                </div>

                <div className="space-y-2">
                  {categories.map((cat, catIdx) => {
                    const projectCount = projects.filter((p) => p.category === cat).length;
                    const isRenaming = renamingCategory?.oldName === cat;
                    const isDeleting = deletingCategory?.name === cat;

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
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              {/* Reorder Up / Down Controls */}
                              <div className="flex items-center gap-0.5 shrink-0">
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
