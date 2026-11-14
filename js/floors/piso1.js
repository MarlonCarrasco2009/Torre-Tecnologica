import * as THREE from 'three';
import { AMBIENTES,CONFIG,distribucionInterior } from '../config.js';
import { bloque,placa,columna,etiqueta,paredVidrio,paredConPuertas,paredConPuerta,fachadaTorreA } from '../geometria.js?v=puertas-estudiantes-96';
import { crearZonaElevadores } from '../elevadores.js';

// Devuelve un grupo independiente por torre: exactamente el PRIMER piso.
// Los demás niveles los crearán otros compañeros en módulos diferentes.
export function crearPiso1(torre, objetosSeleccionables, capaEtiquetas){
  const grupo=new THREE.Group(); grupo.name=`Piso 1 - Torre ${torre.id}`;
  const w=torre.ancho,d=torre.fondo;
  // El diseño anterior usaba 16 x 54 para todas las torres. Ahora los ambientes
  // crecen con la huella real de C, B y A, sin alterar el archivo de cada piso.
  const factorX=w/16;
  const {factorZ,desplazamientoZ}=distribucionInterior(torre);
  const posicionZ=z=>z*factorZ+desplazamientoZ;
  // Base maciza elevada: la cara superior queda a la cota de llegada de las escaleras.
  const baseInferior=.08,superficie=CONFIG.baseY+.01;
  const base={y:(baseInferior+superficie)/2,
    alto:superficie-baseInferior,fondo:d,color:CONFIG.acabados.piso};
  if(torre.id==='A'){
    // Dos partes contiguas: la textura se aplica a la propia base, sin láminas superpuestas.
    const fachada=13*w/32,anchoPasillo=w/2-fachada;
    bloque(grupo,{...base,x:(fachada-w/2)/2,ancho:fachada+w/2})
      .name='Base del área abierta de Torre A';
    bloque(grupo,{...base,x:(fachada+w/2)/2,ancho:anchoPasillo})
      .name='Base del pasillo exterior de Torre A';
  }else{
    bloque(grupo,{...base,ancho:w});
  }

  // Una columna gruesa en cada círculo del croquis: zonas abiertas de A y B.
  // Sustituye las filas de pilares delgados de esas dos torres.
  if(torre.id==='A'||torre.id==='B'){
    const soporte=bloque(grupo,{x:0,z:d/2-7,y:superficie+CONFIG.altoPiso/2,
      ancho:1.8,alto:CONFIG.altoPiso,fondo:1.8,color:CONFIG.acabados.columna});
    soporte.name=`Columna gruesa frontal - Torre ${torre.id}`;
    if(torre.id==='A'){
      // Alineada con la fachada lateral, según la guía transversal del patio.
      bloque(grupo,{x:13*w/32,z:d/2-5.7,y:superficie+CONFIG.altoPiso/2,
        ancho:2.8,alto:CONFIG.altoPiso,fondo:2.8,color:CONFIG.acabados.columna})
        .name='Columna adicional junto al jardín frontal - Torre A';
    }
  }else{
    // La cafetería queda abierta: se retiran sus cuatro columnas frontales.
    for(const x of [-w/2+.75,w/2-.75]){
      for(const z of (torre.id==='C'?[]:[d/2-2.2,d/2-10])) columna(grupo,x,z,CONFIG.altoPiso,CONFIG.baseY);
    }
    for(const x of [-w/2+.75,w/2-.75]){
      if(torre.id!=='C') columna(grupo,x,-d/2+1.2,CONFIG.altoPiso,CONFIG.baseY);
    }
  }

  // Muros parciales, NO una caja cerrada. Aperturas permiten circular entre zonas.
  for(const ambiente of AMBIENTES[torre.id]){
    const x=ambiente.x*factorX;
    // Ajusta solo el extremo frontal (+Z), conservando el extremo posterior.
    // Se aplica después de distribuir las salas para no mover otros ambientes.
    const recorte=ambiente.recorteFrontal||0;
    const ampliacion=ambiente.ampliacionFrontal||0;
    const z=posicionZ(ambiente.z)+(ampliacion-recorte)/2;
    const ancho=ambiente.ancho*factorX;
    const fondo=ambiente.fondo*factorZ+ampliacion-recorte;
    if(ambiente.id==='b-elevadores'){
      const zona=crearZonaElevadores(grupo,{x,z,ancho,fondo});
      zona.plantaBaja.suelo.userData.info={...ambiente,torre:torre.id};
      objetosSeleccionables.push(zona.plantaBaja.suelo);
      etiqueta(capaEtiquetas,ambiente.nombre,torre.x+x,CONFIG.baseY+3.6,torre.z+z);
      continue;
    }
    const suelo=placa(grupo,{x,y:CONFIG.baseY+.055,z,ancho,fondo,color:CONFIG.acabados.piso});
    suelo.userData.info={...ambiente,torre:torre.id};
    suelo.material.emissive=new THREE.Color('#000000');
    objetosSeleccionables.push(suelo);

    const h=torre.id==='A'?4.4:3.2, espesor=.3, alturaCentro=CONFIG.baseY+h/2;
    const paredMat=new THREE.MeshStandardMaterial({color:CONFIG.acabados.pared,roughness:.83});
    const p=ambiente.paredes||[];
    const ladosPared=new Set(p);
    // También se retira la viga/muro horizontal oscuro de la cafetería.
    if(ladosPared.has('norte')&&ambiente.id!=='c-cafeteria') bloque(grupo,{x,y:alturaCentro,z:z-fondo/2,ancho,alto:h,fondo:espesor,material:paredMat});
    if(ladosPared.has('sur')) bloque(grupo,{x,y:alturaCentro,z:z+fondo/2,ancho,alto:h,fondo:espesor,material:paredMat});
    if(ladosPared.has('oeste')) bloque(grupo,{x:x-ancho/2,y:alturaCentro,z,ancho:espesor,alto:h,fondo,material:paredMat});
    if(ladosPared.has('este')) bloque(grupo,{x:x+ancho/2,y:alturaCentro,z,ancho:espesor,alto:h,fondo,material:paredMat});
    if(ambiente.fachada)fachadaTorreA(grupo,{x:x+ancho/2,z,largo:fondo,
      baseY:CONFIG.baseY,alto:h,tipo:ambiente.fachada});

    // Los dos lados de acceso de los elevadores se cierran con vidrio y puertas.
    for(const lado of ambiente.paredesVidrio||[]){
      if(lado==='este') paredVidrio(grupo,{x:x+ancho/2,z,largo:fondo,baseY:CONFIG.baseY,alto:h,rotacion:Math.PI/2});
      if(lado==='oeste') paredVidrio(grupo,{x:x-ancho/2,z,largo:fondo,baseY:CONFIG.baseY,alto:h,rotacion:-Math.PI/2});
      if(lado==='sur') paredVidrio(grupo,{x,z:z+fondo/2,largo:ancho,baseY:CONFIG.baseY,alto:h});
    }

    for(const lado of ambiente.paredesConPuertas||[]){
      if(lado==='este') paredConPuertas(grupo,{x:x+ancho/2,z,largo:fondo,baseY:CONFIG.baseY,alto:h,rotacion:Math.PI/2});
      if(lado==='oeste') paredConPuerta(grupo,{x:x-ancho/2,z,largo:fondo,baseY:CONFIG.baseY,alto:h,rotacion:-Math.PI/2,puertaCentro:fondo/2-2});
    }

    // Etiquetas livianas flotantes. Pueden ocultarse desde el panel lateral.
    const etiquetas=etiqueta(capaEtiquetas,ambiente.nombre,torre.x+x,CONFIG.baseY+.98,torre.z+z);
    etiquetas.userData.ambiente=ambiente.id;
  }

  // Apariencia simplificada del uso en algunos espacios.
  if(torre.id==='C'){
    // Mesitas en cafetería, sin bloquear los pasillos.
    for(const dx of [-3.5,2.5]){
      for(const dz of [13.5,18.5]){
        bloque(grupo,{x:dx*factorX,y:CONFIG.baseY+.68,z:posicionZ(dz),ancho:1.8,alto:.10,fondo:1.25,color:'#b08a68'});
        bloque(grupo,{x:dx*factorX,y:CONFIG.baseY+.34,z:posicionZ(dz),ancho:.15,alto:.65,fondo:.15,color:'#6f7d83'});
      }
    }
  }
  if(torre.id==='B'){
    // Estantes esquemáticos de la biblioteca.
    for(const z of [-8,-4,0]) bloque(grupo,{x:-2.8*factorX,y:CONFIG.baseY+.72,z:posicionZ(z),ancho:3.4,alto:1.3,fondo:.43,color:'#9f866e'});
  }
  if(torre.id==='A'){
    // Tarima de sala de conferencias.
    bloque(grupo,{x:0,y:CONFIG.baseY+.24,z:18.9,ancho:10,alto:.32,fondo:2.8,color:'#a4b1c1'});
    // Mostrador visible a través de la doble puerta de Experiencia Estudiantil.
    bloque(grupo,{x:1.4,y:CONFIG.baseY+.55,z:-18.15,ancho:1.2,alto:1.1,fondo:4.4,color:'#aaa49a'});
    bloque(grupo,{x:1.4,y:CONFIG.baseY+1.13,z:-18.15,ancho:1.35,alto:.08,fondo:4.5,color:'#d5d2c9'});
  }
  etiqueta(capaEtiquetas,torre.nombre,torre.x,CONFIG.baseY+4.98,torre.z+torre.fondo/2-4,'tower',torre.id.toLowerCase());
  return grupo;
}
