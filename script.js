const STORAGE_KEYS = {
  users: "alfred-inventory-users",
  currentUser: "alfred-inventory-current-user",
  items: "alfred-inventory-items",
  history: "alfred-inventory-history",
  itemDraftImage: "alfred-inventory-draft-image"
};

const LOW_STOCK_THRESHOLD = 10;
const placeholderImage =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="180" viewBox="0 0 240 180">
      <rect width="240" height="180" rx="24" fill="#eef4eb"/>
      <rect x="28" y="36" width="184" height="108" rx="18" fill="#d8e0d2"/>
      <circle cx="84" cy="82" r="18" fill="#29795c" opacity="0.32"/>
      <path d="M42 128l42-36 28 22 34-30 52 44H42z" fill="#29795c" opacity="0.5"/>
    </svg>
  `);

const sampleUsers = [
  { id: crypto.randomUUID(), name: "Admin User", email: "admin@alfred.com", password: "admin123" }
];

const sampleItems = [
  {
    id: crypto.randomUUID(),
    name: "Wireless Barcode Scanner",
    sku: "INV-1001",
    category: "Electronics",
    quantity: 14,
    supplier: "Prime Source Ltd.",
    price: 149.99,
    image: placeholderImage,
    createdAt: offsetDate(2),
    updatedAt: offsetDate(1)
  },
  {
    id: crypto.randomUUID(),
    name: "Packing Tape Roll",
    sku: "INV-2008",
    category: "Packaging",
    quantity: 52,
    supplier: "BoxLine Supply",
    price: 6.75,
    image: placeholderImage,
    createdAt: offsetDate(6),
    updatedAt: offsetDate(3)
  },
  {
    id: crypto.randomUUID(),
    name: "Label Printer",
    sku: "INV-1034",
    category: "Electronics",
    quantity: 7,
    supplier: "Office Core",
    price: 219.5,
    image: placeholderImage,
    createdAt: offsetDate(10),
    updatedAt: offsetDate(5)
  },
  {
    id: crypto.randomUUID(),
    name: "Storage Bin Large",
    sku: "INV-3012",
    category: "Storage",
    quantity: 0,
    supplier: "Warehouse Pro",
    price: 24.0,
    image: placeholderImage,
    createdAt: offsetDate(22),
    updatedAt: offsetDate(12)
  }
];

const sampleHistory = [
  makeHistoryEntry("Admin User", "seed", "System setup", "Loaded starter inventory records.")
];

function offsetDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

function makeHistoryEntry(user, action, itemName, details) {
  return {
    id: crypto.randomUUID(),
    user,
    action,
    itemName,
    details,
    timestamp: new Date().toISOString()
  };
}

function load(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function initializeData() {
  if (!localStorage.getItem(STORAGE_KEYS.users)) save(STORAGE_KEYS.users, sampleUsers);
  if (!localStorage.getItem(STORAGE_KEYS.items)) save(STORAGE_KEYS.items, sampleItems);
  if (!localStorage.getItem(STORAGE_KEYS.history)) save(STORAGE_KEYS.history, sampleHistory);
}

initializeData();

const state = {
  users: load(STORAGE_KEYS.users, sampleUsers),
  currentUser: load(STORAGE_KEYS.currentUser, null),
  items: load(STORAGE_KEYS.items, sampleItems),
  history: load(STORAGE_KEYS.history, sampleHistory),
  authTab: "login",
  filters: {
    query: "",
    category: "all",
    stock: "all",
    date: "all"
  },
  editItemId: null,
  draftImage: localStorage.getItem(STORAGE_KEYS.itemDraftImage) || "",
  movementFilter: "all"
};

const elements = {
  authLayout: document.getElementById("authLayout"),
  dashboardLayout: document.getElementById("dashboardLayout"),
  authMessage: document.getElementById("authMessage"),
  currentUserBadge: document.getElementById("currentUserBadge"),
  currentUserEmail: document.getElementById("currentUserEmail"),
  statsGrid: document.getElementById("statsGrid"),
  lowStockList: document.getElementById("lowStockList"),
  recentItemsList: document.getElementById("recentItemsList"),
  inventoryTableBody: document.getElementById("inventoryTableBody"),
  categoryChart: document.getElementById("categoryChart"),
  stockInTotal: document.getElementById("stockInTotal"),
  stockOutTotal: document.getElementById("stockOutTotal"),
  stockInBar: document.getElementById("stockInBar"),
  stockOutBar: document.getElementById("stockOutBar"),
  historyTableBody: document.getElementById("historyTableBody"),
  movementHistoryList: document.getElementById("movementHistoryList"),
  movementItem: document.getElementById("movementItem"),
  movementType: document.getElementById("movementType"),
  movementQuantity: document.getElementById("movementQuantity"),
  movementNote: document.getElementById("movementNote"),
  movementHistoryFilter: document.getElementById("movementHistoryFilter"),
  categoryFilter: document.getElementById("categoryFilter"),
  stockFilter: document.getElementById("stockFilter"),
  dateFilter: document.getElementById("dateFilter"),
  searchInput: document.getElementById("searchInput"),
  itemDialog: document.getElementById("itemDialog"),
  itemDialogTitle: document.getElementById("itemDialogTitle"),
  itemForm: document.getElementById("itemForm"),
  itemId: document.getElementById("itemId"),
  itemName: document.getElementById("itemName"),
  itemSku: document.getElementById("itemSku"),
  itemCategory: document.getElementById("itemCategory"),
  itemQuantity: document.getElementById("itemQuantity"),
  itemSupplier: document.getElementById("itemSupplier"),
  itemPrice: document.getElementById("itemPrice"),
  itemImage: document.getElementById("itemImage"),
  imagePreview: document.getElementById("imagePreview")
};

prefillDemoLogin();
bindEvents();
syncView();

function prefillDemoLogin() {
  const loginForm = document.getElementById("loginForm");
  loginForm.email.value = "admin@alfred.com";
  loginForm.password.value = "admin123";
}

function bindEvents() {
  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.authTab = button.dataset.authTab;
      renderAuthTabs();
    });
  });

  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document.getElementById("registerForm").addEventListener("submit", handleRegister);
  document.getElementById("forgotForm").addEventListener("submit", handleForgotPassword);

  document.querySelectorAll(".nav-link").forEach((button) => {
    button.addEventListener("click", () => switchSection(button.dataset.section));
  });

  document.getElementById("logoutButton").addEventListener("click", logout);
  document.getElementById("openAddItemButton").addEventListener("click", openAddDialog);
  document.getElementById("closeDialogButton").addEventListener("click", closeDialog);
  document.getElementById("cancelDialogButton").addEventListener("click", closeDialog);
  elements.itemForm.addEventListener("submit", handleItemSubmit);
  document.getElementById("movementForm").addEventListener("submit", handleMovementSubmit);

  elements.searchInput.addEventListener("input", (event) => {
    state.filters.query = event.target.value.trim().toLowerCase();
    renderInventoryTable();
  });
  elements.categoryFilter.addEventListener("change", (event) => {
    state.filters.category = event.target.value;
    renderInventoryTable();
  });
  elements.stockFilter.addEventListener("change", (event) => {
    state.filters.stock = event.target.value;
    renderInventoryTable();
  });
  elements.dateFilter.addEventListener("change", (event) => {
    state.filters.date = event.target.value;
    renderInventoryTable();
  });
  elements.movementHistoryFilter.addEventListener("change", (event) => {
    state.movementFilter = event.target.value;
    renderMovementHistory();
  });
  elements.itemImage.addEventListener("change", handleImageUpload);
}

function syncView() {
  renderAuthTabs();
  if (state.currentUser) {
    elements.authLayout.classList.add("hidden");
    elements.dashboardLayout.classList.remove("hidden");
    elements.currentUserBadge.textContent = state.currentUser.name;
    elements.currentUserEmail.textContent = state.currentUser.email;
    renderAllDataViews();
  } else {
    elements.authLayout.classList.remove("hidden");
    elements.dashboardLayout.classList.add("hidden");
  }
}

function renderAuthTabs() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.authTab === state.authTab);
  });
  document.querySelectorAll(".auth-form").forEach((form) => {
    form.classList.toggle("active", form.id.startsWith(state.authTab));
  });
  if (state.authTab === "forgot") {
    document.getElementById("forgotForm").classList.add("active");
  }
}

function switchSection(section) {
  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.section === section);
  });
  document.querySelectorAll(".section-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `section-${section}`);
  });
}

function handleLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const email = form.email.value.trim().toLowerCase();
  const password = form.password.value;
  const user = state.users.find((entry) => entry.email.toLowerCase() === email && entry.password === password);

  if (!user) {
    setAuthMessage("Invalid login details. Try the demo account or register a new user.");
    return;
  }

  state.currentUser = user;
  save(STORAGE_KEYS.currentUser, user);
  setAuthMessage("");
  syncView();
}

function handleRegister(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const email = form.email.value.trim().toLowerCase();

  if (state.users.some((user) => user.email.toLowerCase() === email)) {
    setAuthMessage("That email is already registered. Try logging in instead.");
    return;
  }

  const user = {
    id: crypto.randomUUID(),
    name: form.name.value.trim(),
    email,
    password: form.password.value
  };

  state.users.push(user);
  save(STORAGE_KEYS.users, state.users);
  state.history.unshift(makeHistoryEntry(user.name, "register", "User account", "Created a new local demo account."));
  persistHistory();
  form.reset();
  state.authTab = "login";
  renderAuthTabs();
  setAuthMessage("Account created successfully. Please log in with your new details.");
}

function handleForgotPassword(event) {
  event.preventDefault();
  const email = event.currentTarget.email.value.trim();
  setAuthMessage(`Password reset link sent to ${email}. This is a demo confirmation.`);
  event.currentTarget.reset();
  state.authTab = "login";
  renderAuthTabs();
}

function logout() {
  state.currentUser = null;
  localStorage.removeItem(STORAGE_KEYS.currentUser);
  syncView();
}

function setAuthMessage(message) {
  elements.authMessage.textContent = message;
}

function openAddDialog() {
  state.editItemId = null;
  state.draftImage = "";
  localStorage.removeItem(STORAGE_KEYS.itemDraftImage);
  elements.itemDialogTitle.textContent = "Add item";
  elements.itemForm.reset();
  elements.itemId.value = "";
  elements.imagePreview.src = placeholderImage;
  elements.itemDialog.showModal();
}

function openEditDialog(itemId) {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) return;

  state.editItemId = item.id;
  state.draftImage = item.image;
  localStorage.setItem(STORAGE_KEYS.itemDraftImage, state.draftImage);
  elements.itemDialogTitle.textContent = "Edit item";
  elements.itemId.value = item.id;
  elements.itemName.value = item.name;
  elements.itemSku.value = item.sku;
  elements.itemCategory.value = item.category;
  elements.itemQuantity.value = item.quantity;
  elements.itemSupplier.value = item.supplier;
  elements.itemPrice.value = item.price;
  elements.imagePreview.src = item.image || placeholderImage;
  elements.itemDialog.showModal();
}

function closeDialog() {
  elements.itemDialog.close();
  elements.itemForm.reset();
  state.editItemId = null;
  state.draftImage = "";
  localStorage.removeItem(STORAGE_KEYS.itemDraftImage);
  elements.imagePreview.src = "";
}

function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.draftImage = reader.result;
    localStorage.setItem(STORAGE_KEYS.itemDraftImage, state.draftImage);
    elements.imagePreview.src = state.draftImage;
  };
  reader.readAsDataURL(file);
}

function handleItemSubmit(event) {
  event.preventDefault();

  const itemData = {
    id: elements.itemId.value || crypto.randomUUID(),
    name: elements.itemName.value.trim(),
    sku: elements.itemSku.value.trim(),
    category: elements.itemCategory.value.trim(),
    quantity: Number(elements.itemQuantity.value),
    supplier: elements.itemSupplier.value.trim(),
    price: Number(elements.itemPrice.value),
    image: state.draftImage || placeholderImage,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (state.editItemId) {
    const index = state.items.findIndex((item) => item.id === state.editItemId);
    const previous = state.items[index];
    itemData.createdAt = previous.createdAt;
    state.items[index] = itemData;
    addHistory("edit", itemData.name, describeItemChanges(previous, itemData));
  } else {
    state.items.unshift(itemData);
    addHistory("add", itemData.name, `Added item ${itemData.sku} in ${itemData.category} with quantity ${itemData.quantity}.`);
  }

  persistItems();
  closeDialog();
  renderAllDataViews();
  switchSection("items");
}

function describeItemChanges(previous, next) {
  const changes = [];
  ["name", "sku", "category", "quantity", "supplier", "price"].forEach((field) => {
    if (String(previous[field]) !== String(next[field])) {
      changes.push(`${field} changed from "${previous[field]}" to "${next[field]}"`);
    }
  });
  return changes.length ? changes.join(", ") : "Updated item details.";
}

function handleMovementSubmit(event) {
  event.preventDefault();
  const itemId = elements.movementItem.value;
  const type = elements.movementType.value;
  const quantity = Number(elements.movementQuantity.value);
  const note = elements.movementNote.value.trim() || "No note";
  const item = state.items.find((entry) => entry.id === itemId);

  if (!item) return;
  if (type === "out" && quantity > item.quantity) {
    alert("Not enough stock for this stock-out movement.");
    return;
  }

  const before = item.quantity;
  item.quantity = type === "in" ? item.quantity + quantity : item.quantity - quantity;
  item.updatedAt = new Date().toISOString();

  addHistory(
    type === "in" ? "stock in" : "stock out",
    item.name,
    `${type === "in" ? "Added" : "Removed"} ${quantity} units. Quantity changed from ${before} to ${item.quantity}. Note: ${note}.`
  );

  persistItems();
  event.currentTarget.reset();
  renderAllDataViews();
}

function addHistory(action, itemName, details) {
  state.history.unshift(makeHistoryEntry(state.currentUser?.name || "System", action, itemName, details));
  persistHistory();
}

function deleteItem(itemId) {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) return;
  const confirmed = confirm(`Delete ${item.name}?`);
  if (!confirmed) return;

  state.items = state.items.filter((entry) => entry.id !== itemId);
  addHistory("delete", item.name, `Deleted item ${item.sku} from inventory.`);
  persistItems();
  renderAllDataViews();
}

function persistItems() {
  save(STORAGE_KEYS.items, state.items);
}

function persistHistory() {
  save(STORAGE_KEYS.history, state.history);
}

function renderAllDataViews() {
  populateFilterOptions();
  renderStats();
  renderCharts();
  renderHighlights();
  renderInventoryTable();
  renderMovementSelects();
  renderMovementHistory();
  renderHistoryTable();
}

function populateFilterOptions() {
  const categories = Array.from(new Set(state.items.map((item) => item.category))).sort();
  elements.categoryFilter.innerHTML = ['<option value="all">All categories</option>']
    .concat(categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`))
    .join("");
  if (!categories.includes(state.filters.category)) {
    state.filters.category = "all";
  }
  elements.categoryFilter.value = state.filters.category;
  elements.stockFilter.value = state.filters.stock;
  elements.dateFilter.value = state.filters.date;
  elements.searchInput.value = state.filters.query;

  const itemOptions = ['<option value="all">All items</option>']
    .concat(state.items.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`))
    .join("");

  elements.movementHistoryFilter.innerHTML = itemOptions;
  if (!state.items.some((item) => item.id === state.movementFilter)) {
    state.movementFilter = "all";
  }
  elements.movementHistoryFilter.value = state.movementFilter;
}

function renderStats() {
  const totalItems = state.items.length;
  const lowStock = state.items.filter((item) => item.quantity > 0 && item.quantity <= LOW_STOCK_THRESHOLD).length;
  const addedItems = state.items.filter((item) => daysBetween(item.createdAt) <= 7).length;
  const movements = getMovementTotals();

  const stats = [
    { label: "Total items", value: totalItems, note: "All tracked products", icon: "01" },
    { label: "Low stock alerts", value: lowStock, note: "Needs restocking soon", icon: "02" },
    { label: "Added items", value: addedItems, note: "Added in last 7 days", icon: "03" },
    { label: "Quick stats", value: `${movements.in}/${movements.out}`, note: "In vs out movements", icon: "04" }
  ];

  elements.statsGrid.innerHTML = stats
    .map(
      (stat) => `
        <article class="stat-card">
          <div class="stat-top">
            <div>
              <h3>${stat.label}</h3>
            </div>
            <span class="stat-icon">${stat.icon}</span>
          </div>
          <div class="stat-value">${stat.value}</div>
          <p class="stat-meta">${stat.note}</p>
        </article>
      `
    )
    .join("");
}

function renderCharts() {
  const categoryTotals = state.items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.quantity;
    return acc;
  }, {});
  const entries = Object.entries(categoryTotals);
  const max = Math.max(...entries.map(([, quantity]) => quantity), 1);

  elements.categoryChart.innerHTML = entries.length
    ? entries
        .map(
          ([category, quantity]) => `
            <div class="bar-row">
              <strong>${escapeHtml(category)}</strong>
              <div class="bar-track">
                <div class="bar-fill" style="width: ${(quantity / max) * 100}%"></div>
              </div>
              <span>${quantity}</span>
            </div>
          `
        )
        .join("")
    : '<div class="empty-state">No category data yet.</div>';

  const totals = getMovementTotals();
  const maxMovement = Math.max(totals.in, totals.out, 1);
  elements.stockInTotal.textContent = totals.in;
  elements.stockOutTotal.textContent = totals.out;
  elements.stockInBar.style.width = `${(totals.in / maxMovement) * 100}%`;
  elements.stockOutBar.style.width = `${(totals.out / maxMovement) * 100}%`;
}

function getMovementTotals() {
  return state.history.reduce(
    (acc, entry) => {
      if (entry.action === "stock in") acc.in += extractMovementQuantity(entry.details);
      if (entry.action === "stock out") acc.out += extractMovementQuantity(entry.details);
      return acc;
    },
    { in: 0, out: 0 }
  );
}

function extractMovementQuantity(details) {
  const match = details.match(/(\d+) units/);
  return match ? Number(match[1]) : 0;
}

function renderHighlights() {
  const lowStockItems = state.items
    .filter((item) => item.quantity <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => a.quantity - b.quantity);
  const recentItems = [...state.items]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4);

  elements.lowStockList.innerHTML = lowStockItems.length
    ? lowStockItems
        .map(
          (item) => `
            <div class="stack-item">
              <div>
                <strong>${escapeHtml(item.name)}</strong>
                <p>${escapeHtml(item.category)} • ${escapeHtml(item.sku)}</p>
              </div>
              <span class="stock-badge ${stockClass(item.quantity)}">${stockLabel(item.quantity)}</span>
            </div>
          `
        )
        .join("")
    : '<div class="empty-state">No low-stock products right now.</div>';

  elements.recentItemsList.innerHTML = recentItems.length
    ? recentItems
        .map(
          (item) => `
            <div class="stack-item">
              <div>
                <strong>${escapeHtml(item.name)}</strong>
                <p>Supplier: ${escapeHtml(item.supplier)}</p>
              </div>
              <small>${formatDate(item.createdAt)}</small>
            </div>
          `
        )
        .join("")
    : '<div class="empty-state">No recent items yet.</div>';
}

function getFilteredItems() {
  return state.items.filter((item) => {
    const matchesQuery =
      !state.filters.query ||
      item.name.toLowerCase().includes(state.filters.query) ||
      item.sku.toLowerCase().includes(state.filters.query);
    const matchesCategory = state.filters.category === "all" || item.category === state.filters.category;
    const matchesStock =
      state.filters.stock === "all" ||
      (state.filters.stock === "low" && item.quantity > 0 && item.quantity <= LOW_STOCK_THRESHOLD) ||
      (state.filters.stock === "normal" && item.quantity > LOW_STOCK_THRESHOLD) ||
      (state.filters.stock === "out" && item.quantity === 0);
    const matchesDate =
      state.filters.date === "all" || daysBetween(item.createdAt) <= Number(state.filters.date);

    return matchesQuery && matchesCategory && matchesStock && matchesDate;
  });
}

function renderInventoryTable() {
  const items = getFilteredItems();
  elements.inventoryTableBody.innerHTML = items.length
    ? items
        .map(
          (item) => `
            <tr>
              <td>
                <div class="item-cell">
                  <img class="item-thumb" src="${item.image || placeholderImage}" alt="${escapeHtml(item.name)}">
                  <div>
                    <strong>${escapeHtml(item.name)}</strong>
                    <div class="category-tag">${escapeHtml(item.category)}</div>
                  </div>
                </div>
              </td>
              <td>${escapeHtml(item.sku)}</td>
              <td>${escapeHtml(item.category)}</td>
              <td><span class="stock-badge ${stockClass(item.quantity)}">${stockLabel(item.quantity)}</span></td>
              <td>${escapeHtml(item.supplier)}</td>
              <td>${formatCurrency(item.price)}</td>
              <td>${formatDate(item.createdAt)}</td>
              <td>
                <div class="action-row">
                  <button type="button" data-action="edit" data-id="${item.id}">Edit</button>
                  <button type="button" data-action="restock" data-id="${item.id}">Restock</button>
                  <button type="button" data-action="release" data-id="${item.id}">Stock out</button>
                  <button type="button" data-action="delete" data-id="${item.id}" class="danger-button">Delete</button>
                </div>
              </td>
            </tr>
          `
        )
        .join("")
    : '<tr><td colspan="8"><div class="empty-state">No items match your current search and filters.</div></td></tr>';

  elements.inventoryTableBody.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const { action, id } = button.dataset;
      if (action === "edit") openEditDialog(id);
      if (action === "delete") deleteItem(id);
      if (action === "restock") openQuickMovement(id, "in");
      if (action === "release") openQuickMovement(id, "out");
    });
  });
}

function openQuickMovement(itemId, type) {
  switchSection("movements");
  elements.movementItem.value = itemId;
  elements.movementType.value = type;
  elements.movementQuantity.focus();
}

function renderMovementSelects() {
  const selectedItemId = elements.movementItem.value;
  const options = state.items
    .map((item) => `<option value="${item.id}">${escapeHtml(item.name)} (${escapeHtml(item.sku)})</option>`)
    .join("");
  elements.movementItem.innerHTML = options || '<option value="">No items available</option>';
  if (state.items.some((item) => item.id === selectedItemId)) {
    elements.movementItem.value = selectedItemId;
  }
}

function renderMovementHistory() {
  const history = state.history.filter((entry) => {
    const isMovement = entry.action === "stock in" || entry.action === "stock out";
    if (!isMovement) return false;
    if (state.movementFilter === "all") return true;
    const item = state.items.find((entryItem) => entryItem.id === state.movementFilter);
    return item && entry.itemName === item.name;
  });

  elements.movementHistoryList.innerHTML = history.length
    ? history
        .slice(0, 8)
        .map(
          (entry) => `
            <div class="stack-item">
              <div>
                <strong>${escapeHtml(entry.itemName)}</strong>
                <p>${escapeHtml(entry.action)} by ${escapeHtml(entry.user)}</p>
                <small>${escapeHtml(entry.details)}</small>
              </div>
              <small>${formatDateTime(entry.timestamp)}</small>
            </div>
          `
        )
        .join("")
    : '<div class="empty-state">No movement history available for this selection.</div>';
}

function renderHistoryTable() {
  elements.historyTableBody.innerHTML = state.history.length
    ? state.history
        .map(
          (entry) => `
            <tr>
              <td>${formatDateTime(entry.timestamp)}</td>
              <td>${escapeHtml(entry.user)}</td>
              <td>${escapeHtml(entry.action)}</td>
              <td>${escapeHtml(entry.itemName)}</td>
              <td>${escapeHtml(entry.details)}</td>
            </tr>
          `
        )
        .join("")
    : '<tr><td colspan="5"><div class="empty-state">No transaction history yet.</div></td></tr>';
}

function stockLabel(quantity) {
  if (quantity === 0) return "Out of stock";
  if (quantity <= LOW_STOCK_THRESHOLD) return `Low: ${quantity}`;
  return `In stock: ${quantity}`;
}

function stockClass(quantity) {
  if (quantity === 0) return "out";
  if (quantity <= LOW_STOCK_THRESHOLD) return "low";
  return "normal";
}

function daysBetween(dateString) {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  return Math.floor((now - date) / (1000 * 60 * 60 * 24));
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(dateString));
}

function formatDateTime(dateString) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(dateString));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
