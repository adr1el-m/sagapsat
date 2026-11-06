# SagapSat Observatory

A read-only ground-station portal built from Team Magalona's original Meteor captures.
The existing reception dashboard and SatDump settings are separate and untouched.

## Build and run

From this directory, with Python 3.11 or newer:

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python build.py
.venv/bin/python server.py --refresh-orbits --pi adriel@wni-pi5.local --identity ~/.ssh/wni_pi5_ed25519
```

Open http://127.0.0.1:8088. Omit `--pi` for archive-only mode. On the Pi itself,
`python3 server.py --pi local --host 0.0.0.0` performs the same passive health checks.
The server does not start, stop, arm, tune, or reconfigure reception.

`build.py --archive /path/to/receptions --output /path/to/export` supports explicit
archive locations. Input capture directories require `capture-result.json` and a
satellite-labelled directory name (`M2-3` or `M2-4`); this is a curated archive, not
an unattended import of unknown captures. Rebuild after adding a finalized capture.
The build copies evidence and never deletes or changes source reception files.
The `dist` directory is a portable static export, including offline basemap data,
original evidence, compressed image previews, and JSON manifests.

## Implemented

- Responsive desktop/phone station overview, original imagery and capture metrics.
- SGP4 orbit tracks, current computed position/azimuth/elevation, 48-hour pass events,
  elevation filter, PHT labels and UTC iCalendar export.
- TLEs from CelesTrak, checksummed and cached six hours; epochs more than seven days
  from build time are withheld. Fetch failures can use a recent cached TLE and are
  recorded in the manifest. Skyfield uses its bundled timescale, without downloading
  planetary ephemerides. Station QTH comes from the existing Pi SatDump settings;
  altitude is assumed 0 metres, not a surveyed antenna height.
- Capture search and satellite filter, native image view, side-by-side channel/product
  comparison, original PNG/CADU downloads, capture index CSV.
- SHA-256 hashes, complete/distinct frame counts, ASM counts, byte-size consistency,
  source notes/logs and explicit partial-capture classifications.
- Optional passive station health: SDR USB detection, process presence, available
  storage, temperature/power flags and observed CADU growth. A successful probe
  expires after 30 seconds; SSH failure clears current hardware indicators.

## Public feeds and automatic publishing

The Vercel site reads `/api/feed?kind=station`, `archive`, and `orbits`. A Pi service
pushes station health outbound every five minutes while idle and every minute while
SatDump is running. RF estimates require a native log sample less than 90 seconds old;
the station heartbeat expires after six minutes. No inbound Pi ports, receiver controls,
SSH credentials, precise station coordinates, or Blob write credentials are exposed.

The publisher watches finalized `capture-result.json` files. Satellite identity must
match product TLE metadata or a curated label. It stages a temporary public export,
withholds QTH values from logs, hashes evidence, uploads assets directly to Blob using
short-lived constrained client tokens, then updates the archive index. A successful
publication is checkpointed; failed uploads retry without deleting originals. Captures
are deduplicated by satellite and recording start time. Unknown identity and incomplete
processing are held for review rather than published as successful observations.

Orbital snapshots are refreshed on the Pi every three hours and pushed to the feed.
They use the public approximate Metro Manila location, not exact antenna coordinates.
If the Pi or uplink is unavailable, feed ages and the 48-hour orbit expiry remain
visible. Static JSON files provide a deployment fallback, not fabricated live status.

Publisher runtime: `scripts/publisher.py` plus bundled `scripts/upload-assets.cjs`,
`build.py`, and `analysis.py`. `SAGAPSAT_INGEST_SECRET` is a Vercel production secret;
the matching Pi secret file has mode 0600. Never commit either secret or `.env*`.
The Pi uses a dedicated user systemd service, `sagapsat-publisher.service`.

## Data and scientific limits

Six original captures (4–6 November 2026) total 8,517 distinct CADUs summed per
capture. The latest M2-4 reception contains 3,988 frames and a 17.00 dB peak logged
SNR estimate. Recognizable Philippines imagery contains missing scan bands; it remains
classified as partial. These metrics do not establish full-pass image completeness.

Reception timelines show capture-local SNR, cumulative saved frames, and sampled
lock/no-lock events. SNR is uncalibrated. Gaps remain gaps; lock sample fractions are
not continuous reception durations. Colour composites are variants of one observation.
Original PNG/CADU downloads retain their exact bytes. Preview WebP files are lossy.
Public log copies can withhold exact QTH values; original SHA-256 and public-copy
SHA-256 are both retained. Original native files remain unchanged on the Pi.

Observation geography checks embedded scan times against the capture window (60-second
tolerance), rejects non-monotonic scan sequences and orbital elements over seven days
from epoch, and draws a computed satellite subtrack only for observations passing these
checks. A subtrack is not an image footprint. Pixel-level georeferencing has not been
independently validated, so geographic image overlays remain withheld. The earlier
5 November afternoon capture fails timing validation and is explicitly withheld.

The Sierra Madre research section explains observation, geographic validation, and
comparison with independent rainfall/wind data. The exploratory study does not establish
terrain-caused rainfall enhancement, and a cloud image alone does not measure rainfall.
Raw IQ stays on the Pi. This portal neither controls reception nor removes old captures.

## Verification

```sh
.venv/bin/python -m unittest discover -s . -p 'test_*.py' -v
node --check app.js
```

Tests validate all exported evidence and image hashes, original-file preservation,
frame deduplication/trailing-byte handling, overlay exclusion, stale TLE rejection,
and ordering of actual predicted events. Browser QA covers desktop and phone layouts,
filters/empty states, comparison/native-size viewing, PNG/CADU/CSV/iCalendar downloads,
and stale/unavailable status handling. See `VERIFICATION.md` for observed results.

## Sources

- [Skyfield satellite documentation](https://rhodesmill.org/skyfield/earth-satellites.html)
- [CelesTrak GP data](https://celestrak.org/NORAD/elements/)
- Basemap: [Natural Earth 1:110m land](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson), public domain.
- Benchmark reviewed: [Sanun ground station](https://project.ntkfilm.top/en/ground-station), 6 November 2026. Its page includes tracking, pass planning, reception history,
  imagery and an observation map. Our own data and code were used for this portal;
  no competitor assets or observations were copied.

## Public release

Public coordinates use an approximate Metro Manila location (14.6, 121.0). For your own local predictions, set `SAGAPSAT_LATITUDE` and `SAGAPSAT_LONGITUDE` before building. Exact antenna coordinates are excluded. Two exported log copies have coordinate values withheld; the manifest hashes the public copies and retains `original_sha256` for comparison with private originals. PNG and CADU downloads remain byte-identical. The private Sites source history is excluded from this public repository.

Production domain: https://sagapsat.adrielmagalona.com

## Independent hosting

Production: https://sagapsat.adrielmagalona.com (Vercel). The site is public and does not require an OpenAI or ChatGPT account. The GitHub `main` branch is connected to Vercel project `sagapsat` in the owner's personal project scope. `vercel.json` serves `dist` as static assets without a framework build. Pushes to `main` deploy the committed snapshot. `https://sagapsat.vercel.app` is the alternate production URL.

## Deployment configuration

`npm run build` copies UI assets into `dist`; Vercel also deploys the Node API routes. A connected public Blob store holds durable feed snapshots and future capture assets. Existing static evidence remains available if cloud feeds fail. `npm test` checks authentication boundaries; Python tests check evidence integrity, timestamp gates, and telemetry gaps.
