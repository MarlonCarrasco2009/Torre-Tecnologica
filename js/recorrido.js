import * as THREE from 'three';
import { CONFIG } from './config.js';
import { crearPersonaje } from './personaje.js';
import { crearNavegacion } from './navegacion.js';

export function crearRecorrido({escena,camara,controles,canvas,visor,etiquetas,suelo,extras,perimetro,capaEtiquetas,elevadores}){
  const navegacion=crearNavegacion(escena);
  const avatar=crearPersonaje();escena.add(avatar.grupo);avatar.grupo.visible=false;
  avatar.grupo.userData.sinColision=true;
  const botones=[document.querySelector('#btn-recorrido'),document.querySelector('#btn-recorrido-panel')];
  const hud=document.querySelector('#recorrido-hud'),estado=document.querySelector('#recorrido-estado');
  const ayuda=document.querySelector('.viewer-help'),chip=document.querySelector('.scene-chip');
  const correr=document.querySelector('#recorrido-correr');
  const panelElevador=document.querySelector('#elevador-panel');
  const usarElevador=document.querySelector('#elevador-usar');
  const estadoElevador=document.querySelector('#elevador-estado');
  const pisoElevador=document.querySelector('#elevador-piso');
  const salirElevador=document.querySelector('#elevador-salir');
  const botonesPiso=[...document.querySelectorAll('[data-piso-elevador]')];
  let revisionElevadores=-1;
  const teclas=new Set();
  const posicionAnterior=new THREE.Vector3(),objetivo=new THREE.Vector3(),deseada=new THREE.Vector3();
  let activo=false,guardado=null,yaw=0,pitch=.30,distancia=5.5,carrera=false,arrastre=null;
  canvas.tabIndex=0;
  canvas.setAttribute('aria-label','Vista del campus. En modo recorrido usa WASD o flechas para moverte.');
  function limpiar(){
    teclas.clear();arrastre=null;
    hud.querySelectorAll('[data-mover]').forEach(b=>b.classList.remove('pulsado'));
  }
  function actualizarCamara(dt,inmediata=false){
    const vistaElevador=elevadores.camara();
    if(vistaElevador){
      camara.position.copy(vistaElevador.posicion);camara.lookAt(vistaElevador.objetivo);return;
    }
    objetivo.copy(avatar.grupo.position).add(new THREE.Vector3(0,1.35,0));
    deseada.set(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch))
      .multiplyScalar(distancia).add(objetivo);
    const limite=navegacion.distanciaCamara(objetivo,deseada);
    deseada.sub(objetivo).setLength(limite).add(objetivo);
    if(inmediata||camara.position.distanceTo(objetivo)>limite)camara.position.copy(deseada);
    else camara.position.lerp(deseada,1-Math.exp(-10*dt));
    camara.lookAt(objetivo);
  }
  function inicio(){
    elevadores.reiniciar();
    limpiar();carrera=false;correr.setAttribute('aria-pressed','false');
    // Zona abierta de A, separada de la columna central y de la sala de conferencias.
    avatar.grupo.position.set(CONFIG.torres.A.x+4,CONFIG.baseY+.01,CONFIG.torres.A.z+29);
    avatar.grupo.rotation.y=Math.PI;avatar.reiniciar();yaw=0;pitch=.30;distancia=5.5;
    actualizarCamara(0,true);canvas.focus({preventScroll:true});
  }
  function cambiar(valor){
    if(valor===activo)return;
    activo=valor;limpiar();
    const capas=[['toggle-muros',perimetro],['toggle-exteriores',extras],['toggle-etiquetas',capaEtiquetas]];
    if(activo){
      guardado={pos:camara.position.clone(),target:controles.target.clone(),
        ayuda:ayuda.textContent,chip:chip.textContent,
        capas:capas.map(([id,g])=>({visible:g.visible,checked:document.getElementById(id).checked}))};
      controles.enabled=false;avatar.grupo.visible=true;suelo.visible=true;
      capas.forEach(([id,g],i)=>{const input=document.getElementById(id);input.disabled=true;input.checked=i!==2;g.visible=i!==2;});
      // Oculta todas las etiquetas, incluida la del acceso exterior.
      etiquetas.domElement.style.display='none';
      ayuda.textContent='WASD / flechas: mover · Shift: correr · Arrastrar: mirar · E: saludar · F: elevador · Esc: salir';
      chip.textContent='● TERCERA PERSONA';
      inicio();
    }else{
      elevadores.reiniciar();panelElevador.hidden=true;usarElevador.hidden=true;visor.classList.remove('en-elevador');
      avatar.grupo.visible=false;controles.enabled=true;
      camara.position.copy(guardado.pos);controles.target.copy(guardado.target);controles.update();
      capas.forEach(([id,g],i)=>{const input=document.getElementById(id);input.disabled=false;input.checked=guardado.capas[i].checked;g.visible=guardado.capas[i].visible;});
      etiquetas.domElement.style.display='';ayuda.textContent=guardado.ayuda;chip.textContent=guardado.chip;
    }
    visor.classList.toggle('recorriendo',activo);hud.hidden=!activo;
    botones.forEach(b=>{b.setAttribute('aria-pressed',String(activo));b.title=activo?'Volver a la maqueta':'Recorrer en tercera persona';});
    document.querySelector('#btn-recorrido-panel').textContent=activo?'Volver a la maqueta':'Recorrer en tercera persona';
  }
  function saludar(){
    if(!activo)return;
    if(teclas.size===0)avatar.grupo.rotation.y=-yaw;
    avatar.saludar();
  }
  function entrarElevador(){
    if(!activo)return;
    limpiar();elevadores.usar(avatar.grupo.position);canvas.focus({preventScroll:true});
  }
  function irElevadores(){
    if(!activo)cambiar(true);
    limpiar();elevadores.reiniciar();
    avatar.grupo.position.copy(elevadores.puntoInicio());
    avatar.grupo.rotation.y=-Math.PI/2;yaw=-Math.PI/2;pitch=.42;distancia=4;
    navegacion.refrescar();actualizarCamara(0,true);canvas.focus({preventScroll:true});
  }
  document.querySelector('#btn-ir-elevadores').addEventListener('click',irElevadores);
  document.querySelector('#recorrido-elevadores').addEventListener('click',irElevadores);
  usarElevador.addEventListener('click',entrarElevador);
  salirElevador.addEventListener('click',()=>{limpiar();elevadores.salir(avatar.grupo.position);});
  botonesPiso.forEach(b=>b.addEventListener('click',()=>{
    limpiar();elevadores.viajar(Number(b.dataset.pisoElevador),avatar.grupo.position);
  }));
  const mensajes={llamando:'La cabina está llegando…',abriendo:'Abriendo puertas…',alineando:'Acercándose a la puerta…',
    entrando:'Entrando en la cabina…',dentro:'Elige un piso o sal al vestíbulo.',cerrando:'Cerrando puertas…',
    viajando:'En movimiento',saliendo:'Saliendo al vestíbulo…'};
  function actualizarPanel(){
    const cerca=elevadores.cercano(avatar.grupo.position);
    usarElevador.hidden=!activo||elevadores.bloqueado||!cerca;
    if(cerca)usarElevador.textContent=`Entrar al elevador ${cerca.id} · F`;
    panelElevador.hidden=!activo||!elevadores.bloqueado;
    visor.classList.toggle('en-elevador',!panelElevador.hidden);
    if(!panelElevador.hidden){
      const numero=elevadores.fase==='viajando'?Math.round((elevadores.cotaActual-CONFIG.baseY-.085)/CONFIG.altoPiso)+1:elevadores.piso;
      pisoElevador.textContent=`Elevador ${elevadores.seleccionado} · Piso ${numero}`;
      estadoElevador.textContent=elevadores.fase==='viajando'?`Viajando al piso ${elevadores.destino}…`:mensajes[elevadores.fase];
      salirElevador.textContent=`Salir al piso ${elevadores.piso}`;salirElevador.disabled=elevadores.fase!=='dentro';
      botonesPiso.forEach(b=>{
        const n=Number(b.dataset.pisoElevador);b.disabled=elevadores.fase!=='dentro'||n===elevadores.piso;
        b.setAttribute('aria-pressed',String(n===elevadores.piso));
      });
    }
    document.querySelector('#recorrido-nivel').textContent=`Torre B · Piso ${elevadores.piso}`;
    document.querySelector('#recorrido-nivel').hidden=elevadores.piso===1&&!elevadores.bloqueado;
  }
  botones.forEach(b=>b.addEventListener('click',()=>cambiar(!activo)));
  document.querySelector('#recorrido-saludar').addEventListener('click',saludar);
  document.querySelector('#recorrido-inicio').addEventListener('click',inicio);
  document.querySelector('#recorrido-salir').addEventListener('click',()=>cambiar(false));
  correr.addEventListener('click',()=>{carrera=!carrera;correr.setAttribute('aria-pressed',String(carrera));});
  const codigos=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','KeyE','KeyF','Escape']);
  window.addEventListener('keydown',e=>{
    if(!activo||e.target.matches('input,textarea,select,[contenteditable="true"]')||!codigos.has(e.code))return;
    e.preventDefault();
    if(e.code==='Escape'){cambiar(false);botones[0].focus();return;}
    if(e.code==='KeyE'){if(!e.repeat)saludar();return;}
    if(e.code==='KeyF'){if(!e.repeat)entrarElevador();return;}
    teclas.add(e.code);
  });
  window.addEventListener('keyup',e=>teclas.delete(e.code));
  window.addEventListener('blur',limpiar);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)limpiar();});
  for(const boton of hud.querySelectorAll('[data-mover]')){
    boton.addEventListener('pointerdown',e=>{
      if(!activo)return;e.preventDefault();boton.setPointerCapture(e.pointerId);
      teclas.add(boton.dataset.mover);boton.classList.add('pulsado');
    });
    const soltar=()=>{teclas.delete(boton.dataset.mover);boton.classList.remove('pulsado');};
    boton.addEventListener('pointerup',soltar);boton.addEventListener('pointercancel',soltar);boton.addEventListener('lostpointercapture',soltar);
  }
  canvas.addEventListener('pointerdown',e=>{
    if(!activo||e.button!==0)return;
    canvas.focus({preventScroll:true});arrastre={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!activo||arrastre?.id!==e.pointerId)return;
    yaw-=(e.clientX-arrastre.x)*.006;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-arrastre.y)*.004,-.08,.9);
    arrastre.x=e.clientX;arrastre.y=e.clientY;
  });
  const soltarCamara=()=>{arrastre=null;};
  canvas.addEventListener('pointerup',soltarCamara);canvas.addEventListener('pointercancel',soltarCamara);canvas.addEventListener('lostpointercapture',soltarCamara);
  canvas.addEventListener('wheel',e=>{if(activo){e.preventDefault();distancia=THREE.MathUtils.clamp(distancia+e.deltaY*.006,2.5,9);}}, {passive:false});
  return {
    get activo(){return activo;},
    salir(){cambiar(false);},
    actualizar(dt,transcurrido=dt){
      if(!activo)return;
      elevadores.actualizar(transcurrido);
      if(elevadores.bloqueado)avatar.grupo.rotation.y=elevadores.rotacionPersonaje;
      if(revisionElevadores!==elevadores.revision){navegacion.refrescar();revisionElevadores=elevadores.revision;}
      const delante=Number(teclas.has('KeyW')||teclas.has('ArrowUp'))-Number(teclas.has('KeyS')||teclas.has('ArrowDown'));
      const lado=Number(teclas.has('KeyD')||teclas.has('ArrowRight'))-Number(teclas.has('KeyA')||teclas.has('ArrowLeft'));
      const longitud=Math.hypot(delante,lado);
      posicionAnterior.copy(avatar.grupo.position);
      if(longitud&&!elevadores.bloqueado){
        const velocidad=carrera||teclas.has('ShiftLeft')||teclas.has('ShiftRight')?4.8:2.6;
        const dx=(Math.sin(yaw)*delante+Math.cos(yaw)*lado)/longitud;
        const dz=(-Math.cos(yaw)*delante+Math.sin(yaw)*lado)/longitud;
        navegacion.mover(avatar.grupo.position,dx*velocidad*dt,dz*velocidad*dt);
        const angulo=Math.atan2(dx,dz),actual=avatar.grupo.rotation.y;
        avatar.grupo.rotation.y+=Math.atan2(Math.sin(angulo-actual),Math.cos(angulo-actual))*(1-Math.exp(-14*dt));
      }
      const velocidad=Math.hypot(avatar.grupo.position.x-posicionAnterior.x,avatar.grupo.position.z-posicionAnterior.z)/Math.max(dt,.001);
      const entrando=['alineando','entrando','saliendo'].includes(elevadores.fase);
      const texto=avatar.animar(dt,entrando?1.8:velocidad);
      const estadoActual=elevadores.fase==='viajando'?`Viajando al piso ${elevadores.destino}`:texto;
      if(estado.textContent!==estadoActual)estado.textContent=estadoActual;
      actualizarCamara(dt);
      actualizarPanel();
    }
  };
}
