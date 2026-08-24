
const APP_VERSION = "1.0.0";
const STORAGE_KEY = "aux_cm_2026_progress_v1";
const BANK_KEY = "aux_cm_2026_custom_bank_v1";

const topicNames = {
  1:"Constitución Española",2:"Estatuto de Autonomía de la CM",3:"Gobierno y Administración de la CM",
  4:"Fuentes del ordenamiento",5:"Acto administrativo y recursos",6:"Procedimiento administrativo común",
  7:"Jurisdicción Contencioso-Administrativa",8:"Transparencia y protección de datos",9:"Contratos del sector público",
  10:"Empleo público / Función Pública CM",11:"Seguridad Social",12:"Hacienda y Presupuestos CM",
  13:"Igualdad y no discriminación",14:"Información al ciudadano / Adm. electrónica",15:"Documentos, registro y archivo",
  16:"Windows 10",17:"Word 365",18:"Excel 365",19:"Access 365 y Power BI",20:"Outlook 365",
  21:"Teams, SharePoint, OneDrive"
};

let state = loadState();
let route = "home";
let session = null;
let deferredInstallPrompt = null;

function defaultState(){
  return {attempts:[], qstats:{}, favorites:[], theme:"light", settings:{practiceCount:20}};
}
function loadState(){
  try { return {...defaultState(), ...JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")}; }
  catch { return defaultState(); }
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function customBank(){
  try { return JSON.parse(localStorage.getItem(BANK_KEY)||"[]"); } catch { return []; }
}
function bank(){
  const seen = new Set();
  return [...(window.QUESTION_BANK||[]), ...customBank()].filter(q=>{
    if(seen.has(q.id)) return false; seen.add(q.id); return true;
  });
}
function esc(s=""){ return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])); }
function shuffle(a){ const x=[...a]; for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]];} return x; }
function fmtPct(n){ return Number.isFinite(n) ? `${n.toFixed(1)} %` : "—"; }
function toast(msg){ const t=document.getElementById("toast"); t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800); }
function navigate(r){ route=r; session=null; render(); }
function blockLabel(b){ return b==="psych"?"Psicotécnico":b==="legislation"?"Legislación":"Ofimática"; }

function getOverall(){
  let seen=0,correct=0,wrong=0;
  Object.values(state.qstats).forEach(s=>{seen+=s.seen||0;correct+=s.correct||0;wrong+=s.wrong||0;});
  return {seen,correct,wrong,acc:seen?correct/seen*100:0};
}
function weakQuestions(){
  return bank().map(q=>({q,s:state.qstats[q.id]||{seen:0,correct:0,wrong:0}}))
    .filter(x=>x.s.wrong>0)
    .sort((a,b)=>(b.s.wrong-b.s.correct)-(a.s.wrong-a.s.correct)||b.s.wrong-a.s.wrong);
}
function render(){
  document.documentElement.dataset.theme=state.theme;
  document.querySelectorAll(".bottomNav button").forEach(b=>b.classList.toggle("active", b.dataset.route===route));
  const app=document.getElementById("app");
  if(session) return renderSession(app);
  ({home:renderHome,practice:renderPracticeSetup,exam:renderExamSetup,stats:renderStats,data:renderData}[route]||renderHome)(app);
}

