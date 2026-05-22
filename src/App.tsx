import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'motion/react';
import {
  Globe, Download, Copy, Check, Link as LinkIcon, 
  Zap, Shield, Infinity as InfinityIcon, ArrowRight, ArrowLeft, Image as ImageIcon, ChevronDown, ChevronUp, Upload, X
} from 'lucide-react';
import { translations, Language } from './translations';
import { generateDeepLink } from './utils';

const getInitialLanguage = (): Language => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.language) {
    return window.navigator.language.startsWith('ar') ? 'ar' : 'en';
  }
  return 'ar';
};

export default function App() {
  const [lang, setLang] = useState<Language>(getInitialLanguage());
  const [url, setUrl] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isImgCopied, setIsImgCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Customization State
  const [colorDark, setColorDark] = useState('#312e81');
  const [colorLight, setColorLight] = useState('#ffffff');
  const [logoFile, setLogoFile] = useState<string | null>(null);

  // FAQ State
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  // Navigation State
  const [view, setView] = useState<'home' | 'privacy' | 'terms'>('home');

  const t = translations[lang];

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoFile(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsGenerating(true);
    setQrCodeDataUrl(null);
    setDeepLink(null);
    setIsCopied(false);
    setIsImgCopied(false);

    try {
      const generatedDeepLink = generateDeepLink(url);
      const canvas = document.createElement('canvas');
      
      // Use H error correction to tolerate the logo being in the middle
      await QRCode.toCanvas(canvas, generatedDeepLink, {
        width: 1000, // Higher resolution for better quality when downloading/copying
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: colorDark,
          light: colorLight,
        },
      });

      // Draw Logo
      if (logoFile) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = logoFile;
          });
          
          // Size of the logo relative to QR code size (around 22% works well with H)
          const logoSize = canvas.width * 0.22;
          const x = (canvas.width - logoSize) / 2;
          const y = (canvas.height - logoSize) / 2;
          
          // Draw solid background for the logo to improve scanning readability
          ctx.fillStyle = colorLight;
          ctx.beginPath();
          ctx.roundRect(x - 10, y - 10, logoSize + 20, logoSize + 20, 20);
          ctx.fill();
          
          // Draw the actual logo
          ctx.drawImage(img, x, y, logoSize, logoSize);
        }
      }

      const dataUrl = canvas.toDataURL('image/png');

      // Small delay just to show generating animation for viral feel
      setTimeout(() => {
        setDeepLink(generatedDeepLink);
        setQrCodeDataUrl(dataUrl);
        setIsGenerating(false);
      }, 600);
    } catch (err) {
      console.error('Failed to generate QR code', err);
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (deepLink) {
      try {
        await navigator.clipboard.writeText(deepLink);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy text', err);
      }
    }
  };
  
  const handleCopyImage = async () => {
    if (!qrCodeDataUrl) return;
    try {
      const response = await fetch(qrCodeDataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setIsImgCopied(true);
      setTimeout(() => setIsImgCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy image', err);
      // Fallback or alert could be added here
      alert("Browser does not support copying images directly. Use 'Download QR' instead.");
    }
  }

  // Social Share Handlers
  const shareText = lang === 'ar' 
    ? "اكتشفت هذه الأداة الرهيبة والمجانية لتوليد أكواد QR ذكية تفتح التطبيقات مباشرة! جربها 🚀"
    : "Check out this awesome free tool to generate Smart QR Codes that open apps directly! 🚀";
  const shareUrl = window.location.origin;

  const handleShareWa = () => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + shareUrl)}`, '_blank');
  const handleShareX = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  const handleShareFb = () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');

  // Render Functions
  const renderLegalView = () => {
    const isPrivacy = view === 'privacy';
    const pageTitle = isPrivacy ? t.legal.privacy : t.legal.terms;
    const pageText = isPrivacy ? t.legal.privacyText : t.legal.termsText;

    return (
      <motion.div 
        key="legal-view"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex-1 w-full max-w-4xl mx-auto px-4 py-20"
      >
        <button 
          onClick={() => setView('home')}
          className="mb-8 flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm font-semibold text-slate-700 hover:scale-105 active:scale-95 duration-200"
        >
          {lang === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          {t.legal.backHome}
        </button>
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 md:p-12">
          <h1 className="text-3xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            {pageTitle}
          </h1>
          <p className="text-lg text-slate-700 leading-relaxed font-medium">
            {pageText}
          </p>
        </div>
      </motion.div>
    );
  };

  const renderHomeView = () => (
    <motion.div 
      key="home-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full flex-1"
    >
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        
        {/* Trusted By Banner inside main */}
        <motion.div 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-10"
        >
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200 px-6 py-2 rounded-full shadow-sm text-sm md:text-base font-bold text-slate-700 flex items-center gap-2 animate-bounce-slow">
            {t.viral.trusted}
          </div>
        </motion.div>

        {/* Hero Section */}
        <div className="text-center mb-12 relative">
          <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
            {t.heroTitle}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 animate-pulse-slow block sm:inline mt-2 sm:mt-0">
              {t.heroTitleHighlight}
            </span>
          </h2>
          <p className="text-lg md:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-medium">
            {t.heroSubtitle}
          </p>
        </div>

        {/* Generator App (Viral Card) */}
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, type: "spring" }}
          className="bg-white rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(79,70,229,0.25)] border-2 border-indigo-50 p-6 md:p-10 mb-20 max-w-3xl mx-auto relative overflow-hidden group"
        >
          {/* Glowing Ambient Backgrounds */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-400 to-fuchsia-400 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-cyan-400 to-blue-400 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none" />
          
          <form onSubmit={handleGenerate} className="flex flex-col gap-6 relative z-10">
            <div className="relative group/input">
              <div className="absolute inset-y-0 start-0 pl-5 flex items-center pointer-events-none data-[dir=rtl]:pr-5 data-[dir=rtl]:left-auto px-5 z-10">
                <LinkIcon className="h-6 w-6 text-slate-400 group-focus-within/input:text-indigo-500 transition-colors" />
              </div>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t.inputPlaceholder}
                className={`block w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 py-5 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 text-lg md:text-xl font-medium transition-all duration-300 shadow-inner
                  ${lang === 'ar' ? 'pr-16' : 'pl-16'}`}
                dir="ltr"
              />
            </div>
            
            {/* Customization Options Bar */}
            <div className="flex flex-col sm:flex-row gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
              <div className="flex-1 flex flex-col gap-2">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.customization.colorDark}</label>
                 <div className="flex items-center gap-2">
                    <input type="color" value={colorDark} onChange={(e) => setColorDark(e.target.value)} className="w-10 h-10 p-1 rounded cursor-pointer border border-slate-200" />
                    <span className="text-sm font-mono text-slate-600">{colorDark}</span>
                 </div>
              </div>
              
              <div className="flex-1 flex flex-col gap-2">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.customization.colorLight}</label>
                 <div className="flex items-center gap-2">
                    <input type="color" value={colorLight} onChange={(e) => setColorLight(e.target.value)} className="w-10 h-10 p-1 rounded cursor-pointer border border-slate-200" />
                    <span className="text-sm font-mono text-slate-600">{colorLight}</span>
                 </div>
              </div>

              <div className="flex-1 flex flex-col gap-2">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.customization.logoUpload}</label>
                 <div className="flex items-center gap-2 h-10">
                    {!logoFile ? (
                      <>
                        <input
                          type="file"
                          id="logo-upload"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                        <label htmlFor="logo-upload" className="flex items-center justify-center gap-2 w-full h-full rounded-lg border border-slate-200 bg-white text-xs font-medium cursor-pointer hover:border-indigo-500 hover:text-indigo-600 transition-colors px-2">
                          <Upload className="w-4 h-4 shrink-0" />
                          <span className="truncate">{t.customization.logoUpload}</span>
                        </label>
                      </>
                    ) : (
                      <div className="flex items-center justify-between w-full h-full rounded-lg border border-indigo-200 bg-indigo-50 px-3 transition-colors">
                        <img src={logoFile} alt="Preview" className="h-6 w-6 object-contain rounded" />
                        <button type="button" onClick={() => setLogoFile(null)} className="text-slate-400 hover:text-red-500 focus:outline-none" title={t.customization.removeLogo}>
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                 </div>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isGenerating || !url}
              className="w-full relative overflow-hidden flex items-center justify-center gap-3 py-5 px-8 rounded-2xl shadow-xl text-xl font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:shadow-2xl hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300"
            >
              {/* Shine effect overlay */}
              <div className="absolute inset-0 bg-white/20 w-full h-full -translate-x-full skew-x-12 animate-[shimmer_2s_infinite] pointer-events-none" />
              <Zap className={`w-6 h-6 ${isGenerating ? 'animate-pulse' : ''}`} />
              {isGenerating ? t.generating : t.generateBtn}
            </button>
          </form>

          {/* Result Section */}
          <AnimatePresence>
            {qrCodeDataUrl && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 40 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="pt-10 border-t-2 border-slate-100 flex flex-col items-center relative z-10 overflow-hidden"
              >
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-[2rem] shadow-inner border border-indigo-100/50 mb-8 relative">
                    <img src={qrCodeDataUrl} alt="Generated QR Code" className="w-56 h-56 md:w-72 md:h-72 object-contain rounded-xl bg-white p-3 shadow-md border hover:scale-105 transition-transform duration-300" />
                  </div>
                </motion.div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full justify-center max-w-2xl px-4">
                  <a
                    href={qrCodeDataUrl}
                    download={`magic-qr-${Date.now()}.png`}
                    className="flex-1 flex items-center justify-center gap-2 py-4 px-2 border-2 border-slate-200 rounded-2xl shadow-sm font-bold text-slate-700 bg-white hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none transition-all active:scale-95 text-sm md:text-base"
                  >
                    <Download className="w-5 h-5 shrink-0" />
                    <span className="truncate">{t.downloadPngBtn}</span>
                  </a>
                  
                  <button
                    onClick={handleCopyImage}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 px-2 border-2 rounded-2xl shadow-sm font-bold focus:outline-none transition-all active:scale-95 text-sm md:text-base ${
                      isImgCopied 
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700' 
                      : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
                    }`}
                  >
                    {isImgCopied ? <Check className="w-5 h-5 shrink-0" /> : <ImageIcon className="w-5 h-5 shrink-0" />}
                    <span className="truncate">{isImgCopied ? t.copiedBtn : t.copyImgBtn}</span>
                  </button>

                  <button
                    onClick={handleCopy}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 px-2 border-2 rounded-2xl shadow-sm font-bold focus:outline-none transition-all active:scale-95 text-sm md:text-base ${
                      isCopied 
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700' 
                      : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
                    }`}
                  >
                    {isCopied ? <Check className="w-5 h-5 shrink-0" /> : <LinkIcon className="w-5 h-5 shrink-0" />}
                    <span className="truncate">{isCopied ? t.copiedBtn : t.copyLinkBtn}</span>
                  </button>
                </div>

                {/* Viral Share Block */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                  className="mt-10 w-full max-w-xl bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col items-center"
                >
                  <p className="font-bold text-slate-800 mb-4 text-center">{t.viral.share}</p>
                  <div className="flex gap-4">
                    <button onClick={handleShareWa} className="w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:scale-110 hover:shadow-xl active:scale-95 transition-all">
                      <span className="text-2xl">📱</span>
                    </button>
                    <button onClick={handleShareX} className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center shadow-lg hover:scale-110 hover:shadow-xl active:scale-95 transition-all">
                      <span className="text-2xl font-bold leading-none select-none">𝕏</span>
                    </button>
                    <button onClick={handleShareFb} className="w-14 h-14 rounded-full bg-[#1877F2] text-white flex items-center justify-center shadow-lg hover:scale-110 hover:shadow-xl active:scale-95 transition-all">
                      <span className="text-2xl font-serif font-bold italic pr-1 select-none">f</span>
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-20 relative z-10">
          <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-xl transition-all">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 shadow-inner">
              <InfinityIcon className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 mb-3">{t.features.unlimitedTitle}</h3>
            <p className="text-slate-600 leading-relaxed font-medium text-lg">{t.features.unlimitedDesc}</p>
          </motion.div>
          
          <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-xl transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Zap className="w-32 h-32" />
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mb-6 text-amber-600 shadow-inner">
              <Zap className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 mb-3 relative z-10">{t.features.deepLinksTitle}</h3>
            <p className="text-slate-600 leading-relaxed font-medium text-lg relative z-10">{t.features.deepLinksDesc}</p>
          </motion.div>
          
          <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-xl transition-all">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 shadow-inner">
              <Shield className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 mb-3">{t.features.secureTitle}</h3>
            <p className="text-slate-600 leading-relaxed font-medium text-lg">{t.features.secureDesc}</p>
          </motion.div>
        </div>

        {/* SEO Content Section */}
        <article className="bg-white p-8 md:p-14 rounded-3xl border border-slate-100 shadow-sm relative z-10 overflow-hidden">
          {/* Decorative watermark pattern */}
          <div className="absolute opacity-[0.02] -right-20 -bottom-20 pointer-events-none">
            <Zap className="w-[400px] h-[400px]" />
          </div>
          <div className="max-w-4xl border-l-[6px] border-blue-500 pl-8 data-[dir=rtl]:pl-0 data-[dir=rtl]:pr-8 data-[dir=rtl]:border-l-0 data-[dir=rtl]:border-r-[6px] mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-5">{t.seo.whatIsTitle}</h2>
            <p className="text-xl text-slate-600 leading-relaxed">{t.seo.whatIsDesc}</p>
          </div>
          
          <div className="max-w-4xl border-l-[6px] border-indigo-500 pl-8 data-[dir=rtl]:pl-0 data-[dir=rtl]:pr-8 data-[dir=rtl]:border-l-0 data-[dir=rtl]:border-r-[6px] mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-5">{t.seo.howHelpsTitle}</h2>
            <p className="text-xl text-slate-600 leading-relaxed">{t.seo.howHelpsDesc}</p>
          </div>
          
          <div className="max-w-4xl border-l-[6px] border-emerald-500 pl-8 data-[dir=rtl]:pl-0 data-[dir=rtl]:pr-8 data-[dir=rtl]:border-l-0 data-[dir=rtl]:border-r-[6px]">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-5">{t.seo.whyFreeTitle}</h2>
            <p className="text-xl text-slate-600 leading-relaxed">{t.seo.whyFreeDesc}</p>
          </div>
        </article>

        {/* FAQ Section */}
        <div className="mt-16 max-w-4xl mx-auto relative z-10">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-8 text-center">{t.faq.title}</h2>
          
          <div className="flex flex-col gap-4">
            {[
              { q: t.faq.q1, a: t.faq.a1 },
              { q: t.faq.q2, a: t.faq.a2 },
              { q: t.faq.q3, a: t.faq.a3 },
              { q: t.faq.q4, a: t.faq.a4 }
            ].map((faq, index) => (
              <div 
                key={index} 
                className={`bg-white rounded-2xl border transition-all duration-300 ${openFaq === index ? 'border-indigo-500 shadow-md ring-2 ring-indigo-50' : 'border-slate-200 hover:border-indigo-300 shadow-sm'}`}
              >
                <button 
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center justify-between p-6 text-start focus:outline-none"
                >
                  <span className="text-lg font-bold text-slate-800">{faq.q}</span>
                  <div className={`p-2 rounded-full transition-colors ${openFaq === index ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-slate-400'}`}>
                    {openFaq === index ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>
                <AnimatePresence>
                  {openFaq === index && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-0">
                        <p className="text-slate-600 font-medium leading-relaxed border-t border-slate-100 pt-4">
                          {faq.a}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </main>
    </motion.div>
  );

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans ${lang === 'ar' ? 'rtl' : 'ltr'}`}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer { 100% { transform: translateX(100%) skewX(12deg); } }
        .animate-bounce-slow { animation: bounce 3s infinite; }
        .animate-pulse-slow { animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}} />

      {/* Trending Banner */}
      <div className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 text-white text-center py-2.5 px-4 shadow-md relative z-40">
        <p className="font-bold text-sm md:text-base animate-pulse-slow flex items-center justify-center gap-2">
          {t.viral.trending}
        </p>
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <button onClick={() => setView('home')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">{t.title}</h1>
          </button>
          
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-slate-200 bg-white hover:border-indigo-300 hover:text-indigo-600 transition-all font-bold shadow-sm hover:shadow active:scale-95"
          >
            <Globe className="w-5 h-5" />
            <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
          </button>
        </div>
      </header>

      {/* Dynamic Content View */}
      <AnimatePresence mode="wait">
        {view === 'home' && renderHomeView()}
        {(view === 'privacy' || view === 'terms') && renderLegalView()}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-4 text-sm font-semibold">
            <button onClick={() => setView('privacy')} className="hover:text-blue-400 transition-colors bg-slate-800 px-4 py-2 rounded-full">{t.legal.privacy}</button>
            <button onClick={() => setView('terms')} className="hover:text-blue-400 transition-colors bg-slate-800 px-4 py-2 rounded-full">{t.legal.terms}</button>
          </div>
          <p className="font-medium text-slate-500 mt-4">
            {lang === 'ar' ? 'تم التصميم والتطوير بكل ♥ - منصة مجانية 100% للأبد.' : 'Designed & Developed with ♥ - 100% Free Forever platform.'}
          </p>
        </div>
      </footer>
    </div>
  );
}
