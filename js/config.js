// Medidas en UNIDADES APROXIMADAS. No equivalen a metros verificados.
// Ejes: X = izquierda/derecha, Y = altura, Z = fondo/frente (+Z hacia el acceso principal).
export const CONFIG = {
  anchoCampus: 116,
  extensionDerecha: 24.5,
  fondoCampus: 78,
  // x conserva el acceso del cerco; desplazamientoX mueve solo el edificio hacia el patio.
  ingreso: { x: 69.45, z: -22, ancho: 1.8, desplazamientoX: -.6 },
  altoPiso: 4.4,
  baseY: 1.82,
  acabados: {
    piso: '#686d72',
    rampa: '#92989d',
    muro: '#e5e8ed',
    celosia: '#96958e',
    pared: '#465057',
    columna: '#48545e'
  },
  // Torre B es más alargada, C más ancha y A tiene otra proporción.
  // Las medidas son unidades de maquetación, NO metros comprobados.
  torres: {
    C: { id: 'C', nombre: 'Torre C', x: -28, z: 1, ancho: 21, fondo: 69, color: '#34bb75', descripcion: 'Zona de cafetería, cocina y espacios vinculados al comedor.' },
    B: { id: 'B', nombre: 'Torre B', x:   0, z: 0, ancho: 16.5, fondo: 74, color: '#367dec', descripcion: 'Biblioteca, aula y zona de elevadores.' },
    A: { id: 'A', nombre: 'Torre A', x:  28, z: 1.5, ancho: 18.5, fondo: 70, color: '#e84f54', descripcion: 'Sala de Conferencias, Experiencia Estudiantil (atención al estudiante), Administración y tópico.' }
  }
};

// Coordenadas LOCALES: x y z se miden desde el centro de cada torre.
// Para cambiar un salón, solo edita sus posiciones, tamaños y paredes.
// Paredes disponibles: 'norte' (-Z), 'sur' (+Z), 'este' (+X), 'oeste' (-X).
export const AMBIENTES = {
  C: [
    { id:'c-cafeteria', nombre:'Cafetería', tipo:'Alimentación', x:0, z:17.5, ancho:13.1, fondo:12, color:'#d6eccc', paredes:['norte','oeste'], descripcion:'Espacio de cafetería de la Torre C; disposición interna por verificar.' },
    { id:'c-cocina', nombre:'Cocina', tipo:'Alimentación', x:0, z:2.1, ancho:13.1, fondo:11.4, color:'#e7e2cc', paredes:['norte','oeste','este'], descripcion:'Área de cocina señalada en el croquis del primer nivel.' },
    { id:'c-servicios', nombre:'Ambientes C', tipo:'Ambiente por definir', x:0, z:-16.7, ancho:13.1, fondo:19, color:'#d8e6e3', paredes:['norte','oeste','este'], descripcion:'Ambientes de la parte posterior de la Torre C; se ajustarán con un plano más detallado.' }
  ],
  B: [
    { id:'b-elevadores', nombre:'Elevadores', tipo:'Circulación vertical', x:0, z:18, ancho:13, fondo:9, recorteFrontal:2.2, color:'#d5e4f2', descripcion:'Cuatro elevadores con puertas animadas y acceso a los pisos 1 al 11; vestíbulo con vidrio de marco negro y jardín lateral en L con borde plomo.' },
    { id:'b-biblioteca', nombre:'Biblioteca', tipo:'Estudio', x:0, z:-1.5, ancho:13, fondo:22.5, color:'#d6e3fa', paredes:['este','oeste'], descripcion:'Biblioteca central indicada en el croquis.' },
    { id:'b-aula', nombre:'Aula', tipo:'Educación', x:0, z:-20, ancho:13, fondo:10, color:'#dce9f9', paredes:['norte','este','oeste'], descripcion:'Aula ubicada en el extremo posterior de la Torre B.' }
  ],
  A: [
    { id:'a-conferencias', nombre:'Sala de Conferencias', tipo:'Eventos', x:0, z:4.1, ancho:13, fondo:35.6, color:'#f2d9d3', paredes:['norte','sur','oeste'], fachada:'conferencias', descripcion:'Fachada de paneles grises y claros. Cinco puertas hacia el patio: dos parejas y una puerta individual, según el croquis actualizado.' },
    { id:'a-atencion-alumno', nombre:'Atención al Estudiante', tipo:'Atención', x:0, z:-18.15, ancho:13, fondo:8.9, color:'#f1e0d7', paredes:['norte','oeste'], fachada:'estudiantes', descripcion:'Experiencia Estudiantil: atención al estudiante con dos hojas delgadas de vidrio, paños fijos, franja esmerilada y tiradores metálicos.' },
    { id:'a-atencion-publico', nombre:'Administración', tipo:'Atención', x:0, z:-26.35, ancho:13, fondo:7.5, color:'#f5e2d6', paredes:['oeste','norte','este'], descripcion:'Administración, detrás de Atención al Estudiante y junto a la franja verde transversal del croquis.' },
    { id:'a-topico', nombre:'Tópico', tipo:'Servicios', x:-3.35, z:-32.35, ancho:6.3, fondo:4.5, color:'#f0dedb', paredes:['norte','este'], descripcion:'Tópico conservado en la parte posterior de la torre.' }
  ]
};

// Retrae los ambientes de B y A tomando la cocina como referencia.
// La huella de las torres y sus conexiones al cerco permanecen fijas.
export function distribucionInterior(torre){
  // La corrección del 10/11 fija directamente las cotas longitudinales de A.
  if(torre.id==='A') return {factorZ:1,desplazamientoZ:0};
  const factorOriginal=torre.fondo/54;
  if(torre.id==='C') return {factorZ:factorOriginal,desplazamientoZ:0};

  const cocina=AMBIENTES.C.find(ambiente=>ambiente.id==='c-cocina');
  const referencia=CONFIG.torres.C;
  // Ajuste fino hacia el frente: recupera 6 unidades del retranqueo inicial.
  const ajusteFrontal=6;
  const inicio=referencia.z+(cocina.z+cocina.fondo/2)*referencia.fondo/54+ajusteFrontal;
  const ambientes=AMBIENTES[torre.id];
  const posterior=Math.min(...ambientes.map(a=>a.z-a.fondo/2));
  const frontal=Math.max(...ambientes.map(a=>a.z+a.fondo/2));
  const limitePosterior=posterior*factorOriginal;
  // Conserva el extremo posterior y reparte los ambientes en el tramo restante.
  const factorZ=(inicio-torre.z-limitePosterior)/(frontal-posterior);
  return {factorZ,desplazamientoZ:limitePosterior-posterior*factorZ};
}
