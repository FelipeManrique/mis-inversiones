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
- [x] v1.4.0: ingreso en USD con «pesos que pagaste» (m.pesos): el capital cuenta los pesos reales. Importar archivo también ACTUALIZA movimientos con el mismo id (conserva su dólar).
- [x] Seguridad: CSP estricta (script/connect sólo a las APIs usadas), anti-iframe, `esc()` en todo.
  PIN de 4/6 dígitos que CIFRA los datos (AES-GCM 256, PBKDF2 600 000, igual que vault de Mis Finanzas), 5 intentos → espera creciente,
  bloqueo al salir (al instante / 1 / 5 min), contenido tapado en el selector de apps, con PIN no se guardan historiales ni cripto pedidas.
  Copias bajadas cifradas con contraseña (≥ 8); restaurar acepta cifradas y viejas en claro. La clave de Gemini nunca va en la copia.
- [x] Publicada y verificada 2026-11-19: precios y dólar por fecha desde el dominio público, SW + offline OK.
- [x] Probado: tests de Node, check-shell, offline en Chrome real, 375 px claro/oscuro, PIN (activar/quitar/cambiar/fallos).

## Pendiente
- [ ] Probar la lectura con las capturas reales de Felipe (necesita su clave de Gemini).
- [ ] Copia automática cifrada a Google Drive como Mis Finanzas (necesita redirect OAuth nuevo en GCP mis-finanzas-511004 + backend).
- [ ] Desbloqueo con Face ID (WebAuthn PRF) — opcional.
- [ ] Movimiento «compra de dólares» (pesos → USD) y transferencias entre carteras.

## Decisiones
- Dólar = SIEMPRE el oficial (v1.3.0, pedido 2026-11-19): ingresos, compras y ventas al oficial DE SU FECHA (ArgentinaDatos, guardado en m.fx); valuación al oficial de hoy. Un USD ingresado vale 1 USD oficial y si queda quieto no gana ni pierde. Antes se mezclaban MEP/cripto/CCL y eso inventaba ±5 %. Activos en USD (cripto, exterior, bonos D) muestran sus pesos al oficial y abajo «en dólares». CCL sólo como lectura tenue.
- Carga inicial: Claude lee capturas desde el chat y arma un lote JSON que se importa (el archivo queda FUERA del repo, en ~/Documents). Nunca poner montos ni tenencias reales en este repo público.
- Sin precio en vivo → se muestra al costo (ni gana ni pierde) y se avisa.
- Números: punto decimal y espacio angosto de miles, como Mis Finanzas.
- No es asesoramiento financiero: sólo organiza.
