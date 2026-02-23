/**
 * Sungma — EXIF handling, GPS/timestamp preservation, proof embedding
 */

Sungma.Metadata = (() => {
  let cachedGPS = null;

  /**
   * Get current GPS position (cached for 30 seconds).
   */
  function getGPS() {
    return new Promise((resolve) => {
      if (cachedGPS && (Date.now() - cachedGPS.timestamp) < 30000) {
        resolve(cachedGPS);
        return;
      }
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          cachedGPS = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            alt: pos.coords.altitude,
            heading: pos.coords.heading,
            timestamp: Date.now(),
          };
          resolve(cachedGPS);
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  }

  /**
   * Build EXIF data with piexifjs for JPEG.
   * Only includes GPS and DateTime — nothing else.
   */
  function buildExif(gps, includeGPS, includeDateTime) {
    const exifObj = { '0th': {}, 'Exif': {}, 'GPS': {} };

    if (includeDateTime) {
      const now = new Date();
      const dateStr = now.toISOString().replace('T', ' ').slice(0, 19).replace(/-/g, ':');
      exifObj['Exif'][piexif.ExifIFD.DateTimeOriginal] = dateStr;
    }

    if (includeGPS && gps) {
      // Convert decimal degrees to EXIF GPS format (degrees, minutes, seconds)
      const latRef = gps.lat >= 0 ? 'N' : 'S';
      const lonRef = gps.lon >= 0 ? 'E' : 'W';
      const lat = decimalToDMS(Math.abs(gps.lat));
      const lon = decimalToDMS(Math.abs(gps.lon));

      exifObj['GPS'][piexif.GPSIFD.GPSLatitudeRef] = latRef;
      exifObj['GPS'][piexif.GPSIFD.GPSLatitude] = lat;
      exifObj['GPS'][piexif.GPSIFD.GPSLongitudeRef] = lonRef;
      exifObj['GPS'][piexif.GPSIFD.GPSLongitude] = lon;

      if (gps.alt !== null && gps.alt !== undefined) {
        exifObj['GPS'][piexif.GPSIFD.GPSAltitudeRef] = gps.alt >= 0 ? 0 : 1;
        exifObj['GPS'][piexif.GPSIFD.GPSAltitude] = [Math.abs(Math.round(gps.alt * 100)), 100];
      }

      if (gps.heading !== null && gps.heading !== undefined) {
        exifObj['GPS'][piexif.GPSIFD.GPSImgDirectionRef] = 'T';
        exifObj['GPS'][piexif.GPSIFD.GPSImgDirection] = [Math.round(gps.heading * 100), 100];
      }
    }

    return piexif.dump(exifObj);
  }

  /**
   * Convert decimal degrees to [[d,1],[m,1],[s*10000,10000]] format for piexifjs.
   */
  function decimalToDMS(dd) {
    const d = Math.floor(dd);
    const minfloat = (dd - d) * 60;
    const m = Math.floor(minfloat);
    const secfloat = (minfloat - m) * 60;
    const s = Math.round(secfloat * 10000);
    return [[d, 1], [m, 1], [s, 10000]];
  }

  /**
   * Build proof data JSON.
   */
  async function buildProofData(imageBuffer, gps, includeGPS, includeDateTime, passphrase, note) {
    const hash = await Sungma.Utils.sha256(imageBuffer);
    const proof = { v: '1.0.0', hash: `sha256:${hash}` };

    if (includeGPS && gps) {
      proof.gps = [gps.lat, gps.lon];
    }
    if (includeDateTime) {
      proof.time = new Date().toISOString();
    }
    if (note) {
      proof.note = note;
    }

    const proofJson = JSON.stringify(proof);

    if (passphrase) {
      return await Sungma.Utils.encryptWithPassphrase(proofJson, passphrase);
    }
    return proofJson;
  }

  /**
   * Inject a tEXt chunk into a PNG blob.
   * PNG structure: signature + chunks (IHDR, ..., IEND).
   * We insert a tEXt chunk with key "sungma-proof" just before IEND.
   */
  async function injectPNGProof(pngBlob, proofString) {
    const buffer = await pngBlob.arrayBuffer();
    const data = new Uint8Array(buffer);

    // Find IEND chunk (last 12 bytes: length(4) + "IEND"(4) + CRC(4))
    // Scan backward for 'IEND'
    let iendOffset = -1;
    for (let i = data.length - 12; i >= 8; i--) {
      if (data[i + 4] === 0x49 && data[i + 5] === 0x45 &&
          data[i + 6] === 0x4E && data[i + 7] === 0x44) {
        iendOffset = i;
        break;
      }
    }

    if (iendOffset === -1) return pngBlob; // Can't find IEND, return original

    // Build tEXt chunk
    const keyword = 'sungma-proof';
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(keyword);
    const textBytes = encoder.encode(proofString);

    // tEXt chunk data: keyword + null separator + text
    const chunkData = new Uint8Array(keyBytes.length + 1 + textBytes.length);
    chunkData.set(keyBytes, 0);
    chunkData[keyBytes.length] = 0; // null separator
    chunkData.set(textBytes, keyBytes.length + 1);

    // Build full chunk: length(4) + type(4) + data + CRC(4)
    const chunkType = encoder.encode('tEXt');
    const chunkLength = chunkData.length;

    // Calculate CRC over type + data
    const crcInput = new Uint8Array(4 + chunkData.length);
    crcInput.set(chunkType, 0);
    crcInput.set(chunkData, 4);
    const crc = crc32(crcInput);

    // Assemble full chunk
    const chunk = new Uint8Array(4 + 4 + chunkData.length + 4);
    // Length (big-endian)
    chunk[0] = (chunkLength >> 24) & 0xff;
    chunk[1] = (chunkLength >> 16) & 0xff;
    chunk[2] = (chunkLength >> 8) & 0xff;
    chunk[3] = chunkLength & 0xff;
    // Type
    chunk.set(chunkType, 4);
    // Data
    chunk.set(chunkData, 8);
    // CRC (big-endian)
    chunk[chunk.length - 4] = (crc >> 24) & 0xff;
    chunk[chunk.length - 3] = (crc >> 16) & 0xff;
    chunk[chunk.length - 2] = (crc >> 8) & 0xff;
    chunk[chunk.length - 1] = crc & 0xff;

    // Construct new PNG: before IEND + tEXt chunk + IEND
    const before = data.slice(0, iendOffset);
    const iend = data.slice(iendOffset);
    const newPng = new Uint8Array(before.length + chunk.length + iend.length);
    newPng.set(before, 0);
    newPng.set(chunk, before.length);
    newPng.set(iend, before.length + chunk.length);

    return new Blob([newPng], { type: 'image/png' });
  }

  /**
   * CRC-32 implementation for PNG chunk checksums.
   */
  const crc32Table = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
      crc = crc32Table[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  return { getGPS, buildExif, buildProofData, injectPNGProof };
})();
