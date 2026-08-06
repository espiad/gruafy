# gruafy — Situaciones de prueba

Guion de testeo manual. Marcá cada caso: ✅ pasa · ❌ falla · ⏭️ no aplica.

**Cuentas necesarias:** un cliente, una grúa (proveedor) y el admin. Lo más cómodo es
abrir la app normal + una **ventana incógnito** para tener dos sesiones a la vez.

> ⚠️ **Mercado Pago está en PRODUCCIÓN: los pagos son con plata real.**
> El anticipo del viaje más corto (1 km) es ~$8.071. Después podés reembolsarlo
> desde el panel de admin (y de paso probás el reembolso, caso **F3**).

---

## A. Camino feliz (el que mostrás en la defensa)

| # | Situación | Qué tiene que pasar |
|---|---|---|
| A1 | Cliente pide una grúa: carga vehículo, saca la foto, marca origen y destino (1–3 km), acepta los checkboxes | La orden se crea y queda "Buscando tu grúa" con cuenta regresiva |
| A2 | La grúa (disponible) espera el pedido | Suena el aviso, vibra y aparece la oferta |
| A3 | La grúa mira la oferta | Ve **zona** (no la dirección exacta), destino, distancia, monto y **la foto de la situación** |
| A4 | La grúa toca "Ver foto" | La foto se abre en grande |
| A5 | La grúa elige conductor y acepta | El cliente pasa a "esperando pago" **solo** (sin apretar F5) |
| A6 | Cliente mira quién lo va a asistir | Ve nombre de la empresa, reputación, patente y (si cargaste foto) la cara del conductor |
| A7 | Cliente paga por Mercado Pago | Vuelve solo a la app y la orden queda **pagada** |
| A8 | Grúa avanza: Voy → Llegué → Cargué → En camino → Entregué → Finalizar | Cada paso se refleja en la pantalla del cliente **solo**, con aviso sonoro |
| A9 | Cliente durante el viaje | Ve el mapa en vivo con el **isotipo de gruafy** (no un camión) |
| A10 | Cliente al finalizar | Ve: resumen → **reseña** → comprobantes + guía del seguro (plegados) |
| A11 | Cliente deja la reseña ⭐ | Queda guardada y se ve reflejada |

---

## B. Plata y adicionales (lo más sensible)

| # | Situación | Qué tiene que pasar |
|---|---|---|
| B1 | Mirar el presupuesto antes de pedir | Aparece el **TOTAL del servicio** bien grande, además del desglose |
| B2 | La grúa carga un adicional de **peaje** | Solo deja montos dentro del rango permitido |
| B3 | La grúa intenta cargar un peaje **fuera del rango** (ej: $999.999) | Lo **rechaza** con un mensaje claro |
| B4 | La grúa carga más peajes que el tope (más de 5) | Lo **rechaza** al llegar al tope |
| B5 | Después de cargar un adicional | El **total sube** en la liquidación, tanto del lado del cliente como de la grúa |
| B6 | La grúa intenta cargar un adicional **con el servicio ya finalizado** | Lo **rechaza**: "el servicio ya está cerrado" |
| B7 | Admin cambia un precio en Configuración y mirás el simulador público | El simulador muestra el **precio nuevo** (antes ignoraba la config) |

---

## C. Seguridad y casos límite (intentá romperlo)

| # | Situación | Qué tiene que pasar |
|---|---|---|
| C1 | Con un auxilio en curso, intentá pedir **otro** (o tocá "Pedir" dos veces rápido) | Lo **bloquea**: "Ya tenés un auxilio en curso" |
| C2 | Dejá pasar los 2 minutos sin que nadie acepte | Queda "No encontramos grúa" y **no se cobró nada** |
| C3 | Una grúa acepta y el cliente **no paga** en 10 minutos | La reserva se libera sola (pago vencido) |
| C4 | Cliente cancela mientras busca grúa | Se cancela sin costo |
| C5 | Cliente cancela **en la pantalla de pago** (antes de pagar) | Se libera la grúa, sin costo |
| C6 | Copiá el link de "compartir seguimiento" y abrilo **sin estar logueado** | Muestra el mapa y el estado, **sin datos personales** |
| C7 | Abrí ese mismo link cuando el servicio ya terminó | Dice "Este servicio ya finalizó", **sin mostrar ubicaciones** |
| C8 | Como grúa, antes de que el cliente pague | **No** ves la dirección exacta ni el teléfono del cliente |
| C9 | Botón de **emergencia 911** | Pide confirmación antes de llamar (no marca de un toque) |

---

## D. Grúa que tiene mala reputación

