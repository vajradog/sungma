/**
 * Sungma — Canvas rendering with face pixelation overlay
 * Supports multiple cover styles: pixelate (light/medium/heavy) and blackbox
 */

Sungma.Pixelation = (() => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let animFrameId = null;
  let running = false;

  // Cover style: 'light' | 'medium' | 'heavy' | 'blackbox'
  let coverStyle = 'medium';

  // Block sizes per style
  const BLOCK_SIZES = {
    light: 8,
    medium: 14,
    heavy: 24,
  };

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
      // Match canvas to video dimensions
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Draw the raw frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Detect faces and apply cover
      const faces = await Sungma.Detection.detect(video);
      for (const face of faces) {
        if (coverStyle === 'blackbox') {
          blackboxRegion(face.x, face.y, face.width, face.height);
        } else {
          pixelateRegion(face.x, face.y, face.width, face.height);
        }
      }

      // Interview mode PiP overlay
      if (Sungma.Interview && Sungma.Interview.isActive()) {
        Sungma.Interview.drawPiP(ctx, canvas.width, canvas.height);
      }

      updateFaceCount(faces.length);
    }

    animFrameId = requestAnimationFrame(loop);
  }

  /**
   * Pixelate a rectangular region on the canvas.
   */
  function pixelateRegion(rx, ry, rw, rh) {
    const x = Math.max(0, rx);
    const y = Math.max(0, ry);
    const w = Math.min(rw, canvas.width - x);
    const h = Math.min(rh, canvas.height - y);
    if (w <= 0 || h <= 0) return;

    const blockSize = BLOCK_SIZES[coverStyle] || 14;
    const imageData = ctx.getImageData(x, y, w, h);
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

    ctx.putImageData(imageData, x, y);
  }

  /**
   * Fill a region with solid black (blackbox mode).
   */
  function blackboxRegion(rx, ry, rw, rh) {
    const x = Math.max(0, rx);
    const y = Math.max(0, ry);
    const w = Math.min(rw, canvas.width - x);
    const h = Math.min(rh, canvas.height - y);
    if (w <= 0 || h <= 0) return;

    ctx.fillStyle = '#000000';
    // Rounded rectangle for a cleaner look
    const radius = Math.min(w, h) * 0.12;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
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
