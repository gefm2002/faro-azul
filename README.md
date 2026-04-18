# Faro Azul — Herramienta de catálogo

Sirve para **cargar un listado con códigos de barra (ISBN / EAN)** y armar un archivo listo para importar en la operación, apoyándose en el **catálogo público** de SBS. También permite **juntar las imágenes de las tapas** y bajarlas en un paquete en la **instalación** que corresponda al despliegue.

---

## Qué hace (funciones)

- **Acepta** archivos con muchas filas (hoja con columnas) o un texto con un código por línea.
- **Reconoce** el ISBN aunque venga con guiones, con texto alrededor o bajo nombres de columna distintos (EAN, código de barras, MPN, etc.).
- **Completa** ficha, textos, categoría, imagen de tapa, SEO y demás **según el catálogo**, cuando el libro **está** publicado.
- **Mantiene un orden fijo** de **31 columnas** de salida: no se agregan columnas ni modos de configuración extra; el export siempre responde a esa definición.
- Deja en **blanco** las celdas que, en la plantilla de carga, corresponden a *no aplica* (las que ustedes completan en oficina) **si no vienen rellenadas** en el archivo de entrada. En concreto: el **nombre, categoría, precio, stock, costo, trailer y similares** de esa categoría.
- Luego de armar el bloque de **texto compuesto** (ficha completa con título, descripciones, autor, páginas, edad, editorial, ISBN, ficha técnica), el sistema **misma tasa el texto** en el campo *Descripción* y en *Descripción compuesta*: ambos quedan con el **mismo contenido**; no queda un texto “corto” separado en *Descripción*.
- Con **Solo código de barras** (sin título en la planilla), el **nombre** queda en blanco en su columna, pero el título y el resumen se integran en la **ficha y en la compuesta** para no perder la información.
- Pausa, reanudación, detener proceso, y export del archivo final y de las imágenes según el despliegue.

---

## Cómo se usa

1. Importar el archivo.
2. Revisar **cuántos códigos** se tomaron.
3. **Iniciar** el proceso. Se puede parar y seguir.
4. Revisar en **resultados** la grilla y el detalle.
5. **Bajar** el listado y el paquete de imágenes, cuando el despliegue lo ofrezca.

---

## Algunas reglas (solo funcionales)

- Sin código de fila no hay producto: hay que trascribir o detectar al menos un ISBN o EAN válido por renglón.
- **Campos *no aplica* en la plantilla:** si la celda de entrada **está llena**, se mantiene; si **está vacía**, se exporta **vacía**; no se copia ahi un precio o título de catálogo, para no chocar con su operación.
- Otras celdas (ficha, marca, descripción, tags, SEO, autor, páginas, imagen, etc. cuando el dato venga de catálogo) **sí** se rellenan a partir del catálogo, salvo lo que ustedes ya vengan cargado en el archivo: **llegó en el import, gana.**
- Si el título no está en SBS, se marca el error en la grilla, pero se conserva lo que ya haya puesto en el import en las celdas que apliquen.
- Nombre comercial: si lo cargan en su CSV, se respeta y se ajusta a la convención de **#** al inicio según la plantilla.

---

## Las 31 columnas del listado (orden fijo)

1. Identificador de URL  
2. Nombre (según carga)  
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
15. **Descripción** (mismo texto que la ficha compuesta)  
16. Tags  
17. Título para SEO  
18. Descripción para SEO  
19. Marca (editorial)  
20. Producto físico  
21. MPN (en la práctica el mismo código de barras)  
22. Sexo  
23. Rango de edad  
24. Costo  
25. Autor  
26. Páginas (Pag.)  
27. EDAD  
28. Foto tapa (URL)  
29. Encuadernación  
30. Trailer / video  
31. **Descripción compuesta** (idéntica al bloque de la columna 15)

**Importante para la carga a tienda:** validar con su equipo de negocio precio, stock y legales antes de importar a gran escala.

---

*Faro Azul — Libros y mucho más*
