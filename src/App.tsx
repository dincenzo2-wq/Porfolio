import { useCallback, useEffect, useState } from 'react';
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
import { getAdjacentProject } from './utils/portfolioLogic';

function PortfolioApp() {
  const { content } = usePortfolioData();
  const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'tvc-commercial': true,
    'social-916': true,
  });

  // Client-side simple routing for Cloudflare Pages
  const [currentPath, setCurrentPath] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

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
    const el = document.getElementById('du-an');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleNavigateProject = useCallback(
    (direction: 'prev' | 'next') => {
      if (!selectedProject) return;
      const next = getAdjacentProject(content.projects, selectedProject.id, direction);
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
      <div className="min-h-screen bg-[#0A0A0A] text-[#111111] selection:bg-[#2563EB] selection:text-white font-sans">
        {/* Adaptive Navbar */}
        <Navbar
          onOpenContact={() => setContactOpen(true)}
          branding={content.branding}
        />

        <main className="w-full [overflow-x:clip]">
          {/* PHẦN 1: Hero Showreel tinh gọn toàn khung (sticky top-0 z-0, scale 1 -> 0.96 & opacity 1 -> 0.4) */}
          <HeroShowreel
            onSelectCategory={handleSelectCategoryFromHero}
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

          {/* Mảng nội dung bên dưới (z-10) trượt lên phủ qua Hero như một tấm màn (Hero Curtain Cover) */}
          <div className="relative z-10 shadow-[0_-24px_48px_rgba(0,0,0,0.85)] bg-[#F7F6F2]">
            {/* PHẦN 2: Khu vực Stills & Color Frames (1 hàng chạy ngang vô tận 55s ngay dưới phần Hero) */}
            <StillsGallerySection stills={content.stills} />

            {/* PHẦN 3: Dự án dạng danh sách bấm mở rộng (Expandable Accordion List trên nền sáng #F7F6F2) */}
            <ViewportFocusSection>
              <ProjectsAccordionSection
                projects={content.projects}
                categories={content.categories}
                subtitle={content.profile.projectsSubtitle}
                openCategories={openCategories}
                onToggleCategory={handleToggleCategory}
                onSelectProject={setSelectedProject}
              />
            </ViewportFocusSection>

            {/* Dải băng chữ chạy ngang vô tận: THƯƠNG HIỆU & AGENCY ĐÃ HỢP TÁC (Độc lập, ngăn cách Dự án và Năng lực Agency) */}
            <BrandMarquee
              showBrandMarquee={content.profile.showBrandMarquee}
              collaboratorsText={content.profile.collaboratorsText}
            />

            {/* PHẦN 4: Giới thiệu năng lực thực chiến, 5 icon công cụ, Kinh nghiệm & Học vấn */}
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
