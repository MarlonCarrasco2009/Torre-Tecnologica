import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const paredNormal='#465057';
const columnaNormal='#48545e';

// Bloque básico reutilizable (suelos, columnas, paredes, escalones, etc.).
export function bloque(padre, {x=0,y=0,z=0,ancho=1,alto=1,fondo=1,color='#ffffff',material=null,rotacion=0,sombra=true}) {
  const m = material ?? new THREE.MeshStandardMaterial({color,roughness:0.84});
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(ancho,alto,fondo),m);
  mesh.position.set(x,y,z);
  mesh.rotation.y=rotacion;
  mesh.castShadow=sombra; mesh.receiveShadow=true;
  padre.add(mesh);
  return mesh;
}
export function placa(padre,{x=0,y=.02,z=0,ancho=1,fondo=1,color='#dddddd',opacidad=1,rotacion=0}){
  const mat = new THREE.MeshStandardMaterial({color,transparent:opacidad<1,opacity:opacidad,roughness:0.9,side:THREE.DoubleSide,depthWrite:opacidad===1});
  return bloque(padre,{x,y,z,ancho,alto:.06,fondo,material:mat,rotacion,sombra:false});
}
export function columna(padre,x,z,alto=4.4,baseY=.32){
  return bloque(padre,{x,y:alto/2+baseY,z,ancho:.62,alto,fondo:.62,color:columnaNormal});
}

// Cerramiento transparente con vano central y una sola hoja abierta hacia fuera.
export function paredVidrio(padre,{x,z,largo,baseY,alto=3.2,rotacion=0,colorMarco='#607f8c'}){
  const pared=new THREE.Group();
  pared.name='Pared de vidrio con puerta de una hoja abierta';
  pared.position.set(x,baseY,z);
  pared.rotation.y=rotacion;
  padre.add(pared);
  const vidrio=new THREE.MeshStandardMaterial({
    color:'#8acbdf',transparent:true,opacity:.28,roughness:.16,
    metalness:.08,depthWrite:false
  });
  const vidrioPuerta=vidrio.clone();
  vidrioPuerta.opacity=.42;
  const marco=new THREE.MeshStandardMaterial({color:colorMarco,roughness:.4,metalness:.55});
  const anchoPuerta=1.5,altoPuerta=2.65,perfil=.075;
  const fijo=(largo-anchoPuerta)/2;
  for(const lado of [-1,1]){
    bloque(pared,{x:lado*(anchoPuerta/2+fijo/2),y:alto/2,
      ancho:fijo,alto,fondo:.065,material:vidrio,sombra:false});
    // Jambas del vano y perfiles de los extremos.
    for(const borde of [anchoPuerta/2,largo/2]){
      bloque(pared,{x:lado*borde,y:alto/2,ancho:perfil,alto,fondo:.12,material:marco});
    }
    bloque(pared,{x:lado*(anchoPuerta/2+fijo/2),y:perfil/2,
      ancho:fijo,alto:perfil,fondo:.12,material:marco});
  }
  // La bisagra gira la hoja, sus perfiles y el tirador juntos; el vano queda libre.
  const puerta=new THREE.Group();
  puerta.name='Puerta de vidrio abierta 70 grados';
  puerta.position.x=-anchoPuerta/2;
  puerta.rotation.y=-70*Math.PI/180;
  pared.add(puerta);
  bloque(puerta,{x:anchoPuerta/2,y:altoPuerta/2,
    ancho:anchoPuerta-.08,alto:altoPuerta-.08,fondo:.08,
    material:vidrioPuerta,sombra:false});
  for(const borde of [.04,anchoPuerta-.04]){
    bloque(puerta,{x:borde,y:altoPuerta/2,ancho:.045,alto:altoPuerta,fondo:.1,material:marco});
  }
  for(const y of [.04,altoPuerta-.04]){
    bloque(puerta,{x:anchoPuerta/2,y,ancho:anchoPuerta,alto:.045,fondo:.1,material:marco});
  }
  for(const cara of [-1,1]){
    bloque(puerta,{x:anchoPuerta-.2,y:1.25,z:cara*.12,
      ancho:.055,alto:.55,fondo:.065,material:marco});
  }
  bloque(pared,{y:(alto+altoPuerta)/2,ancho:anchoPuerta,
    alto:alto-altoPuerta,fondo:.065,material:vidrio,sombra:false});
  bloque(pared,{y:altoPuerta,ancho:anchoPuerta,alto:perfil,fondo:.12,material:marco});
  bloque(pared,{y:alto,ancho:largo,alto:perfil,fondo:.12,material:marco});
  return pared;
}
// Muro blanco con dos accesos independientes cerca de sus extremos.
export function paredConPuertas(padre,{x,z,largo,baseY,alto=3.2,rotacion=0}){
  const pared=new THREE.Group();
  pared.name='Muro blanco con dos puertas en las esquinas';
  pared.position.set(x,baseY,z);
  pared.rotation.y=rotacion;
  padre.add(pared);
  const muro=new THREE.MeshStandardMaterial({color:paredNormal,roughness:.83});
  const marco=new THREE.MeshStandardMaterial({color:'#657582',roughness:.5});
  const hojaMat=new THREE.MeshStandardMaterial({color:'#af9276',roughness:.65});
  const anchoPuerta=1.5,altoPuerta=2.65,espesor=.3,margen=.55;
  const centros=[-largo/2+margen+anchoPuerta/2,largo/2-margen-anchoPuerta/2];
  let inicio=-largo/2;
  for(const centro of centros){
    const izquierda=centro-anchoPuerta/2,derecha=centro+anchoPuerta/2;
    bloque(pared,{x:(inicio+izquierda)/2,y:alto/2,ancho:izquierda-inicio,
      alto,fondo:espesor,material:muro});
    bloque(pared,{x:centro,y:(alto+altoPuerta)/2,ancho:anchoPuerta,
      alto:alto-altoPuerta,fondo:espesor,material:muro});
    for(const borde of [izquierda,derecha]){
      bloque(pared,{x:borde,y:altoPuerta/2,ancho:.08,alto:altoPuerta,fondo:.34,material:marco});
    }
    bloque(pared,{x:centro,y:altoPuerta,ancho:anchoPuerta+.08,alto:.08,fondo:.34,material:marco});
    // Hoja abierta hacia el corredor; el hueco no contiene un muro oculto.
    const puerta=new THREE.Group();
    puerta.name='Puerta del auditorio abierta';
    puerta.position.x=izquierda;
    puerta.rotation.y=-70*Math.PI/180;
    pared.add(puerta);
    bloque(puerta,{x:anchoPuerta/2,y:altoPuerta/2,ancho:anchoPuerta-.1,
      alto:altoPuerta-.08,fondo:.1,material:hojaMat});
    for(const cara of [-1,1]){
      bloque(puerta,{x:anchoPuerta-.22,y:1.2,z:cara*.12,
        ancho:.055,alto:.4,fondo:.065,material:marco});
    }
    inicio=derecha;
  }
  bloque(pared,{x:(inicio+largo/2)/2,y:alto/2,ancho:largo/2-inicio,
    alto,fondo:espesor,material:muro});
  return pared;
}

