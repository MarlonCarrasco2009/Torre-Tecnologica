import * as THREE from 'three';
import {AMBIENTES, CONFIG, distribucionInterior} from '../config.js';
import {bloque, placa, etiqueta} from '../geometria.js';
import {crearInteriorC,Z_FONDO_SERVICIOS_C} from '../interiores-c.js';
export function crearPiso1C(torre, objetosSeleccionables, capaEtiquetas){
  const grupo=new THREE.Group();grupo.name=`Piso 1 - Torre ${torre.id}`;
  const factorX=torre.ancho/16;
  const {factorZ,desplazamientoZ}=distribucionInterior(torre);
  const superficie=CONFIG.baseY+.01, baseInferior=.08;
  bloque(grupo,{y:(baseInferior+superficie)/2,alto:superficie-baseInferior,ancho:torre.ancho,fondo:torre.fondo,color:CONFIG.acabados.piso}).name='Base continua del patio de Torre C';
  for(const ambiente of AMBIENTES.C){
    const x=ambiente.x*factorX,z=ambiente.z*factorZ+desplazamientoZ+((ambiente.ampliacionFrontal||0)-(ambiente.recorteFrontal||0))/2;
    const ancho=ambiente.ancho*factorX,fondo=ambiente.fondo*factorZ+(ambiente.ampliacionFrontal||0)-(ambiente.recorteFrontal||0);
    const desde=ambiente.id==='c-servicios'?Math.max(z-fondo/2,Z_FONDO_SERVICIOS_C):z-fondo/2,hasta=z+fondo/2;
    const suelo=placa(grupo,{x,y:CONFIG.baseY+.055,z:(desde+hasta)/2,ancho,fondo:hasta-desde,color:CONFIG.acabados.piso});
    suelo.userData.info={...ambiente,torre:torre.id};suelo.material.emissive=new THREE.Color('#000000');objetosSeleccionables.push(suelo);
    etiqueta(capaEtiquetas,ambiente.nombre,torre.x+x,CONFIG.baseY+.98,torre.z+z).userData.ambiente=ambiente.id;
  }
  crearInteriorC(grupo);
  etiqueta(capaEtiquetas,torre.nombre,torre.x,CONFIG.baseY+4.98,torre.z+torre.fondo/2-4,'tower',torre.id.toLowerCase());
  return grupo;
}
