const $ = id => document.getElementById(id);
const play = id => { const a = $(id); if(a) { a.currentTime = 0; a.play().catch(()=>{}); }};
const pad = n => String(n).padStart(2, '0');
const fmtTime = s => `${pad(Math.floor(s/60))}:${pad(s%60)}`;
const fmtTime3 = s => `${pad(Math.floor(s/3600))}:${pad(Math.floor((s%3600)/60))}:${pad(s%60)}`;

let focused = null, currentSection = 'timer';

// Background
const bgImgs = Array.from({length: 16}, (_, i) => `./IMG/background-image/bgimg-${i+1}.jpg`);
const bg = document.querySelectorAll('.bg-img');
let bgIdx = 0, bgVis = 0;
setInterval(() => {
  const next = (bgVis + 1) % 2;
  bgIdx = (bgIdx + 1) % bgImgs.length;
  bg[next].src = bgImgs[bgIdx];
  bg[bgVis].classList.remove('active');
  bg[next].classList.add('active');
  bgVis = next;
}, 10000);

// Sidebar
function toggleSidebar() {
  const sidebar = $('sidebar');
  const overlay = $('mobile-overlay');
  
  if (window.innerWidth <= 1024) {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
  } else {
    sidebar.classList.toggle('collapsed');
  }
  play('snd-click');
}

// Section
function switchSection(section) {
  play('snd-click');
  currentSection = section;
  
  // Home タブの特別処理
  if (section === 'home') {
    document.body.classList.add('home-active');
  } else {
    document.body.classList.remove('home-active');
  }
  
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  $(`section-${section}`).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  const navItem = Array.from(document.querySelectorAll('.nav-item')).find(item => 
    item.getAttribute('onclick') && item.getAttribute('onclick').includes(`'${section}'`)
  );
  if (navItem) navItem.classList.add('active');
  
  if (window.innerWidth <= 1024) {
    $('sidebar').classList.remove('open');
    $('mobile-overlay').classList.remove('show');
  }
  checkVis();
  updateYoutubeControls();
}

// Keyboard
document.addEventListener('keydown', e => {
  if (e.target.tagName !== 'INPUT' && e.target.contentEditable !== 'true' && !e.target.classList.contains('calc-btn')) {
    const key = e.key;
    const sections = ['home', 'timer', 'clock', 'weather', 'stopwatch', 'custom-timer', 'memo', 'gemini', 'calculator'];
    const idx = parseInt(key) - 1;
    if (idx >= 0 && idx < sections.length) {
      switchSection(sections[idx]);
    } else if (key === ' ' && currentSection === 'timer') {
      e.preventDefault();
      toggleTimer();
    }
  }
  
  if (currentSection === 'calculator' && e.target.tagName !== 'INPUT') {
    if (/^[0-9]$/.test(e.key)) calcInput(e.key);
    else if (['+', '-', '*', '/', '%', '.'].includes(e.key)) calcInput(e.key);
    else if (e.key === 'Enter' || e.key === '=') calcEquals();
    else if (e.key === 'Escape' || e.key === 'c') clearCalc();
    else if (e.key === 'Backspace') backspaceCalc();
  }
  
  if (focused) {
    if (e.ctrlKey && !e.shiftKey && e.key === 'b') { e.preventDefault(); fmt('bold'); }
    else if (e.ctrlKey && !e.shiftKey && e.key === 'u') { e.preventDefault(); fmt('underline'); }
    else if (e.ctrlKey && e.shiftKey && e.key === '>') { e.preventDefault(); fmt('larger'); }
    else if (e.ctrlKey && e.shiftKey && e.key === '<') { e.preventDefault(); fmt('smaller'); }
  }
});

// Format
function fmt(a) {
  if (!focused) return;
  focused.focus();
  if (a === 'bold') document.execCommand('bold');
  else if (a === 'underline') document.execCommand('underline');
  else if (a === 'larger' || a === 'smaller') {
    const sel = window.getSelection();
    if (sel.rangeCount > 0 && !sel.isCollapsed) {
      const delta = a === 'larger' ? 2 : -2;
      const range = sel.getRangeAt(0);
      const span = document.createElement('span');
      try {
        range.surroundContents(span);
        span.style.fontSize = (parseFloat(getComputedStyle(span).fontSize) + delta) + 'px';
      } catch(e) {
        const frag = range.extractContents();
        span.appendChild(frag);
        span.style.fontSize = (parseFloat(getComputedStyle(focused).fontSize) + delta) + 'px';
        range.insertNode(span);
      }
    }
  }
}

