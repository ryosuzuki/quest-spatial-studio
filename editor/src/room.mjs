import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {roomFromGeometry} from './twin.mjs';
const canvas=document.querySelector('canvas'),renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x101c20);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(50,1,.01,200),orbit=new OrbitControls(camera,canvas);
let room;
function render(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.render(scene,camera);}
orbit.addEventListener('change',render);window.addEventListener('resize',render);
function filter(){room?.traverse(o=>{if(o.isMesh){const measured=o.userData.geometrySource==='global-mesh';o.visible=document.querySelector(measured?'#mesh':'#bounds').checked;}});render();}
function load(doc){
 const next=roomFromGeometry(doc);if(room){scene.remove(room);room.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}room=next;scene.add(room);
 room.traverse(o=>{if(o.isMesh){const measured=o.userData.geometrySource==='global-mesh';o.material.wireframe=true;o.material.transparent=true;o.material.opacity=measured?.42:.65;o.material.color.set(measured?0x81ddc1:0xf1b772);}});
 const box=new THREE.Box3().setFromObject(room),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 const radius=Math.max(size.x,size.y,size.z,1);orbit.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(.65,.8,1).multiplyScalar(radius));orbit.update();filter();
 const vertices=doc.parts.reduce((n,p)=>n+p.vertices.length/3,0),triangles=doc.parts.reduce((n,p)=>n+p.triangles.length/3,0);
 document.querySelector('#status').textContent=`${doc.parts.length} shapes · ${vertices.toLocaleString()} vertices · ${triangles.toLocaleString()} triangles · スキャン形状のみ。以前の映像とは未位置合わせ。`;
 window.roomView={ready:true,parts:doc.parts.length,vertices,triangles,bounds:{min:box.min.toArray(),max:box.max.toArray()},room};
}
for(const id of ['mesh','bounds'])document.getElementById(id).addEventListener('change',filter);
document.querySelector('#file').addEventListener('change',async e=>{try{load(JSON.parse(await e.target.files[0].text()));}catch(err){document.querySelector('#status').textContent=err.message;}});
const source=new URLSearchParams(location.search).get('room');
if(source){try{const r=await fetch(source);if(!r.ok)throw Error(`HTTP ${r.status}`);load(await r.json());}catch(e){document.querySelector('#status').textContent=e.message;window.roomView={error:e.message};}}
