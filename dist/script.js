const ADMIN_ID='natty09';
const ADMIN_PASSWORD='nc09290306';
const NOTICE_BOARD='https://www.sooplive.com/station/natty09/board/122887767';
const LIVE_API='https://live.sooplive.co.kr/afreeca/player_live_api.php';
const OFFLINE_IMAGE='https://i.postimg.cc/4y3LpG9G/96341792257426596.png';
const now=new Date();
const seoulParts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
const part=t=>seoulParts.find(p=>p.type===t).value;
const TODAY_KEY=`${part('year')}-${part('month')}-${part('day')}`;
const grid=document.querySelector('#calendarGrid');
const title=document.querySelector('#monthTitle');
const detailDialog=document.querySelector('#detailDialog');
const manageDialog=document.querySelector('#manageDialog');
const manageList=document.querySelector('#manageList');
const loginDialog=document.querySelector('#loginDialog');
const loginBtn=document.querySelector('#adminLoginBtn');
const darkModeBtn=document.querySelector('#darkModeBtn');
const todaySchedule=document.querySelector('#todaySchedule');
const dayDialog=document.querySelector('#dayDialog');
const dayScheduleList=document.querySelector('#dayScheduleList');
let view=new Date(Number(part('year')),Number(part('month'))-1,1);
let isAdmin=localStorage.getItem('nyacho-admin')==='true'||sessionStorage.getItem('nyacho-admin')==='true';
let isDark=localStorage.getItem('nyacho-theme')==='dark';
let manageDate='';
const seed={};
let custom=JSON.parse(localStorage.getItem('nyacho-events')||'{}');
const key=(y,m,d)=>`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const savedSettings=JSON.parse(localStorage.getItem('nyacho-settings')||'{}');
const scheduleTypes=Array.isArray(savedSettings.scheduleTypes)&&savedSettings.scheduleTypes.length?savedSettings.scheduleTypes:[{id:'personal',label:savedSettings.personalLabel||'개인',color:savedSettings.personalColor||'#ffd83d'},{id:'work',label:savedSettings.workLabel||'합방',color:savedSettings.workColor||'#a9d9f7'},{id:'live',label:savedSettings.liveLabel||'휴방',color:savedSettings.liveColor||'#ffb4cb'}];
const typeLabel=Object.fromEntries(scheduleTypes.map(type=>[type.id,type.label]));
const typeColor=Object.fromEntries(scheduleTypes.map(type=>[type.id,type.color]));
const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const typeOptions=()=>scheduleTypes.map(type=>`<option value="${escapeHtml(type.id)}">${escapeHtml(type.label)}</option>`).join('');
const formatTime=value=>{if(!value)return'';const [hour,minute]=value.split(':').map(Number),period=hour<12?'오전':'오후',displayHour=hour%12||12;return`${period} ${displayHour}:${String(minute).padStart(2,'0')}`};
const createId=()=>globalThis.crypto?.randomUUID?.()||`event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const normalizeEvent=(event,date='')=>[event[0]||'',event[1]||'personal',event[2]||'',event[3]||'',event[4]||'',event[5]||date,event[6]||event[5]||date,event[7]||''];

