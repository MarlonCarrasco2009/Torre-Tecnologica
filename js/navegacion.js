import * as THREE from 'three';

// Colisiones con la geometría existente: paredes, pilares, jardineras y escaleras.
export function crearNavegacion(escena){
  let objetos=[],cajas=[];
  function refrescar(){
    escena.updateMatrixWorld(true);objetos=[];
    const visitar=o=>{
      if(!o.visible||o.userData.sinColision)return;
      if(o.isMesh){o.geometry.computeBoundingBox();objetos.push(o);}
      o.children.forEach(visitar);
    };
    visitar(escena);cajas=objetos.map(o=>new THREE.Box3().setFromObject(o));
  }
  refrescar();
  const rayo=new THREE.Raycaster(),abajo=new THREE.Vector3(0,-1,0);
  const normal=new THREE.Vector3(),origen=new THREE.Vector3();
  const radio=.29,escalon=.38;
  function cercanos(x,z,margen=1){
    return objetos.filter((_,i)=>x>=cajas[i].min.x-margen&&x<=cajas[i].max.x+margen&&z>=cajas[i].min.z-margen&&z<=cajas[i].max.z+margen);
  }
  function altura(x,z,y){
    rayo.set(origen.set(x,y+escalon+.02,z),abajo);rayo.far=escalon+.8;
    for(const hit of rayo.intersectObjects(cercanos(x,z),false)){
      normal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
      if(normal.y>.65&&hit.point.y-y<=escalon+.01&&hit.point.y-y>=-.65) return hit.point.y;
    }
    return null;
  }
  function intentar(pos,dx,dz){
    const distancia=Math.hypot(dx,dz);if(distancia<1e-7)return false;
    const direccion=new THREE.Vector3(dx/distancia,0,dz/distancia);
    const cerca=cercanos(pos.x,pos.z,distancia+radio+.1);
    // Barrido a varias alturas y a ambos lados del cuerpo para impedir cruces por esquinas.
    for(const h of [.45,1.05,1.75]) for(const lateral of [-radio*.7,0,radio*.7]){
      rayo.set(origen.set(pos.x-direccion.z*lateral,pos.y+h,pos.z+direccion.x*lateral),direccion);
      rayo.far=distancia+radio;
      if(rayo.intersectObjects(cerca,false).length)return false;
    }
    const x=pos.x+dx,z=pos.z+dz;
    const y=altura(x,z,pos.y);
    if(y===null)return false;
    // No permite quedar suspendido sobre los bordes del piso.
    for(const [ox,oz] of [[radio*.75,0],[-radio*.75,0],[0,radio*.75],[0,-radio*.75]]){
      if(altura(x+ox,z+oz,y)===null)return false;
    }
    pos.set(x,y,z);return true;
  }
  return {altura,refrescar,
    mover(pos,dx,dz){
      if(intentar(pos,dx,dz))return;
      // Deslizamiento sobre paredes en lugar de detenerse en diagonal.
      if(Math.abs(dx)>Math.abs(dz)){intentar(pos,dx,0);intentar(pos,0,dz);}
      else{intentar(pos,0,dz);intentar(pos,dx,0);}
    },
    distanciaCamara(desde,hasta){
      const direccion=hasta.clone().sub(desde),largo=direccion.length();
      rayo.set(desde,direccion.normalize());rayo.far=largo;
      const hits=rayo.intersectObjects(objetos,false);
      return hits.length?Math.max(.4,hits[0].distance-.2):largo;
    }
  };
}
