# Integración LTI 1.3 con Canvas

SócratIA se integra a Canvas como **herramienta LTI 1.3 (Advantage)**. Canvas actúa como
*plataforma* y lanza la herramienta; el backend (`/var/www/SocratIA/backend`) expone los
endpoints LTI y valida los tokens.

## Endpoints de la herramienta

| Endpoint | Uso |
|---|---|
| `GET/POST /lti/login` | Inicio OIDC: recibe el `login_hint` de Canvas y redirige al `authorize_redirect`. |
| `POST /lti/launch` | Recibe el `id_token` (JWT), valida firma/issuer/audience/nonce y abre el tutor con la identidad del alumno. |
| `GET /lti/jwks` | Llaves públicas de la herramienta (para que Canvas valide lo que firmamos). |

La identidad del alumno (`sub` del token) se usa como `external_id` en la base de datos de
progreso, de modo que los intentos quedan ligados al usuario real de Canvas (no a un id anónimo).

## Configuración de la Developer Key en Canvas

La herramienta se registró como **Developer Key LTI** a nivel de cuenta. Configuración (JSON):
[`canvas-lti-config.json`](./canvas-lti-config.json).

Datos de la plataforma (Canvas open source):

| Dato | Valor |
|---|---|
| Issuer (`iss`) | `https://canvas.instructure.com` |
| OIDC Auth | `https://canvas.cms.net.pe/api/lti/authorize_redirect` |
| JWKS plataforma | `https://canvas.cms.net.pe/api/lti/security/jwks` |
| Token (AGS) | `https://canvas.cms.net.pe/login/oauth2/token` |

El `client_id` que devuelve Canvas al crear la key se coloca en `backend/.env` (`LTI_CLIENT_ID`).

## Placement

La herramienta se publica en **course navigation** (`LtiResourceLinkRequest`), por lo que aparece
en el menú lateral de cada curso. Al hacer clic, Canvas lanza SócratIA con la identidad y el
contexto del curso.

## Despliegue de Canvas (entorno de prueba)

Canvas corre en Docker en el servidor (`/opt/canvas-lms`, `docker compose`), expuesto en
`canvas.cms.net.pe` vía nginx (`/etc/nginx/sites-available/canvas` → `127.0.0.1:3010`).
