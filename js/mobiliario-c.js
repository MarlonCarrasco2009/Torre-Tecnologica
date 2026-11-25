// Interiores propuestos para las zonas que el recorrido muestra solo en parte.
// Los módulos se colocan en el sistema local de cada recinto, a nivel del piso.
import * as T from 'three';

const inox='#abbbb9', madera='#a57c58', salvia='#526e65', piedra='#d3cfc1', negro='#343e40', loza='#eeeae1';
export function mobiliarioC({grupo,caja,disco,letrero,baldosas}){
  function mueble(g,x,z,ancho,fondo,tono=inox){
    const m=grupo(g,'Mueble bajo',x,0,z);
    caja(m,'Zócalo retranqueado',0,.075,0,ancho-.14,.15,fondo-.12,negro);
    caja(m,'Cuerpo',0,.49,0,ancho,.72,fondo,tono);
    caja(m,'Encimera',0,.9,0,ancho+.045,.09,fondo+.06,piedra);
    const modulos=Math.ceil(ancho/1.1),paso=ancho/modulos;
    for(let i=0;i<modulos;i++){
      const cx=(i+.5)*paso-ancho/2;
      caja(m,'Frente de gabinete',cx,.5,fondo/2+.014,paso-.026,.66,.027,tono);
      caja(m,'Tirador',cx,.73,fondo/2+.052,.24,.025,.042,negro);
    }
    return m;
  }
  function platos(g,x,y,z,cantidad){
    for(let i=0;i<cantidad;i++)disco(g,'Plato apilado',x,y+i*.026,z,.175,.021,loza);
  }
  function balda(g,x,z,ancho,alto=1.95){
    const est=grupo(g,'Estantería de provisiones',x,0,z);
    for(const dx of [-1,1])for(const dz of [-1,1])caja(est,'Montante',dx*(ancho/2-.035),alto/2,dz*.31,.045,alto,.045,negro);
    for(const y of [.22,.78,1.34,1.88]){
      caja(est,'Balda plegada',0,y,0,ancho,.05,.67,inox);
      if(y<1.6)for(let j=0;j<3;j++){
        const px=(j-1)*ancho*.29;
        caja(est,'Contenedor',px,y+.17,0,ancho*.24,.28,.43,['#d3c1a6','#9caead','#bdbaab'][j]);
        caja(est,'Tapa',px,y+.32,0,ancho*.24+.02,.035,.46,loza);
      }
    }
  }
  function refrigerador(g,x,z){
    const r=grupo(g,'Armario frigorífico',x,0,z);
    caja(r,'Armario aislado',0,1.1,0,1.42,2.18,.94,inox);
    for(const d of [-1,1]){
      caja(r,'Hoja',d*.35,1.06,.49,.68,1.82,.058,'#bdc9c6');
      caja(r,'Tirador vertical',d*.08,1.11,.55,.032,.62,.044,negro);
    }
    caja(r,'Panel de temperatura',.4,2.06,.49,.22,.085,.03,negro);
    caja(r,'Indicador',.4,2.06,.509,.11,.027,.01,'#93cdb0');
    for(let i=0;i<7;i++)caja(r,'Rejilla inferior',-.53+i*.17,.115,.5,.10,.038,.012,negro);
    return r;
  }
  function luz(g,x,y,z,largo){
    caja(g,'Carcasa de luminaria',x,y,z,largo,.07,.15,negro);
    caja(g,'Difusor opal',x,y-.048,z,largo-.055,.03,.115,'#fff1d3');
  }
  function cocina(c,techo){
    // Cara sanitaria interior independiente del revestimiento gris de la fachada.
    for(const [a,b] of [[-7.135,4.65],[7,11.895]]){
      caja(c,'Paramento lavable de cocina',8.49,1.96,(a+b)/2,.075,3.92,b-a,'#dfdfd5');
      caja(c,'Zócalo sanitario',8.43,.12,(a+b)/2,.065,.24,b-a,'#8d9e93');
    }
    const linea=grupo(c,'Cocción y hornos',7.65,0,.35);linea.rotation.y=-Math.PI/2;
    caja(linea,'Respaldo cerámico verde',0,1.55,-.62,7.8,2.95,.13,salvia);
    const fogon=mueble(linea,-.15,0,4.8,.96);
    caja(fogon,'Placa de cocción',0,.969,0,4.56,.045,.87,negro);
    for(const x of [-1.55,-.53,.49,1.51])for(const z of [-.21,.21]){
      disco(fogon,'Aro de fundición',x,1.01,z,.17,.045,'#576162');
      disco(fogon,'Quemador',x,1.037,z,.091,.026,negro);
    }
    for(const x of [-1.55,.51]){
      disco(fogon,'Cacerola',x,1.18,-.21,.19,.27,inox);
      for(const d of [-1,1])caja(fogon,'Asa',x+d*.223,1.24,-.21,.083,.032,.065,negro);
    }
    const campana=grupo(linea,'Campana extractora',-.15,0,0);
    caja(campana,'Visera de extracción',0,2.28,.04,5.12,.22,1.24,inox);
    caja(campana,'Plénum',0,2.5,-.11,4.74,.23,.78,inox);
    caja(campana,'Conducto de extracción',0,3.25,-.15,.84,1.31,.64,'#96a7a5');
    for(let i=0;i<23;i++)caja(campana,'Lama de filtro',-2.32+i*.21,2.157,-.07,.07,.033,.75,'#64716f');
    for(const x of [-3.22,3.0]){
      const horno=grupo(linea,'Horno de convección',x,0,0);
      caja(horno,'Módulo térmico',0,.91,0,1.17,1.80,.98,inox);
      for(const y of [.55,1.29]){
        caja(horno,'Marco de horno',-.09,y,.509,.85,.59,.05,'#768382');
        caja(horno,'Cristal oscuro',-.09,y,.545,.7,.42,.028,'#35474b');
        caja(horno,'Tirador',-.09,y+.245,.60,.68,.032,.053,negro);
        disco(horno,'Selector',.46,y,.535,.063,.05,negro).rotation.x=Math.PI/2;
      }
    }
    for(const x of [-7.55,-5.95])refrigerador(c,x,-6.47);
    balda(c,.30,-6.45,2.38);
    const despensa=grupo(c,'Despensa entre cocina y servicios',1.41,0,-8.44);
    baldosas(despensa,'Gres de despensa',0,0,5.94,2.46,'#b7afa2','#969185',.49);
    balda(despensa,-1.35,-.88,2.48);balda(despensa,1.42,-.88,2.44);
    const carroSecos=grupo(despensa,'Contenedores de secos',-2.40,0,.37);
    for(const z of [-.33,.35]){
      caja(carroSecos,'Depósito alimentario',0,.49,z,.67,.76,.59,'#adb6a7');
      caja(carroSecos,'Tapa abatible',0,.891,z,.70,.06,.62,'#748c80');
      caja(carroSecos,'Portaetiqueta',.345,.60,z,.012,.093,.19,'#e5dfcf');
    }
    const isla=mueble(c,-1.65,.95,5.6,1.52,salvia);
    caja(isla,'Tabla de corte',-1.6,.967,0,.76,.045,.43,madera);
    const fruta=new T.SphereGeometry(1,12,9);
    for(let i=0;i<7;i++){
      const pieza=new T.Mesh(fruta,new T.MeshStandardMaterial({color:i<4?'#ad4f35':'#919b4b',roughness:.55}));
      pieza.position.set(-1.83+(i%4)*.14,1.062,Math.floor(i/4)*.13-.07);
      pieza.scale.set(.076,.067,.07);isla.add(pieza);
    }
    for(const dx of [-.45,.19,.83]){
      caja(isla,'Cubeta gastronorm',dx,.973,-.17,.5,.052,.55,inox);
      caja(isla,'Interior de cubeta',dx,1.001,-.17,.43,.014,.48,'#758681');
    }
    platos(isla,2.12,.957,.16,5);
    const puente=grupo(isla,'Puente de utensilios',.55,0,-.56);
    for(const x of [-1.61,1.61])caja(puente,'Soporte tubular',x,1.34,0,.038,.80,.038,inox);
    caja(puente,'Estante de apoyo',0,1.73,0,3.31,.055,.35,inox);
    for(const [i,color] of ['#a96a3b','#e0be78','#8f966e','#c99566'].entries()){
      const x=-1.18+i*.28;
      disco(puente,'Tarro de condimentos',x,1.88,0,.098,.235,color);
      disco(puente,'Tapa del tarro',x,2.013,0,.102,.039,negro);
    }
    platos(puente,.84,1.772,0,4);
    const lavado=grupo(c,'Lavado de vajilla y escurrido',-7.45,0,-.46);
    lavado.rotation.y=Math.PI/2;
    const tren=mueble(lavado,-.46,0,3.42,.93,inox);
    for(const dx of [-.91,.05]){
      caja(tren,'Reborde de fregadero',dx,.956,0,.84,.032,.70,'#bfcac7');
      caja(tren,'Fondo de fregadero',dx,.975,0,.71,.012,.54,'#617773');
      disco(tren,'Desagüe',dx,.982,.03,.05,.008,negro);
    }
    disco(tren,'Cuello de grifería',-.43,1.23,-.33,.025,.56,inox);
    caja(tren,'Caño de ducha',-.43,1.50,-.15,.049,.047,.40,inox);
    for(let i=0;i<9;i++)caja(tren,'Canal de escurrido',.62+i*.10,.959,0,.028,.021,.61,inox);
    const maquina=grupo(lavado,'Lavavajillas industrial',2.01,0,0);
    caja(maquina,'Base de lavado',0,.45,0,1.20,.84,.93,'#809692');
    caja(maquina,'Capota de acero',0,1.27,0,1.23,.73,.99,inox);
    caja(maquina,'Tirador frontal',0,1.18,.53,.96,.047,.054,negro);
    caja(maquina,'Piloto',.41,1.49,.50,.12,.05,.018,'#609479');
    const carro=grupo(c,'Carro de cubetas de preparación',3.28,0,-1.28);
    for(const dx of [-.64,.64])for(const dz of [-.37,.37]){
      disco(carro,'Rueda de goma',dx,.105,dz,.081,.085,negro).rotation.x=Math.PI/2;
      disco(carro,'Montante de acero',dx,.54,dz,.029,.86,inox);
    }
    for(const y of [.25,.93])caja(carro,'Mesa de carro',0,y,0,1.46,.058,.89,inox);
    for(const dx of [-.35,.34]){
      caja(carro,'Cubeta con tapa',dx,1.048,0,.59,.17,.55,'#b7c5c0');
      caja(carro,'Asa de tapa',dx,1.15,0,.18,.037,.05,negro);
    }
    for(const x of [-3.55,-2.0,-.45]){
      caja(c,'Panel de azulejo',x,1.63,-7.037,1.53,1.51,.025,'#b6c6be');
      luz(c,x,2.47,-6.87,1.35);
    }
    const vajillero=grupo(c,'Almacenaje de bandejas',-6.82,0,9.55);
    const baseV=mueble(vajillero,0,0,2.72,.85,inox);
    for(const x of [-.82,-.22,.43])platos(baseV,x,.96,.05,6);
    const pase=mueble(c,-.62,10.85,6.52,1.00,inox);
    for(const dx of [-2.3,-1.85,1.9,2.35])platos(pase,dx,.96,.15,6);
    const preparacion=mueble(c,2.25,7.7,3.05,1.15,salvia);
    caja(preparacion,'Tabla de armado',.5,.969,0,1.3,.045,.49,madera);
    const balanza=grupo(preparacion,'Balanza de cocina',-.79,.95,0);
    caja(balanza,'Base',0,.07,0,.4,.13,.34,negro);disco(balanza,'Plato de pesaje',0,.16,0,.19,.035,inox);
    for(const lado of [-1,1])for(const z of [-5,1,7])luz(techo,lado*4,3.79,z,2.1);
  }
  function cafeteria(c,zBarra){
    // Izquierda al entrar desde el patio (mirando de este a oeste): extremo +Z.
    const barra=grupo(c,'Barra de café del rincón izquierdo',-.1,0,zBarra);barra.rotation.y=Math.PI;
    caja(barra,'Panel de roble',0,1.85,-.79,5.8,3.42,.12,madera);
    for(let i=0;i<32;i++)caja(barra,'Listón de roble',-2.79+i*.18,1.84,-.698,.085,3.35,.055,'#b48d68');
    const base=mueble(barra,0,0,5.68,.9,salvia);
    letrero(barra,'Café',0,2.57,-.63,1.55,.44,0,salvia,'#fff2dc');
    caja(barra,'Repisa de tazas',-1.9,1.72,-.46,1.25,.06,.4,madera);
    for(let i=0;i<5;i++)disco(barra,'Taza',-2.38+i*.23,1.83,-.45,.077,.15,loza);
    const cafetera=grupo(base,'Máquina de espresso',-.65,.945,-.055);
    caja(cafetera,'Bandeja recoge gotas',0,.055,.08,1.11,.09,.53,negro);
    caja(cafetera,'Cuerpo de espresso',0,.32,-.17,1.12,.49,.24,inox);
    caja(cafetera,'Cabezal de espresso',0,.55,.055,1.15,.17,.52,'#855549');
    for(const x of [-.26,.26]){
      disco(cafetera,'Grupo de café',x,.405,.19,.071,.12,inox);
      disco(cafetera,'Taza bajo el grupo',x,.168,.19,.076,.13,loza);
    }
    caja(base,'Peana de molino',.57,1.04,0,.32,.18,.34,negro);
    disco(base,'Molino',.57,1.27,0,.13,.34,inox);
    disco(base,'Tolva de granos',.57,1.53,0,.16,.22,'#694e3f');
    platos(base,2.03,.964,.12,5);
    caja(barra,'Vitrina de repostería',1.52,1.19,-.08,.9,.45,.53,new T.MeshStandardMaterial({color:'#c8e0dc',transparent:true,opacity:.22,depthWrite:false}));
    for(let i=0;i<4;i++)disco(barra,'Panecillo',1.22+i*.19,1.02,-.05,.082,.095,'#bf8958');
    luz(barra,0,2.16,-.45,2.75);
  }
  function inodoro(g,x,z,giro=0){
    const wc=grupo(g,'Inodoro de porcelana',x,0,z);wc.rotation.y=giro;
    const perfil=[[.14,.01],[.165,.07],[.13,.23],[.205,.32],[.217,.41],[.195,.448],[.152,.426],[.12,.352],[.04,.307]];
    const tazon=new T.Mesh(new T.LatheGeometry(perfil.map(([r,h])=>new T.Vector2(r,h)),28),
      new T.MeshStandardMaterial({color:'#eeede8',roughness:.25,side:T.DoubleSide}));
    tazon.scale.z=1.37;tazon.position.z=.09;wc.add(tazon);
    caja(wc,'Cisterna',0,.64,-.195,.38,.44,.18,loza);
    caja(wc,'Pulsador',0,.865,-.19,.07,.016,.037,inox);
    disco(wc,'Agua',0,.332,.09,.095,.009,'#bbcfc9').scale.z=.14;
  }
  function lavabo(g,x,z,ancho,giro=0){
    const l=grupo(g,'Lavamanos con espejo',x,0,z);l.rotation.y=giro;
    caja(l,'Encimera suspendida',0,.79,0,ancho,.12,.52,madera);
    const perfil=[[.08,.002],[.17,.045],[.22,.12],[.209,.138],[.17,.10],[.07,.023]];
    const cuenco=new T.Mesh(new T.LatheGeometry(perfil.map(([r,h])=>new T.Vector2(r,h)),24),new T.MeshStandardMaterial({color:loza,roughness:.24,side:T.DoubleSide}));cuenco.position.y=.854;l.add(cuenco);
    disco(l,'Grifería',.21,1.025,-.13,.021,.34,inox);caja(l,'Caño',.14,1.18,-.13,.16,.03,.035,inox);
    caja(l,'Marco de espejo',0,1.67,-.245,ancho-.1,.78,.055,salvia);
    caja(l,'Espejo',0,1.67,-.208,ancho-.16,.72,.012,'#a3b9bf');
    luz(l,0,2.11,-.18,ancho-.2);
    caja(l,'Dispensador',ancho*.36,1.18,-.15,.13,.24,.12,'#dbded9');
  }
  function banos(a){
    // El pequeño distribuidor del video se conserva. Las cabinas se desarrollan hacia poniente.
    const separador='#839d90';
    const cubierta=grupo(a,'Cielo de servicios higiénicos');
    cubierta.userData.sinColision=true; cubierta.visible=false;
    const cielo=new T.Mesh(new T.PlaneGeometry(9.65,7.64),new T.MeshStandardMaterial({color:'#eceae2'}));
    cielo.position.set(-2.72,3.83,.66);cielo.rotation.x=Math.PI/2;cubierta.add(cielo);
    for(const x of [-5.3,-.3])luz(cubierta,x,3.77,-1.63,1.2);
    baldosas(a,'Gres de baños',-2.78,-1.98,9.6,2.28,'#c1c0b6','#96988c',.45);
    baldosas(a,'Gres de baño accesible',0,2.85,4.12,3.08,'#c1c0b6','#96988c',.45);
    caja(a,'Testero del baño amplio',0,1.93,4.48,4.2,3.86,.13,marfilLocal);
    caja(a,'Cierre lateral',-2.03,1.93,2.88,.13,3.86,3.2,marfilLocal);
    caja(a,'Alicatado salvia',0,.65,4.39,4.08,1.28,.04,separador);
    inodoro(a,-1.16,4.03,Math.PI);lavabo(a,1.72,3.24,1.12,-Math.PI/2);
    caja(a,'Barra de apoyo',-1.67,.78,3.73,.045,.045,.78,inox);
    caja(a,'Barra posterior',-1.10,.82,4.33,.8,.042,.055,inox);
    caja(a,'Testero de cabinas',-2.74,1.93,-3.14,9.65,3.86,.14,marfilLocal);
    caja(a,'Cierre oeste de baños',-7.53,1.93,-.45,.13,3.86,5.4,marfilLocal);
    caja(a,'Cierre hacia servicios',-4.77,1.93,2.2,5.52,3.86,.14,marfilLocal);
    baldosas(a,'Gres del distribuidor de cabinas',-4.8,.63,5.42,3.05,'#c1c0b6','#96988c',.45);
    for(let i=0;i<3;i++){
      const cx=-6.69+i*1.60;
      inodoro(a,cx,-2.72);
      caja(a,'Divisor de cabina',cx+.77,1.12,-2.13,.06,2.03,1.87,separador);
      caja(a,'Frente fijo',cx-.52,1.13,-1.22,.52,2.02,.06,separador);
      const hoja=grupo(a,'Hoja de cabina',cx+.72,0,-1.22);hoja.rotation.y=-1.1;
      caja(hoja,'Puerta de cabina',-.45,1.12,0,.9,2.02,.04,separador);
      caja(hoja,'Pestillo',-.83,1.04,.035,.055,.073,.035,inox);
    }
    // Dos recintos independientes tras las puertas de damas y caballeros.
    caja(a,'Separación entre baños',-2.08,1.93,-2.22,.14,3.86,1.9,marfilLocal);
    caja(a,'Separación junto al vestíbulo',-2.08,1.93,1.76,.14,3.86,.99,marfilLocal);
    lavabo(a,-5.30,1.88,1.50,Math.PI);lavabo(a,-3.68,1.88,1.36,Math.PI);
    lavabo(a,1.18,-2.76,1.28);
    inodoro(a,-1.45,-2.69);
    caja(a,'Pantalla sanitaria',-.97,1.08,-2.58,.06,1.96,1.01,separador);
    const urinario=grupo(a,'Urinario',.18,0,-2.91);
    caja(urinario,'Respaldo de porcelana',0,.93,-.065,.38,.62,.14,loza);
    const taza=disco(urinario,'Cubeta',0,.674,.01,.197,.18,loza);
    taza.scale.z=.24;
    disco(urinario,'Desagüe',0,.770,.01,.089,.012,'#b7c5bc');
    for(const [x,z] of [[-6.97,1.78],[.70,-2.66],[1.46,3.99]]){
      const bin=grupo(a,'Papelera de pedal',x,0,z);
      disco(bin,'Cuba',0,.24,0,.15,.46,inox);disco(bin,'Tapa negra',0,.477,0,.152,.034,negro);
      caja(bin,'Pedal',0,.06,.15,.12,.027,.07,negro);
    }
  }
  const marfilLocal='#e9e8de';
  function sanitarioPersonal(p,x,z,ancho){
    const r=grupo(p,'Servicios higiénicos del pasadizo',x,0,z);
    baldosas(r,'Baldosa de servicios',0,-.001,ancho-.23,6.25,'#b9bcb2','#989c91',.59);
    lavabo(r,-ancho*.22,2.89,1.12,Math.PI);
    inodoro(r,ancho*.23,2.78,Math.PI);
    caja(r,'División de cabina',ancho*.11,1.05,2.46,.065,1.93,1.39,'#889f93');
    disco(r,'Papelera',-ancho*.22+.84,.29,2.67,.16,.56,negro);
    const vestidor=grupo(r,'Vestidor del personal',0,0,-1.75);
    const puertas=ancho>6?5:4;
    for(let i=0;i<puertas;i++){
      const dx=(i-(puertas-1)/2)*.46;
      caja(vestidor,'Cuerpo de casillero',dx,.96,-1.01,.452,1.82,.48,'#82958e');
      caja(vestidor,'Puerta esmaltada',dx,.97,-.756,.425,1.74,.030,'#a3b2a9');
      caja(vestidor,'Tirador empotrado',dx+.13,.91,-.731,.045,.14,.023,negro);
      for(const h of [1.56,1.61,1.66])caja(vestidor,'Ranura de ventilación',dx,h,-.737,.24,.012,.01,'#556864');
    }
    for(const d of [-.13,0,.13])caja(r,'Listón de banco de cambio',0,.46,-.31+d,1.82,.07,.115,madera);
    for(const dx of [-.69,.69])caja(r,'Pie de banco',dx,.22,-.31,.085,.43,.31,negro);
    for(const dx of [-.65,0,.65])caja(r,'Percha mural',dx,1.64,3.02,.067,.094,.10,inox);
  }
  function vigilancia(p,x,z){
    const r=grupo(p,'Oficina de Vigilancia C-120',x,0,z);
    baldosas(r,'Gres de oficina',0,0,6.69,6.3,'#bbbcb5','#9fa39c',.65);
    const escritorio=mueble(r,0,-1.4,3.2,.85,madera);
    caja(escritorio,'Pantalla de escritorio',-.6,1.30,-.12,.65,.39,.046,negro);
    caja(escritorio,'Soporte de pantalla',-.6,1.07,-.12,.045,.22,.05,inox);
    caja(escritorio,'Teclado',-.6,.959,.16,.47,.026,.16,negro);
    for(const [sx,sz] of [[-.72,-2.25],[-.72,-.25],[.72,-.25]]){
      caja(r,'Silla de oficina',sx,.45,sz,.49,.10,.48,salvia);
      caja(r,'Respaldo',sx,.69,sz+(sz<-1?-.22:.22),.48,.46,.065,salvia);
      disco(r,'Pie',sx,.22,sz,.055,.43,inox);disco(r,'Base',sx,.045,sz,.26,.06,negro);
    }
    const archivo=mueble(r,2.56,1.47,1.64,.58,salvia);archivo.rotation.y=-Math.PI/2;
    const credenza=mueble(r,-2.70,.12,2.81,.58,madera);credenza.rotation.y=Math.PI/2;
    for(let i=0;i<6;i++)caja(credenza,'Archivador con lomo',-.91+i*.17,1.13,0,.14,.37,.29,['#3b5865','#6e7972','#a4a089'][i%3]);
    caja(credenza,'Impresora de oficina',.78,1.09,0,.64,.28,.44,'#525d60');
    caja(credenza,'Salida de papel',.78,1.06,.23,.42,.043,.025,negro);
    caja(escritorio,'Libro de registro',.88,.966,.06,.52,.05,.36,'#7c5540');
    caja(escritorio,'Página de registro',.88,.995,.06,.48,.013,.32,loza);
  }
  function apoyo(p,x,z,ancho,lado,indice,prolongacion=0){
    const r=grupo(p,['Cuarto de apoyo','Almacén','Servicio'][indice],x,0,z+lado*3.3);
    baldosas(r,'Piso de apoyo',0,-.003,ancho-.19,6.32,'#c1c3b9','#94998e',.61).position.y=.006;
    const fondo=lado*(2.64+prolongacion);
    if(indice===1){
      for(const dx of [-ancho*.24,ancho*.24])balda(r,dx,fondo,ancho*.41);
      const arm=mueble(r,-ancho*.32,.20,1.65,.66,salvia);arm.rotation.y=Math.PI/2;
    }else if(indice===0){
      const enc=mueble(r,0,fondo,ancho-.65,.66,salvia);enc.rotation.y=lado>0?Math.PI:0;
      caja(enc,'Tablón',0,1.68,-.32,2.25,.76,.05,madera);
      for(const dx of [-.54,0,.56])caja(enc,'Ficha',dx,1.67,-.282,.3,.39,.01,loza);
      const mesa=mueble(r,-ancho*.23,-.08,1.85,.83,madera);
      caja(mesa,'Bandeja de trabajo',.31,.974,0,.45,.045,.30,negro);
      const puesto=grupo(r,'Mesa de consulta',ancho*.18,0,.42);
      caja(puesto,'Tablero',0,.79,0,1.67,.07,1.04,piedra);
      for(const dx of [-.70,.70])for(const dz of [-.39,.39])caja(puesto,'Pata',dx,.38,dz,.044,.75,.044,negro);
      for(const ladoSilla of [-1,1]){
        caja(puesto,'Asiento de consulta',0,.44,ladoSilla*.82,.46,.075,.43,'#476878');
        caja(puesto,'Respaldo de consulta',0,.66,ladoSilla*1.01,.45,.38,.056,'#476878');
        for(const dx of [-.17,.17])for(const dz of [-.15,.15])disco(puesto,'Pie de asiento',dx,.20,ladoSilla*.82+dz,.019,.4,inox);
      }
    }else{
      balda(r,-ancho*.21,fondo,ancho*.45);
      for(let i=0;i<3;i++){
        const cx=ancho*.09+i*.50;
        caja(r,'Casillero',cx,.94,fondo,.485,1.88,.52,salvia);
        caja(r,'Tirador',cx+.12,.94,fondo-lado*.28,.032,.14,.04,inox);
      }
      const banco=mueble(r,ancho*.27,lado<0?.98:-.12,1.67,.64,madera);banco.rotation.y=Math.PI/2;
      if(lado>0){
        const pileta=mueble(r,-ancho*.37,.05,1.40,.68,inox);pileta.rotation.y=Math.PI/2;
        caja(pileta,'Pila de enjuague',0,.955,0,.94,.048,.49,'#798f8a');
        disco(pileta,'Grifo de pared',-.31,1.12,-.22,.025,.30,inox);
        caja(pileta,'Caño',-.31,1.27,-.08,.05,.035,.31,inox);
        const cubo=grupo(r,'Balde con escurridor',-.46,0,.12);
        caja(cubo,'Cuba amarilla',0,.28,0,.56,.45,.40,'#d0a53c');
        caja(cubo,'Escurridor',-.12,.57,0,.27,.16,.36,'#b98c36');
        for(const dx of [-.21,.21])for(const dz of [-.13,.13])disco(cubo,'Rueda',dx,.065,dz,.055,.046,negro).rotation.x=Math.PI/2;
      }else{
        const est=grupo(r,'Reserva de útiles del patio',-ancho*.38,0,.06);est.rotation.y=Math.PI/2;balda(est,0,0,2.0);
        const apoyo=mueble(r,-.3,.16,1.37,.73,inox);
        for(const dx of [-.33,.12])caja(apoyo,'Caja de recambios',dx,1.06,.05,.34,.22,.37,'#beaa87');
      }
    }
  }
  function archivo(g,x,z){
    const a=mueble(g,x,z,4.24,.73,salvia);
    caja(a,'Fondo del archivo',0,1.65,-.27,4.19,1.48,.075,madera);
    for(const dx of [-2.06,0,2.06])caja(a,'Costado del archivo',dx,1.64,-.02,.055,1.46,.50,madera);
    for(const y of [.98,1.64,2.35])caja(a,'Estante de consulta',0,y,-.02,4.20,.054,.52,madera);
    const tonos=['#586a6c','#93866d','#b2ada0','#677d78'];
    for(let k=0;k<14;k++){
      const dx=-1.88+k*.276,base=k%4===3?1.677:1.018;
      caja(a,'Carpeta de archivo',dx,base+.20,.014,.18,.40,.32,tonos[k%4]);
      caja(a,'Etiqueta del lomo',dx,base+.24,.181,.097,.064,.012,loza);
    }
  }
  function bancoApoyo(g,x,z){
    const m=mueble(g,x,z,2.41,.78,madera);m.rotation.y=Math.PI/2;
    caja(m,'Superficie de consulta',0,.963,0,1.08,.026,.47,'#81908a');
    caja(m,'Carpeta de trabajo',.28,.996,-.02,.41,.037,.32,'#af9474');
  }
  return {cocina,cafeteria,banos,apoyo,balda,sanitarioPersonal,vigilancia,archivo,bancoApoyo};
}

