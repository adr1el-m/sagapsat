# Verification — 6 November 2026

Built from the five original capture folders in `output/receptions`. Original inputs
were retained. Every exported PNG, CADU and evidence file was checked against its
SHA-256 manifest. Five reports match the CADU file sizes; no trailing bytes; all
4,529 complete records have the expected sync marker. This is not independent
Reed–Solomon decoding or a measurement of useful geographic coverage.

Captured evidence summary:

| Capture (PHT) | Distinct CADUs | Largest logged SNR estimate | Non-map variants |
| --- | ---: | ---: | ---: |
| 4 Nov, 20:09 / M2-3 | 135 | 4.90 dB | 17 |
| 5 Nov, 09:42 / M2-3 | 392 | Unavailable in local logs | 17 |
| 5 Nov, 14:52 / M2-4 | 2,091 | 14.36 dB | 13 |
| 5 Nov, 20:48 / M2-3 | 1,425 | 10.88 dB | 17 |
| 6 Nov, 09:18 / M2-3 | 486 | 9.73 dB | 17 |

Capture start times are minute-resolution values from the saved output-folder names.
Logged SNR is uncalibrated and may be sampled. Variant counts are not observation counts.

- Python evidence/orbit tests: 3 passed, covering all exported hashes, preservation,
  duplicate/truncated frames, overlay exclusion, stale orbital elements and actual pass ordering.
- JavaScript syntax check passed.
- Desktop (1440×1100) and phone (390×844): no horizontal document overflow.
- Image files decode successfully after lazy-loading; original PNG and CADU downloads tested.
- Satellite filters, date/text search, empty results and elevation filter tested.
- Capture dialog, side-by-side product comparison and native-size viewing tested.
- CSV index and UTC iCalendar files downloaded successfully.
- No page script errors observed during interaction tests.

The hosted portal is an owner-private static archive. Its orbital snapshot requires
rebuilding after 48 hours, and its hardware status is deliberately disconnected.
The separate local server supports a passive station probe with a 30-second freshness
cutoff. Neither portal starts or stops the SDR. Existing receiver controls, timers,
SatDump settings and genuine capture data were not modified.
