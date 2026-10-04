import * as T from 'three';
import {frameAt,setPose} from './math.mjs';
import {catalog} from './full-take-catalog.mjs';
import {paintTheme} from './full-take-art.mjs';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const $=s=>document.querySelector(s),base='./sessions/quest-215403/';
const [session,room,trackDoc,handText]=await Promise.all([fetch(base+'session.json').then(r=>r.json()),fetch(base+'room-geometry.json').then(r=>r.json()),fetch('/audit/bottle-track.json').then(r=>r.json()),fetch(base+'hands.jsonl').then(r=>r.text())]);
if(session.name!=='20261002_215403'||session.synthetic||session.frames.length!==915)throw Error('Wrong source capture');
const hands=handText.trim().split('\n').map(JSON.parse),tracks=new Map(trackDoc.frames.map(r=>[r.frameIndex,r]));
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,alpha:true});renderer.setSize(640,640);renderer.outputColorSpace=T.SRGBColorSpace;
const out=$('#output'),ctx=out.getContext('2d'),scene=new T.Scene(),camera=new T.PerspectiveCamera(),ray=new T.Raycaster(),scan=new T.Group(),overlay=new T.Group(),dynamic=new T.Group();scene.add(overlay,dynamic);
for(const p of room.parts){if(p.label!=='GLOBAL_MESH')continue;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p.vertices,3));g.setIndex(p.triangles);g.computeVertexNormals();scan.add(new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide})));}scan.updateMatrixWorld(true);
const depths=new Map(),images=new Map();
async function img(url){if(images.has(url))return images.get(url);const im=await new Promise((ok,no)=>{const v=new Image();v.onload=()=>ok(v);v.onerror=()=>no(Error('Missing image '+url));v.src=url;});images.set(url,im);if(images.size>180)images.delete(images.keys().next().value);return im;}
async function depth(i){if(depths.has(i))return depths.get(i);const im=await img('/audit/registered-depth/'+String(i).padStart(6,'0')+'.png');const c=document.createElement('canvas');c.width=c.height=320;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0);const raw=x.getImageData(0,0,320,320).data;depths.set(i,raw);return raw;}
function axial(raw,u,v){const ds=[];for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const px=Math.floor(u*320)+dx,py=Math.floor(v*320)+dy;if(px<0||py<0||px>=320||py>=320)continue;const k=(py*320+px)*4;if(raw[k+2]&&(raw[k]||raw[k+1]))ds.push((raw[k]*256+raw[k+1])/1000);}ds.sort((a,b)=>a-b);return ds[Math.floor(ds.length*.5)]||null;}
function unproject(u,v,z){return new T.Vector3((u*session.intrinsics.width-session.intrinsics.cx)*z/session.intrinsics.fx,-(v*session.intrinsics.height-session.intrinsics.cy)*z/session.intrinsics.fy,-z).applyMatrix4(camera.matrixWorld);}
// Four manually identified physical corners, then lifted with measured depth and calibrated pose.
// Mesh provides surface normal, registered depth refines translation. No screen-space tracking of static surfaces.
const specs={
 wall:{t:46.6,uv:[[.12,.42],[.56,.42],[.56,.82],[.12,.82]],seed:[.34,.53]},
 fridge:{t:16,uv:[[.492,.242],[.714,.239],[.701,.531],[.476,.524]],seed:[.65,.39]},
 table:{t:4,uv:[[.33,.657],[.943,.744],[.943,.91],[.16,.765]],seed:[.54,.76],normal:[0,1,0]},
 shelf:{t:44,uv:[[.341,.44],[.67,.486],[.664,.64],[.325,.771]],seed:[.5,.55]},
 drawer:{t:56,uv:[[.115,.688],[.486,.758],[.455,.985],[.123,.935]],seed:[.3,.84]},
 window:{t:52,uv:[[.008,.29],[.48,.335],[.427,.868],[.008,.98]],seed:[.15,.45],meshOnly:true},
 floor:{t:82,uv:[[.39,.62],[.59,.63],[.79,.97],[.27,.97]],seed:[.49,.8],normal:[0,1,0]}
};
const depUniform={value:null};
function depthAware(mat){mat.onBeforeCompile=shader=>{shader.uniforms.realDepth=depUniform;shader.vertexShader='varying float surfaceDepth;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nsurfaceDepth=-mvPosition.z;');shader.fragmentShader='uniform sampler2D realDepth;varying float surfaceDepth;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nvec4 rd=texture2D(realDepth,gl_FragCoord.xy/640.0);float m=(rd.r*65280.0+rd.g*255.0)/1000.0;if(rd.b>.5&&m>.0&&m+.12<surfaceDepth)discard;');};return mat;}
const surfaces={};
for(const [name,s] of Object.entries(specs)){
 const i=frameAt(session.frames,s.t),f=session.frames[i],raw=await depth(i);setPose(camera,f,session.intrinsics);ray.setFromCamera(new T.Vector2(s.seed[0]*2-1,1-s.seed[1]*2),camera);const hit=ray.intersectObjects(scan.children)[0];if(!hit)throw Error('No room mesh at '+name);
 const z=axial(raw,...s.seed);const point=z&&!s.meshOnly?unproject(...s.seed,z):hit.point.clone();let n=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);if(s.normal)n.fromArray(s.normal);else{n.y=0;n.normalize();}if(n.dot(camera.position.clone().sub(point))<0)n.negate();
 const plane=new T.Plane().setFromNormalAndCoplanarPoint(n,point),vertices=s.uv.map(([u,v])=>{ray.setFromCamera(new T.Vector2(u*2-1,1-v*2),camera);const p=ray.ray.intersectPlane(plane,new T.Vector3());if(!p)throw Error('Invalid plane '+name);return p.addScaledVector(n,.018);});
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices.flatMap(p=>p.toArray()),3));g.setAttribute('uv',new T.Float32BufferAttribute([0,1,1,1,1,0,0,0],2));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();
 const canvas=document.createElement('canvas');canvas.width=canvas.height=768;const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;const mesh=new T.Mesh(g,depthAware(new T.MeshBasicMaterial({map:texture,transparent:true,side:T.DoubleSide,depthTest:false,depthWrite:false})));overlay.add(mesh);
 surfaces[name]={mesh,canvas,x:canvas.getContext('2d'),texture,vertices:vertices.map(p=>p.toArray()),normal:n.toArray(),sourceFrame:i,sourcePixel:s.seed,depth:z};
}
const assets={winter:await img('./assets/embedded-fifty/winter-garden.png'),botanical:await img('./assets/embedded-fifty/botanical-cutout.png').catch(()=>null)};
let bgTex,depTex,prev=-1,current=1,local=0,playing=false,busy=false,stamp=0;
const maskCanvas=document.createElement('canvas');maskCanvas.width=maskCanvas.height=640;const mx=maskCanvas.getContext('2d',{willReadFrequently:true});
function stateAt(f){const ms=Number(f.timestampUs)/1000;let lo=0,hi=hands.length-1;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(hands[mid].unixMs<=ms)lo=mid;else hi=mid-1;}const h=hands[lo],state={pinch:false,points:[],distance:null};if(Math.abs(h.unixMs-ms)>.15*1000)return state;for(const side of ['left','right']){const v=h[side];if(!v?.valid||!v.tracked||Math.abs(h.ovrSeconds-v.sampleTimestamp)>.15)continue;state.pinch||=!!v.pinches;const p=v.rootPosition;state.points.push({side,p:new T.Vector3(p.x,p.y,p.z)});}if(state.points.length===2)state.distance=state.points[0].p.distanceTo(state.points[1].p);return state;}
function clearDynamic(){for(const m of [...dynamic.children]){m.geometry?.dispose();m.material?.dispose();dynamic.remove(m);}}
function line3(points,color=0x9bf8d9){if(points.length<2)return;const g=new T.BufferGeometry().setFromPoints(points),m=new T.Line(g,new T.LineBasicMaterial({color,transparent:true,opacity:.85,depthTest:false}));dynamic.add(m);}
async function render(id,t,{plain=false}={}){
 const spec=catalog[id-1];if(!spec)throw Error('Unknown scenario');current=id;local=clamp(t,0,spec.duration);const sourceTime=local>=95.1?session.frames.at(-1).t:spec.start+local*(spec.sourceSpeed||1),i=frameAt(session.frames,sourceTime),f=session.frames[i];
 if(i!==prev){const [im,raw]=await Promise.all([img(base+f.image),depth(i)]);bgTex?.dispose();bgTex=new T.Texture(im);bgTex.colorSpace=T.SRGBColorSpace;bgTex.needsUpdate=true;scene.background=bgTex;
 const filled=new Uint8Array(raw);for(let y=1;y<319;y++)for(let xx=1;xx<319;xx++){const p=(y*320+xx)*4;if(raw[p+2])continue;let nearest=65536;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const k=((y+dy)*320+xx+dx)*4;if(raw[k+2])nearest=Math.min(nearest,raw[k]*256+raw[k+1]);}if(nearest<65536){filled[p]=nearest>>8;filled[p+1]=nearest&255;filled[p+2]=255;filled[p+3]=255;}}
 depTex?.dispose();depTex=new T.DataTexture(filled,320,320);depTex.flipY=true;depTex.needsUpdate=true;depTex.minFilter=T.NearestFilter;depTex.magFilter=T.NearestFilter;depUniform.value=depTex;prev=i;}
 setPose(camera,f,session.intrinsics);clearDynamic();const state=stateAt(f);state.trackHistory=trackDoc.frames.filter(r=>r.timeSeconds<=f.t&&r.timeSeconds>=spec.start);
 for(const s of Object.values(surfaces))s.mesh.visible=false;
 const name='table',target=surfaces.table;
 if(!plain){
  for(const [surface,s] of Object.entries(surfaces)){
   s.mesh.visible=true;paintTheme(s.x,spec,surface,sourceTime,state);s.texture.needsUpdate=true;
  }
 }
 renderer.render(scene,camera);ctx.clearRect(0,0,640,640);ctx.drawImage(renderer.domElement,0,0);
 const tracked=tracks.get(i);
 $('#clock').textContent=`${local.toFixed(1)} s / ${spec.duration} s · source ${f.t.toFixed(2)} s`;
 return {id,capture:session.name,sourceFrame:i,sourceTime:f.t,timestampUs:f.timestampUs,localTime:local,pinch:state.pinch,handDistance:state.distance,bottleMask:!!tracked,staticAnchors:Object.fromEntries(Object.entries(surfaces).map(([k,v])=>[k,v.vertices]))};
}
function choose(id){current=id;local=0;const c=catalog[id-1];$('#title').textContent=String(id).padStart(2,'0')+' · '+c.title;$('#story').textContent=c.story;$('#source').textContent='Inspiration: '+c.inspiration;$('#basis').textContent=c.eventBasis;$('#seek').max=c.duration;$('#choice').value=id;return render(id,0);}
$('#choice').innerHTML=catalog.map(c=>`<option value="${c.id}">${String(c.id).padStart(2,'0')} · ${c.title}</option>`).join('');$('#choice').onchange=e=>choose(+e.target.value);$('#play').onclick=()=>playing=!playing;$('#trigger').onclick=()=>{local=0;playing=true;};$('#seek').oninput=async e=>{playing=false;if(!busy){busy=true;await render(current,+e.target.value);busy=false;}};
async function tick(now){const dt=Math.min(.2,(now-(stamp||now))/1000);stamp=now;if(playing&&!busy){busy=true;await render(current,local+dt);$('#seek').value=local;if(local>=catalog[current-1].duration)playing=false;busy=false;}requestAnimationFrame(tick);}requestAnimationFrame(tick);
window.fullTakeFifty={catalog,render,choose,surfaces,session,assets};await choose(1);window.fullTakeFiftyReady=true;
