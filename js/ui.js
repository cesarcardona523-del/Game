/**
 * ui.js
 * ─────────────────────────────────────────────────────────────────────────
 * Toda la manipulación del DOM vive aquí. game.js decide QUÉ pasó
 * (se agregó un ingrediente, un cliente se fue, se subió de nivel...);
 * UIController decide CÓMO se ve. Ningún otro módulo toca document.*
 * directamente — así el "motor" del juego (game/player/machine/customers)
 * se podría probar sin navegador.
 *
 * v2: soporta 3 "estaciones" de preparación en paralelo (ver game.js) en
 * vez de una única taza global.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Pool genérico de elementos DOM reciclados — evita crear/destruir un
 * <span> nuevo en cada VFX (texto flotante, estrella, vapor). El listener de
 * `animationend` que devuelve el elemento al pool se registra UNA sola vez
 * en la fábrica (factory), no en cada adquisición, para no ir acumulando
 * listeners sobre el mismo nodo a medida que se reutiliza.
 */
class ElementPool {
  constructor() {
    this._libres = [];
  }

  /** Reutiliza un elemento libre, o crea uno nuevo con `factory()` si no hay. */
  adquirir(factory) {
    return this._libres.pop() || factory();
  }

  /** Devuelve un elemento al pool, quitándolo del DOM. */
  liberar(el) {
    if (el.parentNode) el.parentNode.removeChild(el);
    this._libres.push(el);
  }
}

class UIController {
  constructor() {
    this.el = {
      clientes: document.getElementById('zona-clientes'),
      maquinaBotones: document.getElementById('maquina-botones'),
      maquinaEnfoque: document.getElementById('maquina-enfoque'),
      estaciones: document.getElementById('estaciones'),
      flotantes: document.getElementById('capa-flotantes'),
      modalNivel: document.getElementById('modal-nivel'),
      modalNivelTexto: document.getElementById('modal-nivel-texto'),
      modalTurno: document.getElementById('modal-turno'),
      turnoResumen: document.getElementById('turno-resumen'),
      formTurno: document.getElementById('form-turno'),
      turnoNombre: document.getElementById('turno-nombre'),
      turnoCorreo: document.getElementById('turno-correo'),
      turnoMsg: document.getElementById('turno-msg'),
      btnTurnoOmitir: document.getElementById('btn-turno-omitir'),
      modalTop: document.getElementById('modal-top'),
      topLista: document.getElementById('top-lista'),
      btnTopCerrar: document.getElementById('btn-top-cerrar'),
      hudNivel: document.getElementById('hud-nivel'),
      hudNivelBarra: document.getElementById('hud-nivel-barra'),
      hudDinero: document.getElementById('hud-dinero'),
      hudReputacion: document.getElementById('hud-reputacion'),
      hudFelices: document.getElementById('hud-felices'),
      hudTiempo: document.getElementById('hud-tiempo'),
      hudTiempoWrap: document.getElementById('hud-tiempo-wrap'),
      radioEstado: document.getElementById('radio-estado'),
      radioPista: document.getElementById('radio-pista'),
      celebracionMaxi: document.getElementById('celebracion-maxi'),
      celebracionMaxiTexto: document.getElementById('celebracion-maxi-texto'),
    };
    // Valores previos del HUD — para animar un "tick" solo cuando dinero o
    // reputación realmente cambian entre un renderHUD() y el siguiente.
    this._ultimoDinero = null;
    this._ultimaReputacion = null;

    // Pools de elementos VFX reciclados (texto flotante, estrellas, vapor).
    this._poolFlotantes = new ElementPool();
    this._poolEstrellas = new ElementPool();
    this._poolVapor = new ElementPool();
  }

  /**
   * Maxi festejando en una esquina — se llama cada vez que se sirve BIEN un
   * pedido (ver game.js _alServirCorrecto), no solo en la pantalla de Home.
   * Reinicia la animación aunque ya esté visible (reflow forzado) para que
   * dos servidas seguidas de corrido se vean bien, no se corte a la mitad.
   */
  mostrarCelebracionMaxi(texto) {
    const el = this.el.celebracionMaxi;
    this.el.celebracionMaxiTexto.textContent = texto;
    el.classList.remove('celebracion-maxi--activa', 'celebracion-maxi--sale');
    void el.offsetWidth;
    el.classList.add('celebracion-maxi--activa');
    clearTimeout(this._celebracionTimeout);
    clearTimeout(this._celebracionTimeoutSale);
    this._celebracionTimeout = setTimeout(() => {
      el.classList.add('celebracion-maxi--sale');
      this._celebracionTimeoutSale = setTimeout(() => {
        el.classList.remove('celebracion-maxi--activa', 'celebracion-maxi--sale');
      }, 320);
    }, 1600);
  }

