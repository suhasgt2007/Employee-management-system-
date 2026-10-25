INSERT OR IGNORE INTO departments (id, name, cost_center) VALUES
  (1, 'Engineering', 'ENG-100'),
  (2, 'People & Culture', 'PPL-200'),
  (3, 'Finance', 'FIN-300'),
  (4, 'Design', 'DSN-400'),
  (5, 'Operations', 'OPS-500');

INSERT OR IGNORE INTO job_titles (id, title, department_id, salary_band_min, salary_band_max) VALUES
  (1, 'Engineering Manager', 1, 135000, 190000),
  (2, 'Senior Software Engineer', 1, 125000, 175000),
  (3, 'Software Engineer', 1, 90000, 135000),
  (4, 'People Partner', 2, 80000, 120000),
  (5, 'Financial Analyst', 3, 75000, 110000),
  (6, 'Product Designer', 4, 95000, 145000),
  (7, 'Operations Lead', 5, 85000, 125000);

INSERT OR IGNORE INTO employees
  (id, employee_code, first_name, last_name, email, department_id, job_title_id, manager_id, employment_type, status, hire_date, location)
VALUES
  (1, 'EMP-1001', 'Avery', 'Morgan', 'avery.morgan@example.com', 1, 1, NULL, 'Full-time', 'Active', '2021-04-12', 'New York'),
  (2, 'EMP-1002', 'Jordan', 'Lee', 'jordan.lee@example.com', 1, 2, 1, 'Full-time', 'Active', '2022-06-06', 'Austin'),
  (3, 'EMP-1003', 'Sam', 'Patel', 'sam.patel@example.com', 2, 4, NULL, 'Full-time', 'On leave', '2023-01-16', 'London'),
  (4, 'EMP-1004', 'Riley', 'Chen', 'riley.chen@example.com', 4, 6, NULL, 'Full-time', 'Active', '2024-02-05', 'Toronto'),
  (5, 'EMP-1005', 'Casey', 'Rivera', 'casey.rivera@example.com', 3, 5, NULL, 'Part-time', 'Probation', '2025-08-18', 'New York'),
  (6, 'EMP-1006', 'Taylor', 'Brooks', 'taylor.brooks@example.com', 1, 3, 1, 'Contract', 'Active', '2025-11-03', 'Remote');

INSERT OR IGNORE INTO employee_contacts (employee_id, contact_type, contact_value, is_primary) VALUES
  (1, 'Work phone', '+1 212 555 0101', 1),
  (2, 'Mobile', '+1 512 555 0138', 1),
  (3, 'Mobile', '+44 20 7946 0152', 1),
  (4, 'Work phone', '+1 416 555 0197', 1),
  (5, 'Mobile', '+1 212 555 0164', 1),
  (6, 'Mobile', '+1 737 555 0119', 1);

INSERT OR IGNORE INTO compensation_history (employee_id, annual_salary, currency, effective_date) VALUES
  (1, 168000, 'USD', '2024-01-01'),
  (2, 142000, 'USD', '2025-01-01'),
  (3, 105000, 'GBP', '2024-01-01'),
  (4, 118000, 'CAD', '2025-01-01'),
  (5, 86000, 'USD', '2025-08-18'),
  (6, 112000, 'USD', '2025-11-03');

INSERT OR IGNORE INTO employment_status_history (employee_id, status, effective_date, note) VALUES
  (1, 'Active', '2021-04-12', 'Initial hire'),
  (2, 'Active', '2022-06-06', 'Initial hire'),
  (3, 'On leave', '2025-09-01', 'Leave of absence'),
  (4, 'Active', '2024-02-05', 'Initial hire'),
  (5, 'Probation', '2025-08-18', 'Initial hire'),
  (6, 'Active', '2025-11-03', 'Initial hire');