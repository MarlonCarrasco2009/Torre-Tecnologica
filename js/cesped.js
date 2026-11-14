import * as THREE from 'three';

export function aplicarCesped(grupo){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#38652c';ctx.fillRect(0,0,256,256);
  let semilla=197;
  const azar=()=>{semilla=(Math.imul(semilla,1664525)+1013904223)>>>0;return semilla/4294967296;};
  const tonos=['#294e23','#426e30','#527c36','#638a40','#355d27'];
  for(let i=0;i<15000;i++){
    const x=azar()*256,y=azar()*256;
    ctx.strokeStyle=tonos[Math.floor(azar()*tonos.length)];ctx.lineWidth=.5+azar()*.7;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(azar()-.5)*3,y-1-azar()*4);ctx.stroke();
  }
  const mapa=new THREE.CanvasTexture(canvas);
  mapa.wrapS=mapa.wrapT=THREE.RepeatWrapping;mapa.colorSpace=THREE.SRGBColorSpace;mapa.anisotropy=8;
  const relieve=mapa.clone();relieve.colorSpace=THREE.NoColorSpace;relieve.needsUpdate=true;
  const cesped=new THREE.MeshStandardMaterial({map:mapa,bumpMap:relieve,bumpScale:.025,roughness:1});
  const verdeAnterior=new THREE.Color('#3a9676'),p=new THREE.Vector3();
  grupo.updateWorldMatrix(true,true);
  grupo.traverse(obj=>{
    if(!obj.isMesh||obj.isInstancedMesh)return;
    const materiales=Array.isArray(obj.material)?obj.material:[obj.material];
    if(!materiales.some(m=>m.color?.equals(verdeAnterior)))return;
    const geometria=obj.geometry.clone(),pos=geometria.attributes.position,uv=new Float32Array(pos.count*2);
    for(let i=0;i<pos.count;i++){
      p.fromBufferAttribute(pos,i).applyMatrix4(obj.matrixWorld);
      uv[i*2]=p.x/2;uv[i*2+1]=p.z/2;
    }
    geometria.setAttribute('uv',new THREE.BufferAttribute(uv,2));obj.geometry=geometria;
    const nuevos=materiales.map(m=>m.color?.equals(verdeAnterior)?cesped:m);
    obj.material=Array.isArray(obj.material)?nuevos:nuevos[0];
  });
}
