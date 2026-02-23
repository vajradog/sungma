/**
 * Sungma — Canvas rendering with face pixelation overlay
 */

Sungma.Pixelation = (() => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let animFrameId = null;
  let running = false;
  const BLOCK_SIZE = 12; // Pixelation block size in pixels

  /**
   * Start the render loop: draws video frames to canvas with face pixelation.
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

      // Detect faces and pixelate
      const faces = await Sungma.Detection.detect(video);
      for (const face of faces) {
        pixelateRegion(face.x, face.y, face.width, face.height);
      }

      // Interview mode: draw PiP overlay (interviewer, no pixelation)
      if (Sungma.Interview && Sungma.Interview.isActive()) {
        Sungma.Interview.drawPiP(ctx, canvas.width, canvas.height);
      }

      // Update face count UI
      updateFaceCount(faces.length);
    }

    animFrameId = requestAnimationFrame(loop);
  }

  /**
   * Pixelate a rectangular region on the canvas.
   */
  function pixelateRegion(rx, ry, rw, rh) {
    // Clamp to canvas bounds
    const x = Math.max(0, rx);
    const y = Math.max(0, ry);
    const w = Math.min(rw, canvas.width - x);
    const h = Math.min(rh, canvas.height - y);
    if (w <= 0 || h <= 0) return;

    const imageData = ctx.getImageData(x, y, w, h);
    const data = imageData.data;

    for (let by = 0; by < h; by += BLOCK_SIZE) {
      for (let bx = 0; bx < w; bx += BLOCK_SIZE) {
        // Calculate average color for this block
        let r = 0, g = 0, b = 0, count = 0;
        const blockW = Math.min(BLOCK_SIZE, w - bx);
        const blockH = Math.min(BLOCK_SIZE, h - by);

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

        // Fill block with averaged color
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

  let lastFaceCountUpdate = 0;
  function updateFaceCount(count) {
    const now = performance.now();
    if (now - lastFaceCountUpdate < 300) return; // Throttle UI updates
    lastFaceCountUpdate = now;

    const el = document.getElementById('face-count');
    if (count > 0) {
      el.textContent = `${count} face${count !== 1 ? 's' : ''} detected`;
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }

  function getCanvas() {
    return canvas;
  }

  function getContext() {
    return ctx;
  }

  return { start, stop, getCanvas, getContext };
})();
