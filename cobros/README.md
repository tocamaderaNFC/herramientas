# cobros.app · Tocá Madera NFC

App web para el celu (un HTML + 4 archivos chicos, sin build, sin IA, gratis) para:

- ver todas las placas de `r/links.json`, con su rango y las libres en verde;
- asignar, cambiar o liberar una placa;
- armar una página de medios de pago con los mismos campos y la misma plantilla que `herramientas/GENERADOR_PAGOS.html`, verla en vivo y subirla a `colonia` o `buenos-aires`;
- deshacer el último cambio con un toque.

La 003 (pagos The Crown Barber) y su página están bloqueadas: la app no las toca.

## Archivos (`app/`)

| Archivo | Qué es |
|---|---|
| `index.html` | La app entera |
| `generador.js` | Copia textual de LOGOS, PRESETS, loadLogo, esc y buildClient de GENERADOR_PAGOS.html. Si cambia el generador, se vuelve a copiar (el test avisa si no coinciden) |
| `manifest.json`, `sw.js`, `icon*` | Para instalarla en el celu y abrirla sin conexión |

## Qué escribe y en qué formato (igual que editor github)

- **Placa:** primero guarda `r/backups/links-AAAA-MM-DD-HHMM.json` con el `links.json` anterior (si ya existe uno de ese minuto agrega `-2`, `-3`). Después cambia solo esa línea de `r/links.json`. Formato: 2 espacios, claves de 3 dígitos ordenadas, sin salto de línea al final. Commit: `102: pagos cliente (respaldo backups/links-….json)`.
- **Página:** `colonia/<cliente>.html` (101–199) o `buenos-aires/<cliente>.html` (201–299). `<cliente>` va en minúsculas, sin tildes ni espacios (ej. `lasverdaderas`). Commit: `<cliente>: medios de pago Nombre Apellido`. La URL queda `https://tocamaderanfc.github.io/<repo>/<cliente>.html`.
- **Reseñas (001–099):** si pegás el placeId (`ChIJ…`), usa `custom_urls` de `herramientas/datos.json` cuando lo tiene. Si no, arma `https://search.google.com/local/writereview?placeid=<id>`.
- Antes de subir, siempre muestra el cambio (antes → después) y pide confirmar. Si la placa ya estaba activa, además hay que escribir el número.
- **Deshacer:** guarda el SHA anterior de cada archivo, que se puede restaurar con un toque. Si el archivo cambió después (por ejemplo, editor github lo tocó), no pisa nada y avisa que restaures desde `backups/`.

**editor github hace lo mismo desde el chat:** sigue la skill `placas-nfc-links`, que usa los mismos archivos, el mismo formato, los mismos nombres de respaldo y los mismos mensajes de commit. Podés usar uno u otro, o mezclarlos: la app siempre relee el repo antes de escribir.

## Crear el token (una sola vez)

1. GitHub → Settings → Developer settings → **Fine-grained tokens** → *Generate new token* (https://github.com/settings/personal-access-tokens/new).
2. **Resource owner:** `tocamaderaNFC`. Si no aparece, la organización tiene que permitir fine-grained tokens (Org settings → Personal access tokens).
3. **Repository access:** *Only select repositories* → `r`, `colonia` y `buenos-aires`.
4. **Permissions → Repository → Contents: Read and write.** Nada más (Metadata: read lo agrega solo).
5. Vencimiento: el más corto que te resulte cómodo (por ejemplo 90 días).
6. En la app: Ajustes → pegarlo → *Guardar en este teléfono*.

⚠️ El token queda solo en el navegador del celu (localStorage), nunca en el repo. Si perdés el celu o lo prestás, borralo en la app y revocalo en GitHub.

## Instalar en el celu

Abrí la URL de la app en el navegador:

- **Android (Chrome):** menú ⋮ → *Agregar a pantalla principal* / *Instalar app*.
- **iPhone (Safari):** compartir → *Agregar a inicio*.

Sin conexión, la app abre igual y muestra la última lista de placas que vio. Para subir cambios hace falta internet.

## Dónde alojarla gratis (sin publicar todavía)

En GitHub Pages, dentro de `herramientas`, que ya tiene Pages activo: copiar `app/*` a `herramientas/cobros/`. Queda en `https://tocamaderanfc.github.io/herramientas/cobros/`. No necesita servidor: habla directo con la API de GitHub.

## Pruebas (locales, nada sale a GitHub)

```
cd test && npm i && node run.mjs
```

`test/mock.mjs` imita la API de contenidos de GitHub con una copia local de los repos (`ref/`). `test/run.mjs` maneja la app en Chrome con pantalla de celu, y además guarda las capturas en `screens/`.
