const {test}=require('node:test');const assert=require('node:assert/strict');
const {authorized}=require('../lib/store.cjs');
test('station write authorization rejects absent, altered, and malformed credentials',()=>{process.env.SAGAPSAT_INGEST_SECRET='a'.repeat(64);assert.equal(authorized({headers:{}}),false);assert.equal(authorized({headers:{authorization:'Bearer '+'b'.repeat(64)}}),false);assert.equal(authorized({headers:{authorization:'Bearer '+'é'.repeat(64)}}),false);assert.equal(authorized({headers:{authorization:'Bearer '+'a'.repeat(64)}}),true)});
test('publication is unavailable without configured publisher credentials',()=>{delete process.env.SAGAPSAT_INGEST_SECRET;assert.equal(authorized({headers:{authorization:'Bearer test'}}),false)});
