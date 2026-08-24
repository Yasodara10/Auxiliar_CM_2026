# AUXILIAR CM · 2026 — PWA de entrenamiento

## Qué incluye esta versión
- PWA instalable en Windows, Android y iPhone/iPad.
- Primer ejercicio: 30 psicotécnicos + 30 legislación + 5 reservas, 65 minutos.
- Segundo ejercicio: 30 ofimática + 5 reservas, 35 minutos.
- Penalización: error = −1/3; blanco = 0.
- Práctica por bloque, tema, dificultad y número de preguntas.
- Corrección inmediata opcional.
- Preguntas favoritas y repaso de falladas.
- Historial y estadísticas por tema.
- Cronómetro y cuadrícula de navegación en simulacro.
- Importación/exportación de bancos JSON.
- Exportación/importación de progreso.
- Funcionamiento offline después de instalar/cargar la PWA.
- Modo claro/oscuro.
- Banco inicial de 105 preguntas originales: 35 psicotécnicas, 35 de legislación y 35 de ofimática.

## Instalación recomendada: GitHub Pages
No necesitas instalar Node, npm ni compilar nada.

1. Descomprime el ZIP.
2. En GitHub crea un repositorio nuevo, por ejemplo: `auxiliar-cm-2026`.
3. Sube **todo el contenido** de esta carpeta al repositorio, conservando la carpeta `icons`.
4. En GitHub abre `Settings` → `Pages`.
5. En `Build and deployment`, selecciona `Deploy from a branch`.
6. Elige rama `main` y carpeta `/ (root)` y guarda.
7. Tras uno o dos minutos GitHub mostrará la dirección pública.
8. Ábrela en el dispositivo donde quieras estudiar.

### Instalar en Windows
En Chrome o Edge, abre la web y pulsa el icono de instalar de la barra de direcciones. También puede aparecer el botón **Instalar** dentro de la app.

### Instalar en Android
Abre la web en Chrome → menú ⋮ → **Instalar aplicación** o **Añadir a pantalla de inicio**.

### Instalar en iPhone/iPad
Abre la web en Safari → botón Compartir → **Añadir a pantalla de inicio**.

## Probarla en el PC sin publicar
Desde la carpeta descomprimida:

```bash
python -m http.server 8080
```

Después abre:
`http://localhost:8080`

También puedes abrir `index.html` directamente para probar gran parte de la app, pero la instalación PWA y el modo offline requieren servirla por HTTP/HTTPS.

## Añadir preguntas
Usa `plantilla-preguntas.json` como modelo. Importa el archivo desde:
**Datos → Banco de preguntas → Importar JSON**.

Campos principales:
- `id`: identificador único.
- `block`: `psych`, `legislation` u `office`.
- `topic`: 0 para psicotécnico; 1–15 para legislación; 16–21 para ofimática.
- `difficulty`: 1, 2 o 3.
- `question`: enunciado.
- `context`: tabla/texto previo opcional.
- `options`: exactamente cuatro respuestas.
- `correct`: 0=A, 1=B, 2=C, 3=D.
- `explanation`: explicación.
- `sourceType` / `sourceName`: procedencia.

Si importas otra pregunta con el mismo `id`, sustituye a la versión importada anterior.

## Copia de seguridad
En **Datos**:
- `Exportar progreso` guarda estadísticas, historial y favoritas.
- `Importar progreso` restaura esa copia en otro navegador/dispositivo.
- `Exportar banco` descarga en JSON el banco completo activo.

## Actualizaciones
El service worker usa una caché llamada `auxiliar-cm-2026-v1`. Para una actualización grande, puedes cambiarla en `sw.js` a `auxiliar-cm-2026-v2`; al recargar, la PWA eliminará la caché antigua.
