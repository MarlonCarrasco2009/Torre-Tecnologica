import * as THREE from 'three';
import { CONFIG } from './config.js?v=rampas-concreto-claro-84';
import { crearIngreso } from './ingreso.js?v=ingreso-ampliado-derecha-70';
import { bloque,placa,columna,etiqueta } from './geometria.js';
import { aplicarPiedraPisos } from './piedra-piso.js?v=pizarra-pasillo-a-93';
import { aplicarCesped } from './cesped.js';
import { aplicarCementoMuros } from './cemento.js';

const pavimento=CONFIG.acabados.piso;
const pavimentoRampa=CONFIG.acabados.rampa;
const materialBordeJardin=new THREE.MeshStandardMaterial({color:'#292c30',roughness:.92});
const materialTapaJardin=new THREE.MeshStandardMaterial({color:'#45494f',roughness:.86});

function aplicarRayasRampas(grupo){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d');
  const datos=ctx.createImageData(256,256);
  let semilla=84;
  const azar=()=>{semilla=(Math.imul(semilla,1664525)+1013904223)>>>0;return semilla/4294967296;};
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const grano=(azar()-.5)*22;
    const tono=(y<9?137:y<12?204:226)+grano;
    const i=(y*256+x)*4;
    datos.data[i]=tono;datos.data[i+1]=tono+1;datos.data[i+2]=tono+2;datos.data[i+3]=255;
  }
  ctx.putImageData(datos,0,0);
  const mapa=new THREE.CanvasTexture(canvas);
  mapa.wrapS=mapa.wrapT=THREE.RepeatWrapping;mapa.colorSpace=THREE.SRGBColorSpace;mapa.anisotropy=8;
  const relieve=mapa.clone();relieve.colorSpace=THREE.NoColorSpace;relieve.needsUpdate=true;
  const material=new THREE.MeshStandardMaterial({color:pavimentoRampa,map:mapa,
    bumpMap:relieve,bumpScale:.025,roughness:.94});
  const colorRampa=new THREE.Color(pavimentoRampa);
  grupo.traverse(obj=>{
    if(!obj.isMesh||Array.isArray(obj.material)||!obj.name.toLowerCase().includes('rampa'))return;
    if(!obj.material.color?.equals(colorRampa))return;
    const geometria=obj.geometry.clone(),pos=geometria.attributes.position;
    const uv=new Float32Array(pos.count*2);
    for(let i=0;i<pos.count;i++){
      uv[i*2]=pos.getX(i);uv[i*2+1]=pos.getZ(i)/.55;
    }
    geometria.setAttribute('uv',new THREE.BufferAttribute(uv,2));
    obj.geometry=geometria;obj.material=material;
  });
}

// Muro bajo plomo, con coronación continua como en la referencia.
// Todo el espesor queda dentro del jardín para mantener libres los recorridos.
function bordeJardin(grupo,puntos,nivelCesped,espesor=.5,colorBorde=null,ladosAbiertos=[]){
  const base=.12,coronacion=nivelCesped+.65,altoTapa=.1;
  const area=puntos.reduce((s,[x,z],i)=>{
    const siguiente=puntos[(i+1)%puntos.length];
    return s+x*siguiente[1]-siguiente[0]*z;
  },0);
  const sentido=Math.sign(area);
  const normales=puntos.map(([x,z],i)=>{
    const [nx,nz]=puntos[(i+1)%puntos.length];
    const largo=Math.hypot(nx-x,nz-z);
    return new THREE.Vector2(-(nz-z)*sentido/largo,(nx-x)*sentido/largo);
  });
  // Intersección de los lados desplazados: esquinas unidas, también en entrantes.
  const interior=puntos.map(([x,z],i)=>{
    const anterior=normales[(i+puntos.length-1)%puntos.length],actual=normales[i];
    const distanciaAnterior=ladosAbiertos.includes((i+puntos.length-1)%puntos.length)?0:espesor;
    const distanciaActual=ladosAbiertos.includes(i)?0:espesor;
    const producto=anterior.dot(actual),denominador=1-producto*producto;
    const desplazamiento=anterior.clone().multiplyScalar((distanciaAnterior-producto*distanciaActual)/denominador)
      .addScaledVector(actual,(distanciaActual-producto*distanciaAnterior)/denominador);
    return new THREE.Vector2(x+desplazamiento.x,-z-desplazamiento.y);
  });
  // La pared del hueco debe mirar hacia el césped, con sentido opuesto al exterior.
  // ExtrudeGeometry no corrige los huecos si el contorno exterior ya es horario.
  const exterior=puntos.map(([x,z])=>new THREE.Vector2(x,-z));
  if(!THREE.ShapeUtils.isClockWise(exterior))exterior.reverse();
  const hueco=interior.map(p=>p.clone());
  if(THREE.ShapeUtils.isClockWise(hueco))hueco.reverse();
  const forma=new THREE.Shape(exterior);
  forma.holes.push(new THREE.Path(hueco));
  if(!ladosAbiertos.length){
    for(const [nombre,nivel,alto,material] of [
      ['Muro plomo de contención del jardín',base,coronacion-altoTapa-base,materialBordeJardin],
      ['Coronación ploma del jardín',coronacion-altoTapa,altoTapa,materialTapaJardin]
    ]){
      const geometria=new THREE.ExtrudeGeometry(forma,{depth:alto,bevelEnabled:false});
      geometria.rotateX(-Math.PI/2);
      const acabado=colorBorde===null?material:material.clone();
      if(colorBorde!==null)acabado.color.set(colorBorde);
      const muro=new THREE.Mesh(geometria,acabado);
      muro.name=nombre;
      muro.position.y=nivel;
      muro.castShadow=true; muro.receiveShadow=true;
      grupo.add(muro);
    }
  }else{
    for(let i=0;i<puntos.length;i++){
      if(ladosAbiertos.includes(i))continue;
      const siguiente=(i+1)%puntos.length;
      const [x,z]=puntos[i], [nx,nz]=puntos[siguiente];
      // Comparte exactamente el límite del césped, incluso en las diagonales.
      // Los bloques centrados dejaban medio espesor de separación sin rellenar.
      const formaTramo=new THREE.Shape([new THREE.Vector2(x,-z),
        new THREE.Vector2(nx,-nz),interior[siguiente].clone(),interior[i].clone()]);
      for(const [nombre,nivel,alto,material] of [
        ['Muro plomo de contención del jardín',base,coronacion-altoTapa-base,materialBordeJardin],
        ['Coronación ploma del jardín',coronacion-altoTapa,altoTapa,materialTapaJardin]
      ]){
        const geometria=new THREE.ExtrudeGeometry(formaTramo,{depth:alto,bevelEnabled:false});
        geometria.rotateX(-Math.PI/2);
        const acabado=colorBorde===null?material:material.clone();
        if(colorBorde!==null)acabado.color.set(colorBorde);
        const tramo=new THREE.Mesh(geometria,acabado);
        tramo.name=nombre;tramo.position.y=nivel;
        tramo.castShadow=true;tramo.receiveShadow=true;
        grupo.add(tramo);
      }
    }
  }
  return interior.map(p=>[p.x,-p.y]);
}

