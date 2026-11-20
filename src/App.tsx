import { useCallback, useEffect, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { Navbar } from './components/Navbar';
import { HeroShowreel } from './components/HeroShowreel';
import { BrandMarquee } from './components/BrandMarquee';
import { StillsGallerySection } from './components/StillsGallerySection';
import { ProjectsAccordionSection } from './components/ProjectsAccordionSection';
import { OverviewAndSkills } from './components/OverviewAndSkills';
import { Footer } from './components/Footer';
import { ViewportFocusSection } from './components/ViewportFocusSection';
import { ProjectLightbox } from './components/ProjectLightbox';
import { ContactModal } from './components/ContactModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { PortfolioDataProvider, usePortfolioData } from './context/PortfolioDataContext';
import type { PortfolioProject } from './types/portfolio';
import { getAdjacentProject, normalizeCategoryKey } from './utils/portfolioLogic';

function PortfolioApp() {
  const { content } = usePortfolioData();
  const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );
  const morphStageRef = useRef<HTMLDivElement>(null);

  // Scroll-Linked Background Morph: smoothly transitions shared canvas from #09090B -> #F7F6F2 as #du-an enters viewport
  useEffect(() => {
    let rafId = 0;

    const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

    const updateMorph = () => {
      const stage = morphStageRef.current;
      const duAnEl = document.getElementById('du-an');
      if (!stage || !duAnEl) return;

      const vh = window.innerHeight || 900;
      const rect = duAnEl.getBoundingClientRect();
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      let t = 0;
      if (reducedMotion) {
        t = rect.top < vh * 0.5 ? 1 : 0;
      } else {
        const startY = vh * 0.78; // 100% dark while viewing Hero + 3D Carousel
        const endY = vh * 0.30;   // 100% studio off-white once Projects reaches reading zone
        const raw = Math.min(1, Math.max(0, (startY - rect.top) / Math.max(1, startY - endY)));
        // Smoothstep easing curve
        t = raw * raw * (3 - 2 * raw);
      }

      // Interpolate background: #09090B (9, 9, 11) -> #F7F6F2 (247, 246, 242)
      const bgR = lerp(9, 247, t);
      const bgG = lerp(9, 246, t);
      const bgB = lerp(11, 242, t);
      stage.style.setProperty('--morph-bg', `rgb(${bgR}, ${bgG}, ${bgB})`);
      stage.style.setProperty('--morph-bg-mid', `rgba(${bgR}, ${bgG}, ${bgB}, 0.52)`);

      // High-contrast ink switch: #F7F6F2 (247,246,242) -> #111111 (17,17,17)
      // Slightly steeper curve around midpoint so text never sits low-contrast against mid-gray
      const inkT = Math.min(1, Math.max(0, (t - 0.32) / 0.36));
      const inkSmooth = inkT * inkT * (3 - 2 * inkT);
      const inkR = lerp(247, 17, inkSmooth);
      const inkG = lerp(246, 17, inkSmooth);
      const inkB = lerp(242, 17, inkSmooth);
      stage.style.setProperty('--morph-ink', `rgb(${inkR}, ${inkG}, ${inkB})`);

      const mutedR = lerp(195, 85, inkSmooth);
      const mutedG = lerp(195, 85, inkSmooth);
      const mutedB = lerp(198, 85, inkSmooth);
      stage.style.setProperty('--morph-ink-muted', `rgb(${mutedR}, ${mutedG}, ${mutedB})`);

      stage.style.setProperty(
        '--morph-border',
        inkSmooth > 0.5 ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.14)'
      );
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateMorph);
    };

    updateMorph();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [currentPath]);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() => {
    const initialCats =
      content.categories && content.categories.length > 0
        ? content.categories
        : ['TVC', 'Social 9:16'];
    const map: Record<string, boolean> = {};
    initialCats.slice(0, 2).forEach((cat, idx) => {
      const key = normalizeCategoryKey(cat) || `cat-${idx + 1}`;
      map[key] = true;
    });
    return map;
  });

  // Ensure the first two categories stay initialized cleanly if D1 loads different category names
  useEffect(() => {
    const cats = content.categories;
    if (!cats || cats.length === 0) return;
    setOpenCategories((prev) => {
      const validKeys = cats.map((cat, idx) => normalizeCategoryKey(cat) || `cat-${idx + 1}`);
      const anyOpen = validKeys.some((k) => prev[k]);
      if (anyOpen) return prev;
      const next = { ...prev };
      validKeys.slice(0, 2).forEach((k) => {
        next[k] = true;
      });
      return next;
    });
  }, [content.categories]);

  // Client-side simple routing for Cloudflare Pages
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo(0, 0);
    }
  }, []);

  const handleToggleCategory = useCallback((categoryId: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  }, []);

  const handleSelectCategoryFromHero = useCallback((categoryId: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [categoryId]: true,
    }));
    window.requestAnimationFrame(() => {
      const targetRow =
        document.getElementById(`category-row-${categoryId}`) ||
        document.getElementById('du-an');
      if (targetRow) {
        targetRow.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }, []);

  const handleNavigateProject = useCallback(
    (direction: 'prev' | 'next') => {
      if (!selectedProject) return;
      const visibleProjects = content.projects.filter((p) => !p.hidden);
      const next = getAdjacentProject(visibleProjects, selectedProject.id, direction);
      if (next) setSelectedProject(next);
    },
    [selectedProject, content.projects]
  );

  // If navigating to /admin, render Admin Dashboard
  if (currentPath.startsWith('/admin')) {
    return (
      <MotionConfig reducedMotion="user">
        <AdminDashboard onNavigateHome={() => navigate('/')} />
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#09090B] text-[#111111] selection:bg-[#2563EB] selection:text-white font-sans">
        <main className="w-full [overflow-x:clip]">
          {/* PHẦN 1: Hero Showreel tinh gọn toàn khung (chứa Logo & Nút Liên hệ cố định tại Hero) */}
          <HeroShowreel
            branding={content.branding}
            onOpenContact={() => setContactOpen(true)}
            onSelectCategory={handleSelectCategoryFromHero}
            categories={content.categories}
            headline={content.profile.fullName}
            roleTitle={content.profile.roleTitle}
            intro={content.profile.heroIntro}
            showreelEnabled={content.profile.showreelEnabled}
            showreelUrl={content.profile.showreelUrl}
            showreelLabel={content.profile.showreelLabel}
            heroBgUrl={content.profile.heroBgUrl}
            heroBgType={content.profile.heroBgType}
            heroPosterUrl={content.profile.heroPosterUrl}
            heroVideoStart={content.profile.heroVideoStart}
            heroVideoEnd={content.profile.heroVideoEnd}
          />

          {/* Mảng nội dung bên dưới (z-10): Scroll-Linked Background Morph từ #09090B -> #F7F6F2 */}
          <div
            ref={morphStageRef}
            style={{ backgroundColor: 'var(--morph-bg, #09090B)' }}
            className="relative z-10"
          >
            {/* PHẦN 2: ArcWave 3D Cylindrical Carousel nền trong suốt ăn theo --morph-bg */}
            <StillsGallerySection stills={content.stills} />

            {/* PHẦN 3: Dự án dạng danh sách bấm mở rộng (ăn trực tiếp theo nền chuyển sắc --morph-bg) */}
            <ViewportFocusSection>
              <ProjectsAccordionSection
                projects={content.projects}
                categories={content.categories}
                categorySubtitles={content.categorySubtitles}
                subtitle={content.profile.projectsSubtitle}
                openCategories={openCategories}
                onToggleCategory={handleToggleCategory}
                onSelectProject={setSelectedProject}
              />
            </ViewportFocusSection>

            {/* Khối dưới ổn định trên nền sáng #F7F6F2 */}
            <div className="bg-[#F7F6F2]">
              {/* Dải băng chữ/logo chạy ngang vô tận: THƯƠNG HIỆU & AGENCY ĐÃ HỢP TÁC */}
              <BrandMarquee
                showBrandMarquee={content.profile.showBrandMarquee}
                collaboratorsText={content.profile.collaboratorsText}
                brandLogos={content.profile.brandLogos}
              />

              {/* PHẦN 4: Giới thiệu năng lực thực chiến, công cụ, Kinh nghiệm & Học vấn */}
              <ViewportFocusSection>
                <OverviewAndSkills
                  onOpenContact={() => setContactOpen(true)}
                  gear={content.gear}
                  agencySubtitle={content.profile.agencySubtitle}
                  tools={content.tools}
                  experience={content.experience}
                  education={content.education}
                />
              </ViewportFocusSection>
            </div>
          </div>
        </main>

        {/* PHẦN 4 (tiếp theo): Khối Liên hệ gửi brief ở cuối trang */}
        <div className="relative z-10">
          <Footer
            profile={content.profile}
            onOpenContact={() => setContactOpen(true)}
            onNavigateAdmin={() => navigate('/admin')}
          />
        </div>

        {/* Project Lightbox & Contact Modal */}
        <ProjectLightbox
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onNavigate={handleNavigateProject}
        />

        <ContactModal
          isOpen={contactOpen}
          onClose={() => setContactOpen(false)}
        />
      </div>
    </MotionConfig>
  );
}

export default function App() {
  return (
    <PortfolioDataProvider>
      <PortfolioApp />
    </PortfolioDataProvider>
  );
}
