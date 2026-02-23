/**
 * Sungma — Main app initialization and UI state
 */

Sungma.App = (() => {
  // Settings state
  const settings = {
    includeGPS: true,
    includeDateTime: true,
    distortion: 'off',
    passphrase: '',
    note: '',
  };

  // Current preview state
  let previewBlob = null;
  let previewType = null; // 'photo', 'video', 'audio'
  let previewFilename = null;

  /**
   * Initialize the app.
   */
  async function init() {
    // Load BlazeFace model
    const loaded = await Sungma.Detection.loadModel((progress) => {
      const fill = document.querySelector('.loading-bar-fill');
      if (fill) fill.style.width = `${progress * 100}%`;
    });

    if (!loaded) {
      document.querySelector('.loading-subtitle').textContent =
        'Failed to load face detection model. Please refresh.';
      return;
    }

    // Hide loading, show app
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');

    // Start camera
    const cameraStarted = await Sungma.Camera.start();
    if (cameraStarted) {
      document.getElementById('camera-prompt').classList.add('hidden');
      Sungma.Pixelation.start();
      // Pre-fetch GPS in background
      if (settings.includeGPS) Sungma.Metadata.getGPS();
    } else {
      document.getElementById('camera-prompt').classList.remove('hidden');
      document.getElementById('camera-prompt-text').textContent =
        'Camera access is required. Please allow camera permissions.';
    }

    bindEvents();
    loadSettings();
  }

  /**
   * Bind all UI event listeners.
   */
  function bindEvents() {
    // Allow camera button (retry)
    document.getElementById('btn-allow-camera').addEventListener('click', async () => {
      const ok = await Sungma.Camera.start();
      if (ok) {
        document.getElementById('camera-prompt').classList.add('hidden');
        Sungma.Pixelation.start();
      }
    });

    // Flip camera
    document.getElementById('btn-flip-camera').addEventListener('click', async () => {
      await Sungma.Camera.flip();
    });

    // Photo capture
    document.getElementById('btn-photo').addEventListener('click', handlePhoto);

    // Video record
    document.getElementById('btn-record').addEventListener('click', handleVideoRecord);

    // Audio record
    document.getElementById('btn-audio').addEventListener('click', handleAudioRecord);

    // Interview mode
    document.getElementById('btn-interview').addEventListener('click', handleInterview);

    // Voice distortion toggle
    document.getElementById('btn-distortion').addEventListener('click', cycleDistortion);

    // Settings
    document.getElementById('btn-settings').addEventListener('click', () => {
      document.getElementById('settings-panel').classList.remove('hidden');
    });
    document.getElementById('btn-close-settings').addEventListener('click', closeSettings);
    document.querySelector('.settings-backdrop').addEventListener('click', closeSettings);

    // Settings inputs
    document.getElementById('setting-gps').addEventListener('change', (e) => {
      settings.includeGPS = e.target.checked;
      saveSettings();
    });
    document.getElementById('setting-datetime').addEventListener('change', (e) => {
      settings.includeDateTime = e.target.checked;
      saveSettings();
    });
    document.querySelectorAll('input[name="distortion"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        settings.distortion = e.target.value;
        Sungma.Audio.setLevel(settings.distortion);
        updateDistortionUI();
        saveSettings();
      });
    });
    document.getElementById('setting-passphrase').addEventListener('input', (e) => {
      settings.passphrase = e.target.value;
    });
    document.getElementById('setting-note').addEventListener('input', (e) => {
      settings.note = e.target.value;
    });

    // Preview actions
    document.getElementById('btn-save').addEventListener('click', handleSave);
    document.getElementById('btn-share').addEventListener('click', handleShare);
    document.getElementById('btn-discard').addEventListener('click', handleDiscard);
  }

  // === Action Handlers ===

  async function handlePhoto() {
    if (!Sungma.Camera.isActive()) return;

    const btn = document.getElementById('btn-photo');
    btn.classList.add('active');
    setTimeout(() => btn.classList.remove('active'), 200);

    try {
      const blob = await Sungma.Photo.capture(settings);
      const filename = Sungma.Utils.generateFilename('photo', 'png');
      showPreview(blob, 'photo', filename);
    } catch (err) {
      console.error('Photo capture failed:', err);
    }
  }

  async function handleVideoRecord() {
    if (Sungma.Recorder.isRecording() && Sungma.Recorder.getType() === 'video') {
      // Stop recording
      const result = await Sungma.Recorder.stop();
      document.getElementById('btn-record').classList.remove('recording');
      if (result) {
        const ext = result.mimeType.includes('webm') ? 'webm' : 'webm';
        const filename = Sungma.Utils.generateFilename('video', ext);
        showPreview(result.blob, 'video', filename);
      }
      return;
    }

    if (Sungma.Recorder.isRecording()) return; // Already recording something else

    const ok = await Sungma.Recorder.startVideo();
    if (ok) {
      document.getElementById('btn-record').classList.add('recording');
    }
  }

  async function handleAudioRecord() {
    if (Sungma.Recorder.isRecording() && Sungma.Recorder.getType() === 'audio') {
      // Stop recording
      const result = await Sungma.Recorder.stop();
      document.getElementById('btn-audio').classList.remove('recording');
      if (result) {
        const ext = result.mimeType.includes('ogg') ? 'ogg' : 'webm';
        const filename = Sungma.Utils.generateFilename('audio', ext);
        showPreview(result.blob, 'audio', filename);
      }
      return;
    }

    if (Sungma.Recorder.isRecording()) return; // Already recording something else

    const ok = await Sungma.Recorder.startAudio();
    if (ok) {
      document.getElementById('btn-audio').classList.add('recording');
    }
  }

  async function handleInterview() {
    const btn = document.getElementById('btn-interview');

    if (Sungma.Interview.isActive()) {
      // Exit interview mode
      await Sungma.Interview.stop();
      btn.classList.remove('active');
      // Re-enable flip button
      document.getElementById('btn-flip-camera').disabled = false;
      return;
    }

    if (Sungma.Recorder.isRecording()) return; // Don't switch modes while recording

    btn.classList.add('active');
    // Disable flip button in interview mode (both cameras are in use)
    document.getElementById('btn-flip-camera').disabled = true;

    const ok = await Sungma.Interview.start();
    if (!ok) {
      btn.classList.remove('active');
      document.getElementById('btn-flip-camera').disabled = false;
    } else if (!Sungma.Interview.isDualSupported()) {
      // Single camera fallback — show notice
      btn.classList.add('active');
      console.warn('Interview mode: dual camera not available, PiP disabled');
    }
  }

  function cycleDistortion() {
    const levels = ['off', 'subtle', 'medium', 'heavy'];
    const idx = levels.indexOf(settings.distortion);
    settings.distortion = levels[(idx + 1) % levels.length];
    Sungma.Audio.setLevel(settings.distortion);

    // Update radio buttons in settings
    document.querySelectorAll('input[name="distortion"]').forEach(r => {
      r.checked = r.value === settings.distortion;
    });

    updateDistortionUI();
    saveSettings();
  }

  function updateDistortionUI() {
    const btn = document.getElementById('btn-distortion');
    const label = document.getElementById('distortion-label');
    if (settings.distortion === 'off') {
      label.textContent = 'Distort: OFF';
      btn.classList.remove('active');
    } else {
      label.textContent = `Distort: ${settings.distortion.toUpperCase()}`;
      btn.classList.add('active');
    }
  }

  // === Preview ===

  function showPreview(blob, type, filename) {
    previewBlob = blob;
    previewType = type;
    previewFilename = filename;

    const overlay = document.getElementById('preview-overlay');
    const img = document.getElementById('preview-image');
    const vid = document.getElementById('preview-video');
    const aud = document.getElementById('preview-audio');

    // Reset
    img.classList.add('hidden');
    vid.classList.add('hidden');
    aud.classList.add('hidden');

    const url = URL.createObjectURL(blob);

    if (type === 'photo') {
      document.getElementById('preview-title').textContent = 'Captured Photo';
      img.src = url;
      img.classList.remove('hidden');
    } else if (type === 'video') {
      document.getElementById('preview-title').textContent = 'Recorded Video';
      vid.src = url;
      vid.classList.remove('hidden');
    } else if (type === 'audio') {
      document.getElementById('preview-title').textContent = 'Recorded Audio';
      aud.src = url;
      aud.classList.remove('hidden');
    }

    document.getElementById('preview-size').textContent = Sungma.Utils.formatSize(blob.size);
    overlay.classList.remove('hidden');
  }

  function hidePreview() {
    const overlay = document.getElementById('preview-overlay');
    overlay.classList.add('hidden');

    // Clean up object URLs
    const img = document.getElementById('preview-image');
    const vid = document.getElementById('preview-video');
    const aud = document.getElementById('preview-audio');
    if (img.src) { URL.revokeObjectURL(img.src); img.src = ''; }
    if (vid.src) { URL.revokeObjectURL(vid.src); vid.src = ''; }
    if (aud.src) { URL.revokeObjectURL(aud.src); aud.src = ''; }

    previewBlob = null;
    previewType = null;
    previewFilename = null;
  }

  function handleSave() {
    if (!previewBlob || !previewFilename) return;
    Sungma.Share.download(previewBlob, previewFilename);
    hidePreview();
  }

  async function handleShare() {
    if (!previewBlob || !previewFilename) return;
    await Sungma.Share.share(previewBlob, previewFilename, 'Sungma');
    hidePreview();
  }

  function handleDiscard() {
    hidePreview();
  }

  // === Settings ===

  function closeSettings() {
    document.getElementById('settings-panel').classList.add('hidden');
  }

  function saveSettings() {
    try {
      localStorage.setItem('sungma-settings', JSON.stringify({
        includeGPS: settings.includeGPS,
        includeDateTime: settings.includeDateTime,
        distortion: settings.distortion,
      }));
    } catch (e) { /* storage might be unavailable */ }
  }

  function loadSettings() {
    try {
      const saved = localStorage.getItem('sungma-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        settings.includeGPS = parsed.includeGPS ?? true;
        settings.includeDateTime = parsed.includeDateTime ?? true;
        settings.distortion = parsed.distortion ?? 'off';

        // Sync UI
        document.getElementById('setting-gps').checked = settings.includeGPS;
        document.getElementById('setting-datetime').checked = settings.includeDateTime;
        document.querySelectorAll('input[name="distortion"]').forEach(r => {
          r.checked = r.value === settings.distortion;
        });
        Sungma.Audio.setLevel(settings.distortion);
        updateDistortionUI();
      }
    } catch (e) { /* ignore */ }
  }

  return { init, settings };
})();

// === Boot ===
document.addEventListener('DOMContentLoaded', () => {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(err => {
      console.warn('Service worker registration failed:', err);
    });
  }

  Sungma.App.init();
});
