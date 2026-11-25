import * as THREE from 'three';
import {pisoConHueco,HUECO_C,ACCESO_C} from './subterraneo-c.js';
import {mamparaComedor} from './interiores-c.js';
import {CONFIG,PARQUE_ASTERISCO} from './config.js';
import {bloque} from './geometria.js';
import {zTorreC} from './franja-campus.js';
import {plantarCobertura,tierraJardin} from './vegetacion.js';

// Referencia: video del lateral de Torre C, 15/11/2026.
// Ubicaciones y dimensiones aproximadas; el video no aporta cotas.
export const LATERAL_C={oeste:-(CONFIG.anchoCampus-CONFIG.espesorCerco)/2,este:-38.5,
  norte:-32,sur:(CONFIG.fondoCampus-CONFIG.espesorCerco)/2,nivel:CONFIG.baseY+.01};

function barra(g,a,b,radio=.035,color='#919898'){
  const inicio=new THREE.Vector3(...a),fin=new THREE.Vector3(...b),v=fin.clone().sub(inicio);
  const m=new THREE.Mesh(new THREE.CylinderGeometry(radio,radio,v.length(),6),
    new THREE.MeshStandardMaterial({color,metalness:.65,roughness:.4}));
  m.position.copy(inicio.add(fin).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());g.add(m);return m;
}

// Cada hoja comparte el mismo pliegue central; el perfil cambia según la planta.
function geometriaRoseta(cantidad,paleta,medidas){
  const vertices=[],colores=[],tonos=paleta.map(c=>new THREE.Color(c));
  for(let k=0;k<cantidad;k++){
    const a=k*2.39996,[radio,alto,ancho]=medidas(k);
    const punto=(r,h,w)=>[r*Math.cos(a)-w*Math.sin(a),h,r*Math.sin(a)+w*Math.cos(a)];
    const hoja=[punto(0,0,0),punto(radio*.45,alto*.55,-ancho),punto(radio*.39,alto*.68,0),
      punto(radio*.45,alto*.55,ancho),punto(radio,alto,0)];
    for(const [v,c] of [[0,0],[1,1],[2,2],[0,0],[2,2],[3,1],[1,1],[4,3],[2,2],[2,2],[4,3],[3,1]]){
      vertices.push(...hoja[v]);colores.push(...tonos[c].toArray());
    }
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colores,3));geo.computeVertexNormals();return geo;
}

