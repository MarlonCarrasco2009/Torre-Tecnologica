import * as THREE from 'three';
import {CONFIG} from './config.js?v=video-1511-vegetacion';
import {bloque,placa,paredVidrio} from './geometria.js?v=video-1511-vegetacion';
import {jardinContorno} from './exteriores.js?v=video-1511-vegetacion';

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

// Mirando desde Torre A hacia Torre C: cuatro puertas a la izquierda (+Z)
// y dos a la derecha (-Z), corrección del usuario el 15/11/2026.
export const DISTRIBUCION_ELEVADORES={derecha:2,izquierda:4};
export function crearZonaElevadores(padre,{x,z,ancho,fondo}){
  const grupo=new THREE.Group();grupo.name='Área de elevadores';grupo.position.set(x,0,z);padre.add(grupo);
  const a=ancho/2,b=fondo/2,alto=4.1;
  const acero=new THREE.MeshStandardMaterial({color:'#c3c6bd',metalness:.28,roughness:.34});
  const lienzo=document.createElement('canvas');lienzo.width=256;lienzo.height=512;
  const pincel=lienzo.getContext('2d');
  for(let i=0;i<256;i++){
    const tono=Math.round(180+18*Math.sin(i*.021)+5*Math.sin(i*2.7));
    pincel.fillStyle=`rgb(${tono},${tono+2},${tono})`;pincel.fillRect(i,0,1,512);
  }
  const cepillado=new THREE.CanvasTexture(lienzo);cepillado.colorSpace=THREE.SRGBColorSpace;
  const aceroPuertas=new THREE.MeshStandardMaterial({map:cepillado,metalness:.25,roughness:.34});
  const pared='#77716b',cabinas=[];
  for(const [signo,cantidad] of [[-1,DISTRIBUCION_ELEVADORES.derecha],[1,DISTRIBUCION_ELEVADORES.izquierda]]){
    for(let i=0;i<cantidad;i++){
      const cx=-a+(i+.5)*ancho/cantidad,cz=signo*(b-1.25),frente=-signo;
      const cabina=new THREE.Group();cabina.name=`Cabina elevador ${cabinas.length+1}`;
      cabina.position.set(cx,base,cz);grupo.add(cabina);
      bloque(cabina,{y:-.07,ancho:2.65,alto:.14,fondo:2.2,color:'#b6b3a7'});
      for(const lado of [-1,1])bloque(cabina,{x:lado*1.275,y:1.42,ancho:.1,alto:2.84,fondo:2.2,material:acero});
      bloque(cabina,{z:-frente*1.05,y:1.42,ancho:2.65,alto:2.84,fondo:.1,material:acero});
      const techo=bloque(cabina,{y:2.9,ancho:2.65,alto:.12,fondo:2.2,color:'#d9dad3'});
      bloque(cabina,{z:-frente*.98,y:1.05,ancho:2.25,alto:.06,fondo:.08,material:acero});
      cabinas.push({id:cabinas.length+1,x:cx,z:cz,frente,grupo:cabina,techo,piso:1,lado:signo<0?'derecha':'izquierda'});
    }
  }
  const niveles=new Map();
  function crearNivel(piso){
    if(niveles.has(piso))return niveles.get(piso);
    const g=new THREE.Group();g.name=`Vestíbulo de elevadores - Piso ${piso}`;g.position.y=cotaPiso(piso);grupo.add(g);
    const suelo=placa(g,{y:-.03,ancho,fondo,color:'#8a8077'});
    if(piso>1)bloque(g,{y:-.19,ancho,alto:.32,fondo,color:'#aebcc7'});
    const franja=bloque(g,{y:.002,ancho,alto:.008,fondo:1.6,color:'#d8d0b4'});franja.name='Franja central clara del vestíbulo';franja.userData.sinColision=true;
    for(let px=-a;px<a;px+=1.1){const junta=bloque(g,{x:px,y:.009,ancho:.015,alto:.003,fondo:1.6,color:'#aaa697'});junta.userData.sinColision=true;}
    for(const signo of [-1,1]){
      bloque(g,{z:signo*b,y:alto/2,ancho,alto,fondo:.22,color:pared});
      const fila=cabinas.filter(c=>c.frente===-signo);
      // Paños continuos entre vanos, también en el lado con solo dos ascensores.
      let inicio=-a;
      for(const c of fila){
        const fin=c.x-.88;
        if(fin>inicio)bloque(g,{x:(inicio+fin)/2,z:c.z+c.frente*1.12,y:alto/2,ancho:fin-inicio,alto,fondo:.25,color:pared});
        bloque(g,{x:c.x,z:c.z+c.frente*1.12,y:(2.72+alto)/2,ancho:1.76,alto:alto-2.72,fondo:.25,color:pared});
        inicio=c.x+.88;
      }
      if(inicio<a)bloque(g,{x:(inicio+a)/2,z:signo*(b-2.37),y:alto/2,ancho:a-inicio,alto,fondo:.25,color:pared});
    }
    if(piso===1){
      for(const lado of [-1,1])paredVidrio(g,{x:lado*a,z:0,largo:fondo,baseY:0,alto,rotacion:lado*Math.PI/2,colorMarco:'#808c89'});
    }else{
      for(const lado of [-1,1])vidrioFijo(g,lado*a,0,fondo,alto,Math.PI/2);
    }
    const cubierta=new THREE.Group();cubierta.name='Techo oscuro del vestíbulo';cubierta.visible=false;g.add(cubierta);
    bloque(cubierta,{y:alto,ancho,alto:.1,fondo:Math.max(1,fondo-4.4),color:'#242b2a'});
    for(let xx=-a;xx<a;xx+=.2)bloque(cubierta,{x:xx,y:alto-.07,ancho:.025,alto:.1,fondo:Math.max(1,fondo-4.5),color:'#404640'});
    for(const zz of [-1,1])bloque(cubierta,{z:zz*(b-2.42),y:alto-.12,ancho,alto:.15,fondo:.13,color:'#dddcd1'});
    for(let xx=-a+1;xx<a;xx+=2.8){
      const luz=bloque(cubierta,{x:xx,y:alto-.14,ancho:.5,alto:.06,fondo:.22,color:'#fffce3'});
      luz.material.emissive=new THREE.Color('#fff2c8');luz.material.emissiveIntensity=.8;
    }
    const puertas=cabinas.map(c=>{
      const portal=new THREE.Group();portal.name=`Portal ascensor ${c.id} · ${c.lado}`;portal.position.set(c.x,0,c.z+c.frente*1.12);g.add(portal);
      for(const lado of [-1,1])bloque(portal,{x:lado*.84,y:1.35,ancho:.1,alto:2.7,fondo:.24,material:acero});
      const dintel=bloque(portal,{y:2.72,ancho:1.78,alto:.14,fondo:.24,material:acero});
      const hojas=[-1,1].map(lado=>{
        const hoja=bloque(portal,{x:lado*.385,y:1.3,ancho:.755,alto:2.6,fondo:.09,material:aceroPuertas});
        bloque(hoja,{x:-lado*.372,y:0,z:c.frente*.05,ancho:.012,alto:2.6,fondo:.012,color:'#4a504d'});
        return hoja;
      });
      const umbral=bloque(portal,{y:.013,ancho:1.65,alto:.025,fondo:.25,material:acero});umbral.userData.sinColision=true;
      const indicador=rotulo(portal,`${c.id} · ${piso}`,0,2.96,c.frente*.14,c.frente<0?Math.PI:0);
      const boton=bloque(portal,{x:1.15,y:1.22,z:c.frente*.17,ancho:.18,alto:.4,fondo:.06,material:acero});boton.userData.elevador=c.id;
      for(const y of [1.14,1.3])bloque(portal,{x:1.15,y,z:c.frente*.21,ancho:.065,alto:.065,fondo:.025,color:'#d8eee4'});
      // Señal roja y blanca junto a cada puerta, visible en el video.
      bloque(portal,{x:1.15,y:2.22,z:c.frente*.17,ancho:.22,alto:.35,fondo:.02,color:'#e5e2d9'});
      bloque(portal,{x:1.15,y:2.12,z:c.frente*.19,ancho:.22,alto:.1,fondo:.02,color:'#ae3d46'});
      return {hojas,abierto:0,dintel,indicador};
    });
    const nivel={grupo:g,suelo,puertas,cubierta};niveles.set(piso,nivel);return nivel;
  }
  const plantaBaja=crearNivel(1);
  const limiteJardin=.16+(3.5-.16)*1.5;
  jardinContorno(grupo,[[-a,b+.16],[a-1.96,b+.16],[a-1.96,b-1.15],
    [a-.04,b-1.15],[a-.04,b+limiteJardin],[-a,b+limiteJardin]],base+.18,.65,'#08090b');
  const datos={grupo,ancho,fondo,cabinas,niveles,crearNivel,plantaBaja};grupo.userData.zonaElevadores=datos;return datos;
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
