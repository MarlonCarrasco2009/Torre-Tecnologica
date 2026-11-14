import * as THREE from 'three';
import { bloque, etiqueta } from './geometria.js';

// Un solo edificio: fachada hacia -Z y torniquetes hacia el patio (+Z).
// La caja queda a la izquierda al mirar la fachada desde fuera.
export function crearIngreso(grupo,{x,z,baseY,escalaAncho=1,bordeIzquierdo=-5.9,escalaFondo=1,bordeFrontal=-3.2,fondoLateral=6.38}){
  const ingreso=new THREE.Group();
  ingreso.name='Ingreso';ingreso.position.set(x,baseY,z);grupo.add(ingreso);
  // El borde izquierdo queda fijo y el extremo derecho llega a la línea marcada.
  ingreso.scale.x=escalaAncho;
  ingreso.position.x += bordeIzquierdo*(1-escalaAncho);
  // El borde frontal queda fijo y el extremo posterior llega a la línea marcada.
  ingreso.scale.z=escalaFondo;
  ingreso.position.z += bordeFrontal*(1-escalaFondo);
  const limitePatio=3.2,recortePatio=0,centroFondo=0;
  const frenteLateral=-3.19,centroLateral=frenteLateral+fondoLateral/2;
  const aluminio=new THREE.MeshStandardMaterial({color:'#bfc2c6',metalness:.32,roughness:.48});
  const claro=new THREE.MeshStandardMaterial({color:'#d3d4d5',metalness:.18,roughness:.65});
  const acero=new THREE.MeshStandardMaterial({color:'#aeb8bd',metalness:.75,roughness:.29});
  const oscuro=new THREE.MeshStandardMaterial({color:'#20292f',metalness:.25,roughness:.46});
  const junta=new THREE.MeshStandardMaterial({color:'#858b90',roughness:.8});
  const luz=new THREE.MeshStandardMaterial({color:'#fff4d9',emissive:'#ffe6b5',emissiveIntensity:.9});
  const pieza=(nombre,px,py,pz,w,h,d,material=aluminio,padre=ingreso)=>{
    const m=bloque(padre,{x:px,y:py,z:pz,ancho:w,alto:h,fondo:d,material});
    m.name=nombre;return m;
  };
  const tubo=(padre,a,b,radio=.023)=>{
    const inicio=new THREE.Vector3(...a),fin=new THREE.Vector3(...b),direccion=fin.clone().sub(inicio);
    const m=new THREE.Mesh(new THREE.CylinderGeometry(radio,radio,direccion.length(),10),acero);
    m.position.copy(inicio).add(fin).multiplyScalar(.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direccion.normalize());
    m.name='Tubo de acero';m.castShadow=true;padre.add(m);return m;
  };
  const rotulo=(nombre,px,py,pz,w,h,dibujar,altoLienzo=512,padre=ingreso)=>{
    const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=altoLienzo;
    dibujar(canvas.getContext('2d'));
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({
      map,transparent:true,roughness:.6,depthWrite:false
    }));
    m.name=nombre;m.position.set(px,py,pz);m.rotation.y=Math.PI;
    m.userData.sinColision=true;padre.add(m);
  };

  // Plataforma maciza: todo el conjunto comparte la cota del patio.
  pieza('Base continua del ingreso',0,-baseY/2-.005,.3+centroFondo,11.8,baseY-.01,8.5-recortePatio,
    new THREE.MeshStandardMaterial({color:'#777d82',roughness:.85}));
  const lienzo=document.createElement('canvas');lienzo.width=lienzo.height=512;
  const ctx=lienzo.getContext('2d');let semilla=17;
  const azar=()=>{semilla=(semilla*1664525+1013904223)>>>0;return semilla/4294967296;};
  ctx.fillStyle='#777c82';ctx.fillRect(0,0,512,512);
  for(let i=0;i<4500;i++){
    const px=azar()*512,py=azar()*512,v=95+Math.floor(azar()*75);
    ctx.strokeStyle=`rgba(${v},${v},${v},.26)`;ctx.lineWidth=.4+azar();
    ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+4+azar()*22,py-2-azar()*8);ctx.stroke();
  }
  ctx.strokeStyle='#a0a3a6';ctx.lineWidth=2;ctx.strokeRect(0,0,512,512);
  const piedra=new THREE.CanvasTexture(lienzo);piedra.wrapS=piedra.wrapT=THREE.RepeatWrapping;
  piedra.repeat.set(14,10*(8.5-recortePatio)/8.5);piedra.colorSpace=THREE.SRGBColorSpace;
  const piso=new THREE.Mesh(new THREE.PlaneGeometry(11.8,8.5-recortePatio),new THREE.MeshStandardMaterial({
    map:piedra,bumpMap:piedra,bumpScale:.018,roughness:.62,
    polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2
  }));
  piso.name='Pavimento continuo de piedra';piso.rotation.x=-Math.PI/2;
  piso.position.set(0,0,.3+centroFondo);piso.receiveShadow=true;ingreso.add(piso);

  // Marquesina única, pilares de ambos extremos y machón entre caja y portones.
  // El extremo derecho del techo termina a ras de la columna lateral; el izquierdo conserva su vuelo.
  pieza('Cubierta común de ingreso y caja',.22,4.67,centroFondo,11.76,.46,6.4-recortePatio);
  pieza('Cielo raso panelado',.165,4.425,centroFondo,11.65,.03,6.2-recortePatio,
    new THREE.MeshStandardMaterial({color:'#777d85',metalness:.18,roughness:.7}));
  for(let px=-5.3;px<=5.71;px+=.6){
    for(const pz of [-3.206,limitePatio+.006])pieza('Junta de marquesina',px,4.67,pz,.009,.45,.008,junta);
    pieza('Junta longitudinal de cielo raso',px,4.403,centroFondo,.009,.009,6.2-recortePatio,junta);
  }
  for(const pz of [-2.4,-1.2,0,1.2,2.4].filter(pz=>pz<limitePatio-.1))pieza('Junta transversal de cielo raso',0,4.403,pz,11.98,.009,.009,junta);
  for(const px of [2.0]){
    for(const pz of [-2.42,2.42-recortePatio]){
      pieza('Pilar del ingreso',px,2.22,pz,.4,4.44,.44);
      for(let py=.65;py<4.4;py+=.65){
        for(const cara of [-1,1])pieza('Junta horizontal de pilar',px,py,pz+cara*.224,.4,.009,.008,junta);
      }
    }
  }
  // Se conserva el lateral reducido; solo se retiró el pilar independiente del extremo izquierdo.
  const lateralIngreso=pieza('Cerramiento lateral del pórtico',-5.5,2.22,centroLateral,.4,4.44,fondoLateral);
  lateralIngreso.userData.sinColision=true;
  for(let py=.65;py<4.4;py+=.65)pieza('Junta de lateral',-5.333,py,centroLateral,.008,.009,fondoLateral,junta);

  // El lateral derecho se rellena de suelo a techo, a ras de sus pilares.
  pieza('Cerramiento lateral derecho del pórtico',5.5,2.22,centroFondo,.4,4.44,6.38-recortePatio);
  for(let py=.65;py<4.4;py+=.65){
    for(const px of [5.296,5.704])pieza('Junta de lateral derecho',px,py,centroFondo,.008,.009,6.38-recortePatio,junta);
    for(const pz of [-3.194,3.194-recortePatio])pieza('Junta de extremo del lateral derecho',5.5,py,pz,.4,.009,.008,junta);
  }

  // Caja integrada: ventana frontal, pared posterior y mismo revestimiento.
  const caseta=new THREE.Group();caseta.name='Caja integrada en Ingreso';ingreso.add(caseta);
  pieza('Volumen de caja',3.65,2.0,centroFondo,3.5,4.0,4.84-recortePatio,claro,caseta);
  pieza('Zócalo de caja',3.65,.045,-2.425,3.5,.09,.04,junta,caseta);
  for(let py=.65;py<3.95;py+=.65)pieza('Junta posterior de caja',3.65,py,2.425-recortePatio,3.5,.009,.008,junta,caseta);
  pieza('Marco de ventanilla',3.65,1.3,-2.45,1.4,1.4,.09,acero,caseta);
  pieza('Cristal de ventanilla',3.65,1.3,-2.502,1.25,1.27,.025,
    new THREE.MeshStandardMaterial({color:'#23404e',metalness:.62,roughness:.18}),caseta);
  pieza('Reflejo de ventanilla',3.37,1.3,-2.517,.018,1.24,.008,aluminio,caseta);
  pieza('Alféizar de caja',3.65,.56,-2.55,1.6,.1,.28,claro,caseta);
  for(const px of [2.35,4.95]){
    pieza('Aplique de fachada',px,2.18,-2.5,.26,.11,.16,oscuro,caseta);
    pieza('Difusor de aplique',px,2.115,-2.52,.22,.016,.12,luz,caseta);
  }
  rotulo('Rótulo del Centro Tecnológico',3.65,3.2,-2.425,3.0,1.32,c=>{
    c.fillStyle='#42484e';c.textAlign='left';c.textBaseline='middle';
    c.font='bold 150px Arial';c.fillText('CENTRO',40,78);c.fillText('TECNOLÓGICO',40,215);
    c.font='bold 132px Arial';c.fillText('Campus',40,347);c.fillText('Independencia',40,464);
  });

  // Seis hojas de reja, con una hoja estrecha como en la referencia frontal.
  const portones=new THREE.Group();portones.name='Portones del ingreso';ingreso.add(portones);
  // Las hojas quedan dentro del pórtico; el dintel y la estructura permanecen fijos.
  portones.position.z=1.75;
  const puertaZ=-2.12;
  pieza('Dintel continuo de portones',-1.75,3.18,puertaZ,7.5,.56,.32,aluminio,portones);
  let borde=-5.5;
  for(const [i,ancho] of [1.7,1.1,1.28,1.28,.48,1.66].entries()){
    const hoja=new THREE.Group();hoja.name=`Hoja ${i+1} del portón`;
    hoja.position.set(borde+ancho/2,0,puertaZ);portones.add(hoja);
    for(const lado of [-1,1])pieza('Marco vertical',lado*(ancho/2-.04),1.47,0,.075,2.84,.115,aluminio,hoja);
    for(const py of [.1,2.84])pieza('Marco horizontal',0,py,0,ancho,.12,.115,aluminio,hoja);
    pieza('Zócalo de hoja',0,.19,0,ancho-.1,.16,.07,aluminio,hoja);
    const cantidad=Math.round(ancho/.115);
    for(let j=1;j<cantidad;j++)pieza('Barrote de reja',-ancho/2+j*ancho/cantidad,1.53,0,.018,2.54,.03,acero,hoja);
    for(const py of [.85,2.47])pieza('Travesaño de reja',0,py,0,ancho-.1,.028,.036,acero,hoja);
    const tirador=(i%2? -1:1)*(ancho/2-.14);
    for(const cara of [-1,1]){
      tubo(hoja,[tirador,1.03,cara*.14],[tirador,1.27,cara*.14],.018);
      for(const py of [1.03,1.27])tubo(hoja,[tirador,py,cara*.055],[tirador,py,cara*.14],.018);
    }
    borde+=ancho;
  }
  rotulo('Número 3365 y SENATI',-1.75,3.18,puertaZ-.167,7.26,.45,c=>{
    c.fillStyle='#f6f6f4';c.textBaseline='middle';c.font='bold 72px Arial';
    c.fillText('3365',95,68);c.font='bold 92px Arial';c.fillText('SENATI',785,68);
    // Emblema geométrico, dibujado en el mismo plano del rótulo.
    c.strokeStyle='#f6f6f4';c.lineWidth=8;
    c.beginPath();c.moveTo(722,19);c.lineTo(682,19);c.lineTo(657,64);
    c.lineTo(682,109);c.lineTo(724,109);c.lineTo(747,64);c.lineTo(724,35);
    c.lineTo(691,35);c.lineTo(677,64);c.lineTo(720,64);c.lineTo(710,87);c.lineTo(687,87);c.stroke();
  },128,portones);
  pieza('Luminaria lineal bajo cubierta',-1.45,4.375,0,.12,.045,1.3,luz);

  // Parte trasera: seis torniquetes de acero, paso lateral y arco detector.
  const controles=new THREE.Group();controles.name='Control posterior del ingreso';ingreso.add(controles);
  // Los equipos acompañan el extremo recortado y siguen bajo la cubierta.
  controles.position.z=1.35-recortePatio;
  for(let i=0;i<6;i++){
    const t=new THREE.Group();t.name=`Torniquete ${i+1}`;t.position.set(-3.55+i*.8,0,1.4);controles.add(t);
    const cuerpo=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,1.06,20),acero);
    cuerpo.name='Cuerpo redondeado de acero';cuerpo.scale.z=1.48;cuerpo.position.y=.55;
    cuerpo.castShadow=true;t.add(cuerpo);
    const tapa=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.065,20),oscuro);
    tapa.scale.z=1.48;tapa.position.y=1.108;tapa.rotation.x=-.08;t.add(tapa);
    pieza('Lector de tarjeta',0,1.15,.1,.12,.012,.13,oscuro,t);
    pieza('Indicador del lector',0,1.16,.16,.055,.008,.018,
      new THREE.MeshStandardMaterial({color:'#65c3bb',emissive:'#277d73',emissiveIntensity:.35}),t);
    const eje=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.12,12),acero);
    eje.rotation.z=Math.PI/2;eje.position.set(-.23,.84,0);t.add(eje);
    for(let brazo=0;brazo<3;brazo++){
      const ang=brazo*Math.PI*2/3;
      tubo(t,[-.25,.84,0],[-.58,.84+Math.sin(ang)*.28,Math.cos(ang)*.28],.024);
    }
  }
  // Barrera abatible en el extremo izquierdo de la vista trasera.
  tubo(controles,[-3.98,.04,1.4],[-3.98,1.08,1.4],.035);
  const barrera=[[-4.52,.69,1.4],[-4.52,1.01,1.4],[-4.06,1.01,1.4],[-4.06,.69,1.4],[-4.52,.69,1.4]];
  for(let i=1;i<barrera.length;i++)tubo(controles,barrera[i-1],barrera[i],.025);
  const arco=new THREE.Group();arco.name='Arco detector';
  arco.position.set(1.15,0,1.4);controles.add(arco);
  for(const px of [-.43,.43]){
    pieza('Columna del detector',px,1.12,0,.11,2.24,.38,oscuro,arco);
    pieza('Canto metálico del detector',px-.055,1.12,.195,.022,2.24,.018,acero,arco);
  }
  pieza('Cabezal del detector',0,2.19,0,.86,.2,.38,oscuro,arco);
  pieza('Indicador del detector',0,2.19,.196,.42,.055,.012,aluminio,arco);
  // Amplía el vano desde el lateral izquierdo fijo; la caja se traslada entera.
  const ampliacion=2.4,izquierda=-5.5,derechaVano=2;
  ingreso.updateWorldMatrix(true,true);
  const inversaIngreso=ingreso.matrixWorld.clone().invert();
  const punto=new THREE.Vector3();
  ingreso.traverse(obj=>{
    if(!obj.isMesh)return;
    obj.geometry=obj.geometry.clone();
    const localAIngreso=new THREE.Matrix4().multiplyMatrices(inversaIngreso,obj.matrixWorld);
    const ingresoALocal=localAIngreso.clone().invert();
    const posiciones=obj.geometry.attributes.position;
    for(let i=0;i<posiciones.count;i++){
      punto.fromBufferAttribute(posiciones,i).applyMatrix4(localAIngreso);
      punto.x+=ampliacion*THREE.MathUtils.clamp((punto.x-izquierda)/(derechaVano-izquierda),0,1);
      punto.applyMatrix4(ingresoALocal);
      posiciones.setXYZ(i,punto.x,punto.y,punto.z);
    }
    posiciones.needsUpdate=true;
    obj.geometry.computeVertexNormals();
    obj.geometry.computeBoundingBox();
    obj.geometry.computeBoundingSphere();
  });
  etiqueta(ingreso,'Ingreso',ampliacion/2,5.35,centroFondo,'zone','ingreso-label');
  return ingreso;
}
