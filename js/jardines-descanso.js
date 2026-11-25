import * as THREE from 'three';
import {CONFIG,AMBIENTES,ENTRADA_CAFETERIA} from './config.js';
import {aplicarPiedraPisos} from './piedra-piso.js';
import {cubrirJardinesConTierraYPasto} from './vegetacion.js';
import {ajustarZ,zTorreC} from './franja-campus.js';
import {plantarPatioC} from './parterres-torre-c.js';

// La misma cobertura vegetal, piedra y bordes del patio de referencia,
// exclusivamente en planta baja, bajo los cuatro vacíos superiores.
export function crearJardinesDescanso({escena,extras,patios}) {
  if(!Array.isArray(patios)||patios.length!==4)throw new Error('Se necesitan los cuatro patios del modelo.');
  const existente=escena.getObjectByName('Jardines interiores · Primer piso');
  if(existente?.userData.servicio)return existente.userData.servicio;
  const nivel=CONFIG.baseY+.01;
  const grupo=new THREE.Group();grupo.name='Jardines interiores · Primer piso';
  const sectores=[],integrados=[],patiosPlantaBaja=[],originalesAB=[],nuevosAB=[];
  grupo.userData={nivel,patios:patios.map(p=>({...p})),patiosPlantaBaja,sectores,integrados,planta:1};
  const base=new THREE.BoxGeometry(1,1,1);
  const materiales={
    piedra:new THREE.MeshStandardMaterial({color:CONFIG.acabados.piso,roughness:.88}),
    borde:new THREE.MeshStandardMaterial({color:'#292c30',roughness:.92}),
    tapa:new THREE.MeshStandardMaterial({color:'#45494f',roughness:.86}),
    cesped:new THREE.MeshStandardMaterial({color:'#3a9676',roughness:1}),
  };
  function caja(mat,x,y,z,w,h,d,nombre,sinColision=false){
    const m=new THREE.Mesh(base,materiales[mat]);m.position.set(x,y,z);m.scale.set(w,h,d);
    if(x>0)nuevosAB.push(m);
    m.name=nombre;m.castShadow=true;m.receiveShadow=true;m.userData.sinColision=sinColision;grupo.add(m);return m;
  }
  // Integra únicamente las jardineras anteriores que coinciden con estas franjas.
  const huellasAnteriores=[
    {xmin:-16.9,xmax:-9.1,zmin:-33.4,zmax:-26.6},
    {xmin:9.1,xmax:16.9,zmin:-33.4,zmax:-26.6},
    {xmin:16.0,xmax:21.0,zmin:-9.4,zmax:23.9},
  ];
  escena.updateMatrixWorld(true);
  for(const nombre of ['Jardín lateral de Sala de Conferencias','Jardín trapezoidal entre Tópico y Torre B']){
    const anterior=extras?.getObjectByName(nombre);
    if(!anterior)continue;
    originalesAB.push(anterior);
    anterior.visible=false;
    anterior.userData.integradoEnJardinesDescanso=true;
    integrados.push({uuid:anterior.uuid,nombre});
  }
  if(extras)for(const objeto of [...extras.children]){
    if(!objeto.isMesh||!objeto.visible)continue;
    const b=new THREE.Box3().setFromObject(objeto);
    if(b.max.y>nivel+1.3||b.min.y<-.01)continue;
    if(!huellasAnteriores.some(r=>b.min.x>=r.xmin&&b.max.x<=r.xmax&&b.min.z>=r.zmin&&b.max.z<=r.zmax))continue;
    if((b.min.x+b.max.x)/2>0)originalesAB.push(objeto);
    objeto.visible=false;objeto.userData.integradoEnJardinesDescanso=true;
    integrados.push({uuid:objeto.uuid,nombre:objeto.name||'Base de jardinera anterior'});
  }
  (extras||escena).add(grupo);
  function parterre(patio,x,z,w,d){
    if(d<1.3||w<1.8)return;
    const espesor=.28;
    sectores.push({patio:patio.id,x,z,ancho:w,fondo:d,nivel});
    // Sin escalado: cada hoja conserva el tamaño de las plantas de referencia.
    const geometria=new THREE.PlaneGeometry(w-2*espesor,d-2*espesor);geometria.rotateX(-Math.PI/2);
    const verde=new THREE.Mesh(geometria,materiales.cesped);verde.position.set(x,nivel+.12,z);
    if(x>0)nuevosAB.push(verde);
    verde.name='Césped · exclusivamente primer piso';verde.receiveShadow=true;
    verde.userData.sinColision=true;grupo.add(verde);
    if(patio.x<0)plantarPatioC(verde,x,z,w-2*espesor,d-2*espesor,1721+Math.round(z*19));
    for(const lado of [-1,1]){
      const xx=x+lado*(w-espesor)/2,zz=z+lado*(d-espesor)/2;
      caja('borde',xx,nivel+.125,z,espesor,.25,d,'Muro oscuro de jardinera');
      caja('tapa',xx,nivel+.275,z,espesor,.05,d,'Coronación oscura de jardinera');
      caja('borde',x,nivel+.125,zz,w-2*espesor,.25,espesor,'Muro oscuro de jardinera');
      caja('tapa',x,nivel+.275,zz,w-2*espesor,.05,espesor,'Coronación oscura de jardinera');
    }
  }
  const zNucleo=escena.getObjectByName('Área de elevadores')?.getWorldPosition(new THREE.Vector3()).z??11.763684;
  const pasosTransversales=[{z:-21,ancho:3.4},{z:zNucleo,ancho:3.4}];
  const limiteC=CONFIG.torres.C.x+Math.max(...AMBIENTES.C.map(a=>(a.x+a.ancho/2)*CONFIG.torres.C.ancho/16))+.24;
  const limiteA=CONFIG.torres.A.x+Math.min(...AMBIENTES.A.map(a=>(a.x-a.ancho/2)*CONFIG.torres.A.ancho/16))-.24;
  for(const origen of patios){
    const xmin=Math.max(origen.x-origen.ancho/2,origen.x<0?limiteC:-Infinity);
    const xmax=Math.min(origen.x+origen.ancho/2,origen.x>0?limiteA:Infinity);
    const p={...origen,x:(xmin+xmax)/2,ancho:xmax-xmin};patiosPlantaBaja.push(p);
    const zmin=p.z-p.fondo/2,zmax=p.z+p.fondo/2;
    // Misma cota y textura de piedra que el paseo existente, sin escalón.
    caja('piedra',p.x,nivel-.10,p.z,p.ancho,.2,p.fondo,'Pavimento continuo · '+p.id);
    let tramos=[[zmin+1.55,zmax-1.55]];
    const cortes=pasosTransversales.map(paso=>[paso.z-paso.ancho/2,paso.z+paso.ancho/2]);
    if(p.x<0){
      // Los cruces de pizarra llegan al umbral real de los baños y de la cafetería.
      const origen=destino=>{
        let a=-39,b=39;
        for(let i=0;i<20;i++){
          const medio=(a+b)/2;
          if(ajustarZ(medio,p.x)<destino)a=medio;else b=medio;
        }
        return (a+b)/2;
      };
      const ejeCafe=CONFIG.torres.C.z+ENTRADA_CAFETERIA.z;
      const anchoCafe=ENTRADA_CAFETERIA.ancho*CONFIG.escalaLongitudinalCampus;
      for(const [umbral,ancho] of [[-10.9,1.62],[ejeCafe,anchoCafe]]){
        const centro=zTorreC(umbral),radio=ancho/(2*CONFIG.escalaLongitudinalCampus);
        cortes.push([origen(centro-radio),origen(centro+radio)]);
      }
    }
    for(const [desde,hasta] of cortes)tramos=tramos.flatMap(([a,b])=>{
      if(b<=desde||a>=hasta)return [[a,b]];
      return [[a,Math.min(b,desde)],[Math.max(a,hasta),b]].filter(([c,d])=>d-c>1.3);
    });
    for(const [a,b] of tramos)parterre(p,p.x,(a+b)/2,p.ancho-2*1.35,b-a);
  }
  grupo.userData.pasosTransversales=pasosTransversales;
  aplicarPiedraPisos([grupo],CONFIG.acabados.piso);
  cubrirJardinesConTierraYPasto(grupo);
  const primero=patiosPlantaBaja[0];
  const puntoInicio=new THREE.Vector3(primero.x-primero.ancho/2+.58,nivel,primero.z);
  const servicio={grupo,puntoInicio,usarJardinesOriginalesAB(original){
    for(const o of originalesAB)o.visible=original;
    for(const o of nuevosAB)o.visible=!original;
    escena.updateMatrixWorld(true);
  }};grupo.userData.servicio=servicio;
  escena.updateMatrixWorld(true);return servicio;
}

