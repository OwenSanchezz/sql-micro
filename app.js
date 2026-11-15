import { lessons } from './lessons.js';

const STORE_KEY = 'sql-paso-a-paso-v1';
const screen = document.querySelector('#screen');
const topbar = document.querySelector('#topbar');
const progressFill = document.querySelector('#progress-fill');
const heartCount = document.querySelector('#heart-count');
const PELICULAS = [
  [1,'El laberinto del fauno','Guillermo del Toro',2006,'Fantasía',83.3],
  [2,'Roma','Alfonso Cuarón',2018,'Drama',5.1],
  [3,'Amores perros','Alejandro González Iñárritu',2000,'Drama',20.9],
  [4,'Como agua para chocolate','Alfonso Arau',1992,'Romance',21.7],
  [5,'Güeros','Alonso Ruizpalacios',2014,'Drama',0.4],
  [6,'La forma del agua','Guillermo del Toro',2017,'Fantasía',195.2],
  [7,'Coco','Lee Unkrich',2017,'Animación',807.8],
  [8,'Temporada de patos','Fernando Eimbcke',2004,'Comedia',0.3],
  [9,'Macario','Roberto Gavaldón',1960,'Drama',0.2],
  [10,'Cronos','Guillermo del Toro',1993,'Terror',2.0],
  [11,'Ya no estoy aquí','Fernando Frías',2019,'Drama',0.8],
  [12,'El secreto de sus ojos','Juan José Campanella',2009,'Suspenso',34.6],
];
const DIRECTORES = [
  ['Guillermo del Toro','México',1964],['Alfonso Cuarón','México',1961],
  ['Alejandro González Iñárritu','México',1963],['Alfonso Arau','México',1932],
  ['Alonso Ruizpalacios','México',1978],['Lee Unkrich','Estados Unidos',1967],
  ['Fernando Eimbcke','México',1970],['Roberto Gavaldón','México',1909],
  ['Fernando Frías','México',1971],['Juan José Campanella','Argentina',1959],
  ['María Novaro','México',1951],
];

