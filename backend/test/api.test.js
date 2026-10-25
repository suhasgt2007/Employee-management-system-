import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const backendDirectory = fileURLToPath(new URL('..', import.meta.url));

async function unusedPort() {
  const socket = net.createServer();
  await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve));
  const { port } = socket.address();
  await new Promise((resolve, reject) => socket.close((error) => error ? reject(error) : resolve()));
  return port;
}

test('employee CRUD validates relationships and preserves dated history', async () => {
  const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'employee-api-'));
  const port = await unusedPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['src/server.js'], {
    cwd: backendDirectory,
    env: { ...process.env, PORT: String(port), DATABASE_PATH: path.join(dataDirectory, 'test.sqlite') },
    stdio: 'ignore'
  });

  try {
    let ready = false;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        ready = (await fetch(`${baseUrl}/api/health`)).ok;
        if (ready) break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    assert.equal(ready, true, 'API should become healthy');

    const payload = {
      firstName: 'Morgan', lastName: 'Test', email: 'morgan.test@example.com',
      departmentId: 1, jobTitleId: 3, managerId: 1, employmentType: 'Full-time',
      status: 'Active', hireDate: '2026-01-10', location: 'Remote', annualSalary: 100000,
      currency: 'USD', contacts: [{ type: 'Mobile', value: '+1 555 0100', isPrimary: true }]
    };

    const invalidRole = await fetch(`${baseUrl}/api/employees`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, departmentId: 2 })
    });
    assert.equal(invalidRole.status, 400);

    const createdResponse = await fetch(`${baseUrl}/api/employees`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    assert.equal(createdResponse.status, 201);
    const created = await createdResponse.json();
    assert.equal(created.employeeCode.startsWith('EMP-'), true);
    assert.equal(created.contacts[0].value, '+1 555 0100');

    const duplicate = await fetch(`${baseUrl}/api/employees`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, firstName: 'Another', email: 'avery.morgan@example.com' })
    });
    assert.equal(duplicate.status, 409);

    const updatedResponse = await fetch(`${baseUrl}/api/employees/${created.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, status: 'On leave', annualSalary: 110000, contacts: [] })
    });
    assert.equal(updatedResponse.status, 200);
    const updated = await updatedResponse.json();
    assert.equal(updated.status, 'On leave');
    assert.equal(updated.annual_salary, 110000);
    assert.equal(updated.compensationHistory.length, 2);
    assert.equal(updated.statusHistory.length, 2);

    const archived = await fetch(`${baseUrl}/api/employees/${created.id}`, { method: 'DELETE' });
    assert.equal(archived.status, 204);
    const detail = await fetch(`${baseUrl}/api/employees/${created.id}`);
    assert.equal(detail.status, 404);
    const roster = await fetch(`${baseUrl}/api/employees?search=Morgan`);
    assert.equal((await roster.json()).items.some((person) => person.id === created.id), false);
  } finally {
    if (server.exitCode === null) {
      const exited = once(server, 'exit');
      server.kill('SIGTERM');
      await exited;
    }
    await rm(dataDirectory, { recursive: true, force: true });
  }
});