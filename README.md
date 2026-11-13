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
├── newsletter-confirm.html
├── newsletter-unsubscribe.html
│
├── css/
│   ├── style.css
│   ├── events.css
│   └── newsletter.css
│
├── js/
│   ├── main.js
│   ├── events-data.js
│   ├── events.js
│   └── newsletter.js
│
├── assets/
│   ├── images/
│   │   ├── events/
│   │   └── sisters/
│   ├── videos/
│   │   └── events/
│   └── icons/
│
├── README.md
│
└── server/
    ├── server.js
    ├── events-utils.js
    ├── .env.example
    └── migrations/
        ├── 001_event_registration.sql
        └── 002_newsletter_subscribers.sql
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

`events.html` contains the editorial Events page. Event titles, status, cover
photos, and media paths are maintained in `js/events-data.js`. Replace
`coverImage` or `cardImage` there to update the featured image or carousel
image; future events without approved photography use designed placeholders.
Do not add dates or registration details to placeholders until organizers
confirm them.

Each event card opens the shared, data-driven detail template at
`event.html?event=<event-id>`. Event titles, status, facts, descriptions,
registration links, payment links, and optional detail sections are maintained
in `js/events-data.js`. The Arabic Classes copy and display details are all
configured there; `js/events.js` renders whichever sections apply to an event.

### Event media

- Add event and community photos to `assets/images/events/`.
- Use the filenames listed in `assets/images/events/README.md` and
  `assets/videos/events/README.md`; the hero, featured class, carousel,
  Moments gallery, and Events newsletter popup now use Events-specific media.
- The hero and community videos each support dedicated WebM and MP4 files and
  posters configured in `js/events-data.js`. Missing media shows a
  brand-colored placeholder rather than reusing assets from other pages.
- The Arabic Classes detail hero uses `coverImage` for its photo. Optional
  detail-page video sources can be added to that event's `mediaVideoSources`
  array, with its poster set in `mediaPoster`. Keep uploaded class photos and
  videos in the Events-specific folders above.
- Use descriptive filenames, keep important subjects within the center-safe
  area, and provide meaningful alt text when adding a photo to event data.

See `assets/images/events/README.md` and `assets/videos/events/README.md` for
the media placement details.

### Newsletter subscriptions

The newsletter popup appears automatically after 10 seconds on the Home, About,
Journey, Events, and event-details pages. Its dismissal is remembered; it does
not appear more than once a week and a dismissal suppresses it for 30 days. It
does not appear on donation, registration, or confirmation flows. Signup is
separate from event registration and payment. It requires explicit consent and
at least one selected topic, stores pending subscriptions in PostgreSQL, and
sends a double-opt-in email through Resend. Only confirmed subscribers are
eligible for future announcements. Unsubscribe links change the mailing-list
status; they do not affect event registrations.

The Render service reuses the existing backend-only `DATABASE_URL`,
`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `FRONTEND_URL` settings. The backend
uses the Resend Node SDK; `RESEND_FROM_EMAIL` must be a sender verified by
Resend. Both `https://banatalummah.com` and
`https://www.banatalummah.com` are allowed by CORS. Set
`FRONTEND_ALLOWED_ORIGINS` only when additional preview origins are needed.
Never put provider keys or subscriber data in frontend code. Startup applies
`server/migrations/002_newsletter_subscribers.sql` and
`server/migrations/003_newsletter_welcome_delivery.sql`. The frontend submits
to `POST /api/newsletter/subscribe`; confirmation links expire after 24 hours
and can only be used once. A branded welcome email is sent after confirmation.
If PostgreSQL or the verified Resend sender is unavailable, signup remains
disabled and displays the actual service state.

Organizer-only aggregate counts and topic segments are available at
`GET /api/admin/newsletter-summary` with the existing
`Authorization: Bearer <EVENT_ADMIN_TOKEN>` header. No public endpoint returns
subscriber records. Delivery attempts are stored separately from event
registration and donation confirmations.

The Arabic Classes registration button opens the Google Form; newsletter signup
does not enroll students. The course payment link remains the existing Stripe
Payment Link, and the donation system remains separate.

Copy `server/.env.example` as a local reference; do not commit a real `.env`.
The website does not store card details; Stripe handles payment.

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
