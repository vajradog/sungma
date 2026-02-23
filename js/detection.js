/**
 * Sungma — Face detection with TensorFlow.js BlazeFace
 */

Sungma.Detection = (() => {
  let model = null;
  let lastFaces = [];
  let frameCount = 0;
  const DETECT_INTERVAL = 3; // Run detection every N frames

  async function loadModel(onProgress) {
    try {
      // Set TF.js backend
      await tf.setBackend('webgl');
      await tf.ready();
      if (onProgress) onProgress(0.5);

      model = await blazeface.load();
      if (onProgress) onProgress(1.0);

      return true;
    } catch (err) {
      console.error('Model load error:', err);
      // Fallback to CPU backend
      try {
        await tf.setBackend('cpu');
        await tf.ready();
        model = await blazeface.load();
        if (onProgress) onProgress(1.0);
        return true;
      } catch (err2) {
        console.error('Model load fallback error:', err2);
        return false;
      }
    }
  }

  /**
   * Detect faces in the given video element.
   * Uses frame skipping — only runs full detection every DETECT_INTERVAL frames,
   * reusing last positions for intermediate frames.
   */
  async function detect(videoEl) {
    if (!model || !videoEl || videoEl.readyState < 2) return lastFaces;

    frameCount++;

    if (frameCount % DETECT_INTERVAL === 0) {
      try {
        const predictions = await model.estimateFaces(videoEl, false);
        lastFaces = predictions.map(p => {
          const [x1, y1] = p.topLeft;
          const [x2, y2] = p.bottomRight;
          // Add some padding around the detected face
          const padX = (x2 - x1) * 0.15;
          const padY = (y2 - y1) * 0.2;
          return {
            x: Math.max(0, Math.floor(x1 - padX)),
            y: Math.max(0, Math.floor(y1 - padY)),
            width: Math.ceil((x2 - x1) + padX * 2),
            height: Math.ceil((y2 - y1) + padY * 2),
            probability: p.probability[0],
          };
        });
      } catch (err) {
        // Silently continue with last known faces
      }
    }

    return lastFaces;
  }

  function getFaceCount() {
    return lastFaces.length;
  }

  function isLoaded() {
    return model !== null;
  }

  return { loadModel, detect, getFaceCount, isLoaded };
})();
