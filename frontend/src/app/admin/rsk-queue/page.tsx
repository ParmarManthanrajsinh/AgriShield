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

interface RSKTicket {
  ticket_id: string;
  farm_id: number;
  health_report_id: string;
  disease_name: string;
  ai_confidence: number;
  severity: string;
  priority: string;
  symptoms: string[];
  image_path: string | null;
  audio_path: string | null;
  farmer_description: string | null;
  status: string;
  assigned_to: string | null;
  response: string | null;
  created_at: string;
  resolved_at: string | null;
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case "urgent":
      return "bg-red-100 text-red-800 border-red-200";
    case "normal":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "open":
      return "bg-amber-100 text-amber-800";
    case "resolved":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export default function RSKQueuePage() {
  const router = useRouter();
  const [user, setUser] = useState<{name: string, email: string, role?: string} | null>(null);
  const [tickets, setTickets] = useState<RSKTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [expertName, setExpertName] = useState("RSK Expert");

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const meRes = await fetch("http://localhost:8000/users/me", { credentials: "include" });
      if (!meRes.ok) { router.push("/login"); return; }
      const userData = await meRes.json();
      if (userData.role !== "rsk_expert") {
        router.push("/dashboard");
        return;
      }
      setUser(userData);
      if (userData.name) setExpertName(userData.name);
      const url = showAll
        ? "http://localhost:8000/api/rsk/all"
        : "http://localhost:8000/api/rsk/queue";
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      } else {
        router.push("/dashboard");
      }
    } catch {
      console.error("Failed to fetch tickets");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [showAll]);

  const handleRespond = async (ticketId: string) => {
    if (!responseText.trim()) return;

    const formData = new FormData();
    formData.append("ticket_id", ticketId);
    formData.append("response", responseText);
    formData.append("expert_name", expertName);

    try {
      const res = await fetch("http://localhost:8000/api/rsk/respond", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (res.ok) {
        setRespondingTo(null);
        setResponseText("");
        fetchTickets();
      }
    } catch {
      console.error("Failed to respond");
    }
  };

  const handleLogout = async () => {
    await fetch("http://localhost:8000/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
  };

  return (
    <div className="min-h-screen apple-bg p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between bg-white/80 backdrop-blur border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏛️</span>
            <div>
              <p className="font-bold text-gray-900">RSK Expert Kendra Portal</p>
              <p className="text-xs text-gray-500">Welcome, {user?.name || "Expert"}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
            Log out
          </Button>
        </div>

        <div>
          <h1 className="apple-title">🆘 RSK Expert Kendra Queue</h1>
          <p className="text-gray-500 mt-1">
            Review escalated crop health reports and dispatch closed-loop treatment plans
          </p>
        </div>

        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 text-emerald-900 text-xs font-semibold flex items-center gap-3 shadow-sm">
          <span className="text-2xl">📲</span>
          <span>
            <strong className="font-bold text-emerald-950">Closed-Loop SMS Active:</strong> When you submit an expert diagnosis or treatment plan below, an instant SMS & Voice notification is automatically dispatched to the farmer's mobile phone via Twilio Gateway!
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setShowAll(false)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                !showAll
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              Open ({tickets.filter((t) => t.status === "open").length})
            </button>
            <button
              onClick={() => setShowAll(true)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                showAll
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              All Tickets
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTickets}
            className="rounded-full"
          >
            🔄 Refresh
          </Button>
        </div>

        {/* Tickets */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : tickets.length === 0 ? (
          <Card className="apple-card">
            <CardContent className="p-8 text-center">
              <span className="text-4xl">✅</span>
              <p className="text-gray-500 mt-4 font-medium">
                No tickets in queue
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Card
                key={ticket.ticket_id}
                className={`apple-card border transition-all duration-300 ${
                  ticket.priority === "urgent" && ticket.status === "open"
                    ? "border-red-300 bg-red-50/30 shadow-md ring-2 ring-red-400/20"
                    : ticket.status === "open"
                    ? "border-amber-200 shadow-sm"
                    : "border-green-200 opacity-75"
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-grow space-y-3">
                      {/* Header */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-gray-900">
                          {ticket.ticket_id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityBadge(
                            ticket.priority
                          )}`}
                        >
                          {ticket.priority.toUpperCase()}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                            ticket.status
                          )}`}
                        >
                          {ticket.status}
                        </span>
                      </div>

                      {/* Disease + Confidence */}
                      <div>
                        <p className="font-semibold text-gray-900">
                          🦠 {ticket.disease_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          AI Confidence:{" "}
                          {(ticket.ai_confidence * 100).toFixed(1)}% · Severity:{" "}
                          {ticket.severity} · Farm #{ticket.farm_id}
                        </p>
                      </div>

                      {/* Symptoms */}
                      {ticket.symptoms.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {ticket.symptoms.map((s) => (
                            <span
                              key={s}
                              className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-600"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Farmer description */}
                      {ticket.farmer_description && (
                        <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700">
                          <span className="font-medium">
                            Farmer says:{" "}
                          </span>
                          {ticket.farmer_description}
                        </div>
                      )}

                      {/* Media indicators */}
                      <div className="flex gap-3 text-sm">
                        {ticket.image_path && (
                          <span className="text-green-600">📷 Photo available</span>
                        )}
                        {ticket.audio_path && (
                          <span className="text-blue-600">🎙️ Audio available</span>
                        )}
                      </div>

                      {/* Response section */}
                      {ticket.status === "resolved" && ticket.response && (
                        <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                          <p className="text-xs text-green-600 font-medium mb-1">
                            Response by {ticket.assigned_to}
                          </p>
                          <p className="text-sm text-green-800">
                            {ticket.response}
                          </p>
                        </div>
                      )}

                      {/* Respond form */}
                      {ticket.status === "open" &&
                        respondingTo === ticket.ticket_id && (
                          <div className="space-y-2 pt-2 border-t">
                            <input
                              type="text"
                              placeholder="Expert name"
                              value={expertName}
                              onChange={(e) => setExpertName(e.target.value)}
                              className="w-full rounded-xl border px-3 py-2 text-sm"
                            />
                            <textarea
                              placeholder="Write your expert diagnosis and recommendation..."
                              value={responseText}
                              onChange={(e) => setResponseText(e.target.value)}
                              rows={3}
                              className="w-full rounded-xl border px-3 py-2 text-sm"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleRespond(ticket.ticket_id)
                                }
                                className="rounded-full bg-green-600 hover:bg-green-700"
                              >
                                ✅ Submit Response
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setRespondingTo(null)}
                                className="rounded-full"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                    </div>

                    {/* Action button */}
                    {ticket.status === "open" &&
                      respondingTo !== ticket.ticket_id && (
                        <Button
                          size="sm"
                          onClick={() => setRespondingTo(ticket.ticket_id)}
                          className="rounded-full flex-shrink-0"
                        >
                          Reply
                        </Button>
                      )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
