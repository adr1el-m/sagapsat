# Current extension — v1.7, 6 November 2026

Rainfall is additionally evaluated using spherical native-cell/box intersections,
with no interpolation and no missing-as-zero substitution. The original and
larger 0.30° boxes remain separate analyses. All four original wet-hour cases
lose three-product east-greater agreement under original-box area means.

Three fixed October dates retain all 72 cloud snapshots, 68 complete rain pairs
and four empty CMORPH source intervals. No qualifying wet east-greater easterly
case occurs. A separately declared four-times-daily October screen retains all
124 candidates and all three wet/easterly follow-ups on October 11–12. Two have
opposing rain-product signs. The concordant case has 98.2% western cloud occupancy,
so the original complete-saturation result is not universal. No new IMERG was
retrieved for these three follow-ups; adjacent dates are not independent storms.

See [the versioned protocol](protocol.md), [fixed-date pairs](replication_pairs.csv),
[all candidates](weather_first_candidates.csv), and [all follow-ups](weather_first_cases.csv).
The interactive worked examples use the original 48 September hours and a local
case that abstains because independent geographic registration remains unresolved.
No suitable in-box gauge reference was obtained from the audited public sources.
No forecast accuracy or terrain causality is claimed.

---

## Historical September and reception method

# SagapSat: evidence and limits

Updated 6 November 2026. This public summary accompanies a research-progress manuscript; no final submission is claimed.

## Question and sample

Can cloud occupancy distinguish east–west rainfall contrasts? The exploratory sample comprises two complete UTC dates, 17 and 19 September 2026, at a fixed central-Luzon transect.

- West: 15.70–15.85° N, 121.00–121.15° E, Nueva Ecija.
- East: 15.70–15.85° N, 121.34–121.49° E, Aurora.

The boxes have different terrain and are not interchangeable experimental controls. More hours or algorithms on these dates do not create independent weather events.

## Completed cloud comparison

The 48 scheduled Himawari-9 snapshots use provider geolocation. Occupancy is the unweighted fraction of valid cloud-mask pixels classified cloudy or probably cloudy. Matched complete UTC-hour rain estimates use each product's native grid support. Offshore GFS 850-hPa flow screens easterly hours.

The original CMORPH/PERSIANN-CCS comparison identifies four east-greater wet hours under easterly flow. In every matching cloud snapshot, occupancy is 100% in both boxes. This measure saturates and cannot distinguish those rainfall contrasts. Two of the four rainfall contrasts retain their sign under all tested common box shifts in those two algorithms. The third-algorithm comparison below changes the cross-product interpretation.

## Completed IMERG extension

NASA CMR catalog records and all **96 original IMERG Late Run half-hour HDF5 files** are preserved. Independent offline replay verifies all original-file SHA-256 hashes, **144 complete base box/hour records**, and **2,736 base/translated records**. No base interval is missing.

Files use V07C names; their internal ProductVersion field reads 07B. Both fields are preserved. NASA documents hybrid V07 Early/Late production during 2026 using upgraded parent retrievals. This is **Late Run**, not Final Run or ground-gauge truth.

The nominal 0.1° grid supplies one western center (121.05° E, 15.75° N) and two eastern centers (121.35° E, 15.75° N; 121.45° E, 15.75° N). These small, unequal native-cell samples are not fine-scale area averages. Coordinate precision was corrected to recover nominal centers before comparing rainfall contrasts; the protocol retains that amendment. Hourly depth equals half an hour times each of the two rates, summed. Missing values never become dry observations.

| UTC date | IMERG west / mm | IMERG east / mm | East minus west / mm |
| --- | ---: | ---: | ---: |
| 17 September | 81.23 | 57.79 | -23.44 |
| 19 September | 2.69 | 4.04 | +1.35 |

No daily contrast sign is shared by all three products on either date. IMERG reverses the original two algorithms' positive 17 September daily contrast.

At the four originally concordant easterly hours (11, 13, 14, 16 UTC on 17 September), IMERG east-minus-west hourly depths are -2.55, -4.37, -13.10, and +0.59 mm. Only 16 UTC has a positive base contrast in all three algorithms. Its IMERG sign reverses in 3/9 and 4/9 common placements at radii 0.02° and 0.05°. No three-algorithm placement-robust east-greater contrast is established among those four hours.

Products can share upstream observations. Differences include retrieval, calibration, temporal representation, and spatial sampling. This comparison does not identify which product is closest to truth. Read the [locked protocol and amendment](imerg-protocol.md), [verified summary](imerg-summary.json), and [source checksum manifest](imerg-source-checksums.json).

## Terrain-model limitation

The WRF real-terrain control substantially underestimates land rainfall. Positive real-minus-lowered-terrain differences therefore do not establish observed Sierra Madre enhancement. No operational prediction skill or general shielding conclusion is claimed.

## Local reception

Six original captures on 4–6 November have matching preserved/exported CADU and featured-image hashes. The sum of distinct CADUs within each capture is **8,517**, excluding overlapping recovery replays. Composites are display variants, not extra observations.

Latest: **3,988 distinct records**, a partial image, and a peak logged uncalibrated decoder estimate of **17.00 dB**. Original IQ remains on the Pi. A second IQ backup, complete equipment inventory, and independently validated pixel registration remain outstanding. These November captures demonstrate acquisition but do not enlarge the September weather sample.

## Sources and reproduction

[NOAA/JMA Himawari archive](https://registry.opendata.aws/noaa-himawari/), [NOAA CMORPH](https://www.cpc.ncep.noaa.gov/products/janowiak/cmorph_description.html), [CHRS PERSIANN](https://chrsdata.eng.uci.edu/), [NASA IMERG](https://gpm.nasa.gov/data/imerg), and [NASA's 2026 transition notice](https://gpm.nasa.gov/data/news/imerg-v08-transition-schedule).

The project preserves original inputs and source/subset hashes. Local scripts verify cloud counts, rain integration, placement sensitivity, and model-grid extraction. Public downloads are descriptive evidence tables; full raw research files and the manuscript remain separate. No password or authentication token is included in these downloads.
