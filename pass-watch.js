'use strict';

const manilaOffset=8*3600000;
const passWatch={selected:null,night:0,nightKey:'',recordKey:''};

function passLink(p){
 return '#'+new URLSearchParams({watch:[p.satellite,Date.parse(p.aos),Date.parse(p.peak),Date.parse(p.los),p.max_elevation].join(',')});
}

function linkedPass(value){
 const [satellite,start,peak,end,elevation,...extra]=value.split(',');
 const [a,p,l,max]=[start,peak,end,elevation].map(v=>v?Number(v):NaN);
 if(extra.length||!['M2-3','M2-4'].includes(satellite)||![a,p,l,max].every(Number.isFinite)
  ||a<Date.UTC(2020,0,1)||l>Date.UTC(2100,0,1)||l-a>1800000||!(a<p&&p<l)||max<10||max>90)return null;
 const utc=v=>new Date(v).toISOString();
 return {satellite,aos:utc(a),peak:utc(p),los:utc(l),max_elevation:max};
}

function sameWatchPass(a,b){
 return a.satellite===b.satellite&&Math.abs(Date.parse(a.peak)-Date.parse(b.peak))<120000;
}

function watchCapture(p,captures){
 const [a,peak,l]=[p.aos,p.peak,p.los].map(Date.parse);
 return captures.filter(c=>c.satellite===p.satellite&&Date.parse(c.started_utc)<l
   &&Date.parse(c.finished_utc)>a&&Date.parse(c.started_utc)>=a-360000)
  .sort((x,y)=>Number(Date.parse(y.finished_utc)>=peak)-Number(Date.parse(x.finished_utc)>=peak)
   ||Math.abs(Date.parse(x.started_utc)-a)-Math.abs(Date.parse(y.started_utc)-a))[0];
}

function openNightOrbit(event,p){
 if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 event.preventDefault();
 previewWatchOrbit(p);
}

function showPassWatch(p){
 if(!p)return;
 passWatch.selected=p;
 $('passWatch').hidden=false;
 renderPassWatch(Date.now(),upcoming());
 $('watchTitle').focus({preventScroll:true});
 $('passWatch').scrollIntoView({block:'start'});
}

function previewWatchOrbit(p){
 selectSatellite(p.satellite);
 stopOrbitPlayback();
 orbitPass=p;
 orbitBase=Date.parse(p.peak);
 orbitOffset=0;
 globe.center('manila');
 $('orbitTools').open=true;
 if(upcoming().some(q=>passKey(q)===passKey(p)))inspectedPass=passKey(p);
 tick();
 $('orbitTools').querySelector('summary').focus({preventScroll:true});
 $('orbitTools').scrollIntoView({block:'center'});
}

function renderPassWatch(now,available){
 const first=available.find(p=>p.max_elevation>=recordingElevation);
 const watchLink=$('nextWatch');
 if(first&&watchLink.getAttribute('href')!==passLink(first))watchLink.href=passLink(first);
 if(!first)watchLink.href='#tracking';
 watchLink.textContent=first?'Watch pass ↗':'View forecast ↗';
 renderPassNight(now);
 if(!passWatch.selected)return;
 const chosen=passWatch.selected;
 const forecast=(orbital?.passes||[]).find(p=>sameWatchPass(chosen,p));
 const p=forecast||chosen;
 const start=Date.parse(p.aos),end=Date.parse(p.los);
 const over=now>=end;
 const current=available.some(q=>sameWatchPass(p,q));
 const active=now>=start&&!over&&current;
 const c=over&&watchCapture(p,archive?.captures||[]);
 const state=stationSample;
 const sampleTime=Date.parse(state?.sampled_utc);
 const telemetryTime=Date.parse(state?.telemetry_utc);
 const fresh=state?.connected&&sampleTime<=now+10000&&now-sampleTime<90000;
 const receiving=active&&fresh&&sampleTime>=start&&sampleTime<=end&&state.satdump_running
   &&(state.phase==='receiving'||state.frames_growing);
 const freshLock=receiving&&telemetryTime>=start&&telemetryTime<=Math.min(end,now+10000)&&now-telemetryTime<90000;

 $('watchTitle').textContent='Meteor '+p.satellite;
 $('watchDate').textContent=date(p.aos)+' · Philippine time';
 $('watchPhase').textContent=c?'Capture published':over?'Pass ended':!current?'Forecast unavailable':active?'Above 10° · predicted':'Upcoming · predicted';
 $('watchCountdown').textContent=over?'Pass recap':!current?'—':active?'Ends '+shortTime(p.los):countdown(p.aos);
 $('watchAos').textContent=shortTime(p.aos);
 $('watchPeak').textContent=shortTime(p.peak)+' · '+p.max_elevation.toFixed(1)+'°';
 $('watchLos').textContent=shortTime(p.los);
 const sat=active&&orbital?.satellites.find(s=>s.name===p.satellite);
 const point=sat&&sample(sat,now);
 $('watchPosition').textContent=point?point[3].toFixed(1)+'° elevation · '+point[4].toFixed(1)+'° azimuth':'';
 $('watchStation').hidden=!active;
 $('watchStationStatus').textContent=receiving?'Receiver recording':fresh?'No reception reported':'Awaiting station data';
 $('watchFrames').textContent=receiving&&Number.isFinite(state.frames)?fmt.format(state.frames):'—';
 $('watchLock').textContent=freshLock&&typeof state.frame_lock==='boolean'?(state.frame_lock?'Locked':'Unlocked'):'—';
 const key=c?.id||(over?(archive?'pending':'loading'):'');
 if(key!==passWatch.recordKey){
  passWatch.recordKey=key;
  const target=$('watchRecap');
  target.replaceChildren();
  if(c){
   const link=make('a','Open reception ↗','text-link');
   link.href='#'+new URLSearchParams({capture:c.id});
   target.append(make('span',fmt.format(c.unique_frames)+' distinct CADUs · '+captureOutcome(c)),link);
  }else if(over)target.textContent=archive?'No matching capture has been published. Check this link again for the recap.':'Checking the reception archive…';
 }
 const watchSatellite=orbital?.satellites.find(s=>s.name===p.satellite);
 $('watchOrbit').hidden=!forecast||now>Date.parse(orbital.valid_until_utc)
   ||!sample(watchSatellite,Date.parse(p.peak));
 $('watchOrbit').onclick=()=>previewWatchOrbit(p);
 $('watchCalendar').hidden=!current;
 $('watchCalendar').onclick=()=>exportCalendar(p);
}

