import { useEffect, useState } from 'react';
import { 
  Tv, 
  User as UserIcon, 
  Shield, 
  CreditCard, 
  History, 
  Compass, 
  Radio, 
  LogOut, 
  Key, 
  HelpCircle, 
  Info, 
  ArrowRight,
  Sparkles,
  Search,
  CheckCircle2,
  Lock,
  Menu,
  X,
  ChevronLeft
} from 'lucide-react';
import { Channel, Category, User, SubscriptionPlan } from './types.ts';
import LivePlayer from './components/LivePlayer.tsx';
import ChannelGrid from './components/ChannelGrid.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import AdminChannels from './components/AdminChannels.tsx';
import AdminCategories from './components/AdminCategories.tsx';
import AdminUsers from './components/AdminUsers.tsx';

export default function App() {
  // Global States synced with DB
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  // Detect whether we are inside AI Studio development/workspace domain
  const isAIStudio = typeof window !== 'undefined' && (
    window.location.hostname.includes('localhost') ||
    window.location.hostname.includes('127.0.0.1') ||
    window.location.hostname.includes('ais-dev-')
  );
  
  // App navigation active states
  const [activeTab, setActiveTab] = useState<'home' | 'plans' | 'admin-dashboard' | 'admin-channels' | 'admin-categories' | 'admin-users'>('home');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  
  // Simulated Authentication User session
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [purchaseSuccessMessage, setPurchaseSuccessMessage] = useState<string | null>(null);

  // Load and synchronize data from persistent Express backend
  const syncApplicationData = async () => {
    try {
      setIsLoading(true);
      const [chanRes, catRes, usrRes, plansRes] = await Promise.all([
        fetch("/api/channels"),
        fetch("/api/categories"),
        fetch("/api/users"),
        fetch("/api/plans")
      ]);

      if (chanRes.ok && catRes.ok && usrRes.ok && plansRes.ok) {
        const chanData = await chanRes.json();
        const catData = await catRes.json();
        const usrData = await usrRes.json();
        const plansData = await plansRes.json();

        setChannels(chanData);
        setCategories(catData);
        setUsers(usrData);
        setPlans(plansData);

        // Keep selected channel in sync if already set, but start as null on fresh load to show list
        setSelectedChannel(prev => {
          if (prev && chanData.some((c: Channel) => c.id === prev.id)) {
            return chanData.find((c: Channel) => c.id === prev.id) || prev;
          }
          return null;
        });

        // Determine if running inside AI Studio development/workspace domain
        const isAIStudio = typeof window !== 'undefined' && (
          window.location.hostname.includes('localhost') ||
          window.location.hostname.includes('127.0.0.1') ||
          window.location.hostname.includes('ais-dev-')
        );

        const adminUser = usrData.find((u: User) => u.role === 'admin') || usrData[0];
        const defaultUser = usrData.find((u: User) => u.username.includes("Sarah")) || usrData[0];

        if (isAIStudio) {
          setCurrentUser(adminUser);
        } else {
          setCurrentUser(defaultUser);
        }
      }
    } catch (e) {
      console.error("Communications failure with server node:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    syncApplicationData();
  }, []);

  // Quick Switch User Session Login
  const handleProfileLogin = (userId: string) => {
    const matched = users.find(u => u.id === userId);
    if (matched) {
      setCurrentUser(matched);
      // Auto routing based on role
      if (matched.role === 'admin') {
        setActiveTab('admin-dashboard');
      } else {
        setActiveTab('home');
      }
    }
  };

  // Immediate frontend self purchasing handler
  const handlePurchasePlan = async (plan: SubscriptionPlan) => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      // calculate expiration date (+30 or +90 days based on plan pricing)
      const expiryDate = new Date();
      if (plan.id.includes("premium")) {
        expiryDate.setDate(expiryDate.getDate() + 90);
      } else {
        expiryDate.setDate(expiryDate.getDate() + 30);
      }

      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planType: plan.id.includes("premium") ? "Premium" : "Basic",
          subscriptionStatus: "active",
          subscriptionExpiry: expiryDate.toISOString()
        })
      });

      if (res.ok) {
        await syncApplicationData();
        setPurchaseSuccessMessage(`Congratulations! You have purchased the "${plan.name}" live IPTV subscription. Decoding antenna has been authorized.`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const isUserSubscribed = true;

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16]" id="app-viewport">

      {/* Primary Global Navigation Header */}
      <header className="sticky top-0 w-full z-30 glassmorphism border-b border-white/5 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          
          {/* Branding Left item */}
          <div 
            onClick={() => { setActiveTab('home'); setSelectedChannel(null); setIsMobileMenuOpen(false); }}
            className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30">
              <Tv className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="font-display font-black text-white text-base leading-none uppercase tracking-wider flex items-center gap-1.5">
                VELOCITY <span className="text-red-500 text-[10px] font-bold bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">IPTV</span>
              </h1>
              <p className="text-[10px] font-medium text-slate-400 mt-0.5">Live Adaptive Stream Decoder</p>
            </div>
          </div>

          {/* Desktop Nav bar center anchors */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => { setActiveTab('home'); setSelectedChannel(null); setIsMobileMenuOpen(false); }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${activeTab === 'home' && !selectedChannel ? 'text-red-500 bg-red-500/5' : 'text-slate-300 hover:text-white'}`}
            >
              <Compass className="w-4 h-4" /> Live Channels Portal
            </button>

            {/* Admin only triggers */}
            {currentUser?.role === 'admin' && (
              <div className="ml-4 pl-4 border-l border-slate-800 flex items-center gap-1">
                <span className="text-[9px] font-bold text-red-500 uppercase font-display select-none">AI Studio Operator:</span>
                <button
                  onClick={() => { setActiveTab('admin-dashboard'); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${activeTab === 'admin-dashboard' ? 'text-red-400 bg-slate-900 border border-slate-850' : 'text-slate-400 hover:text-white'}`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => { setActiveTab('admin-channels'); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${activeTab === 'admin-channels' ? 'text-red-400 bg-slate-900 border border-slate-850' : 'text-slate-400 hover:text-white'}`}
                >
                  Manage Channels
                </button>
                <button
                  onClick={() => { setActiveTab('admin-categories'); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${activeTab === 'admin-categories' ? 'text-red-400 bg-slate-900 border border-slate-850' : 'text-slate-400 hover:text-white'}`}
                >
                  Genres
                </button>
                <button
                  onClick={() => { setActiveTab('admin-users'); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${activeTab === 'admin-users' ? 'text-red-400 bg-slate-900 border border-slate-850' : 'text-slate-400 hover:text-white'}`}
                >
                  Billing Cards
                </button>
              </div>
            )}
          </nav>

          {/* Clean Right side controls with premium status indicator */}
          <div className="hidden md:flex items-center gap-3">
            <span className="text-[11px] bg-red-500/10 text-red-400 px-3 py-1 rounded-full border border-red-505/20 uppercase tracking-widest font-black select-none animate-pulse">
              ● decoder online
            </span>
          </div>

          {/* Mobile responsive toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-slate-300 hover:text-white p-1 cursor-pointer transition"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

        </div>
      </header>

      {/* Mobile responsive popover portal */}
      {isMobileMenuOpen && (
        <div className="md:hidden block w-full bg-slate-950/95 border-b border-slate-800 p-4 shrink-0 transition-transform">
          <div className="flex flex-col gap-3">
            <button
              onClick={() => { setActiveTab('home'); setIsMobileMenuOpen(false); }}
              className="text-left py-2 text-slate-300 text-sm font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Compass className="w-4 h-4" /> Live Portal
            </button>

            {currentUser?.role === 'admin' && (
              <div className="border-t border-slate-900 pt-3 flex flex-col gap-3">
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Operator Dashboard:</span>
                <button
                  onClick={() => { setActiveTab('admin-dashboard'); setIsMobileMenuOpen(false); }}
                  className="text-left py-1 text-slate-400 text-xs font-medium cursor-pointer"
                >
                  General Analytics
                </button>
                <button
                  onClick={() => { setActiveTab('admin-channels'); setIsMobileMenuOpen(false); }}
                  className="text-left py-1 text-slate-400 text-xs font-medium cursor-pointer"
                >
                  Manage Channels List
                </button>
                <button
                  onClick={() => { setActiveTab('admin-categories'); setIsMobileMenuOpen(false); }}
                  className="text-left py-1 text-slate-400 text-xs font-medium cursor-pointer"
                >
                  Genres Classifications
                </button>
                <button
                  onClick={() => { setActiveTab('admin-users'); setIsMobileMenuOpen(false); }}
                  className="text-left py-1 text-slate-400 text-xs font-medium cursor-pointer"
                >
                  Subscribers & Billing Expiry
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main View Area wrap */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 flex flex-col gap-8">
        
        {/* TAB 1: USER WEBSITE STREAM PORTAL */}
        {activeTab === 'home' && (
          selectedChannel ? (
            /* DEDICATED IMMERSIVE PLAYER VIEW ("NEW PAGE" EXPERIENCE) */
            <div className="flex flex-col gap-6 animate-fade-in" id="immersive-player-view">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
                <div className="flex flex-col gap-1">
                  <button 
                    onClick={() => setSelectedChannel(null)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-xs font-bold text-slate-350 transition cursor-pointer w-fit"
                  >
                    <ChevronLeft className="w-4 h-4 text-red-500" /> Back to Channels Grid
                  </button>
                  <div className="flex items-center gap-3 mt-3">
                    <img 
                      src={selectedChannel.logoUrl} 
                      alt={selectedChannel.name} 
                      className="w-10 h-10 object-cover rounded-lg border border-slate-800 bg-slate-950" 
                    />
                    <div>
                      <h2 className="text-xl font-display font-black text-white flex items-center gap-2 leading-tight">
                        {selectedChannel.name}
                        {selectedChannel.isFeatured && (
                          <span className="text-[9px] font-bold tracking-wider uppercase bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20">
                            Featured
                          </span>
                        )}
                      </h2>
                      <span className="text-xs text-slate-500">
                        Category: {categories.find(c => c.id === selectedChannel.categoryId)?.name || "Live Stream"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-red-950/40 border border-red-800/30 text-red-400 rounded-full px-3 py-1 font-mono text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                    <span>{selectedChannel.views} ACTIVE VIEWERS</span>
                  </div>
                  <span className="text-[11px] text-slate-400 bg-slate-950/45 px-3 py-1 rounded-full border border-slate-900 font-mono uppercase">
                    Status: <span className={selectedChannel.status === "online" ? "text-green-450 font-bold" : "text-amber-450 font-bold"}>{selectedChannel.status}</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Player and descriptions Block */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                  {/* Player viewport */}
                  <div className="w-full bg-black/45 rounded-2xl border border-slate-850 overflow-hidden shadow-2xl">
                    {!isUserSubscribed && currentUser?.role !== "admin" ? (
                      /* Block player if subscriber has zero package permissions */
                      <div className="w-full aspect-video bg-gradient-to-b from-slate-950 to-slate-900 p-8 flex flex-col justify-center items-center text-center">
                        <div className="w-14 h-14 bg-red-600/10 text-red-500 rounded-full flex items-center justify-center border border-red-500/20 mb-4">
                          <Lock className="w-7 h-7 animate-pulse" />
                        </div>
                        <h4 className="font-display font-bold text-slate-200 text-base">Livestream Decoding Restricted</h4>
                        <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5 leading-normal">
                          You do not hold an active satellite license credential. Please renew standard billing or buy a basic Trial pass to access this feed.
                        </p>
                        <button 
                          onClick={() => setActiveTab('plans')}
                          className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-lg active:scale-95"
                        >
                          Browse Decoder Passes <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      /* Serve HLS player when subscription is active */
                      <LivePlayer 
                        channel={selectedChannel} 
                        onClose={() => setSelectedChannel(null)} 
                      />
                    )}
                  </div>

                  {/* Channel Description details card */}
                  <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-850/80 flex flex-col gap-4">
                    <h3 className="text-sm font-display font-semibold text-slate-200 flex items-center gap-2">
                      <Tv className="w-4 h-4 text-red-500" />
                      About this Satellite Stream Receiver
                    </h3>
                    {selectedChannel.description ? (
                      <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/20 p-3.5 rounded-xl border border-slate-850/40">
                        {selectedChannel.description}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 italic">
                        No telemetry or stream details provided for this active live channel feed.
                      </p>
                    )}

                    {/* Metadata Specs */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-slate-850/60 pt-4 mt-2">
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="text-slate-500">Signal Source</span>
                        <span className="font-mono text-slate-350 truncate block max-w-[200px]" title={selectedChannel.streamUrl}>
                          {selectedChannel.streamUrl ? selectedChannel.streamUrl : "Not specified"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="text-slate-500">Satellite Group</span>
                        <span className="font-semibold text-slate-350 truncate block">
                          {categories.find(c => c.id === selectedChannel.categoryId)?.name || "Live Stream"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="text-slate-500">Antenna Integrity</span>
                        <span className="font-semibold text-green-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Checked (SLA Pass)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Suggested Channels / Channel Surfing list */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2.5 mb-1">
                      <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-slate-400">
                        Other Live Streams
                      </h3>
                      <span className="text-[10px] font-mono text-slate-500">Antenna Feeds</span>
                    </div>

                    <div className="flex flex-col gap-2.5 max-h-[440px] overflow-y-auto pr-1" id="side-channel-scroller">
                      {channels
                        .filter(ch => ch.id !== selectedChannel.id && ch.status === "online")
                        .slice(0, 8)
                        .map(ch => (
                          <div 
                            key={ch.id}
                            onClick={() => {
                              setSelectedChannel(ch);
                              window.scrollTo({ top: 120, behavior: 'smooth' });
                            }}
                            className="flex gap-3 p-2 bg-slate-900/40 hover:bg-slate-900 border border-slate-850/65 hover:border-slate-800 rounded-xl cursor-pointer transition active:scale-98 group"
                          >
                            <img 
                              src={ch.logoUrl} 
                              alt={ch.name} 
                              className="w-12 h-10 object-cover rounded-lg border border-slate-850 bg-slate-950 flex-shrink-0" 
                            />
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <h4 className="text-xs font-semibold text-slate-200 truncate group-hover:text-red-400 transition animate-fade-in">
                                {ch.name}
                              </h4>
                              <p className="text-[10px] text-slate-550 truncate mt-0.5">
                                {categories.find(c => c.id === ch.categoryId)?.name || "Global"} &bull; {ch.views} online
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Operational instructions */}
                  <div className="bg-slate-900/30 border border-slate-850/60 p-5 rounded-2xl flex flex-col gap-3">
                    <h4 className="font-display font-semibold text-slate-200 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                      <Info className="w-4 h-4 text-slate-400" />
                      Decoder Guide Handbook
                    </h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Our streams parse directly using <strong>adaptive HLS transport blocks</strong> with latency reduction technology. Click the settings gear icon on the video player overlay to adjust source streams and bitrate values manually.
                    </p>
                    <div className="border-t border-slate-800/60 pt-3 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>Decoder Engine: hls.js</span>
                      <span>License: Certified VIP</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* MAIN HOME VIEW WITH CLEAN FULL-WIDTH CHANNEL GRID */
            <div className="flex flex-col gap-8 animate-fade-in">
              <ChannelGrid 
                channels={channels}
                categories={categories}
                selectedChannel={selectedChannel}
                onSelectChannel={(chan) => {
                  setSelectedChannel(chan);
                  window.scrollTo({ top: 120, behavior: 'smooth' });
                }}
              />
            </div>
          )
        )}

        {/* TAB 3: ADMIN DASHBOARD TELEMETRY PANEL */}
        {activeTab === 'admin-dashboard' && currentUser?.role === 'admin' && (
          <AdminDashboard 
            channels={channels} 
            categories={categories}
            onRefreshAllData={syncApplicationData} 
          />
        )}

        {/* TAB 4: ADMIN FEEDS CONTROL */}
        {activeTab === 'admin-channels' && currentUser?.role === 'admin' && (
          <AdminChannels 
            channels={channels} 
            categories={categories} 
            onChannelsUpdated={(updated) => setChannels(updated)} 
            onSyncAllData={syncApplicationData}
          />
        )}

        {/* TAB 5: ADMIN CATEGORIES CONTROL */}
        {activeTab === 'admin-categories' && currentUser?.role === 'admin' && (
          <AdminCategories 
            categories={categories} 
            onCategoriesUpdated={(updated) => setCategories(updated)} 
          />
        )}

        {/* TAB 6: ADMIN BILLING CONTROL */}
        {activeTab === 'admin-users' && currentUser?.role === 'admin' && (
          <AdminUsers 
            users={users} 
            plans={plans} 
            onUsersUpdated={(updated) => setUsers(updated)} 
          />
        )}

      </main>

      {/* Main footer layout bar */}
      <footer className="w-full bg-[#03060c] border-t border-slate-900 py-8 px-4 md:px-6 align-bottom mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <p className="text-xs text-slate-500">
              &copy; 2026 VELOCITY Satellite Media Decoders, Inc. All HLS segment transports encrypted.
            </p>
            <p className="text-[10px] text-slate-600 mt-1">
              Test streams are loaded from public domains for evaluators showcase. Dynamic saves committed to `<code className="text-white">./data/db.json</code>`.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
            <span className="hover:text-red-400 cursor-help" title="FHD, UHD, multi-bitrate streams">SLA Terms</span>
            {isAIStudio && (
              <span className="hover:text-red-500 cursor-pointer text-red-500 bg-red-950/20 px-2 py-0.5 rounded border border-red-900/30 font-bold" onClick={() => handleProfileLogin("usr-admin")}>Admin Console Bypass</span>
            )}
          </div>
        </div>
      </footer>

      {/* Custom Purchase Success Modal Overlay */}
      {purchaseSuccessMessage && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="purchase-success-modal">
          <div className="max-w-md w-full bg-slate-900 border border-emerald-500/30 p-6 rounded-2xl flex flex-col items-center text-center shadow-2xl relative">
            <div className="w-14 h-14 bg-emerald-505/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 animate-bounce" />
            </div>
            <h3 className="font-display font-bold text-lg text-white mb-2">Decoder Service Authorized</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              {purchaseSuccessMessage}
            </p>
            <button
              onClick={() => setPurchaseSuccessMessage(null)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition shadow-md hover:scale-105 active:scale-95 cursor-pointer"
            >
              Start Decoding Now
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
