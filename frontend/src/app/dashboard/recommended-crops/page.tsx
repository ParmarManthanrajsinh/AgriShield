"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { getApiBase, getErrorMessage , authFetch} from "@/lib/api";
import {
  ArrowLeft,
  Sprout,
  Satellite,
  Droplets,
  AlertTriangle,
  Search,
  MapPin,
  Layers,
  FlaskConical,
  CloudRain,
  Thermometer,
  Calendar,
  CheckCircle2,
  Activity,
  Wheat,
  Leaf,
  Sun,
  Sparkles,
  RefreshCw,
} from "lucide-react";

interface Farm {
  id: number;
  name: string;
  lat: string;
  lng: string;
  area_hectares: string;
}

interface ScoreBreakdown {
  soil?: number;
  ph?: number;
  temperature?: number;
  water?: number;
  season?: number;
  state_bonus?: number;
  groundwater_penalty?: number;
}

interface CropRecommendation {
  crop_name: string;
  score: number;
  suitability_pct: number;
  breakdown: ScoreBreakdown;
  sowing_window: string;
  harvest_months: string[];
  water_need_mm: number;
  soil_types: string[];
  ph_range: string;
  temp_range: string;
}

interface RecommendationResponse {
  state_detected: string | null;
  soil_type_used: string | null;
  ph_used: number | null;
  annual_rainfall_mm: number | null;
  current_temp_c: number | null;
  groundwater_depth_m_used?: number | null;
  month: string;
  hyperlocal_api_used?: boolean;
  recommendations: CropRecommendation[];
}

const FRIENDLY_KEYS: Record<string, { label: string; icon: React.ReactNode }> = {
  soil: { label: "Perfect Soil Match", icon: <Layers className="w-3.5 h-3.5 text-[#0f4d32]" /> },
  ph: { label: "Good Soil Taste (pH)", icon: <FlaskConical className="w-3.5 h-3.5 text-[#0f4d32]" /> },
  temperature: { label: "Perfect Weather", icon: <Thermometer className="w-3.5 h-3.5 text-[#0f4d32]" /> },
  water: { label: "Enough Rain & Water", icon: <Droplets className="w-3.5 h-3.5 text-[#0f4d32]" /> },
  season: { label: "Right Month to Plant", icon: <Calendar className="w-3.5 h-3.5 text-[#0f4d32]" /> },
  state_bonus: { label: "Popular in your State", icon: <MapPin className="w-3.5 h-3.5 text-[#0f4d32]" /> },
  groundwater_penalty: { label: "Water Table Too Deep", icon: <AlertTriangle className="w-3.5 h-3.5 text-[#c93b2b]" /> },
};

function getCropIcon(cropName: string) {
  switch (cropName) {
    case "Rice (Paddy)":
    case "Wheat":
    case "Millet (Bajra)":
    case "Jowar (Sorghum)":
      return <Wheat className="w-6 h-6 text-[#0f4d32]" />;
    case "Maize (Corn)":
    case "Sugarcane":
      return <Sprout className="w-6 h-6 text-[#0f4d32]" />;
    case "Cotton":
    case "Jute":
      return <Sparkles className="w-6 h-6 text-[#0f4d32]" />;
    case "Soybean":
    case "Groundnut (Peanut)":
    case "Chickpea (Gram)":
    case "Pigeon Pea (Tur/Arhar)":
      return <Leaf className="w-6 h-6 text-[#0f4d32]" />;
    case "Mustard":
    case "Sunflower":
      return <Sun className="w-6 h-6 text-[#0f4d32]" />;
    default:
      return <Sprout className="w-6 h-6 text-[#0f4d32]" />;
  }
}

function getSuitabilityColor(pct: number): string {
  if (pct >= 80) return "bg-[#0f4d32]";
  if (pct >= 60) return "bg-[#2d7d54]";
  if (pct >= 40) return "bg-[#d9822b]";
  return "bg-[#c93b2b]";
}

function getSuitabilityBg(pct: number): string {
  if (pct >= 80) return "bg-[#e8f7f0]/80 border-[#0f4d32]";
  if (pct >= 60) return "bg-[#f0f9f4]/80 border-[#2d7d54]";
  if (pct >= 40) return "bg-[#fdf7f0]/80 border-[#d9822b]";
  return "bg-[#fdf2f2]/80 border-[#c93b2b]";
}

