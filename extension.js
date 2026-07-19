(({ extensionId, addStyle, addElement, apiFetch, storage, on, setInterval }) => {
  const ROOT = 'mari-token-receipt';
  const BUTTON = 'mari-token-receipt-button';
  const POS_KEY = 'mari-token-receipt-button-pos';
  if (document.getElementById(ROOT) || document.getElementById(BUTTON)) return;
  addStyle(`
#${BUTTON}{position:fixed;right:18px;bottom:18px;z-index:9997;display:grid;width:44px;height:44px;place-items:center;border:1px solid var(--border,#444);border-radius:9999px;background:var(--card,var(--background,#171717));color:var(--card-foreground,var(--foreground,#eee));box-shadow:0 4px 14px #0006;cursor:grab;font:inherit;font-size:20px;touch-action:none;user-select:none}
#${BUTTON}[data-dragging="true"]{cursor:grabbing;opacity:.85}
#${ROOT}[hidden]{display:none}
#${ROOT}{position:fixed;z-index:9998;width:min(340px,calc(100vw - 24px));max-height:75vh;color:var(--foreground,#eee);background:color-mix(in srgb,var(--background,#171717) 94%,transparent);border:1px solid var(--border,#444);border-radius:14px;box-shadow:0 14px 42px #0008;font:12px/1.45 system-ui,sans-serif;overflow:hidden;backdrop-filter:blur(12px)}
#${ROOT} *{box-sizing:border-box} #${ROOT} .tr-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--border,#444);font-weight:700} #${ROOT} .tr-head span{margin-right:auto} #${ROOT} .tr-head button{flex:0 0 auto} #${ROOT} .tr-help{display:none;padding:12px;overflow:auto;max-height:calc(75vh - 45px)} #${ROOT}.tr-help-open .tr-body{display:none} #${ROOT}.tr-help-open .tr-help{display:block} #${ROOT} .tr-help h3{font-size:13px;margin:0 0 8px} #${ROOT} .tr-help h4{font-size:12px;margin:12px 0 4px} #${ROOT} .tr-help ul{margin:4px 0;padding-left:18px} #${ROOT} .tr-help li{margin:4px 0} #${ROOT} .tr-help code{font-size:11px} #${ROOT} .tr-note{border-left:3px solid #f5b84b;padding-left:8px;margin-top:10px} #${ROOT} button{border:1px solid var(--border,#555);background:var(--secondary,#292929);color:inherit;border-radius:8px;padding:4px 8px;cursor:pointer} #${ROOT} .tr-body{padding:12px;overflow:auto;max-height:calc(75vh - 45px)} #${ROOT} .tr-muted{opacity:.67} #${ROOT} .tr-title{font-size:13px;font-weight:700;word-break:break-all;margin-bottom:8px} #${ROOT} .tr-row{display:flex;justify-content:space-between;gap:12px;padding:3px 0} #${ROOT} .tr-usage{display:grid;grid-template-columns:minmax(0,1fr) 82px auto;align-items:baseline;gap:8px} #${ROOT} .tr-tokens{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap} #${ROOT} .tr-total{border-top:1px solid var(--border,#444);margin-top:7px;padding-top:8px;font-weight:800;font-size:14px} #${ROOT} details{margin-top:10px;border-top:1px solid var(--border,#444);padding-top:8px} #${ROOT} input,#${ROOT} select{width:100%;margin:3px 0 7px;padding:6px;border:1px solid var(--border,#555);border-radius:7px;background:var(--background,#181818);color:inherit} #${ROOT} .tr-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 8px} #${ROOT} label{display:block;font-size:11px;opacity:.82} #${ROOT} .tr-warn{color:#f5b84b;margin-top:8px}
  `);
  const toggle = addElement(document.body, 'button', { id: BUTTON, type:'button', title:'Token Receipt — 드래그로 이동', 'aria-label':'Token Receipt', textContent:'🧾' });
  const root = addElement(document.body, 'section', { id: ROOT, hidden:'', role:'dialog', 'aria-label':'Token Receipt' });
  if (!root || !toggle) return;
  root.innerHTML = `<div class="tr-head"><span>🧾 Token Receipt</span><button data-act="help" title="사용법" aria-label="사용법">?</button><button data-act="refresh" title="영수증 새로고침" aria-label="영수증 새로고침">↻</button><button data-act="close" title="닫기" aria-label="닫기">×</button></div><div class="tr-body"><div class="tr-muted">채팅 usage를 기다리는 중…</div></div><div class="tr-help"><h3>간단 설정</h3><ol><li>모델 가격표에서 <b>100만 토큰당 가격 (1M)</b>을 입력합니다.</li><li>가격표에 없는 항목은 <b>0</b>으로 둡니다.</li><li>아래에서 차감 방식을 고르고 저장합니다.</li></ol><h4>뭘 고르나요?</h4><ul><li><b>캐시 읽기가 0:</b> 그대로 과금</li><li><b>Claude 공식 API:</b> 그대로 과금</li><li><b>OpenAI·DeepSeek 공식 API:</b> cache read 차감</li><li><b>Gemini·GLM·OpenRouter:</b> 우선 그대로 과금</li></ul><div class="tr-note">OpenRouter는 <b>OpenRouter 가격표</b>를 사용하세요.</div><div class="tr-muted" style="margin-top:10px">표시 금액은 세금·카드 수수료를 제외한 예상액입니다.</div></div>`;
  const body = root.querySelector('.tr-body');
  const defaults = { currency:'USD', input:0, read:0, write:0, output:0, adjustment:'none', profiles:{}, fx:null, position:null };
  const FX_TTL = 6 * 60 * 60 * 1000;
  let cfg = { ...defaults }, chatId = null, lastSignature = '';
  let refreshBusy = false, listedChatIds = [], listedAt = 0;
  const isVisible = el => {
    if (!(el instanceof Element) || !el.isConnected) return false;
    const style=getComputedStyle(el), r=el.getBoundingClientRect();
    return style.display!=='none' && style.visibility!=='hidden' && Number(style.opacity)!==0 && r.width>0 && r.height>0 && r.bottom>0 && r.right>0 && r.top<innerHeight && r.left<innerWidth;
  };
  const professorWindowVisible = () => [...document.querySelectorAll('[data-component="HomeProfessorMariChat.Window"]')].some(isVisible);
  const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = v => `${cfg.currency} ${v < .01 ? v.toFixed(6) : v.toFixed(4)}`;
  const won = v => { const rate=num(cfg.fx?.rate), krw=v*rate; if(!rate) return '환율 없음'; return `약 ₩${krw.toLocaleString('ko-KR',{minimumFractionDigits:krw<1?4:krw<100?2:0,maximumFractionDigits:krw<1?4:krw<100?2:0})}`; };
  const fxTime = () => cfg.fx?.updatedAt ? new Date(cfg.fx.updatedAt).toLocaleString('ko-KR') : '아직 갱신 안 됨';
  async function updateFx(force=false){
    if(String(cfg.currency).toUpperCase()!=='USD') return;
    const fresh=cfg.fx?.rate && Date.now()-num(cfg.fx.updatedAt)<FX_TTL;
    if(fresh&&!force) return;
    try{
      const res=await fetch('https://api.frankfurter.dev/v1/latest?from=USD&to=KRW',{cache:'no-store'});
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data=await res.json(), rate=num(data?.rates?.KRW);
      if(!rate) throw new Error('KRW 환율 누락');
      cfg.fx={rate,updatedAt:Date.now(),marketDate:data.date||null,source:'Frankfurter',error:null};
    }catch(e){
      cfg.fx={...(cfg.fx||{}),rate:num(cfg.fx?.rate),source:'Frankfurter',error:String(e?.message||e),lastAttemptAt:Date.now()};
    }
    await storage.patch({config:cfg}).catch(()=>{});
    lastSignature='';
    await refresh(true);
  }
  async function chatCandidates(){
    const ids=[];
    for(const entry of performance.getEntriesByType('resource').slice().reverse()){
      const m=entry.name.match(/\/api\/chats\/([^/?]+)\/messages(?:[/?]|$)/);
      if(m){ const id=decodeURIComponent(m[1]); if(!ids.includes(id)) ids.push(id); }
    }
    if(chatId&&!ids.includes(chatId)) ids.push(chatId);
    if(Date.now()-listedAt>15000||!listedChatIds.length){
      try{
        const chats=await apiFetch('/chats');
        const arr=Array.isArray(chats)?chats:(chats?.items||chats?.chats||[]);
        listedChatIds=[...arr].sort((a,b)=>new Date(b.updatedAt||b.createdAt||0)-new Date(a.updatedAt||a.createdAt||0)).map(c=>String(c.id||'')).filter(Boolean).slice(0,20);
        listedAt=Date.now();
      }catch{}
    }
    for(const id of listedChatIds) if(!ids.includes(id)) ids.push(id);
    return ids;
  }
  function visibleMessageIds(){
    if(professorWindowVisible()) return new Set();
    return new Set([...document.querySelectorAll('[data-message-id]')].filter(isVisible).map(el=>el.getAttribute('data-message-id')).filter(Boolean));
  }
  async function resolveChat(){
    if(professorWindowVisible()) return null;
    const visible=visibleMessageIds();
    if(!visible.size) return null;
    let best=null;
    for(const id of (await chatCandidates()).slice(0,30)){
      try{
        const data=await apiFetch(`/chats/${encodeURIComponent(id)}/messages?limit=100`);
        const arr=Array.isArray(data)?data:(data?.items||data?.messages||[]);
        const ids=new Set(arr.map(m=>String(m.id)));
        const score=[...visible].reduce((n,messageId)=>n+(ids.has(String(messageId))?1:0),0);
        if(score&&(!best||score>best.score)) best={id,arr,score};
      }catch{}
    }
    return best&&{id:best.id,arr:best.arr};
  }
  function usageOf(m){ const e=typeof m.extra==='string'?(()=>{try{return JSON.parse(m.extra)}catch{return {}}})():m.extra||{}; return e.generationInfo||null; }
  function profileFor(g){ const key=`${g.provider||''}::${g.model||''}`; return { key, ...(cfg.profiles[key]||cfg) }; }
  function compute(g,p){
    const raw=num(g.tokensPrompt), read=num(g.tokensCachedPrompt), write=num(g.tokensCacheWritePrompt), out=num(g.tokensCompletion);
    let ordinary=raw;
    if(p.adjustment==='subtract-read') ordinary=Math.max(0,raw-read);
    if(p.adjustment==='subtract-both') ordinary=Math.max(0,raw-read-write);
    const parts={input:ordinary*num(p.input)/1e6,read:read*num(p.read)/1e6,write:write*num(p.write)/1e6,output:out*num(p.output)/1e6};
    return {raw,ordinary,read,write,out,parts,total:Object.values(parts).reduce((a,b)=>a+b,0)};
  }
  async function saveProfile(g){
    const key=`${g.provider||''}::${g.model||''}`; const q=n=>num(root.querySelector(`[name=${n}]`).value);
    cfg.currency=root.querySelector('[name=currency]').value.trim()||'USD';
    cfg.profiles={...(cfg.profiles||{}),[key]:{input:q('input'),read:q('read'),write:q('write'),output:q('output'),adjustment:root.querySelector('[name=adjustment]').value}};
    await storage.patch({config:cfg}); await refresh(true);
  }
  function render(m,g){
    const p=profileFor(g), c=compute(g,p), configured=[p.input,p.read,p.write,p.output].some(x=>num(x)>0);
    body.innerHTML=`<div class="tr-title">${esc(g.provider||'unknown')} · ${esc(g.model||'unknown model')}</div>
      <div class="tr-row tr-usage"><span>일반 입력</span><span class="tr-tokens">${c.ordinary.toLocaleString()} tok</span><b>${money(c.parts.input)}</b></div>
      <div class="tr-row tr-usage"><span>캐시 읽기(hit)</span><span class="tr-tokens">${c.read.toLocaleString()} tok</span><b>${money(c.parts.read)}</b></div>
      <div class="tr-row tr-usage"><span>캐시 쓰기(created)</span><span class="tr-tokens">${c.write.toLocaleString()} tok</span><b>${money(c.parts.write)}</b></div>
      <div class="tr-row tr-usage"><span>출력 (추론 포함)</span><span class="tr-tokens">${c.out.toLocaleString()} tok</span><b>${money(c.parts.output)}</b></div>
      <div class="tr-row tr-total"><span>턴 합계</span><span>${money(c.total)}</span></div>
      ${String(cfg.currency).toUpperCase()==='USD'?`<div class="tr-row"><span>현재 환율 원화 예상액</span><b>${won(c.total)}</b></div><div class="tr-muted">USD 1 = ₩${num(cfg.fx?.rate).toLocaleString('ko-KR')} · 기준 ${esc(cfg.fx?.marketDate||'')} · 갱신 ${esc(fxTime())}</div>${cfg.fx?.error?`<div class="tr-warn">환율 갱신 실패: ${esc(cfg.fx.error)}</div>`:''}`:''}
      ${configured?'':'<div class="tr-warn">단가가 0입니다. 아래에서 공급자 가격표를 입력하세요.</div>'}
      <div class="tr-muted">API 보고 input: ${c.raw.toLocaleString()} · 메시지 ${esc(m.id||'')}</div>
      <details><summary>이 모델 단가 설정 (1M 토큰당)</summary><div class="tr-grid">
      <label>일반 입력<input name="input" type="number" step="any" value="${num(p.input)}"></label><label>캐시 읽기<input name="read" type="number" step="any" value="${num(p.read)}"></label>
      <label>캐시 쓰기<input name="write" type="number" step="any" value="${num(p.write)}"></label><label>출력 (추론 포함)<input name="output" type="number" step="any" value="${num(p.output)}"></label></div>
      <label>통화<input name="currency" value="${esc(cfg.currency)}"></label><label>API input 포함 관계<select name="adjustment"><option value="none" ${p.adjustment==='none'?'selected':''}>그대로 과금 (차감 없음)</option><option value="subtract-read" ${p.adjustment==='subtract-read'?'selected':''}>cache read를 input에서 차감</option><option value="subtract-both" ${p.adjustment==='subtract-both'?'selected':''}>cache read + write를 input에서 차감</option></select></label>
      <button data-act="save">저장·재계산</button> ${String(cfg.currency).toUpperCase()==='USD'?'<button data-act="fx">현재 환율 갱신</button>':''}</details>`;
    body.querySelector('[data-act=save]').addEventListener('click',()=>saveProfile(g));
    body.querySelector('[data-act=fx]')?.addEventListener('click',async()=>{ body.querySelector('[data-act=fx]').textContent='갱신 중…'; await updateFx(true); });
  }
  async function refresh(force=false){
    if(refreshBusy) return;
    refreshBusy=true;
    try{
      const resolved=await resolveChat();
      if(!resolved){
        chatId=null; lastSignature='';
        body.innerHTML=professorWindowVisible()?'<div class="tr-muted">교수님 홈 대화는 토큰 usage가 저장되지 않아 계산할 수 없습니다.</div>':'<div class="tr-muted">현재 보이는 채팅을 확인하는 중…</div>';
        return;
      }
      chatId=resolved.id;
      const m=[...resolved.arr].reverse().find(x=>x.role==='assistant'&&usageOf(x));
      if(!m){ lastSignature=''; body.innerHTML='<div class="tr-muted">이 방의 최신 응답에는 토큰 usage가 없습니다.</div>'; return; }
      const g=usageOf(m), sig=`${chatId}:${m.id}:${JSON.stringify(g)}:${JSON.stringify(cfg)}`;
      if(!force&&sig===lastSignature)return;
      lastSignature=sig; render(m,g); if(!root.hidden) requestAnimationFrame(placePanel);
    }catch(e){ body.innerHTML=`<div class="tr-warn">영수증 조회 실패: ${esc(e?.message||e)}</div>`; }
    finally{refreshBusy=false;}
  }
  const placePanel=()=>{
    const rect=toggle.getBoundingClientRect(), panelWidth=Math.min(340,innerWidth-24);
    const left=Math.min(Math.max(12,rect.left),innerWidth-panelWidth-12);
    root.style.left=left+'px';
    if(rect.top>innerHeight-rect.bottom){ root.style.top='auto'; root.style.bottom=(innerHeight-rect.top+8)+'px'; }
    else { root.style.bottom='auto'; root.style.top=(rect.bottom+8)+'px'; }
  };
  const openPanel=()=>{ placePanel(); root.hidden=false; refresh(false); };
  const closePanel=()=>{ root.hidden=true; root.classList.remove('tr-help-open'); };
  const applyButtonPos=()=>{
    try{ const saved=JSON.parse(localStorage.getItem(POS_KEY)||'null'); if(!saved)return;
      const maxX=Math.max(0,innerWidth-toggle.offsetWidth),maxY=Math.max(0,innerHeight-toggle.offsetHeight);
      toggle.style.left=Math.min(maxX,Math.max(0,(saved.x/100)*innerWidth))+'px';
      toggle.style.top=Math.min(maxY,Math.max(0,(saved.y/100)*innerHeight))+'px'; toggle.style.right='auto';toggle.style.bottom='auto';
    }catch{}
  };
  let drag=null;
  on(toggle,'pointerdown',e=>{ if(e.button!==0&&e.pointerType==='mouse')return; const r=toggle.getBoundingClientRect(); drag={id:e.pointerId,sx:e.clientX,sy:e.clientY,ox:e.clientX-r.left,oy:e.clientY-r.top,moved:false}; try{toggle.setPointerCapture(e.pointerId)}catch{} });
  on(toggle,'pointermove',e=>{ if(!drag||e.pointerId!==drag.id)return; if(!drag.moved){if(Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<6)return;drag.moved=true;toggle.dataset.dragging='true';}
    const maxX=Math.max(0,innerWidth-toggle.offsetWidth),maxY=Math.max(0,innerHeight-toggle.offsetHeight); toggle.style.left=Math.min(maxX,Math.max(0,e.clientX-drag.ox))+'px';toggle.style.top=Math.min(maxY,Math.max(0,e.clientY-drag.oy))+'px';toggle.style.right='auto';toggle.style.bottom='auto';
  });
  const endDrag=e=>{ if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;delete toggle.dataset.dragging;try{toggle.releasePointerCapture(e.pointerId)}catch{}
    if(!d.moved){root.hidden?openPanel():closePanel();return;} const r=toggle.getBoundingClientRect();try{localStorage.setItem(POS_KEY,JSON.stringify({x:innerWidth?(r.left/innerWidth)*100:0,y:innerHeight?(r.top/innerHeight)*100:0}))}catch{} if(!root.hidden)placePanel();
  };
  on(toggle,'pointerup',endDrag);on(toggle,'pointercancel',endDrag);
  on(root.querySelector('[data-act=close]'),'click',closePanel);
  on(document,'keydown',e=>{if(!root.hidden&&e.key==='Escape')closePanel()});
  root.querySelector('[data-act=help]').addEventListener('click',()=>{ root.classList.toggle('tr-help-open'); requestAnimationFrame(placePanel); });
  root.querySelector('[data-act=refresh]').addEventListener('click',()=>refresh(true));
  storage.get().then(async r=>{cfg={...defaults,...(r?.value?.config||{})};applyButtonPos();await refresh(true);await updateFx(false)}).catch(()=>refresh(true));
  on(window,'resize',()=>{applyButtonPos();if(!root.hidden)placePanel();});
  on(window,'focus',()=>{refresh();updateFx(false)}); setInterval(()=>refresh(),2500); setInterval(()=>updateFx(false),FX_TTL);
})(marinara);