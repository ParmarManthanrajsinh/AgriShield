"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { getApiBase , authFetch} from "@/lib/api";

interface Claim {
  id: number;
  farm_id: number;
  status: string;
  is_eligible: boolean;
  created_at: string;
}

export default function ClaimsPage() {
  const router = useRouter();
  const [claims, setClaims] = useState<Claim[]>([]);

  useEffect(() => {
    (async () => {
      const apiBase = await getApiBase();
      authFetch(`${apiBase}/claims`)
      .then(res => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then(data => setClaims(data))
      .catch(err => console.error(err));
    })();
  }, [router]);

  return (
    <div className="min-h-screen apple-bg p-8">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Button variant="outline" className="rounded-full" onClick={() => router.push("/dashboard")}>&larr; Dashboard</Button>
        <div className="flex justify-between items-center py-4">
          <h1 className="apple-title">My Claims</h1>
        </div>
        
        <Card className="apple-card">
          <CardHeader className="bg-gray-50 border-b border-gray-100 p-6">
            <CardTitle>Insurance Claims</CardTitle>
            <CardDescription>Track the status of your submitted claims.</CardDescription>
          </CardHeader>
          <CardContent>
            {claims.length === 0 ? (
              <p className="text-gray-500 text-center py-8">You have no claims yet.</p>
            ) : (
              <div className="grid gap-6">
                {claims.map(claim => (
                  <Card key={claim.id} className="apple-card card-hover border border-gray-100 cursor-pointer">
                    <Link href={`/claims/${claim.id}`} className="block h-full">
                      <CardHeader className="p-6 pb-2">
                        <CardTitle className="text-lg flex justify-between items-center text-gray-900">
                          <span className="font-semibold">Claim #{claim.id} <span className="text-gray-500 font-normal">(Farm #{claim.farm_id})</span></span>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                            claim.status === 'approved' ? 'bg-green-100 text-green-700' :
                            claim.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {claim.status.toUpperCase()}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 pt-0 text-sm text-gray-500 flex justify-between mt-2">
                        <span>Submitted: {new Date(claim.created_at).toLocaleDateString()}</span>
                        <span>Eligibility: {claim.is_eligible ? 'Eligible' : 'Ineligible'}</span>
                      </CardContent>
                    </Link>
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
