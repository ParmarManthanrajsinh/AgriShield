"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

interface Farm {
  id: number;
  name: string;
}

interface DiagnosisResult {
  disease_name: string;
  confidence: number;
  severity: string;
  treatment: string;
  needs_escalation: boolean;
  model_used: string;
}

interface ReportResponse {
  report_id: string;
  farm_id: number;
  diagnosis: DiagnosisResult | null;
  symptoms_detected: string[];
  has_photo: boolean;
  has_audio: boolean;
  escalated: boolean;
  escalation_ticket: Record<string, unknown> | null;
  created_at: string;
}

interface ConversationTurn {
  speaker: "farmer" | "ai";
  text: string;
  time: string;
}

const VOICE_CONVERSATIONS: Record<string, { turns: ConversationTurn[]; desc: string }> = {
  hi: {
    desc: "Leaves turning yellow with brown spots, plant wilting in afternoon heat.",
    turns: [
      { speaker: "farmer", text: "नमस्ते, मेरी धान की फसल के पत्ते पीले पड़ रहे हैं और उन पर भूरे रंग के धब्बे दिख रहे हैं। दोपहर की धूप में पौधे मुरझा भी रहे हैं।", time: "10:14 AM" },
      { speaker: "ai", text: "नमस्ते किसान भाई! लक्षणों के आधार पर यह 'भूरा धब्बा रोग (Brown Spot)' या 'झुलसा रोग' हो सकता है। क्या आपने खेत में हाल ही में कोई दवाई या खाद डाली है?", time: "10:14 AM" },
      { speaker: "farmer", text: "नहीं, अभी तक कोई दवाई नहीं डाली है। कल ही खेत में सिंचाई की थी।", time: "10:15 AM" },
      { speaker: "ai", text: "ठीक है! हमने आपकी आवाज और संपूर्ण लक्षणों को दर्ज कर लिया है। कृपया ट्राइसाइक्लोजोल (Tricyclazole) फफूंदनाशक का छिड़काव करें और खेत से अतिरिक्त पानी निकाल दें। आपकी रिपोर्ट RSK केंद्र के विशेषज्ञ को भी भेज दी गई है।", time: "10:15 AM" }
    ]
  },
  te: {
    desc: "Leaves turning yellow with brown spots, plant wilting in afternoon heat.",
    turns: [
      { speaker: "farmer", text: "నమస్కారం, నా వరి పంట ఆకులు పసుపు రంగులోకి మారుతున్నాయి మరియు వాటిపై గోధుమ రంగు మచ్చలు కనిపిస్తున్నాయి. మధ్యాహ్నం ఎండలో మొక్కలు వాడిపోతున్నాయి.", time: "10:14 AM" },
      { speaker: "ai", text: "నమస్కారం! లక్షణాలను బట్టి ఇది 'బ్రౌన్ స్పాట్ (గోధుమ మచ్చల తెగులు)' కావచ్చు. మీరు ఇప్పటివరకు పొలంలో ఏమైనా మందులు పిచికారీ చేశారా?", time: "10:14 AM" },
      { speaker: "farmer", text: "లేదు, ఇంతవరకు ఏ మందు వేయలేదు. నిన్ననే పొలంలో నీరు పెట్టాను.", time: "10:15 AM" },
      { speaker: "ai", text: "సరే! మీ వాయిస్ లాగ్ మరియు లక్షణాలను నమోదు చేశాము. దయచేసి ట్రైసైక్లోజోల్ (Tricyclazole) ఫంగిసైడ్ పిచికారీ చేయండి మరియు పొలంలో నీరు నిలవకుండా చూడండి. మీ నివేదికను RSK నిపుణులకు కూడా పంపాము.", time: "10:15 AM" }
    ]
  },
  ta: {
    desc: "Leaves turning yellow with brown spots, plant wilting in afternoon heat.",
    turns: [
      { speaker: "farmer", text: "வணக்கம், என் நெல் பயிரின் இலைகள் மஞ்சள் நிறமாக மாறி பழுப்பு நிற புள்ளிகள் தெரிகின்றன. மதியம் வெயிலில் செடிகள் வாடுகின்றன.", time: "10:14 AM" },
      { speaker: "ai", text: "வணக்கம்! அறிகுறிகளைப் பொறுத்தவரை இது 'பழுப்பு புள்ளி நோய் (Brown Spot)' ஆக இருக்கலாம். இதுவரை ஏதேனும் மருந்து அல்லது உரம் தெளித்தீர்களா?", time: "10:14 AM" },
      { speaker: "farmer", text: "இல்லை, இதுவரை எந்த மருந்தும் தெளிக்கவில்லை. நேற்று தான் நீர் பாய்ச்சினேன்。", time: "10:15 AM" },
      { speaker: "ai", text: "சரி! உங்கள் முழு குரல் பதிவு மற்றும் அறிகுறிகளைப் பதிவு செய்துள்ளோம். தயவுசெய்து ட்ரைசைக்ளோசோல் (Tricyclazole) பூஞ்சைக்கொல்லியைத் தெளிக்கவும். உங்கள் அறிக்கை RSK மைய நிபுணருக்கும் அனுப்பப்பட்டுள்ளது。", time: "10:15 AM" }
    ]
  },
  mr: {
    desc: "Leaves turning yellow with brown spots, plant wilting in afternoon heat.",
    turns: [
      { speaker: "farmer", text: "नमस्कार, माझ्या भाताच्या पिकाची पाने पिवळी पडत आहेत आणि त्यावर तपकिरी रंगाचे ठिपके दिसत आहेत. दुपारच्या उन्हात झाडे कोमेजून जात आहेत.", time: "10:14 AM" },
      { speaker: "ai", text: "नमस्कार शेतकरी मित्रा! लक्षणांवरून हे 'ब्राऊन स्पॉट (तपकिरी ठिपके)' किंवा 'करपा रोग' असू शकतो. तुम्ही शेतात अलीकडे काही औषध फवारणी केली आहे का?", time: "10:14 AM" },
      { speaker: "farmer", text: "नाही, अजून कोणतेही औषध टाकले नाही. कालच शेतात पाणी दिले होते。", time: "10:15 AM" },
      { speaker: "ai", text: "ठीक आहे! आम्ही तुमची व्हॉईस लॉग आणि सर्व लक्षणे नोंदवून घेतली आहेत. कृपया ट्रायसायक्लोजोल (Tricyclazole) बुरशीनाशकाची फवारणी करा आणि शेतातून अतिरिक्त पाणी काढून टाका. तुमचा अहवाल RSK केंद्राच्या तज्ज्ञांकडे पाठवण्यात आला आहे。", time: "10:15 AM" }
    ]
  },
  en: {
    desc: "Leaves turning yellow with brown spots, plant wilting in afternoon heat.",
    turns: [
      { speaker: "farmer", text: "Hello, the leaves of my paddy crop are turning yellow and showing brown spots. The plants are also wilting in the afternoon heat.", time: "10:14 AM" },
      { speaker: "ai", text: "Hello! Based on the symptoms, this appears to be 'Brown Spot disease' or Blight. Have you applied any chemical treatments or fertilizers recently?", time: "10:14 AM" },
      { speaker: "farmer", text: "No, I haven't sprayed any chemicals yet. I irrigated the field yesterday.", time: "10:15 AM" },
      { speaker: "ai", text: "Understood! We have recorded your voice log and full symptoms. Please spray Tricyclazole fungicide and ensure proper drainage in the field. Your report has been escalated to an RSK center expert for review.", time: "10:15 AM" }
    ]
  }
};

