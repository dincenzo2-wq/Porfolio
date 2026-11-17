import type {
  AspectRatioType,
  InquiryFormErrors,
  InquiryFormInput,
  PortfolioProject,
  ProjectCategory,
} from '../types/portfolio';

export function filterProjects(
  projects: PortfolioProject[],
  category: ProjectCategory
): PortfolioProject[] {
  if (category === 'Tất cả') {
    return projects;
  }
  return projects.filter((project) => project.category === category);
}

export function getAdjacentProject(
  projects: PortfolioProject[],
  currentId: string,
  direction: 'prev' | 'next'
): PortfolioProject | null {
  if (projects.length === 0) return null;
  const idx = projects.findIndex((p) => p.id === currentId);
  if (idx === -1) return projects[0];
  const offset = direction === 'next' ? 1 : -1;
  const targetIdx = (idx + offset + projects.length) % projects.length;
  return projects[targetIdx];
}

export function validateInquiryForm(input: InquiryFormInput): InquiryFormErrors {
  const errors: InquiryFormErrors = {};
  const trimmedName = input.name.trim();
  const trimmedEmail = input.email.trim();
  const trimmedBrief = input.brief.trim();

  if (trimmedName.length < 2) {
    errors.name = 'Vui lòng nhập tên hoặc tên Agency/Brand của bạn.';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    errors.email = 'Vui lòng nhập địa chỉ email hợp lệ để nhận phản hồi.';
  }

  if (trimmedBrief.length < 10) {
    errors.brief = 'Vui lòng mô tả ngắn gọn yêu cầu dự án (tối thiểu 10 ký tự).';
  }

  return errors;
}

export function shouldShowFloatingNavbar(scrollY: number, threshold = 60): boolean {
  return scrollY > threshold;
}

/**
 * Chuyển đổi an toàn giá trị vai trò đảm nhiệm (string hoặc string[])
 * thành mảng các vai trò để hiển thị dạng thẻ/pills trong admin modal.
 */
