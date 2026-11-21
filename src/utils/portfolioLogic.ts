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
  'dự án độc lập',
  'khách lẻ / cá nhân',
  'khách lẻ',
  'cá nhân',
  'wedding · cặp đôi',
  'wedding',
  'cặp đôi',
  'đám cưới',
  'cô dâu & chú rể',
  'cô dâu',
  'chú rể',
  'không hiển thị brand',
  'không hiển thị tên khách',
]);

/**
 * Kiểm tra xem chuỗi có phải là cụm mô tả chung chung (không phải tên riêng Brand/Agency) hay không
 */
export function isGenericBrandDescription(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (!lower) return true;
  if (lower.startsWith('không hiển thị')) return true;
  if (GENERIC_BRAND_BLACKLIST.has(lower)) return true;
  if (isIndependentClientPreset(text)) return true;
  if (/^(wedding|đám cưới|cặp đôi|khách lẻ|cá nhân|dự án cá nhân|dự án độc lập|personal|independent)/i.test(lower)) return true;
  if (/^thương hiệu\s+(thủ công|thời trang|mỹ nghệ|truyền thống|nội thất|địa phương|mỹ phẩm)/i.test(lower)) return true;
  if (/\b(tourism campaign|fashion house|brand campaign|commercial campaign)$/i.test(lower)) return true;
  return false;
}

/**
 * Trích xuất danh sách các Thương hiệu & Agency duy nhất (không trùng lặp)
 * từ các dự án đang hiển thị, hoặc từ chuỗi cấu hình tùy chỉnh.
 * Tự động loại bỏ các cụm mô tả chung chung và các dự án đám cưới / khách lẻ.
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

    const categoryLower = (project.category || '').toLowerCase();
    const clientLower = project.clientOrAgency.toLowerCase().trim();

    // Dự án Đám cưới hoặc Khách lẻ / Độc lập không đưa vào thanh Brand Marquee thương mại
    if (
      categoryLower.includes('wedding') ||
      categoryLower.includes('đám cưới') ||
      isIndependentClientPreset(project.clientOrAgency) ||
      clientLower.startsWith('không hiển thị') ||
      /^(wedding|đám cưới|khách lẻ|cá nhân|dự án độc lập)/i.test(clientLower)
    ) {
      continue;
    }

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
  'Không hiển thị Brand (Khách lẻ / Đám cưới)',
  'Wedding · Cặp đôi',
  'Khách lẻ / Cá nhân',
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

  if (lowerPill === 'không hiển thị tên khách' || lowerPill.startsWith('không hiển thị brand')) {
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

  // 1. Nếu bấm "Không hiển thị tên khách" hoặc "Không hiển thị Brand..." -> xóa trắng
  if (trimmedPill.toLowerCase() === 'không hiển thị tên khách' || trimmedPill.toLowerCase().startsWith('không hiển thị brand')) {
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

export interface CategoryMeta {
  title: string;
  subtitle: string;
  isVertical: boolean;
}

/**
 * Chuẩn hóa tên danh mục để so khớp không phân biệt chữ hoa/thường, dấu cách và dấu tiếng Việt:
 * Ví dụ: 'TVC & Commercial' -> 'tvccommercial', 'Social 9:16' -> 'social916', 'Cá Nhân' -> 'canhan'
 */
