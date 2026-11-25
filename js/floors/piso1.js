import {crearPiso1C} from './piso1-c.js';
import * as THREE from 'three';
import { ajustarX,ajustarZ } from '../franja-campus.js';
import { AMBIENTES,CONFIG,distribucionInterior } from '../config.js';
import { bloque,placa,columna,etiqueta,paredVidrio,paredConPuertas,paredConPuerta,fachadaTorreA,finVidrioAdmision } from '../geometria.js';
import { crearZonaElevadores,ENSANCHE_POR_FILA,cotaPiso,acabadoFranjasElevadores,materialLosetasElevadores } from '../elevadores.js';

const acabadoTabiquesAdmision=new THREE.MeshStandardMaterial({color:'#40444c',roughness:.84});
const acabadoParedEscalera=new THREE.MeshStandardMaterial({color:'#edeae2',roughness:.9});
const anchoPasilloOesteA=2;
const grisFachada=new THREE.MeshStandardMaterial({color:'#40444c',roughness:.9});

function crearLosaSegundo(padre,torre,paños,sueloVestibulo=null){
  const losa=new THREE.Group();
  losa.name=`Losa del segundo piso de Torre ${torre.id}`;
  padre.add(losa);
  const superior=cotaPiso(2),inferior=CONFIG.baseY+.01+CONFIG.altoPiso;
  const material=new THREE.MeshStandardMaterial({color:'#c7c5be',roughness:.88});
  for(const [izq,der,desde,hasta,acabadoSuperior] of paños){
    const pieza=bloque(losa,{x:(izq+der)/2,z:(desde+hasta)/2,y:(inferior+superior)/2,
      ancho:der-izq,fondo:hasta-desde,alto:superior-inferior,material});
    if(acabadoSuperior)pieza.material=[material,material,acabadoSuperior,material,material,material];
    if(torre.id==='A')pieza.material=[material,grisFachada,acabadoSuperior??material,material,grisFachada,material];
    // Los dos puentes salen del borde este de B y sus costados miran hacia ±Z.
    if(torre.id==='B' && izq===torre.ancho/2){
      pieza.material=[material,material,acabadoSuperior??material,material,grisFachada,grisFachada];
    }
    if(sueloVestibulo && acabadoSuperior===sueloVestibulo.material){
      const {width,depth}=sueloVestibulo.geometry.parameters;
      const {position,uv}=pieza.geometry.attributes;
      const origen=padre.worldToLocal(sueloVestibulo.getWorldPosition(new THREE.Vector3()));
      for(let i=0;i<uv.count;i++){
        if(pieza.geometry.attributes.normal.getY(i)<.99)continue;
        const x=torre.x+pieza.position.x+position.getX(i);
        const z=torre.z+pieza.position.z+position.getZ(i);
        uv.setXY(i,.5+(ajustarX(x)-ajustarX(torre.x+origen.x))/width,
          .5-(ajustarZ(z,x)-ajustarZ(torre.z+origen.z,torre.x+origen.x))/depth);
      }
    }
  }
}

