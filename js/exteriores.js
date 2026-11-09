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

function barandasEscalera(grupo,largo,ancho,desde,hasta){
  const desnivel=hasta.y-desde.y;
  const superficie=z=>{
    const t=THREE.MathUtils.clamp((z+largo/2)/largo,0,1);
    return desde.y+desnivel*t;
  };
  // Las jardineras ocultan el borde exterior; coloca los postes dentro
  // del ancho útil de los peldaños para que las barandillas queden visibles.
  const borde=ancho/2-.22,altura=1.02;
  for(const lado of [-1,1]){
    const x=lado*borde;
    const inicioZ=-largo/2+.22,finZ=largo/2-.22;
    const postes=[inicioZ,0,finZ];
    for(const z of postes){
      const base=new THREE.Vector3(x,superficie(z)+.04,z);
      const cima=base.clone();cima.y+=altura;
      barraMetalica(grupo,base,cima,.055,'Poste lateral de baranda metálica');
    }
    const inicio=new THREE.Vector3(x,superficie(-largo/2)+.04+altura,-largo/2);
    const fin=new THREE.Vector3(x,superficie(largo/2)+.04+altura,largo/2);
    barraMetalica(grupo,inicio,fin,.075,'Pasamanos lateral de baranda metálica');
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
function recorrido(grupo,desde,hasta,ancho,tipo){
  const tramo=new THREE.Group(); tramo.name=tipo==='rampa'?'Rampa de concreto':'Escalera de concreto';
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
    const pasos=Math.max(4,Math.ceil(Math.abs(desnivel)/.16));
    for(let i=0;i<pasos;i++){
      // El peldaño superior coincide exactamente con el piso de llegada.
      const avance=desnivel>0?(i+1)/pasos:i/pasos;
      const superficie=desde.y+desnivel*avance;
      const alto=superficie-.02;
      bloque(tramo,{y:.02+alto/2,z:-largo/2+(i+.5)*largo/pasos,
        ancho,alto,fondo:largo/pasos,color:pavimento});
      // Junta gris del peldaño, del mismo material que el resto del recorrido.
      bloque(tramo,{y:superficie+.006,z:-largo/2+i*largo/pasos+.025,
        ancho,alto:.012,fondo:.05,color:'#5b6065',sombra:false});
    }
    barandasEscalera(tramo,largo,ancho,desde,hasta);
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
    posiciones.setY(i,.12+nivel*(alturaEnZ(posiciones.getZ(i))-.12));
  }
  posiciones.needsUpdate=true;
  geometria.computeVertexNormals();
  const piso=new THREE.Mesh(geometria,new THREE.MeshStandardMaterial({color:pavimento,roughness:.84}));
  piso.name='Pasillo lateral elevado con espesor hasta el suelo';
  piso.castShadow=true; piso.receiveShadow=true;
  grupo.add(piso);
}

function crearAccesoLateral(grupo){
  const acceso=new THREE.Group(); acceso.name='Jardines y recorridos del acceso derecho';
  // Amplía hacia la derecha desde el borde junto a la torre.
  acceso.scale.x=1.5;
  acceso.position.x=38.6*(1-acceso.scale.x);
  grupo.add(acceso);
  const nivelTorre=CONFIG.baseY+.01;
  const nivelBajo=.14;
  const extremoSur=27.3,extremoNorte=-14;
  const desplazamientoJardin=2.4;
  // Proporciones de la foto de referencia: ambos jardines largos más anchos.
  // Los recorridos se desplazan con sus bordes y conservan su ancho libre.
  const ensancheInterior=2.5,ensancheExterior=4.2;
  const ensancheTotal=ensancheInterior+ensancheExterior;
  const xCampus=x=>acceso.position.x+x*acceso.scale.x;
  // Desplazamiento lateral para abrir el paseo elevado junto al edificio.
  const jardines=new THREE.Group(); jardines.name='Jardines desplazados y rampas progresivas';
  jardines.position.x=desplazamientoJardin;
  acceso.add(jardines);
  // El césped llega al borde de la escalera unificada, sin el vacío celeste.
  jardinContorno(jardines,[[38.6,extremoSur],[40.9+ensancheInterior,extremoSur],
    [42.25+ensancheInterior,extremoNorte],[38.6,extremoNorte]],nivelTorre+.07);
  jardinContorno(jardines,[[42.7+ensancheInterior,extremoSur],[48+ensancheTotal,extremoSur],
    [46+ensancheTotal,extremoNorte],[43.75+ensancheInterior,extremoNorte]],nivelTorre+.07);
  // El tramo central une ambos descansos a su misma cota, sin corte en la llegada sur.
  rampaTrapezoidal(jardines,{sur:{x:41.8+ensancheInterior,z:extremoSur,y:nivelTorre},
    norte:{x:43+ensancheInterior,z:extremoNorte,y:nivelTorre},anchoSur:1.8,anchoNorte:1.5});
  // La rampa exterior conserva su pendiente desde la plaza hasta la torre.
  rampaTrapezoidal(jardines,{sur:{x:49+ensancheTotal,z:extremoSur,y:nivelBajo},
    norte:{x:46.8+ensancheTotal,z:extremoNorte,y:nivelTorre},anchoSur:2,anchoNorte:1.6});
  descansoMacizo(jardines,{x:43.1+ensancheTotal/2,z:-15,ancho:9+ensancheTotal,fondo:2,altura:nivelTorre});
  const bordeTorre=CONFIG.torres.A.x+CONFIG.torres.A.ancho/2;
  const bordeJardin=xCampus(38.6+desplazamientoJardin);
  // La escalera frontal se desplaza a la derecha para acompañar la ampliación.
  const llegadaEscaleras=xCampus(42.7+ensancheInterior+desplazamientoJardin)+2.2;
  // Franja verde: extensión maciza, al mismo nivel del piso de la torre A.
  const paseo=bloque(grupo,{x:(bordeTorre+bordeJardin)/2,z:(-16+extremoSur)/2,
    y:(.08+nivelTorre)/2,ancho:bordeJardin-bordeTorre,
    alto:nivelTorre-.08,fondo:extremoSur+16,color:pavimento});
  paseo.name='Paseo elevado entre la torre y los jardines';
  // Prolongación continua del piso de la torre, con la misma cota y base sólida.
  const prolongacion=bloque(grupo,{x:(bordeTorre+llegadaEscaleras)/2,z:30.2,
    y:(.08+nivelTorre)/2,ancho:llegadaEscaleras-bordeTorre,
    alto:nivelTorre-.08,fondo:5.8,color:pavimento});
  prolongacion.name='Piso de la torre unido a la escalera ancha';
  recorrido(grupo,{x:llegadaEscaleras+5.95,z:30.2,y:nivelBajo},
    {x:llegadaEscaleras,z:30.2,y:nivelTorre},5.8,'escalera');
  recorrido(jardines,{x:40.1,z:-25,y:nivelBajo},{x:40.1,z:-16,y:nivelTorre},2.2,'escalera');
  const alturaPasillo=z=>.86+(20.5-z)/(20.5-extremoNorte)*(nivelTorre-.86);
  const bordeRampa=z=>50+ensancheTotal+desplazamientoJardin-(extremoSur-z)/(extremoSur-extremoNorte)*2.4;
  const bordePasillo=56+ensancheTotal;
  const alturaCruce=alturaPasillo(20.5);
  // Escalera verde: otro cuarto de vuelta, ahora paralela al pasillo exterior.
  // Toda la franja roja es ahora un piso elevado, no solo el descanso corto.
  pisoLateralElevado(acceso,[[bordeRampa(20.5),20.5],[bordePasillo,20.5],
    [bordePasillo,-16],[bordeRampa(-16),-16]],alturaPasillo);
  // La segunda pareja también se convierte en un solo tramo, sin franja intermedia.
  const inicioEscalera=50+ensancheTotal+desplazamientoJardin;
  const anchoEscalera=bordePasillo-inicioEscalera;
  const centroEscalera=(inicioEscalera+bordePasillo)/2;
  recorrido(acceso,{x:centroEscalera,z:20.5,y:alturaCruce},
    {x:centroEscalera,z:25,y:nivelBajo},anchoEscalera,'escalera');
  // Jardín longitudinal contra el cerco: contorno original en L.
  jardinContorno(acceso,[[56,-16],[60.4,-16],[60.4,31],[59.2,30],
    [58.8,25],[59,22],[56,22]].map(([x,z])=>[x+ensancheTotal,z]),1.1);
  // Jardín frontal junto al acceso: césped y borde elevados sobre una base más alta.
  jardin(acceso,43.95+ensancheTotal/2,35.6,12.1+ensancheTotal,4.8,0,1.9);
  // Conjunto superior en L: rampa transversal y escalera de giro.
  jardin(acceso,43,-28.2,8.4,3.6);
  recorrido(acceso,{x:47.2,z:-32,y:.14},{x:40,z:-32,y:.86},2,'rampa');
  placa(acceso,{x:39.1,y:.83,z:-32,ancho:1.8,fondo:2,color:pavimento});
  recorrido(acceso,{x:39.1,z:-36.8,y:.14},{x:39.1,z:-33,y:.86},1.8,'escalera');
  jardin(acceso,39.1,-37.7,3.4,1.2);
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
