import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Settings, 
  Save, 
  Plus, 
  Trash2, 
  Globe, 
  Code, 
  Briefcase, 
  Paintbrush, 
  Copy, 
  Check, 
  Download, 
  Info,
  Tv,
  Clock,
  Layout,
  SlidersHorizontal,
  FolderLock,
  User,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Eye,
  Film,
  Video,
  Layers,
  Camera,
  Cpu,
  GraduationCap,
  GripVertical,
  LogOut
} from "lucide-react";
import { UserProfile, Project, Experience, Skill, ThemeType, THEMES } from "../types";
import { formatTitleCase, formatCategory } from "../utils/titleCase";
import { motion } from "motion/react";
import { SkillIcon } from "./SkillIcon";
import { 
  mapCloudflareToProfile, 
  mapToCloudflareProfilePayload, 
  mapToCloudflareSettingsPayload, 
  mapToCloudflareProjectsPayload 
} from "../utils/cloudflareMapper";

interface AdminDashboardProps {
  profile: UserProfile;
  setProfile: (updatedProfile: UserProfile | ((prev: UserProfile) => UserProfile)) => void;
  currentTheme: ThemeType;
  setTheme: (t: ThemeType) => void;
  onBackToPortfolio: () => void;
  onLogout?: () => void;
}

type TabType = "general" | "skills" | "projects" | "experience" | "theme" | "cloudflare" | "export";

