# Despliegue en AWS

Guía de referencia para llevar Cubito a producción de forma sencilla y segura. La arquitectura recomendada separa frontend, API y base de datos.

## Arquitectura recomendada

```mermaid
flowchart LR
  U[Alex y Sandra] -->|HTTPS| CF[CloudFront / Amplify]
  CF --> FE[Next.js]
  U -->|HTTPS| ALB[Application Load Balancer]
  ALB --> API[Express en ECS Fargate]
  API --> RDS[(RDS PostgreSQL)]
  API --> CW[CloudWatch Logs]
  SM[AWS Secrets Manager] -.-> API
  ECR[ECR] -.-> API
```

- **Frontend**: AWS Amplify Hosting (soporta Next.js SSR) o un servicio ECS con la imagen Docker incluida.
- **API**: ECS Fargate detrás de un ALB, o AWS App Runner si prefieres menos configuración.
- **Base de datos**: RDS PostgreSQL 16 en subredes privadas.
- **Secretos**: AWS Secrets Manager.
- **Imágenes**: ECR.
- **DNS/TLS**: Route 53 + ACM.

Ejemplo de dominios:

- `app.tudominio.com` → frontend
- `api.tudominio.com` → API

---

## 1. Base de datos RDS

1. Crea una instancia **PostgreSQL 16** (por ejemplo `db.t4g.micro` para empezar).
2. Activa backups automáticos y cifrado en reposo.
3. Colócala en subredes privadas.
4. El Security Group de RDS solo debe aceptar el puerto `5432` desde el Security Group de la API.
5. Guarda la cadena de conexión en Secrets Manager.

```text
postgresql://cubito:PASSWORD@cubito.xxxxx.eu-west-1.rds.amazonaws.com:5432/cubito?schema=public&sslmode=require
```

> Usa una contraseña larga y no reutilices la de desarrollo.

---

## 2. Secretos

Crea secretos separados o un JSON en Secrets Manager:

```json
{
  "DATABASE_URL": "postgresql://...",
  "JWT_SECRET": "cadena-aleatoria-de-al-menos-48-bytes",
  "SEED_PASSWORD": "contraseña-inicial-fuerte"
}
```

`JWT_SECRET` debe ser distinto del de desarrollo y tener al menos 32 caracteres. En producción la API se niega a arrancar si no cumple esa longitud.

---

## 3. Imagen de la API en ECR

```bash
AWS_REGION=eu-west-1
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REPO="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/cubito-api"

aws ecr create-repository --repository-name cubito-api --region "$AWS_REGION"

aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

docker build -t cubito-api ./backend
docker tag cubito-api:latest "$REPO:latest"
docker push "$REPO:latest"
```

La imagen aplica automáticamente `prisma migrate deploy` al arrancar. Para el **seed inicial**, ejecuta una tarea one-off con el mismo task definition y este comando:

```bash
sh -c "npx prisma migrate deploy && node prisma/seed.js"
```

No dejes el seed en el arranque normal de producción.

---

## 4. API en ECS Fargate

Crea un cluster ECS y un task definition con:

| Ajuste | Valor |
| --- | --- |
| Imagen | `...amazonaws.com/cubito-api:latest` |
| Puerto | `4000` |
| CPU/memoria | `0.25 vCPU / 0.5 GB` para empezar |
| Variables | `NODE_ENV=production`, `PORT=4000`, `CORS_ORIGINS=https://app.tudominio.com` |
| Secretos | `DATABASE_URL`, `JWT_SECRET` desde Secrets Manager |
| Healthcheck | `GET /health` |
| Logs | `/ecs/cubito-api` en CloudWatch |

Crea un **Application Load Balancer** público con:

- Listener `443` con certificado ACM.
- Target group HTTP al puerto `4000`.
- Health check: `/health`, código `200`.
- Redirección de `80` a `443`.

Security Groups:

- ALB: entrada `443` desde Internet.
- API: entrada `4000` solo desde el Security Group del ALB.
- RDS: entrada `5432` solo desde el Security Group de la API.

Configura el autoscaling con un mínimo de 1 tarea. La aplicación es stateless y puede escalar horizontalmente.

---

## 5. Frontend

### Opción A · Amplify Hosting (recomendada)

1. Conecta el repositorio y selecciona la carpeta `frontend` como raíz de la app.
2. Build command: `npm run build`.
3. Variable de entorno de build:

```text
NEXT_PUBLIC_API_URL=https://api.tudominio.com/api
```

4. Añade el dominio `app.tudominio.com` y el certificado.

Amplify soporta Next.js con SSR. Recuerda que `NEXT_PUBLIC_*` se fija en cada build.

### Opción B · ECS / contenedor

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.tudominio.com/api \
  -t cubito-web ./frontend
```

Publica la imagen en ECR y crea un servicio ECS con puerto `3000`, detrás de un ALB o CloudFront. El contenedor usa el `output: "standalone"` de Next.js.

---

## 6. CORS y URL pública

En la API:

```dotenv
CORS_ORIGINS=https://app.tudominio.com
```

Si usas varios dominios, sepáralos por coma:

```dotenv
CORS_ORIGINS=https://app.tudominio.com,https://www.tudominio.com
```

Reinicia o redespliega el servicio tras cambiar variables.

---

## 7. Checklist de producción

- [ ] HTTPS en frontend y API.
- [ ] `JWT_SECRET` aleatorio y guardado en Secrets Manager.
- [ ] `SEED_PASSWORD` fuerte y rotado tras el primer acceso.
- [ ] RDS privado, cifrado y con backups.
- [ ] Security Groups con mínimo privilegio.
- [ ] `CORS_ORIGINS` con el dominio real, nunca `*`.
- [ ] Logs de CloudWatch con retención definida.
- [ ] Alarmas de errores 5xx y salud del target group.
- [ ] Backups de RDS probados.
- [ ] Migraciones aplicadas como parte del despliegue.
- [ ] `NEXT_PUBLIC_API_URL` apuntando a la API HTTPS.
- [ ] Revisar CSP/WAF si se expone públicamente.
- [ ] No subir `.env`, contraseñas ni tokens al repositorio.

---

## 8. Actualizaciones y rollback

Flujo de despliegue:

1. `docker build` y `docker push` de la nueva imagen.
2. Actualiza el task definition de ECS con el nuevo tag (evita `latest` en producción; usa SHA o semver).
3. ECS desplaza las tareas con rolling update.
4. Las migraciones se aplican al arrancar.
5. Verifica `/health` y el dashboard.

Para rollback, vuelve a la revisión anterior del task definition y despliega esa imagen. Evita migraciones destructivas sin backup previo.

---

## 9. Alternativa rápida: App Runner + Amplify

Si quieres reducir operaciones al principio:

- **Backend**: AWS App Runner apuntando al repositorio ECR, puerto `4000`, variables y secretos configurados. App Runner ofrece HTTPS y escalado automático.
- **Frontend**: Amplify Hosting.
- **Base de datos**: RDS PostgreSQL privado, accesible desde el conector de App Runner o una VPC connection.

Es una opción válida para dos usuarios. ECS + ALB ofrece más control y suele ser más económico cuando se necesita una VPC y un ALB ya existentes.

---

## 10. Nota sobre sesiones

La v1 guarda el JWT en `localStorage` (recordar sesión) o `sessionStorage` (sesión de pestaña). Para un endurecimiento adicional:

- Servir frontend y API bajo el mismo dominio padre.
- Emitir el JWT en una cookie `HttpOnly`, `Secure` y `SameSite=Lax`.
- Añadir protección CSRF para mutaciones.
- Rotar tokens o mantener sesiones revocables en base de datos.

Estas mejoras no son necesarias para el uso privado inicial, pero son recomendables si la aplicación se expone a más usuarios.
