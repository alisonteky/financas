const STORAGE_KEY = "finance-mvp-state-v1";

const ENTRY_TYPE_OPTIONS = [
  { value: "monthly", label: "Conta mensal" },
  { value: "installment", label: "Parcela" },
  { value: "expense", label: "Gasto do mês" },
];

const SORT_OPTIONS = [
  { value: "due", label: "Vencimento" },
  { value: "name", label: "Nome" },
  { value: "amount", label: "Valor" },
];

const CHOICE_OPTION_SETS = {
  entryTypes: ENTRY_TYPE_OPTIONS,
  sortOptions: SORT_OPTIONS,
};

const TAB_COPY = {
  pending: ["A pagar", "Contas abertas para o mês atual."],
  paid: ["Pagas", "Lançamentos marcados como pagos neste mês."],
  completed: ["Concluídas", "Parcelas finais e gastos encerrados ao virar o mês."],
};

const ENTRY_TYPE_LABELS = Object.fromEntries(
  ENTRY_TYPE_OPTIONS.map((option) => [option.value, option.label]),
);

const state = loadState();
const elements = {
  form: document.querySelector("#entry-form"),
  name: document.querySelector("#name"),
  purchaseDate: document.querySelector("#purchase-date"),
  dueDateField: document.querySelector("#due-date-field"),
  dueDate: document.querySelector("#due-date"),
  amount: document.querySelector("#amount"),
  type: document.querySelector("#type"),
  paid: document.querySelector("#paid"),
  currentInstallment: document.querySelector("#current-installment"),
  totalInstallments: document.querySelector("#total-installments"),
  installmentsRow: document.querySelector("#installments-row"),
  entriesList: document.querySelector("#entries-list"),
  emptyState: document.querySelector("#empty-state"),
  template: document.querySelector("#entry-template"),
  tabButtons: document.querySelectorAll(".tab-button"),
  choiceSelects: document.querySelectorAll("[data-choice-select]"),
  sortSelect: document.querySelector("#sort-select"),
  listTitle: document.querySelector("#list-title"),
  listDescription: document.querySelector("#list-description"),
  reminderStrip: document.querySelector("#reminder-strip"),
  exportDataButton: document.querySelector("#export-data-button"),
  importDataButton: document.querySelector("#import-data-button"),
  importFile: document.querySelector("#import-file"),
  closeMonthButton: document.querySelector("#close-month-button"),
  clearDataButton: document.querySelector("#clear-data-button"),
  currentMonthLabel: document.querySelector("#current-month-label"),
  pendingCount: document.querySelector("#pending-count"),
  pendingTotal: document.querySelector("#pending-total"),
  dueSoonCount: document.querySelector("#due-soon-count"),
  paidCount: document.querySelector("#paid-count"),
  paidTotal: document.querySelector("#paid-total"),
  completedCount: document.querySelector("#completed-count"),
};

let activeTab = "pending";
let editingId = null;

init();

function init() {
  closePastMonths();
  setupChoiceSelects();
  setDefaultDates();
  bindEvents();
  syncInstallmentFields();
  render();
}

function bindEvents() {
  elements.form.addEventListener("submit", handleSubmit);
  elements.type.addEventListener("change", syncInstallmentFields);
  elements.sortSelect.addEventListener("change", render);
  elements.exportDataButton.addEventListener("click", exportData);
  elements.importDataButton.addEventListener("click", () => elements.importFile.click());
  elements.importFile.addEventListener("change", importData);
  elements.closeMonthButton.addEventListener("click", () => {
    closeOneMonth(true);
    saveState();
    render();
  });
  elements.clearDataButton.addEventListener("click", () => {
    const confirmed = window.confirm("Tem certeza que quer apagar todos os lançamentos salvos?");
    if (!confirmed) return;
    state.items = [];
    state.completed = [];
    state.activeMonth = currentMonthKey();
    saveState();
    render();
  });

  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeTab = button.dataset.tab;
      render();
    });
  });

  document.addEventListener("click", closeChoiceSelects);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeChoiceSelects();
  });
}

