import {ReflectorLocal} from '../vendor/ReflectorLocal.js';
import * as THREE from 'three';
import {referenciasC} from './fotogramas-c.js';
import {placasC} from './placas-c.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import {crearExpendedoras} from './expendedoras.js';
import {prepararCampus,ubicacionCampus} from './ajuste-estudio.js';
import {HUECO_C} from './subterraneo-c.js';
import { CONFIG } from './config.js';
import { crearTorres } from './floors/registro.js';
import { crearExteriores } from './exteriores.js';
import { crearRecorrido } from './recorrido.js';
import { crearPuertasFachada } from './puertas.js';
import { crearServicioElevadores } from './elevadores.js';
import { crearBebederos } from './bebederos.js';
import { crearArquitectura } from './arquitectura.js';
import { crearPisosSuperiores } from './pisos-superiores.js';
import { crearJardinesDescanso } from './jardines-descanso.js';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';

const visor=document.querySelector('#visor');
const error=document.querySelector('#error');
let renderer;
try{
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
}catch(e){
  error.hidden=false;error.textContent='No se puede iniciar WebGL. Comprueba que la aceleración por hardware esté activada en tu navegador.';
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.setSize(visor.clientWidth,visor.clientHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.08;
visor.prepend(renderer.domElement);

const etiquetas=new CSS2DRenderer();
etiquetas.setSize(visor.clientWidth,visor.clientHeight);
etiquetas.domElement.style.position='absolute';
etiquetas.domElement.style.top='0';
etiquetas.domElement.style.left='0';
etiquetas.domElement.style.pointerEvents='none';
visor.appendChild(etiquetas.domElement);

const escena=new THREE.Scene();
escena.background=new THREE.Color('#e3e9e9');
escena.fog=new THREE.Fog('#e3e9e9',260,580);
const pmrem=new THREE.PMREMGenerator(renderer);
const ambienteInterior=new RoomEnvironment();
const reflejos=pmrem.fromScene(ambienteInterior,.04);
escena.environment=reflejos.texture;
escena.environmentIntensity=.32;
ambienteInterior.dispose();pmrem.dispose();
const entorno=new THREE.Mesh(new THREE.PlaneGeometry(1600,1600),new THREE.MeshStandardMaterial({color:'#c5c8c1',roughness:1}));
entorno.name='Suelo del entorno';entorno.rotation.x=-Math.PI/2;entorno.position.y=-.38;
entorno.receiveShadow=true;entorno.userData.sinColision=true;escena.add(entorno);
const camara=new THREE.PerspectiveCamera(48,visor.clientWidth/Math.max(1,visor.clientHeight),.1,450);
const controles=new OrbitControls(camara,renderer.domElement);
controles.enableDamping=true;
controles.dampingFactor=.075;
controles.minDistance=15;
controles.maxDistance=260;
controles.maxPolarAngle=Math.PI/2-0.04;
controles.target.set(0,0,0);

const cielo=new THREE.HemisphereLight('#e5f1ff','#8d887b',2.1);escena.add(cielo);
const sol=new THREE.DirectionalLight('#fff5e4',3.1);
sol.position.set(-48,90,45);
sol.castShadow=true;
sol.shadow.mapSize.set(2048,2048);
sol.shadow.camera.left=-88;sol.shadow.camera.right=88;
sol.shadow.camera.top=88;sol.shadow.camera.bottom=-88;
sol.shadow.normalBias=.04;
sol.shadow.camera.far=250;sol.shadow.bias=-.00015;
escena.add(sol);

const objetosSeleccionables=[];
const campus=new THREE.Group();escena.add(campus);
const capaEtiquetas=new THREE.Group();
capaEtiquetas.name='Etiquetas';campus.add(capaEtiquetas);
const {suelo,extras,perimetro}=crearExteriores(campus);
const bebederos=crearBebederos(extras);
crearExpendedoras(extras);
const torres=crearTorres(campus,objetosSeleccionables,capaEtiquetas);
const arquitectura=crearArquitectura(campus,torres);
let modoModelo='completo';
capaEtiquetas.visible=false;document.querySelector('#toggle-etiquetas').checked=false;
etiquetas.domElement.style.display='none';
const puertasFachada=crearPuertasFachada(escena);
const zonaElevadores=escena.getObjectByName('Área de elevadores').userData.zonaElevadores;
const elevadores=crearServicioElevadores(zonaElevadores);
let interiorElevadores=false;
const pisosSuperiores=crearPisosSuperiores(campus);
const jardines=crearJardinesDescanso({escena,extras,patios:pisosSuperiores.obtener(8).userData.patios});
arquitectura.envolvente.add(pisosSuperiores.crearContexto());
prepararCampus(campus,{arquitectura,pisosSuperiores,jardines});
// Los paños coplanares comparten una sola captura del reflejo.
const cristales=[2,3,4,5,6,7].map(piso=>torres.A.getObjectByName(`Piso ${piso} - Torre A`)
  .getObjectByName('Cristal de la fachada de aulas'));
const bordesCristal=cristales.map(cristal=>new THREE.Box3().setFromObject(cristal,true));
const cristalBase=cristales[0];
const formas=bordesCristal.map(caja=>{
  const a=cristalBase.worldToLocal(caja.min.clone()),b=cristalBase.worldToLocal(caja.max.clone());
  return new THREE.Shape([
    new THREE.Vector2(-b.z,a.y),new THREE.Vector2(-a.z,a.y),
    new THREE.Vector2(-a.z,b.y),new THREE.Vector2(-b.z,b.y)
  ]);
});
const espejo=new ReflectorLocal(new THREE.ShapeGeometry(formas),{
  color:0xb5bec1,textureWidth:1024,textureHeight:768,multisample:0,clipBias:.001
});
espejo.position.x=cristalBase.worldToLocal(bordesCristal[0].max.clone()).x+.001;
espejo.rotation.y=Math.PI/2;
espejo.userData.sinColision=true;
cristalBase.add(espejo);
const puntoEtiqueta=new THREE.Vector3();
function actualizarEtiquetasDelEspejo(){
  if(!capaEtiquetas.visible)return;
  for(const etiqueta of capaEtiquetas.children){
    etiqueta.getWorldPosition(puntoEtiqueta);
    const oculta=bordesCristal.some(caja=>{
      if(camara.position.x<=caja.max.x||puntoEtiqueta.x>=caja.min.x)return false;
      const t=(caja.max.x-camara.position.x)/(puntoEtiqueta.x-camara.position.x);
      const y=THREE.MathUtils.lerp(camara.position.y,puntoEtiqueta.y,t);
      const z=THREE.MathUtils.lerp(camara.position.z,puntoEtiqueta.z,t);
      return y>=caja.min.y&&y<=caja.max.y&&z>=caja.min.z&&z<=caja.max.z;
    });
    etiqueta.element.style.visibility=oculta?'hidden':'';
  }
}

// El suelo del entorno deja ver el pavimento de la rampa por debajo de cota cero.
const bordeEntorno=new THREE.Shape([[-800,-800],[800,-800],[800,800],[-800,800]].map(([x,y])=>new THREE.Vector2(x,y)));
const [minX,maxX,minZ,maxZ]=HUECO_C;
const vanoRampa=[[minX,minZ],[minX,maxZ],[maxX,maxZ],[maxX,minZ]].map(([x,z])=>{
  const p=ubicacionCampus(campus,x,0,z);
  return new THREE.Vector2(p.x,-p.z);
});
bordeEntorno.holes.push(new THREE.Path(vanoRampa));
entorno.geometry.dispose();entorno.geometry=new THREE.ShapeGeometry(bordeEntorno);
const recorrido=crearRecorrido({escena,campus,camara,controles,canvas:renderer.domElement,
  visor,etiquetas,suelo,extras,perimetro,capaEtiquetas,elevadores,jardines});
const jardinesAB=document.getElementById('jardines-ab-originales');
jardines.usarJardinesOriginalesAB(true);
jardinesAB.addEventListener('change',()=>{recorrido.salir();jardines.usarJardinesOriginalesAB(jardinesAB.checked);});
let pisoSeleccionado=null,vistaDelPiso='perspectiva',visibilidadCampus=null;
const selectorPiso=document.getElementById('selector-piso');
function cerrarPiso(){
  if(pisoSeleccionado===null)return;
  pisosSuperiores.ocultar();pisoSeleccionado=null;
  for(const [objeto,visible] of visibilidadCampus)objeto.visible=visible;
  visibilidadCampus=null;entorno.position.y=-.38;
  selectorPiso.value='';document.getElementById('controles-piso').hidden=true;
  document.getElementById('piso-descripcion').textContent='Distribuciones adaptadas de tus croquis.';
  visor.classList.remove('viendo-piso');
  for(const id of ['toggle-muros','toggle-exteriores','toggle-etiquetas'])document.getElementById(id).disabled=false;
  etiquetas.domElement.style.display=document.getElementById('toggle-etiquetas').checked?'':'none';
  document.querySelector('.scene-subtitle').textContent='Torres Tecnológicas';
  for(const id of ['completo','base','estructura'])document.getElementById(`btn-modelo-${id}`).setAttribute('aria-pressed',String(id===modoModelo));
  iluminar(document.getElementById('btn-luz-tarde').getAttribute('aria-pressed')==='true');
}
function encuadrarPiso(vista='perspectiva'){
  if(pisoSeleccionado===null)return;
  vistaDelPiso=vista;
  const y=CONFIG.baseY+.085+(pisoSeleccionado-1)*CONFIG.altoPiso;
  const centroX=pisoSeleccionado===11?12:0;
  camara.fov=42;camara.updateProjectionMatrix();controles.minDistance=6;controles.maxDistance=240;
  // Desde -Z, Torre A queda a la izquierda, como en los croquis recibidos.
  const distancia=Math.max(128,94/Math.max(.65,camara.aspect));
  if(vista==='planta')encuadrarCampus(centroX,y+distancia,-2.1,centroX,y,-2);
  else encuadrarCampus(centroX+18,y+distancia*.82,-distancia*.63,centroX,y,-2);
  document.getElementById('btn-piso-planta').setAttribute('aria-pressed',String(vista==='planta'));
  document.getElementById('btn-piso-perspectiva').setAttribute('aria-pressed',String(vista==='perspectiva'));
}
function seleccionarPiso(numero){
  if(![5,6,7,8,9,10,11].includes(numero)){cerrarPiso();vistaGeneral();return;}
  recorrido.salir();interiorElevadores=false;
  if(pisoSeleccionado===null){
    visibilidadCampus=new Map(campus.children.filter(o=>o!==pisosSuperiores.grupo).map(o=>[o,o.visible]));
  }
  for(const objeto of visibilidadCampus.keys())objeto.visible=false;
  // Los patios son vacíos verticales: desde el corte se ve la planta baja real.
  suelo.visible=true;extras.visible=true;perimetro.visible=true;
  for(const torre of Object.values(torres))torre.visible=true;
  for(const [numero,nivel] of zonaElevadores.niveles) nivel.grupo.visible=numero===1;
  pisoSeleccionado=numero;pisosSuperiores.mostrar(numero);
  iluminar(document.getElementById('btn-luz-tarde').getAttribute('aria-pressed')==='true');
  entorno.position.y=-.38;
  selectorPiso.value=String(numero);document.getElementById('controles-piso').hidden=false;
  const descripcion=numero===11?'Torre A: equipos técnicos. Torre B: tres aulas, núcleo central y baños. El espacio entre bloques queda abierto.':'Aulas, pasillos y baños en las tres torres. Los cuatro patios son vacíos hacia la planta baja: el césped está únicamente en el primer piso.';
  document.getElementById('piso-descripcion').textContent=descripcion;
  document.querySelector('.scene-subtitle').textContent=`Piso ${numero} · Corte interior`;
  for(const id of ['toggle-muros','toggle-exteriores','toggle-etiquetas'])document.getElementById(id).disabled=true;
  etiquetas.domElement.style.display='none';visor.classList.add('viendo-piso');visor.classList.remove('ingreso-enfocado');
  for(const id of ['completo','base','estructura'])document.getElementById(`btn-modelo-${id}`).setAttribute('aria-pressed','false');
  encuadrarPiso();mostrarInfo(`Piso ${numero} · Interiores`,descripcion,'SENATI','SEGÚN TUS CROQUIS');
}
selectorPiso.addEventListener('change',()=>seleccionarPiso(Number(selectorPiso.value)));
document.getElementById('btn-piso-planta').addEventListener('click',()=>encuadrarPiso('planta'));
document.getElementById('btn-piso-perspectiva').addEventListener('click',()=>encuadrarPiso());

function vistaGeneral(){
  if(pisoSeleccionado!==null){encuadrarPiso();return;}
  recorrido.salir();
  controles.minDistance=15;interiorElevadores=false;
  camara.fov=48;camara.updateProjectionMatrix();
  camara.position.set(119,90,125);
  controles.target.set(10,modoModelo==='base'?0:18,0);
  controles.update();
  document.querySelectorAll('[data-focus]').forEach(b=>b.classList.remove('active'));
}
function enfocarTorre(id){
  recorrido.salir();
  const t=CONFIG.torres[id];
  if(pisoSeleccionado!==null){
    if(pisoSeleccionado===11&&id==='C'){mostrarInfo('Piso 11 · Torre C','La Torre C no aparece en el croquis del piso 11.','TORRE C','SIN DISTRIBUCIÓN EN ESTE NIVEL');return;}
    const y=CONFIG.baseY+.085+(pisoSeleccionado-1)*CONFIG.altoPiso;
    encuadrarCampus(t.x+15,y+57,-53,t.x,y,0);
    mostrarInfo(`Torre ${id} · Piso ${pisoSeleccionado}`,'Vista de los ambientes adaptados del croquis. Arrastra para girar y usa la rueda para acercarte.',`TORRE ${id}`,'INTERIORES');return;
  }
  camara.position.set(t.x+64,66,t.z+88);
  controles.target.set(t.x,modoModelo==='base'?0:21,t.z);
  controles.update();
  document.querySelectorAll('[data-focus]').forEach(b=>b.classList.toggle('active',b.dataset.focus===id));
  mostrarInfo(`Torre ${id}`,t.descripcion,`TORRE ${id}`,'PRIMER PISO');
}
function mostrarInfo(nombre,descripcion,torre,tipo){
  document.getElementById('ref-c').hidden=true;
  document.querySelector('#selected-name').textContent=nombre;
  document.querySelector('#selected-description').textContent=descripcion;
  document.querySelector('#selected-tower').textContent=torre;
  document.querySelector('#selected-category').textContent=tipo;
}
vistaGeneral();
function cambiarModelo(modo,encuadrar=true){
  cerrarPiso();
  modoModelo=modo;arquitectura.setModo(modo);
  for(const [valor,id] of [['completo','btn-modelo-completo'],['base','btn-modelo-base'],['estructura','btn-modelo-estructura']]){
    document.getElementById(id).setAttribute('aria-pressed',String(modo===valor));
  }
  if(encuadrar){
    vistaGeneral();
    if(modo==='base'){encuadrarCampus(110,112,120,10,0,0);}
    const textos={completo:['El conjunto completo','Tres cuerpos sobre la base original: fachadas moduladas, losas, pórticos y puentes. La volumetría superior es una propuesta conceptual.'],base:['La base original','Primer piso, jardines, accesos y seis ascensores del modelo original. Selecciona un ambiente o entra a recorrer.'],estructura:['La estructura del conjunto','Losas, apoyos y conexiones visibles sin los cerramientos. Es un estudio de organización espacial, no un cálculo estructural.']};
    mostrarInfo(...textos[modo],'SENATI','ESTUDIO ARQUITECTÓNICO');
  }else if(modo==='base')mostrarInfo('Planta baja · Recorrido','Accesos, jardines, ambientes y seis ascensores de la base original. Los interiores de los pisos 5–11 se revisan con el selector de pisos.','SENATI','PLANTA BAJA');
}
for(const modo of ['completo','base','estructura'])document.getElementById(`btn-modelo-${modo}`).addEventListener('click',()=>cambiarModelo(modo));
function vistaJardines(){
  jardinesAB.checked=false;jardines.usarJardinesOriginalesAB(false);
  recorrido.salir();cambiarModelo('base',false);
  extras.visible=true;document.getElementById('toggle-exteriores').checked=true;
  camara.fov=42;camara.updateProjectionMatrix();
  controles.minDistance=6;controles.maxDistance=240;
  const distancia=Math.max(114,82/Math.max(.65,camara.aspect));
  encuadrarCampus(13,distancia*.82,-distancia*.68,0,CONFIG.baseY,0);
  document.querySelector('.scene-subtitle').textContent='Primer piso · Jardines interiores';
  mostrarInfo('Jardines del primer piso','Césped continuo con bordes oscuros, sin rejas alrededor del jardín. Los paseos de piedra conectan con los pasillos al mismo nivel.','PLANTA BAJA','ÁREAS VERDES');
}
document.getElementById('btn-ver-jardines').addEventListener('click',vistaJardines);
document.getElementById('btn-recorrer-jardines').addEventListener('click',()=>{jardinesAB.checked=false;jardines.usarJardinesOriginalesAB(false);},true);
document.getElementById('btn-detalle-jardin').addEventListener('click',()=>{
  vistaJardines();
  const p=jardines.grupo.userData.patiosPlantaBaja[1];
  camara.fov=44;camara.updateProjectionMatrix();
  encuadrarCampus(p.x-18,15,p.z-9,p.x,CONFIG.baseY+.35,p.z);
  controles.update();
});
// Los detalles y recorridos se revisan sin la envolvente superior.
const vistasBase=new Set(['btn-caminar-pasadizo','btn-planta','btn-ver-elevadores','btn-interior-elevadores','btn-lateral-c','btn-comedor-c','btn-subterraneo-c','btn-cerco-c','btn-recorrer-c','btn-ver-patio','btn-ver-fachadas','btn-ver-ingreso','btn-ver-ingreso-exterior','btn-ir-elevadores','btn-recorrido','btn-recorrido-panel','btn-recorrer-jardines']);
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&vistasBase.has(b.id)&&!(b.id==='btn-planta'&&pisoSeleccionado!==null))cambiarModelo('base',false);},true);
const vistasC={
  lateralCaseta:{nombre:'Ambientes junto a la caseta',detalle:'Vigilancia y los cuartos de apoyo se prolongan hasta el muro del predio. Oculta las cubiertas para ver cómo se distribuyen el archivo y el mobiliario de trabajo.',ojo:[-14.5,18,-22.5],mira:[-28,2.4,-32.8],fov:53},
  lateralComedor:{nombre:'Ampliación de la cafetería',detalle:'El comedor llega hasta el muro perimetral. Oculta las cubiertas para ver las mesas, la barra y la estación de bandejas en su nuevo fondo.',ojo:[-16.2,16.7,23.6],mira:[-28,2.4,33.75],fov:55},
  ambientesC:{nombre:'Cafetería, cocina y servicios',detalle:'Desde el patio se ven el comedor, la línea de preparación y los ambientes a ambos lados del pasadizo. El mobiliario de los cuartos que quedan fuera de cámara es una propuesta.',ojo:[3.1,31.6,-2.15],mira:[-28.1,2.15,-2.15],fov:43},
  patioC:{nombre:'Jardines frente a Torre C',detalle:'Los cruces de pizarra llevan desde los canteros hasta la cafetería y los servicios. Entre las plantas se distingue la franja de cantos grises.',ojo:[-9.8,11.6,37],mira:[-19.1,2.3,4.8],fov:60},
  cocinaInterior:{nombre:'Cocina de producción',detalle:'Propuesta de interior. La isla de preparación queda entre lavado, cocción y pase al comedor.',ojo:[-34.05,3.68,6.85],mira:[-25.2,3.35,.55],fov:57},
  barraCafe:{nombre:'Rincón del café',detalle:'Barra en el nuevo fondo del comedor, con máquina de espresso, vitrina y vajilla.',ojo:[-30.8,3.56,34.55],mira:[-28.05,3.35,38.28]},
  banoInterior:{nombre:'Baño de mujeres',detalle:'La placa identifica el servicio de damas. La disposición de lavamanos y cabinas es una propuesta.',ojo:[-23.94,3.52,-9.38],mira:[-27.16,2.99,-13.68]},
  banoHombres:{nombre:'Baño de hombres',detalle:'La placa identifica el servicio de caballeros. El equipamiento interior es una propuesta.',ojo:[-20.03,3.42,-12.52],mira:[-22.3,2.89,-13.91]},
  jardinCentral:{nombre:'Jardín central en C y acceso vehicular',detalle:'Las franjas delgadas siguen los muros del comedor y doblan hacia el asterisco. Las rosetas, los cantos rodados y las matas plateadas continúan hasta la rampa.',ojo:[-40,54,-5.5],mira:[-48,1.86,-2.8],fov:38.5},
  banoAccesible:{nombre:'Baño accesible',detalle:'Propuesta de equipamiento con lavamanos suspendido, inodoro y barras de apoyo.',ojo:[-20.73,3.49,-9.16],mira:[-22.13,3.04,-7.1]},
  fachada:{nombre:'Entrada de la cafetería',detalle:'Desde el patio interior se ven las mamparas, el felpudo y la pizarra de menú.',ojo:[-15.5,3.66,22.25],mira:[-22,3.48,23]},
  parque:{nombre:'Jardín frente a la cocina',detalle:'Ocho hileras de rosetas rodean la esfera de piedra. En el borde del pasillo se ensancha la piedra de asiento, con plantas bajas por tres lados.',ojo:[-43.1,4.22,12.9],mira:[-47.2,2.58,-.8]},
  cafeteria:{nombre:'Cafetería',detalle:'Mesas de comedor y carros de bandejas frente al mostrador.',ojo:[-20.9,3.66,29.8],mira:[-29.5,3.2,17.1]},
  cocina:{nombre:'Cocina',detalle:'Acceso de servicio desde el parque, con el carro de acero junto a la puerta.',ojo:[-40.65,3.64,7.05],mira:[-31.7,3.1,4.25]},
  pasadizo:{nombre:'Pasadizo de Ambiente C',detalle:'El paso atraviesa la torre entre el parque y el patio interior. Las puertas dan a los ambientes laterales.',ojo:[-39.5,3.61,-22],mira:[-23.5,3.40,-22]},
  servicios:{nombre:'Vestíbulo de servicios',detalle:'Puertas claras con rejillas bajas y señalización azul en la entrada desde el patio.',ojo:[-17,3.59,-10.88],mira:[-23.6,3.30,-10.9]},
  posterior:{nombre:'Comedor posterior y parque',detalle:'Desde las mesas se ve la jardinera delgada al pie de la celosía. En la esquina del toldo, la plantación dobla y se une al asterisco.',ojo:[-49.2,3.62,21.4],mira:[-55.3,2.65,12.3]},
  acceso:{nombre:'Entrada de vehículos',detalle:'Desde el pasadizo se ve el borde oscuro del jardín, la canaleta y las matas que acompañan la llegada.',ojo:[-40.42,3.61,-8.92],mira:[-44.15,2.95,-30],fov:64}
};
const interiorC=torres.C.getObjectByName('Torre C · recorridos del 21 de noviembre');
const techosC=interiorC.userData.techosInteriores.map(n=>interiorC.getObjectByName(n));
const cubiertasC=interiorC.getObjectByName('Cubiertas de los extremos de Torre C');
const controlCubiertasC=document.getElementById('mostrar-cubiertas-c');
controlCubiertasC.checked=cubiertasC.visible;
controlCubiertasC.addEventListener('change',()=>{cubiertasC.visible=controlCubiertasC.checked;});
const autoEscala=campus.getObjectByName('Auto de referencia');
document.getElementById('mostrar-auto').addEventListener('change',e=>{autoEscala.visible=e.target.checked;});
const toldoComedor=campus.getObjectByName('Lona tensada del comedor');
const controlToldo=document.getElementById('mostrar-toldo');
controlToldo.checked=toldoComedor.visible;
controlToldo.addEventListener('change',e=>{toldoComedor.visible=e.target.checked;});
function verTorreC(clave){
  const v=vistasC[clave];recorrido.salir();cambiarModelo('base',false);
  extras.visible=true;document.getElementById('toggle-exteriores').checked=true;
  capaEtiquetas.visible=false;document.getElementById('toggle-etiquetas').checked=false;
  interiorElevadores=false;controles.minDistance=.35;camara.fov=v.fov||65;camara.updateProjectionMatrix();
  camara.position.copy(ubicacionCampus(campus,...v.ojo,true));controles.target.copy(ubicacionCampus(campus,...v.mira,true));
  if(clave==='jardinCentral'&&camara.aspect<1.45){
    camara.position.sub(controles.target).multiplyScalar(1.45/camara.aspect).add(controles.target);
  }
  if(clave==='ambientesC'&&camara.aspect<1.65)camara.position.sub(controles.target).multiplyScalar(1.65/camara.aspect).add(controles.target);
  controles.update();
  document.querySelector('.scene-subtitle').textContent='Primer piso · Torre C';
  const ref=placasC[clave]||referenciasC[clave],imagen=document.getElementById('ref-c-img');
  mostrarInfo(v.nombre,v.detalle,'TORRE C',ref?'PRIMER PISO':'INTERIOR PROPUESTO');
  if(ref){
    imagen.src=ref.imagen;imagen.alt=(ref.detalle||v.nombre)+' en el video original';
    document.getElementById('ref-c-caption').textContent=(ref.detalle||v.nombre)+' · Video '+ref.tiempo;
    document.getElementById('ref-c').hidden=false;
  }
  document.querySelectorAll('[data-vista-c]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.vistaC===clave)));
  if(window.matchMedia('(max-width: 900px)').matches)visor.scrollIntoView({block:'start'});

}
document.querySelectorAll('[data-vista-c]').forEach(b=>b.addEventListener('click',()=>verTorreC(b.dataset.vistaC)));
function iluminar(tarde){
  sol.position.set(...(tarde?[-78,45,60]:[-48,90,45]));
  sol.color.set(tarde?'#ffd0a0':'#fff5e4');sol.intensity=tarde?3.6:3.1;
  cielo.intensity=tarde?1.35:(pisoSeleccionado!==null?1.65:2.1);
  renderer.toneMappingExposure=pisoSeleccionado!==null ? .91 : (tarde?1.05:1.08);
  entorno.material.color.set(pisoSeleccionado!==null?'#9ba9ab':'#c5c8c1');
  escena.background.set(tarde?'#e8ded0':'#e3e9e9');escena.fog.color.copy(escena.background);
  document.getElementById('btn-luz-dia').setAttribute('aria-pressed',String(!tarde));
  document.getElementById('btn-luz-tarde').setAttribute('aria-pressed',String(tarde));
}
document.getElementById('btn-luz-dia').addEventListener('click',()=>iluminar(false));
document.getElementById('btn-luz-tarde').addEventListener('click',()=>iluminar(true));
document.getElementById('btn-captura').addEventListener('click',()=>{
  renderer.render(escena,camara);
  renderer.domElement.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`SENATI-${pisoSeleccionado!==null?'piso-'+pisoSeleccionado:modoModelo}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},'image/png');
});
// En las vistas de detalle solo se muestra el nombre del edificio enfocado.
let ladoIngreso=1;
function encuadrarCampus(x,y,z,tx,ty,tz){
  camara.position.copy(ubicacionCampus(campus,x,y,z));controles.target.copy(ubicacionCampus(campus,tx,ty,tz));controles.update();
}
function encuadrarIngreso(lado){
  ladoIngreso=lado;
  // Las vistas de detalle siguen la posición del ingreso.
  const x=CONFIG.ingreso.x+CONFIG.ingreso.desplazamientoX+
    CONFIG.ingreso.bordeIzquierdo*(1-CONFIG.ingreso.escalaAncho);
  const z=CONFIG.ingreso.z+CONFIG.ingreso.bordeFrontal*(1-CONFIG.ingreso.escalaFondo);
  encuadrarCampus(x,4.5,z+lado*16*CONFIG.ingreso.escalaFondo,x,CONFIG.baseY+2.15,z);
  controles.update();
}
document.addEventListener('click',e=>{
  const boton=e.target.closest('button');
  if(boton)visor.classList.toggle('ingreso-enfocado',
    boton.id==='btn-ver-ingreso'||boton.id==='btn-ver-ingreso-exterior');
});
document.querySelector('#btn-ver-elevadores').addEventListener('click',()=>{
  recorrido.salir();
  const centro=zonaElevadores.grupo.getWorldPosition(new THREE.Vector3());
  camara.position.set(centro.x+18,22,centro.z+22);
  controles.target.set(centro.x,CONFIG.baseY+1,centro.z);controles.update();
  mostrarInfo('Elevadores · Torre B','Seis cabinas: cuatro a la izquierda y dos a la derecha desde Torre A. Puertas de acero, paredes cálidas y franja central clara. Entra en tercera persona para viajar del piso 1 al 11.','TORRE B','ELEVADORES');
});
document.querySelector('#btn-interior-elevadores').addEventListener('click',()=>{
  recorrido.salir();interiorElevadores=true;controles.minDistance=.5;
  camara.fov=75;camara.updateProjectionMatrix();
  const punto=zonaElevadores.grupo.localToWorld(new THREE.Vector3(zonaElevadores.ancho/2-.65,CONFIG.baseY+1.75,0));
  camara.position.copy(punto);controles.target.copy(punto).add(new THREE.Vector3(-10,0,0));controles.update();
  capaEtiquetas.visible=false;document.querySelector('#toggle-etiquetas').checked=false;
  mostrarInfo('Vestíbulo · 6 ascensores','Cuatro a la izquierda y dos a la derecha. Puertas metálicas, franja clara central y techo oscuro con luminarias, según el video.','TORRE B','INTERIOR');
});
document.querySelector('#btn-lateral-c').addEventListener('click',()=>{
  recorrido.salir();controles.minDistance=3;
  encuadrarCampus(-84,58,62,-47,2,5);
  capaEtiquetas.visible=false;document.querySelector('#toggle-etiquetas').checked=false;
  mostrarInfo('Jardín y comedor · Torre C','Jardinera de plantas verdes y moradas con piedras, pasillo de piedra, fachada de vidrio y comedor con sillas azules bajo lona tensada.','TORRE C','LATERAL');
});
document.querySelector('#btn-comedor-c').addEventListener('click',()=>{
  recorrido.salir();controles.minDistance=.5;
  encuadrarCampus(-40.3,CONFIG.baseY+2.3,14.1,-47,CONFIG.baseY+1.5,27);
  capaEtiquetas.visible=false;document.querySelector('#toggle-etiquetas').checked=false;
  mostrarInfo('Comedor exterior · Torre C','Mesas claras, sillas azules y fachada acristalada bajo una lona tensada, junto al jardín ornamental.','TORRE C','COMEDOR');
});
document.querySelector('#btn-subterraneo-c').addEventListener('click',()=>{
  recorrido.salir();controles.minDistance=3;
  encuadrarCampus(-40,35,-56,-48,2,-20);
  capaEtiquetas.visible=false;document.querySelector('#toggle-etiquetas').checked=false;
  mostrarInfo('Acceso al subterráneo · Torre C','Desde la entrada: caseta de registro a la izquierda y rampa a la derecha, hacia el interior. Las plantas rodean la rampa. El frente está cerrado hasta el suelo y el cerco blanco y gris integra la caseta y ambos accesos.','TORRE C','SUBTERRÁNEO');
});
document.querySelector('#btn-cerco-c').addEventListener('click',()=>{
  recorrido.salir();controles.minDistance=3;
  encuadrarCampus(-47,7,-59,-47,2.8,-38);
  capaEtiquetas.visible=false;document.querySelector('#toggle-etiquetas').checked=false;
  mostrarInfo('Entrada y caseta · Torre C','Cerco continuo blanco y gris, base cerrada hasta el suelo, caseta de control a la izquierda y acceso vehicular a la derecha.','TORRE C','VISTA EXTERIOR');
});
document.querySelector('#btn-ver-ingreso').addEventListener('click',()=>{
  recorrido.salir();
  encuadrarIngreso(1);
  mostrarInfo('Ingreso · Parte trasera','Seis torniquetes de acero, paso lateral y arco detector. La caja y los portones forman un solo conjunto bajo la misma cubierta.','INGRESO','PARTE TRASERA');
  document.querySelectorAll('[data-focus]').forEach(b=>b.classList.remove('active'));
});

document.querySelector('#btn-ver-ingreso-exterior').addEventListener('click',()=>{
  recorrido.salir();
  encuadrarIngreso(-1);
  mostrarInfo('Ingreso · Parte delantera','Caja integrada a la izquierda, ventanilla, rótulo del Centro Tecnológico, número 3365 y portones SENATI bajo una cubierta continua.','INGRESO','PARTE DELANTERA');
  document.querySelectorAll('[data-focus]').forEach(b=>b.classList.remove('active'));
});

document.querySelector('#btn-ver-patio').addEventListener('click',()=>{
  recorrido.salir();
  encuadrarCampus(56,98,1,56,0,0);
  mostrarInfo('Patio de Torre A · Croquis','El ingreso, el paseo de Torre A y el pasillo entre jardines conectan mediante un piso horizontal. La escalera doble frontal y la rampa exterior mantienen el acceso desde el nivel bajo.','TORRE A','PLANTA DEL PATIO');
});
document.querySelector('#btn-ver-fachadas').addEventListener('click',()=>{
  recorrido.salir();
  encuadrarCampus(87,17,7,35.5,3.5,1);
  capaEtiquetas.visible=false;document.querySelector('#toggle-etiquetas').checked=false;
  mostrarInfo('Conferencias y Atención al Estudiante','Paneles grises y claros; cinco puertas de conferencias y doble puerta delgada de vidrio en Experiencia Estudiantil.','TORRE A','FACHADAS');
});
document.querySelectorAll('[data-focus]').forEach(btn=>btn.addEventListener('click',()=>enfocarTorre(btn.dataset.focus)));
document.querySelector('#btn-general').addEventListener('click',()=>{cambiarModelo('completo');});
document.querySelector('#btn-restablecer').addEventListener('click',vistaGeneral);
document.querySelector('#btn-isometrica').addEventListener('click',vistaGeneral);
document.querySelector('#btn-planta').addEventListener('click',()=>{
  if(pisoSeleccionado!==null){encuadrarPiso('planta');return;}
  recorrido.salir();
  camara.position.set(0,120,.1);
  controles.target.set(0,0,0);
  controles.update();
});
document.querySelector('#toggle-muros').addEventListener('change',e=>{perimetro.visible=e.target.checked;});
document.querySelector('#toggle-exteriores').addEventListener('change',e=>{extras.visible=e.target.checked;});
document.querySelector('#toggle-etiquetas').addEventListener('change',e=>{capaEtiquetas.visible=e.target.checked;etiquetas.domElement.style.display=e.target.checked?'':'none';});

// Clic en un ambiente (no durante el arrastre de cámara).
const raycaster=new THREE.Raycaster();
const pointer=new THREE.Vector2();
let alPulsar=null,seleccionado=null;
renderer.domElement.addEventListener('pointerdown',e=>{alPulsar={x:e.clientX,y:e.clientY};});
renderer.domElement.addEventListener('pointerup',e=>{
  if(!alPulsar||Math.hypot(e.clientX-alPulsar.x,e.clientY-alPulsar.y)>6)return;
  const r=renderer.domElement.getBoundingClientRect();
  pointer.x=((e.clientX-r.left)/r.width)*2-1;
  pointer.y=-((e.clientY-r.top)/r.height)*2+1;
  raycaster.setFromCamera(pointer,camara);
  // El primer objeto visible impide activar puertas a través de las paredes.
  const visibles=[];
  escena.traverseVisible(o=>{if(o.isMesh)visibles.push(o);});
  const primerImpacto=raycaster.intersectObjects(visibles,false)[0];
  if(pisoSeleccionado!==null){
    for(let objeto=primerImpacto?.object;objeto;objeto=objeto.parent){
      if(objeto.userData.info){const info=objeto.userData.info;mostrarInfo(info.nombre,info.descripcion,info.torre?`TORRE ${info.torre}`:'SENATI',`PISO ${pisoSeleccionado}`);break;}
    }
    return;
  }
  if(primerImpacto&&bebederos.activar(primerImpacto.object))return;
  if(primerImpacto&&puertasFachada.alternar(primerImpacto.object))return;
  if(recorrido.activo)return;
  const impactos=raycaster.intersectObjects(objetosSeleccionables,false);
  if(!impactos.length)return;
  const objeto=impactos[0].object;
  if(seleccionado)seleccionado.material.emissive.set('#000000');
  seleccionado=objeto;
  seleccionado.material.emissive.set('#284558');
  const info=objeto.userData.info;
  mostrarInfo(info.nombre,info.descripcion,`TORRE ${info.torre}`,info.tipo.toUpperCase());
});

function redimensionar(){
  const w=Math.max(1,visor.clientWidth),h=Math.max(1,visor.clientHeight);
  camara.aspect=w/h;camara.updateProjectionMatrix();
  if(visor.classList.contains('ingreso-enfocado'))encuadrarIngreso(ladoIngreso);
  renderer.setSize(w,h);etiquetas.setSize(w,h);
}
const resizeObserver=new ResizeObserver(redimensionar);
resizeObserver.observe(visor);
let ultimoTiempo=performance.now();
function animar(ahora=performance.now()){
  const transcurrido=Math.min(Math.max((ahora-ultimoTiempo)/1000,0),1);
  const dt=Math.min(transcurrido,.05);ultimoTiempo=ahora;
  requestAnimationFrame(animar);
  puertasFachada.actualizar(dt);
  bebederos.actualizar(dt);
  if(recorrido.activo)recorrido.actualizar(dt,transcurrido);
  else controles.update();
  for(const nivel of zonaElevadores.niveles.values())nivel.cubierta.visible=recorrido.activo||interiorElevadores;
  for(const t of techosC)t.visible=camara.position.y<CONFIG.baseY+4.06;
  actualizarEtiquetasDelEspejo();
  renderer.render(escena,camara);
  etiquetas.render(escena,camara);
}
verTorreC('jardinCentral');
window.scrollTo(0,0);
animar();

// Modelo del campus y configuración disponibles para inspección:
window.SENATI3D={revisionBase:"977331d82be836f28f78b99703a2e4099ac49cb4",campus,torres,escena,CONFIG,arquitectura,pisosSuperiores,jardines};
