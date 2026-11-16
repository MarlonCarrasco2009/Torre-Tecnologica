// Cada hoja define el signo de giro según su bisagra para abrir hacia dentro.
export function crearPuertasFachada(escena){
  const puertas=[];
  escena.traverse(o=>{if(o.userData.puertaInteractiva)puertas.push(o);});
  return {
    alternar(objeto){
      let puerta=objeto;
      while(puerta&&!puerta.userData.puertaInteractiva)puerta=puerta.parent;
      if(!puerta)return false;
      const abierta=!puerta.userData.abierta;
      const grupo=puerta.userData.grupoPuertas;
      for(const hoja of puertas){
        if(hoja===puerta||(grupo&&hoja.userData.grupoPuertas===grupo))hoja.userData.abierta=abierta;
      }
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
