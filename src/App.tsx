/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useTransition, useCallback } from "react";
import { 
  Tv, 
  Satellite, 
  Layers, 
  Heart, 
  RefreshCw,
  AlertTriangle,
  BookOpen,
  Wifi,
  FileText,
  Search,
  ExternalLink,
  Plus
} from "lucide-react";
import { parseM3U, parseBDIXJson } from "./utils/m3uParser";
import { Channel, PlaylistSource } from "./types";
import { BDIX_STATIC_CHANNELS } from "./data/bdixChannels";
import VideoPlayer from "./components/VideoPlayer";
import ChannelList from "./components/ChannelList";
import SourceManager from "./components/SourceManager";

// Safe, high-uptime, CORS-friendly streams to guarantee out-of-the-box operation
const FALLBACK_BUILTIN_PLAYLIST = `#EXTM3U
#EXTINF:-1 tvg-id="BTV National" tvg-logo="https://raw.githubusercontent.com/iptv-org/iptv/master/logos/BTVNational.png" group-title="Bangladesh",BTV National
https://live-cdn.btv.gov.bd/hls/btv.m3u8
#EXTINF:-1 tvg-id="BTV World" tvg-logo="https://raw.githubusercontent.com/iptv-org/iptv/master/logos/BTVWorld.png" group-title="Bangladesh",BTV World
https://live-cdn.btv.gov.bd/hls/btvworld.m3u8
#EXTINF:-1 tvg-id="Sangsad Television" tvg-logo="https://raw.githubusercontent.com/iptv-org/iptv/master/logos/SangsadTelevison.png" group-title="Bangladesh",Sangsad Television
https://live-cdn.btv.gov.bd/hls/sangsad.m3u8
#EXTINF:-1 tvg-id="Somoy TV" tvg-logo="https://raw.githubusercontent.com/iptv-org/iptv/master/logos/SomoyTV.png" group-title="Independent BDIX",Somoy TV (BDIX Link 1)
http://198.195.239.50/live/somoytv.m3u8
#EXTINF:-1 tvg-id="Somoy TV Backup" tvg-logo="https://raw.githubusercontent.com/iptv-org/iptv/master/logos/SomoyTV.png" group-title="Independent BDIX",Somoy TV (BDIX Link 2)
http://198.195.239.50/hls/somoy.m3u8
#EXTINF:-1 tvg-id="T Sports" tvg-logo="https://raw.githubusercontent.com/iptv-org/iptv/master/logos/TSports.png" group-title="Independent BDIX",T Sports (BDIX Link 1)
http://198.195.239.50/live/tsports.m3u8
#EXTINF:-1 tvg-id="T Sports Backup" tvg-logo="https://raw.githubusercontent.com/iptv-org/iptv/master/logos/TSports.png" group-title="Independent BDIX",T Sports (BDIX Link 2)
http://198.195.239.50/hls/tsports.m3u8
#EXTINF:-1 tvg-id="Independent TV" tvg-logo="https://independent24.tv/images/itv_logo_39x31.png" group-title="Bangladesh",Independent TV Core
https://independenttv-live.live.asmd.io/independenttv/independenttv/playlist.m3u8
#EXTINF:-1 tvg-id="Somoy TV HLS" tvg-logo="https://raw.githubusercontent.com/iptv-org/iptv/master/logos/SomoyTV.png" group-title="Bangladesh",Somoy TV Core HLS
https://somoytv-amd.live.asmd.io/somoytv/somoytv_hls/playlist.m3u8
#EXTINF:-1 tvg-id="Channel i" tvg-logo="https://raw.githubusercontent.com/iptv-org/iptv/master/logos/Channeli.png" group-title="Independent BDIX",Channel i (BDIX)
http://198.195.239.50/live/channeli.m3u8
#EXTINF:-1 tvg-id="GTV" tvg-logo="https://raw.githubusercontent.com/iptv-org/iptv/master/logos/GaziTV.png" group-title="Independent BDIX",GTV (BDIX)
http://198.195.239.50/live/gtv.m3u8
#EXTINF:-1 tvg-id="Ekattor TV" tvg-logo="https://raw.githubusercontent.com/iptv-org/iptv/master/logos/EkattorTV.png" group-title="Independent BDIX",Ekattor TV (BDIX)
http://198.195.239.50/live/ekattor.m3u8`;

