/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Channel {
  id: string;
  name: string;
  logo: string;
  category: string;
  url: string;
  tvgId?: string;
  tvgName?: string;
}

export interface PlaylistSource {
  id: string;
  name: string;
  description: string;
  url: string;
  isCustom?: boolean;
}
