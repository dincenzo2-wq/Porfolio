import {
  AGENCY_SERVICES,
  ARTIST_PROFILE,
  EDUCATION_MILESTONES,
  EXPERIENCE_MILESTONES,
  PORTFOLIO_PROJECTS,
} from './portfolioData';

import reelSaigonNeon from '../assets/images/reel_saigon_neon_1794581940924.jpg';
import reelHighlandMist from '../assets/images/reel_highland_mist_1794581940559.jpg';
import reelMonochromeStage from '../assets/images/reel_monochrome_stage_1794581942937.jpg';
import reelDesertSilhouette from '../assets/images/reel_desert_silhouette_1794581941944.jpg';
import projectAtelierGlass from '../assets/images/project_atelier_glass_1794581943445.jpg';
import frameCrimsonStage from '../assets/images/frame_crimson_stage_1794594695664.jpg';
import frameDuskMotion from '../assets/images/frame_dusk_motion_1794594695412.jpg';
import frameTwilightSmile from '../assets/images/frame_twilight_smile_1794594694410.jpg';
import frameAmberProfile from '../assets/images/frame_amber_profile_1794594695410.jpg';
import frameDoorwaySunbeam from '../assets/images/frame_doorway_sunbeam_1794594695283.jpg';

import type {
  PortfolioContentPayload,
  StillsItem,
  GearSpecSheetData,
  SiteProfileData,
  SiteBrandingData,
} from '../types/portfolio';

export const DEFAULT_STILLS: StillsItem[] = [
  { id: 'top-1', title: 'Saigon Neon Commercial', src: reelSaigonNeon, alt: 'Commercial TVC neon setup & reflections', row: 'top', year: '2025' },
  { id: 'top-2', title: 'Highland Brand Cinematography', src: reelHighlandMist, alt: 'Highland brand cinematography & atmospheric mist', row: 'top', year: '2024' },
  { id: 'top-3', title: 'Automotive Sunset Silhouette', src: reelDesertSilhouette, alt: 'Automotive golden hour headlights & landscape', row: 'top', year: '2025' },
  { id: 'top-5', title: 'Atelier Glass Product Lighting', src: projectAtelierGlass, alt: 'Product commercial studio lighting & glass refraction', row: 'top', year: '2025' },
  { id: 'bot-2', title: 'Concert Event Crimson Stage', src: frameCrimsonStage, alt: 'Concert event stage lighting & performance energy', row: 'bottom', year: '2024' },
  { id: 'bot-3', title: 'Fashion Campaign Twilight Smile', src: frameTwilightSmile, alt: 'Fashion campaign portrait & natural twilight mood', row: 'bottom', year: '2024' },
  { id: 'bot-4', title: 'Warm Amber Product Macro', src: frameAmberProfile, alt: 'Warm amber product macro & organic studio grade', row: 'bottom', year: '2025' },
  { id: 'top-4', title: 'Motion Graphic Visual Effects', src: frameDuskMotion, alt: 'Motion graphic visual effects & 3D title design', row: 'top', year: '2024' },
  { id: 'bot-1', title: 'Monochrome High-Contrast Stage', src: reelMonochromeStage, alt: 'High contrast studio performance & key lighting', row: 'bottom', year: '2025' },
  { id: 'bot-5', title: 'Architectural Sunbeam Lighting', src: frameDoorwaySunbeam, alt: 'Architectural studio set lighting & geometric shadow', row: 'bottom', year: '2024' },
];

export const DEFAULT_GEAR: GearSpecSheetData = {
  cameraAndLens: [
    'Sony ZV-E1 (4K 10-bit)',
    'Sony FE 20-70mm F4 G',
    'Lens f/2.8 đa dụng',
  ],
  stabilizer: [
    'Gimbal DJI RS 3',
    'Báng pin mở rộng',
  ],
  audioAndLight: [
    'Micro không dây đôi',
    'Filter VND / CPL',
  ],
};

