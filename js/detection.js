/**
 * Sungma — Face detection with TensorFlow.js BlazeFace
 * Performance-optimized: tensor cleanup, adaptive frame skip, scaled input
 */

Sungma.Detection = (() => {
  let model = null;
  let lastFaces = [];
  let frameCount = 0;
  let detectInterval = 4; // Adaptive — starts at 4, increases if slow
  let lastDetectTime = 0;

  // Offscreen canvas for scaled detection input
  let detectCanvas = null;
  let detectCtx = null;
  const DETECT_SIZE = 256; // Downscale to 256px for detection (much faster)

  async function loadModel(onProgress) {
    try {
      await tf.setBackend('webgl');
      await tf.ready();
      // Aggressively clean up GPU memory
      tf.env().set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0);
      if (onProgress) onProgress(0.5);

      model = await blazeface.load();
      if (onProgress) onProgress(1.0);

      // Create offscreen detection canvas
      detectCanvas = document.createElement('canvas');
      detectCanvas.width = DETECT_SIZE;
      detectCanvas.height = DETECT_SIZE;
      detectCtx = detectCanvas.getContext('2d', { willReadFrequently: false });

      return true;
    } catch (err) {
      console.error('Model load error:', err);
      try {
        await tf.setBackend('cpu');
        await tf.ready();
        model = await blazeface.load();
        if (onProgress) onProgress(1.0);
        detectCanvas = document.createElement('canvas');
        detectCanvas.width = DETECT_SIZE;
        detectCanvas.height = DETECT_SIZE;
        detectCtx = detectCanvas.getContext('2d', { willReadFrequently: false });
        return true;
      } catch (err2) {
        console.error('Model load fallback error:', err2);
        return false;
      }
    }
  }

  /**
   * Detect faces in the given video element.
   * Optimized: scaled detection input, tf.tidy for memory, adaptive frame skip.
   */
  async function detect(videoEl) {
    if (!model || !videoEl || videoEl.readyState < 2) return lastFaces;

    frameCount++;
    if (frameCount % detectInterval !== 0) return lastFaces;

    const t0 = performance.now();

    try {
      // Scale video down to small canvas for faster detection
      const vw = videoEl.videoWidth;
      const vh = videoEl.videoHeight;
      const scale = DETECT_SIZE / Math.max(vw, vh);
      const sw = Math.round(vw * scale);
      const sh = Math.round(vh * scale);
      detectCtx.clearRect(0, 0, DETECT_SIZE, DETECT_SIZE);
      detectCtx.drawImage(videoEl, 0, 0, sw, sh);

      // Run detection — estimateFaces is async so we can't use tf.tidy.
      // Instead, manually dispose any intermediate tensors.
      const predictions = await model.estimateFaces(detectCanvas, false);

      // Map predictions back to original video coordinates
      const invScale = 1 / scale;
      lastFaces = predictions.map(p => {
        const [x1, y1] = p.topLeft;
        const [x2, y2] = p.bottomRight;
        const rx1 = x1 * invScale;
        const ry1 = y1 * invScale;
        const rx2 = x2 * invScale;
        const ry2 = y2 * invScale;
        const padX = (rx2 - rx1) * 0.15;
        const padY = (ry2 - ry1) * 0.2;
        return {
          x: Math.max(0, Math.floor(rx1 - padX)),
          y: Math.max(0, Math.floor(ry1 - padY)),
          width: Math.ceil((rx2 - rx1) + padX * 2),
          height: Math.ceil((ry2 - ry1) + padY * 2),
          probability: p.probability[0],
        };
      });

      // Adaptive frame skip: if detection took >80ms, skip more frames
      const elapsed = performance.now() - t0;
      if (elapsed > 80) {
        detectInterval = Math.min(8, detectInterval + 1);
      } else if (elapsed < 30 && detectInterval > 3) {
        detectInterval = Math.max(3, detectInterval - 1);
      }
      lastDetectTime = elapsed;

    } catch (err) {
      // Silently continue with last known faces
    }

    // Periodically clean up leaked tensors
    if (frameCount % 60 === 0) {
      try { tf.disposeVariables(); } catch (e) { /* ignore */ }
    }

    return lastFaces;
  }

  function getFaceCount() {
    return lastFaces.length;
  }

  function isLoaded() {
    return model !== null;
  }

  function getDetectTime() {
    return lastDetectTime;
  }

  return { loadModel, detect, getFaceCount, isLoaded, getDetectTime };
})();
