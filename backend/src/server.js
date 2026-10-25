import express from 'express';
import { db } from './database.js';

const app = express();
const port = Number(process.env.PORT || 3001);
const statuses = new Set(['Active', 'On leave', 'Probation', 'Inactive']);
const employmentTypes = new Set(['Full-time', 'Part-time', 'Contract', 'Intern']);

app.use(express.json());

function validateEmployee(body) {
  const required = ['firstName', 'lastName', 'email', 'departmentId', 'jobTitleId', 'employmentType', 'status', 'hireDate'];
  const missing = required.filter((field) => body[field] === undefined || body[field] === '');
  if (missing.length) return `Required fields: ${missing.join(', ')}`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return 'Enter a valid email address.';
  if (!statuses.has(body.status)) return 'Choose a valid employment status.';
  if (!employmentTypes.has(body.employmentType)) return 'Choose a valid employment type.';
  if (!Number.isFinite(Number(body.departmentId)) || !Number.isFinite(Number(body.jobTitleId))) return 'Choose a valid department and job title.';
  const role = db.prepare('SELECT department_id FROM job_titles WHERE id = ?').get(Number(body.jobTitleId));
  if (!role || role.department_id !== Number(body.departmentId)) return 'Choose a job title from the selected department.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.hireDate)) return 'Enter a valid hire date.';
  if (!Number.isFinite(Number(body.annualSalary ?? 0)) || Number(body.annualSalary ?? 0) < 0) return 'Enter a valid non-negative annual salary.';
  return null;
}

function employeeRecord(id) {
  const employee = db.prepare(`
    SELECT e.*, d.name AS department, jt.title AS job_title,
      m.first_name || ' ' || m.last_name AS manager_name,
      (SELECT annual_salary FROM compensation_history ch WHERE ch.employee_id = e.id ORDER BY effective_date DESC, id DESC LIMIT 1) AS annual_salary,
      (SELECT currency FROM compensation_history ch WHERE ch.employee_id = e.id ORDER BY effective_date DESC, id DESC LIMIT 1) AS currency
    FROM employees e
    JOIN departments d ON d.id = e.department_id
    JOIN job_titles jt ON jt.id = e.job_title_id
    LEFT JOIN employees m ON m.id = e.manager_id
    WHERE e.id = ? AND e.deleted_at IS NULL
  `).get(id);

  if (!employee) return null;
  return {
    ...employee,
    firstName: employee.first_name,
    lastName: employee.last_name,
    employeeCode: employee.employee_code,
    jobTitle: employee.job_title,
    managerId: employee.manager_id,
    managerName: employee.manager_name,
    departmentId: employee.department_id,
    jobTitleId: employee.job_title_id,
    employmentType: employee.employment_type,
    hireDate: employee.hire_date,
    contacts: db.prepare('SELECT contact_type AS type, contact_value AS value, is_primary AS isPrimary FROM employee_contacts WHERE employee_id = ? ORDER BY is_primary DESC, id').all(id),
    addresses: db.prepare('SELECT address_type AS type, street, city, region, postal_code AS postalCode, country FROM employee_addresses WHERE employee_id = ? ORDER BY id').all(id),
    emergencyContacts: db.prepare('SELECT full_name AS fullName, relationship, phone, email FROM emergency_contacts WHERE employee_id = ? ORDER BY id').all(id),
    compensationHistory: db.prepare('SELECT annual_salary AS annualSalary, currency, effective_date AS effectiveDate FROM compensation_history WHERE employee_id = ? ORDER BY effective_date DESC').all(id),
    statusHistory: db.prepare('SELECT status, effective_date AS effectiveDate, note FROM employment_status_history WHERE employee_id = ? ORDER BY effective_date DESC').all(id)
  };
}

