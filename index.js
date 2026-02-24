// ─── State & Data ────────────────────────────────────────────────────────
let currentUser = null;
const DB = {
  users: JSON.parse(localStorage.getItem("luf_users")) || {},
  lostItems:  JSON.parse(localStorage.getItem("luf_lost"))  || [],
  foundItems: JSON.parse(localStorage.getItem("luf_found")) || []
};

function saveData() {
  localStorage.setItem("luf_users", JSON.stringify(DB.users));
  localStorage.setItem("luf_lost",  JSON.stringify(DB.lostItems));
  localStorage.setItem("luf_found", JSON.stringify(DB.foundItems));
}

// ─── Auth ────────────────────────────────────────────────────────────────
function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !password) {
    alert("Please enter username and password");
    return;
  }

  if (!DB.users[username]) {
    DB.users[username] = { password, isAdmin: username === "admin" };
    saveData();
  }

  if (DB.users[username].password !== password) {
    alert("Wrong password");
    return;
  }

  currentUser = username;
  localStorage.setItem("luf_last_user", username);
  document.getElementById("auth-screen").classList.add("hidden");
  document.getElementById("main-nav").classList.remove("hidden");
  document.getElementById("main-content").classList.remove("hidden");

  showSection("all-lost");
}

function logout() {
  currentUser = null;
  localStorage.removeItem("luf_last_user");
  document.getElementById("main-nav").classList.add("hidden");
  document.getElementById("main-content").classList.add("hidden");
  document.getElementById("auth-screen").classList.remove("hidden");
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
}

// ─── Utils ───────────────────────────────────────────────────────────────
function showSection(sectionId) {
  document.querySelectorAll("#main-content > div").forEach(el => el.classList.add("hidden"));
  document.getElementById(sectionId).classList.remove("hidden");

  if (sectionId === "all-lost")  displayAllLostItem();
  if (sectionId === "all-found") displayAllFoundItem();
  if (sectionId === "stats")      calculateLostItemStatistics();
}

function createItemCard(item, type = "lost") {
  const div = document.createElement("div");
  div.className = "item-card";

  const statusClass = item.status === "claimed" ? "claimed" : type;
  const statusText  = item.status === "claimed" ? "CLAIMED" : (type === "lost" ? "LOST" : "FOUND");

  div.innerHTML = `
    <div class="item-img-placeholder">No photo uploaded</div>
    <div class="item-content">
      <div class="status-badge status-${statusClass}">${statusText}</div>
      <h3 style="margin:0.4rem 0;">${item.title || "Unnamed item"}</h3>
      <p><strong>${type === "lost" ? "Lost" : "Found"} at:</strong> ${item.location || "?"}</p>
      <p><strong>Date:</strong> ${item.date || "?"}</p>
      ${item.reward ? `<p><strong>Reward:</strong> ${item.reward} ETB</p>` : ""}
      <p style="margin:0.8rem 0 1.2rem;color:#555;">${item.details?.substring(0,120)}${item.details?.length > 120 ? "..." : ""}</p>
      <p><small>Contact: ${item.contact || "?"}</small></p>

      ${type === "found" && item.status !== "claimed" && currentUser ? `
        <button class="success" onclick="claimFoundItem('${item.id}')">This is my item</button>
      ` : ""}
      ${item.owner === currentUser && item.status !== "claimed" ? `
        <button class="danger" onclick="updateItemStatus('${item.id}', 'claimed', '${type}')">Mark as claimed</button>
      ` : ""}
    </div>
  `;
  return div;
}

