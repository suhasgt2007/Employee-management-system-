import { useEffect, useState } from "react";
import { api } from "./api.js";
import {
  ArrowDownUp,
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Download,
  LayoutDashboard,
  LoaderCircle,
  Mail,
  MapPin,
  Menu,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  departmentId: "",
  jobTitleId: "",
  managerId: "",
  employmentType: "Full-time",
  status: "Active",
  hireDate: new Date().toISOString().slice(0, 10),
  location: "",
  annualSalary: "",
  currency: "USD",
  contacts: [{ type: "Mobile", value: "", isPrimary: true }],
  addresses: [
    {
      type: "Home",
      street: "",
      city: "",
      region: "",
      postalCode: "",
      country: "",
    },
  ],
  emergencyContact: { fullName: "", relationship: "", phone: "", email: "" },
};

function initials(firstName, lastName) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
}

function formatSalary(amount, currency = "USD") {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function App() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [overview, setOverview] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    departments: 0,
    onLeave: 0,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [activePage, setActivePage] = useState("directory");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  async function refreshData() {
    const [roster, departmentList, stats] = await Promise.all([
      api(
        `/employees?search=${encodeURIComponent(search)}&status=${encodeURIComponent(statusFilter)}`,
      ),
      api("/departments"),
      api("/overview"),
    ]);
    setEmployees(roster.items);
    setDepartments(departmentList);
    setOverview(stats);
  }

  useEffect(() => {
    refreshData()
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => {
    if (form.departmentId) {
      api(`/job-titles?departmentId=${form.departmentId}`)
        .then(setRoles)
        .catch((requestError) => setError(requestError.message));
    } else {
      setRoles([]);
    }
  }, [form.departmentId]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const visibleEmployees = employees.filter(
    (employee) => !departmentFilter || employee.department === departmentFilter,
  );

  function openNewEmployee() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      departmentId: departments[0] ? String(departments[0].id) : "",
    });
    setValidationAttempted(false);
    setError("");
    setModalOpen(true);
  }

  async function openEditEmployee(id) {
    try {
      const employee = await api(`/employees/${id}`);
      const primaryAddress = employee.addresses?.[0] || emptyForm.addresses[0];
      setEditingId(id);
      setValidationAttempted(false);
      setForm({
        ...emptyForm,
        ...employee,
        departmentId: String(employee.departmentId),
        jobTitleId: String(employee.jobTitleId),
        managerId: employee.managerId ? String(employee.managerId) : "",
        annualSalary: employee.annual_salary ?? "",
        currency: employee.currency || "USD",
        contacts: employee.contacts?.length
          ? employee.contacts
          : emptyForm.contacts,
        addresses: [primaryAddress],
        emergencyContact:
          employee.emergencyContacts?.[0] || emptyForm.emergencyContact,
      });
      setError("");
      setModalOpen(true);
    } catch (requestError) {
      setToast(requestError.message);
    }
  }

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "departmentId" ? { jobTitleId: "" } : {}),
    }));
  }

  async function saveEmployee(event) {
    event.preventDefault();
    setValidationAttempted(true);
    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ||
      !form.departmentId ||
      !form.jobTitleId ||
      !form.hireDate
    ) {
      setError("Complete the required fields and enter a valid work email.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api(editingId ? `/employees/${editingId}` : "/employees", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify({
          ...form,
          annualSalary: Number(form.annualSalary || 0),
        }),
      });
      setModalOpen(false);
      setToast(
        editingId
          ? "Employee record updated."
          : "Employee added to the directory.",
      );
      await refreshData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteEmployee(employee) {
    if (
      !window.confirm(
        `Archive ${employee.firstName} ${employee.lastName} from the directory? Their history will be retained.`,
      )
    )
      return;
    try {
      await api(`/employees/${employee.id}`, { method: "DELETE" });
      setToast("Employee archived. Employment history is retained.");
      await refreshData();
    } catch (requestError) {
      setToast(requestError.message);
    }
  }

  const statCards = [
    {
      label: "People",
      value: overview.totalEmployees,
      icon: Users,
      tone: "green",
      note: "Across the organization",
    },
    {
      label: "Active today",
      value: overview.activeEmployees,
      icon: ShieldCheck,
      tone: "blue",
      note: "Currently working",
    },
    {
      label: "Departments",
      value: overview.departments,
      icon: Building2,
      tone: "amber",
      note: "Teams and functions",
    },
    {
      label: "On leave",
      value: overview.onLeave,
      icon: Clock3,
      tone: "rose",
      note: "Away from the office",
    },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#directory"
          onClick={() => setActivePage("directory")}
        >
          <span className="brand-mark">
            <span />
          </span>
          <span className="brand-copy">
            <strong>fieldwork</strong>
            <small>PEOPLE OPERATIONS</small>
          </span>
        </a>
        <div className="workspace-label">
          WORKSPACE <ChevronDown size={13} />
        </div>
        <nav
          className="primary-nav nav nav-pills flex-column"
          aria-label="Main navigation"
        >
          <button
            className="nav-item nav-link"
            onClick={() => setActivePage("overview")}
          >
            <LayoutDashboard size={17} />
            <span>Overview</span>
          </button>
          <button
            className={`nav-item nav-link ${activePage === "directory" ? "nav-item-active" : ""}`}
            onClick={() => setActivePage("directory")}
          >
            <Users size={17} />
            <span>People</span>
          </button>
          <button
            className={`nav-item nav-link ${activePage === "departments" ? "nav-item-active" : ""}`}
            onClick={() => setActivePage("departments")}
          >
            <Building2 size={17} />
            <span>Departments</span>
          </button>
        </nav>
        <div className="sidebar-rule" />
        <div className="sidebar-caption">YOUR SPACE</div>
        <div className="profile-switcher">
          <span className="profile-avatar">AM</span>
          <span className="profile-text">
            <strong>Alex Morgan</strong>
            <small>People administrator</small>
          </span>
          <MoreHorizontal size={17} />
        </div>
        <div className="sidebar-bottom">
          <CircleHelp size={16} />
          <span>Help & support</span>
          <span className="help-shortcut">?</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar navbar navbar-expand-lg">
          <button
            className="mobile-menu navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mobileNavigation"
            aria-controls="mobileNavigation"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <Menu size={19} />
          </button>
          <div className="breadcrumb">
            <span>Workspace</span>
            <ArrowRight size={13} />
            <strong>
              {activePage === "departments"
                ? "Departments"
                : activePage === "overview"
                  ? "Overview"
                  : "People"}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="today-label">
              <CalendarDays size={15} />{" "}
              {new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }).format(new Date())}
            </span>
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
            >
              <Bell size={17} />
              <i />
            </button>
            <span className="topbar-avatar">AM</span>
          </div>
          <div
            className="collapse navbar-collapse mobile-nav-collapse"
            id="mobileNavigation"
          >
            <nav className="mobile-nav" aria-label="Mobile navigation">
              <button
                data-bs-toggle="collapse"
                data-bs-target="#mobileNavigation"
                onClick={() => setActivePage("overview")}
              >
                Overview
              </button>
              <button
                data-bs-toggle="collapse"
                data-bs-target="#mobileNavigation"
                onClick={() => setActivePage("directory")}
              >
                People
              </button>
              <button
                data-bs-toggle="collapse"
                data-bs-target="#mobileNavigation"
                onClick={() => setActivePage("departments")}
              >
                Departments
              </button>
            </nav>
          </div>
        </header>

        <div className="page-wrap container-fluid">
          {activePage === "departments" ? (
            <section className="departments-page">
              <div className="page-heading">
                <div>
                  <span className="eyebrow">ORGANIZATION</span>
                  <h1>Departments</h1>
                  <p>Teams and cost centers across your organization.</p>
                </div>
                <button
                  className="button button-primary btn btn-primary"
                  onClick={openNewEmployee}
                >
                  <Plus size={16} /> Add employee
                </button>
              </div>
              <div className="department-grid">
                {departments.map((department) => {
                  const count = employees.filter(
                    (employee) => employee.department === department.name,
                  ).length;
                  return (
                    <button
                      key={department.id}
                      className="department-card"
                      onClick={() => {
                        setDepartmentFilter(department.name);
                        setActivePage("directory");
                      }}
                    >
                      <span className="department-icon">
                        <Building2 size={19} />
                      </span>
                      <span className="department-details">
                        <strong>{department.name}</strong>
                        <small>{department.costCenter}</small>
                      </span>
                      <span className="department-members">{count} people</span>
                      <ArrowRight size={16} />
                    </button>
                  );
                })}
              </div>
            </section>
          ) : (
            <>
              <section className="page-heading">
                <div>
                  <span className="eyebrow">PEOPLE OPERATIONS</span>
                  <h1>
                    {activePage === "overview"
                      ? "Good morning, Alex"
                      : "People directory"}
                  </h1>
                  <p>
                    {activePage === "overview"
                      ? "Here is your organization at a glance."
                      : "A clear view of the people who make it all work."}
                  </p>
                </div>
                <button
                  className="button button-primary btn btn-primary"
                  onClick={openNewEmployee}
                >
                  <Plus size={16} /> Add employee
                </button>
              </section>

              <section
                className="stat-grid row g-3"
                aria-label="Employee overview"
              >
                {statCards.map(({ label, value, icon: Icon, tone, note }) => (
                  <article
                    className={`stat-card card col-12 col-sm-6 col-xl-3 ${tone}`}
                    key={label}
                  >
                    <span className={`stat-icon ${tone}`}>
                      <Icon size={18} />
                    </span>
                    <div className="stat-topline">
                      <span>{label}</span>
                      <ArrowDownUp size={14} />
                    </div>
                    <strong className="stat-number">{value}</strong>
                    <small>{note}</small>
                  </article>
                ))}
              </section>

              <section className="directory-panel card">
                <div className="directory-heading">
                  <div>
                    <h2>
                      All employees{" "}
                      <span className="result-count">
                        {visibleEmployees.length}
                      </span>
                    </h2>
                    <p>Manage employee records, roles and contact details.</p>
                  </div>
                  <button
                    className="button button-secondary export-button"
                    onClick={() => {
                      const csv = [
                        "Name,Email,Department,Role,Status,Location",
                        ...visibleEmployees.map((person) =>
                          [
                            `${person.firstName} ${person.lastName}`,
                            person.email,
                            person.department,
                            person.jobTitle,
                            person.status,
                            person.location,
                          ]
                            .map(
                              (value) =>
                                `"${String(value || "").replaceAll('"', '""')}"`,
                            )
                            .join(","),
                        ),
                      ].join("\n");
                      const link = document.createElement("a");
                      link.href = URL.createObjectURL(
                        new Blob([csv], { type: "text/csv" }),
                      );
                      link.download = "employees.csv";
                      link.click();
                      URL.revokeObjectURL(link.href);
                    }}
                  >
                    <Download size={15} /> Export
                  </button>
                </div>
                <div className="table-toolbar">
                  <label className="search-field">
                    <Search size={16} />
                    <input
                      className="form-control"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search people, roles, email..."
                      aria-label="Search employees"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        aria-label="Clear search"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </label>
                  <div className="filter-group">
                    <label className="filter-select">
                      <span className="sr-only">Filter by department</span>
                      <select
                        className="form-select"
                        value={departmentFilter}
                        onChange={(event) =>
                          setDepartmentFilter(event.target.value)
                        }
                      >
                        <option value="">All departments</option>
                        {departments.map((department) => (
                          <option key={department.id} value={department.name}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} />
                    </label>
                    <label className="filter-select">
                      <span className="sr-only">Filter by status</span>
                      <select
                        className="form-select"
                        value={statusFilter}
                        onChange={(event) =>
                          setStatusFilter(event.target.value)
                        }
                      >
                        <option value="">Any status</option>
                        <option>Active</option>
                        <option>On leave</option>
                        <option>Probation</option>
                        <option>Inactive</option>
                      </select>
                      <ChevronDown size={14} />
                    </label>
                  </div>
                </div>
                {error && !modalOpen && (
                  <div className="inline-error" role="alert">
                    {error}
                    <button
                      onClick={() => {
                        setError("");
                        refreshData().catch((requestError) =>
                          setError(requestError.message),
                        );
                      }}
                    >
                      Retry
                    </button>
                  </div>
                )}
                <div className="table-scroll table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>EMPLOYEE</th>
                        <th>DEPARTMENT</th>
                        <th>ROLE</th>
                        <th>STATUS</th>
                        <th>LOCATION</th>
                        <th>START DATE</th>
                        <th>
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td className="table-state" colSpan="7">
                            <LoaderCircle className="spin" size={19} /> Loading
                            employee records...
                          </td>
                        </tr>
                      ) : visibleEmployees.length === 0 ? (
                        <tr>
                          <td className="table-state empty-state" colSpan="7">
                            <span className="empty-illustration">
                              <Users size={20} />
                            </span>
                            <strong>No employees found</strong>
                            <span>
                              Try a different search or add a new employee.
                            </span>
                            <button
                              className="button button-secondary"
                              onClick={openNewEmployee}
                            >
                              <Plus size={15} /> Add employee
                            </button>
                          </td>
                        </tr>
                      ) : (
                        visibleEmployees.map((employee, index) => (
                          <tr
                            key={employee.id}
                            className="employee-row"
                            style={{ "--row-index": index }}
                            onClick={() => openEditEmployee(employee.id)}
                          >
                            <td>
                              <div className="employee-cell">
                                <span
                                  className={`employee-avatar avatar-${employee.id % 5}`}
                                >
                                  {initials(
                                    employee.firstName,
                                    employee.lastName,
                                  )}
                                </span>
                                <span className="employee-identity">
                                  <strong>
                                    {employee.firstName} {employee.lastName}
                                  </strong>
                                  <small>{employee.email}</small>
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className="department-cell">
                                <span className="department-dot" />
                                {employee.department}
                              </span>
                            </td>
                            <td>
                              <span className="role-cell">
                                {employee.jobTitle}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`status-badge badge status-${employee.status.toLowerCase().replace(" ", "-")}`}
                              >
                                <i />
                                {employee.status}
                              </span>
                            </td>
                            <td>
                              <span className="location-cell">
                                <MapPin size={13} />
                                {employee.location || "—"}
                              </span>
                            </td>
                            <td>
                              <span className="date-cell">
                                {new Intl.DateTimeFormat("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  timeZone: "UTC",
                                }).format(
                                  new Date(`${employee.hireDate}T00:00:00Z`),
                                )}
                              </span>
                            </td>
                            <td>
                              <div
                                className="row-actions"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <button
                                  className="icon-button row-edit"
                                  onClick={() => openEditEmployee(employee.id)}
                                  aria-label={`Edit ${employee.firstName} ${employee.lastName}`}
                                  title="Edit employee"
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  className="icon-button row-delete"
                                  onClick={() => deleteEmployee(employee)}
                                  aria-label={`Archive ${employee.firstName} ${employee.lastName}`}
                                  title="Archive employee"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <footer className="table-footer">
                  <span>
                    Showing <strong>{visibleEmployees.length}</strong> of{" "}
                    <strong>{overview.totalEmployees}</strong> employees
                  </span>
                  <span className="footer-security">
                    <ShieldCheck size={14} /> People data is private
                  </span>
                </footer>
              </section>

              <footer className="page-footer">
                <span>
                  FIELDWORK <span>•</span> PEOPLE OPERATIONS
                </span>
                <span>Employee records are securely managed.</span>
              </footer>
            </>
          )}
        </div>
      </main>

      {modalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModalOpen(false);
          }}
        >
          <section
            className="employee-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <header className="modal-header">
              <div>
                <span className="eyebrow">EMPLOYEE RECORD</span>
                <h2 id="modal-title">
                  {editingId ? "Edit employee" : "Add employee"}
                </h2>
                <p>
                  {editingId
                    ? "Update details and employment information."
                    : "Add someone new to your organization."}
                </p>
              </div>
              <button
                className="icon-button modal-close"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </header>
            <form noValidate onSubmit={saveEmployee}>
              <div className="modal-body">
                {error && (
                  <div className="form-error alert alert-danger" role="alert">
                    {error}
                  </div>
                )}
                <div className="form-section">
                  <div className="form-section-title">
                    <UserRound size={16} />
                    <h3>Personal details</h3>
                  </div>
                  <div className="form-grid row g-3">
                    <label className="form-field col-12 col-md-6">
                      <span>
                        First name <b>*</b>
                      </span>
                      <input
                        className={`form-control ${validationAttempted && !form.firstName.trim() ? "is-invalid" : ""}`}
                        required
                        value={form.firstName}
                        onChange={(event) =>
                          updateField("firstName", event.target.value)
                        }
                        placeholder="e.g. Morgan"
                      />
                      {validationAttempted && !form.firstName.trim() && <span className="invalid-feedback">First name is required.</span>}
                    </label>
                    <label className="form-field col-12 col-md-6">
                      <span>
                        Last name <b>*</b>
                      </span>
                      <input
                        className={`form-control ${validationAttempted && !form.lastName.trim() ? "is-invalid" : ""}`}
                        required
                        value={form.lastName}
                        onChange={(event) =>
                          updateField("lastName", event.target.value)
                        }
                        placeholder="e.g. Ellis"
                      />
                      {validationAttempted && !form.lastName.trim() && <span className="invalid-feedback">Last name is required.</span>}
                    </label>
                    <label className="form-field col-12 col-md-6">
                      <span>
                        Work email <b>*</b>
                      </span>
                      <input
                        className={`form-control ${validationAttempted && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? "is-invalid" : ""}`}
                        type="email"
                        required
                        value={form.email}
                        onChange={(event) =>
                          updateField("email", event.target.value)
                        }
                        placeholder="name@company.com"
                      />
                      {validationAttempted && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && <span className="invalid-feedback">Enter a valid work email.</span>}
                      <Mail className="field-icon" size={15} />
                    </label>
                    <label className="form-field col-12 col-md-6">
                      <span>Phone</span>
                      <input className="form-control"
                        value={form.contacts?.[0]?.value || ""}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            contacts: [
                              {
                                type: "Mobile",
                                value: event.target.value,
                                isPrimary: true,
                              },
                            ],
                          }))
                        }
                        placeholder="+1 (555) 000-0000"
                      />
                      <Phone className="field-icon" size={15} />
                    </label>
                    <label className="form-field form-field-wide col-12">
                      <span>Location</span>
                      <input className="form-control"
                        value={form.location || ""}
                        onChange={(event) =>
                          updateField("location", event.target.value)
                        }
                        placeholder="City, country or remote"
                      />
                      <MapPin className="field-icon" size={15} />
                    </label>
                  </div>
                </div>
                <div className="form-section">
                  <div className="form-section-title">
                    <BriefcaseBusiness size={16} />
                    <h3>Employment</h3>
                  </div>
                  <div className="form-grid row g-3">
                    <label className="form-field col-12 col-md-6">
                      <span>
                        Department <b>*</b>
                      </span>
                      <select
                        className={`form-select ${validationAttempted && !form.departmentId ? "is-invalid" : ""}`}
                        required
                        value={form.departmentId}
                        onChange={(event) =>
                          updateField("departmentId", event.target.value)
                        }
                      >
                        <option value="">Select a department</option>
                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                      {validationAttempted && !form.departmentId && <span className="invalid-feedback">Choose a department.</span>}
                      <ChevronDown
                        className="field-icon select-icon"
                        size={15}
                      />
                    </label>
                    <label className="form-field col-12 col-md-6">
                      <span>
                        Job title <b>*</b>
                      </span>
                      <select
                        className={`form-select ${validationAttempted && !form.jobTitleId ? "is-invalid" : ""}`}
                        required
                        value={form.jobTitleId}
                        onChange={(event) =>
                          updateField("jobTitleId", event.target.value)
                        }
                      >
                        <option value="">Select a role</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.title}
                          </option>
                        ))}
                      </select>
                      {validationAttempted && !form.jobTitleId && <span className="invalid-feedback">Choose a job title.</span>}
                      <ChevronDown
                        className="field-icon select-icon"
                        size={15}
                      />
                    </label>
                    <label className="form-field">
                      <span>
                        Employment type <b>*</b>
                      </span>
                      <select
                        value={form.employmentType}
                        onChange={(event) =>
                          updateField("employmentType", event.target.value)
                        }
                      >
                        <option>Full-time</option>
                        <option>Part-time</option>
                        <option>Contract</option>
                        <option>Intern</option>
                      </select>
                      <ChevronDown
                        className="field-icon select-icon"
                        size={15}
                      />
                    </label>
                    <label className="form-field">
                      <span>
                        Status <b>*</b>
                      </span>
                      <select
                        value={form.status}
                        onChange={(event) =>
                          updateField("status", event.target.value)
                        }
                      >
                        <option>Active</option>
                        <option>On leave</option>
                        <option>Probation</option>
                        <option>Inactive</option>
                      </select>
                      <ChevronDown
                        className="field-icon select-icon"
                        size={15}
                      />
                    </label>
                    <label className="form-field">
                      <span>
                        Start date <b>*</b>
                      </span>
                      <input
                        type="date"
                        required
                        value={form.hireDate}
                        onChange={(event) =>
                          updateField("hireDate", event.target.value)
                        }
                      />
                    </label>
                    <label className="form-field">
                      <span>Reports to</span>
                      <select
                        value={form.managerId || ""}
                        onChange={(event) =>
                          updateField("managerId", event.target.value)
                        }
                      >
                        <option value="">No manager</option>
                        {employees
                          .filter((person) => person.id !== editingId)
                          .map((person) => (
                            <option key={person.id} value={person.id}>
                              {person.firstName} {person.lastName}
                            </option>
                          ))}
                      </select>
                      <ChevronDown
                        className="field-icon select-icon"
                        size={15}
                      />
                    </label>
                    <label className="form-field">
                      <span>Annual salary</span>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={form.annualSalary}
                        onChange={(event) =>
                          updateField("annualSalary", event.target.value)
                        }
                        placeholder="0"
                      />
                    </label>
                    <label className="form-field">
                      <span>Currency</span>
                      <select
                        value={form.currency || "USD"}
                        onChange={(event) =>
                          updateField("currency", event.target.value)
                        }
                      >
                        <option>USD</option>
                        <option>CAD</option>
                        <option>GBP</option>
                        <option>EUR</option>
                        <option>AUD</option>
                      </select>
                      <ChevronDown
                        className="field-icon select-icon"
                        size={15}
                      />
                    </label>
                  </div>
                </div>
                <details className="optional-section">
                  <summary>
                    <span>
                      <MapPin size={15} /> Home address
                    </span>
                    <ChevronDown size={15} />
                  </summary>
                  <div className="form-grid optional-grid row g-3">
                    <label className="form-field form-field-wide">
                      <span>Street</span>
                      <input
                        value={form.addresses?.[0]?.street || ""}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            addresses: [
                              {
                                ...current.addresses[0],
                                street: event.target.value,
                              },
                            ],
                          }))
                        }
                        placeholder="Street address"
                      />
                    </label>
                    <label className="form-field">
                      <span>City</span>
                      <input
                        value={form.addresses?.[0]?.city || ""}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            addresses: [
                              {
                                ...current.addresses[0],
                                city: event.target.value,
                              },
                            ],
                          }))
                        }
                      />
                    </label>
                    <label className="form-field">
                      <span>Region</span>
                      <input
                        value={form.addresses?.[0]?.region || ""}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            addresses: [
                              {
                                ...current.addresses[0],
                                region: event.target.value,
                              },
                            ],
                          }))
                        }
                      />
                    </label>
                    <label className="form-field">
                      <span>Postal code</span>
                      <input
                        value={form.addresses?.[0]?.postalCode || ""}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            addresses: [
                              {
                                ...current.addresses[0],
                                postalCode: event.target.value,
                              },
                            ],
                          }))
                        }
                      />
                    </label>
                    <label className="form-field">
                      <span>Country</span>
                      <input
                        value={form.addresses?.[0]?.country || ""}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            addresses: [
                              {
                                ...current.addresses[0],
                                country: event.target.value,
                              },
                            ],
                          }))
                        }
                      />
                    </label>
                  </div>
                </details>
                <details className="optional-section">
                  <summary>
                    <span>
                      <Phone size={15} /> Emergency contact
                    </span>
                    <ChevronDown size={15} />
                  </summary>
                  <div className="form-grid optional-grid">
                    <label className="form-field">
                      <span>Full name</span>
                      <input
                        value={form.emergencyContact?.fullName || ""}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            emergencyContact: {
                              ...current.emergencyContact,
                              fullName: event.target.value,
                            },
                          }))
                        }
                      />
                    </label>
                    <label className="form-field">
                      <span>Relationship</span>
                      <input
                        value={form.emergencyContact?.relationship || ""}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            emergencyContact: {
                              ...current.emergencyContact,
                              relationship: event.target.value,
                            },
                          }))
                        }
                      />
                    </label>
                    <label className="form-field">
                      <span>Phone</span>
                      <input
                        value={form.emergencyContact?.phone || ""}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            emergencyContact: {
                              ...current.emergencyContact,
                              phone: event.target.value,
                            },
                          }))
                        }
                      />
                    </label>
                    <label className="form-field">
                      <span>Email</span>
                      <input
                        type="email"
                        value={form.emergencyContact?.email || ""}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            emergencyContact: {
                              ...current.emergencyContact,
                              email: event.target.value,
                            },
                          }))
                        }
                      />
                    </label>
                  </div>
                </details>
                {editingId &&
                  (form.compensationHistory?.length > 0 ||
                    form.statusHistory?.length > 0) && (
                    <details className="optional-section history-section">
                      <summary>
                        <span>
                          <Clock3 size={15} /> Record history
                        </span>
                        <ChevronDown size={15} />
                      </summary>
                      <div className="history-grid">
                        <div>
                          <strong>Compensation</strong>
                          {form.compensationHistory?.map((entry) => (
                            <span
                              key={`${entry.effectiveDate}-${entry.annualSalary}`}
                            >
                              {formatSalary(entry.annualSalary, entry.currency)}{" "}
                              <small>· {entry.effectiveDate}</small>
                            </span>
                          ))}
                        </div>
                        <div>
                          <strong>Status</strong>
                          {form.statusHistory?.map((entry) => (
                            <span
                              key={`${entry.effectiveDate}-${entry.status}`}
                            >
                              {entry.status}{" "}
                              <small>· {entry.effectiveDate}</small>
                            </span>
                          ))}
                        </div>
                      </div>
                    </details>
                  )}
              </div>
              <footer className="modal-footer">
                <span>
                  <ShieldCheck size={14} /> Changes are securely recorded
                </span>
                <div>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <LoaderCircle className="spin" size={15} />
                    ) : (
                      <Check size={15} />
                    )}
                    {editingId ? "Save changes" : "Add employee"}
                  </button>
                </div>
              </footer>
            </form>
          </section>
        </div>
      )}
      {toast && (
        <div className="toast-message" role="status">
          <span>
            <Check size={15} />
          </span>
          {toast}
          <button onClick={() => setToast("")} aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