function setAdmin(value,remember=false){isAdmin=value;localStorage.removeItem('nyacho-admin');sessionStorage.removeItem('nyacho-admin');if(value)(remember?localStorage:sessionStorage).setItem('nyacho-admin','true');document.body.classList.toggle('admin-mode',value);loginBtn.classList.toggle('logged-in',value);loginBtn.title=value?'관리자 메뉴':'관리자 로그인';loginBtn.setAttribute('aria-label',loginBtn.title)}
function setDark(value){isDark=value;localStorage.setItem('nyacho-theme',value?'dark':'light');document.body.classList.toggle('dark-mode',value);darkModeBtn.title=value?'라이트모드 켜기':'다크모드 켜기';darkModeBtn.setAttribute('aria-label',darkModeBtn.title)}
function save(){localStorage.setItem('nyacho-events',JSON.stringify(custom));window.nyachoFirebaseSave?.('schedules',custom)}
function dateRange(start,end){if(!start||!end||start>end)return[];const dates=[];let cursor=new Date(`${start}T00:00:00Z`),last=new Date(`${end}T00:00:00Z`);while(cursor<=last){dates.push(cursor.toISOString().slice(0,10));cursor.setUTCDate(cursor.getUTCDate()+1)}return dates}
function timePickerMarkup(){return`<div class="manual-time-picker" data-period="am"><div class="period-buttons"><button type="button" class="period-button active" data-period="am">오전</button><button type="button" class="period-button" data-period="pm">오후</button></div><div class="time-number-fields"><input class="manage-hour" type="number" inputmode="numeric" min="1" max="12" placeholder="시" aria-label="시"><span>:</span><input class="manage-minute" type="number" inputmode="numeric" min="0" max="59" placeholder="분" aria-label="분"></div></div>`}
function setPickerTime(item,value){const picker=item.querySelector('.manual-time-picker'),hourInput=item.querySelector('.manage-hour'),minuteInput=item.querySelector('.manage-minute');let period='am';if(value){const [hour,minute]=value.split(':').map(Number);period=hour>=12?'pm':'am';hourInput.value=hour%12||12;minuteInput.value=String(minute).padStart(2,'0')}picker.dataset.period=period;picker.querySelectorAll('.period-button').forEach(button=>button.classList.toggle('active',button.dataset.period===period))}
function readPickerTime(item){const hourValue=item.querySelector('.manage-hour').value.trim(),minuteValue=item.querySelector('.manage-minute').value.trim();if(!hourValue&&!minuteValue)return'';const hour=Number(hourValue),minute=minuteValue===''?0:Number(minuteValue);if(!Number.isInteger(hour)||hour<1||hour>12){item.querySelector('.manage-hour').focus();return null}if(!Number.isInteger(minute)||minute<0||minute>59){item.querySelector('.manage-minute').focus();return null}const period=item.querySelector('.manual-time-picker').dataset.period;const hour24=period==='pm'?(hour%12)+12:hour%12;return`${String(hour24).padStart(2,'0')}:${String(minute).padStart(2,'0')}`}
function addEventToRange(event){dateRange(event[5],event[6]).forEach(date=>{custom[date]=custom[date]||[];custom[date].push([...event])})}
function removeEventOccurrences(event,date,index){const id=event?.[7];if(id){Object.keys(custom).forEach(dateKey=>{custom[dateKey]=custom[dateKey].filter(item=>item[7]!==id);if(!custom[dateKey].length)delete custom[dateKey]})}else if(custom[date]?.[index]){custom[date].splice(index,1);if(!custom[date].length)delete custom[date]}}

function renderToday(){
  const events=[...(seed[TODAY_KEY]||[]),...(custom[TODAY_KEY]||[])];
  document.querySelector('#todayDate').textContent=`${part('month')}.${part('day')}`;
  todaySchedule.innerHTML='';
  if(!events.length){todaySchedule.classList.add('empty-schedule');todaySchedule.innerHTML='<span>🐾</span><p>등록된 오늘 일정이 없습니다.</p>';return}
  todaySchedule.classList.remove('empty-schedule');
  events.forEach(([name,type,time,description='',members='',startDate='',endDate=''])=>{
    const item=document.createElement('article');item.className=`today-event ${type}`;
    item.innerHTML=`<div class="today-event-copy"><span class="tag ${type}">${typeLabel[type]||'일정'}</span><h3></h3>${description?'<p class="today-event-description"></p>':''}${members?'<p class="today-event-members"></p>':''}</div>${time?`<time>${formatTime(time)}</time>`:''}`;
    item.querySelector('.tag').style.backgroundColor=typeColor[type]||'#ffd83d';item.querySelector('h3').textContent=name;
    if(description)item.querySelector('.today-event-description').textContent=description;
    if(members)item.querySelector('.today-event-members').textContent=`참여 멤버 · ${members}`;
    item.onclick=()=>showDetail(TODAY_KEY,name,type,time,description,members,startDate,endDate);
    todaySchedule.append(item);
  });
}

function showDetail(date,name,type,time,description='',members='',startDate='',endDate=''){
  document.querySelector('#detailName').textContent=name;
  document.querySelector('#detailDate').textContent=startDate&&endDate?(startDate===endDate?startDate:`${startDate} ~ ${endDate}`):date;
  document.querySelector('#detailTimeRow').hidden=!time;
  document.querySelector('#detailTime').textContent=formatTime(time);
  document.querySelector('#detailType').textContent=typeLabel[type]||'일정';
  document.querySelector('#detailDescriptionRow').hidden=!description;
  document.querySelector('#detailDescription').textContent=description;
  document.querySelector('#detailMembersRow').hidden=!members;
  document.querySelector('#detailMembers').textContent=members;
  detailDialog.showModal();
}

