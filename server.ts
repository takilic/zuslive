import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Channel, Category, User, SubscriptionPlan, Analytics } from "./src/types.ts";

const app = express();
const PORT = 3000;

app.use(express.json());

// Auto-restrict all non-GET /api database write operations to AI Studio sandboxes only
app.use("/api", (req, res, next) => {
  if (req.method !== "GET" && req.path !== "/channels/fetch-remote-m3u" && req.path !== "/stream-proxy") {
    // If the request is a write operation (POST, PUT, DELETE) and not a public stream-relay segment
    const referer = req.get("referer") || "";
    const host = req.get("host") || "";
    const isLocalOrDev = host.includes("localhost") || 
                         host.includes("127.0.0.1") || 
                         host.includes("ais-dev-") || 
                         referer.includes("localhost") || 
                         referer.includes("ais-dev-");

    if (!isLocalOrDev) {
      return res.status(403).json({
        error: "IPTV Admin Panel is in read-only mode for public view. Adding, importing, or editing channels can only be performed via the AI Studio workspace."
      });
    }
  }
  next();
});

// Persistent database file setup
const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "db.json");

// Dynamic seed data function
function getInitialData() {
  const categories: Category[] = [
    { id: "cat-sports", name: "Sports TV", slug: "sports", icon: "Trophy" },
    { id: "cat-movies", name: "Movies & Cinema", slug: "movies", icon: "Film" },
    { id: "cat-news", name: "Global News", slug: "news", icon: "Globe" },
    { id: "cat-entertainment", name: "Entertainment", slug: "entertainment", icon: "Sparkles" }
  ];

  const channels: Channel[] = [
    {
      id: "ch-1",
      name: "NASA TV Global",
      logoUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=200&auto=format&fit=crop",
      streamUrl: "https://ntv1.akamaized.net/hls/live/2012175/NASA-NTV1-HLS/master.m3u8",
      categoryId: "cat-news",
      isFeatured: true,
      views: 1420,
      status: "online",
      description: "NASA's 24-hour live broadcast featuring space program news, space science, and high-definition views from the International Space Station."
    },
    {
      id: "ch-2",
      name: "France 24 News",
      logoUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=200&auto=format&fit=crop",
      streamUrl: "https://static.france24.com/live/F24_EN_LO_HLS/live_web.m3u8",
      categoryId: "cat-news",
      isFeatured: true,
      views: 955,
      status: "online",
      description: "France 24 provides an international touch to live global events, breaking news, analysis, and documentaries in French and English."
    },
    {
      id: "ch-3",
      name: "Sintel Sci-Fi (HD Cinema)",
      logoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop",
      streamUrl: "https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8",
      categoryId: "cat-movies",
      isFeatured: true,
      views: 2410,
      status: "online",
      description: "Delivering continuous independent classic cinema feeds. High definition animated CGI sci-fi movies, streaming nonstop."
    },
    {
      id: "ch-4",
      name: "Multi-Bitrate Big Buck Bunny",
      logoUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=200&auto=format&fit=crop",
      streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      categoryId: "cat-cinema",
      isFeatured: false,
      views: 654,
      status: "online",
      description: "A continuous entertainment stream of funny cartoon animations and experimental full-HD short clips suitable for testing player quality presets."
    },
    {
      id: "ch-5",
      name: "Deutsche Welle (DW) English",
      logoUrl: "https://images.unsplash.com/photo-1495020689067-958852a6565d?q=80&w=200&auto=format&fit=crop",
      streamUrl: "https://playertest.longtailvideo.com/adaptive/wowza33/playlist.m3u8",
      categoryId: "cat-news",
      isFeatured: false,
      views: 890,
      status: "online",
      description: "German international news agency reporting global news in English. Accurate reporting on politics, commerce, science, and European cultural events."
    },
    {
      id: "ch-6",
      name: "HLS Sports Actions Live",
      logoUrl: "https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=200&auto=format&fit=crop",
      streamUrl: "https://test-streams.mux.dev/pts/playlist.m3u8",
      categoryId: "cat-sports",
      isFeatured: true,
      views: 1850,
      status: "online",
      description: "Non-stop extreme sports and action athletics events channel. Includes racing, skydiving, dirt bike biking, and snowboarding championship broadcasts."
    }
  ];

  const subscriptionPlans: SubscriptionPlan[] = [
    {
      id: "plan-trial",
      name: "Trial Pass",
      price: "$0.00",
      period: "24 Hours",
      features: ["Standard Definition stream", "Ad supported", "1 Concurrent device monitor", "All News & Public channels"]
    },
    {
      id: "plan-basic",
      name: "Standard Stream",
      price: "$9.99",
      period: "1 Month",
      features: ["Full HD Multi-quality streams", "Ad-free experience", "2 Concurrent active screens", "Full catalogue access", "24/7 client support"]
    },
    {
      id: "plan-premium",
      name: "Pro Premium VIP",
      price: "$24.99",
      period: "3 Months",
      features: ["Ultrawide 4K & HDR stream capabilities", "Zero latency streams", "5 Concurrent active screens", "Full access: sports, cinema & events", "Priority customer VIP support line"]
    }
  ];

  const users: User[] = [
    {
      id: "usr-admin",
      username: "IPTV Admin",
      email: "admin@iptvstream.com",
      role: "admin",
      subscriptionStatus: "active",
      subscriptionExpiry: "2029-12-31T23:59:59.000Z",
      planType: "VIP",
      avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop"
    },
    {
      id: "usr-1",
      username: "Sarah Jenkins",
      email: "sarah@yahoo.com",
      role: "user",
      subscriptionStatus: "active",
      subscriptionExpiry: "2026-08-15T00:00:00.000Z",
      planType: "Premium",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop"
    },
    {
      id: "usr-2",
      username: "David Miller",
      email: "david.miller@gmail.com",
      role: "user",
      subscriptionStatus: "expired",
      subscriptionExpiry: "2026-05-10T00:00:00.000Z",
      planType: "Basic",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop"
    },
    {
      id: "usr-3",
      username: "Michael Chen",
      email: "m.chen@outlook.com",
      role: "user",
      subscriptionStatus: "active",
      subscriptionExpiry: "2026-07-28T00:00:00.000Z",
      planType: "Trial",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop",
      isBlocked: false
    }
  ];

  return { categories, channels, subscriptionPlans, users };
}

