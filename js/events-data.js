"use strict";

(() => {
  const events = [
    {
      id: "weekly-arabic-classes",
      title: "Egyptian Arabic Classes",
      subtitle: "Level 1 | Egyptian Arabic Classes",
      kind: "featured",
      category: "Arabic",
      summary:
        "Begin your Arabic-speaking journey with practical vocabulary, guided conversations, and interactive lessons. Our Level 1 course introduces the foundations of Egyptian Arabic, helping students build confidence communicating in everyday situations while preparing for continued learning.",
      enrollmentNotice:
        "To be considered for enrollment, students must complete both the registration form and course payment. Enrollment is subject to confirmation and seat availability.",
      scheduleLabel: "Wednesdays | 4:00–5:00 PM Eastern",
      courseDateRangeLabel: "November 25, 2026 – May 26, 2027",
      feeSummary: "$11 per class or $40 per month",
      availabilityLabel: "Limited to 15 students",
      cardFacts: [
        "Wednesdays | 4:00–5:00 PM Eastern",
        "November 25, 2026 – May 26, 2027",
        "$11 per class or $40 per month",
        "Limited to 15 students"
      ],
      coverImage: "assets/images/events/arabic-classes-featured.jpg",
      coverAlt: "Sisters learning together in an Arabic class",
      cardImage: "assets/images/events/arabic-classes-card.jpg",
      cardAlt: "Students taking part in a beginner Arabic class",
      coverTheme: "sage",
      heroDescription:
        "Begin your Arabic-speaking journey with practical vocabulary, guided conversations, and interactive lessons. Our Level 1 course introduces the foundations of Egyptian Arabic, helping students build confidence communicating in everyday situations while preparing for continued learning.",
      details: [
        ["Current level", "Level 1 | Egyptian Arabic · Beginner"],
        ["Focus", "Conversational Egyptian Arabic"],
        ["Schedule", "Wednesdays, 4:00–5:00 PM Eastern"],
        ["Dates", "November 25, 2026–May 26, 2027"],
        ["Format", "In-person group learning with live virtual instruction from an Egyptian teacher"],
        ["Location", "Cleveland, Ohio, exact address provided privately to confirmed participants"],
        ["Availability", "Limited to 15 students"],
        ["Fees", "$11 per class or $40 per month"],
        ["First payment deadline", "November 20, 2026, 11:59 PM"]
      ],
      benefitsIntro:
        "Egyptian Arabic is one of the most widely understood Arabic dialects, largely due to Egypt's media and cultural influence. It is a distinct spoken dialect—not the same as Modern Standard Arabic or Qur'anic Arabic—and familiarity varies among speakers.",
      benefits: [
        {
          title: "Everyday communication",
          description:
            "Build practical speaking skills and connect with people from different Arabic-speaking communities; familiarity with the dialect varies."
        },
        {
          title: "Expressions you hear",
          description:
            "Understand commonly heard Egyptian Arabic expressions used in daily conversation."
        },
        {
          title: "Egyptian media and culture",
          description:
            "Follow more of the language in Egyptian films, shows, and everyday speech."
        },
        {
          title: "Confidence to keep learning",
          description:
            "Grow confidence for travel, friendships, and cultural exchange while building a foundation for continued dialect learning."
        }
      ],
      progression: [
        {
          title: "Level 1 | Beginner",
          description: "Currently Enrolling",
          current: true
        },
        {
          title: "Level 2 | Developing",
          description: "Future Level"
        },
        {
          title: "Level 3 | Conversational",
          description: "Future Level"
        }
      ],
      progressionNote:
        "Later levels are envisioned as part of the program's progressive learning pathway, but are not yet confirmed or scheduled. Advancement is not automatic.",
      faq: [
        {
          question: "Who should register for Level 1?",
          answer:
            "Level 1 is for beginners who are new to Egyptian Arabic or want to strengthen their foundations."
        },
        {
          question: "What are the fees, and what do I need to do to be considered?",
          answer:
            "The fee is $11 per class or $40 per month. Complete both the registration form and course payment by November 20, 2026, 11:59 PM. Payment does not guarantee enrollment; confirmation depends on availability."
        },
        {
          question: "Where do classes meet?",
          answer:
            "The group meets in Cleveland, Ohio. The exact address is shared privately with confirmed participants."
        },
        {
          question: "What if I need to miss a class?",
          answer:
            "Please refer to the attendance and payment policy shared by the organizers during enrollment."
        }
      ],
      format:
        "In-person group learning with live virtual instruction from an Egyptian teacher",
      location: "Cleveland, Ohio",
      firstSessionDate: "2026-11-25",
      lastSessionDate: "2027-05-26",
      weekday: "Wednesday",
      startTime: "4:00 PM",
      endTime: "5:00 PM",
      timeZone: "America/New_York",
      duration: "1 hour per session",
      priceInCents: 1100,
      monthlyPriceInCents: 4000,
      currency: "USD",
      capacityPerSession: 15,
      firstPaymentDue: "November 20, 2026, 11:59 PM",
      registrationPolicy: null,
      registrationEnabled: false,
      statusLabel: "Registration Open",
      heroBadge: "CURRENTLY ENROLLING · LEVEL 1",
      detailsNote: "Limited to 15 students | Registration required",
      registrationUrl:
        "https://docs.google.com/forms/d/e/1FAIpQLSczB6kg91zSdDwvDgb9an7Bg6RRvHMKbT_EhzQlFbY5mgM12g/viewform",
      registrationLabel: "Register for Level 1",
      paymentUrl: "https://buy.stripe.com/7sYbJ0bCs8Yjb045oX08g01",
      paymentLabel: "Pay Course Fee",
      footerDescription:
        "Complete both the registration form and course payment to be considered for enrollment. Confirmation depends on seat availability.",
      mediaVideoSources: [],
      mediaPoster: "assets/images/events/arabic-classes-featured.jpg"
    },
    ...Array.from({ length: 5 }, (_, index) => ({
      id: `future-opportunity-${index + 1}`,
      title: "Future Learning Opportunity",
      kind: "placeholder",
      category: "Coming soon",
      coverTheme: ["rose", "olive", "sand", "plum", "sage"][index],
      summary:
        "We are working toward more opportunities to learn and grow together.",
      description:
        "Details for this future opportunity have not been announced. Join the interest list to hear when new event information is available.",
      details: [
        ["Details", "Dates, schedule, and location will be announced."]
      ],
      registrationEnabled: false,
      statusLabel: "Details coming soon"
    }))
  ];

  const eventPageMedia = {
    hero: {
      poster: "assets/images/events/events-hero-poster.jpg",
      fallbackImage: "assets/images/events/events-hero-poster.jpg",
      sources: [
        { src: "assets/videos/events/events-hero.webm", type: "video/webm" },
        { src: "assets/videos/events/events-hero.mp4", type: "video/mp4" }
      ]
    },
    communityVideo: {
      poster: "assets/images/events/community-video-poster.jpg",
      sources: [
        {
          src: "assets/videos/events/community-highlights.webm",
          type: "video/webm"
        },
        {
          src: "assets/videos/events/community-highlights.mp4",
          type: "video/mp4"
        }
      ]
    },
    newsletterImage: "assets/images/events/newsletter-signup.jpg",
    gallery: [
      {
        src: "assets/images/events/community-gallery-01.jpg",
        alt: "Sisters taking part in a community learning gathering",
        caption: "Making memories along the way"
      },
      {
        src: "assets/images/events/community-gallery-02.jpg",
        alt: "Students sharing a moment after a class",
        caption: "A place to learn together"
      },
      {
        src: "assets/images/events/community-gallery-03.jpg",
        alt: "A community gathering centered on learning",
        caption: "Growing in community"
      }
    ]
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = events;
  } else {
    window.BANAT_EVENTS = events;
    window.BANAT_EVENT_PAGE_MEDIA = eventPageMedia;
  }
})();