function editorMarkup(isNew=false){return`<summary><span class="manage-order">${isNew?'＋':''}</span><span class="accordion-icon" aria-hidden="true">⌄</span><strong>${isNew?'새 일정 추가':''}</strong><span class="manage-summary-time">${isNew?'입력 중':''}</span></summary><div class="manage-fields"><label>일정 이름<input class="manage-name" type="text" placeholder="무슨 일정인가요?" required></label><label>시작 날짜<input class="manage-start-date" type="date" required></label><label>종료 날짜<input class="manage-end-date" type="date" required></label><label class="manage-time-label">시간 (선택)${timePickerMarkup()}</label><label>종류<select class="manage-type">${typeOptions()}</select></label><label class="manage-members-label">참여 멤버 (선택)<input class="manage-members" type="text" placeholder="참여 멤버를 입력하세요"></label><label class="manage-description-label">상세 내용 (선택)<textarea class="manage-description" rows="4" placeholder="일정에 대한 상세 내용을 입력하세요"></textarea></label><div class="manage-actions ${isNew?'manage-new-actions':''}">${isNew?'<button type="button" data-action="cancel-new">취소</button><button type="button" data-action="create">일정 저장하기</button>':'<button type="button" data-action="up" aria-label="위로 이동">↑ 위로</button><button type="button" data-action="down" aria-label="아래로 이동">↓ 아래로</button><button type="button" data-action="update">수정 저장</button><button type="button" data-action="delete" class="danger">삭제</button>'}</div></div>`}
function fillEditor(item,event,date){const [name='',type='personal',time='',description='',members='',startDate='',endDate='']=event;item.querySelector('.manage-name').value=name;item.querySelector('.manage-type').value=type;item.querySelector('.manage-description').value=description;item.querySelector('.manage-members').value=members;item.querySelector('.manage-start-date').value=startDate||date;item.querySelector('.manage-end-date').value=endDate||startDate||date;setPickerTime(item,time)}
function readEditor(item,id=createId()){const name=item.querySelector('.manage-name').value.trim(),startDate=item.querySelector('.manage-start-date').value,endDate=item.querySelector('.manage-end-date').value,time=readPickerTime(item);if(!name){item.querySelector('.manage-name').focus();return null}if(!startDate){item.querySelector('.manage-start-date').focus();return null}if(!endDate||endDate<startDate){item.querySelector('.manage-end-date').focus();return null}if(time===null)return null;return[name,item.querySelector('.manage-type').value,time,item.querySelector('.manage-description').value.trim(),item.querySelector('.manage-members').value.trim(),startDate,endDate,id]}
function renderManager(){
  document.querySelector('#manageDate').textContent=manageDate;manageList.innerHTML='';const events=custom[manageDate]||[];
  if(!events.length){manageList.innerHTML='<p class="manage-empty">등록된 일정이 없습니다.</p>';return}
  events.forEach((event,index)=>{const item=document.createElement('details');item.className='manage-item';item.dataset.index=index;item.innerHTML=editorMarkup(false);item.querySelector('.manage-order').textContent=index+1;item.querySelector('summary strong').textContent=event[0];item.querySelector('.manage-summary-time').textContent=formatTime(event[2]);fillEditor(item,event,manageDate);item.querySelector('[data-action="up"]').disabled=index===0;item.querySelector('[data-action="down"]').disabled=index===events.length-1;manageList.append(item)});
}
function showNewScheduleEditor(){const existing=manageList.querySelector('.manage-new');if(existing){existing.open=true;existing.querySelector('.manage-name').focus();return}manageList.querySelector('.manage-empty')?.remove();const item=document.createElement('details');item.className='manage-item manage-new';item.open=true;item.innerHTML=editorMarkup(true);fillEditor(item,['',scheduleTypes[0]?.id||'personal','','','',manageDate,manageDate,''],manageDate);manageList.append(item);item.scrollIntoView({block:'nearest',behavior:'smooth'});item.querySelector('.manage-name').focus()}
function openManager(date){if(!isAdmin)return;manageDate=date;renderManager();manageDialog.showModal()}
function openDay(date){const events=[...(seed[date]||[]),...(custom[date]||[])];document.querySelector('#dayDialogTitle').textContent=`${date} 일정`;dayScheduleList.innerHTML='';if(!events.length){dayScheduleList.innerHTML='<p class="day-empty">등록된 일정이 없습니다.</p>'}else events.forEach(raw=>{const [name,type,time,description,members,startDate,endDate]=normalizeEvent(raw,date),item=document.createElement('article');item.className=`day-schedule-card ${type}`;item.innerHTML=`<div><span class="tag ${type}">${typeLabel[type]||'일정'}</span><h3></h3>${description?'<p class="day-card-description"></p>':''}${members?'<p class="day-card-members"></p>':''}</div>${time?`<time>${formatTime(time)}</time>`:''}`;item.querySelector('.tag').style.backgroundColor=typeColor[type]||'#ffd83d';item.querySelector('h3').textContent=name;if(description)item.querySelector('.day-card-description').textContent=description;if(members)item.querySelector('.day-card-members').textContent=`참여 멤버 · ${members}`;item.onclick=()=>showDetail(date,name,type,time,description,members,startDate,endDate);dayScheduleList.append(item)});dayDialog.showModal()}

