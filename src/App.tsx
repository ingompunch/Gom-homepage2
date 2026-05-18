// Version: 2.0.2 - Enhanced Admin Auth Persistence
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  BarChart3, 
  Lightbulb, 
  Megaphone, 
  MonitorPlay, 
  CheckCircle2, 
  Mail, 
  Phone, 
  MapPin,
  Download,
  Menu,
  X,
  Zap,
  Target,
  TrendingUp,
  Award,
  ChevronRight,
  Settings
} from 'lucide-react';
import { db, OperationType, handleFirestoreError, serverTimestamp } from './lib/firebase';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';
import { Counter } from './components/Counter';
import { Chatbot } from './components/Chatbot';
import { AdminDashboard } from './components/AdminDashboard';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

interface ServiceItem {
  name: string;
  detail: string;
}

interface ServiceCategory {
  title: string;
  img: string;
  items: ServiceItem[];
  points?: string[];
}

interface PortfolioItem {
  title: string;
  category: 'CONTENTS' | 'PERFORMANCE' | 'WEBSITE' | 'APP';
  img?: string;
  link?: string;
  videoUrl?: string;
}

interface GrowthMetric {
  label: string;
  value: number;
  suffix: string;
  metric: string;
  prefix: string;
  img?: string;
}

interface ProcessStep {
  title: string;
  desc: string;
  img?: string;
}

interface PartnerLogo {
  id: string;
  url: string;
  name: string;
}

interface SiteContent {
  logoUrl?: string;
  faviconUrl?: string;
  heroHeading: string;
  heroSubHeading: string;
  heroDescription: string;
  heroImage?: string;
  heroBgUrl?: string; // New field
  heroBgType?: 'IMAGE' | 'VIDEO'; // New field
  ogImage?: string; // Social share image
  ogTitle?: string; // Social share title
  ogDescription?: string; // Social share description
  contactEmail: string;
  kakaoWebhookUrl?: string;
  services?: ServiceCategory[];
  growthMetrics?: GrowthMetric[];
  portfolio?: PortfolioItem[];
  processes?: ProcessStep[];
  partnerLogos?: PartnerLogo[];
}

