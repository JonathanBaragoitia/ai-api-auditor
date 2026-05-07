# Auditor de APIs con IA

Aplicación full stack para auditar APIs REST a partir de definiciones manuales o esquemas OpenAPI. El sistema analiza diseño, seguridad, documentación, paginación, validación y buenas prácticas, generando una puntuación, nivel de riesgo, problemas detectados y recomendaciones técnicas.

El proyecto está pensado como una herramienta práctica para equipos backend y como muestra de arquitectura full stack, integración con IA local, autenticación, testing, CI/CD y DevOps básico.

## Funcionalidades principales

- Registro e inicio de sesión con JWT.
- Auditoría manual de endpoints.
- Auditoría automática de esquemas OpenAPI.
- Análisis asistido por IA local usando Ollama.
- Persistencia de auditorías en SQLite.
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
- Base de datos: SQLite
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
├── docker-compose.yml           # Backend + frontend local
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
uvicorn app.main:app --reload
```

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

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:4173`

Ollama no se levanta dentro de Docker Compose. Debe estar instalado y ejecutándose localmente. El backend en Docker usa `host.docker.internal:11434` para conectarse a Ollama.

### Migraciones Alembic

Crear una nueva migración:

```bash
python -m alembic revision --autogenerate -m "descripcion del cambio"
```

Aplicar migraciones:

```bash
python -m alembic upgrade head
```

Si ya existe una base creada antes de Alembic:

```bash
python -m alembic stamp 001_initial_schema
python -m alembic upgrade head
```

### Pre-commit hooks

```bash
pip install pre-commit
pre-commit install
pre-commit run --all-files
```

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
- Persistencia en PostgreSQL para producción.
- Mejorar cobertura de tests y añadir umbrales mínimos.
- Code splitting para reducir chunk de PDF.
- Roles de usuario y permisos.
- Comparación entre auditorías de una misma API.
- Integración opcional con modelos remotos además de Ollama local.
