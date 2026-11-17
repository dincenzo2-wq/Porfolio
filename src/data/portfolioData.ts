import reelSaigonNeon from '../assets/images/reel_saigon_neon_1794581940924.jpg';
import reelHighlandMist from '../assets/images/reel_highland_mist_1794581940559.jpg';
import reelMonochromeStage from '../assets/images/reel_monochrome_stage_1794581942937.jpg';
import reelDesertSilhouette from '../assets/images/reel_desert_silhouette_1794581941944.jpg';
import projectAtelierGlass from '../assets/images/project_atelier_glass_1794581943445.jpg';
import directorPortrait from '../assets/images/director_portrait_1794581943181.jpg';
import frameCrimsonStage from '../assets/images/frame_crimson_stage_1794594695664.jpg';
import frameDuskMotion from '../assets/images/frame_dusk_motion_1794594695412.jpg';
import frameTwilightSmile from '../assets/images/frame_twilight_smile_1794594694410.jpg';
import frameAmberProfile from '../assets/images/frame_amber_profile_1794594695410.jpg';
import frameDoorwaySunbeam from '../assets/images/frame_doorway_sunbeam_1794594695283.jpg';

import type {
  AgencyServiceItem,
  EducationItem,
  ExperienceItem,
  PortfolioProject,
  ProjectCategory,
  SoftwareToolItem,
} from '../types/portfolio';

export const ARTIST_PROFILE = {
  fullName: 'TRẦN QUỐC VINH',
  shortMark: 'Quốc Vinh',
  roleTitle: 'VIDEOGRAPHER · FILM EDITOR · MOTION DESIGNER',
  location: 'TP. Hồ Chí Minh',
  portraitUrl: directorPortrait,
  positioning:
    'Chuyên quay phim thương mại, dựng hậu kỳ tốc độ cao và motion graphics cho Agency, Brand & Production House.',
  bioDetail:
    'Quy trình làm việc thực chiến, đáp ứng brief chuẩn xác. Nhận brief và xuất bản nháp nhanh trong 24–48h. Tối ưu hoàn hảo cả hai định dạng TVC ngang 16:9 và Social dọc 9:16.',
  email: 'vinh.film@gmail.com',
  phone: '[Số Zalo thực tế]',
  zalo: '[Số Zalo thực tế]',
  telegram: '@quocvinhfilm',
  behance: 'behance.net/quocvinhfilm',
  vimeo: 'vimeo.com/quocvinhfilm',
};

export const PROJECT_CATEGORIES: ProjectCategory[] = [
  'Tất cả',
  'TVC',
  'Social 9:16',
  'Motion',
  'Event Recap',
];

