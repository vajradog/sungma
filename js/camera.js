/**
 * Sungma — Camera stream management
 */

Sungma.Camera = (() => {
  let stream = null;
  let facingMode = 'environment'; // 'environment' = rear, 'user' = front
  const video = document.getElementById('video');

  const constraints = () => ({
    video: {
      facingMode,
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  });

  async function start() {
    try {
      stop();
      stream = await navigator.mediaDevices.getUserMedia(constraints());
      video.srcObject = stream;
      await video.play();
      return true;
    } catch (err) {
      console.error('Camera error:', err);
      return false;
    }
  }

  function stop() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
      video.srcObject = null;
    }
  }

  async function flip() {
    facingMode = facingMode === 'environment' ? 'user' : 'environment';
    return start();
  }

  function getVideo() {
    return video;
  }

  function getStream() {
    return stream;
  }

  function isActive() {
    return stream && stream.active;
  }

  function getFacingMode() {
    return facingMode;
  }

  return { start, stop, flip, getVideo, getStream, isActive, getFacingMode };
})();