export function normalizeCategoryKey(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Bản đồ thuật ngữ chuyên ngành chuẩn hóa cho các danh mục sản xuất video:
 * 01. TVC & Commercial: Phim quảng cáo, Digital Commercial & Video thương hiệu
 * 02. Social 9:16: Short-form 9:16, TikTok, Reels & Performance Ads
 * 03. Event Recap: Corporate Highlight, Aftermovie & Sự kiện doanh nghiệp
 * 04. Wedding: Wedding Highlight, Pre-wedding & Phóng sự cưới điện ảnh
 * 05. Cá Nhân / Personal Works: Cinematography, Spec Ads & Dự án sáng tạo độc lập
 */
export const KNOWN_CATEGORY_METADATA_MAP: Record<string, CategoryMeta> = {
  tvc: {
    title: 'TVC & Commercial',
    subtitle: 'Phim quảng cáo, Digital Commercial & Video thương hiệu',
    isVertical: false,
  },
  tvccommercial: {
    title: 'TVC & Commercial',
    subtitle: 'Phim quảng cáo, Digital Commercial & Video thương hiệu',
    isVertical: false,
  },
  social: {
    title: 'Social 9:16',
    subtitle: 'Short-form 9:16, TikTok, Reels & Performance Ads',
    isVertical: true,
  },
  social916: {
    title: 'Social 9:16',
    subtitle: 'Short-form 9:16, TikTok, Reels & Performance Ads',
    isVertical: true,
  },
  eventrecap: {
    title: 'Event Recap',
    subtitle: 'Corporate Highlight, Aftermovie & Sự kiện doanh nghiệp',
    isVertical: false,
  },
  wedding: {
    title: 'Wedding',
    subtitle: 'Wedding Highlight, Pre-wedding & Phóng sự cưới điện ảnh',
    isVertical: false,
  },
  canhan: {
    title: 'Cá Nhân',
    subtitle: 'Cinematography, Spec Ads & Dự án sáng tạo độc lập',
    isVertical: false,
  },
  personal: {
    title: 'Personal Works',
    subtitle: 'Cinematography, Spec Ads & Dự án sáng tạo độc lập',
    isVertical: false,
  },
  personalworks: {
    title: 'Personal Works',
    subtitle: 'Cinematography, Spec Ads & Dự án sáng tạo độc lập',
    isVertical: false,
  },
  motion: {
    title: 'Motion Graphics',
    subtitle: 'Kinetic Typography & Visual Effects',
    isVertical: false,
  },
};

/**
 * Lấy thông tin hiển thị (title, subtitle, isVertical) cho từng hạng mục:
 * - So khớp không phân biệt hoa/thường và dấu cách.
 * - Ưu tiên mô tả phụ tùy chỉnh từ admin (customSubtitles).
 * - Nếu không có customSubtitles, lấy phụ đề chuẩn hóa chuyên ngành tương ứng.
 * - KHÔNG BAO GIỜ sinh chuỗi rập khuôn "— Sản phẩm thuộc hạng mục...".
 * - Nếu không có mô tả (hoặc cố tình để trống), trả về subtitle rỗng "" để ẩn dấu '—'.
 */
export function getCategoryMeta(
  catName: string,
  customSubtitles?: Record<string, string>
): CategoryMeta {
  const normKey = normalizeCategoryKey(catName);

  // 1. Kiểm tra customSubtitles: tìm theo exact key hoặc normalized key
  let userSubtitle: string | undefined = undefined;
  if (customSubtitles && typeof customSubtitles === 'object') {
    if (customSubtitles[catName] !== undefined) {
      userSubtitle = customSubtitles[catName];
    } else {
      for (const [k, v] of Object.entries(customSubtitles)) {
        if (normalizeCategoryKey(k) === normKey) {
          userSubtitle = v;
          break;
        }
      }
    }
  }

  const defaultMeta = KNOWN_CATEGORY_METADATA_MAP[normKey];

  const isVertical = defaultMeta
    ? defaultMeta.isVertical
    : (catName.includes('9:16') ||
       catName.toLowerCase().includes('dọc') ||
       catName.toLowerCase().includes('tiktok') ||
       catName.toLowerCase().includes('reel'));

  const title = defaultMeta?.title || catName;

  // Subtitle:
  // - Nếu userSubtitle được cung cấp (kể cả rỗng ""), ưu tiên dùng userSubtitle
  // - Nếu không có userSubtitle, dùng defaultMeta?.subtitle (nếu có)
  // - Nếu không có cả hai, trả về rỗng "" (tuyệt đối không sinh câu mẫu)
  let subtitle = '';
  if (userSubtitle !== undefined) {
    subtitle = userSubtitle.trim();
  } else if (defaultMeta?.subtitle) {
    subtitle = defaultMeta.subtitle.trim();
  }

  return {
    title,
    subtitle,
    isVertical,
  };
}

/**
 * So khớp hạng mục linh hoạt giữa danh mục hiển thị (vd: 'TVC & Commercial')
 * và danh mục gán trên dự án (vd: 'TVC'), không phân biệt hoa thường và ký tự đặc biệt.
 */
export function isCategoryMatch(projCategory: string, groupCategory: string): boolean {
  if (!projCategory || !groupCategory) return false;
  if (projCategory === groupCategory) return true;
  const k1 = normalizeCategoryKey(projCategory);
  const k2 = normalizeCategoryKey(groupCategory);
  if (k1 === k2) return true;

  // TVC / Commercial aliases
  const isTvc1 = k1 === 'tvc' || k1 === 'tvccommercial';
  const isTvc2 = k2 === 'tvc' || k2 === 'tvccommercial';
  if (isTvc1 && isTvc2) return true;

  // Social aliases
  const isSocial1 = k1 === 'social' || k1 === 'social916';
  const isSocial2 = k2 === 'social' || k2 === 'social916';
  if (isSocial1 && isSocial2) return true;

  // Personal aliases
  const isPersonal1 = k1 === 'canhan' || k1 === 'personal' || k1 === 'personalworks';
  const isPersonal2 = k2 === 'canhan' || k2 === 'personal' || k2 === 'personalworks';
  if (isPersonal1 && isPersonal2) return true;

  // Event recap aliases
  const isEvent1 = k1 === 'eventrecap' || k1 === 'event';
  const isEvent2 = k2 === 'eventrecap' || k2 === 'event';
  if (isEvent1 && isEvent2) return true;

  // Wedding aliases
  const isWedding1 = k1 === 'wedding';
  const isWedding2 = k2 === 'wedding';
  if (isWedding1 && isWedding2) return true;

  // Compare canonical titles
  const m1 = KNOWN_CATEGORY_METADATA_MAP[k1];
  const m2 = KNOWN_CATEGORY_METADATA_MAP[k2];
  if (m1 && m2 && m1.title.toLowerCase() === m2.title.toLowerCase()) {
    return true;
  }

  return false;
}

/**
 * Tự động viết hoa chữ cái đầu của từng từ (Title Case / Capitalize Each Word),
 * hỗ trợ toàn diện tiếng Việt có dấu và giữ nguyên các từ viết tắt chuyên ngành (TVC, MV, 4K, VFX, DOP...).
 *
 * Ví dụ:
 * "việt kiều về nước làm răng có lợi ích gì" -> "Việt Kiều Về Nước Làm Răng Có Lợi Ích Gì"
 * "pepsi electric blue — summer launch" -> "Pepsi Electric Blue — Summer Launch"
 * "TVC 30s - nụ cười việt" -> "TVC 30s - Nụ Cười Việt"
 */
export function capitalizeWords(str: string): string {
  if (!str || typeof str !== 'string') return '';

  // Danh sách các từ viết tắt chuyên ngành sản xuất video luôn giữ nguyên viết hoa
  const PRESERVED_ACRONYMS = new Set([
    'TVC', 'MV', 'VFX', 'DOP', 'CGI', '4K', '8K', 'HD', 'FHD', 'KOL', 'KOC', 'AI',
    'DJI', 'SONY', 'RED', 'ARRI', 'BMPCC', 'BMD', 'LED', 'RGB', 'B-ROLL', 'A-ROLL',
    'PR', 'CEO', 'CTO', 'ADS', 'BTS'
  ]);

  return str.replace(/[\p{L}\p{N}]+/gu, (word) => {
    const upperWord = word.toUpperCase();
    if (PRESERVED_ACRONYMS.has(upperWord)) {
      return upperWord;
    }
    // Nếu từ ban đầu viết hoa toàn bộ và có độ dài từ 2-4 ký tự (dạng viết tắt), giữ nguyên
    if (word.length >= 2 && word.length <= 4 && word === word.toUpperCase() && !/[0-9]/.test(word)) {
      return word;
    }
    // Viết hoa chữ cái đầu, giữ nguyên phần còn lại của từ
    const firstChar = word.charAt(0).toUpperCase();
    const rest = word.slice(1);
    return firstChar + rest;
  });
}
