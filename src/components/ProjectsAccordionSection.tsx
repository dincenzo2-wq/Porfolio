import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LayoutGrid, Minus, Play, Plus, Sparkles } from 'lucide-react';
import { MaskedRevealTitle } from './MaskedRevealTitle';
import { RevealGroup, RevealItem } from './ScrollReveal';
import { Category3DCarousel } from './Category3DCarousel';
import { PORTFOLIO_PROJECTS } from '../data/portfolioData';
import type { PortfolioProject, ProjectCategory } from '../types/portfolio';
import { parseVideoUrl } from '../utils/videoEmbed';
import { formatDeliverableRoles, getCategoryMeta, normalizeCategoryKey } from '../utils/portfolioLogic';

interface ProjectsAccordionSectionProps {
  onSelectProject: (project: PortfolioProject) => void;
  openCategories?: Record<string, boolean>;
  onToggleCategory?: (categoryId: string) => void;
  projects?: PortfolioProject[];
  categories?: string[];
  categorySubtitles?: Record<string, string>;
  subtitle?: string;
}

interface CategoryGroup {
  id: string;
  index: string;
  title: string;
  subtitle: string;
  categoryFilter: string;
  isVertical: boolean;
}

/**
 * Chia lưới thông minh theo số lượng dự án:
 * - Dự án dọc (9:16): lưới 4 cột (grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5)
 * - Dự án ngang (16:9): nếu đúng 2 hoặc 4 dự án -> lưới 2 cột đều (2x1 hoặc 2x2) để không bị lẻ 1 thẻ mồ côi
 * - Dự án ngang (16:9): 3, 5, 6+ dự án -> lưới 3 cột (grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6)
 */
function getDynamicGridClass(isVertical: boolean, count: number): string {
  if (isVertical) {
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5';
  }
  if (count === 2 || count === 4) {
    return 'grid-cols-1 md:grid-cols-2 gap-8';
  }
  return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
}

interface ProjectCardProps {
  project: PortfolioProject;
  isVertical: boolean;
  onSelect: () => void;
}