export function parseDeliverableRoles(roles: string | string[] | undefined | null): string[] {
  if (!roles) return [];
  if (Array.isArray(roles)) {
    return roles
      .map((r) => (typeof r === 'string' ? r.trim() : ''))
      .filter((r) => r.length > 0);
  }
  if (typeof roles === 'string') {
    const trimmed = roles.trim();
    if (!trimmed) return [];
    if (trimmed.includes(' · ')) {
      return trimmed
        .split(' · ')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [trimmed];
  }
  return [];
}

/**
 * Nối các vai trò thành chuỗi ký tự hiển thị thống nhất với dấu " · "
 * (ví dụ: "Quay phim · Dựng phim · Color Grading")
 */
export function formatDeliverableRoles(roles: string | string[] | undefined | null): string {
  if (!roles) return '';
  if (Array.isArray(roles)) {
    return roles
      .map((r) => (typeof r === 'string' ? r.trim() : ''))
      .filter((r) => r.length > 0)
      .join(' · ');
  }
  return String(roles).trim();
}

const AGENCY_KEYWORDS = [
  'agency',
  'studio',
  'production',
  'redder',
  'ogilvy',
  'havas',
  'dentsu',
  'nation',
  'media',
  'creative',
  'entertainment',
  'film',
];

/**
 * Kiểm tra xem một đối tác có thuộc nhóm Agency / Đơn vị sản xuất hay không
 * dựa trên danh sách từ khóa chuyên ngành.
 */
export function isAgencyOrProduction(name: string): boolean {
  if (!name || !name.trim()) return false;
  const lower = name.toLowerCase();
  return AGENCY_KEYWORDS.some((kw) => lower.includes(kw));
}

const GENERIC_BRAND_BLACKLIST = new Set([
  'thương hiệu thủ công mỹ nghệ',
  'thương hiệu thủ công',
  'thương hiệu thời trang',
  'thương hiệu mỹ phẩm',
  'thương hiệu nội thất',
  'thương hiệu địa phương',
  'tourism campaign',
  'fashion house',
  'brand campaign',
  'commercial campaign',
  'social campaign',
  'marketing campaign',
  'personal project',
  'dự án cá nhân',
]);

/**
 * Kiểm tra xem chuỗi có phải là cụm mô tả chung chung (không phải tên riêng Brand/Agency) hay không
 */
export function isGenericBrandDescription(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (!lower) return true;
  if (GENERIC_BRAND_BLACKLIST.has(lower)) return true;
  if (/^thương hiệu\s+(thủ công|thời trang|mỹ nghệ|truyền thống|nội thất|địa phương|mỹ phẩm)/i.test(lower)) return true;
  if (/\b(tourism campaign|fashion house|brand campaign|commercial campaign)$/i.test(lower)) return true;
  return false;
}

/**
 * Trích xuất danh sách các Thương hiệu & Agency duy nhất (không trùng lặp)
 * từ các dự án đang hiển thị, hoặc từ chuỗi cấu hình tùy chỉnh.
 * Tự động loại bỏ các cụm mô tả chung chung.
 */
export function extractUniqueBrands(
  projects: PortfolioProject[],
  customText?: string
): string[] {
  if (customText && customText.trim()) {
    return customText
      .split(/[·•,\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !isGenericBrandDescription(s));
  }

  const seen = new Set<string>();
  const brands: string[] = [];

  for (const project of projects) {
    if (project.hidden) continue;
    if (!project.clientOrAgency || !project.clientOrAgency.trim()) continue;

    // Phân tách nếu chuỗi chứa dấu phân cách · hoặc • hoặc , hoặc & giữa 2 thương hiệu
    const parts = project.clientOrAgency.split(/\s*·\s*|\s*•\s*|,\s*|\s+&\s+/);

    for (const part of parts) {
      const clean = part.trim();
      const lower = clean.toLowerCase();
      if (clean && !isGenericBrandDescription(clean) && !seen.has(lower)) {
        seen.add(lower);
        brands.push(clean);
      }
    }
  }

  return brands;
}

/**
 * Danh sách các preset mặc định cho nhóm Khách lẻ / Độc lập
 */
export const INDEPENDENT_CLIENT_PRESETS = [
  'Khách lẻ / Cá nhân',
  'Wedding · Cặp đôi',
  'Dự án độc lập',
  'Không hiển thị tên khách',
] as const;

/**
 * Danh sách thương hiệu / agency mẫu phổ biến cho Videographer & Editor
 */
export const DEFAULT_SUGGESTED_BRANDS = [
  'Dentsu Redder',
  'Ogilvy Vietnam',
  'Havas Vietnam',
  'VinFast',
  'PepsiCo',
  'Heineken',
  'Studio 09',
  'VNG Games',
  'Tiger Beer',
] as const;

/**
 * Kiểm tra xem một chuỗi có khớp với preset Khách lẻ / Độc lập hay không
 */
export function isIndependentClientPreset(name: string): boolean {
  if (!name || !name.trim()) return false;
  const lower = name.trim().toLowerCase();
  return INDEPENDENT_CLIENT_PRESETS.some((p) => p.toLowerCase() === lower);
}

/**
 * Kiểm tra xem thẻ pill có đang được chọn trên giá trị chuỗi khách hàng hiện tại hay không
 */
export function isPillActive(currentValue: string | undefined | null, pill: string): boolean {
  const trimmed = (currentValue || '').trim();
  const lowerPill = pill.trim().toLowerCase();

  if (lowerPill === 'không hiển thị tên khách') {
    return !trimmed;
  }

  if (!trimmed) return false;

  if (trimmed.toLowerCase() === lowerPill) return true;

  const escaped = lowerPill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(^|\\s*·\\s*)${escaped}(\\s*·\\s*|$)`, 'i');
  return regex.test(trimmed);
}

/**
 * Cơ chế chọn / bỏ chọn và kết hợp thông minh giữa các thẻ khách hàng:
 * - Bấm "Không hiển thị tên khách" -> xóa rỗng
 * - Bấm thẻ đã có -> bỏ chọn (loại bỏ khỏi chuỗi)
 * - Bấm thẻ Khách lẻ khi đã có thẻ Khách lẻ khác -> đổi thẻ Khách lẻ và giữ nguyên tên riêng phía sau
 * - Bấm thẻ Brand / Agency -> kết hợp nối bằng dấu " · " (ví dụ: Agency + Brand)
 */
export function toggleClientOrAgency(
  currentValue: string | undefined | null,
  pill: string
): string {
  const trimmedPill = pill.trim();
  if (!trimmedPill) return currentValue || '';

  // 1. Nếu bấm "Không hiển thị tên khách" -> xóa trắng
  if (trimmedPill.toLowerCase() === 'không hiển thị tên khách') {
    return '';
  }

  const current = (currentValue || '').trim();
  if (!current) {
    return trimmedPill;
  }

  // 2. Bỏ chọn nếu đã tồn tại
  if (isPillActive(current, trimmedPill)) {
    const escaped = trimmedPill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let next = current.replace(new RegExp(`(^|\\s*·\\s*)${escaped}(\\s*·\\s*|$)`, 'i'), (_match, p1, p2) => {
      if (p1 && p2) return ' · ';
      return '';
    }).trim();

    next = next.replace(/^·\s*|\s*·$/g, '').trim();
    return next;
  }

  // 3. Nếu là thẻ thuộc nhóm Khách lẻ / Độc lập (ví dụ 'Khách lẻ / Cá nhân', 'Wedding · Cặp đôi', 'Dự án độc lập')
  if (isIndependentClientPreset(trimmedPill)) {
    for (const preset of INDEPENDENT_CLIENT_PRESETS) {
      if (preset.toLowerCase() !== 'không hiển thị tên khách' && isPillActive(current, preset)) {
        // Thay thế preset cũ bằng preset mới, giữ nguyên phần còn lại
        const escapedOld = preset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return current.replace(new RegExp(`(^|\\s*·\\s*)${escapedOld}(\\s*·\\s*|$)`, 'i'), (_match, p1, p2) => {
          return `${p1 || ''}${trimmedPill}${p2 || ''}`;
        }).trim();
      }
    }
  }

  // 4. Mặc định kết hợp thêm vào cuối với dấu " · "
  return `${current} · ${trimmedPill}`;
}

/**
 * Tự động gợi ý tỷ lệ khung hình (AspectRatio) dựa trên tên phân loại danh mục
 * - Chứa 9:16, Social, TikTok, Reels, Shorts, Dọc -> '9:16'
 * - Các danh mục khác (TVC, Event Recap, Motion, Wedding, Highlight...) -> '16:9'
 */
export function suggestAspectRatioForCategory(category: string): AspectRatioType {
  if (!category) return '16:9';
  const lower = category.toLowerCase().trim();
  if (
    lower.includes('9:16') ||
    /\b(social|tiktok|reels|shorts|dọc|story|stories)\b/i.test(lower)
  ) {
    return '9:16';
  }
  return '16:9';
}
