# Manual de uso — Spare Part Inventory

> Inventario de repuestos industriales · 100% offline · v2.0
>
> Esta misma guía está disponible dentro de la app en la pestaña **Ayuda**
> (en el teléfono: botón **Más → Ayuda**), donde también puede imprimirse.

---

## 1. ¿Qué es esta app?

**Spare Part Inventory** es un inventario de repuestos industriales que funciona
**100% sin internet**. Todos los datos se guardan en tu propio teléfono o
computadora (no hay nube ni servidor), por lo que puedes usarla en planta aunque
no haya señal.

Su característica central es el campo **"Usado en"**: cada repuesto puede
asociarse a uno o varios equipos/sistemas (CHAMBER #1, DEGASSING #2, CRO SYSTEM,
etc.). Así puedes responder al instante preguntas como *"¿qué repuestos tengo
para el DEGASSING #2?"*.

## 2. Instalar la app en tu teléfono

**iPhone (Safari):**

1. Abre la dirección de la app en Safari.
2. Toca el botón **Compartir** (cuadro con flecha hacia arriba).
3. Elige **"Agregar a pantalla de inicio"** y confirma.

**Android (Chrome):**

1. Abre la dirección de la app en Chrome.
2. Toca el menú **⋮** (tres puntos).
3. Elige **"Instalar app"** o **"Agregar a pantalla de inicio"**.

Después de instalarla, la app abre a pantalla completa como una app nativa y
funciona sin conexión.

## 3. Conceptos clave

| Concepto | Significado |
|---|---|
| **Número de parte** | Código único del repuesto (ej. `32ZP74`). No puede repetirse. |
| **Cantidad actual (Stock)** | Unidades físicas disponibles. |
| **Cantidad mínima (Reorden)** | Umbral de reposición. Si el stock es **menor o igual** a este número, el repuesto entra automáticamente a la lista de **Reorden**. |
| **Crítico** | Repuesto con stock en cero. |
| **Usado en** | Equipos/sistemas donde se utiliza el repuesto (puede ser más de uno). |
| **Lead time** | Días que tarda el proveedor en entregar. |
| **P/N equivalentes** | Números de parte alternos y contacto del proveedor. |

## 4. Pantalla: Inicio (Dashboard)

- **Tarjetas superiores:** total de repuestos, cuántos necesitan reorden y
  cuántos están críticos (sin stock). Tócalas para ir a la lista correspondiente.
- **Resumen por equipo:** cuántos repuestos tiene asignado cada sistema; toca
  una fila para verlos.
- **Por categoría:** distribución del inventario por tipo (Fuses, Couplings…).
- **Necesitan reorden:** acceso rápido a los repuestos bajo mínimo.
- **Actividad reciente:** últimos movimientos de stock con fecha y nota.

## 5. Pantalla: Repuestos

- **Buscar** por número de parte, descripción o fabricante.
- **Filtros** por equipo, por estado (solo reorden / OK) y por categoría.
- **Ordenar** por número de parte, stock (menor/mayor) o actualizado reciente.
- **Ajuste rápido de stock:** botones **−** y **+** junto a la cantidad para
  descontar o sumar una unidad sin abrir el repuesto. Cada ajuste queda en el
  historial.
- **Nuevo:** botón azul para crear un repuesto.
- En computadora se puede alternar entre vista de **tarjetas** y **tabla**.
- Toca cualquier repuesto para ver y editar todos sus datos.

## 6. Pantalla: Detalle del repuesto

- **Foto:** toca "Agregar foto" para tomarla con la cámara o elegirla de la
  galería. Se guarda en el dispositivo y aparece como miniatura en la lista.
- **Usado en:** marca las casillas de todos los equipos donde aplica.
- **Nota de ajuste:** al cambiar la cantidad puedes anotar el motivo
  (ej. "consumido en mantenimiento"); queda en el historial.
- **Historial de cantidad:** todos los movimientos de stock con fecha.
- **Duplicar:** crea una copia del repuesto (útil para variantes); solo asigna
  el nuevo número de parte.
