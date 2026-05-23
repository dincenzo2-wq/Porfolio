import { UserProfile, Project, Experience, Skill, DEFAULT_PROFILE } from "../types";
import { getIconUrl } from "../components/SkillIcon";

export interface CloudflareD1Skill {
  name: string;
  icon: string;
  level: string;
  category?: string;
  iconColor?: string;
}

export interface CloudflareD1Experience {
  role: string;
  company: string;
  startY: string;
  endY: string;
  description?: string;
}

export interface CloudflareD1Education {
  degree: string;
  company: string;
  startY: string;
  endY: string;
  description?: string;
}

export interface CloudflareD1Project {
  id: string;
  title: string;
  category: string;
  year: string;
  videoUrl: string;
  thumbnail: string;
  tags: string | string[];
  duration?: string;
  resolution?: string;
  role?: string;
  description?: string;
  client?: string;
  platform?: string;
}

export interface CloudflareD1DataResponse {
  projects: CloudflareD1Project[];
  profile: {
    id: number;
    bio: string;
    skills: string | CloudflareD1Skill[];
    experience: string | CloudflareD1Experience[];
    education: string | CloudflareD1Education[];
  };
  settings: {
    id: number;
    name: string;
    profession: string;
    slogan: string;
    avatar: string;
    accentColor: string;
    categories: string | string[];
    footerSubHeader: string;
    footerMainTitle: string;
    footerEmail: string;
    footerPhone: string;
    footerLocation: string;
    footerCoords: string;
    footerFacebook: string;
    footerInstagram: string;
    footerTiktok: string;
  };
}

// Convert string / object safely
function parseJsonSafe<T>(val: any, fallback: T): T {
  if (!val) return fallback;
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return val as T;
}

/**
 * Maps Cloudflare D1 tables combination to the App's UserProfile state
 */
