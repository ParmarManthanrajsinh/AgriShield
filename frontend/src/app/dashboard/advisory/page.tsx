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
import Link from "next/link";
import { API_BASE, getErrorMessage } from "@/lib/api";

interface Farm {
  id: number;
  name: string;
  lat: string;
  lng: string;
}

interface ForecastDay {
  date: string;
  temp_max_c: number;
  temp_min_c: number;
  rainfall_mm: number;
  humidity_pct: number;
}

interface Alert {
  farm_id: number;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  start_date: string | null;
  duration_days: number | null;
  recommended_action: string | null;
  created_at: string;
}

interface AdvisoryData {
  farm_id: number;
  farm_name: string | null;
  lat: string;
  lng: string;
  forecast: ForecastDay[];
  alerts: Alert[];
  generated_at: string;
}

function getSeverityStyles(severity: string) {
  switch (severity) {
    case "high":
      return {
        bg: "bg-red-50 border-red-200",
        badge: "bg-red-100 text-red-800",
        icon: "🔴",
      };
    case "medium":
      return {
        bg: "bg-amber-50 border-amber-200",
        badge: "bg-amber-100 text-amber-800",
        icon: "🟠",
      };
    case "low":
      return {
        bg: "bg-blue-50 border-blue-200",
        badge: "bg-blue-100 text-blue-800",
        icon: "🔵",
      };
    case "info":
      return {
        bg: "bg-green-50 border-green-200",
        badge: "bg-green-100 text-green-800",
        icon: "🟢",
      };
    default:
      return {
        bg: "bg-gray-50 border-gray-200",
        badge: "bg-gray-100 text-gray-800",
        icon: "⚪",
      };
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getRainBar(mm: number): number {
  return Math.min(100, (mm / 50) * 100);
}

function getRainExplanation(mm: number): string {
  if (mm === 0) return "No Rain (Dry Day)";
  if (mm <= 5) return "Light Rain (Gentle Drizzle)";
  if (mm <= 35) return "Good Rain (Great for Crops)";
  return "Heavy Rain (Watch Drains!)";
}

function getHumidityExplanation(pct: number): string {
  if (pct < 30) return "Dry Air (Watch for bugs)";
  if (pct <= 70) return "Normal Air (Comfortable)";
  return "Sticky Air (High Moisture)";
}

export default function AdvisoryPage() {
  const router = useRouter();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AdvisoryData | null>(null);
  const [error, setError] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/farms`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((farms) => {
        setFarms(farms);
        if (farms.length > 0) {
          setSelectedFarmId(farms[0].id);
          fetchAdvisory(farms[0].id);
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const fetchAdvisory = async (farmId: number) => {
    setLoading(true);
    setError("");
    setData(null);
    setBroadcastSuccess("");

    try {
      const res = await fetch(
        `${API_BASE}/api/advisory/${farmId}`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(getErrorMessage(err, "Failed to fetch advisory"));
      }
      const result: AdvisoryData = await res.json();
      setData(result);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Something went wrong"));
    } finally {
      setLoading(false);
    }
  };

  const handleFarmSelect = (farmId: number) => {
    setSelectedFarmId(farmId);
    fetchAdvisory(farmId);
  };

  const handleTestBroadcast = async () => {
    setBroadcasting(true);
    setBroadcastSuccess("");
    try {
      const res = await fetch(`${API_BASE}/webhooks/sms-inbound`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          From: "+919876543210",
          Body: "AgriShield Test Alert: Weather advisory available for your farm.",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBroadcastSuccess(`Alert dispatched via SMS gateway. Reply: ${data.reply?.status || "sent"}`);
      } else {
        setBroadcastSuccess("SMS gateway requires Twilio API configuration. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in backend environment.");
      }
    } catch {
      setBroadcastSuccess("SMS gateway unavailable. Set Twilio credentials in backend environment.");
    } finally {
      setBroadcasting(false);
    }
  };

  const weatherAlerts = data?.alerts.filter((a) => a.alert_type !== "fertilization") || [];
  const fertAlerts = data?.alerts.filter((a) => a.alert_type === "fertilization") || [];

  return (
    <div className="min-h-screen apple-bg p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors mb-2 inline-block"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="apple-title">🌾 Simple Weather Warnings & Fertilizer Guide</h1>
            <p className="text-gray-500 mt-1">
              Easy-to-understand weather alerts and simple fertilizer advice (in bags, buckets, and spoons) for your farm
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <a
              href="https://wa.me/14155238886?text=Namaste!%20I%20have%20a%20question%20about%20my%20weather%20and%20fertilizer%20advisory"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-md rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 flex items-center gap-2 hover:scale-105"
            >
              <span>💬 Ask AI on WhatsApp</span>
              <span>↗</span>
            </a>
            {data && (
              <Button
                onClick={handleTestBroadcast}
                disabled={broadcasting}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 flex items-center gap-2"
              >
                {broadcasting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Broadcasting Twilio Push...</span>
                  </>
                ) : (
                  <>
                    <span>📢 Broadcast Test SMS/Voice Alert</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {broadcastSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-300 flex items-center gap-3">
            <span className="text-xl">📲</span>
            <span className="font-medium text-sm">{broadcastSuccess}</span>
          </div>
        )}

        {/* Farm Selector */}
        {farms.length > 0 && (
          <Card className="apple-card">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-2">
                {farms.map((farm) => (
                  <button
                    key={farm.id}
                    onClick={() => handleFarmSelect(farm.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedFarmId === farm.id
                        ? "bg-gray-900 text-white shadow-md scale-105"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {farm.name}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {farms.length === 0 && (
          <Card className="apple-card">
            <CardContent className="p-8 text-center">
              <p className="text-gray-500 mb-4">
                Register a farm first to get advisories.
              </p>
              <Link href="/farms/new">
                <Button className="rounded-full">Add Farm</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {selectedFarmId && !data && !loading && (
          <div className="text-center py-8">
            <Button
              onClick={() => fetchAdvisory(selectedFarmId)}
              className="rounded-full px-8 py-3 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white shadow-lg"
            >
              📡 Fetch Advisory
            </Button>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 text-gray-500">
              <svg
                className="animate-spin h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Fetching forecast & analyzing...
            </div>
          </div>
        )}

        {error && (
          <div className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Weather & Dry-Spell Alerts Section */}
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>🌦️ Important Weather Warnings</span>
                <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full font-semibold">{weatherAlerts.length}</span>
              </h2>
              {weatherAlerts.length > 0 ? (
                weatherAlerts.map((alert, idx) => {
                  const styles = getSeverityStyles(alert.severity);
                  return (
                    <Card
                      key={idx}
                      className={`apple-card border shadow-sm ${styles.bg} transition-all duration-300`}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl flex-shrink-0 mt-0.5">
                            {styles.icon}
                          </span>
                          <div className="flex-grow space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-gray-900">
                                {alert.title}
                              </h3>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${styles.badge}`}
                              >
                                {alert.severity.toUpperCase()}
                              </span>
                              {alert.duration_days && (
                                <span className="text-xs font-medium text-gray-500">
                                  {alert.duration_days} day
                                  {alert.duration_days > 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 font-medium">
                              {alert.message}
                            </p>
                            {alert.recommended_action && (
                              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3.5 text-sm border border-gray-100 shadow-2xl">
                                <span className="font-bold text-gray-900">
                                  💡 What to do today:{" "}
                                </span>
                                <span className="text-gray-700">
                                  {alert.recommended_action}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Card className="apple-card border border-emerald-200 bg-emerald-50/50">
                  <CardContent className="p-5 text-center flex items-center justify-center gap-3">
                    <span className="text-2xl">✅</span>
                    <span className="text-emerald-800 font-semibold text-sm">
                      No critical dry spells or extreme weather hazards detected!
                    </span>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Fertilization Guidance Section */}
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>🌱 Simple Fertilizer Guide (When & How Much to Put)</span>
                <span className="text-xs bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-semibold">{fertAlerts.length}</span>
              </h2>
              {fertAlerts.length > 0 ? (
                fertAlerts.map((alert, idx) => {
                  const styles = getSeverityStyles(alert.severity);
                  return (
                    <Card
                      key={idx}
                      className="apple-card border border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-purple-50/20 to-white shadow-md transition-all duration-300"
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl flex-shrink-0 mt-0.5">
                            🧪
                          </span>
                          <div className="flex-grow space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-indigo-950">
                                {alert.title}
                              </h3>
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                                BEST TIME TO DO THIS
                              </span>
                              {alert.start_date && (
                                <span className="text-xs font-medium text-gray-500">
                                  Starts: {formatDate(alert.start_date)}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 font-medium">
                              {alert.message}
                            </p>
                            {alert.recommended_action && (
                              <div className="bg-white rounded-xl p-3.5 text-sm border border-indigo-100 shadow-sm">
                                <span className="font-bold text-indigo-900">
                                  🌱 How Much & How to Apply:{" "}
                                </span>
                                <span className="text-gray-700">
                                  {alert.recommended_action}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Card className="apple-card border border-gray-200 bg-gray-50/50">
                  <CardContent className="p-5 text-center text-gray-500 font-medium text-sm">
                    No fertilizer needed right now! Soil and weather are good. Check back after rain.
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 7-Day Forecast */}
            <Card className="apple-card">
              <CardHeader>
                <CardTitle className="text-xl">
                  📅 7-Day Weather Forecast — {data.farm_name}
                </CardTitle>
                <CardDescription>
                  Expected temperature and rain for your farm field
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {data.forecast.map((day, idx) => (
                    <div
                      key={day.date}
                      className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3.5 rounded-xl transition-all duration-200 border border-gray-100 ${
                        idx === 0
                          ? "bg-blue-50/50 font-medium border-blue-100 shadow-sm"
                          : "hover:bg-gray-50 bg-white"
                      }`}
                    >
                      <div className="w-28 text-sm font-bold text-gray-800 flex-shrink-0">
                        {idx === 0 ? "Today" : formatDate(day.date)}
                      </div>

                      {/* Temperature with explanation */}
                      <div className="flex flex-col flex-grow min-w-[180px]">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-blue-600" title="Night/Morning Cool Temperature">
                            🌙 {day.temp_min_c}°C <span className="text-[10px] text-gray-500 font-normal">(Night Cool)</span>
                          </span>
                          <span className="text-red-600" title="Afternoon Peak Heat">
                            ☀️ {day.temp_max_c}°C <span className="text-[10px] text-gray-500 font-normal">(Day Heat)</span>
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-1 shadow-inner">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-400 via-yellow-400 to-red-500"
                            style={{
                              width: `${Math.min(100, Math.max(20, ((day.temp_max_c - day.temp_min_c) / 20) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Rainfall with explanation */}
                      <div className="flex flex-col w-48 flex-shrink-0">
                        <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                          <span>🌧️ Rain: {day.rainfall_mm} mm</span>
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-700">
                          {getRainExplanation(day.rainfall_mm)}
                        </span>
                      </div>

                      {/* Humidity with explanation */}
                      <div className="flex flex-col w-44 flex-shrink-0 sm:text-right">
                        <div className="text-xs font-bold text-blue-900">
                          💧 Air Moisture: {day.humidity_pct}%
                        </div>
                        <span className="text-[11px] text-gray-500 font-semibold">
                          {getHumidityExplanation(day.humidity_pct)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
