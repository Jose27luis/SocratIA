# Despliegue

Copias versionadas de la configuración de infraestructura del servidor.

## nginx (`/etc/nginx/sites-available/`)

| Archivo | Sirve |
|---|---|
| `socrateAI` | `cms.net.pe`: tutor (OATutor), panel docente (`/docente/`), backend (`/ai/`, `/lti/`) |
| `canvas` | `canvas.cms.net.pe`: proxy a Canvas LMS (Docker, `127.0.0.1:3010`) |

Se activan con un symlink a `sites-enabled/` y `systemctl reload nginx`.

## systemd (`/etc/systemd/system/`)

| Servicio | Función |
|---|---|
| `socrateai.service` | Backend Node (IA + progreso + LTI), `127.0.0.1:8001` |
| `canvas.service` | Levanta Canvas LMS (`docker compose up -d web jobs` en `/opt/canvas-lms`) |

Ambos quedan habilitados (`systemctl enable`) para arrancar al iniciar el servidor.

## Nota sobre el panel docente

El bloque `location ^~ /docente/` usa `alias` + `try_files $uri /docente/index.html`
**sin** la directiva `index`, para evitar el bug de nginx que concatena el alias con el
índice (`index.htmlindex.html`) cuando la URL termina en `/`.
