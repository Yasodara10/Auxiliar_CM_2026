
const APP_VERSION = "3.2.0";
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
function normalizeLabel(s=""){
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
}
function psychKind(q){
  if(q.block!=="psych") return null;
  const s=normalizeLabel(`${q.subtype||""} ${q.topicName||""}`);
  if(s.includes("sinonim")) return "syn";
  if(s.includes("antonim")) return "ant";
  if(s.includes("ortograf") || s.includes("acentuac")) return "ort";
  return null;
}
function isActiveQuestion(q){
  return q.block!=="psych" || psychKind(q)!==null;
}
function allBank(){
  const seen = new Set();
  return [...(window.QUESTION_BANK||[]), ...customBank()].filter(q=>{
    if(seen.has(q.id)) return false; seen.add(q.id); return true;
  });
}
function bank(){ return allBank().filter(isActiveQuestion); }
function hiddenPsychCount(){ return allBank().filter(q=>q.block==="psych" && !psychKind(q)).length; }
function esc(s=""){ return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])); }
function shuffle(a){ const x=[...a]; for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]];} return x; }
function fmtPct(n){ return Number.isFinite(n) ? `${n.toFixed(1)} %` : "—"; }
function toast(msg){ const t=document.getElementById("toast"); t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800); }
function navigate(r){ route=r; session=null; render(); }
function blockLabel(b){ return b==="psych"?"Psicotécnico verbal":b==="legislation"?"Legislación":"Ofimática"; }