| # | Situación | Qué tiene que pasar |
|---|---|---|
| D1 | Que acepte una grúa con **2★ o menos** (bajale la puntuación desde el admin para probar) | Aparece el aviso de reputación baja |
| D2 | Tocar **"Ver reseñas"** | Se abre el pop-up con las reseñas y se puede cerrar |
| D3 | Tocar **"Buscar otra grúa"** → confirmar | Vuelve a buscar y **esa grúa ya no recibe la oferta** |
| D4 | Que no haya ninguna otra grúa disponible | Se la vuelve a ofrecer (mejor eso que quedarte sin grúa) |
| D5 | Tocar el botón de pagar directamente | Continúa normal con esa grúa |

---

## E. Conductores y documentación (lo nuevo)

| # | Situación | Qué tiene que pasar |
|---|---|---|
| E1 | Entrar al panel de la grúa con documentación incompleta | Aparece el **aviso con cuenta regresiva** y el detalle de qué falta por conductor |
| E2 | Intentar ponerse **Disponible** sin ningún conductor con nombre y teléfono | Lo bloquea con mensaje claro |
| E3 | Ponerse disponible con la documentación incompleta (pero con nombre y teléfono) | **Deja operar** — solo avisa |
| E4 | Tocar "Foto del conductor" | Aparece el instructivo de 3 pasos y después abre la cámara |
| E5 | Subir la foto | Queda "cargada · en revisión" y el cliente la ve al asignarse |
| E6 | Subir una **licencia muy pesada** (foto de celular) | Sube igual (se comprime) y muestra "Subiendo… no cierres esta pantalla" |
| E7 | Completar todo (DNI + licencia + foto) | El aviso **desaparece** |
| E8 | Agregar un conductor sin teléfono | Lo **rechaza**: el teléfono es obligatorio |

---

## F. Panel de administración

| # | Situación | Qué tiene que pasar |
|---|---|---|
| F1 | Aprobar una grúa nueva | Se aprueban **todos** sus documentos de una y se le fija el plazo |
| F2 | En una grúa ya aprobada, mirar los botones | Solo ofrece **Suspender** (no "Rechazar") |
| F3 | **Reembolsar** el pago de la corrida | Se acredita en Mercado Pago y la orden queda reembolsada |
| F4 | Editar razón social / CUIT / teléfono de una grúa | Se guarda |
| F5 | Editar un **conductor** y una **grúa** (patente) | Se guardan |
| F6 | Cambiar la **contraseña** de un usuario | Se cambia y el usuario puede entrar con la nueva |
| F7 | Corregir el **email de acceso** de un usuario | Se cambia y puede entrar con el nuevo |
| F8 | Botones de **WhatsApp / Llamar** al proveedor | Abren con el mensaje ya escrito |
| F9 | Dar de alta una grúa y mirar la lista sin apretar F5 | Aparece sola |
| F10 | Mirar una grúa con documentación incompleta | Muestra si está **en plazo** o **vencida** |

---

## G. Cuenta y acceso

| # | Situación | Qué tiene que pasar |
|---|---|---|
| G1 | Crear cuenta de **cliente con Google** | Entra y le pide completar nombre, teléfono y **DNI** (una vez) |
| G2 | Crear cuenta de **grúa con Google** | Llega al alta de proveedor (⚠️ esto estaba roto, es importante probarlo) |
| G3 | Crear cuenta con email y contraseña | Funciona (la confirmación por mail está desactivada) |
| G4 | Un cliente intenta entrar a `/admin` o `/proveedor` | Lo redirige, no lo deja |
| G5 | Cerrar sesión y volver a entrar | Todo sigue en su lugar |

---

## H. Mobile (probá TODO el camino feliz desde el celular)

| # | Situación | Qué tiene que pasar |
|---|---|---|
| H1 | Recorrer la landing | Nada se corta ni se va de ancho; se ve el botón "Ingresar" |
| H2 | Hacer el pedido completo | El mapa, la cámara y los formularios funcionan bien con el pulgar |
| H3 | Aviso de **instalar la app** | Aparece y funciona ("Agregar a inicio") |
| H4 | Activar **notificaciones** | Primero explica, después pide el permiso del sistema |
| H5 | Con la app abierta y un cambio de estado | **Suena** y vibra |
| H6 | Cerrar el aviso de notificaciones con la ✕ y buscarlo de nuevo | Se puede volver a activar (no es una única chance) |

---

## Cómo reportarme un fallo

Anotá: **número del caso** (ej. B3) + **qué esperabas** + **qué pasó** + captura si podés.
Con eso lo reproduzco y lo arreglo.
