'use strict';

const luzonId='2026-11-06_06-30_Meteor-M2-4';
const signalId='2026-11-15_12-15-00_Meteor-M2-3';
const luzonProduct='msu_mr_rgb_AVHRR_221_False_Color_corrected.png';
const himawariTime='2026-11-06T06:40:00Z';
const comparisonClock=new Intl.DateTimeFormat('en-GB',{
 timeZone:'Asia/Manila',hour:'2-digit',minute:'2-digit',second:'2-digit'
});
const tourStops=[
 {x:46.8,y:64.8,title:'Luzon',note:'Look for the broad green landmass below the central gap. Northern Luzon points down in this scan orientation.'},
 {x:69.5,y:30,title:'Cloud over the Philippine Sea',note:'The pale bands and textured clusters stand out against the dark ocean. The 221 composite brings out that contrast.'},
 {x:55,y:54.8,title:'Missing scan lines',note:'These straight black bands span the image wherever scan lines are missing. They interrupt both land and sea.'}
];
const galleryPicks=[
 [luzonId,'Luzon in false colour','A recognizable coastline and verified scan times.'],
 ['2026-11-05_Meteor-M2-4','A second daylight pass','Compare an earlier swath with 2,091 distinct CADUs and a logged 14.36 dB peak.'],
 [signalId,'A faint pass, preserved','A fragmented image with the recorded signal and decoded frames available to inspect.']
];
let storySignature;

function lookupCapture(id){
 return archive?.captures.find(c=>c.id===id||c.aliases?.includes(id)||((c.started_utc||'').slice(0,16).replace('T','_').replace(':','-')+'_Meteor-'+c.satellite)===id);
}
function captureParams(c,product){
 const params=new URLSearchParams({capture:c.id});
 if(product)params.set('product',product);
 return params;
}
function captureHash(c,product){return '#'+captureParams(c,product)}

function updateCaptureStories(){
 const tour=lookupCapture(luzonId),signal=lookupCapture(signalId);
 const image=tour?.images.find(im=>im.name===luzonProduct);
 const picks=galleryPicks.map(([id])=>lookupCapture(id));
 const signature=JSON.stringify([image?.preview,...picks.map(c=>[c?.id,c?.featured?.preview]),signal?.id]);
 if(storySignature===signature)return;
 storySignature=signature;
 $('captureStories').hidden=!image;
 if(image){
  $('tourImage').src=$('referenceMeteor').src=image.preview;
  $('referenceMeteor').alt=$('tourImage').alt='Meteor M2-4 false-colour swath of the Philippines with clouds and missing scan lines';
  $('tourOpen').href=captureHash(tour,image.name);
  const start=tour.coverage?.scan_start_utc,end=tour.coverage?.scan_end_utc;
  if(start&&end){
   const mid=(Date.parse(start)+Date.parse(end))/2;
   const difference=Date.parse(himawariTime)-mid;
   $('referenceScan').textContent=comparisonClock.format(new Date(start))+'–'+comparisonClock.format(new Date(end))+' PHT';
   $('referenceDifference').textContent=Math.round(Math.abs(difference)/60000)+' min '+(difference>=0?'after':'before')+' the Meteor scan midpoint';
  }
  $('referenceClock').textContent=comparisonClock.format(new Date(himawariTime))+' PHT';
 }
 const gallery=$('bestViewList');
 gallery.replaceChildren();
 picks.forEach((c,i)=>{
  const image=captureThumbnail(c||{});
  if(!image)return;
  const [,title,note]=galleryPicks[i];
  const entry=make('a',undefined,'best-view');
  entry.href=captureHash(c,image.name);
  const pic=make('img');
  pic.src=image.preview;
  pic.alt='';
  pic.loading='lazy';
  entry.append(pic,make('small',date(c.started_utc)+' · Meteor '+c.satellite),make('strong',title+' ↗'),make('span',note));
  gallery.append(entry);
 });
 $('bestViews').hidden=!gallery.childElementCount;
 if(signal)$('signalCapture').href=captureHash(signal);
 const cadu=signal?.evidence.find(f=>f.sha256==='5e6b72a285fb44c8130496d3fdf5561a3642fcb2fc091538fce779f05d710db0');
 $('signalCadu').hidden=!cadu;
 if(cadu)$('signalCadu').href=cadu.url;
 const first=tour?.timeline?.samples?.find(s=>s.frames>0);
 $('signalOtherLog').hidden=!first;
 if(first){
  $('signalFirst').textContent=fmt.format(first.frames)+' frames logged at '+time(first.time)+' PHT on 6 November. This is the earliest nonzero count in that pass’s sampled receiver log.';
  $('signalLogLink').href=captureHash(tour);
 }
}

