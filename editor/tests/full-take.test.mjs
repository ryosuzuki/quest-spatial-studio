import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalog} from '../src/full-take-catalog.mjs';
import {modes} from '../src/full-take-art.mjs';
import {readFileSync} from 'node:fs';
import {frameAt} from '../src/math.mjs';
test('50 distinct full-source experiences, not short excerpts',()=>{
 assert.equal(catalog.length,50);assert.equal(new Set(catalog.map(c=>c.mode)).size,50);
 for(const c of catalog){assert.equal(c.start,0);assert.equal(c.sourceSpeed,1);assert.equal(c.duration,95.2);assert.equal(c.beats.length,4);assert(modes.includes(c.mode));}
});
test('10fps sampling includes first and last recorded frames, exactly paired',()=>{
 const s=JSON.parse(readFileSync(new URL('../sessions/quest-215403/session.json',import.meta.url)));
 // Last exposure at 95.111227s requires the last output frame to sample that exposure explicitly.
 const times=Array.from({length:952},(_,i)=>i===951?s.frames.at(-1).t:i/10);
 assert.equal(frameAt(s.frames,times[0]),0);assert.equal(frameAt(s.frames,times.at(-1)),914);
 let prev=-1;for(const t of times){let i=frameAt(s.frames,t);assert(i>=prev);assert(s.frames[i].t<=t);prev=i;}
});
