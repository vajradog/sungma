# Sungma (སྲུང་མ) — The Protector

### A free, open-source privacy camera for activists, journalists, and human rights defenders

**Tagline:** *Your face is yours. Keep it that way.*

---

## What Is Sungma?

Sungma is a browser-based privacy camera tool that automatically detects and pixelates faces in real time — before any image or video is ever saved. It runs entirely in the browser, requires no installation, no account, and no server. Everything happens on the user's device.

Built for activists, journalists, whistleblowers, and anyone who needs to document without endangering.

**Website:** `sungma.org` (or `sungma.github.io`)
**Cost to run:** $0 (core features)
**Tech stack:** Static site on GitHub Pages (HTML/JS/CSS), TensorFlow.js, Web APIs
**License:** Open source (MIT or GPL)

---

## Why Sungma Exists

Existing tools have critical gaps:

| Tool | Platform | Real-time | Cloud Backup | Web-based | Free |
|------|----------|-----------|--------------|-----------|------|
| Anonymous Camera | iOS only | ✅ | ❌ | ❌ | Freemium |
| ObscuraCam | Android only | ✅ | ❌ | ❌ | ✅ |
| Signal | iOS/Android | Photo only | ❌ | ❌ | ✅ |
| YouTube blur tool | Web | ❌ (post) | ❌ | ✅ | ✅ |
| **Sungma** | **Any browser** | **✅** | **✅ (Pro)** | **✅** | **✅** |

**Sungma's unique position:** The only web-based, cross-platform, free tool that combines real-time pixelation, video recording, embedded proof data, and metadata control — with zero server costs for core features.

---

## Core Security Principles

1. **No server, no breach.** There is no backend to hack. No database of activist footage. No user accounts to compromise (free tier).

2. **Pixelation at capture.** The unpixelated face never exists as a file. Pixelation happens on raw camera frames before any recording or export.

3. **On-device processing.** TensorFlow.js runs entirely in the browser. No frames are sent to any server for processing.

4. **Smart metadata control.** Device-identifying metadata is stripped automatically. Evidence metadata (GPS, timestamp) is kept by user choice. Proof data is embedded invisibly inside the file.

5. **User-controlled storage.** We never store anything (free tier). Users choose where their files go — their device, their cloud, or their organization's secure channel (Pro tier).

6. **Open source.** Full codebase on GitHub. Auditable by anyone. No hidden telemetry, no analytics, no tracking.

---

## Feature Roadmap

### Phase 1 — Core Camera (MVP)
*100% client-side, GitHub Pages, zero cost*

- [ ] **Live camera feed with real-time face pixelation**
  - TensorFlow.js BlazeFace model for face detection
  - Canvas API renders pixelated overlay at 15-30fps
  - Front and rear camera support
- [ ] **Photo capture**
  - Tap to capture pixelated photo
  - Faces are pixelated BEFORE the image exists — no original face data to recover
- [ ] **Video recording with live pixelation**
  - MediaRecorder API captures the pixelated canvas stream
  - Audio included (optional voice distortion)
  - Save as .webm or .mp4
- [ ] **Audio recording**
  - Voice-only recording with optional distortion
  - For testimony capture where video isn't safe
- [ ] **Voice distortion**
  - Web Audio API pitch shifting
  - Multiple distortion levels (subtle to heavy)
- [ ] **Smart metadata handling**
  - Auto-strip all device-identifying metadata (make, model, serial, software, camera settings, embedded thumbnails, creator name)
  - Preserve GPS coordinates (user toggle, default ON)
  - Preserve date/timestamp (user toggle, default ON)
  - Canvas fingerprint noise injection (defeats GPU fingerprinting)
- [ ] **Embedded proof data**
  - SHA-256 hash of file content (Web Crypto API)
  - GPS coordinates (if opted in) embedded in file
  - Timestamp embedded in file
  - Optional custom note / event tag
  - Optional encryption of proof data with user passphrase
  - All embedded invisibly inside the file (PNG tEXt chunks / JPEG COM markers / WebM Matroska tags)
  - No separate proof card file — everything travels inside the media file
- [ ] **Save & share**
  - Download to device
  - Web Share API for native sharing on mobile
- [ ] **PWA / Installable**
  - Service worker for offline functionality
  - Add to home screen — feels like a native app
  - Works without internet after first load
- [ ] **Mobile-first responsive design**
  - Optimized for phone use in the field
  - Large, accessible controls for high-stress situations
  - Dark mode default (less conspicuous)

### Phase 2 — Advanced Anonymization
*Still 100% client-side, zero cost*

- [ ] **Multiple anonymization styles**
  - Pixelate (classic mosaic)
  - Gaussian blur
  - Solid color block
  - Silhouette (black shape)
