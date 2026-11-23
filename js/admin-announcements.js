"use strict";

(() => {
  const API_URL = "https://banatalummah.onrender.com";
  const draftId = crypto.randomUUID();
  let adminToken = "";
  let sending = false;

  const access = document.getElementById("announcement-access");
  const workspace = document.getElementById("announcement-workspace");
  const tokenInput = document.getElementById("admin-token");
  const accessStatus = document.getElementById("access-status");
  const form = document.getElementById("announcement-form");
  const status = document.getElementById("announcement-status");
  const recipientCount = document.getElementById("recipient-count");

  function setStatus(message) {
    status.textContent = message;
  }

  async function requestJSON(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
        ...(options.headers || {})
      }
    });
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("The server returned an unexpected response.");
    }
    if (!response.ok) {
      throw new Error(result.error || "The announcement request failed.");
    }
    return result;
  }

  function getAnnouncement() {
    const data = new FormData(form);
    return {
      title: data.get("title"),
      category: data.get("category"),
      audience: data.get("audience"),
      subject: data.get("subject"),
      previewText: data.get("previewText"),
      heading: data.get("heading"),
      message: data.get("message"),
      eventDate: data.get("eventDate"),
      eventTime: data.get("eventTime"),
      featuredImageUrl: data.get("featuredImageUrl"),
      buttonText: data.get("buttonText"),
      destinationUrl: data.get("destinationUrl"),
      closingMessage: data.get("closingMessage")
    };
  }

  function updatePreview() {
    const announcement = getAnnouncement();
    document.getElementById("preview-category").textContent =
      announcement.category || "Category";
    document.getElementById("preview-heading").textContent =
      announcement.heading || "Announcement heading";
    document.getElementById("preview-message").textContent =
      announcement.message || "Announcement message";

    const date = document.getElementById("preview-date");
    if (announcement.eventDate || announcement.eventTime) {
      date.hidden = false;
      date.textContent =
        `When: ${announcement.eventDate || "Date TBD"}${announcement.eventTime ? ` at ${announcement.eventTime}` : ""}`;
    } else {
      date.hidden = true;
    }

    const button = document.getElementById("preview-button");
    if (announcement.destinationUrl && announcement.buttonText) {
      button.hidden = false;
      button.href = announcement.destinationUrl;
      button.textContent = announcement.buttonText;
    } else {
      button.hidden = true;
    }
  }

  async function updateRecipientCount() {
    const audience = form.elements.audience.value;
    recipientCount.textContent = "Checking recipient count…";
    try {
      const result = await requestJSON(
        `/api/admin/newsletter-announcement-recipient-count?audience=${encodeURIComponent(audience)}`
      );
      recipientCount.textContent =
        `${result.count} confirmed active subscriber${result.count === 1 ? "" : "s"} will receive this announcement`;
    } catch (error) {
      recipientCount.textContent = error.message;
    }
  }

  document.getElementById("unlock-admin").addEventListener("click", async () => {
    adminToken = tokenInput.value.trim();
    if (!adminToken) {
      accessStatus.textContent = "Enter the administrator token.";
      return;
    }
    accessStatus.textContent = "Checking access…";
    try {
      await requestJSON("/api/admin/newsletter-summary");
      access.hidden = true;
      workspace.hidden = false;
      try {
        sessionStorage.setItem("bauAdminToken", adminToken);
      } catch {}
      await updateRecipientCount();
      updatePreview();
    } catch (error) {
      accessStatus.textContent = error.message;
    }
  });

  try {
    const savedToken = sessionStorage.getItem("bauAdminToken");
    if (savedToken) {
      tokenInput.value = savedToken;
    }
  } catch {}

  form.addEventListener("input", () => {
    updatePreview();
  });
  form.elements.audience.addEventListener("change", updateRecipientCount);

  document.getElementById("save-draft").addEventListener("click", async () => {
    setStatus("Saving draft…");
    try {
      const result = await requestJSON(
        "/api/admin/newsletter-announcement-drafts",
        {
          method: "POST",
          body: JSON.stringify({
            ...getAnnouncement(),
            idempotencyKey: draftId
          })
        }
      );
      setStatus(`Draft saved (${result.draft.id}).`);
    } catch (error) {
      setStatus(error.message);
    }
  });

  document.getElementById("preview-email").addEventListener("click", () => {
    updatePreview();
    document.querySelector(".announcement-preview").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
    const announcement = getAnnouncement();
    setStatus(
      `Preview — Subject: ${announcement.subject || "(missing subject)"}`
    );
  });

  document.getElementById("send-test").addEventListener("click", async () => {
    const testEmail = document.getElementById("test-email").value.trim();
    if (!testEmail) {
      setStatus("Enter the email address for the test.");
      return;
    }
    setStatus("Sending test email…");
    try {
      const result = await requestJSON(
        "/api/admin/newsletter-announcement-test",
        {
          method: "POST",
          body: JSON.stringify({
            ...getAnnouncement(),
            testEmail
          })
        }
      );
      setStatus(result.message);
    } catch (error) {
      setStatus(error.message);
    }
  });

  document.getElementById("send-announcement").addEventListener("click", async () => {
    if (sending) return;
    if (!form.reportValidity()) return;
    await updateRecipientCount();

    const announcement = getAnnouncement();
    const countText = recipientCount.textContent;
    const confirmed = window.confirm(
      `Send this announcement now?\n\nSubject: ${announcement.subject}\nAudience: ${countText}\n\nThis action cannot be repeated accidentally.`
    );
    if (!confirmed) return;

    sending = true;
    const button = document.getElementById("send-announcement");
    button.disabled = true;
    button.textContent = "Sending…";
    setStatus("Sending announcement to subscribers…");
    try {
      const result = await requestJSON(
        "/api/admin/newsletter-announcements/send",
        {
          method: "POST",
          body: JSON.stringify({
            ...announcement,
            confirm: true,
            idempotencyKey: draftId
          })
        }
      );
      setStatus(
        result.alreadySent
          ? "This announcement was already sent."
          : `Sent ${result.sentCount} email(s); ${result.failedCount} failed of ${result.recipientCount} recipients.`
      );
    } catch (error) {
      setStatus(error.message);
    } finally {
      sending = false;
      button.disabled = false;
      button.textContent = "Send Announcement to Subscribers";
    }
  });
})();