export const DEFAULT_PROFILE: SiteProfileData = {
  fullName: ARTIST_PROFILE.fullName,
  shortMark: ARTIST_PROFILE.shortMark,
  roleTitle: ARTIST_PROFILE.roleTitle,
  location: ARTIST_PROFILE.location,
  portraitUrl: ARTIST_PROFILE.portraitUrl,
  positioning: ARTIST_PROFILE.positioning,
  bioDetail: ARTIST_PROFILE.bioDetail,
  email: ARTIST_PROFILE.email,
  phone: ARTIST_PROFILE.phone,
  zalo: ARTIST_PROFILE.zalo,
  telegram: ARTIST_PROFILE.telegram,
  heroIntro:
    'Trần Quốc Vinh — Videographer, Film Editor & Motion Designer. Chuyên quay dựng phim quảng cáo, video ngắn 9:16 và Motion Graphics tốc độ cao cho Agency & Thương hiệu.',
  projectsSubtitle: 'Chọn từng nhóm hạng mục bên dưới để xem sản phẩm thực tế đã bàn giao.',
  agencySubtitle: 'Nhận từng hạng mục lẻ hoặc trọn gói từ ghi hình đến dựng hoàn thiện.',
  collaboratorsText: '',
  footerTitle: 'Gửi brief dự án của bạn',
  footerDescription:
    'Báo giá rõ theo từng hạng mục trong 2 giờ. Hỗ trợ nhận file dựng từ xa (Remote) hoặc đi quay trực tiếp tại TP.HCM.',
  showreelEnabled: true,
  showreelUrl: '/videos/dem-khong-ngu.mp4',
  showreelLabel: 'XEM SHOWREEL 2026 · 01:15',
  heroBgUrl: '/videos/dem-khong-ngu.mp4',
  heroBgType: 'video',
  heroPosterUrl: '',
  heroVideoStart: 0,
  heroVideoEnd: 15,
};

export const DEFAULT_CATEGORIES: string[] = ['TVC', 'Social 9:16', 'Motion', 'Event Recap'];

export const DEFAULT_ROLES: string[] = [
  'Quay phim',
  'Dựng phim',
  'Color Grading',
  'Motion / VFX',
  'Âm thanh',
  'Đạo diễn hình ảnh',
];

