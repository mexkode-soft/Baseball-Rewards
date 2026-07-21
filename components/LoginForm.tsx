"use client";

import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Inicio de sesión simulado. La autenticación se conectará en una siguiente etapa.");
  }

  function handleGoogle() {
    setMessage("Registro con Google simulado. Aún no hay un proveedor de autenticación conectado.");
  }

  return (
    <div className="login-card">
      <div className="login-heading">
        <span className="eyebrow">BIENVENIDO DE NUEVO</span>
        <h1>Entra al terreno</h1>
        <p>Accede para consultar tus campañas, retos y futuras recompensas.</p>
      </div>

      <form onSubmit={handleSubmit} className="login-form">
        <label>
          Correo electrónico
          <span className="input-wrap">
            <Mail size={18} />
            <input type="email" placeholder="nombre@correo.com" required />
          </span>
        </label>

        <label>
          Contraseña
          <span className="input-wrap">
            <LockKeyhole size={18} />
            <input type={showPassword ? "text" : "password"} placeholder="••••••••" minLength={6} required />
            <button
              className="password-toggle"
              type="button"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>

        <div className="form-row">
          <label className="checkbox-label"><input type="checkbox" /> Recordarme</label>
          <button className="text-button" type="button">Olvidé mi contraseña</button>
        </div>

        <button className="button button-full" type="submit">Iniciar sesión</button>
      </form>

      <div className="divider"><span>o continúa con</span></div>

      <button className="google-button" type="button" onClick={handleGoogle}>
        <span className="google-mark">G</span>
        Registrarme con Google
      </button>

      {message && <p className="demo-message" role="status">{message}</p>}

      <p className="register-copy">¿Aún no tienes cuenta? <button type="button" className="text-button" onClick={() => setMessage("Registro local simulado. El formulario completo se añadirá al conectar autenticación.")}>Crear cuenta</button></p>
      <Link className="back-link" href="/">← Volver al inicio</Link>
    </div>
  );
}