export const PORTFOLIO_PROJECTS: PortfolioProject[] = [
  {
    id: 'pepsi-summer',
    title: 'Pepsi Electric Blue — Summer Launch',
    clientOrAgency: 'Dentsu Redder · PepsiCo Vietnam',
    category: 'TVC',
    aspectRatio: '16:9',
    gridSpan: 'col-span-12 md:col-span-8',
    year: '2025',
    duration: '00:45',
    deliverableRole: 'Đạo diễn hình ảnh & Dựng Color Grading',
    coverImage: reelSaigonNeon,
    videoUrl: '/videos/dem-khong-ngu.mp4',
    agencyBrief:
      'Quay TVC ra mắt dòng lon phiên bản giới hạn với nhịp dựng nhanh, ánh sáng neon hiện đại và hiệu ứng visual bắt mắt.',
  },
  {
    id: 'vinfast-vf7',
    title: 'VinFast VF7 — Sắc Màu Đô Thị',
    clientOrAgency: 'Havas Vietnam · VinFast',
    category: 'Social 9:16',
    aspectRatio: '9:16',
    gridSpan: 'col-span-12 sm:col-span-6 md:col-span-4',
    year: '2025',
    duration: '00:30',
    deliverableRole: 'Dựng hậu kỳ 9:16 & Kinetic Typography',
    coverImage: reelDesertSilhouette,
    videoUrl: '/videos/chuyen-xe-cuoi-ngay.mp4',
    agencyBrief:
      'Video ngắn chuẩn tỷ lệ 9:16 tối ưu cho TikTok Ads và Instagram Reels, nhấn mạnh thiết kế thời thượng và hiệu suất xe.',
  },
  {
    id: 'genz-street-energy',
    title: 'Gen Z Energy — Sound of Street',
    clientOrAgency: 'Ogilvy Vietnam · Heineken Silver',
    category: 'Social 9:16',
    aspectRatio: '9:16',
    gridSpan: 'col-span-12 sm:col-span-6 md:col-span-4',
    year: '2025',
    duration: '00:25',
    deliverableRole: 'Dựng Viral Reel 9:16 · Sound Design',
    coverImage: reelMonochromeStage,
    videoUrl: '/videos/nhip-be-tong.mp4',
    agencyBrief:
      'Dựng theo nhịp beat âm nhạc sôi động, chuyển cảnh match-cut chuẩn xác tạo viral organic reach trên đa nền tảng.',
  },
  {
    id: 'atelier-lang',
    title: 'Atelier Lặng — Nghệ Thuật Thủy Tinh',
    clientOrAgency: 'Studio 09 · Thương hiệu Thủ công Mỹ nghệ',
    category: 'TVC',
    aspectRatio: '16:9',
    gridSpan: 'col-span-12 md:col-span-8',
    year: '2025',
    duration: '01:15',
    deliverableRole: 'Quay phim & Dựng TVC Sản phẩm',
    coverImage: projectAtelierGlass,
    videoUrl: '/videos/thuy-tinh-nang-chieu.mp4',
    agencyBrief:
      'Quay cận cảnh sản phẩm với ánh sáng tự nhiên và chuyển động máy mượt mà, tôn vinh chất lượng thủ công tinh tế.',
  },
  {
    id: 'techfest-kinetic',
    title: 'Techfest Vietnam — Kinetic Identity',
    clientOrAgency: 'VNG Games & Tech In Asia',
    category: 'Motion',
    aspectRatio: '16:9',
    gridSpan: 'col-span-12 md:col-span-6',
    year: '2024',
    duration: '00:40',
    deliverableRole: 'Motion Graphics 2D · Typography động',
    coverImage: frameDuskMotion,
    videoUrl: '/videos/dusk-motion.mp4',
    agencyBrief:
      'Thiết kế gói intro/outro, lower-thirds và chữ động phục vụ chuỗi livestream và sự kiện công nghệ trực tuyến.',
  },
  {
    id: 'highland-brand',
    title: 'Highland Mist — Triền Núi Cao Nguyên',
    clientOrAgency: 'T&A Ogilvy · Tourism Campaign',
    category: 'TVC',
    aspectRatio: '16:9',
    gridSpan: 'col-span-12 md:col-span-6',
    year: '2024',
    duration: '01:30',
    deliverableRole: 'Quay phim chính & Colorist',
    coverImage: reelHighlandMist,
    videoUrl: '/videos/mua-gio-nguoc.mp4',
    agencyBrief:
      'Ghi hình đại cảnh phong cảnh kết hợp chân dung nghệ nhân bản địa, chỉnh màu chuẩn cinematic tôn trọng thiên nhiên.',
  },
  {
    id: 'lofficiel-autumn',
    title: "L'OFFICIEL Autumn Glow — Fashion Reel",
    clientOrAgency: "L'OFFICIEL Vietnam · Fashion House",
    category: 'Social 9:16',
    aspectRatio: '9:16',
    gridSpan: 'col-span-12 sm:col-span-6 md:col-span-4',
    year: '2024',
    duration: '00:30',
    deliverableRole: 'Dựng Fashion Reel 9:16 & Color Grading',
    coverImage: frameTwilightSmile,
    videoUrl: '/videos/twilight-smile.mp4',
    agencyBrief:
      'Video ngắn thời trang cao cấp với tông màu ấm, dựng nhịp nhàng tôn vinh chất liệu trang phục cho chiến dịch Thu-Đông.',
  },
  {
    id: 'tiger-remix-recap',
    title: 'Tiger Remix Live — Aftermovie Recap',
    clientOrAgency: 'Vibe Nation · Tiger Beer Vietnam',
    category: 'Event Recap',
    aspectRatio: '16:9',
    gridSpan: 'col-span-12 md:col-span-8',
    year: '2024',
    duration: '01:45',
    deliverableRole: 'Dựng Recap sân khấu & Audio Sync',
    coverImage: frameCrimsonStage,
    videoUrl: '/videos/crimson-stage.mp4',
    agencyBrief:
      'Ghi hình đa góc máy tại đại nhạc hội 30.000 khán giả, dựng bản aftermovie năng lượng cao xuất xưởng ngay trong 24h.',
  },
];

