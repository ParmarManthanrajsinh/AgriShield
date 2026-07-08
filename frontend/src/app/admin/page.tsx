"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { getApiBase , authFetch, removeToken} from "@/lib/api";

interface Claim {
  id: number;
  farm_id: number;
  user_id: number;
  status: string;
  is_eligible: boolean;
  created_at: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{name: string, email: string, role?: string} | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);

  useEffect(() => {
    (async () => {
      const apiBase = await getApiBase();
      authFetch(`${apiBase}/users/me`)
        .then(res => {
          if (!res.ok) throw new Error("Unauthorized");
          return res.json();
        })
        .then(userData => {
          if (userData.role !== "insurance_admin") {
            router.push("/dashboard");
            return;
          }
          setUser(userData);
          return authFetch(`${apiBase}/admin/claims`)
            .then(res => { if (!res.ok) throw new Error("Unauthorized"); return res.json(); })
            .then(data => setClaims(data));
        })
        .catch(() => router.push("/dashboard"));
    })();
  }, [router]);

  const handleLogout = async () => {
    const apiBase = await getApiBase();
    await authFetch(`${apiBase}/auth/logout`, { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="min-h-screen apple-bg p-8">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between bg-white/80 backdrop-blur border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <p className="font-bold text-gray-900">Insurance Admin Portal</p>
              <p className="text-xs text-gray-500">Welcome, {user?.name || "Insurance Admin"}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
            Log out
          </Button>
        </div>

        <div className="flex justify-between items-center py-4">
          <h1 className="apple-title">Admin Claims Dashboard</h1>
        </div>
        
        <Card className="apple-card">
          <CardHeader className="bg-gray-50 border-b border-gray-100 p-6">
            <CardTitle>All Submitted Claims</CardTitle>
            <CardDescription>Review and verify claims from all users.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {claims.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No claims exist in the system.</p>
            ) : (
              <div className="grid gap-6">
                {claims.map(claim => (
                  <Card key={claim.id} className="apple-card card-hover border border-gray-100 cursor-pointer" onClick={() => router.push(`/admin/claims/${claim.id}`)}>
                    <CardHeader className="p-6 pb-2">
                      <CardTitle className="text-lg flex justify-between items-center">
                        <span>Claim #{claim.id}</span>
                        <span className={`text-sm px-3 py-1 rounded-full ${
                          claim.status === 'approved' ? 'bg-green-100 text-green-800' :
                          claim.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {claim.status.toUpperCase()}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-sm text-gray-500 flex justify-between">
                      <span>Farm ID: {claim.farm_id} | User ID: {claim.user_id}</span>
                      <span>Submitted: {new Date(claim.created_at).toLocaleDateString()}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
