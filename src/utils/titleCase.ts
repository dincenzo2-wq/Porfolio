export function formatTitleCase(str: string): string {
  if (!str || typeof str !== "string") return "";
  
  const trimmed = str.trim();
  const lower = trimmed.toLowerCase();
  
  const PHRASE_MAP: Record<string, string> = {
    "davinci resolve": "DaVinci Resolve",
    "premiere pro": "Premiere Pro",
    "after effects": "After Effects",
    "capcut pro": "CapCut Pro",
    "final cut pro": "Final Cut Pro",
    "sony alpha": "Sony Alpha",
    "red camera": "RED Camera",
    "gemini ai": "Gemini AI",
    "google gemini": "Google Gemini",
    "adobe premiere pro": "Adobe Premiere Pro",
    "adobe premiere": "Adobe Premiere",
    "adobe after effects": "Adobe After Effects",
    "adobe photoshop": "Adobe Photoshop",
    "adobe lightroom": "Adobe Lightroom",
    "final cut": "Final Cut"
  };

  if (PHRASE_MAP[lower]) {
    return PHRASE_MAP[lower];
  }

  const WORD_MAP: Record<string, string> = {
    "DAVINCI": "DaVinci",
    "CAPCUT": "CapCut",
    "YOUTUBE": "YouTube",
    "CHATGPT": "ChatGPT",
    "OPENAI": "OpenAI",
    "IPHONE": "iPhone",
    "IPAD": "iPad",
    "MACBOOK": "MacBook",
    "RED": "RED",
    "AI": "AI",
    "FCPX": "FCPX",
    "AE": "AE",
    "PS": "PS",
    "LR": "LR",
    "PR": "PR",
    "TIKTOK": "TikTok",
    "REELS": "Reels"
  };

  const abbreviations = ["THPT", "TP.HCM", "SG", "TVC", "FPV", "UHD", "DCI", "HQD", "R2", "D1", "AI", "VTV", "HTV", "TIKTOK", "REELS", "VND", "USD", "HCM"];
  
  return str.split(/\s+/).map(word => {
    if (!word) return "";
    
    // Tách từ sạch không tính dấu câu để so sánh với danh sách viết tắt
    const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").toUpperCase();
    
    if (WORD_MAP[cleanWord]) {
      const regex = new RegExp(cleanWord, 'i');
      return word.replace(regex, WORD_MAP[cleanWord]);
    }
    
    if (abbreviations.includes(cleanWord) || word.includes(".") || word.toUpperCase() === "TP.HCM") {
      return word.toUpperCase(); // Viết hoa toàn bộ cho viết tắt
    }
    
    // Viết hoa chữ đầu, viết thường chữ sau
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(" ");
}

export const CATEGORY_MAP: Record<string, string> = {
  "TVC": "TVC",
  "COMMERCIAL": "Commercial",
  "TRAVEL": "Travel",
  "WEDDING": "Wedding",
  "SOCIAL": "Social / Review",
  "CINEMATIC REEL": "Cinematic Reel",
  "MUSIC VIDEO": "Music Video",
  "SHORT FILM": "Short Film",
  "DOCUMENTARY": "Documentary",
  "VIDEOGRAPHY": "Videography"
};

export function formatCategory(cat: string): string {
  if (!cat || typeof cat !== "string") return "";
  const normalized = cat.trim().toUpperCase();
  return CATEGORY_MAP[normalized] || formatTitleCase(cat);
}

