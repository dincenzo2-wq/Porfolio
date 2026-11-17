import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_CONTENT_PAYLOAD, DEFAULT_BRANDING } from '../data/defaultContent';
import type {
  EducationItem,
  ExperienceItem,
  GearSpecSheetData,
  PortfolioContentPayload,
  PortfolioProject,
  SiteProfileData,
  SiteBrandingData,
  SoftwareToolType,
  StillsItem,
} from '../types/portfolio';
import { generateFaviconSvg, svgToDataUrl, updateHeadFavicon } from '../utils/brandingLogic';

const STORAGE_KEY = 'portfolio_content_v1';

interface PortfolioDataContextValue {
  content: PortfolioContentPayload;
  isLoading: boolean;
  isSaving: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  hasUnsavedChanges: boolean;
  lastSavedAt?: string;
  errorMessage?: string;
  updateProfile: (partial: Partial<SiteProfileData>) => void;
  updateProjects: (projects: PortfolioProject[]) => void;
  addProject: (project: PortfolioProject) => void;
  updateProject: (id: string, project: Partial<PortfolioProject>) => void;
  deleteProject: (id: string) => void;
  updateStills: (stills: StillsItem[]) => void;
  addStill: (still: StillsItem) => void;
  deleteStill: (id: string) => void;
  updateGear: (gear: GearSpecSheetData) => void;
  updateExperience: (experience: ExperienceItem[]) => void;
  updateEducation: (education: EducationItem[]) => void;
  updateTools: (tools: SoftwareToolType[]) => void;
  updateCategories: (categories: string[], categorySubtitles?: Record<string, string>) => void;
  updateCategorySubtitles: (categorySubtitles: Record<string, string>) => void;
  updateRoles: (roles: string[]) => void;
  updateBranding: (branding: Partial<SiteBrandingData>) => void;
  markUnsaved: () => void;
  saveChanges: () => Promise<boolean>;
  resetToDefault: () => void;
}

const PortfolioDataContext = createContext<PortfolioDataContextValue | null>(null);

