# AI API Auditor

<p align="center">
  <img src="ai-api-auditor-frontend/src/assets/hero.png" alt="AI API Auditor - plataforma SaaS de auditoría inteligente de APIs" width="900" />
</p>

<p align="center">
  <strong>Plataforma SaaS de auditoría inteligente de APIs OpenAPI/Swagger con FastAPI, React, PostgreSQL, Docker y análisis asistido por IA.</strong>
</p>

AI API Auditor permite analizar especificaciones OpenAPI, evaluar endpoints REST, detectar problemas de seguridad, diseño, documentación y mantenibilidad, y presentar resultados en una interfaz SaaS con dashboard ejecutivo, historial de auditorías, métricas técnicas y comparación evolutiva.

El proyecto está diseñado como producto full-stack desplegable y como portfolio profesional senior: backend robusto, frontend orientado a producto, autenticación, persistencia, migraciones, testing, CI/CD y ejecución con Docker Compose.

## Capturas

### Página Principal

![Página principal de AI API Auditor](ai-api-auditor-frontend/src/assets/screenshots/main-page.png)

### Dashboard Ejecutivo

![Dashboard ejecutivo con métricas de auditoría](ai-api-auditor-frontend/src/assets/screenshots/dashboard.png)

### Comparación Evolutiva

![Comparación evolutiva entre auditorías](ai-api-auditor-frontend/src/assets/screenshots/evolution.png)

### Historial de Auditorías

![Historial de auditorías con filtros](ai-api-auditor-frontend/src/assets/screenshots/history.png)

## Qué Hace

- Analiza especificaciones OpenAPI/Swagger enviadas por el usuario.
- Extrae endpoints REST y calcula métricas de calidad técnica.
- Detecta riesgos de seguridad, problemas de diseño REST, carencias de documentación y oportunidades de mejora.
- Usa Ollama para análisis asistido por IA local.
- Genera issues estructurados con severidad, categoría, evidencia, recomendación y sugerencias de corrección.
- Consolida problemas repetidos y endpoints afectados.
- Muestra un dashboard ejecutivo con distribución de riesgos, score medio y evolución entre auditorías.
- Mantiene historial por usuario con filtros, búsqueda, detalle técnico, notas internas y etiquetas.
- Permite exportar resultados en formatos técnicos y de informe.

## Características Principales

- **Autenticación SaaS:** registro, inicio de sesión y protección de endpoints mediante JWT.
- **Auditoría inteligente de APIs:** análisis automático de contratos OpenAPI y endpoints REST.
- **Dashboard ejecutivo:** métricas agregadas, riesgos, puntuaciones y problemas principales.
- **Comparación evolutiva:** cambios de puntuación, riesgo, problemas nuevos, problemas resueltos y endpoints mejorados o empeorados.
- **Historial de auditorías:** listado multiusuario con filtros, búsqueda, ordenación y detalle.
- **Detección de riesgos:** clasificación por bajo, medio, alto y crítico.
- **Métricas técnicas:** score normalizado, total de endpoints, distribución de riesgos y recomendaciones.
- **Gestión interna:** notas privadas y etiquetas por auditoría.
- **Exportación de informes:** JSON, TXT, Markdown e informe HTML imprimible.
- **Compatibilidad local y Docker:** SQLite para desarrollo rápido y PostgreSQL con Docker Compose.

## Stack Tecnológico

### Backend

- Python
- FastAPI
- SQLAlchemy
- PostgreSQL
- SQLite para desarrollo local y tests
- Alembic
- Pydantic
- JWT con `python-jose`
- Hashing de contraseñas con `passlib` y bcrypt

### Frontend

- React
- Vite
- Vitest
- React Testing Library
- ESLint

### Infraestructura

- Docker
- Docker Compose
- GitHub Actions
- PostgreSQL en contenedor
- Migraciones automáticas con Alembic al arrancar backend en Docker

### IA

- Ollama
- Modelo local configurable mediante `OLLAMA_MODEL`
- Análisis asistido por IA con salida normalizada en castellano

## Arquitectura General

