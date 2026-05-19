import { Bot, InlineKeyboard, InputFile } from "grammy";
import { limit } from "@grammyjs/ratelimiter";
import { cobalt } from "./cobalt.js";
import { detectPlatform, formatFileSize, sleep } from "./utils.js";
import { sessions } from "./session.js";

const bot = new Bot(process.env.BOT_TOKEN);

// ─── Rate limiter ────────────────────────────────────────────────────────────
bot.use(
  limit({
    timeFrame: 10000,
    limit: 3,
    onLimitExceeded: async (ctx) => {
      await ctx.reply("⏳ Pelan-pelan ya, kamu terlalu cepat! Coba lagi sebentar.");
    },
  })
);

// ─── /start ──────────────────────────────────────────────────────────────────
bot.command("start", async (ctx) => {
  const name = ctx.from?.first_name ?? "kamu";
  await ctx.reply(
    `👋 Halo, <b>${name}</b>!\n\n` +
      `Saya bisa download video & audio dari:\n` +
      `• 🎵 TikTok\n` +
      `• ▶️ YouTube\n` +
      `• 🐦 Twitter/X\n` +
      `• 📸 Instagram\n\n` +
      `Cukup kirim link-nya ke sini, dan saya akan proses!\n\n` +
      `<b>Perintah:</b>\n` +
      `/download — Download dengan pilihan format\n` +
      `/help — Bantuan\n` +
      `/about — Tentang bot ini`,
    { parse_mode: "HTML" }
  );
});

// ─── /help ───────────────────────────────────────────────────────────────────
bot.command("help", async (ctx) => {
  await ctx.reply(
    `📖 <b>Cara pakai:</b>\n\n` +
      `1️⃣ Kirim link langsung (auto download terbaik)\n` +
      `   Contoh: <code>https://youtu.be/xxx</code>\n\n` +
      `2️⃣ Pakai /download lalu kirim link (pilih format manual)\n\n` +
      `<b>Platform yang didukung:</b>\n` +
      `🎵 TikTok — Video/audio, tanpa watermark\n` +
      `▶️ YouTube — Video 8K/4K/HDR, shorts, musik\n` +
      `🐦 Twitter/X — Video dari tweet\n` +
      `📸 Instagram — Reels, post, stories\n\n` +
      `<b>Tips:</b>\n` +
      `• YouTube bisa minta resolusi spesifik\n` +
      `• TikTok bisa minta tanpa watermark\n` +
      `• Ukuran file max 50MB (limit Telegram)`,
    { parse_mode: "HTML" }
  );
});

// ─── /about ──────────────────────────────────────────────────────────────────
bot.command("about", async (ctx) => {
  await ctx.reply(
    `🤖 <b>Cobalt Media Bot</b>\n\n` +
      `Bot ini menggunakan <a href="https://github.com/imputnet/cobalt">Cobalt</a> — ` +
      `open-source media downloader yang cepat, bersih, tanpa iklan.\n\n` +
      `Dibuat untuk memudahkan download konten publik yang tersedia bebas.\n\n` +
      `⚠️ <i>Hanya untuk konten publik. Pengguna bertanggung jawab atas penggunaan konten yang diunduh.</i>`,
    { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
  );
});

// ─── /download (manual mode) ─────────────────────────────────────────────────
bot.command("download", async (ctx) => {
  sessions.set(ctx.from.id, { mode: "manual", step: "awaiting_url" });
  await ctx.reply(
    `🔗 Kirim link yang ingin didownload:\n\n` +
      `Contoh:\n` +
      `<code>https://www.tiktok.com/@user/video/123</code>\n` +
      `<code>https://youtu.be/dQw4w9WgXcQ</code>`,
    { parse_mode: "HTML" }
  );
});

// ─── Inline keyboard callbacks ────────────────────────────────────────────────
bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.from.id;

  await ctx.answerCallbackQuery();

  if (data === "cancel") {
    sessions.delete(userId);
    await ctx.editMessageText("❌ Dibatalkan.");
    return;
  }

  const session = sessions.get(userId);
  if (!session?.url) {
    await ctx.editMessageText("❌ Sesi expired. Kirim link lagi.");
    return;
  }

  // Build cobalt options from callback data
  const options = parseCallbackOptions(data, session);
  await processDownload(ctx, session.url, options, true);
});

