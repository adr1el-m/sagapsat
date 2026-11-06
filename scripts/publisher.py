#!/usr/bin/env python3
"""Pi outbound-only publication service. Does not operate or delete reception data."""
import argparse,datetime as dt,json,subprocess,time,sys,os
from pathlib import Path
from urllib.request import Request,urlopen
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import build
from analysis import satellite

def command(args):
    try:return subprocess.check_output(args,text=True,timeout=5).strip()
    except (OSError,subprocess.SubprocessError):return None

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path.home()/'wni-receiver');ap.add_argument('--base',default='https://sagapsat.vercel.app');ap.add_argument('--once',action='store_true');args=ap.parse_args()
    root=args.root;home=root/'sagapsat-publisher';home.mkdir(exist_ok=True)
    import fcntl
    lock_handle=(home/'publisher.lock').open('w')
    fcntl.flock(lock_handle,fcntl.LOCK_EX|fcntl.LOCK_NB)
    secret=home/'secret';state=home/'published.json';done=json.loads(state.read_text()) if state.exists() else {}
    token=secret.read_text().strip();previous=None;last_station=0;last_orbits=0
    def post(kind,data):
        req=Request(args.base+'/api/publish',data=json.dumps({'kind':kind,'data':data}).encode(),headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
        with urlopen(req,timeout=30) as res:return json.load(res)
    def heartbeat():
        nonlocal previous,last_station
        decoded=root/'decoded';files=list(decoded.glob('*/meteor_m2-x_lrpt.cadu'));latest=max(files,key=lambda p:p.stat().st_mtime) if files else None
        running=bool(command(['pgrep','-x','satdump-ui']) or command(['pgrep','-x','satdump']))
        n=latest.stat().st_size if latest else 0;identity=str(latest) if latest else None
        growth=bool(previous and previous[0]==identity and n>previous[1]);previous=(identity,n)
        sample=dict(sampled_utc=dt.datetime.now(dt.timezone.utc).isoformat(),sdr_present=bool(command(['lsusb','-d','0bda:2838'])),satdump_running=running,frames_growing=growth,frames=n//1024,free_gb=round(__import__('shutil').disk_usage(root).free/1e9,1),temperature=command(['vcgencmd','measure_temp']),throttled=command(['vcgencmd','get_throttled']))
        # Only expose recent decoder estimates; saved log values never become live RF.
        logs=list((Path.home()/'.config/satdump').glob('satdump-*.log'))
        if logs and running:
            log=max(logs,key=lambda p:p.stat().st_mtime)
            import re
            for line in log.read_text(errors='replace').splitlines()[-30:]:
                m=re.search(r'\[(\d\d:\d\d:\d\d) - (\d\d/\d\d/\d{4})\]',line)
                if not m:continue
                timestamp=dt.datetime.strptime(m[2]+' '+m[1],'%d/%m/%Y %H:%M:%S').replace(tzinfo=dt.timezone.utc)
                if abs((dt.datetime.now(dt.timezone.utc)-timestamp).total_seconds())>90:continue
                snr=re.search(r'(?<!Peak )SNR\s*:\s*(-?[\d.]+)',line)
                lock=re.search(r'Deframer\s*:\s*(NOSYNC|SYNCED|SYNC)',line)
                if snr:sample.update(snr_db=float(snr[1]),telemetry_utc=timestamp.isoformat())
                if lock:sample.update(frame_lock=lock[1] in ['SYNC','SYNCED'],telemetry_utc=timestamp.isoformat())
        sample['phase']='receiving' if growth else 'processing' if command(['pgrep','-x','satdump']) else 'armed' if running else 'idle'
        if time.time()-last_station>(60 if running else 300) or args.once:
            post('station',sample);last_station=time.time()

    def heartbeat_loop():
        while True:
            try:heartbeat()
            except Exception as exc:print('Heartbeat retry pending:',type(exc).__name__,flush=True)
            time.sleep(30)
    if not args.once:
        import threading
        threading.Thread(target=heartbeat_loop,daemon=True).start()
    while True:
        try:
            if args.once:heartbeat()
            decoded=root/'decoded'
            if time.time()-last_orbits>10800:
                last_orbits=time.time()
                data=build.orbits(home/'.cache')
                if data['satellites'] and not data['errors']:post('orbits',data);last_orbits=time.time()
            # Only finalized captures with known satellite metadata can be published.
            for result in sorted(decoded.glob('*/capture-result.json')):
                fingerprint=str(result.stat().st_mtime_ns)+':'+str(result.stat().st_size)
                if done.get(str(result))==fingerprint:continue
                meta=json.loads(result.read_text());satellite(result.parent,meta)
                if meta.get('status')!='images_saved':continue
                # Collect capture-local monitor/log evidence without modifying native output.
                import tempfile,shutil
                with tempfile.TemporaryDirectory(prefix='sagapsat-export-') as tmp:
                    staging=Path(tmp)/'source';staging.mkdir();folder=staging/result.parent.name;folder.mkdir()
                    for name in ['capture-result.json','meteor_m2-x_lrpt.cadu','final-processing.log']:
                        if (result.parent/name).exists():shutil.copy2(result.parent/name,folder/name)
                    shutil.copytree(result.parent/'final_images',folder/'final_images',symlinks=False)
                    for cfg_path in (root/'sessions').glob('*/config.json'):
                        cfg=json.loads(cfg_path.read_text())
                        if cfg.get('folder')==str(result.parent):
                            log=Path(cfg.get('native_log','/nonexistent'))
                            if log.is_file():shutil.copy2(log,folder/'native-reception.log')
                            progress=cfg_path.parent/'progress.jsonl'
                            if progress.exists():shutil.copy2(progress,folder/'progress.jsonl')
                    out=Path(tmp)/'export';out.mkdir();data=build.archive(staging,out)
                    if len(data['captures'])!=1:raise ValueError(str(data['warnings']))
                    capture=data['captures'][0];payload=Path(tmp)/'payload.json';payload.write_text(json.dumps({'root':str(out),'capture':capture}))
                    subprocess.run(['node',str(Path(__file__).with_name('upload-assets.cjs')),str(payload),str(secret),str(home/'assets.json'),args.base],check=True,timeout=1200)
                done[str(result)]=fingerprint;state.write_text(json.dumps(done,indent=2));print('Published',result.parent.name,flush=True)
        except Exception as exc:
            print('Publisher retry pending:',type(exc).__name__,str(exc)[:300],flush=True)
            if args.once:raise SystemExit(1)
        if args.once:break
        time.sleep(30)
if __name__=='__main__':main()
