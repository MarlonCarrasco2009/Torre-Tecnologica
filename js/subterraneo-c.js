import * as THREE from 'three';
import {CONFIG} from './config.js?v=video-1511-vegetacion';
import {bloque} from './geometria.js?v=video-1511-vegetacion';

// Acceso solicitado en el cerco posterior del lateral C. El tramo bajo y
// la caseta son una interpretación del video y la descripción, sin cotas.
// Desde fuera, mirando hacia +Z: la izquierda es +X y la derecha es -X.
export const ACCESO_C={x:-51.1,ancho:5.6,zInicio:-38.8,zFinal:-15.3,
  nivel:CONFIG.baseY+.01,nivelBajo:-1.4,xPeaton:-39.7,anchoPeaton:1.8,xCaseta:-44.8,zCaseta:-37.55};
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
  const forma=new THREE.Shape([new THREE.Vector2(-zInicio,nivel),new THREE.Vector2(-zFinal,nivelBajo),
    new THREE.Vector2(-zFinal,nivelBajo-.3),new THREE.Vector2(-zInicio,nivelBajo-.3)]);
  const geo=new THREE.ExtrudeGeometry(forma,{depth:ancho,bevelEnabled:false});geo.rotateY(Math.PI/2);geo.translate(x-ancho/2,0,0);
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
    mesh.rotation.x=Math.PI/2-Math.atan(pendiente);mesh.position.set(x,cota(z)+.025,z);mesh.userData.sinColision=true;g.add(mesh);
  }
  for(const lado of [-1,1])for(let z=zInicio+.5;z<zFinal-.5;z+=2.3){
    const line=bloque(g,{x:x+lado*(ancho/2-.2),y:cota(z)+.015,z,ancho:.1,alto:.01,fondo:1.1,color:'#e0cd91'});
    line.rotation.x=-Math.atan(pendiente);line.userData.sinColision=true;
  }
  // Descanso de control detrás del cerco, todo dentro del recinto.
  pisoConHueco(suelo,{x:-47.9,z:-35.4,y:(nivel-.3)/2,ancho:19.2,alto:nivel+.3,fondo:6.8,color:CONFIG.acabados.piso},HUECO_C);
  // La ventanilla se integra en el frente del cerco y sigue visible desde fuera.
  const caseta=new THREE.Group();caseta.name='Caseta de registro vehicular';caseta.position.set(xCaseta,nivel,zCaseta);g.add(caseta);
  const cristal=new THREE.MeshStandardMaterial({color:'#81bbca',transparent:true,opacity:.32,roughness:.18,metalness:.15,depthWrite:false});
  bloque(caseta,{y:.5,ancho:2.5,alto:1,fondo:2.9,color:'#e0e1d8'});
  for(const lado of [-1,1]){
    bloque(caseta,{x:lado*1.25,y:1.65,ancho:.06,alto:1.3,fondo:2.9,material:cristal});
    bloque(caseta,{z:lado*1.45,y:1.65,ancho:2.5,alto:1.3,fondo:.06,material:cristal});
    for(const dz of [-1.45,1.45])bloque(caseta,{x:lado*1.25,z:dz,y:1.65,ancho:.075,alto:1.35,fondo:.075,color:'#40565b'});
  }
  bloque(caseta,{y:2.38,ancho:3.1,alto:.18,fondo:3.5,color:'#344e56'});
  bloque(caseta,{y:.95,ancho:1.8,alto:.1,fondo:.65,color:'#535f5c'});
  bloque(caseta,{y:1.25,z:.1,ancho:.6,alto:.38,fondo:.07,color:'#233b43'});
  const rotuloControl=cartel(g,'CONTROL',xCaseta,nivel+2.12,zCaseta-1.49,1.9);rotuloControl.rotation.y=Math.PI;
  const xBarrera=x+ancho/2+.6;
  bloque(g,{x:xBarrera,y:nivel+.5,z:-37.2,ancho:.4,alto:1,fondo:.45,color:'#e5a639'});
  const barrera=new THREE.Group();barrera.name='Barrera vehicular levantada';barrera.position.set(xBarrera,nivel+1,-37.2);barrera.rotation.z=Math.PI*.63;g.add(barrera);
  bloque(barrera,{x:2,y:0,ancho:4,alto:.12,fondo:.12,color:'#eee9d7'});
  for(let xx=.3;xx<4;xx+=.55)bloque(barrera,{x:xx,z:.065,ancho:.22,alto:.125,fondo:.015,color:'#cf5444'});
  // Entrada peatonal a nivel del campus: no hay escalera ni descenso peatonal.
  bloque(suelo,{x:xPeaton,z:-35.4,y:(nivel-.3)/2,ancho:2.2,alto:nivel+.3,fondo:6.8,color:CONFIG.acabados.piso}).name='Entrada peatonal a nivel de Torre C';
  for(const dx of [-1,1])bloque(g,{x:xPeaton+dx,y:nivel+1.4,z:-38.5,ancho:.12,alto:2.8,fondo:.25,color:'#516b71'});
  bloque(g,{x:xPeaton,y:nivel+2.8,z:-38.5,ancho:2.2,alto:.18,fondo:.6,color:'#35535c'});
  const letreroPeaton=cartel(g,'PEATONES',xPeaton,nivel+2.53,-38.65,1.8);
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
