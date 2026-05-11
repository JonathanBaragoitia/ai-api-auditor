# Auditor de APIs con IA

Aplicación full stack para auditar APIs REST a partir de definiciones manuales o esquemas OpenAPI. El sistema analiza diseño, seguridad, documentación, paginación, validación y buenas prácticas, generando una puntuación, nivel de riesgo, problemas detectados y recomendaciones técnicas.

El proyecto está pensado como una herramienta práctica para equipos backend y como muestra de arquitectura full stack, integración con IA local, autenticación, testing, CI/CD y DevOps básico.

## Funcionalidades principales

- Registro e inicio de sesión con JWT.
- Auditoría manual de endpoints.
- Auditoría automática de esquemas OpenAPI.
- Análisis asistido por IA local usando Ollama.
- Persistencia de auditorías en SQLite para desarrollo rápido y PostgreSQL vía Docker Compose.
- Historial con filtros por riesgo, búsqueda, puntuación mínima y ordenación.
- Dashboard de métricas históricas.
- Vista detalle de auditoría con endpoints, problemas y recomendaciones.
- Exportación de resultados a JSON y PDF.
- Tests backend y frontend.
- CI/CD con GitHub Actions.
- Docker Compose para ejecución local.
- Migraciones con Alembic.
- Hooks de pre-commit para control de calidad.

## Stack tecnológico

- Backend: FastAPI, SQLAlchemy, Pydantic
- Frontend: React, Vite
- Base de datos: SQLite local/tests, PostgreSQL en Docker Compose
- Autenticación: JWT, bcrypt/passlib
- IA local: Ollama (`llama3` por defecto)
- Migraciones: Alembic
- Testing backend: pytest
- Testing frontend: Vitest, React Testing Library, jest-dom, jsdom
- CI/CD: GitHub Actions
- DevOps local: Docker, Docker Compose
- Deploy: Render/Railway para backend, Vercel para frontend

## Arquitectura

```text
ai-api-auditor/
├── app/                         # Backend FastAPI
│   ├── core/                    # Configuración y seguridad
│   ├── db/                      # Base SQLAlchemy y sesiones
│   ├── dependencies/            # Dependencias reutilizables (auth)
│   ├── models/                  # Modelos SQLAlchemy
│   ├── routers/                 # Rutas HTTP (auth, audits)
│   ├── schemas/                 # Esquemas Pydantic
│   ├── services/                # Lógica de auditoría, OpenAPI e IA
│   └── utils/                   # Utilidades
├── ai-api-auditor-frontend/      # Frontend React/Vite
│   ├── src/components/          # Componentes UI reutilizables
│   ├── src/hooks/               # Hooks de auth y auditorías
│   ├── src/utils/               # Cliente API centralizado
│   └── src/test/                # Setup de tests frontend
├── alembic/                     # Migraciones de base de datos
├── tests/                       # Tests backend
├── .github/workflows/           # CI/CD
├── Dockerfile                   # Backend Docker
├── docker-compose.yml           # PostgreSQL + backend + frontend local
└── README.md
```

## Cómo funciona la autenticación

1. El usuario se registra con `POST /auth/register` o inicia sesión con `POST /auth/login`.
2. El backend hashea contraseñas con bcrypt/passlib.
3. Si las credenciales son válidas, se genera un JWT.
4. El frontend guarda el token y lo envía en `Authorization: Bearer <token>`.
5. Los endpoints sensibles de auditoría requieren token válido.
6. Si el backend responde `401`, el frontend cierra sesión automáticamente.

## Cómo funciona el análisis OpenAPI con IA local

1. El frontend envía un esquema OpenAPI JSON a `POST /audits/openapi`.
2. El backend extrae endpoints REST válidos (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).
3. Cada endpoint se envía a Ollama para evaluar seguridad, diseño REST, validación, documentación y buenas prácticas.
4. Si Ollama no está disponible o devuelve texto no parseable, el backend usa fallback seguro y no rompe la auditoría completa.
5. El resultado se persiste en base de datos con métricas globales y detalle por endpoint.
6. El frontend muestra resumen, detalle, historial, dashboard y exportaciones.

