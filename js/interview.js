/**
 * Sungma — Interview mode: dual-camera PiP with selective pixelation
 *
 * Back camera (rear) → full screen → interviewee → PIXELATED
 * Front camera → PiP bottom-right → interviewer → VISIBLE (no pixelation)
 *
 * On devices that don't support simultaneous cameras (iOS),
 * falls back to single-camera mode with a "tap to switch" prompt.
 */

Sungma.Interview = (() => {
  let active = false;
  let rearStream = null;
  let frontStream = null;
  let rearDeviceId = null;
  let frontDeviceId = null;
  let dualSupported = false;

  const pipVideo = document.getElementById('video-pip');

  // PiP layout constants (relative to canvas)
  const PIP = {
    margin: 16,       // px from canvas edge
    widthRatio: 0.28, // PiP width as fraction of canvas width
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#262626',
  };

  /**
   * Enumerate cameras and identify front/rear device IDs.
   */
  async function enumerateDevices() {
    // We need at least a temporary stream to get device labels
    let tempStream = null;
    try {
      tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
    } catch (e) {
      return false;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(d => d.kind === 'videoinput');

    // Stop temp stream
    tempStream.getTracks().forEach(t => t.stop());

    if (cameras.length < 2) return false;

    // Try to identify front/rear by label or facingMode
    for (const cam of cameras) {
      const label = (cam.label || '').toLowerCase();
      if (label.includes('back') || label.includes('rear') || label.includes('environment')) {
        rearDeviceId = cam.deviceId;
      } else if (label.includes('front') || label.includes('user') || label.includes('facetime')) {
        frontDeviceId = cam.deviceId;
      }
    }

    // Fallback: assume first camera is front, second is rear (common on mobile)
    if (!rearDeviceId && !frontDeviceId && cameras.length >= 2) {
      // On most phones: index 0 = rear, index 1 = front (but varies)
      // We'll use facingMode constraints to be safe
      rearDeviceId = null;  // will use facingMode
      frontDeviceId = null;
      return true;
    }

    return !!(rearDeviceId || frontDeviceId);
  }

  /**
   * Start interview mode: open both cameras.
   */
  async function start() {
    if (active) return true;

    // First, stop the normal single camera
    Sungma.Camera.stop();
    Sungma.Pixelation.stop();

    const hasMultiple = await enumerateDevices();

    // Open rear camera (main viewfinder)
    const mainVideo = Sungma.Camera.getVideo();
    try {
      const rearConstraints = rearDeviceId
        ? { video: { deviceId: { exact: rearDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }
        : { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false };

      rearStream = await navigator.mediaDevices.getUserMedia(rearConstraints);
      mainVideo.srcObject = rearStream;
      await mainVideo.play();
    } catch (err) {
      console.error('Interview: rear camera error:', err);
      // Fallback: try any camera
      try {
        rearStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        mainVideo.srcObject = rearStream;
        await mainVideo.play();
      } catch (err2) {
        console.error('Interview: no camera available:', err2);
        return false;
      }
    }

    // Open front camera (PiP)
    dualSupported = false;
    if (hasMultiple) {
      try {
        const frontConstraints = frontDeviceId
          ? { video: { deviceId: { exact: frontDeviceId }, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false }
          : { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false };

        frontStream = await navigator.mediaDevices.getUserMedia(frontConstraints);
        pipVideo.srcObject = frontStream;
        await pipVideo.play();
        dualSupported = true;
      } catch (err) {
        console.warn('Interview: dual camera not supported, PiP unavailable:', err);
        frontStream = null;
        dualSupported = false;
      }
    }

    active = true;
    Sungma.Pixelation.start();

    return true;
  }

  /**
   * Stop interview mode: release both streams, return to normal camera.
   */
  async function stop() {
    if (!active) return;

    active = false;
    Sungma.Pixelation.stop();

    // Stop rear stream
    if (rearStream) {
      rearStream.getTracks().forEach(t => t.stop());
      rearStream = null;
    }

    // Stop front stream
    if (frontStream) {
      frontStream.getTracks().forEach(t => t.stop());
      frontStream = null;
    }

    pipVideo.srcObject = null;

    // Re-start normal single camera
    await Sungma.Camera.start();
    Sungma.Pixelation.start();
  }

  /**
   * Draw the PiP (front camera / interviewer) onto the canvas.
   * Called by the pixelation render loop when interview mode is active.
   * The PiP is drawn WITHOUT pixelation — interviewer's face is visible.
   */
  function drawPiP(ctx, canvasW, canvasH) {
    if (!active || !dualSupported || !pipVideo || pipVideo.readyState < 2) return;

    const pipW = Math.round(canvasW * PIP.widthRatio);
    const pipH = Math.round(pipW * (pipVideo.videoHeight / pipVideo.videoWidth));
    const pipX = canvasW - pipW - PIP.margin;
    const pipY = canvasH - pipH - PIP.margin;

    // Draw rounded rectangle clip + border
    ctx.save();

    // Border
    ctx.strokeStyle = PIP.borderColor;
    ctx.lineWidth = PIP.borderWidth;
    roundedRect(ctx, pipX - PIP.borderWidth, pipY - PIP.borderWidth,
      pipW + PIP.borderWidth * 2, pipH + PIP.borderWidth * 2, PIP.borderRadius);
    ctx.stroke();

    // Clip to rounded rect
    ctx.beginPath();
    roundedRect(ctx, pipX, pipY, pipW, pipH, PIP.borderRadius);
    ctx.clip();

    // Draw front camera frame — NO pixelation (interviewer visible)
    ctx.drawImage(pipVideo, pipX, pipY, pipW, pipH);

    ctx.restore();

    // Label
    ctx.save();
    ctx.font = `bold ${Math.round(canvasH * 0.018)}px -apple-system, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'right';
    ctx.fillText('You', pipX + pipW - 8, pipY + Math.round(canvasH * 0.025));
    ctx.restore();
  }

  /**
   * Helper: draw a rounded rectangle path.
   */
  function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function isActive() {
    return active;
  }

  function isDualSupported() {
    return dualSupported;
  }

  return { start, stop, drawPiP, isActive, isDualSupported };
})();
