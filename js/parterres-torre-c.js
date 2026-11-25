import * as T from 'three';
import {CONFIG} from './config.js';
import {ajustarZ} from './franja-campus.js';
import {plantarCobertura,tierraJardin} from './vegetacion.js';

// En las tomas del patio una franja de canto rodado separa el tapiz bajo
// de los macizos de hojas largas. Las distancias se miden en el patio terminado.
const piedra=new T.IcosahedronGeometry(1,1),tronco=new T.CylinderGeometry(.031,.052,1,8);
const mate=new T.MeshStandardMaterial({color:0xffffff,roughness:.9});
function follajeLargo(){
  const puntos=[],colores=[],base=new T.Color('#496747'),punta=new T.Color('#a1ae78');
  for(let k=0;k<24;k++){
    const a=k*2.4,l=.23+.17*(.5+.5*Math.sin(k*5.1)),h=.24+.30*(.5+.5*Math.cos(k*2.13));
    function vertice(t,lado){
      const r=.025+l*t*t,y=h*(1.75*t-1.05*t*t);
      const ancho=(.014+.011*Math.sin(k)**2)*(1-t);
      puntos.push(r*Math.cos(a)-lado*ancho*Math.sin(a),y,r*Math.sin(a)+lado*ancho*Math.cos(a));
      colores.push(...base.clone().lerp(punta,t*.8).toArray());
    }
    for(let j=0;j<4;j++){
      const a=j/4,b=(j+1)/4;
      for(const [t,d] of [[a,-1],[b,-1],[a,1],[a,1],[b,-1],[b,1]])vertice(t,d);
    }
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(puntos,3));
  geo.setAttribute('color',new T.Float32BufferAttribute(colores,3));geo.computeVertexNormals();return geo;
}
const hojas=follajeLargo(),verde=new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.89});
function instancias(g,nombre,geo,material,datos){
  if(!datos.length)return;
  const m=new T.InstancedMesh(geo,material,datos.length),obj=new T.Object3D(),tono=new T.Color();
  datos.forEach(([x,y,z,sx,sy,sz,giro,color],i)=>{
    obj.position.set(x,y,z);obj.scale.set(sx,sy,sz);obj.rotation.y=giro;obj.updateMatrix();m.setMatrixAt(i,obj.matrix);
    if(color)m.setColorAt(i,tono.set(color));
  });
  m.name=nombre;m.receiveShadow=true;m.castShadow=true;g.add(m);
}
export function plantarPatioC(superficie,x,z,ancho,fondo,semilla){
  superficie.material=tierraJardin();
  const geo=superficie.geometry,uv=geo.attributes.uv,pos=geo.attributes.position;
  for(let i=0;i<uv.count;i++)uv.setXY(i,pos.getX(i)/1.25,pos.getZ(i)/1.25);
  const inicio=z-fondo/2,escala=CONFIG.escalaLongitudinalCampus;
  const largo=(ajustarZ(inicio+fondo,x)-ajustarZ(inicio,x))*escala;
  const g=new T.Group();g.name='Plantación del patio de Torre C';g.position.set(x,superficie.position.y+.012,inicio);
  g.scale.z=1/escala;g.userData={conservarForma:true,sinColision:true};superficie.parent.add(g);
  const azar=()=>((semilla=Math.imul(semilla,1664525)+1013904223>>>0)/4294967296);
  const medio=ancho/2,fase=(Math.abs(z)*1.79)%(2*Math.PI);
  const eje=t=>ancho*(.26*(t-.5)*Math.cos(fase)+.13*Math.sin(fase+t*2.8));
  const rocas=[],cesped=[],matas=[],ramas=[],copas=[],brotes=[],cauce=[];
  const gris=['#77797a','#9b9b96','#595f63','#8c8a85','#53575c'];
  const guinda=['#785966','#85616c','#674e59'];
  for(let v=.07;v<largo-.05;v+=.095){
    const centro=eje(v/largo);
    for(let i=-2;i<=2;i++){
      const s=.048+.029*azar();
      rocas.push([centro+i*.099+(azar()-.5)*.046,.028+azar()*.02,v,s*1.19,s*.75,s,azar()*6.28,gris[Math.floor(azar()*5)]]);
    }
  }
  for(let i=0;i<=32;i++){
    const v=i*largo/32,centro=eje(i/32);
    cauce.push(centro-.246,.008,v,centro+.246,.008,v);
  }
  const grava=new T.BufferGeometry(),indices=[];
  for(let i=0;i<64;i+=2)indices.push(i,i+2,i+1,i+1,i+2,i+3);
  grava.setAttribute('position',new T.Float32BufferAttribute(cauce,3));grava.setIndex(indices);grava.computeVertexNormals();
  const lecho=new T.Mesh(grava,new T.MeshStandardMaterial({color:'#514e50',roughness:1}));lecho.name='Lecho de grava';g.add(lecho);
  for(let fila=0,v=.17;v<largo-.14;v+=.215,fila++)for(let u=-medio+.19+(fila%2)*.085;u<medio-.13;u+=.215){
    const distancia=u-eje(v/largo);
    if(Math.abs(distancia)<.34)continue;
    const banda=.41*Math.sin(v*.65+fase)+medio*(.39+.12*Math.cos(fase));
    if(u< -medio*.52+.30*Math.cos(v*.8+fase)){
      if(fila%2===0&&azar()<.47&&u>-.5*ancho+.32&&v>.34&&v<largo-.34){
        const s=.71+.36*azar();matas.push([u,0,v,s,s*1.28,s,azar()*6.28]);
      }
      continue;
    }
    const color=Math.abs(u-banda)<.21?guinda[Math.floor(azar()*3)]:distancia<0?'#9daa83':
      (v/largo+.10*Math.sin(u*2)>.61?'#81a051':'#679345');
    cesped.push({x:u,y:.006,z:v,color,altura:.72+azar()*.46});
  }
  if(largo>2.7){
    const u=-medio+.81,v=largo*(.47+.20*Math.sin(fase));
    for(let i=0;i<(largo>7?3:2);i++){
      const dx=i*.17-.15,dz=(i-1)*.32,h=.46+azar()*.41;
      ramas.push([u+dx,h/2,v+dz,1,h,1,0,'#665e4e']);
      for(let j=0;j<14;j++){
        const a=j*2.4,r=.2*Math.sqrt(j/14),s=.13+azar()*.10;
        const px=u+dx+Math.cos(a)*r,py=h+.12+.13*Math.sin(j*3),pz=v+dz+Math.sin(a)*r;
        copas.push([px,py,pz,s*.92,s*1.18,s*.92,azar()*5,
          ['#284c34','#385e3e','#476c47','#53784e'][j%4]]);
        for(let k=0;k<9;k++){
          const ang=k*2.4,elev=.1+azar()*.86;
          brotes.push({x:px+Math.cos(ang)*s*Math.sqrt(1-elev*elev),y:py+s*elev,z:pz+Math.sin(ang)*s*Math.sqrt(1-elev*elev),
            color:['#365e36','#427044','#597f47'][k%3],altura:1});
        }
      }
    }
    if(largo>4)rocas.push([medio-.78,.17,largo*.71,.26,.26,.26,0,'#777772']);
    const baliza=new T.Group();baliza.name='Baliza de jardín';baliza.position.set(eje(.24)-.42,0,largo*.24);g.add(baliza);
    for(const [y,r,h,color] of [[.18,.055,.36,'#343939'],[.383,.056,.059,'#e6dfca'],[.427,.062,.028,'#393e3d']]){
      const m=new T.Mesh(new T.CylinderGeometry(r,r,h,12),new T.MeshStandardMaterial({color}));m.position.y=y;baliza.add(m);
    }
  }
  plantarCobertura(g,cesped,semilla,{dispersion:.035,variacionColor:.042});
  instancias(g,'Cantos grises del patio',piedra,mate,rocas);
  instancias(g,'Macizos de hojas arqueadas',hojas,verde,matas);
  instancias(g,'Tallos leñosos',tronco,mate,ramas);
  instancias(g,'Copas verdes compactas',piedra,mate,copas);
  if(brotes.length)plantarCobertura(g,brotes,semilla+207,{escala:.4,dispersion:.018,variacionColor:.035});
}
