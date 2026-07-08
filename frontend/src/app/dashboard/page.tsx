"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { getApiBase, authFetch, removeToken } from "@/lib/api";
import {
  LogOut,
  Sprout,
  AlertTriangle,
  ShieldCheck,
  Mic,
  MessageSquare,
  Plus,
  MapPin,
  ChevronRight
} from "lucide-react";

interface Farm {
  id: number;
  name: string;
  area_hectares: string;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{name: string, email: string, role?: string} | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);

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
    let cancelled = false;
    (async () => {
      const apiBase = await getApiBase();
      if (cancelled) return;
      authFetch(`${apiBase}/users/me`)
      .then(res => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then(data => {
        if (!cancelled) {
          if (data.role === "rsk_expert") {
            router.push("/admin/rsk-queue");
            return;
          }
          if (data.role === "insurance_admin") {
            router.push("/admin/claims");
            return;
          }
          setUser(data);
        }
      })
      .catch(() => { if (!cancelled) router.push("/login") });

      authFetch(`${apiBase}/farms`)
      .then(res => { if (!res.ok) return []; return res.json() })
      .then(data => { if (!cancelled) setFarms(data) })
      .catch(() => {});
    })();
    return () => { cancelled = true };
  }, [router]);

  const handleLogout = async () => {
    const apiBase = await getApiBase();
    authFetch(`${apiBase}/auth/logout`, { method: "POST" })
      .finally(() => { removeToken(); router.push("/login"); });
  };

  if (!user) return <div className="min-h-screen bg-[#f9f9fc] flex items-center justify-center text-[#1a1c1e] font-sans">Loading workspace...</div>;

  return (
    <div className="bg-[#f9f9fc] min-h-screen flex flex-col font-sans text-[#1a1c1e] overflow-x-hidden relative">
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

      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-[rgba(192,201,192,0.3)] w-full">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 cursor-pointer group transition-all duration-300">
            <Image src="/logo.png" alt="AgriShield Logo" width={40} height={40} className="object-contain drop-shadow-sm group-hover:scale-105 transition-transform" />
            <span className="text-2xl font-bold font-heading text-[#00351f]">AgriShield Workspace</span>
          </Link>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 hidden sm:flex">
              <div className="text-right">
                <p className="text-sm font-bold text-[#00351f]">{user.name}</p>
                <p className="text-xs text-[#404943] font-medium tracking-wide uppercase">{user.role?.replace("_", " ") || "Farmer"}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#0f4d32] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="h-8 w-px bg-[rgba(192,201,192,0.5)] mx-2 hidden sm:block"></div>
            <Button 
              variant="ghost" 
              className="text-[#404943] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/50 transition-colors gap-2" 
              onClick={handleLogout}
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full px-6 py-10 z-10 relative flex-grow flex flex-col gap-10">
        
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold font-heading text-[#00351f] mb-2">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user.name.split(' ')[0]}
            </h1>
            <p className="text-[#404943] text-base">Here is what is happening with your farms today.</p>
          </div>
          <Link href="/farms/new">
            <Button className="bg-[#0f4d32] hover:bg-[#00351f] text-white rounded-lg shadow-sm gap-2 px-6 py-5">
              <Plus size={18} />
              Register New Farm
            </Button>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left Column: Registered Farms (Spans 2 columns on lg) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#00351f] font-heading">Your Active Farms</h2>
            </div>
            
            {farms.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-[#bbcabf] p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-[#f3f3f6] rounded-full flex items-center justify-center mb-4 text-[#707972]">
                  <MapPin size={28} />
                </div>
                <h3 className="text-xl font-bold text-[#00351f] mb-2 font-heading">No farms registered yet</h3>
                <p className="text-[#404943] mb-6 max-w-sm">Add your first farm to unlock AI crop advisories, parametric insurance, and precise telemetry data.</p>
                <Link href="/farms/new">
                  <Button className="bg-[#0f4d32] hover:bg-[#00351f] text-white rounded-lg shadow-sm gap-2">
                    <Plus size={18} />
                    Register a Farm
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-5">
                {farms.map(farm => (
                  <Link href={`/farms/${farm.id}`} key={farm.id} className="group">
                    <Card className="bg-white rounded-2xl shadow-sm border border-[rgba(192,201,192,0.4)] hover:shadow-md hover:border-[#82bd9a] transition-all duration-200 h-full overflow-hidden">
                      <div className="h-2 w-full bg-gradient-to-r from-[#10b981] to-[#006c49]"></div>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-10 h-10 rounded-lg bg-[#f3f3f6] text-[#0f4d32] flex items-center justify-center">
                            <MapPin size={20} />
                          </div>
                          <div className="bg-[#e2e2e5] text-[#404943] text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                            {farm.area_hectares} HA
                          </div>
                        </div>
                        <h3 className="text-xl font-bold text-[#00351f] mb-1 group-hover:text-[#006c49] transition-colors">{farm.name}</h3>
                        <p className="text-sm text-[#707972] flex items-center gap-1">
                          View telemetry & analytics <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            <div className="pt-6">
              <h2 className="text-lg font-bold text-[#00351f] font-heading mb-6">AI & Advisory Tools</h2>
              <div className="grid sm:grid-cols-2 gap-5">
                <Link href="/dashboard/recommended-crops" className="group">
                  <div className="bg-white rounded-2xl shadow-sm border border-[rgba(192,201,192,0.4)] hover:shadow-md transition-all duration-200 p-6 flex gap-4 items-start">
                    <div className="w-12 h-12 rounded-xl bg-[#e8f7f0] text-[#0f4d32] flex items-center justify-center shrink-0 group-hover:bg-[#0f4d32] group-hover:text-white transition-colors">
                      <Sprout size={24} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#00351f] mb-1">Crop Recommendations</h3>
                      <p className="text-sm text-[#404943]">AI suggestions based on soil and climate.</p>
                    </div>
                  </div>
                </Link>

                <Link href="/dashboard/advisory" className="group">
                  <div className="bg-white rounded-2xl shadow-sm border border-[rgba(192,201,192,0.4)] hover:shadow-md transition-all duration-200 p-6 flex gap-4 items-start">
                    <div className="w-12 h-12 rounded-xl bg-[#fff4e5] text-[#904d00] flex items-center justify-center shrink-0 group-hover:bg-[#904d00] group-hover:text-white transition-colors">
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#00351f] mb-1">Alerts & Advisories</h3>
                      <p className="text-sm text-[#404943]">Dry-spell warnings and weather alerts.</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Actions & Tools */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[#00351f] font-heading">Protection & Support</h2>
            
            <div className="bg-white rounded-2xl shadow-sm border border-[rgba(192,201,192,0.4)] overflow-hidden">
              <div className="p-6 border-b border-[rgba(192,201,192,0.3)]">
                <Link href="/claims" className="group flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-xl bg-[#eaf4fe] text-[#006398] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#00351f] mb-1 group-hover:text-[#006398] transition-colors">Insurance Claims</h3>
                    <p className="text-sm text-[#404943]">Track ZKP proofs & payouts</p>
                  </div>
                </Link>
              </div>
              
              <div className="p-6 border-b border-[rgba(192,201,192,0.3)] bg-[#faf8ff]">
                <h4 className="text-xs font-bold tracking-wider text-[#707972] uppercase mb-4">Field Intelligence</h4>
                <Link href="/dashboard/report-issue" className="group flex gap-4 items-center mb-6">
                  <div className="w-10 h-10 rounded-lg bg-white border border-[#bbcabf] text-[#0f4d32] flex items-center justify-center shrink-0 shadow-sm group-hover:border-[#0f4d32] transition-colors">
                    <Mic size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#00351f]">Report Crop Issue</h3>
                    <p className="text-xs text-[#404943]">Voice STT & Photo Diagnosis</p>
                  </div>
                </Link>
                <Link href="/dashboard/whatsapp-ivr" className="group flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-lg bg-white border border-[#bbcabf] text-[#006d43] flex items-center justify-center shrink-0 shadow-sm group-hover:border-[#006d43] transition-colors">
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#00351f]">WhatsApp & IVR</h3>
                    <p className="text-xs text-[#404943]">Indic Voice & SMS Bot</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Quick Stats or Info Card */}
            <div className="bg-gradient-to-br from-[#0f4d32] to-[#00351f] rounded-2xl shadow-md p-6 text-white relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl"></div>
              <h3 className="text-lg font-bold font-heading mb-2">AgriShield Network</h3>
              <p className="text-sm text-[#82bd9a] leading-relaxed mb-4">
                Your farm data is secured by zero-knowledge proofs. We only use telemetry to automatically trigger valid parametric claims.
              </p>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#b3f0cb]">
                <div className="w-2 h-2 rounded-full bg-[#73fcb4] animate-pulse"></div>
                System Operational
              </div>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
