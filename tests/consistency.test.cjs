const {test}=require('node:test');const assert=require('node:assert/strict');
const blobPath=require.resolve('@vercel/blob');require(blobPath);let current='v1';let saved={captures:[{id:'original'}]};let lastOptions;
class BlobPreconditionFailedError extends Error{}
class BlobAlreadyExistsError extends Error{}
require.cache[blobPath].exports={get:async(path,options)=>{assert.equal(options.headers['accept-encoding'],'identity');return {statusCode:200,stream:new Response(JSON.stringify(saved)).body,blob:{etag:'v1'}}},put:async(path,body,options)=>{lastOptions=options;if(options.ifMatch&&options.ifMatch!==current)throw new BlobPreconditionFailedError();if(!options.allowOverwrite)throw new BlobAlreadyExistsError();saved=JSON.parse(body);return {url:'https://example.public.blob.vercel-storage.com/'+path}}};
const {readVersion,writeState}=require('../lib/store.cjs');
test('a stale CDN snapshot cannot overwrite a newer archive',async()=>{const version=await readVersion('archive');current='v2';await assert.rejects(writeState('archive',{captures:[{id:'replacement'}]},version.etag),BlobPreconditionFailedError);assert.equal(saved.captures[0].id,'original');assert.equal(lastOptions.ifMatch,'v1')});
test('initial publication cannot overwrite an archive created concurrently',async()=>{await assert.rejects(writeState('archive',{captures:[]},null),BlobAlreadyExistsError);assert.equal(saved.captures.length,1)});
