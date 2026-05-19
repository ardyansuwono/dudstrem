/**
 * Detect which supported platform a URL belongs to.
 * Returns null if unsupported.
 */
export function detectPlatform(url) {
  try {
    const { hostname } = new URL(url);
    const h = hostname.replace("www.", "");

    if (h === "tiktok.com" || h === "vm.tiktok.com" || h === "vt.tiktok.com") return "tiktok";
    if (h === "youtube.com" || h === "youtu.be" || h === "music.youtube.com") return "youtube";
    if (h === "twitter.com" || h === "x.com" || h === "t.co") return "twitter";
    if (h === "instagram.com" || h === "instagr.am") return "instagram";

    return null;
  } catch {
    return null;
  }
}

/**
 * Format bytes to human-readable size string.
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}

/**
 * Promise-based sleep.
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Truncate long strings for display.
 */
export function truncate(str, len = 60) {
  return str.length > len ? str.slice(0, len - 3) + "..." : str;
}
