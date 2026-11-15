import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
const threeURL=new URL('../.preview/three.core.mjs',import.meta.url).href;
// Usa la misma geometría que el navegador; solo sustituye las etiquetas DOM.
registerHooks({resolve(spec,context,next){
  if(spec==='three')return next(threeURL,context);
  if(spec==='three/addons/renderers/CSS2DRenderer.js')return {url:'data:text/javascript,'+encodeURIComponent(`import {Object3D} from '${threeURL}';export class CSS2DObject extends Object3D {constructor(element){super();this.element=element;}}`),shortCircuit:true};
  return next(spec,context);
}});
const ctx={fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},strokeRect(){},putImageData(){},createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)}}};
globalThis.document={createElement:()=>({style:{},classList:{add(){}},getContext:()=>ctx})};
const THREE=await import(threeURL);
const {CONFIG}=await import('../js/config.js');
const {crearExteriores}=await import('../js/exteriores.js');
const {crearPiso1}=await import('../js/floors/piso1.js');
const {crearNavegacion}=await import('../js/navegacion.js');
const {crearServicioElevadores,cotaPiso}=await import('../js/elevadores.js');
const {ACCESO_C}=await import('../js/subterraneo-c.js');
const scene=new THREE.Scene();crearExteriores(scene);
const labels=new THREE.Group();scene.add(labels);
for(const torre of Object.values(CONFIG.torres)){const g=crearPiso1(torre,[],labels);g.position.set(torre.x,0,torre.z);scene.add(g);}
scene.updateMatrixWorld(true);
scene.traverse(o=>{assert(o.matrixWorld.elements.every(Number.isFinite));if(o.isMesh){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)),o.name);}});
const zona=scene.getObjectByName('Área de elevadores').userData.zonaElevadores;
assert.equal(zona.cabinas.length,6);
assert.equal(zona.cabinas.filter(c=>c.frente===1).length,2,'Dos a la derecha desde el acceso este');
assert.equal(zona.cabinas.filter(c=>c.frente===-1).length,4,'Cuatro a la izquierda desde el acceso este');
const servicio=crearServicioElevadores(zona),p=new THREE.Vector3();
function hasta(fase){for(let i=0;i<2400&&servicio.fase!==fase;i++)servicio.actualizar(1/60);assert.equal(servicio.fase,fase);}
for(const c of zona.cabinas){
  servicio.reiniciar();p.copy(zona.grupo.localToWorld(new THREE.Vector3(c.x,cotaPiso(1),c.z+c.frente*1.9)));
  assert.equal(servicio.cercano(p)?.id,c.id);assert(servicio.usar(p));hasta('dentro');
  assert(!servicio.viajar(12,p));assert(!servicio.viajar(0,p));
  for(const piso of [11,1]){assert(servicio.viajar(piso,p));hasta('dentro');assert.equal(servicio.piso,piso);assert(Math.abs(p.y-cotaPiso(piso))<.001);}
  assert(servicio.salir(p));hasta('libre');
}
for(let n=2;n<=10;n++){assert(servicio.usar(p));hasta('dentro');assert(servicio.viajar(n,p));hasta('dentro');assert.equal(servicio.piso,n);assert(servicio.salir(p));hasta('libre');}
servicio.reiniciar();
const nav=crearNavegacion(scene);
function walk(dx,dz,n){for(let i=0;i<n;i++)nav.mover(p,dx,dz);}
// Todos los vanos pueden abordarse y salir a un suelo real.
for(const c of zona.cabinas){
  p.copy(zona.grupo.localToWorld(new THREE.Vector3(c.x,cotaPiso(1),0)));
  assert.equal(servicio.cercano(p)?.id,c.id);
  assert(servicio.usar(p));hasta('dentro');assert(servicio.salir(p));hasta('libre');nav.refrescar();
  assert(Math.abs(nav.altura(p.x,p.z,p.y)-cotaPiso(1))<.02);
}
const nivel=CONFIG.baseY+.01;
p.set(-39.7,nivel,12.5);walk(0,-.04,1050);assert(p.z<-29,'Paso continuo entre jardín y fachada');
walk(0,.04,1050);assert(p.z>12,'Regresa sin desnivel');
p.set(-40,nivel,12.7);walk(-.04,0,380);assert(p.x<-55,'Cruza entre jardín y comedor');
p.set(-40,nivel,2);walk(-.04,0,160);assert(p.x>-41.3,'El borde de jardinera impide entrar');
p.set(-39.6,nivel,19.5);walk(.04,0,110);assert(p.x>-36,'Puerta del comedor comunica con la cafetería');
assert(scene.getObjectByName('Lona tensada del comedor'));
// Desde la reja posterior se desciende hacia dentro del campus (+Z).
for(const offset of [-1.6,0,1.6]){
  p.set(ACCESO_C.x+offset,nivel,-38.95);walk(0,.025,980);
  assert(p.z>-15&&p.y<-.9,'Rampa libre desde la reja hasta el descanso '+JSON.stringify(p));
  walk(0,-.025,980);assert(p.z<-38.8&&Math.abs(p.y-nivel)<.15,'Regresa a la reja por la rampa');
}
p.set(-39.7,nivel,-38.5);walk(0,.025,300);
assert(p.z>-31.1&&Math.abs(p.y-nivel)<.01,'Entrada peatonal a nivel, sin escaleras');
const jardin=scene.getObjectByName('Jardinera rectangular alrededor de la rampa');
assert(jardin);
const sonda=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
function hayJardin(x,z){sonda.set(new THREE.Vector3(x,10,z),new THREE.Vector3(0,-1,0));return sonda.intersectObject(jardin,true).length>0;}
for(const z of [-32,-24,-16]){
  assert(hayJardin(ACCESO_C.x-4,z)&&hayJardin(ACCESO_C.x+4,z),'Plantas a ambos lados');
  assert(!hayJardin(ACCESO_C.x,z),'Calzada sin plantas');
}
assert(hayJardin(ACCESO_C.x,-10.3),'Plantas cierran el contorno por el fondo');
assert(!hayJardin(ACCESO_C.x,-36),'Entrada abierta');
for(const z of [-32,-24,-16]){
  for(const x of [-45.5,-44,-42])assert(hayJardin(x,z),'El espacio lateral queda relleno de vegetación');
}
const bordeAmpliado=new THREE.Box3().setFromObject(jardin).max.x;
const bordeDelantero=new THREE.Box3().setFromObject(scene.getObjectByName('Jardinera ornamental radial')).max.x;
assert(Math.abs(bordeAmpliado-bordeDelantero)<.1,'Las jardineras comparten la línea junto a la fachada');
p.set(-44.8,nivel,-34.4);walk(.025,0,205);
assert(p.x>-39.8,'Paso libre desde la caseta al corredor de la torre');
const acceso=scene.getObjectByName('Acceso al subterráneo · Torre C');
acceso.traverse(o=>assert(!o.name.startsWith('Peldaño acceso peatonal'),'Se retiraron las escaleras'));
const caseta=scene.getObjectByName('Caseta de registro vehicular');
assert(new THREE.Box3().setFromObject(caseta).min.x>ACCESO_C.x+ACCESO_C.ancho/2,'Caseta a la izquierda, mirando desde fuera hacia +Z');
assert(scene.getObjectByName('Barrera vehicular levantada'));
// El frente inferior es macizo y el cerco solo deja libres los accesos.
const cierre=scene.getObjectByName('Cierre macizo hasta el suelo · Torre C');
const cerco=scene.getObjectByName('Cerco integrado del acceso de Torre C');
const frontal=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,0,1),0,4);
function tocaFrente(obj,x,y){frontal.set(new THREE.Vector3(x,y,-41),new THREE.Vector3(0,0,1));return frontal.intersectObject(obj,true).length>0;}
for(const x of [ACCESO_C.x-2.5,ACCESO_C.x,ACCESO_C.x+2.5,ACCESO_C.xCaseta]){
  for(const y of [-.1,.6,1.5])assert(tocaFrente(cierre,x,y),'Base cerrada hasta el terreno');
}
for(const x of [-54.1,-47,-42,-38.3])assert(tocaFrente(cerco,x,2.6),'Cerco une los espacios entre vanos');
for(const x of [ACCESO_C.x,ACCESO_C.xPeaton,ACCESO_C.xCaseta]){
  assert(!tocaFrente(cerco,x,nivel+1.6),'Vanos de acceso y ventanilla despejados');
}
assert(tocaFrente(cerco,ACCESO_C.xCaseta,5),'Cerramiento sobre la caseta');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
for(const id of ['btn-interior-elevadores','btn-lateral-c','btn-recorrer-c'])assert(html.includes(`id="${id}"`));
console.log('OK: seis ascensores 4+2, todos los pisos, entrada/salida, geometría finita, lateral C transitable, jardinera sólida y acceso a cafetería.');
