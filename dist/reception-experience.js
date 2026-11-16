'use strict';

/* Tools tied to the selected archived capture, independent from live receiver state. */
function createReceptionExperience(selectCapture, openSignalCapture, stopComparison) {
 const preview=$('latestImage'), stage=preview.closest('.latest-view');
 const overlay=$('captureOverlay'), replayPanel=$('captureReplayPanel');
 const progress=$('captureProgress'), playButton=$('captureReplay');
 const lensButton=$('captureLens'), gapsButton=$('captureGaps');
 let capture, product, receptions=[], log=[];
 let imageMode='image', animation=0, previousTick, elapsed=0;
 let lens=false, gaps=false, gapBands, lensPoint;
 const duration=10000;

 function receptionTime(value){
  return date(value,{hour:'numeric',minute:'2-digit',hour12:true})+' PHT';
 }

 function selectByIndex(index,scroll){
  const chosen=receptions[index];
  if(!chosen)return;
  selectCapture(chosen);
  if(scroll)document.querySelector('#filmstripItems [aria-pressed="true"]')?.scrollIntoView({block:'nearest',inline:'nearest'});
 }

 function syncFilmstrip(chosen){
  const index=receptions.findIndex(c=>c.id===chosen?.id);
  const slider=$('receptionScrub');
  slider.value=Math.max(0,index);
  slider.setAttribute('aria-valuetext',chosen?`Meteor ${chosen.satellite}, ${receptionTime(chosen.started_utc)}`:'No receptions');
  for(const option of $('filmstripItems').children){
   option.setAttribute('aria-pressed',String(Number(option.dataset.reception)===index));
  }
  $('showLatestReception').hidden=index<=0;
 }

 function updateArchive(data,chosen) {
  receptions=data.captures;
  const items=$('filmstripItems');
  $('receptionFilmstrip').hidden=receptions.length<2;
  $('receptionScrub').max=Math.max(0,receptions.length-1);
  items.replaceChildren(...receptions.map((c,index)=>{
   const option=make('button',undefined,'reception-option');
   option.type='button';
   option.dataset.reception=index;
   option.setAttribute('aria-label',`Meteor ${c.satellite}, ${receptionTime(c.started_utc)}`);
   const artwork=make('span',undefined,'filmstrip-image'), thumbnail=captureThumbnail(c);
   if(thumbnail){
    const img=make('img');
    img.src=thumbnail.preview;
    img.alt='';
    img.loading='lazy';
    artwork.append(img);
   }else artwork.textContent='No preview';
   option.append(artwork,make('strong','Meteor '+c.satellite),make('span',date(c.started_utc,{year:undefined})));
   return option;
  }));
  syncFilmstrip(chosen);
  const signalId='2026-11-15_12-15-00_Meteor-M2-3';
  const signalCapture=receptions.find(c=>c.id===signalId||c.aliases?.includes(signalId));
  $('signalCapture').onclick=event=>{
   if(!signalCapture)return;
   event.preventDefault();
   openSignalCapture(signalCapture);
  };
 }

 function captureLog(c){
  return (c?.timeline?.samples||[]).flatMap(sample=>{
   const at=Date.parse(sample.time);
   const frames=Number.isFinite(sample.frames)?sample.frames:null;
   const snr=Number.isFinite(sample.snr_db)?sample.snr_db:null;
   return Number.isFinite(at)&&(frames!==null||snr!==null)?[{at,frames,snr}]:[];
  }).sort((a,b)=>a.at-b.at);
 }

 function setProduct(c,next){
  const changed=c?.id!==capture?.id||next?.preview!==product?.preview;
  capture=c;
  product=next;
  syncFilmstrip(c);
  $('experienceActions').hidden=!product;
  const ready=Boolean(product&&preview.complete&&preview.naturalWidth);
  playButton.disabled=lensButton.disabled=gapsButton.disabled=!ready;
  if(!changed)return;
  log=captureLog(c);
  $('replayModes').hidden=!log.length;
  closeReplay();
  setInspection(false,false);
  $('captureExportStatus').hidden=true;
 }

 function fitImage(){
  const {clientWidth:w,clientHeight:h}=stage;
  if(!preview.naturalWidth||!w||!h)return null;
  const scale=Math.min(w/preview.naturalWidth,h/preview.naturalHeight);
  const width=preview.naturalWidth*scale,height=preview.naturalHeight*scale;
  return {x:(w-width)/2,y:(h-height)/2,width,height,w,h};
 }

 function stopReplay(){
  cancelAnimationFrame(animation);
  animation=0;
  previousTick=undefined;
  playButton.textContent=replayPanel.hidden?'Replay capture':'Play replay';
 }

 function closeReplay(){
  replayPanel.hidden=true;
  stopReplay();
  imageMode='image';
  elapsed=0;
  progress.value=0;
  preview.style.clipPath='';
 }

 function nearbyLogSample(at) {
  let nearest=null;
  for(const sample of log){
   if(!nearest||Math.abs(sample.at-at)<Math.abs(nearest.at-at))nearest=sample;
   if(sample.at>=at)break;
  }
  return nearest&&Math.abs(nearest.at-at)<=15000?nearest:null;
 }

 function drawReplay() {
  if(replayPanel.hidden)return;
  const fraction=Number(progress.value)/Number(progress.max);
  let result;
  if(imageMode==='image'){
   const rect=fitImage();
   if(rect)preview.style.clipPath=`inset(0 0 ${rect.h-rect.y-rect.height*fraction}px 0)`;
   const rows=Math.round((product?.height||0)*fraction);
   result=`${fmt.format(rows)} / ${fmt.format(product?.height||0)} rows`;
  }else{
   preview.style.clipPath='';
   const start=log[0].at,end=log.at(-1).at, instant=start+(end-start)*fraction;
   const point=nearbyLogSample(instant);
   result=point
    ?`${time(point.at)} PHT · ${point.frames===null?'CADUs unavailable':fmt.format(point.frames)+' logged CADUs'} · ${point.snr===null?'SNR unavailable':snr(point.snr)+' logged SNR'}`
    :`${time(instant)} PHT · No nearby log sample`;
  }
  $('replayProgress').textContent=result;
  progress.setAttribute('aria-valuetext',result);
 }

 function setReplayMode(mode){
  stopReplay();
  imageMode=mode==='log'&&log.length?'log':'image';
  progress.value=0;
  elapsed=0;
  for(const button of $('replayModes').children){
   button.setAttribute('aria-pressed',String(button.dataset.replay===imageMode));
  }
  $('replayTimelineLabel').textContent=imageMode==='log'?'Receiver log':'Image row order';
  $('replayNote').textContent=imageMode==='log'?'Recorded telemetry by station time. Image row timing is unverified for this replay.':'Rows appear in image order. Replay speed is illustrative.';
  drawReplay();
 }

 function runReplay(stamp){
  if(previousTick!==undefined)elapsed=Math.min(duration,elapsed+stamp-previousTick);
  previousTick=stamp;
  progress.value=Math.round(elapsed/duration*Number(progress.max));
  drawReplay();
  if(elapsed<duration)animation=requestAnimationFrame(runReplay);
  else stopReplay();
 }

 function updateGapBands(){
  if(!preview.naturalWidth)return [];
  const probe=document.createElement('canvas');
  probe.width=96;
  probe.height=Math.min(preview.naturalHeight,512);
  const ctx=probe.getContext('2d',{willReadFrequently:true});
  if(!ctx)return [];
  ctx.drawImage(preview,0,0,probe.width,probe.height);
  const data=ctx.getImageData(0,0,probe.width,probe.height).data;
  const dark=[];
  for(let row=0;row<probe.height;row++){
   let count=0;
   for(let col=0;col<probe.width;col++){
    const i=4*(row*probe.width+col);
    if(data[i+3]<16||Math.max(data[i],data[i+1],data[i+2])<=14)count++;
   }
   dark.push(count/probe.width>=.98);
  }
  if(dark.every(Boolean))return [];
  const bands=[];
  let start=null;
  for(let row=0;row<=dark.length;row++){
   if(dark[row])start??=row;
   else if(start!==null){
    if(row-start>=2)bands.push([start/dark.length,row/dark.length]);
    start=null;
   }
  }
  return bands;
 }

 function drawInspection(){
  overlay.hidden=!lens&&!gaps;
  if(overlay.hidden)return;
  const rect=fitImage(), ctx=overlay.getContext('2d');
  if(!ctx)return;
  const dpr=Math.min(devicePixelRatio||1,2);
  const width=Math.round(stage.clientWidth*dpr),height=Math.round(stage.clientHeight*dpr);
  if(overlay.width!==width||overlay.height!==height){
   overlay.width=width;
   overlay.height=height;
  }
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,stage.clientWidth,stage.clientHeight);
  if(!rect)return;
  if(gaps){
   gapBands??=updateGapBands();
   ctx.fillStyle='rgba(255, 183, 76, .30)';
   ctx.strokeStyle='#ffbc56';
   ctx.lineWidth=1;
   for(const [start,end] of gapBands){
    const y=rect.y+start*rect.height, height=(end-start)*rect.height;
    ctx.fillRect(rect.x,y,rect.width,height);
    ctx.strokeRect(rect.x+.5,y+.5,rect.width-1,Math.max(1,height-1));
   }
  }
  if(!lens||!lensPoint)return;
  const radius=Math.min(72,rect.w/3,rect.h/3);
  const sx=lensPoint[0]*preview.naturalWidth,sy=lensPoint[1]*preview.naturalHeight;
  const mx=Math.min(rect.w-radius,Math.max(radius,rect.x+lensPoint[0]*rect.width));
  const my=Math.min(rect.h-radius,Math.max(radius,rect.y+lensPoint[1]*rect.height));
  const zoom=2.4;
  const sampleWidth=2*radius*preview.naturalWidth/(rect.width*zoom);
  const sampleHeight=2*radius*preview.naturalHeight/(rect.height*zoom);
  const left=Math.max(0,Math.min(preview.naturalWidth-sampleWidth,sx-sampleWidth/2));
  const top=Math.max(0,Math.min(preview.naturalHeight-sampleHeight,sy-sampleHeight/2));
  ctx.save();
  ctx.beginPath();
  ctx.arc(mx,my,radius,0,Math.PI*2);
  ctx.clip();
  ctx.drawImage(preview,left,top,sampleWidth,sampleHeight,mx-radius,my-radius,2*radius,2*radius);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(mx,my,radius,0,Math.PI*2);
  ctx.strokeStyle='#fff';
  ctx.lineWidth=2;
  ctx.stroke();
 }

 function setInspection(nextLens,nextGaps){
  lens=nextLens;
  gaps=nextGaps;
  gapBands=undefined;
  lensPoint=lens?[.5,.5]:null;
  lensButton.setAttribute('aria-pressed',String(lens));
  gapsButton.setAttribute('aria-pressed',String(gaps));
  stage.classList.toggle('is-inspecting',lens);
  $('latestView').setAttribute('aria-label',lens?'Move the image magnifier using the pointer or arrow keys':'Open the latest image in the capture viewer');
  const note=$('captureInspectNote');
  note.hidden=!lens&&!gaps;
  note.textContent=[lens?'Move over the image or use the arrow keys.':'',
   gaps?'Highlighted bands are nearly black across the preview.':''].filter(Boolean).join(' ');
  drawInspection();
 }

 function inspectPointer(event){
  if(!lens)return;
  const rect=fitImage(), bounds=stage.getBoundingClientRect();
  if(!rect)return;
  const x=(event.clientX-bounds.left-rect.x)/rect.width;
  const y=(event.clientY-bounds.top-rect.y)/rect.height;
  lensPoint=x>=0&&x<=1&&y>=0&&y<=1?[x,y]:null;
  drawInspection();
 }

 function setImageMode(nextLens,nextGaps){
  closeReplay();
  stopComparison();
  setInspection(nextLens,nextGaps);
 }

 function exportPrint(c,image,button,status){
  if(!c||!image||button.disabled)return;
  button.disabled=true;
  status.hidden=false;
  status.textContent='Preparing print…';
  const original=new Image();
  original.crossOrigin='anonymous';
  original.src=image.url;
  original.decode().then(()=>{
   const print=document.createElement('canvas');
   const border=68, heading=185, footer=104;
   const scale=Math.min(1800/original.naturalWidth,2200/original.naturalHeight);
   const width=Math.round(original.naturalWidth*scale),height=Math.round(original.naturalHeight*scale);
   print.width=Math.max(1040,width+2*border);
   print.height=heading+height+footer;
   const ctx=print.getContext('2d');
   if(!ctx)throw Error('Canvas unavailable');
   ctx.fillStyle='#faf9f6';
   ctx.fillRect(0,0,print.width,print.height);
   ctx.fillStyle='#20303a';
   ctx.font='600 64px Georgia, serif';
   ctx.fillText('Meteor '+c.satellite,border,90);
   ctx.font='26px sans-serif';
   ctx.fillText(receptionTime(c.started_utc),border,136);
   ctx.fillStyle='#e8e8e2';
   ctx.fillRect(border,heading,print.width-2*border,height);
   ctx.drawImage(original,(print.width-width)/2,heading,width,height);
   ctx.fillStyle='#20303a';
   ctx.font='24px sans-serif';
   ctx.fillText(image.label+' · '+captureOutcome(c),border,heading+height+37,print.width-2*border);
   const url='sagapsat.adrielmagalona.com/#capture='+encodeURIComponent(c.id);
   ctx.font='21px monospace';
   ctx.fillText(url,border,heading+height+74,print.width-2*border);
   return new Promise((resolve,reject)=>print.toBlob(blob=>blob?resolve(blob):reject(Error('PNG unavailable')),'image/png'));
  }).then(blob=>{
   download('SagapSat-'+c.id+'.png',blob,'image/png');
   status.textContent='Print exported.';
  }).catch(()=>{
   status.textContent='The original image could not be used to export a print.';
  }).finally(()=>{button.disabled=false});
 }

 $('filmstripItems').onclick=event=>{
  const button=event.target.closest('[data-reception]');
  if(button)selectByIndex(Number(button.dataset.reception),false);
 };
 $('receptionScrub').oninput=event=>selectByIndex(Number(event.target.value),true);
 $('showLatestReception').onclick=()=>selectByIndex(0,true);
 playButton.onclick=()=>{
  if(!product||!preview.naturalWidth)return;
  if(replayPanel.hidden){
   stopComparison();
   setInspection(false,false);
   replayPanel.hidden=false;
   setReplayMode('image');
  }
  if(animation){stopReplay();return}
  if(elapsed>=duration){
   elapsed=0;
   progress.value=0;
   drawReplay();
  }
  playButton.textContent='Pause replay';
  animation=requestAnimationFrame(runReplay);
 };
 $('closeReplay').onclick=closeReplay;
 $('replayModes').onclick=event=>{
  const button=event.target.closest('[data-replay]');
  if(button)setReplayMode(button.dataset.replay);
 };
 progress.oninput=()=>{
  stopReplay();
  elapsed=Number(progress.value)/Number(progress.max)*duration;
  drawReplay();
 };
 lensButton.onclick=()=>setImageMode(!lens,gaps);
 gapsButton.onclick=()=>setImageMode(lens,!gaps);
 stage.addEventListener('pointermove',inspectPointer);
 stage.addEventListener('pointerdown',inspectPointer);
 stage.addEventListener('pointerleave',()=>{
  if(!lens)return;
  lensPoint=null;
  drawInspection();
 });
 $('latestView').addEventListener('keydown',event=>{
  const offset={ArrowUp:[0,-.05],ArrowDown:[0,.05],ArrowLeft:[-.05,0],ArrowRight:[.05,0]}[event.key];
  if(!lens||!offset)return;
  event.preventDefault();
  const p=lensPoint||[.5,.5];
  lensPoint=p.map((value,i)=>Math.max(0,Math.min(1,value+offset[i])));
  drawInspection();
 });
 preview.addEventListener('load',()=>{
  playButton.disabled=lensButton.disabled=gapsButton.disabled=false;
  gapBands=undefined;
  drawReplay();
  drawInspection();
 });
 preview.addEventListener('error',()=>{
  playButton.disabled=lensButton.disabled=gapsButton.disabled=true;
  closeReplay();
  setInspection(false,false);
 });
 new ResizeObserver(()=>{drawReplay();drawInspection()}).observe(stage);
 $('capturePrint').onclick=()=>exportPrint(capture,product,$('capturePrint'),$('captureExportStatus'));
 return {
  updateArchive,setProduct,exportPrint,
  comparisonStarted(){closeReplay();setInspection(false,false)},
  get inspecting(){return lens}
 };
}

