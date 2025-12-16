document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      if (!response.ok) throw new Error(`Failed to fetch activities: ${response.status}`);
      const activities = await response.json();

      // Clear loading message and reset activity select
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = "<option value=''>-- choose an activity --</option>";

      // helper to remove a participant (attempts DELETE on same signup endpoint)
      async function unregisterParticipant(activityName, participantRaw) {
        if (!confirm(`Remove ${participantRaw} from "${activityName}"?`)) return;
        try {
          const res = await fetch(
            `/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(participantRaw)}`,
            { method: "DELETE" }
          );
          const result = await res.json().catch(() => ({}));
          if (res.ok) {
            messageDiv.textContent = result.message || "Participant removed";
            messageDiv.className = "success";
            // refresh activities to reflect the change
            await fetchActivities();
          } else {
            messageDiv.textContent = result.detail || result.message || "Failed to remove participant";
            messageDiv.className = "error";
          }
          messageDiv.classList.remove("hidden");
          setTimeout(() => messageDiv.classList.add("hidden"), 5000);
        } catch (err) {
          messageDiv.textContent = "Failed to remove participant. Please try again.";
          messageDiv.className = "error";
          messageDiv.classList.remove("hidden");
          console.error("Error removing participant:", err);
        }
      }

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.style.display = 'flex';
        activityCard.style.justifyContent = 'space-between';
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <p class="participants-heading"><strong>Participants:</strong></p>
          <ul class="participants-list">
            <!-- participants will be injected here -->
          </ul>
        `;

        activitiesList.appendChild(activityCard);

        // Populate participants list
        const participantsList = activityCard.querySelector(".participants-list");

        // helper: format display name from string (email or raw name)
        function formatDisplayName(p) {
          if (!p) return "";
          if (typeof p === "string") {
            const atIndex = p.indexOf("@");
            let base = atIndex > 0 ? p.slice(0, atIndex) : p;
            base = base.replace(/[._]/g, " ");
            // capitalize words
            return base
              .split(" ")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" ");
          }
          // if participant is an object with name/email
          if (p.name) return p.name;
          if (p.email) return formatDisplayName(p.email);
          return String(p);
        }

        function getInitials(name) {
          const parts = name.split(" ").filter(Boolean);
          if (parts.length === 0) return "";
          if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
          return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
        }

        function escapeHtml(str) {
          return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
        }

        if (!details.participants || details.participants.length === 0) {
          const li = document.createElement("li");
          li.className = "no-participants";
          li.textContent = "No participants yet.";
          participantsList.appendChild(li);
        } else {
          details.participants.forEach((p) => {
            const displayName = formatDisplayName(p);
            const initials = getInitials(displayName);
            const li = document.createElement("li");

            // build the inner content with avatar and name (escaped)
            li.innerHTML = `
              <span class="avatar">${escapeHtml(initials)}</span>
              <span class="participant-name">${escapeHtml(displayName)}</span>
            `;
            // add delete icon for each participant
            const rawParticipant = typeof p === "string" ? p : p.email || p.name || String(p);
            const del = document.createElement("span");
            del.className = "participant-delete";
            del.title = "Remove participant";
            del.textContent = "🗑️";
            del.onclick = (ev) => {
              ev.stopPropagation();
              unregisterParticipant(name, rawParticipant);
            };
            li.appendChild(del);
            participantsList.appendChild(li);
          });
        }

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        // refresh list to show newly signed up participant
        await fetchActivities();
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
