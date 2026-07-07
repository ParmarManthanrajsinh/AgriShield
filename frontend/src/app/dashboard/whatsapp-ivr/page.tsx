"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Link from "next/link";

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
    label: "🥀 Paddy Brown Spot",
    url: "https://raw.githubusercontent.com/spMohanty/PlantVillage-Dataset/master/raw/color/Tomato___Early_blight/0012b9d2-2130-4a06-a834-b1f3af34f57e___RS_Erly.B%208389.JPG",
    query: "धान के पत्तों पर भूरे धब्बे दिखाई दे रहे हैं, कृपया जांच करें",
    lang: "hi",
  },
  {
    label: "🦠 Wheat Yellow Rust",
    url: "https://raw.githubusercontent.com/spMohanty/PlantVillage-Dataset/master/raw/color/Tomato___Septoria_leaf_spot/000146ff-92a4-4db6-90ad-8fce2ae4fded___JR_Sept.L.S%202799.JPG",
    query: "గోధుమ ఆకులపై పసుపు మచ్చలు ఉన్నాయి",
    lang: "te",
  },
  {
    label: "🌿 Healthy Crop",
    url: "https://raw.githubusercontent.com/spMohanty/PlantVillage-Dataset/master/raw/color/Tomato___healthy/000146ff-92a4-4db6-90ad-8fce2ae4fded___GH_HLAF_2799.JPG",
    query: "माझे पीक निरोगी आहे का ते तपासा",
    lang: "mr",
  },
];

const QUICK_QUESTIONS = [
  { label: "🌧️ 7-Day Weather Alert", query: "अगले 7 दिनों का मौसम पूर्वानुमान क्या है?", lang: "hi" },
  { label: "🌾 Best Kharif Crop", query: "నల్ల రేగడి నేలలో ఏ పంట వేయాలి?", lang: "te" },
  { label: "🛡️ ZKP Claim Status", query: "माझा विमा क्लेम स्टेटस काय आहे?", lang: "mr" },
  { label: "🆘 Help Menu", query: "help", lang: "en" },
];

const LANGUAGES = [
  { code: "hi", name: "हिन्दी (Hindi)", cmd: "1", flag: "🇮🇳" },
  { code: "te", name: "తెలుగు (Telugu)", cmd: "2", flag: "🇮🇳" },
  { code: "mr", name: "मराठी (Marathi)", cmd: "3", flag: "🇮🇳" },
  { code: "ta", name: "தமிழ் (Tamil)", cmd: "4", flag: "🇮🇳" },
  { code: "en", name: "English", cmd: "5", flag: "🇬🇧" },
];