const LOCALIZED_UI_LABELS: Record<string, Record<string, string>> = {
  hi: {
    portalTitle: "🔬 फसल रोग रिपोर्ट व भारतीय भाषा वॉयस लॉग",
    portalSub: "अपनी क्षेत्रीय भाषा में फसल की समस्याएं बताएं, वॉयस रिकॉर्ड करें और तुरंत समाधान पाएं",
    selectFarm: "खेत चुनें:",
    bhashiniTitle: "🌐 भाषिणी AI वॉयस लॉग (संपूर्ण संवाद)",
    bhashiniSub: "किसान और AI के बीच क्षेत्रीय भाषा में संपूर्ण वॉयस संवाद लॉग",
    simulateBtn: "🎙️ संपूर्ण संवाद लॉग चलाएं",
    photoTitle: "📷 फसल फोटो निदान (ResNet18 / Vision AI)",
    photoChoose: "फोटो चुनें या कैमरा से खींचें",
    symptomTitle: "✍️ दर्ज किए गए लक्षण (निदान हेतु)",
    micTitle: "🎙️ माइक से लाइव वॉयस रिकॉर्डिंग (वैकल्पिक)",
    startMic: "🎤 माइक रिकॉर्डिंग शुरू करें",
    stopMic: "⏹️ रिकॉर्डिंग रोकें",
    submitBtn: "🔍 रिपोर्ट भेजें और निदान पाएं",
    analyzing: "निदान हो रहा है...",
    confidence: "विश्वसनीयता",
    severity: "गंभीरता",
    treatmentTitle: "💊 अनुशंसित उपचार व सलाह",
    symptomsDetected: "🔎 पहचाने गए मुख्य लक्षण",
    escalatedTitle: "🆘 RSK विशेषज्ञ को भेजा गया",
    escalatedSub: "राष्ट्रीय सेवा किसान (RSK) केंद्र के कृषि विशेषज्ञ आपकी रिपोर्ट की समीक्षा करेंगे। टिकट:",
    reportId: "रिपोर्ट:",
    photoAttached: "📷 फोटो संलग्न",
    audioAttached: "🎙️ वॉयस लॉग संलग्न",
    farmerLabel: "🧑‍🌾 किसान:",
    aiLabel: "🤖 AgriShield AI:"
  },
  te: {
    portalTitle: "🔬 పంట సమస్య నివేదిక & ఇండిక్ వాయిస్ లాగ్",
    portalSub: "మీ ప్రాంతీయ భాషలో పంట సమస్యలను తెలియజేయండి, వాయిస్ రికార్డ్ చేయండి మరియు వెంటనే పరిష్కారం పొందండి",
    selectFarm: "పొలాన్ని ఎంచుకోండి:",
    bhashiniTitle: "🌐 భాషిణి AI వాయిస్ లాగ్ (పూర్తి సంభాషణ)",
    bhashiniSub: "రైతు మరియు AI మధ్య ప్రాంతీయ భాషలో పూర్తి వాయిస్ సంభాషణ లాగ్",
    simulateBtn: "🎙️ పూర్తి సంభాషణను ప్రారంభించండి",
    photoTitle: "📷 పంట ఫోటో నిర్ధారణ (ResNet18 / Vision AI)",
    photoChoose: "ఫోటోను ఎంచుకోండి లేదా కెమెరాతో తీయండి",
    symptomTitle: "✍️ నమోదు చేసిన లక్షణాలు (నిర్ధారణ కోసం)",
    micTitle: "🎙️ మైక్రోఫోన్ వాయిస్ రికార్డింగ్ (ఐచ్ఛికం)",
    startMic: "🎤 మైక్ రికార్డింగ్ ప్రారంభించండి",
    stopMic: "⏹️ రికార్డింగ్ ఆపండి",
    submitBtn: "🔍 నివేదిక పంపండి & నిర్ధారణ పొందండి",
    analyzing: "పరిశీలిస్తోంది...",
    confidence: "ఖచ్చితత్వం",
    severity: "తీవ్రత",
    treatmentTitle: "💊 సిఫార్సు చేసిన చికిత్స & సలహా",
    symptomsDetected: "🔎 గుర్తించిన ప్రధాన లక్షణాలు",
    escalatedTitle: "🆘 RSK నిపుణులకు పంపబడింది",
    escalatedSub: "రాష్ట్రీయ సేవా కిసాన్ (RSK) కేంద్రం వ్యవసాయ నిపుణులు మీ నివేదికను పరిశీలిస్తారు. టికెట్:",
    reportId: "నివేదిక:",
    photoAttached: "📷 ఫోటో జత చేయబడింది",
    audioAttached: "🎙️ వాయిస్ లాగ్ జత చేయబడింది",
    farmerLabel: "🧑‍🌾 రైతు:",
    aiLabel: "🤖 AgriShield AI:"
  },
  ta: {
    portalTitle: "🔬 பயிர் பிரச்சனை அறிக்கை & இந்திய மொழி குரல் பதிவு",
    portalSub: "உங்கள் பிராந்திய மொழியில் பயிர் பிரச்சனைகளைத் தெரிவிக்கவும், குரல் பதிவு செய்து உடனே தீர்வு பெறவும்",
    selectFarm: "பண்ணையைத் தேர்ந்தெடுக்கவும்:",
    bhashiniTitle: "🌐 பாஷினி AI குரல் பதிவு (முழு உரையாடல்)",
    bhashiniSub: "விவசாயி மற்றும் AI இடையே பிராந்திய மொழியில் முழுமையான குரல் உரையாடல் பதிவு",
    simulateBtn: "🎙️ முழு உரையாடலைக் காட்டு",
    photoTitle: "📷 பயிர் புகைப்பட நோயறிதல் (ResNet18 / Vision AI)",
    photoChoose: "புகைப்படம் எடுக்கவும் அல்லது தேர்ந்தெடுக்கவும்",
    symptomTitle: "✍️ பதிவு செய்யப்பட்ட அறிகுறிகள்",
    micTitle: "🎙️ நேரடி மைக்ரோஃபோன் குரல் பதிவு (விருப்பம்)",
    startMic: "🎤 குரல் பதிவு தொடங்கு",
    stopMic: "⏹️ பதிவு நிறுத்து",
    submitBtn: "🔍 அறிக்கை சமர்ப்பித்து தீர்வு பெறு",
    analyzing: "பகுப்பாய்வு செய்கிறது...",
    confidence: "துல்லியம்",
    severity: "தீவிரம்",
    treatmentTitle: "💊 பரிந்துரைக்கப்படும் சிகிச்சை & ஆலோசனை",
    symptomsDetected: "🔎 கண்டறியப்பட்ட முக்கிய அறிகுறிகள்",
    escalatedTitle: "🆘 RSK நிபுணருக்கு அனுப்பப்பட்டது",
    escalatedSub: "ராஷ்ட்ரிய சேவா கிசான் (RSK) மைய வேளாண் நிபுணர் உங்கள் அறிக்கையை மதிப்பாய்வு செய்வார். டிக்கெட்:",
    reportId: "அறிக்கை:",
    photoAttached: "📷 புகைப்படம் இணைக்கப்பட்டது",
    audioAttached: "🎙️ குரல் பதிவு இணைக்கப்பட்டது",
    farmerLabel: "🧑‍🌾 விவசாயி:",
    aiLabel: "🤖 AgriShield AI:"
  },
  mr: {
    portalTitle: "🔬 पीक समस्या अहवाल व भारतीय भाषा व्हॉईस लॉग",
    portalSub: "तुमच्या प्रादेशिक भाषेत पिकाच्या समस्या सांगा, व्हॉईस रेकॉर्ड करा आणि त्वरित समाधान मिळवा",
    selectFarm: "शेत निवडा:",
    bhashiniTitle: "🌐 भाषिणी AI व्हॉईस लॉग (संपूर्ण संवाद)",
    bhashiniSub: "शेतकरी आणि AI मधील प्रादेशिक भाषेतील संपूर्ण व्हॉईस संवाद लॉग",
    simulateBtn: "🎙️ संपूर्ण संवाद लॉग चालवा",
    photoTitle: "📷 पीक फोटो निदान (ResNet18 / Vision AI)",
    photoChoose: "फोटो निवडा किंवा कॅमेऱ्याने काढा",
    symptomTitle: "✍️ नोंदवलेली लक्षणे (निदानासाठी)",
    micTitle: "🎙️ माईकवरून लाईव्ह व्हॉईस रेकॉर्डिंग (पर्यायी)",
    startMic: "🎤 माईक रेकॉर्डिंग सुरू करा",
    stopMic: "⏹️ रेकॉर्डिंग थांबवा",
    submitBtn: "🔍 अहवाल पाठवा आणि निदान मिळवा",
    analyzing: "निदान होत आहे...",
    confidence: "विश्वासार्हता",
    severity: "तीव्रता",
    treatmentTitle: "💊 सुचवलेले उपचार व सल्ला",
    symptomsDetected: "🔎 ओळखलेली मुख्य लक्षणे",
    escalatedTitle: "🆘 RSK तज्ज्ञांकडे पाठवले",
    escalatedSub: "राष्ट्रीय सेवा किसान (RSK) केंद्राचे कृषी तज्ज्ञ तुमच्या अहवालाचे पुनरावलोकन करतील. तिकीट:",
    reportId: "अहवाल:",
    photoAttached: "📷 फोटो जोडला",
    audioAttached: "🎙️ व्हॉईस लॉग जोडला",
    farmerLabel: "🧑‍🌾 शेतकरी:",
    aiLabel: "🤖 AgriShield AI:"
  },
  en: {
    portalTitle: "🔬 Report Crop Issue & Indic Voice Log",
    portalSub: "Upload crop photos, describe symptoms, or record voice notes in regional Indic languages",
    selectFarm: "Select Farm Target:",
    bhashiniTitle: "🌐 Bhashini AI Indic Speech-to-Text (STT)",
    bhashiniSub: "Speak or simulate logging crop health issues in local Indian dialects with automatic English translation",
    simulateBtn: "🎙️ Simulate Indic Voice Log",
    photoTitle: "📷 Crop Photo Diagnosis (ResNet18 / Vision AI)",
    photoChoose: "Choose crop photo or take picture",
    symptomTitle: "✍️ Diagnostic Symptoms (English / Translated)",
    micTitle: "🎙️ Raw Browser Voice Recording (optional)",
    startMic: "🎤 Start Microphone Recording",
    stopMic: "⏹️ Stop Recording",
    submitBtn: "🔍 Submit & Diagnose",
    analyzing: "Analyzing...",
    confidence: "Confidence",
    severity: "Severity",
    treatmentTitle: "💊 Recommended Treatment",
    symptomsDetected: "🔎 Symptoms Detected",
    escalatedTitle: "🆘 Escalated to RSK Expert",
    escalatedSub: "A Rashtriya Seva Kisan expert will review your case. Ticket:",
    reportId: "Report:",
    photoAttached: "📷 Photo attached",
    audioAttached: "🎙️ Audio attached",
    farmerLabel: "🧑‍🌾 Farmer:",
    aiLabel: "🤖 AgriShield AI:"
  }
};

