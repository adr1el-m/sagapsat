const { readState, fallback, reply } = require('../lib/store.cjs');
const { stationPreview } = require('../lib/preview.cjs');

module.exports = async (req, res) => {
  const kind = req.query.kind;
  if (!['station', 'archive', 'orbits'].includes(kind)) {
    return reply(res, 404, { error: 'Unknown feed' });
  }
  try {
    let data = await readState(kind);
    if (kind === 'orbits') {
      const snapshot = fallback(kind);
      if (!data || Date.parse(snapshot.generated_utc) > Date.parse(data.generated_utc)) data = snapshot;
    }
    data ||= fallback(kind);
    if (kind === 'station') data.preview = stationPreview(data.preview);
    const seconds = kind === 'station' ? 10 : 60;
    res.setHeader('Cache-Control', 'public, s-maxage=' + seconds + ', max-age=0');
    return reply(res, 200, data);
  } catch {
    try {
      return reply(res, 200, fallback(kind));
    } catch {
      return reply(res, 503, { error: 'Feed unavailable' });
    }
  }
};