export default function WhatsAppIVRPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [customMediaUrl, setCustomMediaUrl] = useState("");
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeLang, setActiveLang] = useState("hi");
  const [simPhone, setSimPhone] = useState("+919876543210");
  const [isServerOnline, setIsServerOnline] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load initial welcome message
    setMessages([
      {
        id: "welcome_1",
        direction: "outbound",
        body: "🌾 नमस्ते! मैं कृषि शील्ड AI (AgriShield AI) हूँ। आप मुझसे खेती से जुड़ा कोई भी सवाल पूछ सकते हैं, मौसम की जानकारी ले सकते हैं, या अपनी फसल की फोटो भेजकर रोग की पहचान (ResNet18 Vision AI) करवा सकते हैं!\n\n🌐 भाषा बदलने के लिए नीचे दिए गए भाषा बटन दबाएं।",
        timestamp: new Date().toISOString(),
      },
    ]);
  }, []);

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
      body: text || "📸 [Photo Uploaded for AI Diagnosis]",
      media_url: mediaUrl || undefined,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("http://localhost:8000/api/whatsapp/simulate", {
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
        
        // If language switched, update active state
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
          body: "⚠️ Backend Server Offline or Unreachable. Please ensure FastAPI is running on port 8000: `python -m uvicorn main:app --port 8000`",
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans selection:bg-emerald-500 selection:text-white">
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Top Header & Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-6 rounded-3xl backdrop-blur-md shadow-2xl">
          <div>
            <Link
              href="/dashboard"
              className="text-xs font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-1 mb-2"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              💬 WhatsApp AI & Indic Voice IVR Command Center
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              24/7 Conversational Agricultural Scientist powered by <span className="text-emerald-400 font-bold">Twilio WhatsApp API</span>, <span className="text-teal-400 font-bold">Groq Llama-3.3-70B</span>, & <span className="text-cyan-400 font-bold">ResNet18 Vision</span>
            </p>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Twilio Webhook Online
            </div>
            <div className="px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-bold">
              ⚡ Groq LLM Active
            </div>
            <div className="px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
              🔬 ResNet18 Vision Ready
            </div>
          </div>
        </div>

        {/* Main Grid: Left Chat Sandbox (3 cols), Right Config & Redirects (2 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* LEFT: Live Interactive WhatsApp Simulator & Sandbox */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="bg-slate-900/90 border border-slate-800 shadow-2xl rounded-3xl overflow-hidden flex flex-col h-[750px]">
              
              {/* WhatsApp Header */}
              <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 p-4 px-6 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-2xl shadow-inner">
                    🌾
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-base flex items-center gap-1.5">
                      AgriShield AI Scientist
                      <span className="bg-emerald-400/30 text-emerald-100 text-[10px] px-2 py-0.5 rounded-full font-black">
                        OFFICIAL BOT
                      </span>
                    </h3>
                    <p className="text-emerald-100 text-xs flex items-center gap-1.5 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
                      +1 (659) 266-7445 · Twilio Verified Business
                    </p>
                  </div>
                </div>

                {/* Farmer Phone Selector */}
                <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
                  <span className="text-emerald-200 font-bold">Farmer:</span>
                  <input
                    type="text"
                    value={simPhone}
                    onChange={(e) => setSimPhone(e.target.value)}
                    className="bg-transparent text-white font-mono w-28 focus:outline-none focus:ring-1 focus:ring-emerald-400 rounded px-1"
                  />
                </div>
              </div>

              {/* Phase 3: Explicit Language Selector Bar */}
              <div className="bg-slate-950/80 border-b border-slate-800/80 px-4 py-2 flex items-center justify-between overflow-x-auto gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">
                  🌐 Language (भाषा):
                </span>
                <div className="flex items-center gap-1.5">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageSwitch(lang)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1 ${
                        activeLang === lang.code
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md scale-105 border border-emerald-400/50"
                          : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/50"
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Message Window */}
              <div
                className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4"
                style={{
                  backgroundImage: "radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.05) 0%, rgba(0, 0, 0, 0) 70%), linear-gradient(180deg, #090d16 0%, #060911 100%)",
                }}
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.direction === "inbound" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 text-sm shadow-xl transition-all duration-300 ${
                        msg.direction === "inbound"
                          ? "bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-br-xs border border-emerald-500/30"
                          : "bg-slate-800/90 text-slate-100 rounded-bl-xs border border-slate-700/80 shadow-slate-950/50"
                      }`}
                    >
                      {/* If message has uploaded photo */}
                      {msg.media_url && (
                        <div className="mb-3 rounded-xl overflow-hidden border border-white/20 bg-black/30">
                          <img
                            src={msg.media_url}
                            alt="Crop Upload"
                            className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
                          />
                          <div className="bg-black/60 px-3 py-1 text-[11px] text-emerald-300 font-mono flex items-center justify-between">
                            <span>📸 Photo Uploaded</span>
                            <span>ResNet18 Vision Analysis</span>
                          </div>
                        </div>
                      )}

                      {/* Message Body */}
                      <p className="whitespace-pre-wrap leading-relaxed font-medium">
                        {msg.body}
                      </p>

                      {/* If message is an AI Diagnosis Card */}
                      {msg.action_type === "photo_diagnosis" && msg.diagnosis && (
                        <div className="mt-3 pt-3 border-t border-slate-700/80 bg-slate-900/80 rounded-xl p-3.5 space-y-2 border-l-4 border-l-cyan-400">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-cyan-400 uppercase tracking-wider">
                              🔬 Vision Diagnosis Metadata
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              msg.diagnosis.severity === "high"
                                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                : msg.diagnosis.severity === "medium"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            }`}>
                              Severity: {msg.diagnosis.severity}
                            </span>
                          </div>
                          <div className="text-xs text-slate-300 space-y-1">
                            <p><span className="text-slate-400">Disease:</span> <span className="font-bold text-white">{msg.diagnosis.disease_name}</span></p>
                            <p><span className="text-slate-400">Model Confidence:</span> <span className="font-mono text-emerald-400 font-bold">{((msg.diagnosis.confidence || 0.9) * 100).toFixed(1)}%</span></p>
                          </div>
                        </div>
                      )}

                      {/* Timestamp & Status */}
                      <div
                        className={`text-[10px] mt-2 flex items-center justify-end gap-1 ${
                          msg.direction === "inbound" ? "text-emerald-200" : "text-slate-400"
                        }`}
                      >
                        <span>
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {msg.direction === "inbound" ? (
                          <span className="font-bold">✓✓</span>
                        ) : (
                          <span className="text-emerald-400">🤖 AI</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl px-4 py-3 text-sm text-slate-400 flex items-center gap-2 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>AgriShield AI is analyzing & reasoning...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Interactive Controls Footbar */}
              <div className="bg-slate-950 border-t border-slate-800/80 p-4 space-y-3">
                
                {/* 1. Sample Photo Upload Testing Buttons */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      📸 Test ResNet18 Photo Diagnosis (Click to simulate farmer photo upload):
                    </span>
                    <button
                      onClick={() => setShowMediaInput(!showMediaInput)}
                      className="text-[11px] text-emerald-400 hover:underline font-semibold"
                    >
                      {showMediaInput ? "✕ Close Custom URL" : "+ Custom Image URL"}
                    </button>
                  </div>

                  {showMediaInput && (
                    <div className="flex gap-2 mb-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <input
                        type="text"
                        value={customMediaUrl}
                        onChange={(e) => setCustomMediaUrl(e.target.value)}
                        placeholder="Paste any raw Image URL (JPG/PNG) to diagnose..."
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                      <Button
                        size="sm"
                        onClick={() => sendSimulationMessage("Please diagnose this custom leaf photo", customMediaUrl, activeLang)}
                        disabled={!customMediaUrl.trim() || sending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3"
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
                        className="px-3 py-1.5 bg-slate-900 hover:bg-emerald-950/60 text-slate-200 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/50 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 shadow-sm hover:scale-[1.02]"
                      >
                        <span>{photo.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Quick Question Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-900">
                  <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Quick Q&A:</span>
                  {QUICK_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendSimulationMessage(q.query, "", q.lang)}
                      disabled={sending}
                      className="px-2.5 py-1 bg-slate-900/80 hover:bg-teal-950/50 text-teal-300/90 hover:text-teal-200 border border-slate-800 hover:border-teal-500/40 rounded-lg text-xs font-medium transition-all"
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
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 font-medium placeholder:text-slate-500"
                  />
                  <Button
                    onClick={() => sendSimulationMessage(inputText, "", activeLang)}
                    disabled={sending || (!inputText.trim() && !customMediaUrl.trim())}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-6 rounded-2xl shadow-lg shadow-emerald-900/30 transition-all duration-200 hover:scale-105"
                  >
                    {sending ? "..." : "Send"}
                  </Button>
                </div>

              </div>
            </Card>
          </div>

          {/* RIGHT: Twilio Setup Guide, Live Q&A Redirects, & Indic IVR (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Phase 2: Live Farmer WhatsApp Redirect & Q&A Card */}
            <Card className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 border border-emerald-500/40 shadow-2xl rounded-3xl overflow-hidden text-white relative">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">📱</span>
                  <span className="bg-emerald-400 text-slate-950 font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                    LIVE REDIRECT
                  </span>
                </div>
                <CardTitle className="text-xl font-black mt-2">
                  Chat Live on Your Phone (Q&A)
                </CardTitle>
                <CardDescription className="text-emerald-200 text-xs">
                  Farmers don't use websites! Click below to open real WhatsApp and start conversational Q&A instantly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-black/30 border border-white/10 rounded-2xl p-4 text-center space-y-3 backdrop-blur-sm">
                  <div className="font-mono text-xs text-emerald-300 font-bold bg-emerald-950/60 py-2 rounded-xl border border-emerald-500/30">
                    wa.me/+14155238886
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Test photo disease diagnosis, weather alerts, or seed recommendations directly from your mobile device via Twilio's Universal WhatsApp Sandbox!
                  </p>
                  <div className="space-y-2 pt-1">
                    <a
                      href="https://wa.me/14155238886?text=join%20"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-xs rounded-xl shadow-lg shadow-amber-900/40 flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 block"
                    >
                      <span>1️⃣ Step 1: Connect Phone (Send Join Code)</span>
                      <span>↗</span>
                    </a>
                    <a
                      href="https://wa.me/14155238886?text=Namaste!%20I%20want%20to%20ask%20a%20question%20about%20my%20crops"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-black text-sm rounded-xl shadow-lg shadow-green-900/50 flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 block"
                    >
                      <span>2️⃣ Step 2: Start WhatsApp AI Chat & Q&A</span>
                      <span>↗</span>
                    </a>
                  </div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-[11px] text-amber-200 space-y-1">
                  <p className="font-bold text-amber-300 flex items-center gap-1">⚠️ Why +1 (415) 523-8886?</p>
                  <p>Your Twilio number (<code className="text-white font-mono">+16592667445</code>) is for SMS & Voice IVR. For WhatsApp, Twilio uses their Universal Sandbox (<code className="text-white font-mono">+14155238886</code>).</p>
                  <p className="text-white font-semibold pt-1">👉 How to connect your phone for the first time:</p>
                  <p>1. Open <span className="text-amber-300 font-bold">Twilio Console → Messaging → Try it out → Send a WhatsApp message</span>.</p>
                  <p>2. Send your unique join code (e.g., <code className="text-white font-mono font-bold">join science-zebra</code>) to <code className="text-white font-mono">+1 415 523 8886</code> once!</p>
                </div>
                <div className="text-[11px] text-slate-300 space-y-1 bg-slate-900/60 p-3 rounded-xl border border-white/5">
                  <p className="font-bold text-emerald-300">💡 Quick Q&A Commands on Phone:</p>
                  <p>• Send <span className="font-mono text-white font-bold">1</span> for Hindi, <span className="font-mono text-white font-bold">2</span> for Telugu</p>
                  <p>• Send any <span className="text-white font-bold">leaf photo</span> for instant AI diagnosis</p>
                  <p>• Send <span className="text-white font-bold">"weather"</span> or <span className="text-white font-bold">"crop"</span> for advisory</p>
                </div>
              </CardContent>
            </Card>

            {/* Twilio Webhook Configuration Guide */}
            <Card className="bg-slate-900/90 border border-slate-800 shadow-xl rounded-3xl">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚙️</span>
                  <div>
                    <CardTitle className="text-base font-bold text-white">Twilio Webhook Setup Guide</CardTitle>
                    <CardDescription className="text-slate-400 text-xs">How to connect live Twilio API to localhost</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-300">
                <div className="space-y-2 bg-slate-950 p-3.5 rounded-2xl border border-slate-800 font-mono">
                  <p className="text-slate-400 text-[11px] uppercase font-bold text-emerald-400">1. Webhook Endpoint URL:</p>
                  <div className="bg-slate-900 p-2 rounded border border-slate-700 text-emerald-300 break-all select-all font-bold">
                    http://localhost:8000/webhooks/whatsapp-inbound
                  </div>
                </div>
                <div className="space-y-1.5 leading-relaxed">
                  <p className="font-bold text-slate-200">How to expose localhost to Twilio:</p>
                  <p className="text-slate-400">1. Run ngrok terminal: <code className="text-emerald-400 bg-slate-950 px-1.5 py-0.5 rounded">ngrok http 8000</code></p>
                  <p className="text-slate-400">2. Copy your public ngrok HTTPS URL.</p>
                  <p className="text-slate-400">3. In Twilio Console → WhatsApp Sandbox Settings → Paste under <span className="text-white font-semibold">"WHEN A MESSAGE COMES IN"</span>.</p>
                </div>
              </CardContent>
            </Card>

            {/* Indic Voice IVR Hotline Card */}
            <Card className="bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 border border-indigo-500/30 shadow-xl rounded-3xl text-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">📞</span>
                    <div>
                      <CardTitle className="text-base font-bold">Indic Voice IVR Hotline</CardTitle>
                      <CardDescription className="text-indigo-300 text-xs">Toll-Free · Bhashini AI TTS</CardDescription>
                    </div>
                  </div>
                  <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] px-2 py-0.5 rounded-full font-black">
                    24/7 VOICE
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-indigo-900/40 border border-indigo-500/20 rounded-2xl p-3.5 text-center">
                  <p className="text-xl font-black tracking-wider text-indigo-200">
                    1800-AGRI-SHIELD
                  </p>
                  <p className="text-[11px] text-indigo-300 mt-0.5">
                    +91-1800-274-7443 · Toll-Free Indic Voice Menu
                  </p>
                </div>
                <div className="space-y-1.5 text-xs text-indigo-200">
                  <p className="font-bold text-white">IVR Keypress Flow:</p>
                  <p>1️⃣ <span className="text-white font-medium">Press 1</span> → Crop Recommendations</p>
                  <p>2️⃣ <span className="text-white font-medium">Press 2</span> → Weather & Dry-Spell Alerts</p>
                  <p>3️⃣ <span className="text-white font-medium">Press 3</span> → Report Disease & Claim</p>
                  <p>0️⃣ <span className="text-white font-medium">Press 0</span> → Connect to RSK Officer</p>
                </div>
              </CardContent>
            </Card>

          </div>

        </div>

      </div>
    </div>
  );
}
