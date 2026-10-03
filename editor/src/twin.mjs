import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import {VRButton} from 'three/addons/webxr/VRButton.js';

export function roomFromGeometry(doc){
  if(doc.version!==1||doc.coordinateSystem!=='three-rh-y-up-meters'||!Array.isArray(doc.parts)||!doc.parts.length)throw Error('Unsupported or empty room geometry');
  const room=new THREE.Group();
  for(const part of doc.parts){
    if(!Array.isArray(part.vertices)||part.vertices.length%3||!part.vertices.every(Number.isFinite)||!Array.isArray(part.triangles)||part.triangles.length%3||!part.triangles.every(i=>Number.isInteger(i)&&i>=0&&i<part.vertices.length/3))throw Error('Invalid room geometry');
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(part.vertices,3));g.setIndex(part.triangles);g.computeVertexNormals();
    const mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0x558d83,side:THREE.DoubleSide}));mesh.name=part.label||'Room';mesh.userData.geometrySource=part.source;room.add(mesh);
  }
  return room;
}

export function createTwin({canvas,scene,camera,anchor,onMove,getRoom,renderVideo,togglePlayback}){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.xr.enabled=true;
  const view=new THREE.PerspectiveCamera(50,1,.01,100);view.position.set(4,3.5,5);
  const orbit=new OrbitControls(view,canvas);orbit.target.set(0,1,0);
  const helper=new THREE.Group();scene.add(helper);
  const grid=new THREE.GridHelper(12,24,0x608d82,0x29443f);helper.add(grid);
  const trajectory=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0x78d8ee}));helper.add(trajectory);
  const debugCamera=camera.clone();debugCamera.matrixAutoUpdate=false;const frustum=new THREE.CameraHelper(debugCamera);helper.add(frustum);
  const gizmo=new TransformControls(view,canvas);gizmo.attach(anchor);helper.add(gizmo.getHelper());
  gizmo.addEventListener('dragging-changed',e=>orbit.enabled=!e.value);
  gizmo.addEventListener('objectChange',()=>onMove(anchor.position));
  orbit.addEventListener('change',()=>{if(!renderer.xr.isPresenting)render();});
  let loaded=false,handSamples=[],handSkeletons={};
  const viewCenter=new THREE.Vector3();
  const videoTexture=new THREE.CanvasTexture(document.getElementById('stage'));videoTexture.colorSpace=THREE.SRGBColorSpace;
  const videoPanel=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1),new THREE.MeshBasicMaterial({map:videoTexture,side:THREE.DoubleSide,toneMapped:false}));
  videoPanel.name='Recorded video preview';videoPanel.visible=false;helper.add(videoPanel);
  const debugOptions={trajectory:true,frustum:true,hands:true,video:false};
  function setDebug(options){Object.assign(debugOptions,options);render();}
  function resetView(){orbit.target.copy(viewCenter);view.position.copy(viewCenter).add(new THREE.Vector3(3,2.5,4));orbit.update();render();}

  const handGroup=new THREE.Group();helper.add(handGroup);
  function setHands(samples,schema,skeletons){if(schema.sdkHandSkeletonVersion!=='OpenXR')return false;handSamples=samples;handSkeletons=skeletons;return true;}
  function setHandTime(timestampUs){
    for(const child of [...handGroup.children]){handGroup.remove(child);child.geometry?.dispose();child.material?.dispose();}
    if(!handSamples.length)return;
    const time=Number(timestampUs)/1000;let lo=0,hi=handSamples.length-1;
    while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(handSamples[mid].unixMs<=time)lo=mid;else hi=mid-1;}
    const sample=handSamples[lo];if(Math.abs(sample.unixMs-time)>150)return;
    const p=sample.trackingPosition,q=sample.trackingRotation;
    const rot=new THREE.Quaternion(-q.x,-q.y,q.z,q.w),pos=new THREE.Vector3(p.x,p.y,-p.z);
    for(const side of ['left','right']){
      const h=sample[side];if(!h?.valid||!h.tracked||!h.bonePositions?.length)continue;
      if(Number.isFinite(sample.ovrSeconds)&&Number.isFinite(h.sampleTimestamp)&&Math.abs(sample.ovrSeconds-h.sampleTimestamp)>.15)continue;
      const vertices=h.bonePositions.map(v=>new THREE.Vector3(v.x,v.y,v.z).applyQuaternion(rot).add(pos));
      handGroup.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(vertices),new THREE.PointsMaterial({color:side==='left'?0xffaa77:0x99ddff,size:.015})));
      const pairs=[];for(let i=0;i<(handSkeletons[side]?.bones.length||0);i++){const parent=handSkeletons[side].bones[i].parent;if(parent>=0&&parent<vertices.length&&i<vertices.length)pairs.push(vertices[parent],vertices[i]);}
      if(pairs.length)handGroup.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pairs),new THREE.LineBasicMaterial({color:side==='left'?0xffaa77:0x99ddff})));
    }
  }
  function render(){
    if(!loaded)return;
    const w=canvas.clientWidth||640,h=canvas.clientHeight||400;
    if(!renderer.xr.isPresenting){renderer.setSize(w,h,false);view.aspect=w/h;view.updateProjectionMatrix();}
    helper.visible=true;
    trajectory.visible=debugOptions.trajectory;frustum.visible=debugOptions.frustum;handGroup.visible=debugOptions.hands;
    videoPanel.visible=debugOptions.video||renderer.xr.isPresenting;
    if(videoPanel.visible)videoTexture.needsUpdate=true;
    debugCamera.matrixWorld.copy(camera.matrixWorld);debugCamera.projectionMatrix.copy(camera.projectionMatrix);
    debugCamera.projectionMatrix.elements[10]=-(2+.02)/(2-.02);debugCamera.projectionMatrix.elements[14]=-2*2*.02/(2-.02);
    debugCamera.projectionMatrixInverse.copy(debugCamera.projectionMatrix).invert();frustum.update();
    const bg=scene.background;scene.background=new THREE.Color(0x101c20);
    const states=[];getRoom()?.traverse(o=>{if(o.isMesh){const m=o.material;states.push([m,m.colorWrite,m.wireframe,m.transparent,m.opacity,m.depthWrite]);m.colorWrite=true;m.wireframe=true;m.transparent=true;m.opacity=.45;m.depthWrite=false;}});
    renderer.render(scene,view);
    for(const [m,c,w,t,o,d] of states){m.colorWrite=c;m.wireframe=w;m.transparent=t;m.opacity=o;m.depthWrite=d;}
    scene.background=bg;helper.visible=false;
  }
  function setSession(session){
    trajectory.geometry.dispose();trajectory.geometry=new THREE.BufferGeometry().setFromPoints(session.frames.map(f=>new THREE.Vector3(...f.position)));
    const box=new THREE.Box3().setFromPoints(session.frames.map(f=>new THREE.Vector3(...f.position)));const center=box.getCenter(viewCenter);videoPanel.position.copy(center).add(new THREE.Vector3(0,1,-2));
    videoPanel.scale.y=1.6*session.intrinsics.height/session.intrinsics.width;
    loaded=true;resetView();
  }
  // In VR, select the placement plane with a controller. Desktop uses the translation gizmo.
  for(let i=0;i<2;i++){const controller=renderer.xr.getController(i);controller.addEventListener('select',()=>{
    const origin=new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld),direction=new THREE.Vector3(0,0,-1).transformDirection(controller.matrixWorld);
    if(videoPanel.visible&&new THREE.Raycaster(origin,direction).intersectObject(videoPanel).length){togglePlayback();return;}
    const point=new THREE.Vector3();if(new THREE.Ray(origin,direction).intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-anchor.position.y),point)){anchor.position.copy(point);onMove(point);}
  });
    const pointer=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-5)]),new THREE.LineBasicMaterial({color:0xb5eccc}));controller.add(pointer);helper.add(controller);}

  const button=VRButton.createButton(renderer);button.style.position='static';document.getElementById('xr-entry').appendChild(button);
  renderer.setAnimationLoop(()=>{if(renderer.xr.isPresenting){renderVideo();render();}});
  helper.visible=false;
  return {render,setSession,setHands,setHandTime,setDebug,resetView,videoPanel,trajectory,frustum,renderer,view,helper,gizmo};
}
