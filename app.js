
(function(){
"use strict";
/* ---------- helpers ---------- */
const $ = (s, el=document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);
const today = () => { const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); };
const num = v => { if(v===""||v==null) return null; const n=parseFloat(String(v).replace(",", ".")); return isFinite(n)?n:null; };
const fmtKg = n => n==null ? "–" : (Math.round(n*100)/100).toLocaleString("pl-PL");
const DAYS = ["nd","pn","wt","śr","cz","pt","sb"];
const MONTHS = ["sty","lut","mar","kwi","maj","cze","lip","sie","wrz","paź","lis","gru"];
const fmtDate = iso => { const d=new Date(iso+"T12:00:00"); return d.getDate()+" "+MONTHS[d.getMonth()]; };
const dow = iso => DAYS[new Date(iso+"T12:00:00").getDay()];
const e1rm = (w,r) => (w && r) ? w*(1+r/30) : 0;
const plural = (n, a, b, c) => n===1 ? a : (n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20)) ? b : c;
const store = { get(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } }, set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} } };

const ICON = {
  train:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12"/></svg>',
  plan:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2v4M16 2v4M8 11h8M8 15h5"/></svg>',
  stats:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  team:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="9" r="5"/><path d="M8.5 13 7 22l5-3 5 3-1.5-9"/></svg>',
  up:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  info:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  cam:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
};

/* ---------- state ---------- */
const DEFAULT_BANDS = [ {name:"Czarna", color:"#2b2b2b"}, {name:"Fioletowa", color:"#7b4bb7"}, {name:"Zielona", color:"#2f9a52"}, {name:"Czerwona", color:"#d0402f"}, {name:"Żółta", color:"#e2b318"} ];

const SAMPLE_PLAN = () => ({ updatedAt: 0, days: [
  { id:"d-push", name:"Push", exercises:[
    { id:"e-bench", name:"Wyciskanie leżąc", sets:3, repMin:6, repMax:8, weight:60, inc:2.5 },
    { id:"e-ohp", name:"Wyciskanie nad głowę", sets:3, repMin:8, repMax:10, weight:35, inc:2.5 },
    { id:"e-dips", name:"Pompki na poręczach", sets:3, repMin:8, repMax:12, weight:0, inc:2.5 },
    { id:"e-hs", name:"Stanie na rękach", type:"time", sets:3, secGoal:20, secInc:5 } ]},
  { id:"d-pull", name:"Pull", exercises:[
    { id:"e-row", name:"Wiosłowanie sztangą", sets:3, repMin:8, repMax:10, weight:50, inc:2.5 },
    { id:"e-pullup", name:"Podciąganie z gumą", type:"band", sets:3, repMin:5, repMax:8, band:1 },
    { id:"e-curl", name:"Uginanie ze sztangą", sets:3, repMin:10, repMax:12, weight:25, inc:1.25 } ]},
  { id:"d-legs", name:"Nogi", exercises:[
    { id:"e-squat", name:"Przysiad", sets:3, repMin:5, repMax:6, weight:80, inc:5 },
    { id:"e-rdl", name:"Martwy ciąg rumuński", sets:3, repMin:8, repMax:10, weight:70, inc:5 },
    { id:"e-calf", name:"Wspięcia na palce", sets:3, repMin:12, repMax:15, weight:40, inc:5 } ]},
]});

let S = store.get("dp.state") || { v:1, name:"", plan: SAMPLE_PLAN(), samplePlan:true, workouts:{}, friends:[] };
if(!S.workouts) S.workouts = {};
if(!S.friends) S.friends = [];
S.settings = Object.assign({ prog:"drop", bands: DEFAULT_BANDS.map(b=>({...b})) }, S.settings||{});
let UI = Object.assign({ tab:"train", activeId:null, statEx:null }, store.get("dp.ui")||{});
const saveLocal = () => { store.set("dp.state", S); store.set("dp.ui", UI); };

const liveWorkouts = () => Object.values(S.workouts).filter(w=>!w.deleted).sort((a,b)=> a.date===b.date ? (a.createdAt||0)-(b.createdAt||0) : a.date<b.date?-1:1);
const findPlanEx = id => { for(const d of S.plan.days) for(const e of d.exercises) if(e.id===id) return e; return null; };
const allExercises = () => { const m=new Map(); for(const d of S.plan.days) for(const e of d.exercises) m.set(e.id,e.name); for(const w of liveWorkouts()) for(const e of w.exercises) if(!m.has(e.exId)) m.set(e.exId,e.name); return m; };

/* ---------- training logic ---------- */
/* Three kinds of exercise: with weight (kg), with an assistance band, or held for time (handstand). */
const TYPES = { weight:"Ciężar (kg)", band:"Guma (odciążenie)", time:"Na czas (sekundy)" };
const bands = () => S.settings.bands;
const bandName = i => i==null ? "–" : i >= bands().length ? "Bez gumy" : (bands()[i] ? bands()[i].name : "Guma " + (i+1));
const typeOf = ex => ex.type || "weight";
const progOf = pe => (pe.prog || S.settings.prog || "drop");
/* The number a set is judged by: kg, band level (higher = less help), or seconds. */
function setValue(ex, s){ const t = typeOf(ex); return t==="time" ? (s.sec||0) : t==="band" ? (s.b==null ? 0 : s.b+1) : (s.w||0); }
function setDone(ex, s){ return typeOf(ex)==="time" ? (s.sec!=null && s.sec>0) : (s.r!=null && s.r>0); }
function fmtVal(ex, v){ const t = typeOf(ex); return t==="time" ? `${fmtKg(v)} s` : t==="band" ? (v>0 ? bandName(v-1) : "–") : `${fmtKg(v)} kg`; }
function fmtSet(ex, s){ const t = typeOf(ex); return t==="time" ? `${fmtKg(s.sec)} s` : t==="band" ? `${bandName(s.b)}×${s.r}` : `${fmtKg(s.w)}×${s.r}`; }
function exStats(ex){
  const t = typeOf(ex);
  const sets = ex.sets.filter(s => setDone(ex, s));
  const top = sets.reduce((m,s)=>Math.max(m, setValue(ex,s)), 0);
  const reps = sets.reduce((m,s)=>m+(t==="time" ? (s.sec||0) : (s.r||0)), 0);
  const vol = t==="weight" ? sets.reduce((m,s)=>m+(s.w||0)*(s.r||0), 0) : reps;
  const best = t==="weight" ? sets.reduce((m,s)=>Math.max(m, e1rm(s.w||0, s.r||0)), 0) : top;
  const fats = sets.filter(s=>s.fat!=null).map(s=>s.fat);
  const rates = sets.filter(s=>s.rate).map(s=>s.rate);
  return { sets:sets.length, top, reps, vol, best,
    fat: fats.length? fats.reduce((a,b)=>a+b,0)/fats.length : null,
    rate: rates.length? rates.reduce((a,b)=>a+b,0)/rates.length : null };
}
function previousEx(exId, beforeDate, excludeId){
  const ws = liveWorkouts().filter(w => w.id!==excludeId && w.date<beforeDate);
  for(let i=ws.length-1;i>=0;i--){ const e = ws[i].exercises.find(x=>x.exId===exId && exStats(x).sets>0); if(e) return { w:ws[i], ex:e }; }
  return null;
}
/* Goal reached = every planned set at the top of the rep range (or the target hold time).
   Then the next session gets more load: +kg, a lighter band, or +seconds. With the "drop" setting
   the rep goal goes back to the bottom of the range (3×8 at 60 kg → 3×6 at 62.5 kg). */
function suggestion(ex){
  const t = typeOf(ex);
  const done = ex.sets.filter(s => setDone(ex, s));
  if(done.length < ex.targetSets) return null;
  const first = done.slice(0, ex.targetSets);
  if(t==="time"){
    const goal = ex.secGoal || 0, low = Math.min(...first.map(s=>s.sec||0));
    if(goal && low >= goal) return { kind:"up", text:`Następnym razem: ${ex.targetSets} × ${goal + (ex.secInc||5)} s.`, nextSec: goal + (ex.secInc||5) };
    return { kind:"hold", text: goal ? `Zostań przy celu ${ex.targetSets} × ${goal} s, aż zrobisz wszystkie serie.` : "" };
  }
  const allTop = first.every(s => (s.r||0) >= ex.repMax);
  const anyLow = first.some(s => (s.r||0) < ex.repMin);
  const lowRir = first.some(s => s.rir!=null && s.rir<=0);
  const nextReps = (ex.prog || S.settings.prog || "drop")==="drop" ? ex.repMin : ex.repMax;
  if(t==="band"){
    const b = Math.max(...first.map(s=>s.b==null?0:s.b));
    if(allTop){
      if(b >= bands().length) return { kind:"done-free", text:"Robisz pełny zakres bez gumy. Zmień typ ćwiczenia na Ciężar i zacznij dokładać kg." };
      return { kind:"up", nextB:b+1, nextReps, lowRir, text:`Następnym razem: ${ex.targetSets} × ${nextReps} z gumą ${bandName(b+1).toLowerCase()}${b+1>=bands().length?"":""}.` };
    }
    const minR = Math.min(...first.map(s=>s.r||0));
    return anyLow ? { kind:"hold-low", text:`Część serii poniżej ${ex.repMin} powt. Zostań przy gumie ${bandName(b).toLowerCase()}.` }
                  : { kind:"hold", text:`Zostań przy gumie ${bandName(b).toLowerCase()}, celuj w ${Math.min(ex.repMax, minR+1)} powt. w każdej serii.` };
  }
  const w = Math.max(...first.map(s=>s.w||0));
  if(allTop) return { kind:"up", next: w + (ex.inc||2.5), nextReps, lowRir, text:`Następnym razem: ${ex.targetSets} × ${nextReps} przy ${fmtKg(w + (ex.inc||2.5))} kg.` };
  const minR = Math.min(...first.map(s=>s.r||0));
  if(anyLow) return { kind:"hold-low", text:`Część serii poniżej ${ex.repMin} powt. Zostań przy ${fmtKg(w)} kg, aż zrobisz pełny zakres.` };
  return { kind:"hold", text:`Zostań przy ${fmtKg(w)} kg, celuj w ${Math.min(ex.repMax, minR+1)} powt. w każdej serii.` };
}
function compare(ex, workout){
  const prev = previousEx(ex.exId, workout.date, workout.id);
  if(!prev) return null;
  const a = exStats(prev.ex), b = exStats(ex);
  return { prev, d:{ top:b.top-a.top, reps:b.reps-a.reps, sets:b.sets-a.sets, vol:b.vol-a.vol } };
}
function chip(val, unit, label){
  if(val==null) return "";
  const r = Math.round(val*100)/100;
  const cls = r>0?"up":r<0?"down":"same";
  const sign = r>0?"+":"";
  return `<span class="chip ${cls}">${label} ${sign}${r.toLocaleString("pl-PL")}${unit}</span>`;
}
function bandChip(d){ return `<span class="chip ${d>0?"up":d<0?"down":"same"}">Guma ${d>0?"słabsza":d<0?"mocniejsza":"ta sama"}</span>`; }