function render(){
  const y=view.getFullYear(),m=view.getMonth();title.textContent=`${m+1}월`;grid.innerHTML='';
  const first=new Date(y,m,1).getDay(),last=new Date(y,m+1,0).getDate(),prevLast=new Date(y,m,0).getDate(),totalCells=Math.max(35,Math.ceil((first+last)/7)*7);
  for(let i=0;i<totalCells;i++){
    let d,month=m,muted=false;if(i<first){d=prevLast-first+i+1;month=m-1;muted=true}else if(i>=first+last){d=i-first-last+1;month=m+1;muted=true}else d=i-first+1;
    const actual=new Date(y,month,d),dateKey=key(actual.getFullYear(),actual.getMonth(),d),cell=document.createElement('div');cell.className='day'+(muted?' muted':'')+(dateKey===TODAY_KEY?' today':'');cell.innerHTML=`<span class="number">${d}</span>${dateKey===TODAY_KEY?'<span class="paw">🐾</span>':''}<div class="events"></div>`;
    const all=[...(seed[dateKey]||[]).map(event=>[...normalizeEvent(event,dateKey),false,null]),...(custom[dateKey]||[]).map((event,index)=>[...normalizeEvent(event,dateKey),true,index])];
    all.forEach(event=>{const [name,type,time,description='',members='',startDate='',endDate='',id='',own]=event;const el=document.createElement('div');el.className=`event ${type}${own?' custom':''}`;el.innerHTML=`<span class="event-title"></span>${time?'<span class="event-time"></span>':''}`;el.style.backgroundColor=typeColor[type]||'#ffd83d';el.querySelector('.event-title').textContent=name;if(time)el.querySelector('.event-time').textContent=formatTime(time);el.title='좌클릭: 상세 보기'+(isAdmin&&own?' · 우클릭: 일정 관리':'');el.onclick=clickEvent=>{clickEvent.stopPropagation();showDetail(dateKey,name,type,time,description,members,startDate,endDate)};el.oncontextmenu=contextEvent=>{if(!own||!isAdmin)return;contextEvent.preventDefault();contextEvent.stopPropagation();openManager(dateKey)};cell.querySelector('.events').append(el)});
    cell.querySelector('.number').classList.add('date-button');cell.querySelector('.number').onclick=clickEvent=>{clickEvent.stopPropagation();openDay(dateKey)};grid.append(cell);
  }
  renderToday();
}

