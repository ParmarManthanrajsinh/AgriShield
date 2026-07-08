"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { getApiBase , authFetch} from "@/lib/api";

// Next.js needs dynamic import for react-leaflet
const FarmMap = dynamic(() => import("@/components/FarmMap"), { ssr: false });

export default function NewFarmPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [points, setPoints] = useState<[number, number][]>([]);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (points.length < 4) {
      setError("Please draw a polygon with 4 dots (4 corners)");
      return;
    }
    
    try {
      const payload = {
        name,
        area_hectares: area,
        boundary_geojson: JSON.stringify(points),
        lat: points[0][0].toString(),
        lng: points[0][1].toString()
      };

      const apiBase = await getApiBase();
      const res = await authFetch(`${apiBase}/farms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to create farm");

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="outline" onClick={() => router.back()}>&larr; Back</Button>
        <Card>
          <CardHeader>
            <CardTitle>Add New Farm</CardTitle>
            <CardDescription>Enter details, click map to place 4 corner dots, and drag dots to adjust side lengths smoothly.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Farm Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area">Area (Hectares)</Label>
                  <Input id="area" type="number" step="0.01" value={area} onChange={(e) => setArea(e.target.value)} required />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Boundary Map</Label>
                <FarmMap onPolygonChange={setPoints} />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button type="submit">Save Farm</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