function setupChoiceSelects() {
  elements.choiceSelects.forEach((select) => {
    const input = document.querySelector(`#${select.dataset.target}`);
    const trigger = select.querySelector(".choice-trigger");
    const menu = select.querySelector(".choice-menu");
    const options = CHOICE_OPTION_SETS[select.dataset.options] ?? [];

    if (!input || !trigger || !menu || !options.length) return;

    menu.innerHTML = "";
    options.forEach((option) => {
      const button = document.createElement("button");
      button.className = "choice-option";
      button.type = "button";
      button.setAttribute("role", "option");
      button.dataset.value = option.value;
      button.textContent = option.label;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        setChoiceValue(input, option.value);
        closeChoiceSelect(select);
        trigger.focus();
      });
      button.addEventListener("keydown", (event) => handleChoiceOptionKeydown(event, select));
      menu.appendChild(button);
    });

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleChoiceSelect(select);
    });
    trigger.addEventListener("keydown", (event) => handleChoiceTriggerKeydown(event, select));
    syncChoiceSelect(select);
  });
}

function toggleChoiceSelect(select) {
  const isOpen = select.classList.contains("open");
  closeChoiceSelects();
  if (!isOpen) openChoiceSelect(select);
}

function openChoiceSelect(select) {
  const trigger = select.querySelector(".choice-trigger");
  const menu = select.querySelector(".choice-menu");

  select.classList.add("open");
  trigger.setAttribute("aria-expanded", "true");
  menu.hidden = false;
  focusSelectedChoice(select);
}

function closeChoiceSelect(select) {
  const trigger = select.querySelector(".choice-trigger");
  const menu = select.querySelector(".choice-menu");

  select.classList.remove("open");
  trigger.setAttribute("aria-expanded", "false");
  menu.hidden = true;
}

function closeChoiceSelects() {
  elements.choiceSelects.forEach(closeChoiceSelect);
}

function setChoiceValue(input, value, shouldDispatch = true) {
  input.value = value;
  syncChoiceSelect(document.querySelector(`[data-choice-select][data-target="${input.id}"]`));
  if (shouldDispatch) input.dispatchEvent(new Event("change", { bubbles: true }));
}

function syncChoiceSelect(select) {
  if (!select) return;

  const input = document.querySelector(`#${select.dataset.target}`);
  const label = select.querySelector("[data-choice-label]");
  const options = CHOICE_OPTION_SETS[select.dataset.options] ?? [];
  const selected = options.find((option) => option.value === input.value) ?? options[0];

  if (!selected) return;

  input.value = selected.value;
  label.textContent = selected.label;
  select.querySelectorAll(".choice-option").forEach((option) => {
    const isSelected = option.dataset.value === selected.value;
    option.classList.toggle("selected", isSelected);
    option.setAttribute("aria-selected", String(isSelected));
  });
}

function focusSelectedChoice(select) {
  const selected = select.querySelector(".choice-option.selected");
  const first = select.querySelector(".choice-option");
  (selected ?? first)?.focus();
}

