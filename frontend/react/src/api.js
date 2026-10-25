import axios from "axios";

const mockMode = import.meta.env.VITE_API_MODE === "mock";
const client = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL || (mockMode ? "/mock-api" : "/api"),
  headers: { "Content-Type": "application/json" },
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error;
    if (message) error.message = message;
    return Promise.reject(error);
  },
);

export async function api(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const cleanPath = path.split("?")[0];
  const query = path.includes("?")
    ? new URLSearchParams(path.split("?")[1])
    : new URLSearchParams();
  const data = options.body ? JSON.parse(options.body) : undefined;

  if (mockMode && cleanPath === "/overview" && method === "GET") {
    const { data: employees } = await client.get("/employees");
    const visible = employees.filter((employee) => !employee.deleted_at);
    return {
      totalEmployees: visible.length,
      activeEmployees: visible.filter(
        (employee) => employee.status === "Active",
      ).length,
      departments: new Set(visible.map((employee) => employee.department)).size,
      onLeave: visible.filter((employee) => employee.status === "On leave")
        .length,
    };
  }

  if (mockMode && cleanPath === "/employees" && method === "GET") {
    const { data: employees } = await client.get("/employees");
    const search = (query.get("search") || "").toLowerCase();
    const status = query.get("status") || "";
    const items = employees.filter((employee) => {
      const haystack =
        `${employee.firstName} ${employee.lastName} ${employee.email} ${employee.employeeCode}`.toLowerCase();
      return (
        !employee.deleted_at &&
        (!search || haystack.includes(search)) &&
        (!status || employee.status === status)
      );
    });
    return { items, total: items.length };
  }

  if (mockMode && cleanPath.startsWith("/employees/") && method === "DELETE") {
    const id = cleanPath.split("/").at(-1);
    await client.patch(`/employees/${id}`, {
      deleted_at: new Date().toISOString(),
    });
    return null;
  }

  if (
    mockMode &&
    cleanPath.startsWith("/employees") &&
    (method === "POST" || method === "PUT")
  ) {
    const id = method === "PUT" ? cleanPath.split("/").at(-1) : null;
    const existing = id ? (await client.get(`/employees/${id}`)).data : null;
    const [{ data: departments }, { data: roles }, { data: people }] = await Promise.all([
      client.get("/departments"),
      client.get("/job-titles"),
      client.get("/employees"),
    ]);
    const department = departments.find(
      (item) => Number(item.id) === Number(data.departmentId),
    );
    const role = roles.find(
      (item) => Number(item.id) === Number(data.jobTitleId),
    );
    const manager = people.find(
      (person) => Number(person.id) === Number(data.managerId),
    );
    const today = new Date().toISOString().slice(0, 10);
    const compensationHistory = [...(existing?.compensationHistory || [])];
    const statusHistory = [...(existing?.statusHistory || [])];
    const salary = Number(data.annualSalary || 0);

    if (
      !existing ||
      Number(existing.annual_salary || 0) !== salary ||
      existing.currency !== data.currency
    ) {
      compensationHistory.unshift({
        annualSalary: salary,
        currency: data.currency || "USD",
        effectiveDate: existing ? today : data.hireDate,
      });
    }
    if (!existing || existing.status !== data.status) {
      statusHistory.unshift({
        status: data.status,
        effectiveDate: existing ? today : data.hireDate,
        note: existing ? "Status updated" : "Initial hire",
      });
    }

    const employee = {
      ...existing,
      ...data,
      id: existing?.id,
      employeeCode:
        existing?.employeeCode || `EMP-${String(Date.now()).slice(-6)}`,
      department: department?.name || existing?.department || "",
      jobTitle: role?.title || existing?.jobTitle || "",
      annual_salary: salary,
      currency: data.currency || "USD",
      contacts: data.contacts || [],
      addresses: data.addresses || [],
      emergencyContacts: data.emergencyContact?.fullName
        ? [data.emergencyContact]
        : [],
      compensationHistory,
      statusHistory,
      deleted_at: null,
      managerName: manager ? `${manager.firstName} ${manager.lastName}` : null,
    };
    const response = id
      ? await client.put(`/employees/${id}`, employee)
      : await client.post("/employees", employee);
    return response.data;
  }

  const response = await client.request({
    url: path,
    method,
    data,
    headers: options.headers,
  });
  return response.status === 204 ? null : response.data;
}
