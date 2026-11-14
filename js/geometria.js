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

// Rótulo adherido a la fachada, visible también durante el recorrido.
function rotuloFachada(padre,texto,{x=0,y,z=.205,ancho,alto=.48,color='#f4f3ef'}){
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=160;
  const ctx=canvas.getContext('2d');
  ctx.font='600 112px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.shadowColor='rgba(0,0,0,.75)';ctx.shadowBlur=5;ctx.shadowOffsetY=5;
  ctx.fillStyle=color;ctx.fillText(texto,1024,80,2010);
  const textura=new THREE.CanvasTexture(canvas);textura.colorSpace=THREE.SRGBColorSpace;
  const letrero=new THREE.Mesh(new THREE.PlaneGeometry(ancho,alto),
    new THREE.MeshStandardMaterial({map:textura,transparent:true,roughness:.6,depthWrite:false}));
  letrero.name=`Rótulo: ${texto}`;letrero.position.set(x,y,z);
  letrero.userData.sinColision=true;padre.add(letrero);
}

// Dos fachadas del patio de A: huecos reales y hojas que abren hacia el interior.
export function fachadaTorreA(padre,{x,z,largo,baseY,tipo,alto=4.4}){
  const fachada=new THREE.Group();fachada.position.set(x,baseY,z);fachada.rotation.y=Math.PI/2;
  fachada.name=tipo==='estudiantes'?'Fachada de Experiencia Estudiantil':'Fachada de Sala de Conferencias';
  padre.add(fachada);
  const estudiantes=tipo==='estudiantes',altoPuerta=2.7;
  const vanos=estudiantes?[{centro:0,ancho:4.6}]:[
    {centro:-largo*.38-.65,ancho:1.2},{centro:-largo*.38+.65,ancho:1.2},
    {centro:-largo*.14,ancho:1.2},
    {centro:largo*.38-.65,ancho:1.2},{centro:largo*.38+.65,ancho:1.2}
  ];
  const segmentos=[];let inicio=-largo/2;
  for(const v of vanos){
    const izq=v.centro-v.ancho/2,der=v.centro+v.ancho/2;
    if(izq>inicio)segmentos.push({izq:inicio,der:izq,abajo:0,arriba:alto});
    segmentos.push({izq,der,abajo:altoPuerta,arriba:alto});inicio=der;
  }
  segmentos.push({izq:inicio,der:largo/2,abajo:0,arriba:alto});
  const fondo=new THREE.MeshStandardMaterial({color:'#45474e',roughness:.86});
  const tonos=['#73747a','#55565e','#d7d6d0','#86868b','#65666d','#e2e0d8'];
  const anchos=[.82,.55,1.05,.68,.92,.48];
  // Juntas y módulos verticales alternados, recortados alrededor de cada puerta.
  for(const s of segmentos){
    bloque(fachada,{x:(s.izq+s.der)/2,y:(s.abajo+s.arriba)/2,
      ancho:s.der-s.izq,alto:s.arriba-s.abajo,fondo:.3,material:fondo});
  }
  let borde=-largo/2,indice=0;
  while(borde<largo/2-.001){
    const fin=Math.min(largo/2,borde+anchos[indice%anchos.length]);
    const corte=[1.3,2.1,3.2,1.85][indice%4];
    for(const [fila,[abajo,arriba]] of [[0,corte],[corte,alto]].entries()){
      for(const s of segmentos){
        const a=Math.max(borde,s.izq),b=Math.min(fin,s.der);
        const c=Math.max(abajo,s.abajo),d=Math.min(arriba,s.arriba);
        if(b-a>.025&&d-c>.025)bloque(fachada,{x:(a+b)/2,y:(c+d)/2,z:.166,
          ancho:b-a-.018,alto:d-c-.018,fondo:.025,color:tonos[(indice+fila*2)%tonos.length]});
      }
    }
    borde=fin;indice++;
  }
  const metal=new THREE.MeshStandardMaterial({color:estudiantes?'#bec4c7':'#505964',metalness:.7,roughness:.3});
  const vidrio=new THREE.MeshStandardMaterial({color:'#8bbfc7',transparent:true,opacity:.3,
    metalness:.15,roughness:.16,depthWrite:false});
  const esmerilado=new THREE.MeshStandardMaterial({color:'#bdd2d2',transparent:true,opacity:.78,roughness:.6});
  const hojaGris=new THREE.MeshStandardMaterial({color:'#59616c',roughness:.55});
  const hoja=(centro,ancho,cristal,indice)=>{
    const g=new THREE.Group();g.name=cristal?`Hoja delgada de vidrio ${indice}`:`Puerta de conferencias ${indice}`;
    const bisagra=(cristal?indice===2:indice===2||indice===5)?1:-1;
    // Holgura dentro del marco y bisagras opuestas en cada pareja.
    ancho-=.1;
    g.position.x=centro+bisagra*ancho/2;
    g.rotation.y=0;
    g.userData={puerta:true,tipo:cristal?'vidrio':'opaca',centroVano:centro,ancho,espesor:cristal?.035:.065};fachada.add(g);
    Object.assign(g.userData,{puertaAuditorio:!cristal,puertaInteractiva:true,abierta:false,
      anguloAbierto:bisagra*Math.PI/2,colisionDinamica:true});
    const centroHoja=-bisagra*ancho/2;
    bloque(g,{x:centroHoja,y:altoPuerta/2,ancho:ancho-.045,alto:altoPuerta-.06,
      fondo:cristal?.035:.065,material:cristal?vidrio:hojaGris,sombra:!cristal});
    for(const extremo of [0,-bisagra*ancho])bloque(g,{x:extremo,y:altoPuerta/2,
      ancho:.035,alto:altoPuerta,fondo:.07,material:metal});
    for(const y of [.035,altoPuerta-.035])bloque(g,{x:centroHoja,y,
      ancho,alto:.045,fondo:.07,material:metal});
    for(const cara of [-1,1])bloque(g,{x:-bisagra*(ancho-.13),y:1.35,z:cara*.095,
      ancho:.035,alto:cristal?1.35:.44,fondo:.04,material:metal});
    if(cristal){
      bloque(g,{x:centroHoja,y:1.25,ancho:ancho-.05,alto:.42,fondo:.038,material:esmerilado,sombra:false});
      rotuloFachada(g,'SENATI',{x:centroHoja,y:1.23,z:.024,ancho:ancho*.75,alto:.14,color:'#2b4550'});
    }else bloque(g,{x:centroHoja,y:1.75,z:.04,ancho:.18,alto:1.25,fondo:.018,color:'#b7b9b8'});
  };
  for(const v of vanos){
    for(const lado of [-1,1])bloque(fachada,{x:v.centro+lado*v.ancho/2,y:altoPuerta/2,
      ancho:.065,alto:altoPuerta,fondo:.36,material:metal});
    bloque(fachada,{x:v.centro,y:altoPuerta,ancho:v.ancho+.065,alto:.075,fondo:.36,material:metal});
  }
  if(estudiantes){
    const anchoHoja=.9,anchoFijo=(4.6-anchoHoja*2)/2;
    for(const lado of [-1,1]){
      const centro=lado*(anchoHoja+anchoFijo/2);
      bloque(fachada,{x:centro,y:altoPuerta/2,ancho:anchoFijo,alto:altoPuerta,fondo:.035,material:vidrio,sombra:false});
      bloque(fachada,{x:centro,y:1.25,ancho:anchoFijo,alto:.42,fondo:.04,material:esmerilado,sombra:false});
      bloque(fachada,{x:lado*anchoHoja,y:altoPuerta/2,ancho:.065,alto:altoPuerta,fondo:.13,material:metal});
      bloque(fachada,{x:centro,y:.04,ancho:anchoFijo,alto:.075,fondo:.13,material:metal});
    }
    hoja(-anchoHoja/2,anchoHoja,true,1);hoja(anchoHoja/2,anchoHoja,true,2);
  }else vanos.forEach((v,i)=>hoja(v.centro,v.ancho,false,i+1));
  rotuloFachada(fachada,estudiantes?'Experiencia Estudiantil':'Sala de Conferencias',
    {y:3.48,ancho:estudiantes?6.6:9.4,alto:estudiantes?.45:.62});
  // Remate horizontal claro y luminarias discretas bajo el alero.
  bloque(fachada,{y:alto+.09,z:.22,ancho:largo+.1,alto:.18,fondo:.9,color:'#d4d5d3'});
  return fachada;
}