function getSeverityColor(severity: string) {
  switch (severity) {
    case "high":
      return "text-red-700 bg-red-50 border-red-200";
    case "medium":
      return "text-amber-700 bg-amber-50 border-amber-200";
    case "low":
      return "text-blue-700 bg-blue-50 border-blue-200";
    case "none":
      return "text-green-700 bg-green-50 border-green-200";
    default:
      return "text-gray-700 bg-gray-50 border-gray-200";
  }
}

export default function ReportIssuePage() {
  const router = useRouter();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [indicLang, setIndicLang] = useState("hi");
  const [simulatingSTT, setSimulatingSTT] = useState(false);
  const [conversationTurns, setConversationTurns] = useState<ConversationTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReportResponse | null>(null);
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  const t = LOCALIZED_UI_LABELS[indicLang] || LOCALIZED_UI_LABELS.en;



  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetch("http://localhost:8000/farms", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setFarms(data);
        if (data.length > 0) setSelectedFarmId(data[0].id);
      })
      .catch(() => { });
  }, [router]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      setError("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSimulateBhashiniSTT = () => {
    setSimulatingSTT(true);
    setConversationTurns([]);
    setTimeout(() => {
      const conv = VOICE_CONVERSATIONS[indicLang] || VOICE_CONVERSATIONS.hi;
      setConversationTurns(conv.turns);
      setDescription(conv.desc);
      setSimulatingSTT(false);
    }, 1200);
  };

  const handleSubmit = async () => {
    const targetFarmId = selectedFarmId || (farms.length > 0 ? farms[0].id : 1);
    const targetDescription = description || (!photo && !audioBlob ? "Leaves turning yellow with brown spots, plant wilting in afternoon heat." : description);

    setLoading(true);
    setError("");
    setResult(null);

    const token = localStorage.getItem("token") || "demo_token";

    const formData = new FormData();
    formData.append("farm_id", String(targetFarmId));
    formData.append("description", targetDescription);
    formData.append("language", indicLang);
    if (photo) formData.append("photo", photo);
    if (audioBlob) formData.append("audio", audioBlob, "recording.webm");

    try {
      const res = await fetch("http://localhost:8000/api/health-report", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to submit report");
      }

      const data: ReportResponse = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen apple-bg p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors mb-2 inline-block"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="apple-title">{t.portalTitle}</h1>
            <p className="text-gray-500 mt-1">
              {t.portalSub}
            </p>
          </div>
          <a
            href="https://wa.me/14155238886?text=Namaste!%20I%20want%20to%20send%20a%20photo%20of%20my%20crop%20for%20AI%20diagnosis"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 flex items-center gap-2 self-start md:self-auto hover:scale-105"
          >
            <span>💬 Send Photo on WhatsApp</span>
            <span>↗</span>
          </a>
        </div>

        {/* Input Form */}
        <Card className="apple-card border-0 shadow-xl bg-white/95">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Issue Diagnosis Portal</CardTitle>
            <CardDescription>
              Connected directly to Rashtriya Seva Kisan (RSK) Kendras for expert closed-loop follow-up
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Farm selector */}
            {farms.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">{t.selectFarm}</Label>
                <div className="flex flex-wrap gap-2">
                  {farms.map((farm) => (
                    <button
                      key={farm.id}
                      onClick={() => setSelectedFarmId(farm.id)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${selectedFarmId === farm.id
                          ? "bg-gray-900 text-white shadow-md scale-105"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                    >
                      {farm.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bhashini Indic STT Section */}
            <div className="bg-gradient-to-br from-orange-50 via-amber-50/50 to-white border border-orange-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-orange-950 flex items-center gap-2 text-base">
                    <span>{t.bhashiniTitle}</span>
                    <span className="bg-orange-200 text-orange-900 text-[10px] font-extrabold px-2 py-0.5 rounded">HACKATHON REQUIREMENT</span>
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {t.bhashiniSub}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={indicLang}
                    onChange={(e) => {
                      setIndicLang(e.target.value);
                      setConversationTurns([]);
                    }}
                    className="bg-white border border-orange-300 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="hi">🇮🇳 Hindi (हिन्दी)</option>
                    <option value="te">🇮🇳 Telugu (తెలుగు)</option>
                    <option value="ta">🇮🇳 Tamil (தமிழ்)</option>
                    <option value="mr">🇮🇳 Marathi (मराठी)</option>
                    <option value="en">🇬🇧 English</option>
                  </select>
                  <Button
                    type="button"
                    onClick={handleSimulateBhashiniSTT}
                    disabled={simulatingSTT}
                    className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl px-4 py-2 text-xs font-bold shadow-md transition-all duration-300 flex items-center gap-1.5"
                  >
                    {simulatingSTT ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span>Translating...</span>
                      </>
                    ) : (
                      <>
                        <span>{t.simulateBtn}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {conversationTurns.length > 0 && (
                <div className="bg-white/95 border border-orange-200 rounded-2xl p-4 shadow-inner space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-orange-100 pb-2">
                    <span className="font-extrabold text-xs text-orange-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      {t.bhashiniTitle}
                    </span>
                    <span className="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-bold">
                      Bhashini AI Voice Log
                    </span>
                  </div>
                  <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                    {conversationTurns.map((turn, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl text-xs leading-relaxed flex flex-col gap-1 ${turn.speaker === "farmer"
                            ? "bg-orange-50/80 border border-orange-200/60 text-orange-950 ml-4 rounded-tr-none"
                            : "bg-emerald-50/80 border border-emerald-200/60 text-emerald-950 mr-4 rounded-tl-none"
                          }`}
                      >
                        <div className="flex items-center justify-between font-bold text-[11px] opacity-80">
                          <span>{turn.speaker === "farmer" ? t.farmerLabel : t.aiLabel}</span>
                          <span className="text-[9px]">{turn.time}</span>
                        </div>
                        <p className="font-medium text-xs">{turn.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Photo upload */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">
                {t.photoTitle}
              </Label>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer flex items-center gap-2 px-5 py-3.5 rounded-2xl border-2 border-dashed border-gray-300 hover:border-emerald-500 transition-colors bg-gray-50/50 hover:bg-emerald-50/20">
                  <span className="text-2xl">📸</span>
                  <span className="text-sm font-medium text-gray-700">
                    {photo ? photo.name : t.photoChoose}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
                {photoPreview && (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-16 h-16 rounded-xl object-cover border shadow-sm"
                  />
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">
                {t.symptomTitle}
              </Label>
              <textarea
                placeholder="e.g., Leaves are turning yellow with brown spots..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
              />
            </div>

            {/* Voice recording */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">
                {t.micTitle}
              </Label>
              <div className="flex items-center gap-3">
                {!isRecording ? (
                  <Button
                    variant="outline"
                    onClick={startRecording}
                    className="rounded-full border-gray-300 font-semibold"
                  >
                    {t.startMic}
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={stopRecording}
                    className="rounded-full animate-pulse font-semibold"
                  >
                    {t.stopMic}
                  </Button>
                )}
                {audioBlob && (
                  <span className="text-sm text-emerald-700 font-semibold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    ✅ Attached ({(audioBlob.size / 1024).toFixed(0)} KB)
                  </span>
                )}
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-xl">
                {error}
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="rounded-full px-8 py-3 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  {t.analyzing}
                </span>
              ) : (
                t.submitBtn
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <div ref={resultRef} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Diagnosis card */}
            {result.diagnosis && (
              <Card
                className={`apple-card border ${getSeverityColor(
                  result.diagnosis.severity
                )}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-4xl">
                      {result.diagnosis.severity === "none"
                        ? "✅"
                        : result.diagnosis.severity === "high"
                          ? "🚨"
                          : "⚠️"}
                    </span>
                    <div>
                      <h3 className="text-xl font-bold">
                        {result.diagnosis.disease_name}
                      </h3>
                      <p className="text-sm opacity-80">
                        {t.confidence}: {(result.diagnosis.confidence * 100).toFixed(1)}%
                        · {t.severity}: {result.diagnosis.severity}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/60 rounded-xl p-4">
                    <p className="text-sm font-medium mb-1">
                      {t.treatmentTitle}
                    </p>
                    <p className="text-sm">
                      {result.diagnosis.treatment}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Symptoms detected */}
            {result.symptoms_detected.length > 0 && (
              <Card className="apple-card">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">
                    {t.symptomsDetected}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {result.symptoms_detected.map((s) => (
                      <span
                        key={s}
                        className="px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Escalation notice */}
            {result.escalated && result.escalation_ticket && (
              <Card className="apple-card border border-red-200 bg-red-50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🆘</span>
                    <div>
                      <h3 className="font-bold text-red-800">
                        {t.escalatedTitle}
                      </h3>
                      <p className="text-sm text-red-600">
                        {t.escalatedSub}{" "}
                        {(result.escalation_ticket as Record<string, string>)
                          .ticket_id || "N/A"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Report meta */}
            <div className="flex flex-wrap gap-3 text-sm text-gray-500">
              <span className="px-3 py-1 bg-gray-100 rounded-full">
                {t.reportId} {result.report_id}
              </span>
              {result.has_photo && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
                  {t.photoAttached}
                </span>
              )}
              {result.has_audio && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                  {t.audioAttached}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
