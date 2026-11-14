import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { crearPiso1 } from './piso1.js?v=columna-alineada-a-112';
import { aplicarPiedraPisos } from '../piedra-piso.js?v=pizarra-pasillo-a-93';

// Cada torre es un grupo independiente. Así se añaden pisos después.
export function crearTorres(escena,seleccionables,capaEtiquetas){
  const grupos={};
  for(const torre of Object.values(CONFIG.torres)){
    const edificio=new THREE.Group();
    edificio.name=`Torre ${torre.id}`;
    edificio.position.set(torre.x,0,torre.z);
    edificio.add(crearPiso1(torre,seleccionables,capaEtiquetas));
    escena.add(edificio); grupos[torre.id]=edificio;
    const bases=['Base del pasillo exterior de Torre A','Base del área abierta de Torre A']
      .map(nombre=>edificio.getObjectByName(nombre)).filter(Boolean);
    if(bases.length)aplicarPiedraPisos(bases,CONFIG.acabados.piso);
  }
  return grupos;
}

// Para usar en el futuro, sin modificar el primer piso:
// agregarPiso(torres, 'A', 2, () => crearPiso2A());
// La función de tu compañero debe devolver un THREE.Group ubicado desde y=0.
export function agregarPiso(torres,idTorre,numeroPiso,crearContenido){
  if(!torres[idTorre]) throw new Error(`Torre no existente: ${idTorre}`);
  if(!Number.isInteger(numeroPiso) || numeroPiso<2) throw new Error('El nuevo piso debe ser 2 o mayor.');
  if(typeof crearContenido!=='function') throw new Error('crearContenido debe ser una función.');
  if(torres[idTorre].getObjectByName(`Piso ${numeroPiso} - Torre ${idTorre}`)) throw new Error('Ese piso ya existe.');
  const grupo=crearContenido();
  if(!(grupo instanceof THREE.Group)) throw new Error('crearContenido debe devolver THREE.Group.');
  grupo.name=`Piso ${numeroPiso} - Torre ${idTorre}`;
  grupo.position.y=(numeroPiso-1)*CONFIG.altoPiso;
  torres[idTorre].add(grupo);
  return grupo;
}
