PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  cost_center TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_titles (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  salary_band_min REAL NOT NULL DEFAULT 0 CHECK (salary_band_min >= 0),
  salary_band_max REAL NOT NULL DEFAULT 0 CHECK (salary_band_max >= salary_band_min),
  UNIQUE (title, department_id)
);

CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY,
  employee_code TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  job_title_id INTEGER NOT NULL REFERENCES job_titles(id) ON DELETE RESTRICT,
  manager_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  employment_type TEXT NOT NULL CHECK (employment_type IN ('Full-time', 'Part-time', 'Contract', 'Intern')),
  status TEXT NOT NULL CHECK (status IN ('Active', 'On leave', 'Probation', 'Inactive')),
  hire_date TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(last_name, first_name);

CREATE TABLE IF NOT EXISTS employee_contacts (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL CHECK (contact_type IN ('Work phone', 'Mobile', 'Other')),
  contact_value TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  UNIQUE (employee_id, contact_type, contact_value)
);

CREATE TABLE IF NOT EXISTS employee_addresses (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  address_type TEXT NOT NULL CHECK (address_type IN ('Home', 'Mailing')),
  street TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  postal_code TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  UNIQUE (employee_id, address_type)
);

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS compensation_history (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  annual_salary REAL NOT NULL CHECK (annual_salary >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  effective_date TEXT NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (employee_id, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_compensation_employee_date ON compensation_history(employee_id, effective_date DESC);

CREATE TABLE IF NOT EXISTS employment_status_history (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('Active', 'On leave', 'Probation', 'Inactive')),
  effective_date TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (employee_id, effective_date)
);