function plantarAsterisco(jardin,banco,bordura){
  const {x,z,ancho,fondo}=PARQUE_ASTERISCO,y=LATERAL_C.nivel;
  const radial=new THREE.Group();radial.name='Jardinera ornamental radial';
  radial.position.set(x,y,z);jardin.add(radial);
  agaves(radial,[[-ancho*.30,.59,-fondo*.26,2.1],[-ancho*.12,.59,-fondo*.34,1.82],[ancho*.38,.59,-fondo*.18,1.55]]);
  const piedra=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88});
  for(const [rx,rz,r] of [[0,0,.55],[ancho*.32,fondo*.32,.43],[ancho*.25,-fondo*.27,.48]]){
    const geo=new THREE.SphereGeometry(r,24,16),pos=geo.attributes.position,colores=[];
    const granito=new THREE.Color('#a7a49a'),color=new THREE.Color();
    for(let i=0;i<pos.count;i++){
      const veta=Math.sin(12*pos.getX(i)+8*pos.getY(i))*Math.cos(11*pos.getZ(i)-4*pos.getY(i));
      color.copy(granito).multiplyScalar(.94+.10*veta);colores.push(...color.toArray());
    }
    geo.setAttribute('color',new THREE.Float32BufferAttribute(colores,3));
    const esfera=new THREE.Mesh(geo,piedra);esfera.name='Esfera de piedra del asterisco';
    esfera.userData.conservarForma=true;esfera.scale.z=1/CONFIG.escalaLongitudinalCampus;
    esfera.position.set(rx,.585+r*.91,rz);esfera.castShadow=true;esfera.receiveShadow=true;radial.add(esfera);
  }
  // Hojas carnosas con un pliegue en el centro, verdes por fuera y violáceas en la base.
  const geo=geometriaRoseta(11,['#59384a','#58724e','#995b72','#9eaa74'],k=>k<7?[.23,.20,.05]:[.14,.26,.046]);
  const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85,side:THREE.DoubleSide});
  const puntos=[];
  for(const [dx,dz] of [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]]){
    const rx=dx*(ancho/2-.46),rz=dz*(fondo/2-.45),largo=Math.hypot(rx,rz);
    for(let d=.65;d<largo;d+=.31){
      const u=rx*d/largo,v=rz*d/largo;
      if(u>ancho/2-banco.fondo-.47&&v+z>banco.desde-.45&&v+z<banco.hasta+.45)continue;
      puntos.push([u,v]);
    }
  }
  const rosetas=new THREE.InstancedMesh(geo,mat,puntos.length),o=new THREE.Object3D();
  puntos.forEach(([u,v],i)=>{
    o.position.set(u,.63,v);o.rotation.y=i*2.4;o.scale.setScalar(.92+.15*Math.sin(i*1.7));
    o.updateMatrix();rosetas.setMatrixAt(i,o.matrix);
  });
  rosetas.name='Rosetas de los ocho radios';rosetas.userData.sinColision=true;
  rosetas.castShadow=true;rosetas.receiveShadow=true;radial.add(rosetas);
  const orla=new THREE.InstancedMesh(geo,mat,bordura.length);
  bordura.forEach(([px,pz,tam],i)=>{
    o.position.set(px-x,.598,pz-z);o.rotation.y=i*1.67;o.scale.setScalar(tam);
    o.updateMatrix();orla.setMatrixAt(i,o.matrix);
  });
  orla.name='Rosetas bajas junto al comedor';orla.castShadow=true;orla.receiveShadow=true;
  orla.userData.sinColision=true;radial.add(orla);
  // En el encuentro con el comedor se agrupan tallos oscuros de hojas superpuestas.
  const tallos=[[-5.78,8.62,1.02],[-5.42,8.93,1.24],[-5.17,8.57,.84],[-4.88,8.91,1.07],[-4.64,8.60,.70]];
  plantarArbustos(radial,tallos,geo,.61);
}
function plantarArbustos(grupo,tallos,geo,base){
  const o=new THREE.Object3D();
  const arbustos=new THREE.InstancedMesh(geo,new THREE.MeshStandardMaterial({color:'#36543a',roughness:.88,side:THREE.DoubleSide}),tallos.length*8);
  let i=0;
  for(const [u,v,alto] of tallos)for(let k=0;k<8;k++){
    const t=k/7,radio=(1.68-.85*t)*alto;
    o.position.set(u+.05*t,base+t*alto,v);o.rotation.y=k*1.71+i;
    o.scale.set(radio,1.4*alto,radio);o.updateMatrix();arbustos.setMatrixAt(i++,o.matrix);
  }
  arbustos.name='Arbustos de la esquina del comedor';arbustos.userData.sinColision=true;
  arbustos.castShadow=true;arbustos.receiveShadow=true;grupo.add(arbustos);
}

function agaves(g,puntos){
  const geo=geometriaRoseta(13,['#425b4b','#67816a','#8a9f80','#acb59b'],k=>[.32-.24*k/12,.31+.25*k/12,.042]);
  const hojas=new THREE.InstancedMesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.72,side:THREE.DoubleSide}),puntos.length);
  const o=new THREE.Object3D();
  puntos.forEach(([x,y,z,tam],i)=>{
    o.position.set(x,y,z);o.rotation.y=i*2.40;o.scale.setScalar(tam);o.updateMatrix();
    hojas.setMatrixAt(i,o.matrix);
  });
  hojas.castShadow=true;hojas.receiveShadow=true;
  hojas.name='Matas de hojas lanceoladas';hojas.userData.sinColision=true;g.add(hojas);
}
// Las matas altas del acceso tienen hojas angostas que se arquean sobre la cobertura baja.
function plantarMatasDeEntrada(jardin,puntos){
  const vertices=[],colores=[];
  const tonos=['#516745','#637853','#748663','#85946c'].map(c=>new THREE.Color(c));
  for(let n=0;n<46;n++){
    const a=n*2.39996,cos=Math.cos(a),sin=Math.sin(a),v=(n%9)/8;
    const alto=.48+.4*v,largo=.48-.27*v,ancho=.018+.008*v;
    const punto=(r,h,w)=>[cos*r-sin*w,h,sin*r+cos*w];
    const pie=punto(.08,.015,-ancho),talon=punto(.08,.015,ancho);
    const izq=punto(largo*.43,alto*.81,-ancho*.85),der=punto(largo*.43,alto*.81,ancho*.85);
    const punta=punto(largo,alto*(.74+.26*v),0);
    vertices.push(...pie,...talon,...der,...pie,...der,...izq,...izq,...der,...punta);
    const tono=tonos[n%tonos.length];for(let i=0;i<9;i++)colores.push(tono.r,tono.g,tono.b);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colores,3));geo.computeVertexNormals();
  const m=new THREE.InstancedMesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.94}),puntos.length);
  const o=new THREE.Object3D();
  puntos.forEach(([x,y,z,tam],i)=>{o.position.set(x,y,z);o.scale.setScalar(tam);o.rotation.y=i*1.37;o.updateMatrix();m.setMatrixAt(i,o.matrix);});
  m.name='Matas de hojas arqueadas';m.castShadow=true;m.receiveShadow=true;m.userData.sinColision=true;jardin.add(m);
}

