/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Channel } from "../types";

export function parseM3U(text: string): Channel[] {
  const channels: Channel[] = [];
  const lines = text.split(/\r?\n/);
  
  let currentMeta: {
    name: string;
    logo: string;
    category: string;
    tvgId?: string;
    tvgName?: string;
  } | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    if (line.startsWith("#EXTINF:")) {
      // Parse tvg-logo
      const logoMatch = line.match(/tvg-logo="([^"]*)"/) || line.match(/tvg-logo=([^,\s]+)/);
      const logo = logoMatch ? logoMatch[1].trim() : "";
      
      // Parse group-title (category)
      const groupMatch = line.match(/group-title="([^"]*)"/) || line.match(/group-title=([^,\s]+)/);
      let category = groupMatch ? groupMatch[1].trim() : "Other";
      
      // Clean up common category tags
      if (!category || category === '""' || category === "''") {
        category = "Other";
      }
      
      // Parse tvg-id
      const idMatch = line.match(/tvg-id="([^"]*)"/) || line.match(/tvg-id=([^,\s]+)/);
      const tvgId = idMatch ? idMatch[1].trim() : undefined;

      // Parse tvg-name
      const nameMatch = line.match(/tvg-name="([^"]*)"/) || line.match(/tvg-name=([^,\s]+)/);
      const tvgName = nameMatch ? nameMatch[1].trim() : undefined;
      
      // Extract name (after last comma)
      let name = "";
      const commaIndex = line.lastIndexOf(",");
      if (commaIndex !== -1) {
        name = line.substring(commaIndex + 1).trim();
      }
      
      if (!name && tvgName) {
        name = tvgName;
      }
      if (!name && tvgId) {
        name = tvgId;
      }
      if (!name) {
        name = "Unknown Channel";
      }

      currentMeta = {
        name,
        logo,
        category,
        tvgId,
        tvgName,
      };
    } else if (
      line.startsWith("http://") || 
      line.startsWith("https://") || 
      line.startsWith("rtmp://") || 
      line.startsWith("rtsp://")
    ) {
      // It's a stream URL
      if (currentMeta) {
        const id = `${currentMeta.name}-${channels.length}-${Math.random().toString(36).substring(2, 6)}`;
        channels.push({
          id,
          name: currentMeta.name,
          logo: currentMeta.logo,
          category: currentMeta.category,
          url: line,
          tvgId: currentMeta.tvgId,
          tvgName: currentMeta.tvgName,
        });
        currentMeta = null;
      } else {
        // Fallback for URLs without explicit #EXTINF
        const id = `channel-${channels.length}-${Math.random().toString(36).substring(2, 6)}`;
        let segmentName = line.substring(line.lastIndexOf("/") + 1);
        if (segmentName.includes("?")) {
          segmentName = segmentName.split("?")[0];
        }
        channels.push({
          id,
          name: segmentName || `Stream ${channels.length + 1}`,
          logo: "",
          category: "Other",
          url: line,
        });
      }
    }
  }
  
  return channels;
}

export function parseBDIXJson(jsonText: string, baseUrl: string = "http://198.195.239.50/"): Channel[] {
  try {
    const cleanJson = jsonText.trim().replace(/^\uFEFF/, "");
    const data = JSON.parse(cleanJson);
    const channelsList = data.channels || (Array.isArray(data) ? data : []);
    
    return channelsList
      .filter((ch: any) => ch && ch.name && ch.url)
      .map((ch: any, idx: number) => {
        // Resolve absolute URLs
        const resolveUrl = (relativeOrAbsolute: string) => {
          if (!relativeOrAbsolute) return "";
          if (/^https?:\/\//i.test(relativeOrAbsolute)) {
            return relativeOrAbsolute;
          }
          let base = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
          let path = relativeOrAbsolute.startsWith("/") ? relativeOrAbsolute.substring(1) : relativeOrAbsolute;
          return `${base}${path}`;
        };

        const resolvedUrl = resolveUrl(ch.url);
        const resolvedLogo = ch.logo ? resolveUrl(ch.logo) : "";

        return {
          id: `bdix-${ch.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${idx}`,
          name: ch.name + (ch.status === "hidden" ? " (Hidden Feed)" : ""),
          logo: resolvedLogo,
          category: ch.category || "Bangla",
          url: resolvedUrl,
        };
      });
  } catch (e) {
    console.warn("BDIX TV Channels JSON parse error:", e);
    return [];
  }
}

