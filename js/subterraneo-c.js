import * as THREE from 'three';
import {CONFIG,PARQUE_ASTERISCO} from './config.js';
import {bloque} from './geometria.js';

// Acceso solicitado en el cerco posterior del lateral C. El tramo bajo y
// la caseta son una interpretación del video y la descripción, sin cotas.
// Desde fuera, mirando hacia +Z: la izquierda es +X y la derecha es -X.
export const ACCESO_C={x:PARQUE_ASTERISCO.x,ancho:5.6,zInicio:-38.8,zFinal:-15.3,
  nivel:CONFIG.baseY+.01,nivelBajo:-1.4,xPeaton:-39.7,anchoPeaton:1.8,xCaseta:-42.65,zCaseta:-37.55,fondoAlero:3.5};
export const HUECO_C=[ACCESO_C.x-3.15,ACCESO_C.x+3.15,-39,-11.2];

export function pisoConHueco(g,{x,z,ancho,fondo,y,alto,color},hueco){
  const l=x-ancho/2,r=x+ancho/2,n=z-fondo/2,s=z+fondo/2;
  const hl=Math.max(l,hueco[0]),hr=Math.min(r,hueco[1]),hn=Math.max(n,hueco[2]),hs=Math.min(s,hueco[3]);
  if(hl>=hr||hn>=hs)return bloque(g,{x,z,ancho,fondo,y,alto,color});
  for(const [x0,x1,z0,z1] of [[l,hl,n,s],[hr,r,n,s],[hl,hr,n,hn],[hl,hr,hs,s]]){
    if(x1>x0&&z1>z0)bloque(g,{x:(x0+x1)/2,z:(z0+z1)/2,ancho:x1-x0,fondo:z1-z0,y,alto,color});
  }
}

function cartel(g,texto,x,y,z,ancho=4){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=160;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#173d4a';ctx.fillRect(0,0,768,160);
  ctx.fillStyle='#f4f4e9';ctx.font='bold 55px Arial';ctx.textAlign='center';ctx.fillText(texto,384,100);
  const mapa=new THREE.CanvasTexture(canvas);mapa.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(ancho,ancho*160/768),new THREE.MeshBasicMaterial({map:mapa}));
  m.position.set(x,y,z);m.userData.sinColision=true;g.add(m);return m;
}

