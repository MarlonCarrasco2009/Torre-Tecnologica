import * as THREE from 'three';
import {CONFIG} from './config.js?v=video-1511-vegetacion';
import {bloque,placa} from './geometria.js?v=video-1511-vegetacion';
import {jardinContorno} from './exteriores.js';

export const PISOS_ELEVADOR=11;
export const ENSANCHE_POR_FILA=1.4;
const colorPared='#40444c';
const base=CONFIG.baseY+.085;
export const cotaPiso=piso=>base+(piso-1)*CONFIG.altoPiso;

function vidrioFijo(grupo,x,z,ancho,alto,rotacion=0,colorMarco='#121820'){
  const marco=new THREE.Group();marco.position.set(x,0,z);marco.rotation.y=rotacion;grupo.add(marco);
  const vidrio=new THREE.MeshStandardMaterial({color:'#80c4df',transparent:true,opacity:.32,roughness:.15,depthWrite:false});
  bloque(marco,{y:alto/2,ancho,alto,fondo:.065,material:vidrio,sombra:false});
  for(const lado of [-1,1])bloque(marco,{x:lado*ancho/2,y:alto/2,ancho:.085,alto,fondo:.12,color:colorMarco});
  for(const y of [.04,alto])bloque(marco,{y,ancho,alto:.085,fondo:.12,color:colorMarco});
}

function entradaDoble(grupo,{x,z,largo,alto,fachada=false}){
  const paredDoble=new THREE.Group();paredDoble.name='Entrada de vidrio con dos hojas hacia dentro';
  paredDoble.position.set(x,0,z);paredDoble.rotation.y=fachada?-Math.PI/2:Math.PI/2;grupo.add(paredDoble);
  const centro=fachada?0:-.9,anchoVano=fachada?2.9:2.6,altoPuerta=fachada?2.95:2.65,hojaAncho=anchoVano/2;
  const izquierda=centro-anchoVano/2,derecha=centro+anchoVano/2;
  for(const [inicio,fin] of [[-largo/2,izquierda],[derecha,largo/2]]){
    if(!fachada){
      vidrioFijo(paredDoble,(inicio+fin)/2,0,fin-inicio,alto,0,'#808c89');
      continue;
    }
    const lado=inicio<izquierda?-1:1,lateral=.42;
    const ejeVidrio=centro+lado*(hojaAncho+lateral/2);
    vidrioFijo(paredDoble,ejeVidrio,0,lateral,alto);
    bloque(paredDoble,{x:ejeVidrio,y:1.38,ancho:lateral-.08,alto:.42,fondo:.07,color:'#b6c6c5'});
    const anchoMuro=fin-inicio-lateral,ejeMuro=ejeVidrio+lado*(lateral+anchoMuro)/2;
    bloque(paredDoble,{x:ejeMuro,y:alto/2,ancho:anchoMuro,alto,fondo:.24,color:colorPared});
    for(const y of [.76,2.72])bloque(paredDoble,{x:ejeMuro,y,z:.122,ancho:anchoMuro,alto:.014,fondo:.01,color:'#515154'});
    bloque(paredDoble,{x:centro+lado*hojaAncho,y:altoPuerta/2,z:.07,ancho:.09,alto:altoPuerta,fondo:.16,color:'#bdbfba'});
  }
  const superior=new THREE.Group();superior.position.y=altoPuerta;paredDoble.add(superior);
  vidrioFijo(superior,centro,0,anchoVano,alto-altoPuerta,0,'#808c89');
  if(fachada){
    bloque(paredDoble,{y:altoPuerta,z:.07,ancho:anchoVano+.09,alto:.1,fondo:.16,color:'#bdbfba'});
    rotulo(paredDoble,'SALIDA',centro,altoPuerta+.25,.09,0,'#104f36','#a9ffbd');
    const gabineteX=derecha+1.48;
    bloque(paredDoble,{x:gabineteX,y:1.22,z:.23,ancho:.55,alto:.74,fondo:.24,color:'#ad2330'}).name='Gabinete contra incendios';
    bloque(paredDoble,{x:gabineteX,y:1.22,z:.357,ancho:.38,alto:.56,fondo:.02,color:'#602d33'});
    bloque(paredDoble,{x:gabineteX,y:1.21,z:.376,ancho:.16,alto:.36,fondo:.025,color:'#d3443f'});
    bloque(paredDoble,{x:gabineteX,y:2.08,z:.13,ancho:.22,alto:.28,fondo:.02,color:'#eee8dc'});
    bloque(paredDoble,{x:gabineteX,y:2.08,z:.145,ancho:.08,alto:.15,fondo:.012,color:'#b73436'});
  }
  const vidrio=new THREE.MeshStandardMaterial({color:'#8acbdf',transparent:true,opacity:.42,
    roughness:.16,metalness:.08,depthWrite:false});
  for(const lado of [-1,1]){
    const hoja=new THREE.Group(),sentido=-lado;
    hoja.name=`Hoja ${lado<0?'izquierda':'derecha'} de entrada doble`;
    hoja.position.x=centro+lado*hojaAncho;
    Object.assign(hoja.userData,{puerta:true,puertaInteractiva:true,abierta:fachada,
      anguloAbierto:sentido*Math.PI/2,colisionDinamica:true,grupoPuertas:paredDoble.uuid});
    if(fachada)hoja.rotation.y=hoja.userData.anguloAbierto;
    paredDoble.add(hoja);
    bloque(hoja,{x:sentido*hojaAncho/2,y:altoPuerta/2,ancho:hojaAncho-.08,
      alto:altoPuerta-.08,fondo:.065,material:vidrio});
    for(const borde of [.035,hojaAncho-.035])bloque(hoja,{x:sentido*borde,y:altoPuerta/2,
      ancho:.07,alto:altoPuerta,fondo:.12,color:'#808c89'});
    for(const y of [.035,altoPuerta-.035])bloque(hoja,{x:sentido*hojaAncho/2,y,
      ancho:hojaAncho,alto:.07,fondo:.12,color:'#808c89'});
    for(const cara of [-1,1])bloque(hoja,{x:sentido*(hojaAncho-.18),y:1.25,z:cara*.12,
      ancho:.055,alto:.55,fondo:.065,color:'#808c89'});
  }
}

