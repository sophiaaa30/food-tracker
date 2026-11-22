import { openDatabase, getAllEntries, getEntriesByDate, putEntry, deleteEntry, getTargets, saveTargets, replaceAllData } from './db.js';

const DEFAULT_TARGETS = { calories: 2000, protein: 100, carbs: 250, fat: 65, fiber: 25, water: 2000 };
const NUTRIENTS = [
  { key:'protein', name:'蛋白質', unit:'g', icon:'◈', color:'#5a9985' },
  { key:'carbs', name:'碳水化合物', unit:'g', icon:'◇', color:'#d8a25f' },
  { key:'fat', name:'脂肪', unit:'g', icon:'◉', color:'#bf8d91' },
  { key:'fiber', name:'膳食纖維', unit:'g', icon:'❋', color:'#8b9db6' }
];
const MEALS = [{key:'breakfast',label:'早餐',emoji:'☀'},{key:'lunch',label:'午餐',emoji:'◐'},{key:'dinner',label:'晚餐',emoji:'☾'},{key:'snack',label:'點心',emoji:'✦'}];
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const fmt = num => Number(num || 0).toLocaleString('zh-TW', { maximumFractionDigits:1 });
const isoDate = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const today = () => isoDate(new Date());
const parseDay = value => { const [y,m,d] = value.split('-').map(Number); return new Date(y,m-1,d,12); };
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && isoDate(parseDay(value)) === value;
const randomId = () => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
let selectedDate = today();
let targets = { ...DEFAULT_TARGETS };
let editingId = null;
let entryType = 'food';
let toastTimer;
function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),3000); }
function safeText(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function totals(entries) { return entries.reduce((acc,e) => { if(e.type==='water') acc.water+=e.waterMl; else for(const key of ['calories','protein','carbs','fat','fiber'])acc[key]+=e[key]||0; return acc; }, {calories:0,protein:0,carbs:0,fat:0,fiber:0,water:0}); }
function updateDatePicker(){ $('#day-picker').value=selectedDate; }
async function renderDashboard(){
  updateDatePicker();
  const entries = await getEntriesByDate(selectedDate);
  const t = totals(entries);
  $('#calorie-total').textContent=fmt(t.calories); $('#calorie-goal').textContent=fmt(targets.calories);
  const remaining=targets.calories-t.calories;
  $('#calorie-remaining').textContent=remaining>=0?`還可攝取 ${fmt(remaining)} kcal`:`超出目標 ${fmt(Math.abs(remaining))} kcal`;
  const percent=Math.round(t.calories/targets.calories*100);
  $('#ring-percent').textContent=`${percent}%`;
  $('#calorie-ring').style.setProperty('--progress',`${Math.min(100,Math.max(0,percent))}%`);
  $('#water-total').textContent=fmt(t.water); $('#water-goal').textContent=fmt(targets.water);
  $('#water-progress').style.width=`${Math.min(100,t.water/targets.water*100)}%`;
  $('#nutrient-grid').innerHTML=NUTRIENTS.map(n => {
    const pct=Math.min(100,t[n.key]/targets[n.key]*100);
    return `<article class="nutrient-card"><div class="nutrient-name"><span style="color:${n.color}">${n.icon}</span>${n.name}</div><p><strong>${fmt(t[n.key])}</strong><small> / ${fmt(targets[n.key])} ${n.unit}</small></p><div class="progress-track"><div class="progress-fill" style="background:${n.color};width:${pct}%"></div></div></article>`;
  }).join('');
  $('#meal-list').innerHTML=MEALS.map(meal=>{
    const items=entries.filter(e=>e.type==='food'&&e.meal===meal.key).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    return `<section class="meal-card"><div class="meal-header"><span class="meal-icon">${meal.emoji}</span><strong>${meal.label}</strong><span>${fmt(totals(items).calories)} kcal</span></div>${items.length ? items.map(e=>`<div class="food-row"><div class="food-desc"><strong>${safeText(e.name)}</strong><small>${safeText(e.portion || '未填份量')} · 蛋白質 ${fmt(e.protein)}g</small></div><span class="food-cal">${fmt(e.calories)} kcal</span><button type="button" class="icon-btn" data-edit="${safeText(e.id)}" aria-label="編輯 ${safeText(e.name)}">✎</button><button type="button" class="icon-btn danger" data-delete="${safeText(e.id)}" aria-label="刪除 ${safeText(e.name)}">×</button></div>`).join(''):'<div class="empty-meal">還沒有紀錄，記下今天吃了什麼吧。</div>'}</section>`;
  }).join('');
  const waterEntries=entries.filter(e=>e.type==='water').sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  if(waterEntries.length) $('#meal-list').insertAdjacentHTML('beforeend',`<section class="meal-card"><div class="meal-header"><span class="meal-icon">💧</span><strong>飲水紀錄</strong><span>${fmt(t.water)} ml</span></div>${waterEntries.map(e=>`<div class="food-row"><div class="food-desc"><strong>飲水 ${fmt(e.waterMl)} ml</strong><small>已加入當日飲水量</small></div><button type="button" class="icon-btn" data-edit="${safeText(e.id)}" aria-label="編輯飲水">✎</button><button type="button" class="icon-btn danger" data-delete="${safeText(e.id)}" aria-label="刪除飲水">×</button></div>`).join('')}</section>`);
}
async function renderHistory(){
  const all=await getAllEntries();
  const days=new Set([...Array(30)].map((_,i)=>{const d=parseDay(today());d.setDate(d.getDate()-i);return isoDate(d); }));
  all.forEach(e=>days.add(e.date));
  const sorted=[...days].sort().reverse();
  const recent=all.filter(e=>days.has(e.date));
  $('#history-summary').innerHTML=`<div><strong>${new Set(all.map(e=>e.date)).size}</strong><span>有紀錄的日子</span></div><div><strong>${all.filter(e=>e.type==='food').length}</strong><span>食物筆數</span></div><div><strong>${fmt(totals(recent).water / 1000)}</strong><span>累計飲水公升</span></div>`;
  $('#history-list').innerHTML=sorted.map(day=>{
    const es=all.filter(e=>e.date===day),sum=totals(es),label=parseDay(day).toLocaleDateString('zh-TW',{month:'long',day:'numeric',weekday:'short'});
    return `<button type="button" class="history-day" data-history-day="${day}"><div><strong>${label}</strong><small>${es.filter(e=>e.type==='food').length} 筆食物 · ${fmt(sum.water)} ml 水</small></div><div><strong>${fmt(sum.calories)} <small>kcal</small></strong><span>›</span></div></button>`;
  }).join('');
}
function renderSettings(){const f=$('#settings-form'); for(const [key,value] of Object.entries(targets)) f.elements.namedItem(key).value=value;}
async function refresh(){await renderDashboard(); if($('#history').classList.contains('active'))await renderHistory();}
function showView(view){ $$('.view').forEach(v=>v.classList.toggle('active',v.id===view)); $$('.nav-btn').forEach(b=>b.classList.toggle('selected',b.dataset.view===view)); if(view==='history')renderHistory().catch(handleError); if(view==='settings')renderSettings(); window.scrollTo({top:0,behavior:'instant'}); }
function setEntryType(type){entryType=type;$$('.entry-tab').forEach(b=>b.classList.toggle('active',b.dataset.type===type)); $('#food-fields').hidden=type!=='food';$('#water-fields').hidden=type!=='water'; const f=$('#entry-form'); f.elements.name.required=type==='food'; for(const n of ['calories','protein','carbs','fat','fiber']) f.elements[n].required=type==='food'; f.elements.waterMl.required=type==='water';}
function openEntry(type='food',existing=null){editingId=existing?.id||null;const f=$('#entry-form');f.reset();setEntryType(type);$('#dialog-title').textContent=existing?'編輯紀錄':(type==='water'?'新增飲水':'新增食物'); if(existing){for(const [k,v] of Object.entries(existing)) if(f.elements.namedItem(k)) f.elements.namedItem(k).value=v;} $('#entry-dialog').showModal();}
function closeEntry(){$('#entry-dialog').close();}
function numField(f,key){return Number(f.elements.namedItem(key).value);}
function validNumber(n,max,allowZero=true){return Number.isFinite(n)&&n>= (allowZero?0:1)&&n<=max;}
function validateEntry(e){
  if(!e||typeof e!=='object'||typeof e.id!=='string'||e.id.length>120||!validDate(e.date)||!['food','water'].includes(e.type)||typeof e.createdAt!=='string'||e.createdAt.length>100)throw Error('備份中的紀錄格式不正確');
  if(e.type==='water'){if(!Number.isInteger(e.waterMl)||!validNumber(e.waterMl,20000,false))throw Error('飲水紀錄不正確');}
  else{if(typeof e.name!=='string'||!e.name.trim()||e.name.length>100||typeof e.portion!=='string'||e.portion.length>60||!MEALS.some(m=>m.key===e.meal))throw Error('食物欄位不正確');for(const k of ['calories','protein','carbs','fat','fiber'])if(!validNumber(e[k],k==='calories'?100000:10000))throw Error('營養素數值不正確');}
  return e;
}
function validateTargets(t){if(!t||typeof t!=='object')throw Error('目標設定格式不正確');const clean={};for(const [k,limit] of Object.entries({calories:20000,protein:1000,carbs:1500,fat:1000,fiber:300,water:20000})){if(!Number.isInteger(t[k])||!validNumber(t[k],limit,false))throw Error(`目標 ${k} 不正確`);clean[k]=t[k];}return clean;}
async function handleSubmit(event){event.preventDefault();const f=event.currentTarget;
 const existing=editingId?(await getAllEntries()).find(e=>e.id===editingId):null;
 let entry={id:existing?.id||randomId(),date:existing?.date||selectedDate,type:entryType,createdAt:existing?.createdAt||new Date().toISOString()};
 if(entryType==='food')entry={...entry,name:f.elements.name.value.trim(),portion:f.elements.portion.value.trim(),meal:f.elements.meal.value,...Object.fromEntries(['calories','protein','carbs','fat','fiber'].map(k=>[k,numField(f,k)]))};
 else entry.waterMl=numField(f,'waterMl');
 try{validateEntry(entry);await putEntry(entry);closeEntry();await refresh();toast('紀錄已儲存');}catch(e){handleError(e);}
}
async function handleDelete(id){if(!confirm('確定要刪除這筆紀錄嗎？'))return;await deleteEntry(id);await refresh();toast('紀錄已刪除');}
async function addWater(ml){try{await putEntry({id:randomId(),date:selectedDate,type:'water',waterMl:ml,createdAt:new Date().toISOString()});await refresh();toast(`已紀錄 ${ml} ml 飲水`);}catch(e){handleError(e);}}
function downloadBackup(data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`daily-food-journal-backup-${today()}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
async function importBackup(file){if(!file)return;if(file.size>10*1024*1024)throw Error('備份檔不能超過 10MB');let obj;try{obj=JSON.parse(await file.text());}catch{throw Error('不是有效的 JSON 備份檔');}if(obj?.app!=='daily-food-journal'||obj?.version!==1||!Array.isArray(obj.entries)||obj.entries.length>100000)throw Error('備份版本或格式不支援');const newTargets=validateTargets(obj.targets);const ids=new Set();const entries=obj.entries.map(raw=>{const e=validateEntry(raw);if(ids.has(e.id))throw Error('備份內有重複的紀錄 ID');ids.add(e.id);return e;});if(!confirm(`即將匯入 ${entries.length} 筆紀錄，並「覆蓋」目前裝置上的所有紀錄與目標。確定繼續嗎？`))return;await replaceAllData(entries,newTargets);targets=newTargets;renderSettings();await refresh();toast(`已匯入 ${entries.length} 筆紀錄`);}
function handleError(e){console.error(e);toast(`操作失敗：${e?.message||'未知錯誤'}`);}
async function init(){try{
 await openDatabase();targets={...DEFAULT_TARGETS,...(await getTargets()||{})};
 $('#day-picker').value=selectedDate;await renderDashboard();renderSettings();
 $$('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>showView(btn.dataset.view)));
 $('#quick-add').addEventListener('click',()=>openEntry());$('#nav-add').addEventListener('click',()=>openEntry());
 $('#date-prev').addEventListener('click',()=>shiftDate(-1));$('#date-next').addEventListener('click',()=>shiftDate(1));
 $('#day-picker').addEventListener('change',e=>{if(validDate(e.target.value)){selectedDate=e.target.value;refresh().catch(handleError);}});
 $$('.water-add').forEach(btn=>btn.addEventListener('click',()=>addWater(Number(btn.dataset.water))));
 $('#water-custom').addEventListener('click',()=>openEntry('water'));
 $('#close-dialog').addEventListener('click',closeEntry);$('#cancel-dialog').addEventListener('click',closeEntry);
 $('#entry-dialog').addEventListener('click',e=>{if(e.target===$('#entry-dialog'))closeEntry();});
 $$('.entry-tab').forEach(btn=>btn.addEventListener('click',()=>setEntryType(btn.dataset.type)));
 $('#entry-form').addEventListener('submit',e=>handleSubmit(e).catch(handleError));
 $('#meal-list').addEventListener('click',async e=>{const edit=e.target.closest('[data-edit]'),del=e.target.closest('[data-delete]');if(edit){const entry=(await getEntriesByDate(selectedDate)).find(x=>x.id===edit.dataset.edit);if(entry)openEntry(entry.type,entry);}if(del)await handleDelete(del.dataset.delete).catch(handleError);});
 $('#history-list').addEventListener('click',e=>{const btn=e.target.closest('[data-history-day]');if(!btn)return;selectedDate=btn.dataset.historyDay;showView('dashboard');refresh().catch(handleError);});
 $('#settings-form').addEventListener('submit',async e=>{e.preventDefault();try{const f=e.currentTarget;const next=validateTargets(Object.fromEntries(Object.keys(DEFAULT_TARGETS).map(k=>[k,Number(f.elements.namedItem(k).value)])));await saveTargets(next);targets=next;await refresh();toast('每日目標已儲存');}catch(err){handleError(err);}});
 $('#export-btn').addEventListener('click',async()=>{try{downloadBackup({app:'daily-food-journal',version:1,exportedAt:new Date().toISOString(),targets,entries:await getAllEntries()});toast('備份檔已下載');}catch(e){handleError(e);}});
 $('#import-file').addEventListener('change',async e=>{try{await importBackup(e.target.files?.[0]);}catch(err){handleError(err);}finally{e.target.value='';}});
 if('serviceWorker' in navigator && location.protocol!=='file:')navigator.serviceWorker.register('./service-worker.js').catch(console.warn);
 }catch(e){handleError(e);$('#dashboard').insertAdjacentHTML('afterbegin','<div class="error-banner">無法開啟本機儲存。請使用一般瀏覽器模式、允許網站儲存空間，並透過 HTTPS 或 localhost 開啟。</div>');}}
function shiftDate(days){const date=parseDay(selectedDate);date.setDate(date.getDate()+days);selectedDate=isoDate(date);refresh().catch(handleError);}
init();
