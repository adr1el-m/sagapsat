#!/usr/bin/env python3
"""Build the public signal excerpt from the archived 15 November M2-3 channel."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image

RATE = 160_000
AUDIO_RATE = 32_000
START = 478
DURATION = 8
SOURCE_HASH = '2784290c14c428625e4829c1a67804ced29383dc47ca28ea460ff30daf8d2ecc'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path, help='Recorded 137.9 MHz interleaved signed 8-bit I/Q')
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    with args.source.open('rb') as source:
        if hashlib.file_digest(source, 'sha256').hexdigest() != SOURCE_HASH:
            parser.error('Source does not match the archived 137.9 MHz channel')
        source.seek(2 * RATE * START)
        iq = np.frombuffer(source.read(2 * RATE * DURATION), np.int8).reshape(-1, 2).astype(np.float32)
    assert len(iq) == RATE * DURATION
    # Stereo sonification maps recorded I and Q to two audible channels.
    iq -= iq.mean(axis=0)
    fade = np.linspace(0, 1, AUDIO_RATE // 25, dtype=np.float32)[:, None]
    playback = iq / np.max(np.abs(iq)) * .9
    playback[:len(fade)] *= fade
    playback[-len(fade):] *= fade[::-1]
    args.output.mkdir(parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'f32le', '-ar',
                    str(AUDIO_RATE), '-ac', '2', '-i', 'pipe:0', '-c:a', 'libmp3lame',
                    '-b:a', '128k', str(args.output / 'signal-example.mp3')],
                   input=playback.astype('<f4').tobytes(), check=True)

    # Equal-width columns represent equal intervals in the same eight seconds.
    time_bins, fft_size = 500, 512
    bins = iq[:len(iq) // time_bins * time_bins].reshape(time_bins, -1, 2)
    chunks = bins[:, :bins.shape[1] // fft_size * fft_size].reshape(time_bins, -1, fft_size, 2)
    iq_complex = chunks[..., 0] + 1j * chunks[..., 1]
    spectrum = np.fft.fftshift(np.fft.fft(iq_complex * np.hanning(fft_size)), axes=-1)
    power = 10 * np.log10(np.maximum(1e-10, (abs(spectrum) ** 2).mean(axis=1)))
    level = np.clip((power - np.percentile(power, 5)) /
                    (np.percentile(power, 99.5) - np.percentile(power, 5)), 0, 1)
    levels = level.T[::-1]
    palette = np.array([[13, 23, 43], [35, 57, 99], [37, 119, 132],
                        [216, 178, 91], [252, 232, 162]])
    colors = np.stack([np.interp(levels, np.linspace(0, 1, len(palette)), channel)
                       for channel in palette.T], axis=-1)
    Image.fromarray(colors.astype(np.uint8)).save(args.output / 'signal-waterfall.webp', lossless=True)
    notes = {
        'capture': '2026-11-15_12-15-00_Meteor-M2-3',
        'capture_started_utc': '2026-11-15T12:15:00+00:00',
        'center_frequency_hz': 137_900_000,
        'source_sample_rate_hz': RATE,
        'source_sha256': SOURCE_HASH,
        'recorded_offset_seconds': START,
        'recorded_duration_seconds': DURATION,
        'audio_sample_rate_hz': AUDIO_RATE,
        'decoded_cadu_sha256': '5e6b72a285fb44c8130496d3fdf5561a3642fcb2fc091538fce779f05d710db0',
        'method': 'Recorded channel I and Q replayed as stereo at one-fifth speed. The waterfall '
                  'shows relative FFT power over the same excerpt. Sample time has no validated '
                  'mapping to the rows of the decoded image.'
    }
    (args.output / 'signal-example.json').write_text(json.dumps(notes, indent=2) + '\n')


if __name__ == '__main__':
    main()
