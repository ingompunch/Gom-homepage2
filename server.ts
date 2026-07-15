import { readFileSync } from "fs";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import fs from "fs/promises";

const firebaseConfig = JSON.parse(
  readFileSync(path.resolve(process.cwd(), "firebase-applet-config.json"), "utf8")
);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Function to inject meta tags into HTML using Firestore REST API
  async function getAppHtml(originalHtml: string) {
    let content: any = {};
    
    try {
      const projectId = firebaseConfig.projectId;
      const dbId = firebaseConfig.firestoreDatabaseId || "(default)";
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/content/main`;
      
      const response = await axios.get(url, { timeout: 3000 });
      const fields = response.data.fields || {};
      
      content = {
        ogTitle: fields.ogTitle?.stringValue,
        ogDescription: fields.ogDescription?.stringValue,
        ogImage: fields.ogImage?.stringValue,
        faviconUrl: fields.faviconUrl?.stringValue
      };
      
      console.log(`[SEO] Successfully fetched meta tags from Firestore. Data:`, {
        title: content.ogTitle,
        desc: content.ogDescription,
        image: content.ogImage
      });
    } catch (error: any) {
      console.warn("[SEO] Firestore REST fetch skipped/failed (using default/fallback tags):", error.message);
    }

    try {
      let html = originalHtml;
      
      const title = content.ogTitle || "곰애드 | AI 기반 종합 광고대행사";
      const desc = content.ogDescription || "귀사의 압도적 성장을 설계하는 전략 파트너.";
      const image = content.ogImage || "https://images.unsplash.com/photo-1550745165-9bc0b25272a7?q=80&w=2070&auto=format&fit=crop";
      
      // Update Title
      html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
      
      // Update Description
      html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${desc}" />`);
      
      // Update OG Tags
      html = html.replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${title}" />`);
      html = html.replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${desc}" />`);
      html = html.replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${image}" />`);
      
      // Update Twitter Tags
      html = html.replace(/<meta\s+property="twitter:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="twitter:title" content="${title}" />`);
      html = html.replace(/<meta\s+property="twitter:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="twitter:description" content="${desc}" />`);
      html = html.replace(/<meta\s+property="twitter:image"\s+content="[^"]*"\s*\/?>/i, `<meta property="twitter:image" content="${image}" />`);
      
      // Update Favicon if exists
      if (content.faviconUrl) {
        html = html.replace(/<link\s+rel="icon"\s+href="[^"]*"\s*\/?>/i, `<link rel="icon" href="${content.faviconUrl}" />`);
      }
      
      return html;
    } catch (error) {
      console.error("[SEO] Error constructing final SEO HTML:", error);
      return originalHtml;
    }
  }

  // API routes go here FIRST

  // Telegram Notification API
  app.post("/api/notify", async (req, res) => {
    try {
      const { name, contact, message } = req.body;
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;

      if (!botToken || !chatId) {
        console.warn("Telegram credentials not configured, skipping notification.");
        return res.json({ success: false, error: "Not configured" });
      }

      const telegramMessage = `🔔 [곰애드 새 문의 도착]\n\n👤 성함: ${name}\n📞 연락처: ${contact}\n📝 내용: ${message}`;

      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: telegramMessage
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Telegram Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // AI Chat API
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key is not configured" });
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: `당신은 종합 광고대행사 '곰애드(GOM AD)'의 전문 상담원입니다. 
        우직하고 신뢰감 있는 말투를 사용하세요. 
        브랜딩, 온라인 광고(네이버, 유튜브, 메타, 구글), 오프라인 광고(지하철, 버스, 전광판), 홈페이지 제작에 대해 전문적으로 답변하세요.
        답변은 친절하게 하되 너무 길지 않게 핵심 위주로 하세요.
        답변 끝에는 필요시 상세 상담 링크(https://litt.ly/gom_ads)를 안내하세요.`
      });
      
      const chat = model.startChat({
        history: history || [],
        generationConfig: {
          maxOutputTokens: 500,
        },
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      const text = response.text();

      res.json({ text });
    } catch (error: any) {
      console.error("AI Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom", // Switch to custom to handle index.html manually
    });
    
    app.use(vite.middlewares);

    app.get('*all', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = await fs.readFile(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        const html = await getAppHtml(template);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false })); // Don't serve index.html automatically
    app.get('*all', async (req, res) => {
      const template = await fs.readFile(path.join(distPath, 'index.html'), 'utf-8');
      const html = await getAppHtml(template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server (GOM AD AI) running on http://localhost:${PORT}`);
  });
}

startServer();