function handleChoiceTriggerKeydown(event, select) {
  if (!["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) return;

  event.preventDefault();
  openChoiceSelect(select);
}

function handleChoiceOptionKeydown(event, select) {
  const options = [...select.querySelectorAll(".choice-option")];
  const currentIndex = options.indexOf(document.activeElement);

  if (event.key === "Escape") {
    event.preventDefault();
    closeChoiceSelect(select);
    select.querySelector(".choice-trigger").focus();
    return;
  }

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = (currentIndex + direction + options.length) % options.length;
    options[nextIndex].focus();
  }
}

function handleSubmit(event) {
  event.preventDefault();

  const formData = new FormData(elements.form);
  const type = formData.get("type");
  const hasDueDate = type !== "expense";
  const dueDate = hasDueDate ? formData.get("dueDate") : "";
  const purchaseDate = formData.get("purchaseDate");
  const existing = editingId ? state.items.find((item) => item.id === editingId) : null;

  if (hasDueDate && !dueDate) return;

  const entry = {
    id: existing?.id ?? crypto.randomUUID(),
    name: formData.get("name").trim(),
    purchaseDate,
    dueDay: hasDueDate ? Number(dueDate.slice(-2)) : null,
    originalDueDate: hasDueDate ? dueDate : null,
    amount: Number(formData.get("amount") || 0),
    type,
    paid: formData.get("paid") === "on",
    currentInstallment: type === "installment" ? Number(formData.get("currentInstallment") || 1) : 1,
    totalInstallments: type === "installment" ? Number(formData.get("totalInstallments") || 1) : 1,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!entry.name) return;

  if (entry.currentInstallment > entry.totalInstallments) {
    entry.currentInstallment = entry.totalInstallments;
  }

  if (existing) {
    state.items = state.items.map((item) => (item.id === editingId ? entry : item));
  } else {
    state.items.push(entry);
  }

  editingId = null;
  elements.form.querySelector(".primary-button").textContent = "Adicionar";
  elements.form.reset();
  setChoiceValue(elements.type, "monthly", false);
  setDefaultDates();
  syncInstallmentFields();
  saveState();
  render();
}

function closePastMonths() {
  const nowMonth = currentMonthKey();
  if (!state.activeMonth) {
    state.activeMonth = nowMonth;
    saveState();
    return;
  }

  while (state.activeMonth < nowMonth) {
    closeOneMonth();
  }

  saveState();
}

function closeOneMonth() {
  const nextMonth = addMonths(state.activeMonth, 1);
  const remaining = [];

  state.items.forEach((item) => {
    if (item.paid && shouldComplete(item)) {
      state.completed.push({
        ...item,
        completedAt: new Date().toISOString(),
        completedMonth: state.activeMonth,
      });
      return;
    }

    if (item.paid && item.type === "installment") {
      item.currentInstallment += 1;
    }

    remaining.push({
      ...item,
      paid: false,
      updatedAt: new Date().toISOString(),
    });
  });

  state.items = remaining;
  state.activeMonth = nextMonth;
}

function shouldComplete(item) {
  if (item.type === "monthly") return false;
  if (item.type === "expense") return true;
  return item.currentInstallment >= item.totalInstallments;
}

function render() {
  const activeMonthDate = monthKeyToDate(state.activeMonth);
  elements.currentMonthLabel.textContent = activeMonthDate.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  updateTabs();
  updateSummary();
  updateReminder();
  renderList();
}

function updateTabs() {
  elements.tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === activeTab);
  });

  elements.listTitle.textContent = TAB_COPY[activeTab][0];
  elements.listDescription.textContent = TAB_COPY[activeTab][1];
}

function updateSummary() {
  const pending = state.items.filter((item) => !item.paid);
  const paid = state.items.filter((item) => item.paid);
  const dueSoon = pending.filter((item) => {
    const dueDate = getDueDate(item);
    if (!dueDate) return false;

    const days = daysUntil(dueDate);
    return days >= 0 && days <= 7;
  });

  elements.pendingCount.textContent = pending.length;
  elements.pendingTotal.textContent = formatCurrency(sumAmounts(pending));
  elements.dueSoonCount.textContent = dueSoon.length;
  elements.paidCount.textContent = paid.length;
  elements.paidTotal.textContent = formatCurrency(sumAmounts(paid));
  elements.completedCount.textContent = state.completed.length;
}

function updateReminder() {
  const pending = state.items.filter((item) => !item.paid);
  const overdue = pending.filter((item) => {
    const dueDate = getDueDate(item);
    return dueDate ? daysUntil(dueDate) < 0 : false;
  });
  const dueSoon = pending.filter((item) => {
    const dueDate = getDueDate(item);
    if (!dueDate) return false;

    const days = daysUntil(dueDate);
    return days >= 0 && days <= 7;
  });

  if (activeTab !== "pending" || (!overdue.length && !dueSoon.length)) {
    elements.reminderStrip.hidden = true;
    elements.reminderStrip.textContent = "";
    return;
  }

  const parts = [];
  if (overdue.length) parts.push(`${overdue.length} vencida${overdue.length > 1 ? "s" : ""}`);
  if (dueSoon.length) parts.push(`${dueSoon.length} vence${dueSoon.length > 1 ? "m" : ""} em até 7 dias`);

  elements.reminderStrip.hidden = false;
  elements.reminderStrip.textContent = `Lembrete: ${parts.join(" e ")}.`;
}

