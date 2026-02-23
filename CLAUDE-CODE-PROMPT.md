# Claude Code Prompt — Sungma Phase 1 Build

## Copy everything below this line and paste into Claude Code:

---

Read the file `SPEC.md` in this repo for full project context. You are building **Sungma (སྲུང་མ)**, a free, open-source, browser-based privacy camera for activists. Everything runs client-side. No backend. Hosted on GitHub Pages.

## Project Setup

- Create a vanilla HTML/CSS/JS project (no framework, no build step — must deploy directly to GitHub Pages)
- Single `index.html` entry point with modular JS files
- Mobile-first responsive design, dark mode default
- PWA with `manifest.json` and `service-worker.js` for offline support and "Add to Home Screen"
- All dependencies loaded via CDN (no npm, no bundler):
  - TensorFlow.js: `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs`
  - BlazeFace: `https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface`
  - piexifjs: `https://cdn.jsdelivr.net/npm/piexifjs` (for EXIF writing)
  - exifr: `https://cdn.jsdelivr.net/npm/exifr` (for EXIF reading from uploads)

## File Structure

```
sungma/
├── index.html              # Main app shell
├── manifest.json           # PWA manifest
├── service-worker.js       # Offline caching
├── css/
│   └── style.css           # All styles, mobile-first, dark mode
├── js/
│   ├── app.js              # Main app initialization and UI state
│   ├── camera.js           # Camera stream management (front/rear toggle)
│   ├── detection.js        # TensorFlow.js BlazeFace face detection
│   ├── pixelation.js       # Canvas rendering with pixelation overlay
│   ├── recorder.js         # MediaRecorder for video + audio recording
│   ├── audio.js            # Voice distortion via Web Audio API
│   ├── metadata.js         # EXIF stripping, GPS/timestamp preservation, proof embedding
│   ├── photo.js            # Photo capture and export
│   ├── share.js            # Download and Web Share API
│   └── utils.js            # Helpers, canvas fingerprint noise, etc.
├── icons/                  # PWA icons (192x192, 512x512)
├── SPEC.md                 # Full project specification
└── README.md               # Project readme
```

## Phase 1 Features to Build

### 1. Live Camera with Face Pixelation
- Use `navigator.mediaDevices.getUserMedia()` to access camera
- Default to rear camera, toggle button for front/rear
- Feed camera stream into a hidden `<video>` element
- Run BlazeFace detection on each frame (~15-30fps depending on device)
- Draw each frame to a `<canvas>` element
- For each detected face bounding box, pixelate that region on the canvas:
  - Read the pixel data in the face region
  - Divide into blocks (e.g., 10x10 pixels)
  - Average the color of each block
  - Fill the block with the averaged color
- The canvas is what the user sees — the raw video is never displayed

### 2. Photo Capture
- Tap shutter button → capture current canvas frame as PNG
- Use `canvas.toBlob()` for the export
- Before saving, run metadata processing (see section 6)
- Show captured photo preview with save/share/discard options

### 3. Video Recording
- Use `MediaRecorder` API on `canvas.captureStream(30)` (30fps)
- Record audio from the microphone simultaneously
- If voice distortion is enabled, pipe audio through Web Audio API before recording
- Combine pixelated video + (optionally distorted) audio into single recording
- Show recording indicator (red dot + timer)
- Stop recording → show preview with save/share/discard
- Output format: WebM (widest MediaRecorder support)

### 4. Audio-Only Recording
- Separate mode for voice-only testimony
- MediaRecorder on audio stream only
- Optional voice distortion toggle
- Output as .ogg or .webm audio

### 5. Voice Distortion
- Web Audio API: `createScriptProcessor` or `AudioWorklet`
- Pitch shift down by configurable amount (subtle, medium, heavy presets)
- Apply to both live preview (so user hears themselves distorted) and recording
- Toggle on/off in UI

### 6. Smart Metadata Handling
- **For photos captured via canvas:** Canvas `.toBlob()` exports produce clean files with zero EXIF. This is our baseline — automatically safe.
- **GPS preservation:** Use `navigator.geolocation.getCurrentPosition()` to get current GPS. Use piexifjs to write ONLY these EXIF fields into the exported PNG/JPEG:
  - GPSLatitude, GPSLongitude
  - GPSAltitude (if available)
  - GPSImgDirection (if available)
  - DateTimeOriginal
- **User toggles in settings:**
  - "Include GPS location" (default: ON)
  - "Include date/time" (default: ON)
- **For uploaded files (Phase 2):** Read EXIF with exifr, extract GPS+timestamp, strip everything, re-embed only GPS+timestamp with piexifjs.

### 7. Embedded Proof Data
- After creating the final image/video file, embed invisible proof data:
- **For PNG:** Use PNG tEXt chunk. Write a custom text chunk with key "sungma-proof" containing a JSON string:
  ```json
  {
    "v": "1.0.0",
    "hash": "sha256:abc123...",
    "gps": [27.7172, 85.3240],
    "time": "2026-02-23T14:30:07Z",
    "note": "user note if provided"
  }
  ```
- **Hash calculation:** Use `crypto.subtle.digest('SHA-256', fileBuffer)` on the image data BEFORE embedding the proof (hash the pixel content, then embed the hash)
- **Optional encryption:** If user sets a passphrase, encrypt the proof JSON with AES-256-GCM via Web Crypto API before embedding. The embedded data then looks like random bytes.
- **For video (WebM):** Store proof as a Matroska tag or as a custom metadata field. If this is too complex for MVP, write proof to a `.sungma` JSON sidecar file that downloads alongside the video.

