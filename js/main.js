import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { CONFIG } from './config.js?v=ingreso-unificado-27';
import { crearTorres } from './floors/registro.js';
import { crearExteriores } from './exteriores.js?v=ingreso-unificado-28';
import { crearRecorrido } from './recorrido.js?v=croquis-10nov';
import { crearServicioElevadores } from './elevadores.js?v=relleno-elevadores-2';

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
renderer.toneMappingExposure=1.35;
visor.prepend(renderer.domElement);

const etiquetas=new CSS2DRenderer();
etiquetas.setSize(visor.clientWidth,visor.clientHeight);
etiquetas.domElement.style.position='absolute';
etiquetas.domElement.style.top='0';
etiquetas.domElement.style.left='0';
etiquetas.domElement.style.pointerEvents='none';
visor.appendChild(etiquetas.domElement);

const escena=new THREE.Scene();
escena.background=new THREE.Color('#273b4e');
escena.fog=new THREE.Fog('#273b4e',155,275);
const camara=new THREE.PerspectiveCamera(48,visor.clientWidth/Math.max(1,visor.clientHeight),.1,450);
const controles=new OrbitControls(camara,renderer.domElement);
controles.enableDamping=true;
controles.dampingFactor=.075;
controles.minDistance=15;
controles.maxDistance=180;
controles.maxPolarAngle=Math.PI/2-0.04;
controles.target.set(0,0,0);

escena.add(new THREE.HemisphereLight('#e7f5ff','#607080',2.25));
const sol=new THREE.DirectionalLight('#fff7eb',2.9);
sol.position.set(-48,90,45);
sol.castShadow=true;
sol.shadow.mapSize.set(2048,2048);
sol.shadow.camera.left=-88;sol.shadow.camera.right=88;
sol.shadow.camera.top=88;sol.shadow.camera.bottom=-88;
sol.shadow.normalBias=.04;
escena.add(sol);

const objetosSeleccionables=[];
const capaEtiquetas=new THREE.Group();
capaEtiquetas.name='Etiquetas';escena.add(capaEtiquetas);
const {suelo,extras,perimetro}=crearExteriores(escena);
const torres=crearTorres(escena,objetosSeleccionables,capaEtiquetas);
const zonaElevadores=escena.getObjectByName('Área de elevadores').userData.zonaElevadores;
const elevadores=crearServicioElevadores(zonaElevadores);
const recorrido=crearRecorrido({escena,camara,controles,canvas:renderer.domElement,
  visor,etiquetas,suelo,extras,perimetro,capaEtiquetas,elevadores});

function vistaGeneral(){
  recorrido.salir();
  camara.position.set(75,85,105);
  controles.target.set(0,.2,0);
  controles.update();
  document.querySelectorAll('[data-focus]').forEach(b=>b.classList.remove('active'));
}
function enfocarTorre(id){
  recorrido.salir();
  const t=CONFIG.torres[id];
  camara.position.set(t.x+25,49,t.z+53);
  controles.target.set(t.x,0,t.z);
  controles.update();
  document.querySelectorAll('[data-focus]').forEach(b=>b.classList.toggle('active',b.dataset.focus===id));
  mostrarInfo(`Torre ${id}`,t.descripcion,`TORRE ${id}`,'PRIMER PISO');
}
function mostrarInfo(nombre,descripcion,torre,tipo){
  document.querySelector('#selected-name').textContent=nombre;
  document.querySelector('#selected-description').textContent=descripcion;
  document.querySelector('#selected-tower').textContent=torre;
  document.querySelector('#selected-category').textContent=tipo;
}
vistaGeneral();
// En las vistas de detalle solo se muestra el nombre del edificio enfocado.
let ladoIngreso=1;
function encuadrarIngreso(lado){
  ladoIngreso=lado;
  // Las vistas de detalle siguen la posición del ingreso.
  const x=CONFIG.ingreso.x+CONFIG.ingreso.desplazamientoX;
  camara.position.set(x,4.5,CONFIG.ingreso.z+lado*16);
  controles.target.set(x,CONFIG.baseY+2.15,CONFIG.ingreso.z);
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
  mostrarInfo('Elevadores · Torre B','Cuatro cabinas, jardín en L y acceso de vidrio con marcos negros. Entra en tercera persona para viajar del piso 1 al 11.','TORRE B','ELEVADORES');
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
  camara.position.set(56,98,1);controles.target.set(56,0,0);controles.update();
  mostrarInfo('Patio de Torre A · Croquis','El ingreso, el paseo de Torre A y el pasillo entre jardines conectan mediante un piso horizontal. La escalera doble frontal y la rampa exterior mantienen el acceso desde el nivel bajo.','TORRE A','PLANTA DEL PATIO');
});
document.querySelector('#btn-ver-fachadas').addEventListener('click',()=>{
  recorrido.salir();
  camara.position.set(87,17,7);controles.target.set(35.5,3.5,1);controles.update();
  capaEtiquetas.visible=false;document.querySelector('#toggle-etiquetas').checked=false;
  mostrarInfo('Conferencias y Atención al Estudiante','Paneles grises y claros; cinco puertas de conferencias y doble puerta delgada de vidrio en Experiencia Estudiantil.','TORRE A','FACHADAS');
});
document.querySelectorAll('[data-focus]').forEach(btn=>btn.addEventListener('click',()=>enfocarTorre(btn.dataset.focus)));
document.querySelector('#btn-general').addEventListener('click',()=>{vistaGeneral();mostrarInfo('Vista general','Las torres C, B y A están alineadas de izquierda a derecha. El primer piso incluye zonas abiertas y espacios con columnas.','SENATI','CAMPUS');});
document.querySelector('#btn-restablecer').addEventListener('click',vistaGeneral);
document.querySelector('#btn-isometrica').addEventListener('click',vistaGeneral);
document.querySelector('#btn-planta').addEventListener('click',()=>{
  recorrido.salir();
  camara.position.set(0,120,.1);
  controles.target.set(0,0,0);
  controles.update();
});
document.querySelector('#toggle-muros').addEventListener('change',e=>{perimetro.visible=e.target.checked;});
document.querySelector('#toggle-exteriores').addEventListener('change',e=>{extras.visible=e.target.checked;});
document.querySelector('#toggle-etiquetas').addEventListener('change',e=>{capaEtiquetas.visible=e.target.checked;});

// Clic en un ambiente (no durante el arrastre de cámara).
const raycaster=new THREE.Raycaster();
const pointer=new THREE.Vector2();
let alPulsar=null,seleccionado=null;
renderer.domElement.addEventListener('pointerdown',e=>{alPulsar={x:e.clientX,y:e.clientY};});
renderer.domElement.addEventListener('pointerup',e=>{
  if(recorrido.activo)return;
  if(!alPulsar||Math.hypot(e.clientX-alPulsar.x,e.clientY-alPulsar.y)>6)return;
  const r=renderer.domElement.getBoundingClientRect();
  pointer.x=((e.clientX-r.left)/r.width)*2-1;
  pointer.y=-((e.clientY-r.top)/r.height)*2+1;
  raycaster.setFromCamera(pointer,camara);
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
  if(recorrido.activo)recorrido.actualizar(dt,transcurrido);
  else controles.update();
  renderer.render(escena,camara);
  etiquetas.render(escena,camara);
}
animar();

// Modelo del campus y configuración disponibles para inspección:
window.SENATI3D={torres,escena,CONFIG};