function renderHome(app){
  const o=getOverall(), weak=weakQuestions().slice(0,4), last=state.attempts[0];
  app.innerHTML=`
    <section class="hero">
      <h1>Entrena como el examen real.</h1>
      <p>Primer ejercicio: 30 psicotécnicos + 30 de legislación en 65 minutos. Segundo ejercicio: 30 de ofimática en 35 minutos. Error: −1/3. Banco inicial: ${bank().length} preguntas.</p>
      <div class="actions"><button class="primary" onclick="navigate('practice')">Empezar práctica</button><button class="secondary" onclick="navigate('exam')">Hacer simulacro</button></div>
    </section>
    <section class="grid">
      <div class="card"><div class="metric">${o.seen}</div><div class="metricLabel">respuestas acumuladas</div></div>
      <div class="card"><div class="metric">${fmtPct(o.acc)}</div><div class="metricLabel">acierto bruto</div></div>
      <div class="card"><div class="metric">${state.favorites.length}</div><div class="metricLabel">favoritas</div></div>
      <div class="card wide">
        <h2>Puntos débiles</h2>
        ${weak.length?weak.map(x=>`<div class="reviewItem"><strong>${esc(x.q.question)}</strong><div class="small">${blockLabel(x.q.block)} · ${x.q.topicName} · ${x.s.wrong} fallo(s)</div></div>`).join(""):`<div class="empty">Todavía no hay fallos registrados.</div>`}
        <div class="actions"><button class="secondary" onclick="startWeak()">Practicar falladas</button></div>
      </div>
      <div class="card">
        <h2>Último intento</h2>
        ${last?`<div class="metric">${fmtPct(last.accuracy)}</div><p>${esc(last.name)}<br><span class="small">${new Date(last.date).toLocaleString()}</span></p>`:`<p>Aún no hay intentos terminados.</p>`}
      </div>
      <div class="card full">
        <h2>Atajos durante una pregunta</h2>
        <p><kbd>A</kbd> <kbd>B</kbd> <kbd>C</kbd> <kbd>D</kbd> responder · <kbd>←</kbd>/<kbd>→</kbd> navegar · <kbd>F</kbd> favorita · en práctica, <kbd>Enter</kbd> continúa tras corregir.</p>
      </div>
    </section>`;
}

function topicOptions(block){
  const qs=bank().filter(q=>q.block===block), ids=[...new Set(qs.map(q=>q.topic))].sort((a,b)=>a-b);
  return `<option value="all">Todos los temas</option>`+ids.map(t=>`<option value="${t}">${t?`Tema ${t} · `:""}${esc(topicNames[t]||qs.find(q=>q.topic===t)?.topicName||"General")}</option>`).join("");
}
function renderPracticeSetup(app){
  app.innerHTML=`
  <div class="grid">
    <div class="card full">
      <h2>Práctica personalizada</h2><p>Elige bloque, tema y cantidad. Puedes corregir cada pregunta al instante o esperar al final.</p>
      <div class="formGrid">
        <div class="field"><label>Bloque</label><select id="pBlock" onchange="refreshPracticeTopics()">
          <option value="psych">Psicotécnico</option><option value="legislation">Legislación</option><option value="office">Ofimática</option></select></div>
        <div class="field"><label>Tema / tipo</label><select id="pTopic">${topicOptions("psych")}</select></div>
        <div class="field"><label>Número de preguntas</label><input id="pCount" type="number" min="1" max="100" value="${state.settings.practiceCount||20}"></div>
        <div class="field"><label>Dificultad</label><select id="pDiff"><option value="all">Todas</option><option value="1">Básica</option><option value="2">Media</option><option value="3">Alta</option></select></div>
      </div>
      <label class="check"><input type="checkbox" id="pImmediate" checked> Corregir inmediatamente</label>
      <label class="check"><input type="checkbox" id="pShuffleOptions"> Barajar alternativas A-D</label>
      <div class="actions"><button class="primary" onclick="startPractice()">Comenzar</button><button class="secondary" onclick="startFavorites()">Solo favoritas</button><button class="secondary" onclick="startWeak()">Falladas</button></div>
    </div>
  </div>`;
}
function refreshPracticeTopics(){
  const b=document.getElementById("pBlock").value;
  document.getElementById("pTopic").innerHTML=topicOptions(b);
}
function startPractice(){
  const b=document.getElementById("pBlock").value, t=document.getElementById("pTopic").value, d=document.getElementById("pDiff").value;
  let pool=bank().filter(q=>q.block===b && (t==="all"||String(q.topic)===t) && (d==="all"||String(q.difficulty)===d));
  const n=Math.min(Math.max(1,parseInt(document.getElementById("pCount").value)||20),pool.length);
  if(!pool.length) return toast("No hay preguntas con esos filtros.");
  state.settings.practiceCount=n;saveState();
  beginSession({
    mode:"practice", name:`Práctica · ${blockLabel(b)}`, questions:shuffle(pool).slice(0,n),
    immediate:document.getElementById("pImmediate").checked,
    shuffleOptions:document.getElementById("pShuffleOptions").checked, timeLimit:null
  });
}
function startWeak(){
  const pool=weakQuestions().map(x=>x.q);
  if(!pool.length) return toast("Todavía no tienes preguntas falladas.");
  beginSession({mode:"practice",name:"Repaso de falladas",questions:pool.slice(0,30),immediate:true,shuffleOptions:false,timeLimit:null});
}
function startFavorites(){
  const fav=new Set(state.favorites), pool=bank().filter(q=>fav.has(q.id));
  if(!pool.length) return toast("Todavía no has marcado favoritas.");
  beginSession({mode:"practice",name:"Preguntas favoritas",questions:shuffle(pool),immediate:true,shuffleOptions:false,timeLimit:null});
}

