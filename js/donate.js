"use strict";

// Prepares the contribution selection.
// Stripe payment processing will be connected in the next step.

(() => {
  const form = document.getElementById("contribution-form");

  if (!form) return;

  const customAmount = document.getElementById("custom-amount");
  const errorMessage = document.getElementById("amount-error");
  const summary = document.getElementById("amount-summary");

  const presets = [
    ...form.querySelectorAll('input[name="preset"]')
  ];

  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  });

  function updateAmount() {
    const customValue = customAmount.value.trim();
    const selectedPreset = presets.find(input => input.checked);

    const value =
      customValue || (selectedPreset ? selectedPreset.value : "");

    const validFormat = /^\d+(?:\.\d{1,2})?$/.test(value);

    const amountInCents = validFormat
      ? Math.round(Number(value) * 100)
      : NaN;

    const valid =
      Number.isSafeInteger(amountInCents) &&
      amountInCents >= 100 &&
      amountInCents <= 1000000;

    const showError = customValue !== "" && !valid;

    customAmount.setAttribute(
      "aria-invalid",
      String(showError)
    );

    errorMessage.textContent = showError
      ? "Enter an amount from $1 to $10,000, with at most two decimal places."
      : "";

    summary.textContent = valid
      ? `Your selected contribution: ${money.format(amountInCents / 100)} USD`
      : "Select an amount or enter your own.";
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

  form.addEventListener("submit", event => {
    event.preventDefault();
  });

  updateAmount();
})();