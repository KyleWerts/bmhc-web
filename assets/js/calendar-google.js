const CALENDAR_ID = '46e8437662cba189d8bb65bd2c03923c20f23b0cdea4af105709cb3e951120b4@group.calendar.google.com';
const API_KEY     = 'AIzaSyBScT2OoOX_TJ1jSGNmBVx8VHkxdaWzbzs';
const DISPLAY_TZ  = 'America/Los_Angeles';

const HIDE_EMPTY_DAYS       = true;                   
const STRIP_FILTER          = /board.*meeting/i;     
const STRIP_LOOKAHEAD_DAYS  = 180;                   

let currentMonday = mondayOf(new Date());

function mondayOf(d){
  const x = new Date(d);
  x.setHours(0,0,0,0);
  const dow = x.getDay(); 
  x.setDate(x.getDate() - (dow === 0 ? 6 : dow - 1));
  return x;
}
function addDays(d,n){ const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function sameDay(a,b){
  return a.getFullYear()===b.getFullYear() &&
         a.getMonth()===b.getMonth() &&
         a.getDate()===b.getDate();
}
function esc(s){ return (s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmtTime(dt){
  return new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit',timeZone:DISPLAY_TZ}).format(dt);
}
function fmtDate(dt){
  return new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric',timeZone:DISPLAY_TZ}).format(dt);
}
function fmtRangeLabel(a,b){ return `${fmtDate(a)} – ${fmtDate(b)}`; }

function rinkName(location){
  if (!location) return '';
  if (/Bakersfield Ice Sports Center/i.test(location)) return 'Bakersfield Ice Sports Center';
  if (/Lakes Arena Rink/i.test(location))            return 'Lakes Arena Rink';
  return (location.split(',')[0] || location).trim();
}

const TYPE_RULES = [
  { re:/HTFL 2/i,               label:'HTFL 2',     cls:'tag-htfl2' },
  { re:/HTFL/i,                 label:'HTFL',       cls:'tag-htfl'  },
  { re:/Saturday.*Pickup/i,     label:'Pickup',     cls:'tag-pickup'},
  { re:/Adult.*Learn.*Play/i,   label:'Adult LTP',  cls:'tag-ltp'   },
  { re:/tourn(ey|ament)/i,      label:'Tournament', cls:'tag-tournament' },
  { re:/board.*meeting/i,       label:'Board',      cls:'tag-board' },
];
function classify(summary){
  for (const r of TYPE_RULES) if (r.re.test(summary||'')) return r;
  return { label:'Event', cls:'tag-default' };
}

async function fetchEvents(start, end){
  const params = new URLSearchParams({
    key: API_KEY,
    singleEvents: 'true',
    orderBy: 'startTime',
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    maxResults: '250'
  });
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  const { items=[] } = await res.json();
  return itemsToEvents(items);
}
function itemsToEvents(items){
  return items.map(ev=>{
    const allDay = !!ev.start?.date;
    const start  = allDay ? new Date(ev.start.date+'T00:00:00') : new Date(ev.start.dateTime || ev.start);
    const end    = allDay ? new Date(ev.end.date  +'T00:00:00') : new Date(ev.end.dateTime   || ev.end);
    return {
      id:ev.id,
      summary:ev.summary||'(No title)',
      location:ev.location||'',
      description:ev.description||'',
      start, end, allDay
    };
  });
}

async function renderStrip(){
  const strip = document.getElementById('home-events');
  if (!strip) return;
  const titleEl = strip.querySelector('#strip-title') || strip.querySelector('strong') || strip.children[0];
  const whenEl  = strip.querySelector('#strip-when')  || strip.children[1];
  const whereEl = strip.querySelector('#strip-where') || strip.children[2];

  const now = new Date();
  const ahead = addDays(now, STRIP_LOOKAHEAD_DAYS);
  const events = (await fetchEvents(now, ahead)).sort((a,b)=>a.start-b.start);
  const nextBoard = events.find(e => STRIP_FILTER.test(e.summary||''));

  if (!nextBoard){
    titleEl.textContent = 'No upcoming board meetings';
    if (whenEl)  whenEl.textContent  = '';
    if (whereEl) whereEl.textContent = '';
    return;
  }
  titleEl.textContent = nextBoard.summary;
  if (whenEl)  whenEl.textContent  = ` ${fmtDate(nextBoard.start)} • ${nextBoard.allDay ? 'All day' : fmtTime(nextBoard.start)}`;
  if (whereEl) whereEl.textContent = ` ${rinkName(nextBoard.location)}`;
}

async function renderWeek(){
  const container = document.getElementById('home-scores');
  const nav       = document.getElementById('home-scores-nav');
  if (!container) return;

  if (nav && !nav.dataset.wired){
    nav.dataset.wired = '1';
    nav.innerHTML = `
      <div class="wkbtn-group">
        <button class="wkbtn" id="wk-prev"  type="button">&#x2039; Prev</button>
        <button class="wkbtn" id="wk-today" type="button">This Week</button>
        <button class="wkbtn" id="wk-next"  type="button">Next &#x203A;</button>
      </div>
      <span class="wklabel" id="wk-label"></span>
    `;

    document.getElementById('wk-prev').addEventListener('click', ()=>{
      currentMonday = addDays(currentMonday, -7);
      renderWeek();               
    });
    document.getElementById('wk-next').addEventListener('click', ()=>{
      currentMonday = addDays(currentMonday,  7);
      renderWeek();               
    });
    document.getElementById('wk-today').addEventListener('click', ()=>{
      currentMonday = mondayOf(new Date());
      renderWeek();               
    });

    window.addEventListener('keydown', (e)=>{
      if (e.key === 'ArrowLeft')  document.getElementById('wk-prev').click();
      if (e.key === 'ArrowRight') document.getElementById('wk-next').click();
      if (e.key.toLowerCase() === 't') document.getElementById('wk-today').click();
    });
  }

  const weekStart    = new Date(currentMonday);
  const weekEnd      = addDays(weekStart, 6);
  const weekEndExcl  = addDays(weekStart, 7);

  const wkLabel = document.getElementById('wk-label');
  if (wkLabel) wkLabel.textContent = fmtRangeLabel(weekStart, weekEnd);

  const events = (await fetchEvents(weekStart, weekEndExcl)).sort((a,b)=>a.start-b.start);

  container.innerHTML = ''; 

  let total = 0;
  for (let i=0;i<7;i++){
    const day = addDays(weekStart, i);
    const todays = events.filter(e => sameDay(e.start, day));
    total += todays.length;

    if (HIDE_EMPTY_DAYS && todays.length === 0) continue;

    const col  = document.createElement('div');
    col.className = 'day-col';

    const head = document.createElement('div');
    head.className = 'day-heading';
    head.textContent = fmtDate(day);
    col.appendChild(head);

    for (const e of todays){
      const chip = classify(e.summary);
      const when = e.allDay ? 'All day' : fmtTime(e.start);
      const rink = rinkName(e.location);

      const card = document.createElement('div');
      card.className = `scorebox ${chip.cls}`;
      card.innerHTML = `
        <div class="when">${esc(when)}</div>
        <div class="title"><span class="tag ${chip.cls}">${chip.label}</span> ${esc(e.summary)}</div>
        ${rink ? `<div class="rink">${esc(rink)}</div>` : ''}
      `;
      col.appendChild(card);
    }

    container.appendChild(col);
  }

  if (total === 0){
    container.innerHTML = `<div class="week-empty">No BMHC events scheduled this week — check back soon!</div>`;
  }else{
    container.scrollTo({ left: 0, behavior: 'instant' });
  }
}

/* ======================= BOOT ========================= */
document.addEventListener('DOMContentLoaded', async () => {
  await renderStrip();  
  await renderWeek();   
});
