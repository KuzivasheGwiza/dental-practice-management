import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { ReactElement, ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  LoaderCircle,
  MapPin,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { Appointment, DemoDocument, DentalService } from "../domain";
import { useDemo } from "../hooks";
import { dateLabel, money } from "../time";
import { uploadAdapter } from "../services/adapters";
import { ServiceVisual } from "./visual";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button className={`button ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function LinkButton({
  to,
  children,
  variant = "primary",
  className = "",
}: {
  to: string;
  children: ReactNode;
  variant?: string;
  className?: string;
}) {
  return (
    <Link to={to} className={`button ${variant} ${className}`}>
      {children}
    </Link>
  );
}
export function Badge({ status }: { status: string }) {
  const tone = ["Confirmed", "Paid", "Completed", "Recorded"].includes(status)
    ? "green"
    : ["Cancelled", "Failed", "Expired", "No-show", "Refunded"].includes(status)
      ? "red"
      : ["Awaiting payment", "Pending", "Awaiting approval", "Unpaid"].includes(
            status,
          )
        ? "amber"
        : "neutral";
  return (
    <span className={`badge ${tone}`}>
      <span />
      {status}
    </span>
  );
}
export function Notice({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  return (
    <>
      {error && (
        <div className="notice error" role="alert">
          <AlertCircle size={19} />
          {error}
        </div>
      )}
      {success && (
        <div className="notice success" role="status">
          <CheckCircle2 size={19} />
          {success}
        </div>
      )}
    </>
  );
}
export function Spinner() {
  return (
    <span className="loading" role="status">
      <LoaderCircle className="spin" size={18} />
      Loading…
    </span>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <CalendarDays size={35} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {isValidElement(children)
        ? cloneElement(
            children as ReactElement<{
              id: string;
              "aria-describedby"?: string;
            }>,
            { id, "aria-describedby": hint ? `${id}-hint` : undefined },
          )
        : children}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const titleId = useId(),
    ref = useRef<HTMLDialogElement>(null),
    returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const dialog = ref.current;
    returnFocus.current ??= document.activeElement as HTMLElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      queueMicrotask(() => {
        if (!dialog?.isConnected && returnFocus.current?.isConnected)
          returnFocus.current.focus({ preventScroll: true });
      });
    };
  }, []);
  return (
    <dialog
      aria-labelledby={titleId}
      ref={ref}
      className={wide ? "modal wide" : "modal"}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-heading">
        <h2 id={titleId}>{title}</h2>
        <Button variant="ghost" aria-label="Close dialog" onClick={onClose}>
          <X size={21} />
        </Button>
      </div>
      {children}
    </dialog>
  );
}
export function Accordion({
  items,
}: {
  items: { question: string; answer: string }[];
}) {
  return (
    <div className="accordion">
      {items.map((item, i) => (
        <details key={i}>
          <summary>
            {item.question}
            <ChevronDown size={18} />
          </summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
export function Stats({
  items,
}: {
  items: { label: string; value: string | number; detail?: string }[];
}) {
  return (
    <div className="stat-grid">
      {items.map((x) => (
        <div className="stat" key={x.label}>
          <span>{x.label}</span>
          <strong>{x.value}</strong>
          {x.detail && <small>{x.detail}</small>}
        </div>
      ))}
    </div>
  );
}
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search">
      <Search size={18} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function ServiceCard({ service }: { service: DentalService }) {
  return (
    <article className="service-card">
      <Link to={`/services/${service.id}`} tabIndex={-1} aria-hidden="true">
        <ServiceVisual kind={service.visual} title={service.name} />
      </Link>
      <div className="service-card-body">
        <span className="eyebrow">{service.group}</span>
        <h3>
          <Link to={`/services/${service.id}`}>{service.name}</Link>
        </h3>
        <p>{service.summary}</p>
        <div className="service-card-actions">
          <Link to={`/services/${service.id}`} className="text-link">
            Learn more <ArrowRight size={16} />
          </Link>
          <Link to={`/book?service=${service.id}`} className="text-link">
            Book a consultation
          </Link>
        </div>
      </div>
    </article>
  );
}
export function AppointmentCard({
  appointment,
  featured = false,
  actions,
}: {
  appointment: Appointment;
  featured?: boolean;
  actions?: ReactNode;
}) {
  const state = useDemo(),
    dentist = state.dentists.find((d) => d.id === appointment.dentistId),
    type = state.consultations.find((c) => c.id === appointment.consultationId);
  return (
    <article className={`appointment-card ${featured ? "featured" : ""}`}>
      <div className="date-tile">
        <small>
          {new Date(appointment.date + "T12:00Z").toLocaleDateString("en-ZA", {
            month: "short",
          })}
        </small>
        <strong>{appointment.date.slice(-2)}</strong>
        <span>
          {new Date(appointment.date + "T12:00Z").toLocaleDateString("en-ZA", {
            weekday: "short",
          })}
        </span>
      </div>
      <div className="appointment-content">
        <div className="row wrap">
          <Badge status={appointment.status} />
          <Badge status={appointment.paymentStatus} />
        </div>
        <h3>{type?.name}</h3>
        <p>{dentist?.name}</p>
        <div className="meta">
          <span>
            <Clock3 size={16} />
            {appointment.time} SAST · {appointment.duration} min
          </span>
          <span>
            <CalendarDays size={16} />
            {dateLabel(appointment.date, true)}
          </span>
        </div>
        {featured && (
          <>
            <div className="meta">
              <span>
                <MapPin size={16} />
                {state.content.address}
              </span>
            </div>
            <div className="preparation">
              <ShieldCheck size={17} />
              <p>{state.content.preparation}</p>
            </div>
          </>
        )}
        <small className="muted">
          Reference {appointment.reference} · {money(appointment.paid)} demo
          payment recorded
        </small>
      </div>
      <div className="appointment-actions">
        {actions ?? (
          <LinkButton
            to={`/portal/appointments/${appointment.id}`}
            variant="secondary"
          >
            View details <ArrowRight size={16} />
          </LinkButton>
        )}
      </div>
    </article>
  );
}
export function DocumentUploader({
  documents,
  onChange,
}: {
  documents: DemoDocument[];
  onChange: (docs: DemoDocument[]) => void;
}) {
  const [error, setError] = useState(""),
    [progress, setProgress] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  function upload(file?: File) {
    if (!file) return;
    setError("");
    if (!uploadAdapter.types.includes(file.type)) {
      setError("Choose a PDF, JPG or PNG file.");
      return;
    }
    if (file.size > uploadAdapter.maxBytes) {
      setError("Choose a file smaller than 5 MB.");
      return;
    }
    setProgress(10);
    timers.current.push(
      setTimeout(() => setProgress(65), 250),
      setTimeout(() => {
        onChange([
          ...documents,
          {
            id: crypto.randomUUID(),
            name: file.name,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString(),
          },
        ]);
        setProgress(null);
      }, 650),
    );
  }
  return (
    <div className="upload-section">
      <label className="upload-zone">
        <Upload size={26} />
        <strong>Add a demonstration document</strong>
        <span>PDF, JPG or PNG · maximum 5 MB</span>
        <small>
          Only local file metadata is retained. Use fictional files.
        </small>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          aria-label="Upload demonstration document"
          disabled={progress !== null}
          onChange={(e) => {
            upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {progress !== null && (
        <div role="status" className="upload-progress">
          <progress value={progress} max={100} />
          <span>Preparing metadata… {progress}%</span>
        </div>
      )}
      <Notice error={error} />
      {documents.map((doc) => (
        <div className="document-item" key={doc.id}>
          <FileText size={20} />
          <div>
            <strong>{doc.name}</strong>
            <small>
              {Math.max(1, Math.round(doc.size / 1024))} KB · metadata only
            </small>
          </div>
          <Button
            variant="ghost"
            aria-label={`Remove ${doc.name}`}
            onClick={() => onChange(documents.filter((x) => x.id !== doc.id))}
          >
            <Trash2 size={18} />
          </Button>
        </div>
      ))}
    </div>
  );
}
export function ProgressSteps({
  labels,
  current,
}: {
  labels: string[];
  current: number;
}) {
  return (
    <ol className="progress-steps" aria-label="Booking progress">
      {labels.map((label, i) => (
        <li
          key={label}
          className={i === current ? "current" : i < current ? "done" : ""}
          aria-current={i === current ? "step" : undefined}
        >
          <span>{i < current ? <Check size={15} /> : i + 1}</span>
          <small>{label}</small>
        </li>
      ))}
    </ol>
  );
}