async function loadTodayNotice(){const output=document.querySelector('#noticeContent');try{const response=await fetch('/api/soop-notice',{cache:'no-store'});if(!response.ok)throw new Error('notice request failed');const data=await response.json();output.innerHTML='<strong></strong>';output.querySelector('strong').textContent=data.notice||'오늘 날짜에 등록된 방송 공지가 없습니다.'}catch(error){output.innerHTML='<strong>오늘 날짜에 등록된 방송 공지가 없습니다.</strong> 게시판에서 새 공지를 확인해 주세요.'}}
async function loadBroadcastStatus(){const image=document.querySelector('#broadcastImage'),status=document.querySelector('#broadcastStatus'),card=document.querySelector('#liveCard');const showOffline=()=>{image.src=OFFLINE_IMAGE;image.alt='냐쵸 오프라인 이미지';status.className='broadcast-status offline';status.querySelector('b').textContent='OFFLINE';card.classList.remove('is-live')};try{const response=await fetch('/api/soop-live',{cache:'no-store'});if(!response.ok)throw new Error('live status failed');const data=await response.json();if(!data.live){showOffline();return}image.onerror=()=>{image.onerror=null;image.src=OFFLINE_IMAGE};image.src=data.thumbnail;image.alt=data.title?`냐쵸 라이브: ${data.title}`:'냐쵸 라이브 방송 썸네일';status.className='broadcast-status live';status.querySelector('b').textContent='LIVE';card.classList.add('is-live')}catch(error){showOffline()}}

loginBtn.onclick=()=>{if(isAdmin){setAdmin(false);render()}else{document.querySelector('#adminId').value='';document.querySelector('#adminPassword').value='';document.querySelector('#rememberLogin').checked=localStorage.getItem('nyacho-admin')==='true'||localStorage.getItem('nyacho-google-remember')==='true';document.querySelector('#loginError').textContent='';loginDialog.showModal()}};
darkModeBtn.onclick=()=>setDark(!isDark);
document.querySelector('#loginForm').onsubmit=event=>{if(event.submitter?.value==='cancel')return;event.preventDefault();const id=document.querySelector('#adminId').value.trim(),password=document.querySelector('#adminPassword').value,remember=document.querySelector('#rememberLogin').checked,error=document.querySelector('#loginError');error.textContent='';if(id===ADMIN_ID&&password===ADMIN_PASSWORD){setAdmin(true,remember);loginDialog.close();render()}else error.textContent='아이디 또는 비밀번호가 올바르지 않아요.'};
document.querySelector('#prevMonth').onclick=()=>{view.setMonth(view.getMonth()-1);render()};
document.querySelector('#nextMonth').onclick=()=>{view.setMonth(view.getMonth()+1);render()};
document.querySelector('#todayBtn').onclick=()=>{view=new Date(Number(part('year')),Number(part('month'))-1,1);render()};
document.querySelector('#manageClose').onclick=()=>manageDialog.close();
document.querySelector('#dayClose').onclick=()=>dayDialog.close();
document.querySelector('#manageAdd').onclick=showNewScheduleEditor;
manageList.onclick=event=>{
  const periodButton=event.target.closest('.period-button');
  if(periodButton){const picker=periodButton.closest('.manual-time-picker');picker.dataset.period=periodButton.dataset.period;picker.querySelectorAll('.period-button').forEach(button=>button.classList.toggle('active',button===periodButton));return}
  const button=event.target.closest('[data-action]');if(!button||!isAdmin)return;
  const item=button.closest('.manage-item'),action=button.dataset.action;
  if(action==='cancel-new'){renderManager();return}
  if(action==='create'){const newEvent=readEditor(item);if(!newEvent)return;addEventToRange(newEvent);save();render();renderManager();return}
  const index=Number(item.dataset.index),events=custom[manageDate]||[],oldEvent=events[index];
  if(action==='update'){const updated=readEditor(item,oldEvent?.[7]||createId());if(!updated)return;removeEventOccurrences(oldEvent,manageDate,index);addEventToRange(updated)}
  if(action==='delete')removeEventOccurrences(oldEvent,manageDate,index);
  if(action==='up'&&index>0)[events[index-1],events[index]]=[events[index],events[index-1]];
  if(action==='down'&&index<events.length-1)[events[index+1],events[index]]=[events[index],events[index+1]];
  save();render();renderManager();
};

window.nyachoSetAdmin=setAdmin;window.addEventListener('nyachoSchedulesRemote',event=>{custom=event.detail||{};localStorage.setItem('nyacho-events',JSON.stringify(custom));render()});
const legend=document.querySelector('.legend');legend.innerHTML='';scheduleTypes.forEach(type=>{const item=document.createElement('span'),dot=document.createElement('i');dot.className='dot';dot.style.backgroundColor=type.color;item.append(dot,document.createTextNode(type.label));legend.append(item)});
setAdmin(isAdmin,localStorage.getItem('nyacho-admin')==='true');setDark(isDark);render();loadTodayNotice();loadBroadcastStatus();setInterval(loadBroadcastStatus,60000);
