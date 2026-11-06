"""Capture-local diagnostics; never convert missing telemetry into success."""
import datetime as dt
import re
from pathlib import Path
import json

def timeline(folder):
    points={}
    for file in folder.rglob('progress.jsonl'):
        for line in file.read_text(errors='replace').splitlines():
            try:
                row=json.loads(line);stamp=row.get('time');moment=dt.datetime.fromisoformat(stamp)
                if moment.tzinfo is None:continue
                stamp=moment.astimezone(dt.timezone.utc).isoformat()
                item=points.setdefault(stamp,{'time':stamp})
                item.update(frames=row.get('complete_cadus'),raw_bytes=row.get('raw_bytes'))
            except (ValueError,TypeError):continue
    for file in folder.rglob('native-reception.log'):
        for line in file.read_text(errors='replace').splitlines():
            match=re.search(r'\[(\d\d:\d\d:\d\d) - (\d\d/\d\d/\d{4})\]',line)
            if not match:continue
            stamp=dt.datetime.strptime(match[2]+' '+match[1],'%d/%m/%Y %H:%M:%S').replace(tzinfo=dt.timezone.utc).isoformat()
            snr=re.search(r'(?<!Peak )SNR\s*:\s*(-?\d+(?:\.\d+)?)',line)
            lock=re.search(r'Deframer\s*:\s*(SYNCED|SYNC|NOSYNC)',line)
            ber=re.search(r'BER\s*:\s*([\d.eE+-]+)',line)
            if snr or lock:
                item=points.setdefault(stamp,{'time':stamp})
                if snr:item['snr_db']=round(float(snr[1]),3)
                if lock:item['frame_lock']=lock[1] in ['SYNC','SYNCED']
                if ber:item['ber']=float(ber[1])
    ordered=sorted(points.values(),key=lambda p:p['time'])
    relevant=[i for i,p in enumerate(ordered) if (p.get('raw_bytes') or 0)>0 or (p.get('snr_db') or 0)>0]
    if relevant:ordered=ordered[max(0,relevant[0]-2):relevant[-1]+3]
    # Preserve gaps explicitly. Do not interpolate lock into unobserved intervals.
    if len(ordered)>1500:ordered=ordered[::max(1,len(ordered)//1500)]
    locks=[p['frame_lock'] for p in ordered if isinstance(p.get('frame_lock'),bool)]
    return {'samples':ordered,'lock_samples':len(locks),'locked_samples':sum(locks),
            'method':'Capture-local logged samples. Gaps are unobserved; sampled lock fraction is not whole-pass completeness.'}

def coverage(folder,started,finished):
    result={'status':'unverified','reason':'No validated scan-time metadata available.','georeferencing':'unverified','track':[]}
    try:
        import cbor2
        from skyfield.api import EarthSatellite,load,wgs84
        path=folder/'final_images/MSU-MR/product.cbor'
        if not path.exists():return result
        product=cbor2.loads(path.read_bytes())
        for image in product.get('images',[]):
            sequence=[t for t in image.get('timestamps',[]) if isinstance(t,(int,float)) and t>0]
            if any(b<a for a,b in zip(sequence,sequence[1:])):
                result['reason']='Embedded scan times are non-monotonic; map placement withheld.'
                return result
        stamps=sorted(set(t for image in product.get('images',[]) for t in image.get('timestamps',[]) if isinstance(t,(int,float)) and t>0))
        if len(stamps)<3:return result
        lower=dt.datetime.fromisoformat(started).timestamp()-60
        upper=dt.datetime.fromisoformat(finished).timestamp()+60
        result.update(scan_start_utc=dt.datetime.fromtimestamp(stamps[0],dt.timezone.utc).isoformat(),scan_end_utc=dt.datetime.fromtimestamp(stamps[-1],dt.timezone.utc).isoformat(),valid_scan_timestamps=len(stamps))
        if not (lower<=stamps[0]<=stamps[-1]<=upper):result['reason']='Embedded scan times fall outside the capture window; map placement withheld.';return result
        tle=product['tle'];ts=load.timescale(builtin=True);sat=EarthSatellite(tle['line1'],tle['line2'],tle['name'],ts)
        if abs(float(ts.from_datetime(dt.datetime.fromtimestamp(stamps[0],dt.timezone.utc))-sat.epoch))>7:result['reason']='Orbital elements are too old for this observation.';return result
        selected=stamps[::max(1,len(stamps)//150)];geo=wgs84.subpoint(sat.at(ts.from_datetimes([dt.datetime.fromtimestamp(t,dt.timezone.utc) for t in selected])))
        result.update(status='timing_verified',reason='Embedded scan times agree with the reception window. The line is the satellite subtrack during received scans, not the image footprint.',norad=tle['norad'],track=[[round(float(lon),4),round(float(lat),4)] for lon,lat in zip(geo.longitude.degrees,geo.latitude.degrees)])
    except (ImportError,ValueError,KeyError,TypeError,OSError) as exc:
        result['reason']='Metadata validation could not establish geographic placement.'
    return result

def satellite(folder,meta):
    labelled=re.search(r'M2-[34](?:$|_)',folder.name)
    name=labelled[0].rstrip('_') if labelled else meta.get('satellite')
    try:
        import cbor2
        p=folder/'final_images/MSU-MR/product.cbor'
        if p.exists():
            n=cbor2.loads(p.read_bytes()).get('tle',{}).get('norad');actual={57166:'M2-3',59051:'M2-4'}.get(n)
            if name and actual and actual!=name:raise ValueError('Satellite label contradicts product metadata')
            name=name or actual
    except ImportError:pass
    if name not in ['M2-3','M2-4']:raise ValueError('Satellite identity missing; publication withheld')
    return name