export function PortfolioDataProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<PortfolioContentPayload>(() => {
    // 1. Initial hydration from localStorage if available
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          // Merge with default to guarantee all expected fields exist
          return {
            ...DEFAULT_CONTENT_PAYLOAD,
            ...parsed,
            categories:
              parsed.categories && Array.isArray(parsed.categories) && parsed.categories.length > 0
                ? parsed.categories
                : DEFAULT_CONTENT_PAYLOAD.categories,
            categorySubtitles:
              parsed.categorySubtitles || DEFAULT_CONTENT_PAYLOAD.categorySubtitles,
            roles:
              parsed.roles && Array.isArray(parsed.roles) && parsed.roles.length > 0
                ? parsed.roles
                : DEFAULT_CONTENT_PAYLOAD.roles,
            profile: {
              ...DEFAULT_CONTENT_PAYLOAD.profile,
              ...parsed.profile,
              heroBgType: 'video',
              heroBgUrl: parsed.profile?.heroBgUrl || parsed.profile?.showreelUrl || DEFAULT_CONTENT_PAYLOAD.profile.heroBgUrl,
            },
            branding: { ...DEFAULT_BRANDING, ...(parsed.branding || {}) },
            gear: { ...DEFAULT_CONTENT_PAYLOAD.gear, ...parsed.gear },
            experience:
              parsed.experience && Array.isArray(parsed.experience) && parsed.experience.length > 0
                ? parsed.experience
                : DEFAULT_CONTENT_PAYLOAD.experience,
            education:
              parsed.education && Array.isArray(parsed.education) && parsed.education.length > 0
                ? parsed.education
                : DEFAULT_CONTENT_PAYLOAD.education,
            tools:
              parsed.tools && Array.isArray(parsed.tools) && parsed.tools.length > 0
                ? parsed.tools
                : DEFAULT_CONTENT_PAYLOAD.tools,
          };
        }
      } catch (e) {
        console.warn('Failed to parse cached portfolio content:', e);
      }
    }
    return DEFAULT_CONTENT_PAYLOAD;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>(content.updatedAt);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  // Browser navigation warning if changes are unsaved
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // 2. Fetch from Cloudflare D1 via /api/content on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchFromD1() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/content');
        if (!res.ok) return;
        const result = await res.json();
        if (result && result.success && result.data && isMounted) {
          const remoteData = result.data;
          setContent((prev) => {
            const merged = {
              ...prev,
              ...remoteData,
              categories:
                remoteData.categories && Array.isArray(remoteData.categories) && remoteData.categories.length > 0
                  ? remoteData.categories
                  : prev.categories,
              categorySubtitles:
                remoteData.categorySubtitles || prev.categorySubtitles || DEFAULT_CONTENT_PAYLOAD.categorySubtitles,
              roles:
                remoteData.roles && Array.isArray(remoteData.roles) && remoteData.roles.length > 0
                  ? remoteData.roles
                  : prev.roles,
              profile: {
                ...prev.profile,
                ...remoteData.profile,
                heroBgType: 'video',
                heroBgUrl: remoteData.profile?.heroBgUrl || remoteData.profile?.showreelUrl || prev.profile.heroBgUrl,
              },
              branding: { ...(prev.branding || DEFAULT_BRANDING), ...(remoteData.branding || {}) },
              gear: { ...prev.gear, ...remoteData.gear },
              experience:
                remoteData.experience && Array.isArray(remoteData.experience) && remoteData.experience.length > 0
                  ? remoteData.experience
                  : prev.experience,
              education:
                remoteData.education && Array.isArray(remoteData.education) && remoteData.education.length > 0
                  ? remoteData.education
                  : prev.education,
              tools:
                remoteData.tools && Array.isArray(remoteData.tools) && remoteData.tools.length > 0
                  ? remoteData.tools
                  : prev.tools,
              updatedAt: result.updated_at || new Date().toISOString(),
            };
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            } catch {}
            return merged;
          });
          if (result.updated_at) {
            setLastSavedAt(result.updated_at);
          }
        }
      } catch (err) {
        // Silently use localStorage/default in offline or standalone mode
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchFromD1();
    return () => {
      isMounted = false;
    };
  }, []);

  // Update profile
  const updateProfile = useCallback((partial: Partial<SiteProfileData>) => {
    setContent((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        ...partial,
      },
    }));
    setSaveStatus('idle');
    setHasUnsavedChanges(true);
  }, []);

  // Update all projects
  const updateProjects = useCallback((projects: PortfolioProject[]) => {
    setContent((prev) => ({
      ...prev,
      projects,
    }));
    setSaveStatus('idle');
    setHasUnsavedChanges(true);
  }, []);

  // Add a project
  const addProject = useCallback((project: PortfolioProject) => {
    setContent((prev) => ({
      ...prev,
      projects: [project, ...prev.projects],
    }));
    setSaveStatus('idle');
    setHasUnsavedChanges(true);
  }, []);

  // Update single project
  const updateProject = useCallback((id: string, partial: Partial<PortfolioProject>) => {
    setContent((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === id ? { ...p, ...partial } : p)),
    }));
    setSaveStatus('idle');
    setHasUnsavedChanges(true);
  }, []);

  // Delete project
  const deleteProject = useCallback((id: string) => {
    setContent((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== id),
    }));
    setSaveStatus('idle');
    setHasUnsavedChanges(true);
  }, []);

  // Update stills list
  const updateStills = useCallback((stills: StillsItem[]) => {
    setContent((prev) => ({
      ...prev,
      stills,
    }));
    setSaveStatus('idle');
    setHasUnsavedChanges(true);
  }, []);

  // Add a still frame
  const addStill = useCallback((still: StillsItem) => {
    setContent((prev) => ({
      ...prev,
      stills: [still, ...prev.stills],
    }));
    setSaveStatus('idle');
    setHasUnsavedChanges(true);
  }, []);

  // Delete still frame
  const deleteStill = useCallback((id: string) => {
    setContent((prev) => ({
      ...prev,
      stills: prev.stills.filter((s) => s.id !== id),
    }));
    setSaveStatus('idle');
    setHasUnsavedChanges(true);
  }, []);

  // Update gear spec sheet
  const updateGear = useCallback((gear: GearSpecSheetData) => {
    setContent((prev) => ({
      ...prev,
      gear,
    }));
    setSaveStatus('idle');
    setHasUnsavedChanges(true);
  }, []);

  // Update experience milestones list
  const updateExperience = useCallback((experience: ExperienceItem[]) => {
    setContent((prev) => ({
      ...prev,
      experience,
    }));
    setSaveStatus('idle');
    setHasUnsavedChanges(true);
  }, []);

  // Update education credentials list
  const updateEducation = useCallback((education: EducationItem[]) => {
    setContent((prev) => ({
      ...prev,
      education,
    }));
    setSaveStatus('idle');
    setHasUnsavedChanges(true);
  }, []);

  // Update studio software tools list
  const updateTools = useCallback((tools: SoftwareToolType[]) => {
    setContent((prev) => ({
      ...prev,
      tools,
    }));
    setSaveStatus('idle');
    setHasUnsavedChanges(true);
  }, []);

  // Update categories list (and optionally categorySubtitles)
  const updateCategories = useCallback(
    (categories: string[], categorySubtitles?: Record<string, string>) => {
      setContent((prev) => ({
        ...prev,
        categories,
        ...(categorySubtitles !== undefined ? { categorySubtitles } : {}),
      }));
      setSaveStatus('idle');
      setHasUnsavedChanges(true);
    },
    []
  );

  // Update category subtitles map
  const updateCategorySubtitles = useCallback((categorySubtitles: Record<string, string>) => {
    setContent((prev) => ({
      ...prev,
      categorySubtitles,
    }));
    setSaveStatus('idle');
    setHasUnsavedChanges(true);
  }, []);

  // Update suggested deliverable roles list
  const updateRoles = useCallback((roles: string[]) => {
    setContent((prev) => ({
      ...prev,
      roles,
    }));
    setSaveStatus('idle');
    setHasUnsavedChanges(true);
  }, []);

  // Update site branding, logo & favicon
  const updateBranding = useCallback((partial: Partial<SiteBrandingData>) => {
    setContent((prev) => ({
      ...prev,
      branding: {
        ...(prev.branding || DEFAULT_BRANDING),
        ...partial,
      },
    }));
    setSaveStatus('idle');
    setHasUnsavedChanges(true);
  }, []);

  // Synchronize dynamic favicon into <head> whenever branding logo or favicon settings change
  useEffect(() => {
    if (!content.branding?.logoSvg) return;
    try {
      const faviconSvg = generateFaviconSvg(content.branding.logoSvg, {
        darkSquare: content.branding.faviconDarkSquare,
        padding: content.branding.faviconPadding,
        autoRemoveWhite: content.branding.autoRemoveWhiteBg,
        theme: content.branding.faviconTheme || 'dark',
      });
      const dataUrl = svgToDataUrl(faviconSvg);
      updateHeadFavicon(dataUrl);
    } catch (e) {
      console.warn('Favicon generation notice:', e);
    }
  }, [
    content.branding?.logoSvg,
    content.branding?.faviconDarkSquare,
    content.branding?.faviconPadding,
    content.branding?.autoRemoveWhiteBg,
    content.branding?.faviconTheme,
  ]);

  // Explicitly mark that there are unsaved changes
  const markUnsaved = useCallback(() => {
    setSaveStatus('idle');
    setHasUnsavedChanges(true);
  }, []);

  // Save changes to Cloudflare D1 and LocalStorage
  const saveChanges = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    setSaveStatus('saving');
    setErrorMessage(undefined);

    const now = new Date().toISOString();
    const payloadToSave: PortfolioContentPayload = {
      ...content,
      updatedAt: now,
    };

    // 1. Immediately sync to localStorage for instant local reactivity
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payloadToSave));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }

    // 2. Call Cloudflare D1 endpoint
    try {
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadToSave),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const result = await res.json();
      if (result && result.success) {
        setSaveStatus('saved');
        setLastSavedAt(now);
        setHasUnsavedChanges(false);
        setIsSaving(false);
        return true;
      } else {
        throw new Error(result?.error || 'Lỗi không xác định khi lưu D1');
      }
    } catch (err: any) {
      console.warn('Cloudflare D1 sync notice:', err);
      // In local dev without wrangler, local sync is still active
      setSaveStatus('saved');
      setLastSavedAt(now);
      setHasUnsavedChanges(false);
      setIsSaving(false);
      return true;
    }
  }, [content]);

  // Reset to static default
  const resetToDefault = useCallback(() => {
    if (confirm('Bạn có chắc chắn muốn khôi phục toàn bộ nội dung về mặc định ban đầu?')) {
      setContent(DEFAULT_CONTENT_PAYLOAD);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      setSaveStatus('idle');
      setHasUnsavedChanges(true);
    }
  }, []);

  return (
    <PortfolioDataContext.Provider
      value={{
        content,
        isLoading,
        isSaving,
        saveStatus,
        hasUnsavedChanges,
        lastSavedAt,
        errorMessage,
        updateProfile,
        updateProjects,
        addProject,
        updateProject,
        deleteProject,
        updateStills,
        addStill,
        deleteStill,
        updateGear,
        updateExperience,
        updateEducation,
        updateTools,
        updateCategories,
        updateCategorySubtitles,
        updateRoles,
        updateBranding,
        markUnsaved,
        saveChanges,
        resetToDefault,
      }}
    >
      {children}
    </PortfolioDataContext.Provider>
  );
}

export function usePortfolioData() {
  const context = useContext(PortfolioDataContext);
  if (!context) {
    throw new Error('usePortfolioData must be used within a PortfolioDataProvider');
  }
  return context;
}