// Search
function doSearch() {
  const q = $('search').value.trim();
  if (q) {
    window.open('https://www.google.com/search?q=' + encodeURIComponent(q), '_blank');
    $('search').value = '';
  }
}

// Alert
function showAlert(title, msg) {
  $('alert-title').textContent = title;
  $('alert-msg').textContent = msg;
  $('alert').classList.add('show');
}
function hideAlert() { $('alert').classList.remove('show'); }

// Stats
let stats = JSON.parse(localStorage.getItem('work-stats') || '{"sessions":0,"minutes":0,"today":0,"lastDate":"","streak":0}');

function updateStats() {
  const today = new Date().toDateString();
  if (stats.lastDate !== today) {
    if (stats.today > 0) {
      const lastD = new Date(stats.lastDate);
      const todayD = new Date(today);
      const diff = Math.floor((todayD - lastD) / (1000 * 60 * 60 * 24));
      if (diff === 1) stats.streak++;
      else if (diff > 1) stats.streak = 1;
    }
    stats.today = 0;
    stats.lastDate = today;
  }
  localStorage.setItem('work-stats', JSON.stringify(stats));
}

function showStats() {
  play('snd-click');
  updateStats();
  $('stat-sessions').textContent = stats.sessions;
  $('stat-minutes').textContent = stats.minutes;
  $('stat-today').textContent = stats.today;
  $('stat-streak').textContent = stats.streak;
  $('stats-modal').classList.add('show');
}

function hideStats() {
  play('snd-click');
  $('stats-modal').classList.remove('show');
}

// Settings
let sets = JSON.parse(localStorage.getItem('sets') || '{"work":25,"break":5,"repeat":0}');
$('set-work').value = sets.work;
$('set-break').value = sets.break;
$('set-repeat').value = sets.repeat;

function showSettings() {
  play('snd-click');
  $('settings').classList.add('show');
}
function saveSettings() {
  play('snd-click');
  sets.work = parseInt($('set-work').value) || 25;
  sets.break = parseInt($('set-break').value) || 5;
  sets.repeat = parseInt($('set-repeat').value) || 0;
  localStorage.setItem('sets', JSON.stringify(sets));
  pomoT = sets.work;
  shortT = sets.break;
  if (timerType === 'pomodoro') timeLeft = pomoT * 60;
  else if (timerType === 'short') timeLeft = shortT * 60;
  updateTimer();
  hideSettings();
}
function hideSettings() {
  play('snd-click');
  $('settings').classList.remove('show');
}

// Pomodoro
let pomoT = sets.work, shortT = sets.break, longT = 15;
let timerType = 'pomodoro', timeLeft = pomoT * 60, timerInt = null, timerRun = false;
let cycles = 0, isWork = true, initialTime = pomoT * 60;

function updateTimer() {
  const str = fmtTime(timeLeft);
  $('timer').textContent = str;
  $('float-timer-time').textContent = str;
  
  // タイマータイプを更新
  const typeNames = {
    'pomodoro': 'Pomodoro',
    'short': 'Short Break',
    'long': 'Long Break'
  };
  const floatTypeEl = $('float-timer-type');
  if (floatTypeEl) {
    floatTypeEl.textContent = typeNames[timerType] || 'Timer';
  }
  
  const progress = (timeLeft / initialTime) * 100;
  $('progress-bar').style.width = progress + '%';
  $('current-session').textContent = cycles;
  $('total-today').textContent = stats.today;
  $('next-break').textContent = isWork ? fmtTime(shortT * 60) : fmtTime(pomoT * 60);
}

function switchTimer(type) {
  if (timerRun) {
    clearInterval(timerInt);
    timerRun = false;
    $('start').textContent = 'Start';
    updateQuickPlayIcon(false);
  }
  timerType = type;
  document.body.className = type === 'short' ? 'short-break' : type === 'long' ? 'long-break' : '';
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-btn')[type === 'pomodoro' ? 0 : type === 'short' ? 1 : 2].classList.add('active');
  isWork = type === 'pomodoro';
  timeLeft = initialTime = type === 'pomodoro' ? pomoT * 60 : type === 'short' ? shortT * 60 : longT * 60;
  updateTimer(); // これが必要
}

