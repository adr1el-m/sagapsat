/* Deterministic interpretation examples. These compare estimates, not gauge truth. */
function assessInterpretation(observation,mode='weighted'){
 if(observation.geography!=='provider_geolocated')return {status:'abstain',title:'Geographic measurement withheld',message:'This is a genuine local reception, but independent pixel registration is unresolved. A projected image and visible study boxes do not validate cloud or rainfall measurements.',saturated:false,values:[]};
 const values=observation.modes[mode]||[];
 if(values.length!==3||values.some(r=>!Number.isFinite(r.west)||!Number.isFinite(r.east)))return {status:'abstain',title:'Missing evidence: keep the result open',message:'A source or interval is missing. Missing data are not zero rainfall.',saturated:false,values:[]};
 const delta=values.map(r=>r.east-r.west),positive=delta.every(v=>v>0),negative=delta.every(v=>v<0),dry=values.every(r=>r.west===0&&r.east===0);
 const saturated=observation.cloud_east===1&&observation.cloud_west===1;
 return {status:positive?'east':negative?'west':dry?'zero':'mixed',title:positive?'All three estimate more eastern rain':negative?'All three estimate more western rain':dry?'All three sampled estimates are zero':'The rainfall estimates disagree in direction',message:(positive||negative?'Directional agreement is specific to this hour, product set and sampling method. It is not independent ground validation or a terrain-effect result.':dry?'These zero estimates do not establish rain-detection accuracy. Retain the date and method rather than selecting a wetter case.':'Keep every product in view. This comparison cannot determine which estimate is closest to truth.')+(saturated?' Both cloud-occupancy values are 100%; the selected descriptor has no east–west contrast.':'')+(observation.flow_group!=='easterly'?' The offshore flow does not meet the original easterly screen; do not apply its windward interpretation.':''),saturated,values};
}
if(typeof module!=='undefined')module.exports={assessInterpretation};
if(typeof document!=='undefined'){
 (async()=>{
  const host=document.getElementById('interpretationTool');if(!host)return;
  const select=document.getElementById('interpretationCase'),method=document.getElementById('interpretationMethod'),status=document.getElementById('interpretationStatus'),body=document.getElementById('interpretationRows'),note=document.getElementById('interpretationNote'),checks=document.getElementById('interpretationChecks');
  try{
   const response=await fetch('research/interpretation-cases.json');if(!response.ok)throw Error('Unavailable cases');const data=await response.json();
   for(const c of data.cases){const option=document.createElement('option');option.value=c.id;option.textContent=c.label;select.append(option);}
   select.value='2026-09-17_16';
   function render(){
    const c=data.cases.find(c=>c.id===select.value),result=assessInterpretation(c,method.value);method.disabled=c.geography!=='provider_geolocated';status.textContent=result.title;status.dataset.result=result.status;note.textContent=result.message;body.replaceChildren();
    for(const r of result.values){const row=document.createElement('tr');for(const value of [r.product.replaceAll('_',' '),r.west.toFixed(2),r.east.toFixed(2),(r.east-r.west>=0?'+':'')+(r.east-r.west).toFixed(2)]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}body.append(row);}
    checks.replaceChildren();
    for(const value of [c.geography==='provider_geolocated'?'Geography: provider coordinates; not an independently measured navigation error':'Geography: local pixel registration unresolved',c.geography==='provider_geolocated'?'Timing: cloud snapshot within its matched UTC rainfall hour':'Timing: embedded scans agree with the capture window',result.saturated?'Cloud descriptor: saturated in both boxes':c.cloud_east===null?'Cloud descriptor: not measured for this local image':`Cloud occupancy: west ${(100*c.cloud_west).toFixed(1)}%, east ${(100*c.cloud_east).toFixed(1)}%`,`Flow: ${c.flow_group.replaceAll('_',' ')}`]){const li=document.createElement('li');li.textContent=value;checks.append(li);}
   }
   select.addEventListener('change',render);method.addEventListener('change',render);render();
  }catch{status.textContent='Worked cases unavailable';note.textContent='Use the downloadable evidence tables. No result is inferred while case data are unavailable.';}
 })();
}
