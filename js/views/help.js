import { state, APP_VERSION } from "../state.js";
import { icon } from "../utils/icons.js";
import { escapeHtml } from "../utils/helpers.js";
import { openPrintOverlay } from "../utils/print.js";

// Guide content is defined once and reused for both the in-app view and the printable version.
function guideSections() {
  return [
    {
      title: "¿Qué es esta app?",
      html: `
        <p><strong>Spare Part Inventory</strong> es un inventario de repuestos industriales que funciona
        <strong>100% sin internet</strong>. Todos los datos se guardan en tu propio teléfono o computadora
        (no hay nube ni servidor), por lo que puedes usarla en planta aunque no haya señal.</p>
        <p>Su característica central es el campo <strong>"Usado en"</strong>: cada repuesto puede asociarse a uno
        o varios equipos/sistemas (CHAMBER #1, DEGASSING #2, CRO SYSTEM, etc.). Así puedes responder al instante
        preguntas como <em>"¿qué repuestos tengo para el DEGASSING #2?"</em>.</p>
      `,
    },
    {
      title: "Instalar la app en tu teléfono",
      html: `
        <p><strong>iPhone (Safari):</strong></p>
        <ol>
          <li>Abre la dirección de la app en Safari.</li>
          <li>Toca el botón <strong>Compartir</strong> (cuadro con flecha hacia arriba).</li>
          <li>Elige <strong>"Agregar a pantalla de inicio"</strong> y confirma.</li>
        </ol>
        <p><strong>Android (Chrome):</strong></p>
        <ol>
          <li>Abre la dirección de la app en Chrome.</li>
          <li>Toca el menú <strong>⋮</strong> (tres puntos).</li>
          <li>Elige <strong>"Instalar app"</strong> o <strong>"Agregar a pantalla de inicio"</strong>.</li>
        </ol>
        <p>Después de instalarla, la app abre a pantalla completa como una app nativa y funciona sin conexión.</p>
      `,
    },
    {
      title: "Conceptos clave",
      html: `
        <ul>
          <li><strong>Número de parte (N° Parte):</strong> el código único del repuesto (ej. 32ZP74). No puede repetirse.</li>
          <li><strong>Cantidad actual (Stock):</strong> cuántas unidades hay físicamente.</li>
          <li><strong>Cantidad mínima (Reorden):</strong> el umbral de reposición. Cuando el stock es
            <strong>menor o igual</strong> a este número, el repuesto aparece automáticamente en la lista de
            <strong>Reorden</strong> con etiqueta roja.</li>
          <li><strong>Crítico:</strong> repuesto con stock en cero.</li>
          <li><strong>Usado en:</strong> los equipos/sistemas donde se utiliza el repuesto. Un repuesto puede estar en varios.</li>
          <li><strong>Lead time:</strong> días que tarda el proveedor en entregar.</li>
          <li><strong>P/N equivalentes:</strong> números de parte alternos y datos de contacto del proveedor.</li>
        </ul>
      `,
    },
    {
      title: "Pantalla: Inicio (Dashboard)",
      html: `
        <p>Resumen general del inventario:</p>
        <ul>
          <li><strong>Tarjetas superiores:</strong> total de repuestos, cuántos necesitan reorden y cuántos están críticos (sin stock). Tócalas para ir a la lista correspondiente.</li>
          <li><strong>Resumen por equipo:</strong> cuántos repuestos tiene asignado cada sistema. Toca una fila para ver esos repuestos.</li>
          <li><strong>Por categoría:</strong> distribución del inventario por tipo (Fuses, Couplings, etc.).</li>
          <li><strong>Necesitan reorden:</strong> acceso rápido a los repuestos bajo mínimo.</li>
          <li><strong>Actividad reciente:</strong> últimos movimientos de stock con fecha y nota.</li>
        </ul>
      `,
    },
    {
      title: "Pantalla: Repuestos",
      html: `
        <p>La lista completa del inventario.</p>
        <ul>
          <li><strong>Buscar:</strong> escribe número de parte, descripción o fabricante.</li>
          <li><strong>Filtros:</strong> por equipo ("mostrar solo lo de CHAMBER #1"), por estado (solo reorden / OK) y por categoría.</li>
          <li><strong>Ordenar:</strong> por número de parte, stock (menor/mayor) o actualizado reciente.</li>
          <li><strong>Ajuste rápido de stock:</strong> usa los botones <strong>−</strong> y <strong>+</strong> junto a la cantidad
            para descontar o sumar una unidad sin abrir el repuesto. Cada ajuste queda registrado en el historial.</li>
          <li><strong>Nuevo:</strong> botón azul para crear un repuesto.</li>
          <li>En computadora puedes alternar entre vista de <strong>tarjetas</strong> y <strong>tabla</strong> con el botón junto a "Nuevo".</li>
          <li>Toca cualquier repuesto para ver y editar todos sus datos.</li>
        </ul>
      `,
    },
    {
      title: "Pantalla: Detalle del repuesto",
      html: `
        <p>Aquí editas toda la información: datos generales, foto, existencias, equipos donde se usa, proveedor y notas.</p>
        <ul>
          <li><strong>Foto:</strong> toca "Agregar foto" para tomar una con la cámara o elegirla de la galería.
            La imagen se guarda en el dispositivo y aparece como miniatura en la lista.</li>
          <li><strong>Usado en:</strong> marca las casillas de todos los equipos donde aplica el repuesto.</li>
          <li><strong>Nota de ajuste:</strong> si cambias la cantidad, puedes escribir el motivo (ej. "consumido en
            mantenimiento") y quedará en el historial.</li>
          <li><strong>Historial de cantidad:</strong> al final se listan todos los movimientos de stock con fecha.</li>
          <li><strong>Duplicar:</strong> crea una copia del repuesto (útil para variantes); solo asigna el nuevo número de parte.</li>
          <li><strong>Eliminar:</strong> el botón rojo con basurero. Si te equivocas, tienes unos segundos para tocar
            <strong>"Deshacer"</strong> en el aviso que aparece abajo.</li>
        </ul>
      `,
    },
    {
      title: "Pantalla: Por Equipo",
      html: `
        <p>Selecciona un equipo o sistema y verás todos los repuestos asociados a él. Es la vista ideal antes de un
        mantenimiento: <em>"¿qué repuestos necesito tener a mano para DEGASSING #2?"</em></p>
        <p>El botón <strong>Imprimir</strong> genera una lista imprimible del equipo (también puedes guardarla como PDF
        desde el diálogo de impresión del sistema).</p>
      `,
    },
    {
      title: "Pantalla: Reorden",
      html: `
        <p>Muestra automáticamente todos los repuestos cuyo stock está en o por debajo del mínimo, con la información
        del proveedor, números de parte equivalentes y tiempo de entrega.</p>
        <ol>
          <li>Revisa/ajusta la <strong>cantidad a pedir</strong> sugerida en cada tarjeta.</li>
          <li>Toca <strong>"Generar orden de compra"</strong>.</li>
          <li>Se abre un documento dentro de la app; toca <strong>"Imprimir / PDF"</strong> para imprimirlo o guardarlo como PDF.</li>
        </ol>
        <p>El número rojo sobre la pestaña <strong>Reorden</strong> indica cuántos repuestos están pendientes de reposición.</p>
      `,
    },
    {
      title: "Importar desde Excel",
      html: `
        <p>En <strong>Importar</strong> puedes cargar tu inventario existente desde un archivo <code>.xlsx</code>.
        Las columnas deben estar organizadas así:</p>
        <ul>
          <li><strong>B</strong> = Número de parte (obligatoria; si está vacía, la fila se ignora)</li>
          <li><strong>C</strong> = Descripción · <strong>D</strong> = Fabricante · <strong>E</strong> = Modelo/Serie</li>
          <li><strong>F</strong> = Cantidad · <strong>G</strong> = Cantidad mínima</li>
          <li><strong>I</strong> o <strong>AA</strong> = Lead time (días)</li>
          <li><strong>J a Y</strong> = una columna por equipo (en el mismo orden que la lista de equipos en Ajustes).
            Escribe <strong>X</strong> en la celda para marcar que el repuesto se usa en ese equipo.</li>
          <li><strong>Z</strong> = Proveedor / P/N equivalentes · <strong>AB</strong> = Ubicación de almacenamiento</li>
        </ul>
        <p>Si un número de parte ya existe, se <strong>actualiza</strong>; si no, se crea. Nada se borra al importar Excel.</p>
      `,
    },
    {
      title: "Respaldos y sincronizar entre dispositivos",
      html: `
        <p>Como los datos viven solo en tu dispositivo, haz respaldos periódicos:</p>
        <ul>
          <li><strong>Exportar JSON:</strong> descarga un archivo con TODO (repuestos, historial, equipos, categorías y ajustes). Es el respaldo completo.</li>
          <li><strong>Compartir JSON:</strong> envía ese mismo archivo por AirDrop, WhatsApp, correo, etc. a otro teléfono o persona.</li>
          <li><strong>Importar JSON:</strong> en el otro dispositivo, abre la app → Importar → "Importar desde JSON" y elige el archivo.
            Puedes <strong>reemplazar todo</strong> (deja el dispositivo idéntico al respaldo) o <strong>combinar</strong> con lo existente.</li>
          <li><strong>Exportar Excel:</strong> genera un <code>.xlsx</code> del inventario para compartir con quien no use la app.</li>
          <li><strong>Exportar PDF:</strong> documento imprimible del inventario completo.</li>
        </ul>
        <p><strong>Recomendación:</strong> exporta un JSON al final de cada semana o después de cambios grandes.</p>
      `,
    },
    {
      title: "Ajustes",
      html: `
        <ul>
          <li><strong>Nombre de la empresa:</strong> aparece en la barra superior y en los documentos impresos.</li>
          <li><strong>Tema:</strong> claro, oscuro o automático según el sistema. También puedes alternar con el botón de luna/sol arriba a la derecha.</li>
          <li><strong>Equipos / Sistemas:</strong> agrega, renombra, reordena (flechas ↑↓) o elimina equipos de la lista "Usado en".
            Si renombras un equipo, los repuestos se actualizan solos; si lo eliminas, se quita de los repuestos que lo tenían.</li>
          <li><strong>Categorías:</strong> igual que los equipos, pero para el catálogo de categorías.</li>
          <li><strong>Restablecer datos:</strong> borra todo y vuelve al estado inicial. Exporta un JSON antes si quieres conservar algo.</li>
        </ul>
      `,
    },
    {
      title: "Preguntas frecuentes",
      html: `
        <p><strong>¿Necesito internet?</strong> No. Después de abrir la app por primera vez, todo funciona sin conexión.</p>
        <p><strong>¿Dónde están mis datos?</strong> En el almacenamiento local del navegador de tu dispositivo (IndexedDB). Nadie más puede verlos.</p>
        <p><strong>¿Qué pasa si borro la app o los datos de Safari/Chrome?</strong> Se pierden los datos del dispositivo. Por eso conviene exportar el JSON regularmente.</p>
        <p><strong>¿Cómo paso mis datos a un teléfono nuevo?</strong> Exportar JSON en el viejo → Compartir → Importar JSON en el nuevo (opción "Reemplazar todo").</p>
        <p><strong>Eliminé un repuesto por error.</strong> Toca "Deshacer" en el aviso inferior antes de que desaparezca. Si ya pasó, recupéralo importando tu último respaldo JSON (modo combinar).</p>
        <p><strong>¿Por qué la impresión abre dentro de la app?</strong> Es a propósito: en modo app instalada (iOS) las ventanas emergentes no funcionan, así que los documentos se muestran dentro y de ahí se imprimen o guardan como PDF.</p>
        <p><strong>¿Cómo se actualiza la app?</strong> Cuando hay una versión nueva, aparece un aviso "Recargar". Tus datos no se tocan al actualizar.</p>
      `,
    },
  ];
}

export async function render(root) {
  const sections = guideSections();
  root.innerHTML = `
    <div class="flex items-center justify-between" style="margin-bottom:14px;">
      <span class="text-sm muted">Guía de uso · v${APP_VERSION}</span>
      <button class="btn btn-sm" id="btn-print-guide">${icon("print", { size: 15 })} Imprimir guía</button>
    </div>
    ${sections
      .map(
        (s, i) => `
      <div class="card card-pad mb-16 help-section">
        <h3>${i + 1}. ${escapeHtml(s.title)}</h3>
        ${s.html}
      </div>
    `
      )
      .join("")}
  `;

  root.querySelector("#btn-print-guide").addEventListener("click", () => {
    openPrintOverlay({
      title: "Guía de uso",
      bodyHtml: `
        <h1>Guía de uso — ${escapeHtml(state.companyName)}</h1>
        <div class="print-meta">Spare Part Inventory v${APP_VERSION} · Generada ${new Date().toLocaleDateString("es")}</div>
        ${sections.map((s, i) => `<div class="help-section" style="margin-bottom:16px;"><h3 style="font-size:14px;margin:14px 0 6px;">${i + 1}. ${escapeHtml(s.title)}</h3>${s.html}</div>`).join("")}
      `,
    });
  });
}
