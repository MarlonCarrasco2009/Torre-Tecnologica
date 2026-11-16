import * as THREE from 'three';
import { AMBIENTES,CONFIG,distribucionInterior } from '../config.js?v=admision-126';
import { bloque,placa,columna,etiqueta,paredVidrio,paredConPuertas,paredConPuerta,fachadaTorreA } from '../geometria.js?v=apertura-interior-175';
import { crearZonaElevadores } from '../elevadores.js';

// Devuelve un grupo independiente por torre: exactamente el PRIMER piso.
// Los demás niveles los crearán otros compañeros en módulos diferentes.
export function crearPiso1(torre, objetosSeleccionables, capaEtiquetas){
  const grupo=new THREE.Group(); grupo.name=`Piso 1 - Torre ${torre.id}`;
  const w=torre.ancho,d=torre.fondo;
  // El diseño anterior usaba 16 x 54 para todas las torres. Ahora los ambientes
  // crecen con la huella real de C, B y A, sin alterar el archivo de cada piso.
  const factorX=w/16;
  const {factorZ,desplazamientoZ}=distribucionInterior(torre);
  const posicionZ=z=>z*factorZ+desplazamientoZ;
  // Base maciza elevada: la cara superior queda a la cota de llegada de las escaleras.
  const baseInferior=.08,superficie=CONFIG.baseY+.01;
  const base={y:(baseInferior+superficie)/2,
    alto:superficie-baseInferior,fondo:d,color:CONFIG.acabados.piso};
  if(torre.id==='A'){
    // Dos partes contiguas: la textura se aplica a la propia base, sin láminas superpuestas.
    const fachada=13*w/32,anchoPasillo=w/2-fachada;
    bloque(grupo,{...base,x:(fachada-w/2)/2,ancho:fachada+w/2})
      .name='Base del área abierta de Torre A';
    // Recorta el saliente junto al Tópico hasta el borde exterior del muro bajo.
    // La explanada existente aporta el piso nivelado en el tramo retirado.
    const topico=AMBIENTES.A.find(ambiente=>ambiente.id==='a-topico');
    const inicioPasillo=topico.z-(-topico.fondo/2+.8+1.35/2)-.45;
    bloque(grupo,{...base,x:(fachada+w/2)/2,ancho:anchoPasillo,
      z:(inicioPasillo+d/2)/2,fondo:d/2-inicioPasillo})
      .name='Base del pasillo exterior de Torre A';
  }else{
    bloque(grupo,{...base,ancho:w});
  }

  // Una columna gruesa en cada círculo del croquis: zonas abiertas de A y B.
  // Sustituye las filas de pilares delgados de esas dos torres.
  if(torre.id==='A'||torre.id==='B'){
    if(torre.id==='B'){
      const soporte=bloque(grupo,{x:0,z:d/2-7,y:superficie+CONFIG.altoPiso/2,
        ancho:1.8,alto:CONFIG.altoPiso,fondo:1.8,color:CONFIG.acabados.columna});
      soporte.name='Columna gruesa frontal - Torre B';
    }
    if(torre.id==='A'){
      // La cara derecha coincide con la prolongación de la fachada marcada.
      const anchoColumna=2.8,bordeDerecho=13*w/32;
      bloque(grupo,{x:bordeDerecho-anchoColumna/2,z:d/2-5.7,y:superficie+CONFIG.altoPiso/2,
        ancho:anchoColumna,alto:CONFIG.altoPiso,fondo:2.8,color:CONFIG.acabados.columna})
        .name='Columna adicional junto al jardín frontal - Torre A';
    }
  }else{
    // La cafetería queda abierta: se retiran sus cuatro columnas frontales.
    for(const x of [-w/2+.75,w/2-.75]){
      for(const z of (torre.id==='C'?[]:[d/2-2.2,d/2-10])) columna(grupo,x,z,CONFIG.altoPiso,CONFIG.baseY);
    }
    for(const x of [-w/2+.75,w/2-.75]){
      if(torre.id!=='C') columna(grupo,x,-d/2+1.2,CONFIG.altoPiso,CONFIG.baseY);
    }
  }

  // Muros parciales, NO una caja cerrada. Aperturas permiten circular entre zonas.
  for(const ambiente of AMBIENTES[torre.id]){
    const x=ambiente.x*factorX;
    // Ajusta solo el extremo frontal (+Z), conservando el extremo posterior.
    // Se aplica después de distribuir las salas para no mover otros ambientes.
    const recorte=ambiente.recorteFrontal||0;
    const ampliacion=ambiente.ampliacionFrontal||0;
    const z=posicionZ(ambiente.z)+(ampliacion-recorte)/2;
    const ancho=ambiente.ancho*factorX;
    const fondo=ambiente.fondo*factorZ+ampliacion-recorte;
    if(ambiente.id==='b-elevadores'){
      const zona=crearZonaElevadores(grupo,{x,z,ancho,fondo});
      zona.plantaBaja.suelo.userData.info={...ambiente,torre:torre.id};
      objetosSeleccionables.push(zona.plantaBaja.suelo);
      etiqueta(capaEtiquetas,ambiente.nombre,torre.x+x,CONFIG.baseY+3.6,torre.z+z);
      continue;
    }
    const divisionTopico=.75;
    const sectores=ambiente.id==='a-atencion-alumno'?
      [{izq:x-ancho/2,der:divisionTopico,nombre:'Tópico',id:'a-topico-lateral',
        descripcion:'Tópico con acceso por la puerta blanca lateral.'},
       {izq:divisionTopico,der:x+ancho/2,nombre:ambiente.nombre,id:ambiente.id,descripcion:ambiente.descripcion}]:
      [{izq:x-ancho/2,der:x+ancho/2,nombre:ambiente.nombre,id:ambiente.id,descripcion:ambiente.descripcion}];
    for(const sector of sectores){
      const suelo=placa(grupo,{x:(sector.izq+sector.der)/2,y:CONFIG.baseY+.055,z,
        ancho:sector.der-sector.izq,fondo,color:CONFIG.acabados.piso});
      suelo.userData.info={...ambiente,id:sector.id,nombre:sector.nombre,descripcion:sector.descripcion,torre:torre.id};
      suelo.material.emissive=new THREE.Color('#000000');
      objetosSeleccionables.push(suelo);
    }

    const h=torre.id==='A'?4.4:3.2, espesor=.3, alturaCentro=CONFIG.baseY+h/2;
    const paredMat=new THREE.MeshStandardMaterial({color:ambiente.id==='a-topico'?'#08090b':CONFIG.acabados.pared,roughness:.83});
    const p=ambiente.paredes||[];
    const ladosPared=new Set(p);
    if(ambiente.id==='a-atencion-alumno'){
      bloque(grupo,{x:divisionTopico,y:alturaCentro,z,ancho:espesor,alto:h,fondo,material:paredMat})
        .name='Pared divisoria entre Tópico y Atención al Estudiante';
    }
    // El lateral acristalado de Torre C reemplaza el muro oeste de la cafetería.
    if(ambiente.id==='c-cafeteria')ladosPared.delete('oeste');
    if(ambiente.id==='a-atencion-alumno'){
      ladosPared.delete('oeste');
      const acceso=paredConPuerta(grupo,{x:x-ancho/2,z,largo:fondo,
        baseY:CONFIG.baseY,alto:h,rotacion:-Math.PI/2,puertaCentro:fondo/2-1.05,
        colorMuro:CONFIG.acabados.pared,colorPuerta:'#f3f2ed',colorMarco:'#d6d8d4',interactiva:true,
        anchoPuerta:1.35,altoPuerta:2.53});
      acceso.name='Acceso blanco lateral junto a Atención al Estudiante';
      const hoja=acceso.children.find(o=>o.userData.puertaInteractiva);
      hoja.name='Puerta blanca con apertura hacia el interior';
      // El interior queda en -Z local: el giro positivo recoge la hoja dentro.
      hoja.userData.anguloAbierto=Math.PI/2;
      detallesTopico(acceso,fondo/2-1.05);
      const centroPuerta=fondo/2-1.05;
      revestirPaneles(grupo,{x:x-ancho/2,z,largo:fondo,alto:h,rotacion:-Math.PI/2,
        huecos:[
          [centroPuerta-.715,centroPuerta+.715,0,2.57],
          [centroPuerta-3.175,centroPuerta-.925,2.4175,3.1325]
        ]});
    }
    // El lateral de Tópico se construye completo hasta la fachada nueva.
    if(ambiente.id==='a-topico')ladosPared.delete('norte');
    if(ambiente.id==='a-atencion-publico'){
      ladosPared.delete('oeste');
      const puertaAdmision=paredConPuerta(grupo,{x:x-ancho/2,z,largo:fondo,
        baseY:CONFIG.baseY,alto:h,rotacion:-Math.PI/2,puertaCentro:fondo/2-.95,
        colorMuro:CONFIG.acabados.pared,colorPuerta:'#f3f2ed',colorMarco:'#d6d8d4',interactiva:true});
      puertaAdmision.name='Acceso blanco lateral de Informes y Admisión';
      const centroPuerta=fondo/2-.95;
      revestirPaneles(grupo,{x:x-ancho/2,z,largo:fondo,alto:h,rotacion:-Math.PI/2,
        recorteInicio:.4,huecos:[[centroPuerta-.715,centroPuerta+.715,0,2.69]]});
      bloque(grupo,{x:x-ancho/2-.166,y:alturaCentro,z:z-fondo/2+.2,
        ancho:.025,alto:h,fondo:.4,color:'#40444c'})
        .name='Continuación gris del lateral de Tópico hasta los paneles';
    }
    // También se retira la viga/muro horizontal oscuro de la cafetería.
    if(ladosPared.has('norte')&&ambiente.id!=='c-cafeteria') bloque(grupo,{x,y:alturaCentro,z:z-fondo/2,ancho,alto:h,fondo:espesor,
      material:ambiente.id==='a-atencion-publico'?new THREE.MeshStandardMaterial({color:'#08090b',roughness:.83}):paredMat});
    if(ladosPared.has('sur')) bloque(grupo,{x,y:alturaCentro,z:z+fondo/2,ancho,alto:h,fondo:espesor,material:paredMat});
    if(ladosPared.has('oeste')&&ambiente.id!=='a-conferencias') bloque(grupo,{x:x-ancho/2,y:alturaCentro,z,ancho:espesor,alto:h,fondo,material:paredMat});
    if(ladosPared.has('este')) bloque(grupo,{x:x+ancho/2,y:alturaCentro,z,ancho:espesor,alto:h,fondo,material:paredMat});
    if(ambiente.id==='a-conferencias'){
      // Vano real detrás de la hoja: el muro tampoco debe bloquear el paso.
      const inicioVano=z-fondo/2+1.45,finVano=inicioVano+1.25;
      for(const [desde,hasta] of [[z-fondo/2,inicioVano],[finVano,z+fondo/2]]){
        bloque(grupo,{x:x-ancho/2,y:alturaCentro,z:(desde+hasta)/2,
          ancho:espesor,alto:h,fondo:hasta-desde,material:paredMat});
      }
      bloque(grupo,{x:x-ancho/2,y:CONFIG.baseY+(h+2.45)/2,z:(inicioVano+finVano)/2,
        ancho:espesor,alto:h-2.45,fondo:1.25,material:paredMat});
      revestirPaneles(grupo,{x:x-ancho/2,z,largo:fondo,alto:h,rotacion:-Math.PI/2,accesoJardin:true});
      revestirPaneles(grupo,{x,z:z+fondo/2,largo:ancho,alto:h,rotacion:0});
    }
    if(ambiente.fachada)fachadaTorreA(grupo,{x:x+ancho/2,z,largo:fondo,
      baseY:CONFIG.baseY,alto:h,tipo:ambiente.fachada});
    if(ambiente.id==='a-topico'){
      const extremoFachada=13*w/32,extremoFondo=x-ancho/2;
      const grosorLateralTopico=.8;
      bloque(grupo,{x:(extremoFondo+extremoFachada)/2,y:alturaCentro,
        z:z-fondo/2-(grosorLateralTopico-espesor)/2,
        ancho:extremoFachada-extremoFondo,alto:h,fondo:grosorLateralTopico,material:paredMat})
        .name='Lateral negro completo del Tópico';
      const accesoLateral=paredConPuerta(grupo,{x:extremoFondo,z,largo:fondo,
        baseY:CONFIG.baseY,alto:h,rotacion:-Math.PI/2,puertaCentro:fondo/2-.95,
        colorMuro:'#40444c',colorPuerta:'#102650',colorMarco:'#102650',interactiva:true});
      accesoLateral.name='Acceso azul lateral del Tópico';
      // Cierra el frente marcado, continuando la línea de Admisión.
      // La puerta queda junto a ese muro, en el extremo izquierdo al mirarlo.
      const frente=paredConPuerta(grupo,{x:13*w/32,z,largo:fondo,
        baseY:CONFIG.baseY,alto:h,rotacion:Math.PI/2,puertaCentro:-fondo/2+.8,
        colorMuro:'#08090b',colorPuerta:'#102650',colorMarco:'#102650',interactiva:true});
      frente.name='Muro negro y acceso al Tópico';
      frente.children.find(o=>o.userData.puertaInteractiva).name='Puerta azul marino del Tópico';
    }

    // Los dos lados de acceso de los elevadores se cierran con vidrio y puertas.
    for(const lado of ambiente.paredesVidrio||[]){
      if(lado==='este') paredVidrio(grupo,{x:x+ancho/2,z,largo:fondo,baseY:CONFIG.baseY,alto:h,rotacion:Math.PI/2});
      if(lado==='oeste') paredVidrio(grupo,{x:x-ancho/2,z,largo:fondo,baseY:CONFIG.baseY,alto:h,rotacion:-Math.PI/2});
      if(lado==='sur') paredVidrio(grupo,{x,z:z+fondo/2,largo:ancho,baseY:CONFIG.baseY,alto:h});
    }

    for(const lado of ambiente.paredesConPuertas||[]){
      if(lado==='este') paredConPuertas(grupo,{x:x+ancho/2,z,largo:fondo,baseY:CONFIG.baseY,alto:h,rotacion:Math.PI/2});
      if(lado==='oeste') paredConPuerta(grupo,{x:x-ancho/2,z,largo:fondo,baseY:CONFIG.baseY,alto:h,rotacion:-Math.PI/2,puertaCentro:fondo/2-2});
    }

    // Etiquetas livianas flotantes. Pueden ocultarse desde el panel lateral.
    for(const sector of sectores){
      const etiquetas=etiqueta(capaEtiquetas,sector.nombre,torre.x+(sector.izq+sector.der)/2,CONFIG.baseY+.98,torre.z+z);
      etiquetas.userData.ambiente=sector.id;
    }
  }

  // Apariencia simplificada del uso en algunos espacios.
  if(torre.id==='C'){
    // Mesitas en cafetería, sin bloquear los pasillos.
    for(const dx of [-3.5,2.5]){
      for(const dz of [13.5,18.5]){
        bloque(grupo,{x:dx*factorX,y:CONFIG.baseY+.68,z:posicionZ(dz),ancho:1.8,alto:.10,fondo:1.25,color:'#b08a68'});
        bloque(grupo,{x:dx*factorX,y:CONFIG.baseY+.34,z:posicionZ(dz),ancho:.15,alto:.65,fondo:.15,color:'#6f7d83'});
      }
    }
  }
  if(torre.id==='B'){
    // Estantes esquemáticos de la biblioteca.
    for(const z of [-8,-4,0]) bloque(grupo,{x:-2.8*factorX,y:CONFIG.baseY+.72,z:posicionZ(z),ancho:3.4,alto:1.3,fondo:.43,color:'#9f866e'});
  }
  etiqueta(capaEtiquetas,torre.nombre,torre.x,CONFIG.baseY+4.98,torre.z+torre.fondo/2-4,'tower',torre.id.toLowerCase());
  return grupo;
}

