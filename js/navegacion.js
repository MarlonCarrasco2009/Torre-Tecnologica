import * as THREE from 'three';

// Colisiones con la geometría existente: paredes, pilares, jardineras y escaleras.
export function crearNavegacion(escena){
  let objetos=[],cajas=[],dinamicos=[],limiteInferior=0;
  function refrescar(){
    escena.updateMatrixWorld(true);objetos=[];
    const visitar=o=>{
      if(!o.visible||o.userData.sinColision)return;
      if(o.isMesh){o.geometry.computeBoundingBox();objetos.push(o);}
      o.children.forEach(visitar);
    };
    visitar(escena);cajas=objetos.map(o=>new THREE.Box3().setFromObject(o));
    limiteInferior=cajas.reduce((y,bb)=>Math.min(y,bb.min.y),0)-2;
    dinamicos=[];
    objetos.forEach((o,i)=>{
      for(let padre=o;padre;padre=padre.parent){
        if(padre.userData.colisionDinamica){dinamicos.push(i);break;}
      }
    });
  }
  refrescar();
  const rayo=new THREE.Raycaster(),abajo=new THREE.Vector3(0,-1,0);
  const normal=new THREE.Vector3(),origen=new THREE.Vector3();
  const radio=.29,escalon=.38;
  const arriba=new THREE.Vector3(0,1,0),altoAvatar=2.08,gravedad=17;
  const apoyos=[[0,0],[radio*.7,0],[-radio*.7,0],[0,radio*.7],[0,-radio*.7]];
  const despegue=new THREE.Vector3();
  let enAire=false,velocidadY=0;
  function cercanos(x,z,margen=1){
    for(const i of dinamicos)cajas[i].setFromObject(objetos[i]);
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
    for(const h of (enAire?[.025,.45,1.05,1.75,altoAvatar-.02]:[.45,1.05,1.75])) for(const lateral of [-radio*.7,0,radio*.7]){
      rayo.set(origen.set(pos.x-direccion.z*lateral,pos.y+h,pos.z+direccion.x*lateral),direccion);
      rayo.far=distancia+radio;
      if(rayo.intersectObjects(cerca,false).length)return false;
    }
    const x=pos.x+dx,z=pos.z+dz;
    if(enAire){pos.x=x;pos.z=z;return true;}
    const y=altura(x,z,pos.y);
    if(y===null)return false;
    // No permite quedar suspendido sobre los bordes del piso.
    for(const [ox,oz] of [[radio*.75,0],[-radio*.75,0],[0,radio*.75],[0,-radio*.75]]){
      if(altura(x+ox,z+oz,y)===null)return false;
    }
    pos.set(x,y,z);return true;
  }
  function cancelarSalto(){enAire=false;velocidadY=0;}
  function saltar(pos){
    if(enAire)return;
    const suelo=altura(pos.x,pos.z,pos.y);
    if(suelo===null||Math.abs(pos.y-suelo)>.16)return;
    pos.y=suelo;despegue.copy(pos);velocidadY=5.4;enAire=true;
  }
  function actualizarSalto(pos,dt){
    if(!enAire||dt<=0)return;
    const dy=velocidadY*dt-gravedad*dt*dt/2;
    velocidadY-=gravedad*dt;
    const sube=dy>0,direccion=sube?arriba:abajo,signo=sube?1:-1;
    const cerca=cercanos(pos.x,pos.z,radio);
    let libre=Math.abs(dy),contacto=false;
    for(const [dx,dz] of apoyos){
      const y=pos.y+(sube?altoAvatar:0)-signo*.015;
      rayo.set(origen.set(pos.x+dx,y,pos.z+dz),direccion);rayo.far=libre+.015;
      const hit=rayo.intersectObjects(cerca,false)[0];
      if(hit){libre=Math.min(libre,Math.max(0,hit.distance-.015));contacto=true;}
    }
    pos.y+=signo*libre;
    if(contacto){velocidadY=0;if(!sube)cancelarSalto();}
    // Recupera el último apoyo si el salto acaba fuera de la maqueta.
    if(pos.y<limiteInferior){
      pos.copy(despegue);cancelarSalto();
    }
  }
  return {altura,refrescar,saltar,actualizarSalto,cancelarSalto,get enAire(){return enAire;},
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
