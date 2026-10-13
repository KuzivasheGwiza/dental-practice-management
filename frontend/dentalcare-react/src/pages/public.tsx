import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  HeartHandshake,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Smile,
  Sparkles,
  ZoomIn,
} from "lucide-react";
import { useDemo } from "../hooks";
import { bookingService } from "../services/mock";
import { addDays, dateLabel, money, today } from "../time";
import {
  Accordion,
  Button,
  Empty,
  LinkButton,
  Modal,
  PageHeading,
  SearchInput,
  ServiceCard,
} from "../components/ui";
import { ServiceVisual } from "../components/visual";

export function Home() {
  const s = useDemo(),
    c = s.content;
  let preview: { date: string; time: string } | undefined;
  for (let i = 1; i < 8 && !preview; i++) {
    const date = addDays(today(), i),
      slot = bookingService
        .slots(s, date, "d-1", "general")
        .find((x) => x.available);
    if (slot) preview = { date, time: slot.time };
  }
  return (
    <>
      <section className="home-hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="tiny-dot" />A warmer welcome to dental care
            </span>
            <h1>
              {c.heroHeadline.slice(0, c.heroHeadline.lastIndexOf(" "))}{" "}
              <em>
                {c.heroHeadline.slice(c.heroHeadline.lastIndexOf(" ") + 1)}
              </em>
            </h1>
            <p>{c.heroCopy}</p>
            <div className="row wrap">
              <LinkButton to="/book">
                Book a consultation <ArrowUpRight size={19} />
              </LinkButton>
              <LinkButton to="/services" variant="secondary">
                Explore our services <ArrowRight size={18} />
              </LinkButton>
            </div>
            <div className="hero-assurance">
              <ShieldCheck size={18} />
              <span>Clear information. A time that works for you.</span>
            </div>
          </div>
          <div className="hero-photo">
            <img
              src="/images/practice.jpg"
              alt="A bright dental treatment room with a teal chair, natural light and modern equipment; stock demonstration photography"
              fetchPriority="high"
            />
            <span className="photo-note">
              Stock photography · demonstration practice
            </span>
            <div className="photo-caption">
              <span className="round-icon">
                <HeartHandshake size={23} />
              </span>
              <div>
                <strong>Care starts with a conversation.</strong>
                <small>Explore your options at your own pace.</small>
              </div>
            </div>
          </div>
        </div>
        <div className="container availability-preview">
          <div className="round-icon">
            <CalendarDays size={24} />
          </div>
          <div>
            <span className="eyebrow">YOUR NEXT STEP</span>
            <h3>Find a little room for your smile.</h3>
          </div>
          <div className="availability-slot">
            <span className="tiny-dot" />
            {preview
              ? `${dateLabel(preview.date, true)} · ${preview.time} SAST`
              : "Explore our upcoming availability"}
            <small>Sample general consultation · Dr Maya Patel</small>
          </div>
          <LinkButton
            to={
              preview
                ? `/book?date=${preview.date}&time=${preview.time}`
                : "/book"
            }
            variant="secondary"
          >
            View available times <ArrowRight size={18} />
          </LinkButton>
        </div>
      </section>
      <section className="values-strip container">
        {[
          {
            Icon: HeartHandshake,
            title: "A thoughtful approach",
            text: "A welcoming space to ask questions.",
          },
          {
            Icon: CalendarDays,
            title: "Booking made simple",
            text: "Choose your dentist, day and time.",
          },
          {
            Icon: ShieldCheck,
            title: "Clarity at every step",
            text: "Review sample fees before you confirm.",
          },
        ].map(({ Icon, title, text }) => (
          <div key={title}>
            <Icon size={26} />
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </div>
        ))}
      </section>
      <section className="section soft">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">CARE FOR EVERY CHAPTER</span>
              <h2>
                A healthier smile,
                <br />
                one thoughtful step at a time.
              </h2>
            </div>
            <div>
              <p>
                From everyday check-ups to conversations about your next
                treatment, find a comfortable place to start.
              </p>
              <Link to="/services" className="text-link">
                Explore all services <ArrowRight size={17} />
              </Link>
            </div>
          </div>
          <div className="service-grid">
            {s.services
              .filter((x) => x.enabled)
              .slice(0, 3)
              .map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
          </div>
        </div>
      </section>
      <section className="section container team-intro">
        <div>
          <span className="eyebrow">MEET YOUR DENTAL TEAM</span>
          <h2>
            People first.
            <br />
            Smiles always.
          </h2>
          <p>
            Get to know the people behind your care before your first visit. Our
            editable sample profiles show where your practice’s approved team
            information will appear.
          </p>
          <LinkButton to="/about" variant="secondary">
            Meet the team <ArrowRight size={18} />
          </LinkButton>
        </div>
        <div className="team-pair">
          {s.dentists.slice(0, 2).map((d) => (
            <article className={`team-card ${d.colour}`} key={d.id}>
              <div className="avatar portrait">
                {d.initials}
                <Sparkles size={28} />
              </div>
              <h3>{d.name}</h3>
              <p>{d.focus}</p>
              <span className="asset-label inline">Fictional profile</span>
            </article>
          ))}
        </div>
      </section>
      <section className="section process-section">
        <div className="container">
          <div className="center-heading">
            <span className="eyebrow">A FEW SIMPLE STEPS</span>
            <h2>Your visit starts here.</h2>
            <p>From finding a time to feeling ready for your consultation.</p>
          </div>
          <div className="process-grid">
            {[
              {
                Icon: Smile,
                title: "Choose your consultation",
                text: "Find the right starting point for your needs.",
              },
              {
                Icon: CalendarDays,
                title: "Make it fit your day",
                text: "Choose a dentist and an available time.",
              },
              {
                Icon: Check,
                title: "Arrive feeling prepared",
                text: "Review your booking and visit information.",
              },
            ].map(({ Icon, title, text }, i) => (
              <article key={title}>
                <span className="step-number">0{i + 1}</span>
                <div className="round-icon">
                  <Icon size={26} />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section container faq-split">
        <div>
          <span className="eyebrow">A LITTLE MORE CLARITY</span>
          <h2>
            Good questions.
            <br />
            Simple answers.
          </h2>
          <p>Booking your first visit? We’re here to make things easier.</p>
          <Link to="/faqs" className="text-link">
            Read all FAQs <ArrowRight size={17} />
          </Link>
        </div>
        <Accordion items={c.faqs.slice(0, 4)} />
      </section>
      <section className="contact-band">
        <div className="container">
          <div>
            <span className="eyebrow">LET’S MAKE YOUR NEXT VISIT EASY</span>
            <h2>We’d love to hear from you.</h2>
            <p>
              {c.address} · {c.city}
            </p>
            <p>{c.hours}</p>
          </div>
          <div>
            <a href={`tel:${c.phone}`} className="contact-phone">
              <Phone size={25} />
              {c.phone}
            </a>
            <LinkButton to="/contact" variant="secondary">
              Contact & directions <ArrowUpRight size={18} />
            </LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}
export function Services() {
  const s = useDemo(),
    [q, setQ] = useState(""),
    [group, setGroup] = useState("All services");
  const groups = ["All services", ...new Set(s.services.map((x) => x.group))],
    items = s.services.filter(
      (x) =>
        x.enabled &&
        (group === "All services" || x.group === group) &&
        (x.name + " " + x.summary).toLowerCase().includes(q.toLowerCase()),
    );
  return (
    <>
      <section className="public-page-hero">
        <div className="container">
          <span className="eyebrow">EXPLORE YOUR CARE OPTIONS</span>
          <h1>
            Care for your smile.
            <br />
            At every stage.
          </h1>
          <p>
            Learn about the care you can discuss with your dentist. All services
            and information shown here are editable demonstration content.
          </p>
        </div>
      </section>
      <section className="section container">
        <div className="catalogue-toolbar">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Search dental services"
          />
          <label className="field inline-field">
            <span>Care category</span>
            <select value={group} onChange={(e) => setGroup(e.target.value)}>
              {groups.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="muted">
          {items.length} services · treatment suitability is determined
          following assessment
        </p>
        <div className="service-grid">
          {items.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
        {!items.length && (
          <Empty
            title="No matching services"
            description="Try another search or contact reception to discuss your needs."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setQ("");
                  setGroup("All services");
                }}
              >
                Clear filters
              </Button>
            }
          />
        )}
      </section>
    </>
  );
}
export function ServiceDetail() {
  const s = useDemo(),
    { id } = useParams(),
    service = s.services.find((x) => x.id === id && x.enabled),
    [zoom, setZoom] = useState(false);
  if (!service) return <NotFound />;
  return (
    <section className="section container">
      <div className="breadcrumbs">
        <Link to="/services">Services</Link>
        <span>/</span>
        {service.name}
      </div>
      <div className="detail-hero">
        <div>
          <span className="eyebrow">{service.group}</span>
          <h1>{service.name}</h1>
          <p className="lead">{service.summary}</p>
          <LinkButton to={`/book?service=${service.id}`}>
            Book a consultation <ArrowRight size={18} />
          </LinkButton>
          <p className="small muted">
            Consultation first. Treatment is planned following assessment.
          </p>
        </div>
        <div>
          <ServiceVisual kind={service.visual} title={service.name} large />
          <Button variant="ghost" onClick={() => setZoom(true)}>
            <ZoomIn size={17} />
            Enlarge service visual
          </Button>
        </div>
      </div>
      <div className="reading-grid">
        <article>
          <h2>A place to start</h2>
          <p>{service.overview}</p>
          <h2>What you can expect</h2>
          <p>{service.expectations}</p>
          <h2>Before your visit</h2>
          <p>{service.preparation}</p>
          <h2>After your visit</h2>
          <p>{service.aftercare}</p>
          <h2>Your questions</h2>
          <Accordion
            items={[
              {
                question: "Can I book this treatment directly?",
                answer:
                  "Start with the relevant consultation. The practice schedules complex treatment visits after an assessment.",
              },
              {
                question: "What will my visit cost?",
                answer:
                  "The booking form displays sample consultation fees and deposits. Actual treatment estimates must be supplied by the practice.",
              },
              {
                question: "Is this information clinically reviewed?",
                answer:
                  "This is labelled demonstration content. Educational visuals and procedure copy require dental review before publication by a real practice.",
              },
            ]}
          />
        </article>
        <aside className="panel sticky">
          <span className="round-icon">
            <MessageCircle size={24} />
          </span>
          <h3>Let’s talk about your smile.</h3>
          <p>
            A consultation gives you space to ask questions and understand your
            options.
          </p>
          <LinkButton to={`/book?service=${service.id}`}>
            Find a time <ArrowRight size={17} />
          </LinkButton>
          <Link to="/contact" className="text-link">
            Ask reception a question
          </Link>
        </aside>
      </div>
      {zoom && (
        <Modal
          title={service.name + " · demonstration visual"}
          onClose={() => setZoom(false)}
          wide
        >
          <ServiceVisual kind={service.visual} title={service.name} large />
          <p className="small muted">
            Educational illustrations are sample assets awaiting practice
            review. Stock photographs are not representations of this fictional
            practice’s patients or staff.
          </p>
        </Modal>
      )}
    </section>
  );
}
export function About() {
  const s = useDemo();
  return (
    <section className="section container">
      <PageHeading
        eyebrow="GET TO KNOW US"
        title="A welcoming place to start."
        description="Thoughtful dental care begins with people who listen. This is an editable introduction for the demonstration practice."
      />
      <div className="about-grid">
        <img
          src="/images/team-care.jpg"
          alt="Stock photograph of a dental practice environment, used as demonstration imagery"
          loading="lazy"
        />
        <div>
          <span className="eyebrow">OUR APPROACH</span>
          <h2>
            A little more conversation.
            <br />A little less uncertainty.
          </h2>
          <p>
            Explore your options, ask the questions that matter to you, and find
            an appointment that fits your day.
          </p>
          <p>
            Practice history, professional credentials and care commitments will
            be added here when supplied and approved.
          </p>
          <LinkButton to="/consultations" variant="secondary">
            What to expect <ArrowRight size={18} />
          </LinkButton>
        </div>
      </div>
      <div className="center-heading">
        <span className="eyebrow">THE PEOPLE BEHIND YOUR CARE</span>
        <h2>Meet the demonstration team.</h2>
        <p>
          Fictional profiles. Professional registration and qualifications await
          practice supply.
        </p>
      </div>
      <div className="team-grid">
        {s.dentists.map((d) => (
          <article className="panel team-profile" key={d.id}>
            <div className={`avatar portrait ${d.colour}`}>{d.initials}</div>
            <span className="asset-label inline">Fictional profile</span>
            <h3>{d.name}</h3>
            <p className="text-teal">{d.focus}</p>
            <p>{d.bio}</p>
            <Link to={`/book?dentist=${d.id}`} className="text-link">
              Choose this dentist <ArrowRight size={16} />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
export function Consultations() {
  const s = useDemo();
  return (
    <section className="section container">
      <PageHeading
        eyebrow="YOUR FIRST VISIT"
        title="A clear plan. A calmer visit."
        description="Choose a consultation to start a conversation about your dental needs. Complex treatment visits are booked by the practice after assessment."
      />
      <div className="consultation-grid">
        {s.consultations
          .filter((c) => c.enabled && c.patientBookable)
          .map((c) => (
            <article className="panel" key={c.id}>
              <CalendarDays className="text-teal" size={28} />
              <h2>{c.name}</h2>
              <div className="meta">
                <span>
                  <Clock3 size={17} />
                  {c.duration} minutes
                </span>
                <span>{money(c.fee)} sample fee</span>
              </div>
              <p>
                {money(c.deposit)} demonstration deposit. Your booking shows the
                remaining sample balance.
              </p>
              <LinkButton to={`/book?type=${c.id}`} variant="secondary">
                Choose consultation <ArrowRight size={16} />
              </LinkButton>
            </article>
          ))}
      </div>
      <div className="reading-grid">
        <article>
          <h2>In-person consultations</h2>
          <p>
            All demonstration appointments take place at {s.content.address},{" "}
            {s.content.city}. Video consultations are not offered by this demo.
          </p>
          <h2>Preparing for your visit</h2>
          <p>{s.content.preparation}</p>
          <h2>Changes and cancellations</h2>
          <p>{s.content.policy}</p>
          <Link to="/policies" className="text-link">
            Read booking policies
          </Link>
        </article>
        <aside className="panel">
          <HeartHandshake size={32} />
          <h3>Not sure where to start?</h3>
          <p>
            Reception can help you choose a consultation and answer questions
            about the practice.
          </p>
          <LinkButton to="/contact" variant="secondary">
            Talk to reception
          </LinkButton>
        </aside>
      </div>
    </section>
  );
}
export function FAQs() {
  const s = useDemo();
  return (
    <section className="section container narrow">
      <PageHeading
        eyebrow="COMMON QUESTIONS"
        title="A little clarity goes a long way."
        description="Find answers about your booking, sample fees and demonstration portal."
      />
      <Accordion items={s.content.faqs} />
      <div className="panel contact-callout">
        <MessageCircle size={29} />
        <h3>Still have a question?</h3>
        <p>We’d be happy to help you prepare for your visit.</p>
        <LinkButton to="/contact" variant="secondary">
          Contact reception
        </LinkButton>
      </div>
    </section>
  );
}
export function Contact() {
  const { content: c } = useDemo();
  const directions =
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(c.address + ", " + c.city);
  return (
    <section className="section container">
      <PageHeading
        eyebrow="WE’RE HERE TO HELP"
        title="Let’s make your visit easier."
        description="The contact details below are sample content for a fictional practice."
      />
      <div className="contact-grid">
        <article className="panel">
          <div className="round-icon">
            <Phone />
          </div>
          <h2>Get in touch</h2>
          <a className="contact-phone" href={`tel:${c.phone}`}>
            {c.phone}
          </a>
          <p>
            <a href={`mailto:${c.email}`}>{c.email}</a>
          </p>
          <h3>Find us</h3>
          <p>
            {c.address}
            <br />
            {c.city}
          </p>
          <h3>Opening hours</h3>
          <p>{c.hours}</p>
          <a
            className="button secondary"
            href={directions}
            target="_blank"
            rel="noreferrer"
          >
            Open map & directions <ArrowUpRight size={17} />
          </a>
          <p className="small muted">
            Demonstration address. Confirm the practice’s actual location before
            travelling.
          </p>
        </article>
        <div
          className="map-placeholder"
          role="img"
          aria-label="Illustrated demonstration location map, not a navigational map"
        >
          <div className="map-road horizontal" />
          <div className="map-road diagonal" />
          <div className="map-road vertical" />
          <div className="map-park">Garden district</div>
          <div className="map-pin">
            <MapPin size={40} />
            <strong>{c.name}</strong>
            <span>Sample location</span>
          </div>
          <span className="map-caption">
            Illustrated placeholder · open directions for a map search
          </span>
        </div>
      </div>
    </section>
  );
}
export function Policies() {
  const { content: c } = useDemo();
  return (
    <section className="section container narrow">
      <PageHeading
        eyebrow="CLEAR FROM THE START"
        title="Privacy & booking policies."
      />
      <article className="panel policy-copy">
        <h2>Demonstration privacy notice</h2>
        <p>{c.privacy}</p>
        <h2>Bookings, cancellations & refunds</h2>
        <p>{c.policy}</p>
        <p>
          Online changes close {c.cancellationHours} hours before an
          appointment. Reception can help with later changes. Temporary
          demonstration checkout holds last five minutes and release
          automatically on expiry.
        </p>
        <h2>Demonstration documents and payments</h2>
        <p>
          Uploads store local file metadata only. Payment simulations never
          collect card details or transfer funds. Educational assets and
          preparation information require practice review before use in a real
          healthcare service.
        </p>
      </article>
    </section>
  );
}
export function NotFound() {
  return (
    <section className="section container">
      <Empty
        title="We couldn’t find that page"
        description="The link may have changed, or the service may no longer be published."
        action={<LinkButton to="/">Back to the homepage</LinkButton>}
      />
    </section>
  );
}