function safeLoad() {
  const fallback = { completed: [], xp: 0, streak: 0, lastDay: null };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return fallback;
    return {
      completed: Array.isArray(saved.completed) ? saved.completed.filter(id => lessons.some(l => l.id === id)) : [],
      xp: Number.isFinite(saved.xp) && saved.xp >= 0 ? saved.xp : 0,
      streak: Number.isFinite(saved.streak) && saved.streak >= 0 ? saved.streak : 0,
      lastDay: typeof saved.lastDay === 'string' ? saved.lastDay : null,
    };
  } catch { return fallback; }
}
let saved = safeLoad();
function persist() { try { localStorage.setItem(STORE_KEY, JSON.stringify(saved)); } catch { /* El progreso sigue en memoria si el navegador bloquea el almacenamiento. */ } }
function esc(value) { return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function makeDatabase() {
  const db = new window.SQL.Database();
  db.run('CREATE TABLE peliculas (id INTEGER, titulo TEXT, director TEXT, anio INTEGER, genero TEXT, recaudacion REAL);');
  const movie = db.prepare('INSERT INTO peliculas VALUES (?, ?, ?, ?, ?, ?);');
  for (const row of PELICULAS) movie.run(row);
  movie.free();
  db.run('CREATE TABLE directores (nombre TEXT, pais TEXT, anio_nacimiento INTEGER);');
  const director = db.prepare('INSERT INTO directores VALUES (?, ?, ?);');
  for (const row of DIRECTORES) director.run(row);
  director.free();
  return db;
}
function runQuery(sql) {
  const db = makeDatabase();
  try {
    const results = db.exec(sql);
    const result = results[0] || { columns: [], values: [] };
    return { columns: result.columns, values: result.values };
  } finally { db.close(); }
}
function equalResults(actual, expected, orderMatters) {
  if (JSON.stringify(actual.columns) !== JSON.stringify(expected.columns) || actual.values.length !== expected.values.length) return false;
  const normalize = values => orderMatters ? values : [...values].sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return JSON.stringify(normalize(actual.values)) === JSON.stringify(normalize(expected.values));
}
function tableHtml(result) {
  if (!result.columns.length) return '<p class="hint">La consulta no devolvió una tabla de resultados.</p>';
  return `<div class="table-wrap" role="region" aria-label="Resultado de la consulta" tabindex="0"><table class="result-table"><thead><tr>${result.columns.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${result.values.slice(0,100).map(row=>`<tr>${row.map(v=>`<td>${esc(v === null ? 'NULL' : v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${result.values.length>100?'<p class="hint">Se muestran las primeras 100 filas.</p>':''}`;
}
function currentDay() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

let mode = 'home';
let lessonIndex = 0;
let stepIndex = 0;
let hearts = 5;
let earned = 0;
let correct = 0;
let selectedOption = null;
let lockedAnswer = false;
let feedback = '';
let userResult = null;
let challengeState = '';
let sqlReady = false;

function renderHome() {
  mode = 'home'; topbar.hidden = true;
  const cards = lessons.map((lesson,index) => {
    const unlocked = index === 0 || saved.completed.includes(lessons[index-1].id);
    const done = saved.completed.includes(lesson.id);
    return `<button class="lesson-card" data-lesson="${index}" ${unlocked?'':'disabled'}><span class="lesson-icon">${lesson.icon}</span><span><span class="lesson-title">${esc(lesson.title)}</span><span class="lesson-subtitle">${esc(lesson.subtitle)}</span><span class="lesson-progress"><span style="width:${done?'100':'0'}%"></span></span></span><span class="lesson-state">${done?'✓':unlocked?'›':'🔒'}</span></button>`;
  }).join('');
  screen.innerHTML = `<div class="home-head"><span class="brand">SQL · PASO A PASO</span><div class="stats"><span class="stat streak">🔥 ${saved.streak}</span><span class="stat xp">✦ ${saved.xp} XP</span></div></div><span class="eyebrow">Aprende haciendo</span><h1>SQL desde cero.</h1><p>Seis paradas para aprender a consultar y relacionar datos. Tu progreso se guarda en este dispositivo.</p><div class="lesson-list">${cards}</div><div class="spacer"></div>`;
  screen.querySelectorAll('[data-lesson]').forEach(button=>button.addEventListener('click',()=>startLesson(Number(button.dataset.lesson))));
}
function startLesson(index) {
  lessonIndex=index; stepIndex=0; hearts=5; earned=0; correct=0; selectedOption=null; lockedAnswer=false; feedback=''; userResult=null; challengeState='';
  mode='lesson'; renderStep();
}
function updateTopbar() {
  topbar.hidden=false;
  const total=lessons[lessonIndex].steps.length;
  progressFill.style.width=`${Math.round(((stepIndex+1)/total)*100)}%`;
  heartCount.textContent=String(hearts);
  document.querySelector('#back-button').onclick=renderHome;
}
function advance() {
  if (stepIndex+1>=lessons[lessonIndex].steps.length) { finishLesson(); return; }
  stepIndex++; selectedOption=null; lockedAnswer=false; feedback=''; userResult=null; challengeState=''; renderStep();
}
function renderStep() {
  updateTopbar();
  const lesson=lessons[lessonIndex], step=lesson.steps[stepIndex];
  let body=''; let buttonText='Continuar'; let disabled=false;
  if (step.type==='teoria') {
    body=`<span class="eyebrow">Idea clave</span><h2>${esc(step.title)}</h2><p>${esc(step.text)}</p><pre class="code-block">${esc(step.code)}</pre>`;
  } else if (step.type==='quiz') {
    body=`<span class="eyebrow">Pregunta rápida</span><h2>${esc(step.title)}</h2><p class="question">${esc(step.question)}</p><div class="option-list">${step.options.map((option,index)=>{const cls=selectedOption===index?(index===step.answer&&lockedAnswer?'correct':lockedAnswer?'wrong':'selected'):'';return `<button class="option ${cls}" data-option="${index}" ${lockedAnswer?'disabled':''}>${esc(option)}</button>`;}).join('')}</div><div class="feedback ${feedback.startsWith('¡')?'success-message':'error-message'}">${esc(feedback)}</div>`;
    buttonText=lockedAnswer&&selectedOption===step.answer?'Continuar':'Comprobar'; disabled=selectedOption===null||lockedAnswer&&selectedOption!==step.answer;
  } else {
    body=`<span class="eyebrow">Reto ${lessonIndex+1} de 6</span><h2>${esc(step.title)}</h2><p>${esc(step.prompt)}</p><label class="editor-label" for="sql-input">Tu consulta</label><textarea id="sql-input" class="sql-editor" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off" aria-label="Escribe tu consulta SQL">${esc(window.lastSql || '')}</textarea>${userResult?tableHtml(userResult):''}<div class="feedback ${challengeState==='success'?'success-message':challengeState==='failure'||challengeState==='syntax'?'error-message':''}">${esc(feedback)}</div>${challengeState==='failure'?`<p class="hint">💡 Pista: ${esc(step.hint)}</p>`:''}`;
    buttonText=challengeState==='success'?'Continuar':'Comprobar consulta'; disabled=false;
  }
  screen.innerHTML=`<span class="eyebrow">${esc(lesson.title)} · ${stepIndex+1}/${lesson.steps.length}</span><section class="step-card ${challengeState==='success'?'success':challengeState==='failure'||challengeState==='syntax'?'failure':''}">${body}</section><div class="spacer"></div><div class="bottom-action"><button class="primary" id="action-button" ${disabled?'disabled':''}>${buttonText}</button></div>`;
  screen.querySelectorAll('[data-option]').forEach(button=>button.addEventListener('click',()=>{selectedOption=Number(button.dataset.option); feedback=''; lockedAnswer=false; renderStep();}));
  const editor=screen.querySelector('#sql-input'); if(editor) editor.addEventListener('input',()=>{window.lastSql=editor.value;});
  document.querySelector('#action-button').addEventListener('click',()=>handleAction(step));
}
function loseHeart() {
  hearts=Math.max(0,hearts-1); heartCount.textContent=String(hearts);
  if(hearts===0) { mode='defeat'; renderDefeat(); return true; }
  return false;
}
function handleAction(step) {
  if(step.type==='teoria'){advance();return;}
  if(step.type==='quiz'){
    if(lockedAnswer&&selectedOption===step.answer){earned+=10;correct++;saved.xp+=10;persist();advance();return;}
    if(selectedOption===null)return;
    lockedAnswer=true;
    if(selectedOption===step.answer){feedback='¡Correcto! +10 XP';earned+=10;correct++;saved.xp+=10;persist();}
    else {feedback='Esa no es. Prueba otra vez.';if(loseHeart())return;lockedAnswer=false;selectedOption=null;}
    renderStep();return;
  }
  if(challengeState==='success'){window.lastSql='';advance();return;}
  const sql=screen.querySelector('#sql-input')?.value || '';
  try {
    userResult=runQuery(sql);
    const expected=runQuery(step.query);
    if(equalResults(userResult,expected,step.orderMatters)){
      challengeState='success';feedback='✓ ¡Resultado correcto! +20 XP';earned+=20;correct++;saved.xp+=20;persist();
    } else {
      challengeState='failure';feedback='El resultado no coincide todavía. Ajusta tu consulta e inténtalo otra vez.';
      if(loseHeart())return;
    }
  } catch(error) {
    challengeState='syntax';
    feedback=`SQLite no pudo ejecutar la consulta. Revisa la sintaxis: ${String(error.message||error).replace(/^Error: ?/,'')}`;
  }
  renderStep();
}
function finishLesson() {
  mode='summary';topbar.hidden=true;
  const id=lessons[lessonIndex].id;
  if(!saved.completed.includes(id))saved.completed.push(id);
  const today=currentDay();
  if(saved.lastDay!==today){
    const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
    const y=`${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
    saved.streak=saved.lastDay===y?saved.streak+1:1;saved.lastDay=today;
  }
  persist();
  screen.innerHTML=`<span class="eyebrow">Lección completada</span><span class="summary-icon">✓</span><h1>Buen trabajo.</h1><p>Terminaste ${esc(lessons[lessonIndex].title)}. Cada consulta te acerca a leer datos con confianza.</p><div class="summary-stats"><div class="summary-stat"><strong>${correct}</strong><span>aciertos</span></div><div class="summary-stat"><strong>+${earned}</strong><span>XP ganada</span></div><div class="summary-stat"><strong>🔥 ${saved.streak}</strong><span>racha</span></div></div><div class="spacer"></div><div class="bottom-action"><button class="primary" id="home-button">Volver a lecciones</button></div>`;
  document.querySelector('#home-button').onclick=renderHome;
}
function renderDefeat() {
  mode='defeat';topbar.hidden=true;
  screen.innerHTML=`<span class="eyebrow">Fin de la práctica</span><span class="summary-icon" style="color:var(--red)">♥</span><h1>Se acabaron las vidas.</h1><p>Los errores de sintaxis no descuentan vidas. Puedes volver a intentar esta lección cuando quieras.</p><div class="spacer"></div><div class="bottom-action"><button class="primary" id="retry-button">Reintentar lección</button><button class="secondary" id="return-button" style="margin-top:10px">Volver a lecciones</button></div>`;
  document.querySelector('#retry-button').onclick=()=>startLesson(lessonIndex);
  document.querySelector('#return-button').onclick=renderHome;
}

async function boot() {
  renderHome();
  if(!window.initSqlJs){screen.insertAdjacentHTML('afterbegin','<p class="error-message">No se encontró SQL.js local. Revisa que /vendor/sql-wasm.js esté disponible.</p>');return;}
  try { window.SQL = await window.initSqlJs({locateFile:file=>new URL(`./vendor/${file}`,import.meta.url).href}); sqlReady=true; }
  catch(error){console.error('No se pudo iniciar SQLite:',error);screen.insertAdjacentHTML('afterbegin','<p class="error-message">No se pudo cargar el motor SQL local. Comprueba que el archivo WASM esté instalado.</p>');}
  if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').catch(error=>console.warn('Service Worker no disponible:',error));}
}
boot();