function jardin(grupo,x,z,ancho,fondo,arboles=0,altura=.415){
  const base=.12;
  bloque(grupo,{x,y:(base+altura-.055)/2,z,ancho:ancho-.1,alto:altura-.055-base,
    fondo:fondo-.1,color:'#9aa6ad'});
  placa(grupo,{x,y:altura-.03,z,ancho:ancho-.28,fondo:fondo-.28,color:'#3a9676'});
  bordeJardin(grupo,[[x-ancho/2,z-fondo/2],[x+ancho/2,z-fondo/2],
    [x+ancho/2,z+fondo/2],[x-ancho/2,z+fondo/2]],altura,.75);
  const elevacion=altura-.415;
  for(let i=0;i<arboles;i++){
    const px=x+(i%3-1)*Math.min(ancho/3.6,4),pz=z+(Math.floor(i/3)-.5)*Math.min(fondo/3.5,7);
    bloque(grupo,{x:px,y:1.02+elevacion,z:pz,ancho:.37,alto:1.3,fondo:.37,color:'#7c6e50'});
    const copa=new THREE.Mesh(new THREE.IcosahedronGeometry(1.2,1),new THREE.MeshStandardMaterial({color:i%2?'#297950':'#3b915b',roughness:1}));
    copa.position.set(px,2.55+elevacion,pz); copa.castShadow=true; grupo.add(copa);
  }
}

// Jardinera elevada abierta hacia la sala: conserva muros negros en tres lados
// y deja libre el lado de conexión para que no aparezca un cierre inferior.
function jardinAbierto(grupo,{x,z,ancho,fondo,altura,abierto='sur'}){
  const base=.12,coronacion=altura+.65,altoTapa=.1,espesor=.75;
  bloque(grupo,{x,y:(base+altura-.055)/2,z,ancho:ancho-.1,alto:altura-.055-base,
    fondo:fondo-.1,color:'#9aa6ad'});
  placa(grupo,{x,y:altura-.03,z,ancho:ancho-.28,fondo:fondo-.28,color:'#3a9676'});
  const altoMuro=coronacion-altoTapa-base;
  const yMuro=base+altoMuro/2;
  const lados={
    norte:{x,z:z-fondo/2,ancho,fondo:espesor},
    sur:{x,z:z+fondo/2,ancho,fondo:espesor},
    oeste:{x:x-ancho/2,z,ancho:espesor,fondo},
    este:{x:x+ancho/2,z,ancho:espesor,fondo}
  };
  for(const [lado,datos] of Object.entries(lados)){
    if(lado===abierto) continue;
    bloque(grupo,{...datos,y:yMuro,alto:altoMuro,color:'#08090b'});
    bloque(grupo,{...datos,y:coronacion-altoTapa/2,alto:altoTapa,color:'#08090b'});
  }
}

function rampa(grupo,x,z,ancho,fondo,pendiente=0.06){
  const m=bloque(grupo,{x,y:.78,z,ancho,alto:.18,fondo,color:pavimentoRampa});
  m.rotation.x=pendiente;
  // Bordes de seguridad / barandas esquemáticos.
  for(const lado of [-1,1]){
    bloque(grupo,{x:x+lado*ancho*.47,y:1.25,z,ancho:.13,alto:.48,fondo,color:'#9da9b2'}).rotation.x=pendiente;
  }
  const barandas=new THREE.Group();
  barandas.name='Barandillas metálicas laterales de rampa';
  barandas.position.set(x,0,z);barandas.rotation.x=pendiente;
  grupo.add(barandas);
  barandasRampaRecta(barandas,ancho,fondo,.89);
  return m;
}
function escalera(grupo,x,z,ancho=5,contador=12){
  const fondoTotal=10;
  for(let i=0;i<contador;i++){
    bloque(grupo,{x,y:.36+(i*.085),z:z-fondoTotal/2+(i+.5)*fondoTotal/contador,ancho,alto:.18,fondo:fondoTotal/contador+.025,color:pavimento,sombra:false});
  }
}

const materialBarandaMetal=new THREE.MeshStandardMaterial({
  color:'#c4cbd1',metalness:.65,roughness:.24
});

function barraMetalica(grupo,a,b,radio=.065,nombre='Barra metálica'){
  const vector=b.clone().sub(a),largo=vector.length();
  if(largo<=.001)return;
  const barra=new THREE.Mesh(new THREE.CylinderGeometry(radio,radio,largo,10),materialBarandaMetal);
  barra.position.copy(a).add(b).multiplyScalar(.5);
  barra.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vector.normalize());
  barra.name=nombre;
  barra.castShadow=true;barra.receiveShadow=true;
  grupo.add(barra);
}

function barandasEscalera(grupo,largo,ancho,desde,hasta,cantidad=2){
  const desnivel=hasta.y-desde.y;
  const superficie=z=>{
    const t=THREE.MathUtils.clamp((z+largo/2)/largo,0,1);
    return desde.y+desnivel*t;
  };
  // Las jardineras ocultan el borde exterior; coloca los postes dentro
  // del ancho útil de los peldaños para que las barandillas queden visibles.
  const borde=ancho/2-.22,altura=1.02;
  for(let linea=0;linea<cantidad;linea++){
    const x=-borde+linea*2*borde/(cantidad-1);
    const inicioZ=-largo/2+.22,finZ=largo/2-.22;
    const postes=[inicioZ,0,finZ];
    for(const z of postes){
      const base=new THREE.Vector3(x,superficie(z)+.04,z);
      const cima=base.clone();cima.y+=altura;
      barraMetalica(grupo,base,cima,.045,'Poste de baranda de escalera');
    }
    const inicio=new THREE.Vector3(x,superficie(-largo/2)+.04+altura,-largo/2);
    const fin=new THREE.Vector3(x,superficie(largo/2)+.04+altura,largo/2);
    barraMetalica(grupo,inicio,fin,.055,'Pasamanos longitudinal de escalera');
  }
}

function barandasTramo(grupo,largo,ancho,desde,hasta,baseOffset=.06,nombre='Barandilla metálica de rampa'){
  const desnivel=hasta.y-desde.y;
  const superficie=z=>{
    const t=THREE.MathUtils.clamp((z+largo/2)/largo,0,1);
    return desde.y+desnivel*t;
  };
  const borde=ancho/2-.22,altura=1.02;
  for(const lado of [-1,1]){
    const x=lado*borde;
    const inicioZ=-largo/2+.22,finZ=largo/2-.22;
    for(const z of [inicioZ,0,finZ]){
      const base=new THREE.Vector3(x,superficie(z)+baseOffset,z);
      const cima=base.clone();cima.y+=altura;
      barraMetalica(grupo,base,cima,.055,`${nombre} - poste`);
    }
    const inicio=new THREE.Vector3(x,superficie(-largo/2)+baseOffset+altura,-largo/2);
    const fin=new THREE.Vector3(x,superficie(largo/2)+baseOffset+altura,largo/2);
    barraMetalica(grupo,inicio,fin,.075,`${nombre} - pasamanos`);
  }
}