- **Eliminar:** botón rojo. Si te equivocas, toca **"Deshacer"** en el aviso
  inferior antes de que desaparezca.

## 7. Pantalla: Por Equipo

Selecciona un equipo y verás todos los repuestos asociados. Ideal antes de un
mantenimiento: *"¿qué repuestos necesito para DEGASSING #2?"*. El botón
**Imprimir** genera una lista imprimible (o PDF) del equipo.

## 8. Pantalla: Reorden

Lista automática de los repuestos en o por debajo del mínimo, con proveedor,
equivalentes y lead time.

1. Revisa/ajusta la **cantidad a pedir** de cada tarjeta.
2. Toca **"Generar orden de compra"**.
3. Se abre el documento dentro de la app; toca **"Imprimir / PDF"**.

El número rojo sobre la pestaña **Reorden** indica cuántos repuestos están
pendientes de reposición.

## 9. Importar desde Excel

En **Importar** puedes cargar tu inventario desde un archivo `.xlsx` con estas
columnas:

| Columna | Contenido |
|---|---|
| **B** | Número de parte (obligatoria; fila ignorada si está vacía) |
| **C** | Descripción |
| **D** | Fabricante |
| **E** | Modelo / Serie |
| **F** | Cantidad |
| **G** | Cantidad mínima |
| **I** o **AA** | Lead time (días) |
| **J–Y** | Una columna por equipo, en el mismo orden que la lista de equipos en Ajustes. Escribe **X** para marcar "usado en". |
| **Z** | Proveedor / P/N equivalentes |
| **AB** | Ubicación de almacenamiento |

Si un número de parte ya existe se **actualiza**; si no, se crea. Importar
Excel nunca borra repuestos.

## 10. Respaldos y sincronización entre dispositivos

Los datos viven solo en tu dispositivo; haz respaldos periódicos:

- **Exportar JSON:** respaldo completo (repuestos, historial, equipos,
  categorías y ajustes).
- **Compartir JSON:** envía el respaldo por AirDrop, WhatsApp, correo, etc.
- **Importar JSON:** en el otro dispositivo, Importar → "Importar desde JSON".
  Puedes **reemplazar todo** o **combinar** con lo existente.
- **Exportar Excel:** genera un `.xlsx` para quien no use la app.
- **Exportar PDF:** documento imprimible del inventario completo.

**Recomendación:** exporta un JSON al final de cada semana o después de
cambios grandes.

## 11. Ajustes

- **Nombre de la empresa:** aparece en la barra superior y en los impresos.
- **Tema:** claro, oscuro o automático (también con el botón luna/sol).
- **Equipos / Sistemas:** agrega, renombra, reordena (↑↓) o elimina. Renombrar
  actualiza los repuestos automáticamente; eliminar quita el equipo de los
  repuestos que lo tenían.
- **Categorías:** se gestionan igual que los equipos.
- **Restablecer datos:** borra todo y vuelve al estado inicial. Exporta un
  JSON antes si quieres conservar algo.

## 12. Preguntas frecuentes

**¿Necesito internet?**
No. Tras abrir la app por primera vez, todo funciona sin conexión.

**¿Dónde están mis datos?**
En el almacenamiento local del navegador del dispositivo (IndexedDB). Nadie
más puede verlos.

**¿Qué pasa si borro la app o los datos del navegador?**
Se pierden los datos de ese dispositivo. Por eso conviene exportar el JSON
regularmente.

**¿Cómo paso mis datos a un teléfono nuevo?**
Exportar JSON en el viejo → Compartir → Importar JSON en el nuevo (opción
"Reemplazar todo").

**Eliminé un repuesto por error.**
Toca "Deshacer" en el aviso inferior antes de que desaparezca. Si ya pasó,
recupéralo importando tu último respaldo JSON (modo combinar).

**¿Por qué la impresión abre dentro de la app?**
Es a propósito: en modo app instalada (iOS) las ventanas emergentes no
funcionan, así que los documentos se muestran dentro de la app y desde ahí se
imprimen o guardan como PDF.

**¿Cómo se actualiza la app?**
Cuando hay versión nueva aparece un aviso "Recargar". Tus datos no se tocan.
