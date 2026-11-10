// Uso: node tests/recorrido.test.mjs /ruta/three.core.mjs (Three.js 0.180.0).
// La app sigue usando su importmap; esta copia temporal solo ejecuta pruebas sin navegador.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
assert(process.argv[2],'Indica la ruta de three.core.mjs 0.180.0');
const threeUrl=pathToFileURL(path.resolve(process.argv[2])).href;
const THREE=await import(threeUrl);
const moduleUrl=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const source=file=>readFile(path.join(root,file),'utf8');
const conThree=s=>s.replace("'three'",JSON.stringify(threeUrl));
const {crearNavegacion}=await import(moduleUrl(conThree(await source('js/navegacion.js'))));
function box(scene,x,y,z,w,h,d){
  const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial());
  o.position.set(x,y,z);scene.add(o);return o;
}
function walk(nav,p,x,z,n=120){for(let i=0;i<n;i++)nav.mover(p,x,z);}
const scene=new THREE.Scene();box(scene,0,-.25,0,12,.5,12);box(scene,2,1.5,0,.3,3,8);
let nav=crearNavegacion(scene),p=new THREE.Vector3(0,0,0);
walk(nav,p,.04,0);assert(p.x<1.6&&p.x>1.3,'No atraviesa muros');
const before=p.clone();walk(nav,p,.03,.03,30);assert(p.z>before.z+.5,'Desliza junto a paredes');
p.set(-4,0,0);walk(nav,p,-.04,0,200);assert(p.x>-6,'No sale del borde del piso');
assert(nav.distanciaCamara(new THREE.Vector3(0,1,0),new THREE.Vector3(5,1,0))<2,'La cámara evita paredes');
const stairs=new THREE.Scene();box(stairs,0,-.25,0,12,.5,8);
for(let i=0;i<5;i++)box(stairs,i*.8+1,.08*(i+1),0,.8,.16*(i+1),3);
nav=crearNavegacion(stairs);p.set(0,0,0);walk(nav,p,.03,0,120);assert(p.y>.5,'Sube peldaños');
walk(nav,p,-.03,0,120);assert(p.y<.01,'Baja peldaños');
const ramp=new THREE.Scene();box(ramp,0,-.25,0,30,.5,8);
const slab=box(ramp,0,.3,0,10,.1,3);slab.rotation.z=.06;
nav=crearNavegacion(ramp);p.set(-4,nav.altura(-4,0,.2),0);walk(nav,p,.03,0,240);assert(p.y>.45,'Sigue las rampas');

// Construye el campus real. Solo se sustituyen las etiquetas DOM y el dibujo de la insignia.
const configUrl=moduleUrl(await source('js/config.js'));
globalThis.document={createElement:()=>({style:{},getContext:()=>({fillText(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},strokeRect(){}})})};
const geometryUrl=moduleUrl(conThree(await source('js/geometria.js')).replace(
  "import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';",
  'class CSS2DObject extends THREE.Object3D {constructor(element){super();this.element=element;}}'));
const exteriorUrl=moduleUrl(conThree(await source('js/exteriores.js')).replace("'./config.js'",JSON.stringify(configUrl)).replace("'./geometria.js'",JSON.stringify(geometryUrl)));
const elevatorUrl=moduleUrl(conThree(await source('js/elevadores.js')).replace("'./config.js'",JSON.stringify(configUrl)).replace("'./geometria.js'",JSON.stringify(geometryUrl)).replace("'./exteriores.js'",JSON.stringify(exteriorUrl)));
const floorUrl=moduleUrl(conThree(await source('js/floors/piso1.js')).replace("'../config.js'",JSON.stringify(configUrl)).replace("'../geometria.js'",JSON.stringify(geometryUrl)).replace("'../elevadores.js'",JSON.stringify(elevatorUrl)));
const {crearExteriores}=await import(exteriorUrl),{crearPiso1}=await import(floorUrl),{CONFIG}=await import(configUrl);
const campus=new THREE.Scene();crearExteriores(campus);const labels=new THREE.Group();campus.add(labels);
for(const torre of Object.values(CONFIG.torres)){
  const floor=crearPiso1(torre,[],labels);floor.position.set(torre.x,0,torre.z);campus.add(floor);
}
nav=crearNavegacion(campus);p.set(32,1.83,30.5);
assert(Math.abs(nav.altura(p.x,p.z,p.y)-1.83)<.01,'Inicio sobre la base de A');
walk(nav,p,0,-.04,400);assert(p.z>21&&p.z<24,'Se detiene frente al auditorio ampliado');
p.set(32,1.83,29.5);walk(nav,p,-.04,0,100);assert(p.x>29.1,'Respeta la columna gruesa');
p.set(32,1.83,34);walk(nav,p,-.04,0,1250);assert(p.x<-15,'Recorre bases y corredores A-B-C');

