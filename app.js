import { lessons, units } from './lessons.js';

const STORE_KEY = 'codequet-aprendizaje-v2';
const screen = document.querySelector('#screen');
const topbar = document.querySelector('#topbar');
const bottomNav = document.querySelector('#bottom-nav');
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
let SQLModule = null;
const DIRECTORES = [
  ['Guillermo del Toro','México',1964],['Alfonso Cuarón','México',1961],
  ['Alejandro González Iñárritu','México',1963],['Alfonso Arau','México',1932],
  ['Alonso Ruizpalacios','México',1978],['Lee Unkrich','Estados Unidos',1967],
  ['Fernando Eimbcke','México',1970],['Roberto Gavaldón','México',1909],
  ['Fernando Frías','México',1971],['Juan José Campanella','Argentina',1959],
  ['María Novaro','México',1951],
];

function safeLoad() {
  const fallback = { completed: [], exams: [], xp: 0, streak: 0, lastDay: null, helpCount: 0 };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || localStorage.getItem('sql-paso-a-paso-v1') || 'null');
    if (!saved || typeof saved !== 'object') return fallback;
    return {
      completed: Array.isArray(saved.completed) ? saved.completed.filter(id => lessons.some(l => l.id === id)) : [],
      exams: Array.isArray(saved.exams) ? saved.exams : [],
      xp: Number.isFinite(saved.xp) && saved.xp >= 0 ? saved.xp : 0,
      streak: Number.isFinite(saved.streak) && saved.streak >= 0 ? saved.streak : 0,
      lastDay: typeof saved.lastDay === 'string' ? saved.lastDay : null,
      helpCount: Number.isFinite(saved.helpCount) ? saved.helpCount : 0,
    };
  } catch { return fallback; }
}
let saved = safeLoad();
function persist() { try { localStorage.setItem(STORE_KEY, JSON.stringify(saved)); } catch { /* El progreso sigue en memoria si el navegador bloquea el almacenamiento. */ } }
function esc(value) { return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function makeDatabase() {
  if (!SQLModule) throw new Error('El motor SQL todavía se está iniciando. Inténtalo de nuevo en un momento.');
  const db = new SQLModule.Database();
  db.run('CREATE TABLE peliculas (id INTEGER, titulo TEXT, director TEXT, anio INTEGER, genero TEXT, recaudacion REAL);');
  const movie = db.prepare('INSERT INTO peliculas VALUES (?, ?, ?, ?, ?, ?);');
  for (const row of PELICULAS) movie.run(row);
  movie.free();
  db.run('CREATE TABLE directores (nombre TEXT, pais TEXT, anio_nacimiento INTEGER);');
  const director = db.prepare('INSERT INTO directores VALUES (?, ?, ?);');
  for (const row of DIRECTORES) director.run(row);
  director.free();
  db.run('CREATE TABLE productos (id INTEGER, nombre TEXT, precio REAL, stock INTEGER, categoria_id INTEGER);');
  db.run("INSERT INTO productos VALUES (1,'Pan',3,5,1),(2,'Leche',8,2,1),(3,'Libro',20,0,2);");
  db.run('CREATE TABLE categorias (id INTEGER, nombre TEXT);');
  db.run("INSERT INTO categorias VALUES (1,'Alimentos'),(2,'Lectura');");
  db.run('CREATE TABLE ventas (id INTEGER, producto_id INTEGER, cantidad INTEGER);');
  db.run('INSERT INTO ventas VALUES (1,1,2);');
  return db;
}
function runQuery(sql) {
  const db = makeDatabase();
  try {
    let results = [];
    const statements = sql.split(';').map(part => part.trim()).filter(Boolean);
    for (const statement of statements) {
      if (/^(BEGIN|COMMIT|ROLLBACK)\b/i.test(statement)) { db.run(statement); continue; }
      const output = db.exec(statement);
      if (output.length) results = output;
    }
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
let currentTab = 'aprender';
let examUnit = 0;
let examAnswers = [];
let examQuestion = 0;
let splashShown = false;
let audioUnlocked = false;
let audioContext;
const examQuestions = units.map((_, unitIndex) => {
  const questions = lessons.filter(lesson => lesson.unit === unitIndex).map(lesson => ({ question: lesson.steps[1].question, options: lesson.steps[1].options, answer: lesson.steps[1].answer }));
  const extras = [
    [
      ['¿Qué palabra inicia una consulta de lectura?',['SELECT','INSERT','UPDATE'],0], ['¿Qué símbolo separa columnas?',['Coma','Punto y coma','Dos puntos'],0], ['¿Qué cláusula limita filas?',['LIMIT','SET','JOIN'],0], ['¿Qué hace ASC?',['Ordena ascendente','Borra filas','Agrupa datos'],0], ['¿Qué hace * en SELECT *?',['Selecciona todas las columnas','Multiplica filas','Crea una tabla'],0], ['¿Dónde se indica la tabla consultada?',['FROM','WHERE','ORDER'],0],
    ],
    [
      ['¿Qué operador requiere que dos condiciones sean verdaderas?',['AND','OR','NOT'],0], ['¿Qué patrón busca texto que empieza por A?', ["LIKE 'A%'","LIKE '%A'","LIKE '_A'"],0], ['¿Qué operador incluye ambos extremos?',['BETWEEN','LIKE','NOT'],0], ['¿Cómo se comprueba un dato ausente?',['IS NULL','= NULL','IS EMPTY'],0], ['¿Qué comodín representa un carácter?',['_','%','*'],0], ['¿Qué operador acepta una condición u otra?',['OR','AND','IS'],0],
    ],
    [
      ['¿Qué función suma valores?',['SUM','AVG','COUNT'],0], ['¿Qué función cuenta filas?',['COUNT(*)','TOTAL(*)','ROWS()'],0], ['¿Qué cláusula filtra grupos?',['HAVING','WHERE','FROM'],0], ['¿Qué cláusula forma grupos?',['GROUP BY','ORDER BY','LIMIT'],0], ['¿Qué calcula AVG?',['Promedio','Máximo','Cantidad'],0], ['¿Qué calcula MIN?',['Valor menor','Suma','Cantidad de grupos'],0],
    ],
    [
      ['¿Qué comando agrega una fila?',['INSERT','UPDATE','DELETE'],0], ['¿Qué palabra asigna valores en UPDATE?',['SET','VALUES','FROM'],0], ['¿Qué comando quita filas?',['DELETE','CREATE','SELECT'],0], ['¿Qué sentencia confirma una transacción?',['COMMIT','ROLLBACK','BEGIN'],0], ['¿Qué sentencia inicia una transacción?',['BEGIN','COMMIT','END'],0], ['¿Qué limita filas afectadas por UPDATE?',['WHERE','ORDER BY','AS'],0],
    ],
    [
      ['¿Qué comando define una tabla?',['CREATE TABLE','INSERT INTO','SELECT'],0], ['¿Qué clave identifica una fila?',['PRIMARY KEY','FOREIGN KEY','DEFAULT'],0], ['¿Qué restricción evita valores vacíos?',['NOT NULL','UNIQUE','CHECK'],0], ['¿Qué restricción evita duplicados?',['UNIQUE','NULL','REFERENCES'],0], ['¿Qué restricción valida una condición?',['CHECK','AS','INDEX'],0], ['¿Qué tipo suele guardar texto?',['TEXT','INTEGER','REAL'],0],
    ],
    [
      ['¿Qué unión conserva filas izquierdas?',['LEFT JOIN','INNER JOIN','CROSS JOIN'],0], ['¿Qué cláusula conecta claves?',['ON','WHERE','AS'],0], ['¿Qué unión conserva solo coincidencias?',['INNER JOIN','LEFT JOIN','FULL JOIN'],0], ['¿Qué une ventas con productos?',['producto_id = id','cantidad = precio','ventas = categorias'],0], ['¿Qué pasa si LEFT JOIN no encuentra pareja?',['Columnas derechas quedan NULL','Se borra la fila','La consulta falla'],0], ['¿Qué es un alias de tabla?',['Un nombre corto temporal','Una llave primaria','Una copia de datos'],0],
    ],
    [
      ['¿Qué guarda una vista?',['La definición de una consulta','Una contraseña','Solo un índice'],0], ['¿Qué palabra asigna alias a una columna?',['AS','ON','IN'],0], ['¿Qué puede acelerar búsquedas?',['INDEX','VIEW','JOIN'],0], ['¿Qué es una subconsulta?',['Consulta dentro de otra','Tabla borrada','Columna duplicada'],0], ['¿Qué función devuelve un promedio?',['AVG','SUM','COUNT'],0], ['¿Qué comando crea una vista?',['CREATE VIEW','MAKE VIEW','INSERT VIEW'],0],
    ],
  ][unitIndex];
  return [...questions, ...extras.map(([question, options, answer]) => ({ question, options, answer }))];
});

function playSfx(kind='tap') {
  if (!audioUnlocked) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    const notes = kind==='success'?[660,880,1175]:kind==='open'?[392,587,784]:[520];
    notes.forEach((frequency,index)=>{
      const osc=audioContext.createOscillator(),gain=audioContext.createGain();
      osc.type='sine';osc.frequency.value=frequency;gain.gain.setValueAtTime(.0001,audioContext.currentTime+index*.09);gain.gain.exponentialRampToValueAtTime(.10,audioContext.currentTime+index*.09+.025);gain.gain.exponentialRampToValueAtTime(.0001,audioContext.currentTime+index*.09+.20);osc.connect(gain);gain.connect(audioContext.destination);osc.start(audioContext.currentTime+index*.09);osc.stop(audioContext.currentTime+index*.09+.22);
    });
  } catch { /* Audio es opcional si el dispositivo lo bloquea. */ }
}
function renderBottomNav(active=currentTab) {
  currentTab=active;
  if (mode==='lesson'||mode==='exam'||mode==='summary'||mode==='defeat') { bottomNav.hidden=true; return; }
  bottomNav.hidden=false;
  const tabs=[
    ['aprender','Aprender','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.5 12 3l8.5 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-5v-6h-4v6h-5A1.5 1.5 0 0 1 3.5 19.5z"/></svg>'],
    ['practicar','Practicar','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16.8-.8 4 4-.8L19 8.2 15.8 5zM14.5 6.3l3.2 3.2M4 4h7M4 8h5"/></svg>'],
    ['juegos','Juegos','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 8h9a4.5 4.5 0 0 1 4.3 5.8l-1.1 3.6a2 2 0 0 1-3.2 1L13.8 16h-3.6l-2.7 2.4a2 2 0 0 1-3.2-1l-1.1-3.6A4.5 4.5 0 0 1 7.5 8Z"/><path d="M7 11v4m-2-2h4m7-1h.01M18 14h.01"/></svg>'],
    ['perfil','Perfil','<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>'],
  ];
  bottomNav.innerHTML=tabs.map(([id,label,icon])=>`<button class="nav-tab ${active===id?'active':''}" data-tab="${id}" aria-label="${label}"><span class="nav-icon">${icon}</span><small>${label}</small></button>`).join('');
  bottomNav.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{playSfx();const tab=button.dataset.tab;if(tab==='aprender')renderHome();else if(tab==='practicar')renderPractice();else if(tab==='juegos')renderGames();else renderProfile();}));
}