function rotulo(grupo,texto,x,y,z,rotacion=0,fondo='#101c28',color='#a6f2ff'){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=96;
  const ctx=canvas.getContext('2d');ctx.fillStyle=fondo;ctx.fillRect(0,0,256,96);
  ctx.fillStyle=color;ctx.font='bold 40px Arial';ctx.textAlign='center';ctx.fillText(texto,128,64);
  const mapa=new THREE.CanvasTexture(canvas);mapa.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(.95,.36),new THREE.MeshBasicMaterial({map:mapa}));
  m.position.set(x,y,z);m.rotation.y=rotacion;m.userData.sinColision=true;grupo.add(m);
  return m;
}

// Mirando desde Torre A hacia Torre C: cuatro puertas a la izquierda (+Z)
// y dos a la derecha (-Z), según el avance del compañero.
export const DISTRIBUCION_ELEVADORES={derecha:2,izquierda:4};
export function crearZonaElevadores(padre,{x,z,ancho,fondo}){
  const grupo=new THREE.Group();grupo.name='Área de elevadores';grupo.position.set(x,0,z);padre.add(grupo);
  const a=ancho/2,b=fondo/2,alto=4.1;
  const bordeJardin=b+ENSANCHE_POR_FILA;
  const fondoTotal=fondo+2*ENSANCHE_POR_FILA;
  const acero=new THREE.MeshStandardMaterial({color:'#c3c6bd',metalness:.28,roughness:.34});
  const lienzo=document.createElement('canvas');lienzo.width=256;lienzo.height=512;
  const pincel=lienzo.getContext('2d');
  for(let i=0;i<256;i++){
    const tono=Math.round(180+18*Math.sin(i*.021)+5*Math.sin(i*2.7));
    pincel.fillStyle=`rgb(${tono},${tono+2},${tono})`;pincel.fillRect(i,0,1,512);
  }
  const cepillado=new THREE.CanvasTexture(lienzo);cepillado.colorSpace=THREE.SRGBColorSpace;
  const aceroPuertas=new THREE.MeshStandardMaterial({map:cepillado,metalness:.25,roughness:.34});

  const cabinas=[];
  for(const [signo,cantidad] of [[-1,DISTRIBUCION_ELEVADORES.derecha],[1,DISTRIBUCION_ELEVADORES.izquierda]]){
    for(let i=0;i<cantidad;i++){
      // Desplaza la primera cabina hacia la segunda, siguiendo la flecha del plano.
      const desplazamientoX=signo===-1&&i===0?3.25:0;
      const cx=-a+(i+.5)*ancho/cantidad+desplazamientoX,cz=signo*(b-1.25),frente=-signo;
      const cabina=new THREE.Group();cabina.name=`Cabina elevador ${cabinas.length+1}`;
      cabina.position.set(cx,base,cz);grupo.add(cabina);
      const desplazamiento=signo*ENSANCHE_POR_FILA;
      bloque(cabina,{z:desplazamiento/2,y:-.07,ancho:2.65,alto:.14,fondo:2.2+ENSANCHE_POR_FILA,color:'#b6b3a7'});
      for(const lado of [-1,1])bloque(cabina,{x:lado*1.275,z:desplazamiento/2,y:1.42,ancho:.1,alto:2.84,fondo:2.2+ENSANCHE_POR_FILA,material:acero});
      bloque(cabina,{z:desplazamiento-frente*1.05,y:1.42,ancho:2.65,alto:2.84,fondo:.1,material:acero});
      const techo=bloque(cabina,{z:desplazamiento/2,y:2.9,ancho:2.65,alto:.12,fondo:2.2+ENSANCHE_POR_FILA,color:'#d9dad3'});
      bloque(cabina,{z:desplazamiento-frente*.98,y:1.05,ancho:2.25,alto:.06,fondo:.08,material:acero});
      cabinas.push({id:cabinas.length+1,x:cx,z:cz,frente,grupo:cabina,techo,piso:1,lado:signo<0?'derecha':'izquierda'});
    }
  }
  const niveles=new Map();
  function crearNivel(piso){
    if(niveles.has(piso))return niveles.get(piso);
    const g=new THREE.Group();g.name=`Vestíbulo de elevadores - Piso ${piso}`;g.position.y=cotaPiso(piso);grupo.add(g);
    const suelo=placa(g,{y:-.03,ancho,fondo:fondoTotal,color:'#8a8077'});
    if(piso>1)bloque(g,{y:-.19,ancho,alto:.32,fondo:fondoTotal,color:'#aebcc7'});
    const franja=bloque(g,{y:.002,ancho,alto:.008,fondo:1.6,color:'#d8d0b4'});franja.name='Franja central clara del vestíbulo';franja.userData.sinColision=true;
    for(let px=-a;px<a;px+=1.1){const junta=bloque(g,{x:px,y:.009,ancho:.015,alto:.003,fondo:1.6,color:'#aaa697'});junta.userData.sinColision=true;}
    for(const signo of [-1,1]){
      bloque(g,{z:signo*bordeJardin,y:alto/2,ancho,alto,fondo:.22,color:colorPared});
      const fila=cabinas.filter(c=>c.frente===-signo);
      // Paños continuos entre vanos, también en el lado con solo dos ascensores.
      // Abre los extremos marcados del frente en la planta baja.
      const extremosAbiertos=piso===1&&signo===-1;
      let inicio=extremosAbiertos?cabinas[0].x-3.3:-a;
      for(const c of fila){
        const fin=c.x-.88;
        if(fin>inicio)bloque(g,{x:(inicio+fin)/2,z:c.z+c.frente*1.12,y:alto/2,ancho:fin-inicio,alto,fondo:.25,color:colorPared});
        bloque(g,{x:c.x,z:c.z+c.frente*1.12,y:(2.72+alto)/2,ancho:1.76,alto:alto-2.72,fondo:.25,color:colorPared});
        inicio=c.x+.88;
      }
      const final=extremosAbiertos?cabinas[1].x+2.2:a;
      if(inicio<final)bloque(g,{x:(inicio+final)/2,z:signo*(b-2.37),y:alto/2,ancho:final-inicio,alto,fondo:.25,color:colorPared});
    }
    if(piso===1){
      // Divisiones y retornos señalados a ambos lados de la fila de dos cabinas.
      const izquierda=cabinas[0].x-2.3,derecha=cabinas[1].x+2.2;
      const frente=-b+2.37;
      const tramos=[
        ['División izquierda',izquierda,-bordeJardin,izquierda,frente],
        ['Retorno izquierdo',izquierda-1,frente-.65,izquierda+.9,frente-.65],
        ['Cierre corto izquierdo',izquierda-1,frente-.65,izquierda-1,frente],
        ['División derecha',derecha,-bordeJardin,derecha,frente],
        ['Unión posterior al vidrio',a,-bordeJardin,a+1.5,-bordeJardin],
        ['Cierre junto al jardín y al vidrio',a,b-2.37,a,bordeJardin],
        ['División de cabina junto al jardín',a-ancho/4,b-2.37,a-ancho/4,bordeJardin]
      ];
      for(const [nombre,x1,z1,x2,z2] of tramos){
        bloque(g,{x:(x1+x2)/2,z:(z1+z2)/2,y:alto/2,
          ancho:Math.abs(x2-x1)+.22,fondo:Math.abs(z2-z1)+.22,
          alto,color:colorPared}).name=`Muro de elevadores · ${nombre}`;
      }
      for(const lado of [-1,1]){
        const desplazamientoExterior=lado===1?1.5:0;
        // El extremo +Z termina en el nuevo panel transversal.
        const recorte=lado===1?2.37:0;
        if(lado===1){
          entradaDoble(g,{x:a+desplazamientoExterior,z:-(recorte+ENSANCHE_POR_FILA)/2,largo:fondo+ENSANCHE_POR_FILA-recorte,alto});
          continue;
        }
        entradaDoble(g,{x:-a,z:0,largo:fondoTotal,alto,fachada:true});
      }
      // Cierra el tramo marcado entre la fachada de cabinas y el vidrio desplazado.
      vidrioFijo(g,a+.75,b-2.37,1.5,alto,0,'#808c89');
    }else{
      for(const lado of [-1,1])vidrioFijo(g,lado*a,0,fondoTotal,alto,Math.PI/2);
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
  // Contorno ajustado: franja estrecha y retorno hasta el frente del vidrio.
  const limiteJardin=2.7;
  const extremoIzquierdoJardin=-a+.95;
  jardinContorno(grupo,[[extremoIzquierdoJardin,bordeJardin+.16],[a,bordeJardin+.16],[a,b-2.37],
    [a+1.5,b-2.37],[a+1.5,bordeJardin+limiteJardin],[extremoIzquierdoJardin,bordeJardin+limiteJardin]],base+.18,.35,'#08090b',[0,1]);
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
      // Bajo el techo del vestíbulo durante el acceso; dentro de la cabina en el viaje.
      const enCabina=!seleccion.techo.visible;
      const posicion=enCabina
        ?mundo(seleccion.x+.98,y+2.48,seleccion.z+seleccion.frente*.78)
        :mundo(seleccion.x+.45,y+2.05,seleccion.z+seleccion.frente*3.1);
      return {posicion,objetivo:mundo(seleccion.x,y+1.2,seleccion.z)};
    }
  };
}