/* Achievements are derived from the log, so they stay correct after edits on any device. */
function achievements(workouts){
  const out = []; const best = {}; const first = {}; const gainHit = {};
  workouts.forEach((w, i) => {
    const n = i+1;
    if(n===1) out.push({ date:w.date, kind:"count", t:"Pierwszy trening zapisany", d:"Każdy progres zaczyna się od pierwszego wpisu." });
    if([5,10,25,50,100,200].includes(n)) out.push({ date:w.date, kind:"count", t:`${n} treningów`, d:"Regularność robi robotę." });
    for(const ex of w.exercises){
      const st = exStats(ex); if(!st.sets) continue;
      const t = typeOf(ex);
      if(!(ex.exId in first)) first[ex.exId] = st.top;
      if(ex.exId in best && st.top > best[ex.exId] && st.top>0){
        if(t==="band") out.push({ date:w.date, kind:"pr", t:`Słabsza guma: ${ex.name}`, d:`Teraz ${fmtVal(ex, st.top).toLowerCase()}, wcześniej ${fmtVal(ex, best[ex.exId]).toLowerCase()}.` });
        else out.push({ date:w.date, kind:"pr", t:`Nowy rekord: ${ex.name} ${fmtVal(ex, st.top)}`, d:`Poprzednio najwięcej ${fmtVal(ex, best[ex.exId])}.` });
      }
      best[ex.exId] = Math.max(best[ex.exId]||0, st.top);
      const gain = st.top - first[ex.exId];
      const steps = t==="time" ? [10,20,30,60,90] : t==="weight" ? [5,10,20,30,50] : [];
      for(const g of steps){
        const key = ex.exId+":"+g;
        if(gain>=g && !gainHit[key]){ gainHit[key]=1; out.push({ date:w.date, kind:"gain", t:`+${g} ${t==="time"?"s":"kg"} na ${ex.name}`, d:`Od ${fmtVal(ex, first[ex.exId])} do ${fmtVal(ex, st.top)}.` }); }
      }
      const sg = suggestion(ex);
      if(sg && sg.kind==="up") out.push({ date:w.date, kind:"done", t:`Cel zrobiony: ${ex.name}`, d: sg.text });
    }
  });
  return out.reverse();
}
function gains(workouts){
  const m = {};
  for(const w of workouts) for(const ex of w.exercises){
    const st = exStats(ex); if(!st.sets || !st.top) continue;
    if(!m[ex.exId]) m[ex.exId] = { ex, name:ex.name, from:st.top, best:st.top };
    m[ex.exId].best = Math.max(m[ex.exId].best, st.top); m[ex.exId].name = ex.name; m[ex.exId].ex = ex;
  }
  return Object.values(m).map(g => { const t = typeOf(g.ex);
    return { name:g.name, unit: t==="time"?"s":t==="band"?"guma":"kg", from:g.from, best:g.best, gain:g.best-g.from,
      label: t==="band" ? (g.best>g.from ? `${g.best-g.from} ${plural(g.best-g.from,"guma","gumy","gum")} mniej` : "ta sama guma") : `+${fmtKg(g.best-g.from)} ${t==="time"?"s":"kg"}`,
      range: `${fmtVal(g.ex,g.from)} → ${fmtVal(g.ex,g.best)}` }; });
}

function mySummary(){
  const ws = liveWorkouts();
  return { name: S.name || "Ja", workouts: ws.length, last: ws.length? ws[ws.length-1].date : null,
    gains: gains(ws), achievements: achievements(ws).slice(0, 25), updatedAt: Date.now() };
}

/* ---------- sync (Supabase) ---------- */
/* Local storage is the source of truth on each device; Supabase mirrors it so the
   iPhone, the computer and the brother's account see the same data. Newer updatedAt wins. */
const CFG = window.DP_CONFIG || {};
const Sync = { sb:null, user:null, uid:null, state:"off", athletes:{}, pending:new Map(), writing:new Set(), pulling:false, configured:false };
function setSync(state, text){
  Sync.state = state;
  $("#sync").innerHTML = `<span class="dot ${state}"></span><span>${esc(text)}</span>`;
}
async function initSync(){
  Sync.configured = !!(CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase);
  if(!Sync.configured){ setSync("off","Tylko to urządzenie"); return; }
  if(!/^https:\/\/.+\.supabase\.co\/?$/.test(CFG.supabaseUrl)){ Sync.configured = false; Sync.lastError = "W config.js pole supabaseUrl musi być adresem w stylu https://xxxx.supabase.co"; setSync("off","Błąd konfiguracji"); return; }
  try{
    Sync.sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth:{ persistSession:true, autoRefreshToken:true } });
    const { data } = await Sync.sb.auth.getSession();
    onAuth(data.session);
  }catch(e){ Sync.configured = false; Sync.lastError = "Nie udało się połączyć z Supabase: " + ((e && e.message) || e); setSync("off","Błąd konfiguracji"); softRender(); return; }
  softRender();
  Sync.sb.auth.onAuthStateChange((_e, session) => onAuth(session));
  document.addEventListener("visibilitychange", () => { if(document.visibilityState==="visible") pull(); });
  window.addEventListener("online", () => pull());
  setInterval(() => { if(document.visibilityState==="visible") pull(); }, 60000);
}
function onAuth(session){
  const id = session && session.user ? session.user.id : null;
  if(id === Sync.uid) return;
  Sync.user = session ? session.user : null; Sync.uid = id;
  if(!id){ Sync.athletes = {}; setSync("off","Niezalogowany"); softRender(); return; }
  Sync.pushedAll = false; pull();
}
async function pull(){
  if(!Sync.sb || !Sync.uid || Sync.pulling) return;
  if(!navigator.onLine){ setSync("off","Offline, zapisano lokalnie"); return; }
  Sync.pulling = true; setSync("busy","Synchronizacja…");
  try{
    const [ws, ps] = await Promise.all([
      Sync.sb.from("workouts").select("id,data,updated_at").eq("user_id", Sync.uid),
      Sync.sb.from("profiles").select("id,name,plan,settings,friends,friends_at,summary,updated_at"),
    ]);
    if(ws.error) throw ws.error; if(ps.error) throw ps.error;
    let changed = false; const remote = {};
    for(const row of ws.data){
      remote[row.id] = row.updated_at || 0;
      const local = S.workouts[row.id];
      if(!local || (row.updated_at||0) > (local.updatedAt||0)){ S.workouts[row.id] = row.data; changed = true; }
    }
    const a = {};
    for(const p of ps.data) a[p.id] = { name:p.name, summary:p.summary };
    Sync.athletes = a;
    const mine = ps.data.find(p => p.id===Sync.uid);
    if(mine){
      if(mine.plan && (mine.plan.updatedAt||0) > (S.plan.updatedAt||0)){ S.plan = mine.plan; S.samplePlan = false; changed = true; }
      if(mine.name && !S.name) S.name = mine.name;
      if(mine.settings && (mine.settings.updatedAt||0) > (S.settings.updatedAt||0)){ S.settings = mine.settings; changed = true; }
      if(Array.isArray(mine.friends) && (mine.friends_at||0) > (S.friendsAt||0)){ S.friends = mine.friends; S.friendsAt = mine.friends_at; }
    }
    // push whatever this device has that the server lacks or has older
    for(const w of Object.values(S.workouts)) if(!w.sample && (!(w.id in remote) || remote[w.id] < (w.updatedAt||0))) queueWorkout(w.id);
    if(!mine || (mine.updated_at||0) < (S.profileAt||0) || !Sync.pushedAll) queueAthlete();
    Sync.pushedAll = true;
    saveLocal();
    Sync.lastError = null; Sync.lastOk = Date.now();
    setSync("ok","Zsynchronizowano");
    if(changed || UI.tab==="team") softRender();
  }catch(e){ Sync.lastError = (e && (e.message || e.hint)) || String(e); setSync("off","Błąd synchronizacji, zapisano lokalnie"); if(UI.tab==="team") softRender(); }
  finally{ Sync.pulling = false; }
}
function queueWorkout(id){
  const w = S.workouts[id];
  if(!Sync.sb || !Sync.uid || !w || w.sample) return;
  schedule("w:"+id, async () => { const cur = S.workouts[id]; const r = await Sync.sb.from("workouts").upsert({ user_id:Sync.uid, id, data:cur, updated_at:cur.updatedAt||Date.now() }); if(r.error) throw r.error; });
}
function queueAthlete(){
  S.profileAt = Date.now();
  if(!Sync.sb || !Sync.uid) return;
  schedule("a", async () => { const r = await Sync.sb.from("profiles").upsert({ id:Sync.uid, name:S.name||"", plan:S.plan, settings:S.settings, friends:S.friends, friends_at:S.friendsAt||0, summary:mySummary(), updated_at:Date.now() }); if(r.error) throw r.error; });
}
/* One write at a time per row, coalesced after a short pause. */
function schedule(key, fn){
  clearTimeout(Sync.pending.get(key));
  Sync.pending.set(key, setTimeout(async function run(){
    if(Sync.writing.has(key)){ Sync.pending.set(key, setTimeout(run, 600)); return; }
    Sync.pending.delete(key); Sync.writing.add(key); setSync("busy","Zapisywanie…");
    try{ await fn(); if(!Sync.pending.size) setSync("ok","Zsynchronizowano"); }
    catch(e){ Sync.lastError = (e && e.message) || String(e); setSync("off", navigator.onLine ? "Błąd zapisu, zapisano lokalnie" : "Offline, zapisano lokalnie"); }
    finally{ Sync.writing.delete(key); }
  }, 1200));
}
function touchWorkout(w){ w.updatedAt = Date.now(); saveLocal(); queueWorkout(w.id); queueAthlete(); }
function touchPlan(){ S.plan.updatedAt = Date.now(); S.samplePlan = false; saveLocal(); queueAthlete(); }
async function signIn(mode){
  const email = $("#auth-email").value.trim(), password = $("#auth-pass").value;
  const msg = $("#auth-msg");
  if(!email || password.length < 6){ msg.textContent = "Podaj e-mail i hasło (min. 6 znaków)."; return; }
  msg.textContent = mode==="up" ? "Zakładanie konta…" : "Logowanie…";
  const r = mode==="up" ? await Sync.sb.auth.signUp({ email, password }) : await Sync.sb.auth.signInWithPassword({ email, password });
  if(r.error){ msg.textContent = r.error.message.includes("Invalid login") ? "Zły e-mail albo hasło." : r.error.message; return; }
  if(mode==="up" && !r.data.session){ msg.textContent = "Konto założone. Potwierdź adres w mailu, potem się zaloguj."; return; }
  toast("Zalogowano"); render();
}
/* Videos go to a private Storage bucket under the user's own folder. */
const VIDEO_LIMIT = 50*1024*1024;
async function uploadVideo(key, file){
  if(!Sync.sb || !Sync.uid || file.size > VIDEO_LIMIT) return null;
  const path = `${Sync.uid}/${key}`;
  const r = await Sync.sb.storage.from("videos").upload(path, file, { contentType:file.type || "video/mp4", upsert:true });
  return r.error ? null : path;
}
function removeVideo(v){ if(v){ vdel(v.key); if(v.remote && Sync.sb) Sync.sb.storage.from("videos").remove([v.remote]); } }

