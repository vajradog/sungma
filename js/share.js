/**
 * Sungma — Download and Web Share API
 * Save prefers Web Share on mobile (saves to camera roll), download as fallback.
 */

Sungma.Share = (() => {
  /**
   * Save a blob — uses Web Share API on mobile (lets user save to camera roll),
   * falls back to download on desktop.
   */
  async function save(blob, filename) {
    // On mobile, Web Share with files gives the "Save to Photos" option
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], filename, { type: blob.type });
      const shareData = { files: [file] };

      if (navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          return true;
        } catch (err) {
          if (err.name === 'AbortError') return false; // User cancelled
          // Fall through to download
        }
      }
    }

    // Fallback: browser download
    download(blob, filename);
    return true;
  }

  /**
   * Download a blob as a file (goes to downloads folder).
   */
  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  /**
   * Share a blob using the Web Share API (mobile native share sheet).
   * Falls back to download if sharing is not supported.
   */
  async function share(blob, filename, title) {
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], filename, { type: blob.type });
      const shareData = { title: title || 'Sungma', files: [file] };

      if (navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          return true;
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.warn('Share failed, falling back to download:', err);
          } else {
            return false;
          }
        }
      }
    }

    download(blob, filename);
    return true;
  }

  return { save, download, share };
})();