function toggleTimer() {
  play('snd-click');
  if (timerRun) {
    clearInterval(timerInt);
    timerRun = false;
    $('start').textContent = 'Start';
    updateQuickPlayIcon(false);
  } else {
    timerRun = true;
    $('start').textContent = 'Pause';
    updateQuickPlayIcon(true);
    timerInt = setInterval(() => {
      if (--timeLeft <= 0) {
        clearInterval(timerInt);
        timerRun = false;
        $('start').textContent = 'Start';
        updateQuickPlayIcon(false);
        if (isWork) {
          cycles++;
          stats.sessions++;
          stats.today++;
          stats.minutes += pomoT;
          updateStats();
          play('snd-pomo');
          showAlert('作業完了！', '休憩時間です');
          if (sets.repeat === 0 || cycles < sets.repeat) {
            setTimeout(() => { switchTimer('short'); toggleTimer(); }, 3000);
          }
        } else {
          play('snd-timer');
          showAlert('休憩終了！', '次の作業を始めましょう');
          if (sets.repeat === 0 || cycles < sets.repeat) {
            setTimeout(() => { switchTimer('pomodoro'); toggleTimer(); }, 3000);
          }
        }
      }
      updateTimer();
    }, 1000);
  }
}

function resetTimer() {
  play('snd-click');
  if (timerRun) {
    clearInterval(timerInt);
    timerRun = false;
    $('start').textContent = 'Start';
    updateQuickPlayIcon(false);
  }
  cycles = 0;
  switchTimer(timerType);
}

function updateQuickPlayIcon(playing) {
  const icon = $('quick-play-icon');
  if (playing) {
    icon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
  } else {
    icon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
  }
}

// Float visibility
function checkVis() {
  const scrollTop = document.querySelector('.content').scrollTop;
  const shouldShow = scrollTop > 200;
  
  // タイマーが動いている かつ timerタブ以外にいる場合に表示
  const showTimer = currentSection !== 'timer' && timerRun;
  const showClock = shouldShow && currentSection !== 'clock';
  
  $('float-timer').classList.toggle('show', showTimer);
  $('float-clock').classList.toggle('show', showClock);
}

document.querySelector('.content').addEventListener('scroll', checkVis);
window.addEventListener('resize', checkVis);

// Custom Timer
let ctTime = 0, ctInt = null, ctRun = false, ctInitial = 0;
function updateCT() {
  $('ct').textContent = fmtTime3(ctTime);
  if (ctInitial > 0) {
    const progress = (ctTime / ctInitial) * 100;
    $('ct-progress').style.width = progress + '%';
    updateTimer();
  }
}
function toggleCT() {
  play('snd-click');
  if (ctRun) {
    clearInterval(ctInt);
    ctRun = false;
    $('ct-btn').textContent = 'Start';
  } else {
    if (ctTime === 0) {
      ctTime = ctInitial = (parseInt($('ct-h').value) || 0) * 3600 + (parseInt($('ct-m').value) || 0) * 60 + (parseInt($('ct-s').value) || 0);
      if (ctTime === 0) return alert('Please set the time');
    }
    ctRun = true;
    $('ct-btn').textContent = 'Pause';
    ctInt = setInterval(() => {
      if (--ctTime <= 0) {
        clearInterval(ctInt);
        ctRun = false;
        ctTime = 0;
        ctInitial = 0;
        $('ct-btn').textContent = 'Start';
        play('snd-timer');
        showAlert('Time Up！', 'カスタムタイマーが終了しました');
      }
      updateCT();
    }, 1000);
  }
}
function resetCT() {
  play('snd-click');
  clearInterval(ctInt);
  ctRun = false;
  ctTime = 0;
  ctInitial = 0;
  $('ct-btn').textContent = 'Start';
  $('ct-h').value = $('ct-m').value = $('ct-s').value = 0;
  updateCT();
}

