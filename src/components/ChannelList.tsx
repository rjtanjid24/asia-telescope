/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { 
  Search, 
  Tv, 
  Heart, 
  ChevronRight, 
  X, 
  Radio, 
  PlusCircle, 
  HelpCircle,
  Filter,
  ListFilter
} from "lucide-react";
import { Channel } from "../types";

interface ChannelListProps {
  channels: Channel[];
  selectedChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
  favorites: string[];
  onToggleFavorite: (channelId: string) => void;
}

export default function ChannelList({
  channels,
  selectedChannel,
  onSelectChannel,
  favorites,
  onToggleFavorite
}: ChannelListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [renderLimit, setRenderLimit] = useState(100);

  // Extract and count categories dynamically
  const categoriesWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalC = 0;
    
    channels.forEach(ch => {
      const cat = ch.category || "Other";
      counts[cat] = (counts[cat] || 0) + 1;
      totalC++;
    });

    // Sort by count descending
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    return [{ name: "ALL", count: totalC }, ...sorted];
  }, [channels]);

  // Filter channels based on search, category and favorites
  const filteredChannels = useMemo(() => {
    let result = channels;

    // Filter by favorites
    if (showOnlyFavorites) {
      result = result.filter(ch => favorites.includes(ch.id));
    }

    // Filter by category
    if (selectedCategory !== "ALL") {
      result = result.filter(ch => (ch.category || "Other") === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        ch => 
          ch.name.toLowerCase().includes(query) || 
          ch.category?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [channels, showOnlyFavorites, selectedCategory, searchQuery, favorites]);

  // Handle active item limit reset on filter changes
  useMemo(() => {
    setRenderLimit(100);
  }, [searchQuery, selectedCategory, showOnlyFavorites]);

  const visibleChannels = filteredChannels.slice(0, renderLimit);

  // Generate deterministic pastel gradients for channel icons failing to load
  const getRandomGradient = (name: string) => {
    const chars = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hues = [200, 220, 260, 280, 320, 340, 15, 140];
    const baseHue = hues[chars % hues.length];
    return `linear-gradient(135deg, hsl(${baseHue}, 70%, 30%), hsl(${(baseHue + 40) % 360}, 70%, 15%))`;
  };

  const getInitials = (name: string) => {
    const cleaned = name.replace(/[^\w\s]/g, "").trim();
    const parts = cleaned.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div id="channel-browser-module" className="flex flex-col h-full bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden shadow-lg shadow-black/50">
      
      {/* Top Search and Toggle header */}
      <div className="flex flex-col gap-3 p-4 border-b border-white/5 bg-[#0f0f0f]/95 backdrop-blur">
        
        {/* Search Input Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search channels, genres, feeds..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 bg-white/5 border border-white/10 hover:border-white/20 focus:border-blue-500/50 focus:outline-none rounded-xl text-xs text-neutral-200 transition placeholder-white/20 font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Favorite & Toggle Row */}
        <div className="flex items-center justify-between gap-2">
          
          <button
            onClick={() => setShowOnlyFavorites(prev => !prev)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition ${
              showOnlyFavorites
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : "bg-white/5 border-white/10 text-white/65 hover:bg-white/10"
            }`}>
            <Heart className={`w-3.5 h-3.5 ${showOnlyFavorites ? "fill-red-500" : ""}`} />
            <span>Starred Channels ({favorites.length})</span>
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-white/40 text-[10px] font-mono">
            <Radio className="w-3 h-3 text-blue-500 animate-pulse" />
            <span className="text-white/80 font-semibold">{filteredChannels.length}</span>
            <span>available</span>
          </div>
        </div>
      </div>

      {/* Ribbon for dynamic categories */}
      {categoriesWithCounts.length > 1 && (
        <div className="border-b border-white/5 bg-black/20 px-4 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <ListFilter className="w-3.5 h-3.5 text-white/35 shrink-0" />
          <div className="flex gap-1 overflow-x-auto scroller pb-1">
            {categoriesWithCounts.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-3 py-1 rounded-full text-[10px] font-medium font-sans whitespace-nowrap transition cursor-pointer flex items-center gap-1 border ${
                    isSelected 
                      ? "bg-blue-600 border-blue-500 text-white animate-fade-in" 
                      : "glass text-white/60 hover:text-white/90"
                  }`}>
                  <span>{cat.name}</span>
                  <span className={`text-[9px] font-mono opacity-60`}>({cat.count})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main scrolling items column (Grid system) */}
      <div className="flex-1 overflow-y-auto p-2 min-h-[300px] scroller">
        {visibleChannels.length > 0 ? (
          <>
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-3 gap-2">
              {visibleChannels.map((channel) => {
                const isActive = selectedChannel?.id === channel.id;
                const isStarred = favorites.includes(channel.id);
                
                return (
                  <div
                    key={channel.id}
                    onClick={() => onSelectChannel(channel)}
                    className={`group relative flex flex-col items-center justify-center p-3 rounded-xl border border-white/[0.04] transition duration-200 cursor-pointer select-none text-center ${
                      isActive
                        ? "bg-blue-600/15 border-blue-500/40 text-white shadow-md shadow-blue-500/15 active-channel"
                        : "bg-white/5 hover:bg-white/[0.08] hover:border-white/10 text-white/70 hover:text-white"
                    }`}>
                    
                    {/* Star Button overlay */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(channel.id);
                      }}
                      className={`absolute top-1.5 right-1.5 p-1 rounded-md opacity-0 group-hover:opacity-100 transition duration-150 ${
                        isStarred ? "opacity-100 text-red-500" : "text-neutral-500 hover:text-red-400"
                      }`}
                      title={isStarred ? "Unstar channel" : "Star channel"}>
                      <Heart className={`w-3.5 h-3.5 ${isStarred ? "fill-red-500 text-red-500" : ""}`} />
                    </button>

                    {/* Logo/Fallback icon centered */}
                    <div className="relative w-12 h-12 shrink-0 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center bg-white/5 mb-2">
                      {channel.logo ? (
                        <img
                          src={channel.logo}
                          alt={channel.name}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const placeholder = e.currentTarget.nextSibling as HTMLElement;
                            if (placeholder) placeholder.style.display = "flex";
                          }}
                          className="w-full h-full object-contain p-1"
                          referrerPolicy="no-referrer"
                        />
                      ) : null}

                      {/* Fallback initials generator */}
                      <div 
                        style={{ 
                          display: channel.logo ? "none" : "flex",
                          background: getRandomGradient(channel.name)
                        }}
                        className="absolute inset-0 items-center justify-center text-neutral-100 text-[10px] font-bold font-mono uppercase tracking-wider">
                        {getInitials(channel.name)}
                      </div>
                    </div>

                    {/* Metadata block */}
                    <div className="min-w-0 w-full flex flex-col items-center">
                      <div className="flex items-center justify-center gap-1.5 max-w-full">
                        <p className="text-[11px] sm:text-xs font-bold leading-tight truncate text-neutral-200 group-hover:text-neutral-100 transition">
                          {channel.name}
                        </p>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 shadow animate-pulse scale-125" />
                        )}
                      </div>
                      <span className="text-[9px] text-neutral-500 font-sans truncate block mt-1 max-w-full">
                        {channel.category || "General Broadcast"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination / Render Limit Load More Button */}
            {filteredChannels.length > renderLimit && (
              <button
                onClick={() => setRenderLimit(prev => prev + 100)}
                className="w-full py-3 mt-4 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs font-bold rounded-xl transition">
                Load More Channels (+100)
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Tv className="w-10 h-10 text-neutral-700 mb-3" />
            <p className="text-xs text-neutral-300 font-bold">No results found</p>
            <p className="text-[10px] text-neutral-500 max-w-[200px] mt-1 leading-normal">
              Try typing another query or switch categories to locate matching broadcasts.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