// Mismo despiece y colores de la fachada, sobre las dos caras exteriores ciegas.
function detallesTopico(pared,centroPuerta){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d');
  ctx.font='bold 90px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#e7e5dc';ctx.fillText('Tópico',256,64);
  const mapa=new THREE.CanvasTexture(canvas);mapa.colorSpace=THREE.SRGBColorSpace;
  const rotulo=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.375),
    new THREE.MeshStandardMaterial({map:mapa,transparent:true,roughness:.6}));
  rotulo.name='Rótulo Tópico sobre la puerta blanca';rotulo.position.set(centroPuerta,2.88,.19);pared.add(rotulo);
  const cx=centroPuerta-2.05;
  const marco=new THREE.MeshStandardMaterial({color:'#858780',metalness:.5,roughness:.45});
  const cristal=new THREE.MeshStandardMaterial({color:'#eee7ac',emissive:'#fff0a2',emissiveIntensity:.3,roughness:.3});
  for(let i=0;i<4;i++)bloque(pared,{x:cx+(i-1.5)*.55,y:2.775,z:.2,ancho:.5,alto:.57,fondo:.06,material:cristal}).name='Ventanilla superior de camilla';
  for(let i=0;i<=4;i++)bloque(pared,{x:cx+(i-2)*.55,y:2.775,z:.23,ancho:.055,alto:.65,fondo:.12,material:marco});
  for(const y of [2.45,3.1])bloque(pared,{x:cx,y,z:.23,ancho:2.25,alto:.065,fondo:.12,material:marco});
  const camilla=new THREE.Group();camilla.name='Camilla de emergencia naranja vertical con correas';
  camilla.position.set(cx,.2,.29);pared.add(camilla);
  const contorno=new THREE.Shape();
  contorno.moveTo(-.23,0);contorno.lineTo(.23,0);contorno.quadraticCurveTo(.32,0,.32,.12);
  contorno.lineTo(.32,1.92);contorno.quadraticCurveTo(.32,2.12,0,2.12);
  contorno.quadraticCurveTo(-.32,2.12,-.32,1.92);contorno.lineTo(-.32,.12);contorno.quadraticCurveTo(-.32,0,-.23,0);
  for(const x of [-.235,.235])for(const y of [.3,.75,1.2,1.75]){
    const hueco=new THREE.Path();hueco.absellipse(x,y,.038,.095,0,Math.PI*2,true);contorno.holes.push(hueco);
  }
  const tabla=new THREE.Mesh(new THREE.ExtrudeGeometry(contorno,{depth:.08,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2,steps:1}),
    new THREE.MeshStandardMaterial({color:'#f0641b',roughness:.7}));camilla.add(tabla);
  for(const y of [.42,1.05,1.72]){
    bloque(camilla,{x:0,y,z:.11,ancho:.64,alto:.09,fondo:.035,color:'#303239'});
    bloque(camilla,{x:.04,y,z:.135,ancho:.11,alto:.12,fondo:.025,color:'#a3a5a4'});
  }
  for(const x of [-.17,.17])bloque(camilla,{x,y:1.8,z:.14,ancho:.13,alto:.23,fondo:.12,color:'#d94a14'});
}

