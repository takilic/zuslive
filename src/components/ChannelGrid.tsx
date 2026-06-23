import { useState } from 'react';
import { Search, Play, Radio, Users, Sparkles, Filter, CheckCircle } from 'lucide-react';
import { Channel, Category } from '../types.ts';
import { motion } from 'motion/react';

interface ChannelGridProps {
  channels: Channel[];
  categories: Category[];
  selectedChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
}

export default function ChannelGrid({ channels, categories, selectedChannel, onSelectChannel }: ChannelGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filteredChannels = channels.filter(channel => {
    const matchesSearch = channel.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (channel.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = activeCategory === "all" || channel.categoryId === activeCategory;
    
    return matchesSearch && matchesCategory;
  });

  const featuredChannels = channels.filter(c => c.isFeatured && c.status === "online");

  return (
    <div className="w-full flex flex-col gap-8" id="channels-catalog-section">
      
      {/* Search Header Bar with glowing glass design */}
      <div className="w-full flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/40 p-4 rounded-2xl border border-slate-800/85 backdrop-blur-md">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="bg-red-500/10 p-2 rounded-xl border border-red-500/20 text-red-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-white">Live Broadcast Grid</h2>
            <p className="text-xs text-slate-400">Browse {channels.length} available satellite feeds</p>
          </div>
        </div>

        {/* Real-time search query input bar */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search TV stations, topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-950/80 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 text-slate-200 transition"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2 text-slate-500 hover:text-white text-xs pt-0.5 bg-slate-800 px-1/2 w-4 h-4 rounded-full"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Category Pills Slider Nav */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        <button
          onClick={() => setActiveCategory("all")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all duration-300 ${activeCategory === "all" ? 'bg-red-600 text-white shadow-lg shadow-red-600/20 scale-105' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800/80 hover:text-white'}`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>All Channels</span>
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all duration-300 ${activeCategory === cat.id ? 'bg-red-600 text-white shadow-lg shadow-red-600/20 scale-105' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800/80 hover:text-white'}`}
          >
            {cat.name === "Sports TV" && <span className="text-orange-400">&bull;&nbsp;Sports</span>}
            {cat.name === "Movies & Cinema" && <span className="text-purple-400">&bull;&nbsp;Movies</span>}
            {cat.name === "Global News" && <span className="text-blue-400">&bull;&nbsp;News</span>}
            {cat.name === "Entertainment" && <span className="text-green-400">&bull;&nbsp;Promo</span>}
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Featured Antenna Carousel on Home */}
      {activeCategory === "all" && !searchQuery && featuredChannels.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-red-500" />
            <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-slate-400">Featured Streams</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredChannels.slice(0, 3).map((chan) => (
              <div 
                key={`feat-${chan.id}`}
                onClick={() => onSelectChannel(chan)}
                className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 p-5 border cursor-pointer transition-all duration-300 hover:scale-[1.02] flex gap-4 ${selectedChannel?.id === chan.id ? 'border-red-500 glow-border' : 'border-slate-800/60 hover:border-slate-700'}`}
              >
                {/* Channel visual background */}
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-5 filter blur-sm transition-all group-hover:scale-110" 
                  style={{ backgroundImage: `url(${chan.logoUrl})` }}
                />
                
                <div className="relative w-16 h-16 flex-shrink-0">
                  <img 
                    src={chan.logoUrl} 
                    alt={chan.name}
                    className="w-full h-full object-cover rounded-xl border border-slate-700 shadow-md"
                  />
                  <div className="absolute -bottom-1.5 -right-1.5 bg-red-600 rounded-full p-1 border border-slate-950 animate-pulse">
                    <Play className="w-2.5 h-2.5 text-white fill-white ml-0.5" />
                  </div>
                </div>

                <div className="relative flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold tracking-wider font-display uppercase bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20">
                        Featured
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                        <Users className="w-2.5 h-2.5" />
                        {chan.views} live
                      </span>
                    </div>
                    <h4 className="font-display font-semibold text-white mt-1.5 text-sm group-hover:text-red-400 transition">
                      {chan.name}
                    </h4>
                    {chan.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-normal pr-2">
                        {chan.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Satellite grid displaying filter results */}
      <div className="flex flex-col gap-4">
        <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-slate-400">
          {searchQuery ? `Search Results (${filteredChannels.length})` : "General Direct Line Feed"}
        </h3>
        
        {filteredChannels.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/10 border border-slate-800/50 rounded-2xl flex flex-col items-center p-6">
            <Radio className="w-12 h-12 text-slate-700 animate-pulse mb-3" />
            <p className="text-slate-400 font-medium">No live channels matched your filter</p>
            <p className="text-xs text-slate-600 mt-1 max-w-sm">
              We couldn't locate any active streams for "{searchQuery || activeCategory}". Adjust your filters or browse category lists.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredChannels.map((chan, idx) => {
              const isSelected = selectedChannel?.id === chan.id;
              return (
                <motion.div
                  key={chan.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                  onClick={() => onSelectChannel(chan)}
                  className={`group relative flex flex-col overflow-hidden rounded-xl bg-slate-900/60 border cursor-pointer hover:scale-[1.04] transition-all duration-300 ${isSelected ? 'border-red-500 glow-border bg-slate-900/90' : 'border-slate-800 hover:border-slate-700'}`}
                  id={`channel-card-${chan.id}`}
                >
                  {/* Channel Cover Preview Thumbnail image */}
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-950 border-b border-slate-800/80">
                    <img 
                      src={chan.logoUrl} 
                      alt={chan.name} 
                      className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-90"
                    />
                    
                    {/* Dark gradient shadow */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                    {/* Online status indicator & live client view badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-md px-1.5 py-0.5 font-mono text-[9px]">
                      <span className={`w-1.5 h-1.5 rounded-full ${chan.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-slate-300 uppercase">{chan.status}</span>
                    </div>

                    {/* Quality badge of feed */}
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm border border-white/10 rounded px-1.5 py-0.5 text-[8px] font-bold tracking-tighter text-slate-400">
                      1080P FHD
                    </div>

                    {/* Hover full overlay with a Play button trigger */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-slate-950/40">
                      <div className="bg-red-600 rounded-full p-3 shadow-lg scale-90 group-hover:scale-100 transition duration-300">
                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Channel description content block */}
                  <div className="p-3.5 flex flex-col justify-between flex-1">
                    <div>
                      <h4 className="font-display text-xs font-semibold text-slate-100 group-hover:text-red-400 transition line-clamp-1">
                        {chan.name}
                      </h4>
                      {chan.description ? (
                        <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed mt-1">
                          {chan.description}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-600 italic mt-1">
                          No description provided for satellite channel.
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800/60 pt-2.5 mt-2.5">
                      <span className="text-[9px] text-slate-500 flex items-center gap-1 font-mono">
                        <Users className="w-2.5 h-2.5" />
                        {chan.views} viewers
                      </span>
                      {isSelected && (
                        <span className="text-[9px] text-red-400 flex items-center gap-1 font-semibold animate-pulse">
                          <CheckCircle className="w-2.5 h-2.5 text-red-400" /> Connecting...
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
