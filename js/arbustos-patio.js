import * as THREE from 'three';
import {plantarCobertura,tierraJardin} from './vegetacion.js?v=jardin-265';

// Los motivos se leen desde el pasillo exterior: izquierda (+Z) a derecha (-Z).
export function crearDisenosArbustos(patio,escalaZ){
  const jardin=patio.getObjectByName('Jardín central trapezoidal');
  const suelo=jardin.getObjectByName('Jardín con base de contención');
  suelo.geometry.computeBoundingBox();
  const nivel=suelo.position.y+suelo.geometry.boundingBox.max.y;
  // Eje paralelo al borde del pasillo señalado: mismo ángulo y separación
  // para los centros, las bases y el follaje de los tres motivos.
  const pendiente=(68-63.9)/39;
  const giro=Math.atan(pendiente);
  const separacionEjeMuro=3.55;
  const zonas=[
    {id:1,z:20.6,ancho:5,fondo:5,retiroAdicional:.8,circular:true,conservarForma:true,nombre:'Emblema circular de arbustos'},
    {id:2,z:5.75,ancho:5.4,fondo:3.8,nombre:'Bandera peruana de arbustos'},
    {id:3,z:-3.3,ancho:6.1,fondo:2.55,nombre:'SENATI en arbustos claros'}
  ].map(zona=>({...zona,ancho:zona.ancho/escalaZ,x:63.9+(zona.z+14)*pendiente-separacionEjeMuro-(zona.retiroAdicional??0),
    giro:zona.circular?0:giro}));
  // Reserva estas huellas para que la cobertura verde no tape los dibujos.
  suelo.userData.zonasArbustos=zonas;
  for(const zona of zonas){
    const grupo=new THREE.Group();grupo.name=zona.nombre;jardin.add(grupo);
    grupo.position.set(zona.x,0,zona.z);grupo.rotation.y=zona.giro;
    grupo.userData.sinColision=true;
    grupo.userData.conservarForma=zona.conservarForma;
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#000000';ctx.fillRect(0,0,1024,512);
    ctx.fillStyle='#ffffff';
    if(zona.id===1){
      // Silueta poligonal trazada de la referencia SENATI del usuario.
      // Mantiene las diagonales de 60 grados y los canales abiertos del símbolo.
      const simbolo=[
        [1322,33],[2517,33],[2763,463],[1506,463],[1257,896],
        [1507,1332],[2120,1332],[2161,1262],[2113,1176],
        [1597,1176],[1435,896],[1597,619],[2850,619],[3115,1080],
        [2517,2127],[1322,2127],[1076,1697],[2334,1697],
        [2582,1262],[2332,828],[1718,828],[1678,896],[1728,984],
        [2244,984],[2405,1262],[2243,1542],[990,1542],[724,1080]
      ];
      ctx.save();ctx.scale(2,1);
      ctx.translate(256,256);ctx.scale(.17,.17);ctx.translate(-1919.5,-1080);
      ctx.beginPath();
      simbolo.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
      ctx.closePath();ctx.fill();
      ctx.restore();
    }else if(zona.id===2){
      ctx.fillRect(1024/3,0,1024/3,512);
    }else{
      ctx.font='900 330px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('SENATI',512,268,925);
    }
    const pixeles=ctx.getImageData(0,0,1024,512).data;
    const forma=new THREE.Shape();
    if(zona.circular){
      forma.absellipse(0,0,zona.fondo/2,zona.ancho/2,0,Math.PI*2,false);
    }else{
      forma.moveTo(-zona.fondo/2,-zona.ancho/2);forma.lineTo(zona.fondo/2,-zona.ancho/2);
      forma.lineTo(zona.fondo/2,zona.ancho/2);forma.lineTo(-zona.fondo/2,zona.ancho/2);forma.closePath();
    }
    const geo=new THREE.ExtrudeGeometry(forma,{depth:.13,bevelEnabled:false,curveSegments:64});geo.rotateX(-Math.PI/2);
    const tierra=new THREE.Mesh(geo,tierraJardin());tierra.position.set(0,nivel+.01,0);
    tierra.receiveShadow=true;grupo.add(tierra);
    const puntos=[];
    // Malla densa de plantas pequeñas: permite leer las letras sin usar un cartel plano.
    const paso=zona.id===1?.065:.085;
    for(let u=.065;u<zona.ancho-.04;u+=paso)for(let v=.065;v<zona.fondo-.04;v+=paso){
      const nx=2*u/zona.ancho-1,ny=2*v/zona.fondo-1;
      if(zona.circular&&nx*nx+ny*ny>.95)continue;
      const px=Math.min(1023,Math.floor(u/zona.ancho*1024));
      const py=Math.min(511,Math.floor(v/zona.fondo*512));
      const claro=pixeles[(py*1024+px)*4]>128;
      // El seto granate sobresale sobre el tapiz verde plateado de la foto.
      const emblema=zona.id===1;
      puntos.push({x:v-zona.fondo/2,y:nivel+.15+(emblema&&!claro?.07:0),z:zona.ancho/2-u,
        color:claro?(emblema?'#b7c6a5':'#c4d0b2'):(emblema?'#8a3447':'#713044')});
    }
    if(zona.circular){
      // Cierra el perímetro entre el tapiz interior y el canto de la jardinera.
      const radio=zona.fondo/2-paso/2;
      const cantidad=Math.ceil(2*Math.PI*radio/paso);
      for(let i=0;i<cantidad;i++){
        const angulo=2*Math.PI*i/cantidad;
        puntos.push({x:radio*Math.cos(angulo),y:nivel+.22,
          z:radio*Math.sin(angulo)/escalaZ,color:'#8a3447'});
      }
    }
    const plantas=plantarCobertura(grupo,puntos,212+zona.id,
      {escala:zona.id===1?.4:.5,dispersion:.012,variacionColor:.025});
    plantas.name=zona.nombre+' · follaje';
  }
}
