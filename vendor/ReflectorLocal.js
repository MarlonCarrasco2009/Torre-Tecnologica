// Local planar reflection for the existing glazed facade, using Three.js r180.
import * as THREE from 'three';
export class ReflectorLocal extends THREE.Mesh {
  constructor(geometry,{color=0xffffff,textureWidth=1024,textureHeight=768,clipBias=.001}={}){
    const target=new THREE.WebGLRenderTarget(textureWidth,textureHeight,{type:THREE.HalfFloatType});
    const matrix=new THREE.Matrix4();
    const material=new THREE.ShaderMaterial({uniforms:{map:{value:target.texture},textureMatrix:{value:matrix},tint:{value:new THREE.Color(color)}},vertexShader:`uniform mat4 textureMatrix; varying vec4 projected; void main(){projected=textureMatrix*vec4(position,1.0);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`uniform sampler2D map; uniform vec3 tint; varying vec4 projected; void main(){vec3 c=texture2DProj(map,projected).rgb;gl_FragColor=vec4(c*tint,1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
    super(geometry,material);
    const virtual=new THREE.PerspectiveCamera(), normal=new THREE.Vector3(), origin=new THREE.Vector3(), eye=new THREE.Vector3(), view=new THREE.Vector3(), look=new THREE.Vector3(), direction=new THREE.Vector3(), rot=new THREE.Matrix4(), plane=new THREE.Plane(), clip=new THREE.Vector4(), q=new THREE.Vector4();
    this.onBeforeRender=(renderer,scene,camera)=>{
      origin.setFromMatrixPosition(this.matrixWorld);eye.setFromMatrixPosition(camera.matrixWorld);rot.extractRotation(this.matrixWorld);normal.set(0,0,1).applyMatrix4(rot);
      view.subVectors(origin,eye);if(view.dot(normal)>0)return;
      view.reflect(normal).negate().add(origin);virtual.position.copy(view);
      rot.extractRotation(camera.matrixWorld);look.set(0,0,-1).applyMatrix4(rot).add(eye);
      direction.subVectors(origin,look).reflect(normal).negate().add(origin);
      virtual.up.set(0,1,0).applyMatrix4(rot).reflect(normal);virtual.lookAt(direction);virtual.far=camera.far;virtual.updateMatrixWorld();virtual.projectionMatrix.copy(camera.projectionMatrix);
      matrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1).multiply(virtual.projectionMatrix).multiply(virtual.matrixWorldInverse).multiply(this.matrixWorld);
      plane.setFromNormalAndCoplanarPoint(normal,origin).applyMatrix4(virtual.matrixWorldInverse);clip.set(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant);
      const p=virtual.projectionMatrix.elements;q.set((Math.sign(clip.x)+p[8])/p[0],(Math.sign(clip.y)+p[9])/p[5],-1,(1+p[10])/p[14]);clip.multiplyScalar(2/clip.dot(q));p[2]=clip.x;p[6]=clip.y;p[10]=clip.z+1-clipBias;p[14]=clip.w;
      const old=renderer.getRenderTarget(),xr=renderer.xr.enabled,shadow=renderer.shadowMap.autoUpdate;this.visible=false;
      try{renderer.xr.enabled=false;renderer.shadowMap.autoUpdate=false;renderer.setRenderTarget(target);renderer.state.buffers.depth.setMask(true);renderer.clear();renderer.render(scene,virtual);}
      finally{this.visible=true;renderer.xr.enabled=xr;renderer.shadowMap.autoUpdate=shadow;renderer.setRenderTarget(old);if(camera.viewport)renderer.state.viewport(camera.viewport);}
    };
  }
}
