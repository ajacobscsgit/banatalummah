"use strict";

(() => {
  const events = [
    {
      id: "weekly-arabic-classes",
      title: "Weekly Arabic Classes",
      kind: "featured",
      category: "Arabic",
      summary:
        "Build a foundation in Arabic through weekly, in-person classes for Muslim women.",
      description:
        "A welcoming weekly class for Muslim women pursuing Arabic language learning. The proposed schedule is Wednesdays from 4:00 to 5:00 PM Eastern, beginning November 25, 2026.",
      format: "In person",
      location: "Greater Cleveland Area, Ohio",
      firstSessionDate: "2026-11-25",
      weekday: "Wednesday",
      startTime: "4:00 PM",
      endTime: "5:00 PM",
      timeZone: "America/New_York",
      priceInCents: 1000,
      currency: "USD",
      capacityPerSession: null,
      registrationPolicy: null,
      registrationEnabled: false,
      statusLabel: "Registration opening soon",
      detailsNote:
        "The schedule and remaining participation details are being confirmed. Registration is not open yet."
    },
    ...Array.from({ length: 5 }, (_, index) => ({
      id: `future-opportunity-${index + 1}`,
      title: "Future Learning Opportunity",
      kind: "placeholder",
      category: "Coming soon",
      summary:
        "We are working toward more opportunities to learn and grow together.",
      description:
        "Details for this future opportunity have not been announced. Join the interest list to hear when new event information is available.",
      registrationEnabled: false,
      statusLabel: "Details coming soon"
    }))
  ];

  if (typeof module !== "undefined" && module.exports) {
    module.exports = events;
  } else {
    window.BANAT_EVENTS = events;
  }
})();