// Stopwatch
let swTime = 0, swInt = null, swRun = false, lapCnt = 0;
function updateSW() { $('sw').textContent = fmtTime3(swTime); }
function toggleSW() {
  play('snd-click');
  if (swRun) {
    clearInterval(swInt);
    swRun = false;
    $('sw-btn').textContent = 'Start';
  } else {
    swRun = true;
    $('sw-btn').textContent = 'Pause';
    swInt = setInterval(() => { swTime++; updateSW(); }, 1000);
  }
}
function lapSW() {
  if (swRun) {
    play('snd-lap');
    const lap = document.createElement('div');
    lap.className = 'lap-item';
    lap.innerHTML = `<span>Lap ${++lapCnt}</span><span>${fmtTime3(swTime)}</span>`;
    $('laps').insertBefore(lap, $('laps').firstChild);
  }
}
function resetSW() {
  play('snd-click');
  clearInterval(swInt);
  swRun = false;
  swTime = lapCnt = 0;
  $('sw-btn').textContent = 'Start';
  $('laps').innerHTML = '';
  updateSW();
}

// Calculator
let calcStr = '0', calcPrev = 0, calcOp = null, calcNew = true;
let calcHistory = [];

function calcInput(v) {
  play('snd-click');
  if (calcNew && !isNaN(v)) {
    calcStr = v;
    calcNew = false;
  } else if (['+','-','*','/','%'].includes(v)) {
    if (!calcNew) {
      calcEquals();
    }
    calcPrev = parseFloat(calcStr);
    calcOp = v;
    calcNew = true;
  } else {
    if (calcStr === '0' && v !== '.') {
      calcStr = v;
    } else {
      calcStr += v;
    }
  }
  $('calc-display').textContent = calcStr;
}

function calcEquals() {
  play('snd-click');
  const curr = parseFloat(calcStr);
  let result = curr;
  let historyStr = '';
  
  if (calcOp) {
    historyStr = `${calcPrev} ${calcOp} ${curr} = `;
    if (calcOp === '+') result = calcPrev + curr;
    else if (calcOp === '-') result = calcPrev - curr;
    else if (calcOp === '*') result = calcPrev * curr;
    else if (calcOp === '/') result = calcPrev / curr;
    else if (calcOp === '%') result = calcPrev % curr;
  }
  
  calcStr = String(result);
  $('calc-display').textContent = calcStr;
  
  if (historyStr) {
    historyStr += result;
    calcHistory.push(historyStr);
    updateCalcHistory();
  }
  
  calcNew = true;
  calcOp = null;
}

function clearCalc() {
  play('snd-click');
  calcStr = '0';
  calcPrev = 0;
  calcOp = null;
  calcNew = true;
  $('calc-display').textContent = '0';
}

function backspaceCalc() {
  play('snd-click');
  if (calcStr.length > 1) {
    calcStr = calcStr.slice(0, -1);
  } else {
    calcStr = '0';
  }
  $('calc-display').textContent = calcStr;
}

function updateCalcHistory() {
  const history = $('calc-history');
  history.innerHTML = '';
  calcHistory.slice(-5).forEach(item => {
    const div = document.createElement('div');
    div.className = 'calc-history-item';
    div.textContent = item;
    history.appendChild(div);
  });
}

// Memo
const memo = $('memo');
const memoFiles = {};
if (localStorage.memo) memo.innerHTML = localStorage.memo;
if (localStorage.memoFiles) {
  try {
    Object.assign(memoFiles, JSON.parse(localStorage.memoFiles));
  } catch(e) {}
}

function saveMemo() {
  localStorage.memo = memo.innerHTML;
}

function clearMemo() {
  if (confirm('Clear all notes?')) {
    memo.innerHTML = '';
    localStorage.removeItem('memo');
    Object.keys(memoFiles).forEach(k => delete memoFiles[k]);
    localStorage.removeItem('memoFiles');
    renderMemoFiles();
  }
}

function handleMemoFile(e) {
  const files = e.target.files;
  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => {
      const id = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      memoFiles[id] = {
        name: file.name,
        type: file.type,
        data: ev.target.result
      };
      localStorage.memoFiles = JSON.stringify(memoFiles);
      renderMemoFiles();
      
      if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = ev.target.result;
        img.className = 'memo-image';
        img.onclick = () => window.open(ev.target.result, '_blank');
        memo.appendChild(img);
        saveMemo();
      } else if (file.type === 'text/plain') {
        const reader2 = new FileReader();
        reader2.onload = e2 => {
          const div = document.createElement('div');
          div.style.cssText = 'background:rgba(255,255,255,0.1);padding:10px;border-radius:6px;margin:8px 0;';
          div.textContent = e2.target.result;
          memo.appendChild(div);
          saveMemo();
        };
        reader2.readAsText(file);
      }
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}

