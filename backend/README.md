## Jobnova Backend (NestJS + Prisma)

Backend API for the Jobnova project, built with NestJS, Prisma and PostgreSQL.

### Prerequisites

- **Node.js**: v18+ (LTS recommended)
- **npm**: v9+ (comes with Node)
- **PostgreSQL**: running locally or reachable via `DATABASE_URL`
- **Prisma CLI**: installed via `devDependencies` (used through `npx`)

### Environment configuration

- **Base file**: `.env.example` lives in the `backend` folder.
- **Create your local env file**:

```bash
cd backend
cp .env.example .env
```

- Update `.env` with:
  - **PORT**: API port (default `3000`)
  - **DATABASE_URL**: PostgreSQL connection string
  - **CORS_ORIGIN / ALLOWED_ORIGINS**: frontend origin(s), e.g. `http://localhost:3001`
  - **JWT_ACCESS_SECRET / JWT_REFRESH_SECRET**: long random strings
  - **JWT_ACCESS_TTL / JWT_REFRESH_TTL**: token lifetimes (e.g. `15m`, `7d`)
  - **BCRYPT_ROUNDS**: hashing cost (e.g. `12`)
  - **MAIL_***: optional mail settings for verification / reset flows

### Install dependencies

From the `backend` directory:

```bash
npm install
```

### Prisma: migrate & generate

Ensure the database configured in `DATABASE_URL` exists, then run:

```bash
# Apply migrations (creates schema if needed)
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate
```

You can re-run `migrate dev` whenever the schema changes.

### Run the backend

From the `backend` directory:

```bash
# Development
npm run start:dev

# Plain development (no watch)
npm run start

# Production build + run
npm run build
npm run start:prod
```

By default the API will be available at:

- **Base URL**: `http://localhost:3000`
- **API prefix**: `v1`
- Example: `http://localhost:3000/v1/auth/login`

### API collections (Postman & Thunder Client)

- **Postman collection**: `backend/docs/postman_collection.json`
  - Import via **Postman → Import → File** and select the JSON file.
  - Set **`{{baseUrl}}`** variable to `http://localhost:3000/v1`.
  - Use **`{{candidateAccessToken}}`** and **`{{hrAccessToken}}`** environment variables after logging in.

- **Thunder Client collection**: `backend/docs/thunder_collection.json`
  - In VS Code, open **Thunder Client → Collections → Import** and select the JSON file.
  - Ensure the environment includes:
    - `baseUrl` (e.g. `http://localhost:3000/v1`)
    - `candidateAccessToken`
    - `hrAccessToken`

Both collections cover the main flows:

- **Auth**: register, verify email, login, refresh, logout, forgot/reset password, `me`
- **Organizations**: create organization (HR/Admin), list my orgs
- **Jobs**: create/update/delete jobs (HR/Admin), list jobs, get job
- **Applications**: apply to job (Candidate), list my applications, list by job, update status (HR/Admin)

### Smoke Test (PowerShell)

From PowerShell, with the backend running and `.env` configured:

```powershell
$baseUrl = "http://localhost:3000/v1"

# 1) Register a candidate
$candidateBody = @{
  fullName = "Alice Candidate"
  email    = "alice@example.com"
  password = "Password123!"
  role     = "candidate"
}
$registerCandidate = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/register" -Body ($candidateBody | ConvertTo-Json) -ContentType "application/json"

# 2) Login as candidate
$loginBody = @{
  email    = "alice@example.com"
  password = "Password123!"
}
$candidateLogin = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/login" -Body ($loginBody | ConvertTo-Json) -ContentType "application/json"
$candidateToken = $candidateLogin.accessToken

# 3) Call /auth/me as candidate
Invoke-RestMethod -Method Get -Uri "$baseUrl/auth/me" -Headers @{ Authorization = "Bearer $candidateToken" }

# 4) (Optional) Register & login HR to get HR token
$hrBody = @{
  fullName = "Henry HR"
  email    = "hr@example.com"
  password = "Password123!"
  role     = "hr"
}
$registerHr = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/register" -Body ($hrBody | ConvertTo-Json) -ContentType "application/json"

$hrLoginBody = @{
  email    = "hr@example.com"
  password = "Password123!"
}
$hrLogin = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/login" -Body ($hrLoginBody | ConvertTo-Json) -ContentType "application/json"
$hrToken = $hrLogin.accessToken

# 5) (Optional) Create an org as HR (requires email verification depending on flow)
$orgBody = @{
  name = "Jobnova Test Org"
}
Invoke-RestMethod -Method Post -Uri "$baseUrl/orgs" -Headers @{ Authorization = "Bearer $hrToken" } -Body ($orgBody | ConvertTo-Json) -ContentType "application/json"
```

This is only a minimal smoke test. For a full flow, import the Postman / Thunder collections and follow:

1. **Auth**: register, verify email, login, `me`
2. **Orgs**: HR/Admin creates an organization
3. **Jobs**: HR/Admin creates a job for that organization
4. **Applications**: Candidate applies to an **active** job