function initSignalPlayer() {
 const audio=$('signalAudio'), seek=$('signalSeek'), scale=5;
 const duration=Number(seek.max);
 function syncTime(){
  const seconds=Math.max(0,Math.min(duration,audio.currentTime/scale));
  seek.value=seconds;
  seek.setAttribute('aria-valuetext',`${seconds.toFixed(2)} recorded seconds`);
  $('signalClock').textContent=`${seconds.toFixed(2)} s recorded`;
  seek.closest('.signal-waterfall').style.setProperty('--signal-cursor',seconds/duration*100+'%');
 }
 seek.addEventListener('input',()=>{
  if(!Number.isFinite(audio.duration))return;
  audio.currentTime=Math.min(audio.duration,Number(seek.value)*scale);
  syncTime();
 });
 for(const event of ['timeupdate','seeked','ended'])audio.addEventListener(event,syncTime);
 audio.addEventListener('loadedmetadata',()=>{
  seek.disabled=false;
  syncTime();
 });
 function showError(){
  seek.disabled=true;
  $('signalError').textContent='The signal recording could not be loaded.';
  $('signalError').hidden=false;
 }
 audio.addEventListener('error',showError);
 // A small in-memory clip supports seeking on static hosts without byte ranges.
 const load=new IntersectionObserver(entries=>{
  if(!entries.some(entry=>entry.isIntersecting))return;
  load.disconnect();
  fetch(audio.dataset.src).then(response=>{
   if(!response.ok)throw Error('Signal unavailable');
   return response.blob();
  }).then(blob=>{
   const url=URL.createObjectURL(blob);
   audio.src=url;
   window.addEventListener('pagehide',event=>{
    if(!event.persisted)URL.revokeObjectURL(url);
   });
  }).catch(showError);
 },{rootMargin:'200px'});
 load.observe(audio);
 syncTime();
}

