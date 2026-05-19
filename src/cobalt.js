/**
 * Cobalt API client
 * Communicates with a self-hosted cobalt instance
 * Docs: https://github.com/imputnet/cobalt/blob/main/docs/api.md
 */

const COBALT_URL = process.env.COBALT_API_URL?.replace(/\/$/, "") ?? "http://localhost:9000";
const COBALT_API_KEY = process.env.COBALT_API_KEY ?? null;

/**
 * @typedef {Object} CobaltRequest
 * @property {string} url - Media URL to process
 * @property {string} [videoQuality] - "144"|"240"|"360"|"480"|"720"|"1080"|"1440"|"2160"|"max"
 * @property {string} [audioFormat] - "best"|"mp3"|"ogg"|"wav"|"opus"
 * @property {string} [audioBitrate] - "8"|"64"|"96"|"128"|"192"|"256"|"320"
 * @property {string} [downloadMode] - "auto"|"audio"|"mute"
 * @property {string} [youtubeVideoCodec] - "h264"|"av1"|"vp9"
 * @property {boolean} [youtubeHLS]
 * @property {boolean} [youtubeBetterAudio]
 * @property {boolean} [tiktokFullAudio]
 * @property {boolean} [tiktokH265]
 * @property {boolean} [twitterGif]
 * @property {boolean} [allowH265]
 */

class CobaltClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Fetch download info from cobalt API
   * @param {string} url - Media URL
   * @param {Partial<CobaltRequest>} options
   * @returns {Promise<Object>} Cobalt API response
   */
  async fetch(url, options = {}) {
    const headers = {
      "Accept": "application/json",
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Api-Key ${this.apiKey}`;
    }

    const body = {
      url,
      ...options,
    };

    // Clean undefined values
    Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

    const res = await fetch(`${this.baseUrl}/`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      let errBody;
      try {
        errBody = await res.json();
      } catch {
        errBody = { error: { code: `HTTP_${res.status}` } };
      }
      return {
        status: "error",
        error: errBody?.error ?? { code: `HTTP_${res.status}` },
      };
    }

    return res.json();
  }

  /**
   * Health check — GET / returns instance info
   */
  async ping() {
    try {
      const res = await fetch(`${this.baseUrl}/`, {
        signal: AbortSignal.timeout(5_000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const cobalt = new CobaltClient(COBALT_URL, COBALT_API_KEY);