// ─── Message handler (links) ──────────────────────────────────────────────────
bot.on("message:text", async (ctx) => {
  const text = ctx.message.text.trim();
  const userId = ctx.from.id;
  const session = sessions.get(userId);

  // If user is in manual mode awaiting URL
  if (session?.step === "awaiting_url") {
    if (!isValidUrl(text)) {
      await ctx.reply("❌ Bukan URL yang valid. Coba lagi atau /cancel untuk membatalkan.");
      return;
    }
    const platform = detectPlatform(text);
    if (!platform) {
      await ctx.reply(
        "❌ Platform tidak didukung.\n\nYang didukung: TikTok, YouTube, Twitter/X, Instagram"
      );
      sessions.delete(userId);
      return;
    }
    session.url = text;
    session.platform = platform;
    session.step = "awaiting_format";
    sessions.set(userId, session);
    await showFormatMenu(ctx, text, platform);
    return;
  }

  // Auto mode — detect URL and process immediately
  if (isValidUrl(text)) {
    const platform = detectPlatform(text);
    if (!platform) {
      await ctx.reply(
        "❌ Platform tidak didukung.\n\nYang didukung: TikTok, YouTube, Twitter/X, Instagram\n\nAtau kirim /help untuk info lebih lanjut."
      );
      return;
    }
    await processDownload(ctx, text, getDefaultOptions(platform));
    return;
  }

  // Not a URL, not in session
  await ctx.reply(
    "💡 Kirim link video/audio untuk didownload!\n\nContoh:\n" +
      "<code>https://youtu.be/dQw4w9WgXcQ</code>\n\n" +
      "Atau ketik /help untuk bantuan.",
    { parse_mode: "HTML" }
  );
});

// ─── Format selection menu ────────────────────────────────────────────────────
async function showFormatMenu(ctx, url, platform) {
  let keyboard = new InlineKeyboard();

  if (platform === "youtube") {
    keyboard
      .text("🎬 Video 1080p", "yt:video:1080")
      .text("🎬 Video 720p", "yt:video:720")
      .row()
      .text("🎬 Video 480p", "yt:video:480")
      .text("🎬 Video 360p", "yt:video:360")
      .row()
      .text("🎵 Audio MP3", "yt:audio:mp3")
      .text("🎵 Audio Ogg", "yt:audio:ogg")
      .row()
      .text("❌ Batal", "cancel");
  } else if (platform === "tiktok") {
    keyboard
      .text("🎬 Video (tanpa WM)", "tt:video:nowm")
      .text("🎬 Video (dengan WM)", "tt:video:wm")
      .row()
      .text("🎵 Audio saja", "tt:audio:mp3")
      .row()
      .text("❌ Batal", "cancel");
  } else if (platform === "twitter") {
    keyboard
      .text("🎬 Video kualitas terbaik", "tw:video:best")
      .row()
      .text("🎵 Audio saja", "tw:audio:mp3")
      .row()
      .text("❌ Batal", "cancel");
  } else if (platform === "instagram") {
    keyboard
      .text("🎬 Video", "ig:video:best")
      .row()
      .text("🎵 Audio saja", "ig:audio:mp3")
      .row()
      .text("❌ Batal", "cancel");
  }

  const platformEmoji = {
    youtube: "▶️ YouTube",
    tiktok: "🎵 TikTok",
    twitter: "🐦 Twitter/X",
    instagram: "📸 Instagram",
  };

  await ctx.reply(
    `${platformEmoji[platform]} terdeteksi!\n\n🎛 Pilih format download:`,
    { reply_markup: keyboard }
  );
}

// ─── Parse callback options ───────────────────────────────────────────────────
function parseCallbackOptions(data, session) {
  const [platform, type, quality] = data.split(":");
  const options = { downloadMode: type === "audio" ? "audio" : "auto" };

  if (platform === "yt") {
    if (type === "video") {
      options.youtubeVideoCodec = "h264";
      options.videoQuality = quality;
    } else {
      options.audioFormat = quality === "ogg" ? "ogg" : "mp3";
    }
  } else if (platform === "tt") {
    if (quality === "nowm") {
      options.tiktokFullAudio = false;
      options.tiktokH265 = false;
    } else if (quality === "wm") {
      options.tiktokWatermark = true;
    }
  } else if (platform === "tw" || platform === "ig") {
    if (type === "audio") {
      options.downloadMode = "audio";
    }
  }

  return options;
}

// ─── Default options per platform ────────────────────────────────────────────
function getDefaultOptions(platform) {
  const defaults = {
    youtube: { videoQuality: "1080", youtubeVideoCodec: "h264" },
    tiktok: { tiktokFullAudio: false },
    twitter: { downloadMode: "auto" },
    instagram: { downloadMode: "auto" },
  };
  return defaults[platform] ?? {};
}

