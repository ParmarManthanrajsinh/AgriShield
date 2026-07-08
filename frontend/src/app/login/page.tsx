"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getApiBase, getErrorMessage, setToken, authFetch } from "@/lib/api";
import { ArrowLeft, Mail, Lock, LogIn, Leaf } from "lucide-react";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect") || "/dashboard";
  const allowedRedirects = ["/dashboard", "/admin", "/admin/claims", "/admin/rsk-queue", "/farms", "/claims"];
  const redirectPath = allowedRedirects.includes(rawRedirect) ? rawRedirect : "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isFocused, setIsFocused] = useState(false);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const apiBase = await getApiBase();
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const res = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString()
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(getErrorMessage(data, "Invalid credentials"));
      }

      const loginData = await res.json();
      if (!loginData.access_token) {
        throw new Error("No access token received from server");
      }
      setToken(loginData.access_token);

      const meRes = await authFetch(`${apiBase}/users/me`);
      if (!meRes.ok) {
        throw new Error("Session verification failed after login");
      }

      const user = await meRes.json();
      if (user.role === "rsk_expert") {
        router.push("/admin/rsk-queue");
        return;
      }
      if (user.role === "insurance_admin") {
        router.push("/admin/claims");
        return;
      }
      router.push(redirectPath);
    } catch (err: any) {
      console.error("[Login Error]", err);
      setError(getErrorMessage(err, "Login failed. Please verify your credentials."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f9f9fc] min-h-screen flex flex-col font-sans text-[#1a1c1e] overflow-x-hidden relative">

      {/* Organic Background Elements */}
      <div 
        className="absolute z-0 blur-[60px] opacity-[0.15] pointer-events-none bg-[#006d43] w-[600px] h-[600px] rounded-full -top-48 -left-24 transition-transform duration-75"
        style={{ transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 20}px)` }}
      ></div>
      <div 
        className="absolute z-0 blur-[60px] opacity-[0.15] pointer-events-none bg-[#00351f] w-[400px] h-[400px] rounded-full bottom-0 -right-12 transition-transform duration-75"
        style={{ transform: `translate(${mousePos.x * 40}px, ${mousePos.y * 40}px)` }}
      ></div>

      {/* Top Bar */}
      <header className="w-full px-4 md:px-10 py-8 flex justify-between items-center z-10">
        <Link href="/" className="flex items-center gap-4 cursor-pointer group transition-all duration-300">
          <Image src="/logo.png" alt="AgriShield Logo" width={80} height={80} className="object-contain drop-shadow-md group-hover:scale-105 transition-transform" />
          <span className="text-2xl md:text-3xl font-bold font-heading text-[#00351f] group-hover:opacity-80 transition-opacity">AgriShield</span>
        </Link>
        <Link href="/" className="flex items-center gap-2 text-[#404943] hover:text-[#00351f] transition-colors duration-200 font-medium">
          <ArrowLeft size={20} />
          <span className="hidden md:inline text-xs font-semibold tracking-wider uppercase">Back to landing page</span>
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex items-center justify-center px-4 relative z-10 py-12">
        <div className="w-full max-w-[480px]">
          {/* Login Card */}
          <div 
            className="bg-white rounded-xl p-8 md:p-12 transition-all duration-500 ease-in-out shadow-[0_40px_80px_-20px_rgba(15,77,50,0.08)] border border-[rgba(192,201,192,0.4)] backdrop-blur-sm"
            style={{
              transform: isFocused ? 'translateY(-4px)' : 'translateY(0)',
              borderColor: isFocused ? 'rgba(0,109,67,0.2)' : 'rgba(192,201,192,0.4)'
            }}
          >
            <div className="mb-10">
              <h1 className="text-2xl md:text-3xl font-bold font-heading text-[#00351f] mb-3">
                Welcome back to AgriShield
              </h1>
              <p className="text-[#404943] text-base opacity-80 leading-relaxed">
                Enter your credentials to access your farm dashboard and parametric claims.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold tracking-wider uppercase text-[#00351f]" htmlFor="email">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#707972]" size={20} />
                  <input 
                    className="w-full bg-[#f3f3f6] border border-[#c0c9c0] rounded-lg py-3.5 pl-12 pr-4 text-[#1a1c1e] placeholder-[#c0c9c0] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#54de99]" 
                    id="email" 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="farmer@estate.com" 
                    required 
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold tracking-wider uppercase text-[#00351f]" htmlFor="password">Password</label>
                  <a className="text-[#006d43] text-xs font-semibold hover:underline" href="#">Forgot password?</a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#707972]" size={20} />
                  <input 
                    className="w-full bg-[#f3f3f6] border border-[#c0c9c0] rounded-lg py-3.5 pl-12 pr-4 text-[#1a1c1e] placeholder-[#c0c9c0] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#54de99]" 
                    id="password" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="••••••••" 
                    required 
                  />
                </div>
              </div>
              
              {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

              {/* Remember Me */}
              <div className="flex items-center gap-3">
                <input className="w-5 h-5 rounded border-[#c0c9c0] text-[#006d43] focus:ring-[#006d43] cursor-pointer" id="remember" type="checkbox"/>
                <label className="text-[#404943] text-base cursor-pointer select-none" htmlFor="remember">Remember this device</label>
              </div>

              {/* Log In Button */}
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[#0f4d32] text-white py-4 rounded-lg text-lg font-bold font-heading hover:bg-[#00351f] transition-all duration-300 shadow-lg hover:shadow-[#0f4d32]/20 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Logging in..." : "Log In"}
                <LogIn size={20} className="transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </form>

            {/* Register Footer */}
            <div className="mt-10 pt-8 border-t border-[rgba(192,201,192,0.3)] text-center">
              <p className="text-[#404943] text-base">
                Don't have an account? 
                <Link href="/register" className="text-[#006d43] font-bold hover:underline ml-1">Register</Link>
              </p>
            </div>
          </div>

          {/* Hand-drawn leaf flourish */}
          <div className="mt-8 flex justify-center opacity-40">
            <Leaf size={36} className="text-[#0f4d32]" />
          </div>
        </div>
      </main>

      {/* Footer Information */}
      <footer className="w-full py-8 px-4 md:px-10 z-10">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 opacity-60">
          <p className="text-xs font-semibold tracking-wider text-[#404943]">
            © 2024 AgriShield. Technological Stewardship for the Modern Farmer.
          </p>
          <nav className="flex gap-6">
            <a className="text-xs font-semibold tracking-wider text-[#404943] hover:text-[#00351f] transition-colors" href="#">Privacy Policy</a>
            <a className="text-xs font-semibold tracking-wider text-[#404943] hover:text-[#00351f] transition-colors" href="#">Terms of Service</a>
            <a className="text-xs font-semibold tracking-wider text-[#404943] hover:text-[#00351f] transition-colors" href="#">Support</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#f9f9fc]">Loading login...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
