import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Edit3, 
  LogOut, 
  Save, 
  CheckCircle2, 
  Clock,
  ArrowLeft,
  TrendingUp,
  Award,
  Layers,
  Image as ImageIcon,
  Upload,
  Plus,
  Trash2,
  Bell
} from 'lucide-react';
import { motion } from 'motion/react';
import { db, storage, auth, OperationType, handleFirestoreError, serverTimestamp } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';

interface Inquiry {
  id: string;
  name: string;
  contact: string;
  message: string;
  createdAt: string;
  status: 'new' | 'read' | 'resolved';
}

interface ServiceItem {
  name: string;
  detail: string;
}

interface ServiceCategory {
  title: string;
  img: string;
  items: ServiceItem[];
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
}

interface ProcessStep {
  title: string;
  desc: string;
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
  contactEmail: string;
  kakaoWebhookUrl?: string;
  services?: ServiceCategory[];
  growthMetrics?: GrowthMetric[];
  portfolio?: PortfolioItem[];
  processes?: ProcessStep[];
  partnerLogos?: PartnerLogo[];
}

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'content' | 'solutions' | 'growth' | 'portfolio' | 'partners' | 'process' | 'inquiries'>('content');
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [content, setContent] = useState<SiteContent>({
    logoUrl: '',
    faviconUrl: '',
    heroHeading: '',
    heroSubHeading: '',
    heroDescription: '',
    heroImage: '',
    contactEmail: '',
    kakaoWebhookUrl: '',
    services: [],
    growthMetrics: [],
    portfolio: [],
    processes: [],
    partnerLogos: []
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Auth failed:", err);
      // alert(`인증에 실패했습니다: ${err.message}`);
    }
  };

  const handleLogout = async () => {
    if (window.confirm("로그아웃 하시겠습니까?")) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Logout failed:", err);
      }
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    const inquiriesPath = 'inquiries';
    const contentPath = 'content/main';
    try {
      const docRef = doc(db, "content", "main");
      const docSnap = await getDoc(docRef);
      
      const q = query(collection(db, "inquiries"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as SiteContent;
        setContent({
          ...data,
          services: data.services || [],
          growthMetrics: data.growthMetrics || [],
          portfolio: data.portfolio || [],
          processes: data.processes || [],
          partnerLogos: data.partnerLogos || []
        });
      }
      
      setInquiries(querySnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt 
        } as Inquiry;
      }));
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error instanceof Error && error.message.includes('permission')) {
        setIsAdminUser(false);
      }
      // Log error for debugging if needed, but don't disrupt if it's a permission check
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthLoading(false);
      if (user) {
        setIsAuthenticated(true);
        // Hardcoded admin email for bootstrapping, rules also check this
        if (user.email === 'drive5746@gmail.com') {
          setIsAdminUser(true);
          fetchData();
        } else {
          setIsAdminUser(false);
          setIsLoading(false);
        }
      } else {
        setIsAuthenticated(false);
        setIsAdminUser(false);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSaveContent = async () => {
    setIsSaving(true);
    const path = "content/main";
    try {
      const docRef = doc(db, "content", "main");
      await setDoc(docRef, {
        ...content,
        updatedAt: serverTimestamp()
      }, { merge: true });
      alert('설정이 성공적으로 저장되었습니다!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setIsSaving(false);
    }
  };

  const updateServiceCategory = (index: number, field: keyof ServiceCategory, value: any) => {
    const newServices = [...(content.services || [])];
    newServices[index] = { ...newServices[index], [field]: value };
    setContent({ ...content, services: newServices });
  };

  const updateServiceItem = (catIndex: number, itemIndex: number, field: keyof ServiceItem, value: string) => {
    const newServices = [...(content.services || [])];
    const newItems = [...newServices[catIndex].items];
    newItems[itemIndex] = { ...newItems[itemIndex], [field]: value };
    newServices[catIndex] = { ...newServices[catIndex], items: newItems };
    setContent({ ...content, services: newServices });
  };

  const addServiceItem = (catIndex: number) => {
    const newServices = [...(content.services || [])];
    newServices[catIndex].items.push({ name: '', detail: '' });
    setContent({ ...content, services: newServices });
  };

  const removeServiceItem = (catIndex: number, itemIndex: number) => {
    const newServices = [...(content.services || [])];
    newServices[catIndex].items.splice(itemIndex, 1);
    setContent({ ...content, services: newServices });
  };

  const updateGrowthMetric = (index: number, field: keyof GrowthMetric, value: any) => {
    const newMetrics = [...(content.growthMetrics || [])];
    newMetrics[index] = { ...newMetrics[index], [field]: value };
    setContent({ ...content, growthMetrics: newMetrics });
  };

  const addGrowthMetric = () => {
    const newMetrics = [...(content.growthMetrics || []), { label: '', value: 0, suffix: '', metric: '', prefix: '' }];
    setContent({ ...content, growthMetrics: newMetrics });
  };

  const removeGrowthMetric = (index: number) => {
    const newMetrics = [...(content.growthMetrics || [])];
    newMetrics.splice(index, 1);
    setContent({ ...content, growthMetrics: newMetrics });
  };

  const updatePortfolioItem = (index: number, field: keyof PortfolioItem, value: string) => {
    const newPortfolio = [...(content.portfolio || [])];
    newPortfolio[index] = { ...newPortfolio[index], [field]: value };
    setContent({ ...content, portfolio: newPortfolio });
  };

  const addPortfolioItem = () => {
    const newPortfolio = [...(content.portfolio || []), { title: '', category: 'CONTENTS' as const, img: '', link: '', videoUrl: '' }];
    setContent({ ...content, portfolio: newPortfolio });
  };

  const removePortfolioItem = (index: number) => {
    const newPortfolio = [...(content.portfolio || [])];
    newPortfolio.splice(index, 1);
    setContent({ ...content, portfolio: newPortfolio });
  };

  // Image Upload Logic
  const uploadFile = async (file: File, callback: (url: string) => void) => {
    if (!file || !file.type.startsWith('image/')) {
      alert("이미지 파일만 업로드 가능합니다.");
      return;
    }

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `site-assets/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      callback(url);
    } catch (error: any) {
      console.error("Upload detail:", error);
      let errorMsg = "이미지 업로드에 실패했습니다.";
      
      if (error.code === 'storage/unauthorized') {
        errorMsg += "\n\n권한 오류: Firebase Console에서 Storage를 '시작 안 함' 상태이거나 규칙(Rules)이 업로드를 차단하고 있습니다. Storage 규칙을 'allow read, write: if true;'로 설정해보세요.";
      } else if (error.code === 'storage/project-not-found') {
        errorMsg += "\n\n프로젝트를 찾을 수 없습니다. Firebase Console에서 Storage가 활성화되어 있는지 확인하세요.";
      } else {
        errorMsg += `\n\n에러 코드: ${error.code || 'unknown'}`;
      }
      
      alert(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) await uploadFile(file, callback);
  };

  // Reusable Dropzone Component
  const ImageDropzone = ({ onUpload, className, children, label }: { onUpload: (url: string) => void, className: string, children: React.ReactNode, label?: string }) => {
    const [isOver, setIsOver] = useState(false);
    
    return (
      <label 
        className={`${className} ${isOver ? 'border-brand-accent bg-brand-accent/20 ring-2 ring-brand-accent' : ''} transition-all cursor-pointer relative`}
        onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
        onDragLeave={() => setIsOver(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setIsOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) await uploadFile(file, onUpload);
        }}
      >
        {children}
        {label && <span className="sr-only">{label}</span>}
        <input 
          type="file" 
          className="hidden" 
          accept="image/*" 
          onChange={(e) => handleImageUpload(e, onUpload)} 
        />
      </label>
    );
  };

  // Process Management
  const updateProcessStep = (index: number, field: keyof ProcessStep, value: string) => {
    const newProcesses = [...(content.processes || [])];
    newProcesses[index] = { ...newProcesses[index], [field]: value };
    setContent({ ...content, processes: newProcesses });
  };

  const addProcessStep = () => {
    setContent({ ...content, processes: [...(content.processes || []), { title: '', desc: '' }] });
  };

  const removeProcessStep = (index: number) => {
    const newProcesses = [...(content.processes || [])];
    newProcesses.splice(index, 1);
    setContent({ ...content, processes: newProcesses });
  };

  // Partner Management
  const addPartnerLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await handleImageUpload(e, (url) => {
      setContent({ 
        ...content, 
        partnerLogos: [...(content.partnerLogos || []), { id: Date.now().toString(), url, name: '' }] 
      });
    });
  };

  const removePartnerLogo = (id: string) => {
    setContent({ ...content, partnerLogos: (content.partnerLogos || []).filter(p => p.id !== id) });
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-brand-accent"></div>
          <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">Connecting to GOM Server...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdminUser) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white/5 border border-white/10 p-12 rounded-3xl"
        >
          <div className="flex items-center gap-4 mb-10 justify-center">
            <div className="w-10 h-10 bg-brand-accent flex items-center justify-center">
              <span className="font-display font-black text-white text-2xl">G</span>
            </div>
            <span className="font-display font-black text-2xl tracking-tighter uppercase">ADMIN LOGIN</span>
          </div>

          {isAuthenticated && !isAdminUser ? (
            <div className="space-y-6 text-center">
              <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl">
                <p className="text-red-500 text-sm font-bold">권한이 없는 계정입니다.</p>
                <p className="text-white/40 text-xs mt-2">{auth.currentUser?.email}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full py-4 border border-white/10 text-white font-black uppercase tracking-[0.4em] hover:bg-white/10 transition-all"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="text-[10px] uppercase font-black tracking-[0.3em] text-white/40 mb-10 text-center leading-relaxed">
                  GOM AD Administration Panel<br />
                  Please sign in with authorized Google account.
                </p>
              </div>
              <button 
                onClick={handleLogin}
                className="w-full py-4 bg-brand-accent text-white font-black uppercase tracking-[0.4em] hover:bg-white hover:text-black transition-all flex items-center justify-center gap-3"
              >
                Google Sign In
              </button>
              <button 
                type="button"
                onClick={() => window.location.href = '/'}
                className="w-full py-4 text-white/40 hover:text-white transition-all text-sm font-bold"
              >
                Back to Site
              </button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 p-8 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-8 h-8 bg-brand-accent flex items-center justify-center">
              <span className="font-display font-black text-white text-xl">G</span>
            </div>
            <span className="font-display font-black text-xl tracking-tighter uppercase">ADMIN</span>
          </div>

          <nav className="space-y-2">
            <button 
              onClick={() => setActiveTab('content')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${activeTab === 'content' ? 'bg-brand-accent text-white' : 'hover:bg-white/5 text-white/50'}`}
            >
              <Edit3 size={20} />
              <span className="font-bold text-sm">기본 콘텐츠</span>
            </button>
            <button 
              onClick={() => setActiveTab('solutions')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${activeTab === 'solutions' ? 'bg-brand-accent text-white' : 'hover:bg-white/5 text-white/50'}`}
            >
              <LayoutDashboard size={20} />
              <span className="font-bold text-sm">비즈니스 솔루션</span>
            </button>
            <button 
              onClick={() => setActiveTab('growth')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${activeTab === 'growth' ? 'bg-brand-accent text-white' : 'hover:bg-white/5 text-white/50'}`}
            >
              <TrendingUp size={20} />
              <span className="font-bold text-sm">성장 수치</span>
            </button>
            <button 
              onClick={() => setActiveTab('portfolio')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${activeTab === 'portfolio' ? 'bg-brand-accent text-white' : 'hover:bg-white/5 text-white/50'}`}
            >
              <Award size={20} />
              <span className="font-bold text-sm">포트폴리오</span>
            </button>
            <button 
              onClick={() => setActiveTab('process')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${activeTab === 'process' ? 'bg-brand-accent text-white' : 'hover:bg-white/5 text-white/50'}`}
            >
              <Layers size={20} />
              <span className="font-bold text-sm">프로세스</span>
            </button>
            <button 
              onClick={() => setActiveTab('partners')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${activeTab === 'partners' ? 'bg-brand-accent text-white' : 'hover:bg-white/5 text-white/50'}`}
            >
              <ImageIcon size={20} />
              <span className="font-bold text-sm">파트너 로고</span>
            </button>
            <button 
              onClick={() => setActiveTab('inquiries')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${activeTab === 'inquiries' ? 'bg-brand-accent text-white' : 'hover:bg-white/5 text-white/50'}`}
            >
              <MessageSquare size={20} />
              <div className="flex justify-between items-center w-full">
                <span className="font-bold text-sm">문의 내역</span>
                {inquiries.filter(i => i.status === 'new').length > 0 && (
                  <span className="bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                    {inquiries.filter(i => i.status === 'new').length}
                  </span>
                )}
              </div>
            </button>
          </nav>
        </div>

        <button 
          onClick={() => window.location.href = '/'}
          className="flex items-center gap-4 px-4 py-3 text-white/50 hover:text-white transition-all"
        >
          <LogOut size={20} />
          <span className="font-bold text-sm">사이트로 돌아가기</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-12 overflow-y-auto">
        <header className="mb-12 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-display font-black uppercase mb-2">
              {activeTab === 'content' ? 'Main Content' : 
               activeTab === 'solutions' ? 'Business Solutions' :
               activeTab === 'growth' ? 'Growth Metrics' :
               activeTab === 'portfolio' ? 'Portfolio (GOM WORK)' : 
               activeTab === 'process' ? 'Work Process' :
               activeTab === 'partners' ? 'Partners & Logos' : 'Visitor Inquiries'}
            </h2>
            <p className="text-white/40 text-sm italic">
              {activeTab === 'content' ? 'Hero 섹션 및 기본 정보를 관리합니다.' :
               activeTab === 'solutions' ? '홈페이지의 비즈니스 솔루션(Services) 섹션을 관리합니다.' :
               activeTab === 'growth' ? 'NUMBERS OF GROWTH 섹션의 수치들을 관리합니다.' :
               activeTab === 'portfolio' ? 'GOM WORK 섹션의 포트폴리오 항목들을 관리합니다.' :
               activeTab === 'process' ? '작업 절차를 소비자에게 설명하는 프로세스 섹션입니다.' :
               activeTab === 'partners' ? '홈페이지 하단에 흐르는 파트너사 로고들을 관리합니다.' :
               '고객들이 남긴 문의 사항을 확인하고 관리하세요.'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLogout}
              className="px-4 py-3 bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 text-white/40 hover:text-red-500 transition-all flex items-center gap-2 font-black uppercase tracking-widest text-[10px]"
              title="Logout"
            >
              <LogOut size={16} />
              Logout
            </button>
            {activeTab !== 'inquiries' && (
              <button 
                onClick={handleSaveContent}
                disabled={isSaving}
                className="px-8 py-3 bg-brand-accent hover:bg-white hover:text-black transition-all flex items-center gap-3 font-black uppercase tracking-widest text-xs"
              >
                {isSaving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
              </button>
            )}
          </div>
        </header>

        <section>
          {activeTab === 'content' ? (
            <div className="space-y-8 max-w-3xl">
              <div className="bg-white/5 p-8 rounded-2xl border border-white/10 space-y-6">
                <div>
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <span className="w-1 h-6 bg-brand-accent block" />
                    브랜드 아이덴티티 (Logo & Favicon)
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-widest text-brand-accent mb-4">Main Logo (Navbar)</label>
                    <ImageDropzone 
                      onUpload={(url) => setContent({ ...content, logoUrl: url })}
                      className="aspect-video bg-black/40 border border-white/10 rounded-2xl flex flex-col items-center justify-center group overflow-hidden border-dashed hover:border-brand-accent"
                    >
                      {content.logoUrl ? (
                        <>
                          <img src={content.logoUrl} alt="Logo Preview" className="max-w-full max-h-full object-contain p-4 transition-transform group-hover:scale-105" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                            <Upload size={24} className="mb-2" />
                            <span className="text-[10px] font-black uppercase">Change Logo</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-white/20">
                          <Upload size={32} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Upload Logo (PNG suggested)</span>
                        </div>
                      )}
                    </ImageDropzone>
                    <input 
                      type="text"
                      value={content.logoUrl}
                      onChange={(e) => setContent({ ...content, logoUrl: e.target.value })}
                      className="w-full mt-4 bg-black/40 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-brand-accent"
                      placeholder="Image URL..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-widest text-brand-accent mb-4">Tab Icon (Favicon)</label>
                    <ImageDropzone 
                      onUpload={(url) => setContent({ ...content, faviconUrl: url })}
                      className="aspect-square w-32 mx-auto bg-black/40 border border-white/10 rounded-2xl flex flex-col items-center justify-center group overflow-hidden border-dashed hover:border-brand-accent"
                    >
                      {content.faviconUrl ? (
                        <>
                          <img src={content.faviconUrl} alt="Favicon Preview" className="w-16 h-16 object-contain transition-transform group-hover:scale-105" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                            <Upload size={20} />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-white/20">
                          <Upload size={24} />
                        </div>
                      )}
                    </ImageDropzone>
                    <input 
                      type="text"
                      value={content.faviconUrl}
                      onChange={(e) => setContent({ ...content, faviconUrl: e.target.value })}
                      className="w-full mt-4 bg-black/40 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-brand-accent"
                      placeholder="Icon URL..."
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 p-8 rounded-2xl border border-white/10 space-y-6">
                <div>
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <span className="w-1 h-6 bg-brand-accent block" />
                    메인 히어로 섹션
                  </h3>
                </div>
                {/* ... fields ... */}
                <div>
                  <label className="block text-[10px] uppercase font-black tracking-widest text-brand-accent mb-2">Hero Heading (Use \n for line breaks)</label>
                  <textarea 
                    value={content.heroHeading}
                    onChange={(e) => setContent({ ...content, heroHeading: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:border-brand-accent outline-none text-xl font-bold min-h-[120px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black tracking-widest text-brand-accent mb-2">Hero SubHeading</label>
                  <input 
                    type="text"
                    value={content.heroSubHeading}
                    onChange={(e) => setContent({ ...content, heroSubHeading: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:border-brand-accent outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black tracking-widest text-brand-accent mb-2">Hero Description</label>
                  <textarea 
                    value={content.heroDescription}
                    onChange={(e) => setContent({ ...content, heroDescription: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:border-brand-accent outline-none text-white/70 min-h-[100px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black tracking-widest text-brand-accent mb-2">Hero Image</label>
                  <div className="flex gap-4 items-start">
                    <input 
                      type="text"
                      value={content.heroImage}
                      onChange={(e) => setContent({ ...content, heroImage: e.target.value })}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl p-4 focus:border-brand-accent outline-none"
                      placeholder="https://images.unsplash.com/..."
                    />
                      <ImageDropzone 
                        onUpload={(url) => setContent({ ...content, heroImage: url })}
                        className="bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/10 flex items-center gap-2"
                        label="Hero Image Upload"
                      >
                        <Upload size={18} />
                        <span className="text-xs font-bold uppercase">Upload</span>
                      </ImageDropzone>
                  </div>
                  {content.heroImage && (
                    <div className="mt-4 aspect-video rounded-lg overflow-hidden border border-white/10">
                      <img src={content.heroImage} alt="Hero Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <div className="pt-6 border-t border-white/5">
                  <h4 className="text-sm font-bold text-white/60 mb-4 flex items-center gap-2">
                    <Bell size={16} /> 알림 설정 (KakaoTalk 실시간 알림)
                  </h4>
                  <label className="block text-[10px] uppercase font-black tracking-widest text-white/30 mb-2">Kakao Webhook URL (상담 신청 시 자동 발송)</label>
                  <input 
                    type="text"
                    value={content.kakaoWebhookUrl}
                    onChange={(e) => setContent({ ...content, kakaoWebhookUrl: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:border-brand-accent outline-none text-xs"
                    placeholder="https://api.kakaotalk.com/webhook/..."
                  />
                  <p className="mt-2 text-[10px] text-white/20 italic leading-relaxed">
                    * 알리고(Aligo) 또는 카카오 비즈메시지 API의 Webhook URL을 입력하세요.<br />
                    * 미입력 시 이메일 접수 확인만 가능합니다.
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black tracking-widest text-brand-accent mb-2">Contact Email</label>
                  <input 
                    type="email"
                    value={content.contactEmail}
                    onChange={(e) => setContent({ ...content, contactEmail: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:border-brand-accent outline-none"
                  />
                </div>
              </div>
            </div>
          ) : activeTab === 'solutions' ? (
            <div className="space-y-8 max-w-4xl">
              <div className="space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="w-1 h-6 bg-brand-accent block" />
                  비즈니스 솔루션 (Business Solutions)
                </h3>
                {content.services?.map((service, sIndex) => (
                  <div key={sIndex} className="bg-white/5 p-8 rounded-2xl border border-white/10 space-y-6">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] uppercase font-black tracking-widest text-brand-accent">Category #{sIndex + 1}</label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">Title</label>
                        <input 
                          type="text"
                          value={service.title}
                          onChange={(e) => updateServiceCategory(sIndex, 'title', e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:border-brand-accent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">Image URL</label>
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            value={service.img}
                            onChange={(e) => updateServiceCategory(sIndex, 'img', e.target.value)}
                            className="flex-1 bg-black/40 border border-white/10 rounded-xl p-4 focus:border-brand-accent outline-none"
                          />
                          <ImageDropzone 
                            onUpload={(url) => updateServiceCategory(sIndex, 'img', url)}
                            className="bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/10 flex items-center justify-center min-w-[50px]"
                            label="Service Image Upload"
                          >
                            <Upload size={18} />
                          </ImageDropzone>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <label className="block text-[10px] uppercase font-black tracking-widest text-white/40">세부 항목 (Detail Items)</label>
                      {service.items.map((item, iIndex) => (
                        <div key={iIndex} className="grid grid-cols-12 gap-3 items-start">
                          <input 
                            type="text"
                            value={item.name}
                            onChange={(e) => updateServiceItem(sIndex, iIndex, 'name', e.target.value)}
                            placeholder="항목명 (e.g. Naver)"
                            className="col-span-3 bg-black/40 border border-white/10 rounded-lg p-3 text-sm focus:border-brand-accent outline-none"
                          />
                          <input 
                            type="text"
                            value={item.detail}
                            onChange={(e) => updateServiceItem(sIndex, iIndex, 'detail', e.target.value)}
                            placeholder="상세 설명"
                            className="col-span-8 bg-black/40 border border-white/10 rounded-lg p-3 text-sm focus:border-brand-accent outline-none"
                          />
                          <button 
                            onClick={() => removeServiceItem(sIndex, iIndex)}
                            className="col-span-1 p-3 text-white/20 hover:text-red-500 transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => addServiceItem(sIndex)}
                        className="text-xs font-bold text-brand-accent hover:text-white transition-colors"
                      >
                        + 항목 추가하기
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'growth' ? (
            <div className="space-y-8 max-w-4xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {content.growthMetrics?.map((metric, index) => (
                  <div key={index} className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-accent">Metric #{index + 1}</span>
                      <button onClick={() => removeGrowthMetric(index)} className="text-white/20 hover:text-red-500 transition-colors">Delete</button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">Label (e.g. Campaign Reach)</label>
                        <input 
                          type="text"
                          value={metric.label}
                          onChange={(e) => updateGrowthMetric(index, 'label', e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:border-brand-accent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">Value (Number)</label>
                        <input 
                          type="number"
                          value={metric.value}
                          onChange={(e) => updateGrowthMetric(index, 'value', Number(e.target.value))}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:border-brand-accent outline-none font-bold text-brand-accent"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">Prefix</label>
                        <input 
                          type="text"
                          value={metric.prefix}
                          onChange={(e) => updateGrowthMetric(index, 'prefix', e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:border-brand-accent outline-none"
                          placeholder="+"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">Suffix</label>
                        <input 
                          type="text"
                          value={metric.suffix}
                          onChange={(e) => updateGrowthMetric(index, 'suffix', e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:border-brand-accent outline-none"
                          placeholder="M+"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">Detail Metric</label>
                        <input 
                          type="text"
                          value={metric.metric}
                          onChange={(e) => updateGrowthMetric(index, 'metric', e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:border-brand-accent outline-none"
                          placeholder="Accumulated..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button 
                onClick={addGrowthMetric}
                className="w-full py-8 border-2 border-dashed border-white/10 rounded-2xl text-white/20 hover:text-brand-accent hover:border-brand-accent transition-all font-black uppercase tracking-widest"
              >
                + Add New Growth Metric
              </button>
            </div>
          ) : activeTab === 'portfolio' ? (
            <div className="space-y-8 max-w-5xl">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {content.portfolio?.map((item, index) => (
                  <div key={index} className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4 group relative">
                    <button 
                      onClick={() => removePortfolioItem(index)}
                      className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-black/50 text-white hover:bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                    >
                      ×
                    </button>
                    <div className="aspect-[16/10] bg-black/40 rounded-xl overflow-hidden mb-4 border border-white/5 group-hover:border-brand-accent transition-colors relative">
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-accent"></div>
                        </div>
                      )}
                      
                      {item.category === 'CONTENTS' && item.videoUrl ? (
                        <iframe 
                          src={`https://www.youtube.com/embed/${item.videoUrl.split('v=')[1]?.split('&')[0] || item.videoUrl.split('/').pop()}`}
                          className="w-full h-full pointer-events-none"
                          title={item.title}
                        />
                      ) : item.img ? (
                        <img src={item.img} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/10 font-bold uppercase tracking-widest text-xs">No Preview</div>
                      )}
                      
                      <ImageDropzone
                        onUpload={(url) => updatePortfolioItem(index, 'img', url)}
                        className="absolute inset-0 flex flex-col items-center justify-center bg-black/0 group-hover:bg-black/60 opacity-0 group-hover:opacity-100"
                        label="Portfolio Image Upload"
                      >
                         <Upload size={24} className="mb-2" />
                         <span className="text-[10px] font-black uppercase">Change Image</span>
                      </ImageDropzone>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">Project Title</label>
                        <input 
                          type="text"
                          value={item.title}
                          onChange={(e) => updatePortfolioItem(index, 'title', e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:border-brand-accent outline-none font-bold"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">Category</label>
                          <select 
                            value={item.category}
                            onChange={(e) => updatePortfolioItem(index, 'category', e.target.value as any)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:border-brand-accent outline-none"
                          >
                            <option value="CONTENTS">CONTENTS</option>
                            <option value="PERFORMANCE">PERFORMANCE</option>
                            <option value="WEBSITE">WEBSITE</option>
                            <option value="APP">APP</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">Thumbnail/Image</label>
                          <div className="flex gap-2">
                            <input 
                              type="text"
                              value={item.img}
                              onChange={(e) => updatePortfolioItem(index, 'img', e.target.value)}
                              placeholder="Image URL..."
                              className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 focus:border-brand-accent outline-none text-xs"
                            />
                            <ImageDropzone 
                              onUpload={(url) => updatePortfolioItem(index, 'img', url)}
                              className="bg-white/5 border border-white/10 p-3 rounded-xl hover:bg-white/10 flex items-center justify-center min-w-[40px]"
                              label="Portfolio Image Upload"
                            >
                              <Upload size={14} />
                            </ImageDropzone>
                          </div>
                        </div>
                      </div>

                      {item.category === 'CONTENTS' && (
                        <div>
                          <label className="block text-[10px] uppercase font-black tracking-widest text-brand-accent mb-2">YouTube Link / Video URL</label>
                          <input 
                            type="text"
                            value={item.videoUrl}
                            onChange={(e) => updatePortfolioItem(index, 'videoUrl', e.target.value)}
                            placeholder="https://youtube.com/watch?v=..."
                            className="w-full bg-black/40 border border-brand-accent/20 border-dashed rounded-xl p-3 focus:border-brand-accent outline-none text-xs"
                          />
                        </div>
                      )}

                      {(item.category === 'PERFORMANCE' || item.category === 'WEBSITE' || item.category === 'APP') && (
                        <div>
                          <label className="block text-[10px] uppercase font-black tracking-widest text-brand-accent mb-2">Reference Link (Website/Detail)</label>
                          <input 
                            type="text"
                            value={item.link}
                            onChange={(e) => updatePortfolioItem(index, 'link', e.target.value)}
                            placeholder="https://gomad.co.kr"
                            className="w-full bg-black/40 border border-brand-accent/20 border-dashed rounded-xl p-3 focus:border-brand-accent outline-none text-xs"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button 
                onClick={addPortfolioItem}
                className="w-full py-12 border-2 border-dashed border-white/10 rounded-2xl text-white/20 hover:text-brand-accent hover:border-brand-accent transition-all font-black uppercase tracking-widest"
              >
                + Add Portfolio Case Study
              </button>
            </div>
          ) : activeTab === 'process' ? (
            <div className="space-y-8 max-w-3xl">
              <div className="space-y-6">
                {content.processes?.map((step, index) => (
                  <div key={index} className="bg-white/5 p-8 rounded-2xl border border-white/10 space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-accent">Step {index + 1}</span>
                      <button onClick={() => removeProcessStep(index)} className="text-white/20 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">Process Name (e.g. Planning)</label>
                      <input 
                        type="text"
                        value={step.title}
                        onChange={(e) => updateProcessStep(index, 'title', e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:border-brand-accent outline-none text-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">Description</label>
                      <textarea 
                        value={step.desc}
                        onChange={(e) => updateProcessStep(index, 'desc', e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:border-brand-accent outline-none text-white/70 min-h-[100px]"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button 
                onClick={addProcessStep}
                className="w-full py-8 border-2 border-dashed border-white/10 rounded-2xl text-white/20 hover:text-brand-accent hover:border-brand-accent transition-all font-black uppercase tracking-widest flex items-center justify-center gap-3"
              >
                <Plus size={20} /> Add Next Process Step
              </button>
            </div>
          ) : activeTab === 'partners' ? (
            <div className="space-y-8 max-w-5xl">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {content.partnerLogos?.map((logo) => (
                  <div key={logo.id} className="bg-white/5 border border-white/10 p-6 rounded-2xl relative group">
                    <button 
                      onClick={() => removePartnerLogo(logo.id)}
                      className="absolute -top-3 -right-3 w-8 h-8 bg-black border border-white/10 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center z-10 hover:bg-red-500"
                    >
                      ×
                    </button>
                    <div className="aspect-video flex items-center justify-center bg-white/10 rounded-xl overflow-hidden mb-4 p-4">
                      {logo.url ? (
                        <img src={logo.url} alt={logo.name} className="max-w-full max-h-full object-contain grayscale" />
                      ) : (
                        <span className="text-[10px] font-black uppercase text-white/10 italic">Empty Logo</span>
                      )}
                    </div>
                  </div>
                ))}
                <ImageDropzone
                  onUpload={(url) => {
                    setContent({ 
                      ...content, 
                      partnerLogos: [...(content.partnerLogos || []), { id: Date.now().toString(), url, name: '' }] 
                    });
                  }}
                  className="border-2 border-dashed border-white/10 rounded-2xl aspect-video flex flex-col items-center justify-center text-white/20 hover:text-brand-accent hover:border-brand-accent group"
                  label="Logo Upload"
                >
                  <Upload size={32} className="mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Logo Upload</span>
                </ImageDropzone>
              </div>
              <p className="text-white/20 text-xs italic">* 투명 배경(PNG) 로고 사용을 권장합니다. 홈 하단 배너에 자동으로 흐릅니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {inquiries.length === 0 ? (
                <div className="text-center py-20 text-white/20 italic">No inquiries found yet.</div>
              ) : (
                inquiries.map((inquiry) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={inquiry.id} 
                    className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col md:flex-row gap-8 items-start hover:bg-white/10 transition-all group"
                  >
                    <div className="md:w-64 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${inquiry.status === 'new' ? 'bg-brand-accent animate-pulse' : 'bg-white/20'}`} />
                        <span className="text-sm font-black uppercase tracking-widest">{inquiry.name}</span>
                      </div>
                      <div className="text-xs text-white/40 flex items-center gap-2">
                         <Clock size={12} /> {new Date(inquiry.createdAt).toLocaleString()}
                      </div>
                      <div className="text-sm font-medium text-brand-accent">{inquiry.contact}</div>
                    </div>
                    <div className="flex-1 text-white/70 text-sm leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5">
                      {inquiry.message}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
