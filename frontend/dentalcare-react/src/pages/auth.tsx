import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { authService } from "../services/mock";
import { useAction } from "../hooks";
import { Button, Field, Notice } from "../components/ui";
import { Brand } from "../components/layout";

export function AuthPage({
  mode = "login",
}: {
  mode?: "login" | "register" | "recover";
}) {
  const navigate = useNavigate(),
    location = useLocation(),
    action = useAction();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  function update(key: keyof typeof form, value: string) {
    setForm({ ...form, [key]: value });
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "recover") {
      await action.run(
        () => authService.recover(form.email),
        "Demo recovery request recorded. No external email is sent.",
      );
      return;
    }
    if (mode === "register" && form.password !== form.confirm) {
      action.setError("Your passwords do not match.");
      return;
    }
    const user = await action.run(() =>
      mode === "login"
        ? authService.login(form.email, form.password)
        : authService.register(form),
    );
    if (user) {
      const returnTo = (location.state as { returnTo?: string } | null)
        ?.returnTo;
      const safeReturn =
        returnTo?.startsWith("/") && !returnTo.startsWith("//")
          ? returnTo
          : undefined;
      navigate(user.role === "patient" ? (safeReturn ?? "/portal") : "/staff");
    }
  }
  async function quick(email: string) {
    const user = await action.run(() => authService.login(email, "Demo123!"));
    if (user) {
      const target = (location.state as { returnTo?: string } | null)?.returnTo;
      navigate(
        user.role === "patient" &&
          target?.startsWith("/") &&
          !target.startsWith("//")
          ? target
          : user.role === "patient"
            ? "/portal"
            : "/staff",
      );
    }
  }
  return (
    <div className="auth-page container">
      <aside className="auth-story">
        <Brand />
        <span className="eyebrow">A LITTLE PEACE OF MIND</span>
        <h1>
          Your care.
          <br />
          Your calendar.
          <br />
          <em>All in one place.</em>
        </h1>
        <p>
          Find a time, get ready for your visit, and manage your appointments
          with ease.
        </p>
        <img
          src="/images/practice.jpg"
          alt="Bright dental treatment room used as stock demonstration imagery"
        />
        <div className="row">
          <ShieldCheck size={22} />
          <small>
            Fictional demonstration. Please do not enter real personal or
            clinical details.
          </small>
        </div>
      </aside>
      <div className="auth-form-panel">
        <span className="eyebrow">
          {mode === "register"
            ? "LET’S GET STARTED"
            : mode === "recover"
              ? "ACCOUNT HELP"
              : "WELCOME BACK"}
        </span>
        <h2>
          {mode === "register"
            ? "Create your demo account"
            : mode === "recover"
              ? "Forgot your password?"
              : "Sign in to your portal"}
        </h2>
        <p>
          {mode === "recover"
            ? "Enter your demo email to record a simulated recovery request."
            : "A simpler way to stay on top of your dental appointments."}
        </p>
        <Notice error={action.error} success={action.success} />
        <form onSubmit={submit} className="form-stack">
          {mode === "register" && (
            <Field label="Full name">
              <input
                autoComplete="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
              />
            </Field>
          )}
          <Field label="Email address">
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              placeholder="you@example.com"
              onChange={(e) => update("email", e.target.value)}
              required
            />
          </Field>
          {mode === "register" && (
            <Field label="Phone number">
              <input
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                minLength={9}
                required
              />
            </Field>
          )}
          {mode !== "recover" && (
            <Field
              label="Password"
              hint={
                mode === "register"
                  ? "Use a demonstration password of at least 8 characters."
                  : undefined
              }
            >
              <input
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                minLength={mode === "register" ? 8 : undefined}
                required
              />
            </Field>
          )}
          {mode === "register" && (
            <Field label="Confirm password">
              <input
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={(e) => update("confirm", e.target.value)}
                required
              />
            </Field>
          )}
          {mode === "login" && (
            <Link to="/forgot-password" className="forgot-link">
              Forgot password?
            </Link>
          )}
          {mode === "register" && (
            <p className="small">
              Use fictional details only.{" "}
              <Link to="/policies">Privacy and booking policies</Link>
            </p>
          )}
          <Button disabled={action.busy}>
            {action.busy
              ? "Please wait…"
              : mode === "register"
                ? "Create demo account"
                : mode === "recover"
                  ? "Request demo recovery"
                  : "Sign in"}
            <ArrowRight size={18} />
          </Button>
        </form>
        <p className="auth-switch">
          {mode === "login" ? (
            <>
              New here? <Link to="/register">Create an account</Link>
            </>
          ) : (
            <Link to="/login">Back to sign in</Link>
          )}
        </p>
        {mode === "login" && (
          <div className="demo-accounts">
            <span className="eyebrow">EXPLORE A DEMONSTRATION ROLE</span>
            <div>
              {[
                ["patient@demo.local", "Patient"],
                ["reception@demo.local", "Reception"],
                ["dentist@demo.local", "Dentist"],
                ["admin@demo.local", "Admin"],
              ].map(([email, label]) => (
                <Button
                  key={email}
                  variant="secondary"
                  onClick={() => quick(email)}
                  disabled={action.busy}
                >
                  {label}
                </Button>
              ))}
            </div>
            <small>
              All demo accounts use <strong>Demo123!</strong>. Authentication is
              simulated locally.
            </small>
          </div>
        )}
      </div>
    </div>
  );
}
