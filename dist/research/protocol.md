# Six-part extension: fixed decisions before new results

6 November 2026, Asia/Manila. The v1.6 cell-center analysis remains the original
exploratory analysis. These extensions do not retroactively make it prespecified.

## 1. Spatial comparison

Use all 48 hours of 17 and 19 September, all three rainfall algorithms, and the
original west/east/Pacific boxes. Estimate each box using spherical area overlaps
between native grid cells and the exact box polygon. Weight by longitude width
times the difference of sine latitude at the clipped north/south boundaries.
Require all positive-area contributing cells and both half-hours to be valid.
Do not interpolate coarse data to imply finer resolution. Keep original grid
coordinates and source hashes. Report cells and effective weighted cell count.

Compare with a separately declared 0.30 by 0.30 degree box centered on each
original box: latitude15.625--15.925; west longitude120.925--121.225; east
121.265--121.565; Pacific121.725--122.025. These boxes do not overlap one another
but have different terrain/coastal composition. The expanded analysis is a
sensitivity diagnostic, not a replacement chosen to obtain a desired result.
Repeat the same nine common translations at radii0.02 and0.05 degrees for
the original boxes in every hour. Preserve all signs and missing observations.

## 2. Independent-date replication

Before inspecting their cloud/rain values, fix three out-of-sample complete UTC
dates:6,16,26 October2026 (a ten-day calendar cadence). Retain every hour and
the original cloud definition, UTC pairing, boxes, GFS easterly gate and missing
data rules. Dates are separated calendar blocks, not automatically independent
storms. Review weather-system continuity before claiming storm independence.
Use all available source products; disclose per-product retrieval gaps. Do not
replace an inaccessible date or a dry/opposite result with another date. The
initial replication uses openly accessible Himawari, CMORPH/PERSIANN and GFS;
new IMERG hours are a separately labeled access-dependent extension.

## 3. Local image geography

Attempt projection of the earliest local capture with plausible regional coverage,
preserving preceding reception failures. Use embedded timing and capture-date TLE.
Identify stable independent shoreline/landmark controls, not cloud edges or the
satellite's own overlay. Report held-out errors; do not label a case geographically
validated without actual identifiable controls. Retain failed validation attempts.
No local cloud/rain result is admitted merely because projection processing works.

## 4. External rainfall checks

Inventory public PAGASA/NOAA gauge/radar sources for the original/new dates.
Verify coordinates, physical units, quality flags and observation-day boundaries.
A daily gauge total with unknown/local boundaries cannot validate a00--24UTC box
total or an hourly contrast. A station outside a box is regional context, not
box ground truth. Missing station data are not dry observations. Record source
and access results; prepare a request draft for unavailable suitable data, but
do not send it without explicit instruction.

## 5. Practical demonstration

Build a transparent worked interpretation procedure from actual evidence: check
acquisition, geography, scan/rain intervals, saturation and product/placement
disagreement. Each gate produces a supported conclusion or an explicit abstention.
Demonstrate positive, opposite and insufficient cases. This is an educational
decision aid, not a validated forecast or disaster warning system.

## 6. Presentation and defense

Move full exploratory WRF methods/results into an appendix while retaining the
poor control reconstruction in the main findings/limitations. Preserve authors,
original data and historical analysis. Build a short main narrative, a reproducible
evidence ledger and a mock defense with model answers and author roles. Mark
external author/adviser review as pending until actually performed. Draft one
organizer clarification on AI/disclosure, public posting and report format; do
not invent rules or send messages. No submission is authorized by this work.

### Replication sampling clarification before contrast inspection

Report the original cell-center calculation and native-cell spherical area means
side by side on the three fixed new dates. Pair only complete source intervals;
list missing hours and require all24 hours for a daily total. The Oct26 CMORPH
14--17UTC containers are valid bzip2 wrappers with zero decompressed bytes;
retain them and their hashes as missing source data, never rainfall zeros.

## Separate weather-first October extension

The three fixed dates produced no qualifying two-product east-greater wet easterly
hours. Preserve this null result. Before inspecting any additional cloud outcomes,
declare a separate systematic screen of every October2026 date at00,06,12,18UTC
(124 candidate hours). Retain the whole candidate log. Obtain cloud masks for
all candidates with complete CMORPH/PERSIANN land estimates, easterly GFS flow,
and at least0.1mm estimated in either land box by each rainfall algorithm.
Do not select on contrast sign: east-greater, west-greater and mixed signs all
remain eligible. This is a rain/flow-conditioned case extension, not a random
sample or a validation of general forecasting accuracy. Record source gaps and
all exclusions; never replace failed candidates with a prettier scene.
