# IMERG extension locked before retrieval of rainfall values

6 November 2026. This is an exploratory third-algorithm comparison of the existing
17 and 19 September cases, not independent weather-event replication. Preserve all
48 UTC hours, including dry, opposite, missing, and discordant estimates.

## Fixed decisions

- Product: GPM_3IMERGHHL version 07, Late Run; actual granule revision must be
  recorded (NASA CMR currently lists V07C). Do not label this Final Run, mix runs,
  or substitute other dates. Preserve NASA CMR responses and original HDF5 files.
- Retrieve all 96 half-hour granules for the two complete UTC dates. The optional
  download uses an independently configured Earthdata token; no passwords or tokens
  belong in source control, reports, logs, or public hosting.
- Use the calibrated `Grid/precipitation` rate in mm/hr and provider `lat`/`lon`
  arrays. Verify start/end times and half-hour cadence. Read fill values; negative,
  missing or nonfinite rates are missing, never zero. Require all selected cell-slots
  to be valid before reporting a box/hour, and all 24 hours before a daily total.
- Retain the locked boxes: west 15.70--15.85 N,121.00--121.15 E; east
  15.70--15.85 N,121.34--121.49 E; Pacific 15.70--15.85 N,121.80--121.95 E.
  For comparability with the saved rain audit, take the unweighted mean of native
  cell centers within south <= latitude < north and west <= longitude < east.
  Round provider coordinate arrays to four decimal degrees before edge comparisons
  to avoid binary floating point changing a boundary decision. Report actual cell
  coordinates/counts: these small boxes can have very few and unequal cells.
- Hourly depth = 0.5 * (first half-hour mean rate + second half-hour mean rate).
  This has units mm; do not sum rates as if they were depths. Daily depth is the
  sum of all 24 complete hourly depths.
- Pair by UTC date/hour with the existing CMORPH/PERSIANN/GFS table. Keep the
  original easterly screen and report signs for each algorithm separately. Third-
  algorithm agreement is not independent gauge validation because inputs can overlap.
- Repeat the nine common translations at each radius 0.02 and 0.05 degrees for
  all hours, not just positive cases. Report spatial support and missing samples.
  Sign stability is sensitivity to box placement, not a confidence probability.

## Interpretation and release gate

First report retrieval coverage, valid samples, revision, hashes, and grid support.
Only then compare hourly/daily signs and the existing four wet-hour contrasts.
Missing access and missing product values are operational outcomes, not rainfall
findings. No IMERG numerical claim enters the manuscript or website before all
96 source granules and offline extraction checks are available. Retain CMORPH/
PERSIANN findings unchanged if the third source is inaccessible. No terrain-causal
claim follows from agreement. More satellites do not supply independent storms.

## Reproduction

```
.venv/bin/python research/scripts/extend_imerg.py --discover
# After downloading the CMR-listed HDF5 files into data/independent_rainfall/imerg_late/raw/:
.venv/bin/python research/scripts/extend_imerg.py --offline
# Optional authenticated download; set EARTHDATA_TOKEN outside the command/history:
.venv/bin/python research/scripts/extend_imerg.py --download
```

NASA sources: https://gpm.nasa.gov/data/imerg ;
https://gpm.nasa.gov/resources/documents/imerg-v07-technical-documentation ;
https://cmr.earthdata.nasa.gov/search/granules.json .

## Coordinate precision amendment before rainfall contrasts

The first authenticated source file verified the nominal 0.1-degree grid, but provider float32 coordinates represent 15.85 as 15.849999 and 121.15 as 121.149994. Six-decimal rounding therefore admits cells on the excluded north/east edges. Before inspecting any east–west rainfall contrast, rounding was fixed at four decimal degrees (well below a 0.1-degree cell) to recover nominal grid centers consistently with the declared half-open edges. Preserve source coordinates in the HDF5 files. The unit test reproduces this exact quantization case. This numerical correction is not an outcome-based box adjustment.