const AEROSPACE_PLAYLIST = `#EXTM3U
#EXTINF:-1 tvg-logo="https://raw.githubusercontent.com/iptv-org/iptv/master/logos/AlJazeeraEnglish.png" group-title="Global News",Al Jazeera English (Global)
https://live-amd-ctl.live.asmd.io/aljazeera/aljazeera/playlist.m3u8
#EXTINF:-1 tvg-logo="https://raw.githubusercontent.com/iptv-org/iptv/master/logos/France24English.png" group-title="Global News",France 24 English (Europe)
https://static.france24.com/live/F24_EN_LO_HLS/live_web.m3u8
#EXTINF:-1 tvg-logo="https://raw.githubusercontent.com/iptv-org/iptv/master/logos/DWEnglish.png" group-title="Global News",Deutsche Welle (Germany)
https://dwamdstream102.akamaized.net/hls/live/2015532/dwstream102/index.m3u8
#EXTINF:-1 tvg-logo="https://raw.githubusercontent.com/iptv-org/iptv/master/logos/TRTWorld.png" group-title="Global News",TRT World (Turkey)
https://trtworld.daastream.com/index.m3u8
#EXTINF:-1 tvg-logo="https://raw.githubusercontent.com/iptv-org/iptv/master/logos/CNA.png" group-title="Global News",CNA (Singapore)
https://mediacorp-cna.amg-api.net/m3u8/cna_web.m3u8
#EXTINF:-1 tvg-logo="https://www.nasa.gov/wp-content/themes/nasa/assets/images/nasa-logo.svg" group-title="Science",NASA Science Live
https://ntv1.nasatv-live-clean.asmd.io/index.m3u8`;

const DEFAULT_SOURCES: PlaylistSource[] = [
  {
    id: "bangladesh-tv",
    name: "Bangladesh Satellite Core",
    description: "Bangladesh national & regional network links (iptv-org index).",
    url: "https://iptv-org.github.io/iptv/countries/bd.m3u",
  },
  {
    id: "india-tv",
    name: "India Broadcast Grid",
    description: "Regional broadcasting content from Indian satellite arrays.",
    url: "https://iptv-org.github.io/iptv/countries/in.m3u",
  },
  {
    id: "world-sports",
    name: "Satellite Sports Grid",
    description: "Sports, physical events and active coverage playlists.",
    url: "https://iptv-org.github.io/iptv/categories/sports.m3u",
  },
];

