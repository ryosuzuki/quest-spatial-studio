import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
try {
 const p=await b.newPage({viewport:{width:1440,height:1500}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(process.env.TEST_URL || 'http://127.0.0.1:8766/');await p.waitForFunction(()=>window.replay?.ready);
 await p.evaluate(()=>window.replay.at(5.1));
 // Test actual TransformControls object-change event propagation to the composite inputs.
 await p.evaluate(()=>{const r=window.replay;r.anchor.position.set(.3,.8,-1.2);r.twin.gizmo.dispatchEvent({type:'objectChange'});});
 assert.equal(await p.locator('#x').inputValue(),'0.3000');assert.equal(await p.locator('#y').inputValue(),'0.8000');
 const saved=await p.evaluate(()=>window.replay.placement());assert.deepEqual(saved.position,[.3,.8,-1.2]);
 // Fixture geometry is explicitly synthetic; never a substitute for the scanned home.
 const fixture={version:1,coordinateSystem:'three-rh-y-up-meters',parts:[{label:'TEST_PLANE',source:'synthetic-test-fixture',vertices:[-1,0,-1,1,0,-1,1,0,1,-1,0,1],triangles:[0,1,2,0,2,3]}]};
 await p.evaluate(doc=>window.replay.loadRoomGeometry(doc),fixture);await p.locator('#occlude').check();
 const state=await p.evaluate(()=>window.replay.placement());assert.equal(state.roomGeometry.parts[0].label,'TEST_PLANE');
 await p.evaluate(state=>window.replay.loadPlacement(state),state);
 assert.equal(await p.evaluate(()=>window.replay.placement().roomGeometry.parts.length),1);
 const invalid=await p.evaluate(()=>{try{window.replay.loadRoomGeometry({version:1,coordinateSystem:'Unity',parts:[]});return false;}catch{return true;}});assert.ok(invalid);
 assert.deepEqual(errors,[]);await p.screenshot({path:'/tmp/twin-editor-test.png',fullPage:true});
 console.log('PASS: dual view, transform-event propagation, room geometry load/round-trip, rejection of wrong coordinates; synthetic camera path loaded. XR not verified.');
} finally {await b.close();}
