import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server (GOM AD AI) running on http://localhost:${PORT}`);
  });
}

startServer();
