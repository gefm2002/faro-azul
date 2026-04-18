# Structura — Propuesta para Faro Azul (Federico)

**Structura** · [structura.com.ar](https://structura.com.ar)  
Gastón Fernández

---

Hola Federico,

Te dejo por acá, en claro, **qué se entrega** y **bajo qué cifras** dejamos la **herramienta de catálogo** para **Faro Azul** (enriquecimiento de listas por ISBN / EAN, salida con **las 31 columnas fijas** de su plantilla de carga, apoyada en el catálogo de SBS para completar ficha, textos, tapas, etc. **En operación, el uso de la app es pleno, sin tope** de inicios, exportaciones ni carga, salvo otra lógica que acepten (p. ej. un **login único** a nombre de Faro) — se define al cerrar. Cualquier **cambio grande, nuevo feature, otra integración, otra estructura de import o fuente de datos** (librerías, otras plataformas, reglas) se **cita aparte**.

---

## Qué hace a nivel alcance (el entregable, paso a paso)

- **Carga de datos:** acepta archivos con renglones (CSV / hoja) o un listado con un ISBN por línea. El sistema toma un **número fijo de 31 columnas** de salida, **sin nombres ni estructura parametrizable**: siempre el mismo set y el mismo orden, alineado a su plantilla.

- **Detección del código:** se reconoce el ISBN aunque venga con guiones, texto alrededor o títulos de columna distintos (EAN, código de barras, MPN, etc.); se intenta con separadores y formatos de export típicos (incl. planillas en español).

- **Proceso:** a partir de cada código válido, se consultan los datos de **SBS/VTEX**; se arma el registro. Se puede **parar, reanudar o interrumpir** el lote. En la grilla y el detalle se ve el **estado** (ok o no encontrado en SBS) y, cuando no haya título, **sigue en pie** lo que la planilla haya aportado.

- **Criterios de salida (reglas de negocio de la carga):** en las columnas que, en su plantilla, ustedes marcan *no aplica* / completar en oficina, el archivo **se deja en blanco** si no vino dato; **el texto de Descripción pasa a ser el mismo** que la ficha compuesta, una vez armada la compuesta, para un solo criterio de texto. Donde aplica, **título y datos usados al armar la ficha** vienen de catálogo, pero en las celdas “suyas” lo que no está en su import, **queda vacío** para ustedes.

- **Imágenes:** búsqueda de tapa según el producto, guardado en el entorno de trabajo del navegador y posibilidad de bajar un **archivo con las tapas** junto con el listado, en el uso productivo con ustedes.

- **Uso y acceso (operación / producción):** **sin tope** de inicios, descargas, pausas, etc. Un **login** o esquema de acceso a acordar (frecuente: **un solo usuario a nombre de Faro**). Sin costo fijo de “soporte” o “licencia” en el paquete. Más usuarios u otro esquema, **a cotizar**.

---

## Por qué sirve

Agilizan carga, reducen tipeo, estandarizan su export con la plantilla, y bajan riesgo de **reprocesos** por datos mal tomados, si controlan muestreo antes del import a tienda.

---

## Plata — desarrollo

**USD 300** el desarrollo, con **alojamiento incluido** a cargo de **Structura** por un **año** desde la puesta en marcha. Año siguiente: **renovación del alojamiento a definirse**; con tiempo se vuelve a fijar **por escrito** con ustedes, a tiempo, sin sorpresas a último minuto.

**USD 250** el mismo desarrollo si el **alojamiento lo alojan y pagan ustedes** (donde prefieran) — es la cifra **sin** alojamiento a nuestro cargo.

Si acomoda en **cuotas**: a convenir, por ejemplo **hasta 6 pagos mensuales** (u otra tanda) que **sumen** el total elegido (**300** o **250** según paquete). Al cerrar, dejamos **fijo** total, monto y fechas, por mail, sin sorpresas. Otro plan de pago, lo hablamos.

Nada de abono fijo de **mantenimiento** incluido. Lo **nuevo** o lo que salga de este canasto (otras **fuentes**, otras **integraciones**, otras reglas) **se cotiza aparte**, cada tanda, como corresponde.

**Dominio propio (opcional, aparte de las cifras de arriba):** en la zona de unos **$8.500** (cambia un poco según registrador; si **Structura** lo toma, se ajusta con comprobante o cierre, como hablemos con ustedes).

---

## Hosting y dominio (resumen, si lo llevan ustedes)

- **Alojamiento a cargo nuestro:** ya abarcado en el esquema de **USD 300** para el **primer** año, tal como se dijo.  
- **Alojamiento a cargo de Faro:** ustedes eligen proveedor, DNS y cierre, y solo figura el **250** del desarrollo.  
- **Dominio:** pago a parte o cargo separado, como indiquen.

---

## Para arrancar de verdad

Aceptan **cifra y modalidad** (**300** con alojamiento un año, o **250** con alojamiento a cargo de Faro), y si va **dominio a parte**, cómo. **Primer pago o primera cuota** según lo que hayamos fijado por escrito, y con eso arrancamos pruebas y cierre. Al **cierre** **entregamos** **código, documentación y accesos** (o publicación, si aplica), como haya quedado acordado.

**Plan de pago** fijado por mail o hoja **antes** del arranque: **total, cuotas** (si aplica) y vencimientos, para que quede claro a ambos lados.

---

## De tu lado (sin papeleos)

Archivos, decisiones, una persona que mire la **prueba** (grilla, export) y diga “publicamos / corregimos” lo que fuese, y criterio de negocio si algo no cierra. Todo por **correo o el canal que acomode**.

---

## Qué queda afuera (por ahora, salvo otra boca y otra cifra)

**Fuera** de lo que este documento y el cierre por mail fijen: otras **fuentes o integraciones** distintas de SBS, **% por volumen** u ofertas de cobro raras que no estuvieron en la mesa, **campañas, mailers** y criterios ajenos a enriquecer listas. **Cambio grande, nuevo módulo o criterio nuevo** = **a cotizar** (como al inicio del documento), salvo otra cifra aceptada por **ambos lados** por **escrito**.

---

## Plazos

Tirando bien, **entre 2 y 4 días hábiles** desde pago/arranque, con lo material listo y criterio de acceso aceptado, **según haya quedado**: carga publicada, o entrega de paquetes para que ustedes desplieguen.

---

## Qué se lleva Faro al final

- La **herramienta** puesta, acceso, y **código o repositorio** o lo acordado para no quedarse atrapado en un solo dispositivo.  
- Criterio claro (este doc + lo fijen por mail) de qué entra, qué queda a parte y a qué precio, si aplica, lo que salga de este canasto.

---

## Contacto

**Structura** — [structura.com.ar](https://structura.com.ar)  
Gastón Fernández  

Si te cierra, avisame en los próximos días y seguimos por el canal que prefieras.  
Un abrazo,  

Gastón
