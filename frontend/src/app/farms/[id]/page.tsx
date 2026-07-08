"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import dynamic from "next/dynamic";
import MetricsChart from "@/components/MetricsChart";
import { getApiBase, getErrorMessage , authFetch} from "@/lib/api";

const FarmMap = dynamic(() => import("@/components/FarmMap"), { ssr: false });

export default function FarmDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [farm, setFarm] = useState<any>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetricsWithBase = async (apiBase: string) => {
    try {
      const res = await authFetch(`${apiBase}/farms/${params.id}/metrics`);
      if (res.ok) setMetrics(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMetrics = async () => {
    const apiBase = await getApiBase();
    return fetchMetricsWithBase(apiBase);
  };

  const [mintingNFT, setMintingNFT] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editPoints, setEditPoints] = useState<[number, number][]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [resolvedBase, setResolvedBase] = useState("");

  useEffect(() => {
    getApiBase().then(setResolvedBase);
  }, []);

  useEffect(() => {
    (async () => {
      const apiBase = await getApiBase();
      authFetch(`${apiBase}/farms/${params.id}`)
      .then(res => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(data => {
        data.points = data.boundary_geojson ? JSON.parse(data.boundary_geojson) : [];
        setFarm(data);
        setEditName(data.name || "");
        setEditArea(data.area_hectares || "");
        setEditPoints(data.points || []);
        fetchMetricsWithBase(apiBase);
      })
      .catch(() => router.push("/login"));
    })();
  }, [params.id, router]);

  const handleSaveEdit = async () => {
    if (editPoints.length < 4) {
      alert("Please draw a 4-sided polygon on the map.");
      return;
    }
    setSavingEdit(true);
    const apiBase = await getApiBase();
    try {
      const payload = {
        name: editName,
        area_hectares: editArea,
        boundary_geojson: JSON.stringify(editPoints),
        lat: editPoints[0][0].toString(),
        lng: editPoints[0][1].toString()
      };
      const res = await authFetch(`${apiBase}/farms/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updated = await res.json();
        updated.points = JSON.parse(updated.boundary_geojson);
        setFarm(updated);
        setIsEditing(false);
      } else {
        alert("Failed to update farm");
      }
    } catch (err) {
      console.error(err);
    }
    setSavingEdit(false);
  };

  const handleDeleteFarm = async () => {
    if (!window.confirm("⚠️ Are you sure you want to permanently delete this farm and all associated records?")) {
      return;
    }
    const apiBase = await getApiBase();
    try {
      const res = await authFetch(`${apiBase}/farms/${params.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        router.push("/dashboard");
      } else {
        alert("Failed to delete farm");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const apiBase = await getApiBase();
    try {
      const res = await authFetch(`${apiBase}/farms/${params.id}/refresh-metrics`, {
        method: "POST"
      });
      if (res.ok) await fetchMetrics();
    } catch (err) {
      console.error(err);
    }
    setRefreshing(false);
  };

  const handleSubmitClaim = async () => {
    const apiBase = await getApiBase();
    try {
      const res = await authFetch(`${apiBase}/claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farm_id: params.id })
      });
      if (res.ok) {
        const claim = await res.json();
        router.push(`/claims/${claim.id}`);
      } else {
        const error = await res.json();
        alert(getErrorMessage(error, "Failed to submit claim"));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMintNFT = async () => {
    setMintingNFT(true);
    const apiBase = await getApiBase();
    try {
      const res = await authFetch(`${apiBase}/farms/${params.id}/mint-nft`, {
        method: "POST"
      });
      if (res.ok) {
        const updatedFarm = await res.json();
        setFarm(updatedFarm);
      } else {
        const error = await res.json();
        alert(getErrorMessage(error, "Failed to mint NFT"));
      }
    } catch (err) {
      console.error(err);
    }
    setMintingNFT(false);
  };

  if (!farm) return <div className="p-8 text-center">Loading...</div>;

  const latestMetric = metrics.length > 0 ? metrics[metrics.length - 1] : null;
  const isHighRisk = latestMetric && parseFloat(latestMetric.risk_probability) >= 0.6;

  return (
    <div className="min-h-screen apple-bg p-8">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex gap-4 items-center">
            {farm.nft_url ? (
               <span className="text-sm font-semibold text-gray-900 bg-gray-100 px-4 py-2 rounded-full flex items-center gap-2">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>
                 Dynamic NFT Minted
               </span>
            ) : metrics.length > 0 && (
               <Button onClick={handleMintNFT} disabled={mintingNFT} className="rounded-full bg-black text-white hover:bg-gray-800">
                 {mintingNFT ? "Minting..." : "Mint NFT Badge"}
               </Button>
            )}
            <Button variant="outline" className="rounded-full" onClick={() => router.push("/dashboard")}>&larr; Dashboard</Button>
            <Button variant="outline" className="rounded-full" onClick={() => router.push("/claims")}>My Claims</Button>
        </div>
        {isEditing && (
          <div className="fixed inset-0 z-[5000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border border-gray-200">
              <div className="p-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span>✏️ Fullscreen Map Edit:</span>
                  </h2>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="px-3 py-1.5 border rounded-lg bg-white text-gray-900 font-medium text-sm w-60 shadow-sm focus:ring-2 focus:ring-green-500"
                    placeholder="Farm Name"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={editArea}
                      onChange={(e) => setEditArea(e.target.value)}
                      className="px-3 py-1.5 border rounded-lg bg-white text-gray-900 font-medium text-sm w-28 shadow-sm focus:ring-2 focus:ring-green-500"
                      placeholder="Area"
                    />
                    <span className="text-sm font-medium text-gray-600">hectares</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button className="rounded-full bg-green-600 hover:bg-green-700 text-white shadow-md px-6" onClick={handleSaveEdit} disabled={savingEdit}>
                    {savingEdit ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button className="rounded-full" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>

              <div className="flex-1 p-6 overflow-hidden flex flex-col bg-gray-50/50">
                <div className="flex-1 w-full h-full">
                  <FarmMap
                    initialPolygon={editPoints}
                    onPolygonChange={setEditPoints}
                    readOnly={false}
                    heightClassName="h-full min-h-[500px]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center py-4 flex-wrap gap-4">
          <div>
            <h1 className="apple-title">{farm.name}</h1>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button className="rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200" onClick={() => setIsEditing(true)}>
              ✏️ Edit Farm
            </Button>
            <Button className="rounded-full bg-red-50 text-red-700 hover:bg-red-100 border border-red-200" onClick={handleDeleteFarm}>
              🗑️ Delete Farm
            </Button>
            <Button className="rounded-full bg-gray-200 text-gray-900 hover:bg-gray-300" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? "Refreshing..." : "Refresh Metrics"}
            </Button>
            <Button className="rounded-full" onClick={handleSubmitClaim} disabled={!isHighRisk} variant={isHighRisk ? "default" : "outline"}>
              Submit Claim
            </Button>
          </div>
        </div>
        
        <div className="grid gap-8 md:grid-cols-3">
          <Card className="md:col-span-1 apple-card">
            <CardHeader className="p-6">
              <CardTitle>Farm Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-gray-500">Area</p>
                <p className="font-medium">{farm.area_hectares} hectares</p>
              </div>
              <div
                className="h-[250px] w-full rounded border overflow-hidden relative group cursor-pointer"
                onClick={() => setIsEditing(true)}
                title="Click to open Fullscreen Edit Map"
              >
                <FarmMap initialPolygon={farm.points} readOnly heightClassName="h-full" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition duration-300 z-[1000] flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 bg-white text-gray-900 px-4 py-2 rounded-full font-semibold text-xs shadow-lg transition duration-300 flex items-center gap-1">
                    ✏️ Click for Fullscreen Map Edit
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="md:col-span-2 apple-card">
            <CardHeader className="p-6">
              <CardTitle>Current Weather & Risk</CardTitle>
            </CardHeader>
            <CardContent>
              {latestMetric ? (
                <div className="flex flex-wrap gap-8 mb-6">
                  <div>
                    <p className="text-gray-500 text-sm">Risk Level</p>
                    <span className={`inline-block px-3 py-1 mt-1 rounded-full text-xs font-semibold uppercase ${
                      latestMetric.risk_level === 'high' ? 'bg-red-100 text-red-700' :
                      latestMetric.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {latestMetric.risk_level} ({(parseFloat(latestMetric.risk_probability)*100).toFixed(0)}%)
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">NDVI</p>
                    <p className="font-bold text-lg">{latestMetric.ndvi_avg}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Temp</p>
                    <p className="font-bold text-lg">{latestMetric.temp_c}°C</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Humidity</p>
                    <p className="font-bold text-lg">{latestMetric.humidity}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Rainfall</p>
                    <p className="font-bold text-lg">{latestMetric.rainfall_mm}mm</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm mb-6">No metrics available. Click refresh to fetch data.</p>
              )}
              
              <div className="h-[300px]">
                <MetricsChart metrics={metrics} />
              </div>
            </CardContent>
          </Card>
          {farm.nft_url && (
            <Card className="md:col-span-3 apple-card mt-2">
              <CardHeader className="bg-gray-50 border-b border-gray-100 p-6">
                <CardTitle>Dynamic NFT Badge</CardTitle>
              </CardHeader>
              <CardContent className="p-8 flex justify-center">
                <img src={`${resolvedBase}${farm.nft_url}`} alt="Dynamic Farm NFT" className="w-64 h-64 rounded-xl shadow-lg border-4 border-white transform transition duration-500 hover:scale-105" />
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
