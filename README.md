# 🤖 Cobalt Telegram Bot

Bot Telegram untuk download video & audio dari TikTok, YouTube, Twitter/X, dan Instagram — powered by [Cobalt](https://github.com/imputnet/cobalt).

## ✨ Fitur

- 🎵 **TikTok** — Video tanpa/dengan watermark, audio
- ▶️ **YouTube** — Video 360p–1080p, Shorts, audio MP3/Ogg
- 🐦 **Twitter/X** — Video dari tweet
- 📸 **Instagram** — Reels, post, carousel
- 🤖 **Mode auto** — Kirim link langsung, bot download otomatis kualitas terbaik
- 🎛 **Mode manual** — Pilih format & kualitas via tombol inline
- 🛡 **Rate limiting** — Anti-spam per user
- 🔄 **Webhook** (production) + **Long polling** (development)

---

## 🚀 Deploy ke Railway

### Cara 1 — Deploy 2 Service Terpisah (Recommended)

Railway akan menjalankan **2 service**:
1. **Cobalt API** — image dari `ghcr.io/imputnet/cobalt`
2. **Telegram Bot** — kode di repo ini

#### Langkah 1: Deploy Cobalt API

1. Buka [railway.app](https://railway.app) → New Project → Deploy from Docker Image
2. Masukkan image: `ghcr.io/imputnet/cobalt:latest`
3. Set environment variables:
   ```
   API_URL=https://<domain-railway-cobalt-kamu>.railway.app/
   CORS_WILDCARD=1
   ```
4. Aktifkan **Generate Domain** → catat URL-nya (misal: `https://cobalt-api-xxxx.railway.app`)

#### Langkah 2: Deploy Telegram Bot

1. Fork/push repo ini ke GitHub
2. Railway → New Project → Deploy from GitHub Repo → pilih repo ini
3. Set environment variables:
   ```
   BOT_TOKEN=<token dari @BotFather>
   COBALT_API_URL=https://cobalt-api-xxxx.railway.app
   WEBHOOK_URL=https://<domain-railway-bot-kamu>.railway.app
   PORT=3000
   ```
4. Aktifkan **Generate Domain** untuk bot service
5. Deploy!

> ⚠️ **Penting:** `WEBHOOK_URL` harus URL publik bot (bukan cobalt API). Bot akan otomatis set webhook ke `{WEBHOOK_URL}/webhook`.

---

### Cara 2 — Lokal (Development)

**Prasyarat:** Node.js >= 18, Docker (opsional)

#### Tanpa Docker

```bash
# Clone
git clone <repo-ini>
cd cobalt-telegram-bot

# Install dependencies
npm install

# Siapkan .env
cp .env.example .env
# Edit .env: isi BOT_TOKEN dan COBALT_API_URL

# Jalankan (long polling, tidak perlu WEBHOOK_URL)
npm run dev
```

#### Dengan Docker Compose (Bot + Cobalt API sekaligus)

```bash
cp .env.example .env
# Edit .env: isi minimal BOT_TOKEN

docker compose up -d
```

---

## ⚙️ Environment Variables

| Variable | Wajib | Keterangan |
|---|---|---|
| `BOT_TOKEN` | ✅ | Token dari [@BotFather](https://t.me/BotFather) |
| `COBALT_API_URL` | ✅ | URL instance cobalt (Railway atau lokal) |
| `WEBHOOK_URL` | Production | URL publik bot untuk webhook. Kosongkan untuk long polling |
| `COBALT_API_KEY` | Opsional | API key jika cobalt dikonfigurasi dengan autentikasi |
| `PORT` | Opsional | Port server (default: 3000) |

---

## 📖 Cara Pakai Bot

| Mode | Cara |
|---|---|
| **Auto** | Langsung kirim link ke bot |
| **Manual** | Ketik `/download`, lalu kirim link, lalu pilih format dari tombol |

### Perintah
```
/start   — Mulai & info
/download — Mode manual pilih format
/help    — Panduan lengkap
/about   — Info bot
```

---

## 🏗 Arsitektur

```
User (Telegram)
     │
     ▼
Telegram Bot (Grammy.js)   ←── Railway Service #2
     │
     ▼
Cobalt API (Express.js)    ←── Railway Service #1 (ghcr.io/imputnet/cobalt)
     │
     ▼
Media Platform (TikTok / YouTube / Twitter / Instagram)
```

---

## 📝 Catatan

- File di atas 50MB tidak bisa dikirim via Telegram — bot akan kirim link download langsung
- Cobalt hanya bisa download konten **publik**
- YouTube bisa mengalami rate limit di instance yang ramai — gunakan instance privat
- Instagram & Twitter mungkin butuh cookies untuk beberapa konten — lihat [docs cobalt](https://github.com/imputnet/cobalt/blob/main/docs/run-an-instance.md)

---

## 📄 Lisensi

MIT — bot ini sendiri. Cobalt API: AGPL-3.0.