## Capturas

> Añadir imágenes reales cuando el proyecto esté desplegado o grabado.

### Login / Registro

`docs/screenshots/login-registro.png`

### Dashboard principal

`docs/screenshots/dashboard-principal.png`

### Análisis OpenAPI

`docs/screenshots/analisis-openapi.png`

### Historial con filtros

`docs/screenshots/historial-filtros.png`

### Detalle de auditoría

`docs/screenshots/detalle-auditoria.png`

### Exportación PDF

`docs/screenshots/exportacion-pdf.png`

## Qué demuestra este proyecto

- Desarrollo full stack con separación clara frontend/backend.
- Diseño de APIs REST con FastAPI.
- Autenticación JWT y protección de endpoints.
- Persistencia con SQLAlchemy y migraciones con Alembic.
- Testing backend con pytest.
- Testing frontend con Vitest y React Testing Library.
- CI/CD con GitHub Actions.
- Arquitectura frontend modular con componentes y hooks reutilizables.
- Integración con IA local mediante Ollama.
- Manejo robusto de fallbacks cuando la IA no responde correctamente.
- Exportación de datos a JSON y PDF.
- DevOps básico con Docker Compose.
- Preparación para deploy en Render/Railway y Vercel.
- Buenas prácticas de calidad con pre-commit hooks.

## Comandos útiles

### Backend local

```bash
python -m venv venv
venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m alembic upgrade head
uvicorn app.main:app --reload
```

Por defecto el backend usa SQLite con `DATABASE_URL=sqlite:///./ai_api_auditor.db`, por lo que no necesitas PostgreSQL para desarrollo rápido ni para tests.

Backend disponible en:

- `http://127.0.0.1:8000`
- Swagger UI: `http://127.0.0.1:8000/docs`

### Frontend local

```bash
cd ai-api-auditor-frontend
npm install
npm run dev
```

Frontend disponible en:

- `http://127.0.0.1:5173`

### Tests backend

```bash
python -m pytest
```

### Tests frontend

```bash
cd ai-api-auditor-frontend
npm run test -- --run
```

### Lint y build frontend

```bash
cd ai-api-auditor-frontend
npm run lint
npm run build
```

### Docker Compose

```bash
docker compose up --build
```

Servicios:

- PostgreSQL: `localhost:5432`
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:4173`

Docker Compose levanta PostgreSQL, espera a que esté saludable y arranca el backend ejecutando `python -m alembic upgrade head` antes de iniciar Uvicorn.

Ollama no se levanta dentro de Docker Compose. Debe estar instalado y ejecutándose localmente. El backend en Docker usa `host.docker.internal:11434` para conectarse a Ollama.

Variables PostgreSQL usadas por Docker Compose:

```env
POSTGRES_DB=ai_api_auditor
POSTGRES_USER=ai_api_auditor
POSTGRES_PASSWORD=ai_api_auditor_password
DATABASE_URL_DOCKER=postgresql+psycopg2://ai_api_auditor:ai_api_auditor_password@postgres:5432/ai_api_auditor
```

### Migraciones Alembic

El proyecto usa Alembic para versionar el esquema de base de datos. No borres `ai_api_auditor.db` cada vez que se añadan columnas: aplica migraciones.

La cadena actual de migraciones cubre el estado completo de los modelos:

- `users`
- `audits`
- ownership multiusuario con `user_id`
- resultados OpenAPI persistidos
- observaciones IA
- estado de ejecución con `status` y `error_message`

Crear una nueva migración:

```bash
python -m alembic revision --autogenerate -m "descripcion del cambio"
```

Aplicar migraciones:

```bash
python -m alembic upgrade head
```

Ver migración actual aplicada:

```bash
python -m alembic current
```

Si tu base local fue creada antes de Alembic pero ya tiene las tablas iniciales `users` y `audits`, marca la migración inicial como aplicada y luego sube a `head`:

```bash
python -m alembic stamp 001_initial_schema
python -m alembic upgrade head
```

Si la base local está muy desactualizada, tiene datos descartables o falla por columnas antiguas (`no such column: audits.status`, `audits.user_id`, etc.), la opción más simple en desarrollo es borrar una última vez `ai_api_auditor.db` y ejecutar:

```bash
python -m alembic upgrade head
```

Después de eso, los siguientes cambios deben aplicarse siempre con nuevas migraciones.

### Pre-commit hooks

El proyecto incluye hooks para detectar errores básicos antes de commitear:

- espacios finales y falta de newline final.
- YAML/JSON inválido.
- archivos grandes añadidos por accidente.
- marcadores de conflictos de merge.
- `breakpoint()`/debug statements en Python.
- lint backend con `flake8`.
- lint frontend con ESLint.
- bloqueo de artefactos generados como `__pycache__`, `.pyc` y bases locales `.db`.

Instalar hooks localmente:

```bash
python -m pip install pre-commit
pre-commit install
```

Ejecutar todos los hooks manualmente:

```bash
pre-commit run --all-files
```

Ejecutar un hook concreto:

```bash
pre-commit run frontend-eslint --all-files
pre-commit run flake8 --all-files
```

Si un hook modifica archivos automáticamente, revisa el diff y vuelve a ejecutar `pre-commit run --all-files` antes de commitear.

## Variables de entorno

### Backend

Crear `.env` en la raíz si se ejecuta localmente:

```env
DATABASE_URL=sqlite:///./ai_api_auditor.db
SECRET_KEY=change-me-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
OLLAMA_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=llama3
OLLAMA_TIMEOUT_SECONDS=60
```

Para Docker Compose con PostgreSQL puedes usar estas variables en `.env`:

```env
POSTGRES_DB=ai_api_auditor
POSTGRES_USER=ai_api_auditor
POSTGRES_PASSWORD=ai_api_auditor_password
DATABASE_URL_DOCKER=postgresql+psycopg2://ai_api_auditor:ai_api_auditor_password@postgres:5432/ai_api_auditor
```

No cambies `DATABASE_URL` si quieres seguir usando SQLite en local. Docker Compose usa `DATABASE_URL_DOCKER` para no interferir con el modo local.

### Frontend

Crear `.env` dentro de `ai-api-auditor-frontend/`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Para producción:

```env
VITE_API_BASE_URL=https://TU-BACKEND-URL
```

## CI/CD

GitHub Actions ejecuta validaciones en `push` y `pull_request`:

- Backend:
  - instalación de dependencias
  - validación de sintaxis Python
  - lint con flake8
  - tests con pytest
  - verificación de import de FastAPI
- Frontend:
  - instalación de dependencias
  - tests con Vitest
  - lint con ESLint
  - build de producción con Vite

Workflow principal:

```text
.github/workflows/ci.yml
```

## Deploy backend en Render/Railway

El backend está preparado para deploy básico usando variables de entorno y puerto dinámico.

Comando de arranque:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Si se despliega con Docker, el `Dockerfile` respeta `${PORT:-8000}`.

Variables necesarias:

- `DATABASE_URL`
- `SECRET_KEY`
- `CORS_ORIGINS`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `OLLAMA_URL`
- `OLLAMA_MODEL`
- `OLLAMA_TIMEOUT_SECONDS`

El archivo `render.yaml` sirve como base para Render. En Railway se puede usar la misma imagen Docker y configurar variables desde el panel.

## Deploy frontend en Vercel

Configuración recomendada:

- Root Directory: `ai-api-auditor-frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

Variable necesaria:

- `VITE_API_BASE_URL`: URL pública del backend desplegado.

El archivo `ai-api-auditor-frontend/vercel.json` define la salida `dist` y rewrite a `index.html` para evitar rutas rotas en navegación cliente.

## Próximas mejoras

- Añadir refresh tokens.
- Perfiles Docker separados para desarrollo, CI y producción.
- Mejorar cobertura de tests y añadir umbrales mínimos.
- Code splitting para reducir chunk de PDF.
- Roles de usuario y permisos.
- Comparación entre auditorías de una misma API.
- Integración opcional con modelos remotos además de Ollama local.