function barandasRampaRecta(grupo,ancho,fondo,baseY){
  const borde=ancho/2-.22,altura=1.02;
  for(const lado of [-1,1]){
    const x=lado*borde;
    for(const z of [-fondo/2+.22,0,fondo/2-.22]){
      const base=new THREE.Vector3(x,baseY,z);
      const cima=base.clone();cima.y+=altura;
      barraMetalica(grupo,base,cima,.055,'Barandilla metálica de rampa - poste');
    }
    barraMetalica(grupo,
      new THREE.Vector3(x,baseY+altura,-fondo/2),
      new THREE.Vector3(x,baseY+altura,fondo/2),
      .075,'Barandilla metálica de rampa - pasamanos');
  }
}

function barandasRampaTrapezoidal(grupo,{sur,norte,anchoSur,anchoNorte}){
  const altura=1.02;
  const largo=Math.hypot(sur.x-norte.x,sur.z-norte.z);
  const tramos=Math.max(2,Math.ceil(largo/3));
  for(const lado of [-1,1]){
    const punto=(t,extraY=0)=>new THREE.Vector3(
      THREE.MathUtils.lerp(sur.x+lado*(anchoSur/2-.22),norte.x+lado*(anchoNorte/2-.22),t),
      THREE.MathUtils.lerp(sur.y,norte.y,t)+.08+extraY,
      THREE.MathUtils.lerp(sur.z,norte.z,t)
    );
    for(let i=0;i<=tramos;i++){
      const t=THREE.MathUtils.lerp(.15/largo,1-.15/largo,i/tramos);
      const base=punto(t),cima=base.clone();cima.y+=altura;
      barraMetalica(grupo,base,cima,.055,'Barandilla metálica trapezoidal - poste');
    }
    barraMetalica(grupo,punto(0,altura),punto(1,altura),.075,
      'Barandilla metálica trapezoidal - pasamanos');
  }
}

// Tramos definidos por sus extremos para conectar descansos sin invadir jardines.
function recorrido(grupo,desde,hasta,ancho,tipo,{peldaños,barandas=2,tramos=1,nombre}={}){
  const tramo=new THREE.Group(); tramo.name=tipo==='rampa'?'Rampa de concreto':'Escalera de concreto';
  if(nombre)tramo.name=nombre;
  const largo=Math.hypot(hasta.x-desde.x,hasta.z-desde.z);
  tramo.position.set((desde.x+hasta.x)/2,0,(desde.z+hasta.z)/2);
  tramo.rotation.y=Math.atan2(hasta.x-desde.x,hasta.z-desde.z);
  grupo.add(tramo);
  const desnivel=hasta.y-desde.y;
  if(tipo==='rampa'){
    const losa=bloque(tramo,{y:(desde.y+hasta.y)/2-.06,ancho,alto:.12,
      fondo:Math.hypot(largo,desnivel),color:pavimentoRampa});
    losa.rotation.x=-Math.atan2(desnivel,largo);
    for(const lado of [-1,1]){
      const borde=bloque(tramo,{x:lado*(ancho/2-.05),y:(desde.y+hasta.y)/2+.06,
        ancho:.1,alto:.12,fondo:Math.hypot(largo,desnivel),color:pavimentoRampa});
      borde.rotation.x=losa.rotation.x;
    }
    barandasTramo(tramo,largo,ancho,desde,hasta,.08);
  }else{
    const pasos=peldaños??Math.max(4,Math.ceil(Math.abs(desnivel)/.16));
    tramo.userData={tipo:'escalera',peldaños:pasos,barandas,tramos,desde:{...desde},hasta:{...hasta},ancho};
    for(let i=0;i<pasos;i++){
      // El peldaño superior coincide exactamente con el piso de llegada.
      const avance=desnivel>0?(i+1)/pasos:i/pasos;
      const superficie=desde.y+desnivel*avance;
      const alto=superficie-.02;
      for(let carril=0;carril<tramos;carril++){
        // Dos tramos contiguos comparten el borde y una única baranda central.
        const anchoTramo=ancho/tramos,x=-ancho/2+(carril+.5)*anchoTramo;
        bloque(tramo,{x,y:.02+alto/2,z:-largo/2+(i+.5)*largo/pasos,
          ancho:anchoTramo,alto,fondo:largo/pasos,color:pavimento})
          .name=`Peldaño ${i+1} - tramo ${carril+1}`;
        bloque(tramo,{x,y:superficie+.006,z:-largo/2+i*largo/pasos+.025,
          ancho:anchoTramo,alto:.012,fondo:.05,color:'#5b6065',sombra:false});
      }
    }
    barandasEscalera(tramo,largo,ancho,desde,hasta,barandas);
  }
}

export function jardinContorno(grupo,puntos,altura=.38,espesorBorde=.5,colorBorde=null,ladosAbiertos=[]){
  // El relleno termina en la cara interior del muro; no comparte sus caras externas.
  const interior=bordeJardin(grupo,puntos,altura,espesorBorde,colorBorde,ladosAbiertos);
  const forma=new THREE.Shape(interior.map(([x,z])=>new THREE.Vector2(x,-z)));
  const geometria=new THREE.ExtrudeGeometry(forma,{depth:altura-.13,bevelEnabled:false});
  geometria.rotateX(-Math.PI/2);
  const cesped=new THREE.MeshStandardMaterial({color:'#3a9676',roughness:1});
  const contencion=new THREE.MeshStandardMaterial({color:'#aebbc4',roughness:.9});
  const verde=new THREE.Mesh(geometria,altura>.5?[cesped,contencion]:cesped);
  verde.name='Jardín con base de contención';
  verde.position.y=.13; verde.receiveShadow=true;
  grupo.add(verde);
}

