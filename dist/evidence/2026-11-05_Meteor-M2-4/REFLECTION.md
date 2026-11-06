# Afternoon reception findings and next controlled test

2091 distinct CADUs, expected ASM throughout; morning392. Native SatDump logs show repeated deframer sync14:56:10–15:00:00, compared with morning09:46:10–09:46:50. Logs sampled10sec; these are sampled intervals, not claims of uninterrupted lock. Peak demodulator estimate14.36dB vs5.45dB morning. Afternoon image coverage1568x1544 vs1568x304 morning channel1, with edge/missing data artifacts.

Raw-IQ spot checks used64 FFTs of8192 samples each, Hann window, zero-mean samples; mean power in3–65kHz offsets compared with100–220kHz offsets on both sides. This is a comparative band-power metric, NOT calibrated SNR and not a separation of satellite from all interference. Metric13.40dB at14:58:30,8.36dB14:59:30,1.35dB15:00:30. Near-full-scale samples <=0.0001% in inspected windows; no evidence of widespread digital clipping in those windows. This does not rule out analog-stage overload. Signal-band fading is more supported than a display-only lock failure, but physical cause remains unresolved.

Preserved working configuration on Pi: ~/wni-receiver/profiles/meteor-m2-4-successful-20261105.json.137.9MHz72k,1.024MS/s,gain25.4dB,AGCoff,biasoff,USBpoweredLNA,CS8raw+live. Do not attribute improvement solely to LNA: both morning and afternoon used LNA; satellites and pass geometry differed.

Next controlled-test procedure:
1. Keep successful receiver settings initially. Do not raise gain just because lock drops; substantial SNR was achieved with25.4dB.
2. Record to predicted LOS even after NOSYNC, unless user explicitly requests stop. Recovery is possible; preserving the ending allows analysis of missed opportunities.
3. Log exact time and only one change at a time. Compare modest gain changes only with a visible signal, then return to baseline if no benefit. No scheduled automatic gain control exists for this native GUI.
4. Check safely accessible cable/LNA direction and antenna placement; any physical reorientation test should be from an accessible ground location. Record orientation before/after. No roof climbing during reception.
5. Prioritize comparable M2-4 passes for a clean comparison, and compare frame growth/lock duration as well as peak SNR. M2-3 remains a different test rather than an equivalent comparison.
6. Preserve CADUs, native logs, raw IQ and all image products. Always deliver colour and grayscale outputs together. False colour products are channel combinations, not independent captures; more composites do not add missing geography.

Capture stopped at user request around15:02:42PHT. Raw remains on Pi; it is not backed up locally. Images and CADUs are local copies. No new future reception is armed by this reflection.
