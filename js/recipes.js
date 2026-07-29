/**
 * recipes.js
 * ─────────────────────────────────────────────────────────────────────────
 * Modelo de datos puro (sin lógica de juego): ingredientes disponibles y
 * catálogo de recetas. Este archivo es la única fuente de verdad sobre
 * "qué existe" en Maxi Barista — el resto de los módulos (machine.js,
 * customers.js, game.js, ui.js) leen de aquí, nunca al revés.
 *
 * Diseñado para crecer: agregar una receta nueva es agregar un objeto al
 * arreglo RECIPES (ver sección "Futuras versiones" en README.md — la meta
 * de más de 50 recetas solo requiere extender este arreglo).
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Todos los ingredientes que existen en el juego, indexados por id.
 *
 * @property {string} nombre       Nombre visible (ES).
 * @property {string} origen       'maquina' (requiere un proceso con tiempo
 *                                  en la Zona 2) o 'estante' (se agrega al
 *                                  instante desde la Zona 3).
 * @property {string} capaTipo     'capa' (ocupa una porción proporcional de
 *                                  la taza) o 'topping' (banda decorativa
 *                                  delgada arriba, ej. canela, miel).
 * @property {number} peso         Peso relativo de la capa dentro de la taza
 *                                  (ignorado si capaTipo es 'topping').
 * @property {string} color        Color CSS de la capa/topping.
 * @property {string} icon         Id del <symbol> SVG (ver index.html).
 * @property {number} [duracionMs] Solo si origen==='maquina': cuánto tarda
 *                                  el proceso en la máquina de espresso.
 */
const INGREDIENTS = {
  espresso: {
    nombre: 'Espresso', origen: 'maquina', capaTipo: 'capa',
    peso: 3, color: '#3B2417', icon: 'ing-espresso', duracionMs: 2000,
  },
  agua_caliente: {
    nombre: 'Agua caliente', origen: 'maquina', capaTipo: 'capa',
    peso: 3, color: '#D9C9A8', icon: 'ing-agua', duracionMs: 2000,
  },
  leche: {
    nombre: 'Leche', origen: 'estante', capaTipo: 'capa',
    peso: 3, color: '#F6EEDD', icon: 'ing-leche',
  },
  leche_caliente: {
    nombre: 'Leche caliente', origen: 'maquina', capaTipo: 'capa',
    peso: 3, color: '#F1E3C6', icon: 'ing-leche-caliente', duracionMs: 2000,
  },
  leche_fria: {
    nombre: 'Leche fría', origen: 'maquina', capaTipo: 'capa',
    peso: 3, color: '#EFF3EE', icon: 'ing-leche-fria', duracionMs: 2000,
  },
  leche_espumada: {
    nombre: 'Leche espumada', origen: 'maquina', capaTipo: 'capa',
    peso: 2, color: '#EAE0C8', icon: 'ing-leche-espumada', duracionMs: 2000,
  },
  espuma_de_leche: {
    nombre: 'Espuma de leche', origen: 'maquina', capaTipo: 'capa',
    peso: 2, color: '#FBF8F0', icon: 'ing-espuma', duracionMs: 2000,
  },
  jarabe_de_chocolate: {
    nombre: 'Jarabe de chocolate', origen: 'estante', capaTipo: 'topping',
    peso: 1, color: '#5C3323', icon: 'ing-jarabe',
  },
  canela: {
    nombre: 'Canela', origen: 'estante', capaTipo: 'topping',
    peso: 1, color: '#A9682E', icon: 'ing-canela',
  },
  miel: {
    nombre: 'Miel', origen: 'estante', capaTipo: 'topping',
    peso: 1, color: '#D69B1F', icon: 'ing-miel',
  },
  leche_condensada: {
    nombre: 'Leche condensada', origen: 'estante', capaTipo: 'capa',
    peso: 2, color: '#EFDFAE', icon: 'ing-condensada',
  },
  helado: {
    nombre: 'Helado', origen: 'estante', capaTipo: 'capa',
    peso: 2, color: '#FAF6EC', icon: 'ing-helado',
  },
  merengue: {
    nombre: 'Merengue', origen: 'estante', capaTipo: 'capa',
    peso: 2, color: '#FFFDF7', icon: 'ing-merengue',
  },
  hielo: {
    nombre: 'Hielo', origen: 'estante', capaTipo: 'capa',
    peso: 2, color: '#DCEFF0', icon: 'ing-hielo',
  },
};

/**
 * Los 6 botones físicos de la máquina de espresso. Cada uno produce el
 * ingrediente del mismo nombre en INGREDIENTS. "Vapor" se usa para vaporizar
 * la leche fría en leche espumada (distinta del proceso dedicado
 * "Espumar leche", que produce la espuma que va encima).
 */
const PROCESOS_MAQUINA = ['espresso', 'agua_caliente', 'leche_espumada', 'espuma_de_leche', 'leche_caliente', 'leche_fria'];

