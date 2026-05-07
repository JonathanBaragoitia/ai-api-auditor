# Auditor de APIs con IA

Aplicación full stack para evaluar la calidad técnica de APIs REST a partir de descripciones manuales o esquemas OpenAPI. El sistema analiza buenas prácticas de diseño, seguridad, documentación y consistencia, y devuelve una puntuación con nivel de riesgo, hallazgos y recomendaciones.

## Funcionalidades principales

- Auditoría manual de endpoints (`método`, `ruta`, `descripción`, ejemplos de request/response).
- Auditoría automática de esquemas OpenAPI (análisis por endpoint y resultado global).
- Historial de auditorías persistido en SQLite.
- Autenticación básica con JWT (registro, login y protección de endpoints sensibles).
- Interfaz web en React con flujo de autenticación, análisis y exportación de resultado en JSON.
- Pipeline CI/CD con GitHub Actions para validación automática de backend y frontend.

## Stack tecnológico

- Backend: FastAPI, SQLAlchemy, Pydantic
- Frontend: React + Vite
- Base de datos: SQLite
- Autenticación: JWT + bcrypt/passlib
- IA local: Ollama
- CI/CD: GitHub Actions

## Arquitectura (Frontend / Backend)

- `app/`: backend FastAPI
  - `app/main.py`: arranque de aplicación y registro de routers
  - `app/routers/`: endpoints (`audits`, `auth`)
  - `app/services/`: lógica de análisis y servicios IA/OpenAPI
  - `app/models/`: modelos SQLAlchemy (`Audit`, `User`)
  - `app/schemas/`: contratos de entrada/salida
  - `app/dependencies/`: dependencias reutilizables (auth)
  - `app/core/`: configuración y seguridad
- `ai-api-auditor-frontend/`: frontend React
  - `src/App.jsx`: flujo principal de autenticación y análisis
  - `src/components/`: componentes UI (login, formulario, resultados, historial)
  - `src/utils/api.js`: cliente API centralizado

## Cómo ejecutar el backend

Requisitos:

- Python 3.11+
- Ollama debe estar instalado y ejecutándose para utilizar el análisis IA local.

Pasos:

```bash
python -m venv venv
venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

API disponible en:

- `http://127.0.0.1:8000`
- Swagger UI: `http://127.0.0.1:8000/docs`

## Cómo ejecutar el frontend

Requisitos:

- Node.js 20+

Pasos:

```bash
cd ai-api-auditor-frontend
npm install
npm run dev
```

Frontend disponible en:

- `http://127.0.0.1:5173` (por defecto en Vite)

Configuración de entorno frontend:

- Crear `.env` en `ai-api-auditor-frontend/` usando `.env.example`.
- Variable principal:
  - `VITE_API_BASE_URL=http://127.0.0.1:8000`

## Cómo ejecutar tests

Desde la raíz del proyecto:

```bash
python -m pytest
```

Los tests usan una base SQLite en memoria para evitar afectar la base local de desarrollo.

## Cómo funciona la autenticación

1. El usuario se registra (`POST /auth/register`) o inicia sesión (`POST /auth/login`).
2. El backend valida credenciales, hashea/verifica contraseña con bcrypt y genera un JWT.
3. El frontend guarda el token y lo envía en `Authorization: Bearer <token>` en endpoints protegidos.
4. Endpoints sensibles de auditoría requieren token válido.
5. Si el backend responde `401`, el frontend cierra sesión automáticamente.

## Cómo funciona el análisis OpenAPI

1. El frontend envía un esquema OpenAPI JSON a `POST /audits/openapi`.
2. El backend extrae endpoints válidos (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).
3. Cada endpoint se analiza con la capa de IA (Ollama) para detectar riesgos y mejoras.
4. Se calcula un resultado global:
   - `average_score`
   - `global_risk_level`
   - lista de hallazgos por endpoint
5. El frontend muestra tarjetas de resumen, detalle por endpoint e historial.

## CI/CD

El workflow de GitHub Actions (`.github/workflows/ci.yml`) ejecuta:

- Backend:
  - instalación de dependencias
  - validación de sintaxis Python (`py_compile`)
  - lint con `flake8`
  - tests con `pytest`
  - verificación de import del backend
- Frontend:
  - instalación de dependencias
  - lint (`npm run lint` si existe)
  - build de producción (`npm run build`)

Objetivo: asegurar calidad mínima en cada `push` y `pull_request`.

## Próximas mejoras

- Mejorar cobertura de tests (auth, errores de negocio, casos límite OpenAPI).
- Incorporar migraciones de base de datos (Alembic).
- Añadir refresh token y expiración avanzada de sesión.
- Restringir CORS por entorno (desarrollo vs producción).
- Añadir observabilidad (logs estructurados y métricas).
- Exportación de resultados en formatos adicionales (por ejemplo PDF).
