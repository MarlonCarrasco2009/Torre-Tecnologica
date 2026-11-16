import * as THREE from 'three';
import {pisoConHueco,HUECO_C,ACCESO_C} from './subterraneo-c.js?v=video-1511-vegetacion';
import {CONFIG} from './config.js?v=video-1511-vegetacion';
import {bloque,paredVidrio} from './geometria.js?v=video-1511-vegetacion';
import {plantarCobertura,tierraJardin} from './vegetacion.js?v=video-1511-vegetacion';

// Referencia: video del lateral de Torre C, 15/11/2026.
// Ubicaciones y dimensiones aproximadas; el video no aporta cotas.
export const LATERAL_C={oeste:-57.5,este:-38.5,norte:-32,sur:34.5,nivel:CONFIG.baseY+.01};

function barra(g,a,b,radio=.035,color='#919898'){
  const inicio=new THREE.Vector3(...a),fin=new THREE.Vector3(...b),v=fin.clone().sub(inicio);
  const m=new THREE.Mesh(new THREE.CylinderGeometry(radio,radio,v.length(),6),
    new THREE.MeshStandardMaterial({color,metalness:.65,roughness:.4}));
  m.position.copy(inicio.add(fin).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());g.add(m);return m;
}

function jardinOrnamental(g,{x,z,ancho,fondo,radial=false}){
  const y=LATERAL_C.nivel,j=new THREE.Group();j.name=radial?'Jardinera ornamental radial':'Jardinera de franjas';j.position.set(x,0,z);g.add(j);
  bloque(j,{y:y+.28,ancho,alto:.56,fondo,color:'#242727'}).name='Contención de jardinera';
  for(const s of [-1,1]){
    bloque(j,{x:s*(ancho/2-.12),y:y+.58,ancho:.24,alto:.13,fondo,color:'#454a49'});
    bloque(j,{z:s*(fondo/2-.12),y:y+.58,ancho,alto:.13,fondo:.24,color:'#454a49'});
  }
  const foliage=new THREE.Group();foliage.userData.sinColision=true;j.add(foliage);
  bloque(foliage,{y:y+.565,ancho:ancho-.3,alto:.02,fondo:fondo-.3,material:tierraJardin()});
  const colors=['#96a957','#567e3d','#a2b96a','#6a813d','#64424e'];
  const cols=Math.floor((ancho-.65)/.24),rows=Math.floor((fondo-.65)/.24),puntos=[];
  let seed=1511;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<cols;i++)for(let k=0;k<rows;k++){
    const px=-ancho/2+.4+i*.24,pz=-fondo/2+.4+k*.24;
    const u=px/(ancho/2),v=pz/(fondo/2);
    const line=Math.min(Math.abs(u),Math.abs(v),Math.abs(u-v)*.7,Math.abs(u+v)*.7);
    const index=radial?(line<.065?4:Math.floor((Math.atan2(v,u)+Math.PI)/(Math.PI/4))%4):Math.floor((pz+fondo/2)/2.2)%4;
    puntos.push({x:px+(rand()-.5)*.035,y:y+.58,z:pz+(rand()-.5)*.035,color:colors[index]});
  }
  plantarCobertura(foliage,puntos);
  for(const [rx,rz,r] of radial?[[0,0,.55],[ancho*.32,fondo*.32,.35]]:[[0,0,.48]]){
    const rock=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),new THREE.MeshStandardMaterial({color:'#96938b',roughness:.95}));
    rock.position.set(rx,y+.7,rz);rock.scale.y=.8;foliage.add(rock);
  }
  return j;
}

function jardinAlrededorRampa(g){
  const jardin=new THREE.Group();jardin.name='Jardinera rectangular alrededor de la rampa';g.add(jardin);
  // Se rellena el espacio junto a la rampa hasta la misma línea del jardín
  // delantero (X=-41.5). El pasillo de fachada y el acceso siguen libres.
  const x=ACCESO_C.x,exterior=4.65,interior=3.25,este=-41.5,frente=-33.4,fondo=-9.6,cierre=-11;
  const puntos=[[x-exterior,frente],[x-interior,frente],[x-interior,cierre],
    [x+interior,cierre],[x+interior,frente],[este,frente],
    [este,fondo],[x-exterior,fondo]];
  const forma=new THREE.Shape(puntos.map(([x,z])=>new THREE.Vector2(x,-z)));
  const geo=new THREE.ExtrudeGeometry(forma,{depth:.56,bevelEnabled:false});geo.rotateX(-Math.PI/2);
  const base=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:'#252a28'}));base.position.y=LATERAL_C.nivel; jardin.add(base);
  base.castShadow=true;base.receiveShadow=true;
  const tierraGeo=new THREE.ShapeGeometry(forma);tierraGeo.rotateX(-Math.PI/2);
  const tierra=new THREE.Mesh(tierraGeo,tierraJardin());tierra.position.y=LATERAL_C.nivel+.566;
  tierra.userData.sinColision=true;tierra.receiveShadow=true;jardin.add(tierra);
  for(let i=0;i<puntos.length;i++){
    const [x,z]=puntos[i],[xx,zz]=puntos[(i+1)%puntos.length];
    bloque(jardin,{x:(x+xx)/2,z:(z+zz)/2,y:LATERAL_C.nivel+.59,ancho:Math.abs(xx-x)+.15,alto:.1,fondo:Math.abs(zz-z)+.15,color:'#48514c'});
  }
  const plants=[];
  for(let px=x-exterior+.25;px<este-.25;px+=.23)for(let z=frente+.25;z<fondo-.25;z+=.23){
    if(Math.abs(px-x)<interior+.2&&z<cierre+.2)continue;
    const franja=Math.floor((px-(x+interior))/.75);
    plants.push({x:px,y:LATERAL_C.nivel+.58,z,color:franja%3===0?'#628244':'#9eb166'});
  }
  plantarCobertura(jardin,plants,932);
}