function renderMemoFiles() {
  const container = $('memo-files');
  container.innerHTML = '';
  Object.entries(memoFiles).forEach(([id, file]) => {
    const div = document.createElement('div');
    div.className = 'memo-file';
    div.innerHTML = `
      <span>${file.name}</span>
      <button class="memo-file-remove" onclick="removeMemoFile('${id}')">×</button>
    `;
    div.onclick = e => {
      if (e.target.tagName !== 'BUTTON') {
        if (file.type.startsWith('image/')) {
          window.open(file.data, '_blank');
        } else {
          const a = document.createElement('a');
          a.href = file.data;
          a.download = file.name;
          a.click();
        }
      }
    };
    container.appendChild(div);
  });
}

function removeMemoFile(id) {
  delete memoFiles[id];
  localStorage.memoFiles = JSON.stringify(memoFiles);
  renderMemoFiles();
}

function insertLink() {
  const url = prompt('Enter URL:');
  if (url) {
    const name = prompt('Enter link name:') || url;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.textContent = name;
    a.style.cssText = 'color:#2bac76;text-decoration:underline;';
    memo.appendChild(a);
    memo.appendChild(document.createTextNode(' '));
    saveMemo();
  }
}

renderMemoFiles();

// Clock
function updateClocks() {
  const now = new Date();
  const t = fmtTime3(now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds());
  $('time').textContent = t;
  $('float-clock-time').textContent = t;
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
  $('date').textContent = `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()} (${wd})`;
  
  const getTZ = tz => {
    const d = new Date(now.toLocaleString('en-US', {timeZone: tz}));
    return fmtTime3(d.getHours()*3600+d.getMinutes()*60+d.getSeconds());
  };
  
  $('tokyo').textContent = getTZ('Asia/Tokyo');
  $('ny').textContent = getTZ('America/New_York');
  $('london').textContent = getTZ('Europe/London');
}
updateClocks();
setInterval(updateClocks, 1000);

function updateHomeClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const homeClockEl = $('home-clock');
  if (homeClockEl) {
    homeClockEl.textContent = `${hours}:${minutes}:${seconds}`;
  }
}
updateHomeClock();
setInterval(updateHomeClock, 1000);
// Weather
function loadWeather() {
  fetch(`https://api.openweathermap.org/data/2.5/weather?lat=35.85272206403399&lon=136.28673448772105&appid=8eb6dc5492a964ea79dd0ef92f1ae01c&units=metric&lang=ja`)
    .then(r => r.json())
    .then(d => {
      $('w-icon').src = `./weather-svg/${d.weather[0].icon}.svg`;
      $('w-icon').style.display = 'block';
      $('w-desc').textContent = d.weather[0].description;
      $('w-temp').textContent = Math.round(d.main.temp) + '°';
      $('w-max').textContent = Math.round(d.main.temp_max);
      $('w-min').textContent = Math.round(d.main.temp_min);
      $('w-loc').textContent = d.name || '指定地点';
    })
    .catch(e => { $('w-desc').textContent = 'Error loading weather'; });
}

function reloadWeather() {
  play('snd-click');
  loadWeather();
  const iframe = $('weather-iframe');
  iframe.src = iframe.src;
}

loadWeather();
setInterval(loadWeather, 1800000);

// Gemini
function sendGemini() {
  const msg = $('gemini').textContent.trim();
  if (!msg) return;
  $('gemini').textContent = '';
  console.log('Message sent to Gemini:', msg);
}

