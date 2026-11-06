# Verification — 6 November 2026

## Evidence and scientific boundaries

Six original captures (4–6 November) are indexed, totaling 8,517 distinct CADUs when
summed per capture. The latest M2-4 reception has 3,988 distinct complete records,
expected ASM throughout, zero trailing bytes, and a 17.00 dB peak logged demodulator
estimate. Its 2,800 × 3,408 false-colour product has recognizable Philippines imagery
and visible missing scan bands. It remains a partial capture.

All exported original PNG/CADU hashes and public evidence hashes were verified locally.
The actual outbound Pi publisher then uploaded the latest observation through the
production API. Its public original PNG (16,567,864 bytes) and CADU (4,083,712 bytes)
were downloaded and SHA-256 checked against the manifest. The archive retained six
observations after publication; the index did not duplicate the imported pass.

Six Python tests passed: full export integrity, input preservation, duplicate/truncated
records, stale TLE withholding, telemetry gaps/no-sync, invalid scan dates, and
non-monotonic scan-time rejection. Two Node tests passed for authorization boundaries,
including missing, incorrect and Unicode-malformed credentials. JavaScript syntax
checks passed; production dependency audit reports zero vulnerabilities.

## UI and publication

- Latest reception promoted above the archive; 13 non-map image variants included.
- Reception timeline shows logged SNR, cumulative frames and sampled lock losses.
- Zoom and comparison UI checked; phone dialog had no horizontal content overflow.
- Geographic view distinguishes timing-checked satellite subtracks from image footprints.
- 5 November afternoon timing metadata is rejected; map placement is withheld.
- Research section states the Sierra Madre question, validation needs and limits.
- Stable capture hash links, product explanations and original evidence downloads added.
- Public station/archive/orbit GET routes returned HTTP 200 anonymously.
- Unauthenticated publication POST returned HTTP 401.
- Actual station health and fresh orbit snapshot were accepted from the Pi.
- Publisher checkpoint contains all six observations after the latest upload.
- Publisher and LAN observatory services were observed active.

Public idle heartbeat is every five minutes; active heartbeat is every minute.
Station data expires after six minutes and decoder estimates after 90 seconds.
Orbital publication refreshes every three hours while the Pi/uplink is operational.
The static site continues to serve a labelled fallback if feeds are unavailable.

## Geographic limitation

Scan timestamps agreeing with the recording window and a current TLE permit a computed
satellite subtrack. Independent pixel georeferencing has not been established. Geographic
image overlays remain withheld. No full-pass completeness or terrain causality is claimed.

## Pi storage cleanup

Removed regenerable APT binary/Python download caches and a redundant SatDump installer
whose matching copy remains on the Mac SSD. Reclaimed 187,953,152 bytes (~188 MB).
An inventory of 304 reception/config-log files was unchanged. Raw IQ, CADUs, images,
native logs, session evidence and replay data were preserved. Filesystem was about
50% used with ~28 GiB available; it was not close to full.

## Research extension — 6 November, v1.6

The research section adds the verified IMERG Late Run comparison. All 96
original source hashes, 144 complete box/hour values and 2,736 base/translated
records reproduce offline in the research checkout. The public site contains
sanitized result tables, provenance hashes, protocol and a comparison figure;
full raw research files and the manuscript remain outside this repository.

IMERG reverses three of four originally concordant CMORPH/PERSIANN wet-hour
contrasts. The sole three-algorithm positive contrast is placement-sensitive.
No daily contrast sign is shared by all three algorithms on either date. The
page retains this disagreement and its one-west/two-east native-cell limitation.
The six local receptions demonstrate acquisition, not validated pixel geography.