  // ── ZONA 2: MÁQUINA (se dibuja una sola vez) ──
  renderBotonesMaquina(onClickProceso) {
    this.el.maquinaBotones.innerHTML = '';
    PROCESOS_MAQUINA.forEach((id) => {
      const def = INGREDIENTS[id];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'proceso-btn';
      btn.dataset.id = id;
      btn.innerHTML = `
        <svg class="proceso-icono"><use href="#${def.icon}"></use></svg>
        <span class="proceso-nombre">${NOMBRE_PROCESO[id]}</span>
        <span class="proceso-progreso"><span class="proceso-progreso-relleno"></span></span>
      `;
      btn.addEventListener('click', () => onClickProceso(id));
      this.el.maquinaBotones.appendChild(btn);
    });
  }

  /** Etiqueta "preparando para: Estación N" (o instrucción si no hay ninguna enfocada). */
  actualizarEnfoqueMaquina(idEstacion) {
    this.el.maquinaEnfoque.textContent = idEstacion
      ? `Preparando para Estación ${idEstacion}`
      : 'Selecciona una estación →';
  }

  /** Refresca los 6 botones de proceso según el estado de la máquina de la estación enfocada. */
  renderProgresoMaquinaEnfocada(estacion) {
    PROCESOS_MAQUINA.forEach((id) => {
      const btn = this.el.maquinaBotones.querySelector(`[data-id="${id}"]`);
      if (!estacion) { btn.disabled = true; btn.classList.remove('proceso-btn--activo'); return; }
      const activo = estacion.maquina.procesoActivo === id;
      btn.classList.toggle('proceso-btn--activo', activo);
      btn.disabled = estacion.maquina.estaOcupada() && !activo;
      if (!activo) {
        const relleno = btn.querySelector('.proceso-progreso-relleno');
        relleno.style.width = '0%';
      }
    });
  }

  actualizarProgresoProceso(idProceso, fraccion) {
    const btn = this.el.maquinaBotones.querySelector(`[data-id="${idProceso}"]`);
    if (!btn) return;
    btn.querySelector('.proceso-progreso-relleno').style.width = (fraccion * 100).toFixed(1) + '%';
  }

  // ── ZONA 1: FILA DE CLIENTES ──
  renderCola(cola, estaciones, onSeleccionar) {
    this.el.clientes.innerHTML = '';
    if (cola.length === 0) {
      this.el.clientes.innerHTML = '<p class="clientes-vacio">Esperando clientes… la campanilla sonará al llegar uno ☕</p>';
      return;
    }
    const asignados = new Set(estaciones.filter((e) => e.clienteId).map((e) => e.clienteId));
    cola.forEach((cliente) => {
      const card = document.createElement('button');
      card.type = 'button';
      const yaAsignado = asignados.has(cliente.id);
      card.className = 'cliente-card' + (yaAsignado ? ' cliente-card--asignado' : '');
      card.dataset.id = cliente.id;
      const pct = Math.round(cliente.fraccionPaciencia() * 100);
      const nivelPaciencia = pct < 25 ? 'critica' : pct < 55 ? 'media' : 'alta';
      card.innerHTML = `
        <span class="cliente-avatar" style="background:${cliente.colorAvatar}"><svg class="cliente-avatar-svg"><use href="#${cliente.avatarIcon}"></use></svg></span>
        <span class="cliente-info">
          <span class="cliente-nombre">${cliente.nombre}${yaAsignado ? ' <em>· en preparación</em>' : ''}</span>
          <span class="cliente-pedido"><svg class="cliente-pedido-icono"><use href="#${cliente.receta.icon}"></use></svg>${cliente.receta.nombre}</span>
          <span class="paciencia-barra"><span class="paciencia-barra-relleno paciencia--${nivelPaciencia}" style="width:${pct}%"></span></span>
        </span>
      `;
      card.addEventListener('click', () => onSeleccionar(cliente.id));
      this.el.clientes.appendChild(card);
    });
  }