/* ---------- local video store (IndexedDB) ---------- */
const VDB = { db:null, urls:{} };
function vdb(){ return VDB.db || (VDB.db = new Promise((res, rej) => { try{ const r = indexedDB.open("dp-videos",1); r.onupgradeneeded=()=>r.result.createObjectStore("v"); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }catch(e){ rej(e); } })); }
async function vput(key, blob){ const db = await vdb(); return new Promise((res,rej)=>{ const t=db.transaction("v","readwrite"); t.objectStore("v").put(blob,key); t.oncomplete=()=>res(); t.onerror=()=>rej(t.error); }); }
async function vget(key){ try{ const db = await vdb(); return await new Promise((res)=>{ const r=db.transaction("v").objectStore("v").get(key); r.onsuccess=()=>res(r.result||null); r.onerror=()=>res(null); }); }catch(e){ return null; } }
async function vdel(key){ try{ const db = await vdb(); db.transaction("v","readwrite").objectStore("v").delete(key); }catch(e){} }
async function videoUrl(v){
  if(!v) return null;
  if(VDB.urls[v.key]) return VDB.urls[v.key];
  const b = await vget(v.key);
  if(b) return (VDB.urls[v.key] = URL.createObjectURL(b));
  if(v.remote && Sync.sb){ const r = await Sync.sb.storage.from("videos").createSignedUrl(v.remote, 3600); if(!r.error) return (VDB.urls[v.key] = r.data.signedUrl); }
  return null;
}

/* ---------- UI shell ---------- */
const TABS = [ ["train","Trening",ICON.train], ["plan","Plan",ICON.plan], ["stats","Statystyki",ICON.stats], ["team","Razem",ICON.team] ];
function renderTabs(){
  const html = TABS.map(([k,l,i]) => `<button data-tab="${k}" aria-current="${UI.tab===k}">${i}<span>${l}</span></button>`).join("");
  document.querySelectorAll("nav.tabs").forEach(n => n.innerHTML = html);
}
let toastT;
function toast(msg){ let t=$(".toast"); if(!t){ t=document.createElement("div"); t.className="toast"; t.setAttribute("role","status"); document.body.appendChild(t); } t.textContent=msg; t.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>t.hidden=true, 2600); }
function render(){
  renderTabs();
  const app = $("#app");
  const v = { train: viewTrain, plan: viewPlan, stats: viewStats, team: viewTeam }[UI.tab] || viewTrain;
  app.innerHTML = v();
  afterRender();
  saveLocal();
}
/* Re-render from a remote update, but never under the user's fingers. */
function softRender(){
  const a = document.activeElement;
  if(a && a.closest && a.closest("#app") && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) { Sync.dirtyView = true; return; }
  if($("#modal-root").children.length) { Sync.dirtyView = true; return; }
  render();
}
document.addEventListener("focusout", () => setTimeout(() => { if(Sync.dirtyView && !(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))){ Sync.dirtyView=false; if(UI.tab!=="train" || !UI.activeId) render(); } }, 50));

/* ---------- view: train ---------- */
function viewTrain(){
  const w = UI.activeId && S.workouts[UI.activeId];
  if(w && !w.deleted) return viewWorkout(w);
  UI.activeId = null;
  const ws = liveWorkouts();
  const days = S.plan.days.map(d => {
    const last = [...ws].reverse().find(x => x.dayId===d.id);
    return `<button class="day-btn" data-start="${d.id}"><strong>${esc(d.name)}</strong><span class="small muted">${d.exercises.length} ${plural(d.exercises.length,"ćwiczenie","ćwiczenia","ćwiczeń")}</span><span class="small muted">${last ? "Ostatnio " + fmtDate(last.date) : "Jeszcze nie robiony"}</span></button>`;
  }).join("");
  const hist = ws.slice().reverse().slice(0, 40).map(histItem).join("");
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) && !(window.navigator.standalone || matchMedia("(display-mode: standalone)").matches);
  return `
  ${ios && !UI.hideInstall ? `<div class="banner info">${ICON.info}<span style="flex:1">Na iPhonie dotknij <strong>Udostępnij</strong>, potem <strong>Do ekranu początkowego</strong>. Aplikacja otworzy się jak zwykła apka, na pełnym ekranie.</span><button class="btn sm ghost" data-hideinstall aria-label="Ukryj">✕</button></div>` : ""}
  <section class="card">
    <div class="row between"><h2>Nowy trening</h2>${S.samplePlan?'<span class="sample-tag">Przykładowy plan</span>':""}</div>
    <div class="row"><label class="field" style="max-width:200px"><span class="label">Dzień</span><input type="date" id="start-date" value="${UI.startDate||today()}"></label></div>
    ${S.plan.days.length ? `<div class="days">${days}</div>` : `<div class="empty">Nie masz jeszcze planu. <button class="btn primary" data-tab="plan">Ułóż plan</button></div>`}
    ${S.samplePlan ? `<p class="small muted" style="margin:0">To przykładowy plan. Zmień go w zakładce Plan na swój.</p>`:""}
  </section>
  <section class="card">
    <div class="row between"><h2>Historia</h2><span class="small muted num">${ws.length} ${plural(ws.length,"trening","treningi","treningów")}</span></div>
    ${ws.length ? `<div class="hist">${hist}</div>` : `<div class="empty"><span>Tu pojawią się Twoje treningi z porównaniem do poprzednich.</span><span class="small">Wybierz dzień powyżej, żeby zapisać pierwszy.</span></div>`}
  </section>`;
}
function histItem(w){
  let up=0, down=0;
  for(const ex of w.exercises){ const c = compare(ex, w); if(!c) continue; if(c.d.top>0 || (c.d.top===0 && c.d.reps>0)) up++; else if(c.d.top<0 || c.d.reps<0) down++; }
  const st = w.exercises.map(exStats); const vol = st.reduce((a,s)=>a+s.vol,0);
  const fats = st.filter(s=>s.fat!=null).map(s=>s.fat);
  return `<button class="hist-item" data-open="${w.id}">
    <div class="hist-date num">${fmtDate(w.date)}<span>${dow(w.date)}</span></div>
    <div class="hist-main"><strong>${esc(w.dayName)}</strong><div class="small muted num">${st.reduce((a,s)=>a+s.sets,0)} serii · ${fmtKg(vol)} kg objętości${fats.length?` · zmęczenie ${(fats.reduce((a,b)=>a+b,0)/fats.length).toFixed(1)}/10`:""}</div></div>
    <div class="cmp">${up?`<span class="chip up">${up} w górę</span>`:""}${down?`<span class="chip down">${down} w dół</span>`:""}${w.sample?'<span class="sample-tag">przykład</span>':""}</div>
  </button>`;
}
function startWorkout(dayId){
  const day = S.plan.days.find(d=>d.id===dayId); if(!day) return;
  const date = ($("#start-date") && $("#start-date").value) || today();
  const w = { id:uid(), date, dayId, dayName:day.name, createdAt:Date.now(), note:"", exercises: day.exercises.map(pe => {
    const t = typeOf(pe);
    const prev = previousEx(pe.id, date+"~", null);
    let weight = pe.weight, band = pe.band ?? 0, secGoal = pe.secGoal || 20, goalReps = progOf(pe)==="drop" ? pe.repMin : pe.repMax, hint = null;
    if(prev){
      const pex = prev.ex, sg = suggestion(Object.assign({}, pex, { prog:pe.prog, repMin:pe.repMin, repMax:pe.repMax, inc:pe.inc, secInc:pe.secInc }));
      if(t==="weight"){ weight = exStats(pex).top; }
      if(t==="band"){ const bs = pex.sets.filter(s=>setDone(pex,s)).map(s=>s.b??0); band = bs.length ? Math.max(...bs) : band; }
      if(t==="time"){ secGoal = pex.secGoal || secGoal; }
      const minR = Math.min(...pex.sets.filter(s=>setDone(pex,s)).map(s=>s.r||0));
      goalReps = t==="time" ? null : Math.min(pe.repMax, Math.max(pe.repMin, (isFinite(minR)?minR:pe.repMin-1)+1));
      if(sg && sg.kind==="up"){
        if(t==="weight"){ weight = sg.next; goalReps = sg.nextReps; hint = `+${fmtKg(pe.inc)} kg i cel ${sg.nextReps} powt., bo ostatnio zrobiłeś komplet`; }
        if(t==="band"){ band = sg.nextB; goalReps = sg.nextReps; hint = `słabsza guma (${bandName(sg.nextB).toLowerCase()}) i cel ${sg.nextReps} powt., bo ostatnio zrobiłeś komplet`; }
        if(t==="time"){ secGoal = sg.nextSec; hint = `cel ${sg.nextSec} s, bo ostatnio wszystkie serie trwały ${pex.secGoal||secGoal} s lub dłużej`; }
      }
    }
    return { exId:pe.id, name:pe.name, type:t, targetSets:pe.sets, repMin:pe.repMin, repMax:pe.repMax, inc:pe.inc, prog:pe.prog||"",
      secGoal: t==="time" ? secGoal : undefined, secInc: pe.secInc, goalReps, hint,
      sets: Array.from({length:pe.sets}, () => t==="time" ? { sec:null, rate:null, fat:null, note:"", video:null }
        : t==="band" ? { b:band, r:null, rir:null, rate:null, fat:null, note:"", video:null }
        : { w:weight, r:null, rir:null, rate:null, fat:null, note:"", video:null }) };
  })};
  S.workouts[w.id] = w; UI.activeId = w.id; touchWorkout(w); render(); window.scrollTo(0,0);
}