function renderExamSetup(app){
  const counts={
    psych:bank().filter(q=>q.block==="psych").length,
    legislation:bank().filter(q=>q.block==="legislation").length,
    office:bank().filter(q=>q.block==="office").length
  };
  app.innerHTML=`
    <div class="grid">
      <div class="card half">
        <h2>Primer ejercicio</h2>
        <p><strong>60 + 5 reserva · 65 min</strong><br>30 psicotécnicos + 30 legislación. Las 5 reservas se corrigen aparte.</p>
        <div class="pill">Banco: ${counts.psych} psic. + ${counts.legislation} leg.</div>
        <div class="actions"><button class="primary" onclick="startExam(1)">Iniciar primer ejercicio</button></div>
      </div>
      <div class="card half">
        <h2>Segundo ejercicio</h2>
        <p><strong>30 + 5 reserva · 35 min</strong><br>Ofimática: Windows 10 y Microsoft 365 versión escritorio.</p>
        <div class="pill">Banco: ${counts.office} ofimática</div>
        <div class="actions"><button class="primary" onclick="startExam(2)">Iniciar segundo ejercicio</button></div>
      </div>
      <div class="card full">
        <h3>Corrección</h3><p>Acierto = +1 · Error = −1/3 · Blanco = 0. La aplicación muestra puntuación neta y una equivalencia lineal orientativa sobre 50. Las reservas no se incluyen en la nota ordinaria.</p>
      </div>
    </div>`;
}
function sampleNoRepeat(arr,n){ return shuffle(arr).slice(0,n); }
function startExam(which){
  if(which===1){
    const ps=shuffle(bank().filter(q=>q.block==="psych")), lg=shuffle(bank().filter(q=>q.block==="legislation"));
    if(ps.length<33||lg.length<32) return toast("Necesitas al menos 33 psicotécnicas y 32 de legislación.");
    const main=[...ps.slice(0,30),...lg.slice(0,30)];
    const reserve=[...ps.slice(30,32),...lg.slice(30,33)].map(q=>({...q,_reserve:true}));
    beginSession({mode:"exam",name:"Primer ejercicio",questions:[...main,...reserve],immediate:false,shuffleOptions:false,timeLimit:65*60,mainCount:60});
  } else {
    const of=shuffle(bank().filter(q=>q.block==="office"));
    if(of.length<35) return toast("Necesitas al menos 35 preguntas de ofimática.");
    const main=of.slice(0,30), reserve=of.slice(30,35).map(q=>({...q,_reserve:true}));
    beginSession({mode:"exam",name:"Segundo ejercicio",questions:[...main,...reserve],immediate:false,shuffleOptions:false,timeLimit:35*60,mainCount:30});
  }
}
function beginSession(cfg){
  session={...cfg,index:0,answers:{},corrected:{},marked:{},startedAt:Date.now(),secondsLeft:cfg.timeLimit,finished:false,optionMaps:{}};
  if(cfg.shuffleOptions){
    cfg.questions.forEach(q=>session.optionMaps[q.id]=shuffle(q.options.map((text,orig)=>({text,orig}))));
  }
  if(cfg.timeLimit){
    session.timer=setInterval(()=>{ if(!session)return; session.secondsLeft--; updateTimerOnly(); if(session.secondsLeft<=0){clearInterval(session.timer);finishSession(true);}},1000);
  }
  render();
}

