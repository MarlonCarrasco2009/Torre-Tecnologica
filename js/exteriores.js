import * as THREE from 'three';
import { CONFIG } from './config.js';
import { bloque,placa,columna,etiqueta } from './geometria.js';

const pavimento=CONFIG.acabados.piso;
const pavimentoRampa=CONFIG.acabados.rampa;
const materialBordeJardin=new THREE.MeshStandardMaterial({color:'#292c30',roughness:.92});
const materialTapaJardin=new THREE.MeshStandardMaterial({color:'#45494f',roughness:.86});

// Muro bajo plomo, con coronación continua como en la referencia.
// Todo el espesor queda dentro del jardín para mantener libres los recorridos.
function bordeJardin(grupo,puntos,nivelCesped,espesor=.5,colorBorde=null){
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
    const desplazamiento=anterior.clone().add(actual)
      .multiplyScalar(espesor/(1+anterior.dot(actual)));
    return new THREE.Vector2(x+desplazamiento.x,-z-desplazamiento.y);
  });
  const forma=new THREE.Shape(puntos.map(([x,z])=>new THREE.Vector2(x,-z)));
  forma.holes.push(new THREE.Path(interior));
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
  return interior.map(p=>[p.x,-p.y]);
}

function jardin(grupo,x,z,ancho,fondo,arboles=0,altura=.415){
  const base=.12;
  bloque(grupo,{x,y:(base+altura-.055)/2,z,ancho:ancho-.1,alto:altura-.055-base,
    fondo:fondo-.1,color:'#9aa6ad'});
  placa(grupo,{x,y:altura-.03,z,ancho:ancho-.28,fondo:fondo-.28,color:'#3a9676'});
  bordeJardin(grupo,[[x-ancho/2,z-fondo/2],[x+ancho/2,z-fondo/2],
    [x+ancho/2,z+fondo/2],[x-ancho/2,z+fondo/2]],altura);
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
  const base=.12,coronacion=altura+.65,altoTapa=.1,espesor=.5;
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
  color:'#4e5961',metalness:.86,roughness:.28
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
  for(const lado of [-1,1]){
    const punto=(t,extraY=0)=>new THREE.Vector3(
      THREE.MathUtils.lerp(sur.x+lado*(anchoSur/2-.22),norte.x+lado*(anchoNorte/2-.22),t),
      THREE.MathUtils.lerp(sur.y,norte.y,t)+.08+extraY,
      THREE.MathUtils.lerp(sur.z,norte.z,t)
    );
    for(const t of [.12,.5,.88]){
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

export function jardinContorno(grupo,puntos,altura=.38,espesorBorde=.5,colorBorde=null){
  // El relleno termina en la cara interior del muro; no comparte sus caras externas.
  const interior=bordeJardin(grupo,puntos,altura,espesorBorde,colorBorde);
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
function rampaTrapezoidal(grupo,{sur,norte,anchoSur,anchoNorte}){
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
  const rampa=new THREE.Mesh(geometria,new THREE.MeshStandardMaterial({color:pavimentoRampa,roughness:.84}));
  rampa.name='Rampa trapezoidal de concreto';
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
  barandasRampaTrapezoidal(grupo,{sur,norte,anchoSur,anchoNorte});
}

function descansoMacizo(grupo,{x,z,ancho,fondo,altura}){
  const base=.12;
  const descanso=bloque(grupo,{x,z,y:(base+altura)/2,ancho,fondo,
    alto:altura-base,color:pavimento});
  descanso.name='Descanso de concreto con base maciza';
  return descanso;
}

// Piso con base maciza y cota superior continua con la rampa y su escalera.
function pisoLateralElevado(grupo,puntos,alturaEnZ){
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
  const piso=new THREE.Mesh(geometria,new THREE.MeshStandardMaterial({color:pavimento,roughness:.84}));
  piso.name='Pasillo lateral elevado con espesor hasta el suelo';
  piso.castShadow=true; piso.receiveShadow=true;
  grupo.add(piso);
}


// Pórtico observado desde el patio (+Z) y desde la calle (-Z).
function crearIngresoTerraza(grupo,{x,z,baseY,escalaX=1,conectarCerco=true}){
  const g=new THREE.Group();g.name='Ingreso cubierto de la terraza';g.position.set(x,baseY,z);grupo.add(g);
  g.scale.x=escalaX;
  const acero=new THREE.MeshStandardMaterial({color:'#b0b8bb',metalness:.72,roughness:.36});
  const blanco=new THREE.MeshStandardMaterial({color:'#dedfda',metalness:.25,roughness:.5});
  const oscuro=new THREE.MeshStandardMaterial({color:'#303a42',roughness:.62});
  const caja=(nombre,px,py,pz,w,h,d,material)=>{
    const m=bloque(g,{x:px,y:py,z:pz,ancho:w,alto:h,fondo:d,
      ...(typeof material==='string'?{color:material}:{material})});m.name=nombre;return m;
  };
  const tubo=(a,b,r=.028)=>{
    const inicio=new THREE.Vector3(...a),fin=new THREE.Vector3(...b),direccion=fin.clone().sub(inicio);
    const pieza=new THREE.Mesh(new THREE.CylinderGeometry(r,r,direccion.length(),10),acero);
    pieza.position.copy(inicio).add(fin).multiplyScalar(.5);
    pieza.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direccion.normalize());
    pieza.name='Acero tubular del ingreso';pieza.castShadow=true;g.add(pieza);
  };
  // Baldosas de piedra gris: textura determinista, juntas y vetas discretas.
  const lienzo=document.createElement('canvas');lienzo.width=lienzo.height=512;
  const ctx=lienzo.getContext('2d');let semilla=17;
  const azar=()=>{semilla=(semilla*1664525+1013904223)>>>0;return semilla/4294967296;};
  ctx.fillStyle='#777b7d';ctx.fillRect(0,0,512,512);
  for(let i=0;i<9000;i++){
    const px=azar()*512,py=azar()*512,v=90+Math.floor(azar()*85);
    ctx.strokeStyle=`rgba(${v},${v},${v},.32)`;ctx.lineWidth=.5+azar()*1.5;
    ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+4+azar()*20,py-2-azar()*8);ctx.stroke();
  }
  ctx.strokeStyle='#565c60';ctx.lineWidth=3;ctx.strokeRect(0,0,512,512);
  const piedra=new THREE.CanvasTexture(lienzo);piedra.wrapS=piedra.wrapT=THREE.RepeatWrapping;piedra.repeat.set(10,7);piedra.colorSpace=THREE.SRGBColorSpace;
  const pav=new THREE.MeshStandardMaterial({map:piedra,bumpMap:piedra,bumpScale:.035,roughness:.96,
    polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  caja('Base de piedra del ingreso',0,-.055,.45,14.2,.1,9.5,'#777b7d');
  const piso=new THREE.Mesh(new THREE.PlaneGeometry(14.2,9.5),pav);piso.rotation.x=-Math.PI/2;piso.position.set(0,0,.45);piso.receiveShadow=true;g.add(piso);
  // Cubierta ancha, cielo raso oscuro y paneles con juntas visibles.
  caja('Marquesina revestida',0,5.35,0,13.4,.6,6.4,'#c7ccce');
  caja('Cielo raso gris',0,5.025,0,13.1,.045,6.15,'#505a62');
  for(let px=-6;px<=6;px+=1.5){
    for(const pz of [-3.205,3.205])caja('Junta de fachada',px,5.35,pz,.018,.57,.012,'#929b9f');
    caja('Junta de cielo raso',px,4.995,0,.015,.012,6.1,'#444d55');
  }
  for(const pz of [-1.5,0,1.5])caja('Junta transversal del techo',0,4.995,pz,13.1,.012,.015,'#444d55');
  for(const px of [-6.02,5.95]){
    caja('Columna revestida de aluminio',px,2.5,-1.9,.46,5,.65,'#bcc3c6');
    for(let py=.8;py<5;py+=.85)caja('Junta de columna',px,py,-1.56,.46,.018,.012,'#879196');
  }
  // Seis hojas blancas con barrotes finos y zócalos metálicos.
  const puertaZ=-2.3,izquierda=-5.7,anchoHoja=1.65;
  caja('Dintel blanco del portón',-.75,3.67,puertaZ,10.15,.68,.3,blanco);
  for(let hoja=0;hoja<6;hoja++){
    const centro=izquierda+anchoHoja*(hoja+.5);
    for(const dx of [-.8,.8])caja('Marco vertical de puerta',centro+dx,1.67,puertaZ,.085,3.25,.14,blanco);
    for(const py of [.17,3.27])caja('Marco horizontal de puerta',centro,py,puertaZ,1.6,.12,.14,blanco);
    caja('Zócalo blanco de puerta',centro,.34,puertaZ,1.52,.27,.08,blanco);
    for(let j=1;j<10;j++)caja('Barrote vertical blanco',centro-.8+j*.16,1.84,puertaZ,.026,2.78,.04,blanco);
    for(const py of [.8,2.7])caja('Travesaño de reja',centro,py,puertaZ,1.55,.035,.045,blanco);
    tubo([centro+.6,1.3,puertaZ+.12],[centro+.6,1.63,puertaZ+.12]);
  }
  // Franja abierta por encima del dintel, como en las tomas interiores.
  for(const px of [-2.5,1.1,4.2])caja('Montante superior',px,4.53,puertaZ,.075,.98,.12,oscuro);
  // Torniquetes de cuerpo rectangular, lector y mecanismo trípode.
  for(let i=0;i<7;i++){
    const px=-4.1+i*1.34,pz=.45;
    caja('Pedestal de torniquete de acero',px,.69,pz,.34,1.29,.62,acero);
    caja('Tapa oscura del torniquete',px,1.36,pz,.39,.1,.68,oscuro);
    caja('Lector de tarjeta',px,1.422,pz+.13,.18,.026,.22,'#162733');
    caja('Indicador verde del lector',px,1.44,pz+.2,.075,.008,.025,'#54cf92');
    const eje=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,.16,12),acero);eje.rotation.z=Math.PI/2;eje.position.set(px-.23,1.01,pz);g.add(eje);
    for(let j=0;j<3;j++){
      const ang=j*Math.PI*2/3;
      tubo([px-.25,1.01,pz],[px-.73,1.01+Math.sin(ang)*.36,pz+Math.cos(ang)*.36],.033);
    }
  }
  // Paso accesible y baranda tubular a la izquierda.
  for(const px of [-5.65,-4.85]){
    for(const pz of [.3,1.4])tubo([px,.05,pz],[px,1.12,pz],.04);
    tubo([px,1.12,.3],[px,1.12,1.4],.04);
  }
  for(let pz=1.5;pz<=4.5;pz+=1)tubo([-6.65,.05,pz],[-6.65,1.14,pz],.04);
  for(const py of [.35,.7,1.14])tubo([-6.65,py,1.5],[-6.65,py,4.5],.035);
  // Caseta lateral: ventana exterior, puerta interior y panel azul de control.
  caja('Caseta blanca de vigilancia',5.32,1.98,-1.15,2.1,3.96,2.6,'#d4d7d5');
  caja('Marco de ventana exterior',5.32,1.85,-2.47,1.35,1.35,.09,blanco);
  caja('Cristal oscuro de vigilancia',5.32,1.85,-2.53,1.17,1.16,.025,'#304b59');
  caja('Alféizar de ventana',5.32,1.15,-2.58,1.48,.1,.28,blanco);
  caja('Puerta de caseta',5.32,1.35,.17,1.05,2.6,.06,'#79858a');
  caja('Panel azul interior',4.3,1.6,1.1,.12,2.9,1.4,'#126cad');
  caja('Módulo lateral de control',5.42,.64,1.85,1.25,1.2,1.15,oscuro);
  caja('Mostrador de acero',5.42,1.29,1.85,1.35,.1,1.25,acero);
  // Rótulo exterior del campus, legible desde el lado de la calle.
  const cartel=document.createElement('canvas');cartel.width=1024;cartel.height=160;
  const c=cartel.getContext('2d');c.fillStyle='#d6d9d7';c.fillRect(0,0,1024,160);
  c.fillStyle='#48535c';c.textAlign='center';c.font='bold 54px Arial';c.fillText('SENATI',512,68);
  c.font='27px Arial';c.fillText('CENTRO TECNOLÓGICO · CAMPUS INDEPENDENCIA',512,120);
  const rotulo=new THREE.CanvasTexture(cartel);rotulo.colorSpace=THREE.SRGBColorSpace;
  const letrero=new THREE.Mesh(new THREE.PlaneGeometry(9.6,.62),new THREE.MeshStandardMaterial({map:rotulo,roughness:.75}));letrero.position.set(-.75,3.67,puertaZ-.16);letrero.rotation.y=Math.PI;g.add(letrero);
  // Canaleta de drenaje transversal en la llegada interior.
  caja('Canaleta de drenaje',0,.055,3.8,12.7,.025,.18,'#343b3f');
  for(let px=-6.3;px<6.35;px+=.13)caja('Rejilla de drenaje',px,.074,3.8,.035,.018,.18,acero);
  // Alas laterales: zócalo blanco y baranda oscura unidos al cerco existente.
  // Las uniones quedan a los lados del portón; el frente conserva el paso libre.
  const cercoDerecho=CONFIG.anchoCampus/2+CONFIG.extensionDerecha-x;
  const cercoFondo=-CONFIG.fondoCampus/2-z;
  const ala=(desde,hasta)=>{
    const a=new THREE.Vector3(desde[0],0,desde[1]),b=new THREE.Vector3(hasta[0],0,hasta[1]);
    const largo=a.distanceTo(b),centro=a.clone().add(b).multiplyScalar(.5);
    const tramo=new THREE.Group();tramo.position.copy(centro);
    tramo.rotation.y=-Math.atan2(b.z-a.z,b.x-a.x);g.add(tramo);
    bloque(tramo,{y:.8,ancho:largo+.12,alto:1.6,fondo:.3,color:CONFIG.acabados.muro}).name='Unión blanca del ingreso al cerco';
    bloque(tramo,{y:1.63,ancho:largo+.16,alto:.08,fondo:.38,color:'#c4cbce'});
    for(const py of [1.78,2.72])bloque(tramo,{y:py,ancho:largo+.1,alto:.075,fondo:.075,material:oscuro});
    const divisiones=Math.ceil(largo/1.5);
    for(let i=0;i<=divisiones;i++)bloque(tramo,{x:-largo/2+i*largo/divisiones,y:2.18,ancho:.075,alto:1.08,fondo:.075,material:oscuro});
  };
  if(conectarCerco){
    ala([-6.25,-2.3],[-14,-2.3]);
    ala([-14,-2.3],[-14,cercoFondo]);
    ala([6.35,-2.3],[cercoDerecho,-2.3]);
  }
  etiqueta(g,'Ingreso peatonal',0,6.15,-.3,'zone');
}

function crearAccesoLateral(grupo){
  const acceso=new THREE.Group();acceso.name='Patio de Torre A · croquis 10 noviembre';grupo.add(acceso);
  // Coordenadas del dibujo: fachada, dos islas centrales y cerco derecho.
  const alto=CONFIG.baseY+.01,bajo=.14,norte=-14,sur=25;
  const fachada=CONFIG.torres.A.x+13*CONFIG.torres.A.ancho/32;
  const jardinCroquis=(nombre,puntos,nivel=alto+.07)=>{
    const g=new THREE.Group();g.name=nombre;g.userData.contorno=puntos;acceso.add(g);
    jardinContorno(g,puntos,nivel,.38,'#33363b');return g;
  };
  jardinCroquis('Jardín rectangular junto a conferencias',[[43.7,norte],[52.1,norte],[52.1,sur],[43.7,sur]]);
  jardinCroquis('Jardín central trapezoidal',[[55.3,norte],[63.9,norte],[68,sur],[55.3,sur]]);
  jardinCroquis('Jardín derecho con entrante en L',[[71.15,norte],[81.3,norte],[81.3,31],
    [78.6,28.2],[78.9,24],[78.9,20.5],[74.1,20.5]],1.1);
  jardinCroquis('Jardín frontal junto al ingreso',[[fachada,34],[65.9,32.8],[65.9,37.4],[fachada,37.4]]);
  jardinCroquis('Franja verde transversal junto a Administración',[[fachada,-25.7],[64.4,-25.7],
    [64.4,-22.1],[fachada,-22.1]]);
  jardinCroquis('Jardín posterior de Torre A',[[28,-38],[42.7,-38],[44,-35],[28,-35]],.86);
  descansoMacizo(acceso,{x:(37.25+43.7)/2,z:4.45,ancho:43.7-37.25,fondo:53.1,altura:alto})
    .name='Paseo continuo de las fachadas de Torre A';
  descansoMacizo(acceso,{x:(fachada+55.3)/2,z:28.9,ancho:55.3-fachada,fondo:7.8,altura:alto})
    .name='Descanso frontal unido a Torre A';
  descansoMacizo(acceso,{x:(fachada+74.5)/2,z:-21.35,ancho:74.5-fachada,fondo:1.5,altura:alto});
  descansoMacizo(acceso,{x:67.525,z:-17.3,ancho:7.25,fondo:6.6,altura:alto});
  // Una sola cota horizontal desde el ingreso hasta el paseo de la torre.
  // El relleno sustituye también la escalera posterior, ya sin desnivel que salvar.
  descansoMacizo(acceso,{x:(43.7+63.9)/2,z:-17.3,ancho:63.9-43.7,fondo:6.6,altura:alto})
    .name='Piso plano entre ingreso y Torre A';
  const pasilloCentral=new THREE.Group();pasilloCentral.name='Pasillo central horizontal elevado';
  pasilloCentral.position.set(53.7,0,(norte+sur)/2);acceso.add(pasilloCentral);
  descansoMacizo(pasilloCentral,{x:0,z:0,ancho:3.2,fondo:sur-norte+.04,altura:alto});
  barandasRampaRecta(pasilloCentral,3.2,sur-norte,alto);
  // A la izquierda de la escalera exterior: rampa continua desde el piso bajo.
  const rampaIzquierda=new THREE.Group();rampaIzquierda.name='Rampa a la izquierda de la escalera exterior';acceso.add(rampaIzquierda);
  rampaTrapezoidal(rampaIzquierda,{sur:{x:69.45,z:sur,y:bajo},
    norte:{x:65.35,z:norte,y:alto},anchoSur:2.9,anchoNorte:2.9});
  // A su derecha se conserva la llegada con escalones junto al jardín en L.
  rampaTrapezoidal(acceso,{sur:{x:71.912,z:16.8,y:.86},norte:{x:68.975,z:norte,y:alto},anchoSur:3.748,anchoNorte:4.35});
  recorrido(acceso,{x:72.12,z:21,y:bajo},{x:71.912,z:16.8,y:.86},3.6,'escalera',
    {barandas:3,nombre:'Escalera exterior junto al jardín en L'});
  // La pareja frontal sigue subiendo hacia las torres (-X).
  recorrido(acceso,{x:61.3,z:28.9,y:bajo},{x:55.3,z:28.9,y:alto},7.8,'escalera',
    {tramos:2,barandas:3,nombre:'Escalera frontal de la isla trapezoidal'});
  descansoMacizo(acceso,{x:(35.5+44)/2,z:-34.25,ancho:44-35.5,fondo:1.5,altura:alto});
  recorrido(acceso,{x:42.6,z:-29.5,y:bajo},{x:42.6,z:-33.5,y:alto},2.8,'escalera',
    {barandas:3,nombre:'Escalera posterior junto a Torre A'});
  descansoMacizo(acceso,{x:52.9,z:-29.5,ancho:23.4,fondo:1.4,altura:bajo});
  const piedra=[[74.5,-27.8],[81.3,-27.8],[81.3,-14.1],[72.5,-14.1],
    [72.5,-18.4],[74.5,-18.4]];
  pisoLateralElevado(acceso,piedra,()=>alto);
  for(const [a,b] of [[[74.5,-27.8],[81.3,-27.8]],[[81.3,-27.8],[81.3,-14.1]]]){
    const largo=Math.hypot(b[0]-a[0],b[1]-a[1]);
    bloque(acceso,{x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,y:alto+.22,
      ancho:largo,alto:.44,fondo:.28,rotacion:-Math.atan2(b[1]-a[1],b[0]-a[0]),color:'#33363b'});
  }
  for(let x=74.7;x<81.2;x+=1.1)bloque(acceso,{x,z:-20.95,y:alto+.006,ancho:.018,alto:.012,fondo:13.4,color:'#95999a',sombra:false});
  for(let z=-27.6;z<-14.1;z+=1.1)bloque(acceso,{x:77.9,z,y:alto+.007,ancho:6.7,alto:.012,fondo:.018,color:'#95999a',sombra:false});
  descansoMacizo(acceso,{x:69.45,z:-20.5,ancho:10.1,fondo:5,altura:alto});
  crearIngresoTerraza(acceso,{x:67.85,z:-22,baseY:alto,escalaX:.5,conectarCerco:false});
  bloque(acceso,{x:72.95,z:-22.1,y:alto+1.45,ancho:2.9,alto:2.9,fondo:3.7,color:'#d4d6d4'}).name='Caja junto al ingreso peatonal';
  bloque(acceso,{x:72.95,z:-20.22,y:alto+1.65,ancho:2.25,alto:1.05,fondo:.055,color:'#577581'}).name='Ventanilla de caja';
  etiqueta(acceso,'Caja',72.95,alto+3.4,-22.1);
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
  bloque(tramo,{y:base+zocalo/2,ancho:largo,alto:zocalo,fondo:espesor,color:CONFIG.acabados.muro});
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
  celosia.castShadow=true;celosia.receiveShadow=true;
  tramo.add(celosia);
}

function crearPerimetro(grupo){
  const x=CONFIG.anchoCampus/2,z=CONFIG.fondoCampus/2;
  const extremoDerecho=x+CONFIG.extensionDerecha;
  // El ACCESO PRINCIPAL está a la DERECHA de las torres, según corrección del croquis.
  const puerta=CONFIG.ingreso;
  const izquierda=puerta.x-puerta.ancho/2;
  const derecha=puerta.x+puerta.ancho/2;
  // Frente alternado: cada pared de torre sustituye al cerco en su huella.
  let inicio=-x;
  for(const torre of Object.values(CONFIG.torres).sort((a,b)=>a.x-b.x)){
    trazarMuro(grupo,inicio,z,torre.x-torre.ancho/2,z);
    inicio=torre.x+torre.ancho/2;
  }
  trazarMuro(grupo,inicio,z,izquierda,z);
  trazarMuro(grupo,derecha,z,extremoDerecho,z);
  trazarMuro(grupo,-x,-z,extremoDerecho,-z);
  trazarMuro(grupo,-x,-z,-x,z);
  trazarMuro(grupo,extremoDerecho,-z,extremoDerecho,z);
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
  return {suelo,extras,perimetro};
}
