import * as THREE from 'three';
import {plantarCobertura,tierraJardin} from './vegetacion.js?v=arbustos-213';

// Los motivos se leen desde el pasillo exterior: izquierda (+Z) a derecha (-Z).
export function crearDisenosArbustos(patio){
  const jardin=patio.getObjectByName('Jardín central trapezoidal');
  const suelo=jardin.getObjectByName('Jardín con base de contención');
  suelo.geometry.computeBoundingBox();
  const nivel=suelo.position.y+suelo.geometry.boundingBox.max.y;
  const zonas=[
    {id:1,z:18,ancho:6,fondo:6,circular:true,nombre:'Emblema circular de arbustos'},
    {id:2,z:5.5,ancho:8,fondo:4.6,nombre:'Bandera peruana de arbustos'},
    {id:3,z:-6.5,ancho:9.3,fondo:3.6,nombre:'SENATI en arbustos claros'}
  ].map(zona=>{
    const t=(zona.z+14)/39;
    // Eje central del trapecio: conserva césped visible a ambos lados de cada motivo.
    return {...zona,x:(THREE.MathUtils.lerp(56.3,53.5,t)+THREE.MathUtils.lerp(63.9,68,t))/2};
  });
  // Reserva estas huellas para que la cobertura verde no tape los dibujos.
  suelo.userData.zonasArbustos=zonas;
  for(const zona of zonas){
    const grupo=new THREE.Group();grupo.name=zona.nombre;jardin.add(grupo);
    grupo.userData.sinColision=true;
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#000000';ctx.fillRect(0,0,1024,512);
    ctx.fillStyle='#ffffff';
    if(zona.id===1){
      // Emblema circular proporcionado, con anillo y S de trazos nítidos.
      ctx.save();ctx.scale(2,1);ctx.strokeStyle='#ffffff';ctx.lineWidth=24;
      ctx.beginPath();ctx.arc(256,256,194,0,Math.PI*2);ctx.stroke();
      ctx.lineWidth=63;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(337,166);
      ctx.bezierCurveTo(218,96,130,213,256,256);
      ctx.bezierCurveTo(382,299,294,416,175,346);ctx.stroke();ctx.restore();
    }else if(zona.id===2){
      ctx.fillRect(1024/3,0,1024/3,512);
    }else{
      ctx.font='900 245px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('SENATI',512,273,880);
    }
    const pixeles=ctx.getImageData(0,0,1024,512).data;
    const forma=new THREE.Shape();
    if(zona.circular){
      forma.absellipse(0,0,zona.fondo/2,zona.ancho/2,0,Math.PI*2,false);
    }else{
      forma.moveTo(-zona.fondo/2,-zona.ancho/2);forma.lineTo(zona.fondo/2,-zona.ancho/2);
      forma.lineTo(zona.fondo/2,zona.ancho/2);forma.lineTo(-zona.fondo/2,zona.ancho/2);forma.closePath();
    }
    const geo=new THREE.ExtrudeGeometry(forma,{depth:.13,bevelEnabled:false});geo.rotateX(-Math.PI/2);
    const tierra=new THREE.Mesh(geo,tierraJardin());tierra.position.set(zona.x,nivel+.01,zona.z);
    tierra.receiveShadow=true;grupo.add(tierra);
    const puntos=[];
    // Malla densa de plantas pequeñas: permite leer las letras sin usar un cartel plano.
    for(let u=.065;u<zona.ancho-.04;u+=.085)for(let v=.065;v<zona.fondo-.04;v+=.085){
      const nx=2*u/zona.ancho-1,ny=2*v/zona.fondo-1;
      if(zona.circular&&nx*nx+ny*ny>.95)continue;
      const px=Math.min(1023,Math.floor(u/zona.ancho*1024));
      const py=Math.min(511,Math.floor(v/zona.fondo*512));
      const claro=pixeles[(py*1024+px)*4]>128;
      puntos.push({x:zona.x+v-zona.fondo/2,y:nivel+.15,z:zona.z+zona.ancho/2-u,
        color:claro?'#c4d0b2':'#713044'});
    }
    const plantas=plantarCobertura(grupo,puntos,212+zona.id,
      {escala:.5,dispersion:.012,variacionColor:.025});
    plantas.name=zona.nombre+' · follaje';
  }
}
