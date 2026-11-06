#!/usr/bin/env python3
"""Build a portable, read-only observatory from original reception evidence.

Never modifies input files or operates the SDR. Output contains only explicitly
selected evidence, with full hashes and original images retained for download.
"""
import argparse
import os
import datetime as dt
import hashlib
import json
import re
import shutil
from pathlib import Path
from urllib.parse import quote
from urllib.request import urlopen, Request

import numpy as np
from PIL import Image
from skyfield.api import EarthSatellite, load, wgs84

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parents[2]
UTC = dt.timezone.utc
STATION = {'name': 'Team Magalona', 'latitude': float(os.environ.get('SAGAPSAT_LATITUDE', '14.6')),
           'longitude': float(os.environ.get('SAGAPSAT_LONGITUDE', '121.0')), 'altitude_m': 0,
           'coordinate_source': 'Approximate Metro Manila location by default; override using SAGAPSAT_LATITUDE / SAGAPSAT_LONGITUDE',
           'timezone': 'Asia/Manila', 'mask_deg': 10}

def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()

def iso(value):
    return value.astimezone(UTC).isoformat()

def archive(source, out):
    captures = []
    warnings = []
    for folder in sorted(source.iterdir()):
        result = folder / 'capture-result.json'
        if not folder.is_dir() or not result.is_file():
            continue
        if not re.search(r'M2-[34](?:$|_)', folder.name):
            warnings.append({'capture': folder.name, 'error':'Satellite label missing; refusing to infer identity'})
            continue
        try:
            meta = json.loads(result.read_text())
            cadu = folder / 'meteor_m2-x_lrpt.cadu'
            raw = cadu.read_bytes() if cadu.exists() else b''
            frames = [raw[i:i+1024] for i in range(0, len(raw)-1023, 1024)]
            sync = sum(f[:4] == b'\x1a\xcf\xfc\x1d' for f in frames)
            evidence_dir = out / 'evidence' / folder.name
            evidence_dir.mkdir(parents=True, exist_ok=True)
            evidence = []
            names = ['capture-result.json', 'meteor_m2-x_lrpt.cadu', 'README.md', 'REFLECTION.md',
                     'native-reception.log', 'final-processing.log']
            names += [str(p.relative_to(folder)) for p in folder.rglob('*')
                      if p.name in {'native-reception.log', 'progress.jsonl', 'rf-comparison.json'}
                      and p.parent != folder]
            for name in names:
                p = folder / name
                if p.is_file() and not p.is_symlink():
                    (evidence_dir/name).parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(p, evidence_dir / name)
                    evidence.append({'name': name, 'bytes': p.stat().st_size,
                                     'sha256': digest(p), 'url': 'evidence/'+quote(folder.name)+'/'+quote(name)})
            images = []
            # Index finalizer-declared products only; omit map overlays whose scan
            # timestamps have not been validated. Composites are product variants.
            for rel in sorted(set(meta.get('images', []))):
                p = folder / rel
                if not p.resolve().is_relative_to(folder.resolve()) or p.is_symlink():
                    continue
                if not p.is_file() or p.suffix.lower() != '.png' or '_map' in p.stem.lower():
                    continue
                target = evidence_dir / p.name
                shutil.copy2(p, target)
                with Image.open(p) as im:
                    width, height = im.size
                    im = im.convert('RGB')
                    im.thumbnail((1600, 1100))
                    preview = target.with_suffix('.webp')
                    im.save(preview, 'WEBP', quality=88)
                images.append({'name': p.name, 'label': p.stem.replace('msu_mr_rgb_', '').replace('_', ' '),
                               'width': width, 'height': height, 'bytes': p.stat().st_size,
                               'sha256': digest(p), 'url': 'evidence/'+quote(folder.name)+'/'+quote(p.name),
                               'preview': 'evidence/'+quote(folder.name)+'/'+quote(preview.name)})
            preferred = next((x for x in images if x['name']=='msu_mr_rgb_AVHRR_221_False_Color_corrected.png'),
                             next((x for x in images if x['name']=='MSU-MR-1.png'), images[0] if images else None))
            log = '\n'.join((folder/name).read_text(errors='replace') for name in names
                            if name.endswith(('native-reception.log', 'progress.jsonl')) and (folder/name).exists())
            snrs = [float(x) for x in re.findall(r'SNR\s*:\s*(-?\d+(?:\.\d+)?)', log)]
            notes = '\n\n'.join((folder/n).read_text() for n in ['README.md', 'REFLECTION.md'] if (folder/n).exists())
            match = re.search(r'(\d{4}-\d\d-\d\d)_(\d\d)-(\d\d)_meteor', meta.get('folder', ''))
            started = match[1]+'T'+match[2]+':'+match[3]+':00+00:00' if match else None
            captures.append({'id': folder.name, 'satellite': 'M2-4' if 'M2-4' in folder.name else 'M2-3',
                'started_utc': started, 'finished_utc': meta.get('finished_utc'),
                'frequency_mhz': 137.9, 'outcome': 'partial' if images and frames else 'frames' if frames else 'no_frames',
                'cadu_bytes': len(raw), 'frames': len(frames), 'unique_frames': len(set(frames)),
                'sync_frames': sync, 'trailing_bytes': len(raw)%1024,
                'size_matches_report': len(raw)==meta.get('cadu_bytes'),
                'peak_snr_db': max(snrs) if snrs else None,
                'images': images, 'featured': preferred, 'evidence': evidence,
                'notes': notes or 'Image completeness has not been independently measured. Geographic placement is unverified.',
                'georeferencing': 'unverified', 'processing_exit_code': meta.get('exit_code')})
        except (OSError, ValueError, KeyError) as e:
            warnings.append({'capture': folder.name, 'error': str(e)})
    captures.sort(key=lambda x: x['started_utc'] or '', reverse=True)
    return {'generated_utc': iso(dt.datetime.now(UTC)), 'station': STATION,
            'captures': captures, 'warnings': warnings,
            'policy': 'Local reception archive only. All displayed captures conservatively classified as partial. '
                      'Image variants do not represent separate observations. ASM checks confirm framing, not independent RS revalidation. '
                      'No geographic image overlays until scan timing and georeferencing are validated.'}

