# Faro Azul — Herramienta de catálogo (SBS)

Aplicación para **enriquecer un listado de libros** a partir del **código de barras (ISBN / EAN)**. Consulta el catálogo público de SBS, arma un CSV con **más de treinta columnas** listo para importar, y te permite **guardar las tapas** en tu navegador y bajarlas en un ZIP.

---

## Qué podés hacer

- **Subir un archivo** con muchos productos: CSV (Excel, Google Sheets, etc.) o un texto con un código por línea.
- **Reconocer el código** aunque venga con guiones, la palabra “ISBN” o en columnas con nombres distintos (EAN, Código de barras, MPN, etc.).
- **Completar datos** desde el catálogo en línea: título, editorial, descripción, categoría, precio, imagen de tapa, ficha (autor, páginas, edad, encuadernación, etc.) cuando el libro esté publicado.
- **Respetar lo que ya cargaste en el CSV**: si una celda tiene dato, **ese valor manda**; si está vacía, se usa lo que venga del catálogo o un valor por defecto según la regla de abajo.
- **Pausar, reanudar o detener** el procesamiento de la lista.
- **Descargar** el CSV final y un **ZIP con las imágenes** de las tapas (se guardan en el navegador mientras trabajás).

---

## Cómo se usa (flujo)

1. **Importar** — arrastrá o elegí el CSV o el .txt.
2. Revisá cuántos códigos se detectaron.
3. **Iniciar** el proceso. Podés **pausar** y **seguir** más tarde.
4. **Resultados** — tabla con cada ítem, estado (ok / error) y detalle al hacer clic.
5. **Descargar CSV** y, si corresponde, **ZIP de imágenes** o **vaciar** imágenes guardadas para liberar espacio en el navegador.

---

## Reglas de proceso (orden de prioridad)

1. **Código de barras**  
   Cada fila necesita un ISBN o EAN reconocible (típicamente 10 o 13 dígitos, o ISBN-10 con X al final). Sin eso, la fila no entra al listado de trabajo.

2. **Prioridad: tu archivo > catálogo**  
   Si en el import pusiste un precio, nombre, descripción, categoría, etc., **se conserva** en el resultado. Si dejaste la celda vacía, se rellena con lo que devuelve el catálogo o con el **valor por defecto** de la lista de abajo.

3. **Valores por defecto** (solo si no vienen en el archivo ni en el catálogo)  
   Peso 0,5 kg; alto 18 cm; ancho 13 cm; profundidad 1 cm; mostrar en tienda **SI**; envío sin cargo **NO**; producto físico **SI**; sexo **Unisex**; edad / rango de edad **Adultos** si no hay otra indicación; encuadernación frecuente **Tapa rústica** cuando el catálogo no la trae.

4. **Producto no encontrado**  
   Si el código no está en SBS, la fila queda con **error** pero **sigue valiendo** lo que hayas puesto en el import (nombre, precio, descripción, etc.): no se pierde lo que ya cargaste.

5. **Nombre en el export**  
   El nombre de venta se exporta con el formato **#** al inicio, según el lineamiento de la plantilla de carga.

6. **Imágenes**  
   Se descargan al navegador para el ZIP. No se suben a ningún servidor desde esta herramienta: todo ocurre en tu equipo.

7. **Archivos de Excel (región en español)**  
   Suelen separar columnas con **punto y coma**. La herramienta intenta leer correctamente; si algo no se ve, unificá delimitador o exportá a CSV con UTF-8.

---

## Entradas aceptadas

| Forma | Contenido |
|--------|------------|
| **CSV** | Primera fila: nombres de columna. Filas siguientes: un producto por fila. Hace falta al menos una columna identificable con el código (ver abajo). |
| **Texto** | Un código por línea; también separados por coma o punto y coma. |
| **Formato “vertical”** (poco frecuente) | Nombres de campo en la primera **columna** e ítems en columnas a la derecha. Solo aplica si la hoja arranca con **Identificador** en la fila/estructura esperada. |
| **Lista de códigos** | Se aceptan 10 o 13 dígitos (y ISBN-10 con X) limpios o con guiones o espacios. |

**Columnas típicas para el código (cualquiera sirve):** Código de barras, EAN, ISBN, MPN, etc. Si no hay encabezado claro, se busca un número válido en la fila.

También podés traer de entrada **todas** las columnas de salida que quieras precargar (precio, stock, SKU, medidas, descripciones, trailer, costo, etc.): con cabecera que coincida o sea muy parecida a la del CSV de salida.

---

## Salida: columnas del CSV (en este orden)

El archivo generado trae **31 columnas** de producto, en el mismo orden de la plantilla de trabajo:

1. Identificador de URL  
2. Nombre (con # al inicio según criterio de carga)  
3. Categorías  
4. Precio  
5. Precio promocional  
6. Peso (kg)  
7. Alto (cm)  
8. Ancho (cm)  
9. Profundidad (cm)  
10. Stock  
11. SKU  
12. Código de barras  
13. Mostrar en tienda  
14. Envío sin cargo  
15. Descripción (texto corto / ficha)  
16. Tags  
17. Título para SEO  
18. Descripción para SEO  
19. Marca (editorial)  
20. Producto físico  
21. MPN (número de pieza del fabricante) — en la práctica el mismo ISBN/EAN  
22. Sexo  
23. Rango de edad  
24. Costo  
25. Autor  
26. Pag. (páginas)  
27. EDAD  
28. FOTO TAPA (URL de la imagen)  
29. Encuadernación  
30. Trailer / video  
31. **Descripción compuesta** (bloque armado: título, descripción, autor, páginas, edad, editorial, ISBN, ficha)

---

## Referencia rápida (qué aporta el catálogo vs. tu planilla)

- **Obligatorio aportar por código:** título, marca, descripción, tags, SEO, autor, páginas, edad, encuadernación, imagen, **cuando** el producto esté en el catálogo y tú no los hayas fijado ya en el import.  
- **Suele ir en la planilla de partida o por defecto:** medidas, stock, “mostrar en tienda”, “envío sin cargo”, MPN, sexo, costo, trailer, precio promocional, identificador de URL.  
- **Compuesta (columna 31):** se arma con la lógica de plantilla; si en el import traés una **Descripción compuesta** entera, puede usarse tal cual.

---

## Modo demostración (presentaciones)

Solo entra en juego si la app se **construyó o arranca** con la opción de entorno `VITE_DEMO=true` (en local o en el hosting, según se configure al desplegar).

- **No hay descargas** de CSV ni de ZIP de imágenes: los botones quedan deshabilitados.
- Se procesan **como máximo 10** títulos por import; si el archivo trae más, se avisa y el resto no se incluye en esa vuelta.
- Cada dispositivo puede **volver a iniciar el scraping como máximo 2 veces por día (2 intentos)** (reloj del propio navegador; a medianoche local el contador vuelve a cero). No impide **ver** resultados ni **pausar y reanudar**; cada clic en *Iniciar scraping* gasta 1 intento. Al agotarlos, no podés **iniciar otra carga** hasta el día siguiente.
- Al pasar a **producción**, basta con **quitar** `VITE_DEMO` o fijarla a `false` y volver a publicar, para destrabar descargas, toda la lista e intentos ilimitados.

**Build de demo (ejemplo):** `npm run build:demo` (equivalente a poner `VITE_DEMO=true` en el build de producción).

---

## Aviso de uso

Los datos mostrados son los que ofrece el **sitio y catálogo públicos** de SBS. Esta herramienta no reemplaza validaciones de negocio; revisá precios, stock y textos antes de un import masivo a tu tienda.

---

*Faro Azul — Libros y mucho más*