export function extractYouTubeId(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();

  // If it's just an 11-char alphanumeric string, it's already an ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    // 1. Shorts format
    if (trimmed.includes("youtube.com/shorts/")) {
      const parts = trimmed.split("youtube.com/shorts/");
      if (parts[1]) {
        const id = parts[1].split(/[?&#]/)[0];
        if (id.length === 11) return id;
      }
    }
    
    // 2. Embed format
    if (trimmed.includes("youtube.com/embed/")) {
      const parts = trimmed.split("youtube.com/embed/");
      if (parts[1]) {
        const id = parts[1].split(/[?&#]/)[0];
        if (id.length === 11) return id;
      }
    }

    // 3. Share URL (youtu.be)
    if (trimmed.includes("youtu.be/")) {
      const parts = trimmed.split("youtu.be/");
      if (parts[1]) {
        const id = parts[1].split(/[?&#]/)[0];
        if (id.length === 11) return id;
      }
    }

    // 4. Standard Desktop watch (youtube.com/watch?v=)
    if (trimmed.includes("v=")) {
      const urlObj = new URL(trimmed);
      const id = urlObj.searchParams.get("v");
      if (id && id.length === 11) return id;
    }
  } catch (e) {
    // fallback to regex if URL parsing or splitting fails
  }

  // General Regex fallback
  const regExp = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = trimmed.match(regExp);
  if (match && match[1] && match[1].length === 11) {
    return match[1];
  }

  return null;
}

export default function AdminDashboard({
  profile,
  setProfile,
  currentTheme,
  setTheme,
  onBackToPortfolio,
  onLogout,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [copied, setCopied] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState(JSON.stringify(profile, null, 2));
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cloudflare D1 / R2 Integration Settings
  const [cfEnabled, setCfEnabled] = useState(localStorage.getItem("cf_sync_enabled") === "true");
  const [cfBaseUrl, setCfBaseUrl] = useState(localStorage.getItem("cf_base_url") || "");
  const [cfAuthKey, setCfAuthKey] = useState(localStorage.getItem("cf_auth_key") || "");
  const [cfSyncing, setCfSyncing] = useState(false);
  const [cfR2Uploading, setCfR2Uploading] = useState(false);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState<Record<number, boolean>>({});
  const [isModified, setIsModified] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("portfolio_is_dirty") === "true";
    }
    return false;
  });

  // Keep portfolio_is_dirty in localStorage in sync with isModified state
  useEffect(() => {
    if (isModified) {
      localStorage.setItem("portfolio_is_dirty", "true");
    } else {
      localStorage.removeItem("portfolio_is_dirty");
    }
  }, [isModified]);

  // Listen for page unload/refresh to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isModified) {
        e.preventDefault();
        e.returnValue = "Bạn có thay đổi chưa đồng bộ. Nếu làm mới trang (F5), tất cả các thay đổi chưa đồng bộ sẽ bị mất sạch hoàn toàn. Bạn có chắc chắn muốn làm mới trang?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isModified]);

  const handleBackToPortfolioSafe = () => {
    if (isModified) {
      const confirmLeave = window.confirm("Bạn có thay đổi chưa đồng bộ. Nếu quay lại trang chính, các thay đổi này sẽ bị mất sạch hoàn toàn. Bạn có chắc chắn muốn quay lại?");
      if (!confirmLeave) return;
    }
    onBackToPortfolio();
  };

  // Category Manager States
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryValue, setEditCategoryValue] = useState("");
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [mergeTargetCategory, setMergeTargetCategory] = useState("TVC");

  // Simple Notification Toast
  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleMasterSync = async () => {
    // 1. Force save to localStorage
    try {
      localStorage.setItem("portfolio_user_profile", JSON.stringify(profile));
      localStorage.setItem("portfolio_user_theme", currentTheme);
    } catch (e) {
      console.error("Local storage hard save failed", e);
    }

    if (cfEnabled && cfBaseUrl) {
      setCfSyncing(true);
      showNotification("🔄 Đang đồng bộ hóa cấu hình & dải màu lên Cloudflare D1...");
      try {
        const cleanUrl = cfBaseUrl.replace(/\/$/, "");
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (cfAuthKey) {
          headers["Authorization"] = cfAuthKey.startsWith("Bearer ") ? cfAuthKey : `Bearer ${cfAuthKey}`;
        }

        // Push settings
        const settingsPayload = mapToCloudflareSettingsPayload(profile, currentTheme);
        const sRes = await fetch(`${cleanUrl}/api/settings`, {
          method: "POST",
          headers,
          body: JSON.stringify(settingsPayload),
        });
        if (!sRes.ok) throw new Error(`Lỗi cập nhật settings: API trả lỗi ${sRes.status}`);

        // Push profile
        const profilePayload = mapToCloudflareProfilePayload(profile);
        const pRes = await fetch(`${cleanUrl}/api/profile`, {
          method: "POST",
          headers,
          body: JSON.stringify(profilePayload),
        });
        if (!pRes.ok) throw new Error(`Lỗi cập nhật profile: API trả lỗi ${pRes.status}`);

        // Push projects
        const projectsPayload = mapToCloudflareProjectsPayload(profile.projects);
        const projRes = await fetch(`${cleanUrl}/api/projects`, {
          method: "POST",
          headers,
          body: JSON.stringify(projectsPayload),
        });
        if (!projRes.ok) throw new Error(`Lỗi cập nhật danh sách tác phẩm (projects): API trả lỗi ${projRes.status}`);

        showNotification("💎 Tuyệt vời! Đồng bộ dữ liệu lên cơ sở dữ liệu Cloudflare D1 thành công!");
        setIsModified(false);
      } catch (err: any) {
        console.error(err);
        showNotification(`❌ Thất bại: ${err?.message || "Lỗi đồng bộ D1"}`);
      } finally {
        setCfSyncing(false);
      }
    } else {
      showNotification("✅ Đã lưu cấu hình và màu sắc thành công vào bộ nhớ trình duyệt!");
      setIsModified(false);
    }
  };

  // Sync state modifications
  const handleFieldChange = (key: keyof UserProfile, value: any) => {
    const updated = { ...profile, [key]: value };
    setProfile(updated);
    setJsonText(JSON.stringify(updated, null, 2));
    setIsModified(true);
  };

  // Manage Skills
  const handleSkillChange = (index: number, key: keyof Skill, value: any) => {
    const updatedSkills = [...profile.skills];
    updatedSkills[index] = { ...updatedSkills[index], [key]: value };
    const updatedProfile = { ...profile, skills: updatedSkills };
    setProfile(updatedProfile);
    setJsonText(JSON.stringify(updatedProfile, null, 2));
    setIsModified(true);
  };

  const addSkill = () => {
    const updatedSkills = [...profile.skills, { name: "Kỹ năng mới", level: 80, category: "Hậu kỳ (Editing)" as const }];
    const updatedProfile = { ...profile, skills: updatedSkills };
    setProfile(updatedProfile);
    setJsonText(JSON.stringify(updatedProfile, null, 2));
    setIsModified(true);
    showNotification("Đã thêm một dòng kỹ năng trống mới.");
  };

  const removeSkill = (index: number) => {
    const updatedSkills = profile.skills.filter((_, i) => i !== index);
    const updatedProfile = { ...profile, skills: updatedSkills };
    setProfile(updatedProfile);
    setJsonText(JSON.stringify(updatedProfile, null, 2));
    setIsModified(true);
    showNotification("Đã xóa kỹ năng.");
  };

  // Manage Projects
  const handleProjectChange = (index: number, key: keyof Project, value: any) => {
    const updatedProjects = [...profile.projects];
    if (key === "tags") {
      updatedProjects[index] = { ...updatedProjects[index], [key]: value.split(",").map((t: string) => t.trim()) };
    } else {
      updatedProjects[index] = { ...updatedProjects[index], [key]: value };
    }

    // Auto YouTube Thumbnail & Embed Detection
    if (key === "link" || key === "youtubeEmbedUrl") {
      const ytId = extractYouTubeId(value);
      if (ytId) {
        const autoThumbnail = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
        
        // Auto populate cover link
        updatedProjects[index].thumbnailUrl = autoThumbnail;

        // Auto convert standard watch link to embed link inside youtubeEmbedUrl field
        if (key === "youtubeEmbedUrl" && !value.includes("/embed/")) {
          updatedProjects[index].youtubeEmbedUrl = `https://www.youtube.com/embed/${ytId}`;
        }
        
        // Auto convert and mirror inside youtubeEmbedUrl field if main link is YouTube and embed is empty
        if (key === "link" && !updatedProjects[index].youtubeEmbedUrl) {
          updatedProjects[index].youtubeEmbedUrl = `https://www.youtube.com/embed/${ytId}`;
        }

        showNotification("📺 Đã tự động nhận diện Video YouTube! Đang lấy dữ liệu thời lượng...");

        // Fetch duration and title from backend scraper (always relative to hit local residential Express server, avoiding YouTube 429 on Cloudflare IPs)
        fetch(`/api/youtube-info?url=${encodeURIComponent(value)}`)
          .then((res) => {
            if (!res.ok) throw new Error("Scraper failed");
            return res.json();
          })
          .then((data) => {
            if (data.success && data.duration) {
              setProfile((prevProfile: any) => {
                const latestProjects = [...prevProfile.projects];
                if (latestProjects[index]) {
                  // Only fill duration if not set
                  if (!latestProjects[index].duration || latestProjects[index].duration === "") {
                    latestProjects[index].duration = data.duration;
                  }
                  // Only fill title if empty or default new project title
                  if (!latestProjects[index].title || latestProjects[index].title.startsWith("Tác phẩm mới") || latestProjects[index].title === "") {
                    latestProjects[index].title = data.title || latestProjects[index].title;
                  }
                  
                  showNotification(`⏱️ Đã nhận diện thời lượng: ${data.duration}`);
                  
                  const updatedProf = { ...prevProfile, projects: latestProjects };
                  // Sync jsonText in background as well
                  setTimeout(() => setJsonText(JSON.stringify(updatedProf, null, 2)), 0);
                  return updatedProf;
                }
                return prevProfile;
              });
              setIsModified(true);
            }
          })
          .catch((err) => {
            console.error("Auto duration fetch failed:", err);
          });
      }
    }


    const updatedProfile = { ...profile, projects: updatedProjects };
    setProfile(updatedProfile);
    setJsonText(JSON.stringify(updatedProfile, null, 2));
    setIsModified(true);
  };

  const addProject = () => {
    const updatedProjects = [...profile.projects, {
      id: `proj-${Date.now()}`,
      title: "Dự án mới sáng tác",
      description: "Mô tả chất liệu thô, tầm nhìn sáng tạo và diễn tiến màu sắc chỉnh sửa.",
      tags: ["Commercial", "Color Grading"],
      category: "Commercial",
      duration: "03:30",
      resolution: "4K DCI",
      thumbnailUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&q=80&w=600",
      year: "2025",
      role: "Dựng phim chính",
      youtubeEmbedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    }];
    const updatedProfile = { ...profile, projects: updatedProjects };
    setProfile(updatedProfile);
    setJsonText(JSON.stringify(updatedProfile, null, 2));
    setIsModified(true);
    showNotification("Đã khởi tạo dự án tác phẩm mới.");
  };

  const removeProject = (index: number) => {
    const updatedProjects = profile.projects.filter((_, i) => i !== index);
    const updatedProfile = { ...profile, projects: updatedProjects };
    setProfile(updatedProfile);
    setJsonText(JSON.stringify(updatedProfile, null, 2));
    setIsModified(true);
    showNotification("Đã gỡ dự án tác phẩm khỏi kỷ yếu.");
  };

  // Category Management Logic
  const handleRenameCategory = (oldCat: string, newCatInput: string) => {
    const rawNewCat = newCatInput.trim().toUpperCase();
    if (!rawNewCat) {
      showNotification("⚠️ Tên thể loại mới không được trống!");
      return;
    }
    if (rawNewCat === oldCat) {
      setEditingCategory(null);
      return;
    }

    const updatedProjects = profile.projects.map((p) => {
      const pCat = p.category ? p.category.trim().toUpperCase() : "";
      if (pCat === oldCat) {
        return { ...p, category: rawNewCat };
      }
      return p;
    });

    const updatedProfile = { ...profile, projects: updatedProjects };
    setProfile(updatedProfile);
    setJsonText(JSON.stringify(updatedProfile, null, 2));
    setEditingCategory(null);
    setIsModified(true);
    showNotification(`✅ Đã đổi tên thể loại từ "${formatCategory(oldCat)}" thành "${formatCategory(rawNewCat)}"!`);
  };

  const handleDeleteCategory = (catToDelete: string, targetCat: string) => {
    const rawTargetCat = targetCat.trim().toUpperCase();
    
    const updatedProjects = profile.projects.map((p) => {
      const pCat = p.category ? p.category.trim().toUpperCase() : "";
      if (pCat === catToDelete) {
        return { ...p, category: rawTargetCat };
      }
      return p;
    });

    const updatedProfile = { ...profile, projects: updatedProjects };
    setProfile(updatedProfile);
    setJsonText(JSON.stringify(updatedProfile, null, 2));
    setDeletingCategory(null);
    setIsModified(true);
    showNotification(`🗑️ Đã xóa thể loại "${formatCategory(catToDelete)}" và gộp các tác phẩm vào "${formatCategory(rawTargetCat)}"!`);
  };

  // Manage Work Experience
  const handleWorkExperienceChange = (index: number, key: keyof Experience, value: any) => {
    const updatedWork = [...(profile.workExperienceData || [])];
    if (key === "skills") {
      updatedWork[index] = { ...updatedWork[index], [key]: value.split(",").map((s: string) => s.trim()) };
    } else {
      let finalValue = value;
      if (key === "role" || key === "company") {
        finalValue = formatTitleCase(value);
      }
      updatedWork[index] = { ...updatedWork[index], [key]: finalValue };
    }
    const updatedProfile = { ...profile, workExperienceData: updatedWork };
    setProfile(updatedProfile);
    setJsonText(JSON.stringify(updatedProfile, null, 2));
    setIsModified(true);
  };

  const addWorkExperience = () => {
    const updatedWork = [...(profile.workExperienceData || []), {
      id: `work-${Date.now()}`,
      role: "Vị trí tác nghiệp mới",
      company: "Tên doanh nghiệp / Tổ chức",
      period: "2024 - Hiện tại",
      description: "Mô tả chất liệu thô, tầm nhìn sáng tạo và diễn tiến màu sắc chỉnh sửa.",
      skills: [],
      type: "Work" as const
    }];
    const updatedProfile = { ...profile, workExperienceData: updatedWork };
    setProfile(updatedProfile);
    setJsonText(JSON.stringify(updatedProfile, null, 2));
    setIsModified(true);
    showNotification("Đã bổ sung mốc thời gian sự nghiệp mới.");
  };

  const removeWorkExperience = (index: number) => {
    const updatedWork = (profile.workExperienceData || []).filter((_, i) => i !== index);
    const updatedProfile = { ...profile, workExperienceData: updatedWork };
    setProfile(updatedProfile);
    setJsonText(JSON.stringify(updatedProfile, null, 2));
    setIsModified(true);
    showNotification("Đã rút kinh nghiệm sự nghiệp này.");
  };

  // Manage Education
  const handleEducationChange = (index: number, key: keyof Experience, value: any) => {
    const updatedEdu = [...(profile.educationData || [])];
    if (key === "skills") {
      updatedEdu[index] = { ...updatedEdu[index], [key]: value.split(",").map((s: string) => s.trim()) };
    } else {
      let finalValue = value;
      if (key === "role" || key === "company") {
        finalValue = formatTitleCase(value);
      }
      updatedEdu[index] = { ...updatedEdu[index], [key]: finalValue };
    }
    const updatedProfile = { ...profile, educationData: updatedEdu };
    setProfile(updatedProfile);
    setJsonText(JSON.stringify(updatedProfile, null, 2));
    setIsModified(true);
  };

  const addEducation = () => {
    const updatedEdu = [...(profile.educationData || []), {
      id: `edu-${Date.now()}`,
      role: "Chuyên ngành học mới",
      company: "Tên trường học mới",
      period: "2019 - 2023",
      description: "Thuyết minh chi tiết hoặc mô tả các hoạt động học tập, đào tạo của học phần.",
      skills: [],
      type: "Education" as const
    }];
    const updatedProfile = { ...profile, educationData: updatedEdu };
    setProfile(updatedProfile);
    setJsonText(JSON.stringify(updatedProfile, null, 2));
    setIsModified(true);
    showNotification("Đã bổ sung mốc thời gian học vấn mới.");
  };

  const removeEducation = (index: number) => {
    const updatedEdu = (profile.educationData || []).filter((_, i) => i !== index);
    const updatedProfile = { ...profile, educationData: updatedEdu };
    setProfile(updatedProfile);
    setJsonText(JSON.stringify(updatedProfile, null, 2));
    setIsModified(true);
    showNotification("Đã rút thông tin học vấn này.");
  };

  // Drag and Drop reordering logic for Experiences (Work & Education)
  const [draggableId, setDraggableId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedGroup, setDraggedGroup] = useState<"work" | "education" | "projects" | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number, group: "work" | "education" | "projects") => {
    setDraggedIndex(index);
    setDraggedGroup(group);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number, group: "work" | "education" | "projects") => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number, group: "work" | "education" | "projects") => {
    e.preventDefault();
    if (draggedGroup !== group || draggedIndex === null || draggedIndex === targetIndex) return;

    if (group === "work") {
      const updatedWork = [...(profile.workExperienceData || [])];
      const [draggedItem] = updatedWork.splice(draggedIndex, 1);
      updatedWork.splice(targetIndex, 0, draggedItem);
      const updatedProfile = { ...profile, workExperienceData: updatedWork };
      setProfile(updatedProfile);
      setJsonText(JSON.stringify(updatedProfile, null, 2));
      showNotification("Đã thay đổi thứ tự kinh nghiệm làm việc.");
    } else if (group === "education") {
      const updatedEdu = [...(profile.educationData || [])];
      const [draggedItem] = updatedEdu.splice(draggedIndex, 1);
      updatedEdu.splice(targetIndex, 0, draggedItem);
      const updatedProfile = { ...profile, educationData: updatedEdu };
      setProfile(updatedProfile);
      setJsonText(JSON.stringify(updatedProfile, null, 2));
      showNotification("Đã thay đổi thứ tự học vấn nền tảng.");
    } else if (group === "projects") {
      const updatedProjects = [...(profile.projects || [])];
      const [draggedItem] = updatedProjects.splice(draggedIndex, 1);
      updatedProjects.splice(targetIndex, 0, draggedItem);
      const updatedProfile = { ...profile, projects: updatedProjects };
      setProfile(updatedProfile);
      setJsonText(JSON.stringify(updatedProfile, null, 2));
      showNotification("Đã thay đổi thứ tự tác phẩm video.");
    }

    setDraggedIndex(null);
    setDraggedGroup(null);
    setDraggableId(null);
    setIsModified(true);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDraggedGroup(null);
    setDraggableId(null);
  };

  // Submit revised raw JSON structure with verification
  const handleJsonSubmit = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setProfile(parsed);
      setJsonError(null);
      setIsModified(true);
      showNotification("Đã nạp & đồng bộ cơ sở dữ liệu JSON thành công!");
    } catch (e: any) {
      setJsonError(e.message || "Định dạng JSON có cú pháp bị lỗi.");
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(profile, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showNotification("Đã sao chép gói dữ liệu JSON vào Clipboard.");
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${profile.name.toLowerCase().replace(/\s+/g, "_")}_profile.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification("Đã chuẩn bị tệp và tải xuống máy cá nhân.");
  };

  const themeVals = THEMES[currentTheme];

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 md:px-8 bg-slate-50 text-slate-900 font-sans antialiased">
      
      {/* Toast Notification HUD */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-white text-slate-800 font-medium px-4 py-3 shadow-md flex items-center gap-2 border border-slate-200 text-[13px] font-mono">
          <Sparkles className="h-4 w-4 shrink-0 text-sky-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto flex flex-col gap-5">
        
        {/* TOP COMPONENT: Media Portfolio Workspace Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-lg select-none relative">
          
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBackToPortfolioSafe}
              className="group h-9 w-9 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer transition-all"
              title="Quay lại Portfolio"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${isModified ? "bg-amber-500" : "bg-sky-500"}`} />
                <span className={`font-mono text-[13px] font-bold uppercase tracking-widest ${isModified ? "text-amber-600" : "text-sky-600"}`}>
                  MEDIA PORTFOLIO WORKSPACE {isModified && "• CÓ THAY ĐỔI CHƯA LƯU"}
                </span>
              </div>
              <h1 className="text-lg md:text-xl font-semibold text-slate-900 mt-1 font-sans">Bảng điều hành Hệ thống</h1>
              <p className="text-[13px] text-slate-500">Trình biên tập nội dung, kho lưu trữ tác phẩm và cấu hình hiển thị.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleBackToPortfolioSafe}
              className="flex items-center gap-1.5 rounded border border-slate-200 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 text-[13px] font-medium text-slate-700 transition-colors cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5 text-slate-500" />
              <span>Xem trang chính</span>
            </button>
            <button 
              disabled={cfSyncing}
              onClick={handleMasterSync}
              className={`flex items-center gap-1.5 rounded px-3.5 py-2 text-[13px] font-semibold cursor-pointer transition-all duration-300 ${
                isModified 
                  ? "bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20 scale-102"
                  : "bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700"
              } disabled:opacity-50`}
            >
              {cfSyncing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>{cfSyncing ? "Đang đồng bộ..." : "Đồng bộ ngay"}</span>
            </button>
            {onLogout && (
              <button 
                onClick={onLogout}
                className="flex items-center gap-1.5 rounded border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3.5 py-2 text-[13px] font-semibold text-rose-600 transition-colors cursor-pointer"
                title="Đăng xuất khỏi Bảng điều hành"
              >
                <LogOut className="h-3.5 w-3.5 text-rose-600" />
                <span>Đăng xuất</span>
              </button>
            )}
          </div>
        </div>

        {/* COMPONENT 2: Consolidated Stats Horizontal Bar */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-4 py-3 px-5 bg-white border border-slate-200 rounded-lg text-[13px] select-none">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-mono text-slate-500 uppercase tracking-wider">TỔNG SỐ TÁC PHẨM:</span>
              <span className="font-mono font-bold text-slate-800">{profile.projects.length} Videos</span>
            </div>
            <div className="h-3.5 w-[1px] bg-slate-200 hidden md:block" />
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-mono text-slate-500 uppercase tracking-wider">DANH MỤC CẤU HÌNH:</span>
              <span className="font-mono font-bold text-slate-800">
                {new Set(profile.projects.map(p => p.category?.trim().toUpperCase()).filter(Boolean)).size} Categories
              </span>
            </div>
            <div className="h-3.5 w-[1px] bg-slate-200 hidden md:block" />
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-mono text-slate-500 uppercase tracking-wider">TRẠNG THÁI HỆ THỐNG:</span>
              {isModified ? (
                <div className="flex items-center gap-1.5 font-mono font-bold text-amber-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Chưa đồng bộ</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Đã đồng bộ</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-[13px] font-mono text-slate-500 uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded border border-slate-200 self-start sm:self-auto">
            THEME PRO: {themeVals.name.toUpperCase()}
          </div>
        </div>

        {/* COMPONENT 3: Main Layout Splitted into Navigation Sidebar and Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Main Left Controller Sidebar inside admin panel */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-lg p-3 space-y-1 select-none">
            
            <div className="px-2 pb-2 border-b border-slate-200 mb-2 flex items-center justify-between">
              <span className="text-[13px] font-mono font-semibold text-slate-500 uppercase tracking-widest block">MỤC ĐIỀU CHỈNH</span>
              <span className="text-[13px] font-mono bg-slate-100 text-slate-500 px-1 rounded">PRO</span>
            </div>

            <button
              onClick={() => { setActiveTab("general"); setJsonError(null); }}
              className={`w-full px-3 py-2 rounded text-left text-[13px] font-medium flex items-center justify-between transition-all cursor-pointer ${
                activeTab === "general"
                  ? "bg-slate-200/60 text-slate-900 border-l-2 border-slate-800 pl-2.5 font-bold"
                  : "text-slate-800 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                Thông tin cá nhân
              </span>
              {activeTab !== "general" && <span className="h-1 w-1 rounded-full bg-slate-300" />}
            </button>

            <button
              onClick={() => { setActiveTab("skills"); setJsonError(null); }}
              className={`w-full px-3 py-2 rounded text-left text-[13px] font-medium flex items-center justify-between transition-all cursor-pointer ${
                activeTab === "skills"
                  ? "bg-slate-200/60 text-slate-900 border-l-2 border-slate-800 pl-2.5 font-bold"
                  : "text-slate-800 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="flex items-center gap-2">
                <Code className="h-3.5 w-3.5" />
                Kỹ năng chuyên môn
              </span>
              <span className={`text-[13px] font-mono px-1.5 py-0.2 rounded ${activeTab === "skills" ? "bg-slate-200 text-slate-800" : "bg-slate-100 text-slate-550"}`}>
                {profile.skills.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("projects"); setJsonError(null); }}
              className={`w-full px-3 py-2 rounded text-left text-[13px] font-medium flex items-center justify-between transition-all cursor-pointer ${
                activeTab === "projects"
                  ? "bg-slate-200/60 text-slate-900 border-l-2 border-slate-800 pl-2.5 font-bold"
                  : "text-slate-800 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="flex items-center gap-2">
                <Tv className="h-3.5 w-3.5" />
                Kho tác phẩm video
              </span>
              <span className={`text-[13px] font-mono px-1.5 py-0.2 rounded ${activeTab === "projects" ? "bg-slate-200 text-slate-800" : "bg-slate-100 text-slate-550"}`}>
                {profile.projects.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("experience"); setJsonError(null); }}
              className={`w-full px-3 py-2 rounded text-left text-[13px] font-medium flex items-center justify-between transition-all cursor-pointer ${
                activeTab === "experience"
                  ? "bg-slate-200/60 text-slate-900 border-l-2 border-slate-800 pl-2.5 font-bold"
                  : "text-slate-800 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="flex items-center gap-2">
                <Briefcase className="h-3.5 w-3.5" />
                Quá trình sự nghiệp
              </span>
              <span className={`text-[13px] font-mono px-1.5 py-0.2 rounded ${activeTab === "experience" ? "bg-slate-200 text-slate-800" : "bg-slate-100 text-slate-550"}`}>
                {(profile.workExperienceData?.length || 0) + (profile.educationData?.length || 0)}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("theme"); setJsonError(null); }}
              className={`w-full px-3 py-2 rounded text-left text-[13px] font-medium flex items-center justify-between transition-all cursor-pointer ${
                activeTab === "theme"
                  ? "bg-slate-200/60 text-slate-900 border-l-2 border-slate-800 pl-2.5 font-bold"
                  : "text-slate-800 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="flex items-center gap-2">
                <Paintbrush className="h-3.5 w-3.5" />
                Lựa chọn Theme
              </span>
              {activeTab !== "theme" && <span className="h-1 w-1 rounded-full bg-slate-300" />}
            </button>

            <button
              onClick={() => { setActiveTab("cloudflare"); setJsonError(null); }}
              className={`w-full px-3 py-2 rounded text-left text-[13px] font-medium flex items-center justify-between transition-all cursor-pointer ${
                activeTab === "cloudflare"
                  ? "bg-slate-200/60 text-slate-900 border-l-2 border-slate-800 pl-2.5 font-bold"
                  : "text-slate-800 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-orange-600" />
                Đồng bộ Cloudflare D1
              </span>
              <span className={`text-[13px] font-semibold px-1 rounded ${cfEnabled ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-550"}`}>
                {cfEnabled ? "Bật" : "Tắt"}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("export"); setJsonError(null); }}
              className={`w-full px-3 py-2 rounded text-left text-[13px] font-medium flex items-center justify-between transition-all cursor-pointer ${
                activeTab === "export"
                  ? "bg-slate-200/60 text-slate-900 border-l-2 border-slate-800 pl-2.5 font-bold"
                  : "text-slate-800 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="flex items-center gap-2">
                <Download className="h-3.5 w-3.5" />
                Cơ sở dữ liệu (JSON)
              </span>
              {activeTab !== "export" && <span className="h-1 w-1 rounded-full bg-slate-300" />}
            </button>
            
            <div className="pt-3 border-t border-slate-200 mt-3 select-none text-[13px] text-slate-400 font-mono flex items-center gap-1 justify-center">
              <FolderLock className="h-3 w-3" /> CHẾ ĐỘ THỰC THI CHUYÊN NGHIỆP
            </div>

          </div>

          {/* Main Work Space Container on the Right Column */}
          <div className="lg:col-span-9 bg-white border border-slate-200 rounded-lg p-5 md:p-6 min-h-[500px]">
            
            {/* TAB 1: General Profile Section Fields */}
            {activeTab === "general" && (
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-[13px] font-semibold text-slate-900 flex items-center gap-2 uppercase font-mono tracking-wider">
                    <User className="h-4 w-4 text-sky-600" /> Thông tin cấu hình sản xuất
                  </h2>
                  <p className="text-[13px] text-slate-500 mt-0.5">Quản lý nhận diện cá nhân và hồ sơ kỹ thuật chuyên nghiệp.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  
                  {/* LEFT COLUMN: IDENTITY & BIOGRAPHY */}
                  <div className="space-y-5">
                    <div className="border-b border-slate-200 pb-1.5 flex items-center justify-between">
                      <span className="text-[13px] font-mono text-sky-600 uppercase tracking-widest font-bold">I. THÔNG TIN ĐỊNH VỊ</span>
                      <span className="text-[13px] font-mono text-slate-400">PANEL A</span>
                    </div>

                    <div>
                      <label className="block text-[13px] font-mono uppercase tracking-wider text-slate-500 mb-1">Họ và tên nghệ danh</label>
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => handleFieldChange("name", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-2.5 transition-colors duration-150 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[13px] font-mono uppercase tracking-wider text-slate-500 mb-1">Chức danh / Vai trò chính</label>
                      <input
                        type="text"
                        value={profile.role}
                        onChange={(e) => handleFieldChange("role", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-2.5 transition-colors duration-150 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[13px] font-mono uppercase tracking-wider text-slate-500 mb-1">Tiêu đề phụ / Slogan</label>
                      <input
                        type="text"
                        value={profile.subtitle || ""}
                        onChange={(e) => handleFieldChange("subtitle", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-2.5 transition-colors duration-150 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[13px] font-mono uppercase tracking-wider text-slate-500 mb-1">Đường dẫn ảnh đại diện (avatar url)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Nhập link ảnh https://..."
                          value={profile.avatarUrl || ""}
                          onChange={(e) => handleFieldChange("avatarUrl", e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-2.5 transition-colors duration-150 rounded-lg"
                        />
                        {cfBaseUrl && (
                          <label className="bg-sky-50 border border-sky-200 hover:bg-sky-100 text-sky-700 px-3 flex items-center justify-center text-[13px] font-mono font-bold cursor-pointer shrink-0 rounded transition-colors select-none">
                            ⚡ Tải lên R2
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  showNotification("Đang tải ảnh lên Cloudflare R2...");
                                  const cleanUrl = cfBaseUrl.replace(/\/$/, "");
                                  const formData = new FormData();
                                  formData.append("file", file);
                                  const headers: Record<string, string> = {};
                                  if (cfAuthKey) {
                                    headers["Authorization"] = cfAuthKey.startsWith("Bearer ") ? cfAuthKey : `Bearer ${cfAuthKey}`;
                                  }
                                  const res = await fetch(`${cleanUrl}/api/upload-thumbnail`, {
                                    method: "POST",
                                    headers,
                                    body: formData,
                                  });
                                  if (res.ok) {
                                    const dat = await res.json();
                                    if (dat.url) {
                                      handleFieldChange("avatarUrl", dat.url);
                                      showNotification("✅ Đã tải ảnh lên R2 thành công!");
                                    }
                                  } else {
                                    showNotification(`❌ Lỗi upload R2: Code ${res.status}`);
                                  }
                                } catch (err: any) {
                                  showNotification(`❌ Lỗi: ${err?.message}`);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[13px] font-mono uppercase tracking-wider text-slate-500 mb-1">Tiếu thuyết ngắn / Giới thiệu tinh gọn (about mini)</label>
                      <textarea
                        rows={2}
                        value={profile.aboutMini}
                        onChange={(e) => handleFieldChange("aboutMini", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-2.5 transition-colors duration-150 rounded-lg resize-none leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* RIGHT COLUMN: SERVICES & CONNECTIVITY */}
                  <div className="space-y-5">
                    <div className="border-b border-slate-200 pb-1.5 flex items-center justify-between">
                      <span className="text-[13px] font-mono text-emerald-700 uppercase tracking-widest font-bold">II. HỒ SƠ KẾT NỐI</span>
                      <span className="text-[13px] font-mono text-slate-400">PANEL B</span>
                    </div>

                    <div>
                      <label className="block text-[13px] font-mono uppercase tracking-wider text-slate-500 mb-1">Email liên hệ</label>
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => handleFieldChange("email", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-2.5 transition-colors duration-150 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[13px] font-mono uppercase tracking-wider text-slate-500 mb-1">Số điện thoại</label>
                      <input
                        type="text"
                        value={profile.phone}
                        onChange={(e) => handleFieldChange("phone", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-2.5 transition-colors duration-150 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[13px] font-mono uppercase tracking-wider text-slate-500 mb-1">Cơ sở / Địa điểm hoạt động</label>
                      <input
                        type="text"
                        value={profile.location || "TP. Hồ Chí Minh, Việt Nam"}
                        onChange={(e) => handleFieldChange("location", e.target.value)}
                        placeholder="e.g. TP. Hồ Chí Minh, Việt Nam"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-2.5 transition-colors duration-150 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[13px] font-mono uppercase tracking-wider text-slate-500 mb-1">Số liên lạc Zalo (nếu có)</label>
                      <input
                        type="text"
                        value={profile.zaloNumber || ""}
                        onChange={(e) => handleFieldChange("zaloNumber", e.target.value)}
                        placeholder="e.g. 0901234567"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-2.5 transition-colors duration-150 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[13px] font-mono uppercase tracking-wider text-slate-500 mb-1">Tài khoản Facebook (username / URL)</label>
                      <input
                        type="text"
                        value={profile.facebookUrl || ""}
                        onChange={(e) => handleFieldChange("facebookUrl", e.target.value)}
                        placeholder="e.g. facebook.com/username"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-2.5 transition-colors duration-150 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[13px] font-mono uppercase tracking-wider text-slate-500 mb-1">Tài khoản Instagram (username / URL)</label>
                      <input
                        type="text"
                        value={profile.instagramUrl || ""}
                        onChange={(e) => handleFieldChange("instagramUrl", e.target.value)}
                        placeholder="e.g. instagram.com/username"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-2.5 transition-colors duration-150 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* BIO - SPANS BOTH COLUMNS */}
                <div className="pt-4 border-t border-slate-200">
                  <label className="block text-[13px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">Tiểu sử nghệ thuật chuyên sâu (profile bio)</label>
                  <textarea
                    rows={4}
                    value={profile.bio}
                    onChange={(e) => handleFieldChange("bio", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-2.5 transition-colors duration-150 rounded-lg resize-none leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: Professional Technical Skills */}
            {activeTab === "skills" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h2 className="text-[13px] font-semibold text-slate-900 flex items-center gap-2 uppercase font-mono tracking-wider">
                      <Code className="h-4 w-4 text-sky-600" /> Kỹ năng chuyên môn & Trình độ
                    </h2>
                    <p className="text-[13px] text-slate-500 mt-0.5 font-sans">Bổ sung kỹ năng chuyên môn, căn chỉnh công cụ và thương hiệu.</p>
                  </div>
                  <button 
                    onClick={addSkill}
                    className="flex items-center gap-1.5 rounded bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3.5 py-2 text-[13px] font-semibold text-sky-700 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Bổ sung kỹ năng
                  </button>
                </div>

                <div className="space-y-4">
                  {profile.skills.map((skill, index) => (
                    <div 
                      key={index} 
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-white p-4.5 rounded-lg border border-slate-200 shadow-sm"
                    >
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-4">
                          <label className="block text-[13px] font-mono text-slate-500 mb-1 uppercase tracking-wider">TÊN KỸ NĂNG</label>
                          <input
                            type="text"
                            placeholder="Tên công cụ/kỹ năng"
                            value={skill.name}
                            onChange={(e) => handleSkillChange(index, "name", e.target.value)}
                            onBlur={(e) => {
                              const formatted = formatTitleCase(e.target.value);
                              handleSkillChange(index, "name", formatted);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-2 transition-colors duration-150 rounded-lg w-full"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[13px] font-mono text-slate-500 mb-1 uppercase tracking-wider">PHÂN LOẠI CÔNG CỤ</label>
                          <select
                            value={skill.category}
                            onChange={(e) => handleSkillChange(index, "category", e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-2 transition-colors duration-150 rounded-lg w-full cursor-pointer"
                          >
                            <option value="Hậu kỳ (Editing)">Hậu kỳ (Editing)</option>
                            <option value="Phần mềm (Suite)">Phần mềm (Suite)</option>
                            <option value="Công cụ trợ lý">Công cụ trợ lý</option>
                            <option value="Quay phim (Camera)">Quay phim (Camera)</option>
                            <option value="Khác">Khác</option>
                          </select>
                        </div>

                        <div className="sm:col-span-4 flex flex-col justify-start">
                          <label className="block text-[13px] font-mono text-slate-500 mb-1 uppercase tracking-wider">MÀU ICON (CSS MASK)</label>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="relative w-6 h-6 rounded-full border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                              <input 
                                type="color" 
                                value={skill.iconColor || "#ffffff"} 
                                onChange={(e) => handleSkillChange(index, "iconColor", e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                              <div 
                                className="w-3.5 h-3.5 rounded-full border border-slate-200 shadow-sm transition-transform active:scale-95"
                                style={{ backgroundColor: skill.iconColor || "#ffffff" }}
                              />
                            </div>
                            <span className="text-[13px] font-mono text-slate-700 select-all font-medium">
                              {skill.iconColor ? skill.iconColor.toUpperCase() : "Mặc định"}
                            </span>
                            {skill.iconColor && (
                              <button
                                type="button"
                                onClick={() => handleSkillChange(index, "iconColor", undefined)}
                                className="text-[13px] font-mono font-medium uppercase tracking-wider text-slate-500 hover:text-red-500 py-0.5 px-1.5 bg-slate-50 border border-slate-200 rounded hover:border-red-200 transition-all ml-auto cursor-pointer"
                                title="Khôi phục màu mặc định"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="sm:col-span-1 flex flex-col items-center justify-center">
                          <label className="block text-[13px] font-mono text-slate-500 mb-1 uppercase tracking-wider text-center">XEM</label>
                          <div 
                            className="w-8 h-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center p-1.5 shadow-sm transition-all"
                          >
                            <SkillIcon name={skill.name} className="w-5.5 h-5.5" iconColor={skill.iconColor} />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-end justify-end sm:border-l border-slate-200 sm:pl-3 shrink-0">
                        <button 
                          onClick={() => removeSkill(index)}
                          className="h-8 w-8 flex items-center justify-center rounded bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                          title="Xóa kỹ năng này"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: Cinematographic Projects Display Gallery */}
            {activeTab === "projects" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h2 className="text-[13px] font-semibold text-slate-900 flex items-center gap-2 uppercase font-mono tracking-wider">
                      <Tv className="h-4 w-4 text-sky-600" /> Tác phẩm & Thước phim Trình chiếu
                    </h2>
                    <p className="text-[13px] text-slate-500 mt-0.5 font-sans">Quản lý kho tàng phim quảng cáo TVC, Cinematic reels và xuất bản thông số kỹ thuật.</p>
                  </div>
                  <button 
                    onClick={addProject}
                    className="flex items-center gap-1.5 rounded bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3.5 py-2 text-[13px] font-semibold text-sky-700 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Thêm tác phẩm
                  </button>
                </div>

                <div className="space-y-6">
                  {profile.projects.map((project, index) => {
                    const isDragging = draggedGroup === "projects" && draggedIndex === index;
                    return (
                      <div 
                        key={project.id} 
                        draggable={draggableId === project.id}
                        onDragStart={(e) => handleDragStart(e, index, "projects")}
                        onDragOver={(e) => handleDragOver(e, index, "projects")}
                        onDrop={(e) => handleDrop(e, index, "projects")}
                        onDragEnd={handleDragEnd}
                        className={`bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-5 relative overflow-hidden transition-all duration-200 ${
                          isDragging ? "opacity-35 scale-[0.98] border-dashed border-sky-500/50 bg-slate-50" : ""
                        }`}
                      >
                        {/* Upper right control buttons for drag and delete */}
                        <div className="absolute top-4 right-4 flex items-center gap-2">
                          <div
                            onMouseDown={() => setDraggableId(project.id)}
                            onMouseUp={() => setDraggableId(null)}
                            onMouseLeave={() => setDraggableId(null)}
                            className="h-8 w-8 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-sky-600 rounded flex items-center justify-center cursor-grab active:cursor-grabbing select-none transition-all duration-150"
                            title="Nắm kéo để sắp xếp thứ tự tác phẩm"
                          >
                            <GripVertical className="h-4 w-4" />
                          </div>

                          <button 
                            onClick={() => removeProject(index)}
                            className="h-8 w-8 flex items-center justify-center rounded bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-600 transition-all cursor-pointer"
                            title="Xóa thước phim này khỏi danh sách"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Title Indicator */}
                        <div className="pr-20 mb-1 border-b border-slate-200 pb-2">
                          <span className="text-[13px] uppercase font-mono font-bold tracking-widest text-sky-700 bg-sky-50 px-2 py-0.5 rounded flex-none select-none max-w-fit border border-sky-100">
                            {project.category || "TÁC PHẨM"}
                          </span>
                          <span className="text-[13px] font-mono font-medium text-slate-500 ml-2">
                            ID: {project.id}
                          </span>
                        </div>

                        {/* REGION 1: GENERAL INFO (Top flat row) */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pb-2">
                          <div className="sm:col-span-4">
                            <label className="block text-[13px] font-mono text-slate-500 mb-1.5 uppercase tracking-wider">TÊN DỰ ÁN</label>
                            <input
                              type="text"
                              value={project.title}
                              onChange={(e) => handleProjectChange(index, "title", e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-2 transition-colors duration-150 rounded-lg font-medium"
                              placeholder="Nhập tên thước phim/dự án..."
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="block text-[13px] font-mono text-slate-500 uppercase tracking-wider">THỂ LOẠI (CATEGORY)</label>
                              {!showNewCategoryInput[index] && (
                                <button
                                  type="button"
                                  onClick={() => setIsCategoryManagerOpen(true)}
                                  className="text-[13px] font-mono text-sky-600 hover:text-sky-700 font-bold transition-all duration-150 cursor-pointer select-none flex items-center gap-1 active:scale-95 shrink-0"
                                  title="Quản lý thể loại (Thêm, Xóa, Sửa...)"
                                >
                                  <SlidersHorizontal className="h-2.5 w-2.5" /> Quản lý
                                </button>
                              )}
                            </div>
                            {showNewCategoryInput[index] ? (
                              <div className="flex gap-1.5">
                                <input
                                  type="text"
                                  placeholder="e.g. TVC, Wedding..."
                                  className="flex-1 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 focus:outline-none px-3 py-2 transition-colors duration-150 rounded-lg font-medium"
                                  onBlur={(e) => {
                                    const val = e.target.value.trim();
                                    if (val) {
                                      handleProjectChange(index, "category", val.toUpperCase());
                                    }
                                    setShowNewCategoryInput(prev => ({ ...prev, [index]: false }));
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      const val = e.currentTarget.value.trim();
                                      if (val) {
                                        handleProjectChange(index, "category", val.toUpperCase());
                                      }
                                      setShowNewCategoryInput(prev => ({ ...prev, [index]: false }));
                                    }
                                  }}
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowNewCategoryInput(prev => ({ ...prev, [index]: false }))}
                                  className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-550 hover:text-slate-700 px-3 rounded-lg text-[13px] cursor-pointer select-none transition-colors"
                                >
                                  Hủy
                                </button>
                              </div>
                            ) : (
                              <select
                                value={project.category ? project.category.trim().toUpperCase() : "COMMERCIAL"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "CREATE_NEW") {
                                    setShowNewCategoryInput(prev => ({ ...prev, [index]: true }));
                                  } else {
                                    handleProjectChange(index, "category", val);
                                  }
                                }}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 focus:outline-none px-3 py-2 transition-colors duration-150 rounded-lg cursor-pointer font-medium"
                              >
                                {(() => {
                                  // Trích xuất các danh mục thực tế đang được sử dụng trong các tác phẩm hiện tại
                                  const activeCats = Array.from(new Set(profile.projects.map(p => p.category ? p.category.trim().toUpperCase() : "").filter(Boolean)));
                                  
                                  // Luôn đảm bảo danh mục hiện tại của tác phẩm có mặt trong danh sách lựa chọn
                                  const currentCat = project.category ? project.category.trim().toUpperCase() : "";
                                  if (currentCat && !activeCats.includes(currentCat)) {
                                    activeCats.push(currentCat);
                                  }
                                  
                                  if (activeCats.length === 0) {
                                    activeCats.push("COMMERCIAL");
                                  }
                                  
                                  return activeCats.map((cat) => (
                                    <option key={cat} value={cat}>
                                      {formatCategory(cat)}
                                    </option>
                                  ));
                                })()}
                                <option value="CREATE_NEW" className="text-sky-600 font-semibold">+ Thêm thể loại mới...</option>
                              </select>
                            )}
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[13px] font-mono text-slate-500 mb-1.5 uppercase tracking-wider">NĂM SẢN XUẤT (YEAR)</label>
                            <input
                              type="text"
                              value={project.year || ""}
                              onChange={(e) => handleProjectChange(index, "year", e.target.value)}
                              placeholder="e.g. 2025"
                              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-2 transition-colors duration-150 rounded-lg"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <label className="block text-[13px] font-mono text-slate-500 mb-1.5 uppercase tracking-wider">VAI TRÒ (ROLE)</label>
                            <input
                              type="text"
                              value={project.role || ""}
                              onChange={(e) => handleProjectChange(index, "role", e.target.value)}
                              placeholder="e.g. Video Editor & Director"
                              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-2 transition-colors duration-150 rounded-lg"
                            />
                          </div>
                        </div>

                        {/* REGION 2: 2-COLUMN BALANCED FLAT LAYOUT */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                          
                          {/* CỘT TRÁI */}
                          <div className="space-y-4">
                            {/* Hàng 1: [Độ phân giải thực] | [Thời lượng (Timecode)]  */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="col-span-1">
                                <label className="block text-[13px] font-mono text-slate-500 mb-1.5 uppercase tracking-wider">ĐỘ PHÂN GIẢI THỰC</label>
                                <input
                                  type="text"
                                  value={project.resolution || ""}
                                  onChange={(e) => handleProjectChange(index, "resolution", e.target.value)}
                                  placeholder="e.g. 4K UHD"
                                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-1.5 transition-colors duration-150 rounded-lg"
                                />
                              </div>
                              <div className="col-span-1">
                                <label className="block text-[13px] font-mono text-slate-500 mb-1.5 uppercase tracking-wider">THỜI LƯỢNG (TIMECODE)</label>
                                <div className="relative flex items-center w-full">
                                  <input
                                    type="text"
                                    value={project.duration || ""}
                                    onChange={(e) => handleProjectChange(index, "duration", e.target.value)}
                                    placeholder="e.g. 00:30, 05:12"
                                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none pl-3 pr-14 py-1.5 transition-colors duration-150 rounded-lg"
                                  />
                                  {(project.link || project.youtubeEmbedUrl) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const ytUrl = project.link || project.youtubeEmbedUrl || "";
                                        const ytId = extractYouTubeId(ytUrl);
                                        if (!ytId) {
                                          showNotification("⚠️ Link chưa đúng định dạng YouTube (ví dụ: watch?v=...)");
                                          return;
                                        }
                                        showNotification("📺 Đang quét thời lượng video YouTube...");
                                        // Always use relative path to hit local residential Express server, avoiding YouTube 429 rate limit on Cloudflare IP ranges
                                        fetch(`/api/youtube-info?url=${encodeURIComponent(ytUrl)}`)
                                          .then((res) => {
                                            if (!res.ok) throw new Error("API failed");
                                            return res.json();
                                          })
                                          .then((data) => {
                                            if (data.success && data.duration) {
                                              handleProjectChange(index, "duration", data.duration);
                                              showNotification(`⏱️ Đã lấy thời lượng: ${data.duration}`);
                                            } else {
                                              showNotification("❌ Không thể lấy thời lượng tự động.");
                                            }
                                          })
                                          .catch(() => showNotification("❌ Lỗi kết nối lấy thời lượng."));
                                      }}
                                      className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-sky-50 hover:bg-sky-100 border border-sky-200 hover:border-sky-300 text-sky-700 hover:text-sky-800 px-2 py-0.5 rounded text-[13px] font-mono font-bold transition-all duration-150 select-none shadow-sm active:scale-95 cursor-pointer shrink-0"
                                      title="Tự động lấy thời lượng từ link YouTube"
                                    >
                                      ⚡ Lấy
                                    </button>
                                  )}
                                </div>
                              </div>


                            </div>

                            {/* Hàng 2: [Ảnh bìa dự án (Cover Link)] */}
                            <div>
                              <label className="block text-[13px] font-mono text-slate-500 mb-1.5 uppercase tracking-wider">ẢNH BÌA DỰ ÁN (COVER LINK)</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={project.thumbnailUrl || ""}
                                  onChange={(e) => handleProjectChange(index, "thumbnailUrl", e.target.value)}
                                  className="flex-1 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-2.5 py-1.5 transition-colors duration-150 rounded-lg"
                                  placeholder="https://..."
                                />
                                {cfBaseUrl && (
                                  <label className="bg-sky-50 border border-sky-200 hover:bg-sky-100 text-sky-700 px-3 flex items-center justify-center text-[13px] font-mono font-bold cursor-pointer shrink-0 rounded transition-colors select-none">
                                    ⚡ R2
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        try {
                                          showNotification("Đang tải ảnh tác phẩm lên R2...");
                                          const cleanUrl = cfBaseUrl.replace(/\/$/, "");
                                          const formData = new FormData();
                                          formData.append("file", file);
                                          const headers: Record<string, string> = {};
                                          if (cfAuthKey) {
                                            headers["Authorization"] = cfAuthKey.startsWith("Bearer ") ? cfAuthKey : `Bearer ${cfAuthKey}`;
                                          }
                                          const res = await fetch(`${cleanUrl}/api/upload-thumbnail`, {
                                            method: "POST",
                                            headers,
                                            body: formData,
                                          });
                                          if (res.ok) {
                                            const dat = await res.json();
                                            if (dat.url) {
                                              handleProjectChange(index, "thumbnailUrl", dat.url);
                                              showNotification("✅ Đã tải ảnh tác phẩm lên R2!");
                                            }
                                          } else {
                                            showNotification(`❌ Lỗi upload R2: Code ${res.status}`);
                                          }
                                        } catch (err: any) {
                                          showNotification(`❌ Lỗi: ${err?.message}`);
                                        }
                                      }}
                                    />
                                  </label>
                                )}
                              </div>
                              {project.thumbnailUrl && (
                                <div className="mt-2 relative aspect-video w-full max-w-[160px] rounded overflow-hidden border border-slate-200 bg-slate-50 group">
                                  <img 
                                    src={project.thumbnailUrl} 
                                    alt="Preview" 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.currentTarget;
                                      if (target.src.includes("maxresdefault.jpg")) {
                                        target.src = target.src.replace("maxresdefault.jpg", "hqdefault.jpg");
                                      }
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[13px] font-mono text-white select-none pointer-events-none">
                                    Xem trước
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Hàng 3: [Link phát chính] | [YouTube Embed Link] */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[13px] font-mono text-slate-500 mb-1.5 uppercase tracking-wider">LINK PHÁT CHÍNH (VIMEO, DRIVE...)</label>
                                <input
                                  type="text"
                                  value={project.link || ""}
                                  onChange={(e) => handleProjectChange(index, "link", e.target.value)}
                                  placeholder="https://vimeo.com/..."
                                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-1.5 transition-colors duration-150 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-[13px] font-mono text-slate-500 mb-1.5 uppercase tracking-wider">YOUTUBE EMBED LINK (POP-UP LIGHTBOX)</label>
                                <input
                                  type="text"
                                  value={project.youtubeEmbedUrl || ""}
                                  onChange={(e) => handleProjectChange(index, "youtubeEmbedUrl", e.target.value)}
                                  placeholder="https://www.youtube.com/embed/..."
                                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-1.5 transition-colors duration-150 rounded-lg"
                                />
                              </div>
                            </div>
                          </div>

                          {/* CỘT PHẢI */}
                          <div className="space-y-4">
                            {/* Hàng 1: [Khách hàng (Client)] | [Nền tảng (Platform)] */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[13px] font-mono text-slate-500 mb-1.5 uppercase tracking-wider">KHÁCH HÀNG (CLIENT)</label>
                                <input
                                  type="text"
                                  value={project.client || ""}
                                  onChange={(e) => handleProjectChange(index, "client", e.target.value)}
                                  placeholder="e.g. Nha khoa Sài Gòn"
                                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-1.5 transition-colors duration-150 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-[13px] font-mono text-slate-500 mb-1.5 uppercase tracking-wider">NỀN TẢNG (PLATFORM)</label>
                                <input
                                  type="text"
                                  value={project.platform || ""}
                                  onChange={(e) => handleProjectChange(index, "platform", e.target.value)}
                                  placeholder="e.g. Facebook, YouTube Shorts"
                                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-1.5 transition-colors duration-150 rounded-lg"
                                />
                              </div>
                            </div>


                            {/* Hàng 3: [Mô tả nghệ thuật & Quy trình hậu kỳ] */}
                            <div>
                              <label className="block text-[13px] font-mono text-slate-500 mb-1.5 uppercase tracking-wider">MÔ TẢ NGHỆ THUẬT & QUY TRÌNH HẬU KỲ</label>
                              <textarea
                                value={project.description || ""}
                                onChange={(e) => handleProjectChange(index, "description", e.target.value)}
                                placeholder="Mô tả chất liệu thô, tầm nhìn sáng tạo và diễn tiến màu sắc chỉnh sửa..."
                                rows={4}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-2 transition-all duration-150 rounded-lg hover:border-slate-300 min-h-[92px] max-h-[140px] resize-y"
                              />
                            </div>
                          </div>

                        </div>

                        {/* Hidden tools mapper sync helper if needed */}
                        <input
                          type="hidden"
                          value={project.tools || ""}
                          onChange={(e) => handleProjectChange(index, "tools", e.target.value)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: Career timeline experiences */}
            {activeTab === "experience" && (
              <div className="space-y-10">
                
                {/* BLỐC 1: QUẢN LÝ KINH NGHIỆM LÀM VIỆC */}
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <h2 className="text-[13px] font-semibold text-slate-900 flex items-center gap-2 uppercase font-mono tracking-wider">
                        <Briefcase className="h-4 w-4 text-sky-650" /> QUẢN LÝ KINH NGHIỆM LÀM VIỆC
                      </h2>
                      <p className="text-[13px] text-slate-500 mt-0.5 font-sans">Cài đặt các cột mốc đồng hành tại các đơn vị truyền thông hoặc hãng quay phim.</p>
                    </div>
                    <button 
                      onClick={addWorkExperience}
                      className="flex items-center gap-1.5 rounded bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3.5 py-1.5 text-[13px] font-semibold text-sky-700 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Bổ sung mốc mới
                    </button>
                  </div>

                  <div className="space-y-4">
                    {(profile.workExperienceData || []).map((exp, index) => {
                      const isDragging = draggedGroup === "work" && draggedIndex === index;
                      return (
                        <div 
                          key={exp.id || index} 
                          draggable={draggableId === exp.id}
                          onDragStart={(e) => handleDragStart(e, index, "work")}
                          onDragOver={(e) => handleDragOver(e, index, "work")}
                          onDrop={(e) => handleDrop(e, index, "work")}
                          onDragEnd={handleDragEnd}
                          className={`bg-white p-5 rounded-lg border border-slate-200 space-y-4 relative overflow-hidden shadow-sm transition-all duration-200 ${
                            isDragging ? "opacity-35 scale-[0.98] border-dashed border-sky-500/50 bg-slate-50" : ""
                          }`}
                        >
                          <div className="absolute top-4 right-4 font-mono">
                            <button 
                              onClick={() => removeWorkExperience(index)}
                              className="h-8 w-8 flex items-center justify-center rounded bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-600 transition-all cursor-pointer"
                              title="Xóa mốc kinh nghiệm này"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pr-10">
                            <div>
                              <label className="block text-[13px] font-mono text-slate-500 mb-1.5 uppercase tracking-wider">HẠN ĐỊNH THỜI GIAN</label>
                              <div className="flex items-center gap-2">
                                <div
                                  onMouseDown={() => setDraggableId(exp.id)}
                                  onMouseUp={() => setDraggableId(null)}
                                  onMouseLeave={() => setDraggableId(null)}
                                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-sky-600 rounded flex items-center justify-center cursor-grab active:cursor-grabbing select-none transition-colors"
                                  title="Giữ và kéo để sắp xếp vị trí"
                                >
                                  <GripVertical className="h-3.5 w-3.5 shrink-0 pointer-events-none" />
                                </div>
                                <input
                                  type="text"
                                  value={exp.period}
                                  onChange={(e) => handleWorkExperienceChange(index, "period", e.target.value)}
                                  placeholder="Ví dụ: 2024 - Hiện tại"
                                  className="flex-1 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-2 transition-colors duration-150 rounded-lg"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[13px] font-mono text-slate-500 mb-1.5 uppercase tracking-wider font-semibold">TÊN CHỨC VỤ / VAI TRÒ</label>
                              <input
                                type="text"
                                value={exp.role}
                                onChange={(e) => handleWorkExperienceChange(index, "role", e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-2 transition-colors duration-150 rounded-lg cursor-text"
                              />
                            </div>
                            <div>
                              <label className="block text-[13px] font-mono text-slate-500 mb-1.5 uppercase tracking-wider">TÊN DOANH NGHIỆP / TỔ CHỨC</label>
                              <input
                                type="text"
                                value={exp.company}
                                onChange={(e) => handleWorkExperienceChange(index, "company", e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-2 transition-colors duration-150 rounded-lg cursor-text"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[13px] font-mono text-slate-500 mb-1.5 uppercase tracking-wider">CHI TIẾT HẠNG MỤC PHỤ TRÁCH SẢN XUẤT</label>
                            <textarea
                              rows={3}
                              value={exp.description}
                              onChange={(e) => handleWorkExperienceChange(index, "description", e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-2 transition-colors duration-150 rounded-lg resize-none leading-relaxed cursor-text"
                            />
                          </div>

                        </div>
                      );
                    })}
                    {(profile.workExperienceData || []).length === 0 && (
                      <p className="text-[13px] text-slate-500 italic py-4 text-center border border-dashed border-slate-200 bg-slate-50/50 rounded-lg">[ CHƯA CÓ KINH NGHIỆM LÀM VIỆC CHI TIẾT ]</p>
                    )}
                  </div>
                </div>

                {/* BLỐC 2: QUẢN LÝ HỌC VẤN NỀN TẢNG */}
                <div className="space-y-6 pt-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <h2 className="text-[13px] font-semibold text-slate-900 flex items-center gap-2 uppercase font-mono tracking-wider">
                        <GraduationCap className="h-4 w-4 text-sky-650" /> QUẢN LÝ HỌC VẤN NỀN TẢNG
                      </h2>
                      <p className="text-[13px] text-slate-500 mt-0.5 font-sans">Cài đặt các bằng cấp đào tạo hoặc mốc tích lũy chuyên ngành.</p>
                    </div>
                    <button 
                      onClick={addEducation}
                      className="flex items-center gap-1.5 rounded bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3.5 py-1.5 text-[13px] font-semibold text-sky-700 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> + Bổ sung học vấn mới
                    </button>
                  </div>

                  <div className="space-y-4">
                    {(profile.educationData || []).map((exp, index) => {
                      const isDragging = draggedGroup === "education" && draggedIndex === index;
                      return (
                        <div 
                          key={exp.id || index} 
                          draggable={draggableId === exp.id}
                          onDragStart={(e) => handleDragStart(e, index, "education")}
                          onDragOver={(e) => handleDragOver(e, index, "education")}
                          onDrop={(e) => handleDrop(e, index, "education")}
                          onDragEnd={handleDragEnd}
                          className={`bg-white p-5 rounded-lg border border-slate-200 space-y-4 relative overflow-hidden shadow-sm transition-all duration-200 ${
                            isDragging ? "opacity-35 scale-[0.98] border-dashed border-sky-500/50 bg-slate-50" : ""
                          }`}
                        >
                          <div className="absolute top-4 right-4 font-mono">
                            <button 
                              onClick={() => removeEducation(index)}
                              className="h-8 w-8 flex items-center justify-center rounded bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-600 transition-all cursor-pointer"
                              title="Xóa mốc học vấn này"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pr-10">
                            <div>
                              <label className="block text-[13px] font-mono text-slate-500 mb-1.5 uppercase tracking-wider">HẠN ĐỊNH THỜI GIAN</label>
                              <div className="flex items-center gap-2">
                                <div
                                  onMouseDown={() => setDraggableId(exp.id)}
                                  onMouseUp={() => setDraggableId(null)}
                                  onMouseLeave={() => setDraggableId(null)}
                                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-sky-600 rounded flex items-center justify-center cursor-grab active:cursor-grabbing select-none transition-colors"
                                  title="Giữ và kéo để sắp xếp vị trí"
                                >
                                  <GripVertical className="h-3.5 w-3.5 shrink-0 pointer-events-none" />
                                </div>
                                <input
                                  type="text"
                                  value={exp.period}
                                  onChange={(e) => handleEducationChange(index, "period", e.target.value)}
                                  placeholder="Ví dụ: 2019 - 2023"
                                  className="flex-1 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-2 transition-colors duration-150 rounded-lg"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[13px] font-mono text-slate-500 mb-1.5 uppercase tracking-wider font-semibold">CHUYÊN NGÀNH HỌC</label>
                              <input
                                type="text"
                                value={exp.role}
                                onChange={(e) => handleEducationChange(index, "role", e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-2 transition-colors duration-150 rounded-lg cursor-text"
                              />
                            </div>
                            <div>
                              <label className="block text-[13px] font-mono text-slate-500 mb-1.5 uppercase tracking-wider">TÊN TRƯỜNG HỌC</label>
                              <input
                                type="text"
                                value={exp.company}
                                onChange={(e) => handleEducationChange(index, "company", e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-2 transition-colors duration-150 rounded-lg cursor-text"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[13px] font-mono text-slate-500 mb-1.5 uppercase tracking-wider">CHI TIẾT MÔ TẢ ĐÀO TẠO & HOẠT ĐỘNG</label>
                            <textarea
                              rows={3}
                              value={exp.description}
                              onChange={(e) => handleEducationChange(index, "description", e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none px-3 py-2 transition-colors duration-150 rounded-lg resize-none leading-relaxed cursor-text"
                            />
                          </div>

                        </div>
                      );
                    })}
                    {(profile.educationData || []).length === 0 && (
                      <p className="text-[13px] text-slate-500 italic py-4 text-center border border-dashed border-slate-200 bg-slate-50/50 rounded-lg">[ CHƯA CÓ KINH NGHIỆM HỌC VẤN ĐÀO TẠO CHI TIẾT ]</p>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* TAB 5: Themes fine-tuning configuration */}
            {activeTab === "theme" && (
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-[13px] font-semibold text-slate-900 flex items-center gap-2 uppercase font-mono tracking-wider">
                    <Paintbrush className="h-4 w-4 text-sky-650" /> Chọn diện mạo sân khấu
                  </h2>
                  <p className="text-[13px] text-slate-500 mt-0.5 font-sans">Lựa chọn dải màu bổ trợ cùng các cấu trúc thiết kế phản ánh đặc tính dự án.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(Object.keys(THEMES) as ThemeType[]).map((themeKey) => {
                    const th = THEMES[themeKey];
                    const isSelected = currentTheme === themeKey;
                    return (
                      <button
                        key={themeKey}
                        onClick={() => {
                          setTheme(themeKey);
                          showNotification(`Đã chuyển đổi giao diện chính sang: ${th.name}`);
                        }}
                        className={`group flex flex-col items-start gap-1 p-5 rounded-lg border text-left transition-all ${
                          isSelected 
                            ? "border-slate-800 bg-slate-100" 
                            : "border-slate-200 hover:border-slate-350 bg-white"
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="font-bold font-mono text-[13px] text-slate-800 flex items-center gap-1.5">
                            {th.name}
                            {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-slate-800 animate-ping" />}
                          </span>
                        </div>
                        <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">
                          Thay đổi tức thời màu nền chính toàn cấu trúc để thích nghi hoàn hảo với nhịp điệu hiển thị.
                        </p>
                        
                        {/* Interactive representative preview box */}
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200 w-full">
                          <span className="text-[13px] font-mono text-slate-550">BẢNG MÀU:</span>
                          <span className="h-2.5 w-6 rounded-sm bg-slate-100 border border-slate-200" />
                          <span className={`h-2 text-[13px] font-mono leading-none flex items-center shrink-0 ml-auto select-none uppercase ${isSelected ? "text-sky-600" : "text-slate-400"}`}>
                            {isSelected ? "[ ACTIVE WORKPLACE ]" : "PRESET"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {cfEnabled && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-[13px] text-amber-800 mt-4 leading-relaxed font-sans">
                    💡 <strong>Lưu ý đồng bộ Cloudflare:</strong> Do bạn đang bật đồng bộ đám mây Cloudflare D1, hãy nhớ bấm đầu nút <strong>"Đồng bộ ngay" (ở góc trên cùng bên phải)</strong> để cập nhật dải màu giao diện (App Theme) mới này lên database D1. Tránh trường hợp khi tải lại trang (reload), dữ liệu gốc cũ chưa đổi màu trên D1 ghi đè lên thiết bị.
                  </div>
                )}
              </div>
            )}

            {/* TAB: Cloudflare D1 & R2 Integration Panel */}
            {activeTab === "cloudflare" && (
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-[13px] font-semibold text-slate-900 flex items-center gap-2 uppercase font-mono tracking-wider">
                    <Globe className="h-4 w-4 text-orange-600 animate-pulse" /> Kết nối cơ sở dữ liệu Cloudflare D1 & R2
                  </h2>
                  <p className="text-[13px] text-slate-500 mt-0.5 font-sans">
                    Đồng bộ hóa trực tiếp thông tin tiểu sử, danh mục tác phẩm dựng phim, và hình ảnh lưu trữ trên Cloudflare R2 thông qua API Worker.
                  </p>
                </div>

                {/* Connection Status and Toggle Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5 uppercase font-mono tracking-wide">
                        Trạng thái đồng bộ tự động
                      </h3>
                      <p className="text-[13px] text-slate-500 mt-0.5">
                        Tải trực tiếp dữ liệu thô từ Cloudflare D1 mỗi khi truy cập trang web Portfolio.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const nextState = !cfEnabled;
                        setCfEnabled(nextState);
                        localStorage.setItem("cf_sync_enabled", String(nextState));
                        showNotification(nextState ? "Đã bật chế độ tự động đồng bộ Cloudflare!" : "Đã tắt chế độ đồng bộ Cloudflare.");
                      }}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        cfEnabled ? "bg-emerald-500" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          cfEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {/* Worker URL */}
                    <div className="space-y-1.5">
                      <label className="block text-[13px] uppercase font-mono tracking-wider text-slate-500 select-none">
                        Base Worker API URL <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="url"
                        placeholder="e.g. https://portfolio-api.username.workers.dev"
                        value={cfBaseUrl}
                        onChange={(e) => {
                          const url = e.target.value;
                          setCfBaseUrl(url);
                          localStorage.setItem("cf_base_url", url);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] font-mono text-slate-900 focus:outline-none px-3 py-2 transition-colors rounded-lg"
                      />
                      <p className="text-[13px] text-slate-400">Đường dẫn gốc của Cloudflare Worker chứa các endpoint.</p>
                    </div>

                    {/* Auth Token Key */}
                    <div className="space-y-1.5">
                      <label className="block text-[13px] uppercase font-mono tracking-wider text-slate-500 select-none">
                        Xác thực API Secret (Optional)
                      </label>
                      <input
                        type="password"
                        placeholder="Nhập mã Bearer Token bảo mật (nếu có)"
                        value={cfAuthKey}
                        onChange={(e) => {
                          const key = e.target.value;
                          setCfAuthKey(key);
                          localStorage.setItem("cf_auth_key", key);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-[13px] font-mono text-slate-900 focus:outline-none px-3 py-2 transition-colors rounded-lg"
                      />
                      <p className="text-[13px] text-slate-400">Mã Authentication (Authorization: Bearer) bảo mật của riêng bạn.</p>
                    </div>
                  </div>
                </div>

                {/* Synchronize Master Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* PULL BUTTON COMPONENT */}
                  <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between space-y-4 shadow-sm">
                    <div className="space-y-1">
                      <h4 className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5 font-mono">
                        <RefreshCw className="h-3.5 w-3.5 text-slate-500" /> [1] TẢI DỮ LIỆU VỀ (PULL)
                      </h4>
                      <p className="text-[13px] text-slate-500 leading-relaxed">
                        Yêu cầu Worker GET <code className="bg-slate-100 border border-slate-200 px-1 py-0.5 rounded text-amber-700 font-mono">/api/all-data</code> để lấy toàn bộ dữ liệu từ D1 Database, sau đó cập nhật trực tiếp lên Landing Page của bạn.
                      </p>
                    </div>

                    <button
                      disabled={cfSyncing || !cfBaseUrl}
                      onClick={async () => {
                        if (!cfBaseUrl) return;
                        setCfSyncing(true);
                        try {
                          const cleanUrl = cfBaseUrl.replace(/\/$/, "");
                          const headers: Record<string, string> = { "Content-Type": "application/json" };
                          if (cfAuthKey) {
                            headers["Authorization"] = cfAuthKey.startsWith("Bearer ") ? cfAuthKey : `Bearer ${cfAuthKey}`;
                          }

                          showNotification("Đang kết nối Cloudflare D1 để nạp dữ liệu...");
                          const res = await fetch(`${cleanUrl}/api/all-data`, { headers });
                          
                          if (res.ok) {
                            const contentType = res.headers.get("content-type") || "";
                            const textOriginal = await res.text();
                            const text = textOriginal.trim();
                            
                            if (text.startsWith("<!") || text.includes("<html") || contentType.includes("text/html")) {
                              showNotification("⚠️ Lỗi cấu hình URL: API trả về mã nguồn trang Web (HTML) thay vì dữ liệu JSON. Bạn có chắc đã điền đúng URL của Cloudflare Worker chuyên biệt (ví dụ: https://...workers.dev) thay vì điền link trang Portfolio này không?");
                              setCfSyncing(false);
                              return;
                            }

                            let data;
                            try {
                              data = JSON.parse(text);
                            } catch (jsonErr: any) {
                              console.error("JSON parse error:", jsonErr, text.slice(0, 500));
                              showNotification("⚠️ Lỗi giải mã: Phản hồi từ máy chủ không đúng định dạng JSON chuẩn. Hãy kiểm tra lại Cloudflare Worker API của bạn.");
                              setCfSyncing(false);
                              return;
                            }
                            
                            const mappedProfile = mapCloudflareToProfile(data);
                            setProfile(mappedProfile);
                            // Set JSON editor text in export panel as well
                            setJsonText(JSON.stringify(mappedProfile, null, 2));
                            showNotification("✅ Đã kéo và đồng bộ dữ liệu Cloudflare D1 thành công!");
                          } else {
                            showNotification(`❌ Lỗi kết nối Cloudflare: API trả lỗi mã ${res.status}`);
                          }
                        } catch (err: any) {
                          console.error(err);
                          showNotification(`⚠️ Lỗi khi nạp dữ liệu: ${err?.message || "Không thể truy cập Worker API"}`);
                        } finally {
                          setCfSyncing(false);
                        }
                      }}
                      className="w-full text-center bg-slate-100 hover:bg-sky-50 border border-slate-200 hover:border-sky-200 text-slate-700 hover:text-sky-700 font-mono text-[13px] rounded-lg py-2 transition-all cursor-pointer font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {cfSyncing ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin text-sky-600" />
                          Đang tải dữ liệu...
                        </>
                      ) : (
                        "PULL DỮ LIỆU D1"
                      )}
                    </button>
                  </div>

                  {/* PUSH BUTTON COMPONENT */}
                  <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between space-y-4 shadow-sm">
                    <div className="space-y-1">
                      <h4 className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5 font-mono">
                        <Save className="h-3.5 w-3.5 text-slate-500" /> [2] GỬI DỮ LIỆU ĐI (PUSH)
                      </h4>
                      <p className="text-[13px] text-slate-500 leading-relaxed">
                        Tải ngược dữ liệu đã chỉnh sửa trên Admin Dashboard này lên Cloudflare. Sẽ cập nhật 3 bảng <code className="bg-slate-100 border border-slate-200 px-1 py-0.5 rounded text-amber-700 font-mono">settings</code>, <code className="bg-slate-100 border border-slate-200 px-1 py-0.5 rounded text-amber-700 font-mono">profile</code> và <code className="bg-slate-100 border border-slate-200 px-1 py-0.5 rounded text-amber-700 font-mono">projects</code> thông qua các API Post.
                      </p>
                    </div>

                    <button
                      disabled={cfSyncing || !cfBaseUrl}
                      onClick={handleMasterSync}
                      className="w-full text-center bg-sky-600 hover:bg-sky-500 text-white font-mono text-[13px] rounded-lg py-2 transition-all cursor-pointer font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {cfSyncing ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin text-white" />
                          Đang đồng bộ...
                        </>
                      ) : (
                        "PUSH DỮ LIỆU LÊN D1"
                      )}
                    </button>
                  </div>
                </div>

                {/* Cloudflare R2 Upload Test Box */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-sm">
                  <h3 className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5 uppercase font-mono tracking-wide">
                    <Camera className="h-4 w-4 text-sky-650" /> Tải tệp tin ảnh lên Cloudflare R2 Store
                  </h3>
                  <p className="text-[13px] text-slate-500">
                    Sử dụng endpoint <code className="bg-slate-100 border border-slate-200 px-1 py-0.5 rounded text-amber-700 font-mono">POST /api/upload-thumbnail</code> dạng multipart/form-data để đưa hình ảnh đại diện / poster tác phẩm lên Cloudflare R2 Bucket công khai.
                  </p>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                    <label className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-350 px-4 py-3 rounded-lg text-[13px] cursor-pointer flex items-center justify-center gap-2 font-mono text-slate-700 transition-colors">
                      <Download className="h-4 w-4 rotate-180" />
                      {cfR2Uploading ? "Đang xử lý tải lên R2..." : "Chọn một file ảnh mốc để tải lên..."}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={cfR2Uploading || !cfBaseUrl}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !cfBaseUrl) return;

                          setCfR2Uploading(true);
                          try {
                            const cleanUrl = cfBaseUrl.replace(/\/$/, "");
                            const formData = new FormData();
                            formData.append("file", file); // payload contains file as 'file' form data!

                            const headers: Record<string, string> = {};
                            if (cfAuthKey) {
                              headers["Authorization"] = cfAuthKey.startsWith("Bearer ") ? cfAuthKey : `Bearer ${cfAuthKey}`;
                            }

                            showNotification("Đang tải tệp tin của bạn trực tiếp lên R2 Bucket...");
                            const res = await fetch(`${cleanUrl}/api/upload-thumbnail`, {
                              method: "POST",
                              headers,
                              body: formData,
                            });

                            if (res.ok) {
                              const dat = await res.json();
                              // API returns: { url: "R2_PUBLIC_URL" }
                              const r2Url = dat.url;
                              if (r2Url) {
                                navigator.clipboard.writeText(r2Url);
                                showNotification("✅ Upload thành công! Đã sao chép đường dẫn R2 vào Clipboard.");
                              } else {
                                showNotification("Upload thành công nhưng không tìm thấy dữ liệu 'url' phản hồi.");
                              }
                            } else {
                              showNotification(`❌ Lỗi upload R2: API trả lỗi mã ${res.status}`);
                            }
                          } catch (err: any) {
                            console.error(err);
                            showNotification(`⚠️ Lỗi upload R2: ${err?.message || "Không thể tải lên"}`);
                          } finally {
                            setCfR2Uploading(false);
                          }
                        }}
                      />
                    </label>

                    {/* Quick guidelines */}
                    <div className="text-[13px] text-slate-500 font-mono leading-normal bg-slate-50 border border-slate-200 p-3 rounded-lg flex-1">
                      💡 Mẹo: Khi kết nối hoạt động, bạn sẽ nhận được đường dẫn liên kết công khai (Public URL R2) để thêm vào khung ảnh chân dung hoặc Poster tác phẩm dễ dàng!
                    </div>
                  </div>
                </div>

                {/* DB Info Cheat-sheet */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                  <div className="flex gap-2">
                    <Info className="h-3.5 w-3.5 text-orange-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-[13px] font-bold text-slate-800 font-mono">BẢN ĐỒ CHEAT-SHEET KIỂU BẢNG:</h4>
                      <div className="text-[13px] text-slate-500 leading-relaxed font-mono">
                        <div>• <span className="text-slate-700">Bảng settings</span>: id, name, profession, slogan, avatar, accentColor, categories, footerEmail...</div>
                        <div>• <span className="text-slate-700">Bảng profile</span>: id, bio, skills (JSON), experience (JSON), education (JSON)</div>
                        <div>• <span className="text-slate-700">Bảng projects</span>: id, title, category, year, videoUrl, thumbnail, tags (JSON)</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: JSON advanced database schema edit panel */}
            {activeTab === "export" && (
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-[13px] font-semibold text-slate-900 flex items-center gap-2 uppercase font-mono tracking-wider">
                    <Download className="h-4 w-4 text-sky-650" /> Nhập / Xuất cơ sở dữ liệu (JSON)
                  </h2>
                  <p className="text-[13px] text-slate-500 mt-0.5 font-sans">Truy cập thô vào cấu trúc cây dữ liệu Portfolio. Bạn có thể lưu trữ dự phục hoặc phân giải thủ công.</p>
                </div>

                <div className="flex gap-3 bg-blue-50 border border-blue-200 p-4 rounded-lg select-none">
                  <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[13px] text-blue-800 leading-relaxed font-sans">
                    Sản phẩm này tương thích trực tiếp với luồng tri thức của <strong>Trang bị Trợ lý AI Gemini</strong>. Mọi chỉnh sửa dữ liệu tại bảng điều khiển sẽ định nghĩa lại cách thức Assistant đại diện đàm thoại với người xem ở trang gốc của bạn!
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-mono font-bold text-slate-500">STRUCTURE_PAYLOAD_CONFIG.JSON</span>
                    <div className="flex gap-2 select-none">
                      <button
                        onClick={handleCopyJson}
                        className="flex items-center gap-1.5 text-[13px] bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded text-slate-700 transition-colors cursor-pointer"
                      >
                        {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        <span>{copied ? "Đã sao chép" : "Sao chép"}</span>
                      </button>
                      <button
                        onClick={handleDownload}
                        className="flex items-center gap-1.5 text-[13px] bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded text-slate-700 transition-colors cursor-pointer"
                      >
                        <Download className="h-3 w-3" />
                        <span>Tải JSON về máy</span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={12}
                    value={jsonText}
                    onChange={(e) => {
                      setJsonText(e.target.value);
                      setJsonError(null);
                    }}
                    className="w-full rounded bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 p-4 text-[13px] font-mono text-slate-800 focus:outline-none leading-normal placeholder-slate-400"
                  />
                  {jsonError && (
                    <div className="text-red-800 text-[13px] mt-1.5 bg-red-50 border border-red-200 p-3 rounded font-mono">
                      CÚ PHÁP SAI LỆCH: {jsonError}
                    </div>
                  )}
                </div>

                <div className="pt-2 select-none">
                  <button
                    onClick={handleJsonSubmit}
                    className="w-full flex items-center justify-center gap-2 rounded bg-slate-800 hover:bg-slate-900 text-white font-semibold text-[13px] py-3.5 transition-all cursor-pointer shadow-sm rounded-lg"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Đồng bộ & Phân giải lại gói dữ liệu JSON
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* CATEGORY MANAGER MODAL */}
      {isCategoryManagerOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white/98 backdrop-blur-md border border-slate-250/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transition-all duration-300 transform scale-100 flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-150 flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="text-[13px] font-bold text-slate-900 uppercase font-mono tracking-wider flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-sky-600" /> Quản lý thể loại
                </h3>
                <p className="text-[13px] text-slate-500 font-sans leading-relaxed">
                  Xem danh sách, sửa tên hoặc xóa các thể loại phim. Thay đổi sẽ cập nhật đồng loạt tất cả thước phim.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCategoryManagerOpen(false);
                  setEditingCategory(null);
                  setDeletingCategory(null);
                }}
                className="text-slate-400 hover:text-slate-650 h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all duration-150 cursor-pointer shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {(() => {
                const activeCats = Array.from(
                  new Set(profile.projects.map((p) => (p.category ? p.category.trim().toUpperCase() : "")).filter(Boolean))
                );

                if (activeCats.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-400 text-[13px] font-sans">
                      Không có thể loại nào đang được áp dụng.
                    </div>
                  );
                }

                return (
                  <div className="space-y-2.5">
                    {activeCats.map((cat) => {
                      const count = profile.projects.filter(
                        (p) => (p.category ? p.category.trim().toUpperCase() : "") === cat
                      ).length;

                      const isEditing = editingCategory === cat;
                      const isDeleting = deletingCategory === cat;

                      return (
                        <div
                          key={cat}
                          className={`p-3.5 rounded-xl border transition-all duration-200 ${
                            isEditing
                              ? "bg-blue-50/40 border-blue-200 shadow-xs"
                              : isDeleting
                              ? "bg-red-50/40 border-red-200 shadow-xs"
                              : "bg-slate-50/50 border-slate-200/70 hover:bg-slate-50 hover:border-slate-300/80"
                          }`}
                        >
                          {/* INLINE EDITING STATE */}
                          {isEditing ? (
                            <div className="space-y-2">
                              <label className="block text-[13px] font-mono text-slate-500 uppercase tracking-wider">
                                Đổi tên thể loại: <span className="font-semibold text-slate-700">{cat}</span>
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={editCategoryValue}
                                  onChange={(e) => setEditCategoryValue(e.target.value)}
                                  className="flex-1 bg-white border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 text-[13px] text-slate-900 focus:outline-none px-3 py-1.5 rounded-lg font-medium transition-colors"
                                  placeholder="e.g. TRAVEL, COMMERCIAL..."
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleRenameCategory(cat, editCategoryValue);
                                    }
                                  }}
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRenameCategory(cat, editCategoryValue)}
                                  className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-[13px] px-3 rounded-lg cursor-pointer transition-colors duration-150 active:scale-95"
                                >
                                  Lưu
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCategory(null)}
                                  className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-650 text-[13px] px-3 rounded-lg cursor-pointer transition-colors duration-150 active:scale-95"
                                >
                                  Hủy
                                </button>
                              </div>
                            </div>
                          ) : isDeleting ? (
                            /* INLINE DELETING (SAFE MERGE) STATE */
                            <div className="space-y-2.5">
                              <p className="text-[13px] text-red-800 font-medium">
                                Xóa danh mục <span className="font-bold">"{formatCategory(cat)}"</span>?
                              </p>
                              {count > 0 ? (
                                <div className="space-y-2">
                                  <p className="text-[13px] text-slate-500 leading-normal font-sans">
                                    Thể loại này đang chứa <span className="font-semibold text-slate-700">{count} tác phẩm</span>. Bạn phải chuyển dịch các tác phẩm này sang thể loại đích:
                                  </p>
                                  <div className="flex gap-2">
                                    <select
                                      value={mergeTargetCategory}
                                      onChange={(e) => setMergeTargetCategory(e.target.value)}
                                      className="flex-1 bg-white border border-slate-200 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 text-[13px] text-slate-900 focus:outline-none px-2 py-1.5 rounded-lg cursor-pointer font-medium"
                                    >
                                      {activeCats
                                        .filter((c) => c !== cat)
                                        .map((c) => (
                                          <option key={c} value={c}>
                                            {formatCategory(c)}
                                          </option>
                                        ))}
                                      {!activeCats.filter((c) => c !== cat).includes("TVC") && (
                                        <option value="TVC">TVC (Mặc định)</option>
                                      )}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCategory(cat, mergeTargetCategory)}
                                      className="bg-red-600 hover:bg-red-700 text-white font-semibold text-[13px] px-3 rounded-lg cursor-pointer transition-colors duration-150 active:scale-95 shrink-0"
                                    >
                                      Xóa & Di dời
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeletingCategory(null)}
                                      className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-650 text-[13px] px-3 rounded-lg cursor-pointer transition-colors duration-150 active:scale-95"
                                    >
                                      Hủy
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCategory(cat, "TVC")}
                                    className="bg-red-600 hover:bg-red-700 text-white font-semibold text-[13px] px-4 py-1.5 rounded-lg cursor-pointer transition-colors duration-150 active:scale-95"
                                  >
                                    Xác nhận Xóa
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingCategory(null)}
                                    className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-650 text-[13px] px-4 py-1.5 rounded-lg cursor-pointer transition-colors duration-150 active:scale-95"
                                  >
                                    Hủy
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* NORMAL STATE */
                            <div className="flex items-center justify-between gap-3">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[13px] font-bold text-slate-800">
                                    {formatCategory(cat)}
                                  </span>
                                  <span className="text-[13px] font-mono font-bold text-slate-400 bg-slate-100 border border-slate-200/50 px-1.5 py-0.5 rounded select-all uppercase">
                                    {cat}
                                  </span>
                                </div>
                                <span className="text-[13px] text-slate-450 font-mono block">
                                  {count} thước phim liên kết
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0 select-none">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCategory(cat);
                                    setEditCategoryValue(cat);
                                    setDeletingCategory(null);
                                  }}
                                  className="h-7 w-7 rounded bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-350 text-slate-500 hover:text-slate-750 flex items-center justify-center cursor-pointer transition-all duration-150 active:scale-90"
                                  title="Sửa / Đổi tên thể loại này"
                                >
                                  <Paintbrush className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeletingCategory(cat);
                                    setEditingCategory(null);
                                    // Default merge target to first other category
                                    const firstOther = activeCats.find((c) => c !== cat) || "TVC";
                                    setMergeTargetCategory(firstOther);
                                  }}
                                  className="h-7 w-7 rounded bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-650 flex items-center justify-center cursor-pointer transition-all duration-150 active:scale-90"
                                  title="Xóa thể loại này"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-150 text-center text-[13px] text-slate-450 font-mono">
              💡 Đổi tên hoặc gộp thể loại lỗi (vd: SOCÍAL) để làm sạch cơ sở dữ liệu.
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