// Rampa con lados convergentes en planta y espesor continuo hasta el pavimento.
function rampaTrapezoidal(grupo,{sur,norte,anchoSur,anchoNorte,barandas=true,color=pavimentoRampa,nombre='Rampa trapezoidal de concreto'}){
  const esquinas=[
    [sur.x-anchoSur/2,sur.y,sur.z],[sur.x+anchoSur/2,sur.y,sur.z],
    [norte.x+anchoNorte/2,norte.y,norte.z],[norte.x-anchoNorte/2,norte.y,norte.z]
  ];
  const vertices=[...esquinas.flat(),...esquinas.flatMap(([x,,z])=>[x,.12,z])];
  const geometria=new THREE.BufferGeometry();
  geometria.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometria.setIndex([0,1,2,0,2,3,4,6,5,4,7,6,
    0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0]);
  geometria.computeVertexNormals();
  const rampa=new THREE.Mesh(geometria,new THREE.MeshStandardMaterial({color,roughness:.84}));
  rampa.name=nombre;
  rampa.castShadow=true; rampa.receiveShadow=true;
  grupo.add(rampa);
  // Bordes discretos que siguen la pendiente y el estrechamiento de cada lado.
  for(const lado of [-1,1]){
    const a=new THREE.Vector3(sur.x+lado*(anchoSur/2-.045),sur.y+.045,sur.z);
    const b=new THREE.Vector3(norte.x+lado*(anchoNorte/2-.045),norte.y+.045,norte.z);
    const centro=a.clone().add(b).multiplyScalar(.5);
    const borde=bloque(grupo,{x:centro.x,y:centro.y,z:centro.z,
      ancho:.09,alto:.09,fondo:a.distanceTo(b),color:pavimentoRampa});
    borde.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),b.sub(a).normalize());
  }
  if(barandas)barandasRampaTrapezoidal(grupo,{sur,norte,anchoSur,anchoNorte});
}

function descansoMacizo(grupo,{x,z,ancho,fondo,altura}){
  const base=.12;
  const descanso=bloque(grupo,{x,z,y:(base+altura)/2,ancho,fondo,
    alto:altura-base,color:pavimento});
  descanso.name='Descanso de concreto con base maciza';
  return descanso;
}

// Piso con base maciza y cota superior continua con la rampa y su escalera.
function pisoLateralElevado(grupo,puntos,alturaEnZ,color=pavimento){
  const forma=new THREE.Shape(puntos.map(([x,z])=>new THREE.Vector2(x,-z)));
  const geometria=new THREE.ExtrudeGeometry(forma,{depth:1,bevelEnabled:false});
  geometria.rotateX(-Math.PI/2);
  const posiciones=geometria.attributes.position;
  for(let i=0;i<posiciones.count;i++){
    const nivel=posiciones.getY(i);
    posiciones.setY(i,.12+nivel*(alturaEnZ(posiciones.getZ(i),posiciones.getX(i))-.12));
  }
  posiciones.needsUpdate=true;
  geometria.computeVertexNormals();
  const piso=new THREE.Mesh(geometria,new THREE.MeshStandardMaterial({color,roughness:.84}));
  piso.name='Pasillo lateral elevado con espesor hasta el suelo';
  piso.castShadow=true; piso.receiveShadow=true;
  grupo.add(piso);
}


