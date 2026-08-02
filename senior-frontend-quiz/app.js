const QUESTIONS = window.QUIZ_QUESTIONS || [];
const STORAGE_KEY = "senior-frontend-quiz:v1";
const NOTES_STORAGE_KEY = "senior-frontend-quiz:notes:v1";
const letters = ["A","B","C","D","E","F"];
let answers = loadObject(STORAGE_KEY);
let notes = loadObject(NOTES_STORAGE_KEY);
let activeFilter = "all";

const list = document.getElementById("questionList");
const emptyState = document.getElementById("emptyState");

function loadObject(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveAnswers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
}

function saveNotes() {
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
}

function isNoted(index) {
  return notes[index] === true;
}

function formatText(value) {
  const escaped = String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
  return escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
}

function render() {
  list.innerHTML = "";
  let visibleCount = 0;

  QUESTIONS.forEach((item, index) => {
    const saved = answers[index];
    const isAnswered = Number.isInteger(saved);
    const isCorrect = isAnswered && saved === item.correct;
    const noted = isNoted(index);
    const visible =
      activeFilter === "all" ||
      (activeFilter === "unanswered" && !isAnswered) ||
      (activeFilter === "wrong" && isAnswered && !isCorrect) ||
      (activeFilter === "notes" && noted);

    if (!visible) return;
    visibleCount++;

    const article = document.createElement("article");
    article.className = `question ${!isAnswered ? "unanswered" : isCorrect ? "correct" : "wrong"} ${noted ? "noted" : ""}`;
    article.id = `question-${index + 1}`;
    article.dataset.index = index;

    const options = item.options.map((option, optionIndex) => {
      const classes = ["option"];
      if (isAnswered && optionIndex === item.correct) classes.push("good");
      if (isAnswered && optionIndex === saved && saved !== item.correct) classes.push("bad");
      return `
        <button type="button"
          class="${classes.join(" ")}"
          data-question="${index}"
          data-option="${optionIndex}"
          ${isAnswered ? "disabled" : ""}>
          <span class="letter">${letters[optionIndex]}</span>
          <span>${formatText(option)}</span>
        </button>`;
    }).join("");

    const feedbackClass = !isAnswered ? "" : isCorrect ? "show good" : "show bad";
    const feedbackText = !isAnswered ? "" : isCorrect
      ? "Верно."
      : `Неверно. Правильный ответ: ${letters[item.correct]} — ${formatText(item.options[item.correct])}`;

    article.innerHTML = `
      <div class="meta">
        <span class="number">Вопрос ${index + 1} из ${QUESTIONS.length}</span>
        <span class="category">${formatText(item.category)}</span>
      </div>
      <h2>${formatText(item.question)}</h2>
      <label class="note-toggle">
        <input
          class="note-checkbox"
          type="checkbox"
          data-note-question="${index}"
          ${noted ? "checked" : ""}>
        <span class="note-box" aria-hidden="true">✓</span>
        <span>Сохранить в заметки</span>
      </label>
      <div class="options">${options}</div>
      <div class="feedback ${feedbackClass}" role="status">${feedbackText}</div>
      <details class="${isAnswered ? "available" : ""}">
        <summary>Подробное объяснение</summary>
        <div class="explanation">${formatText(item.explanation)}</div>
      </details>`;
    list.appendChild(article);
  });

  emptyState.style.display = visibleCount ? "none" : "block";
  updateStats();
}

function answer(questionIndex, optionIndex) {
  if (Number.isInteger(answers[questionIndex])) return;
  answers[questionIndex] = optionIndex;
  saveAnswers();
  render();

  const next = QUESTIONS.findIndex((_, index) => !Number.isInteger(answers[index]));
  if (next >= 0 && activeFilter === "unanswered") {
    requestAnimationFrame(() => document.getElementById(`question-${next + 1}`)?.scrollIntoView({block:"start"}));
  }
}

function setNote(questionIndex, checked) {
  if (checked) {
    notes[questionIndex] = true;
  } else {
    delete notes[questionIndex];
  }
  saveNotes();
  render();
}

function updateStats() {
  const values = Object.entries(answers)
    .filter(([key, value]) => Number.isInteger(value) && QUESTIONS[Number(key)]);
  const answered = values.length;
  const correct = values.reduce((sum, [key, value]) => sum + (QUESTIONS[Number(key)].correct === value ? 1 : 0), 0);
  const wrong = answered - correct;
  const noted = QUESTIONS.reduce((sum, _, index) => sum + (isNoted(index) ? 1 : 0), 0);
  const score = answered ? Math.round(correct / answered * 100) + "%" : "—";

  document.getElementById("answeredStat").textContent = `${answered}/${QUESTIONS.length}`;
  document.getElementById("correctStat").textContent = correct;
  document.getElementById("wrongStat").textContent = wrong;
  document.getElementById("scoreStat").textContent = score;
  document.getElementById("notesCount").textContent = noted;
  document.getElementById("progressBar").style.width = `${answered / QUESTIONS.length * 100}%`;
}

list.addEventListener("click", event => {
  const button = event.target.closest(".option");
  if (!button) return;
  answer(Number(button.dataset.question), Number(button.dataset.option));
});

list.addEventListener("change", event => {
  const checkbox = event.target.closest(".note-checkbox");
  if (!checkbox) return;
  setNote(Number(checkbox.dataset.noteQuestion), checkbox.checked);
});

document.querySelector(".filters").addEventListener("click", event => {
  const button = event.target.closest(".chip");
  if (!button) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll(".chip").forEach(chip => chip.classList.toggle("active", chip === button));
  render();
});

document.getElementById("resetButton").addEventListener("click", () => {
  if (!confirm("Удалить все ответы и начать тест заново? Сохранённые заметки останутся.")) return;
  answers = {};
  localStorage.removeItem(STORAGE_KEY);
  activeFilter = "all";
  document.querySelectorAll(".chip").forEach(chip => chip.classList.toggle("active", chip.dataset.filter === "all"));
  render();
  window.scrollTo({top:0, behavior:"smooth"});
});

render();

requestAnimationFrame(() => {
  const firstUnanswered = QUESTIONS.findIndex((_, index) => !Number.isInteger(answers[index]));
  if (firstUnanswered >= 0) {
    document.getElementById(`question-${firstUnanswered + 1}`)?.scrollIntoView({block:"start"});
  }
});