function renderPassNight(now){
 const hour=3600000;
 const day=24*hour;
 const start=Math.floor((now+manilaOffset-6*hour)/day)*day-manilaOffset+(18+24*passWatch.night)*hour;
 const end=start+12*hour;
 const forecast=orbital&&now<=Date.parse(orbital.valid_until_utc)&&now>=Date.parse(orbital.generated_utc)-300000;
 const passes=forecast?(orbital.passes||[]).filter(p=>Date.parse(p.los)>start&&Date.parse(p.aos)<end):[];
 const key=[start,forecast,...passes.map(passLink)].join('|');
 if(passWatch.nightKey===key)return;
 passWatch.nightKey=key;
 $('nightDate').textContent=date(start)+' · 6 PM–6 AM PHT';
 $('nightBefore').disabled=passWatch.night===0;
 $('nightAfter').disabled=passWatch.night===1;
 $('nightEmpty').textContent=passes.length?'':forecast?'No passes in this window in the current forecast.':'Waiting for an up-to-date forecast.';
 const svg=$('nightChart');
 svg.replaceChildren();
 const ns='http://www.w3.org/2000/svg';
 function node(tag,attributes){
  const e=document.createElementNS(ns,tag);
  for(const [k,v] of Object.entries(attributes))e.setAttribute(k,v);
  return e;
 }
 const x=t=>36+888*(t-start)/(end-start);
 for(const [i,label] of ['6 PM','8 PM','10 PM','12 AM','2 AM','4 AM','6 AM'].entries()){
  const at=x(start+i*2*hour);
  svg.append(node('line',{x1:at,x2:at,y1:12,y2:116,class:'night-grid'}));
  const text=node('text',{x:at,y:137,'text-anchor':'middle'});
  text.textContent=label;
  svg.append(text);
 }
 const baseline=116;
 svg.append(node('line',{x1:36,y1:baseline,x2:924,y2:baseline,class:'night-grid'}));
 const list=$('nightPasses');
 list.replaceChildren();
 for(const p of passes){
  const [a,m,l]=[p.aos,p.peak,p.los].map(v=>Math.min(924,Math.max(36,x(Date.parse(v)))));
  const top=baseline-p.max_elevation;
  const title='Meteor '+p.satellite+' · '+shortTime(p.peak)+' · '+p.max_elevation.toFixed(1)+'°';
  const d='M '+a+' '+baseline+' Q '+a+' '+top+' '+m+' '+top+' Q '+l+' '+top+' '+l+' '+baseline;
  const link=node('a',{href:passLink(p),class:'night-arc','data-satellite':p.satellite,'aria-label':title,tabindex:'-1'});
  link.append(node('path',{d,class:'night-hit'}),node('path',{d,class:'night-stroke'}),node('circle',{cx:m,cy:top,r:3}));
  link.addEventListener('click',event=>openNightOrbit(event,p));
  svg.append(link);
  const item=make('li'),action=make('a',title,'text-link');
  action.href=passLink(p);
  action.onclick=event=>openNightOrbit(event,p);
  item.append(action);
  list.append(item);
 }
}

function initPassWatch(){
 $('nightBefore').onclick=()=>{passWatch.night=0;renderPassNight(Date.now())};
 $('nightAfter').onclick=()=>{passWatch.night=1;renderPassNight(Date.now())};
 // Handle repeated activation of the same permalink as well as history navigation.
 document.addEventListener('click',e=>{
  const link=e.target.closest?.('a[href^="#watch="]');
  if(!link||link.hash!==location.hash||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  const p=linkedPass(new URLSearchParams(link.hash.slice(1)).get('watch'));
  if(p){e.preventDefault();showPassWatch(p)}
 });
}