- [ ] **Selective face control**
  - Tap to toggle pixelation on specific faces
  - "Pixelate all except me" mode for interviewers
- [ ] **Interview mode (split-screen)**
  - Left side: interviewer (visible)
  - Right side: subject (pixelated)
  - Single recording output with mixed anonymization
- [ ] **Body detection**
  - Full body anonymization (not just faces)
  - TensorFlow.js BodyPix or MoveNet model
- [ ] **Adjustable intensity**
  - Slider for pixelation block size
  - Slider for blur radius
- [ ] **Upload & pixelate existing media**
  - Drag-and-drop or file picker for photos
  - Upload video files for post-processing pixelation
  - Reads GPS/timestamp from original, strips device info, re-embeds evidence data
- [ ] **Batch processing**
  - Upload multiple photos, pixelate all at once
  - Zip download of processed files
- [ ] **Tattoo/identifying mark blur**
  - Manual region selection for non-face identifying features

### Phase 3 — Free Cloud & P2P Features
*Creative zero-cost infrastructure*

- [ ] **Bring Your Own Cloud (BYOC)**
  - Connect Google Drive via OAuth (free, 15GB)
  - Connect Dropbox via OAuth (free, 2GB)
  - Auto-upload pixelated recordings to user's own cloud
  - We store nothing — the user's cloud, their data
- [ ] **WebTorrent P2P sharing**
  - Share footage directly between browsers, no server
  - Generate a magnet link, send to team via Signal
  - Recipient opens Sungma, pastes link, downloads directly from sender's browser
- [ ] **IPFS decentralized storage**
  - Pin pixelated recordings to IPFS for censorship-resistant storage
  - Free pinning via web3.storage (free tier)
  - Content-addressed: tamper-proof, verifiable
- [ ] **QR code device transfer**
  - Generate QR code to transfer files between devices on same network
  - WebRTC data channel — direct device-to-device, no server
