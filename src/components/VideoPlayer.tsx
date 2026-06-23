/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  AlertCircle, 
  Tv, 
  Loader2, 
  Settings,
  HelpCircle,
  Clock,
  Heart,
  Network,
  Cpu,
  Radio,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from "lucide-react";
import { Channel } from "../types";

interface VideoPlayerProps {
  channel: Channel | null;
  onNextChannel: () => void;
  onPrevChannel: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export default function VideoPlayer({
  channel,
  onNextChannel,
  onPrevChannel,
  isFavorite,
  onToggleFavorite
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("at_player_volume");
    return saved ? parseFloat(saved) : 0.8;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [streamInfo, setStreamInfo] = useState<{
    type?: string;
    resolution?: string;
    latency?: string;
  }>({});
  const [levels, setLevels] = useState<{ id: number; name: string }[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1);

  const controlsTimeoutRef = useRef<number | null>(null);

  // Restart control display countdown
  const triggerShowControls = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying && !errorMsg) {
        setShowControls(false);
      }
    }, 3000);
  };

  // Setup stream source
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !channel) return;

    setErrorMsg(null);
    setIsLoading(true);
    setIsPlaying(false);
    setStreamInfo({});
    setLevels([]);
    setCurrentLevel(-1);

    // Cleanup previous hls instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const streamUrl = channel.url;

    // Direct check for HLS.js support or native browser HLS
    if (Hls.isSupported()) {
      const hls = new Hls({
        maxMaxBufferLength: 10,
        enableWorker: false,
        lowLatencyMode: true,
        backBufferLength: 0,
      });

      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsLoading(false);
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch(() => {
              // Handle autoplay restrictions
              setIsPlaying(false);
            });
        }
        
        // Populate stream resolution if available
        if (hls.levels && hls.levels.length > 0) {
          const highestLevel = hls.levels[hls.levels.length - 1];
          setStreamInfo({
            type: "HLS Client Engine",
            resolution: highestLevel.height ? `${highestLevel.width}x${highestLevel.height}` : "Auto Detect",
          });

          // Map levels to readable tags
          const formattedLevels = hls.levels.map((lvl, index) => {
            const height = lvl.height || 0;
            const width = lvl.width || 0;
            const bitrateRounded = lvl.bitrate ? ` (${Math.round(lvl.bitrate / 1000)}k)` : "";
            const label = height > 0 ? `${height}p${bitrateRounded}` : width > 0 ? `${width}w${bitrateRounded}` : `Level ${index + 1}${bitrateRounded}`;
            return { id: index, name: label };
          });
          setLevels(formattedLevels);
          setCurrentLevel(hls.currentLevel);
        } else {
          setStreamInfo({ type: "HLS Client Engine", resolution: "Standard Adaptive" });
          setLevels([]);
          setCurrentLevel(-1);
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const activeLevelIndex = data.level;
        const currentLvl = hls.levels[activeLevelIndex];
        if (currentLvl) {
          setStreamInfo(prev => ({
            ...prev,
            resolution: currentLvl.height ? `${currentLvl.width}x${currentLvl.height}` : prev.resolution,
          }));
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn("HLS Network error:", data);
              hls.startLoad(); // Try loading source again
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn("HLS Media error, trying to recover...", data);
              hls.recoverMediaError();
              break;
            default:
              console.error("Unrecoverable stream error:", data);
              setErrorMsg(
                "This broadcast is currently offline, geo-restricted, or has returned an unsupported content-type."
              );
              setIsLoading(false);
              setIsPlaying(false);
              hls.destroy();
              break;
          }
        }
      });

    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Fallback for native HLS support (Safari, iOS Chrome/Firefox)
      video.src = streamUrl;
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
        video.play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
        setStreamInfo({ type: "Native Apple Core (HLS)", resolution: "Retina Default" });
      });

      video.addEventListener("error", (e) => {
        setErrorMsg("Native player failed to load this stream. The channel source may be offline.");
        setIsLoading(false);
        setIsPlaying(false);
      });
    } else {
      setIsLoading(false);
      setErrorMsg("Your web browser does not support HLS streaming natively and HLS.js is unavailable.");
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [channel]);

  // Volume & Mute adjustments
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = isMuted ? 0 : volume;
    video.muted = isMuted;
    localStorage.setItem("at_player_volume", volume.toString());
  }, [volume, isMuted]);

  // Keep tracks of screen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Keyboard shortcut handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid key trigger if typing inside inputs
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" || target?.tagName === "SELECT" || target?.tagName === "TEXTAREA") {
        return;
      }

      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          setIsMuted(prev => !prev);
          triggerShowControls();
          break;
        case "arrowup":
          e.preventDefault();
          onPrevChannel();
          break;
        case "arrowdown":
          e.preventDefault();
          onNextChannel();
          break;
        case "arrowleft":
          e.preventDefault();
          setVolume(prev => Math.max(0, prev - 0.1));
          setIsMuted(false);
          triggerShowControls();
          break;
        case "arrowright":
          e.preventDefault();
          setVolume(prev => Math.min(1, prev + 0.1));
          setIsMuted(false);
          triggerShowControls();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPlaying, volume, isMuted, channel, onNextChannel, onPrevChannel]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || !channel || errorMsg) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
    triggerShowControls();
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!video) return;

    const isCurrentlyFull = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);

    if (!isCurrentlyFull) {
      if (container && container.requestFullscreen) {
        container.requestFullscreen()
          .then(() => {
            setIsFullscreen(true);
            try {
              if (screen.orientation && (screen.orientation as any).lock) {
                (screen.orientation as any).lock("landscape").catch((e: any) => console.log("Orientation lock issue:", e));
              }
            } catch (e) {}
          })
          .catch(() => {
            if ((video as any).webkitEnterFullscreen) {
              try {
                (video as any).webkitEnterFullscreen();
                setIsFullscreen(true);
              } catch (e) {
                console.error("webkitEnterFullscreen error:", e);
              }
            }
          });
      } else if ((video as any).webkitEnterFullscreen) {
        try {
          (video as any).webkitEnterFullscreen();
          setIsFullscreen(true);
        } catch (e) {
          console.error("webkitEnterFullscreen error:", e);
        }
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false));
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleLevelChange = (levelId: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelId;
      setCurrentLevel(levelId);
      
      if (levelId === -1) {
        const activeIdx = hlsRef.current.currentLevel;
        const currentLvl = hlsRef.current.levels[activeIdx];
        setStreamInfo(prev => ({
          ...prev,
          resolution: currentLvl && currentLvl.height
            ? `${currentLvl.width}x${currentLvl.height} (Auto)`
            : "Adaptive (Auto)"
        }));
      } else {
        const lvl = hlsRef.current.levels[levelId];
        if (lvl) {
          setStreamInfo(prev => ({
            ...prev,
            resolution: lvl.height ? `${lvl.width}x${lvl.height}` : `Level ${levelId + 1}`
          }));
        }
      }
    }
  };



  return (
    <div id="video-display-module" className="flex flex-col w-full gap-4">
      {/* Absolute Cosmic Glow Backdrop (Theater Ambience) */}
      <div className="relative w-full aspect-video video-surface rounded-2xl border border-white/5 overflow-hidden shadow-2xl shadow-black/80 group flex items-center justify-center"
           ref={containerRef}
           onMouseMove={triggerShowControls}
           onMouseLeave={() => isPlaying && !errorMsg && setShowControls(false)}
           onClick={togglePlay}>
        
        {/* Soft Radial Satellite Glow aligned behind video player */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-blue-500/5 rounded-full filter blur-[120px] pointer-events-none" />
        
        {channel ? (
          <>
            {/* The Video Node */}
            <video
              id="raw-stream-player"
              ref={videoRef}
              className="w-full h-full max-h-full object-contain z-10"
              style={{ display: errorMsg ? "none" : "block" }}
              playsInline
              onClick={(e) => {
                e.stopPropagation(); // Parent handles toggling
                togglePlay();
              }}
            />

            {/* Overlay HUD at top-left */}
            <div className="absolute top-3 left-3 md:top-6 md:left-6 flex gap-1.5 md:gap-3 z-20 pointer-events-none">
              <span className="px-1.5 py-0.5 md:px-3 md:py-1 glass rounded-md text-[9px] md:text-xs font-bold text-white flex items-center gap-1 md:gap-1.5 shadow animate-pulse">
                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500 glow-dot"></span> LIVE
              </span>
              <span className="px-1.5 py-0.5 md:px-3 md:py-1 glass rounded-md text-[9px] md:text-sm font-medium text-white/85 uppercase tracking-widest shadow truncate max-w-[130px] sm:max-w-none">
                {channel.name}
              </span>
            </div>

            {/* Graceful Stream Loading Spinner Overlay */}
            {isLoading && (
              <div id="player-loading-hud" className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 pointer-events-none">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <p className="text-neutral-300 font-medium tracking-wide">Calibrating Lens...</p>
                <p className="text-neutral-500 text-xs mt-1 font-mono">{channel.name}</p>
              </div>
            )}

            {/* Offline/Error Graceful Alert Screen Overlay */}
            {errorMsg && (
              <div id="player-offline-hud" className="absolute inset-0 bg-neutral-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20"
                   onClick={(e) => e.stopPropagation()}>
                <AlertCircle className="w-16 h-16 text-yellow-500 mb-4 animate-bounce" />
                <h3 className="text-lg font-bold text-neutral-100 tracking-tight">
                  {window.location.protocol === "https:" && channel.url.startsWith("http://") 
                    ? "Insecure Stream Blocked by Browser" 
                    : "Stream Currently Offline"}
                </h3>
                <p className="text-neutral-400 text-sm max-w-md mt-2 leading-relaxed">
                  {window.location.protocol === "https:" && channel.url.startsWith("http://")
                    ? "Your browser blocks insecure HTTP streams on secure HTTPS sites (Mixed Content restriction). Since this stream runs on port 8095 (HTTP), you must allow insecure content to watch it."
                    : errorMsg}
                </p>
                
                {window.location.protocol === "https:" && channel.url.startsWith("http://") ? (
                  <div className="mt-5 flex flex-col gap-2 text-xs bg-blue-950/45 border border-blue-500/30 p-4 rounded-xl max-w-md text-left text-neutral-300">
                    <span className="text-blue-400 block font-semibold mb-1">💡 How to fix in Chrome / Edge / Brave:</span>
                    <p className="mb-1 leading-normal">
                      1. Click the <strong className="text-white">identity/settings icon</strong> (tune/lock icon on the left of the URL bar).
                    </p>
                    <p className="mb-1 leading-normal">
                      2. Open <strong className="text-white">Site Settings</strong>.
                    </p>
                    <p className="mb-1 leading-normal">
                      3. Find <strong className="text-white">Insecure content</strong> and set it to <strong className="text-white text-green-400 font-bold">"Allow"</strong>.
                    </p>
                    <p className="leading-normal">
                      4. <strong className="text-white underline">Refresh this page</strong> and play the channel!
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 flex gap-3 text-xs bg-neutral-900 border border-neutral-800 p-4 rounded-xl max-w-sm font-mono text-left text-neutral-400">
                    <div className="flex-1">
                      <span className="text-neutral-300 block font-semibold mb-1">Troubleshooting:</span>
                      • Try updating the playlist source<br/>
                      • Select other channels from the sidebar<br/>
                      • Check if you require a VPN/BDIX link
                    </div>
                  </div>
                )}
              </div>
            )}

            <div id="player-hud-overlay" className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-neutral-950/95 via-neutral-950/50 to-transparent p-2 md:p-4 pb-2.5 sm:pb-5 transition-opacity duration-300 flex flex-col gap-1.5 md:gap-3 ${
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            }`} onClick={(e) => e.stopPropagation()}>
              
              {/* Channel Meta Ribbon */}
              <div className="flex items-center justify-between pointer-events-auto">
                <div className="flex items-center gap-2 sm:gap-3">
                  {channel.logo ? (
                    <img 
                      src={channel.logo} 
                      alt={channel.name} 
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      className="w-7 h-7 sm:w-10 sm:h-10 object-contain rounded-md bg-neutral-900/80 p-0.5 sm:p-1 border border-neutral-800 shadow shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-md bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center border border-neutral-700 shrink-0">
                      <Tv className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-neutral-100 tracking-tight truncate max-w-[120px] xs:max-w-[180px] sm:max-w-none">{channel.name}</h4>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] uppercase font-mono bg-red-500/15 text-red-400 border border-red-500/20 font-bold shrink-0 animate-pulse">
                        <span className="w-1 h-1 rounded-full bg-red-400" />
                        Live
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-neutral-400 mt-0.5 font-sans hidden sm:block">
                      {channel.category || "General Broadcast"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={onToggleFavorite}
                    className={`p-1.5 md:p-2 rounded-lg border transition-colors shrink-0 ${
                      isFavorite 
                        ? "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20" 
                        : "bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:bg-neutral-800"
                    }`}
                    title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}>
                    <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-red-500" : ""}`} />
                  </button>
                  <button 
                    onClick={() => setShowKeyboardHelp(prev => !prev)}
                    className={`p-1.5 md:p-2 rounded-lg border transition-colors shrink-0 hidden sm:block ${
                      showKeyboardHelp 
                        ? "bg-blue-500/10 border-blue-500/30 text-blue-400" 
                        : "bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:bg-neutral-800"
                    }`}
                    title="Keyboard Hotkeys Manual">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress-less Control Ribbon */}
              <div className="flex items-center justify-between border-t border-neutral-800/60 pt-2 md:pt-3">
                {/* Play, Volume, and Info Section */}
                <div className="flex items-center gap-2 sm:gap-4 font-mono">
                  <button
                    onClick={togglePlay}
                    disabled={!!errorMsg}
                    className="p-1.5 sm:p-2.5 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-neutral-950 transition shadow-lg shadow-blue-500/20 flex items-center justify-center shrink-0"
                    aria-label={isPlaying ? "Pause" : "Play"}>
                    {isPlaying ? <Pause className="w-3.5 h-3.5 fill-neutral-950" /> : <Play className="w-3.5 h-3.5 fill-neutral-950" />}
                  </button>

                  {/* Volume Control */}
                  <div className="flex items-center gap-1 bg-neutral-900/60 p-1 sm:px-3 sm:py-1.5 rounded-xl border border-neutral-800/40 shrink-0">
                    <button
                      onClick={() => setIsMuted(prev => !prev)}
                      className="text-neutral-400 hover:text-neutral-200 transition p-0.5"
                      aria-label={isMuted ? "Unmute" : "Mute"}>
                      {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-500" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        setVolume(parseFloat(e.target.value));
                        setIsMuted(false);
                      }}
                      className="w-12 sm:w-16 md:w-24 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hidden sm:block"
                    />
                  </div>

                  {/* Quality / Resolution Controller dropdown */}
                  {levels.length > 0 ? (
                    <div className="flex items-center gap-1 sm:gap-1.5 bg-neutral-900/60 px-1.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-neutral-800/40 font-mono text-[9px] sm:text-[10px] text-neutral-400 shrink-0">
                      <Settings className="w-3 h-3 text-blue-500 animate-spin-slow shrink-0 animate-duration-1000" />
                      <span className="text-neutral-500 font-semibold uppercase tracking-wider select-none shrink-0 text-[8px] sm:text-[10px] hidden sm:inline">Quality:</span>
                      <div className="relative flex items-center" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={currentLevel}
                          onChange={(e) => handleLevelChange(parseInt(e.target.value))}
                          className="bg-transparent text-neutral-200 focus:outline-none cursor-pointer pr-3 sm:pr-4 font-mono font-bold border-none appearance-none text-[9px] sm:text-[10px]"
                        >
                          <option value="-1" className="bg-[#0f0f0f] text-neutral-300">Auto</option>
                          {levels.map((lvl) => (
                            <option key={lvl.id} value={lvl.id} className="bg-[#0f0f0f] text-white">
                              {lvl.name.replace(/\s*\(.*\)/, "")}
                            </option>
                          ))}
                        </select>
                        <span className="text-[7px] text-neutral-500 pointer-events-none absolute right-0">▼</span>
                      </div>
                      
                      {streamInfo.resolution && (
                        <>
                          <span className="text-neutral-700 mx-1 select-none hidden sm:inline">|</span>
                          <span className="text-neutral-300 select-none hidden sm:inline">{streamInfo.resolution}</span>
                        </>
                      )}
                    </div>
                  ) : streamInfo.resolution ? (
                    <div className="hidden xs:flex items-center gap-1 sm:gap-2 bg-neutral-900/60 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-neutral-800/40 font-mono text-[9px] sm:text-[10px] text-neutral-400 shrink-0">
                      <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-green-500" />
                      <span className="truncate max-w-[50px] sm:max-w-none">{streamInfo.resolution}</span>
                    </div>
                  ) : null}
                </div>

                {/* Device Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={toggleFullscreen}
                    className="p-1.5 sm:p-2 rounded-lg bg-neutral-900/60 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800/40 transition"
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                    {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Float Overlay for Hotkeys Manual */}
            {showKeyboardHelp && (
              <div id="hotkeys-manual-popup" className="absolute top-4 left-4 bg-neutral-950/95 backdrop-blur border border-neutral-800 rounded-xl p-4 text-xs z-30 max-w-[260px] text-neutral-300 font-sans shadow-xl shadow-black/80"
                   onClick={(e) => e.stopPropagation()}>
                <span className="block font-bold text-blue-400 text-sm mb-2 font-mono">Telescope Shortcuts</span>
                <ul className="space-y-1.5 font-mono text-[11px]">
                  <li className="flex justify-between gap-4"><span className="text-neutral-400">[Space]</span> <span>Play/Pause</span></li>
                  <li className="flex justify-between gap-4"><span className="text-neutral-400">[F Key]</span> <span>Fullscreen</span></li>
                  <li className="flex justify-between gap-4"><span className="text-neutral-400">[M Key]</span> <span>Mute Audio</span></li>
                  <li className="flex justify-between gap-4"><span className="text-neutral-400">[↑ / ↓]</span> <span>Prev / Next TV</span></li>
                  <li className="flex justify-between gap-4"><span className="text-neutral-400">[← / →]</span> <span>Volume Down/Up</span></li>
                </ul>
                <button 
                  onClick={() => setShowKeyboardHelp(false)}
                  className="mt-3 w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 py-1 rounded text-[10px] font-mono transition">
                  Dismiss Manual
                </button>
              </div>
            )}
          </>
        ) : (
          <div id="player-welcome-splash" className="flex flex-col items-center justify-center text-center p-8 z-10 select-none">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600/10 to-emerald-600/10 border border-blue-500/20 flex items-center justify-center mb-5 animate-pulse">
              <Tv className="w-9 h-9 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-neutral-100 mb-2">No Active Stream Selected</h3>
            <p className="text-neutral-400 text-sm max-w-sm leading-relaxed">
              Scan the sidebar index, choose a live channel, or import a private satellite M3U file to start projection.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