/** Nombre de botón a mostrar para cada proceso (difiere un poco del nombre del ingrediente). */
const NOMBRE_PROCESO = {
  espresso: 'Preparar Espresso',
  agua_caliente: 'Agua Caliente',
  leche_espumada: 'Vapor',
  espuma_de_leche: 'Espumar Leche',
  leche_caliente: 'Leche Caliente',
  leche_fria: 'Leche Fría',
};

/**
 * Catálogo de bebidas. `pasos` es el arreglo ORDENADO de ids de ingredientes
 * — el orden importa: server() en game.js compara paso a paso, así que
 * preparar los ingredientes en otro orden invalida la bebida (regla pedida
 * explícitamente por el diseño del juego).
 *
 * `tier` determina en qué nivel del jugador empieza a poder pedirse esta
 * bebida (ver LEVEL_TIER_MAP en customers.js):
 *   1 → nivel 1+   2 → nivel 2+   3 → nivel 3+   4 → nivel 4+
 *
 * Nota de diseño: la tabla original agrupa "Café negro" como ingrediente de
 * Melange y Café con miel; en este juego el único método de obtener café
 * negro es el botón "Preparar Espresso", así que ambas recetas usan
 * `espresso` internamente (incluido en el comentario de cada receta).
 */
const RECIPES = [
  { id: 'espresso', nombre: 'Espresso', tier: 1, precio: 2.5, xp: 30, icon: 'ing-espresso', pasos: ['espresso'] },
  { id: 'americano', nombre: 'Americano', tier: 1, precio: 3.0, xp: 35, icon: 'ing-agua', pasos: ['espresso', 'agua_caliente'] },
  { id: 'latte', nombre: 'Latte', tier: 1, precio: 4.0, xp: 45, icon: 'ing-espuma', pasos: ['espresso', 'leche_caliente', 'espuma_de_leche'] },

  { id: 'cappuccino', nombre: 'Cappuccino', tier: 2, precio: 4.2, xp: 50, icon: 'ing-espuma', pasos: ['espresso', 'leche_caliente', 'espuma_de_leche'] },
  { id: 'cortado', nombre: 'Café Cortado', tier: 2, precio: 3.5, xp: 45, icon: 'ing-leche-espumada', pasos: ['espresso', 'leche_espumada'] },
  { id: 'bombon', nombre: 'Café Bombón', tier: 2, precio: 4.5, xp: 55, icon: 'ing-condensada', pasos: ['espresso', 'leche_condensada'] },

  { id: 'moka', nombre: 'Café Moka', tier: 3, precio: 5.5, xp: 70, icon: 'ing-jarabe', pasos: ['espresso', 'leche_caliente', 'espuma_de_leche', 'jarabe_de_chocolate'] },
  // "Café negro" de la tabla original = espresso (ver nota arriba).
  { id: 'vienes', nombre: 'Café Vienés', tier: 3, precio: 4.8, xp: 60, icon: 'ing-merengue', pasos: ['espresso', 'merengue'] },
  { id: 'melange', nombre: 'Café Melange', tier: 3, precio: 4.6, xp: 60, icon: 'ing-merengue', pasos: ['espresso', 'merengue'] },
  { id: 'breve', nombre: 'Café Breve', tier: 3, precio: 4.7, xp: 60, icon: 'ing-espuma', pasos: ['espresso', 'leche', 'espuma_de_leche'] },

  { id: 'affogato', nombre: 'Affogato', tier: 4, precio: 5.8, xp: 80, icon: 'ing-helado', pasos: ['helado', 'espresso'] },
  { id: 'largo', nombre: 'Café Largo', tier: 4, precio: 3.2, xp: 40, icon: 'ing-agua', pasos: ['espresso', 'agua_caliente'] },
  { id: 'con_miel', nombre: 'Café con Miel', tier: 4, precio: 5.0, xp: 65, icon: 'ing-miel', pasos: ['espresso', 'miel', 'canela', 'leche_caliente'] },
  { id: 'con_hielo', nombre: 'Café con Hielo', tier: 4, precio: 3.8, xp: 45, icon: 'ing-hielo', pasos: ['espresso', 'hielo'] },
  { id: 'manchado', nombre: 'Café Manchado', tier: 4, precio: 3.6, xp: 45, icon: 'ing-espuma', pasos: ['espresso', 'espuma_de_leche'] },
  { id: 'lagrima', nombre: 'Café Lágrima', tier: 4, precio: 3.4, xp: 40, icon: 'ing-leche', pasos: ['leche', 'espresso'] },
];

/** Devuelve la definición completa de una receta por id, o undefined. */
function obtenerReceta(id) {
  return RECIPES.find(function (r) { return r.id === id; });
}

/** Devuelve todas las recetas visibles hasta cierto tier de dificultad (inclusive). */
function recetasHastaTier(tierMax) {
  return RECIPES.filter(function (r) { return r.tier <= tierMax; });
}
