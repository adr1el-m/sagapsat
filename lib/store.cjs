const {get,put}=require('@vercel/blob');
const fs=require('node:fs');
const path=require('node:path');
const {timingSafeEqual}=require('node:crypto');
function authorized(req){const expected=process.env.SAGAPSAT_INGEST_SECRET||'';const value=(req.headers.authorization||'').replace(/^Bearer /,'');return expected.length>20&&Buffer.byteLength(value)===Buffer.byteLength(expected)&&timingSafeEqual(Buffer.from(value),Buffer.from(expected));}
async function readVersion(kind){try{const result=await get(`state/${kind}.json`,{access:'public'});if(result?.statusCode===200)return {data:await new Response(result.stream).json(),etag:result.blob.etag};return null;}catch(e){if(e.constructor.name==='BlobNotFoundError')return null;throw e;}}
async function readState(kind){return (await readVersion(kind))?.data||null;}
async function writeState(kind,data,etag){const options={access:'public',addRandomSuffix:false,allowOverwrite:etag!==null,contentType:'application/json',cacheControlMaxAge:60};if(etag)options.ifMatch=etag;return put(`state/${kind}.json`,JSON.stringify(data),options);}
function fallback(kind){return JSON.parse(fs.readFileSync(path.join(process.cwd(),'dist',`${kind}.json`),'utf8'));}
function reply(res,status,data){res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));}
module.exports={authorized,readState,readVersion,writeState,fallback,reply};