function renderList() {
  elements.entriesList.innerHTML = "";
  const entries = sortedEntries(entriesForTab(activeTab));

  elements.emptyState.hidden = entries.length > 0;

  entries.forEach((entry) => {
    const node = elements.template.content.firstElementChild.cloneNode(true);
    const dueDate = getEntryDueDate(entry);
    const days = dueDate ? daysUntil(dueDate) : null;
    const paidCheckbox = node.querySelector(".entry-paid");
    const status = node.querySelector(".entry-status");

    node.querySelector(".entry-name").textContent = entry.name;
    node.querySelector(".entry-meta").textContent = buildMeta(entry, dueDate);
    node.querySelector(".entry-amount").textContent = entry.amount ? formatCurrency(entry.amount) : "Sem valor";
    paidCheckbox.checked = entry.paid;
    paidCheckbox.disabled = activeTab === "completed";

    const statusInfo = getStatusInfo(entry, days);
    status.textContent = statusInfo.label;
    if (statusInfo.kind) status.classList.add(statusInfo.kind);
    node.classList.toggle("overdue", statusInfo.kind === "danger");
    node.classList.toggle("due-soon", statusInfo.kind === "warning");

    paidCheckbox.addEventListener("change", () => togglePaid(entry.id, paidCheckbox.checked));
    const editButton = node.querySelector(".edit-entry");
    editButton.hidden = activeTab === "completed";
    editButton.addEventListener("click", () => editEntry(entry.id));
    node.querySelector(".delete-entry").addEventListener("click", () => deleteEntry(entry.id, activeTab));

    elements.entriesList.appendChild(node);
  });
}

function entriesForTab(tab) {
  if (tab === "completed") return state.completed;
  if (tab === "paid") return state.items.filter((item) => item.paid);
  return state.items.filter((item) => !item.paid);
}

function sortedEntries(entries) {
  return [...entries].sort((a, b) => {
    if (elements.sortSelect.value === "name") return a.name.localeCompare(b.name, "pt-BR");
    if (elements.sortSelect.value === "amount") return b.amount - a.amount;

    const dueDateA = getEntryDueDate(a);
    const dueDateB = getEntryDueDate(b);
    if (!dueDateA && !dueDateB) return 0;
    if (!dueDateA) return 1;
    if (!dueDateB) return -1;
    return dueDateA - dueDateB;
  });
}

function togglePaid(id, paid) {
  state.items = state.items.map((item) =>
    item.id === id ? { ...item, paid, updatedAt: new Date().toISOString() } : item,
  );
  saveState();
  render();
}

function editEntry(id) {
  const entry = state.items.find((item) => item.id === id);
  if (!entry) return;

  editingId = id;
  elements.name.value = entry.name;
  elements.purchaseDate.value = entry.purchaseDate;
  elements.dueDate.value = dateToInputValue(getDueDate(entry) ?? new Date());
  elements.amount.value = entry.amount || "";
  setChoiceValue(elements.type, entry.type, false);
  elements.currentInstallment.value = entry.currentInstallment;
  elements.totalInstallments.value = entry.totalInstallments;
  elements.paid.checked = entry.paid;
  elements.form.querySelector(".primary-button").textContent = "Salvar alteração";
  syncInstallmentFields();
  elements.name.focus();
}

function deleteEntry(id, tab) {
  const confirmed = window.confirm("Excluir este lançamento?");
  if (!confirmed) return;

  if (tab === "completed") {
    state.completed = state.completed.filter((item) => item.id !== id);
  } else {
    state.items = state.items.filter((item) => item.id !== id);
  }

  saveState();
  render();
}

