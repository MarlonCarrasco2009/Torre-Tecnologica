import * as THREE from 'three';

// Follaje de cobertura: una geometría compartida para miles de plantas.
// Las hojas tienen nervadura elevada y dos alturas, sin siluetas poliédricas.
let geometriaHojas,materialHojas,materialTierra;
function hojas(){
  if(geometriaHojas)return geometriaHojas;
  const vertices=[];
  const triangulo=(a,b,c)=>vertices.push(...a,...b,...c);
  for(let n=0;n<14;n++){
    const capa=n<8?0:1,angulo=n*2.39996;
    const largo=capa?.15:.21,ancho=capa?.052:.065,base=capa?.12:.035;
    const punto=(r,y,lateral=0)=>[Math.cos(angulo)*r-Math.sin(angulo)*lateral,y,Math.sin(angulo)*r+Math.cos(angulo)*lateral];
    const a=punto(.025,base),b=punto(largo*.56,base+.065,-ancho),
      c=punto(largo,base+.04+(n%3)*.017),d=punto(largo*.56,base+.065,ancho),
      e=punto(largo*.55,base+.1);
    triangulo(a,b,e);triangulo(b,c,e);triangulo(c,d,e);triangulo(d,a,e);
  }
  geometriaHojas=new THREE.BufferGeometry();
  geometriaHojas.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometriaHojas.computeVertexNormals();
  return geometriaHojas;
}

export function plantarCobertura(grupo,puntos,semilla=1511){
  materialHojas??=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.83,side:THREE.DoubleSide});
  const m=new THREE.InstancedMesh(hojas(),materialHojas,puntos.length);
  m.name='Cobertura vegetal de hojas naturales';m.userData.sinColision=true;
  const obj=new THREE.Object3D(),color=new THREE.Color();
  const rand=()=>{semilla=(Math.imul(semilla,1664525)+1013904223)>>>0;return semilla/4294967296;};
  puntos.forEach(({x,y,z,color:tono},i)=>{
    const escala=.72+rand()*.35;
    obj.position.set(x+(rand()-.5)*.08,y+(rand()-.5)*.025,z+(rand()-.5)*.08);
    obj.rotation.set((rand()-.5)*.13,rand()*Math.PI*2,(rand()-.5)*.13);
    obj.scale.set(escala,escala*(.85+rand()*.35),escala);obj.updateMatrix();
    m.setMatrixAt(i,obj.matrix);color.set(tono).offsetHSL((rand()-.5)*.025,0,(rand()-.5)*.055);m.setColorAt(i,color);
  });
  m.castShadow=true;m.receiveShadow=true;grupo.add(m);return m;
}

export function tierraJardin(){
  if(materialTierra)return materialTierra;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d'),data=ctx.createImageData(128,128);
  let seed=315;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<data.data.length;i+=4){
    const v=38+rand()*35;data.data[i]=v;data.data[i+1]=v*.8;data.data[i+2]=v*.57;data.data[i+3]=255;
  }
  ctx.putImageData(data,0,0);
  const map=new THREE.CanvasTexture(canvas);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.colorSpace=THREE.SRGBColorSpace;
  const bump=map.clone();bump.colorSpace=THREE.NoColorSpace;bump.needsUpdate=true;
  materialTierra=new THREE.MeshStandardMaterial({map,bumpMap:bump,bumpScale:.025,roughness:1});
  return materialTierra;
}
