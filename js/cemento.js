import * as THREE from 'three';

// Grano fino y variaciones suaves, sin juntas de baldosas.
export function aplicarCementoMuros(grupos){
  const crearMapa=pintado=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
    const ctx=canvas.getContext('2d'),datos=ctx.createImageData(256,256);
    let semilla=99;
    const azar=()=>{semilla=(Math.imul(semilla,1664525)+1013904223)>>>0;return semilla/4294967296;};
    for(let y=0;y<256;y++)for(let x=0;x<256;x++){
      const variacion=Math.sin(x*Math.PI/32)*Math.cos(y*Math.PI/64)*5
        +Math.sin((x+y)*Math.PI/128)*4+(azar()-.5)*24;
      const poro=azar()<.035?22:0;
      const tono=pintado?246+(variacion-poro)*.3:225+variacion-poro;
      const i=(y*256+x)*4;
      datos.data[i]=datos.data[i+1]=datos.data[i+2]=tono;datos.data[i+3]=255;
    }
    ctx.putImageData(datos,0,0);
    const mapa=new THREE.CanvasTexture(canvas);
    mapa.wrapS=mapa.wrapT=THREE.RepeatWrapping;
    mapa.colorSpace=THREE.SRGBColorSpace;mapa.anisotropy=8;
    return mapa;
  };
  const gris=crearMapa(false),blanco=crearMapa(true);
  const relieve=gris.clone();relieve.colorSpace=THREE.NoColorSpace;relieve.needsUpdate=true;
  const cemento=new THREE.MeshStandardMaterial({color:'#a4a6a2',map:gris,
    bumpMap:relieve,bumpScale:.035,roughness:.97});
  const pintado=new THREE.MeshStandardMaterial({color:'#f5f5f2',map:blanco,
    bumpMap:relieve,bumpScale:.018,roughness:.9});
  const p=new THREE.Vector3(),n=new THREE.Vector3();
  for(const grupo of grupos){
    grupo.updateWorldMatrix(true,true);
    grupo.traverse(obj=>{
      if(!obj.isMesh||!['Zócalo del cerco','Panel de cemento del cerco'].includes(obj.name))return;
      const geo=obj.geometry.clone(),pos=geo.attributes.position,norm=geo.attributes.normal;
      const normales=new THREE.Matrix3().getNormalMatrix(obj.matrixWorld);
      const uv=new Float32Array(pos.count*2);
      for(let i=0;i<pos.count;i++){
        p.fromBufferAttribute(pos,i).applyMatrix4(obj.matrixWorld);
        n.fromBufferAttribute(norm,i).applyMatrix3(normales).normalize();
        // Escala uniforme también en muros rotados y estirados en altura.
        uv[i*2]=(Math.abs(n.y)>.6?p.x:Math.abs(n.x)>Math.abs(n.z)?p.z:p.x)/2;
        uv[i*2+1]=(Math.abs(n.y)>.6?p.z:p.y)/2;
      }
      geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));
      obj.geometry=geo;obj.material=obj.name==='Zócalo del cerco'?pintado:cemento;
    });
  }
}
