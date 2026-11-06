import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {upload} from '@vercel/blob/client';
async function main(){
const [input,secretPath,statePath,base]=process.argv.slice(2);
if(!input||!secretPath||!statePath||!/^https:\/\//.test(base||''))throw Error('Expected input, secret file, state file, HTTPS origin');
const token=fs.readFileSync(secretPath,'utf8').trim();
const payload=JSON.parse(fs.readFileSync(input,'utf8'));
const cache=fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath,'utf8')):{};
async function asset(relative){
 if(/^https:\/\//.test(relative))return relative;
 const file=path.resolve(payload.root,decodeURIComponent(relative));if(!file.startsWith(path.resolve(payload.root)+path.sep))throw Error('Asset outside export');
 const bytes=fs.readFileSync(file),hash=createHash('sha256').update(bytes).digest('hex');
 if(cache[hash])return cache[hash];
 const filename=path.basename(file).replace(/[^a-zA-Z0-9_.()-]/g,'_');
 const ext=path.extname(file).toLowerCase();const contentType={'.png':'image/png','.webp':'image/webp','.json':'application/json','.log':'text/plain','.md':'text/plain','.jsonl':'text/plain'}[ext]||'application/octet-stream';
 const blob=await upload(`captures/${payload.capture.id}/${hash}/${filename}`,bytes,{access:'public',handleUploadUrl:base+'/api/upload',headers:{Authorization:`Bearer ${token}`},multipart:bytes.length>4000000,contentType});
 cache[hash]=blob.url;fs.writeFileSync(statePath+'.tmp',JSON.stringify(cache));fs.renameSync(statePath+'.tmp',statePath);console.error('Published',filename);return blob.url;
}
for(const image of payload.capture.images){image.url=await asset(image.url);image.preview=await asset(image.preview);}
for(const evidence of payload.capture.evidence)evidence.url=await asset(evidence.url);
payload.capture.featured=payload.capture.images.find(i=>i.name===payload.capture.featured?.name)||payload.capture.images[0]||null;
const response=await fetch(base+'/api/publish',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({kind:'capture',data:payload.capture})});
if(!response.ok)throw Error(`Publish failed: ${response.status} ${await response.text()}`);
console.log(JSON.stringify({ok:true,id:payload.capture.id}));

}
main().catch(error=>{console.error(error.message);process.exit(1)});