// Tinaja de barro sobre lajas bajas, visible al fondo del jardín en la toma de 0:25.
function tinajaDeBarro(jardin,x,y,z){
  const conjunto=new THREE.Group();conjunto.name='Tinaja sobre lajas';conjunto.position.set(x,y,z);jardin.add(conjunto);
  conjunto.userData.conservarForma=true;conjunto.scale.z=1/CONFIG.escalaLongitudinalCampus;
  const pizarra=new THREE.MeshStandardMaterial({color:'#817960',roughness:.98});
  for(let i=0;i<3;i++)
    bloque(conjunto,{x:(i-1)*.43,y:.035,z:.10*Math.sin(i*2),ancho:.39,alto:.07,fondo:1.12-i*.06,rotacion:.06*(i-1),material:pizarra});
  const perfil=[[.14,0],[.20,.055],[.32,.23],[.34,.40],[.28,.53],[.19,.62],[.19,.67],
    [.22,.68],[.22,.72],[.18,.73],[.15,.69],[.15,.62],[.25,.50],[.285,.34],[.23,.15],[.04,.08]];
  const geo=new THREE.LatheGeometry(perfil.map(([r,h])=>new THREE.Vector2(r,h)),32);
  const color=new THREE.Color(),colores=[];
  for(let i=0;i<geo.attributes.position.count;i++){
    const punto=i%perfil.length;
    color.set(punto>=10?'#80563d':punto>=7?'#bf8f68':'#ad7354');
    color.multiplyScalar(.98+.025*Math.sin(3*i));colores.push(color.r,color.g,color.b);
  }
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colores,3));
  const jarra=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.91}));
  jarra.position.set(-.04,.076,-.03);jarra.rotation.z=.10;jarra.castShadow=true;jarra.receiveShadow=true;conjunto.add(jarra);
}
function jardinPosterior(g){
  const {x,ancho,nivel}=ACCESO_C;
  const interior=ancho/2+.48,exterior=PARQUE_ASTERISCO.ancho/2;
  // Ambas puntas terminan en la misma línea antes del alero de la caseta.
  const boca=ACCESO_C.zCaseta+ACCESO_C.fondoAlero/2+1.25;
  const fondo=PARQUE_ASTERISCO.z-PARQUE_ASTERISCO.fondo/2-2.42;
  // La franja transversal avanza hacia la flecha más próxima desde su borde interior.
  const retorno=-13.85;
  const radioInterior=.67,radioPunta=.39;
  const inicioRadial=PARQUE_ASTERISCO.z-PARQUE_ASTERISCO.fondo/2;
  const inicioTerraza=PARQUE_ASTERISCO.z+PARQUE_ASTERISCO.fondo/2;
  const oeste=LATERAL_C.oeste-x,finTerraza=LATERAL_C.sur,esquina=LATERAL_C.este-x;
  // Medir a la escala final. Los dos retornos atraviesan tramos con distinta compresión longitudinal.
  const anchoFranja=1.52,bordeMesasOeste=oeste+anchoFranja;
  const escalaFondo=(zTorreC(finTerraza)-zTorreC(finTerraza-1))*CONFIG.escalaLongitudinalCampus;
  const escalaJardin=(zTorreC(inicioTerraza+1)-zTorreC(inicioTerraza))*CONFIG.escalaLongitudinalCampus;
  const bordeMesasFondo=finTerraza-anchoFranja/escalaFondo;
  const bordeMesasJardin=inicioTerraza+anchoFranja/escalaJardin;
  // Trazar el cuarto de óvalo en las dimensiones finales del paseo.
  const zReal=z=>zTorreC(z)*CONFIG.escalaLongitudinalCampus;
  const radioX=2.75,radioZ=1.72,centroX=bordeMesasOeste+radioX,centroZ=zReal(bordeMesasJardin)+radioZ;
  function zDelPlano(destino){
    let a=inicioTerraza,b=finTerraza;
    for(let i=0;i<22;i++){
      const medio=(a+b)/2;
      if(zReal(medio)<destino)a=medio;else b=medio;
    }
    return (a+b)/2;
  }
  // Banca de piedra enrasada en el borde que da al pasillo de la cocina.
  const banco={desde:-2.7,hasta:1.65,fondo:1.05};
  const jardin=new THREE.Group();
  jardin.name='Jardín central en C';g.add(jardin);

  // Una sola huella rodea la rampa y el comedor. La coronación sigue el límite con el pavimento.
  function perfil(margen){
    const e=exterior-margen,i=interior+margen,a=boca+margen,c=retorno+margen;
    const ri=radioInterior+margen,rp=radioPunta-margen;
    const forma=new THREE.Shape();
    const linea=(u,z)=>forma.lineTo(x+u,-z);
    const curva=(u,z,v,w)=>forma.quadraticCurveTo(x+u,-z,x+v,-w);
    // La pared retiene la tierra en ambos lados de la esquina. Sólo el pavimento necesita bordillo.
    const juntoAlMuro=oeste+margen*.06,contraFondo=finTerraza-margen*.06;
    forma.moveTo(x+juntoAlMuro,-(a+rp));
    linea(juntoAlMuro,contraFondo);linea(esquina-margen,contraFondo);
    linea(esquina-margen,bordeMesasFondo+margen/escalaFondo);linea(bordeMesasOeste-margen,bordeMesasFondo+margen/escalaFondo);
    for(let i=0;i<=24;i++){
      const angulo=i*Math.PI/48;
      linea(centroX-(radioX+margen)*Math.cos(angulo),zDelPlano(centroZ-(radioZ+margen)*Math.sin(angulo)));
    }
    linea(e,zDelPlano(centroZ-radioZ-margen));
    if(margen>0){
      linea(e,banco.hasta+margen);linea(e-banco.fondo,banco.hasta+margen);
      linea(e-banco.fondo,banco.desde-margen);linea(e,banco.desde-margen);
    }
    linea(e,a+rp);curva(e,a,e-rp,a);
    linea(i+rp,a);curva(i,a,i,a+rp);
    linea(i,c-ri);curva(i,c,i-ri,c);
    linea(-i+ri,c);curva(-i,c,-i,c-ri);
    linea(-i,a+rp);curva(-i,a,-i-rp,a);
    linea(juntoAlMuro+rp,a);curva(juntoAlMuro,a,juntoAlMuro,a+rp);
    forma.closePath();return forma;
  }

  function capa(nombre,forma,alto,cota,material){
    const geo=new THREE.ExtrudeGeometry(forma,{depth:alto,curveSegments:10,bevelEnabled:false});
    geo.rotateX(-Math.PI/2);
    const m=new THREE.Mesh(geo,material);m.name=nombre;m.position.y=nivel+cota;
    m.castShadow=true;m.receiveShadow=true;jardin.add(m);
  }
  capa('Contención continua',perfil(0),.56,0,new THREE.MeshStandardMaterial({color:'#242727',roughness:.9}));
  const borde=perfil(0),suelo=perfil(.21);
  borde.holes.push(new THREE.Path(suelo.getPoints(10).reverse()));
  capa('Coronación continua',borde,.09,.555,new THREE.MeshStandardMaterial({color:'#454a49',roughness:.82}));
  capa('Tierra del jardín en C',suelo,.035,.55,tierraJardin());

  // La trama de plantación se recorta con la misma curva que la coronación.
  const limite=perfil(.30).getPoints(10),plantas=[],matas=[];
  const xDrenaje=x+exterior-.87,zDrenaje=fondo-.96;
  const paletaRadial=['#a6b86a','#598556','#94ac61','#668b54'];
  const paletaOrla=['#65835b','#a1b575','#87586a','#547659'];
  const mezcla=new THREE.Color(),destino=new THREE.Color();
  const xTinaja=x-6.04,zTinaja=-16.9;
  // En el video (0:18–0:26), una hilera de cantos grises separa masas de cubresuelos.
  const ejeCantos=z=>LATERAL_C.oeste+1.92+.48*Math.sin((z+3)*.33);
  const desdeCantos=-14.2,hastaCantos=9.6;
  const anchoCantos=z=>.33*THREE.MathUtils.smoothstep(z,desdeCantos,desdeCantos+1.65)*
    (1-THREE.MathUtils.smoothstep(z,hastaCantos-1.85,hastaCantos));
  for(let fila=0,z=boca+.34;z<finTerraza-.075;fila++,z+=.205){
    const cortes=[];
    for(let k=1;k<limite.length;k++){
      const p=limite[k-1],q=limite[k];
      if((p.y>-z)===(q.y>-z))continue;
      cortes.push(p.x+(q.x-p.x)*(-z-p.y)/(q.y-p.y));
    }
    cortes.sort((a,b)=>a-b);
    for(let k=0;k+1<cortes.length;k+=2){
      const inicio=Math.ceil((cortes[k]-x)/.205)*.205+x;
      for(let u=inicio;u<cortes[k+1];u+=.205){
        if(u<LATERAL_C.oeste+.08)continue;
        if(Math.abs(u-xDrenaje)<.54&&Math.abs(z-zDrenaje)<.53)continue;
        if(Math.abs(u-xTinaja)<.70&&Math.abs(z-zTinaja)<.61)continue;
        if(Math.abs(u-ejeCantos(z))<anchoCantos(z))continue;
        const dx=Math.abs(u-x)-(interior-radioInterior),dz=z-(retorno-radioInterior);
        const dist=Math.hypot(Math.max(0,dx),Math.max(0,dz))+Math.min(Math.max(dx,dz),0)-radioInterior;
        const onda=dist+.30*Math.sin((z-boca)*.56)+.14*Math.cos((u-x)*1.6);
        const juntoAlIngreso=z<boca+3.3+.65*Math.sin(u-x);
        let color=juntoAlIngreso&&onda>1.65?'#775262':onda<.90?'#95aa67':onda<1.87?'#587b52':'#80996a';
        let altura=.91+.23*Math.sin(onda*2.5);
        if(z>fondo){
          const rx=(u-x)/exterior,rz=(z-PARQUE_ASTERISCO.z)/(PARQUE_ASTERISCO.fondo/2);
          const radial=Math.min(Math.abs(rx),Math.abs(rz),Math.abs(rx-rz)*.7,Math.abs(rx+rz)*.7);
          const sector=Math.floor((Math.atan2(rz,rx)+Math.PI)/(Math.PI/4))%4;
          const transicion=THREE.MathUtils.smoothstep(radial,.027,.078);
          const bordeClaro=.45*Math.exp(-((radial-.104)**2)/.0012);
          const verde=mezcla.set(paletaRadial[sector]).lerp(destino.set('#bbcb84'),bordeClaro);
          const tono=destino.set('#614758').lerp(verde,transicion).getHex();
          color=mezcla.set(color).lerp(destino.set(tono),THREE.MathUtils.smoothstep(z,fondo,inicioRadial+.2)).getHex();
          altura=.77+1.01*THREE.MathUtils.smoothstep(radial,.035,.17);
        }
        if(z>inicioTerraza||u<x-exterior){
          const alMuro=Math.min(u-LATERAL_C.oeste,finTerraza-z);
          const ritmo=(u-LATERAL_C.oeste)+(finTerraza-z)*CONFIG.escalaLongitudinalCampus;
          const linea=alMuro-.68-.19*Math.sin(ritmo*.93);
          const tono=Math.abs(linea)<.17?paletaOrla[2]:linea<0?paletaOrla[3]:
            mezcla.set(paletaOrla[0]).lerp(destino.set(paletaOrla[1]),.55+.35*Math.cos(ritmo*.78)).getHex();
          const mezclaMuro=z>inicioTerraza?1:THREE.MathUtils.smoothstep(x-exterior-u,0,.83);
          color=mezcla.set(color).lerp(destino.set(tono),mezclaMuro).getHex();
          altura=THREE.MathUtils.lerp(altura,1.12+.39*Math.cos(ritmo*.78),mezclaMuro);
        }
        plantas.push({x:u,y:nivel+.59,z,color,altura});
        const columna=Math.round((u-x)/.205);
        if(fila%3===0&&(columna+fila/3)%3===0&&dist>.65&&Math.abs(u-x)<exterior-.59&&
          z>boca+.58&&z<fondo-.58&&(Math.abs(u-xDrenaje)>.84||Math.abs(z-zDrenaje)>.82)){
          const tam=.58+.19*(1+Math.sin(columna+fila));
          matas.push([u,nivel+.59,z,tam]);
        }
      }
    }
  }
  plantarCobertura(jardin,plantas,2111,{dispersion:.095,variacionColor:.038});
  tinajaDeBarro(jardin,xTinaja,nivel+.585,zTinaja);
  const piedras=[];
  for(let fila=0,z=desdeCantos+.08;z<hastaCantos-.06;fila++,z+=.105){
    const ancho=anchoCantos(z);
    for(let k=-3;k<=3;k++){
      const dx=k*.109+(fila%2-.5)*.047+.024*Math.sin(fila*7+k);
      if(Math.abs(dx)<ancho-.025)piedras.push([ejeCantos(z)+dx,z+.029*Math.cos(k+fila)]);
    }
  }
  const cantos=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),
    new THREE.MeshStandardMaterial({roughness:.89}),piedras.length);
  const piedra=new THREE.Object3D(),gris=new THREE.Color();
  piedras.forEach(([u,z],i)=>{
    piedra.position.set(u,nivel+.603,z);piedra.rotation.y=i*2.4;
    piedra.scale.set(.071+.014*Math.sin(i*3),.043,.079);piedra.updateMatrix();
    cantos.setMatrixAt(i,piedra.matrix);cantos.setColorAt(i,gris.setScalar(.17+.095*Math.sin(i*1.43)));
  });
  cantos.name='Cantos rodados junto a la celosía';cantos.userData.sinColision=true;
  cantos.receiveShadow=true;jardin.add(cantos);
  for(const lado of [-1,1])for(const z of [boca+2.8,boca+7.1])
    matas.push([x+lado*(exterior-1.28),nivel+.59,z,1.55]);
  // Hojas altas contra la celosía y matas bajas donde la franja dobla hacia los asientos.
  for(let z=boca+.6;z<finTerraza-.4;z+=.46)
    matas.push([x+oeste+.54+.075*Math.sin(z*3),nivel+.59,z,1.06+.32*Math.sin(z*2)]);
  for(let u=oeste+1;u<esquina-.35;u+=.46){
    matas.push([x+u,nivel+.59,finTerraza-.56,.61+.18*Math.cos(u*1.6)]);
    if(u<exterior-.35)matas.push([x+u,nivel+.59,inicioTerraza+.54,.56+.14*Math.sin(u*2)]);
  }
  const respaldo=x+exterior-banco.fondo-.53;
  for(let z=banco.desde-.44;z<=banco.hasta+.48;z+=.32)matas.push([respaldo,nivel+.59,z,.68]);
  for(const z of [banco.desde-.51,banco.hasta+.51]){
    for(let u=respaldo+.3;u<x+exterior-.28;u+=.30)matas.push([u,nivel+.59,z,.6]);
  }
  agaves(jardin,matas);
  const bordura=[];
  // Pequeños grupos escalonados repiten el giro del muro sin invadir la coronación.
  for(let z=14.6;z<finTerraza-1.2;z+=.27){
    const fase=(finTerraza-z)*CONFIG.escalaLongitudinalCampus;
    if(Math.cos(fase*1.35)>.06)bordura.push([LATERAL_C.oeste+.85+.13*Math.sin(fase),z,.83]);
  }
  for(let u=LATERAL_C.oeste+.9;u<LATERAL_C.este-.35;u+=.28){
    const fase=u-LATERAL_C.oeste;
    if(Math.cos(fase*1.35)>.06)bordura.push([u,finTerraza-(.85+.13*Math.sin(fase))/escalaFondo,.83]);
  }
  plantarAsterisco(jardin,banco,bordura);
  const h=nivel+.59;
  plantarMatasDeEntrada(jardin,[
    [x+exterior-1.22,h,boca+2.35,1.07],[x+exterior-1.75,h,boca+3.01,.94],
    [x+exterior-1.34,h,fondo-1.8,1.18],[x+exterior-2.02,h,fondo-2.26,.91],
    [x-exterior+1.16,h,boca+4.55,1.04],[x-exterior+1.69,h,boca+5.10,.88],
    [LATERAL_C.oeste+.93,h,-5.7,1.21],[LATERAL_C.oeste+1.24,h,-5.1,.85],
    [LATERAL_C.oeste+.95,h,3.3,1.30],[LATERAL_C.oeste+1.17,h,3.92,.9],
    [x-4.7,h,finTerraza-.77,1.01],[x-4.19,h,finTerraza-.92,.76],
    [x+3.76,h,finTerraza-.77,1.01],[x+4.27,h,finTerraza-.92,.76]
  ]);

  const rejilla=new THREE.Group();rejilla.name='Sumidero de esquina';rejilla.userData.sinColision=true;
  rejilla.position.set(xDrenaje,nivel+.614,zDrenaje);jardin.add(rejilla);
  bloque(rejilla,{ancho:1.03,alto:.035,fondo:.97,color:'#252825'});
  for(let n=0;n<10;n++)bloque(rejilla,{z:(n-4.5)*.092,y:.025,ancho:.99,alto:.023,fondo:.035,color:'#676c64'});
}