export const DEFAULT_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="currentColor">
  <path d="M626.488 293.628L777.112 293.346C775.806 296.411 774.197 299.376 772.6 302.297C767.086 312.384 761.889 322.634 756.563 332.822C751.454 342.595 745.984 352.197 741.016 362.041C736.845 370.306 732.345 378.401 728.073 386.615C720.152 401.849 712.188 417.064 704.319 432.324C704.318 432.326 703.763 433.409 703.762 433.41C700.203 440.417 695.655 449.378 691.768 456.437C684.125 470.316 676.508 485.777 669.222 499.546C661.433 514.266 653.387 528.843 645.872 543.71C641.089 553.175 636.135 562.551 631.161 571.917C622.167 588.851 613.577 605.997 604.535 622.906C596.673 637.607 589.156 652.486 581.314 667.196C577.028 675.235 572.895 683.352 568.632 691.401C561.518 704.829 554.226 718.14 547.502 731.772C547.502 730.807 547.516 729.842 547.506 728.877C547.378 716.069 547.44 703.268 547.455 690.46C547.529 626.235 547.219 562.009 547.369 497.784C547.396 486.119 547.348 474.437 547.527 462.773C547.558 460.744 547.862 459.001 548.731 457.156C550.956 452.435 553.418 447.828 555.528 443.049C559.069 435.026 563.117 427.275 566.931 419.387L660.624 419.244L660.626 344.281L602.222 344.21C602.727 342.864 603.298 341.545 603.895 340.237C609.556 327.823 616.696 312.989 622.451 301.232C623.713 298.653 625.061 296.119 626.488 293.628Z"/>
  <path d="M248.657 293.595L398.846 293.533C399.102 294.267 399.359 295.002 399.681 295.71C399.682 295.712 399.996 296.392 399.997 296.394C403.708 304.291 407.364 312.212 411.036 320.128C411.037 320.13 411.655 321.437 411.656 321.439C412.468 323.146 413.287 324.849 414.102 326.555C416.91 332.432 420.064 338.2 422.567 344.214L364.128 344.203L364.182 419.215C374.443 419.389 384.722 419.262 394.985 419.269C415.732 419.283 436.51 419.088 457.253 419.483C457.479 419.488 457.703 419.499 457.928 419.521C458.185 420.334 458.442 421.148 458.794 421.925C461.331 427.513 464.143 432.983 466.734 438.549C469.558 444.618 472.56 450.596 475.408 456.649C476.935 459.895 477.171 461.438 477.173 464.888C477.187 490.694 477.03 516.505 476.953 542.311C476.893 562.48 477.134 582.648 477.1 602.816C477.046 635.086 477.011 667.354 477.17 699.624C477.223 710.261 476.968 720.92 477.182 731.553C475.793 728.859 474.603 726.068 473.27 723.346C473.27 723.344 472.752 722.299 472.751 722.298C469.695 716.189 466.259 710.284 463.145 704.206C458.652 695.436 453.889 686.804 449.41 678.03C442.917 665.313 436.142 652.745 429.647 640.029C423.447 627.89 416.861 615.938 410.777 603.742C407.157 596.486 403.099 589.476 399.388 582.273C396.143 575.975 392.972 569.564 389.803 563.223C389.802 563.222 388.808 561.247 388.807 561.245C382.46 548.848 375.777 536.616 369.27 524.301C365.752 517.641 362.512 510.83 358.926 504.211C355.332 497.579 351.932 490.85 348.357 484.211C338.295 465.522 328.873 446.494 318.933 427.741C314.239 418.886 309.716 409.917 304.86 401.152C300.573 393.413 296.715 385.486 292.722 377.597C292.721 377.595 291.963 376.121 291.962 376.119C290.852 373.975 289.746 371.829 288.587 369.711C283.92 361.187 279.45 352.571 274.855 344.011C270.242 335.417 265.842 326.736 261.389 318.062C261.388 318.06 260.974 317.258 260.973 317.257C260.118 315.615 259.242 313.987 258.37 312.354C255.129 306.289 251.326 299.892 248.657 293.595Z"/>
</svg>`;

export const DEFAULT_BRANDING: SiteBrandingData = {
  logoSvg: DEFAULT_LOGO_SVG,
  brandName: 'VINH TRẦN',
  showBrandName: true,
  logoHeight: 24,
  autoRemoveWhiteBg: true,
  invertNavbarColor: true,
  faviconDarkSquare: true,
  faviconPadding: 12,
  faviconTheme: 'dark',
};

export const DEFAULT_SOFTWARE_TOOLS: string[] = [
  'DaVinci Resolve Studio',
  'Adobe After Effects',
  'Adobe Photoshop',
  'Adobe Illustrator',
  'CapCut Desktop / Pro',
];

export const DEFAULT_CONTENT_PAYLOAD: PortfolioContentPayload = {
  profile: DEFAULT_PROFILE,
  branding: DEFAULT_BRANDING,
  projects: PORTFOLIO_PROJECTS,
  categories: DEFAULT_CATEGORIES,
  roles: DEFAULT_ROLES,
  stills: DEFAULT_STILLS,
  gear: DEFAULT_GEAR,
  services: AGENCY_SERVICES,
  experience: EXPERIENCE_MILESTONES,
  education: EDUCATION_MILESTONES,
  tools: DEFAULT_SOFTWARE_TOOLS,
  updatedAt: new Date().toISOString(),
};