// Database helper functions
function loadDB() {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const defaultData = getInitialData();
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), "utf-8");
      return defaultData;
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to load local DB: ", error);
    return getInitialData();
  }
}

function saveDB(data: any) {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save local DB: ", error);
  }
}

// ================= API ENDPOINTS =================

// Export raw database file
app.get("/api/admin/db/raw", (req, res) => {
  try {
    const rawData = fs.readFileSync(DB_FILE, "utf-8");
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=db.json");
    res.send(rawData);
  } catch (err) {
    res.status(500).json({ error: "Failed to read database file" });
  }
});

// Channels API
app.get("/api/channels", (req, res) => {
  const db = loadDB();
  res.json(db.channels);
});

app.post("/api/channels", (req, res) => {
  const db = loadDB();
  const newChannel: Channel = {
    id: `ch-${Date.now()}`,
    name: req.body.name || "Unnamed Channel",
    logoUrl: req.body.logoUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=200&auto=format&fit=crop",
    streamUrl: req.body.streamUrl || "",
    categoryId: req.body.categoryId || "cat-entertainment",
    isFeatured: req.body.isFeatured || false,
    views: req.body.views || 0,
    status: req.body.status || "online",
    description: req.body.description || ""
  };
  db.channels.push(newChannel);
  saveDB(db);
  res.status(201).json(newChannel);
});