// Devuelve un grupo independiente por torre: exactamente el PRIMER piso.
// Los demás niveles los crearán otros compañeros en módulos diferentes.
export function crearPiso1(torre, objetosSeleccionables, capaEtiquetas){
  if(torre.id==='C')return crearPiso1C(torre,objetosSeleccionables,capaEtiquetas);
  const grupo=new THREE.Group(); grupo.name=`Piso 1 - Torre ${torre.id}`;
  const w=torre.ancho,d=torre.fondo;
  // El diseño anterior usaba 16 x 54 para todas las torres. Ahora los ambientes
  // crecen con la huella real de C, B y A, sin alterar el archivo de cada piso.
  const factorX=w/16;
  const {factorZ,desplazamientoZ}=distribucionInterior(torre);
  const posicionZ=z=>z*factorZ+desplazamientoZ;
  const avanceDerecha=torre.id==='B'?2*ENSANCHE_POR_FILA:0;
  const avanceElevadores=-3; // Hacia la Biblioteca en el eje Z de la Torre B.
  const finMuroJardinB=-1;
  const inicioMuroJardinB=-33.22;
  const inicioVentana=inicioMuroJardinB+.9,anchoVentana=1.65,finVentana=inicioVentana+anchoVentana;
  const finGris=finVentana+1.6;
  const finPaso=finGris+1.1/CONFIG.escalaLongitudinalCampus;
  const profundidadAcceso=1.5;
  const ejePosteriorB=posicionZ(-25)-avanceDerecha+1.25;
  // Base maciza elevada: la cara superior queda a la cota de llegada de las escaleras.
  const baseInferior=.08,superficie=CONFIG.baseY+.01;
  const base={y:(baseInferior+superficie)/2,
    alto:superficie-baseInferior,fondo:d,color:CONFIG.acabados.piso};
  const ceramica=torre.id==='B'?crearCeramicaBlanca():null;
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
  }else if(torre.id==='B'){
    const elevadores=AMBIENTES.B.find(ambiente=>ambiente.id==='b-elevadores');
    const bordeJardin=posicionZ(elevadores.z)+elevadores.fondo*factorZ/2-elevadores.recorteFrontal+1.5+avanceElevadores;
    const caraOeste=-elevadores.ancho*factorX/2-.15;
    const caraPosterior=ejePosteriorB+.15;
    const fondoAcceso=caraOeste+.3+profundidadAcceso;
    bloque(grupo,{...base,x:(caraOeste+fondoAcceso)/2,ancho:fondoAcceso-caraOeste,
      z:(finPaso+finGris)/2,fondo:finPaso-finGris}).name='Pavimento del acceso a la biblioteca';
    bloque(grupo,{...base,x:(caraOeste-w/2)/2,ancho:caraOeste+w/2,
      z:(bordeJardin+caraPosterior)/2,fondo:bordeJardin-caraPosterior})
      .name='Pavimento lateral oeste de Torre B';
    bloque(grupo,{...base,ancho:w,z:(bordeJardin+d/2)/2,fondo:d/2-bordeJardin})
      .name='Base frontal de Torre B';
  }else{
    bloque(grupo,{...base,ancho:w});
  }

  // Una columna gruesa en cada círculo del croquis: zonas abiertas de A y B.
  // Sustituye las filas de pilares delgados de esas dos torres.
  if(torre.id==='A'||torre.id==='B'){
    const anchoColumna=1.9;
    const colorColumnasPasillo='#65666A';
    // Compensa la escala Z del campus para conservar la sección cuadrada en planta.
    const fondoColumna=anchoColumna/CONFIG.escalaLongitudinalCampus;
    const retiroDelJardin=1.2;
    if(torre.id==='B'){
      const soporteLateral=bloque(grupo,{x:4.6,z:d/2-7.5-retiroDelJardin,y:superficie+CONFIG.altoPiso/2,
        ancho:anchoColumna,alto:CONFIG.altoPiso,fondo:fondoColumna,color:colorColumnasPasillo});
      soporteLateral.userData.conservarForma=true;
      soporteLateral.name='Columna frontal junto al jardín - Torre B';
      const soportePasillo=soporteLateral.clone();
      soportePasillo.name='Segunda columna del pasillo - Torre B';
      soportePasillo.position.x=-3.4;
      grupo.add(soportePasillo);
      const inicioMuro=inicioMuroJardinB,finMuro=finMuroJardinB,altoMuro=4.4;
      const muro={x:w/2+.15,z:(inicioMuro+finMuro)/2,largo:finMuro-inicioMuro};
      const inicioVano=-14.35,altoVano=2.85;
      const anchoVano=4.6/CONFIG.escalaLongitudinalCampus;
      // La fachada se compacta en Z; dimensionar el vidrio en el espacio final.
      const zInicio=ajustarZ(inicioVano,muro.x);
      function puntoVano(distancia){
        let a=inicioVano,b=finMuro;
        for(let i=0;i<32;i++){
          const medio=(a+b)/2;
          if(ajustarZ(medio,muro.x)<zInicio+distancia)a=medio;else b=medio;
        }
        return (a+b)/2;
      }
      const finVano=puntoVano(anchoVano);
      const inicioVentanal=-21,finVentanal=inicioVano;
      const espesorTabique=.12,profundidadTabique=2.8;
      const paredInterior={y:CONFIG.baseY+altoMuro/2,alto:altoMuro,color:'#ffffff'};
      const caraFachada=w/2;
      const ejeRecto=finVentanal-1.6,ejeL=inicioVentanal-.25;
      for(const eje of [ejeRecto,ejeL]){
        bloque(grupo,{...paredInterior,x:caraFachada-profundidadTabique/2,z:eje,
          ancho:profundidadTabique,fondo:espesorTabique}).name='Tabique interior frente al jardín de la biblioteca';
      }
      const largoRetorno=(ejeRecto-ejeL)*.56;
      bloque(grupo,{...paredInterior,x:caraFachada-profundidadTabique+espesorTabique/2,
        z:ejeL+(espesorTabique+largoRetorno)/2,ancho:espesorTabique,fondo:largoRetorno})
        .name='Retorno en L frente al jardín de la biblioteca';
      const antepecho=.46,dintel=2.7;
      const esquinaAula=ejePosteriorB+.15;
      bloque(grupo,{x:muro.x,y:CONFIG.baseY+altoMuro/2,z:(esquinaAula+inicioMuro)/2,
        ancho:.3,alto:altoMuro,fondo:inicioMuro-esquinaAula,color:'#40444c'}).name='Cierre gris del aula junto al jardín';
      for(const [desde,hasta,base,tope=altoMuro] of [[inicioMuro,inicioVentana,0],
        [inicioVentana,finVentana,0,antepecho],[inicioVentana,finVentana,dintel],
        [finVentana,finGris,0],[finGris,inicioVentanal,0],[inicioVentanal,finVentanal,altoVano],
        [inicioVano,finVano,altoVano],[finVano,finMuro,0]]){
        bloque(grupo,{x:muro.x,y:CONFIG.baseY+(base+tope)/2,z:(desde+hasta)/2,
          ancho:.3,alto:tope-base,fondo:hasta-desde,color:hasta<=finGris?'#40444c':'#45474e'}).name='Pared lateral del nuevo jardín de Torre B';
      }
      for(const rotacion of [Math.PI/2,-Math.PI/2]){
        const huecos=[[inicioMuro,finGris,0,altoMuro],[inicioVentanal,finVentanal,0,altoVano],
          [inicioVano,finVano,0,altoVano]].map(([desde,hasta,base,tope])=>{
          const limites=[desde,hasta].map(v=>(muro.z-v)*Math.sin(rotacion)).sort((a,b)=>a-b);
          return [...limites,base,tope];
        });
        revestirPaneles(grupo,{torre,...muro,alto:altoMuro,rotacion,huecos});
      }
      const ventana=new THREE.Group(),altoVentana=dintel-antepecho,perfil=.065;
      ventana.name='Ventana esmerilada del aula junto a la reja';
      ventana.position.set(muro.x+.06,CONFIG.baseY+antepecho,(inicioVentana+finVentana)/2);
      ventana.rotation.y=Math.PI/2;grupo.add(ventana);
      const esmerilado=new THREE.MeshStandardMaterial({color:'#bbcecb',transparent:true,opacity:.85,roughness:.82});
      bloque(ventana,{y:altoVentana/2,ancho:anchoVentana-2*perfil,alto:altoVentana-2*perfil,
        fondo:.055,material:esmerilado,sombra:false});
      for(const lado of [-1,1])bloque(ventana,{x:lado*(anchoVentana-perfil)/2,y:altoVentana/2,
        ancho:perfil,alto:altoVentana,fondo:.12,color:'#363c40'});
      for(const y of [perfil/2,altoVentana-perfil/2])bloque(ventana,{y,ancho:anchoVentana-2*perfil,
        alto:perfil,fondo:.12,color:'#363c40'});
      const acceso=new THREE.Group();
      acceso.name='Entrada acristalada de la biblioteca';
      acceso.position.set(muro.x,CONFIG.baseY,puntoVano(anchoVano/2));
      acceso.rotation.y=Math.PI/2;acceso.userData.conservarForma=true;grupo.add(acceso);
      const vidrio=new THREE.MeshStandardMaterial({color:'#d1e1e2',transparent:true,opacity:.24,depthWrite:false,roughness:.12});
      const banda=new THREE.MeshStandardMaterial({color:'#c8ccca',transparent:true,opacity:.8,roughness:.65});
      const anchoHoja=anchoVano*.4;
      function panel(padre,centro,ancho){
        bloque(padre,{x:centro,y:altoVano/2,ancho:ancho-.04,alto:altoVano-.06,fondo:.045,material:vidrio,sombra:false});
        bloque(padre,{x:centro,y:1.32,ancho:ancho-.04,alto:.42,fondo:.05,material:banda,sombra:false});
        for(const lado of [-1,1])bloque(padre,{x:centro+lado*(ancho-.045)/2,y:altoVano/2,
          ancho:.045,alto:altoVano,fondo:.08,color:'#313438'});
        for(const y of [.028,altoVano-.028])bloque(padre,{x:centro,y,ancho,alto:.056,fondo:.08,color:'#313438'});
      }
      for(const lado of [-1,1]){
        const hoja=new THREE.Group();hoja.name='Hoja de vidrio de la biblioteca';
        hoja.position.x=-anchoVano/2+anchoHoja+lado*anchoHoja;
        Object.assign(hoja.userData,{puerta:true,puertaInteractiva:true,abierta:false,
          anguloAbierto:-lado*Math.PI/2,colisionDinamica:true,grupoPuertas:acceso.uuid});
        acceso.add(hoja);panel(hoja,-lado*anchoHoja/2,anchoHoja);
        bloque(hoja,{x:-lado*(anchoHoja-.12),y:1.05,z:.075,ancho:.045,alto:.26,fondo:.08,color:'#9b9fa0'});
      }
      const fijo=anchoVano-2*anchoHoja;
      panel(acceso,(anchoVano-fijo)/2,fijo);
      const ventanal=new THREE.Group();
      ventanal.name='Ventanal fijo de la biblioteca frente al jardín';
      ventanal.position.set(muro.x,CONFIG.baseY,inicioVentanal);
      ventanal.rotation.y=Math.PI/2;ventanal.userData.conservarForma=true;grupo.add(ventanal);
      const cantidadPaneles=3;
      const anchoPanel=(ajustarZ(finVentanal,muro.x)-ajustarZ(inicioVentanal,muro.x))/cantidadPaneles;
      for(let i=0;i<cantidadPaneles;i++)panel(ventanal,-(i+.5)*anchoPanel,anchoPanel);
    }
    if(torre.id==='A'){
      const ejeColumnaFrontal=13*w/32-1.15;
      const soporteFrontal=bloque(grupo,{x:ejeColumnaFrontal,z:d/2-5.1,y:superficie+CONFIG.altoPiso/2,
        ancho:anchoColumna,alto:CONFIG.altoPiso,fondo:fondoColumna,color:colorColumnasPasillo});
      soporteFrontal.name='Columna adicional junto al jardín frontal - Torre A';
      soporteFrontal.userData.conservarForma=true;
      const soportePasillo=soporteFrontal.clone();
      soportePasillo.name='Columna del pasillo frente al entrante del jardín - Torre A';
      soportePasillo.position.x=-5.3;
      soportePasillo.position.z=d/2-6;
      grupo.add(soportePasillo);
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
    const z=posicionZ(ambiente.z)+(ampliacion-recorte)/2-avanceDerecha;
    const ancho=ambiente.ancho*factorX;
    const fondo=ambiente.fondo*factorZ+ampliacion-recorte;
    if(ambiente.id==='b-elevadores'){
      // Amplía solo hacia el jardín (+Z); el borde opuesto y los extremos X quedan fijos.
      const ensancheJardin=1.5;
      const centroZ=z+avanceElevadores+ENSANCHE_POR_FILA;
      const zona=crearZonaElevadores(grupo,{x,z:centroZ+ensancheJardin/2,
        ancho,fondo:fondo+ensancheJardin});
      const bordeVidrio=zona.grupo.position.z-zona.fondo/2-ENSANCHE_POR_FILA;
      const largoAcceso=bordeVidrio-finMuroJardinB;
      const centroPuerta=largoAcceso/2-.82,anchoPuerta=1.48,altoPuerta=2.65;
      const acceso=paredConPuerta(grupo,{x:w/2+.15,z:(bordeVidrio+finMuroJardinB)/2,
        largo:largoAcceso,baseY:CONFIG.baseY,alto:4.4,rotacion:Math.PI/2,
        puertaCentro:centroPuerta,anchoPuerta,altoPuerta,
        colorMuro:'#59616a',colorMarco:'#94999b',colorPuerta:'#33373e',
        manijaPalanca:true,interactiva:true});
      acceso.name='Acceso a la escalera junto al vidrio de los elevadores';
      revestirPaneles(grupo,{torre,x:acceso.position.x,z:acceso.position.z,
        largo:largoAcceso,alto:4.4,rotacion:acceso.rotation.y,
        huecos:[[centroPuerta-anchoPuerta/2-.04,centroPuerta+anchoPuerta/2+.04,0,altoPuerta+.04]]});
      acceso.children.find(o=>o.userData.puertaInteractiva).name='Puerta ploma de la escalera';
      const limiteEscalera=crearEscaleraTrasPuerta(grupo,acceso,largoAcceso,ancho);
      const finElevadores=zona.grupo.position.z+zona.fondo/2+ENSANCHE_POR_FILA+.11;
      const oesteNucleo=zona.grupo.position.x-ancho/2,esteNucleo=oesteNucleo+ancho;
      const torreA=CONFIG.torres.A,topico=AMBIENTES.A.find(a=>a.id==='a-topico');
      const llegadaPuente=torreA.x+(topico.x-topico.ancho/2)*torreA.ancho/16-.15-anchoPasilloOesteA-torre.x;
      const ejePuente=zona.grupo.position.z,semianchoPuente=1.9;
      const inicioPuenteAdmision=torreA.z-torre.z+topico.z+topico.fondo/2+.2;
      const ejesPasarelas=[ejePuente,inicioPuenteAdmision+semianchoPuente];
      const lateral={x:x-ancho/2,z:(finGris+limiteEscalera)/2,largo:limiteEscalera-finGris};
      const inicioPiso=lateral.x-.15,finPiso=w/2;
      const frenteLosa=CONFIG.fondoCampus/2-torre.z;
      const vestibulo=zona.niveles.get(2);
      const franja=vestibulo.grupo.getObjectByName('Franja oscura frente a las puertas');
      const mitadCentro=vestibulo.suelo.geometry.parameters.depth/2;
      const mitadVestibulo=mitadCentro+franja.geometry.parameters.depth;
      function pañosDelPaso(izq,der,semiancho){
        return [
          [izq,der,ejePuente-semiancho,ejePuente-mitadCentro,franja.material],
          [izq,der,ejePuente-mitadCentro,ejePuente+mitadCentro,vestibulo.suelo.material],
          [izq,der,ejePuente+mitadCentro,ejePuente+semiancho,franja.material]
        ];
      }
      // El descanso y el vestíbulo ya tienen suelo. Los paños nuevos llegan a sus bordes.
      crearLosaSegundo(grupo,torre,[
        [inicioPiso,finPiso,ejePosteriorB-.15,limiteEscalera],
        [inicioPiso,oesteNucleo,limiteEscalera,finElevadores],
        [esteNucleo,w/2,limiteEscalera,ejePuente-mitadVestibulo],
        ...pañosDelPaso(esteNucleo,w/2,mitadVestibulo),
        [esteNucleo,w/2,ejePuente+mitadVestibulo,finElevadores],
        [inicioPiso,finPiso,finElevadores,frenteLosa],
        ...pañosDelPaso(w/2,llegadaPuente,semianchoPuente),
        [w/2,llegadaPuente,inicioPuenteAdmision,inicioPuenteAdmision+2*semianchoPuente]
      ],vestibulo.suelo);
      const nivelPuente=cotaPiso(2),espesorPretil=.16,altoPretil=.94;
      const blancoPretil=new THREE.MeshStandardMaterial({color:'#f4f4f2',roughness:.86});
      const metalPasamanos=new THREE.MeshStandardMaterial({color:'#c5cbce',metalness:.55,roughness:.35});
      function pretil(x1,z1,x2,z2,intervalos,caraExterior){
        const dx=x2-x1,dz=z2-z1,largo=dx+dz;
        const centro={x:(x1+x2)/2,z:(z1+z2)/2};
        const caras=Array(6).fill(blancoPretil);
        if(caraExterior!==undefined)caras[caraExterior]=grisFachada;
        bloque(grupo,{...centro,y:nivelPuente+altoPretil/2,
          ancho:dx||espesorPretil,alto:altoPretil,fondo:dz||espesorPretil,material:caras})
          .name='Pretil blanco de la pasarela';
        const baseMetal=nivelPuente+altoPretil,altoPoste=.22;
        for(let i=0;i<=intervalos;i++){
          const t=(.08+i*(largo-.16)/intervalos)/largo;
          bloque(grupo,{x:x1+t*dx,z:z1+t*dz,y:baseMetal+altoPoste/2,
            ancho:.045,alto:altoPoste,fondo:.045,material:metalPasamanos})
            .name='Soporte del pasamanos de la pasarela';
        }
        bloque(grupo,{...centro,y:baseMetal+altoPoste+.03,
          ancho:dx||.09,alto:.06,fondo:dz||.09,material:metalPasamanos})
          .name='Pasamanos de la pasarela';
      }
      for(const eje of ejesPasarelas){
        for(const lado of [-1,1]){
          const zBorde=eje+lado*(semianchoPuente-espesorPretil/2);
          pretil(w/2,zBorde,llegadaPuente,zBorde,6,lado>0?4:5);
        }
      }
      const xBorde=llegadaPuente+espesorPretil/2;
      const inicioMuroJardin=inicioPuenteAdmision+2*semianchoPuente-espesorPretil;
      const finMuroJardin=ejePuente-semianchoPuente+espesorPretil;
      pretil(xBorde,inicioMuroJardin,xBorde,finMuroJardin,
        Math.ceil((finMuroJardin-inicioMuroJardin)/2),1);
      const zEsquina=torreA.z+torreA.fondo/2-torre.z-espesorPretil/2;
      pretil(xBorde,ejePuente+semianchoPuente-espesorPretil,xBorde,zEsquina-espesorPretil/2,14,1);
      pretil(llegadaPuente,zEsquina,llegadaPuente+anchoPasilloOesteA,zEsquina,1,4);
      const biblioteca=AMBIENTES.B.find(sala=>sala.id==='b-biblioteca');
      // La cara superior de cada base es el piso terminado y seleccionable.
      for(const [izq,desde,hasta] of [[inicioPiso,ejePosteriorB+.15,finGris],
        [inicioPiso+.3+profundidadAcceso,finGris,finPaso],[inicioPiso,finPaso,limiteEscalera]]){
        const suelo=bloque(grupo,{...base,x:(izq+finPiso)/2,z:(desde+hasta)/2,ancho:finPiso-izq,
          fondo:hasta-desde,material:ceramica});
        suelo.name='Cerámica blanca de la biblioteca';
        suelo.userData.info={...biblioteca,torre:torre.id};
        objetosSeleccionables.push(suelo);
      }
      const bordeBaseFrontal=z+fondo/2+ensancheJardin+avanceElevadores+avanceDerecha;
      bloque(grupo,{...base,x:(inicioPiso+finPiso)/2,z:(limiteEscalera+bordeBaseFrontal)/2,
        ancho:finPiso-inicioPiso,fondo:bordeBaseFrontal-limiteEscalera});
      const largoGris=finGris-(ejePosteriorB+.15);
      bloque(grupo,{x:lateral.x,y:CONFIG.baseY+CONFIG.altoPiso/2,z:finGris-largoGris/2,
        ancho:.3,alto:CONFIG.altoPiso,fondo:largoGris,color:'#40444c'});
      const oeste=lateral.x-.15,este=w/2+.3;
      const cimaMuro=CONFIG.baseY+CONFIG.altoPiso;
      bloque(grupo,{x:(oeste+este)/2,y:(baseInferior+cimaMuro)/2,z:ejePosteriorB,
        ancho:este-oeste,alto:cimaMuro-baseInferior,fondo:.3,color:'#40444c'});
      // El vano arranca en la junta entre el muro gris y el primer panel exterior.
      const altoPaso=2.65;
      const caraInterior=lateral.x+.15,profundidad=profundidadAcceso,espesor=.12;
      bloque(grupo,{x:caraInterior+profundidad/2,y:CONFIG.baseY+CONFIG.altoPiso/2,z:finPaso+espesor/2,
        ancho:profundidad,alto:CONFIG.altoPiso,fondo:espesor,color:'#ffffff'}).name='Pared blanca derecha del acceso a la biblioteca';
      // Prolongación interior junto al vestíbulo, con una división transversal.
      const blanco={y:CONFIG.baseY+CONFIG.altoPiso/2,alto:CONFIG.altoPiso,color:'#ffffff'};
      const ejeCorto=caraInterior+profundidad+.15,ejeLargo=ejeCorto+2.1;
      const bordePosterior=ejePosteriorB+.15,extremoSuperior=finPaso+espesor;
      const zDivision=bordePosterior+(finGris-bordePosterior)*.36;
      bloque(grupo,{...blanco,x:ejeLargo,z:(bordePosterior+extremoSuperior)/2,
        ancho:espesor,fondo:extremoSuperior-bordePosterior}).name='Tabique longitudinal junto al vestíbulo';
      const inicioTabique=ejeLargo+espesor/2,anchoTabique=w/2-inicioTabique;
      const ejeTransversal=inicioVentana;
      bloque(grupo,{...blanco,x:inicioTabique+anchoTabique/2,z:ejeTransversal,
        ancho:anchoTabique,fondo:espesor}).name='Pared transversal del aula junto al jardín';
      const fondoDivision=ejeTransversal-espesor/2-bordePosterior;
      for(const fraccion of [.36,.70]){
        bloque(grupo,{...blanco,x:w/2-anchoTabique*fraccion,z:bordePosterior+fondoDivision/2,
          ancho:espesor,fondo:fondoDivision}).name='División posterior del aula junto al jardín';
      }
      const extremoCorto=finGris-(.3+espesor)/2;
      bloque(grupo,{...blanco,x:ejeCorto,z:(extremoCorto+zDivision-espesor/2)/2,
        ancho:espesor,fondo:extremoCorto-zDivision+espesor/2}).name='Prolongación de la pared del fondo';
      for(const [zTabique,inicioX] of [[finPaso+espesor/2,ejeCorto+.15],[zDivision,ejeCorto+espesor/2]]){
        const finX=ejeLargo-espesor/2;
        bloque(grupo,{...blanco,x:(inicioX+finX)/2,z:zTabique,
          ancho:finX-inicioX,fondo:espesor}).name='Tabique transversal junto al vestíbulo';
      }
      const puertasRecinto={baseY:CONFIG.baseY,alto:CONFIG.altoPiso,altoPuerta:2.18,
        colorMuro:'#ffffff',colorPuerta:'#252426',colorMarco:'#1c1d20',interactiva:true,manijaPalanca:true};
      for(const fondo of [false,true]){
        const anchoPuerta=fondo?.95/CONFIG.escalaLongitudinalCampus:.88;
        const posicion=fondo?{x:caraInterior+profundidad+.15,z:(finGris+finPaso)/2,
          largo:finPaso-finGris+espesor+.3,rotacion:Math.PI/2}:
          {x:caraInterior+profundidad/2,z:finGris-.15,largo:profundidad,rotacion:0};
        const pared=paredConPuerta(grupo,{...posicion,...puertasRecinto,anchoPuerta});
        pared.name=fondo?'Pared de fondo del acceso a la biblioteca':'Pared izquierda del acceso a la biblioteca';
        const hoja=pared.children.find(o=>o.userData.puertaInteractiva);
        hoja.name=fondo?'Puerta del fondo de la biblioteca':'Puerta lateral izquierda de la biblioteca';
        hoja.userData.anguloAbierto=(fondo?-1:1)*Math.PI/2;
        const cara=fondo?-1:1;
        for(const [centro,color] of (fondo?[[.62,'#ab423a'],[.38,'#334561']]:[[.5,'#334561']])){
          bloque(hoja,{x:centro*anchoPuerta,y:1.78,z:cara*.054,ancho:.19,alto:.29,fondo:.008,color:'#ece8dd'});
          bloque(hoja,{x:centro*anchoPuerta,y:1.78,z:cara*.06,ancho:.16,alto:.26,fondo:.006,color});
        }
      }
      bloque(grupo,{x:lateral.x,z:(finGris+finPaso)/2,y:CONFIG.baseY+(altoPaso+CONFIG.altoPiso)/2,
        ancho:.3,alto:CONFIG.altoPiso-altoPaso,fondo:finPaso-finGris,color:'#45474e'}).name='Dintel del acceso a la biblioteca';
      const escalaZ=CONFIG.escalaLongitudinalCampus;
      const inicioGris=finPaso+.40/escalaZ,anchoGris=1.05/escalaZ,finPuertaGris=inicioGris+anchoGris;
      const altoGris=2.2,centroMuro=(finPaso+limiteEscalera)/2;
      const muroGris=paredConPuerta(grupo,{x:lateral.x,z:centroMuro,largo:limiteEscalera-finPaso,
        baseY:CONFIG.baseY,alto:CONFIG.altoPiso,rotacion:-Math.PI/2,puertaCentro:(inicioGris+finPuertaGris)/2-centroMuro,
        anchoPuerta:anchoGris,altoPuerta:altoGris,colorMuro:'#45474e',colorMarco:'#55565a',
        colorPuerta:'#737377',interactiva:true,manijaPalanca:true});
      muroGris.name='Pared lateral oeste de la biblioteca';
      const hojaGris=muroGris.children.find(o=>o.userData.puertaInteractiva);
      hojaGris.name='Puerta gris exterior de la biblioteca';
      const metal=new THREE.MeshStandardMaterial({color:'#b7b7b5',metalness:.65,roughness:.36});
      bloque(hojaGris,{x:.26,y:altoGris-.16,z:.093,ancho:.32,alto:.085,fondo:.08,material:metal}).name='Cuerpo del cierrapuertas';
      const brazo=bloque(hojaGris,{x:.25,y:altoGris-.085,z:.125,ancho:.18,alto:.023,fondo:.025,material:metal});
      brazo.rotation.z=.65;
      for(const rotacion of [-Math.PI/2,Math.PI/2]){
        const huecos=[[finGris,finPaso,altoPaso],[inicioGris-.04,finPuertaGris+.04,altoGris+.04]].map(([desde,hasta,alto])=>{
          const extremos=[desde,hasta].map(pz=>(lateral.z-pz)*Math.sin(rotacion)).sort((a,b)=>a-b);
          return [...extremos,0,alto];
        });
        revestirPaneles(grupo,{torre,...lateral,alto:CONFIG.altoPiso,rotacion,
          huecos});
      }
      zona.plantaBaja.suelo.userData.info={...ambiente,torre:torre.id};
      objetosSeleccionables.push(zona.plantaBaja.suelo);
      etiqueta(capaEtiquetas,ambiente.nombre,torre.x+x,CONFIG.baseY+3.6,torre.z+centroZ);
      continue;
    }
    const divisionTopico=.75;
    // Desde la fachada oeste, +Z queda a la derecha, hacia la puerta blanca.
    const divisionLateral=z+fondo/2-1.05-3.6;
    const centroTopico=(divisionLateral+z+fondo/2)/2;
    // El recinto posterior queda sin rótulo de Tópico.
    const sectores=ambiente.id==='a-topico'?[]:ambiente.id==='a-atencion-alumno'?
      [{izq:x-ancho/2,der:divisionTopico,z:centroTopico,fondo:z+fondo/2-divisionLateral,nombre:'Tópico',id:'a-topico-lateral',
        descripcion:'Tópico con acceso por la puerta blanca lateral.'},
       {izq:x-ancho/2,der:divisionTopico,z:(z-fondo/2+divisionLateral)/2,fondo:divisionLateral-(z-fondo/2),
        nombre:ambiente.nombre,id:ambiente.id,descripcion:ambiente.descripcion,sinEtiqueta:true},
       {izq:divisionTopico,der:x+ancho/2,nombre:ambiente.nombre,id:ambiente.id,descripcion:ambiente.descripcion}]:
      [{izq:x-ancho/2,der:x+ancho/2,nombre:ambiente.nombre,id:ambiente.id,descripcion:ambiente.descripcion}];
    for(const sector of sectores){
      if(ambiente.id==='b-biblioteca')continue;
      const suelo=placa(grupo,{x:(sector.izq+sector.der)/2,y:CONFIG.baseY+.055,z:sector.z??z,
        ancho:sector.der-sector.izq,fondo:sector.fondo??fondo,color:CONFIG.acabados.piso});
      suelo.userData.info={...ambiente,id:sector.id,nombre:sector.nombre,descripcion:sector.descripcion,torre:torre.id};
      suelo.material.emissive=new THREE.Color('#000000');
      objetosSeleccionables.push(suelo);
    }

    const h=torre.id==='A'?4.4:3.2, espesor=.3, alturaCentro=CONFIG.baseY+h/2;
    const paredMat=ambiente.id==='a-topico'?acabadoTabiquesAdmision:new THREE.MeshStandardMaterial({color:CONFIG.acabados.pared,roughness:.83});
    const p=ambiente.paredes||[];
    const ladosPared=new Set(p);
    if(ambiente.id==='a-atencion-alumno'){
      const inicio=x-ancho/2+espesor/2,fin=divisionTopico-espesor/2;
      bloque(grupo,{x:(inicio+fin)/2,y:alturaCentro,z:divisionLateral,ancho:fin-inicio,
        alto:h,fondo:espesor,material:paredMat}).name='Pared lateral del sector Tópico';
    }
    // El lateral acristalado de Torre C reemplaza el muro oeste de la cafetería.
    if(ambiente.id==='c-cafeteria')ladosPared.delete('oeste');
    if(ambiente.id==='a-atencion-alumno'){
      ladosPared.delete('norte'); // Paso abierto hacia Informes / Admisión.
      ladosPared.delete('oeste');
      const centroPuerta=fondo/2-1.05;
      const centroCamilla=centroPuerta-2.05;
      const centrosVentanas=[centroCamilla-2.7,centroCamilla];
      const ventanas=centrosVentanas.map(cx=>[cx-1.125,cx+1.125,2.4175,3.1325]);
      const finTramoAdmision=ventanas[0][0];
      const inicioTramoAdmision=-fondo/2;
      const centroTramo=(inicioTramoAdmision+finTramoAdmision)/2;
      const centroAdmision=finTramoAdmision-.4-.715;
      const puertaAdmision=paredConPuerta(grupo,{x:x-ancho/2,z:z+centroTramo,largo:finTramoAdmision-inicioTramoAdmision,
        baseY:CONFIG.baseY,alto:h,rotacion:-Math.PI/2,puertaCentro:centroAdmision-centroTramo,
        colorMuro:CONFIG.acabados.pared,colorPuerta:'#f3f2ed',colorMarco:'#d6d8d4',interactiva:true});
      puertaAdmision.name='Acceso blanco lateral de Informes y Admisión';
      const acceso=paredConPuerta(grupo,{x:x-ancho/2,z,largo:fondo,inicioMuro:finTramoAdmision,
        baseY:CONFIG.baseY,alto:h,rotacion:-Math.PI/2,puertaCentro:fondo/2-1.05,
        colorMuro:CONFIG.acabados.pared,colorPuerta:'#f3f2ed',colorMarco:'#d6d8d4',interactiva:true,
        anchoPuerta:1.35,altoPuerta:2.53,ventanasIzquierda:ventanas});
      acceso.name='Acceso blanco lateral junto a Atención al Estudiante';
      const hoja=acceso.children.find(o=>o.userData.puertaInteractiva);
      hoja.name='Puerta blanca con apertura hacia el interior';
      // El interior queda en -Z local: el giro positivo recoge la hoja dentro.
      hoja.userData.anguloAbierto=Math.PI/2;
      for(const cx of centrosVentanas)crearCuatroVentanillas(acceso,cx);
      detallesTopico(acceso,centroPuerta,centroCamilla);
      const blancoInterior=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.83});
      // Tabiques del recinto contiguo, medidos desde la fachada y el muro de Admisión.
      const frente=x-ancho/2+espesor/2,fondoRecinto=divisionTopico-espesor/2;
      const ladoAdmision=z-fondo/2+espesor/2,ladoTopico=divisionLateral-espesor/2;
      const profundidad=fondoRecinto-frente;
      const ejeTabique=z+centrosVentanas[0]-1.1; // Eje del montante izquierdo del primer grupo de vidrios.
      const inicioDivisoria=ejeTabique-espesor/2,finDivisoria=z+fondo/2;
      bloque(grupo,{x:divisionTopico,y:alturaCentro,z:(inicioDivisoria+finDivisoria)/2,
        ancho:espesor,alto:h,fondo:finDivisoria-inicioDivisoria,material:paredMat})
        .name='Pared divisoria entre Tópico y Atención al Estudiante';
      const primerCruce=frente+profundidad*.22,segundoCruce=frente+profundidad*.60;
      const finPaso=frente+profundidad*.76;
      const tabique=(nombre,x0,x1,z0,z1)=>{
        bloque(grupo,{x:(x0+x1)/2,y:alturaCentro,z:(z0+z1)/2,
          ancho:x1-x0,alto:h,fondo:z1-z0,material:acabadoTabiquesAdmision}).name=nombre;
      };
      tabique('Tabique transversal junto a la fachada',primerCruce-espesor/2,primerCruce+espesor/2,ladoAdmision,ladoTopico);
      tabique('Tabique transversal junto al Tópico',segundoCruce-espesor/2,segundoCruce+espesor/2,ejeTabique-espesor/2,ladoTopico);
      tabique('Tabique de unión',primerCruce+espesor/2,segundoCruce-espesor/2,ejeTabique-espesor/2,ejeTabique+espesor/2);
      tabique('Tabique corto al fondo',finPaso,fondoRecinto,ejeTabique-espesor/2,ejeTabique+espesor/2);
      tabique('Pared de Atención al Estudiante hasta la fachada',divisionTopico+espesor/2,
        x+ancho/2-espesor/2,ejeTabique-espesor/2,ejeTabique+espesor/2);
      const acabado=.012;
      const oeste=x-ancho/2+espesor/2,este=divisionTopico-espesor/2;
      const norte=divisionLateral+espesor/2,sur=z+fondo/2-espesor/2;
      for(const borde of [norte+acabado/2,sur-acabado/2]){
        bloque(grupo,{x:(oeste+este)/2,y:alturaCentro,z:borde,ancho:este-oeste,
          alto:h,fondo:acabado,material:blancoInterior});
      }
      bloque(grupo,{x:este-acabado/2,y:alturaCentro,z:(norte+sur)/2,
        ancho:acabado,alto:h,fondo:sur-norte,material:blancoInterior});
      const [izq,der,base,tope]=ventanas[1];
      const puertaIzq=centroPuerta-.715,puertaDer=centroPuerta+.715;
      // El acabado del muro de acceso sigue los vanos de las ventanillas y la puerta.
      for(const [a,b,abajo,arriba] of [[norte-z,izq,0,h],[izq,der,0,base],
        [izq,der,tope,h],[der,puertaIzq,0,h],[puertaIzq,puertaDer,2.57,h],[puertaDer,sur-z,0,h]]){
        bloque(acceso,{x:(a+b)/2,y:(abajo+arriba)/2,z:-(espesor+acabado)/2,
          ancho:b-a,alto:arriba-abajo,fondo:acabado,material:blancoInterior});
      }
      revestirPaneles(grupo,{torre,x:x-ancho/2,z,largo:fondo,alto:h,rotacion:-Math.PI/2,
        huecos:[
          [centroPuerta-.715,centroPuerta+.715,0,2.57],
          [centroAdmision-.715,centroAdmision+.715,0,2.69],
          ...ventanas
        ]});
    }
    // El lateral de Tópico se construye completo hasta la fachada nueva.
    if(ambiente.id==='a-topico'){
      ladosPared.delete('norte');
      ladosPared.delete('este');
      // División gruesa marcada detrás de Admisión, entre ambos muros negros.
      bloque(grupo,{x:x+ancho/2,y:alturaCentro,z,
        ancho:.8,alto:h,fondo,material:paredMat})
        .name='Pared gruesa transversal detrás de Admisión';
    }
    if(ambiente.id==='a-atencion-publico'){
      const fachadaInterior=x-ancho/2+espesor/2;
      const muroInterior=z-fondo/2+espesor/2;
      const cruceX=fachadaInterior+(divisionTopico-espesor/2-fachadaInterior)*.22;
      const cruceZ=muroInterior+fondo*.44;
      const finLongitudinal=cruceX+espesor;
      bloque(grupo,{x:(fachadaInterior+finLongitudinal)/2,y:alturaCentro,z:cruceZ,
        ancho:finLongitudinal-fachadaInterior,alto:h,fondo:espesor,material:acabadoTabiquesAdmision})
        .name='Tabique de Admisión desde la fachada lateral';
      const finTransversal=cruceZ-espesor/2;
      bloque(grupo,{x:cruceX,y:alturaCentro,z:(muroInterior+finTransversal)/2,
        ancho:espesor,alto:h,fondo:finTransversal-muroInterior,material:acabadoTabiquesAdmision})
        .name='Tabique de Admisión desde el muro negro';
      revestirPaneles(grupo,{torre,x:x-ancho/2,z,largo:fondo,alto:h,rotacion:-Math.PI/2,recorteInicio:.4});
      bloque(grupo,{x:x-ancho/2-.166,y:alturaCentro,z:z-fondo/2+.2,
        ancho:.025,alto:h,fondo:.4,color:'#40444c'})
        .name='Continuación gris del lateral de Tópico hasta los paneles';
    }
    // También se retira la viga/muro horizontal oscuro de la cafetería.
    if(ladosPared.has('norte')&&ambiente.id!=='c-cafeteria') bloque(grupo,{x,y:alturaCentro,z:z-fondo/2,ancho,alto:h,fondo:espesor,
      material:ambiente.id==='a-atencion-publico'?acabadoTabiquesAdmision:paredMat});
    if(ladosPared.has('sur')) bloque(grupo,{x,y:alturaCentro,z:z+fondo/2,ancho,alto:h,fondo:espesor,material:paredMat});
    if(ladosPared.has('oeste')&&ambiente.id!=='a-conferencias') bloque(grupo,{x:x-ancho/2,y:alturaCentro,z,ancho:espesor,alto:h,fondo,material:paredMat});
    if(ladosPared.has('este')) bloque(grupo,{x:x+ancho/2,y:alturaCentro,z,ancho:espesor,alto:h,fondo,material:paredMat});
    if(ambiente.id==='a-conferencias'){
      // Vano real detrás de la hoja: el muro tampoco debe bloquear el paso.
      const inicioVano=z-fondo/2+1.45,finVano=inicioVano+1.25;
      const finVentanas=inicioVano+3.9;
      for(const [desde,hasta,base,tope] of [[z-fondo/2,inicioVano,0,h],[finVano,finVentanas,0,2.45],
        [inicioVano,finVentanas,3.1,h],[finVentanas,z+fondo/2,0,h]]){
        bloque(grupo,{x:x-ancho/2,y:CONFIG.baseY+(base+tope)/2,z:(desde+hasta)/2,
          ancho:espesor,alto:tope-base,fondo:hasta-desde,material:paredMat});
      }
      revestirPaneles(grupo,{torre,x:x-ancho/2,z,largo:fondo,alto:h,rotacion:-Math.PI/2,accesoJardin:true});
      revestirPaneles(grupo,{torre,x,z:z+fondo/2,largo:ancho,alto:h,rotacion:0});
    }
    if(ambiente.fachada)fachadaTorreA(grupo,{x:x+ancho/2,z,largo:fondo,
      baseY:CONFIG.baseY,alto:h,altoLiso:cotaPiso(2)+h-CONFIG.baseY,tipo:ambiente.fachada,
      finPanel:medirPaneles(torre,x+ancho/2,z,Math.PI/2)});
    if(ambiente.fachada==='admision'){
      const ejeX=x+ancho/2+espesor/2;
      const retiroFrontalPaso=1.5;
      const ejeMuroFrontal=CONFIG.fondoCampus/2-torre.z;
      const inicio=z-finVidrioAdmision,fin=ejeMuroFrontal-retiroFrontalPaso;
      const superior=cotaPiso(2),inferior=CONFIG.baseY+h;
      const altura=superior-inferior;
      const largoReal=(ajustarZ(torre.z+fin,torre.x+ejeX)-ajustarZ(torre.z+inicio,torre.x+ejeX))*CONFIG.escalaLongitudinalCampus;
      const lienzo=document.createElement('canvas');lienzo.width=384;lienzo.height=256;
      const ctx=lienzo.getContext('2d');
      ctx.fillStyle='#68665f';ctx.fillRect(0,0,384,256);
      for(const [fila,color] of ['#c4c0b7','#bdbab1'].entries()){
        ctx.fillStyle=color;ctx.fillRect(2,128*fila+2,380,124);
      }
      const mapa=new THREE.CanvasTexture(lienzo);
      mapa.colorSpace=THREE.SRGBColorSpace;mapa.wrapS=THREE.RepeatWrapping;
      mapa.repeat.x=Math.max(1,Math.round(largoReal/(altura*1.5)));
      mapa.anisotropy=4;
      const placas=new THREE.MeshStandardMaterial({map:mapa,roughness:.94});
      const canto=new THREE.MeshStandardMaterial({color:'#aaa79f',roughness:.94});
      const anchoPaso=2.5;
      const anchoReal=ajustarX(torre.x+ejeX+anchoPaso)-ajustarX(torre.x+ejeX);
      const losetas=materialLosetasElevadores(anchoReal,largoReal/CONFIG.escalaLongitudinalCampus);
      bloque(grupo,{x:ejeX+anchoPaso/2,z:(inicio+fin)/2,y:(inferior+superior)/2,
        ancho:anchoPaso,alto:altura,fondo:fin-inicio,
        material:[grisFachada,grisFachada,losetas,canto,canto,canto]})
        .name='Piso exterior junto a la fachada de Torre A';
      bloque(grupo,{x:ejeX+anchoPaso+.045,z:(inicio+fin)/2,y:(inferior+superior)/2,
        ancho:.09,alto:altura,fondo:fin-inicio,material:[placas,canto,canto,canto,canto,canto]})
        .name='Friso de placas del segundo piso de Torre A';
      const caraInteriorMuro=ejeMuroFrontal-.45/2;
      crearVidrieraFachada(grupo,torre,ejeX,inicio,caraInteriorMuro,superior,h);
    }
    if(ambiente.id==='a-topico'){
      const extremoFachada=13*w/32,extremoFondo=x-ancho/2;
      const grosorLateralTopico=.8;
      const paredLateral=bloque(grupo,{x:(extremoFondo+extremoFachada)/2,y:alturaCentro,
        z:z-fondo/2-(grosorLateralTopico-espesor)/2,
        ancho:extremoFachada-extremoFondo,alto:h,fondo:grosorLateralTopico,material:acabadoTabiquesAdmision});
      paredLateral.name='Lateral negro completo del Tópico';
      const caraInteriorLateral=z-fondo/2+espesor/2;
      const largoTabique=(fondo-espesor)*.6;
      bloque(grupo,{x,y:alturaCentro,z:caraInteriorLateral+largoTabique/2,
        ancho:espesor,alto:h,fondo:largoTabique,material:paredLateral.material})
        .name='Tabique lateral del recinto posterior del Tópico';
      const accesoLateral=paredConPuerta(grupo,{x:extremoFondo,z,largo:fondo,
        baseY:CONFIG.baseY,alto:h,rotacion:-Math.PI/2,puertaCentro:fondo/2-.95,
        colorMuro:'#40444c',colorPuerta:'#102650',colorMarco:'#102650',interactiva:true});
      accesoLateral.name='Acceso azul lateral del Tópico';
      const ejeEscalera=z+fondo/2-.8;
      const altoFrenteTopico=cotaPiso(2)+h-CONFIG.baseY;
      // Continúa el frente superior hasta la cara exterior del muro lateral grueso.
      const retorno=grosorLateralTopico-espesor/2;
      const espesorFrente=espesor+.02;
      const finLateral=extremoFachada-espesorFrente/2;
      bloque(grupo,{x:(extremoFondo+finLateral)/2,z:z-fondo/2-retorno+espesor/2,
        y:CONFIG.baseY+(h+altoFrenteTopico)/2,ancho:finLateral-extremoFondo,
        alto:altoFrenteTopico-h,fondo:espesor,material:paredLateral.material})
        .name='Lateral superior del Tópico junto al jardín';
      bloque(grupo,{x:extremoFachada,z:z-fondo/2-retorno/2,y:CONFIG.baseY+(h+altoFrenteTopico)/2,
        ancho:espesorFrente,fondo:retorno,alto:altoFrenteTopico-h,material:acabadoTabiquesAdmision});
      const frente=paredConPuerta(grupo,{x:extremoFachada,z,largo:fondo,baseY:CONFIG.baseY,
        alto:altoFrenteTopico,espesor:espesorFrente,rotacion:Math.PI/2,puertaCentro:z-ejeEscalera,colorMuro:'#40444c',
        colorMarco:'#102650',colorPuerta:'#102650',interactiva:true});
      frente.name='Acceso frontal del Tópico junto a Admisión';
      const hojaFrontal=frente.children.find(o=>o.userData.puertaInteractiva);
      hojaFrontal.userData.anguloAbierto=-Math.PI/2;
      const hueco=crearEscaleraTopico(grupo,extremoFachada-espesor/2,ejeEscalera,caraInteriorLateral);
      const caraExteriorEste=extremoFachada+espesor/2;
      const caraExteriorOeste=extremoFondo-espesor/2;
      const bordeOesteLosa=caraExteriorOeste-anchoPasilloOesteA;
      const frenteLosa=CONFIG.fondoCampus/2-torre.z;
      const xTabiqueDoble=hueco.perfilPared[1][0]+1,ultimaDivision=-27.65;
      // Desde A-200, los pisos de las aulas delimitan el acabado visible del pasillo.
      crearLosaSegundo(grupo,torre,[
        [bordeOesteLosa,caraExteriorOeste,-d/2,hueco.caraEscalera],
        [bordeOesteLosa,caraExteriorOeste,hueco.caraEscalera,d/2,acabadoFranjasElevadores],
        [caraExteriorOeste,caraExteriorEste,-d/2,caraInteriorLateral],
        [caraExteriorOeste,hueco.oeste,caraInteriorLateral,hueco.caraEscalera],
        [caraExteriorOeste,hueco.oeste,hueco.caraEscalera,hueco.sur,acabadoFranjasElevadores],
        [caraExteriorOeste,xTabiqueDoble,hueco.sur,ultimaDivision,acabadoFranjasElevadores],
        [xTabiqueDoble,caraExteriorEste,hueco.sur,ultimaDivision],
        [caraExteriorOeste,caraExteriorEste,ultimaDivision,frenteLosa,acabadoFranjasElevadores]
      ]);
      const ejeDivisionConferencias=4.5,espesorPared=.2;
      const inicioPared=ejeDivisionConferencias-espesorPared/2;
      const tabique={y:cotaPiso(2)+h/2,alto:h,color:'#e5e8ed'};
      const bordePosteriorLosa=-d/2;
      bloque(grupo,{...tabique,x:hueco.oeste-grosorLateralTopico/2,
        z:(bordePosteriorLosa+hueco.caraEscalera)/2,ancho:grosorLateralTopico,
        fondo:hueco.caraEscalera-bordePosteriorLosa})
        .name='Pared gruesa junto al descanso superior del Tópico';
      const caraDescanso=hueco.oeste-grosorLateralTopico;
      crearParedAdmision(grupo,hueco,caraDescanso,caraExteriorEste,espesorPared,h,tabique.color);
      const anchoRecinto=caraDescanso-bordeOesteLosa;
      bloque(grupo,{...tabique,x:(bordeOesteLosa+caraDescanso)/2,z:bordePosteriorLosa+espesorPared/2,
        ancho:anchoRecinto,fondo:espesorPared}).name='Pared posterior junto al jardín del Tópico';
      const interiorPosterior=bordePosteriorLosa+espesorPared;
      const ejeOeste=bordeOesteLosa+espesorPared/2;
      const ejeCentral=(bordeOesteLosa+espesorPared+caraDescanso)/2;
      for(const [inicio,fin,fraccion,nombre] of [
        [bordeOesteLosa,ejeCentral,.40,'Acceso al ambiente oeste junto al jardín'],
        [ejeCentral,caraDescanso,.75,'Acceso al ambiente junto al descanso']
      ]){
        const largo=fin-inicio;
        const acceso=paredConPuerta(grupo,{x:(inicio+fin)/2,z:hueco.caraEscalera+espesorPared/2,
          largo,puertaCentro:(fraccion-.5)*largo,baseY:cotaPiso(2),alto:h,espesor:espesorPared,
          anchoPuerta:1.3,altoPuerta:2.35,colorMuro:tabique.color,
          colorMarco:'#102650',colorPuerta:'#102650',interactiva:true});
        acceso.name=nombre;
      }
      for(const [eje,nombre] of [[ejeOeste,'Pared oeste junto al jardín del Tópico'],
        [ejeCentral,'División central junto al jardín del Tópico']]){
        bloque(grupo,{...tabique,x:eje,z:(interiorPosterior+hueco.caraEscalera)/2,
          ancho:espesorPared,fondo:hueco.caraEscalera-interiorPosterior}).name=nombre;
      }
      const desdeTabique=caraExteriorOeste+espesorPared;
      const ejeDivisionCentral=20;
      const ejeTabiqueCorto=desdeTabique+1.2,mitadEspesor=espesorPared/2;
      const extremoFrontal=23.2,extremoPosterior=17;
      function accesoAzul(xMuro,desde,hasta,zPuerta){
        const centro=(desde+hasta)/2,anchoPuerta=1.3;
        const pared=paredConPuerta(grupo,{x:xMuro,z:centro,largo:hasta-desde,rotacion:-Math.PI/2,
          baseY:cotaPiso(2),alto:h,espesor:espesorPared,puertaCentro:zPuerta-centro,
          anchoPuerta,altoPuerta:2.35,colorMuro:tabique.color,colorMarco:'#24477d',colorPuerta:'#104da5',
          manijaPalanca:true,visorVertical:true,interactiva:true});
        pared.name='Acceso al segundo piso de Torre A desde el pasillo';
        const hoja=pared.children.find(o=>o.userData.puertaInteractiva);
        hoja.name='Puerta azul con visor del segundo piso de Torre A';
        // La compactación desplaza la bisagra y las jambas; ajusta la hoja al vano final.
        const centroZ=torre.z+zPuerta,xMundo=torre.x+xMuro;
        hoja.scale.x=(ajustarZ(centroZ+anchoPuerta/2,xMundo)-ajustarZ(centroZ-anchoPuerta/2,xMundo))/anchoPuerta;
      }
      const xMuroPasillo=caraExteriorOeste+mitadEspesor,finTramoPosterior=extremoPosterior+mitadEspesor;
      bloque(grupo,{...tabique,x:xMuroPasillo,z:(inicioPared+finTramoPosterior)/2,
        ancho:espesorPared,fondo:finTramoPosterior-inicioPared}).name='Pared del segundo piso junto al pasillo de Torre A';
      accesoAzul(xMuroPasillo,extremoFrontal-mitadEspesor,d/2,32);
      const remateFrontal=bloque(grupo,{...tabique,x:xMuroPasillo,z:(d/2+frenteLosa)/2,
        ancho:espesorPared,fondo:frenteLosa-d/2});
      const interior=remateFrontal.material;
      remateFrontal.material=[interior,grisFachada,interior,interior,interior,interior];
      const divisionFrontal=28.5;
      for(const ejeZ of [divisionFrontal,ejeDivisionCentral,ejeDivisionConferencias]){
        const inicio=ejeZ===ejeDivisionCentral?ejeTabiqueCorto-mitadEspesor:desdeTabique;
        bloque(grupo,{...tabique,x:(inicio+caraExteriorEste)/2,z:ejeZ,
          ancho:caraExteriorEste-inicio,fondo:espesorPared}).name='Pared transversal del segundo piso de Torre A';
      }
      accesoAzul(ejeTabiqueCorto,extremoPosterior+mitadEspesor,ejeDivisionCentral-mitadEspesor,18.65);
      accesoAzul(ejeTabiqueCorto,ejeDivisionCentral+mitadEspesor,extremoFrontal-mitadEspesor,21.4);
      const finRemate=ejeTabiqueCorto+mitadEspesor;
      for(const ejeZ of [extremoFrontal,extremoPosterior]){
        bloque(grupo,{...tabique,x:(desdeTabique+finRemate)/2,z:ejeZ,
          ancho:finRemate-desdeTabique,fondo:espesorPared}).name='Remate del tabique corto de Torre A';
      }
      const ejeInterior=xMuroPasillo+2,ejeSaliente=ejeInterior-1.3;
      const quiebre=-.9,primeraDivision=-13,segundaDivision=-19.9;
      const caraAdmision=hueco.caraEscalera+espesorPared;
      const caraAula200=ultimaDivision-mitadEspesor;
      crearAccesoDobleAdmision(grupo,xTabiqueDoble,caraAdmision,caraAula200,h,espesorPared,tabique.color);
      function longitudinal(ejeX,desde,hasta){
        bloque(grupo,{...tabique,x:ejeX,z:(desde+hasta)/2,ancho:espesorPared,
          fondo:hasta-desde}).name='Pared longitudinal junto a las divisiones de Torre A';
      }
      function transversal(ejeZ,desde,hasta){
        bloque(grupo,{...tabique,x:(desde+hasta)/2,z:ejeZ,ancho:hasta-desde,
          fondo:espesorPared}).name='División del segundo piso de Torre A';
      }
      accesoAzul(ejeInterior,quiebre-mitadEspesor,ejeDivisionConferencias-mitadEspesor,.9);
      transversal(quiebre,xMuroPasillo+mitadEspesor,ejeInterior-mitadEspesor);
      longitudinal(xMuroPasillo,primeraDivision-mitadEspesor,quiebre+mitadEspesor);
      transversal(primeraDivision,xMuroPasillo+mitadEspesor,caraExteriorEste);
      const inicioSaliente=-24.75,finSaliente=-17.15;
      accesoAzul(ejeInterior,ultimaDivision-mitadEspesor,inicioSaliente-mitadEspesor,-26.2);
      longitudinal(ejeInterior,inicioSaliente-mitadEspesor,finSaliente+mitadEspesor);
      accesoAzul(ejeInterior,finSaliente+mitadEspesor,primeraDivision-mitadEspesor,-14.8);
      for(const ejeZ of [segundaDivision,ultimaDivision]){
        transversal(ejeZ,ejeInterior+mitadEspesor,caraExteriorEste);
      }
      bloque(grupo,{...tabique,x:(ejeSaliente+ejeInterior)/2-mitadEspesor,
        z:(inicioSaliente+finSaliente)/2,ancho:ejeInterior-ejeSaliente,
        fondo:finSaliente-inicioSaliente+espesorPared}).name='Saliente macizo junto a Tópico';
      // El borde oeste de cada aula sigue los entrantes de la pared del pasillo.
      const aulas=[
        ['A-200',ultimaDivision,segundaDivision,[[ultimaDivision,ejeInterior]]],
        ['A-201',segundaDivision,primeraDivision,[[segundaDivision,ejeInterior]]],
        ['A-202',primeraDivision,ejeDivisionConferencias,[[primeraDivision,xMuroPasillo],[quiebre,ejeInterior]]],
        ['A-203',ejeDivisionConferencias,ejeDivisionCentral,[[ejeDivisionConferencias,xMuroPasillo],[extremoPosterior,ejeTabiqueCorto]]],
        ['A-204',ejeDivisionCentral,divisionFrontal,[[ejeDivisionCentral,ejeTabiqueCorto],[extremoFrontal,xMuroPasillo]]],
        ['A-205',divisionFrontal,frenteLosa,[[divisionFrontal,xMuroPasillo]]]
      ];
      for(const [nombre,desde,hasta,borde] of aulas){
        const forma=new THREE.Shape();
        forma.moveTo(caraExteriorEste,-desde);
        for(let i=0;i<borde.length;i++){
          const [inicio,oeste]=borde[i],fin=borde[i+1]?.[0]??hasta;
          forma.lineTo(oeste+mitadEspesor,-inicio);
          forma.lineTo(oeste+mitadEspesor,-fin);
        }
        forma.lineTo(caraExteriorEste,-hasta);
        forma.closePath();
        const sueloAula=new THREE.Mesh(new THREE.ShapeGeometry(forma).rotateX(-Math.PI/2),
          new THREE.MeshStandardMaterial({color:'#c7c5be',roughness:.88,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
        sueloAula.position.y=cotaPiso(2)+.003;
        sueloAula.name=nombre;
        sueloAula.receiveShadow=true;
        sueloAula.userData.sinColision=true;
        const id=nombre.toLowerCase();
        sueloAula.userData.info={id,nombre,torre:torre.id,tipo:'Aula · Segundo piso',
          descripcion:`Aula ${nombre} del segundo piso de la Torre A.`};
        grupo.add(sueloAula);
        objetosSeleccionables.push(sueloAula);
        const rotulo=etiqueta(capaEtiquetas,nombre,torre.x+(borde[0][1]+caraExteriorEste)/2,
          cotaPiso(2)+.15,torre.z+(desde+hasta)/2);
        rotulo.userData.ambiente=id;
      }
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
      if(sector.sinEtiqueta)continue;
      const etiquetas=etiqueta(capaEtiquetas,sector.nombre,torre.x+(sector.izq+sector.der)/2,CONFIG.baseY+.98,torre.z+(sector.z??z));
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
  etiqueta(capaEtiquetas,torre.nombre,torre.x,CONFIG.baseY+4.98,torre.z+torre.fondo/2-4,'tower',torre.id.toLowerCase());
  return grupo;
}

function crearCeramicaBlanca(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#c8c7c1';ctx.fillRect(0,0,128,128);
  ctx.fillStyle='#f8f8f5';ctx.fillRect(1,1,126,126);
  const mapa=new THREE.CanvasTexture(canvas);
  mapa.colorSpace=THREE.SRGBColorSpace;mapa.wrapS=mapa.wrapT=THREE.RepeatWrapping;
  mapa.repeat.set(6,6);mapa.anisotropy=8;
  const material=new THREE.MeshStandardMaterial({map:mapa,roughness:.36});
  material.userData.ceramica=true;
  return material;
}

function crearEscaleraTrasPuerta(padre,acceso,ancho,anchoEdificio){
  const escalera=new THREE.Group();
  escalera.name='Escalera interior de Torre B';
  escalera.rotation.y=Math.PI;
  escalera.position.set(acceso.position.x-.15,CONFIG.baseY+.085,acceso.position.z);
  padre.add(escalera);
  const diseño={...diseñoEscaleraInterior(ancho),centroAbierto:true};
  const {descanso,huella,subida,espesorLosa,piedra,metal}=diseño;
  const entrada=2.65;
  const largo=escalera.position.x+anchoEdificio/2;
  const salida=largo-entrada-descanso-14*huella;
  const separacion=.24;
  const espesorDivision=.18;
  const remateLateral=.12+espesorDivision;
  const anchoCierre=2*ancho+separacion+remateLateral,anchoPuerta=1.35,altoPuerta=1.92;
  const centroPuerta=-anchoCierre/2+.32+anchoPuerta/2;
  const cierre=paredConPuerta(escalera,{x:largo+.15,z:(ancho+separacion+remateLateral)/2,
    largo:anchoCierre,baseY:-.075,alto:CONFIG.altoPiso,
    rotacion:-Math.PI/2,puertaCentro:centroPuerta,anchoPuerta,altoPuerta,
    colorMuro:'#40444c',colorMarco:'#41484d',colorPuerta:'#303e4d',
    manijaPalanca:true,interactiva:true});
  cierre.name='Cerramiento bajo el descanso de Torre B';
  const hoja=cierre.children.find(o=>o.userData.puertaInteractiva);
  hoja.name='Puerta metálica bajo la escalera';
  for(const y of [.18,altoPuerta/2,altoPuerta-.18]){
    bloque(hoja,{x:.045,y,z:-.065,ancho:.035,alto:.12,fondo:.035,material:metal});
  }
  const nivelPiso=CONFIG.alturaSegundoPisoB;
  // El muro posterior del elevador ocupa 11 cm a cada lado del eje compartido.
  crearRamal(escalera,[7,7],entrada,salida,'Descanso de giro',false,
    {...diseño,retranqueoExterior:.11,centroAbierto:false,cotaCoronacionCentral:nivelPiso-espesorLosa,
      topeExterior:nivelPiso-espesorLosa});
  const bordeExteriorRetorno=ancho*1.5+separacion+.12;
  bloque(escalera,{x:largo/2,y:CONFIG.altoPiso/2-.085,
    z:bordeExteriorRetorno+espesorDivision/2,ancho:largo,alto:CONFIG.altoPiso,
    fondo:espesorDivision,color:'#d1d0c9'}).name='Pared divisoria entre escalera y biblioteca';
  const retorno=new THREE.Group();
  retorno.name='Escalera de retorno al segundo piso';
  retorno.position.set(largo,14*subida,ancho+separacion);
  retorno.rotation.y=Math.PI;escalera.add(retorno);
  const subidaRetorno=(nivelPiso-retorno.position.y)/12;
  const perfilRetorno=crearRamal(retorno,[3,9],salida,descanso,'Llegada al segundo piso',true,
    {...diseño,subida:subidaRetorno,remateBarandilla:.2});
  // El relleno comienza después del descanso de giro, junto al canto interior del retorno.
  const baseRelleno=-retorno.position.y,altoZocalo=1.28,espesorRelleno=.12;
  const finRetorno=perfilRetorno[perfilRetorno.length-1][0];
  bloque(retorno,{x:(salida+finRetorno)/2,y:baseRelleno+altoZocalo/2,z:(ancho-espesorRelleno)/2,
    ancho:finRetorno-salida,alto:altoZocalo,fondo:espesorRelleno,material:piedra})
    .name='Zócalo bajo el retorno de Torre B';
  const perfilPared=new THREE.Shape();
  perfilPared.moveTo(salida,baseRelleno+altoZocalo);
  perfilPared.lineTo(finRetorno,baseRelleno+altoZocalo);
  for(const [px,py] of perfilRetorno.slice(1).reverse())perfilPared.lineTo(px,py-espesorLosa);
  perfilPared.closePath();
  const paredInferior=new THREE.Mesh(new THREE.ExtrudeGeometry(perfilPared,
    {depth:espesorRelleno,bevelEnabled:false}),diseño.acabadoPared);
  paredInferior.name='Paño claro bajo el retorno de Torre B';
  paredInferior.position.z=ancho/2-espesorRelleno;
  paredInferior.castShadow=true;paredInferior.receiveShadow=true;
  retorno.add(paredInferior);
  // La losa llega hasta la cara interior del cierre y el eje del pasamanos exterior.
  const fondoPiso=largo-finRetorno;
  // Cierre transversal del descanso, alineado con el extremo del núcleo de elevadores.
  const bordeElevadores=-ancho/2,bordeEscalera=ancho*1.5+separacion;
  const altoParedDescanso=4.1;
  const ejeCierre=escalera.position.x-anchoEdificio/2,espesorCierre=.16;
  const inicioPiso=ejeCierre+espesorCierre/2;
  const bordeBaranda=bordeEscalera-diseño.retiroPasamanos;
  bloque(escalera,{x:ejeCierre,y:nivelPiso+altoParedDescanso/2,
    z:(bordeElevadores+bordeEscalera)/2,ancho:espesorCierre,alto:altoParedDescanso,
    fondo:bordeEscalera-bordeElevadores,color:'#ffffff'})
    .name='Pared blanca transversal del descanso superior';
  bloque(escalera,{x:(inicioPiso+fondoPiso)/2,y:nivelPiso-espesorLosa/2,z:(bordeElevadores+bordeBaranda)/2,
    ancho:fondoPiso-inicioPiso,alto:espesorLosa,fondo:bordeBaranda-bordeElevadores,material:piedra})
    .name='Piso de llegada de la escalera junto a los elevadores';
  bloque(escalera,{x:(fondoPiso+largo)/2,y:nivelPiso-espesorLosa/2,z:0,
    ancho:largo-fondoPiso,alto:espesorLosa,fondo:ancho,material:piedra})
    .name='Piso superior sobre el tramo junto a los elevadores';
  bloque(escalera,{x:largo-salida/2,y:14*subida-espesorLosa/2,z:(ancho+separacion)/2,
    ancho:salida,alto:espesorLosa,fondo:separacion,material:piedra}).name='Unión del descanso de giro';
  return escalera.position.z-bordeExteriorRetorno-espesorDivision;


}

function diseñoEscaleraInterior(ancho){
  const piedra=new THREE.MeshStandardMaterial({color:'#817c70',roughness:.94});
  const metal=new THREE.MeshStandardMaterial({color:'#c0bdb3',metalness:.48,roughness:.35});
  return {ancho,huella:.52,subida:CONFIG.altoPiso/26,espesorLosa:.26,descanso:1.6,retiroPasamanos:.12,piedra,metal,acabadoPared:acabadoParedEscalera};
}

function crearRamal(ramal,peldaños,accesoPlano,rellanoFinal,nombreSalida,regreso,diseño){
  const {ancho,huella,subida,espesorLosa,descanso,piedra,metal}=diseño;
  let x=0,y=0;

  function plataforma(nombre,longitud,desnivel=0){
    const seccion=new THREE.Shape();
    seccion.moveTo(0,0);seccion.lineTo(longitud,0);
    seccion.lineTo(longitud,-espesorLosa);seccion.lineTo(0,-espesorLosa-desnivel);
    seccion.closePath();
    const pieza=new THREE.Mesh(new THREE.ExtrudeGeometry(seccion,{depth:ancho,bevelEnabled:false}),piedra);
    pieza.position.set(x,y,-ancho/2);pieza.name=nombre;
    pieza.castShadow=true;pieza.receiveShadow=true;ramal.add(pieza);
    x+=longitud;
  }
  const perfil=[[0,0]];
  if(accesoPlano>0){
    plataforma('Descanso de acceso',accesoPlano);
    perfil.push([x,y]);
  }
  for(let tramo=0;tramo<peldaños.length;tramo++){
    for(let i=1;i<=peldaños[tramo];i++){
      y+=subida;
      plataforma(`Escalón ${i} · tramo ${tramo+1}`,huella,subida);
    }
    perfil.push([x,y]);
    const ultimo=tramo===peldaños.length-1;
    plataforma(ultimo?nombreSalida:'Descanso intermedio',ultimo?rellanoFinal:descanso);
    perfil.push([x,y]);
  }
  for(const lado of [-1,1]){
    // El zócalo y el pasamanos siguen las pendientes y los descansos.
    // La pared del fondo termina al llegar al descanso superior.
    const ladoGiro=lado===1;
    const finPared=ladoGiro && !regreso ? perfil.length-1 : perfil.length;
    const inicioPared=ladoGiro && regreso ? 2 : 1;
    for(let i=inicioPared;i<finPared;i++){
      const [x1,y1]=perfil[i-1],[x2,y2]=perfil[i];
      const retiro=lado===-1 ? diseño.retranqueoExterior||0 : 0;
      const borde=lado*(ancho/2-retiro);
      const abierto=ladoGiro && diseño.centroAbierto;
      if(!abierto&&(ladoGiro||!diseño.paredAdmision)){
        const forma=new THREE.Shape();
        forma.moveTo(x1,y1-espesorLosa);forma.lineTo(x2,y2-espesorLosa);
        forma.lineTo(x2,y2+1.28);forma.lineTo(x1,y1+1.28);forma.closePath();
        function pañoLateral(forma,material){
          const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(forma,{depth:.12,bevelEnabled:false}),material);
          mesh.position.z=retiro?borde:borde-(lado<0?.12:0);
          ramal.add(mesh);
        }
        pañoLateral(forma,piedra);
        const pared=new THREE.Shape();
        pared.moveTo(x1,y1+1.28);pared.lineTo(x2,y2+1.28);
        const cimaMuro=retiro ? 4.1 : 0;
        const coronacion=y=>ladoGiro
          ? diseño.cotaCoronacionCentral??Math.max(cimaMuro,y+2.85)
          : Math.min(diseño.topeExterior??Infinity,Math.max(cimaMuro,y+2.85));
        pared.lineTo(x2,coronacion(y2));
        pared.lineTo(x1,coronacion(y1));pared.closePath();
        pañoLateral(pared,diseño.acabadoPared);
      }
      // El pasamanos junto a Admisión termina en el último peldaño.
      if(diseño.paredAdmision&&!ladoGiro&&i===perfil.length-1)continue;
      // Recorta solo la barandilla abierta del último rellano de Torre B.
      const recortada=abierto&&i===perfil.length-1&&diseño.remateBarandilla!==undefined;
      const finBaranda=recortada?Math.min(x2,x1+diseño.remateBarandilla):x2;
      const pasamanos=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,Math.hypot(finBaranda-x1,y2-y1),12),metal);
      const ejeBaranda=borde-lado*(retiro?.24:diseño.retiroPasamanos);
      pasamanos.position.set((x1+finBaranda)/2,(y1+y2)/2+1.03,ejeBaranda);
      pasamanos.rotation.z=Math.atan2(y2-y1,finBaranda-x1)-Math.PI/2;ramal.add(pasamanos);
      for(const t of (recortada?[.8]:[.2,.8])){
        const px=x1+(finBaranda-x1)*t;
        const cima=y1+(y2-y1)*t+1.03;
        if(abierto){
          const base=y2===y1 ? y1 : y1+Math.ceil((px-x1)/huella)*subida;
          bloque(ramal,{x:px,y:(base+cima)/2,z:lado*(ancho/2-.12),
            ancho:.055,alto:cima-base,fondo:.055,material:metal});
        }else{
          bloque(ramal,{x:px,y:cima,z:ejeBaranda+lado*.06,
            ancho:.055,alto:.055,fondo:.12,material:metal});
        }
      }
    }
  }
  return perfil;
}

