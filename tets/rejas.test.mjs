import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../.preview/three.core.mjs';
import {crearPuertasFachada} from '../js/puertas.js';

const geometria=await readFile(new URL('../js/geometria.js',import.meta.url),'utf8');
const bloqueSource=geometria.slice(geometria.indexOf('export function bloque('),geometria.indexOf('export function placa(')).replace('export ','');
const source=(await readFile(new URL('../js/ingreso.js',import.meta.url),'utf8'))
  .replace(/^import .*;\r?\n/gm,'').replace('export function crearIngreso','function crearIngreso');
// Solo el dibujo de texturas y etiquetas requiere DOM; la geometría es la real.
const contexto=new Proxy({},{get:()=>()=>{}});
const document={createElement:()=>({getContext:()=>contexto})};
const crear=new Function('THREE','document','etiqueta',`${bloqueSource}\n${source}\nreturn crearIngreso;`)(THREE,document,()=>{});
const escena=new THREE.Scene();
const ingreso=crear(escena,{x:69,z:-20,baseY:1.82});
const portones=ingreso.getObjectByName('Portones del ingreso');
const hojas=portones.children.filter(o=>o.userData.puertaInteractiva);
assert.equal(hojas.length,5);
const control=crearPuertasFachada(escena);
const bisagras=hojas.map(o=>o.getWorldPosition(new THREE.Vector3()).clone());
const postes=portones.children.filter(o=>o.name==='Columna metálica fija de extremo de rejas');
assert.equal(postes.length,2);
const posicionesPostes=postes.map(o=>o.getWorldPosition(new THREE.Vector3()).toArray());
for(const i of [0,2,4])control.alternar(hojas[i].children[0].children[0]);
for(let paso=0;paso<40;paso++){
  control.actualizar(.02);escena.updateMatrixWorld(true);
  for(const [i,hoja] of hojas.entries()){
    assert(hoja.getWorldPosition(new THREE.Vector3()).distanceTo(bisagras[i])<1e-8,'La bisagra permanece fija');
    const marco=hoja.children[0].getObjectByName('Marco horizontal');
    const centro=marco.geometry.boundingBox??(marco.geometry.computeBoundingBox(),marco.geometry.boundingBox);
    const punto=marco.localToWorld(centro.getCenter(new THREE.Vector3()));
    assert(punto.z>bisagras[i].z,'Todas las hojas abren hacia los torniquetes durante toda la apertura');
  }
}
for(const i of [0,2,4])control.alternar(hojas[i].children[0].children[0]);
for(let paso=0;paso<40;paso++)control.actualizar(.02);
assert(hojas.every(o=>o.rotation.y===0),'Todas cierran');
assert.deepEqual(postes.map(o=>o.getWorldPosition(new THREE.Vector3()).toArray()),posicionesPostes);
console.log('OK: cinco hojas con bisagras fijas, apertura interior tras ampliar el ingreso, parejas sincronizadas, cierre y postes fijos.');
const navSource=(await readFile(new URL('../js/navegacion.js',import.meta.url),'utf8'))
  .replace("'three'",JSON.stringify(new URL('../.preview/three.core.mjs',import.meta.url).href));
const {crearNavegacion}=await import('data:text/javascript;base64,'+Buffer.from(navSource).toString('base64'));
const nav=crearNavegacion(escena);
const centro=hojas[0].children[0].getWorldPosition(new THREE.Vector3());
const posicion=new THREE.Vector3(centro.x,1.82,centro.z-.8);
for(let i=0;i<60;i++)nav.mover(posicion,0,.025);
assert(posicion.z<centro.z-.25,'La reja cerrada bloquea incluso entre barrotes');
control.alternar(hojas[0].children[0].children[0]);
for(let i=0;i<40;i++)control.actualizar(.02);
for(let i=0;i<65;i++)nav.mover(posicion,0,.025);
assert(posicion.z>centro.z+.35,'La reja abierta permite atravesar el vano');
console.log('OK: recorrido bloqueado por reja cerrada y libre al abrirla.');
