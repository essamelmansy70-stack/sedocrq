import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'motion/react';
import {
  Globe, Download, Copy, Check, Link as LinkIcon, 
  Zap, Shield, Infinity as InfinityIcon, ArrowRight, ArrowLeft, Image as ImageIcon, ChevronDown, ChevronUp, Upload, X, QrCode,
  Mail, MessageSquare, Send
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

  // Tracking & Redirection State
  const [redirectingUrl, setRedirectingUrl] = useState<string | null>(null);
  const [enableTracking, setEnableTracking] = useState(true);
  const [scanStats, setScanStats] = useState<{ totalScans: number; scansByUrl: Record<string, number>; lastScans: Record<string, string> }>({
    totalScans: 0,
    scansByUrl: {},
    lastScans: {},
  });
  const [showSimulateToast, setShowSimulateToast] = useState(false);

  // FAQ State
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  // Navigation State
  const [view, setView] = useState<'home' | 'privacy' | 'terms' | 'contact'>('home');

  // Contact State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isContactSubmitted, setIsContactSubmitted] = useState(false);
  const [copiedEmailState, setCopiedEmailState] = useState(false);
  const [copiedMessageState, setCopiedMessageState] = useState(false);

  const t = translations[lang];

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Read stats from localStorage and check for redirect params on mount
  useEffect(() => {
    // 1. Check for incoming redirections
    const params = new URLSearchParams(window.location.search);
    const target = params.get('r') || params.get('redirect');
    
    // 2. Hydrate statistics logs
    const existingStatsStr = localStorage.getItem('qrytube_scan_stats');
    let freshStats = { totalScans: 0, scansByUrl: {} as Record<string, number>, lastScans: {} as Record<string, string> };
    if (existingStatsStr) {
      try {
        const parsed = JSON.parse(existingStatsStr);
        freshStats = {
          totalScans: parsed.totalScans || 0,
          scansByUrl: parsed.scansByUrl || {},
          lastScans: parsed.lastScans || {},
        };
        setScanStats(freshStats);
      } catch (e) {
        console.error('Failed to parse qrytube_scan_stats on init', e);
      }
    }

    if (target) {
      try {
        const decoded = decodeURIComponent(target);
        setRedirectingUrl(decoded);
        
        // Log a new scan instance securely
        freshStats.totalScans = (freshStats.totalScans || 0) + 1;
        const cleanTarget = decoded.replace(/^https?:\/\//i, '').split(/[?#]/)[0];
        freshStats.scansByUrl[cleanTarget] = (freshStats.scansByUrl[cleanTarget] || 0) + 1;
        freshStats.lastScans[cleanTarget] = new Date().toISOString();
        
        localStorage.setItem('qrytube_scan_stats', JSON.stringify(freshStats));
        setScanStats(freshStats);
        
        // Push actual window redirect after 1.4s delay for gorgeous splash feel
        const timer = setTimeout(() => {
          window.location.replace(decoded);
        }, 1400);
        
        return () => clearTimeout(timer);
      } catch (e) {
        console.error('Failed decoding redirection endpoint', e);
      }
    }
  }, []);

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
      
      // Determine what content goes into the QR based on tracking selection
      const finalQrContent = enableTracking 
        ? `${window.location.origin}?r=${encodeURIComponent(generatedDeepLink)}`
        : generatedDeepLink;

      const canvas = document.createElement('canvas');
      
      // Use H error correction to tolerate the logo being in the middle
      await QRCode.toCanvas(canvas, finalQrContent, {
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
        setDeepLink(finalQrContent);
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

  const handleSimulateScan = () => {
    if (!deepLink) return;
    
    // Increment count locally
    const stats = { ...scanStats };
    stats.totalScans = (stats.totalScans || 0) + 1;
    
    // Extract key for mapping
    const originalDestination = url.trim();
    const cleanTarget = originalDestination.replace(/^https?:\/\//i, '').split(/[?#]/)[0];
    
    if (!stats.scansByUrl) stats.scansByUrl = {};
    stats.scansByUrl[cleanTarget] = (stats.scansByUrl[cleanTarget] || 0) + 1;
    
    if (!stats.lastScans) stats.lastScans = {};
    stats.lastScans[cleanTarget] = new Date().toISOString();
    
    setScanStats(stats);
    localStorage.setItem('qrytube_scan_stats', JSON.stringify(stats));
    
    setShowSimulateToast(true);
    setTimeout(() => setShowSimulateToast(false), 3000);
    
    // Attempt to open redirection flow
    window.open(deepLink, '_blank');
  };

  // Social Share Handlers
  const shareText = lang === 'ar' 
    ? "اكتشفت هذه الأداة الرهيبة والمجانية لتوليد أكواد QR ذكية تفتح التطبيقات مباشرة! جربها 🚀"
    : "Check out this awesome free tool to generate Smart QR Codes that open apps directly! 🚀";
  const shareUrl = window.location.origin;

  const handleShareWa = () => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + shareUrl)}`, '_blank');
  const handleShareX = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  const handleShareFb = () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');

  // Contact Page Handlers
  const contactEmailTarget = 'essamelmansy70@gmail.com';

  const handleCopyContactEmail = async () => {
    try {
      await navigator.clipboard.writeText(contactEmailTarget);
      setCopiedEmailState(true);
      setTimeout(() => setCopiedEmailState(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) return;
    setIsContactSubmitted(true);
  };

  const handleSendViaEmail = () => {
    const mailSubject = encodeURIComponent(contactSubject || 'Qrytube Support Inquiry');
    const mailBody = encodeURIComponent(
      `Name: ${contactName}\n` +
      `Email: ${contactEmail}\n\n` +
      `Message:\n${contactMessage}`
    );
    window.open(`mailto:${contactEmailTarget}?subject=${mailSubject}&body=${mailBody}`, '_blank');
  };

  const handleSendViaWhatsApp = () => {
    const waText = encodeURIComponent(
      `*Qrytube Support Inquiry*\n` +
      `*Name:* ${contactName}\n` +
      `*Email:* ${contactEmail}\n` +
      `*Subject:* ${contactSubject || '-'}\n\n` +
      `*Message:*\n${contactMessage}`
    );
    window.open(`https://wa.me/201019623690?text=${waText}`, '_blank');
  };

  const handleCopyWholeMessage = async () => {
    const textToCopy = `[Qrytube Support Message]\n` +
      `Name: ${contactName}\n` +
      `Email: ${contactEmail}\n` +
      `Subject: ${contactSubject || '-'}\n` +
      `Message: ${contactMessage}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedMessageState(true);
      setTimeout(() => setCopiedMessageState(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const clearContactForm = () => {
    setContactName('');
    setContactEmail('');
    setContactSubject('');
    setContactMessage('');
    setIsContactSubmitted(false);
  };

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
          aria-label={t.legal.backHome}
          className="mb-8 flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm font-semibold text-slate-700 hover:scale-105 active:scale-95 duration-200"
        >
          {lang === 'ar' ? <ArrowRight className="w-5 h-5" aria-hidden="true" /> : <ArrowLeft className="w-5 h-5" aria-hidden="true" />}
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

  const renderContactView = () => {
    const tc = t.contact;
    if (!tc) return null;

    return (
      <motion.div 
        key="contact-view"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex-1 w-full max-w-5xl mx-auto px-4 py-16"
      >
        <button 
          onClick={() => { setView('home'); clearContactForm(); }}
          aria-label={t.legal.backHome}
          className="mb-8 flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm font-semibold text-slate-700 hover:scale-105 active:scale-95 duration-200"
        >
          {lang === 'ar' ? <ArrowRight className="w-5 h-5" aria-hidden="true" /> : <ArrowLeft className="w-5 h-5" aria-hidden="true" />}
          {t.legal.backHome}
        </button>

        <div className="grid lg:grid-cols-12 gap-10">
          {/* Left/Top: Interactive Contact Form Card */}
          <div className="lg:col-span-12 xl:col-span-7 bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 md:p-10 relative overflow-hidden group">
            {/* Glowing Ambient Backgrounds */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-indigo-400 to-fuchsia-400 rounded-full blur-3xl opacity-5 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cyan-400 to-blue-400 rounded-full blur-3xl opacity-5 pointer-events-none" />
            
            <h1 className="text-3xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative z-10">
              {tc.title}
            </h1>
            <p className="text-slate-600 font-medium mb-8 relative z-10">
              {tc.subTitle}
            </p>

            <AnimatePresence mode="wait">
              {!isContactSubmitted ? (
                <motion.form 
                  key="contact-form"
                  onSubmit={handleContactSubmit}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-5 relative z-10"
                >
                  <div>
                    <label htmlFor="contact-name" className="block text-sm font-bold text-slate-700 mb-2">
                      {tc.name} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="contact-name"
                      required
                      placeholder={tc.namePlaceholder}
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 font-medium text-slate-800 transition-all bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-email" className="block text-sm font-bold text-slate-700 mb-2">
                      {tc.email} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="contact-email"
                      required
                      placeholder={tc.emailPlaceholder}
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 font-medium text-slate-800 transition-all bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-subject" className="block text-sm font-bold text-slate-700 mb-2">
                      {tc.subject}
                    </label>
                    <input
                      type="text"
                      id="contact-subject"
                      placeholder={tc.subjectPlaceholder}
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 font-medium text-slate-800 transition-all bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-message" className="block text-sm font-bold text-slate-700 mb-2">
                      {tc.message} <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="contact-message"
                      required
                      rows={4}
                      placeholder={tc.messagePlaceholder}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 font-medium text-slate-800 transition-all bg-slate-50/50 resize-y"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 relative overflow-hidden flex items-center justify-center gap-2.5 py-4 px-6 rounded-xl shadow-lg text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-xl hover:scale-[1.01] active:scale-95 transition-all duration-300"
                  >
                    <Send className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    <span>{tc.submitBtn}</span>
                  </button>
                </motion.form>
              ) : (
                <motion.div 
                  key="contact-success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center text-center py-6 relative z-10"
                >
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <Check className="w-8 h-8 flex-shrink-0" aria-hidden="true" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 mb-4">{tc.successTitle}</h3>
                  <p className="text-slate-600 font-medium leading-relaxed mb-8 max-w-md text-sm md:text-base">
                    {tc.successDesc}
                  </p>

                  <div className="w-full bg-slate-50 rounded-2xl border border-slate-200 p-5 mb-8 text-start">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 border-b pb-2">
                      {tc.sendingNotice}
                    </p>
                    <div className="flex flex-col gap-3 font-semibold text-slate-700 text-sm">
                      <div>
                        <span className="text-slate-400 font-medium">{lang === 'ar' ? 'الاسم' : 'Name'}:</span> {contactName}
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">{lang === 'ar' ? 'البريد للإرسال' : 'Form Email'}:</span> {contactEmail}
                      </div>
                      {contactSubject && (
                        <div>
                          <span className="text-slate-400 font-medium">{lang === 'ar' ? 'الموضوع' : 'Subject'}:</span> {contactSubject}
                        </div>
                      )}
                      <div className="mt-1">
                        <span className="text-slate-400 font-medium block mb-1">{lang === 'ar' ? 'تفاصيل الرسالة المنسقة' : 'Formatted Message'}:</span>
                        <div className="bg-white p-3 rounded-lg border text-xs text-slate-800 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {contactMessage}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                    <button
                      onClick={handleSendViaEmail}
                      className="flex-1 flex items-center justify-center gap-2 py-4 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow font-bold text-sm md:text-base transition-all active:scale-95 duration-200"
                    >
                      <Mail className="w-5 h-5 shrink-0" aria-hidden="true" />
                      <span>{tc.sendEmailDirect}</span>
                    </button>

                    <button
                      onClick={handleSendViaWhatsApp}
                      className="flex-1 flex items-center justify-center gap-2 py-4 px-4 bg-[#25D366] hover:bg-emerald-600 text-white rounded-xl shadow font-bold text-sm md:text-base transition-all active:scale-95 duration-200"
                    >
                      <MessageSquare className="w-5 h-5 shrink-0" aria-hidden="true" />
                      <span>{tc.sendWaDirect}</span>
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full justify-center">
                    <button
                      onClick={handleCopyWholeMessage}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 border border-slate-200 rounded-xl font-bold transition-all active:scale-95 text-xs ${
                        copiedMessageState 
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700' 
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {copiedMessageState ? <Check className="w-4 h-4 shrink-0 transition-opacity" aria-hidden="true" /> : <Copy className="w-4 h-4 shrink-0 transition-opacity" aria-hidden="true" />}
                      <span>{copiedMessageState ? t.copiedBtn : tc.copyWholeMessage}</span>
                    </button>

                    <button
                      onClick={clearContactForm}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl font-bold transition-all active:scale-95 text-xs"
                    >
                      <span>{tc.closeBtn}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right/Bottom: Alternative Fast Support Side Panel */}
          <div className="lg:col-span-12 xl:col-span-5 flex flex-col gap-6">
            <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-[2rem] text-white p-8 md:p-10 shadow-xl border border-indigo-950/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500 to-fuchsia-500 rounded-full blur-3xl opacity-10 pointer-events-none" />
              
              <h2 className="text-2xl font-extrabold mb-6 relative z-10">{tc.altTitle}</h2>
              
              <div className="flex flex-col gap-6">
                {/* Email Direct Card */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-white/15 p-2 rounded-lg text-amber-300">
                      <Mail className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-bold text-white">{tc.emailCardTitle}</h3>
                  </div>
                  <p className="text-indigo-200 text-sm font-medium mb-4 leading-relaxed">
                    {tc.emailCardDesc}
                  </p>
                  <p className="text-sm font-mono text-white/95 font-bold mb-4 select-all pb-1 border-b border-white/10 block leading-none">
                    {contactEmailTarget}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyContactEmail}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-bold transition-all select-none ${
                        copiedEmailState 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-white/15 text-white hover:bg-white/25'
                      }`}
                    >
                      <span>{copiedEmailState ? tc.copiedEmail : tc.copyEmail}</span>
                    </button>
                    <a
                      href={`mailto:${contactEmailTarget}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all text-center select-none"
                    >
                      <span>{tc.openEmailApp}</span>
                    </a>
                  </div>
                </div>

                {/* WhatsApp Direct Card */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-white/15 p-2 rounded-lg text-[#25D366]">
                      <MessageSquare className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-bold text-white">{tc.waCardTitle}</h3>
                  </div>
                  <p className="text-indigo-200 text-sm font-medium mb-4 leading-relaxed">
                    {tc.waCardDesc}
                  </p>
                  <a
                    href="https://wa.me/201019623690"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 py-3 px-4 rounded-lg text-xs font-bold bg-[#25D366] hover:bg-[#20ba56] text-white transition-all text-center select-none"
                  >
                    <span>{tc.waBtn}</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Premium Guarantee Stamp Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="bg-violet-100 text-violet-600 p-3 rounded-2xl shadow-inner flex-shrink-0">
                <Shield className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm md:text-base leading-snug">
                  {lang === 'ar' ? 'مسؤولية الخصوصية الكاملة' : 'Privacy-First Response'}
                </h4>
                <p className="text-slate-500 text-xs font-medium leading-relaxed mt-1">
                  {lang === 'ar' 
                    ? 'من دقة أماننا، لا نمرر بياناتك لخوادم طرف ثالث. التواصل محمي بنسبة 100٪.' 
                    : 'Your queries are processed clean offline. We never stream or sell data points.'}
                </p>
              </div>
            </div>
          </div>
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
          
          <form onSubmit={handleGenerate} className="flex flex-col gap-6 relative z-10" aria-label={lang === 'ar' ? 'نموذج توليد كود الاستجابة السريعة' : 'QR code generation form'}>
            <div className="relative group/input">
              <div className="absolute inset-y-0 start-0 pl-5 flex items-center pointer-events-none data-[dir=rtl]:pr-5 data-[dir=rtl]:left-auto px-5 z-10">
                <LinkIcon className="h-6 w-6 text-slate-400 group-focus-within/input:text-indigo-500 transition-colors" aria-hidden="true" />
              </div>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t.inputPlaceholder}
                aria-label={lang === 'ar' ? 'رابط حسابك أو قناتك على مواقع التواصل' : 'Your social media profile or channel link'}
                className={`block w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 py-5 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 text-lg md:text-xl font-medium transition-all duration-300 shadow-inner text-slate-800
                  ${lang === 'ar' ? 'pr-16' : 'pl-16'}`}
                dir="ltr"
              />
            </div>
            
            {/* Customization Options Bar */}
            <div className="flex flex-col sm:flex-row gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
              <div className="flex-1 flex flex-col gap-2">
                 <label htmlFor="color-dark-picker" className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t.customization.colorDark}</label>
                 <div className="flex items-center gap-2">
                    <input id="color-dark-picker" type="color" value={colorDark} onChange={(e) => setColorDark(e.target.value)} aria-label={t.customization.colorDark} className="w-10 h-10 p-1 rounded cursor-pointer border border-slate-200" />
                    <span className="text-sm font-mono text-slate-700">{colorDark}</span>
                 </div>
              </div>
              
              <div className="flex-1 flex flex-col gap-2">
                 <label htmlFor="color-light-picker" className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t.customization.colorLight}</label>
                 <div className="flex items-center gap-2">
                    <input id="color-light-picker" type="color" value={colorLight} onChange={(e) => setColorLight(e.target.value)} aria-label={t.customization.colorLight} className="w-10 h-10 p-1 rounded cursor-pointer border border-slate-200" />
                    <span className="text-sm font-mono text-slate-700">{colorLight}</span>
                 </div>
              </div>

              <div className="flex-1 flex flex-col gap-2">
                 <label htmlFor="logo-upload" className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t.customization.logoUpload}</label>
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
                        <label htmlFor="logo-upload" className="flex items-center justify-center gap-2 w-full h-full rounded-lg border border-slate-200 bg-white text-xs font-semibold cursor-pointer hover:border-indigo-500 hover:text-indigo-600 transition-colors px-2 text-slate-700">
                          <Upload className="w-4 h-4 shrink-0" aria-hidden="true" />
                          <span className="truncate">{t.customization.logoUpload}</span>
                        </label>
                      </>
                    ) : (
                      <div className="flex items-center justify-between w-full h-full rounded-lg border border-indigo-200 bg-indigo-50 px-3 transition-colors">
                        <img src={logoFile} alt={lang === 'ar' ? "شعار مخصص للمركز" : "Custom center logo preview"} className="h-6 w-6 object-contain rounded" />
                        <button type="button" onClick={() => setLogoFile(null)} className="text-slate-500 hover:text-red-500 focus:outline-none" title={t.customization.removeLogo} aria-label={t.customization.removeLogo}>
                          <X className="w-5 h-5" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                 </div>
              </div>
            </div>

            {/* Tracking Toggle Bar */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-5 rounded-2xl border border-indigo-100 flex items-center justify-between gap-4">
              <div className="flex-1">
                <label className="flex items-center gap-3 text-sm font-black text-slate-800 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={enableTracking} 
                    onChange={(e) => setEnableTracking(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer accent-indigo-600 shrink-0"
                  />
                  <span>{t.tracker.enableLabel}</span>
                </label>
                <p className="text-xs text-slate-500 font-bold mt-1.5 leading-relaxed">
                  {t.tracker.enableSub}
                </p>
              </div>
              <div className="bg-indigo-600 text-white rounded-xl p-2.5 hidden sm:block shadow-md">
                <QrCode className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isGenerating || !url}
              className="w-full relative overflow-hidden flex items-center justify-center gap-3 py-5 px-8 rounded-2xl shadow-xl text-xl font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:shadow-2xl hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300"
            >
              {/* Shine effect overlay */}
              <div className="absolute inset-0 bg-white/20 w-full h-full -translate-x-full skew-x-12 animate-[shimmer_2s_infinite] pointer-events-none" />
              <Zap className={`w-6 h-6 ${isGenerating ? 'animate-pulse' : ''}`} aria-hidden="true" />
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
                <div className="mb-4 text-center">
                  <h3 id="generated-header" className="text-2xl font-black text-slate-800 mb-2">
                    {lang === 'ar' ? '🎉 كود QR الذكي الخاص بك جاهز!' : '🎉 Your Smart QR Code is ready!'}
                  </h3>
                </div>

                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-[2rem] shadow-inner border border-indigo-100/50 mb-8 relative">
                    <img 
                      src={qrCodeDataUrl} 
                      alt={lang === 'ar' ? "كود استجابة سريعة ذكي لفتح التطبيقات مباشرة" : "Smart QR code designed to open official mobile app natively"} 
                      className="w-56 h-56 md:w-72 md:h-72 object-contain rounded-xl bg-white p-3 shadow-md border hover:scale-105 transition-transform duration-300" 
                    />
                  </div>
                </motion.div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full justify-center max-w-2xl px-4">
                  <a
                    href={qrCodeDataUrl}
                    download={`magic-qr-${Date.now()}.png`}
                    aria-label={t.downloadPngBtn}
                    className="flex-1 flex items-center justify-center gap-2 py-4 px-2 border-2 border-slate-200 rounded-2xl shadow-sm font-bold text-slate-700 bg-white hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none transition-all active:scale-95 text-sm md:text-base"
                  >
                    <Download className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{t.downloadPngBtn}</span>
                  </a>
                  
                  <button
                    onClick={handleCopyImage}
                    aria-label={isImgCopied ? t.copiedBtn : t.copyImgBtn}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 px-2 border-2 rounded-2xl shadow-sm font-bold focus:outline-none transition-all active:scale-95 text-sm md:text-base ${
                      isImgCopied 
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700' 
                      : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
                    }`}
                  >
                    {isImgCopied ? <Check className="w-5 h-5 shrink-0" aria-hidden="true" /> : <ImageIcon className="w-5 h-5 shrink-0" aria-hidden="true" />}
                    <span className="truncate">{isImgCopied ? t.copiedBtn : t.copyImgBtn}</span>
                  </button>

                  <button
                    onClick={handleCopy}
                    aria-label={isCopied ? t.copiedBtn : t.copyLinkBtn}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 px-2 border-2 rounded-2xl shadow-sm font-bold focus:outline-none transition-all active:scale-95 text-sm md:text-base ${
                      isCopied 
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700' 
                      : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
                    }`}
                  >
                    {isCopied ? <Check className="w-5 h-5 shrink-0" aria-hidden="true" /> : <LinkIcon className="w-5 h-5 shrink-0" aria-hidden="true" />}
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
                    <button 
                      onClick={handleShareWa} 
                      aria-label={lang === 'ar' ? "مشاركة الأداة عبر تطبيق واتساب" : "Share tool on WhatsApp"}
                      className="w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:scale-110 hover:shadow-xl active:scale-95 transition-all"
                    >
                      <span className="text-2xl" aria-hidden="true">📱</span>
                    </button>
                    <button 
                      onClick={handleShareX} 
                      aria-label={lang === 'ar' ? "مشاركة الأداة عبر منصة إكس" : "Share tool on platform X"}
                      className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center shadow-lg hover:scale-110 hover:shadow-xl active:scale-95 transition-all"
                    >
                      <span className="text-2xl font-bold leading-none select-none" aria-hidden="true">𝕏</span>
                    </button>
                    <button 
                      onClick={handleShareFb} 
                      aria-label={lang === 'ar' ? "مشاركة الأداة عبر فيسبوك" : "Share tool on Facebook"}
                      className="w-14 h-14 rounded-full bg-[#1877F2] text-white flex items-center justify-center shadow-lg hover:scale-110 hover:shadow-xl active:scale-95 transition-all"
                    >
                      <span className="text-2xl font-serif font-bold italic pr-1 select-none" aria-hidden="true">f</span>
                    </button>
                  </div>
                </motion.div>

                {/* Scan Tracker Dashboard */}
                <motion.div 
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.5 }}
                  className="mt-10 w-full max-w-xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white rounded-[2rem] p-6 md:p-8 shadow-2xl border border-indigo-950 relative overflow-hidden text-start"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full blur-3xl opacity-25 pointer-events-none" />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 mb-6 gap-3 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-500/20 text-yellow-300 p-2.5 rounded-xl shadow-inner">
                        <QrCode className="w-5 h-5 animate-pulse" aria-hidden="true" />
                      </div>
                      <h4 className="font-extrabold text-lg md:text-xl text-white">
                        {t.tracker.dashboardTitle}
                      </h4>
                    </div>
                    <span className="bg-emerald-500/15 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/25 flex items-center gap-1.5 self-start sm:self-auto animate-pulse select-none">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 font-sans" />
                      {t.tracker.statusActive}
                    </span>
                  </div>

                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                      <span className="text-xs text-indigo-200/80 font-bold uppercase tracking-wider">
                        {t.tracker.currentScans}
                      </span>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white font-mono">
                          {scanStats.scansByUrl[url.trim().replace(/^https?:\/\//i, '').split(/[?#]/)[0]] || 0}
                        </span>
                        <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">✨ Live</span>
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                      <span className="text-xs text-indigo-200/80 font-bold uppercase tracking-wider">
                        {t.tracker.totalScans}
                      </span>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white font-mono">
                          {scanStats.totalScans || 0}
                        </span>
                        <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Accumulated</span>
                      </div>
                    </div>
                  </div>

                  {/* Simulate scan action */}
                  <div className="relative z-10 mb-6">
                    <button
                      onClick={handleSimulateScan}
                      className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl font-black bg-white text-indigo-950 hover:bg-slate-50 hover:scale-[1.01] active:scale-95 transition-all shadow-md group duration-200"
                    >
                      <Zap className="w-5 h-5 text-amber-500 group-hover:rotate-12 transition-transform" aria-hidden="true" />
                      <span>{t.tracker.simulateBtn}</span>
                    </button>
                    
                    <p className="text-[10px] text-indigo-200/70 text-center font-semibold mt-2 leading-relaxed">
                      {lang === 'ar' ? '💡 سيقوم بمسح تجريبي للرابط وتوضيح كيف تعمل تكنولوجيا التوجيه.' : '💡 Opens & counts a simulated scan to test the smart deep link redirection.'}
                    </p>

                    <AnimatePresence>
                      {showSimulateToast && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute -top-14 left-0 right-0 mx-auto max-w-xs bg-emerald-500 text-white rounded-full py-2.5 px-4 shadow-xl z-30 flex items-center justify-center gap-2 text-xs font-black"
                        >
                          <Check className="w-4 h-4 shrink-0 animate-scale" aria-hidden="true" />
                          <span>{t.tracker.simulateSuccess}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Scans list / History log */}
                  <div className="relative z-10 border-t border-white/10 pt-5">
                    <p className="text-xs font-extrabold text-indigo-200/90 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <span>{t.tracker.scansHistory}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    </p>

                    {Object.keys(scanStats.scansByUrl || {}).length === 0 ? (
                      <p className="text-xs font-semibold text-indigo-200/50 italic py-2 text-center">
                        {t.tracker.noScansYet}
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                        {Object.entries(scanStats.scansByUrl).map(([trackedUrl, count]) => {
                          const lastDateStr = scanStats.lastScans?.[trackedUrl];
                          const lastDate = lastDateStr ? new Date(lastDateStr).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : '';
                          const isCurrent = trackedUrl === url.trim().replace(/^https?:\/\//i, '').split(/[?#]/)[0];
                          
                          return (
                            <div 
                              key={trackedUrl} 
                              className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs font-semibold transition-colors duration-200 ${
                                isCurrent 
                                ? 'bg-indigo-500/25 border-indigo-400/40 text-white shadow-inner' 
                                : 'bg-white/5 border-white/5 text-indigo-200 hover:bg-white/[0.08]'
                              }`}
                            >
                              <div className="flex flex-col gap-1 truncate max-w-[70%]">
                                <span className="font-mono truncate select-all">{trackedUrl}</span>
                                {lastDate && (
                                  <span className="text-[10px] text-indigo-300 font-medium">
                                    {t.tracker.lastScanned}: {lastDate}
                                  </span>
                                )}
                              </div>
                              <span className="bg-indigo-600 font-mono font-bold text-xs px-2.5 py-1 rounded-lg border border-white/10 shrink-0 text-white shadow-sm">
                                {count} {lang === 'ar' ? 'مسحة' : 'scans'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
              <InfinityIcon className="w-8 h-8" aria-hidden="true" />
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 mb-3">{t.features.unlimitedTitle}</h3>
            <p className="text-slate-600 leading-relaxed font-semibold text-lg">{t.features.unlimitedDesc}</p>
          </motion.div>
          
          <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-xl transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Zap className="w-32 h-32" aria-hidden="true" />
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mb-6 text-amber-600 shadow-inner">
              <Zap className="w-8 h-8" aria-hidden="true" />
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 mb-3 relative z-10">{t.features.deepLinksTitle}</h3>
            <p className="text-slate-600 leading-relaxed font-semibold text-lg relative z-10">{t.features.deepLinksDesc}</p>
          </motion.div>
          
          <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-xl transition-all">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 shadow-inner">
              <Shield className="w-8 h-8" aria-hidden="true" />
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 mb-3">{t.features.secureTitle}</h3>
            <p className="text-slate-600 leading-relaxed font-semibold text-lg">{t.features.secureDesc}</p>
          </motion.div>
        </div>

        {/* SEO Content Section */}
        <article className="bg-white p-8 md:p-14 rounded-3xl border border-slate-100 shadow-sm relative z-10 overflow-hidden" aria-label={lang === 'ar' ? 'معلومات تفصيلية عن الأداة' : 'Detailed information about the generator'}>
          {/* Decorative watermark pattern */}
          <div className="absolute opacity-[0.02] -right-20 -bottom-20 pointer-events-none" aria-hidden="true">
            <Zap className="w-[400px] h-[400px]" />
          </div>
          <div className="max-w-4xl border-l-[6px] border-blue-500 pl-8 data-[dir=rtl]:pl-0 data-[dir=rtl]:pr-8 data-[dir=rtl]:border-l-0 data-[dir=rtl]:border-r-[6px] mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-5">{t.seo.whatIsTitle}</h2>
            <p className="text-xl text-slate-700 leading-relaxed font-medium">{t.seo.whatIsDesc}</p>
          </div>
          
          <div className="max-w-4xl border-l-[6px] border-indigo-500 pl-8 data-[dir=rtl]:pl-0 data-[dir=rtl]:pr-8 data-[dir=rtl]:border-l-0 data-[dir=rtl]:border-r-[6px] mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-5">{t.seo.howHelpsTitle}</h2>
            <p className="text-xl text-slate-700 leading-relaxed font-medium">{t.seo.howHelpsDesc}</p>
          </div>
          
          <div className="max-w-4xl border-l-[6px] border-emerald-500 pl-8 data-[dir=rtl]:pl-0 data-[dir=rtl]:pr-8 data-[dir=rtl]:border-l-0 data-[dir=rtl]:border-r-[6px]">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-5">{t.seo.whyFreeTitle}</h2>
            <p className="text-xl text-slate-700 leading-relaxed font-medium">{t.seo.whyFreeDesc}</p>
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
                  id={`faq-btn-${index}`}
                  onClick={() => toggleFaq(index)}
                  aria-expanded={openFaq === index}
                  aria-controls={`faq-answer-${index}`}
                  className="w-full flex items-center justify-between p-6 text-start focus:outline-none"
                >
                  <span className="text-lg font-bold text-slate-800">{faq.q}</span>
                  <div className={`p-2 rounded-full transition-colors ${openFaq === index ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-slate-400'}`}>
                    {openFaq === index ? <ChevronUp className="w-5 h-5" aria-hidden="true" /> : <ChevronDown className="w-5 h-5" aria-hidden="true" />}
                  </div>
                </button>
                <AnimatePresence>
                  {openFaq === index && (
                    <motion.div
                      id={`faq-answer-${index}`}
                      role="region"
                      aria-labelledby={`faq-btn-${index}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-0">
                        <p className="text-slate-700 font-semibold leading-relaxed border-t border-slate-100 pt-4">
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

      {redirectingUrl && (
        <div className="fixed inset-0 min-h-screen w-full flex flex-col justify-center items-center bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white z-[9999] p-6 text-center select-none overflow-hidden">
          {/* Animated blurred design elements */}
          <div className="absolute -top-40 -left-10 w-96 h-96 rounded-full bg-blue-600/15 blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-40 -right-10 w-96 h-96 rounded-full bg-purple-600/15 blur-[100px] pointer-events-none" />

          <div className="max-w-md w-full relative z-10 flex flex-col items-center">
            {/* Spinning/pulsing neon glow QR vector icon */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: [1, 1.05, 1], opacity: 1 }} 
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
              className="w-24 h-24 mb-6 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center p-0.5 shadow-[0_0_50px_rgba(79,70,229,0.35)]"
            >
              <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
                <QrCode className="w-10 h-10 text-indigo-400" aria-hidden="true" />
              </div>
            </motion.div>

            <h1 className="text-2xl md:text-3xl font-black mb-3.5 tracking-tight bg-gradient-to-r from-indigo-100 via-white to-purple-200 bg-clip-text text-transparent">
              {t.tracker.redirectTitle}
            </h1>

            <p className="text-slate-300 font-semibold mb-6 text-sm md:text-base leading-relaxed">
              {t.tracker.redirectSub}
            </p>

            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-6 max-w-xs border border-white/5 shadow-inner">
              <motion.div 
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.4, ease: "easeInOut" }}
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
              />
            </div>

            <a 
              href={redirectingUrl}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider underline underline-offset-4"
            >
              {t.tracker.manualRedirect}
            </a>
          </div>
        </div>
      )}

      {/* Trending Banner */}
      <div className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 text-white text-center py-2.5 px-4 shadow-md relative z-40">
        <p className="font-bold text-sm md:text-base animate-pulse-slow flex items-center justify-center gap-2">
          {t.viral.trending}
        </p>
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <button 
            onClick={() => setView('home')} 
            aria-label={lang === 'ar' ? "العودة للرئيسية لـ Qrytube" : "Back to Qrytube home"}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg">
              <QrCode className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">{t.title}</h1>
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView('contact')}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full font-bold transition-all shadow-sm active:scale-95 text-xs sm:text-sm ${
                view === 'contact'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'border-2 border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              <Mail className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              <span>{t.contact.title}</span>
            </button>

            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              aria-label={lang === 'ar' ? "تغيير لغة الموقع إلى الإنجليزية" : "Change website language to Arabic"}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full border-2 border-slate-200 bg-white hover:border-indigo-300 hover:text-indigo-600 transition-all font-bold shadow-sm hover:shadow active:scale-95 text-xs sm:text-sm"
            >
              <Globe className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Dynamic Content View */}
      <AnimatePresence mode="wait">
        {view === 'home' && renderHomeView()}
        {(view === 'privacy' || view === 'terms') && renderLegalView()}
        {view === 'contact' && renderContactView()}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-4 text-sm font-bold">
            <button 
              onClick={() => setView('privacy')} 
              className="hover:text-blue-400 text-slate-100 transition-colors bg-slate-800 px-5 py-2.5 rounded-full hover:bg-slate-750"
              aria-label={t.legal.privacy}
            >
              {t.legal.privacy}
            </button>
            <button 
              onClick={() => setView('terms')} 
              className="hover:text-blue-400 text-slate-100 transition-colors bg-slate-800 px-5 py-2.5 rounded-full hover:bg-slate-750"
              aria-label={t.legal.terms}
            >
              {t.legal.terms}
            </button>
            <button 
              onClick={() => setView('contact')} 
              className="hover:text-blue-400 text-slate-100 transition-colors bg-slate-800 px-5 py-2.5 rounded-full hover:bg-slate-750"
              aria-label={t.contact.title}
            >
              {t.contact.title}
            </button>
          </div>
          <p className="font-semibold text-slate-300 mt-4 mb-2">
            {lang === 'ar' ? 'تم التصميم والتطوير بكل ♥ - منصة مجانية 100% للأبد.' : 'Designed & Developed with ♥ - 100% Free Forever platform.'}
          </p>
        </div>
      </footer>
    </div>
  );
}
