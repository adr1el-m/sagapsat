# SagapSat operations

Production: https://sagapsat.adrielmagalona.com / https://sagapsat.vercel.app
GitHub `main` auto-deploys static assets and Node API routes on Vercel.

## Outbound publication

Pi code: `~/wni-receiver/sagapsat-publisher/`.
Service: `systemctl --user status sagapsat-publisher.service`.
The publisher is enabled on boot and uses a separate venv, low CPU priority, a 35%
CPU quota, and a 768 MB memory ceiling. A process lock prevents overlapping publishers.
It never starts/stops the SDR, writes SatDump settings, or deletes original reception data.

Health runs independently from asset uploads: one-minute heartbeat while SatDump is
running, five-minute heartbeat while idle. Public heartbeat expires after six minutes;
RF estimates expire after 90 seconds. Outage means unavailable, not an assumed RF failure.

The publisher polls finalized result files every 30 seconds. Existing observations
were seeded as published from the verified static archive; the latest 6 Nov afternoon
pass was uploaded through the actual new service path and checked by PNG/CADU hashes.
Only completed `images_saved` results with identifiable satellite metadata are published.
Unknown identity and unsuccessful processing remain local for review. Asset uploads
are checkpointed by content hash; the archive updates only after every required asset
has uploaded. Retry state is in `published.json` and `assets.json`, not in capture folders.

Orbital snapshots are regenerated every three hours with CelesTrak caching, SGP4,
and an approximate public station location. Invalid/stale inputs are withheld. The
48-hour snapshot expiration remains visible if the station cannot publish a fresh one.
A Pi/network outage can therefore affect data freshness; it does not stop the static site.

## Credentials and durability

The Pi `secret` file must remain mode 0600 inside its mode-0700 publisher directory.
It authenticates publication to Vercel and is never part of public source or static files.
Vercel holds `SAGAPSAT_INGEST_SECRET` and its connected Blob store credentials.
`/api/upload` issues short-lived, pathname/type/size-constrained upload tokens only to
the authenticated publisher. Read-only public feeds never expose receiver controls.
Store: sagapsat-observations (sin1). Immutable capture assets use content-hash paths;
mutable station/archive/orbit snapshots use durable Blob state. CDN feed caching is
15 seconds for station health and 60 seconds for archive/orbits.

## Geographic verification

`analysis.py` rejects missing/out-of-window/non-monotonic embedded scan timestamps
and orbital elements farther than seven days from the observation. A passing record
can show the computed satellite subtrack during received scans. It is not an image
footprint. Independent pixel georeferencing is still unverified, and image overlays
are intentionally withheld. Do not relabel the subtrack as geographic image coverage.

## Storage audit — 6 November 2026

The Pi filesystem was about 50% used with ~28 GiB available, not full. Cleanup removed
regenerable APT binary caches, the pip download cache, and a duplicate SatDump .deb
whose SHA-256 matched the retained Mac SSD installer. Reclaimed 187,953,152 bytes
(~188 MB). An inventory of 304 reception/config-log files was unchanged after cleanup.
No raw IQ, CADUs, decoded images, replay evidence, native logs, or capture sessions
were removed. The swap file and unrelated software/projects were retained.

Report on Pi: `~/wni-receiver/logs/storage-cleanup-20261106.json`.
Keep all genuine receptions. Investigate or archive storage before any future deletion.
