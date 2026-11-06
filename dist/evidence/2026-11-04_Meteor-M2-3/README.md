# Local Meteor reception — 4 November 2026

Actual antenna/RTL-SDR/Pi reception, not an archive/sample replay.

- Native SatDump 1.2.2 ran Meteor M2-x LRPT 72k at 137.900 MHz and 1.024 MS/s,
  with software DC blocking, RS checking, gain 38.6 dB, AGC/bias off.
- Log polling observed both Viterbi and frame synchronization around
  21:17:50–21:18:00 PHT, with intermittent loss of lock afterward.
- Automatic capture stop executed at 21:32 PHT. Saved CADUs: 138,240 bytes,
  or **135 validated 1024-byte frames**. Offline image processing exited 0.
- Visual inspection of raw channel 4 and corrected MCIR shows a **short image
  strip with cloud-like structure and missing data**, not a complete pass image.
  This establishes partial local image reception; regional coverage, calibrated
  quantities, map registration and scientific suitability are not validated.
- `final_images/` contains derived outputs. `capture-result.json`, CADUs and
  processing log were copied directly from the Pi. Multiple generated composites
  represent the same limited capture, not multiple independent observations.
- Full original CS8 IQ remains on the Pi at
  `/home/adriel/wni-receiver/raw/2026-11-04_12-10-32_1024000SPS_137900000Hz.cs8`.
  It has not been copied to the Mac in this handoff.

Pi capture directory:
`/home/adriel/wni-receiver/decoded/2026-11-04_12-09_meteor_m2-x_lrpt_137.9 MHz/`.

## Recovery and improvement assessment

Replayed a 90-second excerpt spanning 21:17:10–21:18:40 PHT from the preserved
CS8 recording on the Pi, with the standard 72k pipeline, 1.024 MS/s, DC blocking
and RS checking. It recovered **239 distinct validated CADUs** versus 135 distinct
CADUs in the original live capture. These are overlapping versions of the same
reception and must not be added as independent frames/observations.

The recovered channel 4 image in `replay-baseline/MSU-MR-4.png` is 1568×336 pixels,
versus 1568×112 for the original. Both remain limited fragments. The replay CADUs
are `replay-baseline.cadu`; the native receiver log is `native-reception.log`.
The original raw IQ remains unchanged on the Pi. The excerpt is stored there at
`~/wni-receiver/tests/recovery-20261104/2026-11-04_13-17-10_1024000SPS_137900000Hz.cs8`.

Two controlled replay trials changed only PLL bandwidth: 0.001 recovered zero
frames; 0.004 recovered 61; standard 0.002 recovered 239. Therefore retain the
standard setting rather than adopting either trial. Results and replay log are
in `replay-baseline/`. Higher replay yield does not by itself prove CPU drops,
and it does not resolve why the received signal was weak/intermittent.

The user clarified that open ground lies beneath the dipole arms and reported
no nearby water tank, railing or wall. Metal-roof interference is not established;
actual antenna height and clearance remain uncertain. Priorities for another
attempt: confirm dipole geometry and clearance, compare manual receiver gains
using valid-frame yield, and verify the existing filtered LNA's power method,
direction and SDR compatibility before a powered-vs-bypass comparison.
