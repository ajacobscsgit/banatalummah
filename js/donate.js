"use strict";

(async () => {
  const API_URL = "https://banatalummah.onrender.com";

  const contributionForm = document.getElementById(
    "contribution-form"
  );

  if (!contributionForm) return;

  const customAmount = document.getElementById("custom-amount");
  const amountError = document.getElementById("amount-error");
  const amountSummary = document.getElementById("amount-summary");
  const checkoutButton = document.getElementById("checkout-button");
  const checkoutStatus = document.getElementById("checkout-status");

  const presets = [
    ...contributionForm.querySelectorAll('input[name="preset"]')
  ];

  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  });

  let stripe = null;
  let busy = false;
  let amountInCents = null;
  let paymentMode = "test";
  let activeSessionId = null;
  let confirmationTimer = null;
  let confirmationAttempts = 0;
  let checkingPayment = false;
  let refreshingProgress = false;

  const availability = document.getElementById(
    "payment-availability"
  );
  const paymentConfirmation = document.getElementById(
    "payment-confirmation"
  );
  const confirmationTitle = document.getElementById(
    "confirmation-title"
  );
  const confirmationMessage = document.getElementById(
    "confirmation-message"
  );
  const confirmationThanks = document.getElementById(
    "confirmation-thanks"
  );
  const checkPaymentAgain = document.getElementById(
    "check-payment-again"
  );
  const fundraisingTotal = document.getElementById(
    "fundraising-total"
  );
  const fundraisingProgress = document.getElementById(
    "fundraising-progress"
  );
  const fundraisingDetail = document.getElementById(
    "fundraising-detail"
  );
  const returnedSessionId = new URLSearchParams(window.location.search)
    .get("session_id");

  async function requestJSON(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, options);

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error("The server returned an unexpected response.");
    }

    if (!response.ok) {
      throw new Error(data.error || "The request could not be completed.");
    }

    return data;
  }

  async function refreshProgress() {
    if (refreshingProgress) return;
    refreshingProgress = true;

    try {
      const progress = await requestJSON("/api/progress");

      if (
        !Number.isSafeInteger(progress.raisedInCents) ||
        progress.raisedInCents < 0 ||
        !Number.isSafeInteger(progress.goalInCents) ||
        progress.goalInCents <= 0 ||
        !Number.isSafeInteger(progress.contributionCount) ||
        progress.contributionCount < 0
      ) {
        throw new Error("Invalid fundraising total.");
      }

      const percent =
        progress.raisedInCents / progress.goalInCents * 100;
      const raised = money.format(progress.raisedInCents / 100);
      const remaining = money.format(
        Math.max(progress.goalInCents - progress.raisedInCents, 0) / 100
      );
      const summary =
        `${percent.toFixed(1)}% funded · ${raised} raised · ` +
        `${remaining} to go`;

      fundraisingTotal.textContent = summary;
      fundraisingProgress.max = progress.goalInCents;
      fundraisingProgress.value = Math.min(
        progress.raisedInCents,
        progress.goalInCents
      );
      fundraisingProgress.setAttribute("aria-valuetext", summary);
      fundraisingDetail.textContent =
        `${progress.contributionCount} confirmed ` +
        `${progress.contributionCount === 1 ? "contribution" : "contributions"}`;
    } catch {
      fundraisingTotal.textContent =
        "Confirmed total temporarily unavailable. Please check again shortly.";
    } finally {
      refreshingProgress = false;
    }
  }

  async function verifyPayment(sessionId, focus = false) {
    if (checkingPayment) return;

    checkingPayment = true;
    clearTimeout(confirmationTimer);

    paymentConfirmation.hidden = false;
    checkPaymentAgain.disabled = true;
    confirmationThanks.hidden = true;

    if (focus) {
      paymentConfirmation.focus();
      paymentConfirmation.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

    try {
      const payment = await requestJSON(
        `/api/session-status?session_id=${encodeURIComponent(sessionId)}`
      );

      if (payment.mode !== "live" && payment.mode !== "test") {
        throw new Error("The server returned an invalid payment mode.");
      }

      if (payment.status === "paid") {
        if (!Number.isSafeInteger(payment.amountInCents)) {
          throw new Error("The server returned an invalid payment amount.");
        }

        confirmationTitle.textContent =
          payment.mode === "test"
            ? "Test payment confirmed"
            : "Thank you—your contribution is confirmed.";

        confirmationMessage.textContent =
          payment.mode === "test"
            ? "This was a test payment. No real money was collected, " +
              "and it does not count toward our goal."
            : `Your ${money.format(payment.amountInCents / 100)} USD ` +
              "contribution was received. Jazakum Allahu khayran.";

        if (
          payment.mode === "live" &&
          payment.refundedInCents > 0
        ) {
          confirmationMessage.textContent +=
            ` A refund of ${money.format(payment.refundedInCents / 100)} ` +
            "has since been recorded.";
        }

        confirmationThanks.hidden = payment.mode !== "live";
        checkPaymentAgain.hidden = true;
        contributionForm.hidden = true;
        document.getElementById("checkout-form").hidden = true;
        checkoutStatus.textContent = "";

        await refreshProgress();
        return;
      }

      checkPaymentAgain.hidden = false;

      if (payment.status === "refunded") {
        confirmationTitle.textContent = "Payment refunded";
        confirmationMessage.textContent =
          "Stripe records this contribution as fully refunded.";
      } else if (payment.status === "disputed") {
        confirmationTitle.textContent = "Payment under review";
        confirmationMessage.textContent =
          "This payment has a dispute. Contact banatalummah@gmail.com " +
          "if you need assistance.";
      } else if (payment.status === "not_completed") {
        confirmationTitle.textContent = "Payment not completed";
        confirmationMessage.textContent =
          "This checkout expired or was canceled. " +
          "You can start a new contribution below.";

        contributionForm.hidden = false;
        checkPaymentAgain.hidden = true;
        busy = false;
        updateAmount();
      } else {
        confirmationTitle.textContent = "Payment confirmation pending";
        confirmationMessage.textContent =
          "We are waiting for Stripe to confirm your payment. " +
          "Please do not submit another contribution while it is pending.";

        confirmationAttempts += 1;

        if (confirmationAttempts < 12) {
          confirmationTimer = setTimeout(
            () => verifyPayment(sessionId),
            5000
          );
        }
      }
    } catch {
      confirmationTitle.textContent = "Unable to check payment status";
      confirmationMessage.textContent =
        "We could not verify the result right now. This does not mean " +
        "your payment failed. Check again or contact " +
        "banatalummah@gmail.com before paying again.";

      checkPaymentAgain.hidden = false;
    } finally {
      checkingPayment = false;
      checkPaymentAgain.disabled = false;
    }
  }

  checkPaymentAgain.addEventListener("click", () => {
    const sessionId = returnedSessionId || activeSessionId;

    if (sessionId) {
      confirmationAttempts = 0;
      verifyPayment(sessionId);
    }
  });

  function updateAmount() {
    const customValue = customAmount.value.trim();
    const selectedPreset = presets.find(input => input.checked);

    const value =
      customValue || (selectedPreset ? selectedPreset.value : "");

    const validFormat = /^\d+(?:\.\d{1,2})?$/.test(value);

    const cents = validFormat
      ? Math.round(Number(value) * 100)
      : NaN;

    const valid =
      Number.isSafeInteger(cents) &&
      cents >= 100 &&
      cents <= 1000000;

    amountInCents = valid ? cents : null;

    const showError = customValue !== "" && !valid;

    customAmount.setAttribute(
      "aria-invalid",
      String(showError)
    );

    amountError.textContent = showError
      ? "Enter an amount from $1 to $10,000, with at most two decimal places."
      : "";

    amountSummary.textContent = valid
      ? `Your selected contribution: ${money.format(cents / 100)} USD`
      : "Select an amount or enter your own.";

    checkoutButton.disabled = !stripe || busy || !valid;

    if (!busy && stripe) {
      checkoutButton.textContent = valid
        ? `Continue with ${money.format(cents / 100)}`
        : "Choose a Contribution";
    }
  }

  presets.forEach(input => {
    input.addEventListener("change", () => {
      customAmount.value = "";
      updateAmount();
    });
  });

  customAmount.addEventListener("input", () => {
    presets.forEach(input => {
      input.checked = false;
    });

    updateAmount();
  });

  contributionForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!stripe || busy || amountInCents === null) return;

    busy = true;
    updateAmount();

    checkoutButton.textContent = "Opening Checkout…";
    checkoutStatus.textContent = "Loading the secure payment form…";

    try {
      const session = await requestJSON(
        "/api/create-checkout-session",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            amountInCents
          })
        }
      );

      if (!session.client_secret) {
        throw new Error("The server did not return a checkout session.");
      }

      if (!session.session_id) {
        throw new Error("The server did not return a payment reference.");
      }

      activeSessionId = session.session_id;

      const checkout = stripe.initCheckoutFormSdk({
        clientSecret: session.client_secret,

        appearance: {
          theme: "stripe",

          variables: {
            colorPrimary: "#315846",
            colorBackground: "#fffdf9",
            colorText: "#252b27",
            colorDanger: "#942d2d",
            borderRadius: "8px",
            fontFamily: "Arial, sans-serif",
            fontSizeBase: "16px"
          }
        }
      });

      const paymentForm = checkout.createForm({
        layout: "expanded"
      });

      const actionsResult = await checkout.loadActions();

      if (actionsResult.type !== "success") {
        throw new Error("Unable to initialize payment confirmation.");
      }

      paymentForm.on("confirm", async confirmEvent => {
        checkoutStatus.textContent = "Processing your contribution…";

        try {
          const result = await actionsResult.actions.confirm({
            formConfirmEvent: confirmEvent
          });

          if (result?.type === "error" || result?.error) {
            checkoutStatus.textContent =
              result.error?.message ||
              "The payment could not be completed. Check the form and try again.";
          } else {
            checkoutStatus.textContent =
              "Checking your payment with Stripe…";

            confirmationAttempts = 0;
            await verifyPayment(activeSessionId, true);
          }
        } catch {
          checkoutStatus.textContent =
            "Payment confirmation was interrupted. Please contact " +
            "banatalummah@gmail.com to check your payment status " +
            "before submitting another contribution.";
        }
      });

      paymentForm.mount("#checkout-form");

      // Keep the selected amount fixed for this Checkout Session.
      presets.forEach(input => {
        input.disabled = true;
      });

      customAmount.disabled = true;
      checkoutButton.hidden = true;

      checkoutStatus.textContent =
        paymentMode === "test"
          ? `Test checkout for ${money.format(amountInCents / 100)} USD. No real money will be collected.`
          : `Your contribution: ${money.format(amountInCents / 100)} USD. Complete the secure Stripe form below.`;
    } catch (error) {
      checkoutStatus.textContent =
        `${error.message} Check the server terminal for details, ` +
        "then reload this page to try again.";

      checkoutButton.textContent = "Reload Page to Retry";
      checkoutButton.disabled = true;
    }
  });

  updateAmount();

  void refreshProgress();

  setInterval(() => {
    if (!document.hidden) {
      void refreshProgress();
    }
  }, 65000);

  if (returnedSessionId) {
    busy = true;
    contributionForm.hidden = true;
    await verifyPayment(returnedSessionId, true);
  }

  try {
    if (typeof window.Stripe !== "function") {
      throw new Error("Stripe’s payment script did not load.");
    }

    const config = await requestJSON("/api/config");

    if (!["test", "live"].includes(config.mode)) {
      throw new Error("The server returned an invalid payment mode.");
    }

    paymentMode = config.mode;

    const expectedPrefix =
      paymentMode === "live" ? "pk_live_" : "pk_test_";

    if (!config.publishableKey?.startsWith(expectedPrefix)) {
      throw new Error("Stripe key and payment mode do not match.");
    }

    if (availability) {
      availability.textContent =
        paymentMode === "test"
          ? "Test mode — no real money will be collected."
          : "Payments are securely processed by Stripe.";
    }

    stripe = window.Stripe(config.publishableKey);
    updateAmount();
  } catch (error) {
    checkoutButton.textContent = "Checkout Unavailable";
    checkoutButton.disabled = true;

    if (checkoutStatus) {
      checkoutStatus.textContent =
        `${error.message} Make sure your backend is running and ` +
        "FRONTEND_URL in server/.env matches your website preview address.";
    }
  }
})();