// Quick Links
let quickLinks = JSON.parse(localStorage.getItem('quick-links') || JSON.stringify([
  {name:'GitHub',url:'https://github.com',icon:'<svg viewBox="0 0 24 24" fill="white"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.840 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.430.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>'},
  {name:'ChatGPT',url:'https://chat.openai.com',icon:'<svg viewBox="0 0 24 24" fill="white"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/></svg>'},
  {name:'Claude',url:'https://claude.ai',icon:'<svg viewBox="0 0 24 24" fill="white"><path d="M12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0ZM12 22.1538C6.15385 22.1538 1.84615 17.8462 1.84615 12C1.84615 6.15385 6.15385 1.84615 12 1.84615C17.8462 1.84615 22.1538 6.15385 22.1538 12C22.1538 17.8462 17.8462 22.1538 12 22.1538Z"/><path d="M16.6154 7.38462H7.38462C6.56769 7.38462 5.96154 8.00769 5.96154 8.76923V15.2308C5.96154 15.9923 6.56769 16.6154 7.38462 16.6154H16.6154C17.4323 16.6154 18.0385 15.9923 18.0385 15.2308V8.76923C18.0385 8.00769 17.4323 7.38462 16.6154 7.38462ZM16.6154 15.2308H7.38462V8.76923H16.6154V15.2308Z"/></svg>'},
  {name:'VS Code',url:'https://vscode.dev',icon:'<svg viewBox="0 0 24 24" fill="white"><path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z"/></svg>'},
  {name:'Notion',url:'https://notion.so',icon:'<svg viewBox="0 0 24 24" fill="white"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.336.653c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/></svg>'},
  {name:'Drive',url:'https://drive.google.com',icon:'<svg viewBox="0 0 24 24" fill="white"><path d="M7.71 3.5L1.15 15l3.43 5.5h13.71L22 15l-6.56-11.5H7.71zM8.73 5.5h6.54L19.21 15h-3.09l-3.43-5.5-4.63 8H4.03L8.73 5.5zm-.42 11.5h6.54l-3.26 5.5h-6.54l3.26-5.5z"/></svg>'}
]));

function renderQuickLinksSidebar() {
  const container = $('quick-links-sidebar');
  container.innerHTML = '';
  quickLinks.forEach(link => {
    const a = document.createElement('a');
    a.className = 'quick-link-sidebar-item';
    a.href = link.url;
    a.target = '_blank';
    a.innerHTML = `<div class="quick-link-sidebar-icon">${link.icon}</div>`;
    a.title = link.name;
    container.appendChild(a);
  });
}

function showAppSettings() {
  play('snd-click');
  const edit = $('quick-links-edit');
  edit.innerHTML = '';

  quickLinks.forEach((link, idx) => {
    const container = document.createElement('div');
    container.style.cssText = 'margin-bottom:15px;padding:15px;background:rgba(255,255,255,0.12);backdrop-filter:blur(10px);border-radius:8px;';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Name';
    nameInput.value = link.name;
    nameInput.style.cssText = 'width:100%;padding:8px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.1);border-radius:4px;';
    nameInput.addEventListener('input', (e) => { link.name = e.target.value; });

    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.placeholder = 'URL';
    urlInput.value = link.url;
    urlInput.style.cssText = 'width:100%;padding:8px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.1);border-radius:4px;';
    urlInput.addEventListener('input', (e) => { link.url = e.target.value; });

    const label = document.createElement('label');
    label.style.cssText = 'display:block;padding:8px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.1);color:white;backdrop-filter:blur(10px);border-radius:8px;cursor:pointer;text-align:center;margin-bottom:8px;';
    label.textContent = 'Upload Icon';
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', (e) => uploadQuickLinkIcon(idx, e));
    label.appendChild(fileInput);

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.style.cssText = 'padding:8px 16px;background:rgba(255,255,255,0.12);backdrop-filter:blur(10px);color:white;border:1px solid rgba(255,255,255,0.1);border-radius:8px;cursor:pointer;width:100%;';
    removeBtn.addEventListener('click', () => {
      quickLinks.splice(idx, 1);
      showAppSettings();
    });

    container.append(nameInput, urlInput, label, removeBtn);
    edit.appendChild(container);
  });

  $('app-settings').classList.add('show');
}

function hideAppSettings() {
  play('snd-click');
  localStorage.setItem('quick-links', JSON.stringify(quickLinks));
  renderQuickLinksSidebar();
  $('app-settings').classList.remove('show');
}

function addQuickLink() {
  quickLinks.push({name:'New Link',url:'https://example.com',icon:'<svg viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="10"/></svg>'});
  showAppSettings();
}

function uploadQuickLinkIcon(idx, e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = ev => {
      quickLinks[idx].icon = `<img src="${ev.target.result}">`;
      showAppSettings();
    };
    reader.readAsDataURL(file);
  }
}

renderQuickLinksSidebar();

