# Spare Part Inventory

PWA de inventario de repuestos industriales — instalable en iPhone/Android,
100% offline, sin backend ni nube. Vanilla JS (ES modules) + IndexedDB +
Service Worker.

## Características

- **Usado en**: cada repuesto se asocia a múltiples equipos/sistemas (multiselect).
- Dashboard con totales, repuestos críticos y resumen por equipo.
- Lista de repuestos con búsqueda y filtros (equipo, estado, categoría).
- Vista "Por Equipo" para ver qué repuestos necesita cada sistema, con impresión.
- Lista de reorden con generación de orden de compra imprimible.
- Importación desde Excel (.xlsx) y JSON, exportación a Excel/JSON/PDF.
- Ajustes: nombre de instalación, equipos, categorías, tema claro/oscuro, reset.
- Impresión y PDF siempre como overlay dentro de la app (sin `window.open`,
  compatible con modo PWA standalone de iOS).

## Uso local

Sirve el directorio con cualquier servidor estático (debe ser HTTP(S), no
`file://`, para que IndexedDB y el Service Worker funcionen):

```bash
python3 -m http.server 8080
```

Abre `http://localhost:8080/index.html`.

## Instalación como app

- **iPhone (Safari)**: abrir la URL → botón Compartir → "Agregar a pantalla de inicio".
- **Android (Chrome)**: abrir la URL → menú → "Instalar app" / "Agregar a pantalla de inicio".

## Estructura

```
index.html          Shell de la app
manifest.json        Manifest PWA
sw.js                 Service Worker (cache offline-first)
css/styles.css        Sistema de diseño (claro/oscuro)
js/db.js              Acceso a IndexedDB
js/state.js           Estado de la app y ajustes
js/router.js           Router SPA basado en hash
js/seed.js             Datos y catálogos iniciales
js/components/         Navegación, modal, toast
js/views/               Pantallas: dashboard, repuestos, detalle, por equipo,
                         reorden, importar/exportar, ajustes
vendor/xlsx.full.min.js SheetJS vendorizado (import/export Excel offline)
icons/                  Íconos PWA (192, 512, maskable, apple-touch-icon)
```

Todos los datos se guardan localmente en el dispositivo (IndexedDB). Usa
"Exportar JSON" / "Compartir JSON" en Ajustes para respaldar o sincronizar
manualmente entre dispositivos.