export function crearSubterraneoC(suelo,extras){
  const {x,ancho,zInicio,zFinal,nivel,nivelBajo,xPeaton,xCaseta,zCaseta}=ACCESO_C;
  const g=new THREE.Group();g.name='Acceso al subterráneo · Torre C';extras.add(g);
  // Umbral continuo entre la reja y el inicio de la pendiente.
  bloque(g,{x,z:zInicio-.2,y:nivel-.15,ancho,alto:.3,fondo:.4,color:'#747a7b'}).name='Umbral de acceso a la rampa C';
  // Cierra el frente desde el terreno hasta la calzada: no queda un vano
  // debajo de la entrada ni la plataforma de piedra expuesta junto al control.
  const basamento=new THREE.Group();basamento.name='Cierre macizo hasta el suelo · Torre C';g.add(basamento);
  const extremoDerecho=x-ancho/2-.4,extremoIzquierdo=-38;
  bloque(basamento,{x:(extremoDerecho+extremoIzquierdo)/2,z:-39.04,
    y:(nivel-.3)/2,ancho:extremoIzquierdo-extremoDerecho,alto:nivel+.3,fondo:.4,
    color:CONFIG.acabados.muro}).name='Zócalo del cerco';
  const longitud=zFinal-zInicio,pendiente=(nivelBajo-nivel)/longitud;
  const cota=z=>nivel+(z-zInicio)*pendiente;
  const zAuto=-35.65;
  const auto=crearAutoReferencia();
  auto.position.set(x,cota(zAuto)+.02,zAuto);
  auto.rotation.x=-Math.atan(pendiente);
  auto.scale.z=1/CONFIG.escalaLongitudinalCampus;
  g.add(auto);
  // La junta sigue la transformación longitudinal del pavimento y de su señalización.
  const cortes=[zInicio,-19.48,zFinal],vertices=[];
  for(let i=1;i<cortes.length;i++){
    const a=cortes[i-1],b=cortes[i],izq=x-ancho/2,der=x+ancho/2;
    const pa=[izq,cota(a),a],pb=[der,cota(a),a],pc=[der,cota(b),b],pd=[izq,cota(b),b];
    vertices.push(...pa,...pd,...pc,...pa,...pc,...pb);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();
  const rampa=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:'#747a7b',roughness:.92}));
  rampa.name='Rampa vehicular hacia el interior de SENATI';rampa.receiveShadow=true;g.add(rampa);
  for(const lado of [-1,1]){
    bloque(g,{x:x+lado*(ancho/2+.16),z:(zInicio+zFinal)/2,y:(nivel+.8+nivelBajo-.3)/2,
      ancho:.3,alto:nivel+.8-nivelBajo+.3,fondo:longitud,color:'#c1c5bf'}).name='Muro de contención de rampa C';
    bloque(g,{x:x+lado*(ancho/2+.16),z:(zInicio+zFinal)/2,y:nivel+.85,ancho:.4,alto:.1,fondo:longitud,color:'#66787a'});
  }
  // Una calzada de ingreso. Las flechas apuntan desde la reja hacia el campus (+Z).
  for(const z of [-34,-27,-20]){
    const arrow=new THREE.Shape([new THREE.Vector2(-.12,-.8),new THREE.Vector2(.12,-.8),new THREE.Vector2(.12,.2),new THREE.Vector2(.48,.2),new THREE.Vector2(0,.85),new THREE.Vector2(-.48,.2),new THREE.Vector2(-.12,.2)]);
    const mesh=new THREE.Mesh(new THREE.ShapeGeometry(arrow),new THREE.MeshBasicMaterial({color:'#f3eee0',side:THREE.DoubleSide}));
    mesh.rotation.x=Math.PI/2-Math.atan(pendiente);mesh.position.set(x,cota(z)+.025,z);mesh.name='Flecha de la calzada';mesh.userData.sinColision=true;g.add(mesh);
  }
  for(const lado of [-1,1])for(let z=zInicio+.5;z<zFinal-.5;z+=2.3){
    const line=bloque(g,{x:x+lado*(ancho/2-.2),y:cota(z)+.015,z,ancho:.1,alto:.01,fondo:1.1,color:'#e0cd91'});
    line.rotation.x=-Math.atan(pendiente);line.userData.sinColision=true;
  }
  // Descanso de control detrás del cerco, todo dentro del recinto.
  const bordeC=CONFIG.torres.C.x-CONFIG.torres.C.ancho/2,oeste=-57.5;
  pisoConHueco(suelo,{x:(oeste+bordeC)/2,z:-35.4,y:(nivel-.3)/2,ancho:bordeC-oeste,alto:nivel+.3,fondo:6.8,color:CONFIG.acabados.piso},HUECO_C);
  // La ventanilla se integra en el frente del cerco y sigue visible desde fuera.
  const caseta=new THREE.Group();caseta.name='Caseta de registro vehicular';caseta.position.set(xCaseta,nivel,zCaseta);g.add(caseta);
  const cristal=new THREE.MeshStandardMaterial({color:'#81bbca',transparent:true,opacity:.32,roughness:.18,metalness:.15,depthWrite:false});
  bloque(caseta,{y:.5,ancho:2.5,alto:1,fondo:2.9,color:'#e0e1d8'});
  for(const lado of [-1,1]){
    bloque(caseta,{x:lado*1.25,y:1.65,ancho:.06,alto:1.3,fondo:2.9,material:cristal});
    bloque(caseta,{z:lado*1.45,y:1.65,ancho:2.5,alto:1.3,fondo:.06,material:cristal});
    for(const dz of [-1.45,1.45])bloque(caseta,{x:lado*1.25,z:dz,y:1.65,ancho:.075,alto:1.35,fondo:.075,color:'#40565b'});
  }
  bloque(caseta,{y:2.38,ancho:3.1,alto:.18,fondo:ACCESO_C.fondoAlero,color:'#344e56'});
  bloque(caseta,{y:.95,ancho:1.8,alto:.1,fondo:.65,color:'#535f5c'});
  const frente=1.462,yeso='#e6e3d9';
  bloque(caseta,{z:frente,y:.43,ancho:2.5,alto:.86,fondo:.09,color:yeso});
  bloque(caseta,{z:frente,y:2.10,ancho:2.5,alto:.42,fondo:.09,color:yeso});
  for(const dx of [-1.12,1.12])bloque(caseta,{x:dx,z:frente,y:1.36,ancho:.26,alto:1.04,fondo:.09,color:yeso});
  for(let i=0;i<=15;i++)bloque(caseta,{x:-.99+i*.132,z:frente+.052,y:1.37,ancho:.022,alto:1.02,fondo:.026,color:'#93968c'});
  bloque(caseta,{z:frente+.052,y:1.74,ancho:2,alto:.024,fondo:.03,color:'#93968c'});
  bloque(caseta,{y:1.25,z:.1,ancho:.6,alto:.38,fondo:.07,color:'#233b43'});
  const rotuloControl=cartel(g,'CONTROL',xCaseta,nivel+2.12,zCaseta-1.49,1.9);rotuloControl.rotation.y=Math.PI;
  for(const lado of [-1,1]){
    const piloto=bloque(g,{x:x+lado*(ancho/2+.16),z:-37.9,y:nivel+1.06,ancho:.16,alto:.14,fondo:.24,color:'#dbbf75'});
    piloto.name='Reflector de borde de rampa';
  }
  bloque(caseta,{x:.32,y:1.03,z:.26,ancho:.34,alto:.034,fondo:.14,color:'#495453'}).name='Teclado de control';
  bloque(caseta,{x:0,y:2.268,z:0,ancho:.95,alto:.025,fondo:.2,color:'#f4edd9'}).name='Luminaria de caseta';
  const xBarrera=x+ancho/2+.6;
  bloque(g,{x:xBarrera,y:nivel+.5,z:-37.2,ancho:.4,alto:1,fondo:.45,color:'#e5a639'});
  const barrera=new THREE.Group();barrera.name='Barrera vehicular levantada';barrera.position.set(xBarrera,nivel+1,-37.2);barrera.rotation.z=Math.PI*.63;g.add(barrera);
  bloque(barrera,{x:2,y:0,ancho:4,alto:.12,fondo:.12,color:'#eee9d7'});
  for(let xx=.3;xx<4;xx+=.55)bloque(barrera,{x:xx,z:.065,ancho:.22,alto:.125,fondo:.015,color:'#cf5444'});
  // Entrada peatonal a nivel del campus: no hay escalera ni descenso peatonal.
  bloque(suelo,{x:xPeaton,z:-35.4,y:(nivel-.3)/2,ancho:2.2,alto:nivel+.3,fondo:6.8,color:CONFIG.acabados.piso}).name='Entrada peatonal a nivel de Torre C';
  for(const dx of [-1,1])bloque(g,{x:xPeaton+dx,y:nivel+1.4,z:-38.5,ancho:.12,alto:2.8,fondo:.25,color:'#516b71'});
  bloque(g,{x:xPeaton,y:nivel+2.8,z:-38.5,ancho:2.2,alto:.18,fondo:.6,color:'#35535c'});
  // Hoja de barrotes en el paso peatonal de la toma final del jardín.
  const hoja=new THREE.Group();hoja.name='Puerta peatonal calada de Torre C';
  hoja.position.set(xPeaton-.91,nivel,-38.51);g.add(hoja);
  Object.assign(hoja.userData,{puerta:true,puertaInteractiva:true,abierta:false,anguloAbierto:-Math.PI/2,colisionDinamica:true});
  for(const y of [.10,1.05,2.5])bloque(hoja,{x:.88,y,ancho:1.76,alto:.055,fondo:.065,color:'#858d8d'});
  for(let i=0;i<=12;i++)bloque(hoja,{x:i*1.76/12,y:1.28,ancho:i%12===0?.052:.024,alto:2.44,fondo:.048,color:'#939a99'});
  bloque(caseta,{x:1.12,y:1.23,z:1.54,ancho:.045,alto:2.28,fondo:.05,color:'#944437'});
  bloque(caseta,{x:.94,y:2.35,z:1.54,ancho:.4,alto:.045,fondo:.05,color:'#944437'});
  const letreroPeaton=cartel(g,'PEATONES',xPeaton,nivel+2.53,-38.65,1.8);
  const paso=cartel(g,'PEATONES',xPeaton+.86,nivel+2.46,-38.43,.68);
  paso.name='Señal peatonal hacia el jardín';
  letreroPeaton.rotation.y=Math.PI;
  // Descanso y portal inferior al final de la rampa, dentro del jardín lateral.
  bloque(g,{x,z:-13.3,y:nivelBajo-.15,ancho:ancho,alto:.3,fondo:4.1,color:'#777e7b'}).name='Descanso del subterráneo';
  bloque(g,{x,y:nivelBajo+1.6,z:-11.3,ancho:ancho,alto:3.2,fondo:.18,color:'#273d46'}).name='Fondo del acceso subterráneo';
  for(const lado of [-1,1])bloque(g,{x:x+lado*(ancho/2+.15),y:nivelBajo+1.6,z:-13.3,ancho:.3,alto:3.2,fondo:4,color:'#c7ccc5'});
  bloque(g,{x,y:nivelBajo+3.3,z:-13.3,ancho:ancho+.6,alto:.25,fondo:4,color:'#6e807e'});
  const rotuloBajo=cartel(g,'SUBTERRÁNEO',x,nivelBajo+2.95,-15.35,4.6);rotuloBajo.rotation.y=Math.PI;
  const rotuloAcceso=cartel(g,'ACCESO VEHICULAR',x,nivel+3.2,-39.22,5);rotuloAcceso.rotation.y=Math.PI;
  for(const lado of [-1,1])bloque(g,{x:x+lado*(ancho/2+.16),y:nivel+1.8,z:-38.8,ancho:.12,alto:3.6,fondo:.12,color:'#486268'});
  return g;
}