function ProjectCard({ project, isVertical, onSelect }: ProjectCardProps) {
  const isCardVertical = isVertical || project.aspectRatio === '9:16';
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const parsedVideo = parseVideoUrl(project.videoUrl);
  const directVideoSrc = parsedVideo.type === 'direct' ? (parsedVideo.directUrl || project.videoUrl) : undefined;

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label={`Xem chi tiết dự án ${project.title}`}
      className="group h-full flex flex-col text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-[#111111] focus-visible:outline-offset-2 rounded-xl transition-all"
    >
      {/* 1. Pure Footage Frame: 100% clean at rest, subtle hover play disc only before video plays */}
      <div
        className={`relative w-full ${
          isCardVertical ? 'aspect-[9/16]' : 'aspect-video'
        } rounded-xl overflow-hidden bg-black/5 border border-black/8 shadow-2xs group-hover:border-black/25 group-hover:shadow-md transition-all duration-300`}
      >
        <img
          src={project.coverImage}
          alt={project.title}
          loading="lazy"
          onError={(e) => {
            const target = e.currentTarget;
            if (target.dataset.hasFallenBack !== 'true') {
              target.dataset.hasFallenBack = 'true';
              target.src = '/assets/images/reel_saigon_neon_1794581940924.jpg';
            }
          }}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${
            isPlaying ? 'opacity-0' : 'opacity-100'
          }`}
        />

        {directVideoSrc && (
          <video
            ref={videoRef}
            src={directVideoSrc}
            muted
            loop
            playsInline
            preload="none"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isPlaying ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* Quiet frosted Play indicator on desktop hover only (fades away while hover video is playing) */}
        <div
          aria-hidden="true"
          className={`pointer-events-none hidden md:flex absolute inset-0 items-center justify-center transition-opacity duration-300 ${
            isPlaying ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <span className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-md border border-white/25 text-white flex items-center justify-center shadow-lg">
            <Play className="w-4 h-4 fill-current translate-x-0.5" />
          </span>
        </div>
      </div>

      {/* 2. Metadata cleanly positioned BELOW the media frame (bottom row aligned across neighbors) */}
      <div className="mt-3 sm:mt-3.5 flex-1 flex flex-col gap-1.5">
        {project.clientOrAgency?.trim() && (
          <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#2563EB] truncate">
            {project.clientOrAgency.trim()}
          </p>
        )}
        <h4 className="font-bold text-base sm:text-lg md:text-xl text-[var(--morph-ink,#111111)] group-hover:text-[#2563EB] transition-colors line-clamp-2 tracking-tight leading-snug">
          {project.title}
        </h4>
        <div
          style={{ color: 'var(--morph-ink-muted, #555555)' }}
          className="mt-auto pt-1 flex items-center justify-between gap-2 text-xs sm:text-sm"
        >
          <span className="truncate font-medium">
            {formatDeliverableRoles(project.deliverableRole)}
          </span>
          <span className="inline-flex items-center gap-1 shrink-0 tabular-nums font-semibold ml-auto pl-1">
            <Play className="w-2.5 h-2.5 fill-current text-[#2563EB] shrink-0" aria-hidden="true" />
            <span>
              {project.duration} · {project.year}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function ProjectsAccordionSection({
  onSelectProject,
  openCategories: controlledOpenCategories,
  onToggleCategory: controlledToggleCategory,
  projects: customProjects,
  categories: customCategories,
  categorySubtitles,
  subtitle,
}: ProjectsAccordionSectionProps) {
  const activeCategories =
    customCategories && customCategories.length > 0
      ? customCategories
      : ['TVC', 'Social 9:16', 'Event Recap', 'Wedding', 'Cá Nhân'];

  const categoryGroups: CategoryGroup[] = activeCategories.map((cat, idx) => {
    const meta = getCategoryMeta(cat, categorySubtitles);
    const normalizedId = normalizeCategoryKey(cat) || `cat-${idx + 1}`;

    return {
      id: normalizedId,
      index: String(idx + 1).padStart(2, '0'),
      title: meta.title || cat,
      subtitle: meta.subtitle,
      categoryFilter: cat,
      isVertical: meta.isVertical,
    };
  });

  // Default open first two categories cleanly using unified normalized keys
  const firstCatId = categoryGroups[0]?.id || 'tvc';
  const secondCatId = categoryGroups[1]?.id || 'social916';
  const [internalOpenCategories, setInternalOpenCategories] = useState<Record<string, boolean>>({
    [firstCatId]: true,
    [secondCatId]: true,
  });
  const [viewModes, setViewModes] = useState<Record<string, '3d' | 'grid'>>({});

  const allProjects = customProjects ?? PORTFOLIO_PROJECTS;
  const openCategories = controlledOpenCategories ?? internalOpenCategories;

  const toggleCategory = (categoryId: string) => {
    if (controlledToggleCategory) {
      controlledToggleCategory(categoryId);
    } else {
      setInternalOpenCategories((prev) => ({
        ...prev,
        [categoryId]: !prev[categoryId],
      }));
    }
  };

  return (
    <section
      id="du-an"
      aria-label="Dự án đã thực hiện theo nhóm loại hình"
      style={{
        color: 'var(--morph-ink, #111111)',
        borderColor: 'var(--morph-border, rgba(0,0,0,0.08))',
      }}
      className="w-full bg-transparent pt-16 sm:pt-20 md:pt-24 pb-20 sm:pb-24 md:pb-28 border-b"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 space-y-10 sm:space-y-12">
        {/* Section Header: Minimal Studio Heading (adapts smoothly to Scroll-Linked Background Morph) */}
        <div className="space-y-2">
          <MaskedRevealTitle
            as="h2"
            className="font-bricolage text-2xl md:text-3xl font-extrabold tracking-tight uppercase leading-[1.25] text-[var(--morph-ink,#111111)]"
          >
            Dự án đã thực hiện
          </MaskedRevealTitle>
          <p
            style={{ color: 'var(--morph-ink-muted, #555555)' }}
            className="text-sm sm:text-base font-normal leading-relaxed max-w-2xl"
          >
            {subtitle || 'Chọn từng nhóm hạng mục bên dưới để xem sản phẩm thực tế đã bàn giao.'}
          </p>
        </div>

        {/* Dynamic Category Accordion Rows with Staggered Scroll Reveal (110ms, Bidirectional) */}
        <RevealGroup
          staggerMs={110}
          className="divide-y divide-[var(--morph-border,rgba(0,0,0,0.12))] border-t border-[var(--morph-border,rgba(0,0,0,0.12))]"
        >
          {categoryGroups.map((group, groupIdx) => {
            const projectsInGroup = allProjects.filter(
              (p) => p.category === group.categoryFilter && !p.hidden
            );
            const isOpen = !!openCategories[group.id];
            const isGroupVertical = group.isVertical || projectsInGroup.some((p) => p.aspectRatio === '9:16');
            const dynamicGridClass = getDynamicGridClass(isGroupVertical, projectsInGroup.length);

            return (
              <RevealItem
                key={group.id}
                index={groupIdx}
                className="transition-colors scroll-mt-24"
              >
                <div id={`category-row-${group.id}`} className="scroll-mt-24">
                {/* Accordion Row Header Button */}
                <button
                  type="button"
                  onClick={() => toggleCategory(group.id)}
                  aria-expanded={isOpen}
                  aria-controls={`category-panel-${group.id}`}
                  className="w-full py-6 sm:py-8 flex items-center justify-between gap-4 text-left group cursor-pointer focus-visible:outline-2 focus-visible:outline-[#111111] focus-visible:outline-offset-2"
                >
                  <div className="flex items-center gap-3 sm:gap-6 min-w-0 flex-1">
                    {/* Index Number */}
                    <span className="text-sm sm:text-base font-bold text-[#2563EB] shrink-0 w-7 tabular-nums">
                      {group.index}
                    </span>

                    {/* Category Title in Bricolage Grotesque */}
                    <h3 className="font-bricolage text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--morph-ink,#111111)] group-hover:text-[#2563EB] transition-colors tracking-tight uppercase">
                      {group.title}
                    </h3>

                    {/* Subtitle / Description (Hidden on mobile; only show when subtitle is not empty) */}
                    {group.subtitle?.trim() && (
                      <span
                        style={{ color: 'var(--morph-ink-muted, #555555)' }}
                        className="hidden lg:inline-block text-sm sm:text-base font-normal truncate"
                      >
                        — {group.subtitle.trim()}
                      </span>
                    )}
                  </div>

                  {/* Right: Count Badge & +/- Round Button */}
                  <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                    <span className="px-3 py-1.5 rounded-full border border-black/15 bg-white text-xs font-bold text-[#111111] tabular-nums shadow-2xs">
                      {String(projectsInGroup.length).padStart(2, '0')} DỰ ÁN
                    </span>

                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center transition-all ${
                        isOpen
                          ? 'bg-[#111111] border-[#111111] text-white shadow-xs'
                          : 'bg-white border-black/15 text-[#111111] group-hover:border-[#111111] group-hover:bg-[#111111] group-hover:text-white'
                      }`}
                    >
                      {isOpen ? (
                        <Minus className="w-4 h-4 stroke-[2.5]" />
                      ) : (
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded Products: 3D Slide Carousel (Default) or Grid */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`category-panel-${group.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 pb-6 sm:pb-8">
                        {/* Mode Switcher Pill */}
                        <div className="flex items-center justify-between pb-3 px-1 border-b border-[var(--morph-border,rgba(0,0,0,0.06))] mb-2 text-xs">
                          <span className="font-semibold text-[var(--morph-ink-muted,#555555)] uppercase tracking-wider text-[11px]">
                            {viewModes[group.id] === 'grid' ? 'Chế độ xem lưới' : 'Slide 3D vòng cung điện ảnh'}
                          </span>
                          <div className="flex items-center gap-1 p-0.5 rounded-full bg-black/5 border border-black/8">
                            <button
                              type="button"
                              onClick={() => setViewModes((prev) => ({ ...prev, [group.id]: '3d' }))}
                              aria-label="Xem dạng slide 3D"
                              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                (viewModes[group.id] || '3d') === '3d'
                                  ? 'bg-white text-black shadow-xs font-bold'
                                  : 'text-[var(--morph-ink-muted,#555555)] hover:text-black'
                              }`}
                            >
                              <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                              <span>Slide 3D</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setViewModes((prev) => ({ ...prev, [group.id]: 'grid' }))}
                              aria-label="Xem dạng lưới phẳng"
                              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                viewModes[group.id] === 'grid'
                                  ? 'bg-white text-black shadow-xs font-bold'
                                  : 'text-[var(--morph-ink-muted,#555555)] hover:text-black'
                              }`}
                            >
                              <LayoutGrid className="w-3.5 h-3.5" />
                              <span>Lưới</span>
                            </button>
                          </div>
                        </div>

                        {/* Render 3D Cylindrical Carousel by Default, or Grid if selected */}
                        {(viewModes[group.id] || '3d') === '3d' ? (
                          <Category3DCarousel
                            projects={projectsInGroup}
                            isVertical={isGroupVertical}
                            onSelectProject={onSelectProject}
                            categoryTitle={group.title}
                          />
                        ) : (
                          <RevealGroup
                            forceVisible={true}
                            staggerMs={100}
                            className={`grid ${dynamicGridClass}`}
                          >
                            {projectsInGroup.map((project, cardIdx) => (
                              <RevealItem key={project.id} index={cardIdx} className="h-full">
                                <ProjectCard
                                  project={project}
                                  isVertical={group.isVertical}
                                  onSelect={() => onSelectProject(project)}
                                />
                              </RevealItem>
                            ))}
                          </RevealGroup>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                </div>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
