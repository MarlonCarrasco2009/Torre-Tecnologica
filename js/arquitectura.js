import * as THREE from 'three';
import { CONFIG } from './config.js';

// Desarrollo volumétrico de la base existente. No es un cálculo estructural:
// las alturas y la distribución superior requieren planos de levantamiento.
// No se alteran las salas, las puertas ni el circuito de ascensores original.
export function crearArquitectura(escena, torres) {
  const grupo = new THREE.Group();
  grupo.name = 'Desarrollo arquitectónico · Torres A B C';
  grupo.userData.sinColision = true;
  grupo.userData.tipo = 'Volumetría conceptual sobre la base original';
  const estructura = new THREE.Group(), envolvente = new THREE.Group();
  estructura.name = 'Losas, pórticos y conexiones';
  envolvente.name = 'Fachadas, celosías y cubiertas';
  grupo.add(estructura, envolvente);
  escena.add(grupo);

  const materiales = {
    hormigon: new THREE.MeshStandardMaterial({ color:'#d3d5cf', roughness:.76 }),
    claro: new THREE.MeshStandardMaterial({ color:'#e8e8e0', roughness:.56 }),
    oscuro: new THREE.MeshStandardMaterial({ color:'#323d45', roughness:.7 }),
    junta: new THREE.MeshStandardMaterial({ color:'#1a2931', roughness:.62 }),
    acero: new THREE.MeshStandardMaterial({ color:'#53636b', roughness:.34, metalness:.58 }),
    vidrio: new THREE.MeshStandardMaterial({ color:'#789ba5', roughness:.27, metalness:.58 }),
    vidrioClaro: new THREE.MeshStandardMaterial({ color:'#adc2c4', roughness:.31, metalness:.4 }),
    azul: new THREE.MeshStandardMaterial({ color:'#008dce', roughness:.37, metalness:.18 }),
    techo: new THREE.MeshStandardMaterial({ color:'#9daaa9', roughness:.85 }),
  };
  const lotes = new Map(), unidad = new THREE.BoxGeometry(1,1,1);
  const transformacion = new THREE.Object3D();
  const orientar = new THREE.Vector3(0,1,0);
  function caja(capa, material, x,y,z, ancho,alto,fondo, nombre='') {
    if(Math.min(ancho,alto,fondo)<=0) return;
    const clave=`${capa}:${material}`;
    if(!lotes.has(clave)) lotes.set(clave,{capa,material,matrices:[],nombres:[]});
    transformacion.position.set(x,y,z);
    transformacion.quaternion.identity();
    transformacion.scale.set(ancho,alto,fondo);
    transformacion.updateMatrix();
    lotes.get(clave).matrices.push(transformacion.matrix.clone());
    if(nombre) lotes.get(clave).nombres.push(nombre);
  }
  function diagonal(capa,material,desde,hasta,grosor=.2) {
    const clave=`${capa}:${material}`;
    if(!lotes.has(clave)) lotes.set(clave,{capa,material,matrices:[],nombres:[]});
    const a=new THREE.Vector3(...desde), b=new THREE.Vector3(...hasta), delta=b.clone().sub(a);
    transformacion.position.copy(a).add(b).multiplyScalar(.5);
    transformacion.quaternion.setFromUnitVectors(orientar,delta.clone().normalize());
    transformacion.scale.set(grosor,delta.length(),grosor);
    transformacion.updateMatrix();lotes.get(clave).matrices.push(transformacion.matrix.clone());
  }

  escena.updateMatrixWorld(true);
  const ascensor=escena.getObjectByName('Área de elevadores');
  const zona=ascensor?.userData.zonaElevadores;
  const posicionAscensor=ascensor?.getWorldPosition(new THREE.Vector3());
  const zPuente=posicionAscensor?.z ?? 16;
  const separacionFilas=zona?zona.fondo-4.74:4.266;
  const mapearPasillo=z=>z<=-1.38?
    -33.5+(z+33.5)*(zPuente-separacionFilas/2+33.5)/32.12:
    z<=6.75?zPuente-separacionFilas/2+(z+1.38)*separacionFilas/8.13:
    zPuente+separacionFilas/2+(z-6.75)*(32.5-zPuente-separacionFilas/2)/25.75;
  const pasosNuevos=[[.95,5.05],[-35.6,-31.4],[31.3,33.7]].map(([a,b])=>[mapearPasillo(a),mapearPasillo(b)]);
  const cota = piso=>CONFIG.baseY+.085+(piso===2?CONFIG.alturaSegundoPisoB:(piso-1)*CONFIG.altoPiso);
  function tramosLibres(inicio,fin,huecos) {
    let tramos=[[inicio,fin]];
    for(const [a,b] of huecos) tramos=tramos.flatMap(([desde,hasta])=>{
      if(hasta<=a||desde>=b)return [[desde,hasta]];
      return [[desde,Math.min(a,hasta)],[Math.max(b,desde),hasta]].filter(([i,f])=>f-i>.001);
    });
    return tramos;
  }
  const alturas={A:10,B:11,C:10};
  const huellas={};
  for(const torre of Object.values(CONFIG.torres)) {
    const {id,x,z}=torre, ancho=torre.ancho*.86, fondo=torre.fondo-5.6;
    const xmin=x-ancho/2, xmax=x+ancho/2, zmin=z-fondo/2, zmax=z+fondo/2;
    const pisos=alturas[id], coronacion=cota(pisos+1);
    huellas[id]={xmin,xmax,zmin,zmax,coronacion};
    // La cota de cada losa coincide con la llegada del ascensor existente.
    for(let piso=2;piso<=pisos+1;piso++) {
      const y=cota(piso)-.18;
      const losaDetallada=(id==='A'&&piso<=7)||(id==='B'&&piso===2);
      if(losaDetallada){ /* La losa ya forma parte de la planta detallada. */ } else if(id==='B' && zona && piso<=pisos) {
        // Hueco real para las cabinas y su vestíbulo: no se superpone una losa.
        const hx=posicionAscensor.x, hz=posicionAscensor.z;
        const hw=zona.ancho+.25, hd=zona.fondo+.25;
        const hxmin=Math.max(xmin,hx-hw/2), hxmax=Math.min(xmax,hx+hw/2);
        const hzmin=Math.max(zmin,hz-hd/2), hzmax=Math.min(zmax,hz+hd/2);
        caja('s','hormigon',x,y,(zmin+hzmin)/2,ancho,.36,hzmin-zmin);
        caja('s','hormigon',x,y,(hzmax+zmax)/2,ancho,.36,zmax-hzmax);
        caja('s','hormigon',(xmin+hxmin)/2,y,hz,xmin<hxmin?hxmin-xmin:0,.36,hd);
        caja('s','hormigon',(hxmax+xmax)/2,y,hz,xmax-hxmax,.36,hd);
      } else caja('s','hormigon',x,y,z,ancho,.36,fondo);

      // Vigas de borde y goterones: remate continuo, con sombra bajo cada nivel.
      for(const lado of [-1,1]) {
        caja('s','claro',x+lado*(ancho/2+.10),y+.05,z,.3,.54,fondo+.35);
        caja('e','junta',x+lado*(ancho/2+.12),y-.28,z,.14,.11,fondo+.35);
        caja('s','claro',x,y+.05,z+lado*(fondo/2+.1),ancho+.5,.54,.3);
      }
      if(piso>pisos) continue;
      const h=cota(piso+1)-cota(piso)-.36, cy=cota(piso)+h/2;
      const tramos=8, largo=fondo/tramos;
      for(let i=0;i<=tramos;i++) {
        const zz=zmin+i*largo;
        for(const lado of [-1,1]) {
          const xx=x+lado*(ancho/2-.45);
          const conecta=(id==='B'||(id==='C'&&lado===1)||(id==='A'&&lado===-1))&&piso<=10;
          const pasos=piso>=5?pasosNuevos:[[zPuente-1.62,zPuente+1.62],[-22.62,-19.38]];
          if(conecta&&pasos.some(([a,b])=>zz>a-.31&&zz<b+.31))continue;
          // Las fachadas quedan sobre los ejes longitudinales de los muros de base.
          caja('s','oscuro',xx,cy,zz,.62,h,.62);
          caja('s','oscuro',xx,cota(piso)+h-.17,zz,.85,.34,largo*.25);
        }
      }
      // Cierres longitudinales: bandas antracita, vidrio y montantes finos.
      for(const lado of [-1,1]) {
        const xx=x+lado*(ancho/2+.03);
        const conecta=(id==='B'||(id==='C'&&lado===1)||(id==='A'&&lado===-1))&&piso<=10;
        const huecos=conecta?(piso>=5?pasosNuevos:[[zPuente-1.62,zPuente+1.62],[-22.62,-19.38]])
          .map(([a,b])=>[Math.max(a,zmin),Math.min(b,zmax)]).filter(([a,b])=>b-a>.15):[];
        for(const [desde,hasta] of tramosLibres(zmin,zmax,huecos))
          caja('e','oscuro',xx,cota(piso)+.36,(desde+hasta)/2,.20,.70,hasta-desde);
        caja('e','oscuro',xx,cota(piso)+h-.21,z,.20,.42,fondo);
        for(let i=0;i<tramos*2;i++) {
          const paso=fondo/(tramos*2), zz=zmin+(i+.5)*paso;
          for(const [desde,hasta] of tramosLibres(zz-paso/2+.04,zz+paso/2-.04,huecos)) {
            caja('e',i%5===0?'vidrioClaro':'vidrio',xx,cota(piso)+2.15,(desde+hasta)/2,.12,2.87,hasta-desde);
            caja('e','acero',xx+lado*.09,cota(piso)+2.15,desde,.16,2.93,.075);
            caja('e','acero',xx+lado*.1,cota(piso)+1.18,(desde+hasta)/2,.16,.07,hasta-desde);
          }
        }
        for(const [desde,hasta] of huecos) {
          for(const zz of [desde,hasta]) caja('e','acero',xx,cota(piso)+1.52,zz,.2,3.04,.1);
          caja('e','acero',xx,cota(piso)+3.04,(desde+hasta)/2,.2,.1,hasta-desde);
          caja('e','vidrio',xx,cota(piso)+3.43,(desde+hasta)/2,.12,.66,hasta-desde);
        }
        // Banda diagonal visible sobre vidrio, continua a lo largo de dos pisos.
        if(piso%2===0 && piso+1<=pisos) {
          for(let i=0;i<tramos;i+=2) {
            const za=zmin+i*largo, zb=zmin+(i+2)*largo;
            if(huecos.some(([a,b])=>za<b&&zb>a))continue;
            diagonal('s','acero',[xx+lado*.22,cota(piso)+.45,za],
              [xx+lado*.22,cota(piso+2)-.48,(za+zb)/2],.23);
            diagonal('s','acero',[xx+lado*.22,cota(piso+2)-.48,(za+zb)/2],
              [xx+lado*.22,cota(piso)+.45,zb],.23);
          }
        }
      }
      // Testeros: panel central oscuro y ventanas a ambos lados; juntas horizontales.
      for(const signo of [-1,1]) {
        const zz=z+signo*(fondo/2+.02), nucleo=ancho*.48;
        caja('e','oscuro',x,cy,zz,nucleo,h,.26);
        caja('e','junta',x,cota(piso)+.82,zz+signo*.14,nucleo,.035,.025);
        for(const lado of [-1,1]) {
          const segmento=(ancho-nucleo)/2;
          caja('e','vidrio',x+lado*(nucleo/2+segmento/2),cy,zz,segmento-.15,h-.42,.12);
          caja('e','acero',x+lado*(nucleo/2+.03),cy,zz+signo*.1,.08,h,.15);
          caja('e','acero',x+lado*(ancho/2-.04),cy,zz+signo*.1,.09,h,.15);
        }
      }
    }
    // Viga de transferencia sobre la base: por encima de las puertas y circulaciones.
    for(const lado of [-1,1]) caja('s','oscuro',x+lado*(ancho/2-.45),cota(2)-.62,z,.78,.54,fondo);
    // Sobre los ejes de muros macizos existentes se completa el encuentro con la
    // primera losa. No se añaden pilares delante de la cafetería ni en los pasos.
    if(id==='C') for(const zz of [-26,-13,0,8]) for(const lado of [-1,1])
      caja('s','oscuro',x+lado*(ancho/2-.45),(CONFIG.baseY+cota(2)-.36)/2,z+zz,.42,cota(2)-.36-CONFIG.baseY,.42);
    if(id==='B') for(const zz of [-27,-8]) for(const lado of [-1,1])
      caja('s','oscuro',x+lado*(ancho/2-.45),(CONFIG.baseY+cota(2)-.36)/2,z+zz,.38,cota(2)-.36-CONFIG.baseY,.38);
    // Cubierta plana, peto y coronación fina. Equipos discretos agrupados al centro.
    caja('e','techo',x,coronacion+.03,z,ancho-.6,.10,fondo-.6);
    for(const lado of [-1,1]) {
      caja('e','oscuro',x+lado*(ancho/2-.2),coronacion+.57,z,.34,1.1,fondo);
      caja('e','claro',x+lado*(ancho/2-.2),coronacion+1.13,z,.5,.12,fondo+.15);
      caja('e','oscuro',x,coronacion+.57,z+lado*(fondo/2-.2),ancho,1.1,.34);
      caja('e','claro',x,coronacion+1.13,z+lado*(fondo/2-.2),ancho+.15,.12,.5);
    }
    // Torre A recibe los dieciséis equipos del croquis del piso 11 mediante
    // crearContexto(); no se conserva encima un segundo conjunto genérico.
    if(id!=='A') {
      caja('e','oscuro',x,coronacion+1.15,z-fondo*.22,ancho*.54,2.2,8.5);
      caja('e','claro',x,coronacion+2.32,z-fondo*.22,ancho*.58,.16,8.85);
      for(let i=0;i<4;i++) {
        caja('e','acero',x,coronacion+.37,z+6+i*3.4,ancho*.46,.65,2.3);
        for(let j=0;j<5;j++) caja('e','junta',x-ancho*.19+j*ancho*.095,coronacion+.71,z+6+i*3.4,.07,.03,2.0);
      }
    }
    // Acentos azules verticales y el distintivo SENATI sobre el testero.
    for(const signo of [-1,1]) {
      caja('e','azul',x-ancho*.25,coronacion-7.5,z+signo*(fondo/2+.18),.15,7.8,.06);
      if(typeof document!=='undefined') {
        const canvas=document.createElement('canvas');canvas.width=768;canvas.height=384;
        const ctx=canvas.getContext('2d');
        ctx.fillStyle='#009cdb';ctx.textAlign='center';
        ctx.font='700 82px Arial';ctx.fillText('SENATI',384,186);
        ctx.font='500 37px Arial';ctx.fillText(`TORRE ${id}`,384,251);
        const textura=new THREE.CanvasTexture(canvas);textura.colorSpace=THREE.SRGBColorSpace;
        const m=new THREE.Mesh(new THREE.PlaneGeometry(ancho*.45,ancho*.225),
          new THREE.MeshBasicMaterial({map:textura,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
        m.name=`Identidad · Torre ${id}`;
        m.position.set(x,coronacion-4.8,z+signo*(fondo/2+.17));
        m.rotation.y=signo<0?Math.PI:0;
        envolvente.add(m);
      }
    }
    if(torres?.[id]) torres[id].userData.desarrollo={pisos,altura:coronacion,conceptual:true};
  }

  // Dos bandas de conexión entre los bloques. La principal coincide con el núcleo
  // de elevadores; la posterior conserva una segunda lectura de circulación.
  for(const [izq,der] of [['C','B'],['B','A']]) {
    const xa=huellas[izq].xmax, xb=huellas[der].xmin, centro=(xa+xb)/2;
    // Desde el piso 5 las conexiones provienen de los croquis y de crearContexto.
    // Conservar el segundo puente genérico atravesaría los nuevos patios.
    for(let piso=2;piso<=4;piso++) {
      if(der==='A')continue; // Estas pasarelas ya forman parte de las plantas detalladas.
      for(const zz of [zPuente,-21]) {
        const y=cota(piso), largo=xb-xa, anchoPaso=3.25;
        caja('s','hormigon',centro,y-.18,zz,largo,.36,anchoPaso);
        for(const lado of [-1,1]) {
          caja('s','oscuro',centro,y-.45,zz+lado*(anchoPaso/2-.12),largo,.28,.28);
          caja('e','vidrioClaro',centro,y+.59,zz+lado*(anchoPaso/2-.08),largo,1.12,.07);
          caja('s','acero',centro,y+1.17,zz+lado*anchoPaso/2,largo,.075,.075);
          for(let i=0;i<=4;i++) caja('s','acero',xa+i*largo/4,y+.59,zz+lado*anchoPaso/2,.07,1.17,.07);
        }
      }
    }
  }
  for(const lote of lotes.values()) {
    const mesh=new THREE.InstancedMesh(unidad,materiales[lote.material],lote.matrices.length);
    mesh.name=`${lote.capa==='s'?'Estructura':'Envolvente'} · ${lote.material}`;
    lote.matrices.forEach((matriz,i)=>mesh.setMatrixAt(i,matriz));
    mesh.instanceMatrix.needsUpdate=true;
    mesh.castShadow=true;mesh.receiveShadow=true;
    mesh.computeBoundingBox();mesh.computeBoundingSphere();
    (lote.capa==='s'?estructura:envolvente).add(mesh);
  }
  let modo='completo';
  function setModo(valor) {
    if(!['completo','base','estructura'].includes(valor)) throw new Error(`Modo arquitectónico desconocido: ${valor}`);
    modo=valor;grupo.visible=valor!=='base';estructura.visible=true;envolvente.visible=valor==='completo';
  }
  return {grupo,estructura,envolvente,setModo,get modo(){return modo;},huellas,alturas};
}
