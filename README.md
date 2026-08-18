# ☕ Maxi Barista — Juego (Beta)

> **Repo de trabajo, separado de la página web.** Este repositorio nació
> como copia independiente de `paginaweb/CoffeeShop/` (extraída el
> 2026-07-29) para iterar el juego sin tocar el sitio en vivo.
>
> **Actualizado 2026-08-17:** Coffee App fue reconstruida como SPA
> React/Vite en el repo hermano `CoffeeAPP`. La copia "en vivo" del juego
> ya no está en `paginaweb/CoffeeShop/` (esa carpeta se retiró y quedó
> respaldada en `paginaweb/Backup/coffee-legacy-2026-08-17/CoffeeShop/`) —
> ahora vive en `CoffeeAPP/public/game/`, y se publica dentro de
> `paginaweb/coffee-app/game/` vía `npm run deploy:web` (ver
> `CoffeeAPP/DEPLOYMENT.md`). Cuando el juego esté listo acá, hay que
> copiar los archivos actualizados a `CoffeeAPP/public/game/` (y correr de
> nuevo la migración/Edge Function de Supabase si cambiaron) y luego
> publicar desde ese repo. Los repos NO se sincronizan solos.

Simulador de barista en HTML5 + CSS3 + JavaScript ES6 puro. Sin frameworks,
sin build step, sin dependencias externas — abre `index.html` directamente
en el navegador y funciona. Dentro de Coffee App vive incrustado como
pestaña "Juego" vía `<iframe>` (ver nota arriba).

## Cómo jugar

1. Clientes llegan a la fila (Zona 1) y hacen un pedido. Haz clic en una
   tarjeta para asignarlo a una **estación libre** (Zona 4) — tienes
   **3 estaciones en paralelo**, así que puedes atender varios pedidos a
   la vez sin esperar a que termine el anterior.
2. Prepara los ingredientes en el **orden exacto** que pide la receta:
   - Los de la **Estantería** (Zona 3) se agregan al instante.
   - Los de la **Máquina de Espresso** (Zona 2, *opcional* — solo la
     necesitan espresso/agua/leche caliente-fría-espumada) tardan unos
     segundos. La máquina actúa sobre la **estación enfocada** (la última
     que tocaste) y cada estación tiene su propio temporizador — puedes
     dejar un espresso brewing en la Estación 1 y seguir trabajando en la
     Estación 2 mientras tanto.
3. Cada ingrediente agregado aparece como una capa en la taza de esa estación.
4. Haz clic en **Servir** en la tarjeta de la estación. Si el orden y los
   ingredientes coinciden con la receta, ganas dinero, experiencia y
   reputación. Si te equivocas, o si el cliente se queda sin paciencia y se
   va, pierdes puntos y reputación.
5. Sube de nivel para desbloquear recetas más difíciles.
6. Cuando quieras, dale a **🏁 Finalizar turno** para enviar tu puntaje al
   TOP global (nombre + correo, opcional — puedes omitirlo).

## Arquitectura

```
CoffeeShop/
├── index.html          Estructura de las 4 zonas + sprite SVG de íconos
├── css/
│   ├── style.css        Reset, paleta, layout general, HUD, modales
│   ├── game.css          Estilos de cada zona (clientes, máquina, estaciones)
│   └── animations.css    Todos los @keyframes
├── js/
│   ├── recipes.js        Datos: INGREDIENTS + RECIPES (única fuente de verdad)
│   ├── scoring.js         Fórmulas puras de puntaje/reputación (sin DOM, testeadas)
│   ├── audio.js            AudioEngine — efectos sintetizados (Web Audio API)
│   ├── radio.js              RadioEngine — música de fondo (ver sección Radio)
│   ├── leaderboard.js         Leaderboard — TOP global vía Supabase REST
│   ├── player.js                Player — nivel/xp/dinero/reputación/estadísticas
│   ├── save.js                    SaveManager — localStorage
│   ├── inventory.js                 Inventory — qué ingredientes están desbloqueados
│   ├── machine.js                     EspressoMachine — 1 proceso a la vez POR ESTACIÓN
│   ├── customers.js                     CustomerManager — spawn, paciencia, dificultad
│   ├── ui.js                               UIController — único módulo que toca el DOM
│   │                                        (usa ElementPool interno para reciclar los
│   │                                        <span> de VFX en vez de crear/destruir)
│   └── game.js                               Game — orquestador, estaciones, reglas
├── assets/
│   └── audio/musica/       README con instrucciones para agregar radio real
├── docs/qa/                Plan de QA (clasificación por sistema, casos de borde)
└── tests/                  Suite Vitest — ver sección "Tests" abajo
```

