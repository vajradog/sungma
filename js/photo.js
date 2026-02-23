/**
 * Sungma — Photo capture and export
 */

Sungma.Photo = (() => {
  /**
   * Capture the current canvas frame as a processed PNG blob.
   * Applies fingerprint noise, proof data, and optional EXIF metadata.
   */
  async function capture(settings) {
    const canvas = Sungma.Pixelation.getCanvas();
    const ctx = Sungma.Pixelation.getContext();

    // Get image data and apply fingerprint noise
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    Sungma.Utils.applyFingerprintNoise(imageData);

    // Create a temp canvas with the noised image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);

    // Export as PNG blob
    let blob = await new Promise(resolve => tempCanvas.toBlob(resolve, 'image/png'));

    // Get GPS if enabled
    let gps = null;
    if (settings.includeGPS) {
      gps = await Sungma.Metadata.getGPS();
    }

    // Build and embed proof data
    const pixelBuffer = imageData.data.buffer;
    const proofString = await Sungma.Metadata.buildProofData(
      pixelBuffer, gps, settings.includeGPS, settings.includeDateTime,
      settings.passphrase, settings.note
    );
    blob = await Sungma.Metadata.injectPNGProof(blob, proofString);

    return blob;
  }

  return { capture };
})();