function mesa(g,x,z){
  const m=new THREE.Group();m.name='Mesa del comedor con sillas azules';m.position.set(x,LATERAL_C.nivel,z);g.add(m);
  m.userData.conservarForma=true;
  bloque(m,{y:.78,ancho:2.8,alto:.085,fondo:1.15,color:'#d4d1bb'});
  for(const px of [-1.1,1.1])for(const pz of [-.42,.42])bloque(m,{x:px,y:.38,z:pz,ancho:.055,alto:.76,fondo:.055,color:'#323c40'});
  for(const lado of [-1,1])for(const px of [-.82,.82]){
    const silla=new THREE.Group();silla.name='Silla azul';silla.position.set(px,0,lado*1.04);m.add(silla);
    bloque(silla,{y:.45,ancho:.52,alto:.09,fondo:.52,color:'#124caa'});
    bloque(silla,{y:.79,z:lado*.24,ancho:.52,alto:.52,fondo:.07,color:'#1858b4'});
    for(const dx of [-.21,.21])for(const dz of [-.21,.21])bloque(silla,{x:dx,y:.22,z:dz,ancho:.035,alto:.44,fondo:.035,color:'#758184'});
  }
}

function toldo(g){
  const cover=new THREE.Group();cover.name='Lona tensada del comedor';g.add(cover);
  const geo=new THREE.PlaneGeometry(17,19,22,22);geo.rotateX(-Math.PI/2);
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
    const u=p.getX(i)/8.5,v=p.getZ(i)/9.5;
    p.setY(i,LATERAL_C.nivel+4.3+.75*u*v-.55*(1-u*u)*(1-v*v));
  }
  geo.computeVertexNormals();
  const cloth=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:'#ddd7be',side:THREE.DoubleSide,roughness:1}));
  cloth.position.set(-47.5,0,24);cloth.castShadow=true;cloth.receiveShadow=true;cloth.userData.sinColision=true;cover.add(cloth);
  // Paños de lona tensada con costuras que siguen la misma doble curvatura.
  for(const dz of [-5.8,0,5.8]){
    const v=dz/9.5;
    for(let j=0;j<12;j++){
      const point=k=>{const u=k/6-1;return [-47.5+8.5*u,LATERAL_C.nivel+4.28+.75*u*v-.55*(1-u*u)*(1-v*v),24+dz];};
      barra(cover,point(j),point(j+1),.014,'#bfb69e');
    }
  }
  for(const x of [-56,-39])for(const z of [14.5,33.5]){
    const y=LATERAL_C.nivel+4.3+.75*((x+47.5)/8.5)*((z-24)/9.5);
    barra(cover,[x,LATERAL_C.nivel,z],[x,y+.13,z],.07,'#b5b4a7');
  }
  // Dos toldos menores continúan la cubierta sobre las mesas de la primera fila.
  const zBorde=12.7;
  for(const [a,b] of [[-56,-47.5],[-47.5,-39]]){
    const yBorde=x=>LATERAL_C.nivel+4.3-.75*(x+47.5)/8.5;
    const vertice=new THREE.Vector3((a+b)/2,yBorde((a+b)/2)-.35,zBorde);
    const velaGeo=new THREE.BufferGeometry();
    velaGeo.setFromPoints([new THREE.Vector3(a,yBorde(a),14.5),new THREE.Vector3(b,yBorde(b),14.5),vertice]);
    velaGeo.computeVertexNormals();
    const vela=new THREE.Mesh(velaGeo,cloth.material);vela.name='Toldo triangular del comedor';vela.castShadow=true;vela.userData.sinColision=true;cover.add(vela);
    barra(cover,[vertice.x,LATERAL_C.nivel,vertice.z],vertice.toArray(),.042,'#a9aba1');
  }
  return cover;
}

