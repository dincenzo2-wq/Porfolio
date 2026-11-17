import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Minus, Plus } from 'lucide-react';
import { MaskedRevealTitle } from './MaskedRevealTitle';
import { RevealGroup, RevealItem } from './ScrollReveal';
import { PORTFOLIO_PROJECTS } from '../data/portfolioData';
import type { PortfolioProject, ProjectCategory } from '../types/portfolio';
import { parseVideoUrl } from '../utils/videoEmbed';
import { formatDeliverableRoles } from '../utils/portfolioLogic';

interface ProjectsAccordionSectionProps {
  onSelectProject: (project: PortfolioProject) => void;
  openCategories?: Record<string, boolean>;
  onToggleCategory?: (categoryId: string) => void;
  projects?: PortfolioProject[];
  categories?: string[];
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

const KNOWN_CATEGORY_METADATA: Record<string, { title: string; subtitle: string; isVertical: boolean }> = {
  'TVC': {
    title: 'TVC & Commercial',
    subtitle: 'Phim quảng cáo & Chiến dịch thương hiệu',
    isVertical: false,
  },
  'Social 9:16': {
    title: 'Social 9:16',
    subtitle: 'Reels, TikTok & Short-form dọc',
    isVertical: true,
  },
  'Motion': {
    title: 'Motion Graphics',
    subtitle: 'Kinetic Typography & Visual Effects',
    isVertical: false,
  },
  'Event Recap': {
    title: 'Event Recap',
    subtitle: 'Aftermovie & Sự kiện trực tiếp',
    isVertical: false,
  },
};

/**
 * Chia lưới thông minh theo số lượng dự án:
 * - Dự án dọc (9:16): lưới 4 cột (grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5)
 * - Dự án ngang (16:9): nếu đúng 2 dự án -> lưới 2 cột lớn (grid-cols-1 md:grid-cols-2 gap-8)
 * - Dự án ngang (16:9): từ 3 dự án trở lên -> lưới 3 cột (grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6)
 */
function getDynamicGridClass(isVertical: boolean, count: number): string {
  if (isVertical) {
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5';
  }
  if (count === 2) {
    return 'grid-cols-1 md:grid-cols-2 gap-8';
  }
  return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
}

function slugifyCategory(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

interface ProjectCardProps {
  project: PortfolioProject;
  isVertical: boolean;
  onSelect: () => void;
}

function ProjectCard({ project, isVertical, onSelect }: ProjectCardProps) {
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
      className="group flex flex-col text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-[#111111] focus-visible:outline-offset-2 rounded-xl transition-all"
    >
      {/* 1. Pure Footage Frame: 100% clean, zero gradient, zero text superimposed */}
      <div
        className={`relative w-full ${
          isVertical ? 'aspect-[9/16]' : 'aspect-video'
        } rounded-xl overflow-hidden bg-black/5 border border-black/8 shadow-2xs group-hover:border-black/25 group-hover:shadow-md transition-all duration-300`}
      >
        <img
          src={project.coverImage}
          alt={project.title}
          loading="lazy"
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
      </div>

      {/* 2. Metadata cleanly positioned BELOW the media frame */}
      <div className="mt-3 sm:mt-3.5 space-y-1.5">
        {project.clientOrAgency?.trim() && (
          <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#2563EB] truncate">
            {project.clientOrAgency.trim()}
          </p>
        )}
        <h4 className="font-bold text-base sm:text-lg md:text-xl text-[#111111] group-hover:text-[#2563EB] transition-colors truncate tracking-tight leading-snug">
          {project.title}
        </h4>
        <div className="flex items-center justify-between text-xs sm:text-sm text-[#555555] pt-0.5">
          <span className="truncate font-medium text-[#555555]">
            {formatDeliverableRoles(project.deliverableRole)}
          </span>
          <span className="shrink-0 tabular-nums font-semibold text-[#777777] ml-auto pl-2">
            {project.duration} · {project.year}
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
  subtitle,
}: ProjectsAccordionSectionProps) {
  const activeCategories =
    customCategories && customCategories.length > 0
      ? customCategories
      : ['TVC', 'Social 9:16', 'Motion', 'Event Recap'];

  const categoryGroups: CategoryGroup[] = activeCategories.map((cat, idx) => {
    const meta = KNOWN_CATEGORY_METADATA[cat];
    const isVertical = meta
      ? meta.isVertical
      : (cat.includes('9:16') || cat.toLowerCase().includes('dọc') || cat.toLowerCase().includes('tiktok') || cat.toLowerCase().includes('reel'));
    const defaultSlug =
      cat === 'TVC'
        ? 'tvc-commercial'
        : cat === 'Social 9:16'
        ? 'social-916'
        : cat === 'Motion'
        ? 'motion-graphics'
        : cat === 'Event Recap'
        ? 'event-recap'
        : slugifyCategory(cat);

    return {
      id: defaultSlug,
      index: String(idx + 1).padStart(2, '0'),
      title: meta?.title || cat,
      subtitle: meta?.subtitle || `Sản phẩm thuộc hạng mục ${cat}`,
      categoryFilter: cat,
      isVertical,
    };
  });

  // Default open first two categories ('tvc-commercial' and 'social-916')
  const firstCatId = categoryGroups[0]?.id || 'tvc-commercial';
  const secondCatId = categoryGroups[1]?.id || 'social-916';
  const [internalOpenCategories, setInternalOpenCategories] = useState<Record<string, boolean>>({
    [firstCatId]: true,
    [secondCatId]: true,
  });

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
      className="w-full bg-[#F7F6F2] text-[#111111] py-20 sm:py-24 md:py-28 border-b border-black/8"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 space-y-10 sm:space-y-12">
        {/* Section Header: Minimal Studio Heading */}
        <div className="space-y-2">
          <MaskedRevealTitle
            as="h2"
            className="font-bricolage text-2xl md:text-3xl text-[#111111] font-extrabold tracking-tight uppercase leading-[1.25]"
          >
            Dự án đã thực hiện
          </MaskedRevealTitle>
          <p className="text-sm sm:text-base text-[#555555] font-normal leading-relaxed max-w-2xl">
            {subtitle || 'Chọn từng nhóm hạng mục bên dưới để xem sản phẩm thực tế đã bàn giao.'}
          </p>
        </div>

        {/* Dynamic Category Accordion Rows with Staggered Scroll Reveal (110ms, Bidirectional) */}
        <RevealGroup staggerMs={110} className="divide-y divide-black/12 border-t border-black/12">
          {categoryGroups.map((group, groupIdx) => {
            const projectsInGroup = allProjects.filter(
              (p) => p.category === group.categoryFilter && !p.hidden
            );
            const isOpen = !!openCategories[group.id];
            const dynamicGridClass = getDynamicGridClass(group.isVertical, projectsInGroup.length);

            return (
              <RevealItem key={group.id} index={groupIdx} className="transition-colors">
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
                    <h3 className="font-bricolage text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#111111] group-hover:text-[#2563EB] transition-colors tracking-tight uppercase">
                      {group.title}
                    </h3>

                    {/* Subtitle / Description (Hidden on mobile) */}
                    <span className="hidden lg:inline-block text-sm sm:text-base text-[#555555] font-normal truncate">
                      — {group.subtitle}
                    </span>
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

                {/* Expanded Products Grid */}
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
                      <div className="pt-2 pb-8 sm:pb-10">
                        {/* Staggered Cards Reveal: 110ms stagger, immediate on tab click for closed tabs */}
                        <RevealGroup
                          forceVisible={group.id !== firstCatId}
                          staggerMs={110}
                          className={`grid ${dynamicGridClass}`}
                        >
                          {projectsInGroup.map((project, cardIdx) => (
                            <RevealItem key={project.id} index={cardIdx}>
                              <ProjectCard
                                project={project}
                                isVertical={group.isVertical}
                                onSelect={() => onSelectProject(project)}
                              />
                            </RevealItem>
                          ))}
                        </RevealGroup>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
