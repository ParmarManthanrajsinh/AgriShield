"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Link from "next/link";
import { getApiBase , authFetch} from "@/lib/api";
import {
  ArrowLeft,
  MessageSquare,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Send,
  Smartphone,
  Settings,
  PhoneCall,
  Globe,
  Camera,
  Bot,
  ExternalLink,
  Plus,
  X,
  RefreshCw,
  FileImage,
  Sparkles,
  Zap,
  Check,
} from "lucide-react";

interface ChatMessage {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  timestamp: string;
  media_url?: string;
  action_type?: string;
  diagnosis?: {
    disease_name?: string;
    confidence?: number;
    severity?: string;
    treatment?: string;
    crop_type?: string;
  };
}

const SAMPLE_DISEASE_PHOTOS = [
  {
    label: "Demo Sample Image 1 (Brown Spot-like)",
    icon: <FileImage className="w-3.5 h-3.5 text-[#0f4d32]" />,
    url: "https://raw.githubusercontent.com/spMohanty/PlantVillage-Dataset/master/raw/color/Tomato___Early_blight/0012b9d2-2130-4a06-a834-b1f3af34f57e___RS_Erly.B%208389.JPG",
    query: "मेरी फसल के पत्तों पर धब्बे दिखाई दे रहे हैं, कृपया जांच करें",
    lang: "hi",
  },
  {
    label: "Demo Sample Image 2 (Leaf Spot-like)",
    icon: <FileImage className="w-3.5 h-3.5 text-[#0f4d32]" />,
    url: "https://raw.githubusercontent.com/spMohanty/PlantVillage-Dataset/master/raw/color/Tomato___Septoria_leaf_spot/000146ff-92a4-4db6-90ad-8fce2ae4fded___JR_Sept.L.S%202799.JPG",
    query: "నా పంట ఆకులపై మచ్చలు కనిపిస్తున్నాయి",
    lang: "te",
  },
  {
    label: "Demo Sample Image 3 (Healthy-like)",
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#0f4d32]" />,
    url: "https://raw.githubusercontent.com/spMohanty/PlantVillage-Dataset/master/raw/color/Tomato___healthy/000146ff-92a4-4db6-90ad-8fce2ae4fded___GH_HLAF_2799.JPG",
    query: "माझे पीक तपासा",
    lang: "mr",
  },
];

const QUICK_QUESTIONS = [
  { label: "7-Day Weather Alert", query: "अगले 7 दिनों का मौसम पूर्वानुमान क्या है?", lang: "hi" },
  { label: "Best Kharif Crop", query: "నల్ల రేగడి నేలలో ఏ పంట వేయాలి?", lang: "te" },
  { label: "ZKP Claim Status", query: "माझा विमा क्लेम स्टेटस काय आहे?", lang: "mr" },
  { label: "Help Menu", query: "help", lang: "en" },
];

const LANGUAGES = [
  { code: "hi", name: "हिन्दी (Hindi)", cmd: "1" },
  { code: "te", name: "తెలుగు (Telugu)", cmd: "2" },
  { code: "mr", name: "मराठी (Marathi)", cmd: "3" },
  { code: "ta", name: "தமிழ் (Tamil)", cmd: "4" },
  { code: "en", name: "English", cmd: "5" },
];