  /** Actualiza SOLO el ancho de la barra de paciencia (llamado cada frame; ver nota en game.js). */
  actualizarPaciencias(cola) {
    cola.forEach((cliente) => {
      const card = this.el.clientes.querySelector(`.cliente-card[data-id="${cliente.id}"]`);
      if (!card) return;
      const relleno = card.querySelector('.paciencia-barra-relleno');
      if (!relleno) return;
      const pct = Math.round(cliente.fraccionPaciencia() * 100);
      const nivelPaciencia = pct < 25 ? 'critica' : pct < 55 ? 'media' : 'alta';
      relleno.style.width = pct + '%';
      relleno.className = `paciencia-barra-relleno paciencia--${nivelPaciencia}`;
    });
  }

  // ── ZONA 4: ESTACIONES DE PREPARACIÓN (hasta 3 en paralelo) ──

  /** Dibuja las 3 tarjetas de estación una sola vez; el contenido interno se refresca con actualizarEstacion(). */
  renderEstaciones(estaciones, callbacks) {
    this.el.estaciones.innerHTML = '';
    this._callbacksEstaciones = callbacks;
    estaciones.forEach((estacion) => {
      const card = document.createElement('div');
      card.className = 'estacion-card';
      card.dataset.id = estacion.id;
      card.innerHTML = `
        <div class="estacion-header">
          <span class="estacion-num">Estación ${estacion.id}</span>
          <span class="estacion-badge" id="estacion-badge-${estacion.id}"></span>
        </div>
        <div class="estacion-pedido" id="estacion-pedido-${estacion.id}"></div>
        <div class="estacion-adicionales-wrap" id="estacion-adicionales-wrap-${estacion.id}" hidden>
          <span class="estacion-adicionales-titulo">➕ Adicionales</span>
          <div class="estacion-adicionales" id="estacion-adicionales-${estacion.id}"></div>
        </div>
        <div class="taza-escenario taza-escenario--compacta">
          <div class="taza taza--chica">
            <div class="taza-cuerpo" id="estacion-capas-${estacion.id}"></div>
            <div class="taza-vacio-msg" id="estacion-vacio-${estacion.id}">Estación libre — elige un cliente</div>
            <div class="taza-asa"></div>
            <div class="taza-platillo"></div>
          </div>
        </div>
        <div class="pasos-chips" id="estacion-pasos-${estacion.id}"></div>
        <div class="estacion-acciones">
          <button type="button" class="btn-cs btn-cs--exito" id="estacion-servir-${estacion.id}" disabled>Servir ☕</button>
          <button type="button" class="btn-cs btn-cs--fantasma" id="estacion-vaciar-${estacion.id}" title="Vaciar ingredientes (mantiene el cliente)">🗑</button>
        </div>
      `;
      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return; // no robar el clic a Servir/Vaciar
        callbacks.onEnfocar(estacion.id);
      });
      this.el.estaciones.appendChild(card);

      card.querySelector(`#estacion-servir-${estacion.id}`).addEventListener('click', (e) => {
        e.stopPropagation();
        callbacks.onServir(estacion.id);
      });
      card.querySelector(`#estacion-vaciar-${estacion.id}`).addEventListener('click', (e) => {
        e.stopPropagation();
        callbacks.onVaciar(estacion.id);
      });
    });
  }

  /** Refresca el contenido de una tarjeta de estación (pedido, taza, badge, foco). */
  actualizarEstacion(estacion, enfocada) {
    const card = this.el.estaciones.querySelector(`.estacion-card[data-id="${estacion.id}"]`);
    if (!card) return;
    card.classList.toggle('estacion-card--enfocada', enfocada);
    card.classList.toggle('estacion-card--libre', !estacion.cliente);
    card.classList.toggle('estacion-card--ocupada', !!estacion.cliente);

    const badge = document.getElementById(`estacion-badge-${estacion.id}`);
    if (estacion.maquina.estaOcupada()) {
      badge.textContent = `⏳ ${NOMBRE_PROCESO[estacion.maquina.procesoActivo]}…`;
      badge.className = 'estacion-badge estacion-badge--activo';
    } else if (estacion.cliente) {
      badge.textContent = '● en preparación';
      badge.className = 'estacion-badge';
    } else {
      badge.textContent = '';
      badge.className = 'estacion-badge';
    }

    const pedidoEl = document.getElementById(`estacion-pedido-${estacion.id}`);
    pedidoEl.innerHTML = estacion.cliente
      ? `<span class="pedido-etiqueta">Pedido de ${estacion.cliente.nombre}</span>
         <span class="pedido-bebida"><svg class="pedido-bebida-icono"><use href="#${estacion.cliente.receta.icon}"></use></svg>${estacion.cliente.receta.nombre}</span>
         <span class="pedido-pasos">${estacion.cliente.receta.pasos.map((id) => INGREDIENTS[id].nombre).join(' → ')}</span>`
      : '<p class="pedido-vacio">Haz clic en un cliente de la fila para asignarlo aquí.</p>';

    // "Productos adicionales": solo los ingredientes de estante que pide
    // ESTA bebida (nada de máquina, eso lo cubre la Zona 2) — reemplaza la
    // vieja Estantería global de 8 botones fijos por algo contextual.
    const adicionalesWrap = document.getElementById(`estacion-adicionales-wrap-${estacion.id}`);
    const adicionalesEl = document.getElementById(`estacion-adicionales-${estacion.id}`);
    adicionalesEl.innerHTML = '';
    const idsAdicionales = estacion.cliente
      ? [...new Set(estacion.cliente.receta.pasos)].filter((id) => INGREDIENTS[id].origen === 'estante')
      : [];
    adicionalesWrap.hidden = idsAdicionales.length === 0;
    idsAdicionales.forEach((id) => {
      const def = INGREDIENTS[id];
      const yaAgregado = estacion.capas.includes(id);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ingrediente-btn ingrediente-btn--mini' + (yaAgregado ? ' ingrediente-btn--hecho' : '');
      btn.title = def.nombre;
      btn.innerHTML = `<svg class="ingrediente-icono"><use href="#${def.icon}"></use></svg><span class="ingrediente-nombre">${def.nombre}</span>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._callbacksEstaciones.onClicIngrediente(estacion.id, id);
      });
      adicionalesEl.appendChild(btn);
    });

    const tazaWrap = card.querySelector('.taza');
    tazaWrap.classList.toggle('taza--vacia', !estacion.cliente);
    document.getElementById(`estacion-vacio-${estacion.id}`).style.display = estacion.cliente ? 'none' : 'flex';

    const capasEl = document.getElementById(`estacion-capas-${estacion.id}`);
    capasEl.innerHTML = '';
    const pesoTotal = estacion.capas.reduce((acc, id) => {
      const def = INGREDIENTS[id];
      return acc + (def.capaTipo === 'capa' ? def.peso : 0);
    }, 0) || 1;
    estacion.capas.forEach((id) => {
      const def = INGREDIENTS[id];
      const capaEl = document.createElement('div');
      if (def.capaTipo === 'topping') {
        capaEl.className = 'taza-topping';
        capaEl.style.background = `repeating-linear-gradient(45deg, ${def.color}, ${def.color} 4px, transparent 4px, transparent 8px)`;
      } else {
        capaEl.className = 'taza-capa';
        capaEl.style.height = ((def.peso / pesoTotal) * 100).toFixed(1) + '%';
        capaEl.style.background = def.color;
      }
      capaEl.title = def.nombre;
      capasEl.appendChild(capaEl);
    });

    document.getElementById(`estacion-pasos-${estacion.id}`).innerHTML = estacion.capas.length
      ? estacion.capas.map((id) => `<span class="paso-chip">${INGREDIENTS[id].nombre}</span>`).join('')
      : '<span class="pasos-vacio">Sin ingredientes aún.</span>';

    document.getElementById(`estacion-servir-${estacion.id}`).disabled = !(estacion.cliente && estacion.capas.length > 0);
  }

  /** Texto flotante (+100, "¡Perfecto!", -50...) sobre la tarjeta de una estación. */
  mostrarFlotante(texto, tipo, idEstacion) {
    const card = this.el.estaciones.querySelector(`.estacion-card[data-id="${idEstacion}"]`) || this.el.flotantes;
    const rectRelativo = card === this.el.flotantes ? { left: 50, top: 50 } : this._posicionRelativa(card);
    const span = this._poolFlotantes.adquirir(() => {
      const el = document.createElement('span');
      el.addEventListener('animationend', () => this._poolFlotantes.liberar(el));
      return el;
    });
    span.className = '';
    span.textContent = texto;
    span.style.left = rectRelativo.left + '%';
    span.style.top = rectRelativo.top + '%';
    this.el.flotantes.appendChild(span);
    void span.offsetWidth; // fuerza reflow para que la animación reinicie en un nodo reciclado
    span.className = `flotante flotante--${tipo}`;
  }

  /** cantidad: 5 para "¡Perfecto!", 3 para "¡Muy rápido!" — refuerza visualmente los 3 tiers de puntaje. */
  mostrarEstrellas(idEstacion, cantidad = 5) {
    const card = this.el.estaciones.querySelector(`.estacion-card[data-id="${idEstacion}"]`);
    const pos = card ? this._posicionRelativa(card) : { left: 50, top: 40 };
    for (let i = 0; i < cantidad; i++) {
      const s = this._poolEstrellas.adquirir(() => {
        const el = document.createElement('span');
        el.textContent = '★';
        el.addEventListener('animationend', () => this._poolEstrellas.liberar(el));
        return el;
      });
      s.className = '';
      s.style.left = (pos.left + (Math.random() * 14 - 7)) + '%';
      s.style.top = (pos.top + (Math.random() * 8 - 4)) + '%';
      s.style.animationDelay = (Math.random() * 0.15) + 's';
      this.el.flotantes.appendChild(s);
      void s.offsetWidth; // fuerza reflow para que la animación reinicie en un nodo reciclado
      s.className = 'estrella-flotante';
    }
  }

  /** Posición de una tarjeta de estación como % del contenedor de flotantes (que cubre toda la Zona 4). */
  _posicionRelativa(card) {
    const cardRect = card.getBoundingClientRect();
    const contRect = this.el.flotantes.getBoundingClientRect();
    const left = ((cardRect.left + cardRect.width / 2 - contRect.left) / contRect.width) * 100;
    const top = ((cardRect.top + cardRect.height * 0.35 - contRect.top) / contRect.height) * 100;
    return { left: Math.min(95, Math.max(5, left)), top: Math.min(95, Math.max(5, top)) };
  }

  /**
   * Humo/vapor decorativo sobre la máquina mientras corre un proceso.
   * Variante por tipo: espresso (oscuro), fría (neblina que cae, leche_fria
   * no debería "humear" hacia arriba como un líquido caliente), el resto
   * (agua/leche caliente, espumado) usa el vapor blanco por defecto.
   */
  emitirVapor(idProceso) {
    const btn = this.el.maquinaBotones.querySelector(`[data-id="${idProceso}"]`);
    if (!btn) return;
    const variante = idProceso === 'espresso' ? 'espresso'
      : idProceso === 'leche_fria' ? 'fria'
      : 'vapor';
    const nube = this._poolVapor.adquirir(() => {
      const el = document.createElement('span');
      el.addEventListener('animationend', () => this._poolVapor.liberar(el));
      return el;
    });
    nube.className = '';
    btn.appendChild(nube);
    void nube.offsetWidth; // fuerza reflow para que la animación reinicie en un nodo reciclado
    nube.className = `vapor-nube vapor-nube--${variante}`;
  }

  /** Breve destello rojo en el borde de la tarjeta — bebida incorrecta o cliente perdido. */
  destellarError(idEstacion) {
    const card = this.el.estaciones.querySelector(`.estacion-card[data-id="${idEstacion}"]`);
    if (!card) return;
    card.classList.remove('estacion-card--error');
    void card.offsetWidth; // fuerza reflow para poder re-disparar la animación si ya estaba corriendo
    card.classList.add('estacion-card--error');
    card.addEventListener('animationend', () => card.classList.remove('estacion-card--error'), { once: true });
  }

  // ── HUD ──
  renderHUD(player) {
    this.el.hudNivel.textContent = player.nivel;
    this.el.hudNivelBarra.style.width = (player.progresoNivel() * 100).toFixed(1) + '%';
    this.el.hudDinero.textContent = '$' + player.dinero.toFixed(2);
    this.el.hudReputacion.textContent = Math.round(player.reputacion) + '%';
    this.el.hudFelices.textContent = player.clientesFelices;

    if (this._ultimoDinero !== null && player.dinero !== this._ultimoDinero) {
      this._animarTick(this.el.hudDinero, player.dinero > this._ultimoDinero);
    }
    if (this._ultimaReputacion !== null && player.reputacion !== this._ultimaReputacion) {
      this._animarTick(this.el.hudReputacion, player.reputacion > this._ultimaReputacion);
    }
    this._ultimoDinero = player.dinero;
    this._ultimaReputacion = player.reputacion;
  }

  /** Breve "tick" (pop + color) en un valor del HUD cuando cambia — verde si sube, rojo si baja. */
  _animarTick(el, subida) {
    el.classList.remove('hud-tick-sube', 'hud-tick-baja');
    void el.offsetWidth; // fuerza reflow para poder re-disparar si ya estaba animando
    el.classList.add(subida ? 'hud-tick-sube' : 'hud-tick-baja');
    el.addEventListener('animationend', () => el.classList.remove('hud-tick-sube', 'hud-tick-baja'), { once: true });
  }

  /**
   * "Tiempo restante" del HUD: la paciencia del cliente más urgente entre
   * la fila y las estaciones ocupadas — el reloj que de verdad importa
   * segundo a segundo mientras se juega.
   */
  renderTiempoRestante(cola, estaciones) {
    const clientesActivos = cola.concat(estaciones.filter((e) => e.cliente).map((e) => e.cliente));
    if (!clientesActivos.length) {
      this.el.hudTiempo.textContent = '--';
      this.el.hudTiempoWrap.classList.remove('hud-item--critico');
      return;
    }
    const msMinimo = Math.max(0, Math.min(...clientesActivos.map((c) => c.pacienciaRestanteMs)));
    this.el.hudTiempo.textContent = (msMinimo / 1000).toFixed(1) + 's';
    this.el.hudTiempoWrap.classList.toggle('hud-item--critico', msMinimo < 4000);
  }

  mostrarModalNivel(nivel, recetasNuevas) {
    const pacienciaS = Math.round(pacienciaParaNivel(nivel) / 1000);
    const avisoPaciencia = nivel >= 4
      ? `<p>⚠️ Solo ${pacienciaS}s de paciencia por cliente — este nivel es casi imposible. ¡Suerte, barista!</p>`
      : `<p>Ahora los clientes solo esperan ${pacienciaS}s.</p>`;
    this.el.modalNivelTexto.innerHTML = `
      <strong>¡Nivel ${nivel}!</strong>
      ${recetasNuevas.length ? '<p>Nuevas recetas disponibles: ' + recetasNuevas.map((r) => r.nombre).join(', ') + '</p>' : ''}
      ${avisoPaciencia}
    `;
    this.el.modalNivel.classList.add('modal--visible');
    clearTimeout(this._nivelTimeout);
    this._nivelTimeout = setTimeout(() => this.el.modalNivel.classList.remove('modal--visible'), 3200);
  }

  // ── RADIO ──
  actualizarRadio(reproduciendo, nombrePista) {
    this.el.radioEstado.textContent = reproduciendo ? 'Al aire' : 'Radio en pausa';
    this.el.radioPista.textContent = nombrePista || '';
    document.getElementById('btn-radio-play').textContent = reproduciendo ? '⏸' : '📻';
  }

  // ── FIN DE TURNO / TOP ──
  mostrarModalTurno(resumenTexto) {
    this.el.turnoResumen.textContent = resumenTexto;
    this.el.turnoMsg.textContent = '';
    this.el.modalTurno.classList.add('modal--visible');
  }
  ocultarModalTurno() { this.el.modalTurno.classList.remove('modal--visible'); }

  mostrarTop(lista) {
    this.el.topLista.innerHTML = lista.length
      ? lista.map((r) => `<li><span>${this._escapar(r.nombre)}</span><strong>${r.puntos} pts</strong></li>`).join('')
      : '<li class="top-vacio">Todavía no hay puntajes — ¡sé el primero!</li>';
    this.el.modalTop.classList.add('modal--visible');
  }
  ocultarTop() { this.el.modalTop.classList.remove('modal--visible'); }

  _escapar(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  /** Sacude brevemente un elemento (feedback de error). */
  sacudir(elemento) {
    if (!elemento) return;
    elemento.classList.remove('sacudida');
    void elemento.offsetWidth;
    elemento.classList.add('sacudida');
  }
}
