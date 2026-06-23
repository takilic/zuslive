import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Check, AlertCircle, RefreshCw, Layers, Star, ExternalLink, Globe, UploadCloud, FileText } from 'lucide-react';
import { Channel, Category } from '../types.ts';

interface AdminChannelsProps {
  channels: Channel[];
  categories: Category[];
  onChannelsUpdated: (updatedChannels: Channel[]) => void;
  onSyncAllData?: () => void;
}

export default function AdminChannels({ channels, categories, onChannelsUpdated, onSyncAllData }: AdminChannelsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<{ id: string; name: string } | null>(null);

  // Form Fields State
  const [name, setName] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [status, setStatus] = useState<'online' | 'offline'>('online');
  const [description, setDescription] = useState("");

  // M3U Playlist Importer Space States
  const [isImportingM3U, setIsImportingM3U] = useState(false);
  const [m3uFileText, setM3uFileText] = useState("");
  const [m3uFileName, setM3uFileName] = useState("");
  const [remoteUrl, setRemoteUrl] = useState("");
  const [m3uUrlLoading, setM3uUrlLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [m3uCategoryMode, setM3uCategoryMode] = useState<"m3u" | "force">("m3u");
  const [m3uForceCategoryId, setM3uForceCategoryId] = useState("");
  const [m3uDefaultStatus, setM3uDefaultStatus] = useState<"online" | "offline">("online");
  const [m3uAutoFeature, setM3uAutoFeature] = useState(false);
  const [importSearch, setImportSearch] = useState("");
  const [parsedChannels, setParsedChannels] = useState<{
    name: string;
    streamUrl: string;
    logoUrl: string;
    categoryName: string;
    description: string;
    selected: boolean;
  }[]>([]);

  const resetForm = () => {
    setName("");
    setStreamUrl("");
    setLogoUrl("");
    setCategoryId(categories[0]?.id || "");
    setIsFeatured(false);
    setStatus('online');
    setDescription("");
    setEditId(null);
    setIsEditing(false);
  };

  const handleEditClick = (channel: Channel) => {
    setIsImportingM3U(false);
    setEditId(channel.id);
    setName(channel.name);
    setStreamUrl(channel.streamUrl);
    setLogoUrl(channel.logoUrl);
    setCategoryId(channel.categoryId);
    setIsFeatured(channel.isFeatured);
    setStatus(channel.status);
    setDescription(channel.description || "");
    setIsEditing(true);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddClick = () => {
    setIsImportingM3U(false);
    resetForm();
    setIsEditing(true);
  };

  // M3U Drag and Drop Handlers
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
    if (file) {
      processM3UFile(file);
    }
  };

  const handleM3UFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processM3UFile(file);
    }
  };

  const parseM3UPlaylist = (text: string) => {
    const lines = text.split(/\r?\n/);
    const results: { name: string; streamUrl: string; logoUrl: string; categoryName: string; description: string }[] = [];
    
    let tempInfo: { name: string; logoUrl: string; categoryName: string; description: string } | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      if (line.startsWith("#EXTINF:")) {
        const info = line.substring(8);
        
        let logo = "";
        const logoMatch = info.match(/tvg-logo="([^"]*)"/i) || info.match(/logo="([^"]*)"/i);
        if (logoMatch) logo = logoMatch[1];
        
        let group = "";
        const groupMatch = info.match(/group-title="([^"]*)"/i);
        if (groupMatch) group = groupMatch[1];
        
        let chanName = "Stream Channel";
        const commaIdx = line.lastIndexOf(",");
        if (commaIdx !== -1) {
          chanName = line.substring(commaIdx + 1).trim();
        } else {
          const tvgNameMatch = info.match(/tvg-name="([^"]*)"/i);
          if (tvgNameMatch) chanName = tvgNameMatch[1];
        }
        
        tempInfo = {
          name: chanName,
          logoUrl: logo,
          categoryName: group,
          description: `M3U feed imported from group: ${group || "General"}`
        };
      } else if (line.startsWith("#")) {
        // Comment or layout line, ignore
      } else {
        // Stream url line
        if (tempInfo) {
          results.push({
            name: tempInfo.name,
            streamUrl: line,
            logoUrl: tempInfo.logoUrl,
            categoryName: tempInfo.categoryName,
            description: tempInfo.description
          });
          tempInfo = null;
        } else if (line.startsWith("http://") || line.startsWith("https://")) {
          // Direct URL with no preceding info details block
          const nameFromUrl = line.substring(line.lastIndexOf('/') + 1) || "Raw HLS Link";
          results.push({
            name: nameFromUrl,
            streamUrl: line,
            logoUrl: "",
            categoryName: "",
            description: "Direct stream link address"
          });
        }
      }
    }
    return results;
  };

  const processM3UFile = (file: File) => {
    setM3uFileName(file.name);
    setErrorMsg("");
    setSuccessMsg("");

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string || "";
      setM3uFileText(text);
      const parsed = parseM3UPlaylist(text);
      if (parsed.length === 0) {
        setErrorMsg("The selected file does not contain valid HLS stream specifications or EXTM3U codes.");
        setParsedChannels([]);
      } else {
        setParsedChannels(parsed.map(ch => ({ ...ch, selected: true })));
        setSuccessMsg(`Playlist read completed! Identified ${parsed.length} raw streams.`);
      }
    };
    reader.onerror = () => {
      setErrorMsg("Severe file parsing failure.");
    };
    reader.readAsText(file);
  };

  const processM3URemoteURL = async (url: string) => {
    if (!url) {
      setErrorMsg("Please enter a valid remote Playlist URL.");
      return;
    }

    setM3uUrlLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    setM3uFileName("Downloading remote playlist...");

    try {
      const res = await fetch("/api/channels/fetch-remote-m3u", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistUrl: url })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Remote server responded with error code: ${res.status}`);
      }

      const remoteData = await res.json();
      const content = remoteData.content;
      
      setM3uFileText(content);
      const parsed = parseM3UPlaylist(content);

      if (parsed.length === 0) {
        setErrorMsg("The remote location did not return a valid list of streaming channels.");
        setParsedChannels([]);
      } else {
        setParsedChannels(parsed.map(ch => ({ ...ch, selected: true })));
        setSuccessMsg(`Successfully loaded and parsed ${parsed.length} channels from external playlist link!`);
        setM3uFileName(url.substring(url.lastIndexOf("/") + 1) || "Remote Playlist Feed");
        setRemoteUrl(""); // reset URL text field
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to download remote playlist. Check link live state or CORS availability.");
      setParsedChannels([]);
      setM3uFileName("");
    } finally {
      setM3uUrlLoading(false);
    }
  };

  const executeBatchImport = async () => {
    const selectedToImport = parsedChannels.filter(c => c.selected);
    if (selectedToImport.length === 0) {
      setErrorMsg("Please select at least one channel to import from parsed lists.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const formattedChannels = selectedToImport.map(ch => {
        let catId = undefined;
        let catName = undefined;

        if (m3uCategoryMode === "force") {
          catId = m3uForceCategoryId || categories[0]?.id || "cat-entertainment";
        } else {
          catName = ch.categoryName || "Entertainment";
        }

        return {
          name: ch.name,
          logoUrl: ch.logoUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=200&auto=format&fit=crop",
          streamUrl: ch.streamUrl,
          categoryId: catId,
          categoryName: catName, // Let the backend automatically match or construct new Category
          isFeatured: m3uAutoFeature,
          status: m3uDefaultStatus,
          description: ch.description
        };
      });

      const res = await fetch("/api/channels/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels: formattedChannels })
      });

      if (res.ok) {
        const imported = await res.json();
        setSuccessMsg(`Successfully imported ${imported.length} channels mapping into persistent database categories!`);
        
        if (onSyncAllData) {
          onSyncAllData();
        } else {
          const refetchedRes = await fetch("/api/channels");
          if (refetchedRes.ok) {
            const freshData = await refetchedRes.json();
            onChannelsUpdated(freshData);
          }
        }

        // Clean values
        setParsedChannels([]);
        setM3uFileText("");
        setM3uFileName("");
        setIsImportingM3U(false);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to commit batch IPTV feeds array.");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Communication error during batch database updates.");
    } finally {
      setLoading(false);
    }
  };

  // Automated popular logo seeds for simple additions
  const handleLogoPreset = (type: string) => {
    const presets: Record<string, string> = {
      sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=200&auto=format&fit=crop",
      world: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=200&auto=format&fit=crop",
      movies: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=200&auto=format&fit=crop",
      entertainment: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=200&auto=format&fit=crop"
    };
    if (presets[type]) {
      setLogoUrl(presets[type]);
    }
  };

  const saveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!name || !streamUrl) {
      setErrorMsg("Please provide at least a station name and HLS endpoint URL.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name,
        streamUrl,
        logoUrl: logoUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=200&auto=format&fit=crop",
        categoryId: categoryId || categories[0]?.id || "cat-entertainment",
        isFeatured,
        status,
        description
      };

      let url = "/api/channels";
      let method = "POST";

      if (editId) {
        url = `/api/channels/${editId}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const savedChannel = await res.json();
        // Refresh local listings through callback
        const refetchedRes = await fetch("/api/channels");
        if (refetchedRes.ok) {
          const freshData = await refetchedRes.json();
          onChannelsUpdated(freshData);
        }

        setSuccessMsg(editId ? `Channel "${name}" successfully updated.` : `New Channel "${name}" successfully listed in DB.`);
        resetForm();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to commit channel coordinates.");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Severe communications error connecting with server JSON backend.");
    } finally {
      setLoading(false);
    }
  };

  const deleteChannel = (id: string, chanName: string) => {
    setChannelToDelete({ id, name: chanName });
  };

  const confirmDeleteChannel = async () => {
    if (!channelToDelete) return;
    const { id, name: chanName } = channelToDelete;

    try {
      setLoading(true);
      const res = await fetch(`/api/channels/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (onSyncAllData) {
          onSyncAllData();
        } else {
          const refetchedRes = await fetch("/api/channels");
          if (refetchedRes.ok) {
            const freshData = await refetchedRes.json();
            onChannelsUpdated(freshData);
          }
        }
        setSuccessMsg(`Channel "${chanName}" permanently removed from live satellite grid.`);
        setChannelToDelete(null);
      } else {
        setErrorMsg("Failed to delete the channel from the target database.");
      }
    } catch (e) {
      setErrorMsg("Failed database call to discard records.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6" id="admin-channels-control">
      
      {/* Upper info with Add Call */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-100">Live IPTV Channels Management</h2>
          <p className="text-xs text-slate-400">Map and sync raw HLS feeds direct into user grid displays</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsImportingM3U(!isImportingM3U);
              setIsEditing(false);
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs border transition active:scale-95 shadow-md cursor-pointer ${
              isImportingM3U 
                ? 'bg-amber-600 hover:bg-amber-500 border-amber-500 text-white' 
                : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <UploadCloud className="w-4 h-4" /> 
            {isImportingM3U ? 'Close Importer' : 'Import M3U Playlist'}
          </button>
          {!isEditing && (
            <button
              onClick={handleAddClick}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-xs text-white transition active:scale-95 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Satellite Feed
            </button>
          )}
        </div>
      </div>

      {/* Action alerts feed */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-950/40 border border-green-800/60 rounded-xl text-green-400 text-xs">
          <Check className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-400 text-xs">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* M3U Import Workspace */}
      {isImportingM3U && (
        <div className="glassmorphism p-5 rounded-2xl border border-amber-500/15 flex flex-col gap-5 animate-fade-in" id="m3u-workspace">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="font-display font-semibold text-sm text-amber-500 flex items-center gap-2">
              <UploadCloud className="w-4 h-4" />
              Batch IPTV Playlist Importer (.m3u / .m3u8)
            </h3>
            <button 
              type="button"
              onClick={() => {
                setIsImportingM3U(false);
                setParsedChannels([]);
                setM3uFileName("");
              }}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 hover:bg-slate-800 rounded transition cursor-pointer"
            >
              Cancel Workspace
            </button>
          </div>

          {parsedChannels.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Box 1: Dropzone */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition ${
                  dragActive ? "border-amber-500 bg-amber-500/5" : "border-slate-800 bg-slate-950/40 hover:border-slate-750"
                }`}
              >
                <FileText className="w-10 h-10 text-slate-555 mb-2" />
                <p className="text-xs font-semibold text-slate-200">Drag & drop playlist file here</p>
                <p className="text-[10px] text-slate-550 mt-0.5 mb-3">Accepts standard .m3u and .m3u8 files</p>
                
                <label className="cursor-pointer bg-slate-900 border border-slate-800 text-[11px] text-slate-200 px-3.5 py-1.5 rounded-xl font-bold hover:bg-slate-800 transition active:scale-95">
                  Choose Local File
                  <input
                    type="file"
                    accept=".m3u,.m3u8,text/plain"
                    className="hidden"
                    onChange={handleM3UFileChange}
                  />
                </label>
              </div>

              {/* Box 2: Remote URL Link */}
              <div className="bg-slate-950/45 border border-slate-850 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-500 flex items-center gap-1 select-none">
                    🔗 Load from Vercel / Remote Link URL
                  </span>
                  <p className="text-[11px] text-slate-450 mt-1 leading-relaxed">
                    Connect your applet directly to external playlist servers (like Vercel JSON configs or remote M3U listings).
                  </p>
                </div>

                <div className="flex flex-col gap-2 mt-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={remoteUrl}
                      onChange={(e) => setRemoteUrl(e.target.value)}
                      placeholder="https://example-iptv.vercel.app/playlist.m3u"
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
                    />
                    <button
                      type="button"
                      disabled={!remoteUrl || m3uUrlLoading}
                      onClick={() => processM3URemoteURL(remoteUrl)}
                      className="bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer min-w-[100px] flex items-center justify-center"
                    >
                      {m3uUrlLoading ? "Fetching..." : "Fetch Link"}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Bypasses all client-side CORS blockers via server-side secure URL fetching proxy.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Loaded status summary card */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-wrap gap-4 items-center justify-between text-xs">
                <div>
                  <span className="text-slate-450 block mb-0.5">File Name</span>
                  <span className="text-white font-mono font-semibold">{m3uFileName}</span>
                </div>
                <div>
                  <span className="text-slate-450 block mb-0.5">Parsed Feeds</span>
                  <span className="text-amber-500 font-bold font-mono text-sm">{parsedChannels.length}</span>
                </div>
                <div>
                  <span className="text-slate-450 block mb-0.5">Marked for Import</span>
                  <span className="text-green-400 font-bold font-mono text-sm">
                    {parsedChannels.filter(c => c.selected).length}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setParsedChannels(p => p.map(c => ({ ...c, selected: true })))}
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2.5 py-1.5 rounded-lg text-[10px] text-slate-350 font-bold transition cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setParsedChannels(p => p.map(c => ({ ...c, selected: false })))}
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2.5 py-1.5 rounded-lg text-[10px] text-slate-350 font-bold transition cursor-pointer"
                  >
                    Deselect All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setParsedChannels([]);
                      setM3uFileName("");
                    }}
                    className="bg-red-950/40 text-red-400 hover:bg-red-900/30 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-red-900/10 transition cursor-pointer"
                  >
                    Clear Loader
                  </button>
                </div>
              </div>

              {/* Import Options mapping configuration card */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/40 p-4 border border-slate-800/80 rounded-xl text-xs">
                {/* Field: Category Mapping option */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-300">Category Mode</label>
                  <select
                    value={m3uCategoryMode}
                    onChange={(e: any) => setM3uCategoryMode(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="m3u">Auto Category (from M3U tag group-title)</option>
                    <option value="force">Force to Single Category Folder</option>
                  </select>
                </div>

                {/* Sub Field conditional: Force Category ID */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-300">Target Genre Folder</label>
                  <select
                    disabled={m3uCategoryMode !== "force"}
                    value={m3uForceCategoryId}
                    onChange={(e) => setM3uForceCategoryId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500 disabled:opacity-30 cursor-pointer"
                  >
                    <option value="">-- Choose Category --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Field: Default Status */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-300">Set Feed Signal Status</label>
                  <select
                    value={m3uDefaultStatus}
                    onChange={(e: any) => setM3uDefaultStatus(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="online">Online (Streaming State)</option>
                    <option value="offline">Offline (Maintenance State)</option>
                  </select>
                </div>

                {/* Field: Auto featured */}
                <div className="flex items-center gap-2 mt-4 pl-2">
                  <input
                    type="checkbox"
                    id="auto-feature"
                    checked={m3uAutoFeature}
                    onChange={(e) => setM3uAutoFeature(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                  <label htmlFor="auto-feature" className="font-semibold text-slate-300 cursor-pointer text-xs select-none">
                    Feature on Front Home Slides
                  </label>
                </div>
              </div>

              {/* Filtering Search input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type to filter parsed streams list..."
                  value={importSearch}
                  onChange={(e) => setImportSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Parsed streams preview list layout */}
              <div className="max-h-64 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-850">
                {parsedChannels
                  .filter(ch => ch.name.toLowerCase().includes(importSearch.toLowerCase()))
                  .map((ch, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-950/20 hover:bg-slate-900/30 text-xs">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={ch.selected}
                          onChange={() => {
                            setParsedChannels(pc => pc.map((item, id) => id === idx ? { ...item, selected: !item.selected } : item));
                          }}
                          className="w-3.5 h-3.5 accent-amber-500 cursor-pointer"
                        />
                        {ch.logoUrl ? (
                          <img
                            src={ch.logoUrl}
                            alt=""
                            className="w-7 h-7 rounded border border-slate-800 object-cover bg-slate-950"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=200&auto=format&fit=crop";
                            }}
                          />
                        ) : (
                          <div className="w-7 h-7 rounded border border-slate-800 bg-slate-950 flex items-center justify-center text-[8px] text-slate-550 uppercase font-mono font-bold">
                            HLS
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-slate-200 block truncate max-w-sm sm:max-w-md">{ch.name}</span>
                          <span className="text-[10px] text-slate-500 block font-mono truncate max-w-sm sm:max-w-md">{ch.streamUrl}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 pl-2">
                        {ch.categoryName && (
                          <span className="bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded text-[9px] font-mono whitespace-nowrap">
                            Tag: {ch.categoryName}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setParsedChannels(pc => pc.filter((_, id) => id !== idx));
                          }}
                          className="text-slate-400 hover:text-red-400 text-sm font-semibold transition px-1.5 py-0.5 hover:bg-slate-800 rounded cursor-pointer"
                          title="Exclude stream"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Submit CTA button section */}
              <div className="flex justify-end gap-2 pr-1 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportingM3U(false);
                    setParsedChannels([]);
                    setM3uFileName("");
                  }}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-350 hover:bg-slate-800 text-xs font-bold rounded-lg transition"
                >
                  Close Importer
                </button>
                <button
                  type="button"
                  disabled={loading || parsedChannels.filter(c => c.selected).length === 0}
                  onClick={executeBatchImport}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-xs font-bold rounded-lg text-white transition active:scale-95 shadow flex items-center gap-1.5 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Batch Parsing...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" /> 
                      Import Selected Channels ({parsedChannels.filter(c => c.selected).length})
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Editing / Addition Form */}
      {isEditing && (
        <form onSubmit={saveChannel} className="glassmorphism p-5 rounded-2xl border border-red-500/15 flex flex-col gap-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2">
            <h3 className="font-display font-semibold text-sm text-red-400 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              {editId ? "Update Live Channel Attributes" : "List New Live Stream Feed"}
            </h3>
            <button 
              type="button"
              onClick={resetForm}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 hover:bg-slate-800 rounded transition cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Field: Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Station Name</label>
              <input
                type="text"
                required
                placeholder="e.g. ESPN Sports Central, HBO HD"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500 transition"
              />
            </div>

            {/* Field: Category Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">TV Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500 transition cursor-pointer"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Field: Stream hls link */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-slate-300">HLS Streaming Link URL (.m3u8)</label>
              <input
                type="url"
                required
                placeholder="https://example-server.com/live/stream/playlist.m3u8"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500 transition font-mono text-xs"
              />
              <span className="text-[10px] text-slate-500">Provide an active HTTP Live Streaming (HLS) stream source address.</span>
            </div>

            {/* Field: Logo url with optional preset seeds */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Logo URL or Thumbnail</label>
              <input
                type="text"
                placeholder="https://images.unsplash.com/photo-..."
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500 transition text-xs"
              />
              {/* Presets badges selector helper */}
              <div className="flex gap-1.5 flex-wrap mt-1">
                <span className="text-[9px] text-slate-500 uppercase font-bold pt-0.5 whitespace-nowrap">Presets:</span>
                <button type="button" onClick={() => handleLogoPreset("sports")} className="text-[9px] bg-slate-900 border border-slate-800 py-0.5 px-2.5 rounded hover:border-slate-700 hover:text-white transition cursor-pointer">Sports Mock</button>
                <button type="button" onClick={() => handleLogoPreset("world")} className="text-[9px] bg-slate-900 border border-slate-800 py-0.5 px-2.5 rounded hover:border-slate-700 hover:text-white transition cursor-pointer">News Mock</button>
                <button type="button" onClick={() => handleLogoPreset("movies")} className="text-[9px] bg-slate-900 border border-slate-800 py-0.5 px-2.5 rounded hover:border-slate-700 hover:text-white transition cursor-pointer">Cine Mock</button>
              </div>
            </div>

            {/* Field: Status & isFeatured toggles */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Signal Status</label>
                <select
                  value={status}
                  onChange={(e: any) => setStatus(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500 transition cursor-pointer"
                >
                  <option value="online">Online (Streaming)</option>
                  <option value="offline">Offline (Maintenance)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 justify-center mt-3 pl-3">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 accent-red-600 rounded bg-slate-950 border-slate-800 cursor-pointer"
                  />
                  <span>Promote as Featured</span>
                </label>
                <span className="text-[9px] text-slate-500 ml-6">Highlight on home header slides</span>
              </div>
            </div>

            {/* Field: Description summary */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-slate-300">Stream Description / Meta metadata (Optional)</label>
              <textarea
                placeholder="Details regarding programming schedule, network, source language..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500 transition resize-none leading-normal"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 border-t border-slate-800/80 pt-4 mt-2">
            <button
              type="button"
              disabled={loading}
              onClick={resetForm}
              className="px-4 py-2 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs font-bold rounded-lg transition"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-xs font-bold rounded-lg text-white transition active:scale-95 shadow"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Committing...
                </span>
              ) : (
                "Save Antenna Coordinate"
              )}
            </button>
          </div>
        </form>
      )}

      {/* Main Channels List Table */}
      <div className="glassmorphism rounded-2xl overflow-hidden border border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-950 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th colSpan={2} className="p-4 pl-5">Channel Network</th>
                <th className="p-4">Category</th>
                <th className="p-4">Stream URL Link</th>
                <th className="p-4">Views</th>
                <th className="p-4">State</th>
                <th className="p-4 text-center pr-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 bg-slate-900/10">
              {channels.map((chan) => {
                const categoryObj = categories.find(c => c.id === chan.categoryId);
                return (
                  <tr key={chan.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 pl-5 w-12">
                      <img
                        src={chan.logoUrl}
                        alt={chan.name}
                        className="w-10 h-10 object-cover rounded-lg border border-slate-700 bg-slate-950"
                      />
                    </td>
                    <td className="p-4 font-semibold text-slate-100">
                      <div className="flex items-center gap-2">
                        <span>{chan.name}</span>
                        {chan.isFeatured && (
                          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" title="Featured Carousel" />
                        )}
                      </div>
                      {chan.description && (
                        <p className="text-[10px] text-slate-500 max-w-xs truncate">{chan.description}</p>
                      )}
                    </td>
                    <td className="p-4 text-xs font-medium text-slate-300">
                      <span className="bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
                        {categoryObj?.name || "Entertainment"}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-400 max-w-xs truncate">
                      <span className="hover:text-red-400 transition cursor-text select-all" title={chan.streamUrl}>
                        {chan.streamUrl}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-mono text-slate-300">
                      {chan.views} live
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${chan.status === 'online' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        {chan.status}
                      </span>
                    </td>
                    <td className="p-4 text-center pr-5">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditClick(chan)}
                          className="bg-slate-950 hover:bg-slate-850 p-1.5 rounded text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer"
                          title="Edit Channel Parameters"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteChannel(chan.id, chan.name)}
                          className="bg-slate-950 hover:bg-red-950/40 p-1.5 rounded text-red-400 hover:text-red-300 border border-slate-800 hover:border-red-800/40 transition cursor-pointer"
                          title="Delete Feed Connection"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* State-driven confirm delete channel modal overlay */}
      {channelToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="confirm-delete-chan-modal">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 p-6 rounded-2xl flex flex-col items-center text-center shadow-2xl relative">
            <div className="w-14 h-14 bg-red-650/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-white mb-2">Delete Live Channel?</h3>
            <p className="text-sm text-slate-350 leading-relaxed mb-6">
              Are you absolutely sure you want to terminate the livestream antenna feed for <span className="text-red-400 font-semibold">"{channelToDelete.name}"</span>? This action is irreversible.
            </p>
            <div className="flex gap-3 w-full justify-center">
              <button
                type="button"
                onClick={() => setChannelToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl text-xs transition duration-200 cursor-pointer w-28"
              >
                No, Keep
              </button>
              <button
                type="button"
                onClick={confirmDeleteChannel}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition duration-200 shadow active:scale-95 cursor-pointer w-28"
              >
                {loading ? <RefreshCw className="w-3 animate-spin mx-auto" /> : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
