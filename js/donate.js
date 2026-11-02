"use strict";

(async () => {
  const API_URL = "http://127.0.0.1:4242";

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
    checkoutStatus.textContent = "Loading the secure test payment form…";

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
        checkoutStatus.textContent = "Processing your test payment…";

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
              "Follow the payment form’s confirmation instructions. " +
              "You can verify the test payment in your Stripe sandbox.";
          }
        } catch {
          checkoutStatus.textContent =
            "Payment confirmation was interrupted. Check Stripe’s test " +
            "payment status before trying again.";
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
        `Test checkout for ${money.format(amountInCents / 100)} USD. ` +
        "No real money will be collected.";
    } catch (error) {
      checkoutStatus.textContent =
        `${error.message} Check the server terminal for details, ` +
        "then reload this page to try again.";

      checkoutButton.textContent = "Reload Page to Retry";
      checkoutButton.disabled = true;
    }
  });

  updateAmount();

  try {
    if (typeof window.Stripe !== "function") {
      throw new Error("Stripe’s payment script did not load.");
    }

    const config = await requestJSON("/api/config");

    if (!config.publishableKey?.startsWith("pk_test_")) {
      throw new Error("A Stripe test publishable key is required.");
    }

    stripe = window.Stripe(config.publishableKey);
    updateAmount();
  } catch (error) {
    checkoutButton.textContent = "Checkout Unavailable";
    checkoutButton.disabled = true;

    checkoutStatus.textContent =
      `${error.message} Make sure your backend is running and ` +
      "FRONTEND_URL in server/.env matches your website preview address.";
  }
})();
