/**
 * Sungma — MediaRecorder for video + audio recording
 */

Sungma.Recorder = (() => {
  let mediaRecorder = null;
  let chunks = [];
  let recordingType = null; // 'video' or 'audio'
  let startTime = 0;
  let timerInterval = null;

  /**
   * Find a supported MIME type for video recording.
   */
  function getVideoMimeType() {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  }

  /**
   * Find a supported MIME type for audio recording.
   */
  function getAudioMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  }

  /**
   * Start video recording (pixelated canvas + audio).
   */
  async function startVideo() {
    const canvas = Sungma.Pixelation.getCanvas();
    const canvasStream = canvas.captureStream(30);

    // Get mic audio
    let audioStream;
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (Sungma.Audio.isActive()) {
        audioStream = await Sungma.Audio.init(micStream);
      } else {
        audioStream = micStream;
      }
    } catch (err) {
      console.warn('No mic access, recording video without audio:', err);
      audioStream = null;
    }

    // Combine streams
    const tracks = [...canvasStream.getVideoTracks()];
    if (audioStream) {
      tracks.push(...audioStream.getAudioTracks());
    }
    const combinedStream = new MediaStream(tracks);

    const mimeType = getVideoMimeType();
    const options = mimeType ? { mimeType, videoBitsPerSecond: 2500000 } : {};

    chunks = [];
    mediaRecorder = new MediaRecorder(combinedStream, options);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    // Use timeslice for chunked recording (every 5 seconds)
    mediaRecorder.start(5000);
    recordingType = 'video';
    startTime = Date.now();
    startTimer();

    showRecordingUI(true);
    return true;
  }

  /**
   * Start audio-only recording.
   */
  async function startAudio() {
    let micStream;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error('Mic access denied:', err);
      return false;
    }

    let audioStream;
    if (Sungma.Audio.isActive()) {
      audioStream = await Sungma.Audio.init(micStream);
    } else {
      audioStream = micStream;
    }

    const mimeType = getAudioMimeType();
    const options = mimeType ? { mimeType } : {};

    chunks = [];
    mediaRecorder = new MediaRecorder(audioStream, options);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.start(5000);
    recordingType = 'audio';
    startTime = Date.now();
    startTimer();

    showRecordingUI(true);
    return true;
  }

  /**
   * Stop recording and return the blob.
   */
  function stop() {
    return new Promise((resolve) => {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || (recordingType === 'video' ? 'video/webm' : 'audio/webm');
        const blob = new Blob(chunks, { type: mimeType });
        chunks = [];

        stopTimer();
        showRecordingUI(false);
        Sungma.Audio.cleanup();

        const type = recordingType;
        recordingType = null;
        mediaRecorder = null;

        resolve({ blob, type, mimeType });
      };

      mediaRecorder.stop();
    });
  }

  function isRecording() {
    return mediaRecorder && mediaRecorder.state === 'recording';
  }

  function getType() {
    return recordingType;
  }

  function getElapsed() {
    if (!startTime) return 0;
    return (Date.now() - startTime) / 1000;
  }

  // Timer UI
  function startTimer() {
    const timerEl = document.getElementById('rec-timer');
    timerInterval = setInterval(() => {
      timerEl.textContent = Sungma.Utils.formatTime(getElapsed());
    }, 500);
  }

  function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    document.getElementById('rec-timer').textContent = '00:00';
  }

  function showRecordingUI(show) {
    const indicator = document.getElementById('recording-indicator');
    indicator.classList.toggle('hidden', !show);
  }

  return { startVideo, startAudio, stop, isRecording, getType, getElapsed };
})();
