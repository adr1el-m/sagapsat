function stationPreview(value, now = Date.now()) {
  if (!value || !Number.isInteger(value.channel) || value.channel < 1 || value.channel > 6) return null;
  const { width, height, frames, webp, received_utc } = value;
  const age = now - Date.parse(received_utc);
  if (!Number.isFinite(age) || age < -10000 || age >= 110000) return null;
  if (!Number.isInteger(width) || width < 1 || width > 1000 ||
      !Number.isInteger(height) || height < 1 || height > 1500 ||
      !Number.isSafeInteger(frames) || frames < 64) return null;
  if (typeof webp !== 'string' || webp.length > 320000 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(webp)) return null;
  const image = Buffer.from(webp, 'base64');
  if (image.length < 20 || image.toString('ascii', 0, 4) !== 'RIFF' ||
      image.readUInt32LE(4) !== image.length - 8 ||
      image.toString('ascii', 8, 12) !== 'WEBP') return null;
  return { width, height, frames, webp, received_utc, channel: value.channel };
}

module.exports = { stationPreview };