function selectTourStop(index){
 const stop=tourStops[index];
 for(const element of document.querySelectorAll('[data-tour-stop]')){
  element.setAttribute('aria-pressed',String(Number(element.dataset.tourStop)===index));
 }
 $('tourStopTitle').textContent=stop.title;
 $('tourStopText').textContent=stop.note;
}

function initCaptureStories(){
 const markers=$('tourMarkers'),stops=$('tourStops');
 tourStops.forEach((stop,index)=>{
  for(const parent of [markers,stops]){
   const marker=parent===markers;
   const button=make('button',marker?String(index+1):stop.title,marker?'tour-pin':'outline-button');
   button.type='button';
   button.dataset.tourStop=index;
   button.setAttribute('aria-controls','tourNote');
   if(marker){
    button.setAttribute('aria-label',stop.title);
    button.style.left=stop.x+'%';
    button.style.top=stop.y+'%';
   }
   button.onclick=()=>selectTourStop(index);
   parent.append(button);
  }
 });
 selectTourStop(0);
 $('tourSwitch').onclick=()=>{
  const show=$('referenceView').hidden;
  $('referenceView').hidden=!show;
  $('tourView').hidden=show;
  $('tourSwitch').setAttribute('aria-expanded',String(show));
  $('tourSwitch').textContent=show?'Back to guided view':'Compare with Himawari-9 ↗';
 };
 const tabs=[...$('signalSteps').querySelectorAll('button')];
 function selectStep(i){
  if(i!==0)$('signalAudio').pause();
  tabs.forEach((button,n)=>{
   button.setAttribute('aria-selected',String(i===n));
   button.tabIndex=i===n?0:-1;
   $(button.getAttribute('aria-controls')).hidden=n!==i;
  });
 }
 tabs.forEach((button,i)=>{
  button.onclick=()=>selectStep(i);
  button.onkeydown=e=>{
   const next={ArrowLeft:(i+2)%3,ArrowRight:(i+1)%3,Home:0,End:2}[e.key];
   if(next===undefined)return;
   e.preventDefault();
   selectStep(next);
   tabs[next].focus();
  };
 });
 selectStep(0);
 $('copyLatestView').onclick=()=>{
  if(!latestCapture)return;
  const params=captureParams(latestCapture,latestCapture.images[latestProductIndex]?.name);
  params.set('view','inline');
  const compare=latestCapture.images[comparisonIndex()];
  if(compare){
   params.set('compare',compare.name);
   params.set('wipe',$('latestWipe').value);
  }
  copyViewLink(params,$('copyLatestView'));
 };
}

function restoreLinkedView(){
 const params=new URLSearchParams(location.hash.slice(1));
 const pass=params.get('watch');
 if(pass){
  showPassWatch(linkedPass(pass));
  return;
 }
 const id=params.get('capture');
 if(!id)return;
 const c=lookupCapture(id);
 if(!c)return;
 restoredArchiveHash=location.hash;
 const index=key=>{
  const found=c.images.findIndex(im=>im.name===params.get(key));
  return found<0?undefined:found;
 };
 if(params.get('view')==='inline'){
  selectReception(c);
  latestProductIndex=index('product')??latestProductIndex;
  showLatestProduct(c.images[index('compare')]?.name);
  const wipe=Number(params.get('wipe')??50);
  $('latestWipe').value=Number.isFinite(wipe)?Math.min(100,Math.max(0,wipe)):50;
  updateImageWipe();
  $('latestTitle').scrollIntoView({block:'start'});
 }else openCapture(c,index('product'),index('compare'),params);
}

async function copyViewLink(params,button){
 const url=new URL(location.href);
 url.hash=params.toString();
 const status=$('captureDialog').open?$('dialogLinkStatus'):$('latestLinkStatus');
 status.replaceChildren();
 try{
  await navigator.clipboard.writeText(url.href);
  status.textContent='View link copied.';
 }catch{
  const field=make('input');
  field.value=url.href;
  field.readOnly=true;
  field.setAttribute('aria-label','Shareable capture view link');
  status.append(field);
  field.select();
 }
 status.hidden=false;
 button.setAttribute('aria-describedby',status.id);
}
