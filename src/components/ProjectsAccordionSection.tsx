import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Film, Minus, Plus } from 'lucide-react';
import { MaskedRevealTitle } from './MaskedRevealTitle';
import { RevealGroup, RevealItem } from './ScrollReveal';
import { CategoryFanCarousel } from './CategoryFanCarousel';
import { PORTFOLIO_PROJECTS } from '../data/portfolioData';
import type { PortfolioProject } from '../types/portfolio';
import { getCategoryMeta, normalizeCategoryKey, isCategoryMatch } from '../utils/portfolioLogic';

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

  const allProjects = customProjects ?? PORTFOLIO_PROJECTS;

  // Default open categories that actually have active projects to showcase live work immediately
  const [internalOpenCategories, setInternalOpenCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    const withProjects = categoryGroups.filter((g) => {
      return allProjects.some((p) => isCategoryMatch(p.category, g.categoryFilter) && !p.hidden);
    });
    if (withProjects.length > 0) {
      initial[withProjects[0].id] = true;
      if (withProjects[1]) initial[withProjects[1].id] = true;
    } else {
      if (categoryGroups[0]) initial[categoryGroups[0].id] = true;
    }
    return initial;
  });

  const openCategories = controlledOpenCategories ?? internalOpenCategories;

  const displaySubtitle =
    subtitle &&
    subtitle.trim() !== 'Chọn từng nhóm hạng mục bên dưới để xem sản phẩm thực tế đã bàn giao.'
      ? subtitle.trim()
      : 'Tuyển tập tác phẩm thương mại, mạng xã hội và phim độc lập — phân loại theo định dạng sản xuất.';

  const isFirstRenderRef = useRef(true);
  useEffect(() => {
    isFirstRenderRef.current = false;
  }, []);

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
      className="w-full bg-transparent pt-20 sm:pt-24 md:pt-28 pb-20 sm:pb-24 md:pb-28 border-b"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 space-y-12 sm:space-y-14">
        {/* Section Header: Minimal Studio Heading (adapts smoothly to Scroll-Linked Background Morph) */}
        <div className="space-y-2.5">
          <MaskedRevealTitle
            as="h2"
            className="font-bricolage text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-[-0.03em] uppercase leading-[1.15] text-[var(--morph-ink,#111111)]"
          >
            Dự án đã thực hiện
          </MaskedRevealTitle>
          <p
            style={{ color: 'var(--morph-ink-muted, #555555)' }}
            className="text-sm sm:text-base font-normal leading-relaxed max-w-2xl"
          >
            {displaySubtitle}
          </p>
        </div>

        {/* Dynamic Category Accordion Rows with Staggered Scroll Reveal (110ms, Bidirectional) */}
        <RevealGroup
          staggerMs={110}
          className="divide-y divide-[var(--morph-border,rgba(0,0,0,0.12))] border-t border-[var(--morph-border,rgba(0,0,0,0.12))]"
        >
          {categoryGroups.map((group, groupIdx) => {
            const projectsInGroup = allProjects.filter(
              (p) => isCategoryMatch(p.category, group.categoryFilter) && !p.hidden
            );
            const isOpen = !!openCategories[group.id];
            const isGroupVertical = group.isVertical || projectsInGroup.some((p) => p.aspectRatio === '9:16');

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
                    <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
                      <span
                        style={{
                          backgroundColor: 'var(--morph-badge-bg, rgba(255, 255, 255, 0.08))',
                          borderColor: 'var(--morph-border, rgba(0, 0, 0, 0.12))',
                          color: 'var(--morph-ink, #111111)',
                        }}
                        className="px-3 py-1.5 rounded-full border text-xs font-bold tabular-nums shadow-2xs backdrop-blur-xs transition-colors"
                      >
                        {String(projectsInGroup.length).padStart(2, '0')} DỰ ÁN
                      </span>

                      <div
                        style={{
                          backgroundColor: isOpen
                            ? 'var(--morph-ink, #111111)'
                            : 'var(--morph-badge-bg, rgba(255, 255, 255, 0.08))',
                          borderColor: isOpen
                            ? 'var(--morph-ink, #111111)'
                            : 'var(--morph-border, rgba(0, 0, 0, 0.15))',
                          color: isOpen
                            ? 'var(--morph-bg, #FFFFFF)'
                            : 'var(--morph-ink, #111111)',
                        }}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center transition-all shadow-2xs backdrop-blur-xs group-hover:scale-105"
                      >
                        {isOpen ? (
                          <Minus className="w-4 h-4 stroke-[2.5]" />
                        ) : (
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Products: 3D Fan Carousel */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`category-panel-${group.id}`}
                        initial={isFirstRenderRef.current ? false : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="pt-2 pb-6 sm:pb-8">
                          {projectsInGroup.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 opacity-65">
                              <Film className="w-8 h-8 text-[var(--morph-ink-muted,#777777)]" />
                              <p className="text-xs font-bold uppercase tracking-wider text-[var(--morph-ink,#111111)]">
                                Đang cập nhật tác phẩm
                              </p>
                              <p className="text-xs text-[var(--morph-ink-muted,#777777)] max-w-xs">
                                Các dự án thuộc hạng mục {group.title} sẽ sớm được cập nhật vào portfolio.
                              </p>
                            </div>
                          ) : (
                            <CategoryFanCarousel
                              projects={projectsInGroup}
                              isVertical={isGroupVertical}
                              onSelectProject={onSelectProject}
                              categoryTitle={group.title}
                            />
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
