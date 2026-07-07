"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";

interface Farm {
  id: number;
  name: string;
  area_hectares: string;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{name: string, email: string} | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("http://localhost:8000/users/me", {
      credentials: "include"
    })
    .then(res => {
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    })
    .then(data => { if (!cancelled) setUser(data) })
    .catch(() => { if (!cancelled) router.push("/login") });

    fetch("http://localhost:8000/farms", {
      credentials: "include"
    })
    .then(res => { if (!res.ok) return []; return res.json() })
    .then(data => { if (!cancelled) setFarms(data) })
    .catch(() => {});
    return () => { cancelled = true };
  }, [router]);

  const handleLogout = () => {
    fetch("http://localhost:8000/auth/logout", { method: "POST", credentials: "include" })
      .finally(() => router.push("/login"));
  };

  if (!user) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen apple-bg p-8">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-center">
          <h1 className="apple-title">🌾 AgriShield Dashboard</h1>
          <Button variant="outline" className="rounded-full" onClick={handleLogout}>Log out</Button>
        </div>
        
        <Card className="apple-card">
          <CardHeader>
            <CardTitle>Welcome, {user.name}</CardTitle>
            <CardDescription>Manage your registered farms, get AI crop advisories, and file ZKP insurance claims.</CardDescription>
          </CardHeader>
          <CardContent>
            {farms.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">You have no registered farms yet.</p>
                <Link href="/farms/new" className={buttonVariants()}>Add Farm</Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Your Farms</h3>
                  <Link href="/farms/new" className={buttonVariants({ variant: "secondary", size: "sm", className: "rounded-full" })}>Add Farm</Link>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  {farms.map(farm => (
                    <Card key={farm.id} className="apple-card card-hover cursor-pointer border border-gray-100">
                      <Link href={`/farms/${farm.id}`} className="block h-full">
                        <CardHeader className="p-6 pb-2">
                          <CardTitle className="text-xl font-semibold text-gray-900">{farm.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 text-sm text-gray-500">
                          {farm.area_hectares} hectares
                        </CardContent>
                      </Link>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 1. Farmer Core Features */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">👨‍🌾 Farmer Core Features</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="apple-card card-hover cursor-pointer border border-gray-100 group">
              <Link href="/dashboard/recommended-crops" className="block h-full">
                <CardHeader className="p-6 pb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl group-hover:scale-110 transition-transform duration-300">🌾</span>
                    <CardTitle className="text-lg font-semibold text-gray-900">Crop Recommendations</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-2 text-sm text-gray-500">
                  AI-powered crop suggestions based on your soil, climate, and location
                </CardContent>
              </Link>
            </Card>
            <Card className="apple-card card-hover cursor-pointer border border-gray-100 group">
              <Link href="/dashboard/advisory" className="block h-full">
                <CardHeader className="p-6 pb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl group-hover:scale-110 transition-transform duration-300">⚠️</span>
                    <CardTitle className="text-lg font-semibold text-gray-900">Advisory & Alerts</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-2 text-sm text-gray-500">
                  Dry-spell warnings, weather alerts, and farming advisories
                </CardContent>
              </Link>
            </Card>
            <Card className="apple-card card-hover cursor-pointer border border-gray-100 group">
              <Link href="/claims" className="block h-full">
                <CardHeader className="p-6 pb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl group-hover:scale-110 transition-transform duration-300">🛡️</span>
                    <CardTitle className="text-lg font-semibold text-gray-900">My Insurance Claims</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-2 text-sm text-gray-500">
                  Track ZKP insurance claims, eligibility proofs, and payouts
                </CardContent>
              </Link>
            </Card>
          </div>
        </div>

        {/* 2. Bhashini AI & Indic Tools */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">🎙️ Bhashini AI & Indic Tools</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="apple-card card-hover cursor-pointer border border-gray-100 group">
              <Link href="/dashboard/report-issue" className="block h-full">
                <CardHeader className="p-6 pb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl group-hover:scale-110 transition-transform duration-300">🔬</span>
                    <CardTitle className="text-lg font-semibold text-gray-900">Report Crop Issue (Voice STT)</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-2 text-sm text-gray-500">
                  Record Indic voice notes or upload photos for AI disease diagnosis
                </CardContent>
              </Link>
            </Card>
            <Card className="apple-card card-hover cursor-pointer border border-gray-100 group">
              <Link href="/dashboard/whatsapp-ivr" className="block h-full">
                <CardHeader className="p-6 pb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl group-hover:scale-110 transition-transform duration-300">💬</span>
                    <CardTitle className="text-lg font-semibold text-gray-900">WhatsApp & IVR Hub</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-2 text-sm text-gray-500">
                  Indic voice IVR hotline & WhatsApp Business AI chatbot for SMS-first farmers
                </CardContent>
              </Link>
            </Card>
          </div>
        </div>

        {/* 3. Admin & RSK Portal */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">🛡️ Admin & RSK Portal</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="apple-card card-hover cursor-pointer border border-gray-100 group">
              <Link href="/admin/rsk-queue" className="block h-full">
                <CardContent className="p-5 flex items-center gap-3">
                  <span className="text-2xl group-hover:scale-110 transition-transform duration-300">🆘</span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">RSK Expert Queue</p>
                    <p className="text-xs text-gray-500">Review escalated crop health tickets</p>
                  </div>
                </CardContent>
              </Link>
            </Card>
            <Card className="apple-card card-hover cursor-pointer border border-gray-100 group">
              <Link href="/admin/claims" className="block h-full">
                <CardContent className="p-5 flex items-center gap-3">
                  <span className="text-2xl group-hover:scale-110 transition-transform duration-300">🛡️</span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Admin Claims</p>
                    <p className="text-xs text-gray-500">ZKP-verified claim verification</p>
                  </div>
                </CardContent>
              </Link>
            </Card>
            <Card className="apple-card card-hover cursor-pointer border border-gray-100 group">
              <Link href="/admin" className="block h-full">
                <CardContent className="p-5 flex items-center gap-3">
                  <span className="text-2xl group-hover:scale-110 transition-transform duration-300">📊</span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Admin Panel</p>
                    <p className="text-xs text-gray-500">System overview & monitoring</p>
                  </div>
                </CardContent>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
