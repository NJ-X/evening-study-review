import { AREAS, AREA_LABELS, makeReview } from "./rules.mjs";

const STORAGE_KEY = "evening-study-review-v1";
const dateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const today = dateKey();
const todayDate = new Date(`${today}T12:00:00`);
const dateText = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(todayDate);
document.querySelector("#date-label").textContent = dateText;

const readRecords = () => {
  try {
    const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return records && typeof records === "object" && !Array.isArray(records) ? records : {};
  } catch { return {}; }
};
const statusLabels = { done: "完成", partial: "部分完成", missed: "未完成" };
const records = readRecords();
const fields = document.querySelector("#review-form");
const result = document.querySelector("#result");
const message = document.querySelector("#form-message");

function setStatus(area, status) {
  const row = document.querySelector(`[data-area="${area}"]`);
  row.querySelectorAll(".status-button").forEach((button) => {
    const selected = button.dataset.status === status;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  row.dataset.status = status || "";
  row.querySelector(".note-wrap").hidden = !status;
}

function loadToday() {
  const saved = records[today]?.entries;
  if (!saved) return;
  AREAS.forEach((area) => {
    setStatus(area, saved[area]?.status);
    document.querySelector(`[name="${area}-note"]`).value = saved[area]?.note || "";
  });
  document.querySelector("#has-deadline").checked = Boolean(records[today]?.hasDeadline);
  renderResult(records[today]);
  message.textContent = "今天已保存，可随时修改后重新提交。";
}

document.querySelectorAll(".status-button").forEach((button) => {
  button.addEventListener("click", () => {
    setStatus(button.closest("[data-area]").dataset.area, button.dataset.status);
    message.textContent = "";
  });
});

fields.addEventListener("submit", (event) => {
  event.preventDefault();
  const draft = {};
  AREAS.forEach((area) => {
    const row = document.querySelector(`[data-area="${area}"]`);
    draft[area] = { status: row.dataset.status || null, note: row.querySelector("input").value };
  });
  draft.economics.hasDeadline = document.querySelector("#has-deadline").checked;
  try {
    const review = makeReview(draft);
    const record = { date: today, entries: review.entries, hasDeadline: draft.economics.hasDeadline, updatedAt: new Date().toISOString() };
    const nextRecords = { ...records, [today]: record };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
    records[today] = record;
    renderResult(record);
    renderHistory();
    message.textContent = "已保存到这台设备的浏览器。";
    result.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    message.textContent = error?.name === "QuotaExceededError" ? "浏览器存储空间不足，未能保存。" : error.message;
    if (error?.message?.includes("五项")) {
      const firstMissing = AREAS.find((area) => !draft[area].status);
      document.querySelector(`[data-area="${firstMissing}"]`).scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
});

function renderResult(record) {
  if (!record) return;
  const review = makeReview({ ...record.entries, economics: { ...record.entries.economics, hasDeadline: record.hasDeadline } });
  result.hidden = false;
  const taskList = result.querySelector("#tomorrow-list");
  const decisionList = result.querySelector("#decision-list");
  taskList.replaceChildren(...review.tomorrow.map((task) => {
    const item = document.createElement("li");
    const number = document.createElement("span"); number.className = "task-number"; number.textContent = String(task.number).padStart(2, "0");
    const body = document.createElement("div");
    const title = document.createElement("strong"); title.textContent = task.title;
    const desc = document.createElement("p"); desc.textContent = task.text;
    body.append(title, desc); item.append(number, body); return item;
  }));
  decisionList.replaceChildren(...review.decisions.map((decision) => {
    const item = document.createElement("li");
    const name = document.createElement("span"); name.textContent = AREA_LABELS[decision.area];
    const action = document.createElement("strong"); action.textContent = decision.action;
    item.append(name, action); return item;
  }));
}

function renderHistory() {
  const list = document.querySelector("#history-list");
  const now = new Date(`${today}T12:00:00`);
  const dates = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - offset));
    return date;
  });
  list.replaceChildren(...dates.map((date) => {
    const key = dateKey(date);
    const record = records[key];
    const count = record ? AREAS.filter((area) => record.entries?.[area]?.status === "done").length : 0;
    const item = document.createElement("li");
    const day = document.createElement("span"); day.className = "history-day";
    day.textContent = new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(date);
    const dateLabel = document.createElement("span"); dateLabel.className = "history-date"; dateLabel.textContent = `${date.getMonth() + 1}/${date.getDate()}`;
    const dot = document.createElement("span"); dot.className = "history-dot";
    dot.style.setProperty("--fill", record ? `${count * 20}%` : "0%");
    dot.setAttribute("aria-label", record ? `完成 ${count} 项，共 5 项` : "无记录");
    const label = document.createElement("span"); label.className = "history-count"; label.textContent = record ? `${count}/5` : "—";
    item.append(day, dateLabel, dot, label);
    if (key === today) item.classList.add("today");
    return item;
  }));
  const totalDays = dates.filter((date) => records[dateKey(date)]).length;
  document.querySelector("#history-caption").textContent = `最近 7 天记录了 ${totalDays} 天 · 圆环表示当天完全完成的项数`;
}

loadToday();
renderHistory();