function revestirPaneles(padre,{x,z,largo,alto,rotacion,accesoJardin=false,huecos=[],recorteInicio=0}){
  const paneles=new THREE.Group();
  paneles.name='Revestimiento exterior de paneles verticales de Torre A';
  paneles.position.set(x,CONFIG.baseY,z);paneles.rotation.y=rotacion;
  padre.add(paneles);
  if(accesoJardin){
    // Puerta junto al arranque del jardín y seis luces altas, según la fotografía.
    const inicio=-largo/2+1.45,anchoPuerta=1.25,altoPuerta=2.45;
    const marco=new THREE.MeshStandardMaterial({color:'#858780',metalness:.65,roughness:.4});
    const vidrio=new THREE.MeshStandardMaterial({color:'#eee7ac',emissive:'#fff0a2',emissiveIntensity:.3,roughness:.3});
    const pieza=(nombre,datos)=>{const m=bloque(paneles,{z:.22,...datos});m.name=nombre;return m;};
    const hoja=new THREE.Group();hoja.name='Puerta oscura interactiva junto al jardín';
    hoja.position.set(inicio,0,.22);
    Object.assign(hoja.userData,{puerta:true,puertaInteractiva:true,abierta:false,
      anguloAbierto:Math.PI/2,colisionDinamica:true});
    paneles.add(hoja);
    bloque(hoja,{x:anchoPuerta/2,y:altoPuerta/2,ancho:anchoPuerta-.06,
      alto:altoPuerta-.04,fondo:.08,color:'#202a27'}).name='Hoja oscura de puerta lateral junto al jardín';
    huecos=[...huecos,[inicio,inicio+anchoPuerta,0,altoPuerta]];
    for(const px of [inicio-.04,inicio+anchoPuerta+.04])pieza('Jamba metálica de puerta lateral',{x:px,y:altoPuerta/2,ancho:.08,alto:altoPuerta,fondo:.12,material:marco});
    for(const cara of [-1,1])bloque(hoja,{x:anchoPuerta-.18,y:1.05,z:cara*.08,
      ancho:.22,alto:.035,fondo:.07,material:marco}).name='Manija plateada de puerta lateral';
    const anchoVentanas=3.9,paso=anchoVentanas/6,base=altoPuerta,altoVentana=.65;
    for(let i=0;i<6;i++)pieza(`Ventanilla superior lateral ${i+1}`,{x:inicio+(i+.5)*paso,y:base+altoVentana/2,ancho:paso-.055,alto:altoVentana-.08,fondo:.055,material:vidrio});
    for(let i=0;i<=6;i++)pieza('Montante metálico de ventanillas',{x:inicio+i*paso,y:base+altoVentana/2,ancho:.055,alto:altoVentana,fondo:.13,material:marco});
    for(const py of [base,base+altoVentana])pieza('Travesaño metálico de ventanillas',{x:inicio+anchoVentanas/2,y:py,ancho:anchoVentanas+.055,alto:.065,fondo:.13,material:marco});
  }
  const tonos=['#73747a','#55565e','#d7d6d0','#86868b','#65666d','#e2e0d8'];
  const materiales=tonos.map(color=>new THREE.MeshStandardMaterial({color,roughness:.83}));
  const anchos=[.82,.55,1.05,.68,.92,.48];
  let borde=-largo/2+recorteInicio,indice=0;
  while(borde<largo/2-.001){
    const fin=Math.min(largo/2,borde+anchos[indice%anchos.length]);
    const corte=[1.3,2.1,3.2,1.85][indice%4];
    for(const [fila,[abajo,arriba]] of [[0,corte],[corte,alto]].entries()){
      // Recorta el revestimiento para mantener libres el vano y las ventanillas.
      let piezas=[[borde+.009,fin-.009,abajo+.009,arriba-.009]];
      for(const [hx0,hx1,hy0,hy1] of huecos){
        piezas=piezas.flatMap(([x0,x1,y0,y1])=>{
          const a=Math.max(x0,hx0),b=Math.min(x1,hx1),c=Math.max(y0,hy0),d=Math.min(y1,hy1);
          if(a>=b||c>=d)return [[x0,x1,y0,y1]];
          return [[x0,a,y0,y1],[b,x1,y0,y1],[a,b,y0,c],[a,b,d,y1]]
            .filter(([l,r,n,s])=>r-l>.001&&s-n>.001);
        });
      }
      for(const [x0,x1,y0,y1] of piezas)bloque(paneles,{x:(x0+x1)/2,y:(y0+y1)/2,z:.166,
        ancho:x1-x0,alto:y1-y0,fondo:.025,material:materiales[(indice+fila*2)%materiales.length]});
    }
    borde=fin;indice++;
  }
}