// ─── Core Functions ────────────────────────────────────────
function reportLostItem() {
  if (!currentUser) return alert("Please login first");
  const title    = document.getElementById("lost-title").value.trim();
  const contact  = document.getElementById("lost-contact").value.trim();
  if (!title || !contact) return alert("Item name and contact are required");

  const item = {
    id: "lost_" + Date.now(),
    title,
    category: document.getElementById("lost-category").value.trim(),
    location: document.getElementById("lost-location").value.trim(),
    date:      document.getElementById("lost-date").value,
    reward:    document.getElementById("lost-reward").value,
    details:   document.getElementById("lost-details").value.trim(),
    contact,
    owner:     currentUser,
    status:    "active",
    reported: new Date().toISOString()
  };

  DB.lostItems.unshift(item);
  saveData();
  alert("Lost item reported!");
  document.querySelectorAll("#report-lost input, #report-lost textarea").forEach(el => el.value = "");
}

function reportFoundItem() {
  if (!currentUser) return alert("Please login first");
  const title   = document.getElementById("found-title").value.trim();
  const contact = document.getElementById("found-contact").value.trim();
  if (!title || !contact) return alert("Item name and contact are required");

  const item = {
    id: "found_" + Date.now(),
    title,
    category: document.getElementById("found-category").value.trim(),
    location: document.getElementById("found-location").value.trim(),
    date:      document.getElementById("found-date").value,
    details:   document.getElementById("found-details").value.trim(),
    contact,
    owner:     currentUser,
    status:    "active",
    reported: new Date().toISOString()
  };

  DB.foundItems.unshift(item);
  saveData();
  alert("Found item reported!");
  document.querySelectorAll("#report-found input, #report-found textarea").forEach(el => el.value = "");
}

function displayAllLostItem() {
  const container = document.getElementById("lost-items-container");
  container.innerHTML = "";
  DB.lostItems.forEach(item => container.appendChild(createItemCard(item, "lost")));
}

function displayAllFoundItem() {
  const container = document.getElementById("found-items-container");
  container.innerHTML = "";
  DB.foundItems.forEach(item => container.appendChild(createItemCard(item, "found")));
}

function searchLostItem() {
  const keyword = document.getElementById("search-keyword").value.toLowerCase().trim();
  const container = document.getElementById("search-results");
  container.innerHTML = "";
  const matches = DB.lostItems.filter(item => 
    item.title?.toLowerCase().includes(keyword) || 
    item.location?.toLowerCase().includes(keyword)
  );
  matches.forEach(item => container.appendChild(createItemCard(item, "lost")));
}

function searchFoundItem() {
  const keyword = document.getElementById("search-keyword").value.toLowerCase().trim();
  const container = document.getElementById("search-results");
  container.innerHTML = "";
  const matches = DB.foundItems.filter(item => 
    item.title?.toLowerCase().includes(keyword) || 
    item.location?.toLowerCase().includes(keyword)
  );
  matches.forEach(item => container.appendChild(createItemCard(item, "found")));
}

function updateItemStatus(id, newStatus, type = "lost") {
  const arr = type === "lost" ? DB.lostItems : DB.foundItems;
  const item = arr.find(i => i.id === id);
  if (item && item.owner === currentUser) {
    item.status = newStatus;
    saveData();
    if (type === "lost") displayAllLostItem();
    else displayAllFoundItem();
  }
}

function calculateLostItemStatistics() {
  const content = document.getElementById("stats-content");
  const totalLost   = DB.lostItems.length;
  const totalFound  = DB.foundItems.length;
  const claimed     = [...DB.lostItems, ...DB.foundItems].filter(i => i.status === "claimed").length;

  content.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:2rem;">
      <div>
        <h3>Overview</h3>
        <ul style="line-height:1.8;">
          <li>Total lost items: <strong>${totalLost}</strong></li>
          <li>Total found items: <strong>${totalFound}</strong></li>
          <li>Successfully claimed: <strong>${claimed}</strong></li>
        </ul>
      </div>
    </div>
  `;
}

// On page load
window.onload = () => {
  const last = localStorage.getItem("luf_last_user");
  if (last && DB.users[last]) {
    currentUser = last;
    document.getElementById("auth-screen").classList.add("hidden");
    document.getElementById("main-nav").classList.remove("hidden");
    document.getElementById("main-content").classList.remove("hidden");
    showSection("all-lost");
  }
};