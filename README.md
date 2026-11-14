# 🏟️ ATLAS Arena — The Discord for Fantasy Football

ATLAS Arena is a native Android mobile application designed as the ultimate real-time fantasy football matchday hub for Premier League mini-leagues. It combines live match events, automated captain analysis, instant Discord-style banter, and tactical squad visualization.

---

## ⚡ Features

- **🏟️ Autonomous Matchday Bot**:
  - Live Premier League goal, assist, and card detector with real-time impact analysis (captain multipliers, squad bonuses, differentials).
  - Instant zero-delay Android push notifications via `@capacitor/local-notifications`.
  - Zero spam on completed fixtures.
- **🚨 Transfer & Chip Reveal Bot (`#transfers`)**:
  - Scans mini-league rosters after deadlines to reveal chips (Wildcards, Triple Captains, Bench Boosts) and transfer point hits taken.
- **⚽ Interactive Tactical Pitch (Starting XI)**:
  - Tap any manager to view their full Starting XI pitch formation (4-3-3, 3-5-2, etc.), captain & vice-captain badges, and bench dugout.
- **💬 Real-Time League Banter (`#banter`)**:
  - Discord-style cross-device chat with live emoji reactions, reply threading, message deletions, and Phoenix-style active manager presence (green dots).
- **🛡️ Official Club Crests**:
  - High-res vector SVGs for all active 20 Premier League clubs across embeds and duels.
- **🔐 Cloud Accounts ($0.00 Serverless Tier)**:
  - Log in with FPL Team ID and password; accounts and league states sync automatically via Supabase.

---

## 📱 Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **Mobile Runtime**: Capacitor 7 (Android native wrapper)
- **Backend**: Supabase (PostgreSQL with Row Level Security & Phoenix Realtime WebSockets)
- **Audio Engine**: Universal 16-bit PCM WAV synthesizer
- **Signing**: Permanent PKCS12 release keystore for in-place seamless app updates

---

## 🚀 Building & Running

### Requirements
- Node.js 20+
- JDK 21+
- Android SDK (API 34/35)

### Commands
```bash
# Install dependencies
npm install

# Run web dev server
npm run dev

# Build web assets
npm run build

# Build locally signed production release APK:
./build-release-apk.sh
```

---

## 📦 Releases

Download the latest production-signed APK from the [Releases](https://github.com/heyatlas-dev/atlas-arena/releases) section.
All releases are signed with the permanent ATLAS Arena release key, enabling seamless updates without uninstalling.
