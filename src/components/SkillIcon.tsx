import { useState, useEffect } from "react";

export const iconExceptions: Record<string, string> = {
  "chatgpt": "openai-chatgpt",
  "openai": "openai",
  "gpt": "openai-chatgpt",
  "geminiai": "gemini",
  "gemini": "gemini",
  "googlegemini": "gemini",
  "trolyai": "google",
  "capcutpro": "capcut",
  "capcut": "capcut",
  "premiere": "premiere",
  "premierepro": "premiere",
  "adobepremiere": "premiere",
  "adobepremierepro": "premiere",
  "aftereffects": "after-effects",
  "adobeaftereffects": "after-effects",
  "adobeaftereffect": "after-effects",
  "ae": "after-effects",
  "photoshop": "photoshop",
  "adobephotoshop": "photoshop",
  "ps": "photoshop",
  "lightroom": "lightroom",
  "adobelightroom": "lightroom",
  "lr": "lightroom",
  "davinci": "davinci-resolve",
  "davinciresolve": "davinci-resolve",
  "resolve": "davinci-resolve",
  "davinciresolvestudio": "davinci-resolve",
  "finalcut": "final-cut-pro",
  "finalcutpro": "final-cut-pro",
  "fcpx": "final-cut-pro",
  "sony": "sony",
  "sonyalpha": "sony",
  "red": "red",
  "redcamera": "red"
};

export const POPULAR_TOOLS = [
  { name: "DaVinci Resolve", category: "Hậu kỳ (Editing)" },
  { name: "Premiere Pro", category: "Hậu kỳ (Editing)" },
  { name: "After Effects", category: "Hậu kỳ (Editing)" },
  { name: "CapCut Pro", category: "Hậu kỳ (Editing)" },
  { name: "Final Cut Pro", category: "Hậu kỳ (Editing)" },
  { name: "Photoshop", category: "Phần mềm (Suite)" },
  { name: "Lightroom", category: "Phần mềm (Suite)" },
  { name: "Sony Alpha", category: "Quay phim (Camera)" },
  { name: "RED Camera", category: "Quay phim (Camera)" },
  { name: "Gemini AI", category: "Công cụ trợ lý" },
  { name: "ChatGPT", category: "Công cụ trợ lý" }
];

export const slugify = (str: string): string => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Xóa dấu tiếng Việt
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, ""); // Xóa khoảng trắng và ký tự đặc biệt
};

export const getCleanBaseSlug = (name: string): string => {
  if (!name) return "";
  const norm = name.toLowerCase();
  if (norm.includes("resolve") || norm.includes("davinci")) return "davinciresolve";
  if (norm.includes("premiere") || norm.includes(" pr ") || norm.endsWith(" pr") || norm.startsWith("pr ")) return "premiere";
  if (norm.includes("after effects") || norm.includes("aftereffects") || norm.includes(" ae ") || norm.endsWith(" ae") || norm.startsWith("ae ")) return "aftereffects";
  if (norm.includes("photoshop") || norm.includes(" ps ") || norm.endsWith(" ps") || norm.startsWith("ps ")) return "photoshop";
  if (norm.includes("lightroom") || norm.includes(" lr ") || norm.endsWith(" lr") || norm.startsWith("lr ")) return "lightroom";
  if (norm.includes("capcut")) return "capcut";
  if (norm.includes("gemini")) return "gemini";
  if (norm.includes("chatgpt") || norm.includes("openai") || norm.includes("gpt")) return "chatgpt";
  if (norm.includes("final cut") || norm.includes("fcp")) return "finalcut";
  if (norm.includes("sony")) return "sony";
  if (norm.includes("red")) return "red";
  
  // Loại bỏ ngoặc đơn/ngoặc vuông: "CapCut Pro (Fast Pace-Design)" -> "CapCut Pro"
  const cleanName = name.replace(/\s*[\(\[].*?[\)\]]/g, "");
  return slugify(cleanName);
};

