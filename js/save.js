/**
 * save.js
 * ─────────────────────────────────────────────────────────────────────────
 * Persistencia con localStorage. Guarda únicamente datos serializables
 * (el objeto plano que devuelve Player.toJSON()) — nunca instancias ni
 * referencias a DOM. Aislado en su propio módulo para que, si en el futuro
 * se agrega guardado en la nube (cuenta de usuario), solo haya que
 * reemplazar esta clase sin tocar game.js ni player.js.
 * ─────────────────────────────────────────────────────────────────────────
 */

class SaveManager {
  constructor(clave) {
    this.clave = clave || 'coffeeShop.save.v1';
  }

  /** Guarda el estado del jugador. Silencioso si localStorage no está disponible. */
  guardar(player) {
    try {
      localStorage.setItem(this.clave, JSON.stringify(player.toJSON()));
      return true;
    } catch (err) {
      console.warn('[CoffeeShop] No se pudo guardar la partida:', err);
      return false;
    }
  }

  /** Carga el estado guardado, o null si no existe / está corrupto. */
  cargar() {
    try {
      const crudo = localStorage.getItem(this.clave);
      return crudo ? JSON.parse(crudo) : null;
    } catch (err) {
      console.warn('[CoffeeShop] No se pudo leer la partida guardada:', err);
      return null;
    }
  }

  /** Borra la partida guardada (reinicio de progreso). */
  reiniciar() {
    try { localStorage.removeItem(this.clave); } catch (err) { /* noop */ }
  }
}

// Expuesto para tests (Node/CommonJS). No afecta la carga como <script> en el
// navegador, donde `module` no existe.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SaveManager };
}
