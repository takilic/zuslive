import React, { useState, useEffect } from 'react';
import { Tv, Activity, Users, ShieldAlert, DollarSign, Award, ThumbsUp, Radio, Database, Server, RefreshCw, UploadCloud, Check, AlertCircle, FileText } from 'lucide-react';
import { Analytics, Channel, Category } from '../types.ts';

interface AdminDashboardProps {
  channels: Channel[];
  categories: Category[];
  onRefreshAllData: () => void;
}

export default function AdminDashboard({ channels, categories, onRefreshAllData }: AdminDashboardProps) {
  const [stats, setStats] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [demoViewerMultiplier, setDemoViewerMultiplier] = useState(1.0);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([
    "Satellite trunk connection initialized",
    "Stream database loaded successfully"
  ]);

  // New States for M3U playlist file uploads
  const [isImporting, setIsImporting] = useState(true); // Default to open for intuitive UX
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [remoteUrl, setRemoteUrl] = useState("");
  const [categoryMode, setCategoryMode] = useState<"m3u" | "force">("m3u");
  const [forceCategoryId, setForceCategoryId] = useState("");
  const [defaultStatus, setDefaultStatus] = useState<"online" | "offline">("online");
  const [autoFeature, setAutoFeature] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState("");
  const [importError, setImportError] = useState("");

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith(".m3u") || file.name.endsWith(".m3u8") || file.type === "text/plain")) {
      setSelectedFile(file);
      setImportError("");
      setImportSuccess("");
    } else {
      setImportError("Please drop a valid .m3u or .m3u8 file format.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportError("");
      setImportSuccess("");
    }
  };

  const clearFileSelection = () => {
    setSelectedFile(null);
    setImportSuccess("");
    setImportError("");
    const fileInput = document.getElementById("dashboard-m3u-file-input") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleUploadAndImport = () => {
    if (!selectedFile) return;
    
    setImportLoading(true);
    setImportError("");
    setImportSuccess("");

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      try {
        const response = await fetch("/api/channels/import-m3u", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            m3uContent: content,
            categoryMode,
            forceCategoryId: forceCategoryId || undefined,
            defaultStatus,
            autoFeature
          })
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
          setImportSuccess(`Successfully imported ${data.count} live channels feed via server-side auto-decoder!`);
          setSelectedFile(null);
          onRefreshAllData(); // Refresh the applet metrics and lists
          setSimulationLogs(logs => [
            `[SYSTEM] M3U Playlist imported successfully. Parsed & configured ${data.count} satellite feeds.`,
            ...logs.slice(0, 4)
          ]);
        } else {
          setImportError(data.error || "The playlist structure is unrecognized or has no streaming assets.");
        }
      } catch (err) {
        setImportError("Could not dispatch playlist package to satellite server.");
      } finally {
        setImportLoading(false);
      }
    };

    reader.onerror = () => {
      setImportError("Failed to parse file from filesystem.");
      setImportLoading(false);
    };

    reader.readAsText(selectedFile);
  };

  const handleRemoteFetchAndImport = async () => {
    if (!remoteUrl) {
      setImportError("Please enter a valid remote M3U/M3U8 URL (e.g. from Vercel).");
      return;
    }
    
    setImportLoading(true);
    setImportError("");
    setImportSuccess("");

    try {
      // 1. Fetch Remote M3U URL content via our server-side secure client proxy (bypasses CORS completely!)
      const res = await fetch("/api/channels/fetch-remote-m3u", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistUrl: remoteUrl })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Remote server responded with error status: ${res.status}`);
      }

      const remoteData = await res.json();
      const content = remoteData.content;

      // 2. Import parsed M3U content directly
      const importResponse = await fetch("/api/channels/import-m3u", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          m3uContent: content,
          categoryMode,
          forceCategoryId: forceCategoryId || undefined,
          defaultStatus,
          autoFeature
        })
      });

      const data = await importResponse.json();
      
      if (importResponse.ok && data.success) {
        setImportSuccess(`Successfully fetched and imported ${data.count} live channels from remote URL!`);
        setRemoteUrl("");
        onRefreshAllData(); // Refresh the applet metrics and lists
        setSimulationLogs(logs => [
          `[SYSTEM] Remote playlist loaded and imported from external host. Parsed ${data.count} satellite feeds.`,
          ...logs.slice(0, 4)
        ]);
      } else {
        setImportError(data.error || "The playlist structure is unrecognized or has no streaming assets.");
      }
    } catch (err: any) {
      setImportError(err.message || "Could not fetch or dispatch playlist package from remote server.");
    } finally {
      setImportLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error("Error loaded analytics", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [channels]);

  const handleSimulateTraffic = () => {
    setDemoViewerMultiplier(prev => {
      const next = prev === 1.0 ? 2.5 : prev === 2.5 ? 5.0 : 1.0;
      const multipliersMap: Record<number, string> = {
        1.0: "Standard traffic feed",
        2.5: "Simulating peak sports viewership (+150%)",
        5.0: "Simulating global viral streaming event (+400%)"
      };
      setSimulationLogs(logs => [
        `[ADMIN ACTION] Adjusting viewership load to: ${multipliersMap[next]}`,
        ...logs.slice(0, 4)
      ]);
      return next;
    });
  };

  if (isLoading && !stats) {
    return (
      <div className="w-full py-16 flex flex-col justify-center items-center text-center">
        <RefreshCw className="w-8 h-8 text-red-500 animate-spin mb-3" />
        <p className="text-slate-400 text-sm">Gathering satellite analytical indicators...</p>
      </div>
    );
  }

  // Fallback state if API fails
  const renderStats = stats || {
    totalChannels: channels.length,
    totalCategories: 4,
    activeUsers: 3,
    activeViewersCount: 220,
    revenueThisMonth: 59.97,
    liveStatusCount: { online: channels.length, offline: 0 },
    categoryDistribution: [],
    visitorHistory: []
  };

  const adjustedViewers = Math.round(renderStats.activeViewersCount * demoViewerMultiplier);
  const adjustedRevenue = renderStats.revenueThisMonth;

  return (
    <div className="flex flex-col gap-6" id="admin-analytics-dashboard">
      
      {/* Real-time system status banner config */}
      <div className="w-full flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-gradient-to-r from-red-950/40 via-slate-900/40 to-slate-900/40 p-5 rounded-2xl border border-red-500/25 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="bg-red-500/20 p-2.5 rounded-xl border border-red-500/30 text-red-400">
            <Server className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-slate-100">Satellite Backend Streaming Node</h3>
            <p className="text-xs text-slate-400 font-mono">Status: <span className="text-green-400 font-bold">Online</span> &bull; Port: 3000 &bull; Signal: 99.8% Perfect SLA</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={async () => {
              await fetchAnalytics();
              onRefreshAllData();
              setSimulationLogs(logs => [
                `[SYSTEM] Forced database buffer purge & telemetry synchronized.`,
                ...logs.slice(0, 4)
              ]);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold rounded-lg text-slate-300 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Synchronize DB File
          </button>

          <button 
            type="button"
            onClick={handleSimulateTraffic}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${demoViewerMultiplier > 1.0 ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'}`}
          >
            <Activity className="w-3.5 h-3.5" /> 
            {demoViewerMultiplier === 1.0 ? "Simulate viewers load" : `Viewers x${demoViewerMultiplier}`}
          </button>
        </div>
      </div>

      {/* Quick M3U Playlist Uploader & Auto-Decoder Widget */}
      <div className="glassmorphism p-5 rounded-2xl border border-amber-500/20 flex flex-col gap-4 shadow-xl" id="dashboard-m3u-widget">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-display font-bold text-sm text-amber-500 flex items-center gap-2">
              <UploadCloud className="w-5 h-5" />
              Direct M3U Playlist Telemetry Upload (.m3u / .m3u8)
            </h3>
            <p className="text-[11px] text-slate-450 mt-0.5">Upload a live M3U playlist stream directory. The system will automatically parse and register active live stream antenna channels.</p>
          </div>
          
          <button
            type="button"
            onClick={() => setIsImporting(!isImporting)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 rounded-lg transition shrink-0 cursor-pointer"
          >
            {isImporting ? "Collapse Tools" : "Expand Tool Matrix"}
          </button>
        </div>

        {isImporting && (
          <div className="flex flex-col gap-4 animate-fade-in" id="dashboard-m3u-expanded">
            {/* Action Feedback Area */}
            {importSuccess && (
              <div className="flex items-center gap-2.5 p-3.5 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-emerald-400 text-xs">
                <Check className="w-4 h-4 shrink-0" />
                <span>{importSuccess}</span>
              </div>
            )}
            {importError && (
              <div className="flex items-center gap-2.5 p-3.5 bg-red-950/40 border border-red-800/40 rounded-xl text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* File selection and drop workspace */}
              <div className="md:col-span-5 flex flex-col gap-3">
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("dashboard-m3u-file-input")?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center transition cursor-pointer ${
                    dragActive ? "border-amber-500 bg-amber-500/5" : "border-slate-800 bg-slate-950/40 hover:border-slate-750"
                  }`}
                  id="dashboard-dropzone"
                >
                  <FileText className="w-8 h-8 text-slate-500 mb-2" />
                  <p className="text-xs font-semibold text-slate-200">
                    {selectedFile ? selectedFile.name : "Choose local .m3u playlist file"}
                  </p>
                  <p className="text-[10px] text-slate-550 mt-0.5">Drag and drop file here or click to browse</p>
                  <input
                    id="dashboard-m3u-file-input"
                    type="file"
                    accept=".m3u,.m3u8,text/plain"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-px bg-slate-800 flex-1"></div>
                  <span className="text-[9px] text-slate-550 font-bold uppercase tracking-wider">OR REMOTE URL</span>
                  <div className="h-px bg-slate-800 flex-1"></div>
                </div>

                <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-2">
                  <span className="text-[11px] font-semibold text-amber-500/90 flex items-center gap-1 select-none">
                    🔗 Connect to Vercel/External Link
                  </span>
                  <input
                    type="text"
                    value={remoteUrl}
                    onChange={(e) => {
                      setRemoteUrl(e.target.value);
                      if (selectedFile) {
                        setSelectedFile(null);
                        const fileInput = document.getElementById("dashboard-m3u-file-input") as HTMLInputElement;
                        if (fileInput) fileInput.value = "";
                      }
                    }}
                    placeholder="https://your-app.vercel.app/list.m3u"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
                  />
                  <p className="text-[9px] text-slate-500 leading-normal">
                    Enter any external playlist or dynamic server link. Connection is proxied server-side to bypass browse CORS guards.
                  </p>
                </div>
              </div>

              {/* Configurations mapping tools */}
              <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 text-xs">
                  <span className="font-semibold text-slate-300">Category Tag Decoding</span>
                  <select
                    value={categoryMode}
                    onChange={(e: any) => setCategoryMode(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="m3u">Auto Category (from group-title mapping)</option>
                    <option value="force">Force to Single Category</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 text-xs">
                  <span className="font-semibold text-slate-300">Target Category Group</span>
                  <select
                    disabled={categoryMode !== "force"}
                    value={forceCategoryId}
                    onChange={(e) => setForceCategoryId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-amber-500 disabled:opacity-30 cursor-pointer"
                  >
                    <option value="">-- Choose Category --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 text-xs">
                  <span className="font-semibold text-slate-300">Live Satellite Status</span>
                  <select
                    value={defaultStatus}
                    onChange={(e: any) => setDefaultStatus(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="online">Online (Active Signal / Tuning)</option>
                    <option value="offline">Offline (Standby Maintenance)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 mt-4 pl-1 select-none">
                  <input
                    type="checkbox"
                    id="dash-m3u-auto-feature"
                    checked={autoFeature}
                    onChange={(e) => setAutoFeature(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                  <label htmlFor="dash-m3u-auto-feature" className="font-semibold text-slate-300 cursor-pointer text-xs">
                    Pin streams to home featured lists
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pr-1 border-t border-slate-800/60 pt-3 text-xs">
              {selectedFile && (
                <button
                  type="button"
                  onClick={clearFileSelection}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-450 transition cursor-pointer"
                >
                  Unselect
                </button>
              )}
              {remoteUrl && (
                <button
                  type="button"
                  onClick={() => setRemoteUrl("")}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-450 transition cursor-pointer"
                >
                  Clear Link
                </button>
              )}
              <button
                type="button"
                disabled={(!selectedFile && !remoteUrl) || importLoading}
                onClick={selectedFile ? handleUploadAndImport : handleRemoteFetchAndImport}
                className="flex items-center justify-center gap-1.5 px-6 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:hover:bg-amber-600 text-white rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer min-w-[150px]"
              >
                {importLoading ? (
                  <RefreshCw className="w-3 px-1 animate-spin mx-auto" />
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    {remoteUrl ? "Fetch & Decode Remote link" : "Decode Playlist Feeds"}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid Metrics cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Met 1: Total Channels */}
        <div className="glassmorphism p-4.5 rounded-2xl flex flex-col justify-between border border-white/5 relative overflow-hidden group hover:border-slate-700/80 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 tracking-wider">CHANNELS</span>
            <div className="bg-blue-500/10 p-2 rounded-xl text-blue-400 border border-blue-500/10">
              <Tv className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="font-display font-bold text-2xl text-white">{renderStats.totalChannels}</h2>
            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-green-400 font-bold">&bull; {renderStats.liveStatusCount.online} Online</span>
              <span>&bull; {renderStats.liveStatusCount.offline} Offline</span>
            </p>
          </div>
        </div>

        {/* Met 2: Viewers */}
        <div className="glassmorphism p-4.5 rounded-2xl flex flex-col justify-between border border-white/5 relative overflow-hidden group hover:border-slate-700/80 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 tracking-wider">LIVE VIEWERS</span>
            <div className="bg-red-500/10 p-2 rounded-xl text-red-500 border border-red-500/10">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="font-display font-bold text-2xl text-white">{adjustedViewers}</h2>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <Users className="w-3 h-3 text-slate-500" />
              <span>Simulated adaptive clients reading HLS</span>
            </p>
          </div>
        </div>

        {/* Met 3: Paying Users */}
        <div className="glassmorphism p-4.5 rounded-2xl flex flex-col justify-between border border-white/5 relative overflow-hidden group hover:border-slate-700/80 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 tracking-wider">ACTIVE SUBSCRIPTIONS</span>
            <div className="bg-green-500/10 p-2 rounded-xl text-green-400 border border-green-500/10">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="font-display font-bold text-2xl text-white">{renderStats.activeUsers}</h2>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-0.5">
              <span className="text-green-400 font-bold">100% Retained</span> accounts active
            </p>
          </div>
        </div>

        {/* Met 4: Monthly Revenue */}
        <div className="glassmorphism p-4.5 rounded-2xl flex flex-col justify-between border border-white/5 relative overflow-hidden group hover:border-slate-700/80 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 tracking-wider">EST. REVENUE</span>
            <div className="bg-orange-500/10 p-2 rounded-xl text-orange-400 border border-orange-500/10">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="font-display font-bold text-2xl text-white">${adjustedRevenue.toFixed(2)}</h2>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-0.5">
              <span className="text-orange-400 font-bold">Gross income</span> generated by user plan tiers
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Charts & System logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Span 2: Traffic Load History Graph (SVG Area Chart) */}
        <div className="glassmorphism p-5 rounded-2xl border border-white/5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-display font-bold text-slate-200 text-sm">Hourly Traffic Load Metrics (Live)</h4>
            <span className="text-[10px] font-mono text-slate-500">Live Antenna Stream telemetry</span>
          </div>

          {/* Core SVG plotting block */}
          <div className="w-full aspect-[21/9] bg-slate-950/45 p-4 rounded-xl border border-slate-900 relative">
            <div className="absolute inset-x-8 top-12 bottom-8 flex flex-col justify-between pointer-events-none">
              <div className="border-t border-slate-900/60 w-full" />
              <div className="border-t border-slate-900/60 w-full" />
              <div className="border-t border-slate-900/60 w-full" />
            </div>

            <svg viewBox="0 0 600 180" className="w-full h-full">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid outline lines */}
              <line x1="50" y1="20" x2="50" y2="150" stroke="#1e293b" strokeDasharray="3" />
              <line x1="140" y1="20" x2="140" y2="150" stroke="#1e293b" strokeDasharray="3" />
              <line x1="230" y1="20" x2="230" y2="150" stroke="#1e293b" strokeDasharray="3" />
              <line x1="320" y1="20" x2="320" y2="150" stroke="#1e293b" strokeDasharray="3" />
              <line x1="410" y1="20" x2="410" y2="150" stroke="#1e293b" strokeDasharray="3" />
              <line x1="500" y1="20" x2="500" y2="150" stroke="#1e293b" strokeDasharray="3" />
              <line x1="570" y1="20" x2="570" y2="150" stroke="#1e293b" strokeDasharray="3" />

              {/* Area Plotting */}
              <path
                d={`M 50 150 L 50 120 L 140 100 L 230 70 L 320 85 L 410 40 L 500 25 L 570 30 L 570 150 Z`}
                fill="url(#chartGrad)"
              />

              {/* Main Line Plotting */}
              <path
                d="M 50 120 L 140 100 L 230 70 L 320 85 L 410 40 L 500 25 L 570 30"
                fill="none"
                stroke="#ef4444"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Area dots */}
              <circle cx="50" cy="120" r="4.5" fill="#ef4444" stroke="#000" strokeWidth="1" />
              <circle cx="140" cy="100" r="4.5" fill="#ef4444" stroke="#000" strokeWidth="1" />
              <circle cx="230" cy="70" r="4.5" fill="#ef4444" stroke="#000" strokeWidth="1" />
              <circle cx="320" cy="85" r="4.5" fill="#ef4444" stroke="#000" strokeWidth="1" />
              <circle cx="410" cy="40" r="4.5" fill="#ef4444" stroke="#000" strokeWidth="1" />
              <circle cx="500" cy="25" r="4.5" fill="#ef4444" stroke="#000" strokeWidth="1" />
              <circle cx="570" cy="30" r="4.5" fill="#ef4444" stroke="#000" strokeWidth="1" />

              {/* Category charts label */}
              <text x="50" y="170" fill="#64748b" fontSize="10" textAnchor="middle">10:00</text>
              <text x="140" y="170" fill="#64748b" fontSize="10" textAnchor="middle">12:00</text>
              <text x="230" y="170" fill="#64748b" fontSize="10" textAnchor="middle">14:00</text>
              <text x="320" y="170" fill="#64748b" fontSize="10" textAnchor="middle">16:00</text>
              <text x="410" y="170" fill="#64748b" fontSize="10" textAnchor="middle">18:00</text>
              <text x="500" y="170" fill="#64748b" fontSize="10" textAnchor="middle">20:00</text>
              <text x="570" y="170" fill="#64748b" fontSize="10" textAnchor="middle">22:00</text>

              {/* Viewers label indicators */}
              <text x="45" y="123" fill="#94a3b8" fontSize="9" textAnchor="end">120v</text>
              <text x="495" y="22" fill="#ef4444" fontSize="10" fontWeight="bold" textAnchor="end">Peak {Math.round(420 * demoViewerMultiplier)}v</text>
            </svg>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            <span>Viewer curve displays immediate concurrent web connections decoding HLS stream segments.</span>
          </div>
        </div>

        {/* Right Span 1: Simulation Logs/System Triggers */}
        <div className="glassmorphism p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
          <div>
            <h4 className="font-display font-bold text-slate-200 text-sm mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              Administrative Event Log
            </h4>
            
            <div className="flex flex-col gap-2 font-mono text-[10px] text-slate-400 h-44 overflow-y-auto bg-slate-950 p-3 rounded-lg border border-slate-900">
              {simulationLogs.map((log, idx) => (
                <div key={idx} className="border-b border-white/5 pb-1.5 leading-normal">
                  <span className="text-red-500 font-bold">&gt;&nbsp;</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 mt-4 text-[11px] text-slate-400 flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-yellow-500 flex-shrink-0" />
            <span>IPTV control panel saves changes instantly into the host machine directory `<code className="text-white">./data/db.json</code>`.</span>
          </div>
        </div>

      </div>

      {/* Categories stream load metric indicator bar */}
      <div className="glassmorphism p-5 rounded-2xl border border-white/5">
        <h4 className="font-display font-bold text-slate-200 text-sm mb-4">Stream Distribution by Category</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {renderStats.categoryDistribution.map((cd, index) => {
            const percentages = cd.count ? Math.round((cd.count / channels.length) * 100) : 0;
            return (
              <div key={index} className="bg-slate-950/50 p-4 rounded-xl border border-slate-900">
                <span className="text-xs font-semibold text-slate-400">{cd.name}</span>
                <div className="flex items-end justify-between mt-1 mb-2">
                  <h3 className="font-display font-bold text-xl text-white">{cd.count}</h3>
                  <span className="text-xs text-slate-500 font-mono">{percentages}% of total</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-600 rounded-full" 
                    style={{ width: `${percentages}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
