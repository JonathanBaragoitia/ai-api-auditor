import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import LoginForm from "./LoginForm";

describe("LoginForm", () => {
  it("renderiza email, password y botones de autenticación", () => {
    render(<LoginForm onLogin={vi.fn()} onRegister={vi.fn()} />);

    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Contraseña")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeInTheDocument();
  });
});
