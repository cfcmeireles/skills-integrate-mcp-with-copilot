document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Store activities for filtering/sorting
  let allActivities = {};

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      allActivities = await response.json();
      renderActivities();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Helper: get category from activity name
  function getCategory(name) {
    if (name.includes("Club")) return "Club";
    if (name.includes("Team")) return "Team";
    if (name.includes("Class")) return "Class";
    return "Other";
  }

  // Helper: get time from schedule string
  function getTime(details) {
    // Extract first weekday and time
    const match = details.schedule.match(
      /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[^,]*,?\s*([\d:APM\-\s]+)/
    );
    return match ? match[2] || "" : "";
  }

  // Render activities with filters/sorting
  function renderActivities() {
    // Get filter values
    const search = document
      .getElementById("activity-search")
      .value.toLowerCase();
    const category = document.getElementById("activity-category").value;
    const sort = document.getElementById("activity-sort").value;

    // Clear list and dropdown
    activitiesList.innerHTML = "";
    activitySelect.innerHTML = "";
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "-- Select an activity --";
    activitySelect.appendChild(defaultOption);

    // Filter and sort
    let filtered = Object.entries(allActivities).filter(([name, details]) => {
      // Search filter (whole word only)
      if (search) {
        // Build regex for whole word match, case-insensitive
        const wordRegex = new RegExp(`\\b${search}\\b`, "i");
        if (!wordRegex.test(name) && !wordRegex.test(details.description)) {
          return false;
        }
      }
      // Category filter
      if (category && getCategory(name) !== category) return false;
      return true;
    });

    // Sort
    if (sort === "name") {
      filtered.sort(([a], [b]) => a.localeCompare(b));
    } else if (sort === "time") {
      filtered.sort(([, aDetails], [, bDetails]) =>
        getTime(aDetails).localeCompare(getTime(bDetails))
      );
    }

    // Populate activities list
    filtered.forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";
      const spotsLeft = details.max_participants - details.participants.length;
      const participantsHTML =
        details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;

      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p>${details.description}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        <div class="participants-container">
          ${participantsHTML}
        </div>
      `;

      activitiesList.appendChild(activityCard);

      // Add option to select dropdown
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      activitySelect.appendChild(option);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

  // Add filter event listeners
  // Debounce search input
  let searchTimeout;
  document
    .getElementById("activity-search")
    .addEventListener("input", function () {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(renderActivities, 400);
    });
  document
    .getElementById("activity-category")
    .addEventListener("change", renderActivities);
  document
    .getElementById("activity-sort")
    .addEventListener("change", renderActivities);

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
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
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
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
