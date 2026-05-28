const STORAGE_KEY = "daka.records.v1";
const CIRCLE_LENGTH = 2 * Math.PI * 50;

const state = {
  displayedMonth: startOfMonth(new Date()),
  selectedDate: null,
  records: loadRecords(),
};

const calendarTitle = document.querySelector("#calendarTitle");
const calendarGrid = document.querySelector("#calendarGrid");
const completedCount = document.querySelector("#completedCount");
const totalCount = document.querySelector("#totalCount");
const progressPercent = document.querySelector("#progressPercent");
const progressBar = document.querySelector(".progress-ring .bar");
const dialog = document.querySelector("#dayDialog");
const dialogDate = document.querySelector("#dialogDate");
const clearDay = document.querySelector("#clearDay");

document.querySelector("#prevMonth").addEventListener("click", () => {
  state.displayedMonth = addMonths(state.displayedMonth, -1);
  render();
});

document.querySelector("#nextMonth").addEventListener("click", () => {
  state.displayedMonth = addMonths(state.displayedMonth, 1);
  render();
});

document.querySelector("#markWork").addEventListener("click", () => {
  setStatus("work");
});

document.querySelector("#markOff").addEventListener("click", () => {
  setStatus("off");
});

clearDay.addEventListener("click", () => {
  if (!state.selectedDate) return;

  delete state.records[dateKey(state.selectedDate)];
  saveRecords();
  dialog.close();
  render();
});

render();
registerServiceWorker();

function render() {
  const year = state.displayedMonth.getFullYear();
  const month = state.displayedMonth.getMonth();
  const totalDays = daysInMonth(year, month);
  const counts = monthlyCounts(year, month);
  const completedDays = counts.work + counts.off;
  const progress = totalDays ? completedDays / totalDays : 0;

  calendarTitle.textContent = formatMonthTitle(state.displayedMonth);
  completedCount.textContent = completedDays;
  totalCount.textContent = totalDays;
  progressPercent.textContent = `${Math.round(progress * 100)}%`;
  progressBar.style.strokeDasharray = String(CIRCLE_LENGTH);
  progressBar.style.strokeDashoffset = String(CIRCLE_LENGTH * (1 - progress));

  renderCalendar(year, month, totalDays);
}

function renderCalendar(year, month, totalDays) {
  calendarGrid.replaceChildren();

  const firstDay = new Date(year, month, 1).getDay();
  const todayKey = dateKey(new Date());

  for (let i = 0; i < firstDay; i += 1) {
    const emptyCell = document.createElement("button");
    emptyCell.className = "day-cell empty";
    emptyCell.type = "button";
    calendarGrid.append(emptyCell);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, month, day);
    const key = dateKey(date);
    const status = state.records[key];
    const button = document.createElement("button");
    button.className = ["day-cell", key === todayKey ? "today" : ""].filter(Boolean).join(" ");
    button.type = "button";
    button.setAttribute("aria-label", statusLabel(date, status));
    button.addEventListener("click", () => openDayDialog(date));

    const dayNumber = document.createElement("span");
    dayNumber.className = "day-number";
    dayNumber.textContent = String(day);

    const dot = document.createElement("span");
    dot.className = ["status-dot", status || ""].filter(Boolean).join(" ");
    dot.textContent = status === "work" ? "✓" : "";
    dot.setAttribute("aria-hidden", "true");

    button.append(dayNumber, dot);
    calendarGrid.append(button);
  }
}

function openDayDialog(date) {
  state.selectedDate = date;
  dialogDate.textContent = formatDayTitle(date);
  clearDay.hidden = !state.records[dateKey(date)];

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
    return;
  }

  const status = window.prompt("输入 1 表示上班，输入 0 表示没上班，留空清除记录");
  if (status === "1") setStatus("work");
  if (status === "0") setStatus("off");
  if (status === "") {
    delete state.records[dateKey(date)];
    saveRecords();
    render();
  }
}

function setStatus(status) {
  if (!state.selectedDate) return;

  state.records[dateKey(state.selectedDate)] = status;
  saveRecords();
  dialog.close();
  render();
}

function monthlyCounts(year, month) {
  let work = 0;
  let off = 0;

  for (const [key, status] of Object.entries(state.records)) {
    const date = parseKey(key);
    if (!date || date.getFullYear() !== year || date.getMonth() !== month) continue;

    if (status === "work") work += 1;
    if (status === "off") off += 1;
  }

  return { work, off };
}

function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, offset) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function formatMonthTitle(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
  }).format(date);
}

function formatDayTitle(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

function statusLabel(date, status) {
  const dateText = dateKey(date);
  if (status === "work") return `${dateText}，上班`;
  if (status === "off") return `${dateText}，没上班`;
  return `${dateText}，未记录`;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}
