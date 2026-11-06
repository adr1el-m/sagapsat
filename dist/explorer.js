'use strict';
let selectedCoverage=null,zoomScale=1;
function qualityChart(capture){
 const c=$('qualityChart');if(!c)return;const samples=capture.timeline?.samples||[];const {x,w,h}=canvas('qualityChart');x.clearRect(0,0,w,h);
 if(!samples.length){$('qualitySummary').textContent='No capture-local time series is available for this observation.';return;}
 const times=samples.map(s=>+new Date(s.time)),first=Math.min(...times),last=Math.max(...times),span=Math.max(1,last-first);const xx=t=>38+(t-first)/span*(w-55);
 x.font='9px system-ui';x.fillStyle='#9daeb4';x.strokeStyle='#29383d';
 for(let n=0;n<=3;n++){let y=20+n*(h-54)/3;x.beginPath();x.moveTo(35,y);x.lineTo(w-10,y);x.stroke();x.fillText((20-n*20/3).toFixed(0)+'dB',0,y+3);}
 const maxFrames=Math.max(1,...samples.map(s=>s.frames||0));
 for(const [key,color,scale] of [['snr_db','#b8edab',20],['frames','#83bde5',maxFrames]]){x.strokeStyle=color;x.lineWidth=1.5;x.beginPath();let previous=null;for(const s of samples){if(!Number.isFinite(s[key]))continue;const t=+new Date(s.time),px=xx(t),py=h-34-Math.min(1,Math.max(0,s[key]/scale))*(h-54);if(previous!==null&&t-previous<45000)x.lineTo(px,py);else x.moveTo(px,py);previous=t;}x.stroke();}
 for(const s of samples)if(s.frame_lock===false){x.fillStyle='#e9c28c';x.fillRect(xx(+new Date(s.time)),h-25,2,5);}
 x.fillStyle='#9daeb4';x.fillText(shortTime(new Date(first))+' PHT',35,h-5);x.fillText(shortTime(new Date(last))+' PHT',w-78,h-5);
 const t=capture.timeline;$('qualitySummary').textContent=`${samples.length} logged samples · ${t.locked_samples}/${t.lock_samples} decoder lock samples synchronized. Green: estimated SNR. Blue: saved frames (own scale, max ${maxFrames}). Amber ticks: sampled loss of lock. Gaps are unobserved.`;
}
function productHelp(image){if(!image)return '';const name=image.name.toLowerCase();if(name.includes('221'))return 'False colour combines satellite channels to distinguish scene features. Colours do not represent a natural-colour photograph or rainfall measurement.';if(name.includes('mcir'))return 'MCIR is an infrared-based display product. Interpretation requires channel calibration and valid scan timing.';if(name.includes('msa'))return 'MSA is a processed channel composite; it is another view of this same capture, not an additional observation.';if(name.includes('msu-mr-'))return 'Single-channel grayscale data. Brightness depends on channel and processing; dark areas can include missing data.';return 'Processed MSU-MR image variant from the same received data. View the original PNG and capture notes for provenance.';}
function coverageMap(){
 if(!$('coverageMap')||!archive)return;const capture=archive.captures.find(c=>c.id===$('coverageSelect').value)||archive.captures[0];if(!capture)return;selectedCoverage=capture;
 const {x,w,h}=canvas('coverageMap'),project=(lon,lat)=>[(lon-105)/35*w,(30-lat)/35*h];x.fillStyle='#0b171d';x.fillRect(0,0,w,h);x.strokeStyle='#29444d';x.fillStyle='#1b3034';x.lineWidth=.7;
 for(const ring of coastline||[]){x.beginPath();ring.forEach(([lon,lat],i)=>{const p=project(lon,lat);i?x.lineTo(...p):x.moveTo(...p)});x.closePath();x.fill();x.stroke();}
 const info=capture.coverage||{};if(info.status==='timing_verified'&&info.track?.length){x.strokeStyle='#b8edab';x.lineWidth=2;x.beginPath();info.track.forEach(([lon,lat],i)=>{const p=project(lon,lat);i?x.lineTo(...p):x.moveTo(...p)});x.stroke();for(const [lon,lat] of [info.track[0],info.track.at(-1)]){x.beginPath();x.arc(...project(lon,lat),3,0,Math.PI*2);x.fillStyle='#b8edab';x.fill();}}
 const p=project(121,14.6);x.strokeStyle='#e9c28c';x.beginPath();x.arc(...p,7,0,Math.PI*2);x.stroke();x.fillStyle='#e9c28c';x.font='10px system-ui';x.fillText('Approx. station region',Math.min(w-155,p[0]+10),p[1]);
 $('coverageStatus').textContent=info.status==='timing_verified'?'SCAN TIMING VERIFIED':'PLACEMENT WITHHELD';$('coverageExplanation').textContent=info.reason||'Scan-time metadata has not been validated. Geographic placement is withheld.';
 $('coverageWindow').textContent=info.scan_start_utc?`Embedded scan interval: ${date(info.scan_start_utc,{hour:'2-digit',minute:'2-digit',second:'2-digit'})} – ${time(info.scan_end_utc)} PHT. Image georeferencing: ${info.georeferencing||'unverified'}.`:'No validated scan interval.';
}
function refreshCoverage(){const select=$('coverageSelect');if(!select||!archive)return;const old=select.value;select.replaceChildren();for(const c of archive.captures)select.add(new Option(`Meteor ${c.satellite} · ${date(c.started_utc,{hour:'2-digit',minute:'2-digit'})}`,c.id));if(archive.captures.some(c=>c.id===old))select.value=old;coverageMap();}
function applyZoom(){const viewer=$('viewer');viewer.style.setProperty('--zoom',zoomScale);for(const img of [$('detailImage'),$('compareImage')]){img.style.transform=`scale(${zoomScale})`;img.style.transformOrigin='top left';}viewer.classList.toggle('zoomed',zoomScale!==1);$('zoomLevel').textContent=Math.round(zoomScale*100)+'%';}
function explorerInit(){
 $('coverageSelect').addEventListener('change',coverageMap);
 $('zoomIn').onclick=()=>{zoomScale=Math.min(4,zoomScale+.25);applyZoom()};$('zoomOut').onclick=()=>{zoomScale=Math.max(.5,zoomScale-.25);applyZoom()};$('zoomReset').onclick=()=>{zoomScale=1;applyZoom()};
 const figures=$('viewer').querySelectorAll('figure');let syncing=false;for(const f of figures)f.addEventListener('scroll',()=>{if(syncing||!$('syncViews').checked)return;syncing=true;for(const other of figures)if(other!==f){other.scrollLeft=f.scrollLeft/Math.max(1,f.scrollWidth-f.clientWidth)*Math.max(0,other.scrollWidth-other.clientWidth);other.scrollTop=f.scrollTop/Math.max(1,f.scrollHeight-f.clientHeight)*Math.max(0,other.scrollHeight-other.clientHeight);}requestAnimationFrame(()=>syncing=false)});
 let drag=null;for(const f of figures){f.addEventListener('pointerdown',e=>{if(e.button!==0||zoomScale<=1&&!$('viewer').classList.contains('native'))return;drag={f,x:e.clientX,y:e.clientY,left:f.scrollLeft,top:f.scrollTop};f.setPointerCapture(e.pointerId)});f.addEventListener('pointermove',e=>{if(drag?.f===f){f.scrollLeft=drag.left+drag.x-e.clientX;f.scrollTop=drag.top+drag.y-e.clientY;}});f.addEventListener('pointerup',()=>drag=null);f.addEventListener('pointercancel',()=>drag=null);}
 $('copyCaptureLink').onclick=async()=>{const url=new URL(location.href);url.hash='capture='+encodeURIComponent(currentCapture.id);try{await navigator.clipboard.writeText(url.href);$('copyCaptureLink').textContent='Link copied'}catch{$('copyCaptureLink').textContent=url.href}};
 window.addEventListener('resize',()=>{coverageMap();if(currentCapture)qualityChart(currentCapture)});
}
explorerInit();

if(typeof archive!=='undefined'&&archive)refreshCoverage();