// ─── Core download processor ──────────────────────────────────────────────────
async function processDownload(ctx, url, options = {}, isEdit = false) {
  const userId = ctx.from?.id ?? ctx.callbackQuery?.from?.id;
  sessions.delete(userId);

  const statusMsg = isEdit
    ? await ctx.editMessageText("⏳ Memproses link kamu...")
    : await ctx.reply("⏳ Memproses link kamu...");

  const msgId = isEdit ? statusMsg.message_id : statusMsg.message_id;
  const chatId = ctx.chat?.id ?? ctx.callbackQuery?.message?.chat?.id;

  try {
    const result = await cobalt.fetch(url, options);

    if (result.status === "error") {
      await bot.api.editMessageText(chatId, msgId,
        `❌ Gagal: ${result.error?.code ?? "Unknown error"}\n\n` +
        `💡 Coba cek link-nya atau gunakan platform yang didukung.`
      );
      return;
    }

    if (result.status === "picker") {
      // Multiple media items (e.g. Instagram carousel)
      await handlePicker(ctx, chatId, msgId, result.picker);
      return;
    }

    // Single file — tunnel or redirect URL
    const downloadUrl = result.url;
    const filename = result.filename ?? "media";
    const isAudio = filename.endsWith(".mp3") || filename.endsWith(".ogg") ||
                    filename.endsWith(".opus") || filename.endsWith(".m4a");

    await bot.api.editMessageText(chatId, msgId, "📥 Mengunduh dan mengirim file...");

    // Stream dari cobalt ke Telegram
    const fileResp = await fetch(downloadUrl);

    if (!fileResp.ok) {
      throw new Error(`HTTP ${fileResp.status} saat mengunduh file`);
    }

    const contentLength = parseInt(fileResp.headers.get("content-length") || "0");
    const estimatedLength = parseInt(fileResp.headers.get("estimated-content-length") || "0");
    const fileSize = contentLength || estimatedLength;

    // Telegram limit 50MB
    if (fileSize > 50 * 1024 * 1024) {
      await bot.api.editMessageText(chatId, msgId,
        `⚠️ File terlalu besar (${formatFileSize(fileSize)}).\n\n` +
        `Telegram membatasi upload hingga 50MB.\n\n` +
        `🔗 Download langsung: ${downloadUrl}`
      );
      return;
    }

    const inputFile = new InputFile(fileResp.body, filename);

    if (isAudio) {
      await bot.api.sendAudio(chatId, inputFile, {
        caption: `🎵 ${filename}`,
        reply_to_message_id: ctx.message?.message_id,
      });
    } else {
      await bot.api.sendVideo(chatId, inputFile, {
        caption: `🎬 ${filename}`,
        supports_streaming: true,
        reply_to_message_id: ctx.message?.message_id,
      });
    }

    await bot.api.deleteMessage(chatId, msgId).catch(() => {});

  } catch (err) {
    console.error("Download error:", err);
    await bot.api.editMessageText(chatId, msgId,
      `❌ Terjadi kesalahan:\n<code>${err.message}</code>\n\n` +
      `Coba beberapa saat lagi atau periksa link-nya.`,
      { parse_mode: "HTML" }
    ).catch(() => {});
  }
}

// ─── Picker handler (carousel / multi-media) ─────────────────────────────────
async function handlePicker(ctx, chatId, msgId, items) {
  const max = Math.min(items.length, 10);
  await bot.api.editMessageText(chatId, msgId,
    `📂 Ditemukan ${items.length} item. Mengirim ${max} pertama...`
  );

  for (let i = 0; i < max; i++) {
    const item = items[i];
    try {
      if (item.type === "photo") {
        await bot.api.sendPhoto(chatId, item.url);
      } else {
        const fileResp = await fetch(item.url);
        const inputFile = new InputFile(fileResp.body, `media_${i + 1}.mp4`);
        await bot.api.sendVideo(chatId, inputFile, { supports_streaming: true });
      }
      await sleep(500); // prevent flood
    } catch (e) {
      console.error(`Picker item ${i} error:`, e.message);
    }
  }

  await bot.api.deleteMessage(chatId, msgId).catch(() => {});
}

// ─── URL validator ────────────────────────────────────────────────────────────
function isValidUrl(text) {
  try {
    const u = new URL(text);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// ─── Error handler ────────────────────────────────────────────────────────────
bot.catch((err) => {
  console.error("Bot error:", err.message);
});

export { bot };