// Notion
let notionPages = JSON.parse(localStorage.getItem('notion-pages') || JSON.stringify([
  {name:'Tasks',url:'https://todolist-home.notion.site/ebd//2c9ee93cc3e4800aba3ef91a7b2b0a31?v=2c9ee93cc3e480868d75000c8bfe4b7d'},
  {name:'Notes',url:'https://todolist-home.notion.site/ebd//2c9ee93cc3e480d0a9feecd8ab2bc460'}
]));
let notionIdx = 0;

function renderNotionTabs() {
  const tabs = $('notion-tabs');
  tabs.innerHTML = '';
  notionPages.forEach((page, idx) => {
    const btn = document.createElement('button');
    btn.className = 'notion-tab' + (idx === notionIdx ? ' active' : '');
    
    // テキストをspanで包む
    const textSpan = document.createElement('span');
    textSpan.textContent = page.name;
    btn.appendChild(textSpan);
    
    btn.onclick = () => switchNotionPage(idx);
    
    // 2ページ以上ある場合のみ削除ボタンを表示
    if (notionPages.length > 1) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'notion-tab-delete';
      deleteBtn.innerHTML = '×';
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteNotionPage(idx);
      };
      btn.appendChild(deleteBtn);
    }
    
    tabs.appendChild(btn);
  });
  
  if (notionPages.length < 5) {
    const add = document.createElement('button');
    add.className = 'notion-tab notion-add';
    add.textContent = '+ Add';
    add.onclick = addNotionPage;
    tabs.appendChild(add);
  }
}

function deleteNotionPage(idx) {
  if (notionPages.length <= 1) {
    alert('Cannot delete the last page');
    return;
  }
  
  if (confirm(`Delete "${notionPages[idx].name}"?`)) {
    notionPages.splice(idx, 1);
    
    // 削除したページが現在表示中だった場合、インデックスを調整
    if (notionIdx >= notionPages.length) {
      notionIdx = notionPages.length - 1;
    }
    
    localStorage.setItem('notion-pages', JSON.stringify(notionPages));
    $('notion').src = notionPages[notionIdx].url;
    renderNotionTabs();
  }
}

function switchNotionPage(idx) {
  play('snd-click');
  notionIdx = idx;
  $('notion').src = notionPages[idx].url;
  renderNotionTabs();
}

function addNotionPage() {
  if (notionPages.length >= 5) return alert('Maximum 5 pages');
  const url = prompt('Enter Notion page URL:');
  if (url) {
    const name = prompt('Enter page name:') || 'Page ' + (notionPages.length + 1);
    notionPages.push({name, url});
    localStorage.setItem('notion-pages', JSON.stringify(notionPages));
    renderNotionTabs();
  }
}

renderNotionTabs();
setInterval(() => { $('notion').src = $('notion').src; }, 300000);

// YouTube
let ytPlayer = null;
let ytPlaying = false;
let ytPlaylistId = '';

