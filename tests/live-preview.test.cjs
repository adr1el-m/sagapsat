const { test } = require('node:test');
const assert = require('node:assert/strict');
const { stationPreview } = require('../lib/preview.cjs');

const now = Date.parse('2026-11-13T12:00:00Z');
const preview = {
  channel: 4, frames: 200, width: 1, height: 1,
  received_utc: new Date(now - 35000).toISOString(),
  webp: 'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA',
};

test('station feed retains only the public preview fields', () => {
  assert.deepEqual(stationPreview({ ...preview, source: '/home/station/raw' }, now), preview);
});

test('station feed drops expired, future, malformed and oversized previews', () => {
  for (const override of [
    { received_utc: new Date(now - 110000).toISOString() },
    { received_utc: new Date(now + 10001).toISOString() },
    { received_utc: 'invalid' },
    { webp: Buffer.from('<svg />').toString('base64') },
    { webp: 'A'.repeat(320001) },
    { channel: 0 },
    { width: 1001 },
    { frames: -1 },
  ]) assert.equal(stationPreview({ ...preview, ...override }, now), null);
});