function viewWorkout(w){
  return `
  <section class="card">
    <div class="row between">
      <button class="btn ghost sm" data-close>← Wróć</button>
      <span class="small muted">${Sync.state==="ok"?"Zapisuje się na bieżąco":"Zapisuje się na tym urządzeniu"}</span>
    </div>
    <div class="row between">
      <h2>${esc(w.dayName)}</h2>
      <label class="field" style="max-width:170px"><span class="label">Data</span><input type="date" data-wf="date" value="${w.date}"></label>
    </div>
    ${w.sample?'<div class="banner warn">To przykładowy trening. Usuń przykłady w zakładce Statystyki.</div>':""}
  </section>
  ${w.exercises.map((ex,i)=>exCard(w,ex,i)).join("")}
  <section class="card">
    <label class="field"><span class="label">Notatka do treningu</span><textarea data-wf="note" placeholder="Samopoczucie, sen, co poprawić następnym razem">${esc(w.note)}</textarea></label>
    <div class="row between">
      <button class="btn primary" data-close>Zakończ trening</button>
      <button class="btn danger" data-del="${w.id}">${UI.confirmDel===w.id?"Na pewno usunąć?":"Usuń trening"}</button>
    </div>
  </section>`;
}
function goalText(ex){
  const t = typeOf(ex);
  if(t==="time") return `Cel: ${ex.targetSets} × ${ex.secGoal||"?"} s`;
  const g = ex.goalReps ? ` · dziś celuj w ${ex.goalReps}` : "";
  return `Cel: ${ex.targetSets} × ${ex.repMin}–${ex.repMax} powt.${g}`;
}
function exCard(w, ex, i){
  const prev = previousEx(ex.exId, w.date, w.id);
  const prevTxt = prev ? `Ostatnio (${fmtDate(prev.w.date)}): ${prev.ex.sets.filter(s=>setDone(prev.ex,s)).map(s=>fmtSet(prev.ex,s)).join(", ")}` : "Pierwszy raz to ćwiczenie";
  return `<section class="card" data-ex="${i}">
    <div class="ex-head">
      <div><h3>${esc(ex.name)}</h3><div class="small muted num">${goalText(ex)}</div></div>
      <div class="lasttime num">${esc(prevTxt)}</div>
    </div>
    ${ex.hint?`<div class="banner info">${ICON.info}<span>Ustawione z progresją: ${esc(ex.hint)}.</span></div>`:""}
    <div class="sets">${ex.sets.map((s,j)=>setRow(ex,s,i,j)).join("")}</div>
    <div class="row"><button class="btn sm" data-addset="${i}">+ Seria</button>${ex.sets.length>1?`<button class="btn sm ghost" data-rmset="${i}">− Usuń ostatnią</button>`:""}</div>
    <div data-sum="${i}">${exSummary(w, ex)}</div>
  </section>`;
}
function bandSelect(attr, val){ return `<select ${attr}>${bands().map((b,k)=>`<option value="${k}" ${val===k?"selected":""}>${esc(b.name)}</option>`).join("")}<option value="${bands().length}" ${val===bands().length?"selected":""}>Bez gumy</option></select>`; }
function setRow(ex, s, i, j){
  const t = typeOf(ex);
  const done = setDone(ex, s);
  const main = t==="time"
    ? `<label class="field" style="grid-column:span 3"><span class="label">Sekundy</span><input type="number" inputmode="numeric" data-sf="sec" value="${s.sec??""}" placeholder="cel ${ex.secGoal||""} s"></label>`
    : `${t==="band" ? `<label class="field"><span class="label">Guma</span>${bandSelect('data-sf="b"', s.b)}</label>`
                    : `<label class="field"><span class="label">kg</span><input type="number" inputmode="decimal" step="0.25" data-sf="w" value="${s.w??""}"></label>`}
       <label class="field"><span class="label">Powt.</span><input type="number" inputmode="numeric" data-sf="r" value="${s.r??""}" placeholder="${ex.goalReps || (ex.repMin+"–"+ex.repMax)}"></label>
       <label class="field"><span class="label">RIR</span><input type="number" inputmode="numeric" min="0" max="10" data-sf="rir" value="${s.rir??""}" placeholder="0–5"></label>`;
  return `<div class="set ${t} ${done?"done":""}" data-set="${i}.${j}">
    <div class="no num">${j+1}</div>
    ${main}
    <div class="full set-extra">
      <div class="field"><span class="label">${t==="time"?"Technika (1–5)":"Jak poszło (1–5)"}</span><div class="rate">${[1,2,3,4,5].map(n=>`<button data-rate="${n}" class="${s.rate===n?"on":""}" aria-label="Ocena ${n}">${n}</button>`).join("")}</div></div>
      <label class="field"><span class="label">${t==="time"?"Ciężkość (1–10)":"Zmęczenie po serii"}</span><span class="fat"><input type="range" min="1" max="10" step="1" data-sf="fat" value="${s.fat??5}"><output class="num">${s.fat==null?"–":s.fat+"/10"}</output></span></label>
    </div>
    <div class="full set-tools">
      ${s.video ? `<button class="btn sm" data-sticker="${i}.${j}">${ICON.cam} Film i naklejka</button><button class="btn sm ghost danger" data-rmvid="${i}.${j}">Usuń film</button>${s.video.remote?'<span class="chip accent">w chmurze</span>':'<span class="chip">na tym urządzeniu</span>'}`
        : `<label class="btn sm">${ICON.cam} Dodaj film<input type="file" accept="video/*" data-video="${i}.${j}" hidden></label>`}
      <button class="btn sm ghost" data-note="${i}.${j}">${s.note?"Uwagi ✎":"+ Uwagi techniczne"}</button>
    </div>
    ${(s.note || UI.noteOpen===`${i}.${j}`) ? `<label class="field full"><span class="label">Uwagi techniczne</span><textarea data-sf="note" placeholder="${t==="time"?"np. łokcie ugięte, za mocno wygięte plecy":"np. kolana uciekały do środka w 3. powtórzeniu"}">${esc(s.note)}</textarea></label>`:""}
  </div>`;
}
function exSummary(w, ex){
  const t = typeOf(ex);
  const sg = suggestion(ex);
  const c = exStats(ex).sets ? compare(ex, w) : null;
  let html = "";
  if(c){
    if(t==="time") html += `<div class="cmp">${chip(c.d.top," s","Najdłużej")}${chip(c.d.reps," s","Łącznie")}${chip(c.d.sets,"","Serie")}</div>`;
    else if(t==="band") html += `<div class="cmp">${bandChip(c.d.top)}${chip(c.d.reps,"","Powt.")}${chip(c.d.sets,"","Serie")}</div>`;
    else html += `<div class="cmp">${chip(c.d.top," kg","Ciężar")}${chip(c.d.reps,"","Powt.")}${chip(c.d.sets,"","Serie")}${chip(c.d.vol," kg","Objętość")}</div>`;
  }
  if(sg && sg.kind==="up"){
    const head = t==="time" ? "Wydłuż czas." : t==="band" ? "Weź słabszą gumę." : "Zwiększ ciężar.";
    html += `<div class="banner go" style="margin-top:10px">${ICON.up}<span><strong>${head}</strong> Cel zrobiony we wszystkich ${ex.targetSets} seriach. ${esc(sg.text)}${sg.lowRir?" Część serii była do upadku (RIR 0), więc zacznij ostrożnie.":""}</span></div>`;
  } else if(sg && sg.kind==="done-free") html += `<div class="banner go" style="margin-top:10px">${ICON.up}<span>${esc(sg.text)}</span></div>`;
  else if(sg && sg.text) html += `<div class="banner ${sg.kind==="hold-low"?"warn":"info"}" style="margin-top:10px">${ICON.info}<span>${esc(sg.text)}</span></div>`;
  return html;
}

