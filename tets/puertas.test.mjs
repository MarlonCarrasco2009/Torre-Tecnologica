import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../.preview/three.core.mjs';
import {crearPuertasFachada} from '../js/puertas.js';

// Ejecuta la geometría real; solo omite los rótulos que necesitan canvas/DOM.
const source=await readFile(new URL('../js/geometria.js',import.meta.url),'utf8');
const bloqueSource=source.slice(source.indexOf('export function bloque('),source.indexOf('export function placa(')).replace('export ','');
const fachadaSource=source.slice(source.indexOf('export const finVidrioAdmision=')).replaceAll('export ','');
const crear=new Function('THREE','rotuloFachada',`${bloqueSource}\n${fachadaSource}\nreturn fachadaTorreA;`)(THREE,()=>{});
const escena=new THREE.Scene();
const fachada=crear(escena,{x:35.515625,z:5.6,largo:35.6,baseY:1.82,tipo:'conferencias',alto:4.4});
const puertas=fachada.children.filter(o=>o.userData.puertaAuditorio);
escena.updateMatrixWorld(true);
assert.equal(puertas.length,5);
const centros=[-35.6*.38-.65,-35.6*.38+.65,-35.6*.14,35.6*.38-.65,35.6*.38+.65];
for(const [i,p] of puertas.entries()){
  assert.equal(p.userData.centroVano,centros[i]);
  assert.equal(p.rotation.y,0);
  assert(Math.abs(p.userData.ancho-1.1)<1e-10);
  const bounds=new THREE.Box3().setFromObject(p);
  assert(bounds.max.x-bounds.min.x<.25,'Cerrada queda en el plano de fachada');
}
const control=crearPuertasFachada(escena);
assert.equal(control.alternar(fachada),false);
for(const p of puertas)assert(control.alternar(p.children[0]));
for(let i=0;i<40;i++)control.actualizar(.02);
for(const p of puertas){
  assert.equal(p.rotation.y,p.userData.anguloAbierto);
  const centro=p.children[0].getWorldPosition(new THREE.Vector3());
  assert(centro.x<fachada.position.x-.4,'Todas las hojas abren hacia el interior del auditorio');
}
assert.equal(puertas[0].rotation.y,-puertas[1].rotation.y);
assert.equal(puertas[3].rotation.y,-puertas[4].rotation.y);
for(const p of puertas)control.alternar(p.children[0]);
for(let i=0;i<40;i++)control.actualizar(.02);
for(const p of puertas)assert.equal(p.rotation.y,0);
const navSource=(await readFile(new URL('../js/navegacion.js',import.meta.url),'utf8'))
  .replace("'three'",JSON.stringify(new URL('../.preview/three.core.mjs',import.meta.url).href));
const {crearNavegacion}=await import('data:text/javascript;base64,'+Buffer.from(navSource).toString('base64'));
const piso=new THREE.Mesh(new THREE.BoxGeometry(12,.2,45),new THREE.MeshBasicMaterial());
piso.position.set(fachada.position.x,1.72,fachada.position.z);escena.add(piso);
const nav=crearNavegacion(escena),puerta=puertas[2];
const z=fachada.position.z-puerta.userData.centroVano;
const posicion=new THREE.Vector3(fachada.position.x+1,1.82,z);
for(let i=0;i<50;i++)nav.mover(posicion,-.04,0);
assert(posicion.x>fachada.position.x,'La hoja cerrada impide atravesar');
control.alternar(puerta.children[0]);
for(let i=0;i<40;i++)control.actualizar(.02);
for(let i=0;i<60;i++)nav.mover(posicion,-.04,0);
assert(posicion.x<fachada.position.x-.4,'La colisión sigue la hoja abierta y libera el vano');
console.log('OK: cinco vanos conservados, hojas alineadas, apertura interior y cierre por clic.');

const escenaVidrio=new THREE.Scene();
const estudiantes=crear(escenaVidrio,{x:35.515625,z:-16.65,largo:8.9,baseY:1.82,tipo:'estudiantes',alto:4.4});
const hojas=estudiantes.children.filter(o=>o.userData.puertaInteractiva);
assert.equal(hojas.length,2);
assert.deepEqual(hojas.map(o=>o.userData.centroVano),[-.45,.45]);
const fijos=estudiantes.children.filter(o=>!o.userData.puertaInteractiva);
const posicionesFijas=fijos.map(o=>o.position.toArray());
const vidrioControl=crearPuertasFachada(escenaVidrio);
for(const hoja of hojas){
  assert.equal(hoja.rotation.y,0);
  assert.equal(hoja.userData.ancho,.8);
  assert(vidrioControl.alternar(hoja.children[0]));
}
for(let i=0;i<40;i++)vidrioControl.actualizar(.02);
for(const hoja of hojas){
  assert(hoja.children[0].getWorldPosition(new THREE.Vector3()).x<estudiantes.position.x-.3);
  vidrioControl.alternar(hoja.children[0]);
}
for(let i=0;i<40;i++)vidrioControl.actualizar(.02);
assert(hojas.every(o=>o.rotation.y===0));
assert.deepEqual(fijos.map(o=>o.position.toArray()),posicionesFijas);
console.log('OK: doble puerta de vidrio alineada, apertura interior, cierre y paños fijos conservados.');

// La compactación final del campus también debe respetar los vanos.
const franjaSource=(await readFile(new URL('../js/franja-campus.js',import.meta.url),'utf8'))
  .replace("'three'",JSON.stringify(new URL('../.preview/three.core.mjs',import.meta.url).href));
const {compactarFranja}=await import('data:text/javascript;base64,'+Buffer.from(franjaSource).toString('base64'));
const campus=new THREE.Group();
const auditorio=crear(campus,{x:35.515625,z:5.6,largo:35.6,baseY:1.82,tipo:'conferencias'});
const paredSource=source.slice(source.indexOf('export function paredConPuerta('),source.indexOf('export function etiqueta(')).replace('export ','');
const crearLateral=new Function('THREE',bloqueSource+paredSource+'return paredConPuerta;')(THREE);
const lateral=crearLateral(campus,{x:20.48,z:-16.65,largo:8.9,baseY:1.82,alto:4.4,
  rotacion:-Math.PI/2,puertaCentro:3.4,colorMuro:'#465057',interactiva:true});
campus.updateMatrixWorld(true);
const conjunto=[...auditorio.children.filter(o=>o.userData.puertaInteractiva).slice(-2),
  ...lateral.children.filter(o=>o.userData.puertaInteractiva)];
const limites=o=>new THREE.Box3().setFromObject(o);
const antes=conjunto.map(limites);
compactarFranja(campus);
campus.updateMatrixWorld(true);
for(const [i,hoja] of conjunto.entries()){
  const despues=limites(hoja),centro=despues.getCenter(new THREE.Vector3());
  assert(Math.abs(despues.min.z-antes[i].min.z-10.25)<1e-5);
  const rayo=new THREE.Raycaster(new THREE.Vector3(centro.x+1,2.85,centro.z),new THREE.Vector3(-1,0,0),0,2);
  assert(rayo.intersectObject(hoja,true).length);
  hoja.rotation.y=hoja.userData.anguloAbierto;
  campus.updateMatrixWorld(true);
  assert.equal(rayo.intersectObject(hoja.parent,true).length,0,'Vano despejado al abrir después de compactar');
}
