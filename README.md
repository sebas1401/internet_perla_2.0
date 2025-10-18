# InternetPerla App and Admin System (Mono-repo)

Estructura
- /apps/backend: NestJS + TypeORM + PostgreSQL + JWT (roles ADMIN, USER)
- /apps/frontend: React + Vite + TypeScript + Tailwind
- docker-compose.yml: orquesta db, backend, frontend

Arranque con Docker
- Copia apps/backend/.env.example a apps/backend/.env (opcional; compose inyecta valores por defecto)
- Ejecuta: `docker compose up --build`
- Backend: http://localhost:3000/api/v1
- Health: http://localhost:3000/api/v1/health
- Frontend: http://localhost:5173

Arranque local sin Docker
- Backend: entra a apps/backend, copia .env.example a .env, `npm install`, `npm run start:dev`, `npm run seed`
- Frontend: entra a apps/frontend, copia .env.example a .env, `npm install`, `npm run dev`

Variables de entorno
- Backend: PORT, DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE, DB_SYNC, JWT_SECRET, JWT_EXPIRES_IN
- Frontend: VITE_API_URL (por defecto http://localhost:3000/api/v1)

Auth y Roles
- Registro: POST /api/v1/auth/register { name, email, password }
- Login: POST /api/v1/auth/login { email, password }
- Roles: ADMIN, USER

Entidad principal (Clientes)
- CRUD: /api/v1/customers (ADMIN crea/edita/elimina; ambos roles listan/ven)

Endpoints clave
- GET /api/v1/health -> {status:'ok'}
- POST /api/v1/auth/login, /api/v1/auth/register
- GET/POST/PATCH/DELETE /api/v1/customers

Credenciales de prueba (seed)
- admin@example.com / 123456 (ADMIN)
- user@example.com / 123456 (USER)

Notas sobre el diseño
- Se respetan componentes y estilos del directorio original `InternetPerla App and Admin System`. La app actual reutiliza tipografía Montserrat y color primario, y está lista para integrar/combinar componentes existentes.

