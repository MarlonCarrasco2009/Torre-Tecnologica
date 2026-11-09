import * as THREE from 'three';

// Avatar articulado y estilizado inspirado en el uniforme de la referencia.
export function crearPersonaje(){
  const grupo=new THREE.Group(); grupo.name='Estudiante SENATI animado';
  const cuerpo=new THREE.Group(); grupo.add(cuerpo);
  const material=color=>new THREE.MeshStandardMaterial({color,roughness:.85});
  const piel=material('#b77d55'),polo=material('#063a74'),cuello=material('#082c53');
  const pantalon=material('#20252e'),zapato=material('#111820'),pelo=material('#151312');
  const blanco=material('#f6f8ff'),oscuro=material('#29201d');
  function pieza(padre,geometria,mat,x,y,z,sx=1,sy=1,sz=1){
    const m=new THREE.Mesh(geometria,mat); m.position.set(x,y,z);m.scale.set(sx,sy,sz);
    m.castShadow=true;m.receiveShadow=true;padre.add(m);return m;
  }
  const esfera=new THREE.SphereGeometry(1,20,14);
  const caja=new THREE.BoxGeometry(1,1,1);
  const ovalo=(padre,mat,x,y,z,sx,sy,sz)=>pieza(padre,esfera,mat,x,y,z,sx,sy,sz);
  const bloque=(padre,mat,x,y,z,sx,sy,sz)=>pieza(padre,caja,mat,x,y,z,sx,sy,sz);
  const pivote=(padre,x,y,z)=>{const g=new THREE.Group();g.position.set(x,y,z);padre.add(g);return g;};
  const torso=pivote(cuerpo,0,.94,0);
  pieza(torso,new THREE.CylinderGeometry(.265,.235,.56,16),polo,0,.32,0,1,1,.64);
  ovalo(torso,polo,0,.55,0,.28,.12,.16);
  bloque(cuerpo,pantalon,0,.91,0,.43,.18,.28);
  bloque(cuerpo,zapato,0,.99,0,.46,.055,.30);
  bloque(cuerpo,material('#929ca6'),0,.99,.16,.065,.05,.025);
  pieza(torso,new THREE.CylinderGeometry(.085,.09,.14,12),piel,0,.67,0);
  for(const lado of [-1,1]){
    const solapa=bloque(torso,cuello,lado*.075,.60,.135,.13,.12,.035);
    solapa.rotation.z=lado*.45;
  }
  bloque(torso,cuello,0,.46,.173,.035,.19,.014);
  for(const y of [.43,.50]) ovalo(torso,blanco,0,y,.186,.012,.012,.009);
  const insignia=document.createElement('canvas');insignia.width=256;insignia.height=128;
  const ctx=insignia.getContext('2d');
  ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.font='bold italic 65px Arial';ctx.fillText('S',128,64);
  ctx.font='bold 27px Arial';ctx.fillText('SENATI',128,103);
  const textura=new THREE.CanvasTexture(insignia);textura.colorSpace=THREE.SRGBColorSpace;
  pieza(torso,new THREE.PlaneGeometry(.16,.08),new THREE.MeshStandardMaterial({map:textura,transparent:true,depthWrite:false}),-.14,.43,.169);

  const cabeza=pivote(torso,0,.85,0);
  ovalo(cabeza,piel,0,0,0,.20,.245,.185);
  for(const lado of [-1,1]){
    ovalo(cabeza,piel,lado*.197,-.005,0,.04,.065,.035);
    ovalo(cabeza,blanco,lado*.075,.035,.163,.041,.025,.018);
    ovalo(cabeza,oscuro,lado*.075,.034,.179,.016,.019,.009);
    const ceja=bloque(cabeza,pelo,lado*.075,.085,.165,.085,.015,.018);ceja.rotation.z=lado*.08;
  }
  ovalo(cabeza,piel,0,-.015,.191,.035,.045,.032);
  const sonrisa=new THREE.CatmullRomCurve3([new THREE.Vector3(-.065,-.087,.159),new THREE.Vector3(0,-.103,.177),new THREE.Vector3(.065,-.087,.159)]);
  pieza(cabeza,new THREE.TubeGeometry(sonrisa,12,.008,6,false),oscuro,0,0,0);
  pieza(cabeza,new THREE.SphereGeometry(1,20,12,0,Math.PI*2,0,Math.PI*.53),pelo,0,.06,-.018,.212,.218,.193);
  const flequillo=ovalo(cabeza,pelo,-.045,.176,.09,.17,.075,.115);flequillo.rotation.z=.18;

  const brazos=[],piernas=[];
  for(const lado of [-1,1]){
    const hombro=pivote(torso,lado*.29,.54,0);hombro.rotation.z=lado*.08;
    pieza(hombro,new THREE.CapsuleGeometry(.095,.16,5,10),polo,0,-.10,0);
    const codo=pivote(hombro,0,-.26,0);
    pieza(codo,new THREE.CapsuleGeometry(.065,.18,5,10),piel,0,-.10,0);
    ovalo(codo,piel,0,-.245,0,.067,.083,.052);
    brazos.push({hombro,codo,lado});
    const cadera=pivote(cuerpo,lado*.125,.88,0);
    pieza(cadera,new THREE.CapsuleGeometry(.105,.23,5,10),pantalon,0,-.16,0);
    const rodilla=pivote(cadera,0,-.37,0);
    pieza(rodilla,new THREE.CapsuleGeometry(.085,.22,5,10),pantalon,0,-.145,0);
    ovalo(rodilla,zapato,0,-.39,.055,.105,.10,.18);
    piernas.push({cadera,rodilla});
  }
  let tiempo=0,fase=0,intensidad=0,saludo=0;
  return {grupo,
    saludar(){saludo=2.4;},
    reiniciar(){saludo=0;intensidad=0;fase=0;},
    animar(dt,velocidad){
      tiempo+=dt;saludo=Math.max(0,saludo-dt);
      const corriendo=velocidad>3.2;
      intensidad=THREE.MathUtils.damp(intensidad,velocidad>.05?1:0,12,dt);
      fase+=dt*(corriendo?12:8);
      cuerpo.position.y=Math.sin(fase*2)*.026*intensidad+Math.sin(tiempo*2)*.006*(1-intensidad);
      torso.rotation.x=corriendo?.08*intensidad:0;
      cabeza.rotation.y=Math.sin(tiempo*.8)*.035*(1-intensidad);
      piernas.forEach(({cadera,rodilla},i)=>{
        const paso=Math.sin(fase+i*Math.PI);
        cadera.rotation.x=paso*(corriendo?.8:.52)*intensidad;
        rodilla.rotation.x=Math.max(0,-paso)*(corriendo?1.05:.55)*intensidad;
      });
      brazos.forEach(({hombro,codo,lado},i)=>{
        hombro.rotation.x=-Math.sin(fase+i*Math.PI)*(corriendo?.75:.44)*intensidad;
        hombro.rotation.z=lado*(.10+Math.sin(tiempo*2)*.025*(1-intensidad));
        codo.rotation.x=-(corriendo?.85:.12)*intensidad;
        codo.rotation.z=0;
      });
      if(saludo>0){
        const mezcla=Math.min(1,saludo*4,(2.4-saludo)*5);
        brazos[0].hombro.rotation.z=THREE.MathUtils.lerp(brazos[0].hombro.rotation.z,-2.3,mezcla);
        brazos[0].codo.rotation.z=(.4+Math.sin(tiempo*15)*.3)*mezcla;
      }
      return saludo>0?'Saludando':velocidad>.05?(corriendo?'Corriendo':'Caminando'):'En reposo';
    }
  };
}
