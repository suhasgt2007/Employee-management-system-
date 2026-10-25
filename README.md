# Fieldwork Employee Management

A local employee directory with separate React and Angular clients, a REST API backed by SQLite, and an optional JSON Server mock API. The project uses Bootstrap 5 for responsive layout and controls. **Spring / Spring Boot is not used.**

## Project layout

```text
backend/                 Express API and optional JSON Server mock
database/                SQLite schema and starter seed data
data/                    Generated SQLite database (created on first run)
docs/                    Architecture and database references
frontend/react/          React + Vite client (Axios)
frontend/angular/        Angular client
```

## Start the SQL-backed application

Requires Node.js 20.19+ and npm.

```bash
npm install
npm run dev
```

Open the React app at `http://localhost:5173`. The command starts the Express API at `http://localhost:3001`; Vite proxies `/api` requests to it. The SQLite database and six example employees are initialized automatically in `data/employees.sqlite`.

To use the Angular client instead, keep the API running and start a second terminal:

```bash
npm run dev:angular
```

Open `http://localhost:4200`. Angular proxies `/api` to the same SQL API.

## Section 6: JSON Server mock API

The mock is an optional frontend-development alternative. It reads and writes `backend/mock/db.json` and does not replace the normalized SQLite database.

```bash
npm run dev:mock
```

Open `http://localhost:5173`. This starts JSON Server at `http://localhost:3002` and React in mock mode; Vite proxies `/mock-api` to JSON Server. Mock edits are written back to `db.json`. The Angular client remains connected to SQLite.

## Employee workflows

- Search by name, email, or employee code; filter by department and status.
- Add and edit employee, manager, role, salary, contact, address, and emergency-contact information.
- Review compensation and employment-status history on the React edit form.
- Archive an employee without deleting retained employment history.
- Export the visible directory to CSV.

## REST API

The SQL API is available under `/api`:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Service health |
| `GET` | `/api/overview` | Directory summary counts |
| `GET` | `/api/employees?search=&status=` | Search/filter active records |
| `GET` | `/api/employees/:id` | Employee and related history |
| `POST` | `/api/employees` | Create employee and related records |
| `PUT` | `/api/employees/:id` | Update employee and related records |
| `DELETE` | `/api/employees/:id` | Archive employee (soft delete) |
| `GET` | `/api/departments` | Department list |
| `GET` | `/api/job-titles?departmentId=` | Roles for a department |

See [Database design](docs/database.md) for the relational model and [Architecture](docs/architecture.md) for data flows and mock behavior.