// El croquis actualizado abre vanos reales; no debe quedar un muro detrás.
const conferencia=campus.getObjectByName('Fachada de Sala de Conferencias');
const estudiantes=campus.getObjectByName('Fachada de Experiencia Estudiantil');
for(const [fachada,cantidad] of [[conferencia,5],[estudiantes,2]]){
  const puertas=fachada.children.filter(o=>o.userData.puerta);
  assert.equal(puertas.length,cantidad,'Cantidad de puertas indicada en el croquis');
  for(const puerta of puertas){
    const vano=fachada.localToWorld(new THREE.Vector3(puerta.userData.centroVano,0,0));
    p.set(vano.x+1.8,CONFIG.baseY+.01,vano.z);
    walk(nav,p,-.025,0,110);
    assert(p.x<vano.x-.6,`Cruza el vano de ${puerta.name}, x=${p.x}`);
    walk(nav,p,.025,0,110);assert(p.x>vano.x+1,'También sale por la misma puerta');
  }
}
const patio=campus.getObjectByName('Patio de Torre A · croquis 10 noviembre');
const escaleras=patio.children.filter(o=>o.userData.tipo==='escalera');
assert.equal(escaleras.length,3,'Se retira la escalera posterior al quedar todo a la misma cota');
for(const escalera of escaleras){
  const d=escalera.userData;
  assert.equal(escalera.children.filter(o=>o.name.startsWith('Peldaño ')).length,d.peldaños*d.tramos);
  assert.equal(escalera.children.filter(o=>o.name==='Pasamanos longitudinal de escalera').length,d.barandas);
  if(escalera.name.includes('isla')){
    assert.equal(d.tramos,2,'Dos escaleras contiguas por pareja');
    assert.equal(d.barandas,3,'Barandas exteriores y una única baranda central');
    assert(d.hasta.x<d.desde.x&&d.hasta.z===d.desde.z,'Ambos tramos suben hacia las torres');
  }
  const largo=Math.hypot(d.hasta.x-d.desde.x,d.hasta.z-d.desde.z);
  for(let carril=0;carril<d.barandas-1;carril++){
    const lateral=-(d.ancho/2-.22)+(carril+.5)*(d.ancho-.44)/(d.barandas-1);
    const inicio=escalera.localToWorld(new THREE.Vector3(lateral,0,-largo/2+.2));
    p.set(inicio.x,d.desde.y+.2,inicio.z);
    p.y=nav.altura(p.x,p.z,p.y);
    assert(p.y!==null,'Primer peldaño accesible');
    const dx=(d.hasta.x-d.desde.x)/largo*.025,dz=(d.hasta.z-d.desde.z)/largo*.025;
    walk(nav,p,dx,dz,Math.ceil((largo-.4)/.025));
    assert(Math.abs(p.y-d.hasta.y)<.2,`Sube ${escalera.name}, carril ${carril+1}, altura=${p.y}`);
    walk(nav,p,-dx,-dz,Math.floor((largo-.4)/.025));
    assert(p.y<d.desde.y+.35,`Baja ${escalera.name}, carril ${carril+1}`);
  }
}
const cotaPatio=CONFIG.baseY+.01;
// Comprueba la altura en toda la superficie, incluida la antigua escalera.
for(const z of [-20.3,-18.8,-17.3,-15.8,-14.3]){
  for(let x=38;x<64.4;x+=.3){
    assert(Math.abs(nav.altura(x,z,cotaPatio)-cotaPatio)<.001,'Patio completamente horizontal');
  }
}
for(const z of [-18.8,-15.8]){
  p.set(63.8,cotaPatio,z);walk(nav,p,-.025,0,1000);
  assert(p.x<39&&Math.abs(p.y-cotaPatio)<.001,'Camina hasta Torre A sin cambiar de nivel');
  walk(nav,p,.025,0,1000);
  assert(p.x>63.6&&Math.abs(p.y-cotaPatio)<.001,'Regresa por el mismo piso plano');
}
p.set(53.7,cotaPatio,-17.3);
for(let paso=0;paso<1720;paso++){
  nav.mover(p,0,.025);assert(Math.abs(p.y-cotaPatio)<.001,'El pasillo central también es horizontal');
}
assert(p.z>25.5,JSON.stringify({mensaje:'El pasillo central conecta con el descanso frontal',posicion:p}));
assert(Math.abs(nav.altura(67,-18.8,cotaPatio)-cotaPatio)<.001,'Piedra del ingreso sin resalto');
// Desde el acceso bajo, sube la escalera exterior y continúa por su rampa.
p.set(73.1,.13,21.5);walk(nav,p,-.00198,-.04,130);
assert(p.y>.85&&p.z<16.5,'Enlaza escalera exterior con rampa');
walk(nav,p,-.00381,-.04,760);
assert(p.y>1.8&&p.z<-13.9,'Rampa exterior llega al nivel del ingreso peatonal');
// La rampa recuperada a la izquierda permite subir sin usar ningún peldaño.
assert(patio.getObjectByName('Rampa a la izquierda de la escalera exterior'));
p.set(69.45,.13,25.4);walk(nav,p,0,-.04,10);
walk(nav,p,-4.1/39*.04,-.04,975);
assert(p.y>1.8&&p.z<-13.9,'Rampa izquierda continua entre el acceso bajo y el descanso superior');
walk(nav,p,4.1/39*.04,.04,975);
assert(p.y<.2&&p.z>24.9,'También desciende por la rampa izquierda');
assert(Math.abs(nav.altura(CONFIG.ingreso.x,35.7,.13)-.13)<.001,'Inicio del recorrido sobre el pavimento');
console.log('OK: puertas transitables, parejas de escaleras hacia las torres con baranda central y rampa izquierda continua.');
const {crearPersonaje}=await import(moduleUrl(conThree(await source('js/personaje.js'))));
const avatar=crearPersonaje();
assert.equal(avatar.animar(.016,0),'En reposo');assert.equal(avatar.animar(.016,2.6),'Caminando');
assert.equal(avatar.animar(.016,4.8),'Corriendo');avatar.saludar();assert.equal(avatar.animar(.016,0),'Saludando');
for(let i=0;i<160;i++)avatar.animar(.02,0);
assert.equal(avatar.animar(.016,0),'En reposo');
avatar.grupo.updateMatrixWorld(true);
avatar.grupo.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite),'Transformaciones válidas'));
console.log('OK: muros, deslizamiento, bordes, cámara, escalones, rampas, inicio real, auditorio, columna, corredores y cuatro animaciones.');