app.post("/api/channels/batch", (req, res) => {
  const db = loadDB();
  const channelsToImport = req.body.channels;
  if (!Array.isArray(channelsToImport)) {
    return res.status(400).json({ error: "Channels field must be an array" });
  }

  const addedChannels: Channel[] = [];
  const baseTime = Date.now();
  
  channelsToImport.forEach((ch: any, idx: number) => {
    // Generate unique categoryId if needed or map custom categories
    let finalCatId = ch.categoryId || "cat-entertainment";
    
    // Check if the category is provided as a string name, check if it exists or create it
    if (ch.categoryName && !ch.categoryId) {
      const existingCat = db.categories.find(
        (c: any) => c.name.toLowerCase() === ch.categoryName.toLowerCase()
      );
      if (existingCat) {
        finalCatId = existingCat.id;
      } else {
        // Create new category
        const newCatId = `cat-${ch.categoryName.toLowerCase().replace(/[^a-z0-9]/g, "-") || Date.now() + "-" + idx}`;
        const cleanName = ch.categoryName.trim();
        // Check if cat ID is not already used
        if (!db.categories.some((c: any) => c.id === newCatId)) {
          db.categories.push({
            id: newCatId,
            name: cleanName,
            slug: cleanName.toLowerCase().replace(/\s+/g, "-"),
            icon: "Bookmark"
          });
        }
        finalCatId = newCatId;
      }
    }

    const newChannel: Channel = {
      id: `ch-${baseTime}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
      name: ch.name || "Unnamed M3U Channel",
      logoUrl: ch.logoUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=200&auto=format&fit=crop",
      streamUrl: ch.streamUrl || "",
      categoryId: finalCatId,
      isFeatured: ch.isFeatured || false,
      views: ch.views || Math.floor(Math.random() * 250) + 12,
      status: ch.status || "online",
      description: ch.description || `M3U Loaded Feed - Stream source`
    };
    db.channels.push(newChannel);
    addedChannels.push(newChannel);
  });

  saveDB(db);
  res.status(201).json(addedChannels);
});

app.post("/api/channels/import-m3u", (req, res) => {
  const db = loadDB();
  const { m3uContent, categoryMode, forceCategoryId, defaultStatus, autoFeature } = req.body;
  
  if (!m3uContent || typeof m3uContent !== "string") {
    return res.status(400).json({ error: "Missing or invalid m3uContent string" });
  }

  // Parse M3U
  const lines = m3uContent.split(/\r?\n/);
  const results: any[] = [];
  let tempInfo: any = null;
  
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
      // ignore Comments
    } else {
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

  if (results.length === 0) {
    return res.status(400).json({ error: "No valid channels found in the uploaded playlist" });
  }

  const addedChannels: any[] = [];
  const baseTime = Date.now();
  
  results.forEach((ch: any, idx: number) => {
    let finalCatId = forceCategoryId || "cat-entertainment";
    
    if (categoryMode !== "force" && ch.categoryName) {
      const existingCat = db.categories.find(
        (c: any) => c.name.toLowerCase() === ch.categoryName.toLowerCase()
      );
      if (existingCat) {
        finalCatId = existingCat.id;
      } else {
        const newCatId = `cat-${ch.categoryName.toLowerCase().replace(/[^a-z0-9]/g, "-") || Date.now() + "-" + idx}`;
        const cleanName = ch.categoryName.trim();
        if (!db.categories.some((c: any) => c.id === newCatId)) {
          db.categories.push({
            id: newCatId,
            name: cleanName,
            slug: cleanName.toLowerCase().replace(/\s+/g, "-"),
            icon: "Bookmark"
          });
        }
        finalCatId = newCatId;
      }
    }

    const newChannel = {
      id: `ch-${baseTime}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
      name: ch.name || "Unnamed M3U Channel",
      logoUrl: ch.logoUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=200&auto=format&fit=crop",
      streamUrl: ch.streamUrl || "",
      categoryId: finalCatId,
      isFeatured: autoFeature === true || autoFeature === "true",
      views: Math.floor(Math.random() * 250) + 12,
      status: defaultStatus || "online",
      description: ch.description || `M3U Loaded Feed - Stream source`
    };
    db.channels.push(newChannel);
    addedChannels.push(newChannel);
  });

  saveDB(db);
  res.status(201).json({ success: true, count: addedChannels.length, channels: addedChannels });
});

