# Banāt al-Ummah | بنات الأمة

**Supporting Muslim Women. Sharing Beneficial Knowledge.**

Banāt al-Ummah is an initiative dedicated to supporting groups of Muslim women seeking beneficial Islamic knowledge, strengthening their connection to the Qur'an, and sharing what they learn with their communities.

Our inaugural cohort's educational journey is planned for **Summer 2027**, beginning in Cairo, Egypt, and continuing to Bosnia, in shā’ Allāh. This first initiative reflects our broader vision of creating educational opportunities for Muslim women, in shā’ Allāh.

## About the Project

This website serves as the official digital home for Banāt al-Ummah. It introduces our mission, shares our educational aspirations, documents the inaugural cohort's planned journey, and provides information about supporting the current initiative.

### Our Mission

To sponsor groups of Muslim women in their pursuit of beneficial Islamic knowledge, fostering opportunities for education, spiritual growth, and service to their communities.

### Our Goals

- Support Arabic language learning and Qur'an study.
- Encourage study of foundational Islamic sciences.
- Create opportunities for Muslim women to learn together.
- Share beneficial knowledge with families and communities.

## Our Journey | Summer 2027

### Cairo, Egypt 🇪🇬

**Institution:** Nile Center  
**Location:** Nasr City, Cairo  
**Duration:** Approximately two months

We plan to study Arabic, Qur'an, and foundational Islamic sciences, including aqidah, fiqh, tafsir, and hadith.

### Bosnia and Herzegovina 🇧🇦

**Program:** Muslimah Qur'an Retreat  
**Organizer:** Bosnia Institution

Following the cohort's studies in Cairo, participants hope to attend a Qur'an-centered retreat focused on learning, reflection, and sisterhood.

*All travel arrangements and educational programs are subject to confirmation.*

## Website Structure

The website's primary pages are:

| Page | Description |
|---|---|
| Home | Introduction, mission, journey overview, and fundraising |
| About Us | Our story and individual sister biographies |
| Our Journey | Study plans, destinations, itinerary, and fundraising details |
| Events | Learning events, event details, and registration information |

### Project Files

```text
banat-al-ummah/
│
├── index.html
├── about.html
├── journey.html
├── events.html
├── event.html
├── register.html
├── registration-success.html
├── events-confirm.html
├── events-unsubscribe.html
│
├── css/
│   ├── style.css
│   └── events.css
│
├── js/
│   ├── main.js
│   ├── events-data.js
│   └── events.js
│
├── assets/
│   ├── images/
│   │   └── sisters/
│   └── icons/
│
├── README.md
│
└── server/
    ├── server.js
    ├── events-utils.js
    ├── .env.example
    └── migrations/
        └── 001_event_registration.sql
```

## Technologies Used

- **HTML5:** Website structure and content
- **CSS3:** Styling and responsive layouts
- **JavaScript:** Navigation and interactive elements
- **Git & GitHub:** Version control
- **GitHub Pages:** Static website hosting

The website is designed to be lightweight, mobile-friendly, accessible, and easy to maintain.

## Getting Started

Clone the repository:

```bash
git clone https://github.com/USERNAME/banat-al-ummah.git
```

Navigate to the project directory:

```bash
cd banat-al-ummah
```

Open `index.html` in your browser or use the Live Server extension in Visual Studio Code.

Replace `USERNAME` with the repository owner's GitHub username.

## Support Our Journey

Our current initiative has a fundraising goal of **$30,000** to help cover the inaugural cohort's educational programs, transportation, accommodation, and other necessary travel expenses.

Contributions are processed securely through Stripe Checkout on our website.

**[Give Sadaqah](./donate.html)**

## Events and Registration

The Events pages are static files hosted with the website. Public event details
are maintained in `js/events-data.js` and shared with the Express service so
event prices and schedules are validated on the server.

The proposed weekly Arabic class is shown as **registration opening soon**.
Paid registration is intentionally disabled until the class schedule, public
location, eligibility, cancellation/refund policy, deadline, and per-session
capacity are confirmed. The current public description is the Greater Cleveland
Area, Ohio; do not put a private venue address in the public event data or
confirmation emails.

### Private event services

The Express service can use Render PostgreSQL for private interest and
registration records and Resend for double-opt-in interest emails and paid
registration confirmations. Donation processing remains separate. The website
does not store card details; Stripe Checkout handles payment.

Configure these only in the backend service environment, never in the website:

- `DATABASE_URL`: Render PostgreSQL connection string.
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL`: Resend API key and a verified sender.
- `EVENT_ADMIN_TOKEN`: a unique random token with at least 32 characters.
- `EVENT_REGISTRATION_ENABLED=false`: keep paid registration closed.
- Existing Stripe variables: matching test/live keys and webhook signing secret.

Copy `server/.env.example` as a local reference; do not commit a real `.env`.
The server creates the event tables at startup when `DATABASE_URL` is set. If
the database is unavailable, the event APIs report unavailable while the
existing donation routes remain available.

Point the Stripe webhook at
`https://banatalummah.onrender.com/api/stripe-webhook`. Include the existing
donation event types and these Checkout/refund/dispute events:
`checkout.session.completed`, `checkout.session.async_payment_succeeded`,
`checkout.session.async_payment_failed`, `checkout.session.expired`,
`charge.refunded`, `charge.dispute.created`, and `charge.dispute.closed`.

### Organizer access and launch checklist

Organizer requests use the `Authorization: Bearer <EVENT_ADMIN_TOKEN>` header:

- `GET /api/admin/event-registrations` lists registrations; optional filters:
  `event_id`, `status`, and `limit` (up to 500).
- `GET /api/admin/event-interests` lists only confirmed, subscribed interest
  requests; optional filters: `event_id` and `limit`.
- `POST /api/admin/event-sessions` configures up to 50 class dates using
  `{"eventId":"weekly-arabic-classes","sessions":[{"sessionDate":"YYYY-MM-DD"}]}`.
  The server uses the configured per-session capacity, locks concurrent
  reservations, and rejects capacity changes below seats already booked.

Before opening registration:

1. Confirm the date/schedule, eligibility, registration deadline,
   cancellation/refund policy, public location wording, and per-session
   capacity with the organizers.
2. Update the Arabic class entry in `js/events-data.js` with those confirmed
   details, `capacityPerSession`, and `registrationPolicy`; set
   `registrationEnabled` to `true`.
3. Configure the matching session dates through the authenticated organizer
   endpoint and set `EVENT_REGISTRATION_ENABLED=true` in the backend.
4. Test the complete flow with Stripe test keys and verify confirmation email,
   webhook delivery, capacity handling, registration status, and organizer
   access before changing to live payment keys.

The public event price is informational only. Checkout amount is calculated
from the server-owned event configuration. Do not set registration open until
all launch requirements and provider configuration are verified.

## Contact

For questions, inquiries, or information about our journey:

**Email:** To be announced  
**Website:** To be announced

---

**اللَّهُمَّ انْفَعْنَا بِمَا عَلَّمْتَنَا وَعَلِّمْنَا مَا يَنْفَعُنَا**

*O Allah, benefit us through what You have taught us, and teach us what will benefit us.*

**Banāt al-Ummah | بنات الأمة**

*Seeking knowledge. Strengthening sisterhood. Growing in faith.*