function mesa(g,x,z){
  const m=new THREE.Group();m.name='Mesa del comedor con sillas azules';m.position.set(x,LATERAL_C.nivel,z);g.add(m);
  bloque(m,{y:.78,ancho:2.8,alto:.085,fondo:1.15,color:'#d4d1bb'});
  for(const px of [-1.1,1.1])for(const pz of [-.42,.42])bloque(m,{x:px,y:.38,z:pz,ancho:.055,alto:.76,fondo:.055,color:'#323c40'});
  for(const lado of [-1,1])for(const px of [-.82,.82]){
    const silla=new THREE.Group();silla.name='Silla azul';silla.position.set(px,0,lado*1.04);m.add(silla);
    bloque(silla,{y:.45,ancho:.52,alto:.09,fondo:.52,color:'#124caa'});
    bloque(silla,{y:.79,z:lado*.24,ancho:.52,alto:.52,fondo:.07,color:'#1858b4'});
    for(const dx of [-.21,.21])for(const dz of [-.21,.21])bloque(silla,{x:dx,y:.22,z:dz,ancho:.035,alto:.44,fondo:.035,color:'#758184'});
  }
}

function toldo(g){
  const cover=new THREE.Group();cover.name='Lona tensada del comedor';g.add(cover);
  const geo=new THREE.PlaneGeometry(17,19,22,22);geo.rotateX(-Math.PI/2);
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
    const u=p.getX(i)/8.5,v=p.getZ(i)/9.5;
    p.setY(i,LATERAL_C.nivel+4.3+.75*u*v-.55*(1-u*u)*(1-v*v));
  }
  geo.computeVertexNormals();
  const cloth=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:'#ddd7be',side:THREE.DoubleSide,roughness:1}));
  cloth.position.set(-47.5,0,24);cloth.castShadow=true;cloth.receiveShadow=true;cloth.userData.sinColision=true;cover.add(cloth);
  for(const x of [-56,-39])for(const z of [14.5,33.5]){
    const y=LATERAL_C.nivel+4.3+.75*((x+47.5)/8.5)*((z-24)/9.5);
    barra(cover,[x,LATERAL_C.nivel,z],[x,y+.13,z],.07,'#b5b4a7');
  }
  return cover;
}

export function crearLateralC(suelo,extras){
  const {oeste,este,norte,sur,nivel}=LATERAL_C;
  const pisoLateral=new THREE.Group();suelo.add(pisoLateral);
  pisoConHueco(pisoLateral,{x:(oeste+este)/2,z:(norte+sur)/2,y:(.08+nivel)/2,
    ancho:este-oeste,fondo:sur-norte,alto:nivel-.08,color:CONFIG.acabados.piso},HUECO_C);pisoLateral.name='Paseo continuo lateral de Torre C';
  const g=new THREE.Group();g.name='Lateral de Torre C · video 15 noviembre';extras.add(g);
  jardinOrnamental(g,{x:-48,z:2,ancho:13,fondo:19,radial:true});
  jardinAlrededorRampa(g);
  // Canaleta enrasada: deja el paso entre fachada y jardinera completamente libre.
  const drenaje=bloque(g,{x:-40.9,z:-8.5,y:nivel+.005,ancho:.19,alto:.01,fondo:43,color:'#242b2b'});drenaje.userData.sinColision=true;
  for(let z=-30;z<13;z+=.25){const r=bloque(g,{x:-40.9,z,y:nivel+.014,ancho:.19,alto:.01,fondo:.025,color:'#687173'});r.userData.sinColision=true;}
  for(const x of [-51.8,-45.8])for(const z of [18,23.5,29])mesa(g,x,z);
  const cubierta=toldo(g);
  // Fachada de cafetería: paños de vidrio, vanos abiertos y perfilería metálica.
  for(const z of [19.5,28.5]){
    const f=paredVidrio(g,{x:este,z,largo:9,baseY:nivel,alto:3.65,rotacion:-Math.PI/2,colorMarco:'#697878'});
    f.name='Fachada acristalada del comedor de Torre C';
    for(const child of f.children.filter(o=>o.isMesh&&o.material.transparent)){
      child.material.color.set('#bfdbd7');child.material.opacity=.16;
    }
  }
  // Alternancia de paneles grises y claros observada junto al jardín.
  for(let z=-30;z<14;z+=2.2){
    bloque(g,{x:este+.12,z:z+1.1,y:nivel+1.9,ancho:.18,alto:3.8,fondo:2.17,color:Math.round((z+30)/2.2)%3===0?'#dbdad2':'#737777'}).name='Panel de fachada lateral C';
  }
  bloque(g,{x:este-.25,z:1,y:nivel+4.08,ancho:.9,alto:.25,fondo:65,color:'#b9bcb7'}).name='Alero lateral Torre C';
  // Carros vacíos de bandejas, al borde de la fachada del comedor.
  for(const z of [16,32]){
    const rack=new THREE.Group();rack.name='Carro portabandejas';rack.position.set(-39.05,nivel,z);g.add(rack);
    for(const x of [-.25,.25])for(const dz of [-.42,.42])barra(rack,[x,.1,dz],[x,1.75,dz],.025);
    for(let h=.3;h<1.7;h+=.14)for(const x of [-.25,.25])barra(rack,[x,h,-.42],[x,h,.42],.015);
    for(const x of [-.25,.25])for(const dz of [-.42,.42])bloque(rack,{x,y:.08,z:dz,ancho:.1,alto:.16,fondo:.1,color:'#303538'});
  }
  g.userData.cubierta=cubierta;
  return g;
}
