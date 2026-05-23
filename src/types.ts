export interface Project {
  id: string;
  title: string;
  description: string;
  tags: string[];
  link?: string;
  github?: string;
  category: string;
  duration?: string;
  resolution?: string;
  thumbnailUrl?: string;
  year?: string;
  role?: string;
  youtubeEmbedUrl?: string;
  client?: string;
  specs?: string;
  platform?: string;
  tools?: string;
}

export interface Experience {
  id: string;
  role: string;
  company: string;
  period: string;
  description: string;
  skills?: string[];
  type?: "Work" | "Education";
}

export interface Skill {
  name: string;
  level: number; // 0-100
  category: "Hậu kỳ (Editing)" | "Phần mềm (Suite)" | "Công cụ trợ lý" | "Quay phim (Camera)" | "Khác";
  iconColor?: string; // Mã màu hex tùy chỉnh cho icon/viền glow
}

export interface UserProfile {
  name: string;
  role: string;
  subtitle: string;
  bio: string;
  aboutMini: string;
  location: string;
  email: string;
  phone: string;
  github: string;
  linkedin: string;
  facebookUrl?: string;
  instagramUrl?: string;
  zaloNumber?: string;
  telegram?: string;
  skills: Skill[];
  projects: Project[];
  workExperienceData: Experience[];
  educationData: Experience[];
  avatarUrl?: string;
}

export type ThemeType = "cinema" | "emerald" | "coral" | "violet" | "nord";

export interface AppTheme {
  id: ThemeType;
  name: string;
  bg: string;
  cardBg: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  accent: string;
}

export const THEMES: Record<ThemeType, AppTheme> = {
  cinema: {
    id: "cinema",
    name: "Nordic Minimalist (Sáng tối giản & Tinh tế)",
    bg: "bg-slate-50 text-slate-900",
    cardBg: "bg-white border-slate-200 shadow-sm",
    text: "text-slate-900",
    textMuted: "text-slate-600",
    border: "border-slate-200",
    primary: "text-sky-600 bg-sky-50 border-sky-200",
    accent: "bg-gradient-to-r from-sky-500 via-sky-600 to-sky-700",
  },
  emerald: {
    id: "emerald",
    name: "Emerald Soft (Ngọc lục bảo thanh tú)",
    bg: "bg-slate-50 text-slate-900",
    cardBg: "bg-white border-slate-200 shadow-sm",
    text: "text-slate-900",
    textMuted: "text-slate-600",
    border: "border-slate-200",
    primary: "text-emerald-700 bg-emerald-50 border-emerald-200",
    accent: "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600",
  },
  coral: {
    id: "coral",
    name: "Sunset Coral (Ấm áp & Rực rỡ)",
    bg: "bg-slate-50 text-slate-900",
    cardBg: "bg-white border-slate-200 shadow-sm",
    text: "text-slate-900",
    textMuted: "text-slate-600",
    border: "border-slate-200",
    primary: "text-rose-600 bg-rose-50 border-rose-200",
    accent: "bg-gradient-to-r from-rose-500 via-pink-500 to-orange-500",
  },
  violet: {
    id: "violet",
    name: "Dreamy Violet (Sáng tạo & Mơ mộng)",
    bg: "bg-slate-50 text-slate-900",
    cardBg: "bg-white border-slate-200 shadow-sm",
    text: "text-slate-900",
    textMuted: "text-slate-600",
    border: "border-slate-200",
    primary: "text-violet-600 bg-violet-50 border-violet-200",
    accent: "bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-500",
  },
  nord: {
    id: "nord",
    name: "Nordic Frost (Yên bình & Thanh lịch)",
    bg: "bg-slate-50 text-slate-900",
    cardBg: "bg-white border-slate-200 shadow-sm",
    text: "text-slate-900",
    textMuted: "text-slate-600",
    border: "border-slate-200",
    primary: "text-sky-600 bg-sky-50 border-sky-200",
    accent: "bg-gradient-to-r from-[#88c0d0] to-[#5e81ac]",
  }
};