function crearEscaleraTopico(padre,caraInterior,centroPuerta,caraMuroLateral){
  const escalera=new THREE.Group();
  escalera.name='Escalera de nueve escalones junto a la puerta azul';
  const anchoOriginal=1.35,ampliacion=.32;
  // Deja 75 cm entre el umbral de la puerta azul y el primer peldaño.
  escalera.position.set(caraInterior-.75,CONFIG.baseY+.01,centroPuerta-ampliacion/2);
  escalera.rotation.y=Math.PI;
  padre.add(escalera);
  const diseño={...diseñoEscaleraInterior(anchoOriginal+ampliacion),centroAbierto:true};
  const peldaños=9;
  const espesorLateral=2*diseño.espesorLosa;
  const finTramo=peldaños*diseño.huella;
  const nivelLateral=peldaños*diseño.subida-diseño.espesorLosa+espesorLateral;
  crearRamal(escalera,[peldaños],0,diseño.descanso,'Descanso superior del Tópico',false,diseño);
  bloque(escalera,{x:finTramo+diseño.descanso/2,
    y:nivelLateral-espesorLateral/2,z:diseño.ancho,
    ancho:diseño.descanso,alto:espesorLateral,fondo:diseño.ancho,material:diseño.piedra})
    .name='Descanso lateral para el siguiente tramo del Tópico';
  const retorno=new THREE.Group();
  retorno.name='Tramo de retorno del Tópico';
  retorno.position.set(finTramo,nivelLateral,diseño.ancho);
  retorno.rotation.y=Math.PI;
  escalera.add(retorno);
  const fondoLlegada=diseño.descanso;
  // Amplía el descanso hacia el interior, conservando su borde junto a la fachada.
  const inicioTercerTramo=fondoLlegada-.55;
  const huellaSuperior=(finTramo-inicioTercerTramo)/peldaños;
  const diseñoSuperior={...diseño,huella:huellaSuperior};
  crearRamal(retorno,[peldaños],0,fondoLlegada,'Llegada del tramo de retorno del Tópico',false,
    diseñoSuperior);

  // Cierra el volumen bajo el retorno, desde el canto interior hasta el muro oscuro.
  const bordeInterior=diseño.ancho/2;
  const fondoRelleno=escalera.position.z-caraMuroLateral-bordeInterior;
  const inicioRelleno=inicioTercerTramo-fondoLlegada;
  const finRelleno=finTramo+diseño.descanso;
  const altoZocalo=1.28;
  bloque(escalera,{x:(inicioRelleno+finRelleno)/2,y:altoZocalo/2,z:bordeInterior+fondoRelleno/2,
    ancho:finRelleno-inicioRelleno,alto:altoZocalo,fondo:fondoRelleno,material:diseño.piedra})
    .name='Zócalo del relleno bajo el retorno del Tópico';
  const perfilRelleno=new THREE.Shape();
  const bajo=nivelLateral-diseño.espesorLosa/2,alto=bajo+peldaños*diseño.subida;
  perfilRelleno.moveTo(inicioRelleno,altoZocalo);
  perfilRelleno.lineTo(finRelleno,altoZocalo);
  perfilRelleno.lineTo(finRelleno,bajo);
  perfilRelleno.lineTo(finTramo,bajo);
  perfilRelleno.lineTo(inicioTercerTramo,alto);
  perfilRelleno.lineTo(inicioRelleno,alto);
  perfilRelleno.closePath();
  const relleno=new THREE.Mesh(new THREE.ExtrudeGeometry(perfilRelleno,
    {depth:fondoRelleno,bevelEnabled:false}),diseño.acabadoPared);
  relleno.name='Paño claro bajo el retorno del Tópico';
  relleno.position.z=bordeInterior;
  relleno.castShadow=true;relleno.receiveShadow=true;
  escalera.add(relleno);

  const tercerTramo=new THREE.Group();
  tercerTramo.name='Tercer tramo del Tópico';
  tercerTramo.position.set(inicioTercerTramo,
    nivelLateral+peldaños*diseño.subida+espesorLateral-diseño.espesorLosa,0);
  escalera.add(tercerTramo);
  bloque(tercerTramo,{x:-fondoLlegada/2,y:-espesorLateral/2,z:0,
    ancho:fondoLlegada,alto:espesorLateral,fondo:diseño.ancho,material:diseño.piedra})
    .name='Descanso de giro hacia el tercer tramo del Tópico';
  const subidaFinal=(cotaPiso(2)-escalera.position.y-tercerTramo.position.y)/peldaños;
  const perfil=crearRamal(tercerTramo,[peldaños],0,diseño.descanso,'Llegada del tercer tramo del Tópico',false,
    {...diseñoSuperior,subida:subidaFinal,paredAdmision:true});
  const perfilPared=perfil.map(([px,py])=>[escalera.position.x-inicioTercerTramo-px,
    escalera.position.y+tercerTramo.position.y+py]);
  const caraEscalera=escalera.position.z+diseño.ancho/2;
  return {oeste:escalera.position.x-finRelleno,sur:caraEscalera+.12,caraEscalera,perfilPared,
    espesorLosa:diseño.espesorLosa,piedra:diseño.piedra};
}

