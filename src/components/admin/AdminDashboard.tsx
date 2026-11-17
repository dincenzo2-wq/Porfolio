import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Film,
  Camera,
  Sparkles,
} from 'lucide-react';
import { usePortfolioData } from '../../context/PortfolioDataContext';
import {
  cleanSvgWhiteBackground,
  autoCropSvgViewBox,
  invertSvgColors,
} from '../../utils/brandingLogic';
import { GeneralInfoTab } from './GeneralInfoTab';
import { ProjectsTab } from './ProjectsTab';
import { StillsAndGearTab } from './StillsAndGearTab';
import { BrandingTab } from './BrandingTab';

interface AdminDashboardProps {
  onNavigateHome: () => void;
}

type TabType = 'general' | 'projects' | 'stills-gear' | 'branding';

export function AdminDashboard({ onNavigateHome }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [showToast, setShowToast] = useState(false);

  const {
    content,
    isSaving,
    hasUnsavedChanges,
    lastSavedAt,
    updateProfile,
    updateProjects,
    addProject,
    updateProject,
    deleteProject,
    addStill,
    deleteStill,
    updateStills,
    updateGear,
    updateTools,
    updateExperience,
    updateEducation,
    updateCategories,
    updateCategorySubtitles,
    updateRoles,
    updateBranding,
    markUnsaved,
    saveChanges,
    resetToDefault,
  } = usePortfolioData();

  const handleSave = async () => {
    const success = await saveChanges();
    if (success) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    }
  };

  // Render SVG logo dynamically based on current branding
  const renderedLogoSvg = useMemo(() => {
    if (!content.branding?.logoSvg) return null;
    let svg = content.branding.logoSvg;
    if (content.branding.autoRemoveWhiteBg) {
      svg = cleanSvgWhiteBackground(svg);
    }
    svg = autoCropSvgViewBox(svg);
    svg = invertSvgColors(svg, '#111111');
    const height = 24;
    svg = svg.replace(/<svg\b([^>]*)>/i, (_match, attrs) => {
      const cleanAttrs = attrs
        .replace(/\bwidth\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\bheight\s*=\s*["'][^"']*["']/gi, '')
        .trim();
      return `<svg ${cleanAttrs} style="height: ${height}px; width: auto; max-height: 100%; display: block;">`;
    });
    return svg;
  }, [content.branding?.logoSvg, content.branding?.autoRemoveWhiteBg]);

  return (
    <div className="min-h-screen bg-[#F6F6F8] text-[#111111] font-sans antialiased selection:bg-[#2563EB] selection:text-white pb-24">
      {/* 1. Master Sticky Header (Fixed height 64px, docks flush with top) */}
      <header className="sticky top-0 z-40 h-[64px] bg-[#F6F6F8]/90 backdrop-blur-md border-b border-black/[0.07] px-4 sm:px-6 flex items-center shadow-xs">
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Brand & Cloudflare Status */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/10 text-xs font-semibold text-[#555555] hover:text-[#111111] hover:bg-black/5 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Về trang chủ</span>
            </button>

            <div className="border-l border-black/10 pl-3">
              <div className="flex items-center gap-2.5">
                {renderedLogoSvg && (
                  <span
                    className="shrink-0 flex items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: renderedLogoSvg }}
                  />
                )}
                {content.branding?.showBrandName !== false && (
                  <span className="font-bricolage font-extrabold text-sm sm:text-base text-[#111111] uppercase tracking-tight">
                    {content.branding?.brandName || 'VINH TRẦN'}
                  </span>
                )}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/5 text-[#555555] uppercase tracking-wider">
                  Dashboard
                </span>
              </div>
            </div>

            {/* Cloudflare Zero Trust Security Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cloudflare D1 &amp; R2 · Zero Trust Access</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Chấm cam cảnh báo khi có thay đổi chưa lưu */}
            {hasUnsavedChanges && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-xs font-semibold text-amber-900 shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
                <span className="hidden sm:inline">Có thay đổi chưa lưu</span>
                <span className="sm:hidden">Chưa lưu</span>
              </div>
            )}

            <button
              type="button"
              onClick={resetToDefault}
              title="Khôi phục nội dung về mặc định ban đầu"
              className="px-3 py-2 rounded-xl border border-black/10 text-xs font-semibold text-[#666666] hover:bg-black/5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 inline mr-1" />
              <span className="hidden sm:inline">Khôi phục mặc định</span>
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all cursor-pointer ${
                isSaving
                  ? 'bg-[#555555] cursor-wait'
                  : 'bg-[#111111] hover:bg-black/85 hover:shadow-md active:scale-98'
              }`}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang lưu vào D1...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-[#38BDF8]" />
                  <span>Lưu thay đổi</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 2. Success Toast Alert Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl bg-[#111111] text-white text-xs sm:text-sm font-medium shadow-2xl border border-white/10 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="font-bold">Đã lưu thành công vào Cloudflare D1!</p>
            <p className="text-white/70 text-xs">
              Dữ liệu và hình ảnh đã được cập nhật trực tiếp cho trang chủ.
            </p>
          </div>
        </div>
      )}

      {/* 3. Title & Intro (Above the sticky tab bar) */}
      <div className="max-w-6xl mx-auto px-6 pt-8 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="font-bricolage text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight uppercase">
            Quản trị nội dung Portfolio
          </h1>
          <p className="text-xs sm:text-sm text-black/60 mt-1">
            Hạ tầng Cloudflare Pages: Dữ liệu văn bản lưu vào D1, hình ảnh nén WebP tải lên R2.
          </p>
        </div>

        {lastSavedAt && (
          <span className="text-xs text-black/50 font-medium tabular-nums self-start md:self-auto">
            Cập nhật lần cuối: {new Date(lastSavedAt).toLocaleTimeString('vi-VN')}
          </span>
        )}
      </div>

      {/* 4. Sticky Navigation Tabs (Segmented Control liền khối) */}
      <div className="sticky top-[64px] z-20 bg-[#F6F6F8]/90 backdrop-blur-md border-b border-black/[0.07] py-3">
        <div className="max-w-6xl mx-auto px-6">
          <div className="inline-flex p-1 bg-black/[0.05] rounded-xl border border-black/[0.05] overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer rounded-lg ${
                activeTab === 'general'
                  ? 'bg-white text-[#111111] shadow-sm'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>(1) Thông tin chung &amp; Liên hệ</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('projects')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer rounded-lg ${
                activeTab === 'projects'
                  ? 'bg-white text-[#111111] shadow-sm'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>(2) Quản lý Dự án &amp; Link Video</span>
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] tabular-nums font-bold ${
                  activeTab === 'projects' ? 'bg-black/8 text-[#111111]' : 'bg-black/5 text-black/50'
                }`}
              >
                {content.projects.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('stills-gear')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer rounded-lg ${
                activeTab === 'stills-gear'
                  ? 'bg-white text-[#111111] shadow-sm'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>(3) Stills, Hồ sơ &amp; Thiết bị</span>
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] tabular-nums font-bold ${
                  activeTab === 'stills-gear' ? 'bg-black/8 text-[#111111]' : 'bg-black/5 text-black/50'
                }`}
              >
                {content.stills.length} frames
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('branding')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer rounded-lg ${
                activeTab === 'branding'
                  ? 'bg-white text-[#111111] shadow-sm'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>(4) Logo &amp; Favicon</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Main Active Content Wrapper (Max width 6xl aligned) */}
      <main className="max-w-6xl mx-auto px-6 pt-2">
        {activeTab === 'general' && (
          <GeneralInfoTab
            profile={content.profile}
            onChange={updateProfile}
          />
        )}

        {activeTab === 'projects' && (
          <div className="pt-8">
            <ProjectsTab
              projects={content.projects}
              categories={content.categories}
              categorySubtitles={content.categorySubtitles}
              roles={content.roles}
              onAddProject={addProject}
              onUpdateProject={updateProject}
              onDeleteProject={deleteProject}
              onReorderProjects={updateProjects}
              onUpdateCategories={updateCategories}
              onUpdateCategorySubtitles={updateCategorySubtitles}
              onUpdateRoles={updateRoles}
              onMarkUnsaved={markUnsaved}
            />
          </div>
        )}

        {activeTab === 'stills-gear' && (
          <div className="pt-8">
            <StillsAndGearTab
              stills={content.stills}
              gear={content.gear}
              tools={content.tools}
              experience={content.experience}
              education={content.education}
              onAddStill={addStill}
              onDeleteStill={deleteStill}
              onUpdateStills={updateStills}
              onUpdateGear={updateGear}
              onUpdateTools={updateTools}
              onUpdateExperience={updateExperience}
              onUpdateEducation={updateEducation}
            />
          </div>
        )}

        {activeTab === 'branding' && (
          <div className="pt-8">
            <BrandingTab
              branding={content.branding}
              onChange={updateBranding}
              onMarkUnsaved={markUnsaved}
            />
          </div>
        )}
      </main>
    </div>
  );
}
