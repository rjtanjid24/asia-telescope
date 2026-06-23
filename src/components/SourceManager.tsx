/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, DragEvent, ChangeEvent, FormEvent } from "react";
import { 
  Link2, 
  Upload, 
  HelpCircle, 
  Settings, 
  Check, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Tv, 
  Database,
  ExternalLink
} from "lucide-react";
import { PlaylistSource } from "../types";

interface SourceManagerProps {
  sources: PlaylistSource[];
  activeSourceId: string;
  onSelectSource: (sourceId: string) => void;
  onAddCustomSource: (name: string, url: string) => void;
  onUploadLocalFile: (name: string, content: string) => void;
  onDeleteSource: (sourceId: string) => void;
  isFetching: boolean;
  onReload: () => void;
}

export default function SourceManager({
  sources,
  activeSourceId,
  onSelectSource,
  onAddCustomSource,
  onUploadLocalFile,
  onDeleteSource,
  isFetching,
  onReload
}: SourceManagerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeSource = sources.find(s => s.id === activeSourceId);

  const handleUrlSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!urlInput || !nameInput) return;
    onAddCustomSource(nameInput.trim(), urlInput.trim());
    setUrlInput("");
    setNameInput("");
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const isJson = file.name.toLowerCase().endsWith(".json");
    if (!file.name.endsWith(".m3u") && !file.name.endsWith(".m3u8") && !file.name.endsWith(".txt") && !isJson) {
      alert("Invalid file: Please upload a standard playlist file with a .m3u, .m3u8, .txt, or .json extension.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        if (isJson) {
          onUploadLocalFile(`Uploaded Portal: ${file.name.replace(/\.[^/.]+$/, "")}`, content);
        } else {
          onUploadLocalFile(`Uploaded: ${file.name.replace(/\.[^/.]+$/, "")}`, content);
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div id="source-manager-module" className={`bg-[#0f0f0f] border border-white/5 rounded-2xl p-4 md:p-5 flex flex-col shadow-lg shadow-black/40 transition-all duration-300 ${isExpanded ? "gap-6" : "gap-0"}`}>
      
      {/* Title Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center justify-between cursor-pointer select-none ${isExpanded ? "border-b border-white/5 pb-4" : ""}`}
      >
        <div className="flex items-center gap-2">
          <Database className="w-4.5 h-4.5 text-blue-500 animate-pulse" />
          <h3 className="font-bold text-neutral-100 text-xs sm:text-sm tracking-wide uppercase">Telescope Satellite Presets</h3>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={onReload}
            disabled={isFetching}
            className="p-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-white/10 bg-white/5 text-[10px] sm:text-xs text-neutral-300 hover:text-white flex items-center gap-1 sm:gap-1.5 transition disabled:opacity-40 cursor-pointer"
            title="Reload active station list">
            <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isFetching ? "animate-spin text-blue-400" : ""}`} />
            <span className="hidden sm:inline">Sync Source</span>
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] sm:text-xs font-semibold font-mono border border-blue-500/20 hover:border-blue-500/30 transition cursor-pointer"
          >
            {isExpanded ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Preset List Selection Grid */}
          <div className="flex flex-col gap-2 mt-4">
            <span className="text-[10px] uppercase tracking-wider font-mono text-neutral-500 font-semibold mb-1">Select Active Broadcast Core</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1 scroller">
              {sources.map((source) => {
                const isActive = source.id === activeSourceId;
                return (
                  <div 
                    key={source.id}
                    onClick={() => !isFetching && onSelectSource(source.id)}
                    className={`group relative p-3 rounded-xl border cursor-pointer text-left transition flex flex-col justify-between ${
                      isActive 
                        ? "bg-blue-600/15 border-blue-500/40 text-white shadow-md shadow-blue-500/5 active-channel" 
                        : "bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10 hover:text-neutral-200"
                    }`}>
                    
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold leading-tight flex items-center gap-1.5">
                          {isActive && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                          <span className="truncate max-w-[120px]">{source.name}</span>
                        </h4>
                        <p className="text-[10px] text-neutral-500 leading-normal mt-0.5 max-w-[150px] line-clamp-1 group-hover:text-neutral-400 transition">
                          {source.description}
                        </p>
                      </div>

                      {source.isCustom && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSource(source.id);
                          }}
                          className="p-1 rounded-md opacity-40 hover:opacity-100 text-red-400 hover:bg-red-500/10 transition shrink-0"
                          title="Delete profile">
                          <Trash2 className="w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Accordion / Forms section to ADD CUSTOM playlist */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 border-t border-white/5 pt-5">
            
            {/* Custom URL addition */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] uppercase tracking-wider font-mono text-white/40 font-semibold text-left">Feed Custom M3U / M3U8 Link</span>
              <form onSubmit={handleUrlSubmit} className="flex flex-col gap-2">
                <input 
                  type="text" 
                  placeholder="e.g. Bangladesh Satellite Feed" 
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="px-3 py-2 text-xs bg-white/5 border border-white/10 hover:border-white/20 focus:border-blue-500/50 focus:outline-none rounded-xl text-neutral-200 transition placeholder-white/20"
                  required
                />
                <div className="flex gap-2">
                  <input 
                    type="url" 
                    placeholder="https://raw.githubusercontent.com/.../playlist.m3u" 
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs bg-white/5 border border-white/10 hover:border-white/20 focus:border-blue-500/50 focus:outline-none rounded-xl text-neutral-200 transition placeholder-white/20 font-mono"
                    required
                  />
                  <button 
                    type="submit"
                    className="p-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 hover:scale-105 active:scale-95 text-white text-xs font-bold transition flex items-center justify-center shrink-0 cursor-pointer">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>

            {/* Local File Drag & Drop Upload */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] uppercase tracking-wider font-mono text-white/40 font-semibold text-left">Local Playlist Teleport</span>
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 border border-dashed rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition select-none h-full min-h-[75px] ${
                  isDragging 
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" 
                    : "bg-white/5 border-white/10 hover:border-white/20 text-neutral-400"
                }`}>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
                  accept=".m3u,.m3u8,.txt,.json"
                  className="hidden" 
                />

                <Upload className="w-5 h-5 text-neutral-500 mb-1" />
                <span className="text-[11px] font-medium text-neutral-200">
                  Drag file here or click to browse
                </span>
                <span className="text-[9px] text-neutral-600 font-mono mt-0.5">
                  Supports .m3u, .m3u8, .txt, .json files
                </span>
              </div>
            </div>
          </div>

          {/* Helpful info bar */}
          <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/5 text-xs text-neutral-400 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-normal text-[11px]">
              <strong className="text-neutral-300">How IPTV Works:</strong> This telescope receives public streams parsed entirely in your browser memory. We bypass paid subscription models or proxy servers, providing zero latency and client-side processing. 
              <span 
                onClick={() => setIsFaqOpen(prev => !prev)}
                className="text-blue-400 hover:underline cursor-pointer font-bold block mt-1">
                {isFaqOpen ? "Hide technical notes" : "Learn about geoblocking & feeds"}
              </span>
              {isFaqOpen && (
                <div className="mt-1.5 pt-1.5 border-t border-white/5 text-neutral-500 space-y-1">
                  <p>• If some channels show <strong className="text-neutral-400">offline</strong>, they might be geoblocked by the broadcaster or require a BDIX network connection (if targeting Bangladeshi ISP streams).</p>
                  <p>• You can easily import full bespoke lists by copying a public M3U URL of choice from GitHub and linking it above.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
