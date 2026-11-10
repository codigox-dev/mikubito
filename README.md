# Cubito 🏠

Aplicación web privada de gestión del hogar para **Alex y Sandra**. Reúne tareas, finanzas, viajes, compra, planificación semanal de comidas, notas rápidas, el tiempo de la zona y un historial común de todo lo que pasa en casa.

> Estado: versión 1.3, lista para ejecutar en local y desplegar en AWS.

---

## Qué incluye

- **Autenticación privada** con email y contraseña, `bcrypt` y JWT. No hay registro público: solo existen los dos usuarios creados por el seed.
- **Recordar sesión** durante 30 días en el dispositivo actual. Sin recordar, la sesión dura 12 horas y se guarda solo mientras la pestaña esté abierta.
- **Tareas de casa**: crear, editar, cerrar y reabrir. Asignación a Alex, Sandra o ambos, con **fecha límite opcional** y aviso visual de tareas vencidas.
- **Vista de tareas**: pendientes primero, con filtros «Para mí», «Vencidas» y «Hechas».
- **Borrado definitivo** de tareas y productos, siempre con confirmación y registro en Actividad.
- **Campana de notificaciones**: avisa cuando te asignan o reasignan una tarea y cuando el otro añade productos o cierra la lista de la compra.
- **Finanzas**: presupuesto por mes, gastos comunes, pagador, reparto por persona y restante.
- **Viajes**: presupuesto independiente por viaje, gastos fijos, total gastado y restante.
- **Supermercado**: una lista activa, productos con cantidad, marcado inmediato de comprados, sincronización automática cada 8 segundos, cierre de lista e historial.
- **Comidas**: planificación semanal de lunes a domingo con desayuno, almuerzo y cena. Navegación entre semanas, huecos opcionales y edición o borrado de cada plato.
- **Notas rápidas**: tablón compartido con creador rápido, autor, fecha y borrado con confirmación.
- **El Tiempo**: Arganda del Rey y Rivas-Vaciamadrid fijos en pantalla con la previsión de **mañana** en primer plano, buscador de otros municipios españoles, detalle por horas y días de Madrid y tarjeta de Arganda en el inicio con acceso al módulo. Usa AEMET con respaldo automático de Open-Meteo.
- **Auditoría global**: cada creación, edición o borrado guarda usuario, fecha, entidad y descripción.
- **Diseño responsive** con sidebar en escritorio y navegación inferior en móvil.

---

## Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 3 |
| Backend | Node.js 22, Express 4, Zod |
| Base de datos | PostgreSQL 16 + Prisma ORM 5 |
| Autenticación | JWT + bcrypt |
| Infra local | Docker Compose |
| Infra AWS sugerida | RDS + ECS Fargate/App Runner + ALB + Amplify/CloudFront |

---

## Estructura

```text
.
├── backend/
│   ├── prisma/
│   │   ├── migrations/          # Migración SQL inicial
│   │   ├── schema.prisma        # Modelos de datos
│   │   └── seed.js              # Crea a Alex y Sandra
│   ├── src/
│   │   ├── config/env.js
│   │   ├── lib/                 # Prisma, JWT, auditoría, serialización, clima
│   │   ├── middleware/          # Auth Bearer, errores, 404
│   │   ├── routes/              # auth, tasks, finance, trips, shopping, meals, notes, weather...
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── app/
│   │   ├── (app)/               # Zona protegida
│   │   │   ├── dashboard/
│   │   │   ├── tareas/
│   │   │   ├── finanzas/
│   │   │   ├── viajes/
│   │   │   ├── supermercado/
│   │   │   ├── comidas/
│   │   │   ├── notas/
│   │   │   ├── tiempo/
│   │   │   └── actividad/
│   │   ├── login/
│   │   └── layout.js
│   ├── components/
│   ├── lib/
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
├── docs/AWS_DEPLOYMENT.md
├── docker-compose.yml
└── package.json
```

---

## Puesta en marcha local

### Requisitos