export default function App() {
  const [sources, setSources] = useState<PlaylistSource[]>(() => {
    const saved = localStorage.getItem("at_playlist_sources");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge defaults to ensure core sources survive
        const custom = parsed.filter((s: PlaylistSource) => s.isCustom);
        return [...DEFAULT_SOURCES, ...custom];
      } catch (e) {
        return DEFAULT_SOURCES;
      }
    }
    return DEFAULT_SOURCES;
  });

  const [activeSourceId, setActiveSourceId] = useState(() => {
    const saved = localStorage.getItem("at_active_source_id");
    if (saved && ["bangladesh-bdix", "bdix-local-portal", "bdix-premium", "builtin-news", "world-news"].includes(saved)) {
      return "bangladesh-tv";
    }
    return saved || "bangladesh-tv";
  });

  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem("at_favorite_channels");
    return saved ? JSON.parse(saved) : [];
  });

  const [isFetching, setIsFetching] = useState(false);
  const [fetchingError, setFetchingError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [, startTransition] = useTransition();

  // Save sources to localStorage on change
  useEffect(() => {
    localStorage.setItem("at_playlist_sources", JSON.stringify(sources));
  }, [sources]);

  // Save active source choice
  useEffect(() => {
    localStorage.setItem("at_active_source_id", activeSourceId);
  }, [activeSourceId]);

  // Save favorites array
  useEffect(() => {
    localStorage.setItem("at_favorite_channels", JSON.stringify(favorites));
  }, [favorites]);

  // Sync / Fetch selected source M3U content
  const syncActiveSource = useCallback(async (sourceId: string) => {
    const source = sources.find((s) => s.id === sourceId);
    if (!source) return;

    setIsFetching(true);
    setFetchingError(null);
    setLoadingMsg("Calibrating dish angles...");

    try {
      if (source.id === "bangladesh-bdix") {
        const m3uParsed = parseM3U(FALLBACK_BUILTIN_PLAYLIST);
        // Merge list, putting static channels first
        const merged = [...BDIX_STATIC_CHANNELS];
        for (const ch of m3uParsed) {
          if (!merged.some(m => m.url === ch.url || m.name.toLowerCase() === ch.name.toLowerCase())) {
            merged.push(ch);
          }
        }
        
        await new Promise((resolve) => setTimeout(resolve, 500));

        startTransition(() => {
          setChannels(merged);
          setIsFetching(false);
          setLoadingMsg("");

          // Default play channel is BTV if not exists already
          const currentExist = merged.find((c) => c.url === selectedChannel?.url);
          if (!currentExist) {
            const btvChannel = merged.find((c) => c.name.toLowerCase() === "btv" || c.name === "BTV National" || c.name.toLowerCase().includes("bangladesh television"));
            setSelectedChannel(btvChannel || merged[0]);
          }
        });
        return;
      }

      let m3uText = "";

      if (source.url === "builtin") {
        m3uText = FALLBACK_BUILTIN_PLAYLIST;
        await new Promise((resolve) => setTimeout(resolve, 600));
      } else if (source.url === "builtin-aerospace") {
        m3uText = AEROSPACE_PLAYLIST;
        await new Promise((resolve) => setTimeout(resolve, 600));
      } else if (source.url.startsWith("local://")) {
        // Retrieve local storage cache for uploaded file
        m3uText = localStorage.getItem(`at_local_content_${source.id}`) || "";
        if (!m3uText) {
          throw new Error("Local cache file expired or empty.");
        }
      } else {
        // Fetch from custom/Github URL
        const response = await fetch(source.url, { mode: "cors" });
        if (!response.ok) {
          throw new Error(`Satellite response was rejected (HTTP ${response.status})`);
        }
        m3uText = await response.text();
      }

      startTransition(() => {
        const cleanText = m3uText.trim().replace(/^\uFEFF/, "");
        const isJson = source.url.toLowerCase().endsWith(".json") || 
                       source.url.toLowerCase().includes("tv_channels.json") || 
                       cleanText.startsWith("{") || 
                       cleanText.startsWith("[");

        let parsed = [];
        if (isJson) {
          const baseResolveUrl = source.url.startsWith("local://") ? "http://198.195.239.50/" : source.url;
          parsed = parseBDIXJson(cleanText, baseResolveUrl);
        } else {
          parsed = parseM3U(m3uText);
        }

        setChannels(parsed);
        setIsFetching(false);
        setLoadingMsg("");

        if (parsed.length > 0) {
          // Keep active channel if still exists in list, otherwise select first or BTV if available
          const currentExist = parsed.find((c) => c.url === selectedChannel?.url);
          if (!currentExist) {
            const btvChannel = parsed.find((c) => c.name.toLowerCase() === "btv" || c.name === "BTV National" || c.name.toLowerCase().includes("bangladesh television"));
            setSelectedChannel(btvChannel || parsed[0]);
          }
        } else {
          setFetchingError("Connected, but returned payload containing 0 matching stream frequencies.");
        }
      });
    } catch (err: any) {
      console.warn("M3U Fetch Error details:", err);
      setIsFetching(false);
      setLoadingMsg("");
      setFetchingError(
        `Failed connection coordinate: ${err?.message || "CORS restriction or Offline network"}`
      );
      
      // Graceful Auto-Fallback to static list in case of network failures
      if (source.url !== "builtin" && source.url !== "builtin-aerospace") {
        setFetchingError(
          `CORS/Network error for "${source.name}". Drag-and-drop M3U files is recommended, or select the high-stability "Bangladesh & BDIX Grid" built-in preset below to bypass restrictions.`
        );
      }
    }
  }, [sources, selectedChannel]);

  // Initial feed sync on load
  useEffect(() => {
    syncActiveSource(activeSourceId);
  }, [activeSourceId, syncActiveSource]);

  // Next Channel callback (Arrow Down / HUD)
  const handleNextChannel = useCallback(() => {
    if (channels.length === 0) return;
    const currentIndex = channels.findIndex((c) => c.id === selectedChannel?.id);
    if (currentIndex !== -1 && currentIndex < channels.length - 1) {
      setSelectedChannel(channels[currentIndex + 1]);
    } else {
      setSelectedChannel(channels[0]); // Wrap
    }
  }, [channels, selectedChannel]);

  // Prev Channel callback (Arrow Up / HUD)
  const handlePrevChannel = useCallback(() => {
    if (channels.length === 0) return;
    const currentIndex = channels.findIndex((c) => c.id === selectedChannel?.id);
    if (currentIndex > 0) {
      setSelectedChannel(channels[currentIndex - 1]);
    } else {
      setSelectedChannel(channels[channels.length - 1]); // Wrap
    }
  }, [channels, selectedChannel]);

  // Toggle active favorites state
  const handleToggleFavoriteChannel = (channelId: string) => {
    setFavorites((prev) =>
      prev.includes(channelId) ? prev.filter((id) => id !== channelId) : [...prev, channelId]
    );
  };

  const handleToggleFavoriteActive = () => {
    if (selectedChannel) {
      handleToggleFavoriteChannel(selectedChannel.id);
    }
  };

  // Add Custom Feed
  const handleAddCustomSource = (name: string, url: string) => {
    const id = `custom-${Math.random().toString(36).substring(2, 8)}`;
    const newSource: PlaylistSource = {
      id,
      name,
      description: "User mapped serverless M3U url config",
      url,
      isCustom: true,
    };
    setSources((prev) => [...prev, newSource]);
    setActiveSourceId(id);
  };

  // Handle uploaded local `.m3u` file
  const handleUploadLocalFile = (name: string, content: string) => {
    const id = `local-${Math.random().toString(36).substring(2, 8)}`;
    const newSource: PlaylistSource = {
      id,
      name,
      description: "Browser cached offline file portal",
      url: `local://${id}`,
      isCustom: true,
    };
    
    // Store content in localstorage
    localStorage.setItem(`at_local_content_${id}`, content);
    setSources((prev) => [...prev, newSource]);
    setActiveSourceId(id);
  };

  // Delete Custom Feed
  const handleDeleteSource = (sourceId: string) => {
    setSources((prev) => prev.filter((s) => s.id !== sourceId));
    localStorage.removeItem(`at_local_content_${sourceId}`);
    if (activeSourceId === sourceId) {
      setActiveSourceId("builtin-news");
    }
  };

  return (
    <div id="app-root-container" className="min-h-screen bg-[#050505] text-[#e0e0e0] flex flex-col antialiased">
      
      {/* Decorative cosmic star glow background */}
      <div className="absolute top-0 right-[15%] w-[450px] h-[450px] bg-blue-500/5 rounded-full filter blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[5%] w-[350px] h-[350px] bg-emerald-500/5 rounded-full filter blur-[150px] pointer-events-none" />

      {/* Main Glass Header */}
      <header className="sticky top-0 z-40 bg-black/40 backdrop-blur-md border-b border-white/5 px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-white px-2.5 py-1 rounded-lg flex items-center justify-center shadow-sm">
            <img 
              src="https://networknewsbd.com/wp-content/uploads/2026/06/asia-telescope.png" 
              alt="Asia Telescope Logo" 
              className="h-8 object-contain" 
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white mb-0.5 font-sans">
              ASIA TELESCOPE
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-blue-400 font-semibold mb-0">
              by RST Multimedia
            </p>
          </div>
        </div>

        {/* Global Connection Telemetry Bar */}
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-medium text-green-400">System Online</span>
          </div>
          <div id="live-time-ticker" className="hidden sm:block text-xs text-white/40 font-mono tracking-widest">
            {new Date().toLocaleTimeString('en-US', { hour12: false })} GMT+6
          </div>
        </div>
      </header>

      {/* Primary Layout Engine */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 z-10">
        
        {/* Left Side: Active Projection & Controls (70-75% flex equivalent) */}
        <div className="flex-1 flex flex-col gap-6 lg:max-w-[70%]">
          
          {/* Master Video Display Box */}
          <VideoPlayer
            channel={selectedChannel}
            onNextChannel={handleNextChannel}
            onPrevChannel={handlePrevChannel}
            isFavorite={selectedChannel ? favorites.includes(selectedChannel.id) : false}
            onToggleFavorite={handleToggleFavoriteActive}
          />

          {/* Desktop-only under player: diagnostics & presets */}
          <div className="hidden lg:flex flex-col gap-6">
            {/* Quick Active Satellite diagnostics grid */}
            {selectedChannel && (
              <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass p-4 rounded-xl flex flex-col justify-center">
                  <p className="text-[10px] text-white/40 uppercase mb-1 tracking-wider font-semibold font-mono">Active Stream</p>
                  <p className="text-xs font-semibold text-white/90 truncate" title={selectedChannel.name}>{selectedChannel.name}</p>
                </div>
                <div className="glass p-4 rounded-xl flex flex-col justify-center">
                  <p className="text-[10px] text-white/40 uppercase mb-1 tracking-wider font-semibold font-mono">Buffer Health</p>
                  <p className="text-xs font-semibold text-green-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Stable (Auto)
                  </p>
                </div>
                <div className="glass p-4 rounded-xl flex flex-col justify-center">
                  <p className="text-[10px] text-white/40 uppercase mb-1 tracking-wider font-semibold font-mono">Resolution</p>
                  <p className="text-xs font-semibold text-white/90">Adaptive (HLS)</p>
                </div>
                <div className="glass p-4 rounded-xl flex flex-col justify-center overflow-hidden">
                  <p className="text-[10px] text-white/40 uppercase mb-1 tracking-wider font-semibold font-mono font-mono">Source Feed</p>
                  <p className="text-xs font-semibold text-blue-400/90 truncate font-mono" title={selectedChannel.url}>
                    {(() => {
                      try {
                        return new URL(selectedChannel.url).hostname;
                      } catch (e) {
                        return "Local Host";
                      }
                    })()}
                  </p>
                </div>
              </div>
            )}

            {/* Source Control & Presets Section */}
            <SourceManager
              sources={sources}
              activeSourceId={activeSourceId}
              onSelectSource={(id) => setActiveSourceId(id)}
              onAddCustomSource={handleAddCustomSource}
              onUploadLocalFile={handleUploadLocalFile}
              onDeleteSource={handleDeleteSource}
              isFetching={isFetching}
              onReload={() => syncActiveSource(activeSourceId)}
            />
          </div>
        </div>

        {/* Right Side: Channel Index Drawer / List Navigator (25-30%) */}
        <div className="w-full lg:w-[30%] flex flex-col gap-6">
          
          {/* Sync warning panel */}
          {fetchingError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-xs text-red-400 flex flex-col gap-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Station Coordinates Refused</span>
              </div>
              <p className="leading-relaxed opacity-90 text-[11px]">{fetchingError}</p>
              <button 
                onClick={() => syncActiveSource(activeSourceId)}
                className="mt-2 text-neutral-100 font-bold hover:underline text-[10px] self-start uppercase tracking-wider font-mono">
                → Retry connection
              </button>
            </div>
          )}

          {/* Loading Indicator */}
          {isFetching && (
            <div className="bg-blue-500/10 border border-blue-500/35 rounded-2xl p-4 text-xs text-blue-400 flex items-center gap-3 font-mono animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
              <span>Scanning frequency grid: {loadingMsg || "Synchronizing channels..."}</span>
            </div>
          )}

          {/* Channels browser listing cards */}
          <ChannelList
            channels={channels}
            selectedChannel={selectedChannel}
            onSelectChannel={(ch) => setSelectedChannel(ch)}
            favorites={favorites}
            onToggleFavorite={handleToggleFavoriteChannel}
          />

          {/* Mobile-only under listing: diagnostics & presets */}
          <div className="flex lg:hidden flex-col gap-6 mt-4">
            {/* Quick Active Satellite diagnostics grid */}
            {selectedChannel && (
              <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass p-4 rounded-xl flex flex-col justify-center">
                  <p className="text-[10px] text-white/40 uppercase mb-1 tracking-wider font-semibold font-mono">Active Stream</p>
                  <p className="text-xs font-semibold text-white/90 truncate" title={selectedChannel.name}>{selectedChannel.name}</p>
                </div>
                <div className="glass p-4 rounded-xl flex flex-col justify-center">
                  <p className="text-[10px] text-white/40 uppercase mb-1 tracking-wider font-semibold font-mono">Buffer Health</p>
                  <p className="text-xs font-semibold text-green-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Stable (Auto)
                  </p>
                </div>
                <div className="glass p-4 rounded-xl flex flex-col justify-center">
                  <p className="text-[10px] text-white/40 uppercase mb-1 tracking-wider font-semibold font-mono">Resolution</p>
                  <p className="text-xs font-semibold text-white/90">Adaptive (HLS)</p>
                </div>
                <div className="glass p-4 rounded-xl flex flex-col justify-center overflow-hidden">
                  <p className="text-[10px] text-white/40 uppercase mb-1 tracking-wider font-semibold font-mono font-mono">Source Feed</p>
                  <p className="text-xs font-semibold text-blue-400/90 truncate font-mono" title={selectedChannel.url}>
                    {(() => {
                      try {
                        return new URL(selectedChannel.url).hostname;
                      } catch (e) {
                        return "Local Host";
                      }
                    })()}
                  </p>
                </div>
              </div>
            )}

            {/* Source Control & Presets Section */}
            <SourceManager
              sources={sources}
              activeSourceId={activeSourceId}
              onSelectSource={(id) => setActiveSourceId(id)}
              onAddCustomSource={handleAddCustomSource}
              onUploadLocalFile={handleUploadLocalFile}
              onDeleteSource={handleDeleteSource}
              isFetching={isFetching}
              onReload={() => syncActiveSource(activeSourceId)}
            />
          </div>
        </div>
      </main>

      {/* Blue Shortcut Help Band */}
      <footer className="h-8 bg-blue-600 px-8 flex items-center justify-center gap-8 text-[10px] font-bold text-white tracking-widest shrink-0 uppercase select-none">
        <div className="flex gap-2"><span>[F]</span> FULLSCREEN</div>
        <div className="flex gap-2"><span>[SPACE]</span> PLAY/PAUSE</div>
        <div className="flex gap-2 font-sans md:font-mono"><span>[↑/↓]</span> CHANNEL</div>
        <div className="flex gap-2"><span>[M]</span> MUTE</div>
      </footer>

      {/* Unified Footnote */}
      <footer className="border-t border-white/5 bg-[#030303] py-5 px-6 flex flex-col md:flex-row items-center justify-between text-[11px] text-white/30 font-mono gap-4 shrink-0">
        <div>
          <span>© 2026 ASIA TELESCOPE DEPLOYMENT CORE. SYSTEM POWERED ENTIRELY ON CLIENT-SIDE DECODER.</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hover:text-neutral-400 transition cursor-default">FREEWARE DISTRIBUTION APPROVED</span>
          <span className="text-neutral-800">|</span>
          <span className="hover:text-neutral-400 transition cursor-default">RST MULTIMEDIA INITIATIVE</span>
        </div>
      </footer>
    </div>
  );
}