function renderSplash() {
  if (splashShown) return;
  splashShown=true;
  const splash=document.querySelector('#splash');
  splash.hidden=false;
  window.setTimeout(()=>{splash.classList.add('splash-exit');window.setTimeout(()=>splash.remove(),450);},1500);
}

function renderPractice() {
  mode='practice';topbar.hidden=true;renderBottomNav('practicar');
  screen.innerHTML=`<div class="page-head"><div class="brand"><img src="./assets/codequet/quet-head.jpg" alt=""> CODEQUET</div><span class="eyebrow">MODO LIBRE</span><h1>Practica a tu ritmo.</h1><p>Explora consultas y vuelve a las lecciones cuando quieras.</p></div><section class="practice-card"><div class="practice-quet"><img src="./assets/codequet/quet-banner.png" alt="Quet listo para practicar"></div><div><span class="eyebrow">SQL Playground</span><h2>Prueba una consulta</h2><p>Escribe SQL sobre películas, directores, productos y categorías.</p><button class="primary" id="open-playground">Abrir Playground</button></div></section><h2>Repaso guiado</h2><p>Elige una lección que ya completaste para volver a practicar.</p><div class="practice-list">${lessons.map((lesson,index)=>saved.completed.includes(lesson.id)?`<button class="lesson-card" data-practice="${index}"><span class="lesson-icon">${lesson.icon}</span><span><span class="lesson-title">${esc(lesson.title)}</span><span class="lesson-subtitle">${esc(lesson.subtitle)}</span></span><span class="lesson-state">↻</span></button>`:'').join('')||'<p class="hint">Completa tu primera lección y Quet preparará aquí los repasos.</p>'}</div>`;
  screen.innerHTML=`<div class="page-head"><div class="brand"><img src="./assets/codequet/quet-head.jpg" alt=""> CODEQUET</div><span class="eyebrow">MODO LIBRE</span><h1>Practica a tu ritmo.</h1><p>Explora consultas y vuelve a las lecciones cuando quieras.</p></div><section class="practice-card"><div class="practice-quet"><img src="./assets/codequet/quet-banner.png" alt="Quet listo para practicar"></div><div><span class="eyebrow">SQL Playground</span><h2>Prueba una consulta</h2><p>Escribe SQL sobre películas, directores, productos y categorías.</p><button class="primary" id="open-playground">Abrir Playground</button></div></section><h2>Repaso guiado</h2><p>Elige una lección que ya completaste para volver a practicar.</p><div class="practice-list">${lessons.map((lesson,index)=>saved.completed.includes(lesson.id)?`<button class="lesson-card" data-practice="${index}"><span class="lesson-icon">${lesson.icon}</span><span><span class="lesson-title">${esc(lesson.title)}</span><span class="lesson-subtitle">${esc(lesson.subtitle)}</span></span><span class="lesson-state">↻</span></button>`:'').join('')||'<p class="hint">Completa tu primera lección y Quet preparará aquí los repasos.</p>'}</div>`;
  document.querySelector('#open-playground').onclick=()=>{playSfx();startPracticeEditor();};
  screen.querySelectorAll('[data-practice]').forEach(button=>button.onclick=()=>{playSfx();startLesson(Number(button.dataset.practice),true);});
}
function startPracticeEditor(){mode='playground';topbar.hidden=false;progressFill.style.width='100%';heartCount.textContent='∞';screen.innerHTML=`<span class="eyebrow">PLAYGROUND · SQL</span><h1>Consulta lo que quieras.</h1><p>Prueba SQL con las tablas del curso.</p><label class="editor-label" for="sql-input">Tu consulta</label><textarea id="sql-input" class="sql-editor">SELECT titulo, anio FROM peliculas ORDER BY anio DESC LIMIT 5;</textarea><div id="playground-result"></div><div class="bottom-action"><button class="primary" id="run-query">Ejecutar consulta</button><button class="secondary" id="playground-back">Volver a practicar</button></div>`;document.querySelector('#run-query').onclick=()=>{try{document.querySelector('#playground-result').innerHTML=tableHtml(runQuery(document.querySelector('#sql-input').value));playSfx('success');}catch(error){document.querySelector('#playground-result').innerHTML=`<p class="error-message">${esc(error.message)}</p>`;}};document.querySelector('#playground-back').onclick=renderPractice;}
function renderGames(){mode='games';topbar.hidden=true;renderBottomNav('juegos');screen.innerHTML=`<div class="page-head"><div class="brand"><img src="./assets/codequet/quet-head.jpg" alt=""> CODEQUET</div><span class="eyebrow">MODO JUEGOS</span><h1>Juega con SQL.</h1><p>Retos cortos de opción múltiple para entrenar la lógica.</p></div><section class="step-card"><img class="game-quet" src="./assets/codequet/quet-banner.png" alt="Quet te reta"><span class="eyebrow">RETO RELÁMPAGO</span><h2>¿Qué hace WHERE?</h2><div class="option-list">${['Ordena filas','Filtra filas','Crea una tabla'].map((x,i)=>`<button class="option" data-game="${i}">${x}</button>`).join('')}</div><p id="game-feedback" class="feedback"></p></section>`;screen.querySelectorAll('[data-game]').forEach(button=>button.onclick=()=>{const ok=button.dataset.game==='1';document.querySelector('#game-feedback').textContent=ok?'¡Correcto! WHERE filtra filas. +5 XP':'Prueba otra vez: WHERE aplica una condición a las filas.';if(ok){saved.xp+=5;persist();playSfx('success');}else playSfx();});}
function renderProfile(){mode='profile';topbar.hidden=true;renderBottomNav('perfil');screen.innerHTML=`<div class="page-head"><div class="brand"><img src="./assets/codequet/quet-head.jpg" alt=""> CODEQUET</div><span class="eyebrow">TU PERFIL</span><h1>Tu aventura.</h1></div><section class="profile-card"><img src="./assets/codequet/quet-head.jpg" alt="Quet"><h2>Explorador SQL</h2><p>Quet está orgulloso de ti. Sigue avanzando a tu ritmo.</p><div class="summary-stats"><div class="summary-stat"><strong>${saved.xp}</strong><span>XP</span></div><div class="summary-stat"><strong>${saved.completed.length}/28</strong><span>lecciones</span></div><div class="summary-stat"><strong>${saved.exams.length}</strong><span>exámenes</span></div></div></section><h2>Elige un lenguaje</h2><p>Por ahora la ruta SQL ya está lista. Los demás lenguajes se activarán cuando tengan su curso listo.</p><div class="language-picker"><button class="language-choice selected"><span>🗄️</span><strong>SQL</strong><small>Disponible · 7 unidades</small></button>${[['Python','🐍'],['JavaScript','🟨'],['HTML y CSS','🌐'],['Java','☕']].map(([name,icon])=>`<button class="language-choice" disabled><span>${icon}</span><strong>${name}</strong><small>Próximamente</small></button>`).join('')}</div>`;}