export const getBrandColor = (name: string): { bg: string; text: string; border: string; glow: string } => {
  const norm = name.toLowerCase();
  if (norm.includes("resolve") || norm.includes("davinci")) {
    return { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30", glow: "shadow-[0_0_15px_rgba(239,68,68,0.15)]" };
  }
  if (norm.includes("premiere") || norm.includes("adobe pr") || norm.includes("pr")) {
    return { bg: "bg-purple-950/25", text: "text-[#ea48ea]", border: "border-purple-500/30", glow: "shadow-[0_0_15px_rgba(147,51,234,0.15)]" };
  }
  if (norm.includes("after effects") || norm.includes("ae") || norm.includes("adobe ae")) {
    return { bg: "bg-indigo-950/25", text: "text-[#9c57f7]", border: "border-indigo-500/30", glow: "shadow-[0_0_15px_rgba(79,70,229,0.15)]" };
  }
  if (norm.includes("photoshop") || norm.includes("ps") || norm.includes("adobe ps")) {
    return { bg: "bg-blue-950/25", text: "text-[#31a8ff]", border: "border-blue-500/30", glow: "shadow-[0_0_15px_rgba(59,130,246,0.15)]" };
  }
  if (norm.includes("lightroom") || norm.includes("lr") || norm.includes("adobe lr")) {
    return { bg: "bg-teal-950/25", text: "text-[#31ffda]", border: "border-teal-500/30", glow: "shadow-[0_0_15px_rgba(20,184,166,0.15)]" };
  }
  if (norm.includes("capcut")) {
    return { bg: "bg-cyan-950/25", text: "text-[#2be6e6]", border: "border-cyan-500/30", glow: "shadow-[0_0_15px_rgba(6,182,212,0.15)]" };
  }
  if (norm.includes("gemini")) {
    return { bg: "bg-sky-950/25", text: "text-sky-400", border: "border-sky-500/30", glow: "shadow-[0_0_15px_rgba(56,189,248,0.15)]" };
  }
  if (norm.includes("chatgpt") || norm.includes("openai") || norm.includes("gpt")) {
    return { bg: "bg-emerald-950/25", text: "text-[#10a37f]", border: "border-emerald-500/30", glow: "shadow-[0_0_15px_rgba(16,185,129,0.15)]" };
  }
  if (norm.includes("sony") || norm.includes("alpha")) {
    return { bg: "bg-neutral-900/60", text: "text-neutral-200", border: "border-neutral-700/40", glow: "shadow-none" };
  }
  if (norm.includes("red")) {
    return { bg: "bg-red-950/25", text: "text-red-500", border: "border-red-500/30", glow: "shadow-[0_0_15px_rgba(239,68,68,0.1)" };
  }
  return { bg: "bg-sky-950/10", text: "text-sky-450", border: "border-sky-500/20", glow: "shadow-[0_0_12px_rgba(14,165,233,0.08)]" };
};

export const getAbbreviation = (name: string): string => {
  const norm = name.toLowerCase().trim();
  if (norm.startsWith("premiere") || norm.includes("adobe pr")) return "Pr";
  if (norm.startsWith("after effects") || norm.startsWith("adobe ae") || norm.includes("aftereffects")) return "Ae";
  if (norm.startsWith("photoshop") || norm.startsWith("adobe ps")) return "Ps";
  if (norm.startsWith("lightroom") || norm.startsWith("adobe lr")) return "Lr";
  if (norm.includes("resolve") || norm.includes("davinci")) return "Dr";
  if (norm.includes("audition")) return "Au";
  if (norm.includes("illustrator")) return "Ai";
  if (norm.includes("final cut") || norm.includes("fcp")) return "Fc";
  if (norm.includes("capcut")) return "Cc";
  
  const words = name.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export const getIconUrl = (name: string): string => {
  const slug = getCleanBaseSlug(name);
  if (!slug) return "";
  const finalSlug = iconExceptions[slug] || slug;
  return `https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/${finalSlug}/default.svg`;
};

// Component hiển thị Icon kỹ năng bảo mật, mượt mà, không giật lag và không bao giờ lỗi
export function SkillIcon({ name, className = "w-7.5 h-7.5", iconColor }: { name: string; className?: string; iconColor?: string }) {
  const [tier, setTier] = useState<1 | 2 | 3>(1);
  const [debouncedName, setDebouncedName] = useState(name);

  // Buffer cập nhật 300ms khi gõ bàn phím tránh bắn request liên tục gây gián đoạn
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedName(name);
      setTier(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [name]);

  // Nếu không truyền tên, không render gì
  if (!name.trim()) return null;

  const slug = getCleanBaseSlug(debouncedName);
  const finalSlug = iconExceptions[slug] || slug;

  const src = tier === 1 
    ? `https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/${finalSlug}/default.svg`
    : tier === 2 
    ? `https://cdn.simpleicons.org/${finalSlug}`
    : "";

  const handleImgError = () => {
    if (tier === 1) {
      setTier(2); // Thử dùng kho SimpleIcons làm cứu cánh
    } else if (tier === 2) {
      setTier(3); // Render text avatar tuyệt đẹp độc quyền
    }
  };

  if (tier === 3 || !src || !slug) {
    const defaultColors = getBrandColor(debouncedName);
    const abbr = getAbbreviation(debouncedName);
    
    const inlineStyle = iconColor ? {
      color: iconColor,
      borderColor: `${iconColor}40`,
      backgroundColor: `${iconColor}12`,
    } : {};

    return (
      <div 
        className={`${className} flex items-center justify-center rounded-lg border ${iconColor ? "" : `${defaultColors.bg} ${defaultColors.border} ${defaultColors.text} ${defaultColors.glow}`} font-sans font-black text-[13px] tracking-tight leading-none select-none transition-all duration-300`}
        style={inlineStyle}
        title={name}
      >
        {abbr}
      </div>
    );
  }

  if (iconColor) {
    const maskStyle = {
      mask: `url(${src}) no-repeat center / contain`,
      WebkitMask: `url(${src}) no-repeat center / contain`,
      backgroundColor: iconColor,
    };

    return (
      <div className={`${className} relative transition-all duration-300`} title={name}>
        {/* Hidden image to trigger verification of source URL validity */}
        <img 
          src={src} 
          alt="" 
          onError={handleImgError} 
          className="hidden" 
        />
        <div 
          className="w-full h-full transition-all duration-300" 
          style={maskStyle} 
        />
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={name}
      onError={handleImgError}
      className={`${className} object-contain transition-all duration-300 filter brightness-95 group-hover:brightness-100 group-hover:scale-105`}
    />
  );
}
