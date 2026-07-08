"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { API_BASE, getErrorMessage } from "@/lib/api";

export default function ClaimDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [claim, setClaim] = useState<any>(null);

  useEffect(() => {
    fetch(`${API_BASE}/claims/${params.id}`, {
      credentials: "include"
    })
    .then(res => {
      if (!res.ok) throw new Error("Not found");
      return res.json();
    })
    .then(data => setClaim(data))
    .catch(() => router.push("/login"));
  }, [params.id, router]);

  const [generating, setGenerating] = useState(false);
  const [logging, setLogging] = useState(false);

  const handleGenerateProof = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/claims/${params.id}/generate-proof`, {
        method: "POST",
        credentials: "include"
      });
      if (res.ok) {
        const updatedClaim = await res.json();
        setClaim(updatedClaim);
      } else {
        const error = await res.json();
        alert(getErrorMessage(error, "Failed to generate proof"));
      }
    } catch (err) {
      console.error(err);
    }
    setGenerating(false);
  };

  const handleLogBlockchain = async () => {
    setLogging(true);
    try {
      const res = await fetch(`${API_BASE}/claims/${params.id}/log-blockchain`, {
        method: "POST",
        credentials: "include"
      });
      if (res.ok) {
        const updatedClaim = await res.json();
        setClaim(updatedClaim);
      } else {
        const error = await res.json();
        alert(getErrorMessage(error, "Failed to log to blockchain"));
      }
    } catch (err) {
      console.error(err);
    }
    setLogging(false);
  };

  if (!claim) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen apple-bg p-8">
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Button variant="outline" className="rounded-full" onClick={() => router.push("/claims")}>&larr; All Claims</Button>
        <div className="flex justify-between items-center py-4">
          <h1 className="apple-title">Claim #{claim.id}</h1>
          <span className={`px-4 py-2 rounded-full font-bold text-sm uppercase shadow-sm ${
            claim.status === 'approved' ? 'bg-green-100 text-green-700' :
            claim.status === 'rejected' ? 'bg-red-100 text-red-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {claim.status}
          </span>
        </div>
        
        <div className="grid gap-8 md:grid-cols-2">
          <Card className="apple-card">
            <CardHeader className="p-6">
              <CardTitle>Claim Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-gray-500 text-sm">Farm ID</p>
                <p className="font-medium">{claim.farm_id}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Date Submitted</p>
                <p className="font-medium">{new Date(claim.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Eligibility</p>
                <p className={`font-medium ${claim.is_eligible ? 'text-green-600' : 'text-red-600'}`}>
                  {claim.is_eligible ? 'Eligible for payout' : 'Ineligible (Risk < 60%)'}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="apple-card">
            <CardHeader className="p-6">
              <CardTitle>Processing</CardTitle>
              <CardDescription>ZK Proofs and Blockchain details will appear here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-gray-500 text-sm">Zero Knowledge Proof</p>
                  {!claim.proof_data && claim.is_eligible && (
                    <Button size="sm" className="rounded-full bg-black text-white hover:bg-gray-800" onClick={handleGenerateProof} disabled={generating}>
                      {generating ? "Generating..." : "Generate Proof"}
                    </Button>
                  )}
                </div>
                {claim.proof_data ? (
                  <pre className="p-4 bg-[#f5f5f7] rounded-2xl text-xs text-gray-600 overflow-x-auto border border-gray-200 shadow-inner">
                    {JSON.stringify(JSON.parse(claim.proof_data), null, 2)}
                  </pre>
                ) : (
                  <p className="font-mono text-xs text-gray-400">Not generated yet</p>
                )}
              </div>
              <div>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-gray-500 text-sm">Blockchain Tx Hash</p>
                  {!claim.tx_hash && claim.proof_data && (
                    <Button size="sm" className="rounded-full bg-black text-white hover:bg-gray-800" onClick={handleLogBlockchain} disabled={logging}>
                      {logging ? "Logging..." : "Log to Blockchain"}
                    </Button>
                  )}
                </div>
                <p className="font-mono text-xs text-gray-600 bg-gray-100 px-3 py-2 rounded-xl border border-gray-200 truncate">
                  {claim.tx_hash || "Not logged yet"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
