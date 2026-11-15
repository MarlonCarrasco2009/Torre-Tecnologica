import * as THREE from 'three';

// Microtextura de cemento compartida, con escala uniforme en suelo y muros.
export function aplicarAcabadosLateral(grupo){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d'),data=ctx.createImageData(256,256);
  let seed=2311;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const tono=220+(rand()-.5)*24+Math.sin(x*.12)*2+Math.cos(y*.15+x*.07)*3;
    const i=(y*256+x)*4;data.data[i]=tono;data.data[i+1]=tono;data.data[i+2]=tono-3;data.data[i+3]=255;
  }
  ctx.putImageData(data,0,0);
  const map=new THREE.CanvasTexture(canvas);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;
  const bump=map.clone();bump.colorSpace=THREE.NoColorSpace;bump.needsUpdate=true;
  const piso=new THREE.MeshStandardMaterial({color:'#9a9e99',map,bumpMap:bump,bumpScale:.018,roughness:.94});
  const muro=new THREE.MeshStandardMaterial({color:'#c9cdc6',map,bumpMap:bump,bumpScale:.012,roughness:.93});
  const suelo=new Set(['Rampa vehicular hacia el interior de SENATI','Umbral de acceso a la rampa C','Descanso del subterráneo']);
  grupo.updateWorldMatrix(true,true);
  const p=new THREE.Vector3(),n=new THREE.Vector3();
  grupo.traverse(o=>{
    if(!o.isMesh||(!suelo.has(o.name)&&o.name!=='Muro de contención de rampa C'))return;
    const geo=o.geometry.clone(),pos=geo.attributes.position,norm=geo.attributes.normal;
    const uv=new Float32Array(pos.count*2),nm=new THREE.Matrix3().getNormalMatrix(o.matrixWorld);
    for(let i=0;i<pos.count;i++){
      p.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld);n.fromBufferAttribute(norm,i).applyMatrix3(nm).normalize();
      uv[i*2]=(Math.abs(n.y)>.6?p.x:Math.abs(n.x)>.6?p.z:p.x)/2;
      uv[i*2+1]=(Math.abs(n.y)>.6?p.z:p.y)/2;
    }
    geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));o.geometry=geo;o.material=suelo.has(o.name)?piso:muro;
  });
}
