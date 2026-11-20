# Mis Inversiones — estado

PWA personal de Felipe (cuenta FelipeManrique). Seguimiento de inversiones que separa lo INGRESADO (capital) de lo que RINDEN los activos.
Creada 2026-11-19. **Publicada:** https://felipemanrique.github.io/mis-inversiones/ (repo público FelipeManrique/mis-inversiones, Pages desde main /). Push sin cambiar la cuenta activa: `GH_TOKEN="$(gh auth token -u FelipeManrique)"`. Preview local: puerto **8821** (`~/.claude/launch.json` → `mis-inversiones`). 8818 y 8820 los usan otras apps.

## Hecho (v1.2.0)
- [x] Cálculo puro en `calc.js` + `test/calc.test.js` (20 pruebas). Ganancia = valor actual − capital neto ingresado.
  Cada flujo se pasa a pesos con el dólar de SU fecha (ArgentinaDatos) y se guarda en 3 medidas: pesos, USD oficial, USD CCL.
  Compras sin ingreso cargado → cuentan como capital (implícito). Venta → ganancia realizada por costo promedio.
- [x] Titulares: cada movimiento es de una persona (`titular`) o compartido (`reparto` {id: %}). Personas por defecto
  «Yo» (M) y «Mi novia» (P), editables en Ajustes. Las partes suman el total (probado).
- [x] Pila de widgets arriba (como el Smart Stack de iOS): Total entre los dos · Lo mío · Lo de mi novia; deslizar ↕ cambia toda la app.
- [x] Precios cada 15/30/60 s mientras está abierta: data912 (CEDEAR, acciones, bonos, ON, letras, EE.UU.), Binance (cripto), dolarapi (oficial/MEP/CCL/cripto/blue). Todos con CORS directo, sin servidor.
  Bonos/ON/letras: precio cada 100 VN. Tickers D/C = cotizan en USD.
- [x] Activos: valor en $, USD oficial y USD CCL (más tenue), PPC, ganancia $ y USD, % del día, peso, minigráfico 30 días, destello al cambiar precio.
- [x] Resumen: capital invertido / valor actual / ganancia (desglose abiertas, realizadas, rentas, cambio), «Entre los dos», torta por tipo/activo, evolución diaria (se arma sola), ranking por rendimiento en USD.
- [x] Seguimiento: dólares + activos seguidos + tus activos; gráfico por activo con línea de tu precio promedio.
- [x] Carga por captura con Gemini (`gemini-flash-latest`, respaldo `-lite`), clave pegada en Ajustes. Antes de elegir las fotos la app pregunta de quién son (mías / de mi novia / compartidas 50-50). Revisión obligatoria antes de guardar.
- [x] Importar archivo: copia completa (reemplaza) o lote `{"app":"mis-inversiones","tipo":"movimientos","movs":[…]}` que se AGREGA (saltea ids repetidos, titular por id o por letra M/P, busca el dólar de cada fecha). Lo usa Claude para cargar la tanda inicial de capturas con M/P a mano (decisión 2026-11-19: las letras a mano son sólo para esa tanda).
- [x] Elegir fotos/archivos o bajar copia no dispara el bloqueo por PIN.
- [x] v1.5.0: rincón del dólar debajo del título (Oficial + USDT en vivo de Binance USDTARS, toca → Seguimiento). Seguimiento: 5 dólares con brecha, buscador con sugerencias en todos los mercados (data912 + cripto conocidas + probar cualquier símbolo en Binance), minigráficos. Logo «MI».
- [x] v1.4.0: ingreso en USD con «pesos que pagaste» (m.pesos): el capital cuenta los pesos reales. Importar archivo también ACTUALIZA movimientos con el mismo id (conserva su dólar).
- [x] Seguridad: CSP estricta (script/connect sólo a las APIs usadas), anti-iframe, `esc()` en todo.
  PIN de 4/6 dígitos que CIFRA los datos (AES-GCM 256, PBKDF2 600 000, igual que vault de Mis Finanzas), 5 intentos → espera creciente,
  bloqueo al salir (al instante / 1 / 5 min), contenido tapado en el selector de apps, con PIN no se guardan historiales ni cripto pedidas.
  Copias bajadas cifradas con contraseña (≥ 8); restaurar acepta cifradas y viejas en claro. La clave de Gemini nunca va en la copia.