**Solo en este repo de trabajo, NO se copian a `paginaweb/CoffeeShop/`:**
`package.json`, `package-lock.json`, `vitest.config.js`, `tests/`, `docs/`,
`.gitignore`, `skills-lock.json`, `.claude/` — son herramientas de desarrollo
(tests, skills de Claude Code), no parte del juego que se sirve al jugador.

**Por qué scripts clásicos y no ES6 modules:** los navegadores bloquean
`import`/`export` bajo el protocolo `file://` por CORS. Como el requisito es
"debe funcionar simplemente abriendo el archivo HTML", todos los módulos se
cargan como `<script>` clásicos en orden de dependencia y usan `class` de
ES6 normalmente — solo se evita la sintaxis `import`/`export`.

**Estaciones en paralelo (`game.js`):** en vez de una sola taza/cliente
activo, `Game.estaciones` es un arreglo de 3 puestos de trabajo, cada uno
con su **propia instancia de `EspressoMachine`**. Eso es lo que permite que
dos espressos se extraigan al mismo tiempo en estaciones distintas — nada
está bloqueado globalmente, cada estación es independiente. Los botones de
la Zona 2 actúan sobre `estacionEnfocadaId` (la última estación en la que
hiciste clic); las demás estaciones siguen su proceso en segundo plano y lo
muestran con un badge ("⏳ Preparando Espresso…") en su propia tarjeta.

**Por qué no hay archivos de audio de efectos:** `audio.js` sintetiza cada
efecto (máquina, vapor, caja registradora, clientes, campanilla) con
osciladores y ruido filtrado de la Web Audio API en tiempo real. Cero
dependencias, cero licencias que revisar, funciona offline.

**Por qué no hay imágenes/íconos como archivos:** todos los íconos (16
ingredientes + máquina) son un sprite `<svg><symbol>` inline en
`index.html`, referenciado con `<use>`.

## Radio de la cafetería (`radio.js`)

Botón 📻 en el header. Por defecto reproduce un **loop ambiental lo-fi
generado en vivo** (acordes suaves + un leve "hiss" de vinilo, Web Audio
API) — cero archivos, cero licencias. Si agregas tus propios MP3 royalty-free
en `assets/audio/musica/` (ver el README de esa carpeta), la radio los
detecta solos y reproduce una playlist real en su lugar, sin tocar código.
No pude descargar música de terceros por ti — mismo motivo que las fotos de
los ingredientes: no puedo verificar la licencia de cada pista.

## TOP global (`leaderboard.js` + `supabase/coffee_shop_puntajes.sql`)

Al finalizar un turno, el jugador puede enviar nombre + correo + puntaje al
TOP. Usa el mismo proyecto Supabase que el resto del sitio, llamando a la
REST API directo con `fetch()` (sin el SDK `supabase-js`, para que el juego
siga siendo autocontenido). **Requiere correr la migración
`supabase/coffee_shop_puntajes.sql` una vez** en el SQL Editor de Supabase
— hasta entonces, enviar/ver el TOP falla de forma controlada (mensaje
"Intenta más tarde") y el resto del juego sigue funcionando normal.

El INSERT es público (cualquiera puede enviar su puntaje, igual que el
formulario de suscripción del Comparador de Precios); la LECTURA del TOP
pasa por una función `SECURITY DEFINER` que solo expone nombre/puntos/nivel
— el correo nunca es legible desde el cliente, ni siquiera indirectamente.

## Incrustado en Coffee App

`Coffee.html` tiene una 4ª pestaña "☕ Juego (Beta)" que muestra este juego
dentro de un `<iframe>` (carga perezosa: el `src` solo se asigna la primera
vez que se abre esa pestaña). El botón "⛶ Pantalla completa" usa la
Fullscreen API sobre el contenedor del iframe — el juego se ve a tamaño
normal por defecto, y solo se expande si el usuario lo pide.

## Reglas de puntuación implementadas

| Evento | Puntos |
|---|---|
| Bebida correcta | +100 |
| Bebida correcta y servida en ≤10s | +150 (reemplaza el +100, "¡Perfecto!") |
| Bebida correcta y servida en ≤16s (sin llegar a "perfecto") | +50 extra |
| Cliente con >50% de paciencia al servir | +20 ("cliente feliz") |
| Bebida incorrecta | −50 |
| Cada ingrediente/posición que no coincide con la receta | −30 adicional |
| Cliente se va sin ser atendido | −100 |

El dinero se gana por el precio de cada receta (`recipes.js`); la
experiencia por el campo `xp` de cada receta. Subir de nivel desbloquea
recetas de mayor `tier` (1 → 2 → 3 → 4, según la dificultad pedida).

