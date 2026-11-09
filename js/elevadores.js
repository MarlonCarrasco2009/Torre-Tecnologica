import * as THREE from 'three';
import {CONFIG} from './config.js';
import {bloque,placa,paredVidrio} from './geometria.js';
import {jardinContorno} from './exteriores.js';

export const PISOS_ELEVADOR=11;
const base=CONFIG.baseY+.085;
export const cotaPiso=piso=>base+(piso-1)*CONFIG.altoPiso;

function vidrioFijo(grupo,x,z,ancho,alto,rotacion=0){
  const marco=new THREE.Group();marco.position.set(x,0,z);marco.rotation.y=rotacion;grupo.add(marco);
  const vidrio=new THREE.MeshStandardMaterial({color:'#80c4df',transparent:true,opacity:.32,roughness:.15,depthWrite:false});
  bloque(marco,{y:alto/2,ancho,alto,fondo:.065,material:vidrio,sombra:false});
  for(const lado of [-1,1])bloque(marco,{x:lado*ancho/2,y:alto/2,ancho:.085,alto,fondo:.12,color:'#121820'});
  for(const y of [.04,alto])bloque(marco,{y,ancho,alto:.085,fondo:.12,color:'#121820'});
}

function rotulo(grupo,texto,x,y,z,rotacion=0){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=96;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#101c28';ctx.fillRect(0,0,256,96);
  ctx.fillStyle='#a6f2ff';ctx.font='bold 40px Arial';ctx.textAlign='center';ctx.fillText(texto,128,64);
  const mapa=new THREE.CanvasTexture(canvas);mapa.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(.95,.36),new THREE.MeshBasicMaterial({map:mapa}));
  m.position.set(x,y,z);m.rotation.y=rotacion;m.userData.sinColision=true;grupo.add(m);
  return m;
}

