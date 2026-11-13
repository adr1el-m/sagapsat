"""Make a small, unfilled MSU-MR preview from a growing Meteor CADU file."""
import base64
import datetime as dt
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from PIL import Image, ImageChops

FRAME_BYTES = 1024
MAX_FRAMES = 12000
INTERVAL = 35
EXPIRY = 110


def decode_snapshot(source, frames, decoder=None):
    """Copy only complete records. SatDump operates on the copy in scratch space."""
    decoder = decoder or ['nice', '-n', '15', 'satdump']
    with tempfile.TemporaryDirectory(prefix='sagapsat-preview-') as scratch:
        work = Path(scratch)
        snapshot = work / 'preview.cadu'
        with source.open('rb') as stream, snapshot.open('wb') as output:
            stream.seek(max(0, frames - MAX_FRAMES) * FRAME_BYTES)
            output.write(stream.read(min(frames, MAX_FRAMES) * FRAME_BYTES))
        env = {**os.environ, 'OMP_NUM_THREADS': '1', 'OPENBLAS_NUM_THREADS': '1'}
        if sys.platform.startswith('linux'):
            config = work / '.config' / 'satdump'
            config.mkdir(parents=True)
            (config / 'settings.json').write_text(json.dumps({
                'satdump_general': {'auto_process_products': {'value': False}}
            }))
            tle = Path.home() / '.config/satdump/satdump_tles.txt'
            if tle.is_file():
                shutil.copyfile(tle, config / tle.name)
            env['HOME'] = str(work)
        subprocess.run([*decoder, 'meteor_m2-x_lrpt', 'cadu', str(snapshot),
                        str(work / 'decoded'), '--fill_missing', 'false'],
                       timeout=24, check=True, env=env, cwd=work,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        best = None
        for path in sorted((work / 'decoded' / 'MSU-MR').glob('MSU-MR-*.png')):
            channel = re.fullmatch(r'MSU-MR-([1-6])', path.stem)
            if not channel:
                continue
            with Image.open(path) as original:
                image = original.convert('RGB')
                bounds = ImageChops.difference(image, Image.new('RGB', image.size)).getbbox()
                if not bounds or bounds[3] - bounds[1] < 16:
                    continue
                score = (bounds[2] - bounds[0]) * (bounds[3] - bounds[1])
                if best is None or score > best[0]:
                    image.thumbnail((1000, 1500), Image.Resampling.LANCZOS)
                    best = (score, int(channel[1]), image)
        if best is None:
            return None
        _, channel, image = best
        for width, quality in [(1000, 82), (800, 75), (640, 65)]:
            image.thumbnail((width, width * 3 // 2), Image.Resampling.LANCZOS)
            buffer = io.BytesIO()
            image.save(buffer, 'WEBP', quality=quality, method=2)
            if buffer.tell() <= 240000:
                return {'channel': channel, 'width': image.width, 'height': image.height,
                        'webp': base64.b64encode(buffer.getvalue()).decode('ascii')}
        return None


def latest_cadu(root):
    newest = None
    for path in (root / 'decoded').glob('*/meteor_m2-x_lrpt*.cadu'):
        try:
            stat = path.stat()
        except FileNotFoundError:
            continue
        if newest is None or stat.st_mtime > newest[1].st_mtime:
            newest = (path, stat)
    return newest or (None, None)


class LivePreview:
    def __init__(self):
        self.attempted = 0
        self.key = None
        self.frames = 0
        self.image = None

    def update(self, source, stat, running):
        now = time.time()
        if not source or not running or not 0 <= now - stat.st_mtime < EXPIRY:
            self.key = self.image = None
            return None
        if (source.parent / 'capture-result.json').exists():
            self.key = self.image = None
            return None
        frames = stat.st_size // FRAME_BYTES
        key = (source, stat.st_ino)
        if self.key != key or frames < self.frames:
            self.key, self.image = key, None
            self.attempted = 0
        self.frames = frames
        if (frames >= 64 and now - self.attempted >= INTERVAL
                and (not self.image or frames > self.image['frames'])):
            self.attempted = now
            try:
                image = decode_snapshot(source, frames)
            except (OSError, ValueError, subprocess.SubprocessError) as error:
                print('Preview decode:', type(error).__name__, flush=True)
            else:
                if image:
                    self.image = {**image, 'frames': frames, 'received_utc':
                                  dt.datetime.fromtimestamp(stat.st_mtime, dt.timezone.utc).isoformat()}
        if self.image and now - dt.datetime.fromisoformat(self.image['received_utc']).timestamp() < EXPIRY:
            return self.image
        return None
