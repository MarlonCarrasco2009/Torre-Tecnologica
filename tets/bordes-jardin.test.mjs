import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../.preview/three.core.mjs';

const source=await readFile(new URL('../js/exteriores.js',import.meta.url),'utf8');
const funcion=source.slice(source.indexOf('function bordeJardin('),source.indexOf('\nfunction jardin('));
const borde=new Function('THREE',`const materialBordeJardin=new THREE.MeshStandardMaterial();
const materialTapaJardin=new THREE.MeshStandardMaterial();
${funcion};return bordeJardin;`)(THREE);
const puntos=[[-5,-5],[5,-5],[5,5],[-5,5]];
// La ampliación debe conservar un interior válido para triangular y plantar césped.
const definicionFranja=source.match(/const contornoFranja=([\s\S]*?);/)[1];
const franja=new Function('inicioFranja','fachada','limiteJardinFrontal','finAmpliacion',
  `return ${definicionFranja};`)(16.35,28+13*18.5/32,38.86,8.35);
const interiorFranja=borde(new THREE.Group(),franja,1.9,.55,'#08090b',[3]);
assert(interiorFranja.flat().every(Number.isFinite),'El contorno ampliado no debe producir NaN');
const superficie=new THREE.ShapeGeometry(new THREE.Shape(interiorFranja.map(([x,z])=>new THREE.Vector2(x,z))));
assert(superficie.index.count>0,'El jardín ampliado debe tener superficie de relleno');
assert([...superficie.attributes.position.array].every(Number.isFinite),'El relleno debe tener vértices válidos');
for(const contorno of [puntos,[...puntos].reverse()]){
  const grupo=new THREE.Group();
  borde(grupo,contorno,1.9);
  grupo.updateMatrixWorld(true);
  for(const direccion of [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]]){
    const dir=new THREE.Vector3(...direccion);
    for(const y of [2.1,2.5]){
      const rayo=new THREE.Raycaster(new THREE.Vector3(0,y,0),dir,0,6);
      const hits=rayo.intersectObjects(grupo.children,false);
      assert(hits.length,'El muro y la coronación deben ser visibles desde el jardín');
      assert(Math.abs(hits[0].distance-4.5)<1e-5,'Se ve la cara interior, no la exterior');
      rayo.set(dir.clone().multiplyScalar(6).setY(y),dir.clone().negate());
      const exteriores=rayo.intersectObjects(grupo.children,false);
      assert(exteriores.length&&Math.abs(exteriores[0].distance-1)<1e-5);
    }
  }
}
console.log('OK: caras interiores y exteriores de muro y coronación, con ambos sentidos de contorno.');

// En jardines abiertos, el muro debe tocar el mismo contorno que el césped.
const abierto=new THREE.Group();
const interior=borde(abierto,puntos,1.9,.55,'#08090b',[2]);
abierto.updateMatrixWorld(true);
const limiteCesped=interior[1][0];
for(const y of [1.9,2.5]){
  const rayo=new THREE.Raycaster(new THREE.Vector3(0,y,0),new THREE.Vector3(1,0,0));
  const hits=rayo.intersectObjects(abierto.children,false);
  assert(hits.length&&Math.abs(hits[0].distance-limiteCesped)<1e-5,
    'El césped y la cara interior del borde abierto deben coincidir sin franja vacía');
}
