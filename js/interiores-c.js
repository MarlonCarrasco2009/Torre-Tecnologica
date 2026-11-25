import * as T from 'three';
import {CONFIG,ENTRADA_CAFETERIA} from './config.js';
import {fotosRotulos,letrasCafeteria} from './rotulos-patio-c.js';
import {paredConPuerta} from './geometria.js';
import {zTorreC} from './franja-campus.js';
import {aplicarPiedraPisos} from './piedra-piso.js';
import {mobiliarioC} from './mobiliario-c.js';

// Coordenadas locales del primer piso. El eje X une los dos patios en el video del pasadizo.
const suelo=CONFIG.baseY+.091;
const ejePasadizo=-23,semianchoPasadizo=1.34,fondoAmbientes=6.54;
export const Z_FONDO_SERVICIOS_C=ejePasadizo-semianchoPasadizo-fondoAmbientes;
const torreC=CONFIG.torres.C,semitorre=torreC.ancho/2;
const cierreNorte=-CONFIG.fondoCampus/2+CONFIG.espesorCerco/2-torreC.z;
const cierreSur=CONFIG.fondoCampus/2-torreC.z,inicioComedor=32;
const marfil='#edeae1', grafito='#34383c', acero='#bbc1bf', azul='#204fba';
const prisma=new T.BoxGeometry(1,1,1), cilindro=new T.CylinderGeometry(1,1,1,24);
const materiales=new Map();
const equipar=mobiliarioC({grupo,caja,disco,letrero,baldosas});
function material(color){
  if(typeof color!=='string')return color;
  if(!materiales.has(color)){
    const metal=[acero,'#abbbb9','#bdc9c6'].includes(color);
    const m=new T.MeshStandardMaterial({color,metalness:metal?.62:.025,roughness:metal?.34:.68});
    if(['#a57c58','#b48d68','#d3cfc1'].includes(color)){
      const c=document.createElement('canvas');c.width=c.height=128;
      const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,128,128);
      let semilla=225;
      const azar=()=>((semilla=Math.imul(1664525,semilla)+1013904223>>>0)/4294967296);
      const madera=color!=='#d3cfc1';
      for(let i=0;i<(madera?260:1350);i++){
        ctx.fillStyle='rgba(72,59,46,'+(.025+azar()*.115)+')';
        ctx.fillRect(azar()*128,azar()*128,madera?.6:1+azar()*1.6,madera?5+azar()*32:1+azar());
      }
      m.map=new T.CanvasTexture(c);m.map.colorSpace=T.SRGBColorSpace;m.map.anisotropy=4;
    }
    if(color==='#fff1d3'){m.emissive.set('#fff2d7');m.emissiveIntensity=.45;}
    materiales.set(color,m);
  }
  return materiales.get(color);
}
function pieza(g,n,geo,x,y,z,a,h,f,color){
  const m=new T.Mesh(geo,material(color));m.name=n;m.position.set(x,y,z);m.scale.set(a,h,f);
  m.receiveShadow=true;m.castShadow=true;g.add(m);return m;
}
function caja(g,n,x,y,z,a,h,f,color){return pieza(g,n,prisma,x,y,z,a,h,f,color);}
function disco(g,n,x,y,z,r,h,color){return pieza(g,n,cilindro,x,y,z,r,h,r,color);}
function grupo(g,n,x=0,y=0,z=0){
  const p=new T.Group();p.name=n;p.position.set(x,y,z);g.add(p);return p;
}
function letrero(g,texto,x,y,z,ancho,alto,giro=0,fondo='#174784',tinta='#ffffff'){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.fillStyle=fondo;ctx.fillRect(0,0,512,128);
  ctx.fillStyle=tinta;ctx.font='bold 72px Arial';ctx.textBaseline='middle';ctx.textAlign='center';
  const lineas=texto.split('\n');
  if(lineas.length>1)ctx.font='bold '+Math.floor(100/lineas.length)+'px Arial';
  lineas.forEach((linea,i)=>ctx.fillText(linea,256,(i+.5)*128/lineas.length,480));const mapa=new T.CanvasTexture(canvas);mapa.colorSpace=T.SRGBColorSpace;
  const m=new T.Mesh(new T.PlaneGeometry(ancho,alto),new T.MeshStandardMaterial({map:mapa,roughness:.75}));
  m.name=texto;m.position.set(x,y,z);m.rotation.y=giro;m.userData.sinColision=true;g.add(m);return m;
}
const tintasPlaca=new Map();
function placaDelVideo(g,clave,nombre,x,y,z,ancho,alto,giro=0){
  if(!tintasPlaca.has(clave)){
    const foto=fotosRotulos[clave],rgb=atob(foto.rgb),rgba=new Uint8Array(foto.ancho*foto.alto*4);
    for(let i=0;i<rgba.length/4;i++){
      for(let canal=0;canal<3;canal++)rgba[4*i+canal]=rgb.charCodeAt(3*i+canal);
      rgba[4*i+3]=255;
    }
    const mapa=new T.DataTexture(rgba,foto.ancho,foto.alto);
    mapa.colorSpace=T.SRGBColorSpace;mapa.flipY=true;mapa.generateMipmaps=true;
    mapa.minFilter=T.LinearMipmapLinearFilter;mapa.magFilter=T.LinearFilter;mapa.needsUpdate=true;
    tintasPlaca.set(clave,new T.MeshStandardMaterial({map:mapa,roughness:.62}));
  }
  const p=new T.Mesh(new T.PlaneGeometry(ancho,alto),tintasPlaca.get(clave));
  p.name=nombre;p.position.set(x,y,z);p.rotation.y=giro;p.userData.sinColision=true;g.add(p);return p;
}
function baldosas(g,n,x,z,a,f,color,junta,paso){
  const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');
  ctx.fillStyle=junta;ctx.fillRect(0,0,128,128);ctx.fillStyle=color;ctx.fillRect(1,1,126,126);
  const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(a/paso,f/paso);
  t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;
  const m=new T.Mesh(new T.PlaneGeometry(a,f),new T.MeshStandardMaterial({map:t,roughness:.52}));
  m.name=n;m.rotation.x=-Math.PI/2;m.position.set(x,0,z);m.receiveShadow=true;g.add(m);return m;
}
function silla(g,x,z,lado){
  const s=grupo(g,'Silla azul moldeada',x,0,z);s.rotation.y=lado>0?0:Math.PI;
  caja(s,'Asiento',0,.45,0,.49,.075,.48,azul);
  const res=caja(s,'Respaldo',0,.68,.22,.48,.43,.065,azul);res.rotation.x=.1;
  for(const dx of [-.19,.19])for(const dz of [-.18,.18])disco(s,'Pata tubular',dx,.215,dz,.017,.43,acero);
  return s;
}
function mesa(g,x,z,larga=false){
  const m=grupo(g,'Mesa de comedor',x,0,z);
  const ancho=larga?4.18:2.35;
  caja(m,'Tablero claro',0,.77,0,ancho,.075,1.05,'#e7e4dc');
  for(const lado of [-1,1])for(const dz of [-.41,.41])disco(m,'Pata',lado*(ancho/2-.19),.365,dz,.031,.73,grafito);
  for(const d of [-1,1])for(const dx of (larga?[-1.39,0,1.39]:[-.64,.64]))silla(m,dx,d*.88,d);
}
function carro(g,x,z,bandejas=true){
  const c=grupo(g,bandejas?'Carro escurridor de bandejas':'Carro auxiliar de acero',x,0,z);
  const alto=bandejas?1.75:1.05;
  for(const dx of [-.38,.38])for(const dz of [-.28,.28]){
    disco(c,'Rueda',dx,.09,dz,.075,.12,grafito).rotation.x=Math.PI/2;
    disco(c,'Montante',dx,alto/2+.14,dz,.025,alto,acero);
  }
  for(let y=.2;y<=alto+.06;y+=bandejas?.14:.41){
    if(!bandejas||y<.49)caja(c,'Bandeja',0,y,0,.8,.035,.59,acero);
    else for(const lado of [-1,1])caja(c,'Guía para bandeja',lado*.351,y,0,.071,.026,.57,acero);
  }
}
const cristal=new T.MeshStandardMaterial({color:'#c5dcda',transparent:true,opacity:.22,roughness:.14,metalness:.13,depthWrite:false});
const satin=new T.MeshStandardMaterial({color:'#d4dedb',transparent:true,opacity:.68,roughness:.56,depthWrite:false});
function hojasDobles(marco,vano,alto,zCampus,abreHacia,acristalada,apertura=Math.PI/2){
  for(const lado of [-1,1]){
    const pivote=lado*(vano/2-.051);
    caja(marco,'Jamba de aluminio',0,alto/2,lado*(vano/2-.023),.105,alto,.046,acero);
    const hoja=grupo(marco,lado<0?'Hoja izquierda':'Hoja derecha',0,0,pivote);
    // El campus remapea los pivotes. La longitud rígida debe terminar en el eje de encuentro.
    const luz=zCampus===null?Math.abs(pivote):Math.abs(zTorreC(zCampus+pivote)-zTorreC(zCampus));
    const ancho=luz-.008;
    const medio=-lado*ancho/2;
    const giro=-lado*abreHacia*apertura;
    Object.assign(hoja.userData,{puerta:true,puertaInteractiva:true,colisionDinamica:true,grupoPuertas:marco.uuid,
      abierta:true,anguloAbierto:giro});
    hoja.rotation.y=giro;
    caja(hoja,acristalada?'Cristal de la hoja':'Hoja lavable de cocina',0,alto/2,medio,.05,alto-.055,ancho,acristalada?cristal:'#dddcd4');
    const herrajes=grupo(hoja,'Perfiles y tiradores');herrajes.userData.sinColision=true;
    for(const borde of [.017,ancho-.017])caja(herrajes,'Perfil de canto',0,alto/2,-lado*borde,.067,alto-.035,.034,acero);
    for(const y of [.045,alto-.047])caja(herrajes,'Travesaño',0,y,medio,.069,.065,ancho,acero);
    for(const cara of [-1,1]){
      if(acristalada)caja(herrajes,'Franja esmerilada',cara*.029,1.25,medio,.004,.47,ancho-.063,satin);
      else caja(herrajes,'Protección inferior de acero',cara*.029,.24,medio,.009,.39,ancho-.07,acero);
      const largo=acristalada?1.14:.48,z=-lado*(ancho-.14);
      for(const y of [1.21-largo*.41,1.21+largo*.41])caja(herrajes,'Anclaje',cara*.066,y,z,.083,.032,.035,acero);
      disco(herrajes,'Tirador tubular',cara*.108,1.21,z,.021,largo,acero);
    }
  }
  caja(marco,'Cabezal común',0,alto,0,.115,.07,vano,acero);
}
export function mamparaComedor(g,nombre,x,y,z,largo,alto,abreHacia,offsetZ=0,vano=3.05,altoPuerta=2.85){
  const f=grupo(g,nombre,x,y,z);
  hojasDobles(f,vano,altoPuerta,z+offsetZ,abreHacia,true,abreHacia>0?Math.PI*.943:Math.PI/2);
  caja(f,'Montante superior de vidrio',0,(alto+altoPuerta)/2,0,.048,alto-altoPuerta-.045,vano,cristal);
  const vanos=Math.ceil((largo-vano)/2/2.25),paso=(largo-vano)/2/vanos;
  for(const lado of [-1,1])for(let i=0;i<vanos;i++){
    const centro=lado*(vano/2+(i+.5)*paso);
    caja(f,'Paño fijo de vidrio',0,alto/2,centro,.046,alto-.09,paso,cristal);
    caja(f,'Franja esmerilada del paño',0,1.25,centro,.055,.47,paso-.05,satin);
    caja(f,'Perfil vertical',0,alto/2,lado*(vano/2+(i+1)*paso),.11,alto,.05,grafito);
    caja(f,'Perfil a ras del piso',0,.044,centro,.105,.088,paso,grafito);
  }
  caja(f,'Perfil de cabecera',0,alto,0,.13,.08,largo,grafito);
  return f;
}
function frenteVidrio(g){
  const {z,ancho,alto}=ENTRADA_CAFETERIA;
  mamparaComedor(g,'Entrada de cafetería desde el patio interior',8.6,0,z,20,3.5,1,CONFIG.torres.C.z,ancho,alto);
  for(let i=0;i<24;i++)caja(g,'Revestimiento sobre los ventanales',8.6,3.75,12+(i+.5)*20/24,.19,.48,20/24-.014,
    ['#77787b','#e6e4db','#bcbeb9','#626468','#e1dfd8'][i%5]);
  const contorno=new T.ShapePath();
  for(const trazo of letrasCafeteria){
    contorno.moveTo(trazo[0],trazo[1]);
    for(let i=2;i<trazo.length;i+=2)contorno.lineTo(trazo[i],trazo[i+1]);
    contorno.currentPath.closePath();
  }
  const letras=new T.ExtrudeGeometry(contorno.toShapes(false),{depth:.095,bevelEnabled:false});
  const titulo=new T.Mesh(letras,[material('#fff9e9'),material('#575756')]);
  titulo.name='Cafetería · letras en relieve';titulo.position.set(8.716,3.76,z);titulo.rotation.y=Math.PI/2;
  titulo.scale.set(.58,.39,.65);titulo.castShadow=true;g.add(titulo);
  const atril=grupo(g,'Pizarra de menú',8.25,0,z-ancho/2-.70);atril.rotation.y=Math.PI/2;
  for(const dx of [-.38,.38])for(const d of [-1,1])caja(atril,'Pata de madera',dx,.53,d*.16,.055,1.07,.065,'#926848').rotation.x=-d*.2;
  caja(atril,'Marco',0,.82,0,.83,.94,.08,'#926848');
  placaDelVideo(atril,'menu','Pizarra de tiza del video',0,.82,.043,.73,.82);
  caja(g,'Umbral de la mampara',8.6,.008,z,.16,.016,ancho-.10,acero).userData.sinColision=true;
  const caucho=document.createElement('canvas');caucho.width=caucho.height=32;
  const ctx=caucho.getContext('2d');ctx.fillStyle='#414440';ctx.fillRect(0,0,32,32);
  ctx.fillStyle='#282d2b';ctx.fillRect(0,0,32,8);ctx.fillStyle='#555a55';ctx.fillRect(0,8,32,3);
  const estrias=new T.CanvasTexture(caucho);estrias.wrapS=estrias.wrapT=T.RepeatWrapping;estrias.repeat.set(1,68);
  estrias.colorSpace=T.SRGBColorSpace;estrias.anisotropy=8;
  const goma=new T.MeshStandardMaterial({map:estrias,roughness:.97});
  caja(g,'Felpudo de ingreso',9.5,.013,z,1.52,.022,ancho-.28,goma).userData.sinColision=true;
  // La línea amarilla del video queda sobre la pizarra frente a la mampara.
  const pintura=new T.RingGeometry(1.87,1.94,54,1,-Math.PI*.43,Math.PI*.86);
  pintura.rotateX(-Math.PI/2);
  const arco=new T.Mesh(pintura,material('#d9ad44'));arco.name='Arco amarillo frente a la cafetería';
  arco.position.set(9.46,-.071,z);arco.scale.z=1/CONFIG.escalaLongitudinalCampus;
  arco.userData.sinColision=true;g.add(arco);
}
function techo(g,n,x,z,a,f,color){
  const t=grupo(g,n,x,0,z);t.userData.sinColision=true;
  const tapa=new T.Mesh(new T.PlaneGeometry(a,f),material(color));tapa.rotation.x=Math.PI/2;
  tapa.position.y=3.95;t.add(tapa);return t;
}
function cafeteria(g){
  const cafe=grupo(g,'Cafetería interior');
  baldosas(cafe,'Porcelanato claro',-.95,22,19.1,20,'#e8e5de','#a7a49b',.8);
  frenteVidrio(cafe);
  for(const x of [-6.3,4.7])for(const z of [15.4,20.5,26,x<0?29.15:30.2]){
    const larga=z===20.5||z===26;
    mesa(cafe,x+(larga&&x<0?.60:0),z,larga);
  }
  for(const z of [18,26.8]){
    disco(cafe,'Base circular negra',-.9,.045,z,.5,.09,grafito);
    disco(cafe,'Pedestal',-.9,.4,z,.075,.72,grafito);
    disco(cafe,'Mesa redonda',-.9,.8,z,.8,.065,'#e7e2d6');
    for(const angulo of [-Math.PI/2,Math.PI/2,Math.PI]){
      silla(cafe,-.9+1.02*Math.sin(angulo),z+1.18*Math.cos(angulo),1).rotation.y=angulo;
    }
  }
  for(const z of [16.4,28.9]){disco(cafe,'Columna blanca',1.4,1.91,z,.48,3.82,marfil);}
  carro(cafe,-1.8,24.4);carro(cafe,-2.8,24.4);
  // En la toma del comedor se ven mesas de apoyo con cajas azules detrás del bandejero.
  const retorno=grupo(cafe,'Estación de bandejas y cajas azules',-7.6,0,cierreSur-.62);
  for(const dx of [-1.06,1.06]){
    caja(retorno,'Mesa auxiliar de retorno',dx,.84,0,2.02,.065,.68,'#e1ddd3');
    for(const lado of [-.88,.88])for(const dz of [-.26,.26])disco(retorno,'Pie de mesa auxiliar',dx+lado,.40,dz,.024,.80,grafito);
    caja(retorno,'Base de caja azul',dx,.9,0,.92,.055,.47,'#244a80');
    for(const dz of [-.23,.23])caja(retorno,'Costado de caja azul',dx,1.09,dz,.92,.35,.04,'#35649d');
    for(const lado of [-.44,.44])caja(retorno,'Testero de caja azul',dx+lado,1.09,0,.04,.35,.46,'#254d84');
  }
  carro(cafe,-9.79,cierreSur-1.61);
  const senal=grupo(retorno,'Señal plegable de piso húmedo',1.92,0,-.86);
  for(const lado of [-1,1]){
    const tablero=caja(senal,'Panel amarillo',0,.30,lado*.109,.30,.57,.025,'#e5b334');tablero.rotation.x=-lado*.34;
    letrero(tablero,'!',0,.02,lado*.54,.62,.54,lado<0?Math.PI:0,'#e5b334','#37362f');
  }
  const mostrador=grupo(cafe,'Línea de atención',-.7,0,12.65);
  caja(mostrador,'Frente de acero',0,.49,0,7,.98,.86,acero);
  caja(mostrador,'Encimera',0,1.02,0,7.16,.09,.98,'#bcbab0');
  for(let i=-2;i<=2;i++)caja(mostrador,'Cubeta',i*1.18,1.083,0,.91,.035,.62,'#747e7b');
  for(const [i,tono] of ['#b7824b','#b9a168','#929955','#b56a45','#a99b68'].entries()){
    caja(mostrador,'Inserto gastronorm',(i-2)*1.18,1.105,0,.79,.024,.49,tono);
    caja(mostrador,'Mango de utensilio',(i-2)*1.18+.29,1.14,.18,.035,.035,.30,acero).rotation.y=-.35;
  }
  const cajaCafe=grupo(cafe,'Caja y entrega de servicio',-6.29,0,12.74);
  caja(cajaCafe,'Módulo de caja',0,.49,0,3.04,.94,.86,'#64736b');
  caja(cajaCafe,'Encimera de caja',0,1,0,3.15,.081,.96,'#cec7b6');
  caja(cajaCafe,'Base del terminal',.55,1.064,0,.46,.05,.32,grafito);
  caja(cajaCafe,'Soporte del terminal',.55,1.19,0,.09,.24,.08,acero);
  const terminal=caja(cajaCafe,'Pantalla de caja',.55,1.42,-.025,.58,.38,.058,grafito);terminal.rotation.x=.17;
  caja(terminal,'Pantalla de atención',0,0,-.54,.88,.80,.04,'#486574');
  for(let i=0;i<8;i++)disco(cajaCafe,'Platillo de entrega',-.77,1.055+i*.02,.07,.21,.022,marfil);
  const vidrio=new T.MeshStandardMaterial({color:'#bcdad7',transparent:true,opacity:.23,depthWrite:false});
  caja(mostrador,'Protección de vidrio',0,1.38,.4,6.92,.57,.035,vidrio);
  for(const dx of [-3.45,0,3.45])disco(mostrador,'Soporte de vitrina',dx,1.37,.4,.024,.65,acero);
  const fila=grupo(cafe,'Guía tubular frente a la línea de atención',-.65,0,15.16);
  for(const dx of [-2.83,0,2.83]){
    disco(fila,'Platina anclada al piso',dx,.025,0,.095,.05,acero);
    disco(fila,'Poste del pasafila',dx,.46,0,.033,.90,acero);
  }
  for(const altura of [.57,.91])disco(fila,'Tubo horizontal',0,altura,0,.028,5.68,acero).rotation.z=Math.PI/2;
  const bandejero=grupo(cafe,'Bandejas rojas junto a columna',1.43,0,15.58);
  caja(bandejero,'Carrito',0,.7,0,.94,.07,.56,acero);
  for(const dx of [-.39,.39])for(const dz of [-.21,.21])disco(bandejero,'Pie tubular',dx,.36,dz,.024,.72,acero);
  for(let i=0;i<16;i++)caja(bandejero,'Bandeja roja',0,.76+i*.027,0,.83,.022,.48,i%2?'#bb352b':'#cc4934');
  for(const dx of [-3.75,-1.8,.15,2.1])letrero(cafe,['Bebidas','Menú','Cafetería','Postres'][Math.round((dx+3.75)/1.95)],dx,2.86,11.99,1.65,.38,0,'#465754');
  const papelera=grupo(cafe,'Papelera junto a la entrada',7.47,0,18.22);
  disco(papelera,'Cuba de papelera',0,.34,0,.245,.68,'#666e6b');
  const tapa=pieza(papelera,'Tapa basculante negra',new T.SphereGeometry(1,22,12,0,Math.PI*2,0,Math.PI/2),0,.68,0,.26,.19,.26,'#323838');
  caja(papelera,'Ranura de depósito',.218,tapa.position.y+.057,0,.04,.092,.22,'#202627');
  const techoCafe=techo(cafe,'Techo visto · cafetería',-.95,22,19.1,20,'#303a3a');
  for(const dx of [-7,1,6]){
    caja(techoCafe,'Conducto galvanizado',dx,3.57,0,.56,.31,19.9,'#929b96');
    for(let dz=-9;dz<10;dz+=2)caja(techoCafe,'Junta de conducto',dx,3.57,dz,.59,.33,.032,acero);
  }
  for(const dz of [-7.4,-1.9,3.6,8]){
    caja(techoCafe,'Tubería roja',0,3.7,dz,18.7,.072,.072,'#923e36');
    for(const dx of [-4.3,3.3]){
      disco(techoCafe,'Suspensión',dx,3.56,dz,.011,.65,grafito);
      disco(techoCafe,'Foco colgante',dx,3.19,dz,.11,.18,grafito);
      disco(techoCafe,'Difusor',dx,3.094,dz,.097,.016,'#fff1c5');
    }
  }
  equipar.cafeteria(cafe,cierreSur-.99);
  for(const x of [-6.2,4.75])mesa(cafe,x,inicioComedor+2.20,true);
  return techoCafe;
}
function paneles(g,x,desde,hasta,huecos){
  const colores=['#898b8c','#e0dfd7','#636468','#b5b6b2','#f0eee5','#76767a'];
  const secuencias=[.78,.5,1.05,.71,.64];let indice=0;
  const limites=[desde,...huecos.flat(),hasta];
  for(let i=0;i<limites.length;i+=2){
    let borde=limites[i];
    if(x>0)caja(g,'Zócalo granate del patio',x+.052,.105,(borde+limites[i+1])/2,.073,.21,limites[i+1]-borde,'#593e40');
    while(borde<limites[i+1]-.005){
      const ancho=Math.min(secuencias[indice%5],limites[i+1]-borde);
      const corte=[1.06,2.65,1.84,3.2][indice%4];
      for(const [inferior,superior,tono] of [[0,corte,indice],[corte,3.92,indice+3]])
        caja(g,'Panel de fachada',x,(inferior+superior)/2,borde+ancho/2,.15,superior-inferior-.014,Math.max(.006,ancho-.013),colores[tono%6]);
      borde+=ancho;indice++;
    }
  }
  for(const [a,b] of huecos)caja(g,'Dintel',x,3.48,(a+b)/2,.18,.88,b-a,'#acada8');
}
function puerta(g,x,z,largo,giro,texto,oscura=false,abierta=false){
  const p=paredConPuerta(g,{x,z,largo,baseY:0,alto:3.88,rotacion:giro,colorMuro:marfil,colorMarco:oscura?grafito:'#d1d0c8',
    colorPuerta:oscura?'#384447':'#ebe9df',altoPuerta:2.45,manijaPalanca:true,interactiva:true});
  const hoja=p.children.find(o=>o.userData.puertaInteractiva);hoja.name='Puerta · '+texto;
  hoja.userData.abierta=abierta;hoja.rotation.y=abierta?hoja.userData.anguloAbierto:0;
  if(texto==='SS-HH')placaDelVideo(hoja,'sshh','Placa azul SS-HH',.675,1.66,.058,.40,.34);
  else letrero(hoja,texto,.675,1.66,.058,.58,.19);
  if(!oscura)for(let i=0;i<6;i++)caja(hoja,'Rejilla de ventilación',.675,.19+i*.047,.057,.87,.018,.018,'#bebeb6');
  return p;
}
function cocina(g){
  const c=grupo(g,'Cocina y acceso de servicio');
  baldosas(c,'Baldosa terracota',-.95,2.4,19.1,19.2,'#be9380','#815f54',.49);
  for(const [x,nombre] of [[-10.47,'Puerta doble de cocina al parque'],[8.6,'Puerta doble de cocina al patio']]){
    const marco=grupo(c,nombre,x,0,5.825);
    hojasDobles(marco,2.35,2.54,5.825+CONFIG.torres.C.z,-1,false);
    caja(marco,'Sobrepuerta fija',0,2.81,0,.10,.47,2.35,'#c7c9c2');
  }
  for(const z of [-7.15,11.92]){ // Abertura de paso detrás del mostrador.
    if(z<0){
      caja(c,'Tabique de cocina',(-10.5+1.62)/2,1.93,z,12.12,3.86,.15,marfil);
      puerta(c,3.01,z,2.78,0,'Despensa',false,true);
      caja(c,'Cierre tras cocción',6.50,1.93,z,4.2,3.86,.15,marfil);
    }
    else{
      caja(c,'Antepecho del pase',-2.7,.48,z,15.6,.96,.15,marfil);
      caja(c,'Dintel del pase',-2.7,3.29,z,15.6,1.14,.15,marfil);
      for(const x of [-7.65,4.65])caja(c,'Jamba del pase',x,1.83,z,x<0?5.7:.9,1.74,.15,marfil);
    }
    if(z>0)caja(c,'Retorno de cocina',7.85,1.93,z,1.5,3.86,.15,marfil);
  }
  const pasePersonal=grupo(c,'Puerta doble entre cocina y comedor',6.1,0,11.92);
  pasePersonal.rotation.y=Math.PI/2;
  hojasDobles(pasePersonal,2,2.54,null,1,false);
  caja(pasePersonal,'Dintel del paso de personal',0,3.22,0,.15,1.28,2,marfil);
  for(const x of [-6.7,-2.2,2.3]){
    const banco=grupo(c,'Mesa de trabajo de acero',x,0,-4.8);
    caja(banco,'Encimera',0,.92,0,3.45,.095,.88,acero);
    caja(banco,'Repisa inferior',0,.25,0,3.17,.05,.7,acero);
    for(const dx of [-1.46,1.46])for(const dz of [-.31,.31])disco(banco,'Pata',dx,.45,dz,.035,.9,acero);
    caja(banco,'Estante mural',0,1.68,-.44,3.25,.06,.44,acero);
  }
  const cubeta=disco(c,'Recipiente verde',-6.7,1.08,-4.75,.32,.23,'#85aa36');
  disco(c,'Interior del recipiente',cubeta.position.x,1.198,-4.75,.26,.009,'#557621');
  for(const x of [-3.1,-2.3,-1.5])disco(c,'Olla',x,1.12,-4.8,.25,.3,acero);
  caja(c,'Mesa de lavado',-8.9,.84,3.8,1.05,.23,2.3,acero);
  for(const z of [3.32,4.28])caja(c,'Cubeta de lavado',-8.9,.965,z,.75,.035,.74,'#687470');
  disco(c,'Grifo',-9.25,1.13,3.84,.03,.36,acero);
  caja(c,'Caño',-9.1,1.3,3.84,.31,.047,.05,acero);
  carro(c,-10.98,4.03,false);
  const lavado=grupo(c,'Preparación junto a la puerta',-8.9,0,6.95);
  caja(lavado,'Mesa de preparación',0,.88,0,1.57,.09,.68,acero);
  for(const dx of [-.69,.69])for(const dz of [-.26,.26])disco(lavado,'Pata',dx,.42,dz,.026,.84,acero);
  disco(lavado,'Bol verde',0,1.055,0,.27,.25,'#80b53b');disco(lavado,'Interior del bol',0,1.184,0,.228,.008,'#51892e');
  disco(c,'Cubo de acero',-9.12,.4,4.71,.28,.8,acero);disco(c,'Boca del cubo',-9.12,.807,4.71,.245,.012,'#404845');
  const utiles=grupo(c,'Material de servicio',-11.03,0,1.9);
  caja(utiles,'Caja azul calada',0,.22,0,.67,.44,.48,azul);
  for(let i=0;i<5;i++)caja(utiles,'Abertura',-.34,.24,-.18+i*.09,.009,.18,.045,grafito);
  caja(utiles,'Cartón',0,.64,0,.58,.39,.41,'#b99571');
  disco(c,'Cubo con tapa',-10.97,.46,-1.4,.31,.9,'#858b85');
  disco(c,'Tapa',-10.97,.925,-1.4,.34,.045,'#a2a59d');
  caja(c,'Contenedor marrón',-11,.48,-2.35,.58,.88,.58,'#965f4c');
  caja(c,'Tapa de contenedor',-11,.94,-2.35,.64,.08,.63,'#ae7361');
  const cielo=techo(c,'Cielo de cocina',-.95,2.4,19.1,19.2,marfil);
  equipar.cocina(c,cielo);
  return cielo;
}
function pasadizos(g){
  const p=grupo(g,'Pasadizo transversal de Ambiente C');
  const piso=caja(p,'Pizarra del pasadizo',-.95,-.012,-23,19.2,.024,2.55,CONFIG.acabados.piso);
  aplicarPiedraPisos([piso],CONFIG.acabados.piso);
  for(const lado of [-1,1]){
    const z=ejePasadizo+lado*semianchoPasadizo;
    // Divisiones con vanos transitables hacia los ambientes de cada costado.
    const cortes=lado<0?[-10.5,-3.5,3.4,8.6]:[-10.5,-5.2,1.2,8.6];
    for(let i=0;i<3;i++){
      const cuarto=(cortes[i]+cortes[i+1])/2;
      if(lado>0&&i<2){
        // El giro a la derecha en 1.09.30 muestra dos hojas enfrentadas en un pequeño retranqueo.
        const borde=-5.2+(i===0?-1.14:1.14);
        const extremo=i===0?cortes[0]:cortes[2];
        caja(p,'Muro del pasadizo',.5*(borde+extremo),1.94,z,Math.abs(borde-extremo),3.88,.16,marfil);
        puerta(p,borde,z+1.16,2.32,i===0?Math.PI/2:-Math.PI/2,'SS-HH');
        if(i===0)caja(p,'Fondo del retranqueo',-5.2,1.94,z+2.32,2.35,3.88,.14,marfil);
        equipar.sanitarioPersonal(p,cuarto,z+3.3,cortes[i+1]-cortes[i]);
      }else{
        const oficina=lado<0&&i===1;
        const pta=puerta(p,cuarto,z,cortes[i+1]-cortes[i],lado<0?0:Math.PI,
          oficina?'Vigilancia\nTorre C':i===2?'Servicio':'Ambiente C',oficina,lado>0&&i===2);
        if(oficina){
          placaDelVideo(pta,'vigilancia','Vigilancia C-120 · capacidad 3',-1.08,1.68,.164,.59,.37);
          caja(pta,'Lector junto a la puerta',-.90,1.11,.177,.085,.18,.059,'#353b3a');
          const hoja=pta.children.find(o=>o.userData.puertaInteractiva);
          letrero(hoja,'PROHIBIDO\nEL INGRESO',.27,1.66,.060,.22,.24,0,'#ac3833');
          equipar.vigilancia(p,cuarto,z-3.3);
        }else equipar.apoyo(p,cuarto,z,cortes[i+1]-cortes[i],lado,i,lado<0?Z_FONDO_SERVICIOS_C-cierreNorte-.14:0);
      }
      const retraido=lado>0&&i===1;
      caja(p,'Tabique entre ambientes',cortes[i],1.93,z+lado*(retraido?4.42:3.30),.13,3.86,retraido?4.15:6.5,marfil);
    }
    if(lado>0)caja(p,'Muro de fondo',-.95,1.93,z+fondoAmbientes,19.1,3.86,.15,marfil);
  }
  const tablero=grupo(p,'Tablero eléctrico',-4,1.42,-24.14);
  caja(tablero,'Gabinete',0,0,0,.65,.91,.18,'#a6a9a1');
  letrero(tablero,'⚡',0,-.08,.097,.27,.28,0,'#efc444','#241e14');
  caja(tablero,'Indicador',0,.22,.099,.13,.085,.016,'#5a8190');
  const gabinete=grupo(p,'Gabinete de manguera 54',7.0,0,-24.18);
  caja(gabinete,'Cerco de acero',0,1.12,0,.49,1.14,.073,'#a5aba9');
  caja(gabinete,'Hoja de gabinete',0,1.12,.041,.429,1.07,.018,'#626a6b');
  letrero(gabinete,'54',0,1.50,.055,.35,.19,0,'#f5f0de','#262b2c');
  letrero(gabinete,'GABINETE CONTRA\nINCENDIO',0,1.28,.055,.36,.17,0,'#9c3039');
  letrero(gabinete,'54 · MANGUERA',0,1.99,.011,.48,.25,0,'#ac3543');
  const carroAseo=grupo(p,'Carro de limpieza',6.65,0,-22.05);
  caja(carroAseo,'Base',0,.17,0,.78,.11,.43,'#383f40');
  caja(carroAseo,'Bolsa azul',-.18,.64,0,.37,.77,.38,'#277395');
  caja(carroAseo,'Balde',.23,.39,0,.27,.34,.29,'#dcab40');
  disco(carroAseo,'Mango de escoba',.22,1,0,.018,1.35,'#bc9369');
  const aseo=grupo(g,'Vestíbulo de servicios higiénicos',6.5,0,-11.9);
  puerta(aseo,0,-1.25,4.2,0,'Servicio higiénico\nCaballeros',false,true);
  puerta(aseo,0,1.25,4.2,Math.PI,'♿\nServicio accesible');
  puerta(aseo,-2.08,0,2.52,Math.PI/2,'Servicio higiénico\nDamas');
  letrero(aseo,'↑\nMUJERES',2.21,1.97,-1.46,.29,.40,Math.PI/2,'#252a29');
  letrero(aseo,'↑\nHOMBRES',2.21,1.53,-1.46,.29,.40,Math.PI/2,'#252a29');
  placaDelVideo(aseo,'higiene','Cartel de lavado de manos',-1.904,1.83,.902,.62,.43,Math.PI/2);
  const limpieza=grupo(aseo,'Carro azul del vestíbulo',-1.44,0,.86);
  caja(limpieza,'Chasis',0,.17,0,.69,.12,.43,'#566f70');
  for(const dx of [-.28,.28])for(const dz of [-.16,.16])disco(limpieza,'Rueda',dx,.095,dz,.083,.06,grafito).rotation.x=Math.PI/2;
  caja(limpieza,'Bolsa de limpieza',-.16,.55,0,.31,.65,.35,'#185c98');
  for(const dx of [-.30,.29])caja(limpieza,'Montante',dx,.63,-.15,.035,.86,.033,acero);
  caja(limpieza,'Bandeja de útiles',0,1.03,0,.73,.044,.43,'#577576');
  disco(limpieza,'Balde naranja',.12,1.17,0,.135,.23,'#c97d43');
  for(const dx of [-.20,-.07])disco(limpieza,'Botella',dx,1.145,.02,.042,.18,'#83baaf');
  caja(limpieza,'Mango',.25,.89,-.12,.022,1.38,.022,'#a28d68').rotation.x=-.10;
  equipar.banos(aseo);
  const nicho=grupo(g,'Nicho de servicio desde el parque',-9.47,0,-10.8);
  for(const d of [-1,1])caja(nicho,'Jamba profunda',0,1.93,1.7*d,2,3.86,.12,marfil);
  puerta(g,-8.42,-10.8,3.4,-Math.PI/2,'Servicio');
  const cuarto=grupo(g,'Reserva y aseo de cocina',-5.2,0,-11.25);
  baldosas(cuarto,'Loseta de reserva',0,0,6.1,6.8,'#bcbdb3','#8b9186',.6);
  equipar.balda(cuarto,-1.33,-2.85,2.65);equipar.balda(cuarto,1.53,-2.85,2.45);
  const almacen=grupo(cuarto,'Estantes de reserva y material limpio',-1.10,0,2.92);
  almacen.rotation.y=Math.PI;equipar.balda(almacen,0,0,2.65);
  const ropa=grupo(cuarto,'Carro de ropa de trabajo',.22,0,.74);
  for(const dx of [-.45,.45])for(const dz of [-.28,.28])disco(ropa,'Rueda',dx,.10,dz,.08,.08,grafito).rotation.x=Math.PI/2;
  caja(ropa,'Cesta textil',0,.55,0,.96,.75,.64,'#839a9b');
  for(const dz of [-.32,.32])caja(ropa,'Marco de carro',0,.95,dz,1.02,.045,.04,acero);
  caja(cuarto,'Lavadero de servicio',1.96,.57,2.38,1.24,.99,.72,marfil);
  caja(cuarto,'Pila del lavadero',1.96,1.075,2.38,.91,.026,.48,'#839693');
  caja(cuarto,'Grifo mural',1.96,1.34,2.66,.05,.36,.075,acero);
  caja(cuarto,'Cierre del depósito al este',3.55,1.92,0,.13,3.84,7.5,marfil);
  return techo(p,'Cielo del pasadizo',-.95,-23,19.1,2.67,marfil);
}
function cerrarExtremos(g){
  const cubiertas=grupo(g,'Cubiertas de los extremos de Torre C');
  const alto=3.94,espesor=.16,ancho=torreC.ancho;
  const cierres=[[cierreNorte,-31,false],[inicioComedor,cierreSur,true]];
  for(const [desde,hasta,comedor] of cierres){
    const centro=(desde+hasta)/2,fondo=hasta-desde;
    const sala=grupo(g,comedor?'Ampliación del comedor':'Ampliación de ambientes de servicio');
    const extremo=comedor?hasta:desde,union=comedor?desde:hasta,signo=comedor?1:-1;
    // La base maciza exterior continúa debajo. Este recrecido lleva el acabado
    // hasta la cota real del interior y cubre también el retorno hacia el patio.
    caja(sala,'Recrecido interior',0,-.048,centro,ancho,.080,fondo,'#a9aaa2');
    const zTestero=extremo-signo*espesor/2;
    caja(sala,'Testero cerrado',0,alto/2,zTestero,ancho,alto,espesor,marfil);
    caja(sala,'Zócalo interior del testero',0,.082,zTestero-signo*.089,ancho-.30,.164,.026,'#90948d');
    // El lateral este de la planta principal termina en x=8.6. El retorno
    // completa la esquina hasta el ancho de la torre sin cortar la puerta existente.
    const retorno=grupo(sala,'Retorno al muro del patio',(8.6+semitorre)/2,0,union+signo*.075);
    caja(retorno,'Núcleo de esquina',0,alto/2,0,semitorre-8.6,alto,.15,comedor?marfil:'#898a87');
    if(comedor){
      for(const [i,color] of ['#747579','#d4d3ce','#939596'].entries()){
        const paso=(semitorre-8.6)/3;
        caja(retorno,'Revestimiento de esquina',(i-1)*paso,alto/2,-.083,paso-.012,alto,.018,color);
      }
    }
    for(const lado of [-1,1]){
      const x=lado*(semitorre-espesor/2);
      if(comedor&&lado<0){
        const antepecho=1.16,dintel=3.15;
        caja(sala,'Antepecho del comedor',x,antepecho/2,centro,espesor,antepecho,fondo,marfil);
        caja(sala,'Dintel del comedor',x,(alto+dintel)/2,centro,espesor,alto-dintel,fondo,marfil);
        const margen=.59,paño=(fondo-2*margen)/3;
        for(const z of [desde+margen/2,hasta-margen/2])
          caja(sala,'Machón de esquina',x,(dintel+antepecho)/2,z,espesor,dintel-antepecho,margen,marfil);
        caja(sala,'Vidrio fijo del comedor',x,(dintel+antepecho)/2,centro,.048,dintel-antepecho,fondo-2*margen,cristal);
        for(const y of [antepecho,dintel])
          caja(sala,'Perfil horizontal',x,y,centro,.15,.066,fondo-2*margen,grafito);
        for(let i=0;i<=3;i++)caja(sala,'Montante de ventana',x,(dintel+antepecho)/2,
          desde+margen+i*paño,.12,dintel-antepecho,.055,grafito);
      }else{
        caja(sala,comedor?'Muro junto a la mampara del patio':'Muro lateral de servicios',x,alto/2,centro,espesor,alto,fondo,marfil);
        if(comedor||lado<0){
          paneles(sala,x+lado*.085,desde+.012,hasta-.012,[]);
        }else{
          // En 1.08.02 el paño junto a la hoja gris es liso, con juntas horizontales finas.
          const xCara=x+espesor/2+.022;
          caja(sala,'Paño gris hasta el cerco',xCara,alto/2,centro,.042,alto,fondo,'#92928f');
          for(const h of [.68,2.25])caja(sala,'Junta horizontal de fachada',xCara+.022,h,centro,.008,.016,fondo,'#777975');
          caja(sala,'Encuentro del muro gris con el piso',xCara+.021,.075,centro,.04,.15,fondo,'#696a65');
        }
      }
    }
    const tapa=grupo(cubiertas,comedor?'Cubierta del comedor ampliado':'Cubierta de los ambientes ampliados');
    caja(tapa,'Losa de cubierta',0,alto+.09,centro,ancho,.18,fondo,'#acafa8');
    // Albardillas en los tres bordes expuestos, sin pretil en la unión interior.
    caja(tapa,'Albardilla del testero',0,alto+.233,zTestero,ancho,.106,espesor,'#dddcd3');
    for(const lado of [-1,1])caja(tapa,'Albardilla lateral',lado*(semitorre-.08),alto+.233,
      centro-signo*.08,.16,.106,fondo-.16,'#dddcd3');
    for(const x of [-7,-3.5,0,3.5,7])
      caja(tapa,'Junta de cubierta',x,alto+.182,centro,.024,.004,fondo-.34,'#8c948f');
    for(const x of [-6.6,0,6.65]){
      caja(tapa,'Luminaria de techo',x,alto-.12,centro,1.85,.12,.20,grafito);
      caja(tapa,'Difusor de luminaria',x,alto-.19,centro,1.78,.024,.16,'#fff1d3');
    }
    if(comedor){
      baldosas(sala,'Continuación del porcelanato del comedor',0,centro,ancho,fondo,'#e8e5de','#a7a49b',.8);
      caja(sala,'Zócalo lateral del comedor',semitorre-.169,.082,centro,.025,.164,fondo-.16,'#90948d');
      // Se ve el carro de bandejas junto a las mesas auxiliares en la toma final del comedor.
      carro(sala,-5.04,hasta-.88);
      const aire=grupo(sala,'Unidad de aire sobre las mesas auxiliares',-7.66,2.92,zTestero-.18);
      caja(aire,'Carcasa de la unidad',0,0,-.09,1.45,.38,.29,'#e4e4dd');
      caja(aire,'Aleta de impulsión',0,-.115,-.242,1.25,.06,.025,'#949a95');
    }else{
      const juntas=[-semitorre,-3.5,3.4,semitorre];
      for(let i=0;i<3;i++){
        const izq=juntas[i],der=juntas[i+1],oficina=i===1;
        // El pavimento de los cuartos existentes acaba un poco antes del antiguo testero.
        const finPiso=ejePasadizo-semianchoPasadizo-3.3-(oficina?3.15:3.163);
        baldosas(sala,oficina?'Continuación del gres de vigilancia':'Continuación del piso de apoyo',
          (izq+der)/2,(finPiso+desde)/2,der-izq,finPiso-desde,
          oficina?'#bbbcb5':'#c1c3b9',oficina?'#9fa39c':'#94998e',oficina?.65:.61);
      }
      // Las divisiones continúan en el mismo eje que los despachos originales.
      const finTabique=ejePasadizo-semianchoPasadizo-3.30-6.5/2;
      for(const x of [-3.5,3.4])caja(sala,'Prolongación de tabique',x,alto/2,(finTabique+desde)/2,.13,alto,finTabique-desde,marfil);
      // El archivador y el banco de trabajo ocupan el fondo real de cada ambiente.
      equipar.archivo(sala,0,desde+.62);
      equipar.balda(sala,7.71,desde+1.85,2.32);
      equipar.bancoApoyo(sala,-8.49,(desde+hasta)/2+.14);
    }
  }
  return cubiertas;
}
export function crearInteriorC(piso){
  const g=grupo(piso,'Torre C · recorridos del 21 de noviembre',0,suelo,0);
  paneles(g,-10.47,-31,14,[[-24.3,-21.7],[-12.5,-9.1],[4.65,7]]);
  paneles(g,8.6,-26.45,12,[[-24.3,-21.7],[-13.15,-10.65],[4.65,7]]);
  // El tramo de hormigón y la hoja gris cierran el extremo del patio al lado del pasadizo.
  const extremo=paredConPuerta(g,{x:8.6,z:-28.725,largo:4.55,baseY:0,alto:3.92,rotacion:Math.PI/2,
    anchoPuerta:1.46,altoPuerta:2.41,colorMuro:'#858580',colorMarco:'#747875',colorPuerta:'#485157',
    interactiva:true,manijaPalanca:true});
  const gris=extremo.children.find(o=>o.userData.puertaInteractiva);
  gris.name='Puerta gris de servicio al patio';
  gris.scale.x=Math.abs(zTorreC(-27.725+.73)-zTorreC(-27.725-.73))/1.46;
  letrero(gris,'SERVICIO',.97,1.85,.061,.33,.25,0,'#284578');
  letrero(gris,'ACCESO\nRESTRINGIDO',.53,1.85,.061,.31,.25,0,'#ac4852');
  for(const [z,y,ancho,alto] of [[-25.16,.45,.65,.54],[-25.06,3.28,.67,.44]]){
    caja(g,'Marco de rejilla del extremo',8.708,y,z,.09,alto,ancho,'#575955');
    for(let i=1;i<=7;i++)caja(g,'Lama de extracción',8.764,y-alto/2+i*alto/8,z,.045,.018,ancho-.065,'#a1a39c');
  }
  caja(g,'Placa de los cuatro tubos',8.71,3.38,-26.03,.10,.40,1.25,'#424647');
  for(let i=0;i<4;i++){
    const salida=disco(g,'Salida circular de ventilación',8.82,3.38,-26.49+i*.30,.127,.25,'#818482');salida.rotation.z=-Math.PI/2;
    const boca=disco(g,'Boca de ventilación',8.952,3.38,-26.49+i*.30,.098,.01,'#353b3b');boca.rotation.z=-Math.PI/2;
  }
  const rejilla=grupo(g,'Rejilla alta junto al vestíbulo de baños',8.70,2.97,-6.12);
  caja(rejilla,'Marco de ventilación',0,0,0,.11,.54,5.45,'#393c3c');
  for(let i=0;i<9;i++)caja(rejilla,'Lama horizontal',.065,-.210+i*.052,0,.06,.023,5.32,'#747675');
  caja(rejilla,'Montante de rejilla',.075,0,0,.045,.48,.04,'#4c5050');
  const directorio=grupo(g,'Directorio del patio',10.3,0,-17.5);
  caja(directorio,'Peana',0,.042,0,.42,.084,.82,'#64696a');
  caja(directorio,'Directorio azul',0,1.12,0,.135,2.15,.79,'#1762a1');
  for(const lado of [-1,1])for(const [i,linea] of ['Cafetería','SS. HH.','Torre C'].entries())
    letrero(directorio,linea,lado*.071,1.57-i*.21,0,.65,.14,lado*Math.PI/2,'#1762a1');
  for(const z of [-22.95,-11.9])letrero(g,'← SALIDA',-10.56,2.05,z+2.3,1,.27,-Math.PI/2,'#dce7d2','#306340');
  for(const z of [-25.3,10.4]){
    caja(g,'Gabinete rojo de extintor',-10.66,1.28,z,.22,.7,.5,'#b32536');
    caja(g,'Mirilla',-10.78,1.29,z,.016,.46,.28,'#423b3c');
    letrero(g,'EXTINTOR',-10.56,1.94,z,.44,.15,-Math.PI/2,'#a92f39');
  }
  const techos=[cafeteria(g),cocina(g),pasadizos(g),g.getObjectByName('Cielo de servicios higiénicos')];
  cerrarExtremos(g);
  for(const t of techos)t.visible=false;
  g.userData.techosInteriores=techos.map(t=>t.name);
  return g;
}