// Una sola envolvente: el zócalo inclinado cambia el acabado de la cara interior.
function crearParedAdmision(grupo,hueco,oeste,este,espesor,alto,color){
  const piso=cotaPiso(2),cima=piso+alto;
  const z=hueco.caraEscalera,trasera=z+espesor;
  const geometria=new THREE.BufferGeometry(),vertices=[];
  function cara(a,b,c,d,material){
    geometria.addGroup(vertices.length/3,6,material);
    vertices.push(...a,...b,...d,...b,...c,...d);
  }
  const perfil=[...hueco.perfilPared].reverse();
  const anchoPuerta=1.3,centroPuerta=(perfil[0][0]+perfil[1][0])/2;
  const izquierda=centroPuerta-anchoPuerta/2,derecha=centroPuerta+anchoPuerta/2;
  const baseDescanso=piso-hueco.espesorLosa;
  const tramos=[[oeste,piso,piso],[perfil[0][0],piso,piso],
    [perfil[0][0],baseDescanso,piso+1.28],[izquierda,baseDescanso,piso+1.28],
    [derecha,baseDescanso,piso+1.28],
    ...perfil.slice(1).map(([x,y])=>[x,y-hueco.espesorLosa,y+1.28]),
    [perfil.at(-1)[0],piso,piso],[este,piso,piso]];
  for(let i=1;i<tramos.length;i++){
    const [x0,b0,m0]=tramos[i-1],[x1,b1,m1]=tramos[i];
    if(x0===izquierda&&x1===derecha)continue;
    if(x0===x1){
      // Cierra únicamente el escalón del contorno inferior en el empalme.
      cara([x0,b0,z],[x1,b1,z],[x1,b1,trasera],[x0,b0,trasera],0);
      continue;
    }
    const juntoAEscalera=i>2&&i<tramos.length-2;
    if(juntoAEscalera)cara([x0,b0,z],[x0,m0,z],[x1,m1,z],[x1,b1,z],2);
    cara([x0,m0,z],[x0,cima,z],[x1,cima,z],[x1,m1,z],juntoAEscalera?1:0);
    cara([x0,b0,trasera],[x1,b1,trasera],[x1,cima,trasera],[x0,cima,trasera],0);
    cara([x0,b0,z],[x1,b1,z],[x1,b1,trasera],[x0,b0,trasera],0);
  }
  for(const [x0,x1] of [[oeste,izquierda],[derecha,este]]){
    cara([x0,cima,z],[x0,cima,trasera],[x1,cima,trasera],[x1,cima,z],0);
  }
  cara([oeste,piso,z],[oeste,piso,trasera],[oeste,cima,trasera],[oeste,cima,z],0);
  cara([este,piso,z],[este,cima,z],[este,cima,trasera],[este,piso,trasera],0);
  geometria.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometria.computeVertexNormals();
  const blanco=new THREE.MeshStandardMaterial({color,roughness:.84});
  const pared=new THREE.Mesh(geometria,[blanco,acabadoParedEscalera,hueco.piedra]);
  pared.name='Pared del segundo piso entre la escalera y Admisión';
  pared.castShadow=true;pared.receiveShadow=true;grupo.add(pared);
  const acceso=paredConPuerta(grupo,{x:centroPuerta,z:z+espesor/2,largo:anchoPuerta,
    baseY:piso,alto,espesor,anchoPuerta,altoPuerta:2.35,colorMuro:color,
    colorMarco:'#102650',colorPuerta:'#102650',interactiva:true});
  acceso.name='Acceso azul entre el descanso y Admisión';
  acceso.children.find(o=>o.userData.puertaInteractiva).userData.anguloAbierto=-Math.PI/2;
  bloque(grupo,{x:centroPuerta,z:(z+hueco.sur)/2,y:(baseDescanso+piso)/2,
    ancho:anchoPuerta,alto:hueco.espesorLosa,fondo:hueco.sur-z,material:hueco.piedra})
    .name='Umbral de la puerta azul del descanso';
}