// Vehículo de escala para comparar la calzada y el espacio frente al jardín.
function crearAutoReferencia(){
  const auto=new THREE.Group();auto.name='Auto de referencia';auto.userData.sinColision=true;auto.userData.conservarForma=true;
  const pintura=new THREE.MeshStandardMaterial({color:'#b5bfbc',metalness:.56,roughness:.31});
  const vidrio=new THREE.MeshStandardMaterial({color:'#52696c',metalness:.46,roughness:.18});
  const goma=new THREE.MeshStandardMaterial({color:'#292d2e',roughness:.91});
  const llanta=new THREE.MeshStandardMaterial({color:'#9da5a3',metalness:.74,roughness:.31});
  function carroceria(perfiles,material){
    const vertices=[],indices=[];
    for(const [z,ancho,base,techo] of perfiles){
      vertices.push(-ancho,base,z,ancho,base,z,ancho*.93,techo,z,-ancho*.93,techo,z);
    }
    for(let i=1;i<perfiles.length;i++)for(let j=0;j<4;j++){
      const a=(i-1)*4+j,b=(i-1)*4+(j+1)%4;
      indices.push(a,b,b+4,a,b+4,a+4);
    }
    const fin=vertices.length/3-4;indices.push(0,2,1,0,3,2,fin,fin+1,fin+2,fin,fin+2,fin+3);
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
    const panel=new THREE.Mesh(geo,material);panel.castShadow=true;panel.receiveShadow=true;auto.add(panel);
  }
  carroceria([[-2.09,.77,.32,.72],[-1.75,.87,.28,.83],[-.83,.90,.29,.88],[.72,.90,.29,.85],[1.68,.84,.32,.75],[2.12,.75,.34,.59]],pintura);
  carroceria([[-1.52,.78,.78,.8],[-.86,.72,.85,1.36],[-.48,.71,.86,1.43],[.49,.71,.84,1.41],[1.12,.78,.83,.86]],vidrio);
  carroceria([[-.88,.69,1.33,1.36],[-.48,.68,1.40,1.45],[.47,.67,1.38,1.43],[.56,.64,1.35,1.39]],pintura);
  for(const lado of [-1,1]){
    for(const z of [-1.34,1.34]){
      for(const [r,grosor,dx,material] of [[.31,.16,.84,goma],[.198,.017,.926,llanta]]){
        const rueda=new THREE.Mesh(new THREE.CylinderGeometry(r,r,grosor,18),material);
        rueda.rotation.z=Math.PI/2;rueda.position.set(lado*dx,.315,z);auto.add(rueda);
      }
    }
    bloque(auto,{x:lado*.825,y:.63,z:1.79,ancho:.12,alto:.11,fondo:.42,color:'#e2e3d6'});
    bloque(auto,{x:lado*.62,y:.644,z:2.04,ancho:.26,alto:.089,fondo:.11,color:'#f2f2de'});
    bloque(auto,{x:lado*.64,y:.665,z:-2.062,ancho:.24,alto:.11,fondo:.065,color:'#99504d'});
    bloque(auto,{x:lado*.81,y:.97,z:.55,ancho:.21,alto:.11,fondo:.16,material:pintura});
    bloque(auto,{x:lado*.72,y:1.11,z:-.10,ancho:.041,alto:.50,fondo:.072,color:'#324244'});
  }
  return auto;
}