function crearAccesoLateral(grupo){
  const acceso=new THREE.Group();acceso.name='Patio de Torre A · croquis 10 noviembre';grupo.add(acceso);
  // Coordenadas del dibujo: fachada, dos islas centrales y cerco derecho.
  const alto=CONFIG.baseY+.01,bajo=.14,norte=-14,sur=25;
  const fachada=CONFIG.torres.A.x+13*CONFIG.torres.A.ancho/32;
  const ingresoX=CONFIG.ingreso.x+CONFIG.ingreso.desplazamientoX;
  const finJardinAdministracion=ingresoX-5.7;
  const jardinCroquis=(nombre,puntos,nivel=alto+.07,ladosAbiertos=[])=>{
    const g=new THREE.Group();g.name=nombre;g.userData.contorno=puntos;acceso.add(g);
    jardinContorno(g,puntos,nivel,.6,'#33363b',ladosAbiertos);return g;
  };
  // Los dos bordes interiores siguen el trazado marcado y delimitan la rampa.
  const anchoRampaCentral=3.2;
  const bordeInteriorNorte=53.1,bordeInteriorSur=50.3;
  jardinCroquis('Jardín junto a conferencias con lateral inclinado',
    [[42,norte],[bordeInteriorNorte,norte],[bordeInteriorSur,sur],[42,sur]]);
  jardinCroquis('Jardín central trapezoidal',
    [[bordeInteriorNorte+anchoRampaCentral,norte],[63.9,norte],[68,sur],
      [bordeInteriorSur+anchoRampaCentral,sur]]);
  // Recorta el césped al interior del cerco, teniendo en cuenta el desplazamiento del jardín.
  const desplazamientoJardinDerecho=2.1;
  const limiteJardinDerecho=CONFIG.anchoCampus/2+CONFIG.extensionDerecha-.12-desplazamientoJardinDerecho;
  const jardinDerecho=jardinCroquis('Jardín derecho con entrante en L',[[71.15,norte],[limiteJardinDerecho,norte],[limiteJardinDerecho,35],
    [78.6,31.2],[78.9,27],[78.9,24],[74.1,24]],1.1,[1]);
  jardinDerecho.position.x+=desplazamientoJardinDerecho;
  // Evita que la sombra del borde parezca una zanja en el pasadizo contiguo.
  jardinDerecho.traverse(obj=>{
    if(obj.isMesh&&(obj.name==='Muro plomo de contención del jardín'||obj.name==='Coronación ploma del jardín')){
      obj.castShadow=false;
    }
  });
  const limiteJardinFrontal=CONFIG.fondoCampus/2-.14;
  // Un solo contorno une la franja y el jardín frontal, sin muro transversal.
  const inicioFranja=CONFIG.torres.A.x-CONFIG.torres.A.ancho/2-2.4;
  const franjaFrontal=new THREE.Group();
  franjaFrontal.name='Jardín frontal continuo de Torre A e ingreso';
  // La unión avanza en diagonal, sin el quiebre perpendicular entre jardines.
  const contornoFranja=[[inicioFranja,34.6],[fachada-2,34.6],
    [fachada+3,33.88],[65.9,32.8],[65.9,limiteJardinFrontal],
    [inicioFranja,limiteJardinFrontal]];
  franjaFrontal.userData.contorno=contornoFranja;
  acceso.add(franjaFrontal);
  jardinContorno(franjaFrontal,contornoFranja,alto+.07,.55,'#08090b',[4]);
  jardinCroquis('Franja verde transversal junto a Administración',[[fachada,-25.7],[finJardinAdministracion,-25.7],
    [finJardinAdministracion,-22.1],[fachada,-22.1]]);
  jardinCroquis('Jardín posterior de Torre A',[[28,-38],[42.7,-38],[44,-35],[28,-35]],.86);
  // Se retira el tramo frente al ingreso; quedan dos conexiones y el acceso libre.
  // El extremo encaja con la cara exterior del cerramiento lateral izquierdo del Ingreso.
  const limiteMuroLateralIngreso=ingresoX-5.5;
  const muroAntesIngreso=trazarMuro(acceso,fachada,-19.6,
    limiteMuroLateralIngreso,-19.6);
  // Se conserva solo el tramo anterior; el muro paralelo posterior se retira.
  for(const muro of [muroAntesIngreso]){
    muro.userData.sinColision=true;
    muro.scale.y=1.7;
    muro.position.y=0;
  }
  descansoMacizo(acceso,{x:(37.25+43.7)/2,z:4.45,ancho:43.7-37.25,fondo:53.1,altura:alto})
    .name='Paseo continuo de las fachadas de Torre A';
  descansoMacizo(acceso,{x:(fachada+55.3)/2,z:28.9,ancho:55.3-fachada,fondo:7.8,altura:alto})
    .name='Descanso frontal unido a Torre A';
  descansoMacizo(acceso,{x:(fachada+74.5)/2,z:-21.35,ancho:74.5-fachada,fondo:1.5,altura:alto});
  descansoMacizo(acceso,{x:67.525,z:-17.3,ancho:7.25,fondo:6.6,altura:1.35});
  // Dos escaleras contiguas orientadas hacia la fachada de las torres (-X).
  // Relleno macizo hasta el ingreso, unido al pasillo entre los jardines.
  // Piso horizontal elevado; la escalera conserva el desnivel hacia las torres.
  const nivelLlegadaEscaleras=1.35;
  pisoLateralElevado(acceso,[[48.6,-19.48],[63.9,-19.48],
    [63.9,-14],[48.6,-14]],()=>nivelLlegadaEscaleras);
  const centroEscalerasIngreso=(-19.48+norte)/2;
  const anchoEscalerasIngreso=norte+19.48;
  descansoMacizo(acceso,{x:(43.7+46.2)/2,z:centroEscalerasIngreso,ancho:46.2-43.7,fondo:anchoEscalerasIngreso,altura:alto})
    .name='Descanso superior conectado al paseo de las torres';
  recorrido(acceso,{x:48.6,z:centroEscalerasIngreso,y:nivelLlegadaEscaleras},{x:46.2,z:centroEscalerasIngreso,y:alto},anchoEscalerasIngreso,'escalera',
    {peldaños:6,tramos:2,barandas:3,nombre:'Dos escaleras hacia las torres junto al ingreso'});
  const pasilloCentral=new THREE.Group();pasilloCentral.name='Pasillo central con pendiente suave y extremos conectados';
  pasilloCentral.position.set(bordeInteriorNorte+anchoRampaCentral/2,0,(norte+sur)/2);acceso.add(pasilloCentral);
  const mitadRampaCentral=(sur-norte)/2;
  // Cuña inclinada explícita, con sus extremos dentro de los descansos.
  // Norte: relleno del ingreso. Sur: descanso frontal elevado de Torre A.
  rampaTrapezoidal(pasilloCentral,{
    norte:{x:0,z:-mitadRampaCentral-.04,y:nivelLlegadaEscaleras},
    sur:{x:bordeInteriorSur-bordeInteriorNorte,z:mitadRampaCentral+.04,y:alto},
    anchoNorte:anchoRampaCentral,anchoSur:anchoRampaCentral,barandas:true,color:pavimentoRampa});
  // A la izquierda de la escalera exterior: rampa continua desde el piso bajo.
  const rampaIzquierda=new THREE.Group();rampaIzquierda.name='Rampa a la izquierda de la escalera exterior';acceso.add(rampaIzquierda);
  const inicioComunRampaEscalera=21.5;
  // Aprovecha el espacio entre jardines con una rampa de ancho uniforme.
  rampaTrapezoidal(rampaIzquierda,{sur:{x:69.1,z:inicioComunRampaEscalera,y:bajo},
    norte:{x:65.35,z:norte,y:nivelLlegadaEscaleras},anchoSur:2.9,anchoNorte:2.9});
  // A su derecha se conserva la llegada con escalones junto al jardín en L.
  const extensionPasadizo=1.5;
  const separacionEscaleraRampa=.5;
  const finPasadizo= inicioComunRampaEscalera-1.6;
  const bordeJardinNorte=71.15+jardinDerecho.position.x;
  const bordeJardinSur=THREE.MathUtils.lerp(71.15,74.1,(finPasadizo-norte)/(24-norte))+jardinDerecho.position.x;
  const bordePasadizoNorte=66.8;
  const bordePasadizoSur=71.912+extensionPasadizo/2+separacionEscaleraRampa-(3.748+extensionPasadizo)/2;
  // Cierra el hueco bajo la unión del ingreso y el pavimento lateral.
  descansoMacizo(acceso,{x:(71.15+74.5)/2,z:(-18.4+norte)/2,
    ancho:74.5-71.15,fondo:norte+18.4,altura:nivelLlegadaEscaleras});
  // Losa continua hasta debajo del borde del jardín, sin canal ni bordillo intermedio.
  const encajeBajoJardin=.18;
  pisoLateralElevado(acceso,[[bordePasadizoNorte,norte],
    [bordeJardinNorte+encajeBajoJardin,norte],
    [bordeJardinSur+encajeBajoJardin,finPasadizo],[bordePasadizoSur,finPasadizo]],
    z=>THREE.MathUtils.lerp(nivelLlegadaEscaleras,.86,
      THREE.MathUtils.clamp((z-norte)/(finPasadizo-norte),0,1)));
  // El último peldaño debe ser paralelo al borde del pasadizo, sin huecos diagonales.
  recorrido(acceso,{x:71.991+extensionPasadizo/2+separacionEscaleraRampa,z:inicioComunRampaEscalera,y:bajo},
    {x:71.991+extensionPasadizo/2+separacionEscaleraRampa,z:finPasadizo,y:.86},3.6+extensionPasadizo,'escalera',
    {peldaños:4,barandas:3,nombre:'Escalera exterior junto al jardín en L'});
  // La pareja frontal sigue subiendo hacia las torres (-X).
  recorrido(acceso,{x:57.7,z:28.9,y:bajo},{x:55.3,z:28.9,y:alto},7.8,'escalera',
    {peldaños:6,tramos:2,barandas:3,nombre:'Escalera frontal de la isla trapezoidal'});
  descansoMacizo(acceso,{x:(35.5+44)/2,z:-34.25,ancho:44-35.5,fondo:1.5,altura:alto});
  recorrido(acceso,{x:42.6,z:-29.5,y:bajo},{x:42.6,z:-33.5,y:alto},2.8,'escalera',
    {barandas:3,nombre:'Escalera posterior junto a Torre A'});
  descansoMacizo(acceso,{x:52.9,z:-29.5,ancho:23.4,fondo:1.4,altura:bajo});
  // Rellena el rincón interior del muro en L sin reponer la franja exterior retirada.
  const frentePlataformaIngreso=CONFIG.ingreso.z-3.99;
  const limitePosteriorGrava=-25.2+.12;
  const interiorMuroL=74.2+(CONFIG.ingreso.desplazamientoMurosX??0)+2.4+.12;
  const piedra=[[74.5,frentePlataformaIngreso],[interiorMuroL,frentePlataformaIngreso],
    [interiorMuroL,limitePosteriorGrava],[82.5,limitePosteriorGrava],[82.5,-14.1],[72.5,-14.1],
    [72.5,-18.4],[74.5,-18.4]];
  pisoLateralElevado(acceso,piedra,()=>nivelLlegadaEscaleras);
  // Cerramiento negro desde el lateral de la caseta hasta el jardín derecho.
  const arranqueMuroNegro=ingresoX+4.4;
  const trazadoMuroNegro=[[arranqueMuroNegro,CONFIG.ingreso.z+2.42],
    [arranqueMuroNegro,-16.7],[arranqueMuroNegro+1.35,-15.45],
    [arranqueMuroNegro+1.35,norte]];
  const muroNegro=new THREE.Group();muroNegro.name='Muro negro entre ingreso y jardín';acceso.add(muroNegro);
  for(let i=1;i<trazadoMuroNegro.length;i++){
    const [ax,az]=trazadoMuroNegro[i-1],[bx,bz]=trazadoMuroNegro[i];
    const largo=Math.hypot(bx-ax,bz-az),rotacion=-Math.atan2(bz-az,bx-ax);
    bloque(muroNegro,{x:(ax+bx)/2,z:(az+bz)/2,y:(.12+1.65)/2,
      ancho:largo+.04,alto:1.65-.12,fondo:.38,rotacion,color:'#33363b'});
    bloque(muroNegro,{x:(ax+bx)/2,z:(az+bz)/2,y:1.7,
      ancho:largo+.04,alto:.1,fondo:.38,rotacion,color:'#33363b'});
  }
  // Grava pequeña en el recinto lateral, sin cubrir la plataforma del edificio.
  const puntosGrava=[];
  let semillaGrava=73;
  const azarGrava=()=>{semillaGrava=(Math.imul(semillaGrava,1664525)+1013904223)>>>0;return semillaGrava/4294967296;};
  for(let z=limitePosteriorGrava+.1;z<-14.2;z+=.085){
    for(let x=74.2;x<82.29;x+=.085){
      const px=x+(azarGrava()-.5)*.025,pz=z+(azarGrava()-.5)*.025;
      if(pz< -23.2&&px<interiorMuroL+.08)continue;
      if(pz< -18.4&&px<74.65)continue;
      // La caja termina en x local 7.8 tras ampliarla; cubre su franja lateral de piso.
      if(px<ingresoX+7.9&&pz>CONFIG.ingreso.z-3.99&&pz<CONFIG.ingreso.z+2.42)continue;
      const limiteMuro=pz< -16.7?arranqueMuroNegro:
        pz< -15.45?arranqueMuroNegro+1.35*(pz+16.7)/1.25:arranqueMuroNegro+1.35;
      if(pz> -18.08&&px<limiteMuro+.28)continue;
      puntosGrava.push([px,pz]);
    }
  }
  const grava=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),
    new THREE.MeshStandardMaterial({roughness:1}),puntosGrava.length);
  grava.name='Piedritas pequeñas del recinto lateral del ingreso';
  const piezaGrava=new THREE.Object3D(),colorGrava=new THREE.Color();
  puntosGrava.forEach(([x,z],i)=>{
    const radio=.065+azarGrava()*.025,altoPiedra=.035+azarGrava()*.025;
    piezaGrava.position.set(x,nivelLlegadaEscaleras+altoPiedra*.7,z);
    piezaGrava.scale.set(radio,altoPiedra,radio*(.75+azarGrava()*.5));
    piezaGrava.rotation.set(azarGrava()*.4,azarGrava()*Math.PI,azarGrava()*.4);
    piezaGrava.updateMatrix();grava.setMatrixAt(i,piezaGrava.matrix);
    const grisClaro=azarGrava()<.12;
    colorGrava.setHSL(0,0,grisClaro?.32+azarGrava()*.08:.12+azarGrava()*.1);
    grava.setColorAt(i,colorGrava);
  });
  grava.receiveShadow=true;acceso.add(grava);
  // Se repone el primer cerramiento lateral, el más cercano al Ingreso.
  // Mismas cotas absolutas del perímetro: blanco hasta 3.026 y cima 5.576.
  const escalaMuroIngreso=1.7;
  const desplazamientoMurosIngreso=(CONFIG.ingreso.desplazamientoMurosX??0)+2.4;
  const limiteCercoDerecho=CONFIG.anchoCampus/2+CONFIG.extensionDerecha;
  const muroLateralIngreso=trazarMuroEnL(acceso,{
    inicio:[74.2,-23.2],
    esquina:[74.2,-25.2],
    inicioLargo:[76.8,-25.2],
    final:[limiteCercoDerecho-desplazamientoMurosIngreso,-25.2],
    elevacion:0
  });
  muroLateralIngreso.name='Muro en L recortado del lateral derecho del ingreso';
  muroLateralIngreso.scale.y=escalaMuroIngreso;
  const extensionMuro=new THREE.Group();
  extensionMuro.name='Extensión horizontal continua del muro';
  extensionMuro.position.y=0;
  extensionMuro.position.x=5;
  extensionMuro.scale.y=escalaMuroIngreso;
  acceso.add(extensionMuro);
  trazarMuro(extensionMuro,71.8,-25.2,74.2,-25.2);
  const rellenoMuro=trazarMuro(acceso,74.2,-25.2,76.8,-25.2);
  rellenoMuro.position.y=0;
  rellenoMuro.scale.y=escalaMuroIngreso;
  rellenoMuro.name='Relleno del hueco entre los tramos del muro';
  // Los cerramientos anexos acompañan el desplazamiento del edificio.
  for(const muro of [muroLateralIngreso,extensionMuro,rellenoMuro]){
    muro.position.x+=desplazamientoMurosIngreso;
  }
  crearIngreso(acceso,{x:ingresoX,z:CONFIG.ingreso.z,baseY:nivelLlegadaEscaleras,
    escalaAncho:CONFIG.ingreso.escalaAncho,bordeIzquierdo:CONFIG.ingreso.bordeIzquierdo,
    escalaFondo:CONFIG.ingreso.escalaFondo,bordeFrontal:CONFIG.ingreso.bordeFrontal,
    fondoLateral:CONFIG.ingreso.fondoLateral});
}
function trazarMuro(grupo,x1,z1,x2,z2){
  const dx=x2-x1,dz=z2-z1;
  const largo=Math.hypot(dx,dz),angulo=-Math.atan2(dz,dx);
  if(largo<=0) return;
  const tramo=new THREE.Group();
  tramo.name='Cerco delgado con zócalo blanco y ranuras verticales';
  tramo.position.set((x1+x2)/2,0,(z1+z2)/2);
  tramo.rotation.y=angulo;
  grupo.add(tramo);
  const espesor=.24,base=.08,zocalo=1.7,altoPanel=1.5;
  bloque(tramo,{y:base+zocalo/2,ancho:largo,alto:zocalo,fondo:espesor,color:CONFIG.acabados.muro})
    .name='Zócalo del cerco';
  const panel=new THREE.Shape();
  panel.moveTo(-largo/2,base+zocalo);
  panel.lineTo(largo/2,base+zocalo);
  panel.lineTo(largo/2,base+zocalo+altoPanel);
  panel.lineTo(-largo/2,base+zocalo+altoPanel);
  panel.closePath();
  const cantidad=Math.max(1,Math.floor(largo/.7)),paso=largo/cantidad;
  for(let i=0;i<cantidad;i++){
    const centro=-largo/2+(i+.5)*paso;
    const ancho=Math.min(.12,paso*.2),alto=[1.12,.84,1.02][i%3];
    const abajo=base+zocalo+(altoPanel-alto)/2;
    const hueco=new THREE.Path();
    hueco.moveTo(centro-ancho/2,abajo);
    hueco.lineTo(centro-ancho/2,abajo+alto);
    hueco.lineTo(centro+ancho/2,abajo+alto);
    hueco.lineTo(centro+ancho/2,abajo);
    hueco.closePath();
    panel.holes.push(hueco);
  }
  const geometria=new THREE.ExtrudeGeometry(panel,{depth:espesor,bevelEnabled:false});
  geometria.translate(0,0,-espesor/2);
  const celosia=new THREE.Mesh(geometria,new THREE.MeshStandardMaterial({color:CONFIG.acabados.celosia,roughness:.94}));
  celosia.name='Panel de cemento del cerco';
  celosia.castShadow=true;celosia.receiveShadow=true;
  tramo.add(celosia);
  return tramo;
}

