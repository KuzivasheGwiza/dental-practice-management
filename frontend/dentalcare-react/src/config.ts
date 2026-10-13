import type { SiteContent } from "./domain";
export const brand = {
  name: "DentalCare",
  logo: "/images/logo.svg",
  navy: "#142e3b",
  teal: "#087c78",
  accent: "#c3ece1",
  locale: "en-ZA",
  timeZone: "Africa/Johannesburg",
};
export const initialContent: SiteContent = {
  name: brand.name,
  tagline: "A little care. A healthier smile.",
  phone: "010 000 0123",
  email: "hello@dentalcare.example",
  address: "24 Garden Avenue, Rosebank",
  city: "Johannesburg, South Africa",
  hours: "Monday–Friday 08:30–17:00 · Saturday 09:00–13:00",
  heroHeadline: "Healthy smiles. Simple bookings.",
  heroCopy:
    "Get to know your dental team, explore your care options, and find a consultation that fits your day. A calmer dental experience starts here.",
  preparation:
    "Demo preparation: arrive 10 minutes early. The practice will supply approved instructions specific to your appointment.",
  cancellationHours: 24,
  policy:
    "Demonstration policy: reschedule or cancel online at least 24 hours before your appointment. Contact reception for later changes. Deposit refunds require review by reception; no real money is collected in this demo.",
  privacy:
    "This is a fictional demonstration. Please do not enter real medical information, identity documents or payment details. Demo records are saved in this browser only. You can clear them with Reset demo data. A real practice must supply its reviewed privacy notice before launch.",
  faqs: [
    {
      question: "How do I book a consultation?",
      answer:
        "Choose a consultation, a dentist and an available time. Review your details and complete the clearly marked demo deposit to confirm.",
    },
    {
      question: "Are these the practice’s actual fees?",
      answer:
        "All fees on this demonstration are sample amounts in South African rand. A real practice will confirm its fees and treatment estimates.",
    },
    {
      question: "Can I change my appointment?",
      answer:
        "Yes. Use My appointments to choose a new time or cancel. Demo online changes close 24 hours before the appointment; reception can help with later changes.",
    },
    {
      question: "Does the practice accept medical aid?",
      answer:
        "The demonstration does not represent any medical aid agreement. Contact the practice to confirm its arrangements.",
    },
    {
      question: "What if I cannot find a suitable time?",
      answer:
        "Contact reception to discuss another date. Urgent assessment slots can also be explored in the booking form.",
    },
  ],
};
export const photoAssets = {
  hero: "/images/practice.jpg",
  care: "/images/dental-care.jpg",
};
