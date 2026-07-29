/**
 * radio.js
 * ─────────────────────────────────────────────────────────────────────────
 * "Maxi Barista Radio" — música de fondo mientras juegas.
 *
 * Por qué no viene con canciones reales: no puedo descargar ni incrustar
 * música de terceros sin verificar su licencia una por una (igual que pasó
 * con las fotos de los ingredientes — ver README). Así que RadioEngine
 * hace dos cosas:
 *
 *   1. Si hay archivos en `assets/audio/musica/` (ver PLAYLIST más abajo y
 *      el README de esa carpeta), los reproduce como una radio real con
 *      lista de canciones, avanzando automáticamente a la siguiente.
 *   2. Si no hay archivos (caso por defecto hoy), reproduce un loop
 *      ambiental lo-fi generado en vivo con la Web Audio API — acordes
 *      suaves tipo "café de jazz" + un leve "hiss" de vinilo — cero
 *      archivos, cero licencias, funciona igual por file://.
 *
 * El cambio de modo es automático: si un archivo de la lista falla al
 * cargar (404), esa pista se salta y sigue con la siguiente; si ninguna
 * carga, cae al generador ambiental sin que el jugador tenga que hacer nada.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Playlist real (opcional). Agrega tus propios archivos royalty-free en
 * assets/audio/musica/ con estos nombres — ver assets/audio/musica/README.txt
 * para la lista completa y de dónde conseguir música con licencia libre.
 */
const RADIO_PLAYLIST = [
  { archivo: 'assets/audio/musica/pista-1.mp3', nombre: 'Ziggy — Last Train to Nowhere' },
  { archivo: 'assets/audio/musica/pista-2.mp3', nombre: 'Brian Claxton — Apple of My Eye' },
  { archivo: 'assets/audio/musica/pista-3.mp3', nombre: 'Gil Kita — A Change for the Better' },
  { archivo: 'assets/audio/musica/pista-4.mp3', nombre: 'Brian Claxton — We Really Don\'t Know' },
  { archivo: 'assets/audio/musica/pista-5.mp3', nombre: 'Ziggy — Starlight Reflection' },
];

/** Progresión de acordes (frecuencias en Hz) del loop lo-fi generativo — ii-V-I-vi en Do, con séptimas. */
const RADIO_ACORDES = [
  [220.00, 261.63, 329.63, 392.00], // Am7   (A C E G)
  [196.00, 246.94, 293.66, 349.23], // Dm7   (D F A C, aprox voces)
  [261.63, 329.63, 392.00, 493.88], // Cmaj7 (C E G B)
  [246.94, 293.66, 349.23, 440.00], // G7ish (G Bb-ish D F -> aproximación suave)
];

class RadioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.reproduciendo = false;
    this.volumen = 0.35;
    this.modo = null; // 'archivo' | 'procedural'
    this.onCambioPista = null;

    this._audioEl = null;
    this._pistaIndex = -1;
    this._proceduralInterval = null;
    this._proceduralAcordeIdx = 0;
  }

  _asegurarContexto() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volumen;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setVolumen(v) {
    this.volumen = v;
    if (this.masterGain) this.masterGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.15);
    if (this._audioEl) this._audioEl.volume = v;
  }

  /** Alterna reproducir/pausar. Devuelve el nuevo estado (true = reproduciendo). */
  alternar() {
    if (this.reproduciendo) this.pausar(); else this.reproducir();
    return this.reproduciendo;
  }

  reproducir() {
    this._asegurarContexto();
    this.reproduciendo = true;
    if (RADIO_PLAYLIST.length) {
      this._intentarArchivo(0);
    } else {
      this._iniciarProcedural();
    }
  }

  pausar() {
    this.reproduciendo = false;
    if (this._audioEl) this._audioEl.pause();
    this._detenerProcedural();
    if (this.onCambioPista) this.onCambioPista('');
  }

  pistaActual() {
    if (this.modo === 'archivo' && this._pistaIndex >= 0) return RADIO_PLAYLIST[this._pistaIndex].nombre;
    if (this.modo === 'procedural') return 'Lo-fi Maxi Barista Radio (generativo)';
    return '';
  }

  // ── Modo archivo (playlist real, si el usuario agregó mp3) ──
  _intentarArchivo(index) {
    if (index >= RADIO_PLAYLIST.length) { this._iniciarProcedural(); return; }
    if (!this._audioEl) {
      this._audioEl = new Audio();
      this._audioEl.volume = this.volumen;
      this._audioEl.addEventListener('ended', () => this._intentarArchivo((this._pistaIndex + 1) % RADIO_PLAYLIST.length));
    }
    this._pistaIndex = index;
    this._audioEl.src = RADIO_PLAYLIST[index].archivo;
    this._audioEl.oncanplay = () => {
      this.modo = 'archivo';
      this._audioEl.play().catch(() => this._intentarArchivo(index + 1));
      if (this.onCambioPista) this.onCambioPista(this.pistaActual());
    };
    this._audioEl.onerror = () => this._intentarArchivo(index + 1);
  }

  // ── Modo procedural (loop lo-fi generado con Web Audio, sin archivos) ──
  _iniciarProcedural() {
    this.modo = 'procedural';
    if (this.onCambioPista) this.onCambioPista(this.pistaActual());
    this._tocarAcordeActual();
    this._proceduralInterval = setInterval(() => {
      this._proceduralAcordeIdx = (this._proceduralAcordeIdx + 1) % RADIO_ACORDES.length;
      this._tocarAcordeActual();
    }, 4200);
  }

  _detenerProcedural() {
    if (this._proceduralInterval) { clearInterval(this._proceduralInterval); this._proceduralInterval = null; }
  }

  /** Reproduce el acorde actual como un pad suave (varias notas con attack/release largo) + un toque de "hiss" de vinilo. */
  _tocarAcordeActual() {
    if (!this.reproduciendo || this.modo !== 'procedural') return;
    const t0 = this.ctx.currentTime;
    const duracion = 4.4;

    RADIO_ACORDES[this._proceduralAcordeIdx].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq / 2, t0); // una octava abajo, timbre más cálido de "café"
      osc.connect(gain).connect(this.masterGain);

      const pico = 0.09 / RADIO_ACORDES[this._proceduralAcordeIdx].length;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(pico, t0 + 1.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duracion);

      osc.start(t0);
      osc.stop(t0 + duracion + 0.1);
    });

    // "hiss" tenue de vinilo/radio — ruido filtrado muy suave, constante mientras dura el acorde.
    const muestras = this.ctx.sampleRate * duracion;
    const buffer = this.ctx.createBuffer(1, muestras, this.ctx.sampleRate);
    const datos = buffer.getChannelData(0);
    for (let i = 0; i < muestras; i++) datos[i] = (Math.random() * 2 - 1) * 0.5;
    const fuente = this.ctx.createBufferSource();
    fuente.buffer = buffer;
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = 'highpass';
    filtro.frequency.value = 6000;
    const gainHiss = this.ctx.createGain();
    gainHiss.gain.value = 0.012;
    fuente.connect(filtro).connect(gainHiss).connect(this.masterGain);
    fuente.start(t0);
    fuente.stop(t0 + duracion);
  }
}
