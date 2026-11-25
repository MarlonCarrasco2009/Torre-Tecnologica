import * as THREE from 'three';
import { CONFIG, AMBIENTES, distribucionInterior } from './config.js';

// Plantas de corte interpretadas de los tres croquis del 16/11/2026.
// Las cotas se adaptan a la maqueta existente: no son medidas de levantamiento.
// No se añade navegación ni se modifica la distribución del primer piso.
export function crearPisosSuperiores(escena) {
  const grupo=new THREE.Group();
  grupo.name='Plantas superiores · croquis del usuario';
  grupo.userData.sinColision=true;
  grupo.visible=false;escena.add(grupo);
  // Las puertas del núcleo se anclan a las cabinas reales de planta baja.
  // El remapeo longitudinal conserva ambos extremos del croquis y evita dos
  // núcleos de elevadores incompatibles en distintas cotas de la maqueta.
  escena.updateMatrixWorld(true);
  const ascensorBase=escena.getObjectByName('Área de elevadores');
  const zonaBase=ascensorBase?.userData.zonaElevadores;
  const ambienteBase=AMBIENTES.B.find(a=>a.id==='b-elevadores');
  const distribucion=distribucionInterior(CONFIG.torres.B);
  const anchoBase=zonaBase?.ancho ?? ambienteBase.ancho*CONFIG.torres.B.ancho/16;
  const fondoBase=zonaBase?.fondo ?? ambienteBase.fondo*distribucion.factorZ-(ambienteBase.recorteFrontal||0)+1.5;
  const centroBase=ascensorBase?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3(
    CONFIG.torres.B.x,0,CONFIG.torres.B.z+ambienteBase.z*distribucion.factorZ+distribucion.desplazamientoZ-(ambienteBase.recorteFrontal||0)/2+.75);
  const zFilaDos=centroBase.z-(fondoBase/2-2.37),zFilaCuatro=centroBase.z+(fondoBase/2-2.37);
  const mapearZ=z=>z<=-1.38?
    -33.5+(z+33.5)*(zFilaDos+33.5)/32.12:
    z<=6.75?zFilaDos+(z+1.38)*(zFilaCuatro-zFilaDos)/8.13:
    zFilaCuatro+(z-6.75)*(32.5-zFilaCuatro)/25.75;
  const intervaloZ=(z,d)=>{const a=mapearZ(z-d/2),b=mapearZ(z+d/2);return {z:(a+b)/2,d:b-a};};
  const niveles=new Map();
  const cubo=new THREE.BoxGeometry(1,1,1);
  const esfera=new THREE.IcosahedronGeometry(1,1);
  const materiales={
    losa:new THREE.MeshStandardMaterial({color:'#657780',roughness:.85}),
    piso:new THREE.MeshStandardMaterial({color:'#e4ddcd',roughness:.77}),
    junta:new THREE.MeshStandardMaterial({color:'#c8c3b6',roughness:.9}),
    muro:new THREE.MeshStandardMaterial({color:'#f0eee5',roughness:.88}),
    zocalo:new THREE.MeshStandardMaterial({color:'#9faeaa',roughness:.76}),
    azul:new THREE.MeshStandardMaterial({color:'#0876bd',roughness:.45,metalness:.12}),
    silla:new THREE.MeshStandardMaterial({color:'#005a9b',roughness:.52}),
    mesa:new THREE.MeshStandardMaterial({color:'#f5f2e7',roughness:.65}),
    madera:new THREE.MeshStandardMaterial({color:'#bd905c',roughness:.65}),
    metal:new THREE.MeshStandardMaterial({color:'#657a82',metalness:.62,roughness:.34}),
    acero:new THREE.MeshStandardMaterial({color:'#b9c2bf',metalness:.44,roughness:.39}),
    oscuro:new THREE.MeshStandardMaterial({color:'#263c48',roughness:.68}),
    vidrio:new THREE.MeshStandardMaterial({color:'#7fb9d4',transparent:true,opacity:.36,roughness:.24,metalness:.15,depthWrite:false}),
    verde:new THREE.MeshStandardMaterial({color:'#3d842c',roughness:1}),
    hoja:new THREE.MeshStandardMaterial({color:'#39752c',roughness:.95}),
    hojaClara:new THREE.MeshStandardMaterial({color:'#71a23c',roughness:.95}),
    tierra:new THREE.MeshStandardMaterial({color:'#6c6451',roughness:1}),
    equipo:new THREE.MeshStandardMaterial({color:'#168eb1',roughness:.44,metalness:.2}),
    equipoClaro:new THREE.MeshStandardMaterial({color:'#70c3d6',roughness:.32,metalness:.21}),
    blanco:new THREE.MeshStandardMaterial({color:'#fffdf2',roughness:.42}),
    seguridad:new THREE.MeshStandardMaterial({color:'#e8bf34',roughness:.6}),
    senal:new THREE.MeshStandardMaterial({color:'#00865c',roughness:.7}),
  };
  const texturas=new Map();
  function etiqueta(padre,texto,x,y,z,ancho=4,alto=.85,fondo='#0066ac') {
    const clave=`${texto}:${fondo}`;
    let textura=texturas.get(clave);
    if(!textura && typeof document!=='undefined') {
      const canvas=document.createElement('canvas');canvas.width=768;canvas.height=192;
      const ctx=canvas.getContext('2d');
      ctx.fillStyle=fondo;ctx.fillRect(0,0,768,192);
      ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font=`700 ${texto.length>24?38:texto.length>16?46:58}px Arial`;
      ctx.fillText(texto,384,99,728);
      textura=new THREE.CanvasTexture(canvas);textura.colorSpace=THREE.SRGBColorSpace;texturas.set(clave,textura);
    }
    const material=new THREE.SpriteMaterial({map:textura,color:textura?'#ffffff':'#0066ac',depthTest:true});
    const letrero=new THREE.Sprite(material);letrero.name=texto;letrero.position.set(x,y,mapearZ(z));letrero.scale.set(ancho,alto,1);padre.add(letrero);return letrero;
  }
  function construir(numero) {
    const es11=numero===11, jardines=numero>=8&&!es11;
    const nivel=new THREE.Group();nivel.name=`Piso ${numero} · ${es11?'Equipos y aulas':'Aulas y patios abiertos'}`;
    nivel.position.y=CONFIG.baseY+.085+(numero-1)*CONFIG.altoPiso;
    nivel.userData={numero,tipo:es11?'equipos':jardines?'aulas-madera':'aulas-mesas',sinColision:true,
      torres:es11?['A','B']:['A','B','C'],ambientes:[],patios:[],banos:[],equipos:es11?16:0,
      referencia:'Croquis del usuario · 16/11/2026',medidas:'Aproximadas sobre CONFIG',
      nucleo:{x:centroBase.x,z:centroBase.z,ancho:anchoBase,fondo:fondoBase,filas:[{cantidad:2,z:zFilaDos},{cantidad:4,z:zFilaCuatro}]}};
    const lotes=new Map(),tmp=new THREE.Object3D();let categoriaContexto=null;
    function pieza(material,x,y,z,w,h,d,forma='cubo',rot=0) {
      if(Math.min(w,h,d)<=0)return;
      const clave=material+':'+forma;
      if(!lotes.has(clave))lotes.set(clave,{material,forma,matrices:[],categorias:[]});
      const finalZ=intervaloZ(z,d);
      tmp.position.set(x,y,finalZ.z);tmp.rotation.set(0,rot,0);tmp.scale.set(w,h,finalZ.d);tmp.updateMatrix();
      lotes.get(clave).matrices.push(tmp.matrix.clone());
      lotes.get(clave).categorias.push(categoriaContexto);
    }
    function superficie(x,z,w,d,info=null,altura=0) {
      pieza('losa',x,altura-.23,z,w,.44,d);
      if(info) {
        const finalZ=intervaloZ(z,d);
        const suelo=new THREE.Mesh(new THREE.BoxGeometry(w,.045,finalZ.d),materiales.piso);
        suelo.name=info.nombre;suelo.position.set(x,altura+.014,finalZ.z);suelo.receiveShadow=true;
        suelo.userData.info={nombre:info.nombre,descripcion:info.descripcion||'Distribución interpretada del croquis; dimensiones aproximadas.',torre:info.torre,tipo:info.tipo};
        suelo.userData.categoriaContexto=categoriaContexto;nivel.add(suelo);
      } else pieza('piso',x,altura+.012,z,w,.035,d);
      // Juntas finas de grandes baldosas: sin textura externa ni láminas coplanares.
      for(let xx=x-w/2+2;xx<x+w/2-.1;xx+=2)pieza('junta',xx,altura+.037,z,.014,.006,d);
      for(let zz=z-d/2+2;zz<z+d/2-.1;zz+=2)pieza('junta',x,altura+.037,zz,w,.006,.014);
    }
    function muroX(x,z,largo,alto=2.35) {
      pieza('muro',x,alto/2,z,.18,alto,largo);
      pieza('zocalo',x,.13,z,.205,.22,largo);
      pieza('blanco',x,alto+.045,z,.25,.09,largo+.08);
    }
    function muroZ(x,z,largo,alto=2.35) {
      pieza('muro',x,alto/2,z,largo,alto,.18);
      pieza('zocalo',x,.13,z,largo,.22,.205);
      pieza('blanco',x,alto+.045,z,largo+.08,.09,.25);
    }
    function baranda(x,z,w,d,orientacion='z') {
      const longitud=orientacion==='z'?d:w;
      pieza('azul',x,.12,z,w,.16,d);
      pieza('vidrio',x,.69,z,orientacion==='z'?.08:w,1.02,orientacion==='z'?d:.08);
      pieza('metal',x,1.27,z,orientacion==='z'?.085:w,.07,orientacion==='z'?d:.085);
      const n=Math.ceil(longitud/2.8);
      for(let i=0;i<=n;i++) {
        const u=-longitud/2+i*longitud/n;
        pieza('azul',x+(orientacion==='x'?u:0),.67,z+(orientacion==='z'?u:0),.085,1.18,.085);
      }
    }
    function puertaLateral(x,z,desde,hasta,lado,info) {
      const ancho=1.48,h=2.35,hp=2.04;
      if(z-ancho/2>desde)muroX(x,(desde+z-ancho/2)/2,z-ancho/2-desde,h);
      if(hasta>z+ancho/2)muroX(x,(z+ancho/2+hasta)/2,hasta-z-ancho/2,h);
      pieza('muro',x,(h+hp)/2,z,.18,h-hp,ancho);
      for(const dz of [-ancho/2,ancho/2])pieza('azul',x,hp/2,z+dz,.23,hp,.085);
      pieza('azul',x,hp,z,.23,.085,ancho+.12);
      // Hoja abierta hacia el aula, de modo que el vano se mantiene vacío.
      pieza('azul',x-lado*ancho/2,1,z-ancho/2,ancho,2,.065);
      pieza('vidrio',x-lado*ancho/2,1.37,z-ancho/2-.04,ancho-.25,.7,.025);
      pieza('metal',x-lado*(ancho-.16),.95,z-ancho/2-.06,.06,.3,.07);
      info.puertas.push({x,z,ancho,orientacion:'x',vanoReal:true});
    }
    function mesaSilla(x,z,tipo='mesa',factor=1) {
      const w=.95*factor,d=.62*factor;
      pieza(tipo,x,.79,z,w,.11,d);
      for(const sx of [-1,1])for(const sz of [-1,1])pieza('metal',x+sx*w*.39,.39,z+sz*d*.32,.06,.75,.06);
      pieza(jardines||es11?'silla':'oscuro',x,.46,z-.66*factor,.58*factor,.11,.52*factor);
      pieza(jardines||es11?'silla':'oscuro',x,.82,z-.91*factor,.58*factor,.63,.075);
      for(const sx of [-1,1])for(const sz of [-1,1])pieza('metal',x+sx*.22*factor,.22,z-.66*factor+sz*.19*factor,.045,.43,.045);
    }
    function aula(torre,indice,x,z,w,d,lado,filas,columnas) {
      const info={id:`${torre}-${numero}-${indice}`,nombre:`Aula ${indice} · Torre ${torre} · Piso ${numero}`,
        tipo:'Aula',torre,x,z,ancho:w,fondo:d,puertas:[],muebles:filas*columnas,
        descripcion:`Aula de Torre ${torre}, piso ${numero}; ubicación y mobiliario según el croquis de referencia.`};
      nivel.userData.ambientes.push(info);superficie(x,z,w,d,info);
      muroZ(x,z+d/2,w);muroZ(x,z-d/2,w);
      const puertaZ=z-d/2+1.65;
      puertaLateral(x+lado*w/2,puertaZ,z-d/2,z+d/2,lado,info);
      // Cerramiento exterior bajo y vidrio azul permiten leer el interior en corte.
      const exterior=x-lado*w/2;
      muroX(exterior,z,d,.65);baranda(exterior,z,.12,d,'z');
      pieza('muro',exterior,2.27,z,.18,.16,d);
      for(let zz=z-d/2;zz<z+d/2+.1;zz+=Math.max(2.5,d/4))pieza('metal',exterior,1.5,zz,.07,1.45,.07);
      // Pizarra, mesa docente y pequeños paneles junto al acceso.
      pieza('oscuro',x,1.46,z+d/2-.12,Math.min(w*.68,5.8),1.08,.09);
      pieza('blanco',x,1.46,z+d/2-.18,Math.min(w*.68,5.8)-.14,.94,.025);
      pieza('mesa',x+w*.24,.82,z+d/2-1.1,1.55,.12,.76);
      pieza('oscuro',x+w*.24,.4,z+d/2-1.1,1.35,.72,.15);
      const espacioX=Math.min(2.15,(w-2.4)/columnas), espacioZ=Math.min(2.25,(d-4.1)/filas);
      const centroZ=z-.45;
      for(let f=0;f<filas;f++)for(let c=0;c<columnas;c++)
        mesaSilla(x+(c-(columnas-1)/2)*espacioX,centroZ+(f-(filas-1)/2)*espacioZ,jardines?'madera':'mesa');
      pieza('senal',x+lado*(w/2+.12),1.9,puertaZ+1.2,.035,.3,.65);
      etiqueta(nivel,`AULA · ${torre}${indice}`,x,2.65,z,Math.min(4.8,w*.52),.9);
    }
    function banco(x,z,rot=0) {
      pieza('metal',x,.27,z,2.8,.5,.14,'cubo',rot);
      pieza('madera',x,.55,z,3.2,.15,.72,'cubo',rot);
      pieza('madera',x,.96,z+.31,3.2,.61,.12,'cubo',rot);
    }
    function planta(x,z,semilla=0,escala=1) {
      pieza('tierra',x,.16,z,.62*escala,.25,.62*escala);
      pieza('hoja',x,.55*escala,z,.52*escala,.58*escala,.5*escala,'esfera');
      pieza('hojaClara',x+.25*escala,.69*escala,z+.09,.31*escala,.4*escala,.34*escala,'esfera',semilla);
      pieza('hoja',x-.22*escala,.8*escala,z-.1,.32*escala,.43*escala,.33*escala,'esfera');
    }
    function patio(id,x,z,w,d) {
      const categoriaAnterior=categoriaContexto;categoriaContexto='patio';
      const info={id,tipo:'vacio',x,z,ancho:w,fondo:d};nivel.userData.patios.push(info);
      // El verde de la referencia está en planta baja. Aquí no hay losa,
      // césped, jardineras ni mobiliario que cierre el vacío vertical.
      for(const lado of [-1,1]) {
        baranda(x+lado*w/2,z,.14,d,'z');baranda(x,z+lado*d/2,w,.14,'x');
      }
      etiqueta(nivel,'VACÍO A PLANTA BAJA',x,1.5,z-d/2,Math.min(w*.9,8),.95);
      categoriaContexto=categoriaAnterior;
    }
    function ascensorFila(z,cantidad,cara) {
      const ancho=anchoBase,modulo=ancho/cantidad;
      const cabinas=zonaBase?.cabinas.filter(c=>c.lado===(cantidad===4?'izquierda':'derecha'));
      const posiciones=cabinas?.length===cantidad?cabinas.map(c=>c.x+centroBase.x):
        Array.from({length:cantidad},(_,i)=>centroBase.x-ancho/2+(i+.5)*modulo+(cantidad===2&&i===0?3.25:0));
      // Paneles macizos entre puertas, cada vano está libre en el plano frontal.
      let comienzo=centroBase.x-ancho/2;
      for(let i=0;i<cantidad;i++) {
        const x=posiciones[i],puerta=1.76,fin=x-puerta/2;
        if(fin>comienzo)pieza('muro',(comienzo+fin)/2,1.2,z,fin-comienzo,2.4,.24);
        pieza('muro',x,2.29,z,puerta,.22,.24);
        pieza('oscuro',x,1.1,z+cara*.11,puerta,2.15,.06);
        for(const lado of [-1,1]) {
          pieza('acero',x+lado*.425,1.09,z+cara*.16,.82,2.1,.07);
          pieza('metal',x+lado*.91,1.12,z+cara*.19,.07,2.24,.11);
        }
        pieza('metal',x,2.18,z+cara*.18,1.90,.09,.11);
        pieza('oscuro',x,2.35,z+cara*.18,.46,.18,.035);
        pieza('seguridad',x,2.35,z+cara*.21,.08,.1,.02);
        pieza('acero',x+1.2,1.15,z+cara*.17,.14,.34,.07);
        comienzo=x+puerta/2;
      }
      if(comienzo<centroBase.x+ancho/2)pieza('muro',(comienzo+centroBase.x+ancho/2)/2,1.2,z,centroBase.x+ancho/2-comienzo,2.4,.24);
    }
    function nucleo() {
      const medio=anchoBase/2;
      superficie(0,2.685,anchoBase,8.13);
      ascensorFila(6.75,4,-1);
      // Vestíbulo inferior y escalera de dos tramos, con hueco abierto en la losa.
      ascensorFila(-1.38,2,-1);
      const info={id:`nucleo-${numero}`,nombre:'Núcleo de ascensores y escalera',tipo:'Circulación',torre:'B',x:0,z:-3,ancho:anchoBase,fondo:13,puertas:[],ascensores:6};
      nivel.userData.ambientes.push(info);
      // Bordes laterales dejan visible el vacío de la escalera.
      superficie(-medio+.65,-5.4,1.3,7.8);superficie(medio-.65,-5.4,1.3,7.8);
      superficie(0,-8.8,anchoBase,1.0);
      const peldaños=11,huella=.54,contrahuella=CONFIG.altoPiso/22;
      for(let i=0;i<peldaños;i++) {
        const y=-i*contrahuella,zz=-2.05-i*huella;
        pieza('losa',-2.65,y-.1,zz,4.3,.2,huella+.015);
        pieza('piso',-2.65,y+.012,zz,4.3,.035,huella+.01);
        pieza('metal',-2.65,y+.04,zz+.24,4.3,.025,.05);
        const yr=-CONFIG.altoPiso+(i+1)*contrahuella;
        pieza('losa',2.65,yr-.1,zz,4.3,.2,huella+.015);
        pieza('piso',2.65,yr+.012,zz,4.3,.035,huella+.01);
      }
      superficie(0,-8.1,anchoBase-2.4,1.2,null,-CONFIG.altoPiso/2);
      for(const x of [-5.1,0,5.1]) {
        for(let i=0;i<=6;i++)pieza('metal',x,-i*.34+.6,-2.2-i*.84,.065,1.1,.065);
      }
      baranda(-medio+.6,-5.3,.12,7.4,'z');baranda(medio-.6,-5.3,.12,7.4,'z');
      baranda(0,-9,anchoBase-.2,.12,'x');
      etiqueta(nivel,'ELEVADORES',0,2.95,6.4,7.2,1);
      etiqueta(nivel,'ESCALERA',0,.65,-5.2,4.9,.82,'#4c626c');
    }
    function banos() {
      const categoriaAnterior=categoriaContexto;categoriaContexto='bano';
      for(const [x,nombre,sexo] of [[4.1,'Baño mujer','M'],[-4.1,'Baño hombre','H']]) {
        const z=-38.1,w=6.1,d=8.2;
        const info={id:`bano-${sexo}-${numero}`,nombre,tipo:'Servicios',torre:'B',x,z,ancho:w,fondo:d,
          puertas:[{x,z:z+d/2,ancho:1.45,orientacion:'z',vanoReal:true}]};
        nivel.userData.banos.push(info);nivel.userData.ambientes.push(info);superficie(x,z,w,d,info);
        muroX(x-w/2,z,d);muroX(x+w/2,z,d);muroZ(x,z-d/2,w);
        for(const lado of [-1,1])muroZ(x+lado*(w/4+.36),z+d/2,w/2-.72);
        pieza('azul',x,2.15,z+d/2,1.55,.15,.2);
        // Dos cabinas y lavamanos visibles desde arriba, sin cubrir el acceso.
        for(const dx of [-1.45,1.45]) {
          muroX(x+dx+1.35,z-2,2.9,1.95);
          pieza('azul',x+dx,1,z-.55,2.55,1.95,.09);
          pieza('blanco',x+dx,.38,z-2.4,.72,.68,1.08);
          pieza('oscuro',x+dx,.74,z-2.4,.4,.015,.48);
          pieza('blanco',x+dx,.81,z-2.85,.75,.67,.25);
        }
        pieza('blanco',x,.83,z+2.1,3.6,.15,.68);
        for(const dx of [-1.05,1.05]) {
          pieza('acero',x+dx,.93,z+2.1,.68,.08,.45);
          pieza('metal',x+dx,1.11,z+2.28,.07,.3,.07);
        }
        etiqueta(nivel,nombre.toUpperCase(),x,2.7,z,5.5,1.0);
      }
      categoriaContexto=categoriaAnterior;
    }

    // La orientación coincide con CONFIG: A a +X, C a -X. Desde -Z se leen A/B/C.
    const ax=30.6,aw=10.7,cx=-30.43,cw=13.2;
    const frente=-33.5,fondo=32.5;
    categoriaContexto='corredor';
    // Corredores longitudinales. En el 11 no se crea ninguna superficie en C.
    superficie(22.65,-.5,4.3,66);superficie(8.85,-.5,4.3,66);
    if(!es11) {superficie(-22.1,-.5,4.1,66);superficie(-8.85,-.5,4.3,66);}
    else baranda(-anchoBase/2,-.5,.14,66,'z');
    // Pasos transversales de frente y fondo; la conexión central se omite en el
    // vacío A–B del 11, exactamente como en la referencia de equipos.
    const limiteIzq=es11?-anchoBase/2:-37.03,limiteDer=36.1;
    superficie((limiteIzq+limiteDer)/2,frente,limiteDer-limiteIzq,4.2);
    if(!es11) {
      // Travesaños solo entre corredores: no se superponen a los suelos de aulas.
      superficie(15.75,3,9.5,4.1);superficie(-15.525,3,9.05,4.1);
      superficie(15.75,fondo,9.5,2.4);superficie(-15.525,fondo,9.05,2.4);
    }
    categoriaContexto=null;
    if(!es11) {
      const separacion=62/5;
      for(let i=0;i<5;i++)aula('A',i+1,ax,-30+(i+.5)*separacion,aw,separacion,-1,4,3);
      const sepC=62/4;
      for(let i=0;i<4;i++)aula('C',i+1,cx,-30+(i+.5)*sepC,cw,sepC,1,5,4);
      for(const [id,x,anchoPatio] of [['AB',15.75,9.5],['BC',-15.525,9.05]]) {
        patio(`${id}-posterior`,x,18.15,anchoPatio,25.7);
        patio(`${id}-frontal`,x,-14.15,anchoPatio,30.2);
      }
    } else {
      categoriaContexto='equiposA11';
      const info={id:'equipos-A-11',nombre:'Área de equipos · Torre A',tipo:'Equipamiento',torre:'A',x:ax,z:1,ancho:aw,fondo:62,puertas:[],muebles:16};
      nivel.userData.ambientes.push(info);superficie(ax,1,aw,62,info);
      muroX(ax+aw/2,1,62);muroZ(ax,32,aw);
      baranda(ax-aw/2,1,.12,62,'z');
      for(let fila=0;fila<8;fila++)for(const col of [-1,1]) {
        const x=ax+col*2.25,z=-25+fila*7.1;
        pieza('metal',x,.12,z,3.0,.2,2.8);
        pieza('equipo',x,1.35,z,2.8,2.5,2.6);
        pieza('equipoClaro',x,2.64,z,2.91,.13,2.7);
        // Dos puertas verticales, zócalo, tiradores y señales amarillas.
        for(const dx of [-.7,.7]) {
          pieza('equipoClaro',x+dx,1.36,z-1.315,1.31,2.28,.05);
          pieza('metal',x+dx+.43,1.3,z-1.36,.065,.5,.045);
          pieza('seguridad',x+dx,1.42,z-1.35,.24,.42,.04);
        }
        for(let k=0;k<4;k++)pieza('oscuro',x,2.15,z-1.351,2.2,.045,.016);
      }
      // El vacío permanece abierto: únicamente barandas en sus dos bordes.
      categoriaContexto='corredor';
      baranda(20.49,1,.12,62,'z');baranda(11,1,.12,62,'z');
      categoriaContexto=null;
      etiqueta(nivel,'ÁREA DE EQUIPOS',ax,3.3,2,8.7,1.15);
    }
    // Torre B se conserva en los tres croquis: dos aulas posteriores y una frontal.
    aula('B',1,0,25.15,anchoBase,12.7,1,3,5);
    aula('B',2,0,12.75,anchoBase,12.1,1,3,5);
    aula('B',3,0,-20.0,anchoBase,21.0,1,5,5);
    nucleo();banos();
    // Baranda delantera interrumpida por el acceso a los dos anexos sanitarios.
    categoriaContexto='corredor';
    for(const [inicio,fin] of [[limiteIzq,-7.15],[-1.0,1.0],[7.15,limiteDer]])
      if(fin>inicio)baranda((inicio+fin)/2,frente-2.1,fin-inicio,.14,'x');
    categoriaContexto=null;
    for(const [nombre,x] of [['A',ax],['B',0],...(!es11?[['C',cx]]:[])])
      etiqueta(nivel,`TORRE ${nombre}`,x,3.2,34.2,8.0,1.1,'#334e5b');
    for(const [x,texto] of [[16.55,jardines?'RESPETA LAS NORMAS':'PATIO · USO COMÚN'],[-16.3,'TRABAJA EN EQUIPO']]) {
      if(es11)continue;
      etiqueta(nivel,texto,x,1.45,-31.6,9.0,1.05,'#126cab');
    }
    etiqueta(nivel,'APRENDE · CREA · AVANZA',0,2.4,3,12.7,1.1,'#126cab');
    // Extintores, papeleras y plantas puntuales en circulación, fuera de los vanos.
    for(const x of es11?[22.65,8.85]:[22.65,8.85,-8.85,-22.1]) {
      for(const z of [-30,4,31]) {
        pieza('senal',x,.055,z,1.1,.035,1.1);
        pieza('blanco',x,.08,z,.13,.018,.62);
        pieza('azul',x+.9,.45,z-.6,.55,.85,.55);
      }
    }
    // Metadata utiliza las mismas coordenadas finales que las mallas.
    const objetosDatos=new Set([...nivel.userData.ambientes,...nivel.userData.patios,...nivel.userData.banos]);
    for(const dato of objetosDatos) {
      const finalZ=intervaloZ(dato.z,dato.fondo);dato.z=finalZ.z;dato.fondo=finalZ.d;
      for(const puerta of dato.puertas||[])puerta.z=mapearZ(puerta.z);
    }
    for(const lote of lotes.values()) {
      const mesh=new THREE.InstancedMesh(lote.forma==='esfera'?esfera:cubo,materiales[lote.material],lote.matrices.length);
      mesh.name=`Piso ${numero} · ${lote.material}`;
      mesh.userData.categoriasContexto=lote.categorias;
      lote.matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.instanceMatrix.needsUpdate=true;
      mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();nivel.add(mesh);
    }
    nivel.visible=false;grupo.add(nivel);niveles.set(numero,nivel);return nivel;
  }
  function obtener(numero) {
    if(!Number.isInteger(numero)||numero<5||numero>11)throw new RangeError('Selecciona un piso del 5 al 11.');
    return niveles.get(numero)||construir(numero);
  }
  function mostrar(numero) {
    const nivel=obtener(numero);for(const existente of niveles.values())existente.visible=existente===nivel;
    grupo.visible=true;grupo.userData.numeroActivo=numero;return nivel;
  }
  function ocultar() {grupo.visible=false;for(const nivel of niveles.values())nivel.visible=false;grupo.userData.numeroActivo=null;}
  let contexto=null;
  function crearContexto() {
    if(contexto)return contexto;
    contexto=new THREE.Group();contexto.name='Patios, conexiones y anexos · Pisos 5–11';
    contexto.userData={sinColision:true,tipo:'Complementos exteriores de las plantas',niveles:[5,6,7,8,9,10,11]};
    const huellas=Object.values(CONFIG.torres).map(t=>({
      xmin:t.x-t.ancho*.86/2,xmax:t.x+t.ancho*.86/2,
      zmin:t.z-(t.fondo-5.6)/2,zmax:t.z+(t.fondo-5.6)/2,
    }));
    function recortar(rectangulo) {
      let piezas=[rectangulo];
      for(const h of huellas) piezas=piezas.flatMap(r=>{
        const a=Math.max(r.xmin,h.xmin),b=Math.min(r.xmax,h.xmax);
        const c=Math.max(r.zmin,h.zmin),d=Math.min(r.zmax,h.zmax);
        if(b<=a||d<=c)return [r];
        return [
          {xmin:r.xmin,xmax:a,zmin:r.zmin,zmax:r.zmax},
          {xmin:b,xmax:r.xmax,zmin:r.zmin,zmax:r.zmax},
          {xmin:a,xmax:b,zmin:r.zmin,zmax:c},
          {xmin:a,xmax:b,zmin:d,zmax:r.zmax},
        ].filter(p=>p.xmax-p.xmin>.002&&p.zmax-p.zmin>.002);
      });
      return piezas;
    }
    const posicion=new THREE.Vector3(),cuaternion=new THREE.Quaternion(),escala=new THREE.Vector3();
    const matriz=new THREE.Matrix4(),temporal=new THREE.Object3D();
    for(let numero=5;numero<=11;numero++) {
      const origen=obtener(numero),destino=new THREE.Group(),lotes=new Map();
      destino.name=`Exterior del piso ${numero}`;destino.position.y=origen.position.y;
      destino.userData.numero=numero;contexto.add(destino);
      function agregar(geometry,material,transformacion) {
        const clave=geometry.uuid+':'+material.uuid;
        if(!lotes.has(clave))lotes.set(clave,{geometry,material,matrices:[]});
        lotes.get(clave).matrices.push(transformacion.clone());
      }
      function extraer(geometry,material,matrix,categoria) {
        if(!categoria)return;
        matrix.decompose(posicion,cuaternion,escala);
        if(categoria==='corredor'||categoria==='patio') {
          if(geometry===cubo) {
            const partes=recortar({xmin:posicion.x-escala.x/2,xmax:posicion.x+escala.x/2,
              zmin:posicion.z-escala.z/2,zmax:posicion.z+escala.z/2});
            for(const p of partes) {
              temporal.position.set((p.xmin+p.xmax)/2,posicion.y,(p.zmin+p.zmax)/2);
              temporal.quaternion.identity();temporal.scale.set(p.xmax-p.xmin,escala.y,p.zmax-p.zmin);temporal.updateMatrix();
              agregar(cubo,material,temporal.matrix);
            }
          } else if(!huellas.some(h=>posicion.x>h.xmin&&posicion.x<h.xmax&&posicion.z>h.zmin&&posicion.z<h.zmax))
            agregar(geometry,material,matrix);
        } else if(categoria==='bano'||categoria==='equiposA11')agregar(geometry,material,matrix);
      }
      for(const objeto of origen.children) {
        if(objeto.isInstancedMesh) {
          const categorias=objeto.userData.categoriasContexto||[];
          for(let i=0;i<objeto.count;i++) {
            if(!categorias[i])continue;objeto.getMatrixAt(i,matriz);
            extraer(objeto.geometry,objeto.material,matriz,categorias[i]);
          }
        } else if(objeto.isMesh&&objeto.userData.categoriaContexto) {
          // Las superficies seleccionables se vuelven cajas de un lote exterior;
          // no se copian etiquetas ni manejadores de selección de las aulas.
          objeto.geometry.computeBoundingBox();const caja=objeto.geometry.boundingBox;
          temporal.position.copy(objeto.position);temporal.rotation.copy(objeto.rotation);
          temporal.scale.set(caja.max.x-caja.min.x,caja.max.y-caja.min.y,caja.max.z-caja.min.z);
          if(objeto.userData.categoriaContexto==='equiposA11')temporal.position.y+=.075;
          temporal.updateMatrix();extraer(cubo,objeto.material,temporal.matrix,objeto.userData.categoriaContexto);
        }
      }
      for(const lote of lotes.values()) {
        const mesh=new THREE.InstancedMesh(lote.geometry,lote.material,lote.matrices.length);
        mesh.name=`Complemento exterior ${numero}`;
        lote.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;
        mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();destino.add(mesh);
      }
    }
    return contexto;
  }
  return {grupo,niveles,mostrar,ocultar,obtener,crearContexto};
}
