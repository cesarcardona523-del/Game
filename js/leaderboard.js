/**
 * leaderboard.js
 * ─────────────────────────────────────────────────────────────────────────
 * TOP global de baristas. Usa el mismo proyecto Supabase que ya usa el
 * resto del sitio (Comparador de Precios, suscripciones). No se agrega el
 * SDK supabase-js para mantener el juego 100% autocontenido (sin esa
 * dependencia, el resto del juego sigue funcionando offline por completo).
 *
 * Requiere correr la migración `supabase/coffee_shop_puntajes.sql` una vez
 * en el proyecto Supabase (ver ese archivo) — hasta entonces, enviar() y
 * obtenerTop() fallan de forma silenciosa/controlada (ver catch abajo) y el
 * juego sigue jugable sin TOP en línea.
 *
 * enviar() llama a la Edge Function `maxi-barista-enviar-top` en vez de
 * insertar directo por REST — en este proyecto Supabase el INSERT directo
 * del cliente con la llave anon falla (mismo bug de plataforma ya
 * documentado para comparador_suscripciones: el rol `authenticator` de
 * PostgREST no cambia bien a `anon` en peticiones HTTP reales). La Edge
 * Function además es la que decide si hay que avisarle por correo a
 * alguien que quedó fuera del TOP 10 — el jugador que envía su puntaje
 * NUNCA recibe correo, solo se guarda (pedido explícito del diseño).
 *
 * Seguridad: la LECTURA del TOP pasa por una función RPC
 * (`obtener_top_coffee_shop`) que solo devuelve nombre/puntos/nivel — el
 * correo nunca es legible desde el cliente, ni siquiera indirectamente.
 * ─────────────────────────────────────────────────────────────────────────
 */

const SUPABASE_URL_COFFEE = 'https://arpzkclltxguvixxfzej.supabase.co';
const SUPABASE_ANON_KEY_COFFEE = 'sb_publishable_Lz5q7YzXRbOZy2oumSsWuQ_5upu88gO';

class Leaderboard {
  /**
   * Envía un puntaje al TOP. Devuelve true/false según si se guardó.
   * @param {string} nombre
   * @param {string} email
   * @param {number} puntos
   * @param {number} nivel
   */
  async enviar(nombre, email, puntos, nivel) {
    try {
      const r = await fetch(`${SUPABASE_URL_COFFEE}/functions/v1/maxi-barista-enviar-top`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY_COFFEE,
          Authorization: `Bearer ${SUPABASE_ANON_KEY_COFFEE}`,
        },
        body: JSON.stringify({ nombre: nombre.slice(0, 60), email: email.slice(0, 255), puntos: Math.round(puntos), nivel: Math.round(nivel) }),
      });
      if (!r.ok) return false;
      const data = await r.json().catch(() => null);
      return !!(data && data.ok);
    } catch (err) {
      console.warn('[CoffeeShop] No se pudo enviar el puntaje al TOP (¿falta correr la migración de Supabase o desplegar la Edge Function?):', err);
      return false;
    }
  }

  /**
   * Trae el TOP N ordenado por puntos descendente.
   * @param {number} limite
   * @returns {Promise<{nombre:string, puntos:number, nivel:number}[]>}
   */
  async obtenerTop(limite) {
    try {
      const r = await fetch(`${SUPABASE_URL_COFFEE}/rest/v1/rpc/obtener_top_coffee_shop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY_COFFEE,
          Authorization: `Bearer ${SUPABASE_ANON_KEY_COFFEE}`,
        },
        body: JSON.stringify({ p_limite: limite || 10 }),
      });
      if (!r.ok) return [];
      return await r.json();
    } catch (err) {
      console.warn('[CoffeeShop] No se pudo cargar el TOP (¿falta correr la migración de Supabase?):', err);
      return [];
    }
  }
}