function crearAccesoDobleAdmision(grupo,x,desde,hasta,alto,espesor,color){
  const pared=new THREE.Group();
  pared.name='Tabique entre Admisión y A-200 junto al descanso';
  pared.position.set(x,cotaPiso(2),(desde+hasta)/2);
  pared.rotation.y=-Math.PI/2;
  grupo.add(pared);
  const largo=hasta-desde,vano=2,alturaPuerta=2.4,jamba=.055;
  const lateral=(largo-vano)/2;
  for(const lado of [-1,1]){
    bloque(pared,{x:lado*(vano+lateral)/2,y:alto/2,ancho:lateral,alto,fondo:espesor,color});
    bloque(pared,{x:lado*(vano-jamba)/2,y:alturaPuerta/2,ancho:jamba,alto:alturaPuerta,
      fondo:espesor+.025,color:'#343940'});
  }
  bloque(pared,{y:(alturaPuerta+alto)/2,ancho:vano,alto:alto-alturaPuerta,fondo:espesor,color});
  bloque(pared,{y:alturaPuerta-jamba/2,ancho:vano-2*jamba,alto:jamba,fondo:espesor+.025,color:'#343940'});
  const radio=vano/2-jamba;
  const plata=new THREE.MeshStandardMaterial({color:'#d4d6d4',metalness:.65,roughness:.32});
  for(const lado of [-1,1]){
    const hoja=new THREE.Group();
    hoja.name=`Hoja ${lado<0?'izquierda':'derecha'} de la puerta de Admisión`;
    hoja.position.x=lado*radio;
    Object.assign(hoja.userData,{puerta:true,puertaInteractiva:true,abierta:false,
      anguloAbierto:-lado*Math.PI/2,colisionDinamica:true,grupoPuertas:pared.uuid});
    pared.add(hoja);
    bloque(hoja,{x:-lado*radio/2,y:(alturaPuerta-jamba)/2,ancho:radio-.012,
      alto:alturaPuerta-jamba-.025,fondo:.065,color:lado<0?'#41474e':'#53565a'});
    if(lado<0){
      const placa={x:radio/2,y:1.89};
      bloque(hoja,{...placa,z:.038,ancho:.57,alto:.32,fondo:.009,color:'#eeede7'});
      for(const [offset,tono] of [[-.135,'#a43f41'],[.135,'#244667']]){
        bloque(hoja,{x:placa.x+offset,y:placa.y,z:.045,ancho:.25,alto:.28,fondo:.005,color:tono});
        for(const dy of [-.062,-.09])bloque(hoja,{x:placa.x+offset,y:placa.y+dy,z:.049,
          ancho:.17,alto:.008,fondo:.003,color:'#eeede7'});
      }
    }else{
      for(const cara of [-1,1]){
        const roseta=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,.044,20),plata);
        roseta.rotation.x=Math.PI/2;roseta.position.set(-radio+.13,1.04,cara*.052);hoja.add(roseta);
        bloque(hoja,{x:-radio+.2,y:1.04,z:cara*.081,ancho:.17,alto:.035,fondo:.045,material:plata});
      }
    }
  }
}