function onYouTubeIframeAPIReady() {
  ytPlayer = new YT.Player('yt-player', {
    height: '390',
    width: '100%',
    playerVars: {
      'playsinline': 1,
      'controls': 1
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

function onPlayerReady(event) {
  setYoutubeVolume(70);
}

function onPlayerStateChange(event) {
  ytPlaying = event.data === YT.PlayerState.PLAYING;
  updateYoutubeControls();
}

function loadYoutubePlaylist() {
  const url = $('yt-playlist').value.trim();
  if (!url) return alert('Please enter a playlist URL');
  
  const match = url.match(/[?&]list=([^&]+)/);
  if (match) {
    ytPlaylistId = match[1];
    if (ytPlayer && ytPlayer.loadPlaylist) {
      ytPlayer.loadPlaylist({
        list: ytPlaylistId,
        listType: 'playlist'
      });
    }
  } else {
    alert('Invalid playlist URL');
  }
}

function updateYoutubeControls() {
  const fixed = $('youtube-fixed-controls');
  
  // YouTubeタブ以外で、かつプレイヤーが存在する場合は常に表示
  if (currentSection !== 'youtube' && ytPlayer) {
    // プレイリストが読み込まれているか確認
    try {
      const playlist = ytPlayer.getPlaylist();
      if (playlist && playlist.length > 0) {
        fixed.classList.add('show');
      } else {
        fixed.classList.remove('show');
      }
    } catch(e) {
      // プレイリストがない場合は再生中のみ表示
      if (ytPlaying) {
        fixed.classList.add('show');
      } else {
        fixed.classList.remove('show');
      }
    }
  } else {
    // YouTubeタブ内では非表示
    fixed.classList.remove('show');
  }
}
function nextYoutube() {
  if (ytPlayer) ytPlayer.nextVideo();
}

function prevYoutube() {
  if (ytPlayer) ytPlayer.previousVideo();
}

function setYoutubeVolume(vol) {
  if (ytPlayer && ytPlayer.setVolume) {
    ytPlayer.setVolume(vol);
    $('yt-vol-display').textContent = vol + '%';
    const fixedVol = $('youtube-volume-fixed');
    if (fixedVol) fixedVol.value = vol;
  }
}

function updateYoutubeControls() {
  const fixed = $('youtube-fixed-controls');
  if (currentSection !== 'youtube' && ytPlaying) {
    fixed.classList.add('show');
  } else {
    fixed.classList.remove('show');
  }
}

window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
setInterval(updateYoutubeControls, 1000);
switchTimer('pomodoro');
loadSettings();

function switchTimer(type) {
  // タイマーが動いている場合は停止
  if (timerRun) {
    clearInterval(timerInt);
    timerRun = false;
    $('start').textContent = 'Start';
    updateQuickPlayIcon(false);
  }
  
  timerType = type;
  document.body.className = type === 'short' ? 'short-break' : type === 'long' ? 'long-break' : '';
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-btn')[type === 'pomodoro' ? 0 : type === 'short' ? 1 : 2].classList.add('active');
  isWork = type === 'pomodoro';
  timeLeft = initialTime = type === 'pomodoro' ? pomoT * 60 : type === 'short' ? shortT * 60 : longT * 60;
  updateTimer();
}

function updateTimer() {
  const min = Math.floor(timeLeft / 60);
  const sec = timeLeft % 60;
  document.getElementById('timer').textContent = `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  document.getElementById('float-timer-time').textContent = `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  const progress = ((initialTime - timeLeft) / initialTime) * 100;
  document.getElementById('timer-progress').style.width = progress + '%';
}


function toggleTimer() {
  play('snd-click');
  if (timerRun) {
    clearInterval(timerInt);
    timerRun = false;
    $('start').textContent = 'Start';
    updateQuickPlayIcon(false);
  } else {
    timerRun = true;
    $('start').textContent = 'Pause';
    updateQuickPlayIcon(true);
    timerInt = setInterval(() => {
      if (--timeLeft <= 0) {
        timerRun = false;
        clearInterval(timerInt);
        $('start').textContent = 'Start';
        updateQuickPlayIcon(false);
        
        if (isWork) {
          cycles++;
          stats.sessions++;
          stats.today++;
          stats.minutes += pomoT;
          updateStats();
          play('snd-pomo');
          showAlert('作業完了！', '休憩時間です');
          
          setTimeout(() => {
            hideAlert();
            switchTimer('short');
            toggleTimer();
          }, 3000);
          
        } else {
          play('snd-timer');
          showAlert('休憩終了！', '次の作業を始めましょう');
          
          setTimeout(() => {
            hideAlert();
            switchTimer('pomodoro');
            toggleTimer();
          }, 3000);
        }
      }
      updateTimer();
    }, 1000);
  }
}

function resetTimer() {
  play('snd-click');
  if (timerRun) {
    clearInterval(timerInt);
    timerRun = false;
    $('start').textContent = 'Start';
    updateQuickPlayIcon(false);
  }
  timeLeft = initialTime;
  updateTimer();
  play('snd-click');
  if (timerRun) {
    clearInterval(timerInt);
    timerRun = false;
    $('start').textContent = 'Start';
    updateQuickPlayIcon(false);
  }
  timeLeft = initialTime;
  updateTimer();
}

function checkVis() {
  const shouldShow = localStorage.getItem('float-timer') === 'true';
  if (!shouldShow) return;
  
  const content = document.querySelector('.content');
  const timerRect = $('timer-section').getBoundingClientRect();
  const contentRect = content.getBoundingClientRect();
  
  const isVisible = timerRect.top < contentRect.bottom && timerRect.bottom > contentRect.top;
  
  $('float-timer').classList.toggle('visible', !isVisible);
}
checkVis();
setInterval(checkVis, 1000);
