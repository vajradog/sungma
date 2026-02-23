/**
 * Sungma — Voice distortion via Web Audio API
 */

Sungma.Audio = (() => {
  let audioContext = null;
  let sourceNode = null;
  let processorNode = null;
  let gainNode = null;
  let destinationNode = null;
  let distortedStream = null;
  let distortionLevel = 'off'; // 'off', 'subtle', 'medium', 'heavy'

  const PITCH_SHIFT = {
    off: 1.0,
    subtle: 0.85,
    medium: 0.7,
    heavy: 0.55,
  };

  /**
   * Initialize audio processing chain for a given media stream.
   * Returns a new MediaStream with (optionally distorted) audio.
   */
  async function init(micStream) {
    cleanup();

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    sourceNode = audioContext.createMediaStreamSource(micStream);

    // Create a destination to capture the processed audio
    destinationNode = audioContext.createMediaStreamDestination();
    gainNode = audioContext.createGain();
    gainNode.gain.value = 1.0;

    if (distortionLevel !== 'off') {
      await setupPitchShift();
      sourceNode.connect(processorNode);
      processorNode.connect(gainNode);
    } else {
      sourceNode.connect(gainNode);
    }

    gainNode.connect(destinationNode);
    // Also connect to speakers so user can hear themselves (optional — keep volume low)
    // gainNode.connect(audioContext.destination);

    distortedStream = destinationNode.stream;
    return distortedStream;
  }

  /**
   * Set up pitch shifting using ScriptProcessorNode.
   * This uses a simple resampling approach for real-time pitch shift.
   */
  async function setupPitchShift() {
    const bufferSize = 4096;
    const pitchRatio = PITCH_SHIFT[distortionLevel];

    processorNode = audioContext.createScriptProcessor(bufferSize, 1, 1);

    // Circular buffer for pitch shifting
    const grainSize = bufferSize;
    const pitchBuffer = new Float32Array(grainSize * 2);
    let pitchPos = 0;

    processorNode.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const output = e.outputBuffer.getChannelData(0);

      // Write input to pitch buffer
      for (let i = 0; i < input.length; i++) {
        pitchBuffer[pitchPos % pitchBuffer.length] = input[i];
        pitchPos++;
      }

      // Read from pitch buffer at shifted rate
      for (let i = 0; i < output.length; i++) {
        const readPos = pitchPos - input.length + (i * pitchRatio);
        const readIndex = Math.floor(readPos) % pitchBuffer.length;
        const readIndexAbs = ((readIndex % pitchBuffer.length) + pitchBuffer.length) % pitchBuffer.length;
        const nextIndex = (readIndexAbs + 1) % pitchBuffer.length;
        const frac = readPos - Math.floor(readPos);

        // Linear interpolation
        output[i] = pitchBuffer[readIndexAbs] * (1 - frac) + pitchBuffer[nextIndex] * frac;
      }
    };
  }

  function setLevel(level) {
    distortionLevel = level;
  }

  function getLevel() {
    return distortionLevel;
  }

  function isActive() {
    return distortionLevel !== 'off';
  }

  function getStream() {
    return distortedStream;
  }

  function cleanup() {
    if (processorNode) {
      processorNode.disconnect();
      processorNode = null;
    }
    if (sourceNode) {
      sourceNode.disconnect();
      sourceNode = null;
    }
    if (gainNode) {
      gainNode.disconnect();
      gainNode = null;
    }
    if (audioContext) {
      audioContext.close().catch(() => {});
      audioContext = null;
    }
    distortedStream = null;
  }

  return { init, setLevel, getLevel, isActive, getStream, cleanup };
})();
