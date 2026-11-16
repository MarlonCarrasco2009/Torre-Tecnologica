import * as THREE from 'three';

// Bebederos murales de acero: el frente local mira hacia +Z.
export function crearBebederos(padre){
  const acero=new THREE.MeshStandardMaterial({color:'#b9bebd',metalness:.72,roughness:.3});
  const cromo=new THREE.MeshStandardMaterial({color:'#e0e7e7',metalness:.85,roughness:.16});
  const oscuro=new THREE.MeshStandardMaterial({color:'#242a2c',roughness:.65});
  const soporte=new THREE.MeshStandardMaterial({color:'#33363b',roughness:.92});
  const aguaMaterial=new THREE.MeshBasicMaterial({color:'#9deaff',transparent:true,opacity:.78,depthWrite:false});
  const estados=[];
  function pieza(grupo,geometria,material,x=0,y=0,z=0){
    const mesh=new THREE.Mesh(geometria,material);mesh.position.set(x,y,z);
    mesh.castShadow=true;mesh.receiveShadow=true;grupo.add(mesh);return mesh;
  }
  function caja(g,x,y,z,w,h,d,material=acero){
    return pieza(g,new THREE.BoxGeometry(w,h,d),material,x,y,z);
  }
  const ubicaciones=[
    {nombre:'Bebedero del extremo del jardín',x:44.5,z:25.28,y:1.83,giro:0},
    {nombre:'Bebedero junto a la fachada de Torre A',x:41.72,z:-11,y:1.83,giro:-Math.PI/2},
    {nombre:'Bebedero del jardín junto al ingreso',x:74.45,z:5,y:1.1,giro:-Math.PI/2}
  ];
  for(const ubicacion of ubicaciones){
    const grupo=new THREE.Group();grupo.name=ubicacion.nombre;
    grupo.position.set(ubicacion.x,ubicacion.y,ubicacion.z);grupo.rotation.y=ubicacion.giro;
    padre.add(grupo);
    // Columna maciza desde el piso: penetra en el borde y alcanza el anclaje del aparato.
    caja(grupo,0,.825,-.5,1.1,1.65,.8,soporte)
      .name='Columna gruesa de soporte unida al borde del jardín';
    // Placa de anclaje y carcasa inferior inclinada, como el modelo de la foto.
    caja(grupo,0,.78,-.12,.72,.85,.12,oscuro);
    const perfil=new THREE.Shape();perfil.moveTo(-.14,.28);perfil.lineTo(.34,.28);
    perfil.lineTo(.55,.91);perfil.lineTo(-.14,.91);perfil.closePath();
    const carcasa=new THREE.ExtrudeGeometry(perfil,{depth:.8,bevelEnabled:true,
      bevelSize:.025,bevelThickness:.025,bevelSegments:3,steps:1});
    carcasa.rotateY(-Math.PI/2);carcasa.translate(.4,0,0);
    pieza(grupo,carcasa,acero);
    // Cubeta ovalada cóncava: superficie de revolución, con labio pulido.
    const puntos=[[0,1.005],[.07,1.005],[.18,1.018],[.3,1.055],[.4,1.12],
      [.45,1.16],[.48,1.16],[.49,1.13],[.49,.97],[.45,.94],[0,.94]];
    const cubeta=pieza(grupo,new THREE.LatheGeometry(puntos.map(([r,y])=>new THREE.Vector2(r,y)),64),acero,0,0,.3);
    cubeta.scale.set(1.22,1,.8);
    const borde=pieza(grupo,new THREE.TorusGeometry(.475,.018,10,64),cromo,0,1.16,.3);
    borde.rotation.x=-Math.PI/2;borde.scale.set(1.22,.8,1);
    const desague=pieza(grupo,new THREE.CylinderGeometry(.065,.065,.009,24),oscuro,0,1.012,.3);
    desague.name='Desagüe de la cubeta';
    for(let i=-2;i<=2;i++)caja(grupo,i*.021,1.019,.3,.007,.007,.09,cromo);
    // Rejillas laterales, pulsador frontal y boquilla cromada protegida.
    for(const lado of [-1,1]){
      caja(grupo,lado*.416,.7,.08,.008,.3,.3,oscuro);
      for(let i=0;i<8;i++)caja(grupo,lado*.425,.57+i*.037,.08,.016,.012,.3,cromo);
    }
    caja(grupo,0,1.025,.689,.44,.1,.025,oscuro);
    const boton=caja(grupo,0,1.025,.709,.39,.075,.025,cromo);boton.name='Pulsador del bebedero';
    const grifo=pieza(grupo,new THREE.SphereGeometry(.075,20,14),cromo,-.3,1.24,.36);
    grifo.scale.set(.9,1.55,.9);
    caja(grupo,-.3,1.17,.36,.12,.1,.12,cromo);
    const boquilla=pieza(grupo,new THREE.CylinderGeometry(.024,.032,.075,16),cromo,-.265,1.29,.36);
    boquilla.rotation.z=-Math.PI/3;
    const salida=pieza(grupo,new THREE.SphereGeometry(.018,12,8),oscuro,-.23,1.31,.36);
    salida.name='Salida de agua';
    // Arco de agua y gotas en movimiento. Se apagan solos al soltar el pulsador virtual.
    const trayectoria=t=>new THREE.Vector3(-.23+.33*t,1.31+.85*t-1.14*t*t,.36-.06*t);
    const curva=new THREE.CatmullRomCurve3(Array.from({length:33},(_,i)=>trayectoria(i/32)));
    const agua=new THREE.Group();agua.name='Chorro de agua animado';agua.visible=false;
    agua.userData.sinColision=true;grupo.add(agua);
    const chorro=pieza(agua,new THREE.TubeGeometry(curva,40,.012,8,false),aguaMaterial);
    chorro.castShadow=false;chorro.raycast=()=>{};
    const gotas=Array.from({length:12},()=>{
      const gota=pieza(agua,new THREE.SphereGeometry(.018,8,6),aguaMaterial);
      gota.castShadow=false;gota.raycast=()=>{};return gota;
    });
    const estado={grupo,agua,boton,gotas,trayectoria,restante:0,tiempo:0};
    grupo.userData.bebedero=estado;estados.push(estado);
  }
  return {
    activar(objeto){
      let actual=objeto;
      while(actual&&!actual.userData.bebedero)actual=actual.parent;
      if(!actual)return false;
      const estado=actual.userData.bebedero;
      estado.restante=4;estado.agua.visible=true;estado.boton.position.z=.698;
      return true;
    },
    actualizar(dt){
      for(const estado of estados){
        if(estado.restante<=0)continue;
        estado.restante=Math.max(0,estado.restante-dt);estado.tiempo+=dt;
        estado.agua.visible=estado.restante>0;
        if(!estado.agua.visible)estado.boton.position.z=.709;
        estado.gotas.forEach((gota,i)=>{
          const t=(estado.tiempo*1.5+i/estado.gotas.length)%1;
          gota.position.copy(estado.trayectoria(t));
          gota.scale.setScalar(.6+.4*Math.sin(t*Math.PI));
        });
      }
    }
  };
}
