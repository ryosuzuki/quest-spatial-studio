import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const b=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
try{
 const p=await b.newPage({viewport:{width:1600,height:1200}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(process.env.TEST_URL||'http://127.0.0.1:8766/');await p.waitForFunction(()=>window.replay?.ready);
 const fixture={version:1,coordinateSystem:'three-rh-y-up-meters',parts:[{label:'DISPLAY_TEST',source:'synthetic-display-test',vertices:[-5,-3,-1,5,-3,-1,5,4,-1,-5,4,-1],triangles:[0,1,2,0,2,3]}]};
 await p.evaluate(doc=>window.replay.loadRoomGeometry(doc),fixture);
 const material=()=>p.evaluate(()=>{let m;window.replay.twin.helper.parent.traverse(o=>{if(o.name==='DISPLAY_TEST')m=o.material;});return {color:m.colorWrite,depth:m.depthWrite};});
 assert.equal(await p.locator('#room-wireframe').isChecked(),false);assert.deepEqual(await material(),{color:false,depth:false});
 const hidden=await p.locator('#stage').screenshot();const twin=await p.locator('#twin').screenshot();
 await p.locator('#room-wireframe').check();assert.deepEqual(await material(),{color:true,depth:false});assert.notDeepEqual(await p.locator('#stage').screenshot(),hidden);
 assert.deepEqual(await p.locator('#twin').screenshot(),twin,'Twin room visualization must be independent of composite wireframe toggle');
 await p.locator('#occlude').check();assert.deepEqual(await material(),{color:false,depth:true});
 const saved=await p.evaluate(()=>window.replay.placement());assert.equal(saved.roomWireframe,true);
 await p.locator('#room-wireframe').uncheck();await p.evaluate(state=>window.replay.loadPlacement(state),saved);assert.equal(await p.locator('#room-wireframe').isChecked(),true);
 assert.deepEqual(errors,[]);console.log('PASS room display: default hidden/no depth; optional wireframe; independent twin; depth-only occlusion; placement round-trip');
}finally{await b.close();}