export function crearLateralC(suelo,extras){
  const {oeste,este,norte,sur,nivel}=LATERAL_C;
  const pisoLateral=new THREE.Group();suelo.add(pisoLateral);
  pisoConHueco(pisoLateral,{x:(oeste+este)/2,z:(norte+sur)/2,y:(.08+nivel)/2,
    ancho:este-oeste,fondo:sur-norte,alto:nivel-.08,color:CONFIG.acabados.piso},HUECO_C);pisoLateral.name='Paseo continuo lateral de Torre C';
  const g=new THREE.Group();g.name='Lateral de Torre C · video 15 noviembre';extras.add(g);
  jardinPosterior(g);
  // Canaleta enrasada: deja el paso entre fachada y jardinera completamente libre.
  const xCanal=PARQUE_ASTERISCO.x+PARQUE_ASTERISCO.ancho/2+.13;
  const drenaje=bloque(g,{x:xCanal,z:-8.5,y:nivel+.005,ancho:.19,alto:.01,fondo:43,color:'#242b2b'});drenaje.userData.sinColision=true;
  for(let z=-30;z<13;z+=.25){const r=bloque(g,{x:xCanal,z,y:nivel+.014,ancho:.19,alto:.01,fondo:.025,color:'#687173'});r.userData.sinColision=true;}
  for(const x of [-51.8,-45.8])for(const z of [19.7,24.3,29])mesa(g,x,z);
  const cantero=new THREE.Group();cantero.name='Cantero al pie de la celosía del comedor posterior';g.add(cantero);
  // Balizas dentro del cantero y apoyos de comedor contra el fondo de la terraza.
  const difusor=new THREE.MeshStandardMaterial({color:'#f3e7c7',emissive:'#e5cd96',emissiveIntensity:.38});
  for(const z of [16.6,23.8,30.7]){
    bloque(cantero,{x:-57.00,y:nivel+.83,z,ancho:.13,alto:.58,fondo:.13,color:'#384745'}).name='Baliza de jardín';
    bloque(cantero,{x:-57.00,y:nivel+1.08,z,ancho:.14,alto:.10,fondo:.14,material:difusor});
    bloque(cantero,{x:-57.00,y:nivel+1.15,z,ancho:.18,alto:.04,fondo:.18,color:'#384745'});
  }
  const retorno=new THREE.Group();retorno.name='Estación exterior de devolución';retorno.position.set(-49.6,nivel,32.78);g.add(retorno);
  bloque(retorno,{y:.49,ancho:2.7,alto:.92,fondo:.67,color:'#516d64'});
  bloque(retorno,{y:.98,ancho:2.78,alto:.075,fondo:.72,color:'#cabfad'});
  for(const x of [-.82,0,.82]){
    bloque(retorno,{x,y:.62,z:-.347,ancho:.62,alto:.22,fondo:.03,color:'#31403e'});
    bloque(retorno,{x,y:.26,z:-.345,ancho:.73,alto:.35,fondo:.025,color:'#769084'});
  }
  // Jardinera estrecha adosada a la celosía clara y soporte fino entre las hojas.
  barra(cantero,[-57.16,nivel+.88,14.96],[-57.16,nivel+.88,33.05],.016,'#92998a');
  for(let z=15;z<33.1;z+=3)barra(cantero,[-57.16,nivel+.57,z],[-57.16,nivel+.89,z],.016,'#92998a');
  const cubierta=toldo(g);
  // Fachada de cafetería: paños de vidrio, vanos abiertos y perfilería metálica.
  mamparaComedor(g,'Fachada acristalada del comedor de Torre C',este,nivel,24,18,3.65,-1);
  bloque(g,{x:este-.25,z:1,y:nivel+4.08,ancho:.9,alto:.25,fondo:65,color:'#b9bcb7'}).name='Alero lateral Torre C';
  // Carros vacíos de bandejas, al borde de la fachada del comedor.
  for(const z of [16,32]){
    const rack=new THREE.Group();rack.name='Carro portabandejas';rack.position.set(-39.05,nivel,z);g.add(rack);
    for(const x of [-.25,.25])for(const dz of [-.42,.42])barra(rack,[x,.1,dz],[x,1.75,dz],.025);
    for(let h=.3;h<1.7;h+=.14)for(const x of [-.25,.25])barra(rack,[x,h,-.42],[x,h,.42],.015);
    for(const x of [-.25,.25])for(const dz of [-.42,.42])bloque(rack,{x,y:.08,z:dz,ancho:.1,alto:.16,fondo:.1,color:'#303538'});
  }
  g.userData.cubierta=cubierta;
  return g;
}