export function mapCloudflareToProfile(cfData: CloudflareD1DataResponse): UserProfile {
  const settings: any = cfData.settings || {};
  const cfProfile: any = cfData.profile || {};
  const cfProjects = cfData.projects || [];

  // 1. parse JSON columns safely
  const rawSkills = parseJsonSafe<CloudflareD1Skill[]>(cfProfile.skills, []);
  const rawExp = parseJsonSafe<CloudflareD1Experience[]>(cfProfile.experience, []);
  const rawEdu = parseJsonSafe<CloudflareD1Education[]>(cfProfile.education, []);

  // 2. Map Skills
  const skills: Skill[] = rawSkills.map((s) => {
    let numericLevel = 80;
    if (s.level) {
      const lvlStr = String(s.level).toLowerCase();
      if (lvlStr.includes("expert") || lvlStr.includes("chuyên gia")) numericLevel = 90;
      else if (lvlStr.includes("advanced") || lvlStr.includes("cao cấp")) numericLevel = 80;
      else if (lvlStr.includes("intermediate") || lvlStr.includes("trung cấp")) numericLevel = 70;
      else {
        const parsed = parseInt(lvlStr, 10);
        if (!isNaN(parsed)) numericLevel = parsed;
      }
    }

    // Determine category based on stored field or name heuristics
    const nameLow = s.name.toLowerCase();
    let category: Skill["category"] = "Hậu kỳ (Editing)";
    
    if (s.category) {
      category = s.category as any;
    } else {
      if (
        nameLow.includes("photoshop") ||
        nameLow.includes("lightroom") ||
        nameLow.includes("illustrator") ||
        nameLow.includes("suite") ||
        nameLow.includes("phần mềm")
      ) {
        category = "Phần mềm (Suite)";
      } else if (
        nameLow.includes("gemini") ||
        nameLow.includes("chatgpt") ||
        nameLow.includes("midjourney") ||
        nameLow.includes("ai") ||
        nameLow.includes("trợ lý")
      ) {
        category = "Công cụ trợ lý";
      } else if (
        nameLow.includes("may anh") ||
        nameLow.includes("máy ảnh") ||
        nameLow.includes("camera") ||
        nameLow.includes("lighting") ||
        nameLow.includes("quay")
      ) {
        category = "Quay phim (Camera)";
      }
    }

    return {
      name: s.name,
      level: numericLevel,
      category,
      iconColor: s.iconColor,
    };
  });

  // Preserve pre-existing template skills if response was completely empty
  const finalSkills = skills.length > 0 ? skills : DEFAULT_PROFILE.skills;

  // 3. Map Experience Projects
  const workExperienceData: Experience[] = rawExp.map((e, idx) => ({
    id: `cf-work-${idx}`,
    role: e.role,
    company: e.company,
    period: `${e.startY} - ${e.endY || "Hiện tại"}`,
    description: (e.description !== undefined && e.description !== null) 
      ? e.description 
      : `Đảm nhận vai trò hậu kỳ, dựng phim chính và định hình phong cách sáng tạo cho các dự án tại ${e.company}.`,
    skills: [],
    type: "Work",
  }));

  const educationData: Experience[] = rawEdu.map((e, idx) => ({
    id: `cf-edu-${idx}`,
    role: e.degree,
    company: e.company,
    period: `${e.startY} - ${e.endY || "Hiện tại"}`,
    description: (e.description !== undefined && e.description !== null) 
      ? e.description 
      : `Đào tạo bài bản chuyên sâu về quay chụp góc quay, viết kịch bản và thiết kế âm thanh điện ảnh.`,
    skills: [],
    type: "Education",
  }));

  // 4. Map Projects
  const projects: Project[] = cfProjects.map((p) => {
    let resolvedTags: string[] = [];
    if (p.tags) {
      if (Array.isArray(p.tags)) {
        resolvedTags = p.tags;
      } else if (typeof p.tags === "string") {
        const trimmed = p.tags.trim();
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
          try {
            resolvedTags = JSON.parse(trimmed);
          } catch {
            resolvedTags = trimmed.replace(/[\[\]"']/g, "").split(",").map(t => t.trim()).filter(Boolean);
          }
        } else {
          resolvedTags = trimmed.split(",").map(t => t.trim()).filter(Boolean);
        }
      }
    }
    
    // Ensure resolvedTags is actually an array
    if (!Array.isArray(resolvedTags)) {
      resolvedTags = [];
    }

    return {
      id: p.id || String(Date.now()),
      title: p.title || "Tác phẩm Video",
      description: p.description || "",
      tags: resolvedTags.length > 0 ? resolvedTags : [p.category || "Videography"],
      category: (() => {
        const cat = p.category ? p.category.trim().toUpperCase() : "";
        if (cat === "SOCÍAL") return "SOCIAL";
        return p.category || "Wedding";
      })(),
      year: p.year || "2025",
      youtubeEmbedUrl: getEmbedUrlOfVideo(p.videoUrl),
      link: p.videoUrl,
      thumbnailUrl: p.thumbnail || "https://images.unsplash.com/photo-1542204172-e7052809a850?auto=format&fit=crop&q=80&w=600",
      role: p.role || "Video Editor & Director",
      duration: p.duration || "",
      resolution: p.resolution || "",
      client: p.client || "",
      platform: p.platform || "",
    };
  });

  return {
    name: settings.name || "TRẦN QUỐC VINH",
    role: settings.profession || "Junior Editor & Videographer",
    subtitle: settings.slogan || "Kể câu chuyện của bạn qua những khung hình chuyển động.",
    bio: cfProfile.bio || "Tôi là một Videographer và Video Editor tự do...",
    aboutMini: settings.slogan || "Không có set quay nào quá nhỏ, không có dự án nào quá lớn — chỉ có câu chuyện đáng được kể.",
    location: settings.footerLocation || "Hà Nội, Việt Nam",
    email: settings.footerEmail || "tranquocvinh.media@gmail.com",
    phone: settings.footerPhone || "+84 345 678 910",
    github: "",
    linkedin: "",
    facebookUrl: settings.footerFacebook || "facebook.com/tranquocvinh.media",
    instagramUrl: settings.footerInstagram || "instagram.com/tranquocvinh.lens",
    zaloNumber: settings.footerPhone || "0345678910",
    telegram: settings.footerTiktok || "",
    skills: finalSkills,
    projects: projects.length > 0 ? projects : DEFAULT_PROFILE.projects,
    workExperienceData: workExperienceData.length > 0 ? workExperienceData : DEFAULT_PROFILE.workExperienceData,
    educationData: educationData.length > 0 ? educationData : DEFAULT_PROFILE.educationData,
    avatarUrl: settings.avatar || "",
  };
}

/**
 * Converts Youtube share links to actual Embed links so iframe doesn't crash
 */
function getEmbedUrlOfVideo(url: string = ""): string {
  if (!url) return "";
  if (url.includes("embed/")) return url;
  try {
    if (url.includes("youtu.be/")) {
      const parts = url.split("youtu.be/");
      const query = parts[1]?.split("?")?.[0];
      if (query) return `https://www.youtube.com/embed/${query}`;
    }
    if (url.includes("watch?v=")) {
      const match = url.match(/[?&]v=([^&#]+)/);
      if (match && match[1]) return `https://www.youtube.com/embed/${match[1]}`;
    }
  } catch (e) {
    console.error("Failed to parse embed URL", e);
  }
  return url;
}

/**
 * Maps the App profile representation to Cloudflare's profile PAYLOAD
 */
export function mapToCloudflareProfilePayload(profile: UserProfile): any {
  return {
    bio: profile.bio || "",
    skills: profile.skills.map((s) => ({
      name: s.name,
      icon: s.name.toLowerCase().includes("premiere")
        ? "https://cdn.simpleicons.org/adobepremierepro"
        : s.name.toLowerCase().includes("davinci")
        ? "https://cdn.simpleicons.org/davinciresolve"
        : getIconUrl(s.name) || "",
      level: s.level >= 85 ? "Expert" : s.level >= 72 ? "Advanced" : "Intermediate",
      category: s.category,
      iconColor: s.iconColor,
    })),
    experience: profile.workExperienceData.map((e) => {
      const years = (e.period || "").split("-").map((x) => x.trim());
      return {
        role: e.role,
        company: e.company,
        startY: years[0] || "2024",
        endY: years[1] || "2026",
        description: e.description || "",
      };
    }),
    education: profile.educationData.map((e) => {
      const years = (e.period || "").split("-").map((x) => x.trim());
      return {
        degree: e.role,
        company: e.company,
        startY: years[0] || "2020",
        endY: years[1] || "2024",
        description: e.description || "",
      };
    }),
  };
}

/**
 * Maps the App profile representation to Cloudflare's settings PAYLOAD
 */
export function mapToCloudflareSettingsPayload(profile: UserProfile, currentTheme?: string): any {
  return {
    name: profile.name,
    profession: profile.role,
    accentColor: currentTheme || "cinema",
    categories: Array.from(new Set(profile.projects.map((p) => (p.category || "General").toUpperCase()))),
    footerSubHeader: "READY TO CREATE?",
    footerMainTitle: "Let's Collaborate",
    footerEmail: profile.email,
    footerPhone: profile.phone,
    footerLocation: profile.location,
    footerFacebook: profile.facebookUrl || "",
    footerInstagram: profile.instagramUrl || "",
    footerTiktok: profile.telegram || "",
    avatar: profile.avatarUrl || "",
  };
}

/**
 * Maps the App profile projects list to Cloudflare's projects array PAYLOAD
 */
export function mapToCloudflareProjectsPayload(projects: Project[]): any[] {
  return projects.map((p) => ({
    id: p.id,
    title: p.title,
    category: (p.category || "Wedding").toUpperCase(),
    year: p.year || "2025",
    videoUrl: p.link || p.youtubeEmbedUrl || "",
    thumbnail: p.thumbnailUrl || "",
    tags: p.tags || [],
    duration: p.duration || "",
    resolution: p.resolution || "",
    role: p.role || "",
    description: p.description || "",
    client: p.client || "",
    platform: p.platform || "",
  }));
}
