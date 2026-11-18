import * as THREE from 'three';

// En la planta de referencia la derecha corresponde a -Z. La franja de
// seis unidades queda en una y media; el sector posterior avanza en bloque.
const avancePosterior=4.5;
const reduccionCentral=5.75;
const inicioFranjaFrontal=29,finFranjaFrontal=35,retrocesoFrontal=3.5;
// Reducción del tramo entre el muro de B y el jardín de Conferencias.
// El ancho útil del paso queda en 2 unidades para que esta franja no domine
// la vista en planta ni el recorrido entre las torres.
const reduccionPasillo=5;
const inicioPasoTorreA=36,finPasoTorreA=42,reduccionPasoTorreA=2;
export function ajustarX(x){
  const pasoA=THREE.MathUtils.clamp((x-inicioPasoTorreA)/(finPasoTorreA-inicioPasoTorreA),0,1);
  return x+reduccionPasillo*THREE.MathUtils.clamp((16-x)/7,0,1)-reduccionPasoTorreA*pasoA;
}
export function ajustarZ(z,x=0){
  const frontal=THREE.MathUtils.clamp((z-inicioFranjaFrontal)/(finFranjaFrontal-inicioFranjaFrontal),0,1);
  // En Torre A, absorbe la reducción en el paño ciego entre puertas.
  // Las dos fachadas y el jardín contiguo comparten el mismo desplazamiento.
  const cercaDeA=THREE.MathUtils.smoothstep(x,12,17)*(1-THREE.MathUtils.smoothstep(x,38,44));
  const finPosterior=-8+8*cercaDeA;
  // Acerca el sector del ingreso al borde izquierdo de la planta.
  // El corte pasa por el paño entre las puertas de Conferencias.
  const cierreCentral=reduccionCentral*THREE.MathUtils.clamp((18-z)/6,0,1);
  return z+cierreCentral+avancePosterior*THREE.MathUtils.clamp((finPosterior-z)/6,0,1)-retrocesoFrontal*frontal;
}

export function compactarFranja(campus){
  campus.updateMatrixWorld(true);
  const caja=new THREE.Box3(),p=new THREE.Vector3(),matriz=new THREE.Matrix4();
  function trasladar(objeto,dx,dz){
    objeto.getWorldPosition(p);
    p.x+=dx;p.z+=dz;
    objeto.position.copy(objeto.parent.worldToLocal(p));
  }
  function visitar(objeto){
    caja.setFromObject(objeto);
    if(!caja.isEmpty()){
      const dx=caja.max.x<=9?reduccionPasillo:
        caja.min.x>=finPasoTorreA?-reduccionPasoTorreA:
        caja.min.x>=16&&caja.max.x<=inicioPasoTorreA?0:null;
      const dz=caja.min.z>=18&&caja.max.z<=inicioFranjaFrontal?0:
        caja.min.z>=0&&caja.max.z<=12?reduccionCentral:
        caja.min.z>=finFranjaFrontal?-retrocesoFrontal:caja.max.z<=-14?avancePosterior+reduccionCentral:null;
      if(dx!==null&&dz!==null){
        if(dx||dz)trasladar(objeto,dx,dz);
        return;
      }
    }
    const datos=objeto.userData;
    if(objeto.isCSS2DObject||datos.puertaInteractiva||datos.zonaElevadores||datos.bebedero){
      const z=objeto.getWorldPosition(p).z;
      trasladar(objeto,ajustarX(p.x)-p.x,ajustarZ(z,p.x)-z);
      return;
    }
    if(objeto.isInstancedMesh){
      for(let i=0;i<objeto.count;i++){
        objeto.getMatrixAt(i,matriz);
        p.setFromMatrixPosition(matriz);
        objeto.localToWorld(p);
        p.z=ajustarZ(p.z,p.x);
        p.x=ajustarX(p.x);
        matriz.setPosition(objeto.worldToLocal(p));
        objeto.setMatrixAt(i,matriz);
      }
      objeto.instanceMatrix.needsUpdate=true;
      objeto.computeBoundingBox();objeto.computeBoundingSphere();
    }else if(objeto.geometry){
      const geometria=objeto.geometry.clone();
      const pos=geometria.attributes.position;
      const inversa=objeto.matrixWorld.clone().invert();
      for(let i=0;i<pos.count;i++){
        p.fromBufferAttribute(pos,i).applyMatrix4(objeto.matrixWorld);
        p.z=ajustarZ(p.z,p.x);
        p.x=ajustarX(p.x);
        p.applyMatrix4(inversa);
        pos.setXYZ(i,p.x,p.y,p.z);
      }
      geometria.computeBoundingBox();geometria.computeBoundingSphere();
      objeto.geometry=geometria;
    }
    objeto.children.forEach(visitar);
  }
  campus.children.forEach(visitar);
}
