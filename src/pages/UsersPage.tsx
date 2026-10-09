import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { getJson, sendJson } from "../api/client";
import type { AuthenticatedUser } from "../api/types";

const ROLE: Record<string, string> = { OPERATOR: "Operador", ADMINISTRATOR: "Administrador" };

/** Funcionarios con acceso a la página (PB-05, administrador). */
export function UsersPage() {
  const queries = useQueryClient();
  const [form, setForm] = useState({ username: "", fullName: "", password: "", role: "OPERATOR" });
  const users = useQuery({
    queryKey: ["users"],
    queryFn: () => getJson<AuthenticatedUser[]>("/api/v1/users"),
  });
  const create = useMutation({
    mutationFn: () => sendJson("POST", "/api/v1/users", form),
    onSuccess: () => {
      setForm({ username: "", fullName: "", password: "", role: "OPERATOR" });
      void queries.invalidateQueries({ queryKey: ["users"] });
    },
  });
  const set = (key: keyof typeof form) => (value: string) => setForm({ ...form, [key]: value });

  function submit(event: FormEvent) {
    event.preventDefault();
    create.mutate();
  }

  return (
    <section aria-labelledby="users-title">
      <h1 id="users-title">Usuarios</h1>
      <form className="panel row" onSubmit={submit}>
        <label>
          Usuario
          <input value={form.username} onChange={(e) => set("username")(e.target.value)} required />
        </label>
        <label>
          Nombre completo
          <input value={form.fullName} onChange={(e) => set("fullName")(e.target.value)} required />
        </label>
        <label>
          Contraseña (mín. 12)
          <input
            type="password"
            minLength={12}
            value={form.password}
            onChange={(e) => set("password")(e.target.value)}
            required
          />
        </label>
        <label>
          Rol
          <select value={form.role} onChange={(e) => set("role")(e.target.value)}>
            <option value="OPERATOR">Operador</option>
            <option value="ADMINISTRATOR">Administrador</option>
          </select>
        </label>
        <button className="primary" type="submit" disabled={create.isPending}>
          Crear
        </button>
        {create.isError && <span className="error">{create.error.message}</span>}
      </form>
      <table className="panel">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Nombre</th>
            <th>Rol</th>
          </tr>
        </thead>
        <tbody>
          {(users.data ?? []).map((user) => (
            <tr key={user.id}>
              <td>{user.username}</td>
              <td>{user.fullName}</td>
              <td>{ROLE[user.role ?? ""]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
