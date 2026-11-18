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

export function plantarCobertura(grupo,puntos,semilla=1511,opciones={}){
  materialHojas??=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.83,side:THREE.DoubleSide});
  const m=new THREE.InstancedMesh(hojas(),materialHojas,puntos.length);
  m.name='Cobertura vegetal de hojas naturales';m.userData.sinColision=true;
  const obj=new THREE.Object3D(),color=new THREE.Color();
  const rand=()=>{semilla=(Math.imul(semilla,1664525)+1013904223)>>>0;return semilla/4294967296;};
  puntos.forEach(({x,y,z,color:tono},i)=>{
    const escala=(.72+rand()*.35)*(opciones.escala??1);
    const dispersion=opciones.dispersion??.08;
    obj.position.set(x+(rand()-.5)*dispersion,y+(rand()-.5)*.025,z+(rand()-.5)*dispersion);
    obj.rotation.set((rand()-.5)*.13,rand()*Math.PI*2,(rand()-.5)*.13);
    obj.scale.set(escala,escala*(.85+rand()*.35),escala);obj.updateMatrix();
    m.setMatrixAt(i,obj.matrix);color.set(tono).offsetHSL((rand()-.5)*.025,0,(rand()-.5)*(opciones.variacionColor??.055));m.setColorAt(i,color);
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

// Usa las superficies reales para respetar jardines inclinados, entrantes y bordes.
export function cubrirJardinesConTierraYPasto(grupo){
  const verde=new THREE.Color('#3a9676'),superficies=[];
  grupo.updateWorldMatrix(true,true);
  grupo.traverse(o=>{
    if(!o.isMesh||o.isInstancedMesh)return;
    const materiales=Array.isArray(o.material)?o.material:[o.material];
    if(materiales.some(m=>m.color?.equals(verde)))superficies.push(o);
  });
  const rayo=new THREE.Raycaster(),abajo=new THREE.Vector3(0,-1,0);
  const normal=new THREE.Vector3();
  const tonos=['#628244','#77994b','#8ba954','#527a38'];
  for(const [indice,malla] of superficies.entries()){
    const limites=new THREE.Box3().setFromObject(malla),puntos=[];
    const materiales=Array.isArray(malla.material)?malla.material:[malla.material];
    const superficie=(x,z)=>{
      rayo.set(new THREE.Vector3(x,limites.max.y+.5,z),abajo);
      const hit=rayo.intersectObject(malla,false)[0];
      if(!hit||!materiales[hit.face.materialIndex??0].color?.equals(verde))return null;
      normal.copy(hit.face.normal).transformDirection(malla.matrixWorld);
      return normal.y>.95?hit.point:null;
    };
    for(let x=limites.min.x+.22;x<limites.max.x-.22;x+=.29){
      for(let z=limites.min.z+.22;z<limites.max.z-.22;z+=.29){
        const punto=superficie(x,z);
        if(!punto)continue;
        if(malla.userData.zonasArbustos){
          const local=malla.worldToLocal(punto.clone());
          if(malla.userData.zonasArbustos.some(zona=>{
            const cos=Math.cos(zona.giro??0),sin=Math.sin(zona.giro??0);
            const x=local.x-zona.x,z=local.z-zona.z;
            const dx=(cos*x-sin*z)/(zona.fondo/2+.17),dz=(sin*x+cos*z)/(zona.ancho/2+.17);
            return zona.circular?dx*dx+dz*dz<=1:Math.abs(dx)<=1&&Math.abs(dz)<=1;
          }))continue;
        }
        // Deja un margen para que las hojas no invadan las coronaciones ni los pasos.
        if(![[.21,0],[-.21,0],[0,.21],[0,-.21]].every(([dx,dz])=>superficie(x+dx,z+dz)))continue;
        punto.y+=.012;malla.worldToLocal(punto);
        puntos.push({x:punto.x,y:punto.y,z:punto.z,color:tonos[puntos.length%tonos.length]});
      }
    }
    const geometria=malla.geometry.clone(),pos=geometria.attributes.position;
    const uv=new Float32Array(pos.count*2);
    for(let i=0;i<pos.count;i++){uv[2*i]=pos.getX(i)/1.5;uv[2*i+1]=pos.getZ(i)/1.5;}
    geometria.setAttribute('uv',new THREE.BufferAttribute(uv,2));malla.geometry=geometria;
    const nuevos=materiales.map(m=>m.color?.equals(verde)?tierraJardin():m);
    malla.material=Array.isArray(malla.material)?nuevos:nuevos[0];
    if(puntos.length)plantarCobertura(malla,puntos,211+indice);
  }
}
