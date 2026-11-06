#!/usr/bin/env python3
"""Read-only local portal. Optional SSH probe never starts/stops SDR processes."""
import argparse
import datetime as dt
import functools
import json
import subprocess
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROBE = r'''
import datetime as dt, json, pathlib, shutil, subprocess
root=pathlib.Path.home()/'wni-receiver'
def command(args):
 try:return subprocess.check_output(args,text=True,timeout=3).strip()
 except (OSError,subprocess.SubprocessError):return None
files=list((root/'decoded').glob('*/meteor_m2-x_lrpt.cadu'))
p=max(files,key=lambda p:p.stat().st_mtime) if files else None
print(json.dumps(dict(sampled_utc=dt.datetime.now(dt.timezone.utc).isoformat(),
 sdr_present=bool(command(['lsusb','-d','0bda:2838'])),
 satdump_running=bool(command(['pgrep','-x','satdump-ui']) or command(['pgrep','-x','satdump'])),
 free_gb=round(shutil.disk_usage(root).free/1e9,1),
 temperature=command(['vcgencmd','measure_temp']),throttled=command(['vcgencmd','get_throttled']),
 latest_capture=p.parent.name if p else None,cadu_bytes=p.stat().st_size if p else 0)))
'''

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--host',default='127.0.0.1')
    ap.add_argument('--port',type=int,default=8088)
    ap.add_argument('--pi',help='Optional trusted SSH hostname, e.g. adriel@wni-pi5.local')
    ap.add_argument('--identity',type=Path)
    ap.add_argument('--refresh-orbits',action='store_true',help='Recompute local predictions hourly; requires build dependencies')
    args=ap.parse_args()
    status={'connected':False,'message':'Live station probe is not configured.'}
    lock=threading.Lock()
    def probe():
        previous=None
        while True:
            try:
                cmd=['python3','-'] if args.pi=='local' else ['ssh','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=4']
                if args.pi!='local':
                    if args.identity:cmd+=['-o','IdentitiesOnly=yes','-i',str(args.identity.expanduser())]
                    cmd += [args.pi,'python3 -']
                result=subprocess.run(cmd,input=PROBE,text=True,capture_output=True,timeout=12,check=True)
                data=json.loads(result.stdout)
                data['connected']=True
                data['frames_growing']=bool(previous and previous['latest_capture']==data['latest_capture'] and data['cadu_bytes']>previous['cadu_bytes'])
                data['message']='Read-only SSH health probe; no receiver controls exposed.'
                previous=data.copy()
            except (OSError,ValueError,subprocess.SubprocessError):
                data={'connected':False,'message':'Station unreachable. Live hardware status is unavailable.'}
                previous=None
            with lock:status.clear();status.update(data)
            time.sleep(10)
    if args.pi:threading.Thread(target=probe,daemon=True).start()
    if args.refresh_orbits:
        from build import orbits
        def refresh():
            while True:
                try:
                    data=orbits(ROOT/'.cache')
                    # Retain existing recent predictions if all network/cache inputs fail.
                    if data['satellites']:
                        temp=ROOT/'dist/orbits.json.tmp'
                        temp.write_text(json.dumps(data,separators=(',',':')))
                        temp.replace(ROOT/'dist/orbits.json')
                except Exception as exc:
                    print('Orbit refresh failed:',str(exc),flush=True)
                time.sleep(3600)
        threading.Thread(target=refresh,daemon=True).start()
    class Handler(SimpleHTTPRequestHandler):
        def do_GET(self):
            if self.path.split('?')[0]=='/station.json':
                with lock:body=json.dumps(status).encode()
                self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
            else:super().do_GET()
        def end_headers(self):
            self.send_header('X-Content-Type-Options','nosniff')
            super().end_headers()
        def list_directory(self,path):
            self.send_error(404)
    http=ThreadingHTTPServer((args.host,args.port),functools.partial(Handler,directory=str(ROOT/'dist')))
    print(f'SagapSat: http://{args.host}:{args.port}',flush=True)
    try:http.serve_forever()
    except KeyboardInterrupt:pass
    finally:http.server_close()

if __name__=='__main__':main()
