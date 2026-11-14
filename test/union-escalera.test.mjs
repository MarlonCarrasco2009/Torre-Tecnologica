import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../.preview/three.core.mjs';
const source=await readFile(new URL('../js/exteriores.js',import.meta.url),'utf8');
const geo=await readFile(new URL('../js/geometria.js',import.meta.url),'utf8');
const bloque=geo.slice(geo.indexOf('export function bloque('),geo.indexOf('export function placa(')).replace('export ','');
const helpers=source.slice(source.indexOf('const materialBarandaMetal='),source.indexOf('export function jardinContorno('));
const rampa=source.slice(source.indexOf('function rampaTrapezoidal('),source.indexOf('function descansoMacizo('));
const {recorrido,rampaTrapezoidal}=new Function('THREE',`const pavimento='#686d72',pavimentoRampa='#93999e';${bloque}\n${helpers}\n${rampa}\nreturn {recorrido,rampaTrapezoidal};`)(THREE);
const navSource=(await readFile(new URL('../js/navegacion.js',import.meta.url),'utf8'))
  .replace("'three'",JSON.stringify(new URL('../.preview/three.core.mjs',import.meta.url).href));
const {crearNavegacion}=await import('data:text/javascript;base64,'+Buffer.from(navSource).toString('base64'));
const escena=new THREE.Scene();
// Usa las coordenadas reales de la llamada para detectar cambios de alineación.
const llamada=source.match(/recorrido\(acceso,\{x:71\.991[\s\S]*?nombre:'Escalera exterior junto al jardín en L'\}\);/)[0];
new Function('recorrido','acceso',`const extensionPasadizo=1.5,separacionEscaleraRampa=.5,inicioComunRampaEscalera=21.5,finPasadizo=19.9,bajo=.14;${llamada}`)(recorrido,escena);
const derechaSur=71.15+(74.1-71.15)*(19.9+14)/38+2.1;
const izquierdaSur=71.912+.75+.5-(3.748+1.5)/2;
const pisoSource=source.slice(source.indexOf('function pisoLateralElevado('),source.indexOf('function crearAccesoLateral('));
const pisoLateralElevado=new Function('THREE',`const pavimento='#686d72';${pisoSource};return pisoLateralElevado;`)(THREE);
const llamadaPiso=source.slice(source.indexOf('  const encajeBajoJardin='),source.indexOf('  // El último peldaño'));
new Function('THREE','pisoLateralElevado','acceso','bordeJardinSur','bordePasadizoSur',
  `const bordePasadizoNorte=66.8,bordeJardinNorte=73.25,norte=-14,finPasadizo=19.9,nivelLlegadaEscaleras=1.35;${llamadaPiso}`)
  (THREE,pisoLateralElevado,escena,derechaSur,izquierdaSur);
const nav=crearNavegacion(escena);
for(const z of [-13,0,10,19]){
  const t=(z+14)/33.9,borde=THREE.MathUtils.lerp(73.25,derechaSur,t);
  const altura=THREE.MathUtils.lerp(1.35,.86,t);
  for(const dx of [-.5,-.2,0,.1]){
    assert(Math.abs(nav.altura(borde+dx,z,altura)-altura)<1e-5,'Relleno continuo hasta el jardín');
  }
}
for(const x of [72,74.3]){
  const p=new THREE.Vector3(x,.86,20.15);
  p.y=nav.altura(p.x,p.z,p.y);
  assert(p.y!==null);
  for(let i=0;i<70;i++)nav.mover(p,0,-.025);
  assert(p.z<19,`Sube y pasa al pasadizo por x=${x}: ${JSON.stringify(p)}`);
  for(let i=0;i<70;i++)nav.mover(p,0,.025);
  assert(p.z>20,`Regresa a la escalera por x=${x}`);
}
console.log('OK: unión transitable en ambos carriles, de subida y bajada.');
