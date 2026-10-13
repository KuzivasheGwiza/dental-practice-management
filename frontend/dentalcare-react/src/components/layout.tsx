import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronRight,
  CreditCard,
  FileText,
  HeartPulse,
  House,
  LayoutDashboard,
  LogOut,
  Menu,
  Phone,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  UsersRound,
  X,
  RotateCcw,
  ChartNoAxesCombined,
} from "lucide-react";
import { useDemo, useDemoClock } from "../hooks";
import { authService, demoStore } from "../services/mock";
import { Button, LinkButton, Modal } from "./ui";
import { brand } from "../config";
const currentYear = new Date().getFullYear();
import type { Role } from "../domain";

export function DemoBanner() {
  return (
    <div className="demo-banner">
      <ShieldCheck size={13} />
      <span>
        Demonstration website · fictional people, sample fees & simulated
        payments
      </span>
    </div>
  );
}
export function Brand() {
  const { content } = useDemo();
  return (
    <Link to="/" className="brand">
      <img src={brand.logo} alt="" width="40" height="40" />
      <span>
        {content.name}
        <small>FAMILY DENTAL CARE</small>
      </span>
    </Link>
  );
}
export function PublicLayout() {
  useDemoClock();
  const [open, setOpen] = useState(""),
    state = useDemo(),
    location = useLocation();
  const menuOpen = open === location.pathname;
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);
  const user = state.users.find(
    (u) => u.id === state.sessionUserId && u.active,
  );
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <DemoBanner />
      <header className="public-header">
        <div className="container header-inner">
          <Brand />
          <button
            className="icon-button mobile-menu"
            onClick={() => setOpen(menuOpen ? "" : location.pathname)}
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
          <nav
            className={menuOpen ? "public-nav open" : "public-nav"}
            aria-label="Main navigation"
          >
            {[
              ["/", "Home"],
              ["/about", "About"],
              ["/services", "Services"],
              ["/faqs", "FAQs"],
              ["/contact", "Contact"],
            ].map(([path, label]) => (
              <NavLink end={path === "/"} key={path} to={path}>
                {label}
              </NavLink>
            ))}
            <NavLink
              to={
                user
                  ? user.role === "patient"
                    ? "/portal"
                    : "/staff"
                  : "/login"
              }
              className="login-link"
            >
              <UserRound size={17} />
              {user ? "My portal" : "Patient login"}
            </NavLink>
            <LinkButton to="/book">
              Book a consultation <ArrowUpRight size={17} />
            </LinkButton>
          </nav>
        </div>
      </header>
      <main id="main-content">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