function friendlyTopic(q){
  if(q.block==="psych"){
    const kind=psychKind(q);
    if(kind==="syn") return "Sinónimos";
    if(kind==="ant") return "Antónimos";
    if(kind==="ort") return "Ortografía y tildes";
    return q.subtype||"Psicotécnico verbal";
  }
  if(q.block==="office"){
    const short={16:"Windows",17:"Word",18:"Excel",19:"Access / Power BI",20:"Outlook",21:"Teams / SharePoint / OneDrive"};
    return short[q.topic] || q.topicName || topicNames[q.topic] || "Ofimática";
  }
  return q.topicName || topicNames[q.topic] || "Legislación";
}
function blankQuestions(){
  return bank().map(q=>({q,s:state.qstats[q.id]||{seen:0,correct:0,wrong:0,blank:0}}))
    .filter(x=>(x.s.blank||0)>0)
    .sort((a,b)=>(b.s.blank||0)-(a.s.blank||0)||((b.s.wrong||0)-(a.s.wrong||0)));
}
function stablePick(q,arr){
  const s=String(q.id||q.question||"x");
  let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0;
  return arr[h%arr.length];
}
function reactionHtml(q,good){
  const goodGifs=["sticker_cat_nice.gif","sticker_dog_case_closed.gif"];
  const badGifs=["sticker_cat_oops.gif","sticker_dog_nope.gif"];
  const src=stablePick(q,good?goodGifs:badGifs);
  const alt=good?"Sticker de celebración":"Sticker de ánimo";
  return `<div class="reaction"><img src="${src}" alt="${alt}" loading="lazy"></div>`;
}
function legalReference(q){
  if(q.block!=="legislation") return "";
  if(q.id==="xp3-leg-048") return "Ley 5/2025, de Hacienda de la Comunidad de Madrid, art. 91";
  if(q.article) return q.article;
  if(q.sourceArticle) return q.sourceArticle;
  const expl=String(q.explanation||"");
  const explicit=expl.match(/((?:art(?:ículo|\.)|arts?\.)\s*\d+(?:\.\d+)?(?:\s*(?:y|,|-)\s*\d+(?:\.\d+)?)?\s*(?:de la|del)?\s*[^.;]*)/i);
  if(explicit) return explicit[1].replace(/\s+/g," ").trim();

  const t=Number(q.topic||0), s=normalizeLabel(`${q.question} ${q.subtype} ${q.explanation}`);
  if(t===1){
    const rules=[
      ["domicilio","Constitución Española, art. 18.2"],["ideologia","Constitución Española, art. 16.2"],
      ["religion","Constitución Española, art. 16"],["expresion","Constitución Española, art. 20"],
      ["publicaciones","Constitución Española, art. 20.5"],["cargos publicos","Constitución Española, art. 23.2"],
      ["peticion","Constitución Española, art. 29"],["asociaciones","Constitución Española, art. 22"],
      ["amparo","Constitución Española, art. 53.2"],["suspenderse","Constitución Española, art. 55"],
      ["irretroactividad","Constitución Española, art. 9.3"],["reunion","Constitución Española, art. 21"]
    ];
    for(const [k,v] of rules) if(s.includes(k)) return v;
    return "Constitución Española, Título I (artículo correspondiente al derecho preguntado)";
  }
  if(t===2){
    if(s.includes("representa")) return "Estatuto de Autonomía de Madrid, art. 9";
    if(s.includes("circunscripcion")) return "Estatuto de Autonomía de Madrid, art. 10.5";
    if(s.includes("mandato imperativo")) return "Estatuto de Autonomía de Madrid, art. 10.3";
    if(s.includes("cuatro anos")||s.includes("periodo de")) return "Estatuto de Autonomía de Madrid, art. 10.1-2";
    if(s.includes("elegido")||s.includes("nombrado por")) return "Estatuto de Autonomía de Madrid, art. 18";
    if(s.includes("responsabilidad politica")) return "Estatuto de Autonomía de Madrid, arts. 17.3 y 23.2";
    if(s.includes("presidente") && (s.includes("representacion")||s.includes("ostenta"))) return "Estatuto de Autonomía de Madrid, art. 17";
    if(s.includes("competencia exclusiva")) return "Estatuto de Autonomía de Madrid, art. 26";
    return "Estatuto de Autonomía de Madrid, arts. 8-23";
  }
  if(t===3){
    if(s.includes("deliberaciones")) return "Ley 1/1983, del Gobierno y Administración de la Comunidad de Madrid, art. 25";
    if(s.includes("viceconsejer")) return "Ley 1/1983, art. 44";
    if(s.includes("consejerias")||s.includes("secretaria general tecnica")) return "Ley 1/1983, arts. 39-41";
    if(s.includes("consejeros") && (s.includes("nombr")||s.includes("separ"))) return "Ley 1/1983, art. 28";
    if(s.includes("organos superiores")) return "Ley 1/1983, art. 38";
    if(s.includes("consejo de gobierno")||s.includes("gobierno de la comunidad")) return "Ley 1/1983, arts. 21-26";
    if(s.includes("presidente")) return "Ley 1/1983, arts. 4-19";
    if(s.includes("organismos autonomos")||s.includes("administracion institucional")) return "Ley 1/1983, arts. 38 y ss., y normativa de Administración institucional";
    return "Ley 1/1983, del Gobierno y Administración de la Comunidad de Madrid, artículo correspondiente";
  }
  if(t===4){
    if(s.includes("costumbre")) return "Código Civil, art. 1.3";
    if(s.includes("ley organica")) return "Constitución Española, art. 81";
    if(s.includes("decreto-ley")||s.includes("decretos-leyes")) return "Constitución Española, art. 86";
    if(s.includes("ley de bases")||s.includes("delegacion legislativa")||s.includes("decreto legislativo")) return "Constitución Española, arts. 82-85";
    if(s.includes("reglamento")) return "Constitución Española, art. 97, y principio de jerarquía normativa del art. 9.3";
    return "Constitución Española, arts. 81-86";
  }
  if(t===5){
    if(s.includes("contenido imposible")||s.includes("nulo")||s.includes("nulidad")) return "Ley 39/2015, art. 47";
    if(s.includes("anulab")) return "Ley 39/2015, art. 48";
    if(s.includes("error")&&s.includes("aritmet")) return "Ley 39/2015, art. 109.2";
    if(s.includes("motiv")) return "Ley 39/2015, art. 35";
    if(s.includes("notificacion")||s.includes("notific")) return "Ley 39/2015, arts. 40-44";
    if(s.includes("eficacia")) return "Ley 39/2015, art. 39";
    if(s.includes("revocar")||s.includes("revocacion")) return "Ley 39/2015, art. 109.1";
    if(s.includes("alzada")) return "Ley 39/2015, arts. 121-122";
    if(s.includes("reposicion")) return "Ley 39/2015, arts. 123-124";
    return "Ley 39/2015, arts. 34-52 y 106-126";
  }
  if(t===6){
    if(s.includes("plazo maximo")&&s.includes("resolver")) return "Ley 39/2015, art. 21";
    if(s.includes("subsan")) return "Ley 39/2015, art. 68";
    if(s.includes("iniciarse")) return "Ley 39/2015, arts. 54 y 66";
    if(s.includes("prueba")) return "Ley 39/2015, art. 77";
    if(s.includes("informes")) return "Ley 39/2015, arts. 79-81";
    if(s.includes("audiencia")) return "Ley 39/2015, art. 82";
    if(s.includes("informacion publica")) return "Ley 39/2015, art. 83";
    if(s.includes("fase")||s.includes("iniciacion")||s.includes("instruccion")||s.includes("finalizacion")) return "Ley 39/2015, arts. 54-95";
    return "Ley 39/2015, Título IV (arts. 53-105)";
  }
  if(t===7){
    if(s.includes("dos meses")||s.includes("plazo general")) return "Ley 29/1998 (LJCA), art. 46";
    if(s.includes("via de hecho")) return "Ley 29/1998, arts. 25 y 30";
    if(s.includes("capacidad procesal")) return "Ley 29/1998, art. 18";
    if(s.includes("procurador")||s.includes("abogado")||s.includes("representacion")) return "Ley 29/1998, art. 23";
    if(s.includes("juzgados centrales")||s.includes("orden jurisdiccional")||s.includes("tribunal de cuentas")) return "Ley 29/1998, arts. 6-13";
    if(s.includes("ambito")||s.includes("conoce")||s.includes("fiscaliza")) return "Ley 29/1998, arts. 1-5";
    return "Ley 29/1998, reguladora de la Jurisdicción Contencioso-Administrativa";
  }
  if(t===8){
    if(s.includes("motiv")&&s.includes("solicitud")) return "Ley 19/2013, art. 17.3";
    if(s.includes("un mes")||s.includes("resolucion")) return "Ley 19/2013, art. 20";
    if(s.includes("periodica")||s.includes("obligaciones de transparencia")) return "Ley 19/2013, art. 5.1";
    if(s.includes("posea la informacion")||s.includes("dirigirse al organo")) return "Ley 19/2013, art. 17.1";
    if(s.includes("minimizacion")) return "RGPD, art. 5.1.c";
    if(s.includes("delegado de proteccion")||s.includes("dpd")) return "RGPD, art. 38.3";
    if(s.includes("acceso parcial")) return "Ley 19/2013, art. 16";
    if(s.includes("reelaboracion")||s.includes("inadmit")) return "Ley 19/2013, art. 18";
    if(s.includes("responsable del tratamiento")) return "RGPD, art. 4.7";
    if(s.includes("encargado del tratamiento")) return "RGPD, art. 4.8";
    if(s.includes("confidencialidad")) return "LO 3/2018 (LOPDGDD), art. 5";
    if(s.includes("catorce")||s.includes("menor")||s.includes("consentimiento")) return "LO 3/2018 (LOPDGDD), art. 7";
    return "Ley 19/2013 y normativa de protección de datos, artículo correspondiente";
  }
  if(t===9){
    if(s.includes("objeto de los contratos")||s.includes("objeto del contrato")) return "Ley 9/2017 (LCSP), art. 99.1";
    if(s.includes("fraccionarse")||s.includes("fraccionar")) return "Ley 9/2017 (LCSP), art. 99.2";
    if(s.includes("solvencia economica")||s.includes("solvencia")&&s.includes("empresarios")) return "Ley 9/2017 (LCSP), arts. 74 y 86-91";
    if(s.includes("mejor relacion calidad-precio")||s.includes("pluralidad de criterios")) return "Ley 9/2017 (LCSP), art. 145.1";
    if(s.includes("contrato menor")) return "Ley 9/2017 (LCSP), art. 118 y art. 29.8";
    if(s.includes("verbal")) return "Ley 9/2017, art. 37.1";
    if(s.includes("suministro")) return "Ley 9/2017, art. 16";
    if(s.includes("servicios")) return "Ley 9/2017, art. 17";
    if(s.includes("mixto")) return "Ley 9/2017, art. 18";
    if(s.includes("concesion")) return "Ley 9/2017, art. 15";
    if(s.includes("procedimiento abierto")) return "Ley 9/2017, arts. 156-159";
    if(s.includes("restringido")) return "Ley 9/2017, arts. 160-165";
    if(s.includes("perfil de contratante")) return "Ley 9/2017, art. 63";
    return "Ley 9/2017, de Contratos del Sector Público, artículo correspondiente";
  }
  if(t===10){
    if(s.includes("empleados publicos")||s.includes("son empleados")) return "TREBEP, art. 8";
    if(s.includes("interino")) return "TREBEP, art. 10";
    if(s.includes("vacaciones")||s.includes("veintidos dias")) return "TREBEP, art. 50";
    if(s.includes("c2")||s.includes("educacion secundaria")) return "TREBEP, art. 76";
    if(s.includes("personal eventual")) return "TREBEP, art. 12";
    if(s.includes("perdida")||s.includes("condicion de funcionario")) return "TREBEP, arts. 63-68";
    if(s.includes("prescrib")) return "TREBEP, art. 97";
    if(s.includes("codigo de conducta")||s.includes("objetividad")||s.includes("integridad")) return "TREBEP, arts. 52-54";
    if(s.includes("carrera")||s.includes("promocion")) return "TREBEP, arts. 16-20";
    return "TREBEP, artículo correspondiente";
  }
  if(t===11){
    if(s.includes("inscripcion")&&s.includes("empresario")) return "Texto refundido de la LGSS, art. 138";
    if(s.includes("solicitud de alta")||s.includes("alta de un trabajador")) return "Texto refundido de la LGSS, arts. 139-140";
    if(s.includes("accion protectora")||s.includes("asistencia sanitaria")) return "Texto refundido de la LGSS, art. 42";
    if(s.includes("afiliacion")) return "Texto refundido de la LGSS, arts. 15-18";
    if(s.includes("tesoreria general")||s.includes("tgss")) return "Texto refundido de la LGSS, arts. 74 y ss.";
    if(s.includes("instituto nacional")||s.includes("inss")) return "Texto refundido de la LGSS, art. 66";
    if(s.includes("prescribe")) return "Texto refundido de la LGSS, art. 53";
    if(s.includes("caduca")||s.includes("caducidad")) return "Texto refundido de la LGSS, art. 54";
    if(s.includes("incapacidad temporal")||s.includes("recaida")) return "Texto refundido de la LGSS, arts. 169-174";
    if(s.includes("cotizar")) return "Texto refundido de la LGSS, arts. 18 y 144";
    if(s.includes("principios fundamentales")) return "Texto refundido de la LGSS, art. 2.1";
    return "Texto refundido de la Ley General de la Seguridad Social, artículo correspondiente";
  }
  if(t===12){
    if(s.includes("ano natural")||s.includes("ejercicio presupuestario")) return "Ley 5/2025, de Hacienda de la Comunidad de Madrid, art. 57";
    if(s.includes("prorrog")) return "Ley 5/2025, art. 72";
    if(s.includes("intervencion general")) return "Ley 5/2025, arts. 110-115, especialmente art. 111";
    if(s.includes("unidad de caja")||s.includes("tesoreria central")||s.includes("centralizacion")||s.includes("tesoreria de la comunidad")) return "Ley 5/2025, arts. 182-188, especialmente art. 183";
    if(s.includes("universidades publicas")) return "Ley 5/2025, arts. 108-109";
    if(s.includes("fases")||s.includes("procedimiento de gasto")) return "Ley 5/2025, Título II, reglas de gestión del gasto";
    return "Ley 5/2025, de Hacienda de la Comunidad de Madrid, artículo correspondiente";
  }
  if(t===13){
    if(s.includes("discriminacion directa")) return "LO 3/2007, art. 6.1";
    if(s.includes("discriminacion indirecta")) return "LO 3/2007, art. 6.2";
    if(s.includes("acoso sexual")) return "LO 3/2007, art. 7.1";
    if(s.includes("acoso por razon de sexo")) return "LO 3/2007, art. 7.2";
    if(s.includes("actos y clausulas")||s.includes("nulos y sin efecto")) return "LO 3/2007, art. 10";
    if(s.includes("parte demandada")||s.includes("carga probatoria")||s.includes("ausencia de discriminacion")) return "LO 3/2007, art. 13";

    if(s.includes("accion positiva")) return "LO 3/2007, art. 11";
    if((s.includes("violencia")&&s.includes("conyug"))||s.includes("lo 1/2004")) return "LO 1/2004, art. 1";
    if(s.includes("reales como percibidas")||s.includes("domicilio fuera")||s.includes("territorio")||(s.includes("ley 3/2016")&&s.includes("protege"))) return "Ley 3/2016 de la Comunidad de Madrid, art. 2";
    if(s.includes("programa madrileno")) return "Ley 3/2016, art. 10";
    if(s.includes("articulo 68")||s.includes("infracciones")||s.includes("sanciones")) return "Ley 3/2016, art. 68";
    return "LO 3/2007 y normativa autonómica de igualdad, artículo correspondiente";
  }
  if(t===14){
    if(s.includes("obligad")||s.includes("persona juridica")||s.includes("colegiacion")) return "Ley 39/2015, art. 14";
    if(s.includes("asist")) return "Ley 39/2015, art. 12";
    if(s.includes("identificacion")&&s.includes("firma")) return "Ley 39/2015, arts. 9-11";
    if(s.includes("firma")) return "Ley 39/2015, art. 11.2";
    if(s.includes("registro electronico")) return "Ley 39/2015, art. 16";
    if(s.includes("elegir")&&s.includes("electron")) return "Ley 39/2015, art. 14.1";
    return "Ley 39/2015, arts. 9-16";
  }
  if(t===15){
    if(s.includes("archivo electronico unico")||s.includes("procedimientos finalizados")) return "Ley 39/2015, art. 17";
    if(s.includes("expediente administrativo")||s.includes("indice autenticado")||s.includes("informacion auxiliar")) return "Ley 39/2015, art. 70";
    if(s.includes("registro")) return "Ley 39/2015, art. 16";
    if(s.includes("documento administrativo electronico")||s.includes("documento electronico")) return "Ley 39/2015, arts. 26-27";
    if(s.includes("archivo")) return "Ley 39/2015, art. 17";
    return "Ley 39/2015, arts. 16-17, 26-27 y 70";
  }
  return "Normativa del tema correspondiente";
}
function examTip(q){
  if(q.block==="psych"){
    if(psychKind(q)==="syn") return "Quédate con la pareja de significado y no con palabras que solo se parecen por contexto.";
    if(psychKind(q)==="ant") return "Busca oposición real de significado; un término simplemente distinto no basta.";
    return "Mira la grafía completa: h, b/v, g/j, s/c y tildes son trampas habituales.";
  }
  if(q.block==="office") return `Relaciona la función con ${friendlyTopic(q)} y descarta opciones que pertenecen a otra herramienta o hacen una acción distinta.`;
  return "En legislación, fija la palabra exacta del precepto: plazos, mayorías, excepciones y verbos suelen ser la trampa.";
}
function progressClass(p){ return p>=90?"progressGood":p>=70?"progressWarn":"progressBad"; }

