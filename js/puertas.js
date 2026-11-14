// Las hojas giran sobre su bisagra hacia el patio (+Z local de la fachada).
export function crearPuertasFachada(escena){
  const puertas=[];
  escena.traverse(o=>{if(o.userData.puertaInteractiva)puertas.push(o);});
  return {
    alternar(objeto){
      let puerta=objeto;
      while(puerta&&!puerta.userData.puertaInteractiva)puerta=puerta.parent;
      if(!puerta)return false;
      puerta.userData.abierta=!puerta.userData.abierta;
      return true;
    },
    actualizar(dt){
      for(const puerta of puertas){
        const destino=puerta.userData.abierta?puerta.userData.anguloAbierto:0;
        const diferencia=destino-puerta.rotation.y;
        puerta.rotation.y+=Math.sign(diferencia)*Math.min(Math.abs(diferencia),dt*Math.PI);
        puerta.updateWorldMatrix(true,true);
      }
    }
  };
}
