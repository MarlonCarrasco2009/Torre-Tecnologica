import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../.preview/three.core.mjs';

const threeUrl=new URL('../.preview/three.core.mjs',import.meta.url).href;
const source=(await readFile(new URL('../js/bebederos.js',import.meta.url),'utf8'))
  .replace("'three'",JSON.stringify(threeUrl));
const {crearBebederos}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const escena=new THREE.Group();
const servicio=crearBebederos(escena);
assert.equal(escena.children.length,3);
assert.equal(servicio.activar(new THREE.Group()),false);
for(const grupo of escena.children){
  const estado=grupo.userData.bebedero;
  assert.equal(estado.agua.visible,false);
  assert(servicio.activar(estado.boton));
  servicio.actualizar(.1);
  assert(estado.agua.visible);
  for(const otro of escena.children)if(otro!==grupo)assert.equal(otro.userData.bebedero.agua.visible,false);
  assert(estado.gotas.every(g=>g.position.toArray().every(Number.isFinite)));
  const anterior=estado.gotas[0].position.clone();
  servicio.actualizar(.2);
  assert(anterior.distanceTo(estado.gotas[0].position)>0);
  servicio.actualizar(4);
  assert.equal(estado.agua.visible,false);
  assert.equal(estado.boton.position.z,.709);
  // Puede volver a accionarse después del cierre automático.
  assert(servicio.activar(estado.boton));
  servicio.actualizar(4);
  const limites=new THREE.Box3().setFromObject(grupo);
  assert(limites.min.toArray().every(Number.isFinite));
  assert(limites.max.toArray().every(Number.isFinite));
}
console.log('OK: tres bebederos independientes, agua animada, cierre automático, reactivación y geometría válida.');
