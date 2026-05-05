// ----------------------------- SCRIPT.JS ---------------------------------
// Local storage + tiny squares (goal achieved = green square only)
// Unified Start/Pause button + Pop-out synchronized timer

(function() {
  // ----- DATA -----
  let studyLog = {};      // key: "YYYY-MM-DD" : minutes studied
  let dailyGoalMin = 45;   // default
  let currentDisplayDate = new Date();  // for calendar navigation

  // ----- TIMER STATE (shared between main and popout)-----
  let totalSeconds = 0;
  let timerInterval = null;
  let isTimerRunning = false;

  // DOM elements
  const goalInput = document.getElementById('goalMinutesInput');
  const updateGoalBtn = document.getElementById('updateGoalBtn');
  const totalHitSpan = document.getElementById('totalHitDays');
  const streakSpan = document.getElementById('streakCount');
  const timerMinutesSpan = document.getElementById('timerMinutes');
  const timerSecondsSpan = document.getElementById('timerSeconds');
  const startPauseBtn = document.getElementById('startPauseBtn');
  const timerResetBtn = document.getElementById('timerResetBtn');
  const logStudyBtn = document.getElementById('logStudyBtn');
  const logFeedbackDiv = document.getElementById('logFeedback');
  const monthYearLabel = document.getElementById('monthYearLabel');
  const tinyGrid = document.getElementById('tinySquaresGrid');
  const prevMonthBtn = document.getElementById('prevMonthBtn');
  const nextMonthBtn = document.getElementById('nextMonthBtn');
  const quoteDiv = document.getElementById('motivationQuote');
  const refreshQuoteBtn = document.getElementById('refreshQuote');
  const liveTimerPreview = document.getElementById('liveTimerPreview');

  // popout modal elements
  const popModal = document.getElementById('popTimerModal');
  const popTrigger = document.getElementById('popTimerTrigger');
  const closePopBtn = document.getElementById('closePopModal');
  const popTimerDisplay = document.getElementById('popTimerDisplay');
  const popStartPauseBtn = document.getElementById('popStartPauseBtn');
  const popResetBtn = document.getElementById('popResetBtn');

  // ---------- HELPER FUNCTIONS ----------
  function getTodayKey() {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }

  function formatDateKey(date) {
    return date.toISOString().split('T')[0];
  }

  // Load / Save localstorage (persist on machine)
  function loadLocalData() {
    const stored = localStorage.getItem('focusTilesData');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        studyLog = parsed.studyLog || {};
        dailyGoalMin = parsed.dailyGoalMin || 45;
      } catch (e) {
        console.error("Failed to parse storage", e);
      }
    }
    goalInput.value = dailyGoalMin;
  }

  function persistData() {
    const toStore = {
      studyLog: studyLog,
      dailyGoalMin: dailyGoalMin
    };
    localStorage.setItem('focusTilesData', JSON.stringify(toStore));
  }

  // update total goal days (where minutes >= goal) & current streak
  function updateStats() {
    let hitCount = 0;
    for (let dateKey in studyLog) {
      if (studyLog[dateKey] >= dailyGoalMin) hitCount++;
    }
    totalHitSpan.innerText = hitCount;

    // streak: consecutive days ending today where goal was hit
    let streak = 0;
    let checkDate = new Date();
    while (true) {
      let key = formatDateKey(checkDate);
      let mins = studyLog[key] || 0;
      if (mins >= dailyGoalMin) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else break;
      if (streak > 500) break;
    }
    streakSpan.innerText = streak;
  }

  // Add minutes to current day (accumulate)
  function addStudyMinutes(minutesToAdd) {
    if (minutesToAdd <= 0) {
      logFeedbackDiv.innerText = "⏱️ No minutes to log (timer is 0).";
      setTimeout(() => logFeedbackDiv.innerText = "", 1500);
      return false;
    }
    const today = getTodayKey();
    const currentMins = studyLog[today] || 0;
    const newTotal = currentMins + minutesToAdd;
    studyLog[today] = newTotal;
    persistData();
    renderTinyCalendar();    // refresh only squares
    updateStats();
    logFeedbackDiv.innerText = `🎉 Logged ${minutesToAdd} min! Today: ${newTotal} / ${dailyGoalMin} min.`;
    setTimeout(() => {
      if (logFeedbackDiv) logFeedbackDiv.innerText = "";
    }, 2500);
    return true;
  }

  // Timer display update (both main and popup)
  function updateTimerUI() {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    timerMinutesSpan.innerText = mins < 10 ? '0' + mins : mins;
    timerSecondsSpan.innerText = secs < 10 ? '0' + secs : secs;
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    if (liveTimerPreview) liveTimerPreview.innerText = formatted;
    if (popModal && popModal.style.display === 'flex' && popTimerDisplay) {
      popTimerDisplay.innerText = formatted;
    }
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    isTimerRunning = true;
    timerInterval = setInterval(() => {
      if (isTimerRunning) {
        totalSeconds++;
        updateTimerUI();
      }
    }, 1000);
  }

  function pauseTimer() {
    isTimerRunning = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function resetTimer() {
    pauseTimer();
    totalSeconds = 0;
    updateTimerUI();
  }

  function toggleStartPause() {
    if (isTimerRunning) {
      pauseTimer();
      startPauseBtn.innerHTML = '<i class="fas fa-play"></i> Start';
      if (popStartPauseBtn) popStartPauseBtn.innerHTML = '<i class="fas fa-play"></i> Start/Pause';
    } else {
      startTimer();
      startPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
      if (popStartPauseBtn) popStartPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Start/Pause';
    }
  }

  function syncPopButtonState() {
    if (popStartPauseBtn) {
      if (isTimerRunning) popStartPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Start/Pause';
      else popStartPauseBtn.innerHTML = '<i class="fas fa-play"></i> Start/Pause';
    }
  }

  // Calendar: tiny squares, ONLY change color if goal hit (complete)
  function renderTinyCalendar() {
    const year = currentDisplayDate.getFullYear();
    const month = currentDisplayDate.getMonth();
    const firstDay = new Date(year, month, 1);
    let startWeekday = firstDay.getDay(); // 0 = Sunday
    let offset = (startWeekday === 0 ? 6 : startWeekday - 1); // Mon first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    monthYearLabel.innerText = new Date(year, month).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
    tinyGrid.innerHTML = '';

    // empty placeholders
    for (let i = 0; i < offset; i++) {
      let emptyDiv = document.createElement('div');
      emptyDiv.classList.add('tiny-square');
      emptyDiv.style.opacity = '0.2';
      emptyDiv.style.background = '#ecd9c2';
      tinyGrid.appendChild(emptyDiv);
    }

    // actual days
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const dateKey = formatDateKey(cellDate);
      const minutesStudied = studyLog[dateKey] || 0;
      const goalHit = (minutesStudied >= dailyGoalMin);
      const square = document.createElement('div');
      square.classList.add('tiny-square');
      square.innerText = d;
      if (goalHit) {
        square.classList.add('goal-hit'); // VIBRANT GREEN only if goal reached
      }
      tinyGrid.appendChild(square);
    }
    updateStats(); // refresh counts
  }

  function changeMonth(delta) {
    currentDisplayDate.setMonth(currentDisplayDate.getMonth() + delta);
    renderTinyCalendar();
  }

  // set new daily goal
  function setDailyGoal() {
    let newGoal = parseInt(goalInput.value, 10);
    if (isNaN(newGoal) || newGoal < 1) newGoal = 30;
    dailyGoalMin = newGoal;
    persistData();
    renderTinyCalendar();   // re-evaluate squares based on new threshold
    updateStats();
    logFeedbackDiv.innerText = `✨ Daily goal set to ${dailyGoalMin} minutes ✨`;
    setTimeout(() => logFeedbackDiv.innerText = "", 1800);
  }

  // log current timer minutes
  function logTimerToToday() {
    const minutesToAdd = Math.floor(totalSeconds / 60);
    if (minutesToAdd === 0 && totalSeconds > 0) {
      addStudyMinutes(1);
    } else {
      addStudyMinutes(minutesToAdd);
    }
    resetTimer(); // after logging, reset timer
  }

  // ----- QUOTES (vibrant & fresh)-----
  const quotesBank = [
    "🔥 “Small disciplines repeated daily become mighty habits.”",
    "📘 “Progress, not perfection. One tile at a time.”",
    "🧠 “Your future self will thank you for today’s focus.”",
    "⭐ “The only bad study session is the one that didn't happen.”",
    "⚡ “Goals are dreams with deadlines. Go hit that square!”",
    "💪 “Don't stop when you're tired. Stop when you're done.”",
    "🌈 “You don't have to be extreme, just consistent.”",
    "🎯 “Every minute of study adds a brick to your masterpiece.”"
  ];

  function updateQuote() {
    const rand = Math.floor(Math.random() * quotesBank.length);
    quoteDiv.innerText = quotesBank[rand];
  }

  // ----- POPOUT TIMER MODAL (synchronized) -----
  function openPopModal() {
    popModal.style.display = 'flex';
    updateTimerUI();  // sync display
    syncPopButtonState();
  }

  function closePopModal() {
    popModal.style.display = 'none';
  }

  function popToggleTimer() {
    toggleStartPause();
    syncPopButtonState();
  }

  function popResetTimer() {
    resetTimer();
    updateTimerUI();
    syncPopButtonState();
  }

  // ----- EVENT LISTENERS -----
  startPauseBtn.addEventListener('click', toggleStartPause);
  timerResetBtn.addEventListener('click', () => {
    resetTimer();
    updateTimerUI();
    syncPopButtonState();
  });
  logStudyBtn.addEventListener('click', logTimerToToday);
  updateGoalBtn.addEventListener('click', setDailyGoal);
  prevMonthBtn.addEventListener('click', () => changeMonth(-1));
  nextMonthBtn.addEventListener('click', () => changeMonth(1));
  refreshQuoteBtn.addEventListener('click', updateQuote);
  popTrigger.addEventListener('click', openPopModal);
  closePopBtn.addEventListener('click', closePopModal);
  if (popStartPauseBtn) popStartPauseBtn.addEventListener('click', popToggleTimer);
  if (popResetBtn) popResetBtn.addEventListener('click', popResetTimer);
  
  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === popModal) closePopModal();
  });

  // initialize everything
  loadLocalData();
  updateStats();
  renderTinyCalendar();
  updateQuote();
  resetTimer();
  updateTimerUI();
  
  // extra sync for pop modal live updates while open
  setInterval(() => {
    if (popModal && popModal.style.display === 'flex') updateTimerUI();
  }, 200);
})();