// Muro con un único vano y hoja abierta, usado para conectar el jardín con la sala.
export function paredConPuerta(padre,{x,z,largo,baseY,alto=3.2,rotacion=0,puertaCentro=0}){
  const pared=new THREE.Group();
  pared.name='Muro con puerta abierta hacia el jardín';
  pared.position.set(x,baseY,z);
  pared.rotation.y=rotacion;
  padre.add(pared);
  const muro=new THREE.MeshStandardMaterial({color:paredNormal,roughness:.83});
  const marco=new THREE.MeshStandardMaterial({color:'#657582',roughness:.5});
  const hojaMat=new THREE.MeshStandardMaterial({color:'#af9276',roughness:.65});
  const anchoPuerta=1.35,altoPuerta=2.65,espesor=.3;
  const izquierda=-largo/2,derecha=largo/2;
  const vanoIzq=puertaCentro-anchoPuerta/2,vanoDer=puertaCentro+anchoPuerta/2;
  if(vanoIzq-izquierda>0) bloque(pared,{x:(izquierda+vanoIzq)/2,y:alto/2,ancho:vanoIzq-izquierda,alto,fondo:espesor,material:muro});
  if(derecha-vanoDer>0) bloque(pared,{x:(vanoDer+derecha)/2,y:alto/2,ancho:derecha-vanoDer,alto,fondo:espesor,material:muro});
  bloque(pared,{x:puertaCentro,y:(alto+altoPuerta)/2,ancho:anchoPuerta,alto:alto-altoPuerta,fondo:espesor,material:muro});
  for(const borde of [vanoIzq,vanoDer]) bloque(pared,{x:borde,y:altoPuerta/2,ancho:.08,alto:altoPuerta,fondo:.34,material:marco});
  bloque(pared,{x:puertaCentro,y:altoPuerta,ancho:anchoPuerta+.08,alto:.08,fondo:.34,material:marco});
  const puerta=new THREE.Group();
  puerta.name='Puerta abierta de conexión al jardín';
  puerta.position.x=vanoIzq;
  puerta.rotation.y=-70*Math.PI/180;
  pared.add(puerta);
  bloque(puerta,{x:anchoPuerta/2,y:altoPuerta/2,ancho:anchoPuerta-.1,alto:altoPuerta-.08,fondo:.1,material:hojaMat});
  for(const cara of [-1,1]) bloque(puerta,{x:anchoPuerta-.22,y:1.2,z:cara*.12,ancho:.055,alto:.4,fondo:.065,material:marco});
  return pared;
}
export function etiqueta(padre,texto,x,y,z,tipo='zone',extra=''){
  const el=document.createElement('div');
  el.className=(tipo==='tower'?'tower-label ':'zone-label ')+extra;
  el.textContent=texto;
  const obj=new CSS2DObject(el);
  obj.position.set(x,y,z); padre.add(obj);
  return obj;
}
export function lineaSuelo(padre,puntos,color='#9baabd',ancho=.18,y=.36){
  const mat=new THREE.MeshStandardMaterial({color,roughness:.88});
  for(let i=1;i<puntos.length;i++){
    const a=new THREE.Vector2(...puntos[i-1]);
    const b=new THREE.Vector2(...puntos[i]);
    const centro=a.clone().add(b).multiplyScalar(.5);
    bloque(padre,{x:centro.x,y,z:centro.y,ancho:a.distanceTo(b),alto:.035,fondo:ancho,material:mat,rotacion:-Math.atan2(b.y-a.y,b.x-a.x),sombra:false});
  }
}
