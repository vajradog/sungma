/**
 * Sungma — Canvas rendering with face pixelation overlay
 * Supports multiple cover styles: pixelate (light/medium/heavy) and blackbox
 *
 * CRITICAL PRIVACY FIX: Uses double-buffering to prevent raw face frames from
 * ever appearing on screen. All compositing happens on an offscreen canvas;
 * only the fully-protected frame is copied to the visible canvas.
 */

Sungma.Pixelation = (() => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  let animFrameId = null;
  let running = false;

  // Offscreen (back-buffer) canvas — raw video + pixelation drawn here first
  let offCanvas = null;
  let offCtx = null;

  // Cover style: 'light' | 'medium' | 'heavy' | 'blackbox'
  let coverStyle = 'medium';

  // Block sizes per style
  const BLOCK_SIZES = {
    light: 8,
    medium: 14,
    heavy: 24,
  };

  function ensureOffscreen(w, h) {
    if (!offCanvas) {
      offCanvas = document.createElement('canvas');
      offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
    }
    if (offCanvas.width !== w || offCanvas.height !== h) {
      offCanvas.width = w;
      offCanvas.height = h;
    }
  }

  function setCoverStyle(style) {
    coverStyle = style;
  }

  function getCoverStyle() {
    return coverStyle;
  }

  /**
   * Start the render loop.
   */
  function start() {
    if (running) return;
    running = true;
    loop();
  }

  function stop() {
    running = false;
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  async function loop() {
    if (!running) return;

    const video = Sungma.Camera.getVideo();
    if (video && video.readyState >= 2) {
      const vw = video.videoWidth;
      const vh = video.videoHeight;

      // Match visible canvas to video dimensions
      if (canvas.width !== vw || canvas.height !== vh) {
        canvas.width = vw;
        canvas.height = vh;
      }
      ensureOffscreen(vw, vh);

      // ---- Draw everything to OFFSCREEN canvas first ----
      offCtx.drawImage(video, 0, 0, vw, vh);

      // Detect faces (may await, but raw frame is only on the offscreen buffer)
      const faces = await Sungma.Detection.detect(video);
      for (const face of faces) {
        if (coverStyle === 'blackbox') {
          blackboxRegion(offCtx, offCanvas, face.x, face.y, face.width, face.height);
        } else {
          pixelateRegion(offCtx, offCanvas, face.x, face.y, face.width, face.height);
        }
      }

      // Interview mode PiP overlay
      if (Sungma.Interview && Sungma.Interview.isActive()) {
        Sungma.Interview.drawPiP(offCtx, vw, vh);
      }

      // ---- Atomically copy the fully-protected frame to the visible canvas ----
      ctx.drawImage(offCanvas, 0, 0);

      updateFaceCount(faces.length);
    }

    animFrameId = requestAnimationFrame(loop);
  }

  /**
   * Pixelate a rectangular region on the given context/canvas.
   */
  function pixelateRegion(drawCtx, drawCanvas, rx, ry, rw, rh) {
    const x = Math.max(0, rx);
    const y = Math.max(0, ry);
    const w = Math.min(rw, drawCanvas.width - x);
    const h = Math.min(rh, drawCanvas.height - y);
    if (w <= 0 || h <= 0) return;

    const blockSize = BLOCK_SIZES[coverStyle] || 14;
    const imageData = drawCtx.getImageData(x, y, w, h);
    const data = imageData.data;

    for (let by = 0; by < h; by += blockSize) {
      for (let bx = 0; bx < w; bx += blockSize) {
        let r = 0, g = 0, b = 0, count = 0;
        const blockW = Math.min(blockSize, w - bx);
        const blockH = Math.min(blockSize, h - by);

        for (let py = 0; py < blockH; py++) {
          for (let px = 0; px < blockW; px++) {
            const idx = ((by + py) * w + (bx + px)) * 4;
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            count++;
          }
        }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        for (let py = 0; py < blockH; py++) {
          for (let px = 0; px < blockW; px++) {
            const idx = ((by + py) * w + (bx + px)) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
          }
        }
      }
    }

    drawCtx.putImageData(imageData, x, y);
  }

  /**
   * Fill a region with solid black (blackbox mode).
   */
  function blackboxRegion(drawCtx, drawCanvas, rx, ry, rw, rh) {
    const x = Math.max(0, rx);
    const y = Math.max(0, ry);
    const w = Math.min(rw, drawCanvas.width - x);
    const h = Math.min(rh, drawCanvas.height - y);
    if (w <= 0 || h <= 0) return;

    drawCtx.fillStyle = '#000000';
    // Rounded rectangle for a cleaner look
    const radius = Math.min(w, h) * 0.12;
    drawCtx.beginPath();
    drawCtx.moveTo(x + radius, y);
    drawCtx.lineTo(x + w - radius, y);
    drawCtx.quadraticCurveTo(x + w, y, x + w, y + radius);
    drawCtx.lineTo(x + w, y + h - radius);
    drawCtx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    drawCtx.lineTo(x + radius, y + h);
    drawCtx.quadraticCurveTo(x, y + h, x, y + h - radius);
    drawCtx.lineTo(x, y + radius);
    drawCtx.quadraticCurveTo(x, y, x + radius, y);
    drawCtx.closePath();
    drawCtx.fill();
  }

  let lastFaceCountUpdate = 0;
  function updateFaceCount(count) {
    const now = performance.now();
    if (now - lastFaceCountUpdate < 300) return;
    lastFaceCountUpdate = now;

    const el = document.getElementById('face-count');
    if (count > 0) {
      el.textContent = `${count} face${count !== 1 ? 's' : ''} detected`;
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }

  function getCanvas() { return canvas; }
  function getContext() { return ctx; }

  return { start, stop, getCanvas, getContext, setCoverStyle, getCoverStyle };
})();
