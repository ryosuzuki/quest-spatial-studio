import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {setPose,frameAt} from './math.mjs';
import {createTwin,roomFromGeometry} from './twin.mjs';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
const sessionURL=new URL(params.get('session')||'./sessions/demo/session.json',location.href);
const renderer=new THREE.WebGLRenderer({canvas:$('stage'),antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),anchor=new THREE.Group();scene.add(anchor);
const pmrem=new THREE.PMREMGenerator(renderer);const roomEnv=new RoomEnvironment();scene.environment=pmrem.fromScene(roomEnv,.04).texture;roomEnv.dispose();pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xddefff,0x485442,2));const sun=new THREE.DirectionalLight(0xffe5c8,3);sun.position.set(2,5,3);scene.add(sun);
// A grounded, recognizable calibration object. Not a claim of final AR art direction.
const body=new THREE.Mesh(new THREE.BoxGeometry(.45,.45,.45),new THREE.MeshStandardMaterial({color:0xd99c56,metalness:.3,roughness:.25}));body.position.y=.225;anchor.add(body);
const ring=new THREE.Mesh(new THREE.TorusGeometry(.34,.018,16,100),new THREE.MeshStandardMaterial({color:0xa8ddcb,metalness:.65,roughness:.22}));ring.rotation.x=Math.PI/2;ring.position.y=.035;anchor.add(ring);
let session,index=0,playing=false,start=0,startT=0,requested=0,room=null,modelName='calibration-cube',roomName=null,modelData=null,roomData=null;
const textures=new Map();
let roomGeometry=null,audioTrack=null;
const twin=createTwin({canvas:$('twin'),scene,camera,anchor,getRoom:()=>room,renderVideo:()=>renderer.render(scene,camera),onMove:pos=>{['x','y','z'].forEach((k,i)=>$(k).value=pos.toArray()[i].toFixed(4));update();}});
function placement(){return {version:1,position:['x','y','z'].map(k=>Number($(k).value)),scale:Number($('scale').value),yaw:Number($('yaw').value),visible:$('visible').checked,model:modelName,room:roomName,modelData,roomData,roomGeometry,occlude:$('occlude').checked};}
function applyPlacement(p){if(p.version!==1||!Array.isArray(p.position)||p.position.length!==3||![...p.position,p.scale,p.yaw].every(Number.isFinite)||p.scale<=0)throw Error('Invalid placement');['x','y','z'].forEach((k,i)=>$(k).value=p.position[i]);$('scale').value=p.scale;$('yaw').value=p.yaw;$('visible').checked=p.visible!==false;update();}
function update(){const p=placement();anchor.position.fromArray(p.position);anchor.scale.setScalar(Math.max(.001,p.scale));anchor.rotation.y=THREE.MathUtils.degToRad(p.yaw);anchor.visible=p.visible;twin.helper.visible=false;renderer.render(scene,camera);twin.render();}
async function texture(i){if(textures.has(i))return textures.get(i);const tx=await new THREE.TextureLoader().loadAsync(new URL(session.frames[i].image,sessionURL).href);tx.colorSpace=THREE.SRGBColorSpace;textures.set(i,tx);while(textures.size>8){const key=textures.keys().next().value;if(key===i)break;textures.get(key).dispose();textures.delete(key);}return tx;}
async function setFrame(i){const ticket=++requested;const tx=await texture(i);if(ticket!==requested)return;index=i;scene.background=tx;twin.setHandTime(session.frames[i].timestampUs);setPose(camera,session.frames[i],session.intrinsics);$('timeline').value=session.frames[i].t;$('time').textContent=session.frames[i].t.toFixed(2)+' s';update();}
async function at(t){return setFrame(frameAt(session.frames,t));}
function pause(){audioTrack?.pause();playing=false;$('play').textContent='Play';}
$('play').onclick=()=>{if(playing){pause();return;}playing=true;start=performance.now();startT=Number($('timeline').value);if(startT>=session.frames.at(-1).t)startT=0;$('play').textContent='Pause';tick();};
function syncAudio(t){if(!audioTrack)return;const target=t-session.audio.startRelativeToVideoSeconds;if(target<0||!$('audio-enabled').checked){audioTrack.pause();return;}if(Math.abs(audioTrack.currentTime-target)>.3)audioTrack.currentTime=target;if(audioTrack.paused)audioTrack.play().catch(()=>{});}
async function tick(){if(!playing)return;const t=startT+(performance.now()-start)/1000;await at(Math.min(t,session.frames.at(-1).t));syncAudio(t);if(t>=session.duration){pause();return;}requestAnimationFrame(tick);}
$('timeline').oninput=()=>{pause();at(Number($('timeline').value)).catch(fail);};
['x','y','z','scale','yaw','visible'].forEach(k=>$(k).oninput=update);
$('stage').onclick=e=>{pause();const r=e.target.getBoundingClientRect();const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);const point=new THREE.Vector3();const plane=new THREE.Plane(new THREE.Vector3(0,1,0),-Number($('plane').value));if(ray.ray.intersectPlane(plane,point)){['x','y','z'].forEach((k,i)=>$(k).value=point.toArray()[i].toFixed(4));update();}};
const loader=new GLTFLoader();
async function glb(file,isRoom){pause();const data=await file.arrayBuffer();const encoded=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});const g=await loader.parseAsync(data,'');if(isRoom){if(room)scene.remove(room);room=g.scene;roomName=file.name;roomData=encoded;roomGeometry=null;scene.add(room);occlusion();}else{anchor.clear();anchor.add(g.scene);modelName=file.name;modelData=encoded;}update();}
function occlusion(){if(!room)return;room.traverse(o=>{if(o.isMesh){o.material=new THREE.MeshBasicMaterial({color:0x648c83,wireframe:!$('occlude').checked,colorWrite:!$('occlude').checked,side:THREE.DoubleSide});o.renderOrder=-1;}});update();}
$('room-json').onchange=async e=>{try{const doc=JSON.parse(await e.target.files[0].text());loadRoomGeometry(doc);roomName=e.target.files[0].name;}catch(err){fail(err);}};
function loadRoomGeometry(doc){const next=roomFromGeometry(doc);if(room)scene.remove(room);room=next;scene.add(room);roomGeometry=doc;roomData=null;roomName='Quest room geometry';occlusion();}
$('occlude').onchange=occlusion;for(const [id,isRoom]of [['model',false],['room',true]])$(id).onchange=e=>glb(e.target.files[0],isRoom).catch(fail);
$('save').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(placement(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='placement.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
async function loadPlacement(p){for(const [key,name,isRoom] of [['modelData','model',false],['roomData','room',true]]){if(p[key]){if(!p[key].startsWith('data:'))throw Error('Only embedded local GLBs accepted');const b=await(await fetch(p[key])).blob();await glb(new File([b],p[name]||'asset.glb'),isRoom);}}if(p.roomGeometry)loadRoomGeometry(p.roomGeometry);applyPlacement(p);$('occlude').checked=!!p.occlude;occlusion();}
$('load').onchange=async e=>{try{await loadPlacement(JSON.parse(await e.target.files[0].text()));}catch(err){fail(err);}};
function fail(e){$('status').textContent='Error: '+e.message;console.error(e);}
try{const res=await fetch(sessionURL);if(!res.ok)throw Error('Session not found — run the importer or demo generator.');session=await res.json();if(session.version!==1||!session.frames.length)throw Error('Unsupported/empty session');renderer.setSize(session.intrinsics.width,session.intrinsics.height,false);$('timeline').max=session.frames.at(-1).t;$('badge').textContent=session.synthetic?'Synthetic pipeline test':'Quest recording · calibration pending';$('details').textContent=`${session.frames.length} frames · ${session.duration.toFixed(2)} seconds · ${session.intrinsics.width} × ${session.intrinsics.height}`;$('status').textContent=session.synthetic?'Synthetic input, not a recording of your home. Physical Quest alignment has not been tested.':`Orientation: ${session.sourceRowOrder}. Verify a static target before trusting alignment. Maximum frame gap: ${session.report.maxGapSeconds.toFixed(3)} s.`;twin.setSession(session);
if(session.roomGeometryFile){loadRoomGeometry(await(await fetch(new URL(session.roomGeometryFile,sessionURL))).json());}
if(session.handsFile&&session.captureSchemaFile){
  const sampleText=await(await fetch(new URL(session.handsFile,sessionURL))).text();
  const schema=await(await fetch(new URL(session.captureSchemaFile,sessionURL))).json();
  const skeletons={};for(const side of ['left','right']){const file=session[side+'SkeletonFile'];if(file)skeletons[side]=await(await fetch(new URL(file,sessionURL))).json();}
  const shown=twin.setHands(sampleText.trim().split('\n').filter(Boolean).map(s=>JSON.parse(s)),schema,skeletons);
  $('hands-status').textContent=shown?'Hand joints loaded · timing alignment requires verification':'Raw hand log retained; this skeleton convention is not visualized.';
}
if(session.audio){audioTrack=new Audio(new URL(session.audio.file,sessionURL).href);$('audio-enabled').disabled=false;$('audio-status').textContent='Audio available · sync estimate; verify with a clap';}
await setFrame(0);window.replay={ready:true,setFrame,at,placement,applyPlacement,loadPlacement,loadRoomGeometry,session,renderer,camera,anchor,twin};}catch(e){fail(e);window.replay={ready:false,error:e.message};}