function crearCuatroVentanillas(pared,cx){
  const marco=new THREE.MeshStandardMaterial({color:'#858780',metalness:.5,roughness:.45});
  const cristal=vidrioVentanillas();
  for(let i=0;i<4;i++)bloque(pared,{x:cx+(i-1.5)*.55,y:2.775,z:.2,ancho:.55,alto:.65,fondo:.025,material:cristal,sombra:false}).name='Ventanilla superior lateral';
  for(let i=0;i<=4;i++)bloque(pared,{x:cx+(i-2)*.55,y:2.775,z:.23,ancho:.055,alto:.65,fondo:.12,material:marco});
  for(const y of [2.45,3.1])bloque(pared,{x:cx,y,z:.23,ancho:2.25,alto:.065,fondo:.12,material:marco});
}

function detallesTopico(pared,centroPuerta,cx){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d');
  ctx.font='bold 90px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#e7e5dc';ctx.fillText('Tópico',256,64);
  const mapa=new THREE.CanvasTexture(canvas);mapa.colorSpace=THREE.SRGBColorSpace;
  const rotulo=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.375),
    new THREE.MeshStandardMaterial({map:mapa,transparent:true,roughness:.6}));
  rotulo.name='Rótulo Tópico sobre la puerta blanca';rotulo.position.set(centroPuerta,2.88,.19);pared.add(rotulo);
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

