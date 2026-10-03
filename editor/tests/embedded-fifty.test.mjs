import test from 'node:test';import assert from 'node:assert/strict';
import {catalog} from '../src/embedded-fifty-catalog.mjs';
import {frameAt} from '../src/math.mjs';
test('every authored video stays inside accepted capture and has a different behavior',()=>{assert.equal(catalog.length,50);assert.equal(new Set(catalog.map(c=>c.effect)).size,50);for(const c of catalog){assert.equal(c.capture,'20261002_215403');assert(c.start>=0&&c.start+c.duration*c.sourceSpeed<95.222245);assert(c.story.length>50);assert(c.eventBasis);}});
test('retiming keeps the camera on the same accepted RGB sample',()=>{const frames=[{t:0},{t:.1},{t:.23}];for(const speed of [.27,.35,.45,.5,1])for(let j=0;j<30;j++){const t=j*.01*speed,i=frameAt(frames,t);assert(frames[i].t<=t);if(i+1<frames.length)assert(frames[i+1].t>t);}});
test('recorded and authored event evidence remain distinct',()=>{for(const c of catalog.filter(c=>c.surface==='bottle'))assert.match(c.eventBasis,/recorded color/);assert.match(catalog[2].eventBasis,/authored/);assert.match(catalog[34].eventBasis,/authored/);assert.match(catalog[32].eventBasis,/recorded hand/);});