function exportData() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      activeMonth: state.activeMonth,
      items: state.items,
      completed: state.completed,
    },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `financas-${state.activeMonth}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function importData(event) {
  const [file] = event.target.files;
  event.target.value = "";
  if (!file) return;

  try {
    const imported = normalizeImportedState(JSON.parse(await file.text()));
    const confirmed = window.confirm("Importar este backup vai substituir os dados atuais. Continuar?");
    if (!confirmed) return;

    state.activeMonth = imported.activeMonth;
    state.items = imported.items;
    state.completed = imported.completed;
    closePastMonths();
    saveState();
    activeTab = "pending";
    render();
  } catch {
    window.alert("Nao consegui importar esse arquivo. Confira se ele e um backup valido do app.");
  }
}

function buildMeta(entry, dueDate) {
  const baseTypeLabel = ENTRY_TYPE_LABELS[entry.type] ?? "Lançamento";
  const typeLabel =
    entry.type === "installment"
      ? `${baseTypeLabel} ${entry.currentInstallment}/${entry.totalInstallments}`
      : baseTypeLabel;

  const purchase = inputDateToLocale(entry.purchaseDate);
  if (!dueDate) return `${typeLabel} | Compra: ${purchase}`;

  const due = dueDate.toLocaleDateString("pt-BR");
  return `${typeLabel} | Compra: ${purchase} | Vencimento: ${due}`;
}

function getStatusInfo(entry, days) {
  if (activeTab === "completed") return { label: "Concluída", kind: "success" };
  if (entry.paid) return { label: "Paga", kind: "success" };
  if (days === null) return { label: "A pagar", kind: "" };
  if (days < 0) return { label: "Vencida", kind: "danger" };
  if (days === 0) return { label: "Vence hoje", kind: "warning" };
  if (days <= 7) return { label: `${days} dias`, kind: "warning" };
  return { label: "A pagar", kind: "" };
}

function syncInstallmentFields() {
  const isInstallment = elements.type.value === "installment";
  const hasDueDate = elements.type.value !== "expense";

  elements.installmentsRow.hidden = !isInstallment;
  elements.currentInstallment.required = isInstallment;
  elements.totalInstallments.required = isInstallment;
  elements.dueDateField.hidden = !hasDueDate;
  elements.dueDate.required = hasDueDate;
}

function setDefaultDates() {
  const today = new Date();
  elements.purchaseDate.value = dateToInputValue(today);
  elements.dueDate.value = dateToInputValue(today);
}

function getDueDate(item) {
  if (item.type === "expense" || !item.dueDay) return null;

  const [year, month] = state.activeMonth.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return new Date(year, month - 1, Math.min(item.dueDay, lastDay));
}

function getEntryDueDate(item) {
  if (!item.completedMonth) return getDueDate(item);
  if (item.type === "expense" || !item.dueDay) return null;

  const [year, month] = item.completedMonth.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return new Date(year, month - 1, Math.min(item.dueDay, lastDay));
}

function daysUntil(date) {
  const start = startOfDay(new Date());
  const end = startOfDay(date);
  return Math.round((end - start) / 86400000);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function currentMonthKey() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

function monthKeyToDate(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function addMonths(monthKey, amount) {
  const date = monthKeyToDate(monthKey);
  date.setMonth(date.getMonth() + amount);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dateToInputValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function inputDateToLocale(value) {
  if (!value) return "-";
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function sumAmounts(entries) {
  return entries.reduce((total, entry) => total + (entry.amount || 0), 0);
}

function loadState() {
  const fallback = {
    activeMonth: currentMonthKey(),
    items: [],
    completed: [],
  };

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored) return fallback;
    return {
      activeMonth: stored.activeMonth || fallback.activeMonth,
      items: Array.isArray(stored.items) ? stored.items : [],
      completed: Array.isArray(stored.completed) ? stored.completed : [],
    };
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeImportedState(raw) {
  const source = raw?.data ?? raw;
  if (!source || !/^\d{4}-\d{2}$/.test(source.activeMonth)) {
    throw new Error("Invalid backup");
  }

  return {
    activeMonth: source.activeMonth,
    items: sanitizeEntries(source.items),
    completed: sanitizeEntries(source.completed),
  };
}

function sanitizeEntries(entries) {
  if (!Array.isArray(entries)) return [];

  return entries
    .filter((entry) => entry && entry.id && entry.name && entry.dueDay)
    .map((entry) => ({
      id: String(entry.id),
      name: String(entry.name),
      purchaseDate: entry.purchaseDate || dateToInputValue(new Date()),
      dueDay: Number(entry.dueDay),
      originalDueDate: entry.originalDueDate || entry.purchaseDate || dateToInputValue(new Date()),
      amount: Number(entry.amount || 0),
      type: ["monthly", "installment", "expense"].includes(entry.type) ? entry.type : "expense",
      paid: Boolean(entry.paid),
      currentInstallment: Number(entry.currentInstallment || 1),
      totalInstallments: Number(entry.totalInstallments || 1),
      createdAt: entry.createdAt || new Date().toISOString(),
      updatedAt: entry.updatedAt || new Date().toISOString(),
      completedAt: entry.completedAt,
      completedMonth: entry.completedMonth,
    }));
}
