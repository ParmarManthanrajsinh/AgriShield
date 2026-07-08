"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  const [chatInput, setChatInput] = useState("");
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

  const [messages, setMessages] = useState([
    { sender: "user", text: "My paddy field is showing brown spots." },
    {
      sender: "ai",
      text: "Analyzing... Likely Brown Spot. Processing ZKP claim eligibility.",
    },
  ]);

  const handleSendSimulation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput("");
    setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: `ResNet18 diagnosis processed for "${userMsg}". Confidence: 97.2%. Treatment & parametric claim verified.`,
        },
      ]);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] font-sans antialiased overflow-x-hidden selection:bg-[#10b981] selection:text-white relative">
      {/* Background Illustration */}
      <div 
        className="fixed top-0 left-0 w-full h-full -z-10 opacity-[0.12] bg-contain bg-no-repeat bg-center pointer-events-none" 
        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida/AP1WRLtMKBO_gY6vi40zhvrCUDE7LpxNpJI4jAp-S17okoKUgetlWZgVYuF0P9uqdbE5_oGuAMr2TN2MjOnUMUrCoEXk9x5c_RRnNCO06T13jaK9-mb4RTQ2SZ4Lsxvqq7vhy-ofIwWf8yAvslrTZc2o8sdUxn5kRlMV_9XeomjO2Rs2m9M8l9ZrCv-r2uTFr4myZEXpDi636KKTLuUFCWf2fA3zH3JkZ3afAUty9Vo0ng8Im_H5L-pxu9fLmxI')" }}
      ></div>

      {/* Organic Background Elements */}
      <div 
        className="fixed z-0 blur-[80px] opacity-[0.15] pointer-events-none bg-[#006d43] w-[600px] h-[600px] rounded-full -top-48 -left-24 transition-transform duration-75"
        style={{ transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 20}px)` }}
      ></div>
      <div 
        className="fixed z-0 blur-[80px] opacity-[0.15] pointer-events-none bg-[#00351f] w-[400px] h-[400px] rounded-full bottom-0 -right-12 transition-transform duration-75"
        style={{ transform: `translate(${mousePos.x * 40}px, ${mousePos.y * 40}px)` }}
      ></div>

      {/* Sticky Glass Navigation Bar */}
      <header className="fixed top-0 w-full z-50 bg-[#faf8ff]/75 backdrop-blur-lg border-b border-[#bbcabf]/30 shadow-sm transition-all duration-300">
        <div className="flex justify-between items-center px-4 md:px-12 py-4 max-w-[1440px] mx-auto">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-20 h-20 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
              <Image src="/logo.png" alt="AgriShield Logo" width={80} height={80} className="object-contain" priority />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-2xl font-bold font-heading text-[#006c49] tracking-tight">
                AgriShield
              </span>
              <span className="text-xs font-semibold text-[#3c4a42] bg-[#eaedff] py-0.5 px-2.5 rounded-full inline-block mt-0.5 font-mono">
                Web3 • ZKP • AI Vision
              </span>
            </div>
          </Link>
          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/whatsapp-ivr"
              className="hidden sm:inline-flex text-sm font-semibold bg-transparent border border-[#bbcabf] text-[#3c4a42] px-4 py-2 rounded-lg hover:bg-[#eaedff] transition-colors"
            >
              Try WhatsApp Sandbox
            </Link>
            <Link
              href="/login"
              className="text-sm font-semibold bg-gradient-to-r from-[#10b981] to-[#006c49] text-white px-5 py-2 rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Launch Farmer Portal
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-32 pb-24 px-4 md:px-12 max-w-[1440px] mx-auto space-y-32">
        {/* Section 2: Hero Showcase */}
        <section className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-8 mt-8">

          <h1 className="text-4xl sm:text-5xl md:text-[72px] md:leading-[80px] font-bold font-heading text-[#131b2e] tracking-tight">
            The Future of Farming.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#006c49] to-[#006398]">
              Protected by AI &amp; Zero-Knowledge Proofs.
            </span>
          </h1>

          <p className="text-lg text-[#3c4a42] max-w-3xl leading-relaxed">
            Instant crop disease detection via ResNet18, 24/7 satellite weather indexing, and zero-paperwork parametric insurance claims delivered straight to your bank account.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 w-full sm:w-auto justify-center">
            <Link
              href="/login"
              className="w-full sm:w-auto text-base font-semibold bg-gradient-to-r from-[#10b981] to-[#006c49] text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
            >
              Access Farmer Dashboard
              <span className="text-xl">→</span>
            </Link>
            <Link
              href="/dashboard/whatsapp-ivr"
              className="w-full sm:w-auto text-base font-semibold bg-white border border-[#bbcabf] text-[#131b2e] px-8 py-4 rounded-xl shadow-sm hover:bg-[#eaedff] transition-all flex items-center justify-center gap-2"
            >
              Open WhatsApp AI Sandbox (1800-AGRI-SHIELD)
            </Link>
          </div>
        </section>

        {/* Section 3: Apple-Style Bento Grid */}
        <section id="features" className="space-y-12">
          <div className="text-center">
            <h2 className="text-3xl font-bold font-heading text-[#131b2e]">
              Precision Intelligence Ecosystem
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-[20px]">
            {/* Card 1: ResNet18 & Groq AI Diagnostics */}
            <div
              id="vision"
              className="bento-card md:col-span-8 p-6 md:p-8 flex flex-col justify-between relative bg-gradient-to-br from-white to-[#eaedff]/30"
            >
              <div className="z-10 max-w-md space-y-4">
                <span className="text-xs font-bold text-[#006c49] uppercase tracking-wider font-mono">
                  AI Vision
                </span>
                <h3 className="text-2xl font-bold font-heading text-[#131b2e]">
                  ResNet18 &amp; Groq AI Diagnostics
                </h3>
                <p className="text-base text-[#3c4a42] leading-relaxed">
                  Instant, edge-computed crop health analysis with 0.3s latency and 97% confidence scoring.
                </p>
              </div>
              <div className="mt-8 relative h-64 rounded-xl overflow-hidden border border-[#bbcabf]/20 shadow-inner bg-black/5">
                <div
                  className="bg-cover bg-center w-full h-full absolute inset-0 hover:scale-105 transition-transform duration-500"
                  style={{
                    backgroundImage:
                      "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCiC9xnUfHoB2LM3UD6HGlfeJzPDMnXhoguVL3mn-ex_es0XO6nnK6xwU_BH1XvEH_qEBUaZhQ3AHJPa0ts4b__W5NTLBCbKeJvESZcYF1QzWbx83CnrgZQ4dD-2mYFKIMNa7ob1Fvq2s69idQbX85-5IXtFXPlVlzCn8N3Lc_MvTnzAZQ6OaK6u2ovf7VYRIzEMHldsnHAY5JPs5LILbX-EFRzRQQor48oNEdWWoT7Z_2dcvjAdOmRJPK4Grlui9L9eKtdGLP6kw')",
                  }}
                />
              </div>
            </div>

            {/* Card 2: ZKP Smart Contracts */}
            <div
              id="zkp"
              className="bento-card md:col-span-4 p-6 md:p-8 flex flex-col justify-between bg-white"
            >
              <div className="space-y-4">
                <span className="text-xs font-bold text-[#006398] uppercase tracking-wider font-mono">
                  Smart Contracts
                </span>
                <h3 className="text-2xl font-bold font-heading text-[#131b2e]">
                  Zero-Knowledge Proof (ZKP) Claims
                </h3>
                <p className="text-base text-[#3c4a42] leading-relaxed">
                  Satellite rainfall sensors triggering instant payouts without revealing sensitive farm data.
                </p>
              </div>
              <div className="mt-8 flex items-center justify-center relative h-32">
                {/* Outer tech ring */}
                <div className="absolute w-28 h-28 rounded-full border border-dashed border-[#10b981]/40 animate-[spin_8s_linear_infinite]" />
                {/* Middle gradient spinner with glow */}
                <div className="absolute w-20 h-20 rounded-full border-2 border-transparent border-t-[#006c49] border-r-[#10b981] animate-spin shadow-[0_0_20px_rgba(16,185,129,0.4)]" />
                {/* Inner pulsing core */}
                <div className="absolute w-14 h-14 bg-gradient-to-tr from-[#006c49]/20 to-[#10b981]/20 rounded-full animate-pulse backdrop-blur-md" />
                {/* Static center icon */}
                <span className="relative z-10 text-3xl drop-shadow-lg scale-110">
                  🛡️
                </span>
              </div>
            </div>

            {/* Card 3: Telemetry */}
            <div
              id="telemetry"
              className="bento-card md:col-span-5 p-6 md:p-8 flex flex-col justify-between bg-white"
            >
              <div className="space-y-4">
                <span className="text-xs font-bold text-[#f08921] uppercase tracking-wider font-mono">
                  Telemetry
                </span>
                <h3 className="text-2xl font-bold font-heading text-[#131b2e]">
                  Satellite Weather &amp; Microclimate Indexing
                </h3>
              </div>
              <div className="mt-8 relative h-48 rounded-xl overflow-hidden bg-black/5">
                <div
                  className="bg-cover bg-center w-full h-full hover:scale-105 transition-transform duration-500"
                  style={{
                    backgroundImage:
                      "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAVsqr_0fc5H900mo5YglAn9EJnUAuo6SW_EXNru8iJwvbAXT-pG0AB27bPtyPE8fOaWlVJKhi7m5X0Mbwwx0QUskL8WTVN7zA9ZLC8__l2frUgrsneHMkMKQDTLYBW1vXiasOlIf-O4Mc7WYI_VHsIbj0WxImXY8IN_wKLmxe0Q19GefH3KEmX7Vf_ULY6QyaqXcbybFzIE5noTURr022R-HjkSoYYT5gASY7nrwA_gmvp-Yiuu5hfQ9JxhmPF6oQOru8GB1iwaQ')",
                  }}
                />
              </div>
            </div>

            {/* Card 4: WhatsApp AI Sandbox */}
            <div
              id="whatsapp"
              className="bento-card md:col-span-7 p-6 md:p-8 flex flex-col md:flex-row justify-between items-center bg-gradient-to-r from-[#eaedff] to-[#f2f3ff]"
            >
              <div className="max-w-sm space-y-4 mb-8 md:mb-0">
                <span className="text-xs font-bold text-[#006c49] uppercase tracking-wider font-mono">
                  Accessibility
                </span>
                <h3 className="text-2xl font-bold font-heading text-[#131b2e]">
                  WhatsApp AI Sandbox
                </h3>
                <p className="text-base text-[#3c4a42] leading-relaxed">
                  Command center in your pocket. Query yields, report damage, and receive advisory in native dialects.
                </p>
                <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-[#bbcabf]/30 mt-4">
                  <span className="text-[#10b981] font-bold">📞</span>
                  <span className="text-sm font-bold text-[#131b2e]">
                    1800-AGRI-SHIELD
                  </span>
                </div>
              </div>

              {/* Chat Mockup Interactive Box */}
              <div className="w-full md:w-72 h-72 bg-white rounded-2xl shadow-sm border border-[#bbcabf]/30 p-4 flex flex-col justify-between relative overflow-hidden">
                <div className="space-y-3 overflow-y-auto max-h-[190px] pr-1">
                  {messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed max-w-[85%] ${
                        m.sender === "user"
                          ? "bg-[#eaedff] text-[#3c4a42] rounded-tl-none self-start"
                          : "bg-[#10b981] text-white rounded-tr-none self-end ml-auto"
                      }`}
                    >
                      {m.text}
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={handleSendSimulation}
                  className="mt-2 h-10 bg-[#f2f3ff] rounded-full flex items-center px-3 border border-[#bbcabf]/30 gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="bg-transparent text-xs text-[#131b2e] focus:outline-none w-full"
                  />
                  <button
                    type="submit"
                    className="text-[#006c49] font-bold text-xs hover:scale-110 transition-transform"
                  >
                    →
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 bg-white border-t border-[#bbcabf]/20">
        <div className="flex flex-col md:flex-row justify-between items-center px-4 md:px-12 gap-6 max-w-[1440px] mx-auto">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="text-lg font-bold font-heading text-[#131b2e]">
              AgriShield
            </span>
          </div>
          <nav className="flex flex-wrap justify-center md:flex-nowrap gap-4 md:gap-6 mt-6 md:mt-0 items-center text-center">
            <span className="text-xs font-medium text-[#3c4a42] flex items-center gap-1.5 w-full md:w-auto justify-center">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              System Status: Operational
            </span>
            <span className="text-xs font-medium text-[#3c4a42]">
              Privacy Policy
            </span>
            <span className="text-xs font-medium text-[#3c4a42]">
              Terms of Service
            </span>
            <a
              className="text-xs font-medium text-[#3c4a42] hover:text-[#006c49] transition-all duration-300"
              href="mailto:support@agrishield.com"
            >
              Contact Support
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