- [x] Publicada y verificada 2026-11-19: precios y dólar por fecha desde el dominio público, SW + offline OK.
- [x] v1.6.0: entrar con Google + copia cifrada automática en Drive (drive.appdata), igual que Mis Finanzas. Reusa el cliente OAuth, el intermediario Apps Script y la página de retorno de mis-finanzas (sin cambios en GCP; la pantalla de Google dice «Mis Finanzas»). Archivos `mis-inversiones.enc.json` + diarias `mis-inversiones-AAAA-MM-DD.enc.json` (60 días); no tocan los de Mis Finanzas (`finanzas*`, `mf-fm*`). Contraseña de copias ≥ 8, clave en IndexedDB `mis-inversiones` (CryptoKey no exportable). Sube 2,5 s después de cada cambio; la foto diaria del valor, como mucho cada 30 min. Probado con Google/Drive simulados: subir cifrado, recuperar en teléfono nuevo, contraseña incorrecta.
- [x] v1.7.0: fondo continuo bajo la barra de estado como Mis Finanzas (aurora fija + banda que se funde, sin línea). Apariencia: vidrio transparente↔esmerilado (--glass-tint) y letra grande (--ui-zoom). Personas: nombre + color (paleta + rueda del sistema); se quitaron las letras M/P de la interfaz (siguen sólo para importar lotes viejos). Detalle de cada activo: «Dueño y cartera» con desplegables que cambian todos sus movimientos. Carteras con dueña (compartida / de X); un movimiento nuevo toma la dueña de la cartera elegida.
- [x] v1.7.1: fondo de cada tarjeta de activo con el color de su dueño; si es de los dos, degradé con el corte en la proporción real (por cantidad).
- [x] v1.7.2: tarjetas de activos sólo con el color del dueño (sin nombres, pedido de Felipe).
- [x] v1.8.0: Ajustes es una pantalla propia (vista `ajustes`, botón ‹ volver a la pestaña anterior), como en Mis Finanzas; no se redibuja sola con cada precio.
- [x] v1.9.0: color de acento elegible (paleta + rueda; vacío = naranja original) que tiñe botones, pestañas, panel Total, aurora y candado. Tarjetas de activos: división vertical izquierda→derecha con el color de cada dueño en su proporción (--tinte 22 % claro / 30 % oscuro). Activos en dólares (cripto, exterior): sólo «US$ oficial», sin repetir el valor.
- [x] v2.0.0: Face ID. Llave de acceso del iPhone (WebAuthn, rpId = host) con extensión PRF: el secreto PRF cifra el PIN (AES-GCM) en `mis-inversiones:faceid`; al abrir, Face ID → PIN → datos. Botón en la pantalla del PIN + intento automático; si falla, PIN. Se borra al cambiar o quitar el PIN. Necesita iOS 18+. NO probado con una cara real: en el navegador de Claude se probó hasta «Confirmá tu PIN» (seguir crearía una llave real en la Mac) y la pantalla con Face ID simulado.
- [x] Ojito en la barra: tapa (blur) montos, cantidades, ganancias y precio promedio; precios y cotizaciones quedan visibles. Preferencia en `mis-inversiones:ocultar`.
- [x] Tarjetas: «PPC» (Felipe prefiere la sigla), cantidad debajo de los dólares con la sigla del activo («0.0065 BTC», «3 SPY», «VN» en bonos), sin la cartera.
- [x] v2.0.1: barra de estado del iPhone (theme-color) = fondo real de la app, se actualiza al cambiar Claro/Oscuro/Automático y antes del PIN. Antes seguía el modo del teléfono → franja negra si la app estaba en Claro. Pendiente confirmar en el iPhone que iOS la repinta en vivo.
- [x] v2.1.0: barra de estado como Mis Finanzas (se dejan las dos meta theme-color con su media y se les cambia el color según el tema; borde de arriba del fondo = color de la barra, también en la pantalla del PIN). Confirmación propia (hoja) antes de cualquier borrado o reemplazo; borrar cartera muestra cuántos movimientos tiene y a dónde van, doble toque y Deshacer. Nueva herramienta «Mover movimientos entre carteras» (tildar, «De capturas», Deshacer). Archivo `tipo: restaurar-cartera` {cartera:{id,nombre}, ids:[…]} que recrea una cartera y le devuelve esos movimientos sin tocar nada más.
- [x] v2.1.1: el SW pide con `cache: no-cache` (GitHub Pages manda `max-age=600`: sin esto el iPhone seguía con la versión vieja hasta 10 min). Borde superior de la pantalla del PIN = color de la barra (fundido largo como Mis Finanzas).
- [x] v2.2.0: en «Dueño y cartera» de cada activo, «La parte de cada uno, a su cartera»: mueve los movimientos de cada persona a la cartera elegida; los compartidos se dividen en uno por persona (`id-persona`, cantidades/montos × su %), con confirmación y Deshacer. «Mover movimientos» filtra por persona (para llevar los ingresos de cada uno). Ajustes muestra la versión y «Buscar actualización» (update del SW + borra cachés + recarga).
- [x] v2.3.0: aurora visible otra vez (el `html {background}` de la v1.7 la tapaba: ahora como Mis Finanzas, sin fondo en html) y con 4 manchas derivadas de --accent. Meta color-scheme que acompaña al tema. Confirmado por Felipe: iOS NO repinta la franja de estado en vivo (sólo al abrir).
- [x] v2.4.0: al cambiar Claro/Oscuro/Automático en la app instalada, reinicio rápido (fundido 0,18 s) que vuelve a Ajustes; con PIN no lo vuelve a pedir: la CryptoKey del PIN se guarda 15 s en IndexedDB `mis-inversiones-sesion` y se borra al usarse (un reinicio común sí pide PIN; probado).
- [x] v2.5.0: Ajustes es la 5.ª pestaña de la isla de abajo (como Mis Finanzas); en esa vista se oculta la barra superior (`body[data-vista=ajustes]`) y el título grande queda primero bajo la hora. Sin ruedita arriba ni flecha de volver.
- [x] v2.6.0: Ajustes con el formato de Mis Finanzas (filas compactas agrupadas: desplegables para Apariencia/Actualizar/Bloquear, interruptores para Letra grande/PIN/Face ID; tarjetas para color de acento, cada persona y API Gemini; Gemini va al final arriba de Versión; «Nueva cartera»). Isla: + al principio (a pedido), pestañas Activos·Resumen·Seguir·Historial·Ajustes. Cambio de tema con velo del color nuevo y aparición suave. Avisos con tinte del acento.
- [x] v2.7.0: activos compartidos con mezcla orgánica (base con transición ancha ±20 % + corrientes radiales de cada color que cruzan la frontera + remolino de la mezcla; posiciones derivadas de un hash de la clave del activo, estables; centro en la proporción real).
- [x] v2.7.1: flechitas ⌃⌄ en los desplegables de Ajustes (como Mis Finanzas). El color de acento se guarda también sin cifrar (`mis-inversiones:acento`, como el tema) para que la pantalla del PIN salga con tu color.
- [x] v2.8.0: ícono nuevo de Claude Design (monograma «MI» de vidrio + flecha), versión OSCURA elegida por Felipe (azul marino, letras naranjas) en todos los tamaños; maskable oscuro hecho del SVG con scale 1.0. Manifest background/theme #0B1630. iOS no deja Liquid Glass animado ni ícono claro/oscuro automático para web apps (sólo nativas). El paquete original está en ~/Downloads/mis-inversiones-icono.zip.
- [x] v2.8.1: cambios de tarjetas de arriba + flechitas ⌃⌄ en «Deslizá el panel».
- [x] v2.8.2: «Probar clave» consulta la lista de modelos (instantáneo, sin cuota, tope 8 s) en vez de generar texto (tardaba por el «thinking» y no tenía límite).
- [x] Probado: tests de Node, check-shell, offline en Chrome real, 375 px claro/oscuro, PIN (activar/quitar/cambiar/fallos).

## Pendiente
- [ ] Probar la lectura con las capturas reales de Felipe (necesita su clave de Gemini).
- [ ] Movimiento «compra de dólares» (pesos → USD) y transferencias entre carteras.

## Decisiones
- Dólar = SIEMPRE el oficial (v1.3.0, pedido 2026-11-19): ingresos, compras y ventas al oficial DE SU FECHA (ArgentinaDatos, guardado en m.fx); valuación al oficial de hoy. Un USD ingresado vale 1 USD oficial y si queda quieto no gana ni pierde. Antes se mezclaban MEP/cripto/CCL y eso inventaba ±5 %. Activos en USD (cripto, exterior, bonos D) muestran sus pesos al oficial y abajo «en dólares». CCL sólo como lectura tenue.
- Carga inicial: Claude lee capturas desde el chat y arma un lote JSON que se importa (el archivo queda FUERA del repo, en ~/Documents). Nunca poner montos ni tenencias reales en este repo público.
- Sin precio en vivo → se muestra al costo (ni gana ni pierde) y se avisa.
- Números: punto decimal y espacio angosto de miles, como Mis Finanzas.
- No es asesoramiento financiero: sólo organiza.