const saveEmployee = db.transaction((body, id = null) => {
  const current = id ? employeeRecord(id) : null;
  if (id && !current) return null;

  const values = [
    body.firstName.trim(), body.lastName.trim(), body.email.trim().toLowerCase(), Number(body.departmentId),
    Number(body.jobTitleId), body.managerId ? Number(body.managerId) : null, body.employmentType,
    body.status, body.hireDate, (body.location || '').trim()
  ];
  let employeeId = id;
  if (id) {
    db.prepare(`UPDATE employees SET first_name = ?, last_name = ?, email = ?, department_id = ?, job_title_id = ?,
      manager_id = ?, employment_type = ?, status = ?, hire_date = ?, location = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(...values, id);
  } else {
    const employeeCode = `EMP-${String(Date.now()).slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
    employeeId = db.prepare(`INSERT INTO employees
      (first_name, last_name, email, employee_code, department_id, job_title_id, manager_id, employment_type, status, hire_date, location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(values[0], values[1], values[2], employeeCode, ...values.slice(3)).lastInsertRowid;
  }

  for (const table of ['employee_contacts', 'employee_addresses', 'emergency_contacts']) {
    db.prepare(`DELETE FROM ${table} WHERE employee_id = ?`).run(employeeId);
  }
  const addContact = db.prepare('INSERT INTO employee_contacts (employee_id, contact_type, contact_value, is_primary) VALUES (?, ?, ?, ?)');
  for (const contact of body.contacts || []) {
    if (contact.value?.trim()) addContact.run(employeeId, contact.type || 'Mobile', contact.value.trim(), contact.isPrimary ? 1 : 0);
  }
  const addAddress = db.prepare(`INSERT INTO employee_addresses (employee_id, address_type, street, city, region, postal_code, country) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (const address of body.addresses || []) {
    if (address.street?.trim() || address.city?.trim()) {
      addAddress.run(employeeId, address.type || 'Home', address.street || '', address.city || '', address.region || '', address.postalCode || '', address.country || '');
    }
  }
  const emergency = body.emergencyContact;
  if (emergency?.fullName?.trim() && emergency.phone?.trim()) {
    db.prepare('INSERT INTO emergency_contacts (employee_id, full_name, relationship, phone, email) VALUES (?, ?, ?, ?, ?)')
      .run(employeeId, emergency.fullName.trim(), emergency.relationship || '', emergency.phone.trim(), emergency.email || '');
  }

  const salary = Number(body.annualSalary || 0);
  const currency = body.currency || 'USD';
  const effectiveDate = new Date().toISOString().slice(0, 10);
  if (!current || Number(current.annual_salary || 0) !== salary || current.currency !== currency) {
    db.prepare(`INSERT INTO compensation_history (employee_id, annual_salary, currency, effective_date) VALUES (?, ?, ?, ?)
      ON CONFLICT(employee_id, effective_date) DO UPDATE SET annual_salary = excluded.annual_salary, currency = excluded.currency`)
      .run(employeeId, salary, currency, body.salaryEffectiveDate || (current ? effectiveDate : body.hireDate));
  }
  if (!current || current.status !== body.status) {
    db.prepare(`INSERT INTO employment_status_history (employee_id, status, effective_date, note) VALUES (?, ?, ?, ?)
      ON CONFLICT(employee_id, effective_date) DO UPDATE SET status = excluded.status, note = excluded.note`)
      .run(employeeId, body.status, body.statusEffectiveDate || (current ? effectiveDate : body.hireDate), body.statusNote || (current ? 'Status updated' : 'Initial hire'));
  }
  return employeeRecord(employeeId);
});

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));

app.get('/api/departments', (_request, response) => {
  response.json(db.prepare('SELECT id, name, cost_center AS costCenter FROM departments ORDER BY name').all());
});

app.get('/api/job-titles', (request, response) => {
  const departmentId = Number(request.query.departmentId) || 0;
  response.json(db.prepare(`SELECT id, title, department_id AS departmentId, salary_band_min AS salaryBandMin, salary_band_max AS salaryBandMax
    FROM job_titles WHERE ? = 0 OR department_id = ? ORDER BY title`).all(departmentId, departmentId));
});

app.get('/api/overview', (_request, response) => {
  const overview = db.prepare(`SELECT COUNT(*) AS total FROM employees WHERE deleted_at IS NULL`).get();
  const active = db.prepare(`SELECT COUNT(*) AS total FROM employees WHERE status = 'Active' AND deleted_at IS NULL`).get();
  const departments = db.prepare('SELECT COUNT(*) AS total FROM departments').get();
  const onLeave = db.prepare(`SELECT COUNT(*) AS total FROM employees WHERE status = 'On leave' AND deleted_at IS NULL`).get();
  response.json({ totalEmployees: overview.total, activeEmployees: active.total, departments: departments.total, onLeave: onLeave.total });
});

app.get('/api/employees', (request, response) => {
  const search = `%${String(request.query.search || '').trim()}%`;
  const status = String(request.query.status || '');
  const employees = db.prepare(`
    SELECT e.id, e.employee_code AS employeeCode, e.first_name AS firstName, e.last_name AS lastName, e.email,
      e.status, e.employment_type AS employmentType, e.hire_date AS hireDate, e.location,
      d.name AS department, jt.title AS jobTitle,
      (SELECT annual_salary FROM compensation_history ch WHERE ch.employee_id = e.id ORDER BY effective_date DESC, id DESC LIMIT 1) AS annualSalary,
      (SELECT contact_value FROM employee_contacts ec WHERE ec.employee_id = e.id ORDER BY is_primary DESC, id LIMIT 1) AS phone
    FROM employees e JOIN departments d ON d.id = e.department_id JOIN job_titles jt ON jt.id = e.job_title_id
    WHERE e.deleted_at IS NULL AND (? = '%%' OR e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ? OR e.employee_code LIKE ?)
      AND (? = '' OR e.status = ?)
    ORDER BY e.last_name, e.first_name
  `).all(search, search, search, search, search, status, status);
  response.json({ items: employees, total: employees.length });
});

app.get('/api/employees/:id', (request, response) => {
  const employee = employeeRecord(Number(request.params.id));
  if (!employee) return response.status(404).json({ error: 'Employee not found.' });
  response.json(employee);
});

app.post('/api/employees', (request, response) => {
  const validationError = validateEmployee(request.body);
  if (validationError) return response.status(400).json({ error: validationError });
  try {
    response.status(201).json(saveEmployee(request.body));
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return response.status(409).json({ error: 'That email address is already assigned to an employee.' });
    if (error.code?.startsWith('SQLITE_CONSTRAINT')) return response.status(400).json({ error: 'Employee details do not match a valid department, role, or manager.' });
    throw error;
  }
});

app.put('/api/employees/:id', (request, response) => {
  const validationError = validateEmployee(request.body);
  if (validationError) return response.status(400).json({ error: validationError });
  try {
    const employee = saveEmployee(request.body, Number(request.params.id));
    if (!employee) return response.status(404).json({ error: 'Employee not found.' });
    response.json(employee);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return response.status(409).json({ error: 'That email address is already assigned to an employee.' });
    if (error.code?.startsWith('SQLITE_CONSTRAINT')) return response.status(400).json({ error: 'Employee details do not match a valid department, role, or manager.' });
    throw error;
  }
});

app.delete('/api/employees/:id', (request, response) => {
  const result = db.prepare('UPDATE employees SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL').run(Number(request.params.id));
  if (!result.changes) return response.status(404).json({ error: 'Employee not found.' });
  response.status(204).end();
});

app.listen(port, '0.0.0.0', () => console.log(`Employee API listening on http://localhost:${port}`));