function getOverall(){
  let seen=0,correct=0,wrong=0;
  const activeIds=new Set(bank().map(q=>q.id));
  Object.entries(state.qstats).forEach(([id,s])=>{
    if(!activeIds.has(id)) return;
    seen+=s.seen||0;correct+=s.correct||0;wrong+=s.wrong||0;
  });
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
  const o=getOverall(), weak=weakQuestions().slice(0,4), blanks=blankQuestions().slice(0,4), last=state.attempts[0];
  const activeFavs=state.favorites.filter(id=>bank().some(q=>q.id===id)).length;
  const totalBlanks=Object.values(state.qstats).reduce((n,s)=>n+(s.blank||0),0);
  app.innerHTML=`
    <section class="motivationStrip">
      <div class="motivationCopy">
        <span class="motivationEyebrow">V3.1 · Hoy también cuenta</span>
        <strong>Una plaza se construye pregunta a pregunta. Tú puedes con esto.</strong>
        <span>Sigue sumando. No necesitas hacerlo perfecto; necesitas seguir.</span>
      </div>
      <img src="sticker_cat_you_can.gif" alt="Sticker de gato animando" class="motivationGif">
    </section>
    <section class="hero">
      <h1>Practica rápido. Repite lo que fallas.</h1>
      <p>Psicotécnico rápido: sinónimos, antónimos y ortografía. Legislación y ofimática mantienen todo su banco, con repaso de falladas y preguntas en blanco.</p>
      <div class="actions"><button class="primary" onclick="navigate('practice')">Empezar práctica</button><button class="secondary" onclick="navigate('exam')">Hacer simulacro</button></div>
    </section>
    <section class="grid">
      <div class="card"><div class="metric">${o.seen}</div><div class="metricLabel">preguntas contestadas</div></div>
      <div class="card"><div class="metric">${fmtPct(o.acc)}</div><div class="metricLabel">acierto bruto</div></div>
      <div class="card"><div class="metric">${totalBlanks}</div><div class="metricLabel">dejadas en blanco</div></div>
      <div class="card wide">
        <h2>Falladas</h2>
        ${weak.length?weak.map(x=>`<div class="reviewItem"><strong>${esc(x.q.question)}</strong><div class="small">${blockLabel(x.q.block)} · ${esc(friendlyTopic(x.q))} · ${x.s.wrong} fallo(s)</div></div>`).join(""):`<div class="empty">Todavía no hay fallos registrados.</div>`}
        <div class="actions"><button class="secondary" onclick="startWeak()">Practicar falladas</button></div>
      </div>
      <div class="card">
        <h2>En blanco</h2>
        ${blanks.length?blanks.map(x=>`<div class="reviewItem"><strong>${esc(x.q.question)}</strong><div class="small">${esc(friendlyTopic(x.q))} · ${x.s.blank||0} vez/veces en blanco</div></div>`).join(""):`<div class="empty">No has dejado preguntas en blanco todavía.</div>`}
        <div class="actions"><button class="secondary" onclick="startBlanks()">Practicar en blanco</button></div>
      </div>
      <div class="card">
        <h2>Último intento</h2>
        ${last?`<div class="metric">${fmtPct(last.accuracy)}</div><p>${esc(last.name)}<br><span class="small">${new Date(last.date).toLocaleString()}</span></p>`:`<p>Aún no hay intentos terminados.</p>`}
      </div>
      <div class="card">
        <h2>Favoritas</h2>
        <div class="metric">${activeFavs}</div><div class="metricLabel">preguntas marcadas</div>
      </div>
      <div class="card full shortcutCard">
        <img src="sticker_dog_keep_going.gif" alt="Sticker de perro animando" class="miniGif">
        <div><h2>Atajos</h2><p><kbd>A</kbd> <kbd>B</kbd> <kbd>C</kbd> <kbd>D</kbd> responder · <kbd>←</kbd>/<kbd>→</kbd> navegar · <kbd>F</kbd> favorita · <kbd>Enter</kbd> continuar después de corregir.</p></div>
      </div>
    </section>`;
}