function visibleOptions(q){
  return session.optionMaps[q.id] || q.options.map((text,orig)=>({text,orig}));
}
function renderSession(app){
  if(session.finished) return renderResults(app);
  const q=session.questions[session.index], map=visibleOptions(q), ans=session.answers[q.id], corrected=!!session.corrected[q.id];
  const fav=state.favorites.includes(q.id);
  const progress=(session.index+1)/session.questions.length*100;
  app.innerHTML=`
    <div class="sessionTop">
      <div><strong>${esc(session.name)}</strong><div class="small">${q._reserve?"Pregunta de reserva":`${session.index+1} de ${session.questions.length}`}</div></div>
      <div class="timer" id="timer">${session.timeLimit?formatTime(session.secondsLeft):"Sin límite"}</div>
    </div>
    <div class="progress"><span style="width:${progress}%"></span></div>
    <div style="height:12px"></div>
    <section class="questionCard">
      <div class="questionMeta">
        <span class="pill">${esc(blockLabel(q.block))}</span>
        ${q.topic?`<span class="pill">Tema ${q.topic}</span>`:""}
        <span class="pill">${esc(q.subtype)}</span>
        <span class="pill">Dificultad ${q.difficulty}/3</span>
        ${q._reserve?`<span class="pill">RESERVA</span>`:""}
      </div>
      <div style="display:flex;gap:8px;align-items:flex-start">
        <h2 class="questionText" style="flex:1">${esc(q.question)}</h2>
        <button class="star ${fav?"on":""}" onclick="toggleFavorite('${esc(q.id)}')" title="Favorita">★</button>
      </div>
      ${q.context?`<div class="context">${esc(q.context)}</div>`:""}
      <div class="options">
        ${map.map((x,i)=>{
          let cls="option";
          if(ans===x.orig) cls+=" selected";
          if(corrected && x.orig===q.correct) cls+=" correct";
          if(corrected && ans===x.orig && ans!==q.correct) cls+=" wrong";
          return `<button class="${cls}" ${corrected&&session.immediate?"disabled":""} onclick="answer(${x.orig})"><span class="letter">${"ABCD"[i]}</span><span>${esc(x.text)}</span></button>`;
        }).join("")}
      </div>
      ${corrected?feedbackHtml(q,ans):""}
      <div class="navRow">
        <button class="ghost" onclick="prevQ()" ${session.index===0?"disabled":""}>← Anterior</button>
        <div class="right">
          ${session.mode==="exam"?`<button class="ghost" onclick="toggleMarked()">${session.marked[q.id]?"★ Marcada":"☆ Marcar"}</button>`:""}
          ${session.immediate && ans!==undefined && !corrected?`<button class="primary" onclick="correctCurrent()">Corregir</button>`:""}
          ${(!session.immediate || corrected)?`<button class="primary" onclick="nextQ()">${session.index===session.questions.length-1?"Finalizar":"Siguiente →"}</button>`:""}
        </div>
      </div>
      ${session.mode==="exam"?`<div class="divider"></div><div class="palette">${session.questions.map((x,i)=>`<button class="qdot ${session.answers[x.id]!==undefined?"answered":""} ${i===session.index?"current":""} ${session.marked[x.id]?"marked":""}" onclick="goQ(${i})">${i+1}</button>`).join("")}</div>`:""}
    </section>
    ${session.mode==="exam"?`<div class="actions"><button class="danger" onclick="confirmFinish()">Finalizar ejercicio</button></div>`:""}
  `;
}
function displayLetterFor(q,origIndex){
  const map=visibleOptions(q);
  const i=map.findIndex(x=>x.orig===origIndex);
  return i>=0?"ABCD"[i]:"?";
}
function feedbackHtml(q,ans){
  const good=ans===q.correct;
  return `<div class="feedback ${good?"good":"bad"}"><strong>${good?"Correcta.":"Incorrecta."}</strong> ${esc(q.explanation)}<br><span class="small">Respuesta: ${displayLetterFor(q,q.correct)} · ${esc(q.options[q.correct])}</span></div>`;
}
function answer(origIndex){
  const q=session.questions[session.index];
  if(session.immediate && session.corrected[q.id]) return;
  session.answers[q.id]=origIndex; render();
}
function correctCurrent(){
  const q=session.questions[session.index];
  if(session.answers[q.id]===undefined) return toast("Selecciona una respuesta.");
  session.corrected[q.id]=true; render();
}
function nextQ(){
  if(session.index<session.questions.length-1){session.index++;render();}
  else confirmFinish();
}
function prevQ(){ if(session.index>0){session.index--;render();} }
function goQ(i){ session.index=i;render(); }
function toggleMarked(){ const q=session.questions[session.index]; session.marked[q.id]=!session.marked[q.id];render(); }
function toggleFavorite(id){
  const i=state.favorites.indexOf(id); if(i>=0) state.favorites.splice(i,1); else state.favorites.push(id);
  saveState();render();toast(i>=0?"Quitada de favoritas":"Añadida a favoritas");
}
function confirmFinish(){
  const unanswered=session.questions.slice(0,session.mainCount||session.questions.length).filter(q=>session.answers[q.id]===undefined).length;
  if(unanswered && !confirm(`Quedan ${unanswered} preguntas ordinarias en blanco. ¿Finalizar?`)) return;
  finishSession(false);
}
function finishSession(timeout=false){
  if(!session||session.finished) return;
  if(session.timer) clearInterval(session.timer);
  session.finished=true;session.timeout=timeout;
  const main=session.questions.slice(0,session.mainCount||session.questions.length);
  let c=0,w=0,b=0;
  main.forEach(q=>{
    const a=session.answers[q.id];
    if(a===undefined)b++; else if(a===q.correct)c++; else w++;
    if(a!==undefined){
      const s=state.qstats[q.id]||{seen:0,correct:0,wrong:0};
      s.seen++; if(a===q.correct)s.correct++;else s.wrong++;s.lastAt=Date.now();state.qstats[q.id]=s;
    }
  });
  const net=c-w/3, accuracy=(c+w)?c/(c+w)*100:0, scaled=Math.max(0,net/main.length*50);
  session.result={c,w,b,net,accuracy,scaled,duration:Math.round((Date.now()-session.startedAt)/1000)};
  const attempt={id:crypto?.randomUUID?crypto.randomUUID():String(Date.now()),date:new Date().toISOString(),name:session.name,mode:session.mode,c,w,b,net,accuracy,scaled,total:main.length,duration:session.result.duration};
  state.attempts.unshift(attempt);state.attempts=state.attempts.slice(0,100);saveState();render();
}
function renderResults(app){
  const r=session.result;
  const reserve=session.questions.filter(q=>q._reserve);
  let rc=0,rw=0,rb=0; reserve.forEach(q=>{const a=session.answers[q.id];if(a===undefined)rb++;else if(a===q.correct)rc++;else rw++;});
  app.innerHTML=`
    <section class="hero"><h1>${session.timeout?"Tiempo agotado":"Ejercicio finalizado"}</h1><p>${esc(session.name)} · ${r.c} aciertos · ${r.w} errores · ${r.b} en blanco</p></section>
    <div class="grid">
      <div class="card full">
        <div class="scoreGrid">
          <div class="scoreBox"><strong>${r.c}</strong><span class="small">Aciertos</span></div>
          <div class="scoreBox"><strong>${r.w}</strong><span class="small">Errores</span></div>
          <div class="scoreBox"><strong>${r.b}</strong><span class="small">Blancos</span></div>
          <div class="scoreBox"><strong>${r.net.toFixed(2)}</strong><span class="small">Neta (−1/3)</span></div>
        </div>
        ${session.mode==="exam"?`<div class="divider"></div><h3>Equivalencia lineal orientativa</h3><div class="metric">${r.scaled.toFixed(2)} / 50</div><p>La app convierte linealmente la puntuación neta a una escala 0–50 para orientarte.</p>`:""}
        ${reserve.length?`<div class="divider"></div><h3>Reserva</h3><p>${rc} aciertos · ${rw} errores · ${rb} en blanco. No incluida en la nota ordinaria.</p>`:""}
        <div class="actions"><button class="primary" onclick="reviewResults()">Revisar respuestas</button><button class="secondary" onclick="endSession()">Volver al inicio</button></div>
      </div>
    </div>`;
}
function reviewResults(){
  const app=document.getElementById("app");
  app.innerHTML=`<div class="card full"><h2>Revisión</h2>${session.questions.map((q,i)=>{
    const a=session.answers[q.id], good=a===q.correct;
    return `<div class="reviewItem"><div class="small">${i+1}. ${q._reserve?"RESERVA · ":""}${esc(q.topicName)}</div><strong>${esc(q.question)}</strong>
      <p class="${a===undefined?"muted":good?"":"muted"}">${a===undefined?"En blanco":`Tu respuesta: ${displayLetterFor(q,a)} · ${esc(q.options[a])}`}</p>
      <p><strong>Correcta: ${displayLetterFor(q,q.correct)} · ${esc(q.options[q.correct])}</strong><br><span class="small">${esc(q.explanation)}</span></p></div>`;
  }).join("")}<div class="actions"><button class="primary" onclick="endSession()">Terminar revisión</button></div></div>`;
}
function endSession(){ session=null;route="home";render(); }
function formatTime(s){s=Math.max(0,s);return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;}
function updateTimerOnly(){const e=document.getElementById("timer");if(e&&session)e.textContent=formatTime(session.secondsLeft);}

