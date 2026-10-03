import * as THREE from 'three';
export function projection(k,near=.02,far=100){
  const {fx,fy,cx,cy,width:w,height:h}=k;
  return new THREE.Matrix4().set(2*fx/w,0,1-2*cx/w,0, 0,2*fy/h,2*cy/h-1,0, 0,0,-(far+near)/(far-near),-2*far*near/(far-near), 0,0,-1,0);
}
export function setPose(camera,frame,k){
  camera.position.fromArray(frame.position);camera.quaternion.fromArray(frame.quaternion);
  camera.projectionMatrix.copy(projection(k));camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();camera.updateMatrixWorld(true);
}
export function frameAt(frames,t){ // Zero-order hold: never move 3D over a frozen background image.
  let lo=0,hi=frames.length-1;
  while(lo<hi){const m=Math.ceil((lo+hi)/2);if(frames[m].t<=t)lo=m;else hi=m-1;}
  return lo;
}
