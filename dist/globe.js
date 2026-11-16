'use strict';

function createOrbitGlobe(canvas, follow, manila) {
 const context=canvas.getContext('2d');
 const raster=document.createElement('canvas');
 const surface=raster.getContext('2d');
 const radians=Math.PI/180;
 const earthRadiusKm=6371;
 let texture, frame, renderedView, view;
 let mode='follow', latitude=14.6, longitude=121;
 let drag, animation;

 const image=new Image();
 image.onload=()=>{
  const source=document.createElement('canvas');
  source.width=image.naturalWidth;
  source.height=image.naturalHeight;
  const pixels=source.getContext('2d');
  pixels.drawImage(image,0,0);
  texture=pixels.getImageData(0,0,source.width,source.height);
  renderedView=null;
  schedule();
 };
 image.src='earth-blue-marble.jpg';

 function setMode(next) {
  mode=next;
  follow.setAttribute('aria-pressed',String(next==='follow'));
  manila.setAttribute('aria-pressed',String(next==='manila'));
  schedule();
 }
 function schedule() {
  if(animation)return;
  animation=requestAnimationFrame(()=>{
   animation=null;
   draw();
  });
 }
 function turn(deltaLatitude,deltaLongitude) {
  latitude=Math.max(-89,Math.min(89,latitude+deltaLatitude));
  longitude=(longitude+deltaLongitude+540)%360-180;
  setMode('free');
 }

 follow.onclick=()=>setMode('follow');
 manila.onclick=()=>setMode('manila');
 canvas.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0)return;
  drag={x:event.clientX,y:event.clientY};
  canvas.setPointerCapture(event.pointerId);
 });
 canvas.addEventListener('pointermove',event=>{
  if(!event.isPrimary||!drag)return;
  turn((event.clientY-drag.y)*.55,(drag.x-event.clientX)*.55);
  drag={x:event.clientX,y:event.clientY};
 });
 canvas.addEventListener('lostpointercapture',()=>{drag=null});
 canvas.addEventListener('keydown',event=>{
  const directions={ArrowUp:[8,0],ArrowDown:[-8,0],ArrowLeft:[0,-8],ArrowRight:[0,8]};
  const direction=directions[event.key];
  if(!direction)return;
  event.preventDefault();
  turn(...direction);
 });
 new ResizeObserver(schedule).observe(canvas);

 // Inverse orthographic projection samples the equirectangular image on a unit sphere.
 function paintEarth(size,centerLatitude,centerLongitude) {
  const key=[size,centerLatitude,centerLongitude].join('/');
  if(renderedView===key||!texture)return;
  renderedView=key;
  if(raster.width!==size||raster.height!==size){
   raster.width=raster.height=size;
   frame=surface.createImageData(size,size);
  }
  const {data}=frame;
  const sinLat=Math.sin(centerLatitude), cosLat=Math.cos(centerLatitude);
  const radius=size/2;
  for(let y=0;y<size;y++){
   const north=1-(y+.5)/radius;
   for(let x=0;x<size;x++){
    const east=(x+.5)/radius-1;
    const depthSquared=1-east*east-north*north;
    const i=4*(y*size+x);
    if(depthSquared<=0)continue;
    const toward=Math.sqrt(depthSquared);
    const lat=Math.asin(Math.max(-1,Math.min(1,north*cosLat+toward*sinLat)));
    const lon=centerLongitude+Math.atan2(east,toward*cosLat-north*sinLat);
    const u=((lon/(2*Math.PI)+1.5)%1)*texture.width;
    const v=Math.min(texture.height-1,(.5-lat/Math.PI)*texture.height);
    const j=4*(Math.floor(v)*texture.width+Math.floor(u));
    const light=.68+.36*Math.max(0,-.34*east+.45*north+.82*toward);
    data[i]=texture.data[j]*light;
    data[i+1]=texture.data[j+1]*light;
    data[i+2]=texture.data[j+2]*light;
    data[i+3]=Math.min(255,depthSquared*size*150);
   }
  }
  surface.putImageData(frame,0,0);
 }

 function drawSatellite(x,y) {
  context.save();
  context.translate(x,y);
  context.rotate(-Math.PI/6);
  context.strokeStyle='#07131b';
  context.lineWidth=3;
  context.fillStyle='#9de7f1';
  for(const panel of [-14,5]){
   context.strokeRect(panel,-4,9,8);
   context.fillRect(panel,-4,9,8);
   context.fillStyle='#326d83';
   context.fillRect(panel+4,-4,1,8);
   context.fillStyle='#9de7f1';
  }
  context.fillStyle='#f4fbff';
  context.strokeRect(-4,-5,8,10);
  context.fillRect(-4,-5,8,10);
  context.restore();
 }

 function draw() {
  if(!context||!view)return;
  const rect=canvas.getBoundingClientRect();
  const width=rect.width, height=rect.height;
  if(!width||!height)return;
  const scale=Math.min(devicePixelRatio||1,2);
  const pixelWidth=Math.round(width*scale), pixelHeight=Math.round(height*scale);
  if(canvas.width!==pixelWidth||canvas.height!==pixelHeight){
   canvas.width=pixelWidth;
   canvas.height=pixelHeight;
  }
  context.setTransform(scale,0,0,scale,0,0);
  context.clearRect(0,0,width,height);

  const {point,track,station}=view;
  if(mode!=='free'){
   const center=mode==='follow'&&point?point:station;
   latitude=center[0];
   longitude=center[1];
   if(mode==='follow'&&point){
    latitude=Math.max(-87,Math.min(87,latitude+11));
    longitude=(longitude+554)%360-180;
   }
  }

  // Use the same half-degree camera angles for the image, track, and markers.
  const centerLatitude=Math.round(latitude*2)/2*radians;
  const centerLongitude=Math.round(longitude*2)/2*radians;
  const sinLat=Math.sin(centerLatitude),cosLat=Math.cos(centerLatitude);
  const cx=width/2,cy=height/2;
  const radius=Math.min(cx,cy)*.88;
  const size=Math.max(2,Math.round(Math.min(480,2*radius*scale)));
  paintEarth(size,centerLatitude,centerLongitude);

  context.fillStyle='#163b54';
  context.beginPath();
  context.arc(cx,cy,radius,0,2*Math.PI);
  context.fill();
  if(texture)context.drawImage(raster,cx-radius,cy-radius,radius*2,radius*2);
  context.strokeStyle='#91bfda73';
  context.lineWidth=1;
  context.stroke();

  function project(lat,lon,distance=1){
   const phi=lat*radians,delta=lon*radians-centerLongitude;
   const cosPhi=Math.cos(phi),sinPhi=Math.sin(phi),cosDelta=Math.cos(delta);
   return {
    x:cx+radius*distance*cosPhi*Math.sin(delta),
    y:cy-radius*distance*(cosLat*sinPhi-sinLat*cosPhi*cosDelta),
    facing:sinLat*sinPhi+cosLat*cosPhi*cosDelta>=0
   };
  }

  context.beginPath();
  let visible=false;
  for(const sample of track){
   if(!sample){visible=false;continue}
   const projected=project(sample[0],sample[1]);
   if(projected.facing){
    if(visible)context.lineTo(projected.x,projected.y);
    else context.moveTo(projected.x,projected.y);
   }
   visible=projected.facing;
  }
  context.strokeStyle='#05161b';
  context.lineWidth=3;
  context.stroke();
  context.strokeStyle='#97f0c1';
  context.lineWidth=1.3;
  context.stroke();

  const site=project(...station);
  if(site.facing){
   context.beginPath();
   context.arc(site.x,site.y,3.5,0,2*Math.PI);
   context.fillStyle='#ffe2a6';
   context.fill();
   context.strokeStyle='#242322';
   context.stroke();
   context.font='11px system-ui';
   context.textAlign=site.x>width-50?'right':'left';
   context.lineWidth=3;
   const labelX=site.x+(site.x>width-50?-7:7);
   context.strokeText('Manila',labelX,site.y+13);
   context.fillText('Manila',labelX,site.y+13);
  }

  if(point){
   const ground=project(point[0],point[1]);
   if(ground.facing){
    const spacecraft=project(point[0],point[1],1+point[2]/earthRadiusKm);
    drawSatellite(Math.max(16,Math.min(width-16,spacecraft.x)),Math.max(15,Math.min(height-15,spacecraft.y)));
   }
  }
 }

 return function update(next){
  view=next;
  schedule();
 };
}
