import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, ChevronRight } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'ai' | 'user', text: string }>>([
    { role: 'ai', text: '안녕하세요! 곰애드 AI 비즈니스 파트너입니다. 어떤 비즈니스 고민을 가지고 계신가요?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Client-side Gemini configuration
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: `당신은 종합 광고대행사 '곰애드(GOM AD)'의 전문 상담원입니다. 
    우직하고 신뢰감 있는 말투를 사용하세요. 
    브랜딩, 온라인 광고(네이버, 유튜브, 메타, 구글), 오프라인 광고(지하철, 버스, 전광판), 홈페이지 제작에 대해 전문적으로 답변하세요.
    답변은 친절하게 하되 너무 길지 않게 핵심 위주로 하세요.
    답변 끝에는 필요시 상세 상담 링크(https://litt.ly/gom_ads)를 안내하세요.`
  });

  const options = [
    { label: "브랜딩 상담", action: "브랜딩 상담을 받고 싶어요." },
    { label: "광고 집행 문의", action: "광고 집행에 대해 알려주세요." },
    { label: "홈페이지 제작", action: "홈페이지 제작 비용이 궁금해요." },
  ];

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const newMessages = [...messages, { role: 'user' as const, text }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        throw new Error('API 키가 설정되지 않았습니다.');
      }

      const chat = model.startChat({
        history: messages.map(m => ({
          role: m.role === 'ai' ? 'model' : 'user',
          parts: [{ text: m.text }]
        })),
      });

      const result = await chat.sendMessage(text);
      const response = await result.response;
      const aiText = response.text();

      if (aiText) {
        setMessages([...newMessages, { role: 'ai', text: aiText }]);
      } else {
        throw new Error('AI 답변을 가져오지 못했습니다.');
      }
    } catch (error: any) {
      console.error("Chat Error:", error);
      setMessages([...newMessages, { role: 'ai', text: '죄송합니다. 서비스에 일시적인 오류가 발생했습니다. (API 키 확인 필요)' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-[350px] overflow-hidden rounded-3xl glass shadow-2xl flex flex-col"
          >
            <div className="bg-brand-surface p-6 flex justify-between items-center border-b border-brand-border">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
                <span className="font-display font-black text-[10px] tracking-[0.2em] uppercase text-black">GOM AD AI Partner</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-black/5 rounded-full transition-colors text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 h-[400px] overflow-y-auto bg-white flex flex-col">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : ''}`}>
                  {m.role === 'ai' && (
                    <div className="w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-brand-accent">G</span>
                    </div>
                  )}
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed border ${
                    m.role === 'ai' 
                      ? 'bg-brand-surface border-brand-border rounded-tl-none text-black' 
                      : 'bg-brand-accent border-brand-accent text-white rounded-tr-none'
                  } max-w-[80%]`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center animate-bounce">
                    <span className="text-[10px] font-bold text-brand-accent">.</span>
                  </div>
                </div>
              )}

              {messages.length === 1 && (
                <div className="space-y-2 ml-10">
                  {options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(opt.action)}
                      className="w-full text-left p-3 rounded-xl border border-brand-border hover:border-brand-accent/50 hover:bg-brand-accent/5 transition-all text-xs flex items-center justify-between group text-black font-medium"
                    >
                      {opt.label}
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }}
              className="p-4 bg-brand-surface border-t border-brand-border flex gap-2"
            >
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="질문을 입력하세요..."
                className="flex-1 bg-white rounded-full px-4 py-2 text-[12px] border border-brand-border focus:outline-none focus:border-brand-accent text-black"
              />
              <button 
                type="submit"
                disabled={isLoading}
                className="w-8 h-8 rounded-full bg-brand-accent flex items-center justify-center text-white hover:scale-110 transition-transform disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 rounded-full bg-brand-accent text-white flex items-center justify-center relative group overflow-hidden border-2 border-white/10"
      >
        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-25 transition-opacity" />
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageSquare className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-brand-bg animate-bounce flex items-center justify-center text-[8px] text-white font-bold">1</span>
      </motion.button>
    </div>
  );
};
