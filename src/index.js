import { bot } from "./bot.js";
import { cobalt } from "./cobalt.js";

const PORT = parseInt(process.env.PORT ?? "3000");
const WEBHOOK_URL = process.env.WEBHOOK_URL; // e.g. https://your-bot.railway.app

async function start() {
  console.log("🚀 Starting Cobalt Telegram Bot...");

  // Check cobalt API availability
  const alive = await cobalt.ping();
  if (!alive) {
    console.warn("⚠️  Cobalt API tidak merespons. Pastikan COBALT_API_URL benar.");
  } else {
    console.log("✅ Cobalt API terhubung:", process.env.COBALT_API_URL);
  }

  // Set bot commands menu
  await bot.api.setMyCommands([
    { command: "start", description: "Mulai bot" },
    { command: "download", description: "Download dengan pilihan format" },
    { command: "help", description: "Bantuan penggunaan" },
    { command: "about", description: "Tentang bot" },
  ]);

  if (WEBHOOK_URL) {
    // Webhook mode (recommended for Railway production)
    const { webhookCallback } = await import("grammy");
    const { createServer } = await import("node:http");
    const handleUpdate = webhookCallback(bot, "http");

    const server = createServer(async (req, res) => {
      if (req.method === "POST" && req.url === "/webhook") {
        await handleUpdate(req, res);
      } else if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", bot: "cobalt-telegram-bot" }));
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    });

    server.listen(PORT, () => {
      console.log(`🌐 Webhook server listening on port ${PORT}`);
    });

    const webhookEndpoint = `${WEBHOOK_URL}/webhook`;
    await bot.api.setWebhook(webhookEndpoint);
    console.log(`✅ Webhook set: ${webhookEndpoint}`);
  } else {
    // Long polling mode (local dev)
    console.log("📡 Starting in long-polling mode (development)...");
    await bot.api.deleteWebhook();
    bot.start();
    console.log("✅ Bot running via long polling.");
  }
}

start().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
