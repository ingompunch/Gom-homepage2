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
      
      const title = content.ogTitle || "곰애드 | AI 기반 온·오프라인 통합 종합 광고대행사";
      const desc = content.ogDescription || "인공지능(AI) 데이터 기반의 고성능 마케팅 솔루션을 제공하는 종합 광고대행사 곰애드. 네이버, 구글, 메타(인스타그램), 유튜브 온라인 마케팅과 지하철, 버스, 엘리베이터, 도심 전광판 오프라인 광고 및 브랜드 홈페이지 기획·제작까지 귀사의 매출 성장을 책임지는 최상의 파트너입니다.";
      const image = content.ogImage || "https://gomad.co.kr/gom5.png";
      
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
      
      // Inject Schema.org JSON-LD Structured Data for AEO / GEO (Organization & FAQPage)
      const schemaMarkup = `
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "곰애드 (GOM AD)",
      "url": "https://gomad.co.kr",
      "logo": "https://gomad.co.kr/gom5.png",
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "${content.contactEmail || 'ingompunch@gmail.com'}",
        "contactType": "customer service"
      },
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "자연대로 29, 15층",
        "addressLocality": "중구",
        "addressRegion": "인천광역시",
        "addressCountry": "KR"
      },
      "description": "${desc}"
    }
    </script>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "곰애드는 어떤 광고대행사인가요?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "곰애드(GOM AD)는 인공지능(AI)과 빅데이터 분석을 토대로 기획부터 실행, 성과 측정까지 원스톱으로 지원하는 종합 광고대행사입니다. 온라인 마케팅, 오프라인 미디어 광고, 웹사이트 및 브랜딩 전략을 전방위적으로 지원합니다."
          }
        },
        {
          "@type": "Question",
          "name": "어떤 광고 채널을 집행할 수 있나요?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "네이버, 구글, 메타(인스타그램), 유튜브 등의 온라인 광고는 물론이고, 지하철, 버스, 엘리베이터 전광판(포커스미디어) 등의 밀착형 오프라인 광고, 그리고 공중파/종편/IPTV TV 광고까지 통합적인 집행이 가능합니다."
          }
        },
        {
          "@type": "Question",
          "name": "상담 및 문의 절차는 어떻게 되나요?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "홈페이지의 문의하기(Inquiry) 폼을 작성해 주시거나 카카오톡 채널 상담 링크를 통해 문의 주시면, 데이터 분석가와 전문 광고 기획자가 담당으로 매칭되어 무료 맞춤 컨설팅 및 제안서를 전달 드립니다."
          }
        }
      ]
    }
    </script>
    </head>`;
      html = html.replace(/<\/head>/i, schemaMarkup);

      // Pre-rendered SEO Semantic HTML Content Block
      const preRenderedContent = `
    <div id="root">
      <!-- SEO Pre-rendered Content Fallback for Web Crawlers -->
      <header style="padding: 20px; background: #000; color: #fff; display: flex; justify-content: space-between; align-items: center; font-family: sans-serif;">
        <div style="font-weight: 900; font-size: 24px; letter-spacing: -1px;">GOM AD</div>
        <nav style="display: flex; gap: 20px; font-weight: 600; font-size: 14px;">
          <a href="#philosophy" style="color: #fff; text-decoration: none;">Philosophy</a>
          <a href="#capability" style="color: #fff; text-decoration: none;">Business Solutions</a>
          <a href="#portfolio" style="color: #fff; text-decoration: none;">Portfolio</a>
          <a href="#process" style="color: #fff; text-decoration: none;">Work Process</a>
          <a href="#contact" style="color: #fff; text-decoration: none; background: #D97757; padding: 8px 16px; border-radius: 4px;">Inquiry</a>
        </nav>
      </header>

      <main style="font-family: sans-serif; color: #111; background: #fcfcfc; line-height: 1.6;">
        <!-- Hero Section -->
        <section style="padding: 100px 20px; text-align: center; background: #f4f4f5; border-bottom: 1px solid #e4e4e7;">
          <span style="color: #D97757; font-weight: 900; font-size: 12px; letter-spacing: 4px; text-transform: uppercase;">AI PERFORMANCE GROUP</span>
          <h1 style="font-size: 48px; font-weight: 800; margin: 20px 0; color: #000; line-height: 1.2;">AI 최적화 종합 광고대행사<br/>곰애드 (GOM AD)</h1>
          <p style="font-size: 18px; max-width: 800px; margin: 0 auto 40px auto; color: #71717a;">
            데이터에 기반한 압도적 성장 파트너십. 신화 속 곰처럼 우직한 믿음과 끈기로 귀사의 성공을 완주합니다. 브랜딩, 온라인/오프라인 통합 마케팅, 홈페이지 개발을 책임집니다.
          </p>
          <div style="display: flex; justify-content: center; gap: 15px;">
            <a href="#contact" style="background: #000; color: #fff; padding: 15px 30px; text-decoration: none; font-weight: bold;">상담 신청하기</a>
            <a href="#capability" style="background: #fff; color: #000; border: 1px solid #d4d4d8; padding: 15px 30px; text-decoration: none; font-weight: bold;">핵심 솔루션 보기</a>
          </div>
        </section>

        <!-- Philosophy Section -->
        <section id="philosophy" style="padding: 80px 20px; max-width: 1200px; margin: 0 auto;">
          <h2 style="font-size: 32px; font-weight: 800; text-transform: uppercase; margin-bottom: 40px;">WE MOVE YOUR <span style="color: #D97757;">BUSINESS FORWARD</span></h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px;">
            <div style="border-left: 4px solid #D97757; padding-left: 20px;">
              <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 10px;">01. 시장 중심 전략</h3>
              <p style="color: #71717a;">고객사의 타겟 시장을 철저히 분석하고 가용 데이터를 기반으로 하여 가장 효과적인 매체 믹스 및 마케팅 전략 방향을 설계합니다.</p>
            </div>
            <div style="border-left: 4px solid #D97757; padding-left: 20px;">
              <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 10px;">02. 성과 기반 크리에이티브</h3>
              <p style="color: #71717a;">단순히 예쁜 디자인에 그치지 않고, 잠재 고객의 심리를 관통하여 실질적인 전환(매출)을 촉진하는 카피와 비주얼 소재를 제작합니다.</p>
            </div>
            <div style="border-left: 4px solid #D97757; padding-left: 20px;">
              <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 10px;">03. 데이터 최적화 프로세스</h3>
              <p style="color: #71717a;">집행되는 모든 온·오프라인 광고 캠페인의 수치를 상시 트래킹하며 낭비되는 예산 없이 극대화된 ROAS 성과를 추적 보장합니다.</p>
            </div>
          </div>
        </section>

        <!-- Solutions Section -->
        <section id="capability" style="padding: 80px 20px; background: #f4f4f5;">
          <div style="max-width: 1200px; margin: 0 auto;">
            <h2 style="font-size: 36px; font-weight: 800; margin-bottom: 20px;">BUSINESS <span style="color: #D97757;">SOLUTIONS</span></h2>
            <p style="color: #71717a; font-size: 16px; margin-bottom: 40px;">전 채널을 정밀 타겟팅하는 곰애드의 맞춤 마케팅 핵심 비즈니스 포트폴리오입니다.</p>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px;">
              <div style="background: #fff; padding: 30px; border: 1px solid #e4e4e7; border-radius: 8px;">
                <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #D97757;">브랜딩 (Branding)</h3>
                <p style="font-size: 14px; color: #71717a; margin-bottom: 10px;">채널 진단 및 컨설팅을 통해 최적의 아이덴티티와 전략 방향성을 수립하고 안정적으로 기업 브랜딩을 운영합니다.</p>
              </div>
              <div style="background: #fff; padding: 30px; border: 1px solid #e4e4e7; border-radius: 8px;">
                <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #D97757;">홈페이지 기획 및 제작</h3>
                <p style="font-size: 14px; color: #71717a; margin-bottom: 10px;">분석, UX/UI 기획, 최신 웹 표준 기술 반응형 레이아웃 구축, 그리고 철저한 사후 유지보수 관리까지 올인원으로 구축합니다.</p>
              </div>
              <div style="background: #fff; padding: 30px; border: 1px solid #e4e4e7; border-radius: 8px;">
                <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #D97757;">온라인 광고 마케팅</h3>
                <p style="font-size: 14px; color: #71717a; margin-bottom: 10px;">Naver 스마트 플레이스 및 파워링크, YouTube 맞춤형 영상 프리롤 기획, Meta(페이스북/인스타그램) 타겟 퍼포먼스 광고, Google 검색광고 및 GDN, 언론 홍보 기사 송출을 아우릅니다.</p>
              </div>
              <div style="background: #fff; padding: 30px; border: 1px solid #e4e4e7; border-radius: 8px;">
                <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #D97757;">오프라인 대중매체 광고</h3>
                <p style="font-size: 14px; color: #71717a; margin-bottom: 10px;">주요 역사 스크린도어 지하철 광고, 움직이는 랩핑 버스 및 정류장 광고, 도심 초대형 빌딩 미디어 전광판 송출, 아파트 엘리베이터 생활 밀착형 포커스미디어 광고를 전담합니다.</p>
              </div>
              <div style="background: #fff; padding: 30px; border: 1px solid #e4e4e7; border-radius: 8px;">
                <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #D97757;">TV 미디어 광고</h3>
                <p style="font-size: 14px; color: #71717a; margin-bottom: 10px;">공중파(KBS, MBC, SBS), 주요 종합편성채널(JTBC, MBN, TV조선), 그리고 정밀 송출이 가능한 주요 IPTV 전후방 광고를 대행합니다.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Metrics Section -->
        <section style="padding: 80px 20px; text-align: center; max-width: 1200px; margin: 0 auto;">
          <h2 style="font-size: 28px; font-weight: 800; margin-bottom: 40px; text-transform: uppercase;">NUMBERS OF <span style="color: #D97757;">GROWTH</span></h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 40px;">
            <div>
              <div style="font-size: 64px; font-weight: 900; color: #000;">12M+</div>
              <div style="font-weight: bold; font-size: 14px; margin-top: 10px;">CAMPAIGN REACH</div>
              <div style="color: #a1a1aa; font-size: 11px;">Accumulated Exposure</div>
            </div>
            <div>
              <div style="font-size: 64px; font-weight: 900; color: #000;">+180%</div>
              <div style="font-weight: bold; font-size: 14px; margin-top: 10px;">CONVERSION GROWTH</div>
              <div style="color: #a1a1aa; font-size: 11px;">Performance Peak</div>
            </div>
            <div>
              <div style="font-size: 64px; font-weight: 900; color: #000;">3X</div>
              <div style="font-weight: bold; font-size: 14px; margin-top: 10px;">CLIENT AVERAGE GROWTH</div>
              <div style="color: #a1a1aa; font-size: 11px;">Revenue Multiplier</div>
            </div>
          </div>
        </section>

        <!-- Work Process -->
        <section id="process" style="padding: 80px 20px; background: #fff;">
          <div style="max-width: 1200px; margin: 0 auto;">
            <h2 style="font-size: 32px; font-weight: 800; margin-bottom: 40px; text-transform: uppercase;">WORK <span style="color: #D97757;">PROCESS</span></h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px;">
              <div style="background: #f4f4f5; padding: 30px;">
                <div style="font-size: 24px; font-weight: bold; color: #D97757;">01</div>
                <h3 style="font-size: 18px; font-weight: bold; margin: 15px 0;">Planning & Strategy</h3>
                <p style="font-size: 14px; color: #71717a;">철저한 잠재고객 데이터 분석을 통한 키워드 추출과 맞춤 매체 믹스 플래닝 단계를 수행합니다.</p>
              </div>
              <div style="background: #f4f4f5; padding: 30px;">
                <div style="font-size: 24px; font-weight: bold; color: #D97757;">02</div>
                <h3 style="font-size: 18px; font-weight: bold; margin: 15px 0;">Content Creation</h3>
                <p style="font-size: 14px; color: #71717a;">타겟 고객의 유입을 유도하는 고퀄리티 비주얼 소재, 카피 라이팅 및 크리에이티브 시안 디자인 제작 단계입니다.</p>
              </div>
              <div style="background: #f4f4f5; padding: 30px;">
                <div style="font-size: 24px; font-weight: bold; color: #D97757;">03</div>
                <h3 style="font-size: 18px; font-weight: bold; margin: 15px 0;">Campaign Execution</h3>
                <p style="font-size: 14px; color: #71717a;">세분화된 타겟팅 조건에 맞춰 정밀하게 미디어 믹스를 집행하고 트래킹 코드로 성과 유입 데이터를 축적합니다.</p>
              </div>
              <div style="background: #f4f4f5; padding: 30px;">
                <div style="font-size: 24px; font-weight: bold; color: #D97757;">04</div>
                <h3 style="font-size: 18px; font-weight: bold; margin: 15px 0;">Analysis & Report</h3>
                <p style="font-size: 14px; color: #71717a;">캠페인 전체 지표를 면밀하게 분석한 대시보드 성과 리포트를 제공하며, 광고 효율 극대화를 위해 후속 전략 고도화를 진행합니다.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- FAQ Section for Search Engine / Rich Result -->
        <section style="padding: 80px 20px; background: #f4f4f5;">
          <div style="max-width: 800px; margin: 0 auto;">
            <h2 style="font-size: 28px; font-weight: 800; text-align: center; margin-bottom: 40px;">자주 묻는 질문 (FAQ)</h2>
            <div style="display: flex; flex-direction: column; gap: 20px;">
              <div style="background: #fff; padding: 25px; border-radius: 8px;">
                <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #000;">Q. 곰애드는 어떤 광고대행사인가요?</h3>
                <p style="color: #52525b; font-size: 15px;">A. 곰애드(GOM AD)는 AI 기반 데이터 분석 기술을 바탕으로 브랜드 전략 컨설팅, 온·오프라인 통합 마케팅, 홈페이지 제작, TV 및 지상공파 광고 등을 대행하는 프리미엄 종합 마케팅 기획사입니다. 우직하고 투명한 관리로 비즈니스 동반 성장을 이끌어 냅니다.</p>
              </div>
              <div style="background: #fff; padding: 25px; border-radius: 8px; margin-top: 15px;">
                <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #000;">Q. 대행 가능한 주요 매체는 무엇이 있나요?</h3>
                <p style="color: #52525b; font-size: 15px;">A. 온라인 매체(네이버 플레이스/블로그, 구글 검색/GDN, 유튜브 크리에이티브 프리롤, 인스타그램/페이스북 SNS 광고, 미디어 보도 송출) 및 다양한 생활 밀착형 오프라인 채널(지하철 스크린도어, 서울/경기 시내버스 랩핑, 엘리베이터 포커스미디어 전광판, 도심 전광판) 그리고 공중파 및 종편 TV 채널을 모두 지원합니다.</p>
              </div>
              <div style="background: #fff; padding: 25px; border-radius: 8px; margin-top: 15px;">
                <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #000;">Q. 광고 성과 관리 및 리포트는 어떻게 제공되나요?</h3>
                <p style="color: #52525b; font-size: 15px;">A. 광고 집행 직후 고유 추적 코드를 설계해 효율 데이터를 실시간으로 모니터링하며 지속적으로 캠페인을 세부 튜닝합니다. 종료 시에는 한눈에 알아볼 수 있는 투명하고 정교한 지표 분석 성과 대시보드 리포트를 제공해 다음 단계 마케팅 예산 및 전략 컨설팅을 진행합니다.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Final Contact -->
        <section id="contact" style="padding: 100px 20px; background: #000; color: #fff; text-align: center;">
          <h2 style="font-size: 36px; font-weight: 800; margin-bottom: 20px; text-transform: uppercase;">상담 문의 및 무료 컨설팅 신청</h2>
          <p style="max-width: 600px; margin: 0 auto 40px auto; color: #a1a1aa; font-size: 16px;">
            성공적인 브랜딩과 전환 최적화를 위한 첫 단계, 지금 곰애드의 빅데이터 무료 진단 상담과 최적의 미디어 제안을 받아보세요. 담당 에이전트가 신속히 지원해 드립니다.
          </p>
          <a href="https://litt.ly/gom_ads" target="_blank" style="background: #D97757; color: #fff; padding: 18px 40px; font-weight: 900; text-decoration: none; font-size: 15px; letter-spacing: 1px;">GOM AD 1:1 맞춤 상담 신청</a>
        </section>
      </main>

      <footer style="background: #fff; color: #52525b; padding: 60px 20px; font-size: 13px; border-top: 1px solid #e4e4e7; font-family: sans-serif;">
        <div style="max-width: 1200px; margin: 0 auto; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 40px;">
          <div>
            <div style="font-weight: 900; font-size: 18px; color: #000; margin-bottom: 15px;">GOM AD</div>
            <p>(주)곰애드   |   대표이사 : GOM AD   |   사업자등록번호 : 000-00-00000</p>
            <p>이메일 : ingompunch@gmail.com   |   주소: 인천광역시 중구 자연대로 29, 15층</p>
          </div>
          <div style="font-size: 12px; color: #a1a1aa; align-self: flex-end;">
            COPYRIGHT © GOM AD. ALL RIGHTS RESERVED.
          </div>
        </div>
      </footer>
    </div>`;

      html = html.replace(/<div id="root">[\s\S]*?<\/div>\s*<\/div>/i, preRenderedContent);
      
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