// Cerco en L indicado junto al ingreso: parte del borde de Torre A,
// avanza hacia el acceso y gira hasta tocar la fachada del conjunto.
// Cada tramo usa trazarMuro para conservar el mismo zócalo y las ranuras
// verticales del cerramiento perimetral existente.
function trazarMuroEnL(grupo,{inicio,esquina,inicioLargo=esquina,final,elevacion=0}){
  const muroL=new THREE.Group();
  muroL.name='Muro perimetral en L junto al ingreso';
  muroL.position.y=elevacion;
  grupo.add(muroL);
  const horizontal=trazarMuro(muroL,inicio[0],inicio[1],esquina[0],esquina[1]);
  const vertical=trazarMuro(muroL,inicioLargo[0],inicioLargo[1],final[0],final[1]);
  if(horizontal)horizontal.name='Tramo horizontal del muro en L';
  if(vertical)vertical.name='Tramo perpendicular del muro en L';
  return muroL;
}

function crearPerimetro(grupo){
  const x=CONFIG.anchoCampus/2,z=CONFIG.fondoCampus/2;
  const extremoDerecho=x+CONFIG.extensionDerecha;
  // El ACCESO PRINCIPAL está a la DERECHA de las torres, según corrección del croquis.
  const puerta=CONFIG.ingreso;
  const izquierda=puerta.x-puerta.ancho/2;
  const derecha=puerta.x+puerta.ancho/2;
  const escalaAlturaCerco=1.7;
  const trazarMuroPerimetral=(...coordenadas)=>{
    const muro=trazarMuro(grupo,...coordenadas);
    if(muro)muro.scale.y=escalaAlturaCerco;
    return muro;
  };
  // Frente alternado: cada pared de torre sustituye al cerco en su huella.
  let inicio=-x;
  for(const torre of Object.values(CONFIG.torres).sort((a,b)=>a.x-b.x)){
    trazarMuroPerimetral(inicio,z,torre.x-torre.ancho/2,z);
    inicio=torre.x+torre.ancho/2;
  }
  const ingresoX=puerta.x+puerta.desplazamientoX;
  trazarMuroPerimetral(inicio,z,izquierda,z);
  // Tramo frontal seleccionado: queda separado del tramo anterior junto al Ingreso.
  const separacionTramoIngreso=.8;
  const tramoFrontalIngreso=trazarMuroPerimetral(derecha+separacionTramoIngreso,z,
    extremoDerecho,z);
  if(tramoFrontalIngreso)tramoFrontalIngreso.name='Tramo separado frente al Ingreso';
  // Muro frontal del Ingreso separado físicamente de las esquinas laterales.
  const separacionMuroIngreso=.8;
  const limiteTopico=CONFIG.torres.A.x+CONFIG.torres.A.ancho/2;
  const muroFrontalIngreso=trazarMuroPerimetral(
    -x+separacionMuroIngreso,-z,
    limiteTopico,-z);
  if(muroFrontalIngreso)muroFrontalIngreso.name='Muro frontal del Ingreso separado';
  trazarMuroPerimetral(-x,-z,-x,z);
  // El lateral derecho se acorta solo por arriba, conservando fijo el tramo hacia Acceso.
  const recorteSuperiorLateral=14;
  const muroLateralDerecho=trazarMuroPerimetral(extremoDerecho,-z+recorteSuperiorLateral,
    extremoDerecho,z);
  if(muroLateralDerecho)muroLateralDerecho.name='Muro lateral derecho recortado arriba';
  // Hueco peatonal pequeño, sin hoja ni gran pórtico; jambas fuera del paso libre.
  for(const borde of [izquierda-.15,derecha+.15]){
    bloque(grupo,{x:borde,y:1.65,z,ancho:.3,alto:3.3,fondo:.24,color:'#828991'});
  }
  etiqueta(grupo,'Acceso',puerta.x,3.6,z,'zone');
}