def get_tle(number, cache):
    cache.mkdir(parents=True, exist_ok=True)
    path = cache / f'{number}.tle'
    source = f'https://celestrak.org/NORAD/elements/gp.php?CATNR={number}&FORMAT=TLE'
    error = None
    if not path.exists() or dt.datetime.now().timestamp()-path.stat().st_mtime > 21600:
        try:
            data = urlopen(Request(source, headers={'User-Agent':'Magalona-Observatory/1.0'}), timeout=15).read().decode().strip()
            lines = data.splitlines()
            if len(lines)!=3 or not lines[1].startswith(f'1 {number}') or not lines[2].startswith(f'2 {number}'):
                raise ValueError('Unexpected TLE response')
            for line in lines[1:]:
                if len(line) < 69 or sum(int(c) if c.isdigit() else 1 if c=='-' else 0 for c in line[:68])%10 != int(line[68]):
                    raise ValueError('Invalid TLE checksum')
            path.write_text(data+'\n')
        except Exception as e:
            error = str(e)
    if not path.exists():
        raise ValueError(f'No orbital elements for {number}: {error}')
    return path.read_text().splitlines(), source, error

def orbits(cache, now=None):
    now = now or dt.datetime.now(UTC)
    ts = load.timescale(builtin=True)
    observer = wgs84.latlon(STATION['latitude'], STATION['longitude'], elevation_m=STATION['altitude_m'])
    satellites, passes, errors = [], [], []
    for number, name in [(57166, 'M2-3'), (59051, 'M2-4')]:
        try:
            lines, source, error = get_tle(number, cache)
            sat = EarthSatellite(lines[1], lines[2], name, ts)
            age = abs(float(ts.from_datetime(now)-sat.epoch))
            if age > 7:
                raise ValueError(f'{name}: TLE epoch is {age:.1f} days from now; predictions withheld')
            # 48h samples support client interpolation without claiming live RF.
            times = ts.from_datetimes([now+dt.timedelta(seconds=int(s)) for s in range(-600, 48*3600+1, 30)])
            geo = sat.at(times)
            sub = wgs84.subpoint(geo)
            alt, az, distance = (sat-observer).at(times).altaz()
            points = np.column_stack([sub.latitude.degrees, sub.longitude.degrees,
                                      sub.elevation.km, alt.degrees, az.degrees, distance.km])
            satellites.append({'name': name, 'norad': number, 'epoch': sat.epoch.utc_iso(), 'age_days': round(age, 2),
                               'source': source, 'refresh_error': error, 'tle': lines,
                               'start_utc': iso(now-dt.timedelta(seconds=600)), 'step_seconds': 30,
                               'points': np.round(points, 3).tolist()})
            t, events = sat.find_events(observer, ts.from_datetime(now-dt.timedelta(minutes=25)),
                                       ts.from_datetime(now+dt.timedelta(hours=48)), altitude_degrees=STATION['mask_deg'])
            current = {}
            for time, event in zip(t, events):
                instant = time.utc_datetime()
                a, z, _ = (sat-observer).at(time).altaz()
                if event == 0:
                    current = {'satellite': name, 'aos': iso(instant), 'aos_az': round(float(z.degrees),1)}
                elif event == 1 and current:
                    current.update(peak=iso(instant), max_elevation=round(float(a.degrees),1))
                elif event == 2 and current.get('peak'):
                    if instant >= now:
                        current.update(los=iso(instant), los_az=round(float(z.degrees),1),
                            duration_seconds=round((instant-dt.datetime.fromisoformat(current['aos'])).total_seconds()))
                        passes.append(current)
                    current = {}
        except Exception as e:
            errors.append(str(e))
    return {'generated_utc': iso(now), 'valid_until_utc': iso(now+dt.timedelta(hours=48)),
            'station': STATION, 'satellites': satellites, 'passes': sorted(passes,key=lambda p:p['aos']),
            'errors': errors, 'method': 'Skyfield / SGP4; 10° horizon mask. Geometry does not establish reception or downlink availability.'}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--archive', type=Path, default=PROJECT/'output/receptions')
    ap.add_argument('--output', type=Path, default=ROOT/'dist')
    args = ap.parse_args()
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)
    for name in ['index.html', 'app.js', 'style.css', 'coastline.json']:
        if (ROOT/name).exists(): shutil.copy2(ROOT/name, out/name)
    (out/'archive.json').write_text(json.dumps(archive(args.archive, out), indent=2))
    orbital = orbits(ROOT/'.cache')
    (out/'orbits.json').write_text(json.dumps(orbital, separators=(',', ':')))
    (out/'station.json').write_text(json.dumps({'connected':False,
        'message':'Hosted archive snapshot. Live hardware monitoring is available only through the local read-only server.'}))
    print(json.dumps({'output':str(out), 'captures':len(json.loads((out/'archive.json').read_text())['captures']),
                      'predicted_passes':len(orbital['passes']), 'orbit_errors':orbital['errors']}))

if __name__ == '__main__':
    main()
