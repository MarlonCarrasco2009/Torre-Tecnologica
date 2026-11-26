import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from '../.preview/three.core.mjs';
import {CONFIG} from '../js/config.js';
import {crearPuertasFachada} from '../js/puertas.js';

// Mismo modelo que en el navegador, con Three.js local y sin dibujar las etiquetas.
const threeUrl=new URL('../.preview/three.core.mjs',import.meta.url).href;
registerHooks({resolve(nombre,contexto,siguiente){
  if(nombre==='three')return {url:threeUrl,shortCircuit:true};
  if(nombre==='three/addons/renderers/CSS2DRenderer.js'){
    const codigo=`export {Object3D as CSS2DObject} from '${threeUrl}'`;
    return {url:'data:text/javascript,'+encodeURIComponent(codigo),shortCircuit:true};
  }
  return siguiente(nombre,contexto);
}});
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
const {crearPiso1}=await import('../js/floors/piso1.js');
const {crearServicioElevadores,cotaPiso}=await import('../js/elevadores.js');
const {crearNavegacion}=await import('../js/navegacion.js');
const torre=crearPiso1(CONFIG.torres.B,[],new THREE.Group());
torre.scale.z=CONFIG.escalaLongitudinalCampus;
torre.updateMatrixWorld(true);
const zona=torre.getObjectByName('Área de elevadores').userData.zonaElevadores;
const servicio=crearServicioElevadores(zona);
const nivel=zona.niveles.get(2).grupo;
const navegacion=crearNavegacion(torre);
const descanso=new THREE.Box3().setFromObject(torre.getObjectByName('Piso de llegada de la escalera junto a los elevadores'));
const cierre=new THREE.Box3().setFromObject(torre.getObjectByName('Pared blanca transversal del descanso superior'));
assert(Math.abs(descanso.max.x-cierre.min.x)<.00001,'El descanso termina en la cara interior del muro');
const retorno=torre.getObjectByName('Escalera de retorno al segundo piso');
const ejes=retorno.children.filter(o=>o.geometry?.type==='CylinderGeometry')
  .map(o=>o.getWorldPosition(new THREE.Vector3()).z);
assert(Math.abs(descanso.min.z-Math.min(...ejes))<.00001,'El borde de la losa está alineado con la baranda exterior');
const extension=new THREE.Box3().setFromObject(nivel.getObjectByName('Descanso junto al último elevador'));
const paso=extension.getCenter(new THREE.Vector3());
paso.set(paso.x,extension.max.y,extension.max.z+.4);
const destino=extension.min.z-.25;
const hoja=nivel.getObjectByName('Acceso azul del vestíbulo al descanso').children.find(o=>o.userData.puertaInteractiva);
for(let i=0;i<25;i++)navegacion.mover(paso,0,-.04);
assert(paso.z>extension.max.z,'La puerta cerrada impide entrar');
const puertas=crearPuertasFachada(torre);
assert(puertas.alternar(hoja.children[0]));
for(let i=0;i<40;i++)puertas.actualizar(.02);
for(let i=0;i<150&&paso.z>destino;i++)navegacion.mover(paso,0,-.04);
assert(paso.z<=destino&&Math.abs(paso.y-extension.max.y)<.001,'Paso a nivel del vestíbulo al descanso');
const pisoEscalera=torre.getObjectByName('Piso superior sobre el tramo junto a los elevadores');
const losa=new THREE.Box3().setFromObject(pisoEscalera);
// Cruza la junta del descanso por encima del paño exterior del ramal inferior.
for(const distancia of [.3,.8,1.2]){
  for(let dz=-.3;dz<=.3;dz+=.02){
    const altura=navegacion.altura(losa.min.x+distancia,losa.max.z+dz,losa.max.y);
    assert(altura!==null&&Math.abs(altura-losa.max.y)<.001,'Junta plana entre escalera y ampliación');
  }
}

function avanzarHasta(fase){
  for(let i=0;i<300&&servicio.fase!==fase;i++)servicio.actualizar(.05);
  assert.equal(servicio.fase,fase);
}

assert.equal(zona.cabinas.length,6);
for(const c of zona.cabinas){
  servicio.reiniciar(2);
  const centro=zona.grupo.localToWorld(new THREE.Vector3(c.x,cotaPiso(2)+1.5,c.z));
  const cabina=new THREE.Box3().setFromObject(c.grupo);
  for(const signo of [-1,1]){
    const rayo=new THREE.Raycaster(centro,new THREE.Vector3(signo,0,0));
    const impacto=rayo.intersectObject(nivel)[0];
    assert(impacto,'Hay un muro a cada lado del hueco');
    const holgura=signo>0?impacto.point.x-cabina.max.x:cabina.min.x-impacto.point.x;
    assert(holgura>.05&&holgura<.3,'El muro delimita el hueco dejando espacio para la cabina');
  }
  const pasoInterior=cabina.clone().expandByScalar(-.12);
  pasoInterior.min.y=cotaPiso(1)+3;
  pasoInterior.max.y=cotaPiso(3)+1;
  nivel.traverseVisible(objeto=>{
    if(objeto.isMesh)assert(!pasoInterior.intersectsBox(new THREE.Box3().setFromObject(objeto)),
      `El paso vertical de la cabina ${c.id} está libre`);
  });

  const pos=zona.grupo.localToWorld(new THREE.Vector3(c.x,cotaPiso(2),c.z+c.frente*1.9));
  assert.equal(servicio.cercano(pos)?.id,c.id);
  assert(servicio.usar(pos));
  avanzarHasta('dentro');
  for(const piso of [1,11,2]){
    assert(servicio.viajar(piso,pos));
    avanzarHasta('dentro');
    assert.equal(servicio.piso,piso);
    assert(Math.abs(pos.y-cotaPiso(piso))<.001);
  }
  assert(servicio.salir(pos));
  avanzarHasta('libre');
  navegacion.refrescar();
  const salida=pos.clone();
  navegacion.mover(pos,0,c.frente*.2);
  assert((pos.z-salida.z)*c.frente>.19,'Se puede seguir caminando al salir al vestíbulo');
}
console.log('OK: seis huecos con holgura, llamada desde el piso 2, viajes y salida a pie.');