export const DEFAULT_PROFILE: UserProfile = {
  name: "TRẦN QUỐC VINH - Editor & Videographer",
  role: "Junior Editor & Videographer",
  subtitle: "Kể câu chuyện của bạn qua những khung hình chuyển động. Chuyên hậu kỳ, dựng phim và sản xuất hình ảnh thương mại chất lượng cao.",
  bio: "Tôi là một Videographer và Video Editor trẻ đầy nhiệt huyết đang hoạt động tự do. Đam mê nghệ thuật kể chuyện bằng hình ảnh, tôi biến những chất liệu quay thô thành những thước phim hoàn chỉnh mang đậm chiều sâu cảm xúc, góc quay sáng tạo và nhịp điệu lôi cuốn. Tôi thích sử dụng các công nghệ AI và quy trình làm việc hiện đại để tối ưu năng suất thiết kế và liên tục đổi mới phong cách.",
  aboutMini: "Không có set quay nào quá nhỏ, không có dự án nào quá lớn — chỉ có câu chuyện đáng được kể.",
  location: "Hà Nội, Việt Nam",
  email: "tranquocvinh.media@gmail.com",
  phone: "+84 345 678 910",
  github: "",
  linkedin: "",
  facebookUrl: "facebook.com/tranquocvinh.media",
  instagramUrl: "instagram.com/tranquocvinh.lens",
  zaloNumber: "0345678910",
  telegram: "",
  skills: [
    { name: "DaVinci Resolve (Editing & Grading)", level: 90, category: "Hậu kỳ (Editing)", iconColor: "#ef4444" },
    { name: "Adobe Premiere Pro", level: 85, category: "Hậu kỳ (Editing)", iconColor: "#ea48ea" },
    { name: "CapCut Pro (Fast Pace-Design)", level: 95, category: "Hậu kỳ (Editing)", iconColor: "#2be6e6" },
    { name: "Adobe Photoshop", level: 80, category: "Phần mềm (Suite)", iconColor: "#31a8ff" },
    { name: "Adobe Lightroom", level: 85, category: "Phần mềm (Suite)", iconColor: "#31ffda" },
    { name: "Trợ lý AI Gemini (Ý tưởng & Script)", level: 80, category: "Công cụ trợ lý", iconColor: "#38bdf8" },
    { name: "Vận hành Máy ảnh & Lighting", level: 75, category: "Quay phim (Camera)", iconColor: "#e5e5e5" }
  ],
  projects: [
    {
      id: "video-1",
      title: "TVC Quảng Cáo: Pepsi x BlackPink",
      description: "Dựng phim quảng cáo tràn đầy năng lượng, nhịp điệu nhanh giật gân đầy cuốn hút cho chiến dịch hè nổi bật của nhãn hàng toàn cầu.",
      tags: ["Commercial", "Sound Design", "BlackPink", "Color Grading"],
      category: "Commercial",
      duration: "00:30",
      resolution: "4K UHD",
      year: "2025",
      role: "Dựng phim & Sound Design",
      youtubeEmbedUrl: "https://www.youtube.com/embed/HmsZ6ZidpxI",
      thumbnailUrl: "https://images.unsplash.com/photo-1542204172-e7052809a850?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: "video-2",
      title: "Commercial TVC: 'Sắc Việt Brand Show'",
      description: "Thước phim quảng cáo truyền hình TVC giới thiệu bộ sưu tập thời trang cổ truyền, nhấn mạnh chuyển động mượt mà bối cảnh kinh thành Huế.",
      tags: ["Commercial", "Slow Motion", "Cinematic", "Huế Style"],
      category: "Commercial",
      duration: "01:00",
      resolution: "4K UHD",
      year: "2024",
      role: "Hậu kỳ & Cân màu",
      youtubeEmbedUrl: "https://www.youtube.com/embed/P_PkiD_Z2j4",
      thumbnailUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: "video-3",
      title: "Phóng Sự Cưới: 'Chuyện Tình Mùa Thu'",
      description: "Video phóng sự cưới lưu giữ khoảnh khắc ngọt ngào ấm áp đậm chất cinematic, lấy bối cảnh Đà Lạt đầy mộng mơ trong nắng sớm.",
      tags: ["Wedding", "Love Story", "Leica Look", "Slowmo"],
      category: "Wedding",
      duration: "05:12",
      resolution: "4K DCI",
      year: "2025",
      role: "Quay phim & Colorist",
      youtubeEmbedUrl: "https://www.youtube.com/embed/Wb9eM9L1P0M",
      thumbnailUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: "video-4",
      title: "Pre-Wedding Cinematic: 'Hải Phòng Vibes'",
      description: "Hành trình tình yêu đầy cá tính của cặp đôi trẻ trên các cung đường cổ kính phố cảng Hải Phòng ấm áp rêu phong.",
      tags: ["Wedding", "Pre-Wedding", "Vlog", "Warm Film"],
      category: "Wedding",
      duration: "03:45",
      resolution: "4K UHD",
      year: "2024",
      role: "Dựng phim chính",
      youtubeEmbedUrl: "https://www.youtube.com/embed/RbyVfB8v34E",
      thumbnailUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: "video-5",
      title: "Travel Vlog: 'Khám Phá Hà Giang'",
      description: "Thước phim du lịch trải nghiệm khám phá vẻ đẹp hùng vĩ của dốc Thẩm Mã, đèo Mã Pí Lèng và những nụ cười vùng cao rực rỡ.",
      tags: ["Travel", "FPV Drone", "Hà Giang", "Resolve"],
      category: "Travel",
      duration: "08:30",
      resolution: "4K DCI",
      year: "2025",
      role: "Đạo diễn & Hậu kỳ",
      youtubeEmbedUrl: "https://www.youtube.com/embed/z3rE61S3yB4",
      thumbnailUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: "video-6",
      title: "Travel Cinematic: 'Sapa Trong Sương'",
      description: "Thước phim nghệ thuật lột tả sự huyền bí, yên ả của bản Cát Cát và đỉnh núi mờ sương mây lảng vảng ngút ngàn.",
      tags: ["Travel", "Sapa", "Sony A7S3", "Anamorphic"],
      category: "Travel",
      duration: "04:00",
      resolution: "4K DCI",
      year: "2024",
      role: "Quay phim & Colorist",
      youtubeEmbedUrl: "https://www.youtube.com/embed/28NnB0QOQGo",
      thumbnailUrl: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=600"
    }
  ],
  workExperienceData: [
    {
      id: "v-exp-1",
      role: "Content Marketing",
      company: "Cam Beauty",
      period: "2022 - 2023",
      description: "Lên kế hoạch nội dung, định hướng visual và xử lý hậu kỳ chuỗi video ngắn định dạng Reels/TikTok bắt kịp xu hướng ngành mỹ phẩm.",
      skills: [],
      type: "Work"
    },
    {
      id: "v-exp-2",
      role: "Editor / Videographer",
      company: "Nha khoa Trồng răng SG",
      period: "2023 - 2025",
      description: "Quay dựng TVC giới thiệu công nghệ nha khoa, tối ưu hóa nhịp điệu cắt dựng hiện đại và đồng bộ màu sắc chuẩn bộ nhận diện thương hiệu.",
      skills: [],
      type: "Work"
    },
    {
      id: "v-exp-3",
      role: "Videographer",
      company: "White Wedding Decor",
      period: "2025 - 2025",
      description: "Bấm máy, quản lý góc quay và ánh sáng hiện trường cho các sự kiện cưới cao cấp; đảm bảo visual cinematic sang trọng.",
      skills: [],
      type: "Work"
    },
    {
      id: "v-exp-4",
      role: "Editor",
      company: "Lotus Wedding House",
      period: "2025 - Hiện tại",
      description: "Chịu trách nhiệm hậu kỳ toàn bộ phim phóng sự cưới, tinh chỉnh màu sắc nghệ thuật và xử lý nhịp điệu âm thanh tạo cảm xúc.",
      skills: [],
      type: "Work"
    }
  ],
  educationData: [
    {
      id: "v-edu-1",
      role: "",
      company: "THPT Thanh Đa",
      period: "2015 - 2017",
      description: "Hoàn thành chương trình trung học phổ thông hệ chính quy.",
      skills: [],
      type: "Education"
    },
    {
      id: "v-edu-2",
      role: "Chuyên ngành Marketing",
      company: "Trường Đại học Công nghệ TP.HCM (HUTECH)",
      period: "2017 - 2021",
      description: "Cử nhân Marketing thương mại. Định hình tư duy phân tích hành vi người xem và xây dựng cấu trúc kịch bản video quảng cáo bài bản.",
      skills: [],
      type: "Education"
    }
  ],
  avatarUrl: ""
};
