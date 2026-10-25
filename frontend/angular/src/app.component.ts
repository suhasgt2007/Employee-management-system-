import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Department {
  id: number;
  name: string;
  costCenter: string;
}

interface Employee {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  departmentId?: number;
  jobTitle: string;
  jobTitleId?: number;
  status: string;
  employmentType: string;
  hireDate: string;
  location: string;
  managerId?: number | null;
  annual_salary?: number;
  currency?: string;
  phone?: string;
  contacts?: { type: string; value: string; isPrimary: number }[];
  addresses?: { type: string; street: string; city: string; region: string; postalCode: string; country: string }[];
  emergencyContacts?: { fullName: string; relationship: string; phone: string; email: string }[];
  compensationHistory?: { annualSalary: number; currency: string; effectiveDate: string }[];
  statusHistory?: { status: string; effectiveDate: string; note: string }[];
}

interface JobTitle {
  id: number;
  title: string;
}

interface EmployeeForm {
  firstName: string;
  lastName: string;
  email: string;
  departmentId: string;
  jobTitleId: string;
  managerId: string;
  employmentType: string;
  status: string;
  hireDate: string;
  location: string;
  annualSalary: number | null;
  currency: string;
  phone: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
  emergencyEmail: string;
}

const blankForm = (): EmployeeForm => ({
  firstName: '', lastName: '', email: '', departmentId: '', jobTitleId: '', managerId: '',
  employmentType: 'Full-time', status: 'Active', hireDate: new Date().toISOString().slice(0, 10),
  location: '', annualSalary: null, currency: 'USD', phone: '', street: '', city: '', region: '',
  postalCode: '', country: '', emergencyName: '', emergencyRelationship: '', emergencyPhone: '', emergencyEmail: ''
});

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  private readonly http = inject(HttpClient);
  readonly today = new Date();
  employees: Employee[] = [];
  departments: Department[] = [];
  roles: JobTitle[] = [];
  totalEmployees = 0;
  activeEmployees = 0;
  onLeave = 0;
  search = '';
  statusFilter = '';
  departmentFilter = '';
  page = 'directory';
  modalOpen = false;
  editingId: number | null = null;
  selectedEmployee: Employee | undefined;
  form = blankForm();
  busy = true;
  saving = false;
  error = '';
  toast = '';

  ngOnInit(): void {
    this.loadDepartments();
    this.loadRoster();
  }

  get visibleEmployees(): Employee[] {
    const term = this.search.trim().toLowerCase();
    return this.employees.filter((employee) =>
      (!this.departmentFilter || employee.department === this.departmentFilter) &&
      (!term || `${employee.firstName} ${employee.lastName} ${employee.email} ${employee.jobTitle}`.toLowerCase().includes(term))
    );
  }

  get activeRecord(): Employee | undefined {
    return this.selectedEmployee || this.employees.find((employee) => employee.id === this.editingId);
  }

  employeesInDepartment(name: string): number {
    return this.employees.filter((employee) => employee.department === name).length;
  }

  exportCsv(): void {
    const rows = [
      ['Name', 'Email', 'Department', 'Role', 'Status', 'Location'],
      ...this.visibleEmployees.map((person) => [`${person.firstName} ${person.lastName}`, person.email, person.department, person.jobTitle, person.status, person.location])
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value || '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = 'employees.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  private loadDepartments(): void {
    this.http.get<Department[]>('/api/departments').subscribe({
      next: (departments) => { this.departments = departments; },
      error: (error: HttpErrorResponse) => { this.error = this.message(error); }
    });
  }

  loadRoster(): void {
    this.busy = true;
    this.http.get<{ items: Employee[]; total: number }>(`/api/employees?search=${encodeURIComponent(this.search)}&status=${encodeURIComponent(this.statusFilter)}`).subscribe({
      next: (result) => { this.employees = result.items; this.totalEmployees = result.total; this.busy = false; },
      error: (error: HttpErrorResponse) => { this.error = this.message(error); this.busy = false; }
    });
    this.http.get<{ totalEmployees: number; activeEmployees: number; onLeave: number }>('/api/overview').subscribe({
      next: (result) => { this.totalEmployees = result.totalEmployees; this.activeEmployees = result.activeEmployees; this.onLeave = result.onLeave; },
      error: (error: HttpErrorResponse) => { this.error = this.message(error); }
    });
  }

  filterChanged(): void {
    this.loadRoster();
  }

  openNew(): void {
    this.editingId = null;
    this.selectedEmployee = undefined;
    this.form = blankForm();
    this.form.departmentId = this.departments.length ? String(this.departments[0].id) : '';
    this.error = '';
    this.modalOpen = true;
    this.loadRoles();
  }

  openEdit(id: number): void {
    this.http.get<Employee>(`/api/employees/${id}`).subscribe({
      next: (person) => {
        this.selectedEmployee = person;
        const address = person.addresses?.[0];
        const emergency = person.emergencyContacts?.[0];
        this.editingId = id;
        this.form = {
          ...blankForm(), firstName: person.firstName, lastName: person.lastName, email: person.email,
          departmentId: String(person.departmentId), jobTitleId: String(person.jobTitleId), managerId: person.managerId ? String(person.managerId) : '',
          employmentType: person.employmentType, status: person.status, hireDate: person.hireDate, location: person.location || '',
          annualSalary: person.annual_salary ?? null, currency: person.currency || 'USD', phone: person.contacts?.[0]?.value || '',
          street: address?.street || '', city: address?.city || '', region: address?.region || '', postalCode: address?.postalCode || '', country: address?.country || '',
          emergencyName: emergency?.fullName || '', emergencyRelationship: emergency?.relationship || '', emergencyPhone: emergency?.phone || '', emergencyEmail: emergency?.email || ''
        };
        this.error = '';
        this.modalOpen = true;
        this.loadRoles();
      },
      error: (error: HttpErrorResponse) => { this.showToast(this.message(error)); }
    });
  }

  loadRoles(): void {
    if (!this.form.departmentId) { this.roles = []; return; }
    this.http.get<JobTitle[]>(`/api/job-titles?departmentId=${this.form.departmentId}`).subscribe({
      next: (roles) => { this.roles = roles; },
      error: (error: HttpErrorResponse) => { this.error = this.message(error); }
    });
  }

  saveEmployee(): void {
    if (!this.form.firstName.trim() || !this.form.lastName.trim() || !this.form.email.trim() || !this.form.departmentId || !this.form.jobTitleId || !this.form.hireDate) {
      this.error = 'Complete all required fields before saving.';
      return;
    }
    const payload = {
      firstName: this.form.firstName, lastName: this.form.lastName, email: this.form.email,
      departmentId: Number(this.form.departmentId), jobTitleId: Number(this.form.jobTitleId),
      managerId: this.form.managerId ? Number(this.form.managerId) : null, employmentType: this.form.employmentType,
      status: this.form.status, hireDate: this.form.hireDate, location: this.form.location,
      annualSalary: Number(this.form.annualSalary || 0), currency: this.form.currency,
      contacts: this.form.phone ? [{ type: 'Mobile', value: this.form.phone, isPrimary: true }] : [],
      addresses: this.form.street || this.form.city ? [{ type: 'Home', street: this.form.street, city: this.form.city, region: this.form.region, postalCode: this.form.postalCode, country: this.form.country }] : [],
      emergencyContact: { fullName: this.form.emergencyName, relationship: this.form.emergencyRelationship, phone: this.form.emergencyPhone, email: this.form.emergencyEmail }
    };
    this.saving = true;
    this.error = '';
    const request = this.editingId
      ? this.http.put(`/api/employees/${this.editingId}`, payload)
      : this.http.post('/api/employees', payload);
    request.subscribe({
      next: () => {
        this.modalOpen = false;
        this.saving = false;
        this.showToast(this.editingId ? 'Employee record updated.' : 'Employee added to the directory.');
        this.loadRoster();
      },
      error: (error: HttpErrorResponse) => { this.error = this.message(error); this.saving = false; }
    });
  }

  archiveEmployee(person: Employee): void {
    if (!window.confirm(`Archive ${person.firstName} ${person.lastName} from the directory? Their history will be retained.`)) return;
    this.http.delete(`/api/employees/${person.id}`).subscribe({
      next: () => { this.showToast('Employee archived. Employment history is retained.'); this.loadRoster(); },
      error: (error: HttpErrorResponse) => { this.showToast(this.message(error)); }
    });
  }

  initials(person: Employee): string { return `${person.firstName[0] || ''}${person.lastName[0] || ''}`.toUpperCase(); }

  private message(error: HttpErrorResponse): string { return error.error?.error || 'Unable to reach the employee service. Please try again.'; }

  private showToast(message: string): void {
    this.toast = message;
    window.setTimeout(() => { this.toast = ''; }, 3000);
  }
}