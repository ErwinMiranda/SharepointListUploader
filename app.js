
const API = CONFIG.API;
const state = {
  editId: null,
  items: [],
  isSaving: false
};

const el = {
  title: document.getElementById("title"),
  status: document.getElementById("status"),
  description: document.getElementById("description"),
  saveBtn: document.getElementById("saveBtn"),
  tbody: document.getElementById("taskBody")
};
const carousel = document.getElementById("aircraftCarousel");
const leftArrow = document.getElementById("arrowLeft");
const rightArrow = document.getElementById("arrowRight");
const loader = document.getElementById("loadingOverlay");



function showLoader() {
  loader.classList.remove("hidden");
}

function hideLoader() {
  loader.classList.add("hidden");
}
const toast = document.getElementById("toast");

function showToast(message, type = "success") {
  toast.textContent = message;
  toast.className = `toast show ${type}`;

  setTimeout(() => {
    toast.className = "toast hidden";
  }, 3000);
}
const confirmModal = document.getElementById("confirmModal");
const confirmDeleteBtn = document.getElementById("confirmDelete");
const cancelDeleteBtn = document.getElementById("cancelDelete");

let deleteTargetId = null;

function openConfirmModal(id) {
  deleteTargetId = Number(id);
  confirmModal.classList.remove("hidden");
  setTimeout(() => confirmModal.classList.add("show"), 10);
}

function closeConfirmModal() {
  confirmModal.classList.remove("show");

  setTimeout(() => {
    confirmModal.classList.add("hidden");
  }, 200);
}
const dashboard = document.querySelector(".dashboard");
const sidebarToggle = document.getElementById("sidebarToggle");