```text
ai-api-auditor/
├── app/                         # Backend FastAPI
│   ├── core/                    # Configuración, seguridad y JWT
│   ├── db/                      # Engine SQLAlchemy y sesiones
│   ├── dependencies/            # Auth y rate limiting
│   ├── models/                  # Modelos SQLAlchemy
│   ├── routers/                 # Endpoints HTTP
│   ├── schemas/                 # Contratos Pydantic
│   ├── services/                # OpenAPI, scoring e integración IA
│   └── utils/                   # Utilidades de dominio
├── ai-api-auditor-frontend/      # Frontend React/Vite
│   ├── src/assets/screenshots/  # Capturas del producto
│   ├── src/components/          # Componentes de interfaz
│   ├── src/hooks/               # Hooks de auth y auditorías
│   ├── src/utils/               # API client, reportes y helpers
│   └── src/test/                # Setup de tests frontend
├── alembic/                     # Migraciones de base de datos
├── tests/                       # Tests backend
├── .github/workflows/           # CI/CD
├── Dockerfile                   # Imagen backend
├── docker-compose.yml           # PostgreSQL + backend + frontend
└── README.md
```

## Flujo de Auditoría

1. El usuario inicia sesión y envía una especificación OpenAPI desde el frontend.
2. El backend valida tamaño, estructura, paths y operaciones permitidas.
3. Se extraen endpoints REST compatibles.
4. Cada endpoint se analiza según el modo seleccionado: seguridad, diseño REST, documentación o enterprise.
5. Ollama genera un análisis asistido por IA y el backend normaliza la salida.
6. Se calculan score, riesgo global, issues, recomendaciones y métricas agregadas.
7. La auditoría se persiste asociada al usuario autenticado.
8. El frontend presenta dashboard, historial, detalle por endpoint, comparación evolutiva y exportaciones.

## Instalación Local

### Requisitos

- Python 3.11 o superior recomendado.
- Node.js 20 o superior recomendado.
- Ollama instalado si se quiere usar análisis IA local.
- Docker opcional para ejecutar PostgreSQL, backend y frontend de forma integrada.

### Backend

```bash
python -m venv venv
venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m alembic upgrade head
uvicorn app.main:app --reload
```

Servicios locales del backend:

- API: `http://127.0.0.1:8000`
- Swagger UI: `http://127.0.0.1:8000/docs`

Por defecto, el backend usa SQLite:

```env
DATABASE_URL=sqlite:///./ai_api_auditor.db
```

También puede apuntar a PostgreSQL local mediante `DATABASE_URL`:

```env
DATABASE_URL=postgresql+psycopg2://ai_api_auditor:ai_api_auditor_password@localhost:5432/ai_api_auditor
```

### Frontend

```bash
cd ai-api-auditor-frontend
npm install
npm run dev
```

Frontend local:

- `http://127.0.0.1:5173`

Variable recomendada para desarrollo:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### Ollama

```bash
ollama pull llama3
ollama run llama3
```

Variables relevantes:

```env
OLLAMA_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=llama3
OLLAMA_TIMEOUT_SECONDS=60
```

Ollama no se levanta desde Docker Compose. Si se ejecuta el backend en Docker, se usa `http://host.docker.internal:11434/api/generate` por defecto.

## Ejecución con Docker Compose

Levantar todos los servicios:

```bash
docker compose up --build
```

Levantar desde cero eliminando contenedores huérfanos:

```bash
docker compose down --remove-orphans
docker compose up --build
```

Recrear también el volumen de PostgreSQL:

```bash
docker compose down --volumes --remove-orphans
docker compose up --build
```

Servicios expuestos:

- PostgreSQL: `localhost:5433`
- Backend: `http://localhost:8000`
- Frontend preview: `http://localhost:4173`

Dentro de Docker, el backend conecta con PostgreSQL usando el hostname interno `postgres`:

```text
postgresql+psycopg2://<POSTGRES_USER>:<POSTGRES_PASSWORD>@postgres:5432/<POSTGRES_DB>
```

El backend espera a que PostgreSQL esté saludable, valida conectividad por socket, aplica migraciones Alembic y después inicia Uvicorn.

## Variables de Entorno