- [ ] **Encrypted file sharing**
  - Encrypt footage client-side with a passphrase
  - Upload encrypted blob to free storage (IPFS or user's cloud)
  - Share decryption key separately via Signal/secure channel
  - Recipient decrypts in their browser

### Phase 4 — Safety Features
*Zero-cost, client-side*

- [ ] **Panic button**
  - Quick gesture (e.g., triple-tap, shake) to instantly:
    - Stop recording
    - Delete local footage
    - Send pre-set alert to emergency contact (via SMS link or pre-composed Signal message)
- [ ] **Timed check-in**
  - Set a timer: "If I don't check in within 2 hours..."
  - Auto-sends pre-written message to designated contacts
  - Uses Notification API + pre-composed message links
- [ ] **Stealth mode**
  - App appears as a calculator or notes app
  - Minimal UI, no branding visible on screen
  - Screen stays dim during recording
- [ ] **Secure wipe**
  - Clear all local data, cache, service worker data
  - One-tap full reset
  - Auto-wipe option when browser closes

### Phase 5 — Sungma Pro (Organization Channels)
*Premium feature — minimal server cost*

This is the "get footage out" feature for organizations supporting activists in high-risk zones.

**How it works:**

1. An organization (e.g., Tibet Action Institute) pays for a Sungma Pro account
2. They create "channels" — each channel has a unique link and passcode
3. The link is shared with activists in the field (memorize it, receive via Signal)
4. Activist opens the link in any browser, enters the passcode
5. Captures pixelated video/photo/audio
6. Files are encrypted client-side using the passcode as the encryption key (AES-256-GCM)
7. Encrypted blob is uploaded to the org's secure storage
8. Green checkmark confirms upload. Nothing remains on the phone.
9. Org team downloads and decrypts files using the same passcode

**Key design: zero-knowledge architecture**
- The server stores only encrypted blobs
- The server operator (us), hackers, or government subpoenas cannot read the files
- Only someone with the channel passcode can decrypt
- The passcode never touches the server — encryption/decryption happens in the browser

**Activist field UI:**

```
┌─────────────────────────────┐
│  🟢 Connected to channel    │
│                             │
│  ┌───────────────────────┐  │
│  │                       │  │
│  │   [PIXELATED CAMERA   │  │
│  │    VIEWFINDER]        │  │
│  │                       │  │
│  │   Faces: 2 detected   │  │
│  └───────────────────────┘  │
│                             │
│  ● Direct Upload: ON        │
│                             │
│  [ 📸 Photo ] [ 🎬 Record ] │
│                             │
│  ✅ 3 files uploaded         │
│  ✅ Nothing on your phone    │
│                             │
│  [🗑️ Wipe & Exit]           │
└─────────────────────────────┘
```

**Direct Upload mode:**
- Every photo captured is immediately encrypted + uploaded
- Video uploads in 5-10 second encrypted chunks as it records
- Green checkmarks confirm each chunk is safely stored
- If connection drops, chunks queue locally and auto-upload when connection returns
- "Wipe & Exit" clears everything — cache, service worker, browsing data

**Organization dashboard:**

```
┌──────────────────────────────────────────┐
│  SUNGMA ORG DASHBOARD                    │
│                                          │
│  Organization: Tibet Action Institute    │
│                                          │
│  ── CHANNELS ──                          │
│                                          │
│  📁 Lhasa Field Team                     │
│     Link: sungma.org/c/7kx9m            │
│     Passcode: ••••••••                   │
│     Uploads: 47 files (2.3 GB)           │
│     Last upload: 3 hours ago             │
│     [View] [Download All] [Rotate Code]  │
│                                          │
│  📁 Shigatse Interviews                  │
│     Link: sungma.org/c/p3nw2            │
│     Passcode: ••••••••                   │
│     Uploads: 12 files (890 MB)           │
│     Last upload: 2 days ago              │
│     [View] [Download All] [Rotate Code]  │
│                                          │
│  [+ Create New Channel]                  │
│                                          │
│  ── SETTINGS ──                          │
│  Auto-delete after download: [30 days ▼] │
│  Max file size: [500 MB ▼]               │
│  Allowed media: [✓Photo ✓Video ✓Audio]   │
│  Notify on upload: [✓ Email] [✓ Signal]  │
│                                          │
└──────────────────────────────────────────┘
```

**Security features:**
- Multiple channels per org (different teams, different passcodes)
- Passcode rotation (instant, old code stops working)
- Auto-delete after configurable period
- Upload notifications via email or Signal
- Duress passcode option (fake empty channel + silent alert to org)

**Infrastructure cost (Pro tier):**

| Component | Service | Cost |
|-----------|---------|------|
| Upload API | Cloudflare Workers | Free (100k req/day) |
| File storage | Cloudflare R2 | Free first 10GB, ~$0.015/GB/mo after |
| Org dashboard | Cloudflare Pages | Free |
| Domain | sungma.org | ~$10/year |
| **Typical org (50GB/mo)** | | **~$0.75/month** |

**Revenue model:**

| Tier | Price | Features |
|------|-------|---------|
| **Free** | $0 forever | Camera + pixelation + metadata control + proof data + local save + PWA |
| **Org Pro** | $10-50/month | Encrypted channels, cloud upload, dashboard, auto-delete, notifications |
| **Grant-funded** | Custom | Dedicated storage, custom domain, priority support, training |

---

## Technical Architecture

```
┌──────────────────────────────────────────────┐
│                 USER'S BROWSER               │
│                                              │
│  ┌─────────┐   ┌──────────┐   ┌──────────┐  │
│  │ Camera  │──▶│ TF.js    │──▶│ Canvas   │  │
│  │ Stream  │   │ BlazeFace│   │ Render   │  │
│  └─────────┘   │ Detection│   │ + Pixel  │  │
│                └──────────┘   └────┬─────┘  │
│                                    │         │
│              ┌─────────────────────┼────┐    │
│              │                     │    │    │
│              ▼                     ▼    ▼    │
│        ┌──────────┐  ┌────────┐  ┌───────┐  │
│        │ Media    │  │ Photo  │  │ Audio │  │
│        │ Recorder │  │ Export │  │ Record│  │
│        │ (.webm)  │  │ (.png) │  │ (.ogg)│  │
│        └────┬─────┘  └───┬────┘  └──┬────┘  │
│             │            │          │        │
│             ▼            ▼          ▼        │
│     ┌──────────────────────────────────┐     │
│     │      Metadata Processing         │     │
│     │  • Strip device identifiers      │     │
│     │  • Keep GPS/timestamp (optional) │     │
│     │  • Embed proof data (hash, GPS)  │     │
│     │  • Canvas fingerprint noise      │     │
│     └──────────────┬───────────────────┘     │
│                    │                         │
│                    ▼                         │
│     ┌──────────────────────────────────┐     │
│     │        Save / Share / Upload     │     │
│     │  • Download to device            │     │
│     │  • Web Share API                 │     │
│     │  • BYOC (Drive/Dropbox) [Ph.3]  │     │
│     │  • Org channel upload   [Ph.5]  │     │
│     └──────────────────────────────────┘     │
│                                              │
│  ★ NOTHING LEAVES THE BROWSER UNPIXELATED ★  │
└──────────────────────────────────────────────┘

Hosting: GitHub Pages / Cloudflare Pages (free)
Face Detection: TensorFlow.js BlazeFace (client-side)
Body Detection: TensorFlow.js BodyPix (client-side, Phase 2)
Metadata: piexifjs + Web Crypto API (client-side)
Cost: $0/month (core), ~$1/month (Pro)
```

---

## Tech Stack

| Component | Technology | Cost |
|-----------|-----------|------|
| Hosting | GitHub Pages or Cloudflare Pages | Free |
| Framework | Vanilla JS or Astro (static) | Free |
| Face detection | TensorFlow.js BlazeFace | Free (client-side) |
| Body detection | TensorFlow.js BodyPix | Free (client-side) |
| Video rendering | Canvas API | Free (browser native) |
| Video recording | MediaRecorder API | Free (browser native) |
| Audio recording | MediaRecorder API | Free (browser native) |
| Voice distortion | Web Audio API | Free (browser native) |
| Metadata read | exifr (JS library) | Free |
| Metadata write | piexifjs (JS library) | Free |
| Proof hash | Web Crypto API (SHA-256) | Free (browser native) |
| Proof encryption | Web Crypto API (AES-256-GCM) | Free (browser native) |
| PWA / Offline | Service Workers | Free (browser native) |
| P2P file sharing | WebTorrent | Free |
| Decentralized storage | IPFS via web3.storage | Free tier |
| Cloud backup (BYOC) | Google Drive / Dropbox OAuth | Free (user's account) |
| Pro: Upload API | Cloudflare Workers | Free tier |
| Pro: File storage | Cloudflare R2 | ~$0.015/GB/mo |
| Domain (optional) | sungma.org | ~$10/year |
| SSL | GitHub Pages / Cloudflare | Free |
| **Total monthly cost (free tier)** | | **$0** |
| **Total monthly cost (Pro, 50GB)** | | **~$0.75** |

---

## Metadata Control — Detailed Spec

### What gets STRIPPED (always, automatically):
- Device make & model
- Device serial number
- Software / firmware version
- Camera settings (lens, focal length, aperture, ISO)
- Unique image IDs
- Embedded thumbnails (may contain unedited preview)
- Creator / artist name
- Any other device-identifying EXIF fields

### What gets KEPT (user toggle, default ON):
- GPS coordinates (latitude, longitude)
- Date and timestamp
- Altitude
- Camera direction / compass heading

### What gets ADDED (embedded invisibly in file):
- SHA-256 content hash (proves file integrity)
- Sungma version identifier
- GPS coordinates (duplicated in proof data)
- Timestamp (duplicated in proof data)
- Custom note / event tag (optional, user-entered)
- All proof data optionally encrypted with user passphrase

### How proof data is embedded by format:
| Format | Method | Survives re-encoding? |
|--------|--------|:---:|
| PNG | tEXt chunks (PNG spec standard) | No |
| JPEG | COM marker segments | No |
| WebM | Matroska custom tags | No |
| Any (Phase 2) | Pixel steganography | Yes (partially) |

### Canvas fingerprint protection:
- Random noise injection into least significant bits of output pixels
- Imperceptible to human eye
- Defeats GPU-based canvas fingerprinting that could identify the device

---

## Who This Is For

- **Street activists** documenting protests and police interactions
- **Investigative journalists** conducting anonymous interviews
- **Human rights organizations** collecting testimony
- **Whistleblowers** recording evidence while protecting identity
- **Citizen journalists** in authoritarian regimes
- **NGOs and aid workers** protecting vulnerable populations
- **Legal observers** at demonstrations
- **Anyone** who wants to record without exposing faces

---

## Potential Funders & Partners

- Open Technology Fund (OTF)
- Freedom of the Press Foundation (FPF)
- Digital Defenders Partnership
- Reporters Without Borders (RSF)
- Internews
- Ford Foundation (Internet Freedom)
- Mozilla Foundation
- Guardian Project (potential technical collaboration)
- WITNESS
- Tibet Action Institute
- Access Now

---

## Development Timeline (Solo Developer)

| Phase | Scope | Estimated Time |
|-------|-------|---------------|
| Phase 1 | Core camera + pixelation + metadata + proof + PWA | 3-4 weeks |
| Phase 2 | Advanced anonymization + interview mode + body detection | 2-3 weeks |
| Phase 3 | BYOC cloud + P2P sharing + IPFS | 2-3 weeks |
| Phase 4 | Safety features (panic, stealth, wipe) | 1-2 weeks |
| Phase 5 | Sungma Pro (org channels, encrypted upload, dashboard) | 4-6 weeks |
| **Total** | **Full feature set** | **~12-18 weeks** |

---

## The Promise

> **Sungma never sees your face.**
> No server. No account. No data collection.
> Your camera. Your footage. Your protection.
> Free. Open source. Forever.

---

*Sungma (སྲུང་མ) — Tibetan for "protector."*
*Because the most powerful camera is the one that keeps you safe.*