function renderHome() {
  mode = 'home'; topbar.hidden = true; renderBottomNav('aprender');
  const grouped = units.map((unit, unitIndex) => {
    const unitCards = lessons.map((lesson,index)=>({lesson,index})).filter(item=>item.lesson.unit===unitIndex).map(({lesson,index})=>{
      const unlocked = index===0 || saved.completed.includes(lessons[index-1].id), done=saved.completed.includes(lesson.id);
      return `<button class="lesson-card" data-lesson="${index}" ${unlocked?'':'disabled'}><span class="lesson-icon">${lesson.icon}</span><span><span class="lesson-title">${esc(lesson.title)}</span><span class="lesson-subtitle">${esc(lesson.subtitle)}</span><span class="lesson-progress"><span style="width:${done?'100':'0'}%"></span></span></span><span class="lesson-state">${done?'✓':unlocked?'›':'🔒'}</span></button>`;
    }).join('');
    const unitCompleted=lessons.filter(l=>l.unit===unitIndex).every(l=>saved.completed.includes(l.id));
    const examPassed=saved.exams.some(exam=>exam.unit===unitIndex&&exam.passed);
    return `<section class="unit-section"><div class="unit-heading"><span class="unit-mark">${unit.icon}</span><span><span class="unit-label">Unidad ${unitIndex + 1}</span><strong>${esc(unit.title)}</strong><small>${esc(unit.subtitle)}</small></span></div><div class="lesson-list">${unitCards}</div><button class="unit-exam ${unitCompleted?'':'locked'}" data-exam="${unitIndex}" ${unitCompleted?'':'disabled'}><span class="exam-quet"><img src="./assets/codequet/quet-head.jpg" alt="Quet"></span><span><small>CODEQUET · ${examPassed?'APROBADO':'EXAMEN DE UNIDAD'}</small><strong>${examPassed?'Repetir examen':'Reto de unidad · 10 preguntas'}</strong></span><b>${examPassed?'✓':unitCompleted?'›':'🔒'}</b></button></section>`;
  }).join('');
  screen.innerHTML = `<div class="home-head"><button class="menu-button" id="menu-button" aria-label="Abrir menú">☰</button><span class="brand"><img src="./assets/codequet/quet-head.jpg" alt=""> CODEQUET <i>· SQL</i></span><div class="stats"><span class="stat streak">🔥 ${saved.streak}</span><span class="stat xp">✦ ${saved.xp} XP</span></div></div><section class="welcome-card"><div class="welcome-art"><img src="./assets/codequet/quet-banner.png" alt="Quet, tu guía para aprender SQL"></div><div><span class="eyebrow">Tu aventura SQL</span><h1>Aprende haciendo.</h1><p>7 unidades · 28 lecciones interactivas. Tu progreso se guarda en este dispositivo.</p></div></section><div class="route-heading"><h2>Elige tu lenguaje</h2><span>1 disponible</span></div><button class="selected-course"><span>🗄️</span><span><strong>SQL</strong><small>7 unidades · consultas, filtros, tablas y relaciones</small></span><b>✓</b></button><div class="route-heading"><h2>Temas que aprenderás</h2><span>${saved.completed.length} / ${lessons.length} lecciones</span></div>${grouped}`;
  document.querySelector('#menu-button').onclick=renderProfile;
  screen.querySelectorAll('[data-exam]').forEach(button=>button.onclick=()=>startExam(Number(button.dataset.exam)));
  screen.querySelectorAll('[data-lesson]').forEach(button=>button.addEventListener('click',()=>startLesson(Number(button.dataset.lesson))));
}
function startLesson(index,practice=false) {
  lessonIndex=index; stepIndex=0; hearts=5; earned=0; correct=0; selectedOption=null; lockedAnswer=false; feedback=''; userResult=null; challengeState='';
  mode='lesson'; renderStep();
  showLessonEntry({first:!saved.introSeen,practice});
}
function showLessonEntry({first=false,practice=false}={}) {
  const overlay = document.createElement('div');
  overlay.className = first?'splash-screen intro-overlay':'intro-overlay';
  overlay.innerHTML = first?`<video class="intro-video intro-video-full" playsinline autoplay poster="./assets/codequet/lesson-entry-poster.jpg"><source src="./assets/codequet/lesson-entry.mp4" type="video/mp4"></video>`:`<div class="lesson-intro-art"><img src="./assets/codequet/quet-banner.png" alt="Quet"><span>${practice?'¡Practiquemos de nuevo!':'¡Vamos con todo!'}</span></div><div class="intro-video-wrap"><video class="intro-video" playsinline autoplay ${audioUnlocked?'':'muted'} poster="./assets/codequet/lesson-entry-poster.jpg"><source src="./assets/codequet/lesson-entry.mp4" type="video/mp4"></video></div><div class="intro-controls"><strong>¡Hola, soy Quet!</strong><span>${esc(lessons[lessonIndex].title)} · Vamos a aprender juntos.</span><button class="intro-sound">${audioUnlocked?'🔊 Sonido activado':'🔊 Activar sonido'}</button><button class="intro-skip">Empezar</button></div>`;
  document.body.append(overlay);
  const close = () => {overlay.classList.add('intro-exit');setTimeout(()=>overlay.remove(),320);if(first){saved.introSeen=true;persist();}};
  const video = overlay.querySelector('video');
  video.addEventListener('ended',()=>{if(first)close();},{once:true});
  if (first) {
    // The lesson-card tap is the user's gesture, so browsers may start the clip with audio.
    audioUnlocked = true;
    video.muted = false;
    video.volume = 1;
  }
  video.play().catch(()=>{
    video.muted=true;
    video.play().catch(()=>{});
  });
  overlay.querySelector('.intro-sound')?.addEventListener('click',()=>{audioUnlocked=true;video.muted=false;video.play().catch(()=>{});overlay.querySelector('.intro-sound').textContent='🔊 Sonido activado';playSfx('open');});
  overlay.querySelector('.intro-skip')?.addEventListener('click',()=>{audioUnlocked=true;close();});
}
function updateTopbar() {
  topbar.hidden=false;
  bottomNav.hidden=true;
  const total=lessons[lessonIndex].steps.length;
  progressFill.style.width=`${Math.round(((stepIndex+1)/total)*100)}%`;
  heartCount.textContent=String(hearts);
  document.querySelector('#back-button').onclick=renderHome;
}
function advance() {
  if (stepIndex+1>=lessons[lessonIndex].steps.length) { if(mode==='exam')advanceExam(); else finishLesson(); return; }
  stepIndex++; selectedOption=null; lockedAnswer=false; feedback=''; userResult=null; challengeState=''; renderStep();
}
function renderStep() {
  updateTopbar();
  const lesson=lessons[lessonIndex], step=lesson.steps[stepIndex];
  let body=''; let buttonText='Continuar'; let disabled=false;
  if (step.type==='teoria') {
    body=`<span class="eyebrow">Idea clave</span><h2>${esc(step.title)}</h2><p>${esc(step.text)}</p><pre class="code-block">${esc(step.code)}</pre><button class="quet-help-inline" id="quet-help">🦜 ¿Necesitas ayuda? Pregúntale a Quet</button>`;
  } else if (step.type==='quiz') {
    body=`<span class="eyebrow">Pregunta rápida</span><h2>${esc(step.title)}</h2><p class="question">${esc(step.question)}</p><button class="quet-help-inline" id="quet-help">🦜 ¿Necesitas ayuda? Pregúntale a Quet</button><div class="option-list">${step.options.map((option,index)=>{const cls=selectedOption===index?(index===step.answer&&lockedAnswer?'correct':lockedAnswer?'wrong':'selected'):'';return `<button class="option ${cls}" data-option="${index}" ${lockedAnswer?'disabled':''}>${esc(option)}</button>`;}).join('')}</div><div class="feedback ${feedback.startsWith('¡')?'success-message':'error-message'}">${esc(feedback)}</div>`;
    buttonText=lockedAnswer&&selectedOption===step.answer?'Continuar':'Comprobar'; disabled=selectedOption===null||lockedAnswer&&selectedOption!==step.answer;
  } else {
    body=`<span class="eyebrow">Unidad ${lesson.unit+1} · lección ${lesson.lessonNumber} de 4</span><h2>${esc(step.title)}</h2><p>${esc(step.prompt)}</p><button class="quet-help-inline" id="quet-help">🦜 Quet, ayúdame con este reto</button><label class="editor-label" for="sql-input">Tu consulta</label><textarea id="sql-input" class="sql-editor" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off" aria-label="Escribe tu consulta SQL">${esc(window.lastSql || '')}</textarea>${userResult?tableHtml(userResult):''}<div class="feedback ${challengeState==='success'?'success-message':challengeState==='failure'||challengeState==='syntax'?'error-message':''}">${esc(feedback)}</div>${challengeState==='failure'?`<p class="hint">💡 Pista: ${esc(step.hint)}</p>`:''}`;
    buttonText=challengeState==='success'?'Continuar':'Comprobar consulta'; disabled=false;
  }
  screen.innerHTML=`<span class="eyebrow">${mode==='exam'?`EXAMEN · ${examQuestion+1}/10`:`${esc(lesson.title)} · ${stepIndex+1}/${lesson.steps.length}`}</span><section class="step-card ${challengeState==='success'?'success':challengeState==='failure'||challengeState==='syntax'?'failure':''}">${body}</section><div class="spacer"></div><div class="bottom-action"><button class="primary" id="action-button" ${disabled?'disabled':''}>${buttonText}</button></div>`;
  screen.querySelector('#quet-help')?.addEventListener('click',openQuetHelp);
  screen.querySelectorAll('[data-option]').forEach(button=>button.addEventListener('click',()=>{selectedOption=Number(button.dataset.option); feedback=''; lockedAnswer=false; renderStep();}));
  const editor=screen.querySelector('#sql-input'); if(editor) editor.addEventListener('input',()=>{window.lastSql=editor.value;});
  document.querySelector('#action-button').addEventListener('click',()=>handleAction(step));
}
function openQuetHelp() {
  const lesson=lessons[lessonIndex],step=lesson.steps[stepIndex];
  const answer=step.type==='reto'?step.hint:step.type==='quiz'?`Pista: ${step.options.filter((_,i)=>i!==step.answer).join(' o ')} no responden a la pregunta. Relee la idea clave de ${lesson.title}.`:step.text;
  const overlay=document.createElement('div');overlay.className='quet-sheet';overlay.innerHTML=`<div class="quet-sheet-backdrop"></div><section class="quet-sheet-panel"><div class="quet-sheet-handle"></div><div class="quet-sheet-title"><img src="./assets/codequet/quet-head.jpg" alt="Quet"><div><span class="eyebrow">AYUDA DEL CURSO · SIN CONEXIÓN</span><h2>Quet te acompaña</h2></div></div><p>${esc(step.type==='reto'?step.prompt:step.type==='quiz'?step.question:step.text)}</p><div class="quet-help-options"><button data-help="hint">Dame una pista</button><button data-help="explain">Explícame el concepto</button><button data-help="answer">Ayúdame con mi respuesta</button></div><div class="quet-answer" id="quet-answer">${esc(step.type==='reto'?answer:'Primero intenta responder; Quet te puede explicar la regla y darte una pista.')}</div><button class="primary" id="close-quet">Volver al ejercicio</button></section>`;
  document.body.append(overlay);overlay.querySelector('.quet-sheet-backdrop').onclick=()=>overlay.remove();overlay.querySelector('#close-quet').onclick=()=>overlay.remove();
  const hints={hint:step.type==='reto'?step.hint:`Piensa en el objetivo de ${lesson.title} y descarta las cláusulas que hacen otra cosa.`,explain:step.type==='reto'?`Esta consulta trabaja con la tabla de práctica. ${step.hint}`:step.type==='quiz'?`Recuerda: ${step.question}`:step.text,answer:`Respuesta sugerida: ${step.type==='reto'?step.query:step.type==='quiz'?step.options[step.answer]:step.code}`};
  overlay.querySelectorAll('[data-help]').forEach(button=>button.onclick=()=>{overlay.querySelector('#quet-answer').textContent=hints[button.dataset.help];playSfx();});
  saved.helpCount=(saved.helpCount||0)+1;persist();playSfx('open');
}