function topicOptions(block){
  const qs=bank().filter(q=>q.block===block);
  if(block==="psych"){
    const kinds=new Set(qs.map(psychKind));
    let html=`<option value="all">Todo verbal</option>`;
    if(kinds.has("syn")) html+=`<option value="sub:syn">Sinónimos</option>`;
    if(kinds.has("ant")) html+=`<option value="sub:ant">Antónimos</option>`;
    if(kinds.has("ort")) html+=`<option value="sub:ort">Ortografía y tildes</option>`;
    return html;
  }
  const ids=[...new Set(qs.map(q=>q.topic))].sort((a,b)=>a-b);
  return `<option value="all">Todos los temas</option>`+ids.map(t=>{
    const q=qs.find(x=>x.topic===t);
    const label=q?friendlyTopic(q):(topicNames[t]||"General");
    return `<option value="${t}">${esc(label)}</option>`;
  }).join("");
}
function matchesPracticeCategory(q,value){
  if(value==="all") return true;
  if(q.block==="psych" && value.startsWith("sub:")) return psychKind(q)===value.slice(4);
  return String(q.topic)===value;
}
function renderPracticeSetup(app){
  app.innerHTML=`
  <div class="grid">
    <div class="card full">
      <h2>Práctica personalizada</h2><p>En psicotécnico solo aparecerán sinónimos, antónimos y ortografía/tildes. Elige bloque, tipo o tema y cantidad.</p>
      <div class="formGrid">
        <div class="field"><label>Bloque</label><select id="pBlock" onchange="refreshPracticeTopics()">
          <option value="psych">Psicotécnico verbal</option><option value="legislation">Legislación</option><option value="office">Ofimática</option></select></div>
        <div class="field"><label>Tema / tipo</label><select id="pTopic">${topicOptions("psych")}</select></div>
        <div class="field"><label>Número de preguntas</label><input id="pCount" type="number" min="1" max="100" value="${state.settings.practiceCount||20}"></div>
        <div class="field"><label>Dificultad</label><select id="pDiff"><option value="all">Todas</option><option value="1">Básica</option><option value="2">Media</option><option value="3">Alta</option></select></div>
      </div>
      <label class="check"><input type="checkbox" id="pImmediate" checked> Corregir inmediatamente</label>
      <label class="check"><input type="checkbox" id="pShuffleOptions"> Barajar alternativas A-D</label>
      <div class="actions"><button class="primary" onclick="startPractice()">Comenzar</button><button class="secondary" onclick="startFavorites()">Solo favoritas</button><button class="secondary" onclick="startWeak()">Falladas</button><button class="secondary" onclick="startBlanks()">En blanco</button></div>
    </div>
  </div>`;
}
function refreshPracticeTopics(){
  const b=document.getElementById("pBlock").value;
  document.getElementById("pTopic").innerHTML=topicOptions(b);
}
function startPractice(){
  const b=document.getElementById("pBlock").value, t=document.getElementById("pTopic").value, d=document.getElementById("pDiff").value;
  let pool=bank().filter(q=>q.block===b && matchesPracticeCategory(q,t) && (d==="all"||String(q.difficulty)===d));
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
function startBlanks(){
  const pool=blankQuestions().map(x=>x.q);
  if(!pool.length) return toast("Todavía no tienes preguntas en blanco.");
  beginSession({mode:"practice",name:"Repaso de preguntas en blanco",questions:pool.slice(0,30),immediate:true,shuffleOptions:false,timeLimit:null});
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
        <h2>Primer ejercicio adaptado</h2>
        <p><strong>60 + 5 reserva · 65 min</strong><br>30 psicotécnicos verbales + 30 legislación. Las 5 reservas se corrigen aparte.</p>
        <div class="pill">Banco: ${counts.psych} verbal + ${counts.legislation} legislación</div>
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
    if(ps.length<33||lg.length<32) return toast("Necesitas al menos 33 psicotécnicas verbales y 32 de legislación.");
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
        <span class="pill topicNamePill">${esc(friendlyTopic(q))}</span>
        ${q.subtype && friendlyTopic(q)!==q.subtype?`<span class="pill">${esc(q.subtype)}</span>`:""}
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
      ${corrected && session.immediate?`
        <div class="actions afterOptionsNext">
          <button class="primary" onclick="nextQ()">${session.index===session.questions.length-1?"Finalizar":"Siguiente →"}</button>
        </div>`:""}
      ${corrected?feedbackHtml(q,ans):""}
      <div class="navRow">
        <button class="ghost" onclick="prevQ()" ${session.index===0?"disabled":""}>← Anterior</button>
        <div class="right">
          ${session.mode==="exam"?`<button class="ghost" onclick="toggleMarked()">${session.marked[q.id]?"★ Marcada":"☆ Marcar"}</button>`:""}
          ${session.immediate && ans!==undefined && !corrected?`<button class="primary" onclick="correctCurrent()">Corregir</button>`:""}
          ${session.immediate && ans===undefined?`<button class="secondary skipBtn" onclick="nextQ()">${session.index===session.questions.length-1?"Dejar en blanco y finalizar":"Dejar en blanco →"}</button>`:""}
          ${!session.immediate?`<button class="primary" onclick="nextQ()">${session.index===session.questions.length-1?"Finalizar":"Siguiente →"}</button>`:""}
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
  const reference=q.block==="legislation"?legalReference(q):"";
  const detail=q.detailedExplanation||q.explanation||"La respuesta correcta es la opción indicada.";
  return `<div class="feedback ${good?"good":"bad"}">
    <div class="feedbackLayout">
      <div class="feedbackText">
        <div class="feedbackResult">${good?"✓ Correcta":"✕ Incorrecta"}</div>
        <div class="explainBlock"><strong>Por qué:</strong><p>${esc(detail)}</p></div>
        <div class="explainBlock"><strong>Respuesta correcta:</strong><p>${displayLetterFor(q,q.correct)} · ${esc(q.options[q.correct])}</p></div>
        ${reference?`<div class="legalRef"><strong>Artículo / referencia normativa:</strong><span>${esc(reference)}</span></div>`:""}
        <div class="examTip"><strong>Para recordar:</strong> ${esc(examTip(q))}</div>
      </div>
      ${reactionHtml(q,good)}
    </div>
  </div>`;
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
    const s=state.qstats[q.id]||{seen:0,correct:0,wrong:0,blank:0};
    if(a===undefined){b++;s.blank=(s.blank||0)+1;}
    else if(a===q.correct){c++;s.correct=(s.correct||0)+1;s.seen=(s.seen||0)+1;}
    else {w++;s.wrong=(s.wrong||0)+1;s.seen=(s.seen||0)+1;}
    s.lastAt=Date.now();state.qstats[q.id]=s;
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
      <p><strong>Correcta: ${displayLetterFor(q,q.correct)} · ${esc(q.options[q.correct])}</strong></p>
      <p class="reviewExplanation">${esc(q.detailedExplanation||q.explanation||"")}</p>
      ${q.block==="legislation"?`<div class="legalRef"><strong>Artículo / referencia:</strong><span>${esc(legalReference(q))}</span></div>`:""}
      </div>`;
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
    const k=friendlyTopic(q);
    byTopic[k]=byTopic[k]||{seen:0,correct:0};
    byTopic[k].seen+=s.seen;byTopic[k].correct+=s.correct;
  });
  const rows=Object.entries(byTopic).map(([k,v])=>({k,...v,p:v.correct/v.seen*100})).sort((a,b)=>a.p-b.p);
  app.innerHTML=`
    <div class="grid">
      <div class="card full"><h2>Rendimiento por tema</h2>
        ${rows.length?rows.map(r=>`<div class="barRow"><span class="small">${esc(r.k)}</span><div class="bar ${progressClass(r.p)}"><span style="width:${r.p}%"></span></div><strong>${r.p.toFixed(0)}%</strong></div>`).join(""):`<div class="empty">Haz algunas prácticas para generar estadísticas.</div>`}
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
    q.topicName=q.topicName||topicNames[q.topic]||"General";q.subtype=q.subtype||"General";q.explanation=q.explanation||"";q.detailedExplanation=q.detailedExplanation||"";q.article=q.article||q.sourceArticle||"";q.context=q.context||"";
  });
  return arr;
}
function importQuestions(file){
  const r=new FileReader();r.onload=()=>{
    try{
      const arr=validateImported(JSON.parse(r.result));
      const existing=customBank(), map=new Map(existing.map(q=>[q.id,q]));arr.forEach(q=>map.set(q.id,q));
      localStorage.setItem(BANK_KEY,JSON.stringify([...map.values()]));
      const hidden=arr.filter(q=>q.block==="psych" && !psychKind(q)).length;
      toast(hidden?`${arr.length-hidden} activas · ${hidden} psicotécnicas no verbales ocultas`:`${arr.length} preguntas importadas.`);render();
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
  const hidden=hiddenPsychCount(), total=allBank().length;
  app.innerHTML=`
    <div class="grid">
      <div class="card half"><h2>Banco de preguntas</h2><p><strong>${bank().length} preguntas activas</strong> de ${total} almacenadas. ${hidden?`${hidden} psicotécnicas no verbales están ocultas y no saldrán en prácticas, simulacros, favoritas ni falladas.`:""}</p>
        <div class="actions"><label class="primary" style="display:inline-block">Importar JSON<input hidden type="file" accept=".json,application/json" onchange="importQuestions(this.files[0])"></label><button class="secondary" onclick="exportBank()">Exportar banco</button></div>
        <p class="small">Filtro psicotécnico activo: sinónimos, antónimos y ortografía/acentuación. Las preguntas numéricas, lógicas o de cálculo se conservan en el almacenamiento pero quedan fuera de la app.</p>
      </div>
      <div class="card half"><h2>Copia de seguridad</h2><p>Exporta tu historial, estadísticas y favoritas para moverlos a otro dispositivo.</p>
        <div class="actions"><button class="primary" onclick="exportProgress()">Exportar progreso</button><label class="secondary" style="display:inline-block">Importar progreso<input hidden type="file" accept=".json,application/json" onchange="importProgress(this.files[0])"></label></div>
      </div>
      <div class="card full"><h2>Formato de preguntas</h2>
        <p>En la carpeta de la app tienes <strong>plantilla-preguntas.json</strong>. El campo <code>correct</code> usa 0=A, 1=B, 2=C, 3=D. Los bancos nuevos pueden incluir <code>detailedExplanation</code> y <code>article</code>.</p>
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
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js?v=32",{updateViaCache:"none"}).catch(()=>{}));
}
render();
