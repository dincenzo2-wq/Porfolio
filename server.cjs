var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");
var import_vite = require("vite");
import_dotenv.default.config();
var app = (0, import_express.default)();
app.use(import_express.default.json());
var PORT = 3e3;
var aiClient = null;
function getAiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("\u26A0\uFE0F GEMINI_API_KEY is not defined. AI Chat representative will run in mock mode.");
      return null;
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
function extractYouTubeId(url) {
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
  const match = trimmed.match(/[?&]v=([^&#]+)/);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}
app.get("/api/youtube-info", async (req, res) => {
  try {
    const queryUrl = req.query.url;
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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    if (!response.ok) {
      return res.status(502).json({ error: `Failed to fetch YouTube page. Status code: ${response.status}` });
    }
    const html = await response.text();
    let durationSeconds = null;
    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
    if (playerResponseMatch) {
      try {
        const lengthSecondsMatch = playerResponseMatch[1].match(/"lengthSeconds"\s*:\s*"(\d+)"/);
        if (lengthSecondsMatch) {
          durationSeconds = parseInt(lengthSecondsMatch[1], 10);
        }
      } catch (e) {
      }
    }
    if (durationSeconds === null) {
      const itemPropMatch = html.match(/<meta\s+itemprop="duration"\s+content="([^"]+)"/i) || html.match(/<meta\s+content="([^"]+)"\s+itemprop="duration"/i);
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
    let durationFormatted = "";
    if (durationSeconds !== null) {
      const hours = Math.floor(durationSeconds / 3600);
      const minutes = Math.floor(durationSeconds % 3600 / 60);
      const seconds = durationSeconds % 60;
      const pad = (num) => String(num).padStart(2, "0");
      if (hours > 0) {
        durationFormatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
      } else {
        durationFormatted = `${pad(minutes)}:${pad(seconds)}`;
      }
    }
    const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) || html.match(/<meta\s+content="([^"]+)"\s+property="og:title"/i);
    const title = titleMatch ? titleMatch[1] : null;
    res.json({
      success: true,
      videoId: ytId,
      title: title ? title.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'") : null,
      durationSeconds,
      duration: durationFormatted
    });
  } catch (error) {
    console.error("Error in /api/youtube-info:", error);
    res.status(500).json({ error: error?.message || "Internal Server Error" });
  }
});
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, profile } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages array." });
    }
    const userProfile = profile || {
      name: "TR\u1EA6N QU\u1ED0C VINH",
      role: "Editor & Videographer",
      location: "H\xE0 N\u1ED9i, Vi\u1EC7t Nam",
      skills: [],
      projects: [],
      experiences: []
    };
    const ai = getAiClient();
    if (!ai) {
      const lastMessage = messages[messages.length - 1]?.content || "";
      const text2 = `[Ch\u1EBF \u0111\u1ED9 M\xF4 ph\u1ECFng - Ch\u01B0a k\u1EBFt n\u1ED1i Gemini API]: C\u1EA3m \u01A1n b\u1EA1n \u0111\xE3 h\u1ECFi v\u1EC1 "${lastMessage}". T\xF4i l\xE0 tr\u1EE3 l\xFD \u1EA3o c\u1EE7a ${userProfile.name}. \u0110\u1EC3 tr\xF2 chuy\u1EC7n tr\u1EF1c ti\u1EBFp v\u1EDBi t\xF4i b\u1EB1ng tr\xED tu\u1EC7 nh\xE2n t\u1EA1o th\u1EF1c th\u1EE5, vui l\xF2ng nh\u1EADp kh\xF3a GEMINI_API_KEY trong tab Settings > Secrets c\u1EE7a kh\xF4ng gian AI Studio!`;
      return res.json({ text: text2 });
    }
    const systemInstruction = `
B\u1EA1n l\xE0 m\u1ED9t Tr\u1EE3 l\xFD AI \u0111\u1EA1i di\u1EC7n si\xEAu chuy\xEAn nghi\u1EC7p v\xE0 th\xF4ng minh c\u1EE7a nh\xE0 l\xE0m phim, d\u1EF1ng phim (Editor & Videographer) t\xEAn l\xE0 ${userProfile.name}.
Hi\u1EC7n t\u1EA1i ${userProfile.name} \u0111ang \u1EE9ng tuy\u1EC3n ho\u1EB7c gi\u1EDBi thi\u1EC7u b\u1EA3n th\xE2n qua Landing Page Portfolio n\xE0y.
Vai tr\xF2 c\u1EE7a b\u1EA1n: Tr\u1EA3 l\u1EDDi m\u1ECDi c\xE2u h\u1ECFi c\u1EE7a nh\xE0 tuy\u1EC3n d\u1EE5ng, \u0111\u1ED1i t\xE1c v\xE0 kh\xE1ch truy c\u1EADp v\u1EC1 k\u1EF9 n\u0103ng h\u1EADu k\u1EF3, quay d\u1EF1ng, c\xE1c d\u1EF1 \xE1n video, phong c\xE1ch l\xE0m phim v\xE0 th\xF4ng tin c\u1EE7a ${userProfile.name} d\u1EF1a tr\xEAn th\xF4ng tin h\u1ED3 s\u01A1 d\u01B0\u1EDBi \u0111\xE2y.

H\u1ED3 s\u01A1 c\xE1 nh\xE2n c\u1EE7a ${userProfile.name}:
- Ch\u1EE9c danh/Vai tr\xF2: ${userProfile.role}
- Slogan/M\xF4 t\u1EA3 ng\u1EAFn: ${userProfile.subtitle}
- T\xF3m t\u1EAFt v\u1EC1 t\xF4i: ${userProfile.aboutMini}
- \u0110\u1ECBa \u0111i\u1EC3m: ${userProfile.location}
- Email: ${userProfile.email}
- S\u1ED1 \u0111i\u1EC7n tho\u1EA1i: ${userProfile.phone}
- GitHub: ${userProfile.github}
- LinkedIn: ${userProfile.linkedin}
- Telegram: ${userProfile.telegram || "N/A"}

Danh s\xE1ch k\u1EF9 n\u0103ng:
${(userProfile.skills || []).map((s) => `- K\u1EF9 n\u0103ng: ${s.name} (C\u1EA5p \u0111\u1ED9: ${s.level}/100) - Ph\xE2n lo\u1EA1i: ${s.category}`).join("\n")}

Danh s\xE1ch d\u1EF1 \xE1n ti\xEAu bi\u1EC3u:
${(userProfile.projects || []).map((p) => `- D\u1EF1 \xE1n: ${p.title}
  M\xF4 t\u1EA3: ${p.description}
  C\xF4ng ngh\u1EC7: ${p.tags.join(", ")}
  Link: ${p.link || "N/A"}`).join("\n")}

L\u1ECBch s\u1EED kinh nghi\u1EC7m:
${(userProfile.experiences || []).map((e) => `- Th\u01A1i k\u1EF3: ${e.period}
  Vai tr\xF2: ${e.role} t\u1EA1i ${e.company}
  M\xF4 t\u1EA3: ${e.description}
  C\xF4ng ngh\u1EC7 \xE1p d\u1EE5ng: ${e.skills.join(", ")}`).join("\n")}

Nguy\xEAn t\u1EAFc tr\u1EA3 l\u1EDDi:
- H\xE3y x\u01B0ng h\xF4 th\xE2n thi\u1EC7n, l\u1ECBch s\u1EF1 b\u1EB1ng ti\u1EBFng Vi\u1EC7t (ho\u1EB7c ti\u1EBFng Anh n\u1EBFu ng\u01B0\u1EDDi d\xF9ng b\u1EAFt \u0111\u1EA7u n\xF3i ti\u1EBFng Anh).
- Tr\u1EA3 l\u1EDDi trung th\u1EF1c \u0111\xFAng theo th\xF4ng tin h\u1ED3 s\u01A1 b\xEAn tr\xEAn. N\u1EBFu th\xF4ng tin kh\xF4ng c\xF3 trong h\u1ED3 s\u01A1 ho\u1EB7c mang t\xEDnh ri\xEAng t\u01B0/ngo\xE0i l\u1EC1, h\xE3y tr\u1EA3 l\u1EDDi kh\xE9o l\xE9o, d\xED d\u1ECFm v\xE0 h\u01B0\u1EDBng kh\xE1ch truy c\u1EADp li\xEAn h\u1EC7 tr\u1EF1c ti\u1EBFp v\u1EDBi ${userProfile.name} qua email (${userProfile.email}) ho\u1EB7c s\u1ED1 \u0111i\u1EC7n tho\u1EA1i.
- Tr\u1EA3 l\u1EDDi c\xF4 \u0111\u1ECDng, \u0111\u1ECBnh d\u1EA1ng markdown \u0111\u1EB9p m\u1EAFt (b\xF4i \u0111en, danh s\xE1ch), tr\xE1nh d\xE0i d\xF2ng lan man. 
- Gi\u1EDBi thi\u1EC7u b\u1EA3n th\xE2n l\xE0 "Tr\u1EE3 l\xFD \u1EA3o th\xF4ng minh c\u1EE7a ${userProfile.name}".
`;
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.75
      }
    });
    const text = response.text || "Xin l\u1ED7i, t\xF4i ch\u01B0a th\u1EC3 t\xECm ra c\xE2u tr\u1EA3 l\u1EDDi ph\xF9 h\u1EE3p nh\u1EA5t.";
    res.json({ text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error?.message || "Internal Server Error in Gemini API representative chatbot routing." });
  }
});
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u{1F680} Server Portfolio running on http://0.0.0.0:${PORT}`);
  });
}
setupServer();
//# sourceMappingURL=server.cjs.map