function startExam(unitIndex) {
  mode='exam';examUnit=unitIndex;examQuestion=0;examAnswers=[];lessonIndex=unitIndex*4;stepIndex=0;hearts=5;earned=0;correct=0;selectedOption=null;lockedAnswer=false;renderExamQuestion();
}
function renderExamQuestion() {
  mode='exam';topbar.hidden=false;bottomNav.hidden=true;heartCount.textContent=String(10-examQuestion);progressFill.style.width=`${examQuestion*10}%`;
  const q=examQuestions[Math.min(examUnit,examQuestions.length-1)][examQuestion];
  screen.innerHTML=`<span class="eyebrow">CODEQUET · EXAMEN DE UNIDAD ${examUnit+1}</span><section class="step-card"><div class="exam-title"><img src="./assets/codequet/quet-head.jpg" alt=""><span><h2>Quet te reta</h2><small>Pregunta ${examQuestion+1} de 10 · sin corazones</small></span></div><p class="question">${esc(q.question)}</p><div class="option-list">${q.options.map((option,i)=>`<button class="option ${examAnswers[examQuestion]===i?'selected':''}" data-exam-answer="${i}">${esc(option)}</button>`).join('')}</div></section><div class="spacer"></div><div class="bottom-action"><button class="primary" id="exam-submit" ${examAnswers[examQuestion]===undefined?'disabled':''}>${examQuestion===9?'Entregar examen':'Siguiente pregunta'}</button></div>`;
  screen.querySelectorAll('[data-exam-answer]').forEach(button=>button.onclick=()=>{examAnswers[examQuestion]=Number(button.dataset.examAnswer);playSfx();renderExamQuestion();});
  document.querySelector('#exam-submit').onclick=()=>{if(examQuestion<9){examQuestion++;renderExamQuestion();return;}finishExam();};
}
function finishExam() {
  const questions=examQuestions[Math.min(examUnit,examQuestions.length-1)];const score=examAnswers.reduce((n,a,i)=>n+(a===questions[i].answer?1:0),0);const passed=score>=8;
  saved.exams=saved.exams.filter(x=>x.unit!==examUnit);saved.exams.push({unit:examUnit,score,passed,date:currentDay()});if(passed)saved.xp+=50;persist();mode='exam-result';topbar.hidden=true;bottomNav.hidden=false;renderBottomNav('aprender');playSfx(passed?'success':'tap');
  screen.innerHTML=`<span class="eyebrow">${passed?'UNIDAD CERTIFICADA':'SIGUE PRACTICANDO'}</span><section class="exam-result-card"><img src="./assets/codequet/quet-banner.png" alt="Quet celebra tu esfuerzo"><div class="summary-icon">${passed?'★':'↻'}</div><h1>${passed?'¡Lo lograste!':'¡Vas avanzando!'}</h1><p>${passed?'Aprobaste el examen de unidad. Quet está orgulloso de ti.':'Necesitas 8 de 10 respuestas. Repasa y vuelve a intentarlo cuando quieras.'}</p><div class="exam-score">${score}<small>/10</small></div><button class="primary" id="exam-done">Volver al mapa</button></section>`;document.querySelector('#exam-done').onclick=renderHome;
}
function loseHeart() {
  hearts=Math.max(0,hearts-1); heartCount.textContent=String(hearts);
  if(hearts===0) { mode='defeat'; renderDefeat(); return true; }
  return false;
}
function handleAction(step) {
  if(mode==='exam')return;
  if(step.type==='teoria'){advance();return;}
  if(step.type==='quiz'){
    if(lockedAnswer&&selectedOption===step.answer){advance();return;}
    if(selectedOption===null)return;
    lockedAnswer=true;
    if(selectedOption===step.answer){feedback='¡Correcto! +10 XP';earned+=10;correct++;saved.xp+=10;persist();playSfx('success');}
    else {feedback='Esa no es. Prueba otra vez.';if(loseHeart())return;lockedAnswer=false;selectedOption=null;}
    renderStep();return;
  }
  if(challengeState==='success'){window.lastSql='';advance();return;}
  const sql=screen.querySelector('#sql-input')?.value || '';
  try {
    userResult=runQuery(sql);
    const expected=runQuery(step.query);
    if(equalResults(userResult,expected,step.orderMatters)){
      challengeState='success';feedback='✓ ¡Resultado correcto! +20 XP';earned+=20;correct++;saved.xp+=20;persist();playSfx('success');
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
  mode='summary';topbar.hidden=true;bottomNav.hidden=false;renderBottomNav('aprender');playSfx('success');
  const id=lessons[lessonIndex].id;
  if(!saved.completed.includes(id))saved.completed.push(id);
  const today=currentDay();
  if(saved.lastDay!==today){
    const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
    const y=`${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
    saved.streak=saved.lastDay===y?saved.streak+1:1;saved.lastDay=today;
  }
  persist();
  screen.innerHTML=`<span class="eyebrow">Lección completada</span><section class="lesson-win"><img src="./assets/codequet/quet-banner.png" alt="Quet celebra tu progreso"><span class="summary-icon">✓</span><h1>Buen trabajo.</h1><p>Terminaste ${esc(lessons[lessonIndex].title)}. Cada consulta te acerca a leer datos con confianza.</p></section><div class="summary-stats"><div class="summary-stat"><strong>${correct}</strong><span>aciertos</span></div><div class="summary-stat"><strong>+${earned}</strong><span>XP ganada</span></div><div class="summary-stat"><strong>🔥 ${saved.streak}</strong><span>racha</span></div></div><div class="spacer"></div><div class="bottom-action"><button class="primary" id="home-button">Volver a lecciones</button></div>`;
  document.querySelector('#home-button').onclick=renderHome;
}
function renderDefeat() {
  mode='defeat';topbar.hidden=true;bottomNav.hidden=false;renderBottomNav('aprender');
  screen.innerHTML=`<span class="eyebrow">Fin de la práctica</span><span class="summary-icon" style="color:var(--red)">♥</span><h1>Se acabaron las vidas.</h1><p>Los errores de sintaxis no descuentan vidas. Puedes volver a intentar esta lección cuando quieras.</p><div class="spacer"></div><div class="bottom-action"><button class="primary" id="retry-button">Reintentar lección</button><button class="secondary" id="return-button" style="margin-top:10px">Volver a lecciones</button></div>`;
  document.querySelector('#retry-button').onclick=()=>startLesson(lessonIndex);
  document.querySelector('#return-button').onclick=renderHome;
}

async function boot() {
  renderHome();
  renderSplash();
  if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(registration=>registration.update()).catch(error=>console.warn('Service Worker no disponible:',error));}
  if(!window.initSqlJs){screen.insertAdjacentHTML('afterbegin','<p class="error-message">No se encontró SQL.js local. Revisa que /vendor/sql-wasm.js esté disponible.</p>');return;}
  try {
    SQLModule = await window.initSqlJs({locateFile:file=>new URL(`./vendor/${file}`,import.meta.url).href});
    if (!SQLModule || typeof SQLModule.Database !== 'function') throw new Error('SQL.js no devolvió la interfaz esperada.');
  }
  catch(error){console.error('No se pudo iniciar SQLite:',error);screen.insertAdjacentHTML('afterbegin','<p class="error-message">No se pudo cargar el motor SQL local. Comprueba que el archivo WASM esté instalado.</p>');}
}
boot();