const {crearServicioElevadores,cotaPiso}=await import(elevatorUrl);
const zona=campus.getObjectByName('Área de elevadores').userData.zonaElevadores;
const servicio=crearServicioElevadores(zona);
function avanzarHasta(fase){
  for(let i=0;i<2400&&servicio.fase!==fase;i++)servicio.actualizar(1/60);
  assert.equal(servicio.fase,fase,`Llega al estado ${fase}`);
}
assert.equal(zona.cabinas.length,4,'Cuatro cabinas');
for(const c of zona.cabinas){
  servicio.reiniciar();
  p.copy(zona.grupo.localToWorld(new THREE.Vector3(c.x,cotaPiso(1),c.z+c.frente*1.9)));
  assert.equal(servicio.cercano(p)?.id,c.id,'Identifica la cabina desde el pasillo');
  assert(servicio.usar(p));avanzarHasta('dentro');
  assert(!servicio.viajar(12,p));assert(!servicio.viajar(0,p));assert(!servicio.viajar(1,p));
  assert(servicio.viajar(11,p));assert(!servicio.viajar(4,p),'No acepta viajes durante el cierre');
  avanzarHasta('viajando');const inicial=p.y;servicio.actualizar(.5);assert(p.y>inicial,'El personaje asciende con la cabina');
  avanzarHasta('dentro');assert.equal(servicio.piso,11);assert(Math.abs(p.y-cotaPiso(11))<.001);
  assert(servicio.salir(p));avanzarHasta('libre');nav.refrescar();
  assert(Math.abs(nav.altura(p.x,p.z,p.y)-cotaPiso(11))<.01,'Vestíbulo superior transitable');
  assert(servicio.usar(p));avanzarHasta('dentro');assert(servicio.viajar(1,p));avanzarHasta('dentro');
  assert.equal(servicio.piso,1);assert(Math.abs(p.y-cotaPiso(1))<.001);
}
// Todos los números de la botonera llevan a su altura, con vuelta al vestíbulo.
for(let piso=2;piso<=10;piso++){
  assert(servicio.viajar(piso,p));avanzarHasta('dentro');assert.equal(servicio.piso,piso);
  assert(Math.abs(p.y-cotaPiso(piso))<.001);
}
assert(servicio.salir(p));avanzarHasta('libre');
const otra=zona.cabinas[0];
p.copy(zona.grupo.localToWorld(new THREE.Vector3(otra.x,cotaPiso(10),otra.z+otra.frente*1.9)));
assert(servicio.usar(p));assert.equal(servicio.fase,'llamando','Llama una cabina que está en otro piso');
avanzarHasta('dentro');assert.equal(otra.piso,10);
assert(servicio.viajar(1,p));avanzarHasta('viajando');servicio.actualizar(.4);
servicio.reiniciar();assert.equal(servicio.fase,'libre');assert.equal(servicio.piso,1);
for(const c of zona.cabinas){assert.equal(c.piso,1);assert.equal(c.techo.visible,true);}
for(const [n,v]of zona.niveles){assert.equal(v.grupo.visible,n===1);v.puertas.forEach(q=>assert.equal(q.abierto,0));}
console.log('OK: cuatro elevadores; llamada, puertas, entrada, 11 pisos reales, salida segura, regreso y reinicio.');