sidebarToggle.addEventListener("click", () => {
  dashboard.classList.toggle("collapsed");
});
function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return isNaN(date) ? "" : date.toLocaleDateString();
}
function calculateMetrics(inputDate, outputDate) {
  if (!inputDate) {
    return { rank: null, daysSince: null };
  }

  const today = new Date();
  const input = new Date(inputDate);
  const output = outputDate ? new Date(outputDate) : null;

  // Remove time portion
  today.setHours(0,0,0,0);
  input.setHours(0,0,0,0);
  if (output) output.setHours(0,0,0,0);

  // If today is greater than output date → blank rank
  if (output && today > output) {
    return { rank: null, daysSince: null };
  }

  const diffMs = today - input;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return {
    rank: -diffDays,
   daysSince: diffDays + 1
  };
}
function renderAircraftCards() {

  const container = document.getElementById("aircraftCarousel");
  container.innerHTML = "";

  state.items.forEach(item => {

    // Skip completed aircraft (rank null)
    if (item.rank === null) return;

    const card = document.createElement("div");
    card.className = "aircraft-card";

    card.innerHTML = `
      <div class="rank-badge">Rank ${item.rank}</div>

      <div class="aircraft-header">${item.Title}</div>
      <div class="aircraft-sub">${item.Customer}</div>

      <div class="aircraft-meta"><strong>Check:</strong> ${item.CheckType || ""}</div>
      <div class="aircraft-meta"><strong>Input:</strong> ${formatDate(item.InputDate)}</div>
      <div class="aircraft-meta"><strong>Output:</strong> ${formatDate(item.OutputDate)}</div>
      <div class="aircraft-meta"><strong>TAT:</strong> ${item.TAT || ""} Days</div>
    `;

    container.appendChild(card);
  });
  setTimeout(updateArrowVisibility, 100);
}
function updateArrowVisibility() {
  if (!carousel) return;

  const maxScrollLeft = carousel.scrollWidth - carousel.clientWidth;

  const tolerance = 3; // small buffer for pixel rounding

  const atStart = carousel.scrollLeft <= tolerance;
  const atEnd = carousel.scrollLeft >= (maxScrollLeft - tolerance);

  leftArrow.classList.toggle("hidden", atStart);
  rightArrow.classList.toggle("hidden", atEnd);
}
// =====================
// GENERIC API CALL
// =====================
async function apiCall(url, payload = {}) {
  showLoader();

  try {
    const securePayload = {
      ...payload,
      secret: CONFIG.SECRET
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(securePayload)
    });

    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`);
    }

    return await res.json().catch(() => null);

  } finally {
    hideLoader();
  }
}

// =====================
// LOAD LIST
// =====================
async function loadList() {
  try {
    const data = await apiCall(API.GET);

    state.items = data || [];
    // Compute days since input
state.items.forEach(item => {
 item.rank = calculateMetrics(item.InputDate, item.OutputDate).rank ;

});

// Sort descending (oldest first = highest priority)
state.items.sort((a, b) => {

  if (a.rank === null) return 1;
  if (b.rank === null) return -1;

  return a.rank - b.rank;
});

   
    renderAircraftCards();
  } catch (err) {
    showToast("Failed to load data", "error");
    console.error(err);
  }
}


let velocity = 0;
let direction = 0;
let animationFrame = null;

const acceleration = 1.2;  // faster ramp-up
const maxSpeed = 25;       // max speed
const friction = 0.95;     // inertia decay

function animate() {

  if (direction !== 0) {
    velocity += acceleration * direction;

    if (velocity > maxSpeed) velocity = maxSpeed;
    if (velocity < -maxSpeed) velocity = -maxSpeed;
  }

carousel.scrollLeft = Math.max(
  0,
  Math.min(
    carousel.scrollLeft + velocity,
    carousel.scrollWidth - carousel.clientWidth
  )
);
  // inertia
  velocity *= friction;

  if (Math.abs(velocity) < 0.2 && direction === 0) {
    velocity = 0;
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
    return;
  }

  animationFrame = requestAnimationFrame(animate);
  updateArrowVisibility();
}

function startScroll(dir) {
  direction = dir;
  if (!animationFrame) {
    animationFrame = requestAnimationFrame(animate);
  }
}

function stopScroll() {
  direction = 0;
}

/* Mouse support */
leftArrow.addEventListener("mousedown", () => startScroll(-1));
rightArrow.addEventListener("mousedown", () => startScroll(1));

document.addEventListener("mouseup", stopScroll);

/* Touch support */
leftArrow.addEventListener("touchstart", () => startScroll(-1));
rightArrow.addEventListener("touchstart", () => startScroll(1));

document.addEventListener("touchend", stopScroll);
// =====================
// RENDER TABLE
// =====================


function renderStatus(status) {
  if (!status) return "";

  let className = "";
  if (status === "Open") className = "open";
  else if (status === "In Progress") className = "progress";
  else if (status === "Closed") className = "closed";

  return `<span class="badge ${className}">${status}</span>`;
}
function updateKPIs() {
  const total = state.items.length;
  const open = state.items.filter(i => i.Status === "Open").length;
  const progress = state.items.filter(i => i.Status === "In Progress").length;
  const closed = state.items.filter(i => i.Status === "Closed").length;

  document.getElementById("totalCount").textContent = total;
  document.getElementById("openCount").textContent = open;
  document.getElementById("progressCount").textContent = progress;
  document.getElementById("closedCount").textContent = closed;
}

// =====================
// SAVE
// =====================
async function saveItem() {

  //  Block if already saving
  if (state.isSaving) return;

  const title = el.title.value.trim();
  const status = el.status.value;
  const description = el.description.value;

  if (!title) {
    showToast("Title is required", "error");
    return;
  }

  state.isSaving = true;
  el.saveBtn.disabled = true;
  el.saveBtn.textContent = "Saving...";

  const payload = { title, status, description };

  if (state.editId !== null) {
    payload.id = state.editId;
  }

  try {
    await apiCall(API.SAVE, payload);

    resetForm();
    await loadList();
    showToast("Task saved successfully", "success");

  } catch (err) {
    showToast("Save failed", "error");
    console.error(err);
  } finally {
    state.isSaving = false;
    el.saveBtn.disabled = false;
    el.saveBtn.textContent = "Save Task";
  }
}
// =====================
// DELETE
// =====================
function deleteItem(id) {
  openConfirmModal(id);
}

// =====================
// EDIT
// =====================
function editItem(id) {
  const item = state.items.find(i => i.ID == id);
  if (!item) return;

  state.editId = id;
  el.title.value = item.Title || "";
  el.status.value = item.Status || "";
  el.description.value = item.Description || "";
}

function resetForm() {
  state.editId = null;
  el.title.value = "";
  el.status.value = "";
  el.description.value = "";
}

// =====================
// EVENTS
// =====================
el.saveBtn.addEventListener("click", saveItem);


confirmDeleteBtn.addEventListener("click", async () => {

  if (deleteTargetId == null) return;

  try {
    await apiCall(API.DELETE, { id: Number(deleteTargetId) });

    showToast("Task deleted successfully", "success");
    closeConfirmModal();
    await loadList();

  } catch (err) {
    showToast("Delete failed", "error");
    console.error(err);
  }

  deleteTargetId = null;
});

cancelDeleteBtn.addEventListener("click", () => {
  deleteTargetId = null;
  closeConfirmModal();
});
document.addEventListener("DOMContentLoaded", () => {

  // Attach arrow listeners safely
  carousel.addEventListener("scroll", updateArrowVisibility);
  window.addEventListener("resize", updateArrowVisibility);

  // Load data
  loadList();

});;