/* ---------- view: plan ---------- */
function planExRow(e, di, ei){
  const t = typeOf(e);
  const f = (k, label, v, mode="numeric") => `<label class="field"><span class="label">${label}</span><input type="number" inputmode="${mode}" data-pe="${k}" value="${v??""}"></label>`;
  let fields;
  if(t==="time") fields = f("sets","Serie",e.sets) + f("secGoal","Cel (s)",e.secGoal) + f("secInc","Krok (s)",e.secInc);
  else fields = f("sets","Serie",e.sets) + f("repMin","Powt. min",e.repMin) + f("repMax","Cel powt.",e.repMax)
    + (t==="band" ? `<label class="field wide"><span class="label">Guma na start</span>${bandSelect('data-pe="band"', e.band??0)}</label>`
                  : f("weight","Start kg",e.weight,"decimal") + f("inc","Krok kg",e.inc,"decimal"));
  const progSel = t==="time" ? "" : `<label class="field prog"><span class="label">Po zrobieniu celu</span><select data-pe="prog">
      <option value="" ${!e.prog?"selected":""}>Jak w ustawieniach</option>
      <option value="drop" ${e.prog==="drop"?"selected":""}>${t==="band"?"Słabsza guma":"Więcej kg"}, powt. od minimum</option>
      <option value="keep" ${e.prog==="keep"?"selected":""}>${t==="band"?"Słabsza guma":"Więcej kg"}, powt. bez zmian</option></select></label>`;
  return `<div class="plan-ex" data-pex="${di}.${ei}">
    <div class="plan-top">
      <label class="field nm"><span class="label">Ćwiczenie</span><input type="text" data-pe="name" value="${esc(e.name)}"></label>
      <label class="field"><span class="label">Rodzaj</span><select data-pe="type">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}" ${t===k?"selected":""}>${v}</option>`).join("")}</select></label>
      <button class="btn sm ghost" data-rmex="${di}.${ei}" aria-label="Usuń ćwiczenie">✕</button>
    </div>
    <div class="plan-fields">${fields}${progSel}</div>
  </div>`;
}
function viewPlan(){
  const st = S.settings;
  return `
  <section class="card">
    <div class="row between"><h2>Twój plan</h2>${S.samplePlan?'<span class="sample-tag">Przykład</span>':""}</div>
    <p class="small muted" style="margin:0">Ustaw serie i zakres powtórzeń. Gdy zrobisz wszystkie serie na „cel powt.”, aplikacja podpowie więcej kg albo słabszą gumę. Ćwiczenia na czas, np. stanie na rękach, liczą sekundy, technikę i ciężkość.</p>
  </section>
  ${S.plan.days.map((d,di)=>`
  <section class="card" data-day="${di}">
    <div class="row between"><label class="field" style="flex:1;max-width:320px"><span class="label">Nazwa dnia</span><input type="text" data-pd="name" value="${esc(d.name)}"></label>
      <button class="btn sm ghost danger" data-rmday="${di}">${UI.confirmDay===di?"Na pewno?":"Usuń dzień"}</button></div>
    <div class="plan-list">${d.exercises.map((e,ei)=>planExRow(e,di,ei)).join("")}</div>
    <div class="row"><button class="btn sm" data-addex="${di}">+ Ćwiczenie</button></div>
  </section>`).join("")}
  <div class="row"><button class="btn primary" data-addday>+ Dodaj dzień treningowy</button></div>
  <section class="card">
    <h2>Ustawienia progresji</h2>
    <label class="field" style="max-width:520px"><span class="label">Gdy zrobisz cel (np. 3 × 8)</span>
      <select id="set-prog">
        <option value="drop" ${st.prog==="drop"?"selected":""}>Dołóż kg i zmniejsz powtórzenia do minimum (3 × 8 → 3 × 6, +2,5 kg)</option>
        <option value="keep" ${st.prog==="keep"?"selected":""}>Dołóż kg, powtórzenia bez zmian (3 × 8 → 3 × 8, +2,5 kg)</option>
      </select></label>
    <p class="small muted" style="margin:0">Każde ćwiczenie może mieć własne ustawienie w polu „Po zrobieniu celu”. Wielkość dokładki ustawiasz w „Krok kg”.</p>
    <h3>Twoje gumy</h3>
    <p class="small muted" style="margin:0">Od najmocniejszej (najwięcej pomaga) do najsłabszej. Progres to przejście na gumę niżej na liście.</p>
    <div class="bands">${st.bands.map((b,k)=>`<div class="row band-row" data-band="${k}">
      <input type="color" data-bf="color" value="${esc(b.color)}" aria-label="Kolor gumy">
      <input type="text" data-bf="name" value="${esc(b.name)}" style="flex:1;max-width:260px" aria-label="Nazwa gumy">
      ${k===st.bands.length-1 && st.bands.length>1 ? `<button class="btn sm ghost danger" data-rmband="${k}" aria-label="Usuń gumę">✕</button>`:""}</div>`).join("")}</div>
    <p class="small muted" style="margin:0">Nową gumę dodajesz na koniec listy jako najsłabszą, bo zapisane serie pamiętają pozycję gumy.</p>
    <div class="row"><button class="btn sm" data-addband>+ Guma</button></div>
  </section>`;
}

/* ---------- view: stats ---------- */
function lineChart(series, opts={}){
  const W=640, H=opts.h||220, L=opts.fmt?78:44, R=14, T=14, B=28;
  const pts = series.flatMap(s=>s.data); if(!pts.length) return "";
  const n = Math.max(...series.map(s=>s.data.length));
  let lo = Math.min(...pts.map(p=>p.y)), hi = Math.max(...pts.map(p=>p.y));
  if(opts.zero) lo = 0;
  if(hi===lo){ hi += 1; lo = Math.max(0, lo-1); }
  const raw = (hi-lo)/4, mag = Math.pow(10, Math.floor(Math.log10(raw))), step = Math.max(opts.fmt?1:0, [1,2,2.5,5,10].map(m=>m*mag).find(v=>v>=raw));
  lo = Math.max(0, Math.floor(lo/step)*step); hi = Math.ceil(hi/step)*step; if(hi===lo) hi = lo+step;
  const x = i => n<=1 ? (L+(W-L-R)/2) : L + i*(W-L-R)/(n-1);
  const y = v => T + (H-T-B)*(1-(v-lo)/(hi-lo));
  let g = "";
  for(let v=lo; v<=hi+1e-9; v+=step){ g += `<line class="grid" x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L-6}" y="${y(v)+4}" text-anchor="end">${esc(opts.fmt ? opts.fmt(v) : (Math.round(v*100)/100).toLocaleString("pl-PL"))}</text>`; }
  const labels = series[0].data; const every = Math.ceil(labels.length/6);
  labels.forEach((p,i)=>{ if(i%every===0 || i===labels.length-1) g += `<text x="${x(i)}" y="${H-8}" text-anchor="middle">${esc(p.label)}</text>`; });
  let marks = "";
  series.forEach(s => {
    const d = s.data.map((p,i)=>`${i?"L":"M"}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join("");
    if(s.area && s.data.length>1) marks += `<path d="${d}L${x(s.data.length-1)},${y(lo)}L${x(0)},${y(lo)}Z" fill="${s.color}" opacity=".12"/>`;
    marks += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" ${s.dash?'stroke-dasharray="5 4"':""}/>`;
    const lp = s.data[s.data.length-1];
    s.data.forEach((p,i)=>{ marks += `<circle cx="${x(i)}" cy="${y(p.y)}" r="${i===s.data.length-1?4.5:2.5}" fill="${s.color}"><title>${esc(p.label)}: ${p.y}</title></circle>`; });
    if(lp) marks += `<text x="${Math.min(x(s.data.length-1), W-R-4)}" y="${y(lp.y)-9}" text-anchor="end" style="fill:${s.color};font-weight:700">${esc(opts.fmt ? opts.fmt(lp.y) : Math.round(lp.y*10)/10)}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label||"Wykres")}">${g}${marks}</svg>`;
}
function viewStats(){
  const ws = liveWorkouts();
  const hasSample = ws.some(w=>w.sample);
  if(!ws.length) return `
  <section class="card"><h2>Statystyki</h2>
    <div class="empty"><span>Po pierwszych treningach zobaczysz tu wykresy ciężaru, szacowanego maksa, objętości i zmęczenia.</span>
    <button class="btn" data-sample>Pokaż na przykładowych danych</button><span class="small">Przykłady są oznaczone i możesz je usunąć jednym kliknięciem.</span></div>
  </section>`;
  const exMap = allExercises();
  const used = [...new Set(ws.flatMap(w=>w.exercises.filter(e=>exStats(e).sets).map(e=>e.exId)))];
  if(!UI.statEx || !used.includes(UI.statEx)) UI.statEx = used[0];
  const since = new Date(); since.setDate(since.getDate()-30); const sinceIso = since.toISOString().slice(0,10);
  const last30 = ws.filter(w=>w.date>=sinceIso).length;
  const g = gains(ws); const totalGain = g.filter(x=>x.unit==="kg").reduce((a,x)=>a+Math.max(0,x.gain),0);
  const fatSeries = ws.map(w => { const f = w.exercises.flatMap(e=>e.sets).filter(s=>s.fat!=null && (s.r || s.sec)).map(s=>s.fat); return f.length ? { label:fmtDate(w.date), y: Math.round(f.reduce((a,b)=>a+b,0)/f.length*10)/10 } : null; }).filter(Boolean);
  const rateSeries = ws.map(w => { const f = w.exercises.flatMap(e=>e.sets).filter(s=>s.rate && (s.r || s.sec)).map(s=>s.rate); return f.length ? { label:fmtDate(w.date), y: Math.round(f.reduce((a,b)=>a+b,0)/f.length*10)/10 } : null; }).filter(Boolean);
  const avgFat = fatSeries.length ? (fatSeries.slice(-5).reduce((a,p)=>a+p.y,0)/Math.min(5,fatSeries.length)) : null;

  const rows = ws.map(w => { const e = w.exercises.find(x=>x.exId===UI.statEx); return e && exStats(e).sets ? { w, e, st:exStats(e) } : null; }).filter(Boolean);
  const topS = rows.map(r=>({ label:fmtDate(r.w.date), y:r.st.top }));
  const rmS = rows.map(r=>({ label:fmtDate(r.w.date), y:Math.round(r.st.best*10)/10 }));
  const volS = rows.map(r=>({ label:fmtDate(r.w.date), y:r.st.vol }));
  const fatigueLabel = avgFat==null ? "–" : avgFat.toFixed(1);
  const sx = rows.length ? rows[rows.length-1].e : { type:"weight" }, tt = typeOf(sx);
  const bandFmt = v => Number.isInteger(v) && v>0 ? bandName(v-1) : "";
  const mainChart = tt==="time"
    ? `<div class="legend"><span><i style="background:var(--accent)"></i>Najdłuższa seria (s)</span></div>${lineChart([{data:topS,color:"var(--accent)",area:true}], {label:"Czas w czasie", zero:true})}<div class="label">Łączny czas w serii (s)</div>${lineChart([{data:volS,color:"var(--green)",area:true}], {h:150, zero:true, label:"Łączny czas"})}`
    : tt==="band"
    ? `<div class="legend"><span><i style="background:var(--accent)"></i>Guma (wyżej = mniej pomocy)</span></div>${lineChart([{data:topS,color:"var(--accent)",area:true}], {label:"Guma w czasie", fmt:bandFmt})}<div class="label">Powtórzenia łącznie</div>${lineChart([{data:volS,color:"var(--green)",area:true}], {h:150, zero:true, label:"Powtórzenia"})}`
    : `<div class="legend"><span><i style="background:var(--accent)"></i>Najwyższy ciężar (kg)</span><span><i style="background:var(--red)"></i>Szacowany max 1 powt. (kg)</span></div>${lineChart([{data:rmS,color:"var(--red)",dash:true},{data:topS,color:"var(--accent)",area:true}], {label:"Ciężar w czasie"})}<div class="label">Objętość (kg × powt.)</div>${lineChart([{data:volS,color:"var(--green)",area:true}], {h:150, zero:true, label:"Objętość"})}`;
  return `
  ${hasSample?`<div class="banner warn">${ICON.info}<span style="flex:1">Widzisz przykładowe dane.</span><button class="btn sm" data-clearsample>Usuń przykłady</button></div>`:""}
  <div class="tiles">
    <div class="tile"><span class="label">Treningi</span><b>${ws.length}</b><span class="small muted">${last30} w ostatnich 30 dniach</span></div>
    <div class="tile"><span class="label">Dołożone kg</span><b>+${fmtKg(totalGain)}</b><span class="small muted">suma po ćwiczeniach</span></div>
    <div class="tile"><span class="label">Zmęczenie</span><b>${fatigueLabel}<span class="small muted">/10</span></b><span class="small muted">średnio, 5 ostatnich</span></div>
    <div class="tile"><span class="label">Rekordy</span><b>${achievements(ws).filter(a=>a.kind==="pr").length}</b><span class="small muted">nowych rekordów i słabszych gum</span></div>
  </div>
  <section class="card">
    <div class="row between"><h2>Ćwiczenie</h2>
      <select id="stat-ex" style="max-width:260px">${used.map(id=>`<option value="${id}" ${id===UI.statEx?"selected":""}>${esc(exMap.get(id)||id)}</option>`).join("")}</select></div>
    ${mainChart}
    <div class="tbl-wrap"><table><thead><tr><th>Data</th><th>Serie</th><th class="n">Najlepsza</th><th class="n">${tt==="time"?"Łącznie s":"Powt."}</th><th class="n">${tt==="weight"?"Objętość":"RIR śr."}</th><th class="n">${tt==="time"?"Technika":"Ocena"}</th><th class="n">${tt==="time"?"Ciężkość":"Zmęcz."}</th></tr></thead><tbody>
      ${rows.slice().reverse().map(r=>{ const rirs=r.e.sets.filter(s=>s.rir!=null&&s.r).map(s=>s.rir); return `<tr><td>${fmtDate(r.w.date)}</td><td class="num">${r.e.sets.filter(s=>setDone(r.e,s)).map(s=>fmtSet(r.e,s)).join(", ")}</td><td class="n">${esc(fmtVal(r.e, r.st.top))}</td><td class="n">${fmtKg(r.st.reps)}</td><td class="n">${typeOf(r.e)==="weight" ? fmtKg(r.st.vol) : (rirs.length?(rirs.reduce((a,b)=>a+b,0)/rirs.length).toFixed(1):"–")}</td><td class="n">${r.st.rate?r.st.rate.toFixed(1):"–"}</td><td class="n">${r.st.fat!=null?r.st.fat.toFixed(1):"–"}</td></tr>`; }).join("")}
    </tbody></table></div>
  </section>
  <div class="grid2">
    <section class="card"><h3>Zmęczenie po seriach</h3><span class="small muted">Średnia z treningu, 1 = lekko, 10 = na maksa (przy ćwiczeniach na czas to ciężkość)</span>
      ${fatSeries.length ? lineChart([{data:fatSeries,color:"var(--red)",area:true}],{h:170,label:"Zmęczenie"}) : '<p class="small muted">Ustaw suwak zmęczenia przy seriach, a zobaczysz trend.</p>'}</section>
    <section class="card"><h3>Jak szło</h3><span class="small muted">Średnia ocena serii 1–5</span>
      ${rateSeries.length ? lineChart([{data:rateSeries,color:"var(--yellow)",area:true}],{h:170,label:"Ocena"}) : '<p class="small muted">Oceniaj serie od 1 do 5, a zobaczysz trend.</p>'}</section>
  </div>
`;
}
function loadSample(){
  const plan = S.plan; let d = new Date(); d.setDate(d.getDate()-7*6);
  const pick = plan.days.length ? plan.days : SAMPLE_PLAN().days;
  for(let k=0;k<12;k++){
    const day = pick[k%pick.length];
    const iso = new Date(d.getTime() + k*3.5*864e5).toISOString().slice(0,10);
    const w = { id:uid(), sample:true, date:iso, dayId:day.id, dayName:day.name, createdAt:Date.now()+k, note:"", exercises: day.exercises.map(pe=>{
      const t = typeOf(pe), step = Math.floor(k/pick.length), top = step%2===1;
      const base = { exId:pe.id, name:pe.name, type:t, targetSets:pe.sets, repMin:pe.repMin, repMax:pe.repMax, inc:pe.inc, prog:pe.prog||"", secInc:pe.secInc };
      const extra = j => ({ rate: 3+((k+j)%3), fat: Math.min(10,5+j+(k%3)), note:"", video:null });
      if(t==="time"){ base.secGoal = (pe.secGoal||20) + Math.floor(step/2)*(pe.secInc||5);
        base.sets = Array.from({length:pe.sets},(_,j)=>Object.assign({ sec: top ? base.secGoal + 2 - j : base.secGoal - 4 - j*2 }, extra(j))); return base; }
      const r = j => top ? pe.repMax : Math.max(pe.repMin, pe.repMax - 1 - (j>1?1:0));
      if(t==="band"){ base.sets = Array.from({length:pe.sets},(_,j)=>Object.assign({ b:Math.min((pe.band||0)+Math.floor(step/2), S.settings.bands.length), r:r(j), rir:Math.max(0,2-j) }, extra(j))); return base; }
      base.sets = Array.from({length:pe.sets},(_,j)=>Object.assign({ w:(pe.weight||0) + Math.floor(step/2)*(pe.inc||2.5), r:r(j), rir:Math.max(0,2-j) }, extra(j)));
      return base;
    })};
    S.workouts[w.id] = w;
  }
  saveLocal(); render();
}

/* ---------- view: team ---------- */
function viewTeam(){
  const me = mySummary();
  const others = Object.entries(Sync.athletes).filter(([id,a]) => id!==Sync.uid && a && a.summary).map(([id,a]) => Object.assign({ src:"cloud", id }, a.summary, { name:a.name || a.summary.name || "Brat" }));
  const friends = S.friends.map((f,i)=>Object.assign({ src:"code", idx:i }, f));
  const people = [me, ...others, ...friends];
  const ach = achievements(liveWorkouts());
  // exercises in common, matched by name
  const names = new Map();
  people.forEach((p,pi)=>(p.gains||[]).forEach(g=>{ const k=g.name.trim().toLowerCase(); if(!names.has(k)) names.set(k,{name:g.name, by:{}}); names.get(k).by[pi]=g; }));
  const common = [...names.values()].filter(x=>Object.keys(x.by).length>1 || people.length===1);
  const maxGain = {}; [...names.values()].forEach(x=>Object.values(x.by).forEach(g=>{ const u=g.unit||"kg"; maxGain[u]=Math.max(maxGain[u]||1, g.gain); }));
  return `
  ${accountCard()}
  <section class="card">
    <div class="row between"><h2>Razem</h2></div>
    <p class="small muted" style="margin:0">Bez tabeli wyników. Liczy się, ile każdy dołożył od swojego startu, i każde „udało się”.</p>
    <div class="row"><label class="field" style="max-width:240px"><span class="label">Twoje imię</span><input type="text" id="my-name" value="${esc(S.name)}" placeholder="np. Oz"></label></div>
  </section>
  ${people.length>1 ? `<section class="card"><h3>Ile dołożyliśmy</h3>
    <div class="together" style="--n:${people.length}">
      <div class="tg label"><span>Ćwiczenie</span>${people.map(p=>`<span>${esc(p.name)}</span>`).join("")}</div>
      ${common.length ? common.map(x=>`<div class="tg"><strong>${esc(x.name)}</strong>${people.map((p,pi)=>{ const g=x.by[pi]; return g?`<div><span class="num"><strong>${esc(g.label || ("+"+fmtKg(g.gain)+" kg"))}</strong> <span class="small muted">${esc(g.range || (fmtKg(g.from)+"→"+fmtKg(g.best)))}</span></span><div class="bar"><i style="width:${Math.max(4,Math.min(100,g.gain/(maxGain[g.unit||"kg"]||1)*100))}%"></i></div></div>`:'<span class="small muted">–</span>'; }).join("")}</div>`).join("") : '<p class="small muted">Gdy zrobicie te same ćwiczenia (ta sama nazwa), pojawią się tu obok siebie.</p>'}
    </div></section>` : ""}
  <div class="duo">
    ${people.map((p,pi)=>personCard(p, pi===0 ? ach : (p.achievements||[]), pi===0)).join("")}
  </div>
  <section class="card">
    <h3>Dodaj brata</h3>
    <p class="small muted" style="margin:0">Najprościej: brat zakłada konto w tej aplikacji, a jego wyniki pojawią się tu same. Bez konta możecie wymienić się kodem osiągnięć: on kopiuje swój kod, Ty go wklejasz.</p>
    <div class="row"><button class="btn" data-copycode>Kopiuj mój kod osiągnięć</button></div>
    <textarea id="mycode" readonly hidden></textarea>
    <label class="field"><span class="label">Wklej kod brata</span><textarea id="friendcode" placeholder="DP1:…"></textarea></label>
    <div class="row"><button class="btn primary" data-addfriend>Dodaj</button></div>
  </section>
  <section class="card">
    <h3>Kopia zapasowa</h3>
    <p class="small muted" style="margin:0">Treningi zapisują się na tym urządzeniu${Sync.uid?" i na Twoim koncie, więc są też na iPhonie i komputerze":""}. Filmy zostają na urządzeniu, na którym je dodałeś${Sync.uid?", a te do 50 MB wysyłają się też na konto":""}.</p>
    <div class="row"><button class="btn" data-export>Pobierz kopię (JSON)</button><label class="btn">Wczytaj kopię<input type="file" accept="application/json,.json" id="import" hidden></label></div>
  </section>`;
}
function accountCard(){
  if(!Sync.configured) return `<div class="banner warn">${ICON.info}<span>${esc(Sync.lastError || "Synchronizacja nie jest jeszcze skonfigurowana. Dane zapisują się tylko na tym urządzeniu.")}</span></div>`;
  const status = Sync.lastError ? `<div class="banner warn">${ICON.info}<span>Problem z bazą: ${esc(Sync.lastError)}${/relation|schema cache|does not exist/i.test(Sync.lastError)?" Uruchom plik supabase/schema.sql w SQL Editor.":""}</span></div>`
    : Sync.lastOk ? `<div class="banner go">${ICON.up}<span>Połączenie z bazą działa. Ostatnia synchronizacja ${new Date(Sync.lastOk).toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit"})}.</span></div>` : "";
  if(Sync.uid) return `<section class="card"><div class="row between"><div><h3>Konto</h3><div class="small muted">${esc(Sync.user && Sync.user.email)}</div></div><button class="btn sm" data-signout>Wyloguj</button></div>${status}</section>`;
  return `<section class="card"><h3>Zaloguj się, żeby synchronizować</h3>
    <p class="small muted" style="margin:0">To samo konto na iPhonie i komputerze. Brat zakłada swoje własne.</p>
    <form id="auth-form" class="row" style="align-items:end">
      <label class="field" style="flex:1 1 200px"><span class="label">E-mail</span><input type="email" id="auth-email" autocomplete="email" style="background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:8px 10px;width:100%"></label>
      <label class="field" style="flex:1 1 160px"><span class="label">Hasło</span><input type="password" id="auth-pass" autocomplete="current-password" style="background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:8px 10px;width:100%"></label>
      <button class="btn primary" type="submit">Zaloguj</button><button class="btn" type="button" data-signup>Załóż konto</button>
    </form><div class="small muted" id="auth-msg" role="status"></div></section>`;
}
function personCard(p, ach, isMe){
  return `<section class="card">
    <div class="row between"><h3>${esc(p.name)}${isMe?' <span class="small muted">(Ty)</span>':""}</h3>
      ${!isMe && p.src==="code" ? `<button class="btn sm ghost danger" data-rmfriend="${p.idx}">Usuń</button>`:""}</div>
    <div class="small muted num">${p.workouts||0} ${plural(p.workouts||0,"trening","treningi","treningów")}${p.last?` · ostatni ${fmtDate(p.last)}`:""}</div>
    <div>${(ach||[]).slice(0,8).map(a=>`<div class="ach"><div class="medal ${a.kind}">${{pr:"PR",gain:"+",count:"#",done:"✓"}[a.kind]||"★"}</div><div><strong>${esc(a.t)}</strong><div class="small muted">${fmtDate(a.date)} · ${esc(a.d)}</div></div></div>`).join("") || '<p class="small muted">Pierwsze osiągnięcie pojawi się po pierwszym treningu.</p>'}</div>
  </section>`;
}
function encodeCode(){ const s = mySummary(); return "DP1:" + btoa(unescape(encodeURIComponent(JSON.stringify({ name:s.name, workouts:s.workouts, last:s.last, gains:s.gains, achievements:s.achievements.slice(0,15) })))); }
function decodeCode(t){ t = t.trim(); if(!t.startsWith("DP1:")) throw 0; const o = JSON.parse(decodeURIComponent(escape(atob(t.slice(4))))); if(!o || typeof o.name!=="string" || !Array.isArray(o.gains)) throw 0;
  return { name:o.name.slice(0,40), workouts:+o.workouts||0, last:typeof o.last==="string"?o.last.slice(0,10):null,
    gains:o.gains.slice(0,60).map(g=>({ name:String(g.name).slice(0,60), from:+g.from||0, best:+g.best||0, gain:+g.gain||0, unit:["kg","s","guma"].includes(g.unit)?g.unit:"kg", label:g.label?String(g.label).slice(0,40):undefined, range:g.range?String(g.range).slice(0,60):undefined })),
    achievements:(o.achievements||[]).slice(0,15).map(a=>({ date:String(a.date).slice(0,10), kind:["pr","gain","count","done"].includes(a.kind)?a.kind:"count", t:String(a.t).slice(0,90), d:String(a.d).slice(0,140) })), addedAt:Date.now() }; }

/* ---------- sticker + Instagram check ---------- */
const STICK = { styles:["Tablica","Taśma","Minimal"], pos:["Dół","Góra"] };
async function openSticker(i, j){
  const w = S.workouts[UI.activeId]; const ex = w.exercises[i]; const s = ex.sets[j];
  const url = await videoUrl(s.video);
  if(!url){ toast("Tego filmu nie ma na tym urządzeniu."); return; }
  const prevBest = Math.max(0, ...liveWorkouts().filter(x=>x.id!==w.id && x.date<=w.date).flatMap(x=>x.exercises.filter(e=>e.exId===ex.exId)).map(e=>exStats(e).top));
  const isPR = setValue(ex, s) > prevBest && prevBest>0;
  const tt = typeOf(ex), mainTxt = tt==="time" ? `${fmtKg(s.sec)} s` : tt==="band" ? `${bandName(s.b)} guma × ${s.r??"?"}` : `${fmtKg(s.w)} kg × ${s.r??"?"}`;
  const st = Object.assign({ style:0, pos:0, show:{ date:true, rir:true, pr:true, name:true }, checks:{} }, s.insta||{});
  const root = $("#modal-root");
  root.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="Film i naklejka"><div class="sheet">
    <div class="row between"><h2>Naklejka na film</h2><button class="btn ghost sm" data-mclose>Zamknij</button></div>
    <div class="stage"><canvas id="stk-canvas" width="720" height="1280"></canvas></div>
    <div class="row"><button class="btn sm" id="stk-play">▶ Odtwórz</button><span class="small muted">${esc(ex.name)} · seria ${j+1}: ${esc(mainTxt)}</span></div>
    <div class="field"><span class="label">Styl naklejki</span><div class="seg" id="stk-style">${STICK.styles.map((n,k)=>`<button aria-pressed="${st.style===k}" data-k="${k}">${n}</button>`).join("")}</div></div>
    <div class="field"><span class="label">Położenie</span><div class="seg" id="stk-pos">${STICK.pos.map((n,k)=>`<button aria-pressed="${st.pos===k}" data-k="${k}">${n}</button>`).join("")}</div></div>
    <div class="field"><span class="label">Pokaż</span><div class="seg" id="stk-show">${[["name","Ćwiczenie"],["date","Datę"],["rir","RIR"],["pr","Rekord"]].map(([k,n])=>`<button aria-pressed="${!!st.show[k]}" data-k="${k}">${n}</button>`).join("")}</div></div>
    <div class="row"><button class="btn primary" id="stk-frame">Zapisz kadr z naklejką</button><button class="btn" id="stk-rec">Nagraj film z naklejką</button></div>
    <h3>Czy to na Instagrama?</h3>
    <div id="insta"></div>
  </div></div>`;
  const cv = $("#stk-canvas"), ctx = cv.getContext("2d");
  const vid = document.createElement("video"); vid.src = url; vid.playsInline = true; vid.muted = true; vid.preload = "auto"; vid.crossOrigin = "anonymous";
  vid.setAttribute("playsinline","");
  let raf = 0;
  const label = { name:ex.name, kg:mainTxt, date:`${fmtDate(w.date)} ${w.date.slice(0,4)}`, rir: s.rir!=null?`RIR ${s.rir}`:null, pr:isPR };
  function drawSticker(){
    const W = cv.width, H = cv.height, u = W/360;
    const lines = [];
    const h = 64*u, pad = 14*u, y = st.pos===0 ? H - h - 28*u : 28*u + (st.pos===1?0:0);
    ctx.save();
    if(st.style===0){
      ctx.fillStyle = "rgba(15,20,30,.82)"; roundRect(ctx, pad, y, W-2*pad, h, 12*u); ctx.fill();
      ctx.fillStyle = "#c9372b"; roundRect(ctx, pad, y, 8*u, h, 4*u); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = `700 ${26*u}px "Barlow Condensed", sans-serif`; ctx.textBaseline = "top";
      ctx.fillText(label.kg, pad+20*u, y+10*u);
      ctx.font = `500 ${13*u}px Barlow, sans-serif`; ctx.fillStyle = "rgba(255,255,255,.8)";
      const sub = [st.show.name?label.name:null, st.show.date?label.date:null, st.show.rir?label.rir:null].filter(Boolean).join("  ·  ");
      ctx.fillText(sub, pad+20*u, y+40*u);
    } else if(st.style===1){
      ctx.translate(W/2, y + h/2); ctx.rotate(-0.04);
      ctx.fillStyle = "#e8b100"; ctx.fillRect(-W/2+pad, -h/2+6*u, W-2*pad, h-12*u);
      ctx.fillStyle = "#141c2b"; ctx.font = `700 ${28*u}px "Barlow Condensed", sans-serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(([st.show.name?label.name.toUpperCase():null, label.kg.toUpperCase()].filter(Boolean)).join("  /  "), 0, 0, W-4*pad);
    } else {
      ctx.fillStyle = "#fff"; ctx.shadowColor="rgba(0,0,0,.6)"; ctx.shadowBlur=8*u; ctx.textBaseline="top";
      ctx.font = `700 ${34*u}px "Barlow Condensed", sans-serif`; ctx.fillText(label.kg, pad+4*u, y+4*u);
      ctx.font = `500 ${14*u}px Barlow, sans-serif`;
      ctx.fillText([st.show.name?label.name:null, st.show.date?label.date:null, st.show.rir?label.rir:null].filter(Boolean).join("  ·  "), pad+6*u, y+42*u);
    }
    ctx.restore();
    if(st.show.pr && label.pr){
      const r = 30*u, cx = W - pad - r, cy = st.pos===0 ? y - r - 6*u : y + h + r + 6*u;
      ctx.save(); ctx.fillStyle="#c9372b"; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#fff"; ctx.font=`700 ${20*u}px "Barlow Condensed", sans-serif`; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("REKORD", cx, cy); ctx.restore();
    }
  }
  function frame(){
    if(vid.videoWidth){ if(cv.width!==vid.videoWidth){ cv.width = vid.videoWidth; cv.height = vid.videoHeight; } ctx.drawImage(vid,0,0,cv.width,cv.height); }
    else { ctx.fillStyle="#222"; ctx.fillRect(0,0,cv.width,cv.height); }
    drawSticker();
  }
  function loop(){ frame(); if(!vid.paused && !vid.ended) raf = requestAnimationFrame(loop); }
  vid.addEventListener("loadeddata", ()=>{ try{ vid.currentTime = Math.min(0.5, (vid.duration||1)/2); }catch(e){} frame(); });
  vid.addEventListener("seeked", frame);
  vid.addEventListener("play", ()=>{ $("#stk-play").textContent="❚❚ Pauza"; loop(); });
  vid.addEventListener("pause", ()=>{ $("#stk-play").textContent="▶ Odtwórz"; });
  vid.addEventListener("ended", ()=>{ $("#stk-play").textContent="▶ Odtwórz"; });
  const persist = () => { s.insta = { style:st.style, pos:st.pos, show:st.show, checks:st.checks }; touchWorkout(w); };
  const segs = (id, fn) => $(id).addEventListener("click", e => { const b = e.target.closest("button"); if(!b) return; fn(b.dataset.k); $(id).querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed", id==="#stk-show" ? String(!!st.show[x.dataset.k]) : String(x===b))); frame(); persist(); });
  segs("#stk-style", k=>st.style=+k); segs("#stk-pos", k=>st.pos=+k); segs("#stk-show", k=>st.show[k]=!st.show[k]);
  $("#stk-play").onclick = () => vid.paused ? vid.play().catch(()=>{}) : vid.pause();
  $("#stk-frame").onclick = () => { frame(); cv.toBlob(b => saveFile(`${slug(ex.name)}-${w.date}-seria${j+1}.png`, b), "image/png"); };
  $("#stk-rec").onclick = () => recordWithSticker(vid, cv, loop, `${slug(ex.name)}-${w.date}-seria${j+1}`);
  // Instagram check: automatic signals from the log + things only you can judge on the clip.
  const auto = [
    ["Technika oceniona na 4–5", (s.rate||0)>=4],
    tt==="time" ? ["Wytrzymany cel czasu", (s.sec||0) >= (ex.secGoal||0)] : ["Seria zrobiona w pełnym zakresie (≥ dolny cel powt.)", (s.r||0)>=ex.repMin],
    [tt==="time"?"Czas co najmniej taki jak ostatnio":tt==="band"?"Guma nie mocniejsza niż ostatnio":"Ciężar co najmniej taki jak ostatnio", setValue(ex,s) >= (previousEx(ex.exId, w.date, w.id) ? exStats(previousEx(ex.exId, w.date, w.id).ex).top : 0)],
  ];
  const manual = [["light","Dobre światło, widać sylwetkę"],["frame","Całe ciało i sztanga w kadrze"],["stable","Telefon stabilny, bez przypadkowych osób"],["clean","Bez nieudanego powtórzenia na końcu"]];
  function renderInsta(){
    const score = auto.filter(a=>a[1]).length + manual.filter(([k])=>st.checks[k]).length + (label.pr?1:0);
    const max = auto.length + manual.length + 1;
    const cls = score>=max-1?"good":score>=max-3?"mid":"bad";
    const txt = cls==="good"?"Wrzucaj!":cls==="mid"?"Prawie. Popraw zaznaczone niżej.":"Lepiej zostaw do analizy techniki.";
    $("#insta").innerHTML = `<div class="verdict ${cls}"><b class="num">${score}/${max}</b><span><strong>${txt}</strong>${label.pr?'<br><span class="small">To rekord, więc jest się czym pochwalić.</span>':""}</span></div>
      ${auto.map(([t,ok])=>`<div class="check"><input type="checkbox" disabled ${ok?"checked":""}><span>${esc(t)} <span class="small muted">(z dziennika)</span></span></div>`).join("")}
      ${manual.map(([k,t])=>`<label class="check"><input type="checkbox" data-ck="${k}" ${st.checks[k]?"checked":""}><span>${esc(t)}</span></label>`).join("")}`;
  }
  $("#insta").addEventListener("change", e => { const k = e.target.dataset.ck; if(k){ st.checks[k] = e.target.checked; persist(); renderInsta(); } });
  renderInsta();
  root.querySelector(".modal").addEventListener("click", e => { if(e.target.classList.contains("modal") || e.target.closest("[data-mclose]")){ cancelAnimationFrame(raf); vid.pause(); vid.removeAttribute("src"); root.innerHTML=""; if(Sync.dirtyView){ Sync.dirtyView=false; } render(); } });
}
function roundRect(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
const slug = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/ł/g,"l").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
async function recordWithSticker(vid, cv, loop, name){
  if(!cv.captureStream || !window.MediaRecorder){ toast("Ta przeglądarka nie nagra filmu. Zapisz kadr."); return; }
  const types = ["video/mp4;codecs=avc1","video/mp4","video/webm;codecs=vp9","video/webm"];
  const type = types.find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || "";
  let rec; try{ rec = new MediaRecorder(cv.captureStream(30), type?{mimeType:type, videoBitsPerSecond:6e6}:{}); }catch(e){ toast("Nie udało się uruchomić nagrywania."); return; }
  const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  rec.onstop = () => { const b = new Blob(chunks, { type: rec.mimeType || "video/webm" }); saveFile(`${name}.${(rec.mimeType||"").includes("mp4")?"mp4":"webm"}`, b); };
  const btn = $("#stk-rec"); btn.disabled = true; btn.textContent = "Nagrywanie…";
  vid.currentTime = 0; await new Promise(r => vid.addEventListener("seeked", r, { once:true }));
  rec.start(250); vid.play().catch(()=>{});
  vid.addEventListener("ended", () => { rec.stop(); btn.disabled=false; btn.textContent="Nagraj film z naklejką"; }, { once:true });
}
async function saveFile(filename, data){
  if(!data) return;
  const blob = data instanceof Blob ? data : new Blob([data]);
  // On iPhone the share sheet lets you save straight to Photos or post to Instagram.
  try{ const f = new File([blob], filename, { type: blob.type }); if(navigator.canShare && navigator.canShare({ files:[f] })){ await navigator.share({ files:[f] }); return; } }catch(e){ if(e && e.name==="AbortError") return; }
  try{ const a = document.createElement("a"); a.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data])); a.download = filename; a.click(); }catch(e){ toast("Nie można zapisać pliku w tym widoku."); }
}

