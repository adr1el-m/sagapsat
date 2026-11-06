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

## Data and scientific limits

The initial archive has five captures (4–6 November 2026), totaling 4,529 distinct
CADUs when summed per capture. The strongest stored capture has 2,091 CADUs.
This does not measure useful image coverage or full-pass completion. The displayed
SNR is the largest estimate found in capture-local native logs or monitor snapshots,
not calibrated RF SNR. Logs may be sampled and do not prove uninterrupted lock.

Composite variants are not separate observations. Original pixel data is retained
in PNG downloads; WebP previews are lossy presentation assets. Generated map products
are withheld because scan timestamps/georeferencing have not been validated. The map
shows predicted orbital geometry only. Orbit/downlink state does not prove reception.
The station's configured QTH is private to the owner-private hosted Site and LAN portal.

The hosted Site is an **archive snapshot**, without a route into the Pi or receiver
controls. Orbit position is interpolated from 30-second SGP4 samples, and the prediction
snapshot expires after 48 hours. Rebuild and redeploy to refresh it; no cloud refresh,
public live feed, automatic capture scheduling, or remote receiver control is implied.
The local static export has the same orbital refresh requirement. With `server.py --refresh-orbits`, local orbital data is recomputed hourly and fetched by the page every 15 minutes. This requires the build dependencies on the serving machine. Station health is
live only when served by `server.py` with a configured reachable probe.
Raw IQ remains on the Pi where documented in capture notes; the portal does not copy it.

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