function renderStats(app){
  const attempts=state.attempts;
  const byTopic={};
  bank().forEach(q=>{
    const s=state.qstats[q.id];if(!s||!s.seen)return;
    const k=q.topic?`T${q.topic} · ${q.topicName}`:q.subtype;
    byTopic[k]=byTopic[k]||{seen:0,correct:0};
    byTopic[k].seen+=s.seen;byTopic[k].correct+=s.correct;
  });
  const rows=Object.entries(byTopic).map(([k,v])=>({k,...v,p:v.correct/v.seen*100})).sort((a,b)=>a.p-b.p);
  app.innerHTML=`
    <div class="grid">
      <div class="card full"><h2>Rendimiento por tema</h2>
        ${rows.length?rows.map(r=>`<div class="barRow"><span class="small">${esc(r.k)}</span><div class="bar"><span style="width:${r.p}%"></span></div><strong>${r.p.toFixed(0)}%</strong></div>`).join(""):`<div class="empty">Haz algunas prácticas para generar estadísticas.</div>`}
      </div>
      <div class="card full"><h2>Historial</h2>
        <div class="tableWrap"><table class="simpleTable"><thead><tr><th>Fecha</th><th>Sesión</th><th>A</th><th>E</th><th>B</th><th>Neta</th><th>Acierto</th></tr></thead>
        <tbody>${attempts.slice(0,30).map(a=>`<tr><td>${new Date(a.date).toLocaleDateString()}</td><td>${esc(a.name)}</td><td>${a.c}</td><td>${a.w}</td><td>${a.b}</td><td>${a.net.toFixed(2)}</td><td>${a.accuracy.toFixed(1)}%</td></tr>`).join("")}</tbody></table></div>
        ${!attempts.length?`<div class="empty">Sin intentos todavía.</div>`:""}
      </div>
    </div>`;
}

