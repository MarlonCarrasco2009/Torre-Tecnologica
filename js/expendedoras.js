import * as THREE from 'three';
import {CONFIG} from './config.js';

// El eje X decrece de izquierda a derecha al mirar desde el pasillo hacia el muro.
const maquinas=[
  {id:'snack',nombre:'Snack Vital',x:.985,ancho:1.77,alto:2.72,fondo:1.32,color:'#40464a',cartel:true},
  {id:'cocacola',nombre:'Coca-Cola',x:-.89,ancho:1.6,alto:2.78,fondo:1.36,color:'#242428'},
  {id:'soda',nombre:'Soda San Jorge',x:-2.65,ancho:1.54,alto:2.71,fondo:1.32,color:'#983d32',cartel:true,costado:true},
  {id:'cafetal',nombre:'Cafetal Gourmet',x:-4.2,ancho:1.18,alto:2.72,fondo:1.22,color:'#373735',costado:true}
];

export function crearExpendedoras(padre){
  const cargador=new THREE.TextureLoader();
  const base=new THREE.MeshStandardMaterial({color:'#27292a',roughness:.8});
  function acabadoFoto(id){
    const url=new URL(`../assets/expendedoras/${id}.jpg`,import.meta.url);
    const mapa=cargador.load(url.href);
    mapa.colorSpace=THREE.SRGBColorSpace;
    mapa.anisotropy=4;
    return new THREE.MeshStandardMaterial({map:mapa,roughness:.7});
  }
  function caja(grupo,ancho,alto,fondo,y,z,material){
    const pieza=new THREE.Mesh(new THREE.BoxGeometry(ancho,alto,fondo),material);
    pieza.position.set(0,y,z);
    pieza.castShadow=true;pieza.receiveShadow=true;grupo.add(pieza);
  }
  for(const maquina of maquinas){
    const {id,nombre,x,ancho,alto,fondo,color}=maquina;
    const grupo=new THREE.Group();
    grupo.name=`Expendedora · ${nombre}`;
    grupo.rotation.y=Math.PI;
    const profundidad=fondo/CONFIG.escalaLongitudinalCampus;
    grupo.position.set(CONFIG.torres.B.x+x,CONFIG.baseY+.01,CONFIG.fondoCampus/2-.42-profundidad/2);
    grupo.userData.conservarForma=true;
    padre.add(grupo);

    const carcasa=new THREE.MeshStandardMaterial({color,roughness:.63,metalness:.13});
    const costado=maquina.costado?acabadoFoto(id+'-costado'):carcasa;
    const frente=acabadoFoto(id);
    const pie=.12;
    caja(grupo,ancho-.12,pie,profundidad-.14,pie/2,0,base);
    caja(grupo,ancho,alto,profundidad,pie+alto/2,0,
      [carcasa,costado,carcasa,base,frente,carcasa]);
    if(maquina.cartel){
      const altoCartel=.39,anchoCartel=ancho*.69;
      caja(grupo,anchoCartel,altoCartel,.065,pie+alto+altoCartel/2,profundidad/2-.14,
        [base,base,base,base,acabadoFoto(id+'-cartel'),base]);
    }
  }
}
