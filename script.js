// ----------------------------- SCRIPT.JS ---------------------------------
// Study Tracker with Pomodoro Timer + Standard Timer (counts past 60 min)

(function() {
  // ----- DATA -----
  let studyLog = {};
  let dailyGoalMin = 45;
  let currentDisplayDate = new Date();

  // ----- STANDARD TIMER -----
  let totalSeconds = 0;
  let timerInterval = null;
  let isTimerRunning = false;

  // ----- POMODORO TIMER -----
  let pomodoroSeconds = 25 * 60;
  let pomodoroInterval = null;
  let isPomodoroRunning = false;
  let currentPhase = 'focus'; // 'focus', 'break', 'longBreak'
  let cycleCount = 1;
  let focusMinutes = 25;
  let breakMinutes = 5;
  let longBreakMinutes = 15;
  let originalPomodoroSeconds = 25 * 60;

  // ----- DOM Elements -----
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

  // Pomodoro Elements
  const pomodoroMinutesSpan = document.getElementById('pomodoroMinutes');
  const pomodoroSecondsSpan = document.getElementById('pomodoroSeconds');
  const pomodoroStartPauseBtn = document.getElementById('pomodoroStartPauseBtn');
  const pomodoroResetBtn = document.getElementById('pomodoroResetBtn');
  const pomodoroSkipBtn = document.getElementById('pomodoroSkipBtn');
  const pomodoroPhaseSpan = document.getElementById('pomodoroPhase');
  const cycleCountSpan = document.getElementById('cycleCount');
  const focusTimeInput = document.getElementById('focusTimeInput');
  const breakTimeInput = document.getElementById('breakTimeInput');
  const longBreakInput = document.getElementById('longBreakInput');
  const pomodoroFeedback = document.getElementById('pomodoroFeedback');

  // Tab Elements
  const standardTabBtn = document.getElementById('standardTabBtn');
  const pomodoroTabBtn = document.getElementById('pomodoroTabBtn');
  const standardPanel = document.getElementById('standardTimerPanel');
  const pomodoroPanel = document.getElementById('pomodoroPanel');

  // Popout Modal
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

  function loadLocalData() {
    const stored = localStorage.getItem('focusTilesData');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        studyLog = parsed.studyLog || {};
        dailyGoalMin = parsed.dailyGoalMin || 45;
      } catch (e) {}
    }
    goalInput.value = dailyGoalMin;
  }

  function persistData() {
    const toStore = { studyLog: studyLog, dailyGoalMin: dailyGoalMin };
    localStorage.setItem('focusTilesData', JSON.stringify(toStore));
  }

  function updateStats() {
    let hitCount = 0;
    for (let dateKey in studyLog) {
      if (studyLog[dateKey] >= dailyGoalMin) hitCount++;
    }
    totalHitSpan.innerText = hitCount;

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

  function addStudyMinutes(minutesToAdd) {
    if (minutesToAdd <= 0) {
      logFeedbackDiv.innerText = "⏱️ No minutes to log.";
      setTimeout(() => logFeedbackDiv.innerText = "", 1500);
      return false;
    }
    const today = getTodayKey();
    const currentMins = studyLog[today] || 0;
    const newTotal = currentMins + minutesToAdd;
    studyLog[today] = newTotal;
    persistData();
    renderTinyCalendar();
    updateStats();
    logFeedbackDiv.innerText = `🎉 Logged ${minutesToAdd} min! Today: ${newTotal} / ${dailyGoalMin} min.`;
    setTimeout(() => { if (logFeedbackDiv) logFeedbackDiv.innerText = ""; }, 2500);
    return true;
  }

  // ----- STANDARD TIMER (counts past 60) -----
  function updateTimerUI() {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    timerMinutesSpan.innerText = mins.toString().padStart(2, '0');
    timerSecondsSpan.innerText = secs.toString().padStart(2, '0');
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

  function logTimerToToday() {
    const minutesToAdd = Math.floor(totalSeconds / 60);
    if (minutesToAdd === 0 && totalSeconds > 0) {
      addStudyMinutes(1);
    } else {
      addStudyMinutes(minutesToAdd);
    }
    resetTimer();
  }

  // ----- POMODORO TIMER -----
  function updatePomodoroDisplay() {
    const mins = Math.floor(pomodoroSeconds / 60);
    const secs = pomodoroSeconds % 60;
    pomodoroMinutesSpan.innerText = mins.toString().padStart(2, '0');
    pomodoroSecondsSpan.innerText = secs.toString().padStart(2, '0');
  }

  function getPhaseDuration() {
    if (currentPhase === 'focus') return focusMinutes * 60;
    if (currentPhase === 'break') return breakMinutes * 60;
    return longBreakMinutes * 60;
  }

  function switchPhase() {
    if (currentPhase === 'focus') {
      if (cycleCount === 4) {
        currentPhase = 'longBreak';
        pomodoroPhaseSpan.innerText = 'Long Break 🧘';
        pomodoroSeconds = longBreakMinutes * 60;
        pomodoroFeedback.innerText = '✨ Long break! Great work on 4 cycles! ✨';
        setTimeout(() => pomodoroFeedback.innerText = '', 3000);
      } else {
        currentPhase = 'break';
        pomodoroPhaseSpan.innerText = 'Short Break ☕';
        pomodoroSeconds = breakMinutes * 60;
      }
    } else if (currentPhase === 'break') {
      currentPhase = 'focus';
      cycleCount++;
      cycleCountSpan.innerText = cycleCount;
      pomodoroPhaseSpan.innerText = 'Focus Time 🎯';
      pomodoroSeconds = focusMinutes * 60;
      pomodoroFeedback.innerText = `Cycle ${cycleCount}/4 - Stay focused! 🔥`;
      setTimeout(() => pomodoroFeedback.innerText = '', 2000);
    } else if (currentPhase === 'longBreak') {
      currentPhase = 'focus';
      cycleCount = 1;
      cycleCountSpan.innerText = cycleCount;
      pomodoroPhaseSpan.innerText = 'Focus Time 🎯';
      pomodoroSeconds = focusMinutes * 60;
      pomodoroFeedback.innerText = 'New session started! Let\'s go! 🚀';
      setTimeout(() => pomodoroFeedback.innerText = '', 2000);
    }
    updatePomodoroDisplay();
  }

  function pomodoroTick() {
    if (pomodoroSeconds > 0) {
      pomodoroSeconds--;
      updatePomodoroDisplay();
    } else {
      // Time's up! Switch phase
      if (currentPhase === 'focus') {
        const focusMinsLogged = focusMinutes;
        addStudyMinutes(focusMinsLogged);
        pomodoroFeedback.innerText = `✅ Focus complete! +${focusMinsLogged} min logged!`;
        setTimeout(() => pomodoroFeedback.innerText = '', 2500);
      }
      switchPhase();
    }
  }

  function startPomodoro() {
    if (pomodoroInterval) clearInterval(pomodoroInterval);
    isPomodoroRunning = true;
    pomodoroInterval = setInterval(() => {
      if (isPomodoroRunning) {
        pomodoroTick();
      }
    }, 1000);
  }

  function pausePomodoro() {
    isPomodoroRunning = false;
    if (pomodoroInterval) {
      clearInterval(pomodoroInterval);
      pomodoroInterval = null;
    }
  }

  function resetPomodoro() {
    pausePomodoro();
    currentPhase = 'focus';
    cycleCount = 1;
    cycleCountSpan.innerText = cycleCount;
    pomodoroPhaseSpan.innerText = 'Focus Time 🎯';
    focusMinutes = parseInt(focusTimeInput.value) || 25;
    breakMinutes = parseInt(breakTimeInput.value) || 5;
    longBreakMinutes = parseInt(longBreakInput.value) || 15;
    pomodoroSeconds = focusMinutes * 60;
    updatePomodoroDisplay();
    pomodoroStartPauseBtn.innerHTML = '<i class="fas fa-play"></i> Start';
  }

  function togglePomodoro() {
    if (isPomodoroRunning) {
      pausePomodoro();
      pomodoroStartPauseBtn.innerHTML = '<i class="fas fa-play"></i> Start';
    } else {
      startPomodoro();
      pomodoroStartPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
    }
  }

  function skipPomodoro() {
    if (currentPhase === 'focus') {
      const loggedMins = Math.ceil((focusMinutes * 60 - pomodoroSeconds) / 60);
      if (loggedMins > 0) addStudyMinutes(loggedMins);
    }
    pomodoroSeconds = 0;
    pomodoroTick();
  }

  function updatePomodoroSettings() {
    if (!isPomodoroRunning) {
      focusMinutes = parseInt(focusTimeInput.value) || 25;
      breakMinutes = parseInt(breakTimeInput.value) || 5;
      longBreakMinutes = parseInt(longBreakInput.value) || 15;
      if (currentPhase === 'focus') {
        pomodoroSeconds = focusMinutes * 60;
      } else if (currentPhase === 'break') {
        pomodoroSeconds = breakMinutes * 60;
      } else {
        pomodoroSeconds = longBreakMinutes * 60;
      }
      updatePomodoroDisplay();
    }
  }

  // ----- TAB SWITCHING -----
  function switchToStandard() {
    standardTabBtn.classList.add('active');
    pomodoroTabBtn.classList.remove('active');
    standardPanel.classList.add('active-panel');
    pomodoroPanel.classList.remove('active-panel');
    pausePomodoro();
    pomodoroStartPauseBtn.innerHTML = '<i class="fas fa-play"></i> Start';
  }

  function switchToPomodoro() {
    pomodoroTabBtn.classList.add('active');
    standardTabBtn.classList.remove('active');
    pomodoroPanel.classList.add('active-panel');
    standardPanel.classList.remove('active-panel');
    pauseTimer();
    startPauseBtn.innerHTML = '<i class="fas fa-play"></i> Start';
  }

  // ----- CALENDAR -----
  function renderTinyCalendar() {
    const year = currentDisplayDate.getFullYear();
    const month = currentDisplayDate.getMonth();
    const firstDay = new Date(year, month, 1);
    let startWeekday = firstDay.getDay();
    let offset = (startWeekday === 0 ? 6 : startWeekday - 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    monthYearLabel.innerText = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    tinyGrid.innerHTML = '';

    for (let i = 0; i < offset; i++) {
      let emptyDiv = document.createElement('div');
      emptyDiv.classList.add('tiny-square');
      emptyDiv.style.opacity = '0.2';
      emptyDiv.style.background = '#2A1C14';
      tinyGrid.appendChild(emptyDiv);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const dateKey = formatDateKey(cellDate);
      const minutesStudied = studyLog[dateKey] || 0;
      const goalHit = (minutesStudied >= dailyGoalMin);
      const square = document.createElement('div');
      square.classList.add('tiny-square');
      square.innerText = d;
      if (goalHit) square.classList.add('goal-hit');
      tinyGrid.appendChild(square);
    }
    updateStats();
  }

  function changeMonth(delta) {
    currentDisplayDate.setMonth(currentDisplayDate.getMonth() + delta);
    renderTinyCalendar();
  }

  function setDailyGoal() {
    let newGoal = parseInt(goalInput.value, 10);
    if (isNaN(newGoal) || newGoal < 1) newGoal = 30;
    dailyGoalMin = newGoal;
    persistData();
    renderTinyCalendar();
    updateStats();
    logFeedbackDiv.innerText = `✨ Goal set to ${dailyGoalMin} minutes ✨`;
    setTimeout(() => logFeedbackDiv.innerText = "", 1800);
  }

  // ----- QUOTES -----
  const quotesBank = [
    "🔥 Small daily disciplines become mighty habits.",
    "📘 Progress, not perfection. One tile at a time.",
    "🧠 Your future self will thank you for today's focus.",
    "⭐ The only bad study session is the one that didn't happen.",
    "⚡ Goals are dreams with deadlines. Go hit that square!",
    "💪 Don't stop when you're tired. Stop when you're done.",
    "🌈 You don't have to be extreme, just consistent.",
    "🎯 Every minute of study adds a brick to your masterpiece.",
    "🍅 Pomodoro technique: 25 min focus, 5 min rest. Repeat!",
    "🚀 Consistency beats intensity. Keep showing up."
  ];

  function updateQuote() {
    const rand = Math.floor(Math.random() * quotesBank.length);
    quoteDiv.innerText = quotesBank[rand];
  }

  // ----- POPOUT MODAL -----
  function openPopModal() {
    popModal.style.display = 'flex';
    updateTimerUI();
    if (popStartPauseBtn) {
      if (isTimerRunning) popStartPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Start/Pause';
      else popStartPauseBtn.innerHTML = '<i class="fas fa-play"></i> Start/Pause';
    }
  }

  function closePopModal() {
    popModal.style.display = 'none';
  }

  function popToggleTimer() {
    toggleStartPause();
    if (popStartPauseBtn) {
      if (isTimerRunning) popStartPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Start/Pause';
      else popStartPauseBtn.innerHTML = '<i class="fas fa-play"></i> Start/Pause';
    }
  }

  function popResetTimer() {
    resetTimer();
    updateTimerUI();
    if (popStartPauseBtn) popStartPauseBtn.innerHTML = '<i class="fas fa-play"></i> Start/Pause';
  }

  // ----- EVENT LISTENERS -----
  startPauseBtn.addEventListener('click', toggleStartPause);
  timerResetBtn.addEventListener('click', () => { resetTimer(); updateTimerUI(); });
  logStudyBtn.addEventListener('click', logTimerToToday);
  updateGoalBtn.addEventListener('click', setDailyGoal);
  prevMonthBtn.addEventListener('click', () => changeMonth(-1));
  nextMonthBtn.addEventListener('click', () => changeMonth(1));
  refreshQuoteBtn.addEventListener('click', updateQuote);

  pomodoroStartPauseBtn.addEventListener('click', togglePomodoro);
  pomodoroResetBtn.addEventListener('click', resetPomodoro);
  pomodoroSkipBtn.addEventListener('click', skipPomodoro);
  focusTimeInput.addEventListener('change', updatePomodoroSettings);
  breakTimeInput.addEventListener('change', updatePomodoroSettings);
  longBreakInput.addEventListener('change', updatePomodoroSettings);

  standardTabBtn.addEventListener('click', switchToStandard);
  pomodoroTabBtn.addEventListener('click', switchToPomodoro);

  popTrigger.addEventListener('click', openPopModal);
  closePopBtn.addEventListener('click', closePopModal);
  popStartPauseBtn.addEventListener('click', popToggleTimer);
  popResetBtn.addEventListener('click', popResetTimer);
  window.addEventListener('click', (e) => { if (e.target === popModal) closePopModal(); });

  // Initialization
  loadLocalData();
  updateStats();
  renderTinyCalendar();
  updateQuote();
  resetTimer();
  resetPomodoro();
  updateTimerUI();
  switchToStandard();

  setInterval(() => {
    if (popModal && popModal.style.display === 'flex') updateTimerUI();
  }, 200);
})();