// Server-side Remote M3U Playlist Fetcher & Parser
app.post("/api/channels/fetch-remote-m3u", async (req, res) => {
  const { playlistUrl } = req.body;
  if (!playlistUrl) {
    return res.status(400).json({ error: "Please enter a valid remote Playlist URL endpoint." });
  }

  try {
    const urlPattern = /^(https?:\/\/)/i;
    const finalUrl = urlPattern.test(playlistUrl) ? playlistUrl : `http://${playlistUrl}`;
    
    console.log(`[PROXY] Fetching remote playlist from: ${finalUrl}`);
    const response = await fetch(finalUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) IPTVStreamDecoder/2.4"
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Could not retrieve file. Remote server responded with error code: ${response.status} ${response.statusText}`
      });
    }

    const m3uText = await response.text();
    return res.json({
      success: true,
      content: m3uText,
      url: finalUrl
    });
  } catch (err: any) {
    console.error("[PROXY ERROR] Failed to parse remote stream server:", err);
    return res.status(500).json({
      error: `Connection failure pointing to ${playlistUrl}. Check link live state or firewall constraints. Context: ${err.message || err}`
    });
  }
});

// Complete CORS Stream-Proxy & Relay Gateway
app.get("/api/stream-proxy", async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).send("Parameter 'url' is required inside CORS gateway relay.");
  }

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) IPTVStreamPlayer/1.1"
      }
    });

    // Write back response headers with absolute CORS compliance
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");

    const type = response.headers.get("content-type");
    if (type) {
      res.setHeader("Content-Type", type);
    }

    // Set cache control for streaming chunks
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

    if (response.body) {
      // In Node 18, we can convert Web ReadableStream to arrayBuffer for compatibility,
      // or directly read chunk by chunk to prevent buffering latency.
      const buffer = await response.arrayBuffer();
      return res.send(Buffer.from(buffer));
    } else {
      const text = await response.text();
      return res.send(text);
    }
  } catch (err: any) {
    console.error("[STREAM PROXY EXCEPTION]:", err);
    return res.status(502).send(`IPTV Satellite Connection Refused or link dead. Code: ${err.message}`);
  }
});

app.put("/api/channels/:id", (req, res) => {
  const db = loadDB();
  const index = db.channels.findIndex((c: any) => c.id === req.params.id);
  if (index !== -1) {
    db.channels[index] = {
      ...db.channels[index],
      ...req.body
    };
    saveDB(db);
    res.json(db.channels[index]);
  } else {
    res.status(404).json({ error: "Channel not found" });
  }
});

app.delete("/api/channels/:id", (req, res) => {
  const db = loadDB();
  const initialLength = db.channels.length;
  db.channels = db.channels.filter((c: any) => c.id !== req.params.id);
  if (db.channels.length < initialLength) {
    saveDB(db);
    res.json({ success: true, message: "Channel successfully deleted" });
  } else {
    res.status(404).json({ error: "Channel not found" });
  }
});

// Categories API
app.get("/api/categories", (req, res) => {
  const db = loadDB();
  res.json(db.categories);
});

app.post("/api/categories", (req, res) => {
  const db = loadDB();
  const newCategory: Category = {
    id: `cat-${Date.now()}`,
    name: req.body.name || "New Category",
    slug: req.body.slug || "new-category",
    icon: req.body.icon || "Sparkles"
  };
  db.categories.push(newCategory);
  saveDB(db);
  res.status(201).json(newCategory);
});

app.put("/api/categories/:id", (req, res) => {
  const db = loadDB();
  const index = db.categories.findIndex((c: any) => c.id === req.params.id);
  if (index !== -1) {
    db.categories[index] = {
      ...db.categories[index],
      ...req.body,
      // generate safe slug
      slug: req.body.name ? req.body.name.toLowerCase().replace(/\s+/g, "-") : db.categories[index].slug
    };
    saveDB(db);
    res.json(db.categories[index]);
  } else {
    res.status(404).json({ error: "Category not found" });
  }
});

app.delete("/api/categories/:id", (req, res) => {
  const db = loadDB();
  const initialLength = db.categories.length;
  db.categories = db.categories.filter((c: any) => c.id !== req.params.id);
  if (db.categories.length < initialLength) {
    saveDB(db);
    res.json({ success: true, message: "Category deleted" });
  } else {
    res.status(404).json({ error: "Category not found" });
  }
});

// Plans API
app.get("/api/plans", (req, res) => {
  const db = loadDB();
  res.json(db.subscriptionPlans);
});

// Users API
app.get("/api/users", (req, res) => {
  const db = loadDB();
  res.json(db.users);
});

app.post("/api/users", (req, res) => {
  const db = loadDB();
  const newUser: User = {
    id: `usr-${Date.now()}`,
    username: req.body.username || "Client User",
    email: req.body.email || "",
    role: req.body.role || "user",
    subscriptionStatus: req.body.subscriptionStatus || "none",
    subscriptionExpiry: req.body.subscriptionExpiry || new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(),
    planType: req.body.planType || "Trial",
    avatarUrl: req.body.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop",
    isBlocked: false
  };
  db.users.push(newUser);
  saveDB(db);
  res.status(201).json(newUser);
});

app.put("/api/users/:id", (req, res) => {
  const db = loadDB();
  const index = db.users.findIndex((u: any) => u.id === req.params.id);
  if (index !== -1) {
    db.users[index] = {
      ...db.users[index],
      ...req.body
    };
    saveDB(db);
    res.json(db.users[index]);
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

app.delete("/api/users/:id", (req, res) => {
  const db = loadDB();
  const initialLength = db.users.length;
  // Admin prevention
  const targetUser = db.users.find((u: any) => u.id === req.params.id);
  if (targetUser && targetUser.role === "admin") {
    return res.status(403).json({ error: "Cannot delete the host administrator." });
  }
  db.users = db.users.filter((u: any) => u.id !== req.params.id);
  if (db.users.length < initialLength) {
    saveDB(db);
    res.json({ success: true, message: "User deleted" });
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

// Analytics Dashboard Endpoint
app.get("/api/analytics", (req, res) => {
  const db = loadDB();
  const channels: Channel[] = db.channels;
  const users: User[] = db.users;
  const categories: Category[] = db.categories;

  // Calculable numbers
  const totalChannels = channels.length;
  const totalCategories = categories.length;
  const activeUsers = users.filter(u => u.subscriptionStatus === "active").length;
  const activeViewersCount = channels.reduce((acc, current) => acc + (current.status === 'online' ? Math.floor(Math.random() * 45) + 12 : 0), 0) + 40;

  // Revenue estimation
  let revenueThisMonth = 0;
  users.forEach(u => {
    if (u.subscriptionStatus === 'active') {
      if (u.planType === 'VIP' || u.planType === 'Premium') revenueThisMonth += 24.99;
      else if (u.planType === 'Basic') revenueThisMonth += 9.99;
    }
  });

  const onlineCount = channels.filter(c => c.status === "online").length;
  const offlineCount = channels.length - onlineCount;

  // Distribution
  const categoryDistribution = categories.map(cat => {
    const count = channels.filter(ch => ch.categoryId === cat.id).length;
    return { name: cat.name, count };
  });

  // Dynamic analytic chart records
  const visitorHistory = [
    { date: "Jun 16", viewers: 120, streams: 4 },
    { date: "Jun 17", viewers: 180, streams: 5 },
    { date: "Jun 18", viewers: 240, streams: 5 },
    { date: "Jun 19", viewers: 195, streams: 6 },
    { date: "Jun 20", viewers: 310, streams: 6 },
    { date: "Jun 21", viewers: 420, streams: 7 },
    { date: "Jun 22", viewers: activeViewersCount, streams: onlineCount }
  ];

  const analytics: Analytics = {
    totalChannels,
    totalCategories,
    activeUsers,
    activeViewersCount,
    revenueThisMonth: parseFloat(revenueThisMonth.toFixed(2)),
    liveStatusCount: { online: onlineCount, offline: offlineCount },
    categoryDistribution,
    visitorHistory
  };

  res.json(analytics);
});

// Simulated HLS stream ping status updater (every 30 seconds to simulate a live system)
setInterval(() => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const db = loadDB();
      let updated = false;
      db.channels = db.channels.map((chan: Channel) => {
        // Randomly adjust views or toggle slightly to simulate live feed updates
        if (chan.status === "online") {
          const delta = Math.floor(Math.random() * 11) - 5;
          chan.views = Math.max(0, chan.views + delta);
          updated = true;
        }
        return chan;
      });
      if (updated) {
        saveDB(db);
      }
    }
  } catch (e) {
    // ignore
  }
}, 30000);

// ================= VITE INTEGRATION =================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`IPTV Streaming Service Server booting on http://0.0.0.0:${PORT}`);
  });
}

startServer();