// Paredes frontales delgadas unidas al cerco y a los extremos de cada torre.
// Los pórticos posteriores se conservan.
function unirTorresAlMuro(grupo){
  const borde=CONFIG.fondoCampus/2;
  // Acabado independiente para los bloques frontales; el cerco conserva su color.
  const materialFrontal=new THREE.MeshStandardMaterial({color:'#343a40',roughness:.9});
  for(const torre of Object.values(CONFIG.torres)){
    for(const lado of [-1,1]){
      const extremo=torre.z+lado*torre.fondo/2;
      const muro=lado*borde;
      const profundidad=Math.abs(muro-extremo);
      if(profundidad<.2) continue;
      const centroZ=(extremo+muro)/2;
      if(lado===1){
        const base=.08,alto=CONFIG.baseY+CONFIG.altoPiso-base,espesor=.24;
        const pared=bloque(grupo,{x:torre.x,y:base+alto/2,z:muro,
          ancho:torre.ancho,alto,fondo:espesor,material:materialFrontal});
        pared.name=`Pared frontal delgada - Torre ${torre.id}`;
        for(const n of [-1,1]){
          const union=bloque(grupo,{x:torre.x+n*(torre.ancho/2-espesor/2),
            y:base+alto/2,z:(extremo+muro-espesor/2)/2,
            ancho:espesor,alto,fondo:profundidad-espesor/2,material:materialFrontal});
          union.name=`Unión de pared al cerco - Torre ${torre.id}`;
        }
        continue;
      }
      // Dos guías laterales sólidas sostienen la viga sin cerrar la entrada.
      // En la conexión posterior de la Torre B se retiran las columnas marcadas;
      // la viga queda separada del muro y se conserva como elemento independiente.
      if(torre.id==='B'){
        bloque(grupo,{x:torre.x,y:CONFIG.altoPiso+CONFIG.baseY-.15,z:centroZ,
          ancho:torre.ancho,alto:.33,fondo:profundidad+.35,color:'#bfcad2'});
        continue;
      }
      // Se retiran también los soportes y la viga horizontal oscura junto a la cafetería.
      if(torre.id==='C') continue;
      for(const n of [-1,1]){
        const x=torre.x+n*(torre.ancho/2-.65);
        bloque(grupo,{x,y:CONFIG.baseY+1.98,z:centroZ,ancho:.58,alto:CONFIG.altoPiso-.3,
          fondo:profundidad+.28,color:CONFIG.acabados.columna});
      }
      bloque(grupo,{x:torre.x,y:CONFIG.altoPiso+CONFIG.baseY-.15,z:centroZ,
        ancho:torre.ancho,alto:.33,fondo:profundidad+.35,color:'#bfcad2'});
    }
  }
}

