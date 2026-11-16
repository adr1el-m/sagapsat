'use strict';
const $=id=>document.getElementById(id), fmt=new Intl.NumberFormat('en-PH');
let archive,orbital,coastline,selectedSatellite='M2-3',archiveFilter='all',currentCapture,currentPass,inspectedPass,highestPass,captureReturnHash;
const date=(v,options={})=>v?new Date(v).toLocaleString('en-PH',{timeZone:'Asia/Manila',day:'2-digit',month:'short',year:'numeric',...options}):'Not recorded';
const time=v=>v?new Date(v).toLocaleTimeString('en-PH',{timeZone:'Asia/Manila',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}):'—';
const shortTime=v=>v?new Date(v).toLocaleTimeString('en-PH',{timeZone:'Asia/Manila',hour:'numeric',minute:'2-digit',hour12:true}):'—';
const snr=v=>Number.isFinite(v)?v.toFixed(2)+' dB':'Not logged';
const countdown=v=>{const s=Math.floor((new Date(v)-Date.now())/1000);if(s<=0)return 'Above horizon';return `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor(s%3600/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`};
function make(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e}
function captureThumbnail(c){
 if(c.thumbnail===undefined)return c.featured;
 return c.images.find(image=>image.name===c.thumbnail);
}
const local=location.port==='8088'||['localhost','127.0.0.1','[::1]'].includes(location.hostname)||location.hostname.endsWith('.local');
async function get(url){const kind=/^(station|archive|orbits)\.json$/.exec(url)?.[1];if(kind&&!local){try{const r=await fetch('/api/feed?kind='+kind,{cache:'no-cache',signal:AbortSignal.timeout(12000)});if(r.ok)return await r.json()}catch{}}const r=await fetch(url,{cache:'no-cache'});if(!r.ok)throw Error(`${url}: ${r.status}`);return r.json()}
function download(name,data,type){const u=URL.createObjectURL(new Blob([data],{type})),a=make('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000)}
function upcoming(){if(!orbital||Date.now()>new Date(orbital.valid_until_utc)||Date.now()<new Date(orbital.generated_utc)-300000)return [];return (orbital.passes||[]).filter(p=>new Date(p.los)>new Date())}
const recordingElevation=40;
let passDaySignature;
function renderPassDay(now){
 const today=date(now);
 const captures=(archive?.captures||[]).filter(c=>date(c.started_utc)===today);
 const predictions=orbital&&Date.parse(orbital.valid_until_utc)>now;
 const passes=predictions?(orbital.passes||[]).filter(p=>p.max_elevation>=recordingElevation&&date(p.peak)===today):[];
 const unmatched=new Set(captures);
 const entries=passes.map(pass=>{
  const capture=captures.find(c=>c.satellite===pass.satellite&&
   Date.parse(c.started_utc)>=Date.parse(pass.aos)-120000&&Date.parse(c.started_utc)<=Date.parse(pass.los)+120000);
  if(capture)unmatched.delete(capture);
  const status=capture?'Published':now>=Date.parse(pass.los)?(archive?'No capture published':'Archive unavailable'):now>=Date.parse(pass.aos)?'Above horizon':'Upcoming';
  return {time:pass.peak,satellite:pass.satellite,elevation:pass.max_elevation,status,capture};
 });
 for(const capture of unmatched){
  entries.push({time:capture.started_utc,satellite:capture.satellite,status:'Published',capture});
 }
 entries.sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
 const signature=JSON.stringify([today,Boolean(predictions),entries.map(({capture,...entry})=>[entry,capture?.id])]);
 if(signature===passDaySignature)return;
 passDaySignature=signature;
 $('passDayList').replaceChildren(...entries.map(entry=>{
  const row=make('li',undefined,'pass-day-entry');
  const published=entry.status==='Published';
  const status=make(published?'button':'span',entry.status,'pass-day-status');
  if(published){
   status.type='button';
   status.setAttribute('aria-label','Open published Meteor '+entry.satellite+' capture at '+shortTime(entry.time));
   status.onclick=()=>openCapture(entry.capture);
  }
  row.dataset.status=entry.status;
  const timing=make('span',time(entry.time)+(entry.elevation===undefined?' · recorded':' · peak'));
  const satellite=make('strong','Meteor '+entry.satellite);
  const elevation=make('span',entry.elevation===undefined?'':entry.elevation.toFixed(1)+'°');
  row.append(timing,satellite,elevation,status);
  return row;
 }));
 $('passDayNote').textContent=predictions
  ?entries.length?'Earlier passes appear when the orbital snapshot includes them or a capture was published.':'No qualifying passes or archive entries in the current feeds.'
  :'Fresh predictions are unavailable. Published captures can still appear here.';
}
function renderSummary(){
 $('policy').textContent=archive.policy;
 $('updated').textContent='Archive updated '+date(archive.generated_utc,{hour:'numeric',minute:'2-digit',hour12:true})+' PHT';
 renderReception();
}
let stationSample, previewKey, displayedPreview;
function renderReception(){
 const now=Date.now();
 const state=stationSample;
 const age=now-Date.parse(state?.sampled_utc);
 const online=state?.connected&&age>=-10000&&age<360000;
 const active=online&&state.satdump_running&&age<90000;
 const receiving=active&&(state.frames_growing||state.phase==='receiving');
 const preview=receiving&&state.preview;
 const previewAge=now-Date.parse(preview?.received_utc);
 const key=preview?.webp&&previewAge>=-10000&&previewAge<110000?
   preview.received_utc+':'+preview.frames:null;
 const live=$('liveImage');
 if(key!==previewKey){
  previewKey=key;
  if(!key){
   displayedPreview=null;
   live.removeAttribute('src');
  }else{
   const image=new Image();
   image.src='data:image/webp;base64,'+preview.webp;
   image.decode().then(()=>{
    if(previewKey!==key)return;
    displayedPreview=preview;
    live.src=image.src;
    renderReception();
   }).catch(()=>{});
  }
 }
 const showingLive=displayedPreview&&now-Date.parse(displayedPreview.received_utc)<110000;
 const feature=archive?.captures.find(captureThumbnail);
 const thumbnail=feature&&captureThumbnail(feature);
 const showArchive=feature&&!showingLive;
 live.hidden=!showingLive;
 $('featureImage').hidden=!showArchive;
 $('imagePlaceholder').hidden=Boolean(showingLive||showArchive);
 const label=showingLive?'Live preview':showArchive?'Archived capture':active?'Waiting for image':archive?'No image':'Loading archive';
 if($('imageState').textContent!==label)$('imageState').textContent=label;
 $('imageState').classList.toggle('is-live',Boolean(showingLive));
 $('imagePlaceholder').textContent=active?'The image will appear as SatDump decodes enough scan lines.':archive?'No archived image is available.':'Loading the latest archived image…';
 $('featureDetails').hidden=!showArchive;
 if(showingLive){
  $('featureSat').textContent='MSU-MR · Channel '+displayedPreview.channel;
  $('featureTime').textContent='Updated '+shortTime(displayedPreview.received_utc)+' PHT · Incomplete scan';
 }else if(showArchive){
  if($('featureImage').getAttribute('src')!==thumbnail.preview)$('featureImage').src=thumbnail.preview;
  $('featureImage').alt='Archived Meteor '+feature.satellite+' satellite image';
  $('featureSat').textContent='Meteor '+feature.satellite;
  $('featureTime').textContent=date(feature.started_utc,{hour:'numeric',minute:'2-digit',hour12:true})+' PHT · '+fmt.format(feature.unique_frames)+' distinct CADUs';
  $('featureDetails').onclick=()=>openCapture(feature);
 }else{
  $('featureSat').textContent=active?'Meteor LRPT':'—';
  $('featureTime').textContent=active?'Waiting for a decodable image':'';
 }
 const mode=!online?'Unavailable':receiving?'Receiving':active&&state.phase==='processing'?'Processing':active?'Listening':'Standby';
 const stationLabel=!state?'Connecting':!online?'Station telemetry unavailable':mode;
 if($('stationState').textContent!==stationLabel)$('stationState').textContent=stationLabel;
 $('stationState').classList.toggle('is-live',Boolean(receiving));
 $('stationState').classList.toggle('is-stale',Boolean(state&&!online));
 $('receiverReadings').hidden=!online;
 $('livePhase').textContent=mode;
 $('liveFrames').textContent=receiving&&Number.isSafeInteger(state.frames)?fmt.format(state.frames):'—';
 const rfFresh=active&&Math.abs(now-Date.parse(state.telemetry_utc))<90000;
 $('liveSnr').textContent=rfFresh&&Number.isFinite(state.snr_db)?snr(state.snr_db):'—';
 $('liveLock').textContent=rfFresh&&typeof state.frame_lock==='boolean'?(state.frame_lock?'Locked':'Searching'):'—';
 $('probeStatus').textContent=online?(state.sdr_present?'SDR detected':'SDR unavailable'):state?'No recent telemetry':'Connecting';
 const lastContact=Number.isFinite(age)?date(state.sampled_utc,{hour:'numeric',minute:'2-digit',hour12:true})+' PHT':null;
 $('probeNote').textContent=online?'Last station update '+lastContact:
  lastContact?'Last heard '+lastContact+'. Recording status is unknown.':
  state?'Waiting for the first station update.':'Connecting to the station…';
}
function updateArchive(data){
 archive=data;
 renderSummary();
 if(typeof refreshCoverage==='function')refreshCoverage();
 $('exportCsv').disabled=false;
 renderArchive();
}
function renderArchive(){
 if(!archive)return;
 const query=$('search').value.trim().toLowerCase();
 const captures=archive.captures.filter(capture=>{
  const terms=[capture.id,'Meteor '+capture.satellite,date(capture.started_utc),
   date(capture.started_utc,{day:'numeric'}),date(capture.started_utc,{day:'numeric',month:'long'})];
  return (archiveFilter==='all'||capture.satellite===archiveFilter)&&terms.some(term=>term.toLowerCase().includes(query));
 });
 $('archiveStatus').textContent=`${fmt.format(captures.length)} ${captures.length===1?'reception':'receptions'}${captures.length>1?' · Newest first':''}`;
 $('emptyArchive').textContent=archive.captures.length?'No captures match. Try another satellite or date.':'No receptions have been published yet.';
 $('emptyArchive').hidden=captures.length>0;
 const grid=$('captureGrid');
 grid.classList.toggle('has-feature',archiveFilter==='all'&&!query&&captures.length>=3&&Boolean(captureThumbnail(captures[0])));
 grid.replaceChildren(...captures.map(captureCard));
}
function captureCard(capture,index){
 const card=make('button',undefined,'capture-card');
 card.type='button';
 const captureDate=date(capture.started_utc,{hour:'numeric',minute:'2-digit',hour12:true})+' PHT';
 card.setAttribute('aria-label',`Open Meteor ${capture.satellite} capture, ${captureDate}`);
 const thumb=make('span',undefined,'capture-thumb');
 const thumbnail=captureThumbnail(capture);
 if(thumbnail){
  const image=make('img');
  image.alt='';
  image.loading=index<3?'eager':'lazy';
  image.decoding='async';
  if(index===0)image.fetchPriority='high';
  image.src=thumbnail.preview;
  thumb.append(image);
  if(thumbnail.width>thumbnail.height*8){
   thumb.classList.add('capture-fragment');
   thumb.append(make('span','Short scan fragment','capture-preview-note'));
  }
 }else{
  thumb.append(make('span',capture.images.length?'Preview unavailable':'No image received','capture-preview-note'));
 }
 const heading=make('span',undefined,'capture-title');
 heading.append(make('span','Meteor '+capture.satellite),make('span','↗','capture-arrow'));
 heading.lastElementChild.setAttribute('aria-hidden','true');
 const outcome=capture.outcome==='partial'?'Partial image':capture.outcome==='frames'?'Frames only':'No frames';
 const body=make('span',undefined,'capture-body');
 body.append(heading,make('span',captureDate,'capture-date'));
 const metrics=make('span',undefined,'capture-meta');
 metrics.append(make('span',outcome,'capture-outcome'),make('span',fmt.format(capture.unique_frames)+' CADUs'));
 body.append(metrics);
 if(index===0){
  body.prepend(make('span','Latest reception','capture-latest'));
  body.append(make('span','Open capture ↗','capture-action'));
 }
 card.append(thumb,body);
 card.onclick=()=>openCapture(capture);
 return card;
}
function imageSelection(){
 const image=currentCapture.images[Number($('productSelect').value)];if(!image)return;
 $('detailImage').src=image.preview;if(typeof productHelp==='function')$('productHelp').textContent=productHelp(image);$('imageLabel').textContent=`${image.label} · ${image.width} × ${image.height} px`;
 $('downloadImage').href=image.url;$('downloadImage').download=image.name;
 $('productHash').textContent='Original PNG SHA-256: '+image.sha256;
 const ix=$('compareSelect').value;$('compareFigure').hidden=ix==='';
 if(ix!==''){const c=currentCapture.images[Number(ix)];$('compareImage').src=c.preview;$('compareLabel').textContent=`${c.label} · ${c.width} × ${c.height} px`}
 if($('viewer').classList.contains('native')){$('detailImage').src=image.url;if(ix!=='')$('compareImage').src=currentCapture.images[Number(ix)].url}
}
function openCapture(c){
 captureReturnHash=location.hash.startsWith('#capture=')?'#archive':location.hash;
 currentCapture=c;$('dialogTitle').textContent=`Meteor ${c.satellite} · ${date(c.started_utc)}`;
 $('captureProducts').hidden=$('downloadImage').hidden=$('productHash').hidden=!c.images.length;$('productSelect').replaceChildren();$('compareSelect').replaceChildren(new Option('No comparison',''));
 c.images.forEach((im,i)=>{$('productSelect').add(new Option(im.label,i));$('compareSelect').add(new Option(im.label,i))});
 $('productSelect').value=Math.max(0,c.images.findIndex(im=>im.name===(captureThumbnail(c)||c.featured)?.name));
 $('viewer').classList.remove('native');$('zoomButton').textContent='View at native size';$('captureNotes').textContent=c.notes;
 $('detailMetrics').replaceChildren();
 for(const [label,value] of [['Distinct CADUs',fmt.format(c.unique_frames)],['Complete records',fmt.format(c.frames)],['Expected ASM',`${fmt.format(c.sync_frames)} / ${fmt.format(c.frames)}`],['Trailing bytes',String(c.trailing_bytes)],['Peak logged SNR',snr(c.peak_snr_db)],['Image variants',String(c.images.length)],['Reported size',c.size_matches_report?'Matches file':'MISMATCH'],['Georeferencing','Unverified']]){const e=make('div');e.append(make('small',label),make('strong',value));$('detailMetrics').append(e)}
 $('evidenceFiles').replaceChildren();for(const f of c.evidence){const e=make('div',undefined,'evidence-file'),a=make('a',`${f.name} · ${fmt.format(f.bytes)} bytes ↓`);a.href=f.url;a.download=f.name;e.append(a,make('code',f.sha256));if(f.original_sha256&&f.original_sha256!==f.sha256){e.append(make('p','Public log copy: exact station coordinates withheld.','micro'),make('code','Original SHA-256: '+f.original_sha256))}$('evidenceFiles').append(e)}
 const cadu=c.evidence.find(f=>f.name.endsWith('.cadu'));$('downloadCadu').hidden=!cadu;if(cadu)$('downloadCadu').href=cadu.url;
 imageSelection();$('captureDialog').showModal();if(typeof qualityChart==='function')qualityChart(c);if(typeof applyZoom==='function'){zoomScale=1;applyZoom()}$('copyCaptureLink').textContent='Copy capture link ↗';history.replaceState(null,'','#capture='+encodeURIComponent(c.id));
}
function exportCalendar(p){const utc=v=>new Date(v).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');const value=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SagapSat//Reception archive//EN','BEGIN:VEVENT',`UID:${utc(p.aos)}-${p.satellite}@sagapsat.local`,`DTSTAMP:${utc(new Date())}`,`DTSTART:${utc(p.aos)}`,`DTEND:${utc(p.los)}`,`SUMMARY:Meteor ${p.satellite} predicted pass`,`DESCRIPTION:Peak ${p.max_elevation} degrees. 10 degree horizon mask. Predicted geometry only. Recording is not automatically scheduled.`,'END:VEVENT','END:VCALENDAR'].join('\r\n');download(`meteor-${p.satellite}-${utc(p.aos)}.ics`,value,'text/calendar')}
function passKey(pass){
 return pass ? pass.satellite+'|'+pass.aos : null;
}
function selectSatellite(satellite){
 selectedSatellite=satellite;
 for(const button of $('satTabs').children){
  const selected=button.dataset.sat===satellite;
  button.classList.toggle('selected',selected);
  button.setAttribute('aria-pressed',String(selected));
 }
}
function inspectPass(pass){
 inspectedPass=passKey(pass);
 selectSatellite(pass.satellite);
 tick();
 $('passDetails').focus({preventScroll:true});
 $('passDetails').scrollIntoView({block:'center'});
}
function updatePassSelection(){
 for(const button of $('passes').querySelectorAll('[data-pass]')){
  button.setAttribute('aria-pressed',String(button.dataset.pass===passKey(currentPass)));
 }
}
function renderPasses(){
 const all=upcoming(),min=Number($('elevationFilter').value);
 highestPass=all.reduce((highest,pass)=>!highest||pass.max_elevation>highest.max_elevation?pass:highest,null);
 $('highestPass').disabled=!highestPass;
 $('passes').replaceChildren();
 for(const p of all.filter(p=>p.max_elevation>=min)){
  const row=make('tr');
  for(const text of ['METEOR '+p.satellite,date(p.aos),shortTime(p.aos),`${p.max_elevation.toFixed(1)}°`,shortTime(p.los),`${Math.floor(p.duration_seconds/60)}m ${p.duration_seconds%60}s`])row.append(make('td',text));
  const bar=make('span',undefined,'elevation-bar'),fill=make('i');
  fill.style.width=(p.max_elevation/90*100)+'%';
  bar.append(fill);row.children[3].append(bar);
  const cell=make('td',undefined,'pass-actions');
  const inspect=make('button','Inspect','text-button'), calendar=make('button','↓ .ics','text-button');
  const description=`Meteor ${p.satellite} pass ${date(p.aos)} ${shortTime(p.aos)}`;
  inspect.dataset.pass=passKey(p);
  inspect.setAttribute('aria-label','Inspect '+description);
  inspect.onclick=()=>inspectPass(p);
  calendar.setAttribute('aria-label','Add '+description+' to calendar');
  calendar.onclick=()=>exportCalendar(p);
  cell.append(inspect,calendar);row.append(cell);$('passes').append(row);
 }
 if(!$('passes').children.length){
  const td=make('td',all.length?'No upcoming passes meet this elevation filter.':'No upcoming passes in the current forecast.');
  td.colSpan=7;
  const row=make('tr');row.append(td);$('passes').append(row);
 }
 updatePassSelection();
}
function sample(sat,instant){if(!sat)return null;const n=(instant-new Date(sat.start_utc))/1000/sat.step_seconds;if(n<0||n>=sat.points.length-1)return null;const i=Math.floor(n),f=n-i,a=sat.points[i],b=sat.points[i+1];return a.map((v,j)=>{let d=b[j]-v;if(j===1||j===4){if(d>180)d-=360;if(d< -180)d+=360}let x=v+d*f;if(j===1)x=((x+540)%360)-180;if(j===4)x=(x+360)%360;return x})}
function canvas(id){const c=$(id),r=c.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);c.width=r.width*dpr;c.height=r.height*dpr;const x=c.getContext('2d');x.scale(dpr,dpr);return {x,w:r.width,h:r.height}}
function drawMap(){
 const {x,w,h}=canvas('map');x.fillStyle='#eef5fb';x.fillRect(0,0,w,h);const project=(lat,lon)=>[(lon+180)/360*w,(90-lat)/180*h];
 x.strokeStyle='#c9d9e9';x.lineWidth=.5;for(let lon=-180;lon<=180;lon+=30){const px=project(0,lon)[0];x.beginPath();x.moveTo(px,0);x.lineTo(px,h);x.stroke()}for(let lat=-60;lat<=60;lat+=30){const py=project(lat,0)[1];x.beginPath();x.moveTo(0,py);x.lineTo(w,py);x.stroke()}
 x.fillStyle='#dae5ee';x.strokeStyle='#91a9bf';x.lineWidth=.6;
 for(const ring of coastline||[]){x.beginPath();ring.forEach(([lon,lat],i)=>{const [px,py]=project(lat,lon);i?x.lineTo(px,py):x.moveTo(px,py)});x.closePath();x.fill();x.stroke()}
 const now=Date.now(),sat=now<Date.parse(orbital?.valid_until_utc)?orbital.satellites.find(s=>s.name===selectedSatellite):null,point=sample(sat,now);
 if(point){x.strokeStyle='#003a6c';x.lineWidth=1.3;x.setLineDash([4,4]);x.beginPath();let last;for(let t=now-2700000;t<=now+2700000;t+=30000){const p=sample(sat,t);if(!p){last=null;continue}const xy=project(p[0],p[1]);if(!last||Math.abs(xy[0]-last[0])>w/2)x.moveTo(...xy);else x.lineTo(...xy);last=xy}x.stroke();x.setLineDash([]);const xy=project(point[0],point[1]);x.fillStyle='#003a6c';x.beginPath();x.arc(...xy,4,0,Math.PI*2);x.fill();x.strokeStyle='#003a6c66';x.beginPath();x.arc(...xy,10,0,Math.PI*2);x.stroke();x.fillStyle='#003a6c';x.font='9px system-ui';x.fillText(selectedSatellite,Math.min(w-38,xy[0]+10),Math.max(30,xy[1]-8));$('position').textContent=`${point[0].toFixed(2)}° / ${point[1].toFixed(2)}°`;$('altitude').textContent=fmt.format(Math.round(point[2]))+' km';$('azel').textContent=`${point[4].toFixed(1)}° / ${point[3].toFixed(1)}°`}
 else{for(const id of ['position','altitude','azel'])$(id).textContent='Unavailable'}
 if(orbital){const xy=project(orbital.station.latitude,orbital.station.longitude);x.fillStyle='#8a5010';x.beginPath();x.arc(...xy,3,0,Math.PI*2);x.fill();x.font='8px system-ui';x.fillText('PH STATION',Math.max(4,Math.min(w-65,xy[0]-23)),xy[1]+14)}
 $('tleInfo').textContent=sat?`NORAD ${sat.norad} · TLE epoch ${date(sat.epoch,{hour:'2-digit',minute:'2-digit'})} PHT · ${Math.abs((Date.now()-new Date(sat.epoch))/86400000).toFixed(1)} days from epoch. SGP4 geometry; no RF status.`:'Waiting for a fresh orbital snapshot.';
}
function drawSky(){const {x,w,h}=canvas('skyplot');x.clearRect(0,0,w,h);const p=currentPass;if(!p)return;const sat=orbital.satellites.find(s=>s.name===p.satellite);const start=+new Date(p.aos),end=+new Date(p.los);x.strokeStyle='#c9d9e9';x.lineWidth=1;x.beginPath();x.moveTo(18,h-18);x.lineTo(w-12,h-18);x.stroke();x.fillStyle='#52647b';x.font='8px system-ui';x.fillText('90°',0,12);x.fillText('10°',0,h-15);x.strokeStyle='#003a6c';x.lineWidth=1.6;x.beginPath();for(let i=0;i<=80;i++){const point=sample(sat,start+(end-start)*i/80);if(!point)continue;const px=22+i*(w-38)/80,py=h-18-(point[3]-10)/80*(h-30);i?x.lineTo(px,py):x.moveTo(px,py)}x.stroke();x.fillStyle='#003a6c';x.fillText(`${p.max_elevation.toFixed(1)}° MAX`,w/2-20,14)}
function tick(){
 $('clock').textContent=time(new Date())+' PHT';const available=upcoming(),first=available.find(p=>p.max_elevation>=recordingElevation);$('nextPassLabel').textContent=first&&Date.parse(first.aos)<=Date.now()?'Predicted pass in progress':'Next pass at or above 40°';$('nextCountdown').textContent=first?countdown(first.aos):'—';$('nextSummary').textContent=first?`Meteor ${first.satellite} · ${first.max_elevation.toFixed(1)}° peak`:available.length?'No qualifying pass in this forecast':'Waiting for fresh predictions';
 const selected=available.find(p=>passKey(p)===inspectedPass);
 if(!selected)inspectedPass=null;
 const previous=passKey(currentPass);
 currentPass=selected||available.find(p=>p.satellite===selectedSatellite);
 if(previous!==passKey(currentPass))updatePassSelection();
 $('highestPass').disabled=!available.length||!highestPass||new Date(highestPass.los)<=Date.now();
 $('passHeading').textContent=selected?'SELECTED FORECAST PASS':'NEXT PASS / SELECTED SATELLITE';
 $('calendar').disabled=!currentPass;
 if(currentPass){$('passSatellite').textContent='METEOR '+currentPass.satellite;$('passCountdown').textContent=countdown(currentPass.aos);$('passDate').textContent=date(currentPass.aos)+' · Philippine time';$('passAos').textContent=shortTime(currentPass.aos);$('passPeak').textContent=shortTime(currentPass.peak);$('passLos').textContent=shortTime(currentPass.los);$('passNote').textContent=`${currentPass.max_elevation.toFixed(1)}° maximum elevation · ${Math.floor(currentPass.duration_seconds/60)}m ${currentPass.duration_seconds%60}s above 10°. Verify the active downlink before recording.`}
 else{$('passSatellite').textContent='METEOR '+selectedSatellite;$('passCountdown').textContent='Unavailable';$('passDate').textContent='No upcoming prediction in this snapshot';for(const id of ['passAos','passPeak','passLos'])$(id).textContent='—';$('passNote').textContent='Check the forecast again when fresh orbital data is available.'}
 if(orbital){const age=(Date.now()-new Date(orbital.generated_utc))/3600000,expired=Date.now()>new Date(orbital.valid_until_utc);$('orbitState').textContent=expired?'Predictions expired':orbital.satellites.length?`COMPUTED TRACKING · ${age.toFixed(1)}H SNAPSHOT`:'Orbit data unavailable';if(expired)$('passNote').textContent='Orbital snapshot expired. Rebuild to refresh predictions.'}
 drawMap();drawSky();renderReception();renderPassDay(Date.now());
}
async function stationPoll(){
 try{
  const fresh=await get('station.json');
  if(Number.isFinite(Date.parse(fresh.sampled_utc))||!stationSample)stationSample=fresh;
 }
 catch{stationSample??={connected:false}}
 renderReception();
 setTimeout(stationPoll,15000);
}
async function init(){
 const reportError=message=>{$('error').hidden=false;$('error').textContent+=($('error').textContent?' ':'')+message};
 stationPoll();
 const loadArchive=get('archive.json').then(updateArchive).catch(()=>{
  $('archiveStatus').textContent='The archive is unavailable. The page will retry automatically.';
 });
 const loadOrbits=get('orbits.json').then(data=>{
  orbital=data;
  if(data.errors.length)reportError('Orbit data: '+data.errors.join('; '));
  renderPasses();
  tick();
 }).catch(e=>{$('orbitState').textContent='Orbit data unavailable';$('tleInfo').textContent=e.message});
 const loadCoastline=get('coastline.json').then(data=>{coastline=data;drawMap()}).catch(()=>reportError('Basemap unavailable; orbit coordinates are still shown.'));
 await Promise.all([loadArchive,loadOrbits,loadCoastline]);
 if(typeof refreshCoverage==='function')refreshCoverage();$('manifestDownload').href=local?'archive.json':'/api/feed?kind=archive';const shared=location.hash.startsWith('#capture=')?decodeURIComponent(location.hash.slice(9)):null;if(shared){const match=archive?.captures.find(c=>c.id===shared||c.aliases?.includes(shared)||((c.started_utc||'').slice(0,16).replace('T','_').replace(':','-')+'_Meteor-'+c.satellite)===shared);if(match)openCapture(match)}tick();setInterval(tick,1000);setInterval(renderPasses,60000);setInterval(async()=>{try{const fresh=await get('archive.json');if(!archive||fresh.generated_utc!==archive.generated_utc)updateArchive(fresh)}catch{}},60000);setInterval(async()=>{try{orbital=await get('orbits.json');renderPasses();tick()}catch(e){$('orbitState').textContent='ORBIT REFRESH UNAVAILABLE'}},900000);
}
$('satTabs').addEventListener('click',e=>{const b=e.target.closest('button[data-sat]');if(!b)return;inspectedPass=null;selectSatellite(b.dataset.sat);tick()});
$('archiveTabs').addEventListener('click',e=>{const b=e.target.closest('button[data-filter]');if(!b)return;archiveFilter=b.dataset.filter;for(const button of $('archiveTabs').children){button.classList.toggle('selected',button===b);button.setAttribute('aria-pressed',String(button===b))}renderArchive()});
$('search').addEventListener('input',()=>archive&&renderArchive());$('elevationFilter').addEventListener('change',renderPasses);$('calendar').onclick=()=>currentPass&&exportCalendar(currentPass);
$('highestPass').onclick=()=>highestPass&&inspectPass(highestPass);
selectSatellite(selectedSatellite);
$('closeDialog').onclick=()=>$('captureDialog').close();$('captureDialog').addEventListener('click',e=>{if(e.target===$('captureDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});
$('captureDialog').addEventListener('close',()=>{
 if(location.hash.startsWith('#capture='))history.replaceState(null,'',captureReturnHash||location.pathname+location.search);
});
$('productSelect').onchange=$('compareSelect').onchange=imageSelection;$('zoomButton').onclick=()=>{const native=$('viewer').classList.toggle('native');$('zoomButton').textContent=native?'Fit to viewer':'View at native size';imageSelection()};
$('exportCsv').onclick=()=>{if(!archive)return;const rows=[['capture','satellite','started_utc','finished_utc','outcome','cadu_bytes','records','distinct_records','expected_asm','trailing_bytes','peak_logged_snr_db','image_variants','georeferencing'],...archive.captures.map(c=>[c.id,c.satellite,c.started_utc,c.finished_utc,c.outcome,c.cadu_bytes,c.frames,c.unique_frames,c.sync_frames,c.trailing_bytes,c.peak_snr_db,c.images.length,c.georeferencing])];download('sagapsat-capture-index.csv',rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n'),'text/csv')};
window.addEventListener('resize',()=>{drawMap();drawSky()});
const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){for(const a of document.querySelectorAll('nav a')){const active=a.hash==='#'+entry.target.id;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')}}},{rootMargin:'-10% 0px -60% 0px'});document.querySelectorAll('main>section').forEach(s=>observer.observe(s));init();