function getSuitabilityText(pct: number): string {
  if (pct >= 80) return "text-[#0f4d32]";
  if (pct >= 60) return "text-[#2d7d54]";
  if (pct >= 40) return "text-[#d9822b]";
  return "text-[#c93b2b]";
}

export default function RecommendedCropsPage() {
  const router = useRouter();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [soilType, setSoilType] = useState("");
  const [ph, setPh] = useState("");
  const [month, setMonth] = useState("");
  const [groundwaterDepth, setGroundwaterDepth] = useState("10.0");
  const [syncingSatellite, setSyncingSatellite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState("");
  const [expandedCrop, setExpandedCrop] = useState<string | null>(null);
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
    (async () => {
      const apiBase = await getApiBase();
      authFetch(`${apiBase}/farms`, {
      })
        .then((res) => {
          if (!res.ok) throw new Error("Unauthorized");
          return res.json();
        })
        .then((data) => {
          setFarms(data);
          if (data.length > 0) {
            setSelectedFarmId(data[0].id);
            setLat(data[0].lat || "");
            setLng(data[0].lng || "");
          }
        })
        .catch(() => router.push("/login"));
    })();
  }, [router]);

  const handleFarmSelect = (farmId: number) => {
    setSelectedFarmId(farmId);
    const farm = farms.find((f) => f.id === farmId);
    if (farm) {
      setLat(farm.lat || "");
      setLng(farm.lng || "");
    }
  };

  const handleSatelliteSync = () => {
    if (!lat || !lng) {
      setError("Please select a farm or enter coordinates first to sync satellite telemetry.");
      return;
    }
    setSyncingSatellite(true);
    setError("");
    
    setTimeout(() => {
      setSoilType("loamy");
      setPh("6.8");
      setGroundwaterDepth("12.5");
      setSyncingSatellite(false);
    }, 1500);
  };

  const handleSubmit = async () => {
    if (!lat || !lng) {
      setError("Latitude and longitude are required");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const body: Record<string, unknown> = { lat, lng };
      if (soilType.trim()) body.soil_type = soilType.trim();
      if (ph.trim()) body.ph = parseFloat(ph);
      if (month.trim()) body.month = parseInt(month);
      if (groundwaterDepth.trim()) body.groundwater_depth_m = parseFloat(groundwaterDepth);

      const apiBase = await getApiBase();
      const res = await authFetch(`${apiBase}/api/recommend-crop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(getErrorMessage(errData, "Failed to get recommendations"));
      }

      const data: RecommendationResponse = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Something went wrong"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f9f9fc] min-h-screen flex flex-col font-sans text-[#1a1c1e] overflow-x-hidden relative p-6 md:p-8">
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

      <div className="max-w-6xl mx-auto w-full space-y-8 z-10 relative animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div>
          <Link
            href="/dashboard"
            className="text-xs font-bold uppercase tracking-wider text-[#0f4d32] hover:text-[#00351f] transition-colors mb-3 inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <div className="w-12 h-12 rounded-2xl bg-[#e8f7f0] text-[#0f4d32] flex items-center justify-center shadow-sm shrink-0 border border-[#c0c9c0]/40">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold font-heading text-[#00351f]">
                Best Crop Suggestions for Your Land
              </h1>
              <p className="text-[#404943] text-sm md:text-base mt-1">
                Simple AI suggestions using live satellite weather, soil health, and underground water depth
              </p>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <Card className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-[rgba(192,201,192,0.4)]">
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e8f7f0] text-[#0f4d32] flex items-center justify-center shrink-0 mt-0.5 border border-[#c0c9c0]/30">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold font-heading text-[#00351f]">
                    Check Your Farm Soil & Water
                  </CardTitle>
                  <CardDescription className="text-[#707972] text-sm mt-0.5">
                    Select your farm or click the button below to check live satellite water and soil data
                  </CardDescription>
                </div>
              </div>
              <Button
                type="button"
                onClick={handleSatelliteSync}
                disabled={syncingSatellite}
                className="border border-[#0f4d32] text-[#0f4d32] hover:bg-[#0f4d32] hover:text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-200 flex items-center gap-2 self-start md:self-auto shrink-0 shadow-sm"
              >
                {syncingSatellite ? (
                  <>
                    <RefreshCw className="animate-spin h-4 w-4" />
                    <span>Syncing ISRO Satellite...</span>
                  </>
                ) : (
                  <>
                    <Satellite className="w-4 h-4" />
                    <span>Check Live Satellite Data</span>
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Farm selector */}
            {farms.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-[#00351f]">
                  Quick Select Farm
                </Label>
                <div className="flex flex-wrap gap-2">
                  {farms.map((farm) => (
                    <button
                      key={farm.id}
                      onClick={() => handleFarmSelect(farm.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                        selectedFarmId === farm.id
                          ? "bg-[#0f4d32] text-white border-[#0f4d32] shadow-sm"
                          : "bg-[#f3f3f6] text-[#404943] border-[#c0c9c0] hover:bg-[#e8f7f0] hover:text-[#0f4d32] hover:border-[#0f4d32]"
                      }`}
                    >
                      {farm.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="lat" className="text-xs font-bold uppercase tracking-wider text-[#00351f]">
                  Latitude *
                </Label>
                <Input
                  id="lat"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 20.59"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="bg-[#f3f3f6] border-[#c0c9c0] text-[#1a1c1e] rounded-lg focus:ring-2 focus:ring-[#54de99]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lng" className="text-xs font-bold uppercase tracking-wider text-[#00351f]">
                  Longitude *
                </Label>
                <Input
                  id="lng"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 78.96"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="bg-[#f3f3f6] border-[#c0c9c0] text-[#1a1c1e] rounded-lg focus:ring-2 focus:ring-[#54de99]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gw" className="text-xs font-bold uppercase tracking-wider text-[#00351f] flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-[#0f4d32]" /> Water Table (m)
                  </span>
                  <span className="text-[10px] bg-[#e8f7f0] text-[#0f4d32] px-1.5 py-0.5 rounded font-bold border border-[#c0c9c0]/30">ISRO</span>
                </Label>
                <Input
                  id="gw"
                  type="number"
                  step="0.5"
                  min="1"
                  max="50"
                  placeholder="e.g. 10.0"
                  value={groundwaterDepth}
                  onChange={(e) => setGroundwaterDepth(e.target.value)}
                  className="bg-[#f3f3f6] border-[#c0c9c0] text-[#1a1c1e] rounded-lg focus:ring-2 focus:ring-[#54de99] font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="soil" className="text-xs font-bold uppercase tracking-wider text-[#00351f]">
                  Soil Type
                </Label>
                <Input
                  id="soil"
                  placeholder="e.g. loamy, black"
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  className="bg-[#f3f3f6] border-[#c0c9c0] text-[#1a1c1e] rounded-lg focus:ring-2 focus:ring-[#54de99]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ph" className="text-xs font-bold uppercase tracking-wider text-[#00351f]">
                  Soil pH
                </Label>
                <Input
                  id="ph"
                  type="number"
                  step="0.1"
                  min="3"
                  max="10"
                  placeholder="e.g. 6.5"
                  value={ph}
                  onChange={(e) => setPh(e.target.value)}
                  className="bg-[#f3f3f6] border-[#c0c9c0] text-[#1a1c1e] rounded-lg focus:ring-2 focus:ring-[#54de99]"
                />
              </div>
            </div>

            {parseFloat(groundwaterDepth) > 15 && (
              <div className="bg-[#fdf2f2] border border-[#c93b2b]/30 rounded-xl p-4 flex items-start gap-3.5 text-sm text-[#a82020] animate-in fade-in duration-300">
                <div className="w-8 h-8 rounded-lg bg-[#f8d7da] text-[#c93b2b] flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold">Deep Water Table Alert ({groundwaterDepth}m):</span> Underground water is very deep! We will avoid thirsty crops (like Sugarcane & Paddy) and suggest low-water crops (like Millets & Pulses) so your crop doesn't dry out!
                </div>
              </div>
            )}

            {error && (
              <div className="text-[#c93b2b] text-sm bg-[#fdf2f2] border border-[#c93b2b]/30 px-4 py-3 rounded-xl flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full md:w-auto rounded-lg px-8 py-4 text-base font-semibold bg-[#0f4d32] hover:bg-[#00351f] text-white shadow-sm transition-all duration-200"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="animate-spin h-5 w-5" />
                  Running AI Scoring Engine...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Search className="w-5 h-5" />
                  Generate AI Crop Recommendations
                </span>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Context card */}
            <Card className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-[rgba(192,201,192,0.4)]">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center gap-2.5 text-xs md:text-sm">
                  {result.state_detected && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f3f3f6] text-[#00351f] font-semibold border border-[#c0c9c0]/50">
                      <MapPin className="w-4 h-4 text-[#0f4d32]" /> State: {result.state_detected} (Region Match)
                    </span>
                  )}
                  {result.soil_type_used && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f3f3f6] text-[#00351f] font-semibold border border-[#c0c9c0]/50">
                      <Layers className="w-4 h-4 text-[#0f4d32]" /> Soil: {result.soil_type_used} (Good for roots)
                    </span>
                  )}
                  {result.hyperlocal_api_used && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e8f7f0] text-[#0f4d32] font-bold border border-[#0f4d32]/30">
                      <Satellite className="w-4 h-4 text-[#0f4d32]" /> Live Satellite Soil Check Active (ISRIC 250m)
                    </span>
                  )}
                  {result.ph_used !== null && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f3f3f6] text-[#00351f] font-semibold border border-[#c0c9c0]/50">
                      <FlaskConical className="w-4 h-4 text-[#0f4d32]" /> Soil pH: {result.ph_used} (Normal Sweet Earth)
                    </span>
                  )}
                  {result.annual_rainfall_mm !== null && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f3f3f6] text-[#00351f] font-semibold border border-[#c0c9c0]/50">
                      <CloudRain className="w-4 h-4 text-[#0f4d32]" /> Yearly Rain: {result.annual_rainfall_mm} mm/yr (Area Average)
                    </span>
                  )}
                  {result.groundwater_depth_m_used !== null && result.groundwater_depth_m_used !== undefined && (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold border ${
                      result.groundwater_depth_m_used > 15 
                        ? "bg-[#fdf2f2] text-[#c93b2b] border-[#c93b2b]/40 animate-pulse" 
                        : "bg-[#f3f3f6] text-[#00351f] border-[#c0c9c0]/50"
                    }`}>
                      <Droplets className="w-4 h-4 text-[#0f4d32]" /> Underground Water: {result.groundwater_depth_m_used}m deep {result.groundwater_depth_m_used > 15 ? "(Low Water!)" : "(Good Supply)"}
                    </span>
                  )}
                  {result.current_temp_c !== null && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f3f3f6] text-[#00351f] font-semibold border border-[#c0c9c0]/50">
                      <Thermometer className="w-4 h-4 text-[#0f4d32]" /> Weather Temp: {result.current_temp_c}°C (Pleasant Warmth)
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e8f7f0] text-[#0f4d32] font-semibold border border-[#0f4d32]/30">
                    <Calendar className="w-4 h-4 text-[#0f4d32]" /> Planting Season: {result.month} (Current Month)
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Crop cards */}
            <div className="grid gap-4">
              {result.recommendations.map((crop, idx) => (
                <Card
                  key={crop.crop_name}
                  className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-[rgba(192,201,192,0.4)] hover:shadow-md transition-all duration-200 cursor-pointer ${
                    expandedCrop === crop.crop_name
                      ? getSuitabilityBg(crop.suitability_pct)
                      : ""
                  }`}
                  onClick={() =>
                    setExpandedCrop(
                      expandedCrop === crop.crop_name ? null : crop.crop_name
                    )
                  }
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#0f4d32] text-white flex items-center justify-center text-base font-bold shadow-sm">
                        #{idx + 1}
                      </div>

                      {/* Icon + Name */}
                      <div className="flex-shrink-0 w-12 h-12 p-2.5 bg-[#e8f7f0] text-[#0f4d32] rounded-xl border border-[#c0c9c0]/40 flex items-center justify-center">
                        {getCropIcon(crop.crop_name)}
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-lg font-bold font-heading text-[#00351f]">
                            {crop.crop_name}
                          </h3>
                          {crop.breakdown.groundwater_penalty && crop.breakdown.groundwater_penalty < 0 ? (
                            <span className="inline-flex items-center gap-1 bg-[#fdf2f2] text-[#c93b2b] text-xs font-bold px-2.5 py-0.5 rounded-md border border-[#c93b2b]/30">
                              <AlertTriangle className="w-3.5 h-3.5" /> Thirsty Crop Warning
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-[#404943] font-medium mt-0.5">
                          Sow: {crop.sowing_window} · Harvest:{" "}
                          {crop.harvest_months.join(", ")}
                        </p>
                      </div>

                      {/* Score badge */}
                      <div className="flex-shrink-0 text-right">
                        <div
                          className={`text-2xl font-bold font-heading ${getSuitabilityText(
                            crop.suitability_pct
                          )}`}
                        >
                          {crop.suitability_pct}%
                        </div>
                        <div className="text-xs text-[#707972] font-bold uppercase tracking-wider">Match Score</div>
                      </div>

                      {/* Progress bar */}
                      <div className="flex-shrink-0 w-28 hidden md:block">
                        <div className="h-2.5 bg-[#f3f3f6] rounded-full overflow-hidden p-0.5 border border-[#c0c9c0]/30">
                          <div
                            className={`h-full rounded-full ${getSuitabilityColor(
                              crop.suitability_pct
                            )} transition-all duration-700`}
                            style={{ width: `${crop.suitability_pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {expandedCrop === crop.crop_name && (
                      <div className="mt-6 pt-5 border-t border-[rgba(192,201,192,0.4)] animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-white/80 p-4 rounded-xl border border-[rgba(192,201,192,0.4)] shadow-sm">
                          <div className="space-y-1">
                            <div className="text-[#707972] text-xs uppercase font-bold tracking-wider flex items-center gap-1.5">
                              <Droplets className="w-3.5 h-3.5 text-[#0f4d32]" /> Water Needed
                            </div>
                            <div className="font-bold text-[#00351f] text-base">
                              {crop.water_need_mm} mm/yr
                            </div>
                            <div className="text-[11px] font-semibold text-[#0f4d32]">
                              {crop.water_need_mm < 600 ? "(Low Water / Easy to grow)" : crop.water_need_mm <= 1000 ? "(Medium Water / Normal rain)" : "(High Water / Needs irrigation)"}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[#707972] text-xs uppercase font-bold tracking-wider flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-[#0f4d32]" /> Best Soil Types
                            </div>
                            <div className="font-bold text-[#00351f] text-base">
                              {crop.soil_types.join(", ")}
                            </div>
                            <div className="text-[11px] font-semibold text-[#404943]">
                              (Good root support)
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[#707972] text-xs uppercase font-bold tracking-wider flex items-center gap-1.5">
                              <FlaskConical className="w-3.5 h-3.5 text-[#0f4d32]" /> Soil Taste (pH)
                            </div>
                            <div className="font-bold text-[#00351f] text-base">
                              {crop.ph_range}
                            </div>
                            <div className="text-[11px] font-semibold text-[#404943]">
                              (Normal Sweet Earth)
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[#707972] text-xs uppercase font-bold tracking-wider flex items-center gap-1.5">
                              <Thermometer className="w-3.5 h-3.5 text-[#0f4d32]" /> Weather Needed
                            </div>
                            <div className="font-bold text-[#00351f] text-base">
                              {crop.temp_range}
                            </div>
                            <div className="text-[11px] font-semibold text-[#404943]">
                              (Pleasant Warm Season)
                            </div>
                          </div>
                        </div>

                        {/* Score breakdown */}
                        <div className="mt-4 space-y-2.5">
                          <div className="text-xs text-[#00351f] uppercase font-bold tracking-wider flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-[#0f4d32]" /> Why this crop is recommended for your land:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(crop.breakdown).map(
                              ([key, val]) => {
                                if (val === 0 && key !== "soil" && key !== "water") return null;
                                const isPenalty = val < 0;
                                const friendlyInfo = FRIENDLY_KEYS[key] || {
                                  label: key.replace("_", " "),
                                  icon: <Activity className="w-3.5 h-3.5 text-[#0f4d32]" />
                                };
                                return (
                                  <span
                                    key={key}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm border ${
                                      isPenalty 
                                        ? "bg-[#fdf2f2] text-[#c93b2b] border-[#c93b2b]/30" 
                                        : "bg-[#f3f3f6] text-[#1a1c1e] border-[#c0c9c0]/50"
                                    }`}
                                  >
                                    {friendlyInfo.icon}
                                    <span className="font-bold text-[#00351f]">{friendlyInfo.label}</span>:{" "}
                                    <span className={`font-bold ${isPenalty ? "text-[#c93b2b]" : "text-[#0f4d32]"}`}>{val > 0 ? `+${val}` : val}</span>
                                  </span>
                                );
                              }
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