- Node.js 20 o superior (recomendado 22)
- PostgreSQL 16 (local o Docker)
- npm 10+

### 1. Instalar dependencias

```bash
npm install
npm run install:all
```

### 2. Crear la base de datos

Con Docker:

```bash
docker run --name cubito-postgres \
  -e POSTGRES_USER=cubito \
  -e POSTGRES_PASSWORD=cubito \
  -e POSTGRES_DB=cubito \
  -p 5432:5432 \
  -d postgres:16-alpine
```

O crea una base de datos `cubito` en tu PostgreSQL local.

### 3. Configurar variables de entorno

**Bash / macOS / Linux:**

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

**PowerShell:**

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
```

Edita `backend/.env` y cambia como mínimo:

```dotenv
DATABASE_URL="postgresql://cubito:cubito@localhost:5432/cubito?schema=public"
JWT_SECRET="un-secreto-largo-generado-para-esta-instalacion"
SEED_PASSWORD="UnaContraseñaSeguraParaAlexYSandra"
```

Genera el secreto con:

```bash
openssl rand -base64 48
```

o con Node:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

### 4. Migrar y crear los usuarios

```bash
npm run db:deploy
npm run db:seed
```

El seed crea exactamente dos cuentas usando `SEED_ALEX_EMAIL`, `SEED_SANDRA_EMAIL` y `SEED_PASSWORD`. Si vuelves a ejecutarlo, actualiza el nombre y **restablece la contraseña** de esas dos cuentas.

### 5. Arrancar en desarrollo

```bash
npm run dev
```

- Frontend: <http://localhost:3000>
- API: <http://localhost:4000>
- Healthcheck: <http://localhost:4000/health>

Entra con el email de Alex o Sandra y la contraseña definida en `SEED_PASSWORD`.

### Alternativa: todo con Docker

```bash
docker compose up --build
```

Esto levanta PostgreSQL, aplica migraciones, ejecuta el seed y sirve frontend y backend. Cambia `JWT_SECRET` y `SEED_PASSWORD` mediante variables de entorno antes de usarlo fuera de tu máquina.

### Alternativa: modo producción en local

```bash
npm run build
npm start
```

`npm start` arranca la API y el frontend ya compilado. El `output: "standalone"` de Next.js solo se activa con `NEXT_OUTPUT=standalone` (lo define el `Dockerfile`); en local `next start` sirve el build normal sin esa carpeta.

---

## Variables de entorno

### Backend (`backend/.env`)

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `DATABASE_URL` | Sí | Cadena de conexión PostgreSQL |
| `JWT_SECRET` | Sí | Secreto de firma. Mínimo 32 caracteres en producción |
| `PORT` | No | Puerto de la API. Por defecto `4000` |
| `CORS_ORIGINS` | No | Orígenes permitidos, separados por coma |
| `JWT_SESSION_EXPIRES_IN` | No | Duración sin recordar. Por defecto `12h` |
| `JWT_REMEMBER_EXPIRES_IN` | No | Duración con recordar. Por defecto `30d` |
| `SEED_ALEX_EMAIL` | Seed | Email de Alex |
| `SEED_SANDRA_EMAIL` | Seed | Email de Sandra |
| `SEED_PASSWORD` | Seed | Contraseña inicial compartida para el seed |
| `LOGIN_RATE_LIMIT` | No | Intentos por IP. Por defecto `10` |
| `LOGIN_RATE_WINDOW_MINUTES` | No | Ventana del rate limit. Por defecto `15` |
| `AEMET_API_KEY` | No | Clave de AEMET OpenData. Si falta, se usa Open-Meteo |
| `WEATHER_PROVIDER` | No | `auto`, `aemet` u `open-meteo`. Por defecto `auto` |
| `WEATHER_CACHE_MINUTES` | No | Minutos de caché de las previsiones. Por defecto `20` |

### Frontend (`frontend/.env.local`)

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | URL pública de la API, incluyendo `/api` |

> `NEXT_PUBLIC_*` se incrusta en el bundle **en tiempo de build**. Si cambia la URL de la API en producción, vuelve a compilar el frontend.

> **El Tiempo** funciona sin clave usando Open-Meteo. Para usar AEMET OpenData, solicita una clave gratuita en <https://opendata.aemet.es/> y añádela como `AEMET_API_KEY` en `backend/.env`.

---

## API

Todas las rutas salvo `/health`, `/api/health` y `/api/auth/login` requieren:

```http
Authorization: Bearer <jwt>
```

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Login (`email`, `password`, `remember`) |
| `GET` | `/api/auth/me` | Usuario de la sesión |
| `POST` | `/api/auth/logout` | Cierre lógico en cliente |
| `GET` | `/api/users` | Alex y Sandra |
| `GET/POST` | `/api/tasks` | Listar y crear tareas |
| `PATCH` | `/api/tasks/:id` | Editar tarea |
| `POST` | `/api/tasks/:id/close` | Cerrar tarea |
| `POST` | `/api/tasks/:id/reopen` | Reabrir tarea |
| `DELETE` | `/api/tasks/:id` | Eliminar tarea |
| `GET` | `/api/finance/overview?month=YYYY-MM` | Presupuesto, gastos, reparto y restante |
| `PUT` | `/api/finance/budget` | Crear/actualizar presupuesto mensual |
| `POST/PATCH/DELETE` | `/api/finance/expenses[/:id]` | Gastos comunes |
| `GET/POST` | `/api/trips` | Listar y crear viajes |
| `GET/PATCH/DELETE` | `/api/trips/:id` | Detalle y gestión de viaje |
| `POST/PATCH/DELETE` | `/api/trips/:id/expenses[/:expenseId]` | Gastos del viaje |
| `GET/POST` | `/api/shopping/lists` | Historial y creación de listas |
| `POST` | `/api/shopping/lists/:id/items` | Añadir producto |
| `PATCH/DELETE` | `/api/shopping/items/:id` | Editar, marcar o borrar producto |
| `POST` | `/api/shopping/lists/:id/close` | Cerrar lista |
| `GET` | `/api/meals?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` | Comidas del rango semanal |
| `POST` | `/api/meals` | Crear o actualizar (upsert) una comida |
| `DELETE` | `/api/meals/:id` | Eliminar una comida |
| `GET` | `/api/notes` | Notas rápidas, de más reciente a más antigua |
| `POST` | `/api/notes` | Crear una nota rápida (`content`) |
| `DELETE` | `/api/notes/:id` | Eliminar una nota |
| `GET` | `/api/weather?city=Arganda` | Tiempo actual y previsión de una ciudad; también acepta `lat`/`lon`/`name` |
| `GET` | `/api/weather/search?q=Rivas` | Buscador de municipios y ciudades de España |
| `GET` | `/api/notifications` | Últimas notificaciones y contador sin leer |
| `POST` | `/api/notifications/:id/read` | Marcar una notificación como leída |
| `POST` | `/api/notifications/read-all` | Marcar todas como leídas |
| `GET` | `/api/activity` | Log global paginado y filtrable |
| `GET` | `/api/dashboard` | Resumen agregado de inicio |

Respuesta de error estándar:

```json
{
  "error": {
    "message": "Descripción para el usuario",
    "details": {}
  }
}
```

---

## Decisiones técnicas

- **Una sola lista activa** de supermercado. El backend rechaza crear o modificar listas cerradas.
- **Comidas con upsert por casilla**: `@@unique([date, mealType])` garantiza una sola comida por día y tipo. El POST devuelve `201` al crear y `200` al actualizar, conservando el autor original; la auditoría registra quién editó.
- **Fechas de comida como texto** `YYYY-MM-DD` para evitar desfases de zona horaria. El rango semanal se valida y se limita a 62 días.
- **Notas rápidas sin edición**: se crean y se borran; cada cambio queda en Actividad con un extracto de la nota como contexto.
- **El Tiempo con doble fuente**: AEMET es la fuente principal cuando `AEMET_API_KEY` está configurada; si falla o no hay clave, Open-Meteo responde con el mismo contrato normalizado. Arganda y Rivas tienen coordenadas e identificadores fijos para cargar siempre sus tarjetas.
- **Caché meteorológica en memoria**: las previsiones se guardan 20 minutos por defecto y, si la API externa cae, se sirve la última copia válida durante unas horas. El buscador de municipios reutiliza el listado de AEMET durante 24 h.
- **Mañana en primer plano**: las tarjetas de Arganda y Rivas muestran siempre la previsión del día siguiente (máxima, mínima, sensación máxima, estado y lluvia) porque lo habitual es consultarlas por la noche para preparar la ropa. El inicio muestra solo Arganda con un acceso directo a `/tiempo`; el detalle del módulo abre en Madrid y conserva el bloque de próximas horas para la ciudad seleccionada.
- **Atribución de datos**: la interfaz cita a AEMET y Open-Meteo. AEMET OpenData se consulta con `AEMET_API_KEY`; Open-Meteo no necesita clave.
- **Marcado de productos**: actualización optimista en la UI + refresco silencioso cada 8 s. Se siente instantáneo y sincroniza el otro dispositivo sin añadir infraestructura WebSocket en la v1.
- **Auditoría dentro de transacciones** junto al cambio principal, para que no exista una acción sin registro.
- **Dinero con `Decimal(12,2)`** en PostgreSQL; la API lo serializa como número para la UI.
- **Fechas límite como día natural** (`YYYY-MM-DD`) guardadas a medianoche UTC y serializadas sin hora, para que no cambien de día según la zona horaria.
- **Notificaciones persistentes por usuario** en base de datos. La campana se refresca cada 20 s y al recuperar el foco; nunca se notifica al autor de la acción.
- **Miembro del hogar** (`assigneeKey`) guardado en el usuario, para resolver «Para mí» y los destinatarios de cada aviso sin depender del email.
- **JWT stateless** con `issuer`, `audience` y caducidad. El logout elimina el token del cliente.
- **Logout sin revocación de servidor**: para un endurecimiento futuro conviene rotación de tokens o sesiones en base de datos.
- **Token en `localStorage`** cuando se marca «recordarme» y en `sessionStorage` cuando no. Es la solución simple para persistencia entre frontend/API separados; para un nivel de seguridad superior, migrar a cookie `HttpOnly` + protección CSRF.

---

## Seguridad

- Contraseñas con `bcrypt` (coste 12).
- Rate limit en login y comparación de hash aunque el email no exista.
- Helmet, CORS restringido, límite de body y validación con Zod.
- Consultas parametrizadas mediante Prisma.
- Migraciones versionadas.
- Logs de auditoría con autor y fecha.
- No se registra la contraseña ni el hash en respuestas.
- En producción: HTTPS obligatorio, secretos en AWS Secrets Manager, RDS con SSL, backups y contraseñas del seed rotadas.

Checklist y arquitectura recomendada: **[docs/AWS_DEPLOYMENT.md](docs/AWS_DEPLOYMENT.md)**.

---

## Scripts

| Comando | Acción |
| --- | --- |
| `npm run dev` | API + web en paralelo |
| `npm run install:all` | Instala backend y frontend |
| `npm run build` | Build de producción del frontend |
| `npm start` | API + web compilada (producción local) |
| `npm run db:deploy` | Aplica migraciones |
| `npm run db:seed` | Crea/restablece Alex y Sandra |
| `npm run db:studio` | Abre Prisma Studio |
| `npm --prefix backend run dev` | Solo API |
| `npm --prefix frontend run dev` | Solo web |

---

## Despliegue

El proyecto incluye `Dockerfile` para ambos servicios. El contenedor compila Next.js con `output: "standalone"` (`NEXT_OUTPUT=standalone`); en local el build normal funciona con `npm start`. La guía completa para AWS está en [`docs/AWS_DEPLOYMENT.md`](docs/AWS_DEPLOYMENT.md).
