import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialize Google GenAI Client
let aiClient: GoogleGenAI | null = null;
function getAiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("⚠️ GEMINI_API_KEY is not defined. AI Chat representative will run in mock mode.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  
  if (trimmed.includes("youtube.com/shorts/")) {
    const parts = trimmed.split("youtube.com/shorts/");
    if (parts[1]) return parts[1].split(/[?#]/)[0];
  }
  if (trimmed.includes("youtube.com/embed/")) {
    const parts = trimmed.split("youtube.com/embed/");
    if (parts[1]) return parts[1].split(/[?#]/)[0];
  }
  if (trimmed.includes("youtu.be/")) {
    const parts = trimmed.split("youtu.be/");
    if (parts[1]) return parts[1].split(/[?#]/)[0];
  }
  
  // Standard watch link (youtube.com/watch?v=)
  const match = trimmed.match(/[?&]v=([^&#]+)/);
  if (match && match[1]) return match[1];

  // If it's just an 11-char alphanumeric string, it's already an ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  
  return null;
}

// API to scrape YouTube video duration and title
app.get("/api/youtube-info", async (req, res) => {
  try {
    const queryUrl = req.query.url as string;
    if (!queryUrl) {
      return res.status(400).json({ error: "Missing 'url' query parameter." });
    }

    const ytId = extractYouTubeId(queryUrl);
    if (!ytId) {
      return res.status(400).json({ error: "Invalid YouTube URL or Video ID." });
    }

    const targetUrl = `https://www.youtube.com/watch?v=${ytId}`;
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Failed to fetch YouTube page. Status code: ${response.status}` });
    }

    const html = await response.text();

    // 1. Extract duration
    let durationSeconds: number | null = null;
    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
    if (playerResponseMatch) {
      try {
        const lengthSecondsMatch = playerResponseMatch[1].match(/"lengthSeconds"\s*:\s*"(\d+)"/);
        if (lengthSecondsMatch) {
          durationSeconds = parseInt(lengthSecondsMatch[1], 10);
        }
      } catch (e) {}
    }

    if (durationSeconds === null) {
      const itemPropMatch = html.match(/<meta\s+itemprop="duration"\s+content="([^"]+)"/i) ||
                            html.match(/<meta\s+content="([^"]+)"\s+itemprop="duration"/i);
      if (itemPropMatch) {
        const isoDuration = itemPropMatch[1];
        const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (match) {
          const hours = parseInt(match[1] || "0", 10);
          const minutes = parseInt(match[2] || "0", 10);
          const seconds = parseInt(match[3] || "0", 10);
          durationSeconds = hours * 3600 + minutes * 60 + seconds;
        }
      }
    }

    // Convert to timecode (MM:SS or HH:MM:SS)
    let durationFormatted = "";
    if (durationSeconds !== null) {
      const hours = Math.floor(durationSeconds / 3600);
      const minutes = Math.floor((durationSeconds % 3600) / 60);
      const seconds = durationSeconds % 60;
      const pad = (num: number) => String(num).padStart(2, "0");
      if (hours > 0) {
        durationFormatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
      } else {
        durationFormatted = `${pad(minutes)}:${pad(seconds)}`;
      }
    }

    // 2. Extract title (optional bonus!)
    const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
                       html.match(/<meta\s+content="([^"]+)"\s+property="og:title"/i);
    const title = titleMatch ? titleMatch[1] : null;

    res.json({
      success: true,
      videoId: ytId,
      title: title ? title.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'") : null,
      durationSeconds,
      duration: durationFormatted
    });

  } catch (error: any) {
    console.error("Error in /api/youtube-info:", error);
    res.status(500).json({ error: error?.message || "Internal Server Error" });
  }
});

// REST API for Portfolio chatbot representative
app.post("/api/chat", async (req, res) => {

  try {
    const { messages, profile } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages array." });
    }

    // Default profile if not provided
    const userProfile = profile || {
      name: "TRẦN QUỐC VINH",
      role: "Editor & Videographer",
      location: "Hà Nội, Việt Nam",
      skills: [],
      projects: [],
      experiences: []
    };

    const ai = getAiClient();

    if (!ai) {
      // Graceful fallback if no API key is set yet
      const lastMessage = messages[messages.length - 1]?.content || "";
      const text = `[Chế độ Mô phỏng - Chưa kết nối Gemini API]: Cảm ơn bạn đã hỏi về "${lastMessage}". Tôi là trợ lý ảo của ${userProfile.name}. Để trò chuyện trực tiếp với tôi bằng trí tuệ nhân tạo thực thụ, vui lòng nhập khóa GEMINI_API_KEY trong tab Settings > Secrets của không gian AI Studio!`;
      return res.json({ text });
    }

    // Prepare system instructions with current user profile details
    const systemInstruction = `
Bạn là một Trợ lý AI đại diện siêu chuyên nghiệp và thông minh của nhà làm phim, dựng phim (Editor & Videographer) tên là ${userProfile.name}.
Hiện tại ${userProfile.name} đang ứng tuyển hoặc giới thiệu bản thân qua Landing Page Portfolio này.
Vai trò của bạn: Trả lời mọi câu hỏi của nhà tuyển dụng, đối tác và khách truy cập về kỹ năng hậu kỳ, quay dựng, các dự án video, phong cách làm phim và thông tin của ${userProfile.name} dựa trên thông tin hồ sơ dưới đây.

Hồ sơ cá nhân của ${userProfile.name}:
- Chức danh/Vai trò: ${userProfile.role}
- Slogan/Mô tả ngắn: ${userProfile.subtitle}
- Tóm tắt về tôi: ${userProfile.aboutMini}
- Địa điểm: ${userProfile.location}
- Email: ${userProfile.email}
- Số điện thoại: ${userProfile.phone}
- GitHub: ${userProfile.github}
- LinkedIn: ${userProfile.linkedin}
- Telegram: ${userProfile.telegram || "N/A"}

Danh sách kỹ năng:
${(userProfile.skills || []).map((s: any) => `- Kỹ năng: ${s.name} (Cấp độ: ${s.level}/100) - Phân loại: ${s.category}`).join("\n")}

Danh sách dự án tiêu biểu:
${(userProfile.projects || []).map((p: any) => `- Dự án: ${p.title}\n  Mô tả: ${p.description}\n  Công nghệ: ${p.tags.join(", ")}\n  Link: ${p.link || "N/A"}`).join("\n")}

Lịch sử kinh nghiệm:
${(userProfile.experiences || []).map((e: any) => `- Thơi kỳ: ${e.period}\n  Vai trò: ${e.role} tại ${e.company}\n  Mô tả: ${e.description}\n  Công nghệ áp dụng: ${e.skills.join(", ")}`).join("\n")}

Nguyên tắc trả lời:
- Hãy xưng hô thân thiện, lịch sự bằng tiếng Việt (hoặc tiếng Anh nếu người dùng bắt đầu nói tiếng Anh).
- Trả lời trung thực đúng theo thông tin hồ sơ bên trên. Nếu thông tin không có trong hồ sơ hoặc mang tính riêng tư/ngoài lề, hãy trả lời khéo léo, dí dỏm và hướng khách truy cập liên hệ trực tiếp với ${userProfile.name} qua email (${userProfile.email}) hoặc số điện thoại.
- Trả lời cô đọng, định dạng markdown đẹp mắt (bôi đen, danh sách), tránh dài dòng lan man. 
- Giới thiệu bản thân là "Trợ lý ảo thông minh của ${userProfile.name}".
`;

    // Format historical messages for Gemini API contents
    // Gemini contents accepts roles: "user" | "model"
    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" as const : "user" as const,
      parts: [{ text: m.content }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.75,
      }
    });

    const text = response.text || "Xin lỗi, tôi chưa thể tìm ra câu trả lời phù hợp nhất.";
    res.json({ text });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error?.message || "Internal Server Error in Gemini API representative chatbot routing." });
  }
});

// Configure Vite middleware or static folder serving
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode with Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production mode - Serve built static files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server Portfolio running on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
