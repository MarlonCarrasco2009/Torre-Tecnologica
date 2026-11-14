import * as THREE from 'three';

// Losas de pizarra: textura cenital repetible, sin incorporar la perspectiva de la foto.
function texturaPizarra(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d'),datos=ctx.createImageData(512,512);
  const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
  const ruido=(x,y)=>{
    const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
    const sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
    return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),sx),
      THREE.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),sx),sy);
  };
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    const fila=Math.floor(y/128),tx=(x+(fila%2)*128)%256,ty=y%128;
    const junta=Math.min(tx,256-tx,ty,128-ty);
    const veta=ruido(x/34+ruido(x/80,y/80)*3,y/24);
    const capas=Math.abs(Math.sin(veta*28+ruido(x/9,y/9)*1.6));
    let valor=43+veta*24+capas*12+(ruido(x/3,y/3)-.5)*18;
    if(junta<2)valor=22+hash(x,y)*7;
    else if(junta<4)valor-=15;
    const i=(y*512+x)*4;
    datos.data[i]=valor;datos.data[i+1]=valor+2;datos.data[i+2]=valor+3;datos.data[i+3]=255;
  }
  ctx.putImageData(datos,0,0);
  const mapa=new THREE.CanvasTexture(canvas);
  mapa.wrapS=mapa.wrapT=THREE.RepeatWrapping;mapa.colorSpace=THREE.SRGBColorSpace;
  mapa.anisotropy=8;
  return mapa;
}

export function aplicarPiedraPisos(grupos,colorPiso){
  const mapa=texturaPizarra();
  const relieve=mapa.clone();relieve.colorSpace=THREE.NoColorSpace;relieve.needsUpdate=true;
  const material=new THREE.MeshStandardMaterial({map:mapa,bumpMap:relieve,bumpScale:.075,
    roughness:.78,metalness:0});
  const colorOriginal=new THREE.Color(colorPiso),punto=new THREE.Vector3(),normal=new THREE.Vector3();
  for(const grupo of grupos){
    grupo.updateWorldMatrix(true,true);
    grupo.traverse(obj=>{
      if(!obj.isMesh||obj.isInstancedMesh||Array.isArray(obj.material))return;
      const pisoIngreso=obj.name==='Pavimento continuo de piedra'||obj.name==='Base continua del ingreso';
      if(!pisoIngreso&&!obj.material.color?.equals(colorOriginal))return;
      // Las rampas mantienen su material claro original.
      if(obj.name.toLowerCase().includes('rampa'))return;
      const geometria=obj.geometry.clone(),pos=geometria.attributes.position,norm=geometria.attributes.normal;
      const uv=new Float32Array(pos.count*2),matNormal=new THREE.Matrix3().getNormalMatrix(obj.matrixWorld);
      for(let i=0;i<pos.count;i++){
        punto.fromBufferAttribute(pos,i).applyMatrix4(obj.matrixWorld);
        normal.fromBufferAttribute(norm,i).applyMatrix3(matNormal).normalize();
        if(Math.abs(normal.y)>.6){uv[i*2]=punto.x/4;uv[i*2+1]=punto.z/4;}
        else if(Math.abs(normal.x)>Math.abs(normal.z)){uv[i*2]=punto.z/4;uv[i*2+1]=punto.y/4;}
        else{uv[i*2]=punto.x/4;uv[i*2+1]=punto.y/4;}
      }
      geometria.setAttribute('uv',new THREE.BufferAttribute(uv,2));
      obj.geometry=geometria;obj.material=material;
    });
  }
}
