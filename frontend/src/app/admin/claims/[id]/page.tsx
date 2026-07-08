"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminClaimReviewPage() {
  const params = useParams();
  const router = useRouter();
  const [claim, setClaim] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("http://localhost:8000/users/me", { credentials: "include" })
      .then(res => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then(userData => {
        if (userData.role !== "insurance_admin") {
          router.push("/dashboard");
          return;
        }
        return fetch(`http://localhost:8000/claims/${params.id}`, { credentials: "include" })
          .then(res => { if (!res.ok) throw new Error("Error"); return res.json(); })
          .then(data => setClaim(data));
      })
      .catch(() => router.push("/dashboard"));
  }, [params.id, router]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`http://localhost:8000/admin/claims/${params.id}/verify`, {
        method: "POST",
        credentials: "include"
      });
      const data = await res.json();
      setVerificationResult(data.is_valid);
    } catch (err) {
      console.error(err);
      setVerificationResult(false);
    }
    setVerifying(false);
  };

  const handleDecision = async (decision: 'approve' | 'reject') => {
    try {
      const res = await fetch(`http://localhost:8000/admin/claims/${params.id}/${decision}`, {
        method: "POST",
        credentials: "include"
      });
      if (res.ok) {
        const updatedClaim = await res.json();
        setClaim(updatedClaim);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!claim) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="outline" onClick={() => router.push("/admin")}>&larr; Admin Dashboard</Button>
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight text-indigo-900">Review Claim #{claim.id}</h1>
          <span className={`px-4 py-2 rounded font-bold text-sm uppercase ${
            claim.status === 'approved' ? 'bg-green-100 text-green-700' :
            claim.status === 'rejected' ? 'bg-red-100 text-red-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {claim.status}
          </span>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Claim Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div><p className="text-gray-500 text-sm">Farm ID</p><p className="font-medium">{claim.farm_id}</p></div>
              <div><p className="text-gray-500 text-sm">User ID</p><p className="font-medium">{claim.user_id}</p></div>
              <div><p className="text-gray-500 text-sm">Date Submitted</p><p className="font-medium">{new Date(claim.created_at).toLocaleString()}</p></div>
              <div><p className="text-gray-500 text-sm">Blockchain Tx</p><p className="font-mono text-xs text-gray-400 break-all">{claim.tx_hash || "None"}</p></div>
            </CardContent>
          </Card>
          
          <Card className="border-indigo-100 shadow-sm">
            <CardHeader className="bg-indigo-50 border-b border-indigo-100 rounded-t-lg">
              <CardTitle>ZKP Verification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {!claim.proof_data ? (
                <p className="text-red-500 text-sm">No proof generated yet.</p>
              ) : (
                <div className="space-y-4">
                  <Button onClick={handleVerify} disabled={verifying} className="w-full bg-indigo-600 hover:bg-indigo-700">
                    {verifying ? "Verifying cryptographic proof..." : "Verify ZK Proof"}
                  </Button>
                  
                  {verificationResult !== null && (
                    <div className={`p-4 rounded border ${verificationResult ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                      {verificationResult ? "✓ Proof successfully verified. Risk threshold condition met." : "✗ Proof verification failed. Invalid claim."}
                    </div>
                  )}

                  {verificationResult && claim.status === 'pending' && (
                    <div className="flex gap-2 pt-4 border-t">
                      <Button onClick={() => handleDecision('approve')} className="flex-1 bg-green-600 hover:bg-green-700">Approve Claim</Button>
                      <Button onClick={() => handleDecision('reject')} variant="destructive" className="flex-1">Reject Claim</Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
