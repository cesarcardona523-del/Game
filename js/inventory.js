/**
 * inventory.js
 * ─────────────────────────────────────────────────────────────────────────
 * Representa la Zona 3 (estantería): qué ingredientes están disponibles
 * para el jugador. Hoy todos están desbloqueados desde el inicio; el
 * módulo ya está separado de recipes.js para que una futura "Tienda"
 * (ver README.md → Futuras versiones) pueda bloquear/desbloquear
 * ingredientes por dinero sin tocar el catálogo de recetas.
 * ─────────────────────────────────────────────────────────────────────────
 */

class Inventory {
  constructor() {
    /** @type {Set<string>} ids de INGREDIENTS actualmente disponibles. */
    this.disponibles = new Set(Object.keys(INGREDIENTS));
  }

  /** true si el ingrediente puede usarse ahora mismo. */
  estaDisponible(idIngrediente) {
    return this.disponibles.has(idIngrediente);
  }

  /** Extensión futura: desbloquear un ingrediente nuevo (comprado en la tienda). */
  desbloquear(idIngrediente) {
    this.disponibles.add(idIngrediente);
  }

  /** Lista de ingredientes disponibles agrupados por origen, para renderizar la estantería. */
  listaEstante() {
    return Object.keys(INGREDIENTS)
      .filter((id) => this.disponibles.has(id))
      .map((id) => Object.assign({ id }, INGREDIENTS[id]));
  }
}

// Expuesto para tests (Node/CommonJS). No afecta la carga como <script> en el
// navegador, donde `module` no existe.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Inventory };
}