export function Footer() {
  const { content } = useDemo();
  return (
    <footer>
      <div className="container footer-grid">
        <div>
          <Brand />
          <p>{content.tagline}</p>
          <small>A fictional practice, designed for demonstration.</small>
        </div>
        <div>
          <h3>Explore</h3>
          <Link to="/about">About the practice</Link>
          <Link to="/services">Dental services</Link>
          <Link to="/consultations">Your consultation</Link>
          <Link to="/faqs">Common questions</Link>
        </div>
        <div>
          <h3>Your visit</h3>
          <Link to="/book">Book a consultation</Link>
          <Link to="/login">Patient portal</Link>
          <Link to="/policies">Privacy & booking policies</Link>
          <Link to="/contact">Contact & directions</Link>
        </div>
        <div>
          <h3>Let’s talk</h3>
          <a href={`tel:${content.phone.replace(/\s/g, "")}`}>
            <Phone size={15} />
            {content.phone}
          </a>
          <a href={`mailto:${content.email}`}>{content.email}</a>
          <p>
            {content.address}
            <br />
            {content.city}
          </p>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © {currentYear} {content.name}. Demonstration only.
        </span>
        <span>All appointment times are in South African time (SAST).</span>
      </div>
    </footer>
  );
}
export function RequireRole({ roles }: { roles: Role[] }) {
  const s = useDemo(),
    location = useLocation(),
    user = s.users.find((u) => u.id === s.sessionUserId && u.active);
  if (!user)
    return (
      <Navigate
        to="/login"
        state={{ returnTo: location.pathname + location.search }}
        replace
      />
    );
  if (!roles.includes(user.role))
    return (
      <div className="container section">
        <h1>This area is for {roles.join(" / ")} accounts</h1>
        <p>
          You’re signed in as a {user.role}. Use the account menu to sign out
          and try the appropriate fictional role.
        </p>
        <LinkButton to={user.role === "patient" ? "/portal" : "/staff"}>
          Go to my portal
        </LinkButton>
      </div>
    );
  return <Outlet />;
}
export function PortalLayout({ staff = false }: { staff?: boolean }) {
  useDemoClock();
  const state = useDemo(),
    user = state.users.find((u) => u.id === state.sessionUserId),
    navigate = useNavigate(),
    location = useLocation();
  const [open, setOpen] = useState(""),
    [reset, setReset] = useState(false);
  const menuOpen = open === location.pathname;
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      document.getElementById("main-content")?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const firstLink =
      document.querySelector<HTMLAnchorElement>(".sidebar nav a");
    const frame = requestAnimationFrame(() =>
      firstLink?.focus({ preventScroll: true }),
    );
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen("");
      document.querySelector<HTMLButtonElement>(".portal-menu")?.focus();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);
  if (!user) return <Navigate to="/login" replace />;
  const canManage = user.role === "administrator",
    canMoney = user.role === "administrator" || user.role === "receptionist";
  const patientLinks = [
    ["/portal", "Overview", LayoutDashboard],
    ["/portal/appointments", "My appointments", CalendarDays],
    ["/book", "Book a consultation", HeartPulse],
    ["/portal/payments", "Payments & receipts", CreditCard],
    ["/portal/documents", "Intake & documents", FileText],
    ["/portal/notifications", "Notifications", Bell],
    ["/portal/profile", "My profile", UserRound],
  ] as const;
  const staffLinks = [
    ["/staff", "Overview", LayoutDashboard],
    ["/staff/calendar", "Appointment calendar", CalendarDays],
    ["/staff/patients", "Patients", UsersRound],
    ["/staff/book", "New appointment", HeartPulse],
    ...(canManage
      ? [
          ["/staff/availability", "Availability", SlidersHorizontal],
          ["/staff/consultations", "Consultations & fees", CreditCard],
          ["/staff/content", "Website content", FileText],
          ["/staff/team", "Staff & roles", ShieldCheck],
        ]
      : []),
    ...(canMoney ? [["/staff/reports", "Reports", ChartNoAxesCombined]] : []),
  ] as typeof patientLinks | [string, string, typeof LayoutDashboard][];
  const links = staff ? staffLinks : patientLinks;
  const patient = state.patients.find((p) => p.userId === user.id);
  const unread = state.notifications.filter(
    (n) => n.patientId === patient?.id && !n.read,
  ).length;
  return (
    <div className="portal-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className={menuOpen ? "sidebar open" : "sidebar"}>
        <Brand />
        <div className="sidebar-label">
          {staff ? "PRACTICE PORTAL" : "PATIENT PORTAL"}
        </div>
        <nav aria-label="Portal navigation">
          {links.map(([path, label, Icon]) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setOpen("")}
              end={path === "/portal" || path === "/staff"}
            >
              <Icon size={19} />
              {label}
              {path === "/portal/notifications" && unread > 0 && (
                <span className="nav-count">{unread}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <ShieldCheck size={24} />
            <strong>A little peace of mind.</strong>
            <p>
              This portal uses fictional records. No payments or messages leave
              the demo.
            </p>
            <Link to="/contact">
              Contact the practice <ChevronRight size={15} />
            </Link>
          </div>
          <Link to="/">
            <House size={17} />
            Back to website
          </Link>
          <Button variant="ghost" onClick={() => setReset(true)}>
            <RotateCcw size={16} />
            Reset demo data
          </Button>
        </div>
      </aside>
      {menuOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Close portal menu"
          onClick={() => setOpen("")}
        />
      )}
      <div className="portal-main">
        <DemoBanner />
        <header className="portal-topbar">
          <div className="row">
            <Button
              className="portal-menu"
              variant="ghost"
              aria-expanded={menuOpen}
              aria-label="Open portal navigation"
              onClick={() => setOpen(menuOpen ? "" : location.pathname)}
            >
              <Menu size={22} />
            </Button>
            <span className="breadcrumb">
              {staff ? "Practice portal" : "Patient portal"}
              <ChevronRight size={14} />
              {links.find(([path]) => path === location.pathname)?.[1] ??
                "Appointment details"}
            </span>
          </div>
          <div className="row">
            <span className="sast">Johannesburg · SAST</span>
            {!staff && (
              <Link
                to="/portal/notifications"
                className="icon-button"
                aria-label={`${unread} unread notifications`}
              >
                <Bell size={19} />
                {unread > 0 && <i />}
              </Link>
            )}
            <span className="avatar small">
              {user.name
                .split(" ")
                .slice(0, 2)
                .map((x) => x[0])
                .join("")}
            </span>
            <div className="user-info">
              <strong>{user.name}</strong>
              <small>{user.role}</small>
            </div>
            <Button
              variant="ghost"
              aria-label="Sign out"
              onClick={async () => {
                await authService.logout();
                navigate("/login");
              }}
            >
              <LogOut size={18} />
            </Button>
          </div>
        </header>
        <main className="portal-content" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <div className="portal-footer">
          {state.content.name} · Demonstration portal{" "}
          <span>
            Need help? <Link to="/contact">Contact reception</Link>
          </span>
        </div>
      </div>
      {reset && (
        <Modal
          title="Reset this demonstration?"
          onClose={() => setReset(false)}
        >
          <p>
            This clears fictional bookings and demo account changes stored in
            this browser, then restores the starter records.
          </p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setReset(false)}>
              Keep my demo
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                demoStore.reset();
                setReset(false);
                navigate("/");
              }}
            >
              Reset demo data
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
export function AdminOnly({ children }: { children: React.ReactNode }) {
  const s = useDemo(),
    user = s.users.find((u) => u.id === s.sessionUserId);
  return user?.role === "administrator" ? (
    children
  ) : (
    <div className="panel">
      <h1>Administrator access required</h1>
      <p>
        Switch to the fictional administrator account to manage these settings.
      </p>
    </div>
  );
}
export function MoneyOnly({ children }: { children: React.ReactNode }) {
  const s = useDemo(),
    user = s.users.find((u) => u.id === s.sessionUserId);
  return user?.role === "administrator" || user?.role === "receptionist" ? (
    children
  ) : (
    <div className="panel">
      <h1>Reception or administrator access required</h1>
      <p>Your dentist view focuses on appointments and intake.</p>
    </div>
  );
}