export default function WhatsAppIVRPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [customMediaUrl, setCustomMediaUrl] = useState("");
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeLang, setActiveLang] = useState("hi");
  const [simPhone, setSimPhone] = useState("+919876543210");
  const [isServerOnline, setIsServerOnline] = useState(true);
  const [resolvedBase, setResolvedBase] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    getApiBase().then(setResolvedBase);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const apiBase = await getApiBase();
      if (cancelled) return;
      authFetch(`${apiBase}/users/me`)
      .then(res => {
        if (!res.ok) throw new Error("Unauthorized");
      })
      .catch(() => {
        if (!cancelled) {
          router.push("/login?redirect=/dashboard/whatsapp-ivr");
        }
      });
    })();

    // Load initial welcome message
    setMessages([
      {
        id: "welcome_1",
        direction: "outbound",
        body: "नमस्ते! मैं कृषि शील्ड AI (AgriShield AI) हूँ। आप मुझसे खेती से जुड़ा कोई भी सवाल पूछ सकते हैं, मौसम की जानकारी ले सकते हैं, या अपनी फसल की फोटो भेजकर रोग की पहचान (ResNet18 Vision AI) करवा सकते हैं!\n\nभाषा बदलने के लिए नीचे दिए गए भाषा बटन दबाएं।",
        timestamp: new Date().toISOString(),
      },
    ]);

    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const sendSimulationMessage = async (
    text: string,
    mediaUrl: string = "",
    langCode: string = activeLang
  ) => {
    if (!text.trim() && !mediaUrl.trim()) return;
    setSending(true);
    setInputText("");
    if (mediaUrl) {
      setCustomMediaUrl("");
      setShowMediaInput(false);
    }

    const userMsg: ChatMessage = {
      id: `in_${Date.now()}`,
      direction: "inbound",
      body: text || "[Photo Uploaded for AI Diagnosis]",
      media_url: mediaUrl || undefined,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const apiBase = await getApiBase();
      const res = await authFetch(`${apiBase}/api/whatsapp/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: simPhone,
          message: text,
          media_url: mediaUrl || null,
          language: langCode,
        }),
      });

      if (res.ok) {
        setIsServerOnline(true);
        const data = await res.json();
        
        if (data.action_type === "language_switch" || langCode !== activeLang) {
          setActiveLang(data.language || langCode);
        }

        const botReply: ChatMessage = {
          id: data.reply_msg_id || `out_${Date.now()}`,
          direction: "outbound",
          body: data.ai_reply,
          timestamp: new Date().toISOString(),
          action_type: data.action_type,
          diagnosis: data.diagnosis,
        };

        setTimeout(() => {
          setMessages((prev) => [...prev, botReply]);
        }, 300);
      } else {
        throw new Error("Backend simulation error");
      }
    } catch {
      setIsServerOnline(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          direction: "outbound",
          body: "Backend Server Offline or Unreachable. Please ensure FastAPI is running on port 8000: `python -m uvicorn main:app --port 8000`",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleLanguageSwitch = (lang: typeof LANGUAGES[0]) => {
    setActiveLang(lang.code);
    sendSimulationMessage(lang.cmd, "", lang.code);
  };

  return (
    <div className="bg-[#f9f9fc] min-h-screen flex flex-col font-sans text-[#1a1c1e] overflow-x-hidden relative p-6 md:p-8">
      {/* Subtle Background Elements */}
      <div 
        className="fixed top-0 left-0 w-full h-full -z-10 opacity-[0.05] bg-contain bg-no-repeat bg-center pointer-events-none" 
        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida/AP1WRLtMKBO_gY6vi40zhvrCUDE7LpxNpJI4jAp-S17okoKUgetlWZgVYuF0P9uqdbE5_oGuAMr2TN2MjOnUMUrCoEXk9x5c_RRnNCO06T13jaK9-mb4RTQ2SZ4Lsxvqq7vhy-ofIwWf8yAvslrTZc2o8sdUxn5kRlMV_9XeomjO2Rs2m9M8l9ZrCv-r2uTFr4myZEXpDi636KKTLuUFCWf2fA3zH3JkZ3afAUty9Vo0ng8Im_H5L-pxu9fLmxI')" }}
      ></div>

      <div 
        className="fixed z-0 blur-[100px] opacity-[0.08] pointer-events-none bg-[#006d43] w-[600px] h-[600px] rounded-full -top-48 -left-24 transition-transform duration-[10s]"
        style={{ transform: `translate(${mousePos.x * 10}px, ${mousePos.y * 10}px)` }}
      ></div>
      <div 
        className="fixed z-0 blur-[100px] opacity-[0.08] pointer-events-none bg-[#00351f] w-[400px] h-[400px] rounded-full bottom-0 -right-12 transition-transform duration-[10s]"
        style={{ transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 20}px)` }}
      ></div>

      <div className="max-w-7xl mx-auto w-full space-y-6 z-10 relative animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Top Header & Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/90 backdrop-blur-sm border border-[rgba(192,201,192,0.4)] p-6 rounded-2xl shadow-sm">
          <div>
            <Link
              href="/dashboard"
              className="text-xs font-bold uppercase tracking-wider text-[#0f4d32] hover:text-[#00351f] transition-colors inline-flex items-center gap-1.5 mb-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#e8f7f0] text-[#0f4d32] flex items-center justify-center shadow-sm shrink-0 border border-[#c0c9c0]/40">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold font-heading text-[#00351f]">
                  WhatsApp AI & Indic Voice IVR Command Center
                </h1>
                <p className="text-[#404943] text-sm mt-1">
                  24/7 Conversational Agricultural Scientist powered by <span className="text-[#0f4d32] font-bold">Twilio WhatsApp API</span>, <span className="text-[#0f4d32] font-bold">Groq Llama-3.3-70B</span>, & <span className="text-[#0f4d32] font-bold">ResNet18 Vision</span>
                </p>
              </div>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-[#e8f7f0] border border-[#0f4d32]/30 text-[#0f4d32] text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0f4d32] animate-pulse"></span>
              Twilio Webhook Online
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#f3f3f6] border border-[#c0c9c0]/60 text-[#00351f] text-xs font-bold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#0f4d32]" /> Groq LLM Active
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#f3f3f6] border border-[#c0c9c0]/60 text-[#00351f] text-xs font-bold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#0f4d32]" /> ResNet18 Vision Ready
            </div>
          </div>
        </div>

        {/* Main Grid: Left Chat Sandbox (3 cols), Right Config & Redirects (2 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* LEFT: Live Interactive WhatsApp Simulator & Sandbox */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="bg-white/90 backdrop-blur-sm border border-[rgba(192,201,192,0.4)] shadow-sm rounded-2xl overflow-hidden flex flex-col h-[750px]">
              
              {/* WhatsApp Header */}
              <div className="bg-[#0f4d32] p-4 px-6 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white shadow-inner shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold font-heading text-white text-base flex items-center gap-2">
                      AgriShield AI Scientist
                      <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded font-bold tracking-wider">
                        OFFICIAL BOT
                      </span>
                    </h3>
                    <p className="text-emerald-100 text-xs flex items-center gap-1.5 font-medium mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
                      +1 (659) 266-7445 · Twilio Verified Business
                    </p>
                  </div>
                </div>

                {/* Farmer Phone Selector */}
                <div className="flex items-center gap-2 bg-[#00351f]/60 px-3 py-1.5 rounded-lg border border-white/20 text-xs">
                  <span className="text-emerald-200 font-bold">Farmer:</span>
                  <input
                    type="text"
                    value={simPhone}
                    onChange={(e) => setSimPhone(e.target.value)}
                    className="bg-transparent text-white font-mono w-28 focus:outline-none focus:ring-1 focus:ring-emerald-400 rounded px-1"
                  />
                </div>
              </div>

              {/* Explicit Language Selector Bar */}
              <div className="bg-[#f3f3f6] border-b border-[#c0c9c0]/50 px-4 py-2.5 flex items-center justify-between overflow-x-auto gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#00351f] whitespace-nowrap flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#0f4d32]" /> Language (भाषा):
                </span>
                <div className="flex items-center gap-1.5">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageSwitch(lang)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 border ${
                        activeLang === lang.code
                          ? "bg-[#0f4d32] text-white border-[#0f4d32] shadow-sm scale-105"
                          : "bg-white hover:bg-[#e8f7f0] text-[#404943] hover:text-[#0f4d32] border-[#c0c9c0]/60"
                      }`}
                    >
                      <span>{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Message Window */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-[#f9f9fc]/80">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.direction === "inbound" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 text-sm shadow-sm transition-all duration-300 ${
                        msg.direction === "inbound"
                          ? "bg-[#0f4d32] text-white rounded-br-xs"
                          : "bg-white text-[#1a1c1e] rounded-bl-xs border border-[rgba(192,201,192,0.6)]"
                      }`}
                    >
                      {/* If message has uploaded photo */}
                      {msg.media_url && (
                        <div className="mb-3 rounded-xl overflow-hidden border border-[#c0c9c0]/40 bg-[#f3f3f6]">
                          <img
                            src={msg.media_url}
                            alt="Crop Upload"
                            className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
                          />
                          <div className="bg-[#1a1c1e] px-3 py-1.5 text-xs text-white font-mono flex items-center justify-between">
                            <span className="flex items-center gap-1.5"><Camera className="w-3.5 h-3.5 text-[#54de99]" /> Photo Uploaded</span>
                            <span className="text-[#54de99] font-bold">ResNet18 Vision Analysis</span>
                          </div>
                        </div>
                      )}

                      {/* Message Body */}
                      <p className="whitespace-pre-wrap leading-relaxed font-medium">
                        {msg.body}
                      </p>

                      {/* If message is an AI Diagnosis Card */}
                      {msg.action_type === "photo_diagnosis" && msg.diagnosis && (
                        <div className="mt-3 pt-3 border-t border-[#c0c9c0]/50 bg-[#f3f3f6] rounded-xl p-3.5 space-y-2 border-l-4 border-l-[#0f4d32]">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#00351f] uppercase tracking-wider flex items-center gap-1">
                              <Activity className="w-3.5 h-3.5 text-[#0f4d32]" /> Vision Diagnosis Metadata
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              msg.diagnosis.severity === "high"
                                ? "bg-[#fdf2f2] text-[#c93b2b] border border-[#c93b2b]/30"
                                : msg.diagnosis.severity === "medium"
                                ? "bg-[#fdf7f0] text-[#d9822b] border border-[#d9822b]/30"
                                : "bg-[#e8f7f0] text-[#0f4d32] border border-[#0f4d32]/30"
                            }`}>
                              Severity: {msg.diagnosis.severity}
                            </span>
                          </div>
                          <div className="text-xs text-[#404943] space-y-1">
                            <p><span className="text-[#707972] font-semibold">Disease:</span> <span className="font-bold text-[#00351f]">{msg.diagnosis.disease_name}</span></p>
                            <p><span className="text-[#707972] font-semibold">Model Confidence:</span> <span className="font-mono text-[#0f4d32] font-bold">{((msg.diagnosis.confidence || 0.9) * 100).toFixed(1)}%</span></p>
                          </div>
                        </div>
                      )}

                      {/* Timestamp & Status */}
                      <div
                        className={`text-[10px] mt-2 flex items-center justify-end gap-1 ${
                          msg.direction === "inbound" ? "text-emerald-200" : "text-[#707972]"
                        }`}
                      >
                        <span>
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {msg.direction === "inbound" ? (
                          <span className="font-bold flex items-center gap-0.5"><Check className="w-3 h-3 text-emerald-300" /><Check className="w-3 h-3 -ml-2 text-emerald-300" /></span>
                        ) : (
                          <span className="font-bold text-[#0f4d32] flex items-center gap-1"><Bot className="w-3 h-3" /> AI</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-[rgba(192,201,192,0.6)] rounded-2xl px-4 py-3 text-sm text-[#404943] flex items-center gap-2 animate-pulse shadow-sm">
                      <RefreshCw className="w-4 h-4 text-[#0f4d32] animate-spin" />
                      <span>AgriShield AI is analyzing & reasoning...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Interactive Controls Footbar */}
              <div className="bg-white border-t border-[rgba(192,201,192,0.4)] p-4 space-y-3">
                
                {/* 1. Sample Photo Upload Testing Buttons */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#00351f] uppercase tracking-wider flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-[#0f4d32]" /> Test ResNet18 Photo Diagnosis (Click to simulate photo upload):
                    </span>
                    <button
                      onClick={() => setShowMediaInput(!showMediaInput)}
                      className="text-xs text-[#0f4d32] hover:underline font-bold flex items-center gap-1"
                    >
                      {showMediaInput ? (
                        <><X className="w-3.5 h-3.5" /> Close Custom URL</>
                      ) : (
                        <><Plus className="w-3.5 h-3.5" /> Custom Image URL</>
                      )}
                    </button>
                  </div>

                  {showMediaInput && (
                    <div className="flex gap-2 mb-2 bg-[#f3f3f6] p-2.5 rounded-xl border border-[#c0c9c0]/60">
                      <input
                        type="text"
                        value={customMediaUrl}
                        onChange={(e) => setCustomMediaUrl(e.target.value)}
                        placeholder="Paste any raw Image URL (JPG/PNG) to diagnose..."
                        className="flex-1 bg-white border border-[#c0c9c0] rounded-lg px-3 py-1.5 text-xs text-[#1a1c1e] focus:outline-none focus:ring-2 focus:ring-[#54de99]"
                      />
                      <Button
                        size="sm"
                        onClick={() => sendSimulationMessage("Please diagnose this custom leaf photo", customMediaUrl, activeLang)}
                        disabled={!customMediaUrl.trim() || sending}
                        className="bg-[#0f4d32] hover:bg-[#00351f] text-white text-xs font-bold px-4 rounded-lg shadow-sm"
                      >
                        Upload & Diagnose
                      </Button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {SAMPLE_DISEASE_PHOTOS.map((photo, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendSimulationMessage(photo.query, photo.url, photo.lang)}
                        disabled={sending}
                        className="px-3 py-1.5 bg-[#f3f3f6] hover:bg-[#e8f7f0] text-[#1a1c1e] hover:text-[#0f4d32] border border-[#c0c9c0]/60 hover:border-[#0f4d32] rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 shadow-sm"
                      >
                        {photo.icon}
                        <span>{photo.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Quick Question Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[rgba(192,201,192,0.3)]">
                  <span className="text-xs font-bold text-[#707972] uppercase mr-1">Quick Q&A:</span>
                  {QUICK_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendSimulationMessage(q.query, "", q.lang)}
                      disabled={sending}
                      className="px-3 py-1 bg-[#f3f3f6] hover:bg-[#e8f7f0] text-[#404943] hover:text-[#0f4d32] border border-[#c0c9c0]/60 hover:border-[#0f4d32] rounded-lg text-xs font-medium transition-all"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>

                {/* 3. Text Input Box */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendSimulationMessage(inputText, "", activeLang)}
                    placeholder={`Ask any farming question in ${LANGUAGES.find(l => l.code === activeLang)?.name || "Hindi/English"}...`}
                    className="flex-1 bg-[#f3f3f6] border border-[#c0c9c0] rounded-lg px-4 py-3 text-sm text-[#1a1c1e] focus:outline-none focus:ring-2 focus:ring-[#54de99] font-medium placeholder:text-[#707972]"
                  />
                  <Button
                    onClick={() => sendSimulationMessage(inputText, "", activeLang)}
                    disabled={sending || (!inputText.trim() && !customMediaUrl.trim())}
                    className="bg-[#0f4d32] hover:bg-[#00351f] text-white font-bold px-6 rounded-lg shadow-sm transition-all duration-200 flex items-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    <span>{sending ? "..." : "Send"}</span>
                  </Button>
                </div>

              </div>
            </Card>
          </div>

          {/* RIGHT: Twilio Setup Guide, Live Q&A Redirects, & Indic IVR (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Live Farmer WhatsApp Redirect & Q&A Card */}
            <Card className="bg-white/90 backdrop-blur-sm border border-[rgba(192,201,192,0.4)] shadow-sm rounded-2xl overflow-hidden text-[#1a1c1e]">
              <CardHeader className="pb-3 border-b border-[rgba(192,201,192,0.3)] bg-[#f3f3f6]/50">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#e8f7f0] text-[#0f4d32] flex items-center justify-center shrink-0 border border-[#c0c9c0]/30">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <span className="bg-[#e8f7f0] text-[#0f4d32] font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider border border-[#0f4d32]/30">
                    Live Redirect
                  </span>
                </div>
                <CardTitle className="text-xl font-bold font-heading text-[#00351f] mt-2">
                  Chat Live on Your Phone (Q&A)
                </CardTitle>
                <CardDescription className="text-[#404943] text-xs">
                  Farmers don't use websites! Click below to open real WhatsApp and start conversational Q&A instantly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="bg-[#f3f3f6] border border-[#c0c9c0]/50 rounded-xl p-4 text-center space-y-3">
                  <div className="font-mono text-xs text-[#0f4d32] font-bold bg-[#e8f7f0] py-2 rounded-lg border border-[#0f4d32]/30">
                    wa.me/+14155238886
                  </div>
                  <p className="text-xs text-[#404943] leading-relaxed">
                    Test photo disease diagnosis, weather alerts, or seed recommendations directly from your mobile device via Twilio's Universal WhatsApp Sandbox!
                  </p>
                  <div className="space-y-2 pt-1">
                    <a
                      href="https://wa.me/14155238886?text=join%20watch-ate"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 bg-[#0f4d32] hover:bg-[#00351f] text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all block"
                    >
                      <span>Step 1: Connect Phone (Send Join Code)</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href="https://wa.me/14155238886?text=Namaste!%20I%20want%20to%20ask%20a%20question%20about%20my%20crops"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 border border-[#0f4d32] text-[#0f4d32] hover:bg-[#0f4d32] hover:text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all block"
                    >
                      <span>Step 2: Start WhatsApp AI Chat & Q&A</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
                <div className="bg-[#fdf7f0] border border-[#d9822b]/30 rounded-xl p-3.5 text-xs text-[#8c5014] space-y-1.5">
                  <p className="font-bold text-[#d9822b] flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 shrink-0" /> Why +1 (415) 523-8886?</p>
                  <p>Your Twilio number (<code className="text-[#1a1c1e] font-mono font-bold">+16592667445</code>) is for SMS & Voice IVR. For WhatsApp, Twilio uses their Universal Sandbox (<code className="text-[#1a1c1e] font-mono font-bold">+14155238886</code>).</p>
                  <p className="text-[#00351f] font-bold pt-1">How to connect your phone for the first time:</p>
                  <p>1. Open <span className="font-bold text-[#00351f]">Twilio Console → Messaging → Try it out → Send a WhatsApp message</span>.</p>
                  <p>2. Send your unique join code (e.g., <code className="text-[#1a1c1e] font-mono font-bold">join science-zebra</code>) to <code className="text-[#1a1c1e] font-mono font-bold">+1 415 523 8886</code> once!</p>
                </div>
                <div className="text-xs text-[#404943] space-y-1.5 bg-[#f3f3f6] p-3.5 rounded-xl border border-[#c0c9c0]/40">
                  <p className="font-bold text-[#00351f] flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-[#0f4d32]" /> Quick Q&A Commands on Phone:</p>
                  <p>• Send <span className="font-mono text-[#00351f] font-bold">1</span> for Hindi, <span className="font-mono text-[#00351f] font-bold">2</span> for Telugu</p>
                  <p>• Send any <span className="text-[#00351f] font-bold">leaf photo</span> for instant AI diagnosis</p>
                  <p>• Send <span className="text-[#00351f] font-bold">"weather"</span> or <span className="text-[#00351f] font-bold">"crop"</span> for advisory</p>
                </div>
              </CardContent>
            </Card>

            {/* Twilio Webhook Configuration Guide */}
            <Card className="bg-white/90 backdrop-blur-sm border border-[rgba(192,201,192,0.4)] shadow-sm rounded-2xl">
              <CardHeader className="pb-3 border-b border-[rgba(192,201,192,0.3)] bg-[#f3f3f6]/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#e8f7f0] text-[#0f4d32] flex items-center justify-center shrink-0 border border-[#c0c9c0]/30">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold font-heading text-[#00351f]">Twilio Webhook Setup Guide</CardTitle>
                    <CardDescription className="text-[#707972] text-xs">How to connect live Twilio API to localhost</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-[#404943] pt-4">
                <div className="space-y-1.5 bg-[#f3f3f6] p-3.5 rounded-xl border border-[#c0c9c0]/50 font-mono">
                  <p className="text-[#707972] text-[11px] uppercase font-bold tracking-wider">1. Webhook Endpoint URL:</p>
                  <div className="bg-white p-2 rounded-lg border border-[#c0c9c0] text-[#0f4d32] break-all select-all font-bold">
                    {resolvedBase}/webhooks/whatsapp-inbound
                  </div>
                </div>
                <div className="space-y-1.5 leading-relaxed pt-1">
                  <p className="font-bold text-[#00351f]">How to expose localhost to Twilio:</p>
                  <p>1. Run ngrok terminal: <code className="text-[#0f4d32] bg-[#e8f7f0] px-1.5 py-0.5 rounded border border-[#0f4d32]/20 font-bold">ngrok http 8000</code></p>
                  <p>2. Copy your public ngrok HTTPS URL.</p>
                  <p>3. In Twilio Console → WhatsApp Sandbox Settings → Paste under <span className="text-[#00351f] font-bold">"WHEN A MESSAGE COMES IN"</span>.</p>
                </div>
              </CardContent>
            </Card>

            {/* Indic Voice IVR Hotline Card */}
            <Card className="bg-white/90 backdrop-blur-sm border border-[rgba(192,201,192,0.4)] shadow-sm rounded-2xl">
              <CardHeader className="pb-3 border-b border-[rgba(192,201,192,0.3)] bg-[#f3f3f6]/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#e8f7f0] text-[#0f4d32] flex items-center justify-center shrink-0 border border-[#c0c9c0]/30">
                      <PhoneCall className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold font-heading text-[#00351f]">Indic Voice IVR Hotline</CardTitle>
                      <CardDescription className="text-[#707972] text-xs">Toll-Free · Bhashini AI TTS</CardDescription>
                    </div>
                  </div>
                  <span className="bg-[#e8f7f0] text-[#0f4d32] border border-[#0f4d32]/30 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                    24/7 Voice
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div className="bg-[#e8f7f0]/60 border border-[#0f4d32]/30 rounded-xl p-4 text-center">
                  <p className="text-xl font-bold font-heading tracking-wider text-[#0f4d32]">
                    1800-AGRI-SHIELD
                  </p>
                  <p className="text-xs text-[#404943] font-medium mt-1">
                    +91-1800-274-7443 · Toll-Free Indic Voice Menu
                  </p>
                </div>
                <div className="space-y-2 text-xs text-[#404943] pt-1">
                  <p className="font-bold text-[#00351f]">IVR Keypress Flow:</p>
                  <div className="space-y-1.5 pl-1">
                    <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-md bg-[#f3f3f6] text-[#00351f] font-bold flex items-center justify-center border border-[#c0c9c0] text-[11px]">1</span> <span className="font-semibold text-[#00351f]">Press 1</span> → Crop Recommendations</p>
                    <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-md bg-[#f3f3f6] text-[#00351f] font-bold flex items-center justify-center border border-[#c0c9c0] text-[11px]">2</span> <span className="font-semibold text-[#00351f]">Press 2</span> → Weather & Dry-Spell Alerts</p>
                    <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-md bg-[#f3f3f6] text-[#00351f] font-bold flex items-center justify-center border border-[#c0c9c0] text-[11px]">3</span> <span className="font-semibold text-[#00351f]">Press 3</span> → Report Disease & Claim</p>
                    <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-md bg-[#f3f3f6] text-[#00351f] font-bold flex items-center justify-center border border-[#c0c9c0] text-[11px]">0</span> <span className="font-semibold text-[#00351f]">Press 0</span> → Connect to RSK Officer</p>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

        </div>

      </div>
    </div>
  );
}