export const AGENCY_SERVICES: AgencyServiceItem[] = [
  {
    id: 'service-shoot',
    index: '01',
    title: 'Quay & Ghi hình thực chiến',
    tagline: 'Linh hoạt ekip gọn nhẹ',
    description:
      'Linh hoạt ekip gọn nhẹ cho video sản phẩm, thương hiệu và sự kiện.',
    deliverables: [
      'Quay TVC, Viral Clip & Product Video',
      'Setup ánh sáng, bối cảnh & thu âm đồng bộ',
      'Tác nghiệp độc lập hoặc phối hợp theo ekip Agency',
    ],
  },
  {
    id: 'service-edit',
    index: '02',
    title: 'Dựng hậu kỳ & Chỉnh màu',
    tagline: 'Dựng chắc nhịp, giao file nhanh',
    description:
      'Dựng chắc nhịp, đồng bộ âm thanh và xuất file đa tỷ lệ chạy Ads.',
    deliverables: [
      'Trả bản dựng nháp (Offline cut) trong 24–48h',
      'Chỉnh màu DaVinci Resolve chuẩn tone nhãn hàng',
      'Xuất đồng thời 16:9 ngang, 9:16 dọc & 1:1',
    ],
  },
  {
    id: 'service-motion',
    index: '03',
    title: 'Motion Graphics & Visuals',
    tagline: 'Chuyển động thu hút, typography hiện đại',
    description:
      'Tăng tỷ lệ giữ chân 3 giây đầu bằng đồ họa chuyển động.',
    deliverables: [
      'Kinetic Typography & chữ động quảng cáo',
      'Intro/Outro, Logo Animation & Lower-thirds',
      'Hiệu ứng điểm nhấn tối ưu cho TikTok / Reels Ads',
    ],
  },
];

export const STUDIO_SOFTWARE_TOOLS: SoftwareToolItem[] = [
  {
    id: 'davinci',
    name: 'DaVinci Resolve Studio',
    shortName: 'DaVinci',
    discipline: 'Chỉnh màu & Dựng phim',
    brandColor: '#E63946',
    bgColor: '#FFF5F5',
    borderColor: '#FED7D7',
  },
  {
    id: 'after-effects',
    name: 'Adobe After Effects',
    shortName: 'Ae',
    discipline: 'Motion Graphics & VFX',
    brandColor: '#9999FF',
    bgColor: '#F5F5FF',
    borderColor: '#E2E2FE',
  },
  {
    id: 'photoshop',
    name: 'Adobe Photoshop',
    shortName: 'Ps',
    discipline: 'Key Visual & Retouching',
    brandColor: '#31A8FF',
    bgColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  {
    id: 'illustrator',
    name: 'Adobe Illustrator',
    shortName: 'Ai',
    discipline: 'Vector Assets & Typography',
    brandColor: '#FF9A00',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  {
    id: 'capcut',
    name: 'CapCut Desktop / Pro',
    shortName: 'CapCut',
    discipline: 'Dựng nhanh Social 9:16',
    brandColor: '#00C896',
    bgColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
];

export const EXPERIENCE_MILESTONES: ExperienceItem[] = [
  {
    id: 'exp-current',
    period: '2024 – Nay',
    role: 'Senior Video Editor & Motion Designer (Freelance)',
    companyOrClients: 'Creative Agencies & Production Houses tại TP.HCM',
    scope: 'Dựng TVC, Social Ads 9:16 và Motion Graphics. Xử lý audio sync, kinetic text và adapt đa tỉ lệ tốc độ cao.',
  },
  {
    id: 'exp-studio09',
    period: '2022 – 2024',
    role: 'Lead Film Editor · Studio 09',
    companyOrClients: 'Studio 09 Production',
    scope: 'Dựng offline & online, multi-cam multiclip và chỉnh màu DaVinci Resolve chuẩn broadcast cho TVC & MV ca nhạc.',
  },
  {
    id: 'exp-producer',
    period: '2020 – 2022',
    role: 'Video Producer & Content Editor',
    companyOrClients: 'Digital Media Agency',
    scope: 'Quay dựng trọn gói video truyền thông mạng xã hội, setup ánh sáng studio và hoàn thiện nhanh trong 24h.',
  },
];

export const EDUCATION_MILESTONES: EducationItem[] = [
  {
    id: 'edu-bachelor',
    period: '2018 – 2022',
    degree: 'Cử nhân Thiết kế Đồ họa & Truyền thông Đa phương tiện',
    institution: '[Tên trường Đại học của bạn]',
    description: 'Nền tảng bố cục khung hình, nhịp điệu cắt dựng thị giác và tư duy kể chuyện thương mại.',
  },
  {
    id: 'edu-cert',
    period: '2022',
    degree: 'Chứng chỉ Chuyên nghiệp DaVinci Resolve Colorist',
    institution: 'Blackmagic Design Certified Training',
    description: 'Thực hành Color Management, ACES workflow và cân chỉnh màu sắc DaVinci Resolve chuẩn broadcast.',
  },
];
