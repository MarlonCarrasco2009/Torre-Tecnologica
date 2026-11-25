import * as THREE from 'three';

// En la planta de referencia la derecha corresponde a -Z. La franja de
// seis unidades queda en una y media; el sector posterior avanza en bloque.
const avancePosterior=4.5;
const reduccionCentral=5.75;
const inicioFranjaFrontal=29,finFranjaFrontal=35,retrocesoFrontal=.5;
const inicioPasoIngreso=-19.48,finPasoIngreso=-14,ensancheIngreso=3;
// Deja 5.5 unidades de las siete originales entre las referencias de B y A.
const reduccionPasillo=1.5;
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
  const pasoIngreso=THREE.MathUtils.clamp((finPasoIngreso-z)/(finPasoIngreso-inicioPasoIngreso),0,1);
  return z+cierreCentral+avancePosterior*THREE.MathUtils.clamp((finPosterior-z)/6,0,1)
    -retrocesoFrontal*frontal-ensancheIngreso*pasoIngreso;
}

// Los objetos de Torre C interpolan entre los mismos encuentros del edificio y sus accesos.
const anclasC=[-39,-32,-22,-10.9,7,14.5,19.5,28.5,33,39];
export function zTorreC(z){
  if(z<=anclasC[0]||z>=anclasC.at(-1))return ajustarZ(z,-28);
  const i=anclasC.findIndex(a=>a>=z),a=anclasC[i-1],b=anclasC[i];
  return THREE.MathUtils.lerp(ajustarZ(a,-28),ajustarZ(b,-28),(z-a)/(b-a));
}

export function compactarFranja(campus){
  campus.updateMatrixWorld(true);
  const caja=new THREE.Box3(),p=new THREE.Vector3(),matriz=new THREE.Matrix4();
  function trasladar(objeto,dx,dz){
    objeto.getWorldPosition(p);
    p.x+=dx;p.z+=dz;
    objeto.position.copy(objeto.parent.worldToLocal(p));
  }
  function visitar(objeto,referenciaX){
    referenciaX=objeto.userData.referenciaLongitudinalX??referenciaX;
    caja.setFromObject(objeto);
    if(!caja.isEmpty()){
      const dx=caja.max.x<=9?reduccionPasillo:
        caja.min.x>=finPasoTorreA?-reduccionPasoTorreA:
        caja.min.x>=16&&caja.max.x<=inicioPasoTorreA?0:null;
      const dz=caja.min.z>=18&&caja.max.z<=inicioFranjaFrontal?0:
        caja.min.z>=0&&caja.max.z<=12?reduccionCentral:
        caja.min.z>=finFranjaFrontal?-retrocesoFrontal:
        caja.max.z<=inicioPasoIngreso?avancePosterior+reduccionCentral-ensancheIngreso:null;
      if(dx!==null&&dz!==null){
        if(dx||dz)trasladar(objeto,dx,dz);
        return;
      }
    }
    const datos=objeto.userData;
    if(objeto.isCSS2DObject||datos.puertaInteractiva||datos.zonaElevadores||datos.bebedero||datos.conservarForma){
      const z=objeto.getWorldPosition(p).z;
      trasladar(objeto,ajustarX(p.x)-p.x,ajustarZ(z,referenciaX??p.x)-z);
      return;
    }
    if(objeto.isInstancedMesh){
      for(let i=0;i<objeto.count;i++){
        objeto.getMatrixAt(i,matriz);
        p.setFromMatrixPosition(matriz);
        objeto.localToWorld(p);
        p.z=ajustarZ(p.z,referenciaX??p.x);
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
        p.z=ajustarZ(p.z,referenciaX??p.x);
        p.x=ajustarX(p.x);
        p.applyMatrix4(inversa);
        pos.setXYZ(i,p.x,p.y,p.z);
      }
      geometria.computeBoundingBox();geometria.computeBoundingSphere();
      objeto.geometry=geometria;
    }
    objeto.children.forEach(hijo=>visitar(hijo,referenciaX));
    if(datos.tipo==='escalera'&&datos.barandas===3){
      // La compresión puede estrechar un carril más que el otro. Usa los dos
      // laterales ya transformados para centrar cada poste y el pasamanos.
      for(const nombre of ['Poste de baranda de escalera','Pasamanos longitudinal de escalera']){
        const piezas=objeto.children.filter(pieza=>pieza.name===nombre);
        const porLinea=piezas.length/3;
        for(let i=0;i<porLinea;i++){
          const centros=[i,i+porLinea,i+2*porLinea].map(indice=>
            caja.setFromObject(piezas[indice],true).getCenter(new THREE.Vector3()));
          const ajuste=centros[0].lerp(centros[2],.5).sub(centros[1]);
          trasladar(piezas[i+porLinea],ajuste.x,ajuste.z);
        }
      }
    }
  }
  campus.children.forEach(hijo=>visitar(hijo));
}