function crearVidrieraFachada(padre,torre,x,inicio,fin,base,alto){
  const conjunto=new THREE.Group();conjunto.name='Vidriera exterior del segundo piso de Torre A';
  padre.add(conjunto);
  const centro=(inicio+fin)/2,largo=fin-inicio,perfil=.045,corte=alto*.72;
  const cristal=new THREE.MeshStandardMaterial({color:'#d0dfe0',transparent:true,opacity:.13,
    roughness:.19,metalness:.12,depthWrite:false});
  bloque(conjunto,{x,y:base+alto/2,z:centro,ancho:.035,alto,fondo:largo,material:cristal,sombra:false})
    .name='Cristal de la fachada de aulas';
  const marco=new THREE.MeshStandardMaterial({color:'#454b4e',metalness:.32,roughness:.55});
  for(const y of [perfil/2,corte,alto-perfil/2]){
    bloque(conjunto,{x,y:base+y,z:centro,ancho:.09,alto:perfil,fondo:largo,material:marco});
  }
  const longitud=(ajustarZ(torre.z+fin,torre.x+x)-ajustarZ(torre.z+inicio,torre.x+x))*CONFIG.escalaLongitudinalCampus;
  const modulos=Math.max(1,Math.round(longitud/(alto*.52)));
  const medir=medirPaneles(torre,x,inicio,-Math.PI/2);
  for(let i=0;i<=2*modulos;i++){
    const z=inicio+medir(0,largo,longitud*i/(2*modulos));
    const desde=i%2===0?0:corte;
    bloque(conjunto,{x,y:base+(desde+alto)/2,z:THREE.MathUtils.clamp(z,inicio+perfil/2,fin-perfil/2),
      ancho:.09,alto:alto-desde,fondo:perfil,material:marco});
  }
}