function createAntennaSky(element, globeElement, redraw) {
 const earthButton=$('showEarth'), skyButton=$('showAntennaSky'), info=$('globeHint');
 let targets=[], seek;
 function changeView(sky){
  element.hidden=!sky;
  globeElement.hidden=sky;
  earthButton.setAttribute('aria-pressed',String(!sky));
  skyButton.setAttribute('aria-pressed',String(sky));
  redraw();
 }
 earthButton.onclick=()=>changeView(false);
 skyButton.onclick=()=>changeView(true);
 element.onclick=event=>{
  if(!seek)return;
  const bounds=element.getBoundingClientRect();
  const x=event.clientX-bounds.left,y=event.clientY-bounds.top;
  let nearest, distance=15;
  for(const target of targets){
   const delta=Math.hypot(target.x-x,target.y-y);
   if(delta<distance){distance=delta;nearest=target}
  }
  if(nearest)seek(nearest.index);
 };
 function draw(point,track,jump){
  if(element.hidden){
   info.textContent='Drag to rotate. Select the track to seek.';
   return;
  }
  seek=jump;
  targets=[];
  const {x:ctx,w,h}=canvas(element.id);
  const radius=Math.max(0,Math.min(w,h)/2-25),cx=w/2,cy=h/2;
  if(!radius)return;
  function project(az,el){
   const angle=az*Math.PI/180,distance=radius*(90-el)/90;
   return {x:cx+distance*Math.sin(angle),y:cy-distance*Math.cos(angle)};
  }
  ctx.font='12px system-ui';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillStyle='#52616a';
  ctx.strokeStyle='#b8c6cf';
  ctx.lineWidth=1;
  for(const elevation of [0,30,60]){
   ctx.beginPath();
   ctx.arc(cx,cy,radius*(90-elevation)/90,0,2*Math.PI);
   ctx.stroke();
   ctx.fillText(elevation+'°',cx+16,cy-radius*(90-elevation)/90+9);
  }
  ctx.beginPath();
  ctx.moveTo(cx-radius,cy);
  ctx.lineTo(cx+radius,cy);
  ctx.moveTo(cx,cy-radius);
  ctx.lineTo(cx,cy+radius);
  ctx.stroke();
  for(const [label,azimuth] of [['N',0],['E',90],['S',180],['W',270]]){
   const p=project(azimuth,-90*16/radius);
   ctx.fillText(label,p.x,p.y);
  }
  ctx.beginPath();
  let connected=false;
  for(const [index,sample] of track.entries()){
   if(!sample||sample[3]<0){connected=false;continue}
   const p=project(sample[4],sample[3]);
   targets.push({...p,index});
   if(connected)ctx.lineTo(p.x,p.y);
   else ctx.moveTo(p.x,p.y);
   connected=true;
  }
  ctx.strokeStyle='#2c5279';
  ctx.lineWidth=2.5;
  ctx.stroke();
  if(point&&point[3]>=0){
   const p=project(point[4],point[3]);
   ctx.beginPath();
   ctx.arc(p.x,p.y,5,0,Math.PI*2);
   ctx.fillStyle='#a24e2a';
   ctx.fill();
   ctx.strokeStyle='#fff';
   ctx.lineWidth=1.5;
   ctx.stroke();
  }
  info.textContent=!targets.length?'No above-horizon positions in this window.'
   :point&&point[3]<0?'Below the horizon at the selected time. Select the track to seek.'
   :'Select the track to move through the pass.';
 }
 return draw;
}
