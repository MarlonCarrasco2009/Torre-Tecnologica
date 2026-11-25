import * as THREE from 'three';
import {CONFIG} from './config.js';
import {ajustarX,ajustarZ,zTorreC,compactarFranja} from './franja-campus.js';
import {ajustarPizarraFinal} from './piedra-piso.js';

export function ubicacionCampus(campus,x,y,z,torreC=false){
  return campus.localToWorld(new THREE.Vector3(ajustarX(x),y,torreC?zTorreC(z):ajustarZ(z,x)));
}
function registrar(raiz,torreC){
  const p=new THREE.Vector3(),inv=new THREE.Matrix4(),m=new THREE.Matrix4(),temp=new THREE.Object3D();
  function convertir(v){
    v.z=torreC?zTorreC(v.z):ajustarZ(v.z,v.x);v.x=ajustarX(v.x);return v;
  }
  function mover(o){
    o.getWorldPosition(p);convertir(p);o.position.copy(o.parent.worldToLocal(p));o.updateMatrixWorld(true);
  }
  function visitar(o){
    if(o.userData.puertaInteractiva||o.userData.conservarForma||o.isSprite||o.isCSS2DObject){mover(o);return;}
    if(o.isInstancedMesh){
      // En las losas y cerramientos instanciados también cambian los extremos, no solo el centro.
      o.geometry.computeBoundingBox();
      const bb=o.geometry.boundingBox,box=new THREE.Box3(),world=new THREE.Matrix4();
      for(let i=0;i<o.count;i++){
        o.getMatrixAt(i,m);world.multiplyMatrices(o.matrixWorld,m);
        box.copy(bb).applyMatrix4(world);const a=box.min.clone(),b=box.max.clone();convertir(a);convertir(b);
        m.decompose(temp.position,temp.quaternion,temp.scale);
        o.localToWorld(temp.position);convertir(temp.position);o.worldToLocal(temp.position);
        if(!torreC){
          const dx=box.max.x-box.min.x,dz=box.max.z-box.min.z;
          if(dx>.001&&dz>.001){
            const kx=(b.x-a.x)/dx,kz=(b.z-a.z)/dz;
            const cruzado=Math.abs(new THREE.Vector3(1,0,0).applyQuaternion(temp.quaternion).z)>.7;
            temp.scale.x*=cruzado?kz:kx;temp.scale.z*=cruzado?kx:kz;
          }
        }
        temp.updateMatrix();o.setMatrixAt(i,temp.matrix);
      }
      o.instanceMatrix.needsUpdate=true;o.computeBoundingBox();o.computeBoundingSphere();return;
    }
    if(o.isMesh){
      const g=o.geometry.clone(),pos=g.attributes.position;
      inv.copy(o.matrixWorld).invert();
      for(let i=0;i<pos.count;i++){
        p.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld);convertir(p);p.applyMatrix4(inv);pos.setXYZ(i,p.x,p.y,p.z);
      }
      pos.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();o.geometry=g;
    }
    for(const hijo of o.children)visitar(hijo);
  }
  visitar(raiz);
}
export function prepararCampus(campus,{arquitectura,pisosSuperiores,jardines}){
  // Construir todos los cortes antes de registrar sus transformaciones.
  for(let n=5;n<=11;n++)pisosSuperiores.obtener(n);
  campus.updateMatrixWorld(true);
  const reservas=[arquitectura.grupo,pisosSuperiores.grupo,jardines.grupo,
    campus.getObjectByName('Torre C · recorridos del 21 de noviembre'),
    campus.getObjectByName('Lateral de Torre C · video 15 noviembre')];
  const temporal=new THREE.Group(),padres=reservas.map(o=>o.parent);
  reservas.forEach(o=>temporal.attach(o));
  compactarFranja(campus);
  campus.updateMatrixWorld(true);
  reservas.forEach((o,i)=>{registrar(o,i>=3);padres[i].attach(o);});
  campus.scale.z=CONFIG.escalaLongitudinalCampus;
  campus.position.z=-CONFIG.fondoCampus/2*(.85-campus.scale.z);
  campus.updateMatrixWorld(true);
  const inicio=jardines.puntoInicio;inicio.copy(ubicacionCampus(campus,inicio.x,inicio.y,inicio.z));
  ajustarPizarraFinal(campus);
}

