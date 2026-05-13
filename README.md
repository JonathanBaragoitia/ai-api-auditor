# AI API Auditor

SaaS full-stack de auditoría inteligente de APIs OpenAPI con IA local. Permite subir una especificación OpenAPI, analizar endpoints REST, detectar problemas de seguridad/diseño/documentación y generar un informe ejecutivo con score, riesgo, issues estructurados y recomendaciones accionables.

El proyecto está pensado como portfolio técnico: muestra arquitectura full-stack, autenticación, persistencia, migraciones, integración con LLM local, testing automatizado, CI/CD y una interfaz SaaS orientada a producto.

## Demo

Actualmente no hay capturas versionadas en el repositorio. La app se puede ejecutar localmente con backend en `http://127.0.0.1:8000` y frontend en `http://127.0.0.1:5173`.

Cuando se añadan capturas reales, esta sección puede incluir:

- Login y registro.
- Dashboard ejecutivo.
- Análisis OpenAPI.
- Historial con filtros.
- Detalle de auditoría.
- Exportación de informe.

## Features Principales

- Registro e inicio de sesión con JWT.
- Auditoría automática de esquemas OpenAPI.
- Auditoría manual de endpoints.
- Modos de auditoría: seguridad, diseño REST, documentación y enterprise.
- Dashboard ejecutivo con métricas históricas, distribución de riesgos y comparación básica de evolución.
- Historial por usuario con búsqueda, filtros, ordenación y detalle.
- Issues estructurados con severidad, categoría, evidencia, recomendación y sugerencias de corrección.
- Deduplicación inteligente de findings y recomendaciones similares.
- Consolidación de endpoints afectados por issue o recomendación.
- Exportación de informes en JSON, TXT y Markdown.
- Informe HTML imprimible desde navegador.
- Notas internas y etiquetas por auditoría.
- Estados de ejecución: pending, processing, completed y failed.
- Estados vacíos profesionales para dashboard, historial, resultados, issues y recomendaciones.
- Error Boundary global para evitar pantalla negra ante errores de renderizado.
- Migraciones de base de datos con Alembic.
- Tests backend y frontend.
- CI/CD con GitHub Actions.
- Docker Compose para levantar PostgreSQL, backend y frontend localmente.
- Pre-commit hooks para controles básicos de calidad.

## Stack Técnico

- Backend: FastAPI, SQLAlchemy, Pydantic.
- Autenticación: JWT, bcrypt/passlib.
- Migraciones: Alembic.
- Base de datos: SQLite en desarrollo local/tests, PostgreSQL con Docker Compose.
- IA local: Ollama con `llama3` por defecto.
- Frontend: React, Vite.
- Testing backend: pytest.
- Testing frontend: Vitest, React Testing Library, jest-dom, jsdom.
- Calidad: flake8, ESLint, pre-commit.
- CI/CD: GitHub Actions.
- DevOps local: Docker y Docker Compose.

## Arquitectura

```text
ai-api-auditor/
├── app/                         # Backend FastAPI
│   ├── core/                    # Configuración y seguridad
│   ├── db/                      # Base SQLAlchemy y sesiones
│   ├── dependencies/            # Auth y rate limiting
│   ├── models/                  # Modelos SQLAlchemy
│   ├── routers/                 # Rutas HTTP: auth y audits
│   ├── schemas/                 # Contratos Pydantic
│   ├── services/                # Auditoría, OpenAPI e integración IA
│   └── utils/                   # Scoring y utilidades
├── ai-api-auditor-frontend/      # Frontend React/Vite
│   ├── src/components/          # Componentes UI
│   ├── src/hooks/               # Hooks de auth y auditorías
│   ├── src/utils/               # API client, exportaciones y helpers
│   └── src/test/                # Setup de tests frontend
├── alembic/                     # Migraciones de base de datos
├── tests/                       # Tests backend
├── .github/workflows/           # CI/CD
├── Dockerfile                   # Imagen backend
├── docker-compose.yml           # PostgreSQL + backend + frontend
└── README.md
```

## Flujo de Auditoría OpenAPI

1. El usuario inicia sesión y envía un esquema OpenAPI desde el frontend.
2. El backend valida tamaño, estructura, paths y operaciones permitidas.
3. Se extraen endpoints REST (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).
4. Cada endpoint se analiza con Ollama según el modo de auditoría seleccionado.
5. El backend normaliza la respuesta IA, estructura issues y recomendaciones, deduplica findings similares y calcula riesgo global.
6. La auditoría se persiste asociada al usuario autenticado.
7. El frontend muestra resumen ejecutivo, dashboard, historial, detalle por endpoint y exportaciones.

## Ejecutar Local Sin Docker

### Requisitos

- Python 3.11+ recomendado.
- Node.js 20+ recomendado.
- Ollama instalado si quieres usar análisis IA local.
- Docker opcional para levantar PostgreSQL y servicios completos.

### Backend

```bash
python -m venv venv
venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m alembic upgrade head
uvicorn app.main:app --reload
```

Backend:

- API: `http://127.0.0.1:8000`
- Swagger UI: `http://127.0.0.1:8000/docs`

Por defecto se usa SQLite con `DATABASE_URL=sqlite:///./ai_api_auditor.db`.
Puedes usar PostgreSQL local cambiando `DATABASE_URL`, por ejemplo:

```env
DATABASE_URL=postgresql+psycopg2://ai_api_auditor:ai_api_auditor_password@localhost:5432/ai_api_auditor
```

### Frontend

```bash
cd ai-api-auditor-frontend
npm install
npm run dev
```

Frontend:

- `http://127.0.0.1:5173`

### Ollama Local

Instalar Ollama y descargar el modelo configurado:

```bash
ollama pull llama3
ollama run llama3
```

El backend espera Ollama en:

```env
OLLAMA_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=llama3
```

Si Ollama no está disponible, las auditorías IA pueden fallar con estado `failed` y mensaje de error persistido.

## Docker Compose

```bash
docker compose up --build
```

Servicios:

- PostgreSQL: `localhost:5432`
- Backend: `http://localhost:8000`
- Frontend preview: `http://localhost:4173`

Docker Compose levanta PostgreSQL, espera a que esté saludable y ejecuta `python -m alembic upgrade head` antes de iniciar Uvicorn.

La URL de conexión del backend se construye automáticamente dentro de Compose con `POSTGRES_DB`, `POSTGRES_USER` y `POSTGRES_PASSWORD`:

```text
postgresql+psycopg2://<POSTGRES_USER>:<POSTGRES_PASSWORD>@postgres:5432/<POSTGRES_DB>
```

Ollama no se levanta dentro de Docker Compose. Debe correr localmente; el backend en Docker usa `http://host.docker.internal:11434/api/generate`.

## Variables de Entorno

Backend local (`.env` en raíz):

```env
DATABASE_URL=sqlite:///./ai_api_auditor.db
SECRET_KEY=change-me-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
OLLAMA_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=llama3
OLLAMA_TIMEOUT_SECONDS=60
MAX_OPENAPI_SIZE_CHARS=200000
MAX_OPENAPI_ENDPOINTS=50
MAX_OPENAPI_OPERATIONS_PER_PATH=5
RATE_LIMIT_LOGIN_REQUESTS=5
RATE_LIMIT_LOGIN_WINDOW_SECONDS=60
RATE_LIMIT_AI_REQUESTS=10
RATE_LIMIT_AI_WINDOW_SECONDS=300
```

Docker Compose con PostgreSQL:

```env
POSTGRES_DB=ai_api_auditor
POSTGRES_USER=ai_api_auditor
POSTGRES_PASSWORD=ai_api_auditor_password
# Compose inyecta en backend:
# DATABASE_URL=postgresql+psycopg2://ai_api_auditor:ai_api_auditor_password@postgres:5432/ai_api_auditor
```

Frontend (`ai-api-auditor-frontend/.env`):

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Nota: el proyecto usa `OLLAMA_URL`, no `OLLAMA_BASE_URL`.

## Migraciones

Aplicar migraciones:

```bash
python -m alembic upgrade head
```

Aplicar migraciones dentro del backend Docker:

```bash
docker compose run --rm backend python -m alembic upgrade head
```

Ver migración actual:

```bash
python -m alembic current
```

Crear una nueva migración:

```bash
python -m alembic revision --autogenerate -m "descripcion del cambio"
```

Si tu base local fue creada antes de Alembic pero ya tiene tablas iniciales:

```bash
python -m alembic stamp 001_initial_schema
python -m alembic upgrade head
```

## Testing y Calidad

Backend:

```bash
python -m pytest
python -m flake8 app/ tests/ --max-line-length=120 --extend-ignore=E203,W503
```

Frontend:

```bash
cd ai-api-auditor-frontend
npm run test -- --run
npm run lint
npm run build
```

Pre-commit:

```bash
python -m pip install pre-commit
pre-commit install
pre-commit run --all-files
```

## CI/CD

GitHub Actions ejecuta validaciones en `push` y `pull_request`:

- Backend: instalación de dependencias, validación de sintaxis, flake8, import de FastAPI y pytest.
- Frontend: instalación de dependencias, Vitest, ESLint y build de producción con Vite.

Workflow:

```text
.github/workflows/ci.yml
```

## Qué Demuestra Este Proyecto

- Arquitectura full-stack con separación clara entre frontend, backend, base de datos y servicio IA.
- Construcción de una experiencia SaaS real: autenticación, historial multiusuario, dashboard, notas, etiquetas y estados robustos.
- Integración de IA local con control de fallos y normalización de salida.
- Modelado de dominio: auditorías, endpoints, issues, recomendaciones, riesgos y estados de ejecución.
- Seguridad aplicada: JWT, hashing de contraseñas, ownership por usuario y rate limiting básico.
- Persistencia mantenible con SQLAlchemy y Alembic.
- Calidad de producto frontend: Error Boundary, estados vacíos, componentes reutilizables, exportaciones y tests.
- Testing automatizado en backend y frontend.
- CI/CD básico con GitHub Actions.
- Prácticas de DevOps local con Docker Compose y PostgreSQL.

## Próximas Mejoras Posibles

- Refresh tokens.
- Roles de usuario y permisos.
- Comparación avanzada entre auditorías de una misma API.
- Integración opcional con modelos remotos además de Ollama local.
- Umbrales mínimos de cobertura en CI.
- Separar perfiles Docker de desarrollo y producción.