/* ---------- events ---------- */
function setAt(path){ const [i,j] = path.split(".").map(Number); const w = S.workouts[UI.activeId]; return { w, i, j, ex:w.exercises[i], s: j!=null ? w.exercises[i].sets[j] : null }; }
function refreshEx(i){ const w=S.workouts[UI.activeId]; const el = document.querySelector(`[data-sum="${i}"]`); if(el) el.innerHTML = exSummary(w, w.exercises[i]); }
function rerenderEx(i){ const w=S.workouts[UI.activeId]; const el = document.querySelector(`[data-ex="${i}"]`); if(el) el.outerHTML = exCard(w, w.exercises[i], i); }

document.addEventListener("click", async e => {
  const t = e.target.closest("button,[data-open]"); if(!t) return;
  const d = t.dataset;
  if(d.tab){ UI.tab = d.tab; UI.confirmDel = null; render(); window.scrollTo(0,0); return; }
  if(d.start){ startWorkout(d.start); return; }
  if(d.open){ UI.activeId = d.open; render(); window.scrollTo(0,0); return; }
  if("close" in d){ const w = S.workouts[UI.activeId]; if(w) touchWorkout(w); UI.activeId = null; UI.confirmDel=null; render(); toast("Trening zapisany"); return; }
  if(d.del){ if(UI.confirmDel!==d.del){ UI.confirmDel=d.del; t.textContent="Na pewno usunąć?"; return; }
    const w = S.workouts[d.del]; w.deleted = true; w.exercises.forEach(ex=>ex.sets.forEach(s=>s.video && removeVideo(s.video))); touchWorkout(w); UI.activeId=null; UI.confirmDel=null; render(); toast("Trening usunięty"); return; }
  if(d.addset){ const { w, ex } = setAt(d.addset); const last = ex.sets[ex.sets.length-1] || {}; ex.sets.push({ w:last.w??null, r:null, rir:null, rate:null, fat:null, note:"", video:null }); touchWorkout(w); rerenderEx(+d.addset); return; }
  if(d.rmset){ const { w, ex } = setAt(d.rmset); const s = ex.sets.pop(); if(s && s.video) removeVideo(s.video); touchWorkout(w); rerenderEx(+d.rmset); return; }
  if(d.rate){ const p = t.closest("[data-set]").dataset.set; const { w, s, i } = setAt(p); s.rate = s.rate===+d.rate ? null : +d.rate; touchWorkout(w); t.parentNode.querySelectorAll("button").forEach(b=>b.classList.toggle("on", +b.dataset.rate===s.rate)); refreshEx(i); return; }
  if(d.note){ UI.noteOpen = d.note; rerenderEx(+d.note.split(".")[0]); const ta = document.querySelector(`[data-set="${d.note}"] textarea`); if(ta) ta.focus(); return; }
  if(d.rmvid){ const { w, s, i } = setAt(d.rmvid); if(s.video){ removeVideo(s.video); s.video = null; s.insta = null; } touchWorkout(w); rerenderEx(i); return; }
  if(d.sticker){ const [i,j] = d.sticker.split(".").map(Number); openSticker(i,j); return; }
  // plan
  if(d.addday != null && "addday" in d){ S.plan.days.push({ id:"d-"+uid(), name:"Nowy dzień", exercises:[] }); touchPlan(); render(); return; }
  if(d.rmday){ const di=+d.rmday; if(UI.confirmDay!==di){ UI.confirmDay=di; t.textContent="Na pewno?"; return; } S.plan.days.splice(di,1); UI.confirmDay=null; touchPlan(); render(); return; }
  if("addband" in d){ S.settings.bands.push({ name:"Nowa guma", color:"#888888" }); S.settings.updatedAt = Date.now(); saveLocal(); queueAthlete(); render(); return; }
  if(d.rmband){ S.settings.bands.pop(); S.settings.updatedAt = Date.now(); saveLocal(); queueAthlete(); render(); return; }
  if(d.addex){ S.plan.days[+d.addex].exercises.push({ id:"e-"+uid(), name:"Nowe ćwiczenie", sets:3, repMin:8, repMax:12, weight:20, inc:2.5 }); touchPlan(); render(); return; }
  if(d.rmex){ const [di,ei] = d.rmex.split(".").map(Number); S.plan.days[di].exercises.splice(ei,1); touchPlan(); render(); return; }
  // stats
  if("sample" in d){ loadSample(); return; }
  if("clearsample" in d){ for(const w of Object.values(S.workouts)) if(w.sample) delete S.workouts[w.id]; saveLocal(); render(); toast("Przykłady usunięte"); return; }
  // team
  if("copycode" in d){ const code = encodeCode(); const ta = $("#mycode"); ta.value = code; ta.hidden = false;
    try{ await navigator.clipboard.writeText(code); toast("Kod skopiowany. Wyślij go bratu."); }catch(err){ ta.focus(); ta.select(); toast("Zaznaczyłem kod, skopiuj go ręcznie."); } return; }
  if("addfriend" in d){ try{ const f = decodeCode($("#friendcode").value); const k = S.friends.findIndex(x=>x.name===f.name); if(k>=0) S.friends[k]=f; else S.friends.push(f); S.friendsAt = Date.now(); saveLocal(); queueAthlete(); render(); toast(`Dodano: ${f.name}`); }catch(err){ toast("To nie wygląda na kod osiągnięć. Powinien zaczynać się od DP1:"); } return; }
  if(d.rmfriend){ S.friends.splice(+d.rmfriend,1); S.friendsAt = Date.now(); saveLocal(); queueAthlete(); render(); return; }
  if("hideinstall" in d){ UI.hideInstall = true; render(); return; }
  if("signup" in d){ signIn("up"); return; }
  if("signout" in d){ await Sync.sb.auth.signOut(); render(); return; }
  if("export" in d){ saveFile(`dziennik-progresu-${today()}.json`, new Blob([JSON.stringify(S,null,1)],{type:"application/json"})); return; }
});

