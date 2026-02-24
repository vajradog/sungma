/**
 * Sungma — Face detection with TensorFlow.js face-detection API
 * Uses MediaPipe BlazeFace (short-range) model via @tensorflow-models/face-detection
 * Performance-optimized: tensor cleanup, adaptive frame skip, scaled input
 */

Sungma.Detection = (() => {
  let detector = null;
  let lastFaces = [];
  let frameCount = 0;
  let detectInterval = 4; // Adaptive — starts at 4, increases if slow
  let lastDetectTime = 0;

  // Offscreen canvas for scaled detection input
  let detectCanvas = null;
  let detectCtx = null;
  const DETECT_SIZE = 256; // Downscale to 256px for faster preprocessing

  async function loadModel(onProgress) {
    try {
      await tf.setBackend('webgl');
      await tf.ready();
      // Aggressively clean up GPU memory
      tf.env().set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0);
      if (onProgress) onProgress(0.3);

      detector = await faceDetection.createDetector(
        faceDetection.SupportedModels.MediaPipeFaceDetector,
        { runtime: 'tfjs', modelType: 'short', maxFaces: 20 }
      );
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
        detector = await faceDetection.createDetector(
          faceDetection.SupportedModels.MediaPipeFaceDetector,
          { runtime: 'tfjs', modelType: 'short', maxFaces: 20 }
        );
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
   * Optimized: scaled detection input, adaptive frame skip.
   * Uses the face-detection API (MediaPipe BlazeFace short-range).
   */
  async function detect(videoEl) {
    if (!detector || !videoEl || videoEl.readyState < 2) return lastFaces;

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
      detectCanvas.width = sw;
      detectCanvas.height = sh;
      detectCtx.clearRect(0, 0, sw, sh);
      detectCtx.drawImage(videoEl, 0, 0, sw, sh);

      // Run detection on scaled-down canvas
      const predictions = await detector.estimateFaces(detectCanvas);

      // Map predictions back to original video coordinates
      const invScale = 1 / scale;
      lastFaces = predictions.map(f => {
        const box = f.box;
        const rx = box.xMin * invScale;
        const ry = box.yMin * invScale;
        const rw = box.width * invScale;
        const rh = box.height * invScale;
        const padX = rw * 0.15;
        const padY = rh * 0.2;
        return {
          x: Math.max(0, Math.floor(rx - padX)),
          y: Math.max(0, Math.floor(ry - padY)),
          width: Math.ceil(rw + padX * 2),
          height: Math.ceil(rh + padY * 2),
          probability: 1.0,
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
    return detector !== null;
  }

  function getDetectTime() {
    return lastDetectTime;
  }

  return { loadModel, detect, getFaceCount, isLoaded, getDetectTime };
})();