// Los extremos de vidrio siguen siendo accesos; el lateral sur se retranquea
// en la esquina este para unir el muro blanco con la jardinera en L.
export function crearZonaElevadores(padre,{x,z,ancho,fondo}){
  const grupo=new THREE.Group();grupo.name='Área de elevadores';grupo.position.set(x,0,z);padre.add(grupo);
  const a=ancho/2,b=fondo/2;
  const cabinas=[];
  for(const signo of [-1,1])for(const cx of [-3.1,3.1]){
    const cz=signo*(b-1.25),frente=-signo;
    const cabina=new THREE.Group();cabina.name=`Cabina elevador ${cabinas.length+1}`;
    cabina.position.set(cx,base,cz);grupo.add(cabina);
    // Cabinas huecas, con suelo y laterales; no son los bloques macizos anteriores.
    bloque(cabina,{y:-.07,ancho:3.2,alto:.14,fondo:2.2,color:CONFIG.acabados.piso});
    for(const lado of [-1,1])bloque(cabina,{x:lado*1.55,y:1.42,ancho:.1,alto:2.84,fondo:2.2,color:'#242b33'});
    bloque(cabina,{z:-frente*1.05,y:1.42,ancho:3.2,alto:2.84,fondo:.1,color:'#303b46'});
    const techo=bloque(cabina,{y:2.9,ancho:3.2,alto:.12,fondo:2.2,color:'#141b22'});
    bloque(cabina,{z:-frente*.98,y:1.05,ancho:2.7,alto:.06,fondo:.08,color:'#b4c0ca'});
    cabinas.push({id:cabinas.length+1,x:cx,z:cz,frente,grupo:cabina,techo,piso:1});
  }
  // Relleno vertical entre las cabinas izquierda y derecha de cada fila.
  // Mantiene libre el pasillo central donde abren las puertas.
  for(const signo of [-1,1]){
    bloque(grupo,{x:0,y:base+1.6,z:signo*(b-1.25),
      ancho:3,alto:3.2,fondo:2.2,color:CONFIG.acabados.pared});
  }
  const niveles=new Map();
  function crearNivel(piso){
    if(niveles.has(piso))return niveles.get(piso);
    const g=new THREE.Group();g.name=`Vestíbulo de elevadores - Piso ${piso}`;g.position.y=cotaPiso(piso);grupo.add(g);
    const suelo=placa(g,{y:-.03,ancho,fondo,color:CONFIG.acabados.piso});
    if(piso>1)bloque(g,{y:-.19,ancho,alto:.32,fondo,color:'#aebcc7'});
    bloque(g,{z:-b,y:1.6,ancho,alto:3.2,fondo:.3,color:CONFIG.acabados.pared});
    bloque(g,{x:-.9,z:b,y:1.6,ancho:ancho-1.8,alto:3.2,fondo:.3,color:CONFIG.acabados.pared});
    bloque(g,{x:a-1.8,z:b-.65,y:1.6,ancho:.3,alto:3.2,fondo:1.3,color:CONFIG.acabados.pared});
    for(const signo of [-1,1]){
      bloque(g,{x:0,z:signo*(b-1.1),y:signo<0?1.6:.65,
        ancho:.4,alto:signo<0?3.2:1.3,fondo:2.3,color:CONFIG.acabados.pared});
    }
    if(piso===1){
      paredVidrio(g,{x:-a,z:0,largo:fondo,baseY:0,alto:3.2,rotacion:-Math.PI/2,colorMarco:'#111820'});
      paredVidrio(g,{x:a,z:-.65,largo:fondo-1.3,baseY:0,alto:3.2,rotacion:Math.PI/2,colorMarco:'#111820'});
    }else{
      // Vestíbulos elevados cerrados con vidrio: no hay puertas al vacío.
      vidrioFijo(g,-a,0,fondo,3.2,Math.PI/2);
      vidrioFijo(g,a,-.65,fondo-1.3,3.2,Math.PI/2);
      bloque(g,{x:a-.9,z:b-.65,y:.65,ancho:1.8,alto:1.3,fondo:1.3,color:CONFIG.acabados.pared});
    }
    vidrioFijo(g,a-.9,b-1.3,1.8,3.2);
    const puertas=cabinas.map(c=>{
      const portal=new THREE.Group();portal.position.set(c.x,0,c.z+c.frente*1.12);g.add(portal);
      for(const lado of [-1,1]){
        bloque(portal,{x:lado*1.2,y:1.42,ancho:.8,alto:2.84,fondo:.16,color:'#202831'});
        bloque(portal,{x:lado*.8,y:1.32,ancho:.08,alto:2.64,fondo:.22,color:'#0c131b'});
      }
      const dintel=bloque(portal,{y:2.75,ancho:3.2,alto:.3,fondo:.22,color:'#161f29'});
      const hojas=[-1,1].map(lado=>bloque(portal,{x:lado*.385,y:1.3,ancho:.77,alto:2.6,fondo:.09,color:'#8d9daa'}));
      const indicador=rotulo(portal,`${c.id} · ${piso}`,0,3.08,c.frente*.14,c.frente<0?Math.PI:0);
      const boton=bloque(portal,{x:1.12,y:1.22,z:c.frente*.14,ancho:.17,alto:.32,fondo:.06,color:'#15283a'});
      bloque(portal,{x:1.12,y:1.22,z:c.frente*.18,ancho:.07,alto:.07,fondo:.02,color:'#71dff5'});
      boton.userData.elevador=c.id;
      return {hojas,abierto:0,dintel,indicador};
    });
    const nivel={grupo:g,suelo,puertas};niveles.set(piso,nivel);return nivel;
  }
  const plantaBaja=crearNivel(1);
  // Amplía otro 50% el ancho de la franja hacia afuera, con borde negro.
  const limiteJardin=.16+(3.5-.16)*1.5;
  jardinContorno(grupo,[[-a,b+.16],[a-1.96,b+.16],[a-1.96,b-1.15],
    [a-.04,b-1.15],[a-.04,b+limiteJardin],[-a,b+limiteJardin]],base+.18,.65,'#08090b');
  const datos={grupo,ancho,fondo,cabinas,niveles,crearNivel,plantaBaja};
  grupo.userData.zonaElevadores=datos;
  return datos;
}