document.addEventListener("input", e => {
  const t = e.target; const d = t.dataset;
  if(d.sf){
    const p = t.closest("[data-set]").dataset.set; const { w, s, i } = setAt(p);
    if(d.sf==="note") s.note = t.value;
    else if(d.sf==="fat"){ s.fat = +t.value; t.removeAttribute("data-unset"); t.nextElementSibling.textContent = s.fat+"/10"; }
    else s[d.sf] = num(t.value);
    t.closest(".set").classList.toggle("done", setDone(w.exercises[i], s));
    w.updatedAt = Date.now(); saveLocal(); queueWorkout(w.id); queueAthlete(); refreshEx(i); return;
  }
  if(d.wf){ const w = S.workouts[UI.activeId]; w[d.wf] = t.value; touchWorkout(w); if(d.wf==="date"){ w.exercises.forEach((_,i)=>refreshEx(i)); } return; }
  if(d.pd){ const di = +t.closest("[data-day]").dataset.day; S.plan.days[di].name = t.value; touchPlan(); return; }
  if(d.pe){ const [di,ei] = t.closest("[data-pex]").dataset.pex.split(".").map(Number); const ex = S.plan.days[di].exercises[ei]; ex[d.pe] = (d.pe==="name"||d.pe==="prog"||d.pe==="type") ? t.value : (num(t.value) ?? 0);
    if(d.pe==="type"){ if(t.value==="time"){ ex.secGoal = ex.secGoal||20; ex.secInc = ex.secInc||5; } if(t.value==="band" && ex.band==null) ex.band = 0; touchPlan(); render(); return; }
    touchPlan(); return; }
  if(d.bf){ const k = +t.closest("[data-band]").dataset.band; S.settings.bands[k][d.bf] = t.value; S.settings.updatedAt = Date.now(); saveLocal(); queueAthlete(); return; }
  if(t.id==="set-prog"){ S.settings.prog = t.value; S.settings.updatedAt = Date.now(); saveLocal(); queueAthlete(); return; }
  if(t.id==="my-name"){ S.name = t.value.slice(0,40); saveLocal(); queueAthlete(); return; }
  if(t.id==="start-date"){ UI.startDate = t.value; saveLocal(); return; }
});
document.addEventListener("change", async e => {
  const t = e.target;
  if(t.id==="stat-ex"){ UI.statEx = t.value; render(); return; }
  if(t.dataset.video){
    const f = t.files && t.files[0]; if(!f) return;
    const { w, s, i } = setAt(t.dataset.video);
    const key = "v-"+uid();
    try{ await vput(key, f); }catch(err){ toast("Nie udało się zapisać filmu na urządzeniu."); return; }
    s.video = { key, name:f.name, size:f.size, type:f.type };
    touchWorkout(w); rerenderEx(i); toast("Film dodany");
    try{ const path = await uploadVideo(key, f); if(path){ s.video.remote = path; touchWorkout(w); if(UI.activeId===w.id && !document.activeElement.matches("input,textarea")) rerenderEx(i); } }
    catch(err){ /* stays local only */ }
    return;
  }
  if(t.id==="import"){
    const f = t.files && t.files[0]; if(!f) return;
    try{ const o = JSON.parse(await f.text()); if(!o || !o.plan || !o.workouts) throw 0;
      S.plan = o.plan; S.plan.updatedAt = Date.now(); S.name = o.name || S.name; S.friends = o.friends || S.friends;
      for(const [id,w] of Object.entries(o.workouts)){ if(!S.workouts[id] || (w.updatedAt||0) > (S.workouts[id].updatedAt||0)){ S.workouts[id] = w; queueWorkout(id); } }
      S.samplePlan = false; saveLocal(); queueAthlete(); render(); toast("Kopia wczytana");
    }catch(err){ toast("Ten plik nie jest kopią Dziennika Progresu."); }
  }
});

function afterRender(){}
document.addEventListener("submit", e => { if(e.target.id==="auth-form"){ e.preventDefault(); signIn("in"); } });
document.addEventListener("click", e => { if(e.target.closest("#sync")){ UI.tab="team"; render(); window.scrollTo(0,0); } });

render();
initSync();
})();
