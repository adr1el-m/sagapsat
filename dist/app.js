'use strict';
const $=id=>document.getElementById(id), fmt=new Intl.NumberFormat('en-PH');
let archive,orbital,coastline,selectedSatellite='M2-3',archiveFilter='all',currentCapture,currentPass;
const date=(v,options={})=>v?new Date(v).toLocaleString('en-PH',{timeZone:'Asia/Manila',day:'2-digit',month:'short',year:'numeric',...options}):'Not recorded';
const time=v=>v?new Date(v).toLocaleTimeString('en-PH',{timeZone:'Asia/Manila',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}):'—';
const shortTime=v=>v?new Date(v).toLocaleTimeString('en-PH',{timeZone:'Asia/Manila',hour:'2-digit',minute:'2-digit',hour12:false}):'—';
const snr=v=>Number.isFinite(v)?v.toFixed(2)+' dB':'Not logged';
const countdown=v=>{const s=Math.floor((new Date(v)-Date.now())/1000);if(s<=0)return 'IN PASS';return `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor(s%3600/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`};
function make(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e}
async function get(url){const r=await fetch(url,{cache:'no-cache'});if(!r.ok)throw Error(`${url}: ${r.status}`);return r.json()}
function download(name,data,type){const u=URL.createObjectURL(new Blob([data],{type})),a=make('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000)}
function upcoming(){if(!orbital||Date.now()>new Date(orbital.valid_until_utc)||Date.now()<new Date(orbital.generated_utc)-300000)return [];return (orbital.passes||[]).filter(p=>new Date(p.los)>new Date())}
function renderArchive(){
 const q=$('search').value.trim().toLowerCase();$('captureGrid').replaceChildren();
 const captures=archive.captures.filter(c=>(archiveFilter==='all'||c.satellite===archiveFilter)&&(`${c.id} ${date(c.started_utc)} ${c.satellite}`).toLowerCase().includes(q));
 $('emptyArchive').hidden=!!captures.length;
 for(const c of captures){const card=make('button',undefined,'capture-card');card.type='button';card.setAttribute('aria-label',`Inspect Meteor ${c.satellite}, ${date(c.started_utc)}`);
 const thumb=make('div',undefined,'capture-thumb');if(c.featured){const img=make('img');img.src=c.featured.preview;img.alt=`Meteor ${c.satellite} partial satellite image`;img.loading='lazy';thumb.append(img)}thumb.append(make('span',c.outcome==='partial'?'PARTIAL CAPTURE':c.outcome==='frames'?'FRAMES ONLY':'NO FRAMES','tag amber'));
 const body=make('div',undefined,'capture-body');body.append(make('h3','METEOR '+c.satellite),make('div',date(c.started_utc,{hour:'2-digit',minute:'2-digit'})+' PHT','capture-date'));
 const metrics=make('div',undefined,'capture-meta');for(const [label,value] of [['DISTINCT CADUs',fmt.format(c.unique_frames)],['PEAK SNR',snr(c.peak_snr_db)],['PRODUCTS',c.images.length]]){const item=make('div');item.append(make('small',label),make('b',String(value)));metrics.append(item)}body.append(metrics,make('span','Inspect image & evidence ↗','capture-link'));card.append(thumb,body);card.addEventListener('click',()=>openCapture(c));$('captureGrid').append(card)}
}
function imageSelection(){
 const image=currentCapture.images[Number($('productSelect').value)];if(!image)return;
 $('detailImage').src=image.preview;$('imageLabel').textContent=`${image.label} · ${image.width} × ${image.height} px`;
 $('downloadImage').href=image.url;$('downloadImage').download=image.name;
 $('productHash').textContent='Original PNG SHA-256: '+image.sha256;
 const ix=$('compareSelect').value;$('compareFigure').hidden=ix==='';
 if(ix!==''){const c=currentCapture.images[Number(ix)];$('compareImage').src=c.preview;$('compareLabel').textContent=`${c.label} · ${c.width} × ${c.height} px`}
 if($('viewer').classList.contains('native')){$('detailImage').src=image.url;if(ix!=='')$('compareImage').src=currentCapture.images[Number(ix)].url}
}
function openCapture(c){
 currentCapture=c;$('dialogTitle').textContent=`METEOR ${c.satellite} · ${date(c.started_utc)}`;$('productSelect').replaceChildren();$('compareSelect').replaceChildren(new Option('No comparison',''));
 c.images.forEach((im,i)=>{$('productSelect').add(new Option(im.label,i));$('compareSelect').add(new Option(im.label,i))});
 $('productSelect').value=Math.max(0,c.images.findIndex(im=>im.name===c.featured?.name));
 $('viewer').classList.remove('native');$('zoomButton').textContent='View at native size';$('captureNotes').textContent=c.notes;
 $('detailMetrics').replaceChildren();
 for(const [label,value] of [['Distinct CADUs',fmt.format(c.unique_frames)],['Complete records',fmt.format(c.frames)],['Expected ASM',`${fmt.format(c.sync_frames)} / ${fmt.format(c.frames)}`],['Trailing bytes',String(c.trailing_bytes)],['Peak logged SNR',snr(c.peak_snr_db)],['Image variants',String(c.images.length)],['Reported size',c.size_matches_report?'Matches file':'MISMATCH'],['Georeferencing','Unverified']]){const e=make('div');e.append(make('small',label),make('strong',value));$('detailMetrics').append(e)}
 $('evidenceFiles').replaceChildren();for(const f of c.evidence){const e=make('div',undefined,'evidence-file'),a=make('a',`${f.name} · ${fmt.format(f.bytes)} bytes ↓`);a.href=f.url;a.download=f.name;e.append(a,make('code',f.sha256));$('evidenceFiles').append(e)}
 const cadu=c.evidence.find(f=>f.name.endsWith('.cadu'));$('downloadCadu').hidden=!cadu;if(cadu)$('downloadCadu').href=cadu.url;
 imageSelection();$('captureDialog').showModal();
}
function exportCalendar(p){const utc=v=>new Date(v).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');const value=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Team Magalona//SagapSat//EN','BEGIN:VEVENT',`UID:${utc(p.aos)}-${p.satellite}@sagapsat.local`,`DTSTAMP:${utc(new Date())}`,`DTSTART:${utc(p.aos)}`,`DTEND:${utc(p.los)}`,`SUMMARY:Meteor ${p.satellite} predicted pass`,`DESCRIPTION:Peak ${p.max_elevation} degrees. 10 degree horizon mask. Predicted geometry only. Recording is not automatically scheduled.`,'END:VEVENT','END:VCALENDAR'].join('\r\n');download(`meteor-${p.satellite}-${utc(p.aos)}.ics`,value,'text/calendar')}
function renderPasses(){
 const all=upcoming(),min=Number($('elevationFilter').value);$('passes').replaceChildren();
 for(const p of all.filter(p=>p.max_elevation>=min)){const row=make('tr');for(const text of ['METEOR '+p.satellite,date(p.aos),shortTime(p.aos),`${p.max_elevation.toFixed(1)}°`,shortTime(p.los),`${Math.floor(p.duration_seconds/60)}m ${p.duration_seconds%60}s`])row.append(make('td',text));const bar=make('span',undefined,'elevation-bar'),fill=make('i');fill.style.width=(p.max_elevation/90*100)+'%';bar.append(fill);row.children[3].append(bar);const cell=make('td'),button=make('button','↓ .ics','text-button');button.setAttribute('aria-label',`Add Meteor ${p.satellite} pass ${date(p.aos)} ${shortTime(p.aos)} to calendar`);button.onclick=()=>exportCalendar(p);cell.append(button);row.append(cell);$('passes').append(row)}
 if(!$('passes').children.length){const td=make('td','No upcoming passes available at this filter. Orbital data may need refreshing.');td.colSpan=7;const tr=make('tr');tr.append(td);$('passes').append(tr)}
}
function sample(sat,instant){if(!sat)return null;const n=(instant-new Date(sat.start_utc))/1000/sat.step_seconds;if(n<0||n>=sat.points.length-1)return null;const i=Math.floor(n),f=n-i,a=sat.points[i],b=sat.points[i+1];return a.map((v,j)=>{let d=b[j]-v;if(j===1||j===4){if(d>180)d-=360;if(d< -180)d+=360}let x=v+d*f;if(j===1)x=((x+540)%360)-180;if(j===4)x=(x+360)%360;return x})}
function canvas(id){const c=$(id),r=c.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);c.width=r.width*dpr;c.height=r.height*dpr;const x=c.getContext('2d');x.scale(dpr,dpr);return {x,w:r.width,h:r.height}}
function drawMap(){
 const {x,w,h}=canvas('map');x.fillStyle='#0b171d';x.fillRect(0,0,w,h);const project=(lat,lon)=>[(lon+180)/360*w,(90-lat)/180*h];
 x.strokeStyle='#1b3039';x.lineWidth=.5;for(let lon=-180;lon<=180;lon+=30){const px=project(0,lon)[0];x.beginPath();x.moveTo(px,0);x.lineTo(px,h);x.stroke()}for(let lat=-60;lat<=60;lat+=30){const py=project(lat,0)[1];x.beginPath();x.moveTo(0,py);x.lineTo(w,py);x.stroke()}
 x.fillStyle='#1b3034';x.strokeStyle='#365056';x.lineWidth=.6;
 for(const ring of coastline||[]){x.beginPath();ring.forEach(([lon,lat],i)=>{const [px,py]=project(lat,lon);i?x.lineTo(px,py):x.moveTo(px,py)});x.closePath();x.fill();x.stroke()}
 const sat=orbital?.satellites.find(s=>s.name===selectedSatellite),now=Date.now(),point=sample(sat,now);
 if(point){x.strokeStyle='#b8edab';x.lineWidth=1.3;x.setLineDash([4,4]);x.beginPath();let last;for(let t=now-2700000;t<=now+2700000;t+=30000){const p=sample(sat,t);if(!p){last=null;continue}const xy=project(p[0],p[1]);if(!last||Math.abs(xy[0]-last[0])>w/2)x.moveTo(...xy);else x.lineTo(...xy);last=xy}x.stroke();x.setLineDash([]);const xy=project(point[0],point[1]);x.fillStyle='#b8edab';x.beginPath();x.arc(...xy,4,0,Math.PI*2);x.fill();x.strokeStyle='#b8edab55';x.beginPath();x.arc(...xy,10,0,Math.PI*2);x.stroke();x.fillStyle='#d9ebd8';x.font='9px system-ui';x.fillText(selectedSatellite,Math.min(w-38,xy[0]+10),Math.max(30,xy[1]-8));$('position').textContent=`${point[0].toFixed(2)}° / ${point[1].toFixed(2)}°`;$('altitude').textContent=fmt.format(Math.round(point[2]))+' km';$('azel').textContent=`${point[4].toFixed(1)}° / ${point[3].toFixed(1)}°`}
 else{for(const id of ['position','altitude','azel'])$(id).textContent='Unavailable'}
 if(orbital){const xy=project(orbital.station.latitude,orbital.station.longitude);x.fillStyle='#e9c28c';x.beginPath();x.arc(...xy,3,0,Math.PI*2);x.fill();x.font='8px system-ui';x.fillText('PH STATION',Math.max(4,Math.min(w-65,xy[0]-23)),xy[1]+14)}
 $('tleInfo').textContent=sat?`NORAD ${sat.norad} · TLE epoch ${date(sat.epoch,{hour:'2-digit',minute:'2-digit'})} PHT · ${Math.abs((Date.now()-new Date(sat.epoch))/86400000).toFixed(1)} days from epoch. SGP4 geometry; no RF status.`:'No valid orbital elements. Refresh the build with network access.';
}
function drawSky(){const {x,w,h}=canvas('skyplot');x.clearRect(0,0,w,h);const p=currentPass;if(!p)return;const sat=orbital.satellites.find(s=>s.name===p.satellite);const start=+new Date(p.aos),end=+new Date(p.los);x.strokeStyle='#2c4045';x.lineWidth=1;x.beginPath();x.moveTo(18,h-18);x.lineTo(w-12,h-18);x.stroke();x.fillStyle='#91a7a7';x.font='8px system-ui';x.fillText('90°',0,12);x.fillText('10°',0,h-15);x.strokeStyle='#b8edab';x.lineWidth=1.6;x.beginPath();for(let i=0;i<=80;i++){const point=sample(sat,start+(end-start)*i/80);if(!point)continue;const px=22+i*(w-38)/80,py=h-18-(point[3]-10)/80*(h-30);i?x.lineTo(px,py):x.moveTo(px,py)}x.stroke();x.fillStyle='#b8edab';x.fillText(`${p.max_elevation.toFixed(1)}° MAX`,w/2-20,14)}
function tick(){
 $('clock').textContent=time(new Date())+' PHT';const available=upcoming(),first=available[0];$('nextCountdown').textContent=first?countdown(first.aos):'—';$('nextSummary').textContent=first?`Meteor ${first.satellite} · ${first.max_elevation.toFixed(1)}° peak`:'Refresh orbital predictions';
 currentPass=available.find(p=>p.satellite===selectedSatellite);$('calendar').disabled=!currentPass;
 if(currentPass){$('passSatellite').textContent='METEOR '+currentPass.satellite;$('passCountdown').textContent=countdown(currentPass.aos);$('passDate').textContent=date(currentPass.aos)+' · Philippine time';$('passAos').textContent=shortTime(currentPass.aos);$('passPeak').textContent=shortTime(currentPass.peak);$('passLos').textContent=shortTime(currentPass.los);$('passNote').textContent=`${currentPass.max_elevation.toFixed(1)}° maximum elevation · ${Math.floor(currentPass.duration_seconds/60)}m ${currentPass.duration_seconds%60}s above 10°. Verify the active downlink before recording.`}
 else{$('passSatellite').textContent='METEOR '+selectedSatellite;$('passCountdown').textContent='Unavailable';$('passDate').textContent='No upcoming prediction in this snapshot';for(const id of ['passAos','passPeak','passLos'])$(id).textContent='—'}
 if(orbital){const age=(Date.now()-new Date(orbital.generated_utc))/3600000,expired=Date.now()>new Date(orbital.valid_until_utc);$('orbitState').textContent=expired?'PREDICTIONS EXPIRED':orbital.satellites.length?`COMPUTED TRACKING · ${age.toFixed(1)}H SNAPSHOT`:'ORBIT DATA UNAVAILABLE';if(expired)$('passNote').textContent='Orbital snapshot expired. Rebuild to refresh predictions.'}
 drawMap();drawSky();
}
async function stationPoll(){
 try{const state=await get('station.json');const fresh=state.connected&&state.sampled_utc&&Math.abs(Date.now()-new Date(state.sampled_utc))<30000;
 $('stationState').textContent=fresh?'STATION CHECKED':'ARCHIVE MODE';
 $('probeStatus').textContent=fresh?(state.sdr_present?'SDR detected':'SDR not detected'):'Not connected';
 $('probeHealth').hidden=!fresh;
 if(fresh){$('probeHealth').textContent=`${state.free_gb} GB free · ${state.temperature||'Temperature unavailable'} · ${state.throttled||'Power status unavailable'} · Checked ${time(state.sampled_utc)} PHT`;
 $('probeNote').textContent=state.frames_growing?'CADU file growth observed in the latest 10-second probe interval. Archive below contains finalized captures only.':`Read-only check: ${state.satdump_running?'SatDump process running':'No SatDump process detected'}. No current CADU growth observed; process presence alone does not confirm reception.`;
 }else{$('probeNote').textContent=state.message||'Live station status unavailable. Saved observations remain available.'}
 }catch(e){$('stationState').textContent='ARCHIVE MODE';$('probeStatus').textContent='Unavailable';$('probeHealth').hidden=true;$('probeNote').textContent='Live hardware status is unavailable. Archived captures remain accessible.'}
}
async function init(){
 try{archive=await get('archive.json');$('captureCount').textContent=String(archive.captures.length).padStart(2,'0');$('totalFrames').textContent=fmt.format(archive.captures.reduce((s,c)=>s+c.unique_frames,0));const snrs=archive.captures.map(c=>c.peak_snr_db).filter(Number.isFinite);$('bestSnr').textContent=snrs.length?snr(Math.max(...snrs)):'Not logged';$('policy').textContent=archive.policy;$('updated').textContent='Archive built '+date(archive.generated_utc,{hour:'2-digit',minute:'2-digit'})+' PHT';
 const feature=[...archive.captures].filter(c=>c.featured).sort((a,b)=>b.unique_frames-a.unique_frames)[0];if(feature){$('featureImage').src=feature.featured.preview;$('featureImage').alt=`Original Meteor ${feature.satellite} false-colour image, with visible missing scans`;$('featureSat').textContent='METEOR '+feature.satellite;$('featureTime').textContent=date(feature.started_utc,{hour:'2-digit',minute:'2-digit'})+' PHT · '+fmt.format(feature.unique_frames)+' distinct CADUs';$('featureOpen').onclick=$('featureDetails').onclick=()=>openCapture(feature)}renderArchive();
 }catch(e){$('error').hidden=false;$('error').textContent='Archive unavailable: '+e.message}
 try{orbital=await get('orbits.json');if(orbital.errors.length){$('error').hidden=false;$('error').textContent='Orbit data: '+orbital.errors.join('; ')}renderPasses()}catch(e){$('orbitState').textContent='ORBIT DATA UNAVAILABLE';$('tleInfo').textContent=e.message}
 try{coastline=await get('coastline.json')}catch(e){$('error').hidden=false;$('error').textContent+=' Basemap unavailable; orbit coordinates are still shown.'}
 tick();stationPoll();setInterval(stationPoll,10000);setInterval(tick,1000);setInterval(renderPasses,60000);setInterval(async()=>{try{orbital=await get('orbits.json');renderPasses();tick()}catch(e){$('orbitState').textContent='ORBIT REFRESH UNAVAILABLE'}},900000);
}
$('satTabs').addEventListener('click',e=>{const b=e.target.closest('button[data-sat]');if(!b)return;selectedSatellite=b.dataset.sat;for(const button of $('satTabs').children)button.classList.toggle('selected',button===b);tick()});
$('archiveTabs').addEventListener('click',e=>{const b=e.target.closest('button[data-filter]');if(!b)return;archiveFilter=b.dataset.filter;for(const button of $('archiveTabs').children)button.classList.toggle('selected',button===b);renderArchive()});
$('search').addEventListener('input',()=>archive&&renderArchive());$('elevationFilter').addEventListener('change',renderPasses);$('calendar').onclick=()=>currentPass&&exportCalendar(currentPass);
$('closeDialog').onclick=()=>$('captureDialog').close();$('captureDialog').addEventListener('click',e=>{if(e.target===$('captureDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});
$('productSelect').onchange=$('compareSelect').onchange=imageSelection;$('zoomButton').onclick=()=>{const native=$('viewer').classList.toggle('native');$('zoomButton').textContent=native?'Fit to viewer':'View at native size';imageSelection()};
$('exportCsv').onclick=()=>{if(!archive)return;const rows=[['capture','satellite','started_utc','finished_utc','outcome','cadu_bytes','records','distinct_records','expected_asm','trailing_bytes','peak_logged_snr_db','image_variants','georeferencing'],...archive.captures.map(c=>[c.id,c.satellite,c.started_utc,c.finished_utc,c.outcome,c.cadu_bytes,c.frames,c.unique_frames,c.sync_frames,c.trailing_bytes,c.peak_snr_db,c.images.length,c.georeferencing])];download('sagapsat-capture-index.csv',rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n'),'text/csv')};
window.addEventListener('resize',()=>{drawMap();drawSky()});
const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){for(const a of document.querySelectorAll('nav a')){const active=a.hash==='#'+entry.target.id;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')}}},{rootMargin:'-10% 0px -60% 0px'});document.querySelectorAll('main>section').forEach(s=>observer.observe(s));init();