function MainSite() {
  const [showIntro, setShowIntro] = useState(true);
  const [activeBusinessTab, setActiveBusinessTab] = useState(0);
  const [formData, setFormData] = useState({ name: '', contact: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [siteContent, setSiteContent] = useState<SiteContent | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const path = 'inquiries';
    try {
      // 1. Save to Firestore directly from client
      const colRef = collection(db, "inquiries");
      const docRef = await addDoc(colRef, {
        ...formData,
        status: "new",
        createdAt: serverTimestamp(),
        source: "client-direct"
      });

      // 2. Send Telegram Notification directly from client for GitHub Pages compatibility
      try {
        const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || "8822493789:AAE_dlOKgpK0K9bQ3D_gurLVdH25Vkmysyc";
        const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID || "6837586034";
        const telegramMessage = `🔔 [곰애드 새 문의 도착]\n\n👤 성함: ${formData.name}\n📞 연락처: ${formData.contact}\n📝 내용: ${formData.message}`;

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: telegramMessage
          })
        });
      } catch (tgErr) {
        console.error("Telegram notification failed:", tgErr);
      }

      alert('상담 신청이 접수되었습니다. 곧 연락드리겠습니다!');
      setFormData({ name: '', contact: '', message: '' });
    } catch (error: any) {
      console.error('Submission error:', error);
      handleFirestoreError(error, OperationType.CREATE, path);
      alert(`접수 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [heroVideoId, setHeroVideoId] = useState<string | null>(null);

  useEffect(() => {
    // Extract video ID if it's a YouTube URL
    if (siteContent?.heroBgType === 'VIDEO' && siteContent?.heroBgUrl) {
      let id = null;
      if (siteContent.heroBgUrl.includes('youtu.be/')) {
        id = siteContent.heroBgUrl.split('youtu.be/')[1].split('?')[0];
      } else if (siteContent.heroBgUrl.includes('v=')) {
        id = siteContent.heroBgUrl.split('v=')[1].split('&')[0];
      } else if (siteContent.heroBgUrl.includes('/embed/')) {
        id = siteContent.heroBgUrl.split('/embed/')[1].split('?')[0];
      }
      setHeroVideoId(id);
    } else {
      setHeroVideoId(null);
    }
  }, [siteContent?.heroBgUrl, siteContent?.heroBgType]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    
    // Fetch dynamic content directly from Firestore
    const getContent = async () => {
      const path = 'content/main';
      try {
        const docRef = doc(db, "content", "main");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSiteContent(docSnap.data() as SiteContent);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
      }
    };

    getContent();

    // Dynamically update favicon if siteContent changes
    if (siteContent?.faviconUrl) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = siteContent.faviconUrl;
      } else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = siteContent.faviconUrl;
        document.head.appendChild(newLink);
      }
    }

    // Dynamically update Title and Meta Tags
    if (siteContent?.ogTitle) {
      document.title = siteContent.ogTitle;
    }

    if (siteContent?.ogDescription) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', siteContent.ogDescription);
    }

    return () => window.removeEventListener('scroll', handleScroll);
  }, [siteContent?.faviconUrl, siteContent?.ogTitle, siteContent?.ogDescription]);

  const businessAreas = [
    {
      title: '브랜딩',
      img: "https://images.unsplash.com/photo-1554941068-a252680d25d9?auto=format&fit=crop&q=80&w=2070",
      points: ['브랜드 컨셉에 맞는 채널 운영', '브랜드 컨설팅을 통한 전략 방향 제시']
    },
    {
      title: '홈페이지 제작',
      img: "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80&w=1964",
      points: ['분석·기획·구축까지 원스톱 진행', '디바이스 환경에 따른 디자인 최적화', '철저한 사후 관리와 유지보수']
    },
    {
      title: '오프라인 광고',
      img: "https://images.unsplash.com/photo-1617469165786-8007eda3caa7?auto=format&fit=crop&q=80&w=2070",
      items: [
        { name: '지하철', detail: '역사 내 전광판 및 스크린도어 광고를 통해 대중의 시선을 사로잡습니다.' },
        { name: '버스', detail: '움직이는 홍보대사, 버스 외부 및 내부 랩핑 광고로 노출을 극대화합니다.' },
        { name: '버스정류장', detail: '기다리는 시간 동안 소비자에게 확실한 브랜드 이미지를 각인시킵니다.' },
        { name: '전광판', detail: '주요 도심 빌딩 전광판 송출로 압도적인 스케일의 홍보를 진행합니다.' },
        { name: '포커스미디어', detail: '아파트 엘리베이터 생활 밀착형 광고로 정확한 타겟층을 공략합니다.' }
      ]
    },
    {
      title: '온라인 광고',
      img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2070",
      items: [
        { name: 'Naver', detail: '검색 노출부터 스마트 플레이스까지 네이버 생태계를 완력하게 점유합니다.' },
        { name: 'YouTube', detail: '영상 콘텐츠 기획부터 프리롤 광고까지 타겟 맞춤형 영상 마케팅을 제안합니다.' },
        { name: 'Meta', detail: 'Instagram과 Facebook 유저 데이터를 기반으로 고효율 퍼포먼스 광고를 집행합니다.' },
        { name: 'Google', detail: 'GDN 및 검색 광고를 통해 전 세계 유저에게 브랜드 메시지를 전달합니다.' },
        { name: '언론송출', detail: '신뢰도 높은 기사 송출로 공식적인 브랜드 이미지를 구축하고 신뢰를 확보합니다.' }
      ]
    },
    {
      title: 'TV 광고',
      img: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=2070",
      items: [
        { name: '공중파', detail: 'KBS, MBC, SBS 등 주요 방송사를 통한 전국적인 도달율을 확보합니다.' },
        { name: '종편', detail: 'JTBC, TV조선 등 타겟 시청층이 명확한 채널을 활용합니다.' },
        { name: 'IPTV', detail: 'KT, SK, LG 등 선호 프로그램 전후에 광고를 노출합니다.' }
      ]
    }
  ];

  const displayServices = (siteContent?.services && siteContent.services.length > 0) ? siteContent.services : businessAreas;

  const defaultGrowthMetrics = [
    { label: "Campaign Reach", value: 12, suffix: "M+", metric: "Accumulated Exposure", prefix: "" },
    { label: "Conversion Growth", value: 180, prefix: "+", suffix: "%", metric: "Performance Peak" },
    { label: "Client Average Growth", value: 3, suffix: "X", metric: "Revenue Multiplier", prefix: "" }
  ];
  const displayGrowthMetrics = (siteContent?.growthMetrics && siteContent.growthMetrics.length > 0) ? siteContent.growthMetrics : defaultGrowthMetrics;

  const defaultPortfolio: PortfolioItem[] = [
    { title: "GOM Contents 01", category: "CONTENTS", videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    { title: "GOM Performance 02", category: "PERFORMANCE", img: "https://images.unsplash.com/photo-1516062423079-7ca13cdc7f5a?auto=format&fit=crop&q=80&w=2070", link: "https://gomad.co.kr" },
    { title: "GOM Website 03", category: "WEBSITE", img: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=2071&auto=format&fit=crop", link: "https://gomad.co.kr" },
    { title: "GOM App 04", category: "APP", img: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop", link: "https://gomad.co.kr" }
  ];
  const displayPortfolio = (siteContent?.portfolio && siteContent.portfolio.length > 0) ? siteContent.portfolio : defaultPortfolio;

  const [portfolioFilter, setPortfolioFilter] = useState('ALL');

  const filteredPortfolio = portfolioFilter === 'ALL' 
    ? displayPortfolio 
    : displayPortfolio.filter(p => p.category === portfolioFilter);

  const defaultProcess = [
    { title: "Planning & Strategy", desc: "데이터 분석을 통한 최적의 키워드 마이닝 및 매체 믹스 설계를 진행합니다." },
    { title: "Content Creation", desc: "사용자의 시선을 사로잡는 고퀄리티 소재 기획 및 디자인 제작 단계입니다." },
    { title: "Campaign Execution", desc: "실제 타겟팅을 적용하여 정밀하게 광고를 집행하고 성과를 추적합니다." },
    { title: "Analysis & Report", desc: "집행 결과를 대시보드로 분석하여 인사이트를 도출하고 다음 전략을 고도화합니다." }
  ];
  const displayProcess = (siteContent?.processes && siteContent.processes.length > 0) ? siteContent.processes : defaultProcess;

  const defaultLogos = Array.from({ length: 6 }).map((_, i) => ({ id: i.toString(), url: '', name: `PARTNER_${i+1}` }));
  const displayLogos = (siteContent?.partnerLogos && siteContent.partnerLogos.length > 0) ? siteContent.partnerLogos : defaultLogos;

  return (
    <div className="min-h-screen bg-white text-black font-sans overflow-x-hidden">
      <AnimatePresence>
        {showIntro && (
          <motion.div 
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-neutral-950 overflow-hidden flex items-center justify-center font-sans tracking-tight"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(217,119,87,0.08),transparent_70%)] pointer-events-none" />
            
            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 flex flex-col justify-center py-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-12 lg:gap-24">
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                  className="text-center md:text-left flex-1"
                >
                  <h1 className="text-[52px] xs:text-[64px] sm:text-8xl md:text-9xl xl:text-[140px] font-display font-black text-white leading-[0.85] mb-8 select-none tracking-tighter italic">
                    GOM&nbsp;AD<br />
                    <span className="text-glow bg-clip-text text-transparent bg-gradient-to-b from-[#F29D80] via-[#D97757] to-[#8C3D2B] drop-shadow-[0_4px_0_rgba(140,61,43,1)] drop-shadow-[0_8px_15px_rgba(0,0,0,0.5)]">
                      AGENCY
                    </span>
                  </h1>
                  <div className="flex flex-col items-center md:items-start text-white">
                    <div className="h-1 w-24 bg-brand-accent mb-6 shadow-[0_0_15px_rgba(217,119,87,0.5)]" />
                    <p className="text-lg md:text-2xl text-white/70 font-medium leading-relaxed max-w-xl">
                      {siteContent?.heroSubHeading ? (siteContent.heroSubHeading.includes('곰애드') ? siteContent.heroSubHeading : 'AI 최적화 종합 광고대행사, 곰애드') : 'AI 최적화 종합 광고대행사, 곰애드'}<br />
                      {siteContent?.heroDescription ? siteContent.heroDescription.split('\\n').map((line, i) => (
                        <React.Fragment key={i}>
                          {line}<br />
                        </React.Fragment>
                      )) : '신화 속 곰처럼 우직하게 성공을 완주합니다.'}
                    </p>
                  </div>
                </motion.div>
  
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                  className="flex flex-row gap-4 sm:gap-8 items-center"
                >
                  <button 
                    onClick={() => setShowIntro(false)}
                    className="group relative w-32 sm:w-64 h-32 sm:h-64 rounded-full border border-white/10 hover:border-brand-accent transition-all duration-700 flex flex-col items-center justify-center gap-4 overflow-hidden cursor-pointer z-[110]"
                  >
                    <div className="absolute inset-0 bg-brand-accent/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-brand-accent/10 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                    <MonitorPlay className="w-8 h-8 sm:w-12 sm:h-12 text-brand-accent group-hover:scale-110 transition-transform relative z-10" />
                    <span className="text-xs sm:text-sm font-display font-black tracking-[0.4em] uppercase text-white/50 group-hover:text-white transition-colors relative z-10">Explore</span>
                  </button>
                  
                  <a 
                    href="https://litt.ly/gom_ads" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group relative w-32 sm:w-64 h-32 sm:h-64 rounded-full bg-brand-accent text-white hover:scale-105 transition-all duration-700 flex flex-col items-center justify-center gap-4 border border-white/10 shadow-[0_0_30px_rgba(217,119,87,0.2)] z-[110]"
                  >
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                    <Mail className="w-8 h-8 sm:w-12 sm:h-12 group-hover:rotate-12 transition-transform" />
                    <span className="text-xs sm:text-sm font-display font-black tracking-[0.4em] uppercase">Contact</span>
                  </a>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Chatbot />

      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/90 shadow-md py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            {siteContent?.logoUrl ? (
              <img src={siteContent.logoUrl} alt="GOM AD LOGO" className="h-8 w-auto object-contain" referrerPolicy="no-referrer" />
            ) : (
              <>
                <div className="w-8 h-8 bg-brand-accent flex items-center justify-center">
                  <span className="font-display font-black text-white text-xl">G</span>
                </div>
                <span className="font-display font-black text-xl tracking-tighter uppercase">GOM AD</span>
              </>
            )}
          </div>

          <div className="hidden md:flex items-center space-x-10">
            {[
              { name: 'Philosophy', id: 'philosophy' },
              { name: 'Business', id: 'capability' },
              { name: 'Portfolio', id: 'portfolio' },
              { name: 'Partners', id: 'client' }
            ].map((item) => (
              <a 
                key={item.id}
                href={`#${item.id}`} 
                className="text-sm font-semibold tracking-wide hover:text-brand-accent transition-colors"
              >
                {item.name}
              </a>
            ))}
            <a 
              href="#contact" 
              className="bg-black text-white px-6 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-brand-accent transition-all"
            >
              Inquiry
            </a>
          </div>

          <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-black">
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Page Content - Hero (inspired by corporate agencies) */}
      <section className="relative h-screen flex items-center bg-brand-surface overflow-hidden pt-20">
        {/* Background Layer */}
        <div className="absolute inset-0 z-0">
          {siteContent?.heroBgType === 'VIDEO' && heroVideoId ? (
            <div className="absolute inset-0 pointer-events-none overflow-hidden grayscale contrast-125 opacity-30">
               <iframe 
                src={`https://www.youtube.com/embed/${heroVideoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${heroVideoId}&showinfo=0&rel=0&enablejsapi=1&modestbranding=1&iv_load_policy=3&disablekb=1`}
                className="w-[100vw] h-[56.25vw] min-h-[100vh] min-w-[177.77vh] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                allow="autoplay; encrypted-media"
                title="Hero Background Video"
              />
            </div>
          ) : siteContent?.heroBgUrl ? (
            <div 
              className="absolute inset-0 bg-cover bg-center grayscale opacity-20"
              style={{ backgroundImage: `url(${siteContent.heroBgUrl})` }}
              referrerPolicy="no-referrer"
            />
          ) : siteContent?.heroImage ? (
            <div 
              className="absolute inset-0 bg-cover bg-center grayscale opacity-20"
              style={{ backgroundImage: `url(${siteContent.heroImage})` }}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="absolute inset-0 bg-brand-surface" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-brand-surface/80 via-transparent to-brand-surface" />
        </div>
        
        <div className="max-w-7xl mx-auto w-full px-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl"
          >
            <span className="inline-block px-4 py-1.5 bg-brand-accent text-white text-[10px] font-black uppercase tracking-[0.3em] mb-8">
              {siteContent?.heroSubHeading || 'AI PERFORMANCE GROUP'}
            </span>
            <h1 className="text-4xl md:text-7xl font-display font-bold tracking-tight leading-[1.1] mb-8 text-black whitespace-pre-line">
              {(siteContent?.heroHeading || 'AI 최적화 종합 광고대행사\n곰애드').replace(/\\n/g, '\n')}
            </h1>
            <p className="text-xl md:text-2xl text-brand-text-muted mb-12 max-w-2xl leading-relaxed font-medium whitespace-pre-line">
              {(siteContent?.heroDescription || '신화 속 곰처럼 변치 않는 우직함으로\n귀사의 성공을 끝까지 완주하겠습니다').replace(/\\n/g, '\n')}
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#portfolio" className="px-10 py-5 bg-black text-white text-sm font-black uppercase tracking-widest hover:bg-brand-accent transition-all flex items-center gap-3">
                Watch Portfolio <ArrowRight className="w-4 h-4" />
              </a>
              <a href="#capability" className="px-10 py-5 border border-black/10 hover:bg-white text-sm font-black uppercase tracking-widest transition-all">
                Business Scope
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Philosophy - Clean & Modern */}
      <section id="philosophy" className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
            >
              <h2 className="text-4xl md:text-6xl font-display font-black mb-12 leading-tight uppercase">
                WE MOVE YOUR<br />
                <span className="text-brand-accent">BUSINESS FORWARD</span>
              </h2>
              <div className="space-y-12">
                {[
                  { title: "시장 중심 전략", desc: "고객사의 타겟 시장을 철저히 분석하여 가장 효율적인 진입 경로를 설계합니다." },
                  { title: "성과 기반 크리에이티브", desc: "단순히 예쁜 디자인이 아닌 실질적인 전환을 일으키는 시각 언어를 제안합니다." },
                  { title: "데이터 최적화 프로세스", desc: "집행되는 모든 광고의 수치를 실시간으로 추적하고 최적화하여 낭비 없는 마케팅을 지향합니다." }
                ].map((item, i) => (
                  <div key={i} className="group cursor-default">
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-brand-accent font-display font-black text-xl">0{i+1}</span>
                      <h3 className="text-xl font-bold">{item.title}</h3>
                    </div>
                    <p className="text-brand-text-muted text-lg leading-relaxed pl-12 border-l-2 border-brand-surface group-hover:border-brand-accent transition-all">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
            <div className="relative">
              <div className="aspect-[4/5] bg-brand-surface rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2069" 
                  alt="Philosophy" 
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-10 -left-10 bg-black text-white p-12 rounded-2xl hidden md:block">
                <div className="text-4xl font-display font-black mb-2 tracking-tighter">850+</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">Successful Projects</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Business Area - Interactive Tabs */}
      <section id="capability" className="py-32 px-6 bg-brand-surface">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20">
            <h2 className="text-4xl md:text-7xl font-display font-extrabold mb-6 uppercase">Business <span className="text-brand-accent">Solutions</span></h2>
            <p className="text-brand-text-muted text-xl max-w-2xl">모든 채널을 관통하는 통합 마케팅 솔루션을 제공합니다.</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-12">
            <div className="lg:w-1/3 grid grid-cols-2 lg:grid-cols-1 gap-2">
              {displayServices.map((area, i) => (
                <button 
                  key={i} 
                  onClick={() => setActiveBusinessTab(i)}
                  className={`p-6 text-left border transition-all duration-300 ${
                    activeBusinessTab === i 
                    ? 'bg-brand-accent text-white border-brand-accent shadow-xl font-bold' 
                    : 'bg-white text-black border-black/5 hover:border-brand-accent/30'
                  }`}
                >
                  <span className="text-sm font-display uppercase tracking-widest block mb-1 opacity-60">Solution 0{i+1}</span>
                  <span className="text-lg font-bold">{area.title}</span>
                </button>
              ))}
            </div>

            <div className="lg:w-2/3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeBusinessTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white p-8 md:p-16 h-full border border-black/5 flex flex-col md:flex-row gap-12"
                >
                  <div className="md:w-1/2">
                    <h3 className="text-4xl font-display font-black italic uppercase mb-8 text-black">{displayServices[activeBusinessTab].title}</h3>
                    <div className="space-y-4">
                      {displayServices[activeBusinessTab].points ? displayServices[activeBusinessTab].points.map((p, j) => (
                        <div key={j} className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-brand-accent flex-shrink-0 mt-1" />
                          <p className="text-lg font-medium text-black/70">{p}</p>
                        </div>
                      )) : displayServices[activeBusinessTab].items?.map((item, j) => (
                        <div key={j} className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-brand-accent flex-shrink-0 mt-1" />
                          <div>
                            <p className="font-bold text-black">{item.name}</p>
                            <p className="text-sm text-black/50">{item.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="md:w-1/2 aspect-square rounded-2xl overflow-hidden relative group">
                    {displayServices[activeBusinessTab].img ? (
                      <img 
                        src={displayServices[activeBusinessTab].img} 
                        alt={displayServices[activeBusinessTab].title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-brand-surface flex items-center justify-center text-black/10 font-black uppercase">No Image</div>
                    )}
                    <div className="absolute inset-0 bg-brand-accent/10 mix-blend-overlay" />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* Performance - Large Text focus */}
      <section id="performance" className="py-32 px-6 bg-white border-t border-black/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <span className="text-brand-accent font-display font-black text-[10px] tracking-[0.4em] mb-4 inline-block">SELECTED CREDENTIALS</span>
            <h2 className="text-4xl md:text-8xl font-display font-black uppercase leading-none">NUMBERS OF <span className="text-brand-accent">GROWTH</span></h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            {displayGrowthMetrics.map((perf, i) => (
              <div key={i} className="text-center group">
                {perf.img && (
                  <div className="mb-6 flex justify-center">
                    <img src={perf.img} alt={perf.label} className="w-16 h-16 object-contain group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
                  </div>
                )}
                <div className={`text-7xl md:text-9xl font-display font-black border-b-4 border-black/5 pb-8 mb-8 ${!perf.img ? 'pt-10' : ''}`}>
                  {perf.prefix || ''}<Counter value={perf.value} suffix={perf.suffix} />
                </div>
                <div className="text-sm font-bold uppercase tracking-widest mb-2">{perf.label}</div>
                <div className="text-[10px] text-brand-text-muted uppercase tracking-widest">{perf.metric}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Grid - inspired by Donghaeng */}
      <section id="portfolio" className="py-32 px-6 bg-brand-surface">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <h2 className="text-4xl md:text-7xl font-display font-extrabold uppercase italic border-b-4 border-brand-accent inline-block pb-4 mb-20 whitespace-normal">GOM <span className="text-brand-accent">WORK</span></h2>
            <div className="flex flex-wrap gap-2">
              {['ALL', 'CONTENTS', 'PERFORMANCE', 'WEBSITE', 'APP'].map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setPortfolioFilter(cat)}
                  className={`px-6 py-2 border border-black/5 text-[10px] font-black tracking-widest transition-all ${portfolioFilter === cat ? 'bg-black text-white' : 'hover:bg-black/5'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {filteredPortfolio.map((p, i) => (
              <div 
                key={i} 
                className="group cursor-pointer"
                onClick={() => {
                  if (p.category === 'CONTENTS' && p.videoUrl) {
                    window.open(p.videoUrl.startsWith('http') ? p.videoUrl : `https://youtube.com/watch?v=${p.videoUrl}`, '_blank');
                  } else if (p.link) {
                    window.open(p.link, '_blank');
                  }
                }}
              >
                <div className="aspect-[16/10] bg-white rounded-lg overflow-hidden border border-black/5 mb-6 relative">
                  {p.category === 'CONTENTS' && p.videoUrl ? (
                    <div className="w-full h-full relative">
                      <img 
                        src={p.img || `https://img.youtube.com/vi/${p.videoUrl.split('v=')[1]?.split('&')[0] || p.videoUrl.split('/').pop()}/maxresdefault.jpg`} 
                        alt={p.title} 
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" 
                        referrerPolicy="no-referrer" 
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/0 transition-colors">
                        <div className="w-16 h-16 bg-brand-accent rounded-full flex items-center justify-center text-white shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                          <MonitorPlay size={32} fill="currentColor" />
                        </div>
                      </div>
                    </div>
                  ) : p.img ? (
                    <img src={p.img} alt={p.title} className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-brand-surface flex items-center justify-center text-black/10 font-bold uppercase tracking-widest text-[10px]">No Item Image</div>
                  )}
                  {p.link && (
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-white/90 p-2 rounded-full shadow-lg">
                        <ArrowRight size={16} className="text-brand-accent -rotate-45" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center px-2">
                  <h3 className="font-bold text-lg group-hover:text-brand-accent transition-colors">{p.title}</h3>
                  <span className="text-[10px] font-black text-brand-accent tracking-tighter uppercase">{p.category}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Work Process Section */}
      <section id="process" className="py-32 px-6 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-end justify-between mb-24 gap-8">
            <div className="max-w-2xl">
              <span className="text-brand-accent font-display font-black text-[10px] tracking-[0.4em] mb-4 block">SUCCESS JOURNEY</span>
              <h2 className="text-4xl md:text-7xl font-display font-black uppercase leading-none italic">WORK <br/><span className="text-brand-accent">PROCESS</span></h2>
            </div>
            <p className="text-brand-text-muted text-lg max-w-sm mb-4 leading-relaxed font-medium">
              기획부터 실행, 그리고 고도화된 분석까지<br/>곰애드만의 체계적인 프로세스입니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayProcess.map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative bg-brand-surface p-10 h-96 flex flex-col justify-between overflow-hidden cursor-default"
              >
                <div className="absolute top-0 right-0 p-8">
                  <span className="text-5xl font-display font-black text-black/5 group-hover:text-brand-accent/20 transition-all duration-700 select-none">
                    0{i+1}
                  </span>
                </div>
                <div className="relative z-10 flex-1 flex flex-col justify-center">
                  {step.img && (
                    <div className="mb-6">
                      <img src={step.img} alt={step.title} className="w-12 h-12 object-contain group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <h3 className="text-2xl font-bold mb-6 group-hover:text-brand-accent transition-colors">{step.title}</h3>
                  <p className="text-brand-text-muted leading-relaxed text-sm">{step.desc}</p>
                </div>
                <div className="w-10 h-1 bg-black group-hover:w-full group-hover:bg-brand-accent transition-all duration-700" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners/Clients Logo Parade */}
      <section id="client" className="py-32 px-6 bg-brand-surface border-y border-black/5 overflow-hidden">
        <div className="max-w-7xl mx-auto mb-16 text-center">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-black/30">Trusted Partners</span>
        </div>
        <div className="relative">
          <div className="flex gap-20 overflow-hidden whitespace-nowrap group">
            <div className="flex gap-20 animate-marquee py-4 group-hover:[animation-play-state:paused]">
              {[...displayLogos, ...displayLogos].map((logo, i) => (
                <div key={`${logo.id}-${i}`} className="inline-flex items-center justify-center grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500 h-12 w-40">
                  {logo.url ? (
                    <img src={logo.url} alt={logo.name} className="max-w-full max-h-full object-contain" />
                  ) : (
                    <span className="font-display font-black text-xl italic uppercase tracking-tighter">{logo.name}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final Contact (Direct inspired by corporate sites) */}
      <section id="contact" className="py-32 px-6 bg-black text-white overflow-hidden relative">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row justify-between gap-20">
            <div className="lg:w-1/2">
              <h2 className="text-4xl md:text-7xl font-display font-extrabold uppercase mb-12 italic tracking-tighter">Let's <span className="text-brand-accent">GOM</span><br />together.</h2>
              <p className="text-lg text-white/50 mb-12 max-w-xl">
                브랜드의 성장을 위한 여정, 곰애드가 든든한 파트너가 되어드리겠습니다.<br />
                지금 바로 비즈니스의 새로운 가능성을 확인하세요.
              </p>
              {/* Removed redundant contact info */}
            </div>

            <div className="lg:w-1/2 bg-white/5 p-12 rounded-2xl border border-white/10">
              <form onSubmit={handleSubmit} className="space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <input 
                      type="text" 
                      placeholder="Name" 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-transparent border-b border-white/20 py-4 outline-none focus:border-brand-accent transition-colors text-white" 
                    />
                    <input 
                      type="text" 
                      placeholder="Email / Phone" 
                      required
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      className="bg-transparent border-b border-white/20 py-4 outline-none focus:border-brand-accent transition-colors text-white" 
                    />
                 </div>
                 <textarea 
                   placeholder="Your Message" 
                   required
                   value={formData.message}
                   onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                   className="bg-transparent border-b border-white/20 py-4 w-full h-32 outline-none focus:border-brand-accent transition-colors resize-none mb-8 text-white" 
                 />
                 <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-6 bg-brand-accent text-white font-black uppercase tracking-[0.4em] hover:bg-white hover:text-black transition-all disabled:opacity-50"
                 >
                   {isSubmitting ? 'Sending...' : 'Submit Inquiry'}
                 </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-white pt-32 pb-20 px-6 border-t border-black/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-20 mb-24">
            <div className="md:col-span-5">
              <div className="flex items-center gap-4 mb-10">
                {siteContent?.logoUrl ? (
                  <img src={siteContent.logoUrl} alt="GOM AD LOGO" className="h-10 w-auto object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <>
                    <div className="w-8 h-8 bg-brand-accent flex items-center justify-center">
                      <span className="font-display font-black text-white text-xl">G</span>
                    </div>
                    <span className="font-display font-black text-xl tracking-tighter uppercase text-black">GOM AD</span>
                  </>
                )}
              </div>
              <p className="text-brand-text-muted text-xl max-w-md mb-12 leading-relaxed">
                전략적인 분석, 빠른 실행과 피드백.<br />
                종합광고대행사 곰애드와 함께면 가능합니다.
              </p>
              {/* Removed redundant icons */}
            </div>

            <div className="md:col-span-3">
              <h4 className="font-display font-black text-xs uppercase tracking-[0.2em] text-black mb-10">Link</h4>
              <ul className="space-y-6 text-brand-text-muted">
                {[
                  { name: 'About Us', id: 'philosophy' },
                  { name: 'Business', id: 'capability' },
                  { name: 'Portfolio', id: 'portfolio' },
                  { name: 'Contact', id: 'contact' }
                ].map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`} className="hover:text-brand-accent transition-colors font-semibold text-sm">{item.name}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-4">
              <h4 className="font-display font-black text-xs uppercase tracking-[0.2em] text-black mb-10">Contact Us</h4>
              <ul className="space-y-8 text-brand-text-muted text-sm leading-relaxed">
                <li className="flex gap-5">
                  <MapPin className="w-5 h-5 flex-shrink-0 text-brand-accent" />
                  <span className="font-medium">인천광역시 중구 자연대로 29, 15층</span>
                </li>
                <li className="flex gap-5">
                  <Mail className="w-5 h-5 flex-shrink-0 text-brand-accent" />
                  <span className="font-medium">{siteContent?.contactEmail || 'ingompunch@gmail.com'}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-12 border-t border-black/5 flex flex-col md:flex-row justify-between items-center gap-8 text-black/50">
            <p className="text-[10px] font-bold uppercase tracking-widest leading-loose">
              (주)곰애드   |   대표이사 : GOM AD   |   사업자등록번호 : 000-00-00000<br />
              COPYRIGHT © GOM AD. ALL RIGHTS RESERVED.
            </p>
            <a href="/admin" className="flex items-center gap-2 hover:text-brand-accent transition-colors">
              <Settings size={14} /> Admin
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainSite />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