// Máquina de estados independiente del DOM: llamada, puertas, entrada, viaje y salida.
export function crearServicioElevadores(zona){
  const {grupo,cabinas,niveles,crearNivel}=zona;
  let piso=1,fase='libre',seleccion=null,tarea=null,pendiente=1,revision=0;
  const local=new THREE.Vector3(),desde=new THREE.Vector3(),hasta=new THREE.Vector3();
  const mundo=(x,y,z)=>grupo.localToWorld(new THREE.Vector3(x,y,z));
  function puerta(c,n,apertura){
    const p=crearNivel(n).puertas[c.id-1];p.abierto=apertura;
    p.hojas.forEach((h,i)=>{h.position.x=(i?1:-1)*(.385+apertura*.79);});
  }
  function corteInterior(c,n,activo){
    const p=crearNivel(n).puertas[c.id-1];
    c.techo.visible=!activo;p.dintel.visible=!activo;p.indicador.visible=!activo;
  }
  function mostrarNivel(n){
    crearNivel(n);
    for(const [i,v]of niveles)v.grupo.visible=i===1||i===n;
    grupo.updateMatrixWorld(true);revision++;
  }
  function ejecutar(nombre,duracion,actualizar,fin){fase=nombre;tarea={tiempo:0,duracion,actualizar,fin};}
  function animarPuerta(c,n,valor,fin){
    const inicio=crearNivel(n).puertas[c.id-1].abierto;
    ejecutar(valor?'abriendo':'cerrando',.65,t=>puerta(c,n,THREE.MathUtils.lerp(inicio,valor,t)),()=>{revision++;fin();});
  }
  function moverPersona(pos,destino,nombre,fin){
    desde.copy(pos);hasta.copy(destino);
    const origen=desde.clone(),dest= hasta.clone();
    ejecutar(nombre,Math.max(.35,origen.distanceTo(dest)/1.8),t=>pos.lerpVectors(origen,dest,t),fin);
  }
  function abrirYEntrar(pos){
    animarPuerta(seleccion,piso,1,()=>{
      moverPersona(pos,mundo(seleccion.x,cotaPiso(piso),seleccion.z+seleccion.frente*1.85),'alineando',()=>{
        corteInterior(seleccion,piso,true);
        moverPersona(pos,mundo(seleccion.x,cotaPiso(piso),seleccion.z),'entrando',()=>{fase='dentro';tarea=null;});
      });
    });
  }
  function cercano(pos){
    local.copy(pos);grupo.worldToLocal(local);
    if(Math.abs(local.y-cotaPiso(piso))>.4||Math.abs(local.z)>zona.fondo/2-2.35)return null;
    let mejor=null,distancia=2.5;
    for(const c of cabinas){
      const d=Math.hypot(local.x-c.x,local.z-(c.z+c.frente*1.65));
      if(d<distancia){distancia=d;mejor=c;}
    }
    return mejor;
  }
  return {
    get piso(){return piso;},get fase(){return fase;},get revision(){return revision;},
    get seleccionado(){return seleccion?.id??null;},get destino(){return pendiente;},
    get rotacionPersonaje(){
      if(!seleccion)return 0;
      const frente=['alineando','entrando'].includes(fase)?-seleccion.frente:seleccion.frente;
      return frente>0?0:Math.PI;
    },
    get bloqueado(){return fase!=='libre';},
    get cotaActual(){return seleccion?seleccion.grupo.position.y:cotaPiso(piso);},
    cercano,
    puntoInicio(){return mundo(zona.ancho/2-1.9,cotaPiso(1),0);},
    usar(pos){
      if(fase!=='libre')return false;
      seleccion=cercano(pos);if(!seleccion)return false;
      pendiente=piso;
      if(seleccion.piso!==piso){
        puerta(seleccion,seleccion.piso,0);
        const y0=seleccion.grupo.position.y,y1=cotaPiso(piso);
        ejecutar('llamando',Math.max(1,Math.abs(y1-y0)/7),t=>{seleccion.grupo.position.y=THREE.MathUtils.lerp(y0,y1,t);},()=>{
          seleccion.piso=piso;abrirYEntrar(pos);
        });
      }else abrirYEntrar(pos);
      return true;
    },
    viajar(n,pos){
      if(fase!=='dentro'||!Number.isInteger(n)||n<1||n>PISOS_ELEVADOR||n===piso)return false;
      pendiente=n;
      animarPuerta(seleccion,piso,0,()=>{
        const origen=piso;
        const y0=cotaPiso(piso),y1=cotaPiso(n);
        ejecutar('viajando',Math.max(1.8,Math.abs(y1-y0)/6),t=>{
          const suave=t*t*(3-2*t);
          seleccion.grupo.position.y=THREE.MathUtils.lerp(y0,y1,suave);
          pos.copy(mundo(seleccion.x,seleccion.grupo.position.y,seleccion.z));
        },()=>{
          corteInterior(seleccion,origen,false);
          piso=n;seleccion.piso=n;mostrarNivel(n);corteInterior(seleccion,n,true);
          animarPuerta(seleccion,n,1,()=>{fase='dentro';tarea=null;});
        });
      });return true;
    },
    salir(pos){
      if(fase!=='dentro')return false;
      moverPersona(pos,mundo(seleccion.x,cotaPiso(piso),seleccion.z+seleccion.frente*1.9),'saliendo',()=>{
        corteInterior(seleccion,piso,false);
        animarPuerta(seleccion,piso,0,()=>{fase='libre';tarea=null;seleccion=null;revision++;});
      });return true;
    },
    reiniciar(){
      tarea=null;fase='libre';piso=1;pendiente=1;seleccion=null;
      cabinas.forEach(c=>{c.piso=1;c.grupo.position.y=base;c.techo.visible=true;});
      for(const [n]of niveles)cabinas.forEach(c=>{puerta(c,n,0);corteInterior(c,n,false);});
      mostrarNivel(1);
    },
    actualizar(dt){
      if(tarea){
        const actual=tarea;actual.tiempo=Math.min(actual.duracion,actual.tiempo+dt);
        actual.actualizar(actual.tiempo/actual.duracion);
        if(actual.tiempo>=actual.duracion){tarea=null;actual.fin();}
      }
      grupo.updateMatrixWorld(true);
    },
    camara(){
      if(!seleccion||!['dentro','cerrando','viajando','abriendo','entrando','saliendo'].includes(fase))return null;
      const y=seleccion.grupo.position.y;
      return {posicion:mundo(seleccion.x+.6,y+4.5,seleccion.z+seleccion.frente*3.4),
        objetivo:mundo(seleccion.x,y+1,seleccion.z)};
    }
  };
}