function validateImported(arr){
  if(!Array.isArray(arr)) throw new Error("El JSON debe ser un array.");
  arr.forEach((q,i)=>{
    if(!q.id||!q.question||!Array.isArray(q.options)||q.options.length!==4||![0,1,2,3].includes(Number(q.correct))||!["psych","legislation","office"].includes(q.block))
      throw new Error(`Pregunta ${i+1}: estructura no válida.`);
    q.correct=Number(q.correct); q.difficulty=Number(q.difficulty||2); q.topic=Number(q.topic||0);
    q.topicName=q.topicName||topicNames[q.topic]||"General";q.subtype=q.subtype||"General";q.explanation=q.explanation||"";q.context=q.context||"";
  });
  return arr;
}
function importQuestions(file){
  const r=new FileReader();r.onload=()=>{
    try{
      const arr=validateImported(JSON.parse(r.result));
      const existing=customBank(), map=new Map(existing.map(q=>[q.id,q]));arr.forEach(q=>map.set(q.id,q));
      localStorage.setItem(BANK_KEY,JSON.stringify([...map.values()]));toast(`${arr.length} preguntas importadas.`);render();
    }catch(e){alert("No se pudo importar: "+e.message);}
  };r.readAsText(file);
}
function download(name,obj){
  const blob=new Blob([typeof obj==="string"?obj:JSON.stringify(obj,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function exportProgress(){download("progreso_auxiliar_cm_2026.json",state);}
function exportBank(){download("banco_auxiliar_cm_2026.json",bank());}
function importProgress(file){
  const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);state={...defaultState(),...x};saveState();toast("Progreso importado.");render();}catch(e){alert("Archivo de progreso no válido.");}};r.readAsText(file);
}
function resetProgress(){if(confirm("Se borrarán estadísticas, historial y favoritas de este navegador. ¿Continuar?")){state=defaultState();saveState();render();}}
function resetCustomBank(){if(confirm("Se eliminarán solo las preguntas importadas; el banco inicial se conserva.")){localStorage.removeItem(BANK_KEY);render();toast("Banco importado eliminado.");}}

function renderData(app){
  app.innerHTML=`
    <div class="grid">
      <div class="card half"><h2>Banco de preguntas</h2><p>${bank().length} preguntas activas: ${window.QUESTION_BANK.length} iniciales + ${customBank().length} importadas.</p>
        <div class="actions"><label class="primary" style="display:inline-block">Importar JSON<input hidden type="file" accept=".json,application/json" onchange="importQuestions(this.files[0])"></label><button class="secondary" onclick="exportBank()">Exportar banco</button></div>
        <p class="small">Las preguntas con el mismo ID sustituyen a la versión importada anterior.</p>
      </div>
      <div class="card half"><h2>Copia de seguridad</h2><p>Exporta tu historial, estadísticas y favoritas para moverlos a otro dispositivo.</p>
        <div class="actions"><button class="primary" onclick="exportProgress()">Exportar progreso</button><label class="secondary" style="display:inline-block">Importar progreso<input hidden type="file" accept=".json,application/json" onchange="importProgress(this.files[0])"></label></div>
      </div>
      <div class="card full"><h2>Formato de preguntas</h2>
        <p>En la carpeta de la app tienes <strong>plantilla-preguntas.json</strong>. El campo <code>correct</code> usa 0=A, 1=B, 2=C, 3=D.</p>
        <div class="actions"><button class="danger" onclick="resetCustomBank()">Eliminar preguntas importadas</button><button class="danger" onclick="resetProgress()">Borrar progreso</button></div>
      </div>
    </div>`;
}

// keyboard
document.addEventListener("keydown",e=>{
  if(!session||session.finished)return;
  const k=e.key.toLowerCase();
  if(["a","b","c","d"].includes(k)){
    const q=session.questions[session.index], map=visibleOptions(q), vis="abcd".indexOf(k);
    if(map[vis]) answer(map[vis].orig);
  } else if(k==="arrowright"){nextQ();}
  else if(k==="arrowleft"){prevQ();}
  else if(k==="f"){toggleFavorite(session.questions[session.index].id);}
  else if(k==="enter" && session.immediate && session.corrected[session.questions[session.index].id]){nextQ();}
});

// nav
document.querySelectorAll(".bottomNav button").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.route)));
document.getElementById("homeBtn").addEventListener("click",()=>navigate("home"));
document.getElementById("themeBtn").addEventListener("click",()=>{state.theme=state.theme==="dark"?"light":"dark";saveState();render();});

window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstallPrompt=e;document.getElementById("installBtn").hidden=false;});
document.getElementById("installBtn").addEventListener("click",async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;document.getElementById("installBtn").hidden=true;});
window.addEventListener("appinstalled",()=>toast("Aplicación instalada."));

if("serviceWorker" in navigator && location.protocol!=="file:"){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
render();