## Tests

`recipes.js`, `scoring.js`, `player.js`, `machine.js`, `customers.js`,
`save.js` e `inventory.js` tienen suite de tests con
[Vitest](https://vitest.dev) + jsdom (62 tests). Estos 7 archivos cargan
como `<script>` clásico en el navegador (sin cambios), pero además exponen
un `module.exports` guardado (`if (typeof module !== 'undefined') ...`) solo
para que los tests puedan importarlos en Node — no afecta la carga real del
juego.

```bash
npm install   # una vez
npm test      # corre toda la suite
```

`game.js` y `ui.js` no tienen tests unitarios propios — están acoplados al
DOM/otros motores (audio, UI) a propósito, y se verifican jugando (ver
`docs/qa/qa-plan-maxi-barista-2026-07-29.md` para el detalle de qué se
prueba manual vs. automático, y por qué).

## Publicar en la página web (`paginaweb`)

Este repo **no se sincroniza solo** con `paginaweb/CoffeeShop/` (el sitio en
vivo). Para publicar cambios:

1. Copiar los archivos del juego (NO la lista de "solo en este repo" de
   arriba) a `paginaweb/CoffeeShop/`.
2. Si se tocó `leaderboard.js` o algo de Supabase, correr la migración/Edge
   Function correspondiente de nuevo.
3. Confirmar en el navegador que `paginaweb/CoffeeShop/index.html` carga sin
   errores antes de hacer commit.
4. `git add` + `commit` + `push` **dentro del repo `paginaweb`** (Vercel
   redespliega automáticamente al hacer push) — esto afecta el sitio en
   vivo, así que se confirma explícitamente cada vez, no es un paso
   automático.

## Estado actual vs. futuras versiones

Implementado y jugable hoy: las 16 bebidas de la tabla de referencia, 3
estaciones de preparación en paralelo, máquina de espresso opcional con
procesos cronometrados y animados por estación, clientes con paciencia e IA
de pedidos por dificultad, sistema de puntos/dinero/xp/nivel, sonido
sintetizado, radio de fondo (generativa + soporte para playlist real),
TOP global vía Supabase, incrustado en Coffee App con pantalla completa
opcional, guardado automático en `localStorage`.

Lo que el enunciado pide **preparar la arquitectura** para, sin implementar
todavía:

- **Más de 50 recetas** → agregar objetos a `RECIPES` en `recipes.js`.
- **Modo historia / distintas cafeterías** → `Game` ya está separado de
  `UIController`; una nueva "escena" solo necesitaría otro `index.html` que
  reutilice los mismos módulos `js/`.
- **Desafíos diarios / eventos aleatorios (hora pico, VIP, inspección)** →
  `CustomerManager._generarCliente()` es el único punto que decide qué
  cliente aparece; ahí se conectaría un modificador de evento.
- **Logros y medallas** → `Player` ya centraliza todas las estadísticas
  (`clientesFelices`, `pedidosAtendidos`, `record`...); falta solo una
  clase `Achievements` que las observe.
- **Tienda (máquinas, tazas, decoración)** → `Player.desbloqueos` e
  `Inventory.desbloquear()` ya existen como ganchos vacíos.
- **Más de 3 estaciones / ayudantes-baristas** → `NUM_ESTACIONES` en
  `game.js` es una sola constante; subirla ya agrega más puestos en
  paralelo automáticamente (la UI y la lógica ya son genéricas por N).
- **Gestión de inventario con reposición** → `Inventory` es la clase
  designada para eso; hoy todo está desbloqueado/ilimitado a propósito.
- **Estadísticas detalladas** → todos los eventos ya pasan por `Player`,
  solo falta una vista que los liste con más detalle.
- **Libro de recetas / modo aprendizaje** → `RECIPES` ya trae `pasos`
  ordenados y `INGREDIENTS` ya trae nombres — es contenido, no arquitectura.
- **Español/inglés** → todos los textos visibles están centralizados en
  `ui.js` y `recipes.js`, así que agregar un diccionario bilingüe es mecánico.
- **Responsive** → mejorado: en modo compacto (`<700px` de ancho) las 3
  estaciones son un carrusel horizontal (una tarjeta a la vez, como la fila
  de clientes) en vez de apiladas, y los botones del HUD tienen mínimo
  táctil de 44px. En un celular común (375×812) el auto-escalado de
  pantalla bajó de 0.67 a 0.87 — sigue sin llegar a escala 1.0 exacta
  porque el HUD (`flex-wrap`) todavía envuelve a varias líneas en ese
  ancho; reorganizar qué se muestra ahí en compacto es el siguiente paso
  pendiente.