Backend local (`.env` en la raíz):

```env
DATABASE_URL=sqlite:///./ai_api_auditor.db
SECRET_KEY=change-me-in-production
TOKEN_ISSUER=ai-api-auditor
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
OLLAMA_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=llama3
OLLAMA_TIMEOUT_SECONDS=60
MAX_OPENAPI_SIZE_CHARS=200000
MAX_REQUEST_BODY_SIZE_CHARS=250000
MAX_OPENAPI_ENDPOINTS=50
MAX_OPENAPI_OPERATIONS_PER_PATH=5
RATE_LIMIT_LOGIN_REQUESTS=5
RATE_LIMIT_LOGIN_WINDOW_SECONDS=60
RATE_LIMIT_AI_REQUESTS=10
RATE_LIMIT_AI_WINDOW_SECONDS=300
```

PostgreSQL en Docker Compose:

```env
POSTGRES_DB=ai_api_auditor
POSTGRES_USER=ai_api_auditor
POSTGRES_PASSWORD=ai_api_auditor_password
```

Frontend (`ai-api-auditor-frontend/.env`):

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

En producción, `SECRET_KEY` y `POSTGRES_PASSWORD` deben sustituirse por valores seguros gestionados fuera del repositorio.

## Migraciones

Aplicar migraciones localmente:

```bash
python -m alembic upgrade head
```

Ver migración actual:

```bash
python -m alembic current
```

Crear una nueva migración:

```bash
python -m alembic revision --autogenerate -m "descripcion_del_cambio"
```

Aplicar migraciones dentro del backend Docker:

```bash
docker compose run --rm backend python -m alembic upgrade head
```

## Seguridad

- Autenticación mediante JWT.
- Hashing de contraseñas con bcrypt.
- Validación backend con Pydantic para credenciales, auditorías, payloads y metadatos.
- Control de acceso por usuario en consultas y detalle de auditorías.
- Rate limiting básico para login y auditorías IA.
- CORS configurado por entorno.
- Límite de tamaño para requests y documentos OpenAPI.
- Validación de paths, métodos HTTP y número de endpoints analizados.
- Headers de seguridad HTTP para reducir exposición del navegador.
- Separación clara entre frontend, backend, base de datos y servicio IA.
- Mensajes de error controlados para evitar exponer detalles internos del proveedor IA.

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

Validaciones incluidas:

- Tests backend con pytest.
- Tests frontend con Vitest y React Testing Library.
- Linting backend con flake8.
- Linting frontend con ESLint.
- Build de producción del frontend.
- Workflow de GitHub Actions en `push` y `pull_request`.

## CI/CD

GitHub Actions ejecuta validaciones automáticas para backend y frontend:

- Instalación de dependencias.
- Validación de sintaxis Python.
- Linting backend.
- Import del backend FastAPI.
- Tests backend.
- Tests frontend.
- Linting frontend.
- Build frontend.

Workflow principal:

```text
.github/workflows/ci.yml
```

## Qué Demuestra Este Proyecto

- Diseño de una plataforma SaaS full-stack con autenticación y persistencia multiusuario.
- Arquitectura backend con FastAPI, SQLAlchemy, Alembic y PostgreSQL.
- Frontend React orientado a producto con dashboard, historial, detalle y exportaciones.
- Integración de análisis asistido por IA local con Ollama.
- Modelado de dominio para auditorías, endpoints, riesgos, issues y recomendaciones.
- Buenas prácticas de seguridad, validación de datos y control de acceso.
- Testing automatizado y CI/CD básico.
- Despliegue local profesional mediante Docker Compose.

## Roadmap Futuro

- Refresh tokens y rotación de sesión.
- Roles de usuario y permisos por organización.
- Comparación avanzada entre auditorías de una misma API.
- Integración opcional con proveedores IA remotos.
- Métricas históricas por proyecto o workspace.
- Umbrales mínimos de cobertura en CI.
- Perfiles Docker separados para desarrollo y producción.

## Licencia

Este repositorio no declara todavía una licencia formal. Si quieres reutilizar el código fuera de un contexto de evaluación o portfolio, define primero una licencia explícita en el proyecto.