### 8. Canvas Fingerprint Protection
- Before exporting any image, inject random noise into the least significant bits of a small number of random pixels
- This prevents canvas fingerprinting (where GPU rendering differences can identify a device)
- The noise is imperceptible to the human eye
- Implementation: iterate over a random 1-2% of pixels in the ImageData, and flip the LSB of one color channel randomly

### 9. PWA / Offline Support
- `manifest.json` with:
  - name: "Sungma"
  - short_name: "Sungma"
  - description: "Privacy camera for activists"
  - theme_color: dark theme color
  - display: "standalone"
  - icons at 192x192 and 512x512
- `service-worker.js`:
  - Cache all app assets on install (HTML, CSS, JS, TF.js model files)
  - Serve from cache first, fall back to network
  - The app must work fully offline after first load (camera, pixelation, photo/video capture, save to device)
  - Only GPS geolocation requires network (graceful fallback: just skip GPS if offline)

### 10. UI / UX Design
- **Dark mode default** — less conspicuous in the field
- **Mobile-first** — designed for phones held vertically
- **Minimal UI** — camera viewfinder takes up most of the screen
- **Large touch targets** — big buttons for high-stress use
- **Layout:**
  ```
  ┌─────────────────────────────┐
  │  Sungma  [⚙️] [🔄 cam]      │  ← Header: settings, camera toggle
  │                             │
  │  ┌───────────────────────┐  │
  │  │                       │  │
  │  │   Canvas viewfinder   │  │  ← Full-width pixelated preview
  │  │   (faces pixelated)   │  │
  │  │                       │  │
  │  │   "2 faces detected"  │  │  ← Subtle face count indicator
  │  └───────────────────────┘  │
  │                             │
  │  [🎤 Distort: OFF]          │  ← Voice distortion toggle
  │                             │
  │  [📸]    [⏺️ Record]   [🎤]  │  ← Photo / Video / Audio buttons
  │                             │
  │  [📋 Settings panel]        │  ← Expandable: GPS toggle, timestamp,
  │                             │     proof passphrase, etc.
  └─────────────────────────────┘
  ```
- **Settings panel** (expandable from bottom or gear icon):
  - GPS location: ON/OFF toggle
  - Date/time: ON/OFF toggle
  - Voice distortion: OFF / Subtle / Medium / Heavy
  - Proof passphrase: text input (optional)
  - Event note: text input (optional)
  - About / Version info
- **After capture, show preview overlay:**
  - Captured photo/video preview
  - [✅ Save] [📤 Share] [🗑️ Discard]
  - File size indicator
- **Color palette:**
  - Background: #0a0a0a (near-black)
  - Primary accent: #10b981 (green — safe, protective)
  - Text: #e5e5e5 (light gray)
  - Danger/recording: #ef4444 (red)
  - Borders/subtle: #262626

## Important Technical Notes

1. **BlazeFace model loading:** The TF.js model needs to be loaded once on app start. Show a loading indicator. Cache the model via service worker for offline use. The model is small (~200KB).

2. **Performance:** BlazeFace is fast but canvas redraw at 30fps with pixelation can be heavy on low-end phones. Implement frame skipping — run detection every 2-3 frames and reuse the last known face positions for intermediate frames.

3. **Camera permissions:** Handle all permission states gracefully — prompt, granted, denied. Show clear instructions if denied.

4. **MediaRecorder codec support:** Different browsers support different codecs. Try `video/webm;codecs=vp9,opus` first, fall back to `video/webm;codecs=vp8,opus`, then `video/webm`. Check `MediaRecorder.isTypeSupported()`.

5. **Memory management:** For long video recordings, the MediaRecorder stores data in memory. Implement chunked recording — save chunks periodically to avoid out-of-memory crashes on mobile. Use `ondataavailable` with a timeslice parameter.

6. **Canvas toBlob for PNG with tEXt chunks:** The standard `canvas.toBlob()` won't let you add custom PNG chunks. You'll need to manually construct the PNG binary — take the blob output, parse the PNG structure, inject a tEXt chunk before the IEND chunk, and create a new blob. There are lightweight libraries for this, or write a small PNG chunk injector.

7. **HTTPS required:** Both `getUserMedia` (camera) and `navigator.geolocation` require HTTPS. GitHub Pages provides this automatically.

8. **Do not include any analytics, tracking, telemetry, or external requests** beyond the CDN-loaded libraries. The app must be fully self-contained after initial load.

## What NOT to Build Yet

- No user accounts or authentication
- No server-side anything
- No file upload/pixelate (that's Phase 2)
- No body detection (Phase 2)
- No interview split-screen mode (Phase 2)
- No cloud upload or P2P sharing (Phase 3)
- No panic button or stealth mode (Phase 4)
- No organization channels (Phase 5)

## Deliverable

A fully functional PWA that:
1. Opens the camera with real-time face pixelation
2. Captures pixelated photos with clean metadata + embedded proof
3. Records pixelated video with optional voice distortion
4. Records audio-only with optional distortion
5. Saves to device and shares via native share sheet
6. Works offline after first visit
7. Is installable as a PWA
8. Looks clean, professional, and works well on mobile

Start by setting up the project structure and index.html, then implement the camera + face detection + pixelation pipeline first — that's the core of everything else.