// Mide el ancho sobre el muro ya compactado; los vanos siguen en coordenadas locales.
function medirPaneles(torre,x,z,rotacion){
  const ejeX=Math.cos(rotacion),ejeZ=-Math.sin(rotacion);
  const posicion=t=>{
    const px=torre.x+x+t*ejeX,pz=torre.z+z+t*ejeZ;
    return Math.abs(ejeX)>.5?ajustarX(px)*ejeX:ajustarZ(pz,px)*CONFIG.escalaLongitudinalCampus*ejeZ;
  };
  return (inicio,limite,ancho)=>{
    const destino=posicion(inicio)+ancho;
    if(posicion(limite)<=destino)return limite;
    let a=inicio,b=limite;
    for(let i=0;i<28;i++){
      const medio=(a+b)/2;
      if(posicion(medio)<destino)a=medio;
      else b=medio;
    }
    return (a+b)/2;
  };
}

function vidrioVentanillas(){
  return new THREE.MeshStandardMaterial({color:'#cfdee4',transparent:true,opacity:.18,roughness:.12,depthWrite:false});
}

function revestirPaneles(padre,{torre,x,z,largo,alto,rotacion,accesoJardin=false,huecos=[],recorteInicio=0}){
  const paneles=new THREE.Group();
  paneles.name='Revestimiento exterior de paneles verticales de Torre A';
  paneles.position.set(x,CONFIG.baseY,z);paneles.rotation.y=rotacion;
  padre.add(paneles);
  if(accesoJardin){
    // Puerta junto al arranque del jardín y seis luces altas, según la fotografía.
    const inicio=-largo/2+1.45,anchoPuerta=1.25,altoPuerta=2.45;
    const marco=new THREE.MeshStandardMaterial({color:'#858780',metalness:.65,roughness:.4});
    const vidrio=vidrioVentanillas();
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
    huecos.push([inicio,inicio+anchoVentanas,base,base+altoVentana]);
    for(let i=0;i<6;i++)pieza(`Ventanilla superior lateral ${i+1}`,{x:inicio+(i+.5)*paso,y:base+altoVentana/2,ancho:paso,alto:altoVentana,fondo:.025,material:vidrio,sombra:false});
    for(let i=0;i<=6;i++)pieza('Montante metálico de ventanillas',{x:inicio+i*paso,y:base+altoVentana/2,ancho:.055,alto:altoVentana,fondo:.13,material:marco});
    for(const py of [base,base+altoVentana])pieza('Travesaño metálico de ventanillas',{x:inicio+anchoVentanas/2,y:py,ancho:anchoVentanas+.055,alto:.065,fondo:.13,material:marco});
  }
  const tonos=['#73747a','#55565e','#d7d6d0','#86868b','#65666d','#e2e0d8'];
  const materiales=tonos.map(color=>new THREE.MeshStandardMaterial({color,roughness:.83}));
  const anchos=[.82,.55,1.05,.68,.92,.48];
  const finPanel=medirPaneles(torre,x,z,rotacion);
  let borde=-largo/2+recorteInicio,indice=0;
  while(borde<largo/2-.001){
    const fin=finPanel(borde,largo/2,anchos[indice%anchos.length]);
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