// Conserva únicamente el pórtico C–B delantero, no marcado para retirar.
// Los pisos macizos siguen conectando todas las torres.
function unirTorresEntreSi(grupo){
  for(const [idIzq,idDer] of [['C','B'],['B','A']]){
    const a=CONFIG.torres[idIzq];
    const b=CONFIG.torres[idDer];
    const finA=a.x+a.ancho/2;
    const inicioB=b.x-b.ancho/2;
    const separacion=inicioB-finA;
    if(separacion<=0) continue;
    const centro=(finA+inicioB)/2;
    for(const z of [-22,22]){
      // Retira los pórticos delgados señalados en azul junto con sus vigas.
      if(idIzq==='B'||z===-22) continue;
      // El tramo horizontal junto a la cafetería también se elimina.
      if(idIzq==='C'&&z===22) continue;
      // El corredor macizo ya aporta el piso continuo a la cota de las torres.
      // La viga superior conserva la conexión abierta entre ambas torres.
      bloque(grupo,{x:centro,y:CONFIG.altoPiso+CONFIG.baseY-.07,z,
        ancho:separacion+.9,alto:.6,fondo:.85,color:'#aab7c2'});
      // Las columnas marcadas del pórtico C–B se eliminan; la viga permanece.
      if(!(idIzq==='C'&&z===22)){
        for(const x of [finA+.45,inicioB-.45]){
          columna(grupo,x,z,CONFIG.altoPiso,CONFIG.baseY);
        }
      }
    }
  }
}

export function crearExteriores(escena){
  const suelo=new THREE.Group();suelo.name='Terreno y plazas';escena.add(suelo);
  const baseTorres=.08,nivelTorres=CONFIG.baseY+.01;
  const pisoMacizo=(nombre,{x,z,ancho,fondo,color})=>{
    const piso=bloque(suelo,{x,z,ancho,fondo,color,
      y:(baseTorres+nivelTorres)/2,alto:nivelTorres-baseTorres});
    piso.name=nombre;
    return piso;
  };
  placa(suelo,{x:0,y:-.22,z:0,ancho:CONFIG.anchoCampus+90,fondo:CONFIG.fondoCampus+85,color:'#314254'});
  bloque(suelo,{x:CONFIG.extensionDerecha/2,y:-.13,z:0,ancho:CONFIG.anchoCampus+CONFIG.extensionDerecha,alto:.23,fondo:CONFIG.fondoCampus,color:pavimento,sombra:false});
  // Amplia plaza peatonal que conecta las tres torres.
  placa(suelo,{x:0,y:.08,z:15,ancho:90,fondo:42,color:pavimento});
  placa(suelo,{x:0,y:.08,z:-24,ancho:96,fondo:17,color:pavimento});
  placa(suelo,{x:0,y:.08,z:33,ancho:77,fondo:9,color:pavimento});
  // Caminos exteriores detrás de las torres.
  placa(suelo,{x:-44,y:.1,z:0,ancho:12,fondo:65,color:pavimento});
  placa(suelo,{x:47.8+CONFIG.extensionDerecha/2,y:.1,z:0,ancho:20+CONFIG.extensionDerecha,fondo:77.5,color:pavimento});
  // Corredores macizos: misma base y superficie que las torres, hasta el cerco.
  for(const [izquierda,derecha] of [['C','B'],['B','A']]){
    const a=CONFIG.torres[izquierda],b=CONFIG.torres[derecha];
    const inicio=a.x+a.ancho/2,fin=b.x-b.ancho/2;
    pisoMacizo(`Corredor elevado entre torres ${izquierda} y ${derecha}`,
      {x:(inicio+fin)/2,z:0,ancho:fin-inicio,fondo:CONFIG.fondoCampus,color:pavimento});
  }

  // Piso lateral marcado junto a cocina y cafetería, unido a la base de Torre C.
  // Empieza después del jardín pequeño para no cubrir sus áreas verdes.
  const bordeC=CONFIG.torres.C.x-CONFIG.torres.C.ancho/2;
  pisoMacizo('Piso lateral elevado junto a cocina',
    {x:(-50+bordeC)/2,z:10,ancho:bordeC+50,fondo:11,color:pavimento});
  pisoMacizo('Terraza comedor elevada junto a Torre C',
    {x:(-52+bordeC)/2,z:24,ancho:bordeC+52,fondo:17,color:pavimento});
  const elevacionMesas=nivelTorres-.19;
  for(const [x,z] of [[-48,20],[-42,20],[-48,27],[-42,27]]){
    bloque(suelo,{x,y:.71+elevacionMesas,z,ancho:1.5,alto:.1,fondo:1.5,color:'#9b7d63'});
    bloque(suelo,{x,y:.46+elevacionMesas,z,ancho:.12,alto:.43,fondo:.12,color:'#6e7d85'});
  }

  const extras=new THREE.Group();extras.name='Áreas verdes, escaleras y rampas';escena.add(extras);
  jardin(extras,-49,-17,12,27,4);
  jardin(extras,-46,0,9,9,1);
  // Conserva el relieve de las jardineras sobre los corredores ahora elevados.
  jardin(extras,-13,-30,7,6,0,nivelTorres+.285);
  jardin(extras,13,-30,7,6,0,nivelTorres+.285);
  // Jardín ampliado 18% más hacia la izquierda, conservando el lado este unido a la sala.
  jardinAbierto(extras,{x:18.490074,z:11.81,ancho:4.119852,fondo:19.42,altura:nivelTorres+.285,abierto:'este'});
  crearAccesoLateral(extras);
  rampa(extras,-49,-8,5.3,17,.055);
  escalera(extras,-48,-30,4);
  // Pasarelas y pórticos que unen las torres entre sí y con el cerco.
  unirTorresEntreSi(extras);
  const perimetro=new THREE.Group();perimetro.name='Muros perimetrales';escena.add(perimetro);
  crearPerimetro(perimetro);
  unirTorresAlMuro(perimetro);
  aplicarPiedraPisos([suelo,extras],pavimento);
  aplicarCementoMuros([extras,perimetro]);
  aplicarCesped(extras);
  aplicarRayasRampas(extras);
  return {suelo,extras,perimetro};
}
