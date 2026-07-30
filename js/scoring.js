/**
 * scoring.js
 * ─────────────────────────────────────────────────────────────────────────
 * Fórmulas puras de puntaje/reputación/dinero al servir un pedido. Sin DOM,
 * sin Player, sin UI — game.js llama a estas funciones y aplica los deltas
 * devueltos a player/ui/audio. Separado para poder testear las fórmulas
 * (umbrales de tiempo, penalización por ingredientes mal) sin necesitar un
 * DOM ni instanciar el resto del juego.
 * ─────────────────────────────────────────────────────────────────────────
 */

const UMBRAL_PERFECTO_S = 10;
const UMBRAL_RAPIDO_S = 16;

/**
 * Compara los ingredientes preparados contra los esperados de la receta — el
 * ORDEN importa (regla de diseño explícita, ver recipes.js).
 */
function pasosCoinciden(preparados, esperados) {
  if (preparados.length !== esperados.length) return false;
  return preparados.every((id, i) => id === esperados[i]);
}

/**
 * Calcula el resultado de servir una bebida CORRECTA. No muta nada — devuelve
 * los deltas para que el llamador (Game) los aplique a player/ui/audio.
 * @param {{fraccionPaciencia: () => number, receta: {precio:number}}} cliente
 * @param {number} segundos  Tiempo que tardó en prepararse desde que se asignó el cliente.
 */
function calcularServirCorrecto(cliente, segundos) {
  let puntos = 100;
  let etiqueta = '¡Correcto! +100';
  let esPerfecto = false;
  let esRapido = false;

  if (segundos <= UMBRAL_PERFECTO_S) { puntos = 150; etiqueta = '¡Perfecto! +150'; esPerfecto = true; }
  else if (segundos <= UMBRAL_RAPIDO_S) { puntos += 50; etiqueta = '¡Muy rápido! +150'; esRapido = true; }

  const clienteContento = cliente.fraccionPaciencia() > 0.5;
  if (clienteContento) puntos += 20;

  return {
    puntos,
    etiqueta,
    esPerfecto,
    esRapido,
    clienteContento,
    dinero: cliente.receta.precio + (esPerfecto ? 1 : 0),
    deltaReputacion: clienteContento ? 3 : 1,
  };
}

/** Calcula la penalización de servir una bebida INCORRECTA. No muta nada. */
function calcularServirIncorrecto(capasPreparadas, esperados) {
  const largoMax = Math.max(capasPreparadas.length, esperados.length);
  let ingredientesMal = 0;
  for (let i = 0; i < largoMax; i++) {
    if (capasPreparadas[i] !== esperados[i]) ingredientesMal++;
  }
  return {
    total: 50 + ingredientesMal * 30,
    ingredientesMal,
    deltaReputacion: -(8 + ingredientesMal * 2),
  };
}

// Expuesto para tests (Node/CommonJS). No afecta la carga como <script> en el
// navegador, donde `module` no existe.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    UMBRAL_PERFECTO_S, UMBRAL_RAPIDO_S, pasosCoinciden, calcularServirCorrecto, calcularServirIncorrecto,
  };
}
