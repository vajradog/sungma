/**
 * Sungma — Utility functions
 */

const Sungma = window.Sungma || {};
window.Sungma = Sungma;

Sungma.Utils = (() => {
  /**
   * Inject random noise into least significant bits of random pixels
   * to defeat canvas fingerprinting. Imperceptible to human eye.
   */
  function applyFingerprintNoise(imageData) {
    const data = imageData.data;
    const totalPixels = data.length / 4;
    // Modify ~1.5% of pixels
    const count = Math.ceil(totalPixels * 0.015);

    for (let i = 0; i < count; i++) {
      const pixelIndex = Math.floor(Math.random() * totalPixels) * 4;
      // Pick a random color channel (R=0, G=1, B=2)
      const channel = Math.floor(Math.random() * 3);
      // Flip the least significant bit
      data[pixelIndex + channel] ^= 1;
    }

    return imageData;
  }

  /**
   * Format seconds to MM:SS display
   */
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  /**
   * Format bytes to human-readable size
   */
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Generate a timestamp-based filename
   */
  function generateFilename(prefix, ext) {
    const now = new Date();
    const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `sungma-${prefix}-${ts}.${ext}`;
  }

  /**
   * SHA-256 hash of an ArrayBuffer
   */
  async function sha256(buffer) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Encrypt data with AES-256-GCM using a passphrase
   */
  async function encryptWithPassphrase(plaintext, passphrase) {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Derive key from passphrase
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']
    );
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plaintext)
    );

    // Pack: salt(16) + iv(12) + ciphertext
    const packed = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    packed.set(salt, 0);
    packed.set(iv, salt.length);
    packed.set(new Uint8Array(ciphertext), salt.length + iv.length);

    // Return as base64
    return btoa(String.fromCharCode(...packed));
  }

  /**
   * Simple debounce
   */
  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  return {
    applyFingerprintNoise,
    formatTime,
    formatSize,
    generateFilename,
    sha256,
    encryptWithPassphrase,
    debounce,
  };
})();
