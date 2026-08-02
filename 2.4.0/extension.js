((marinara) => {
  "use strict";

  if (!marinara?.extension?.id || !marinara.storage) {
    throw new Error("Token Cost Receipt requires Marinara Engine 2.4.0 full-page extension access");
  }

  const storage = marinara.storage;
  const setInterval = marinara.setInterval.bind(marinara);
  const addStyle = css => {
    const style = document.createElement('style');
    style.dataset.tokenCostReceipt = marinara.extension.id;
    style.textContent = css;
    document.head.append(style);
    marinara.onCleanup(() => style.remove());
    return style;
  };
  const addElement = (parent, tag, attrs = {}) => {
    const host = typeof parent === 'string' ? document.querySelector(parent) : parent;
    if (!(host instanceof Element)) return null;
    const element = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null || value === false) continue;
      if (key === 'textContent' || key === 'innerHTML') element[key] = String(value);
      else element.setAttribute(key, value === true ? '' : String(value));
    }
    host.append(element);
    marinara.onCleanup(() => element.remove());
    return element;
  };
  const on = (target, event, handler, options) => {
    target.addEventListener(event, handler, options);
    marinara.onCleanup(() => target.removeEventListener(event, handler, options));
    return handler;
  };
  const apiFetch = async (path, options = {}) => {
    const normalized = String(path || '').replace(/^\/+/, '');
    if (!normalized || normalized.startsWith('admin/') || normalized.startsWith('personal-extensions/')) {
      throw new Error('Token Cost Receipt rejected an unsupported Marinara API path');
    }
    const response = await fetch(`/api/${normalized}`, {
      ...options,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json', ...(options.headers || {}) },
    });
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
    if (!response.ok) {
      const message = payload && typeof payload === 'object' && ('error' in payload || 'message' in payload)
        ? payload.error || payload.message
        : `Marinara API request failed (${response.status})`;
      throw new Error(String(message));
    }
    return payload;
  };

  const ROOT = 'mari-token-receipt';
  const BUTTON = `${ROOT}-button`;
  if (document.getElementById(ROOT) || document.getElementById(BUTTON)) return;
  addStyle(`
#${BUTTON}{position:fixed;right:18px;bottom:18px;z-index:9997;display:grid;width:44px;height:44px;place-items:center;border:1px solid var(--border,#444);border-radius:9999px;background:var(--background,#171717);color:var(--foreground,#eee);box-shadow:0 8px 24px #0006;cursor:grab;touch-action:none;user-select:none;font:20px/1 system-ui,sans-serif} #${BUTTON}[data-dragging="true"]{cursor:grabbing;opacity:.85}
#${ROOT}[hidden]{display:none} #${ROOT}{position:fixed;z-index:9998;width:min(340px,calc(100vw - 24px));max-height:75vh;color:var(--foreground,#eee);background:var(--background,#171717);border:1px solid var(--border,#444);border-radius:14px;box-shadow:0 14px 42px #0008;font:12px/1.45 system-ui,sans-serif;overflow:hidden}
#${ROOT} *{box-sizing:border-box} #${ROOT} .tr-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--border,#444);font-weight:700} #${ROOT} .tr-head span{margin-right:auto} #${ROOT} .tr-head button{flex:0 0 auto} #${ROOT} .tr-help{display:none;padding:12px;overflow:auto;max-height:calc(75vh - 45px)} #${ROOT}.tr-help-open .tr-body{display:none} #${ROOT}.tr-help-open .tr-help{display:block} #${ROOT} .tr-help h3{font-size:13px;margin:0 0 8px} #${ROOT} .tr-help h4{font-size:12px;margin:12px 0 4px} #${ROOT} .tr-help ul{margin:4px 0;padding-left:18px} #${ROOT} .tr-help li{margin:4px 0} #${ROOT} .tr-help code{font-size:11px} #${ROOT} .tr-note{margin-top:10px;padding:8px;border:1px solid color-mix(in srgb,#f5b84b 45%,var(--border,#444));border-radius:8px;background:color-mix(in srgb,#f5b84b 10%,var(--background,#171717))} #${ROOT} button{border:1px solid var(--border,#555);background:var(--secondary,#292929);color:inherit;border-radius:8px;padding:4px 8px;cursor:pointer} #${ROOT} .tr-body{padding:12px;overflow:auto;max-height:calc(75vh - 45px)} #${ROOT} .tr-muted{opacity:.67} #${ROOT} .tr-title{font-size:13px;font-weight:700;word-break:break-all;margin-bottom:8px} #${ROOT} .tr-row{display:flex;justify-content:space-between;gap:12px;padding:3px 0} #${ROOT} .tr-usage{display:grid;grid-template-columns:minmax(0,1fr) 82px auto;align-items:baseline;gap:8px} #${ROOT} .tr-tokens{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap} #${ROOT} .tr-total{border-top:1px solid var(--border,#444);margin-top:7px;padding-top:8px;font-weight:800;font-size:14px} #${ROOT} details{margin-top:10px;border-top:1px solid var(--border,#444);padding-top:8px} #${ROOT} input,#${ROOT} select{width:100%;margin:3px 0 7px;padding:6px;border:1px solid var(--border,#555);border-radius:7px;background:var(--background,#181818);color:inherit} #${ROOT} .tr-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 8px} #${ROOT} .tr-preset{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:8px;margin:8px 0} #${ROOT} .tr-preset select{margin-bottom:0} #${ROOT} .tr-preset button{min-height:31px;white-space:nowrap} #${ROOT} label{display:block;font-size:11px;opacity:.82} #${ROOT} .tr-warn{color:#f5b84b;margin-top:8px} #${ROOT} .tr-tier{margin:7px 0 3px;padding:7px 8px;border:1px solid color-mix(in srgb,#f5b84b 38%,var(--border,#444));border-radius:8px;background:color-mix(in srgb,#f5b84b 8%,var(--background,#171717));color:#f5c66d;font-weight:650}
  `);
  const toggle = addElement(document.body, 'button', { id:BUTTON, type:'button', title:'Token Receipt — 드래그로 이동', 'aria-label':'Token Receipt', textContent:'🧾' });
  const root = addElement(document.body, 'section', { id:ROOT, hidden:'', role:'dialog', 'aria-label':'Token Receipt' });
  if (!root || !toggle) return;
  root.innerHTML = `<div class="tr-head"><span>🧾 Token Receipt</span><button data-act="help" title="사용법" aria-label="사용법">?</button><button data-act="refresh" title="영수증 새로고침" aria-label="영수증 새로고침">↻</button><button data-act="close" title="닫기" aria-label="닫기">×</button></div><div class="tr-body"><div class="tr-muted">채팅 usage를 기다리는 중…</div></div><div class="tr-help"><h3>간단 설정</h3><ol><li>모델 가격표에서 <b>100만 토큰당 가격 (1M)</b>을 입력합니다.</li><li>가격표에 없는 항목은 <b>0</b>으로 둡니다.</li><li>아래에서 차감 방식을 고르고 저장합니다.</li></ol><h4>뭘 고르나요?</h4><ul><li><b>캐시 읽기가 0:</b> 그대로 과금</li><li><b>Claude 공식 API:</b> 그대로 과금</li><li><b>OpenAI·DeepSeek 공식 API:</b> cache read 차감</li><li><b>Gemini·GLM·OpenRouter:</b> 우선 그대로 과금</li></ul><div class="tr-note">OpenRouter는 <b>OpenRouter 가격표</b>를 사용하세요.</div><div class="tr-muted" style="margin-top:10px">표시 금액은 세금·카드 수수료를 제외한 예상액입니다.</div></div>`;
  const body = root.querySelector('.tr-body');
  const defaults = { currency:'USD', input:0, read:0, write:0, output:0, adjustment:'none', cacheTtl:'5m', profiles:{}, fx:null, position:null };
  const FX_TTL = 6 * 60 * 60 * 1000;
  const PRESET_GROUPS = [
    { label:'OpenAI', items:[
      {id:'gpt-5.6-terra',label:'GPT-5.6 Terra',input:2.5,read:.25,write:0,output:15,adjustment:'subtract-read'},
      {id:'gpt-5.6-sol',label:'GPT-5.6 Sol',input:5,read:.5,write:0,output:30,adjustment:'subtract-read'},
      {id:'gpt-5.6-luna',label:'GPT-5.6 Luna',input:1,read:.1,write:0,output:6,adjustment:'subtract-read'},
      {id:'gpt-5.5',label:'GPT-5.5',input:5,read:.5,write:0,output:30,adjustment:'subtract-read'},
      {id:'gpt-5.4',label:'GPT-5.4',input:2.5,read:.25,write:0,output:15,adjustment:'subtract-read'},
      {id:'gpt-5.4-mini',label:'GPT-5.4 mini',input:.75,read:.075,write:0,output:4.5,adjustment:'subtract-read'},
      {id:'gpt-5.4-nano',label:'GPT-5.4 nano',input:.2,read:.02,write:0,output:1.25,adjustment:'subtract-read'},
    ]},
    { label:'Anthropic', items:[
      {id:'claude-fable-5',label:'Claude Fable 5',input:10,read:1,write:12.5,write1h:20,output:50,adjustment:'none'},
      {id:'claude-opus-5',label:'Claude Opus 5',input:5,read:.5,write:6.25,write1h:10,output:25,adjustment:'none'},
      {id:'claude-sonnet-5-until-2026-08-31',modelId:'claude-sonnet-5',label:'Claude Sonnet 5 (2026-08-31까지)',input:2,read:.2,write:2.5,write1h:4,output:10,adjustment:'none',activeUntil:'2026-09-01T00:00:00Z'},
      {id:'claude-sonnet-5-from-2026-09-01',modelId:'claude-sonnet-5',label:'Claude Sonnet 5 (2026-09-01부터)',input:3,read:.3,write:3.75,write1h:6,output:15,adjustment:'none',activeFrom:'2026-09-01T00:00:00Z'},
      {id:'claude-opus-4-8',label:'Claude Opus 4.8',input:5,read:.5,write:6.25,write1h:10,output:25,adjustment:'none'},
      {id:'claude-opus-4-7',label:'Claude Opus 4.7',input:5,read:.5,write:6.25,write1h:10,output:25,adjustment:'none'},
      {id:'claude-opus-4-6',label:'Claude Opus 4.6',input:5,read:.5,write:6.25,write1h:10,output:25,adjustment:'none'},
      {id:'claude-sonnet-4-6',label:'Claude Sonnet 4.6',input:3,read:.3,write:3.75,write1h:6,output:15,adjustment:'none'},
    ]},
    { label:'Google Gemini', items:[
      {id:'gemini-3.6-flash',label:'Gemini 3.6 Flash',input:1.5,read:.15,write:0,output:7.5,adjustment:'none'},
      {id:'gemini-3.5-flash',label:'Gemini 3.5 Flash',input:1.5,read:.15,write:0,output:9,adjustment:'none'},
      {id:'gemini-3.1-pro-preview',label:'Gemini 3.1 Pro Preview',input:2,read:.2,write:0,output:12,adjustment:'none'},
      {id:'gemini-3.1-flash-lite',label:'Gemini 3.1 Flash-Lite',input:.25,read:.025,write:0,output:1.5,adjustment:'none'},
    ]},
    { label:'DeepSeek', items:[
      {id:'deepseek-v4-pro',label:'DeepSeek V4 Pro',input:.435,read:.003625,write:0,output:.87,adjustment:'subtract-read'},
      {id:'deepseek-v4-flash',label:'DeepSeek V4 Flash',input:.14,read:.0028,write:0,output:.28,adjustment:'subtract-read'},
    ]},
    { label:'GLM', items:[
      {id:'glm-5.2',label:'GLM-5.2',input:1.4,read:.26,write:0,output:4.4,adjustment:'none'},
      {id:'glm-5.1',label:'GLM-5.1',input:1.4,read:.26,write:0,output:4.4,adjustment:'none'},
    ]},
    { label:'Kimi', items:[
      {id:'kimi-k3',label:'Kimi K3',input:3,read:.3,write:0,output:15,adjustment:'none'},
      {id:'kimi-k2.6',label:'Kimi K2.6',input:.95,read:.16,write:0,output:4,adjustment:'none'},
    ]},
  ];
  const PRESETS = PRESET_GROUPS.flatMap(group=>group.items);
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
  function presetIsActive(p,now=Date.now()){
    return (!p.activeFrom||now>=Date.parse(p.activeFrom))&&(!p.activeUntil||now<Date.parse(p.activeUntil));
  }
  function currentPreset(g){
    const model=String(g.model||'').toLowerCase().replace(/^(?:openai|anthropic|google)\//,'');
    const exact=PRESETS.find(p=>model===(p.modelId||p.id)&&presetIsActive(p));
    if(exact) return exact;
    if(/^gpt-5\.6(?:-\d|$)/.test(model)) return PRESETS.find(p=>p.id==='gpt-5.6-sol')||null;
    if(/^gemini-3\.1-pro(?:-|$)/.test(model)) return PRESETS.find(p=>p.id==='gemini-3.1-pro-preview')||null;
    return [...PRESETS].sort((a,b)=>(b.modelId||b.id).length-(a.modelId||a.id).length).find(p=>{
      const presetModel=p.modelId||p.id;
      if(!presetIsActive(p)||!model.startsWith(`${presetModel}-`)) return false;
      if(p.id==='gpt-5.4'&&/^gpt-5\.4-(?:mini|nano|pro)(?:-|$)/.test(model)) return false;
      if(p.id==='gpt-5.5'&&/^gpt-5\.5-pro(?:-|$)/.test(model)) return false;
      return true;
    })||null;
  }
  function tierFor(g,raw){
    const provider=String(g.provider||'').toLowerCase(), model=String(g.model||'').toLowerCase().replace(/^openai\//,'');
    if(provider==='google'&&/^gemini-3\.1-pro(?:-preview)?(?:-|$)/.test(model)&&raw>200000){
      return {threshold:200000,input:2,read:2,write:1,output:1.5};
    }
    const gpt54=/^gpt-5\.4(?:-\d|$)/.test(model);
    const gpt55=/^gpt-5\.5(?:-\d|$)/.test(model);
    const gpt56=/^gpt-5\.6(?:$|-(?:sol(?:-pro)?|terra|luna)(?:-|$))/.test(model);
    if(provider==='openai'&&(gpt54||gpt55||gpt56)&&raw>272000){
      return {threshold:272000,input:2,read:2,write:1,output:1.5};
    }
    return null;
  }
  function compute(g,p){
    const raw=num(g.tokensPrompt), read=num(g.tokensCachedPrompt), write=num(g.tokensCacheWritePrompt), out=num(g.tokensCompletion);
    let ordinary=raw;
    if(p.adjustment==='subtract-read') ordinary=Math.max(0,raw-read);
    if(p.adjustment==='subtract-both') ordinary=Math.max(0,raw-read-write);
    const tier=tierFor(g,raw), factor=tier||{input:1,read:1,write:1,output:1};
    const rates={input:num(p.input)*factor.input,read:num(p.read)*factor.read,write:num(p.write)*factor.write,output:num(p.output)*factor.output};
    const parts={input:ordinary*rates.input/1e6,read:read*rates.read/1e6,write:write*rates.write/1e6,output:out*rates.output/1e6};
    return {raw,ordinary,read,write,out,rates,tier,parts,total:Object.values(parts).reduce((a,b)=>a+b,0)};
  }
  async function saveProfile(g){
    const key=`${g.provider||''}::${g.model||''}`; const q=n=>num(root.querySelector(`[name=${n}]`).value);
    cfg.currency=root.querySelector('[name=currency]').value.trim()||'USD';
    cfg.profiles={...(cfg.profiles||{}),[key]:{input:q('input'),read:q('read'),write:q('write'),output:q('output'),adjustment:root.querySelector('[name=adjustment]').value,cacheTtl:root.querySelector('[name=cacheTtl]').value}};
    await storage.patch({config:cfg}); await refresh(true);
  }
  function render(m,g){
    const p=profileFor(g), c=compute(g,p), configured=[p.input,p.read,p.write,p.output].some(x=>num(x)>0);
    const suggested=currentPreset(g);
    const presetOptions=PRESET_GROUPS.map(group=>`<optgroup label="${esc(group.label)}">${group.items.map(item=>`<option value="${esc(item.id)}" ${suggested?.id===item.id?'selected':''}>${esc(item.label)}${suggested?.id===item.id?' (현재 모델)':''}</option>`).join('')}</optgroup>`).join('');
    body.innerHTML=`<div class="tr-title">${esc(g.provider||'unknown')} · ${esc(g.model||'unknown model')}</div>
      <div class="tr-row tr-usage"><span>일반 입력</span><span class="tr-tokens">${c.ordinary.toLocaleString()} tok</span><b>${money(c.parts.input)}</b></div>
      <div class="tr-row tr-usage"><span>캐시 읽기(hit)</span><span class="tr-tokens">${c.read.toLocaleString()} tok</span><b>${money(c.parts.read)}</b></div>
      <div class="tr-row tr-usage"><span>캐시 쓰기(created)${String(g.provider||'').toLowerCase()==='anthropic'||String(g.model||'').toLowerCase().includes('claude-')?` · ${p.cacheTtl==='1h'?'1h':'5m'}`:''}</span><span class="tr-tokens">${c.write.toLocaleString()} tok</span><b>${money(c.parts.write)}</b></div>
      <div class="tr-row tr-usage"><span>출력 (추론 포함)</span><span class="tr-tokens">${c.out.toLocaleString()} tok</span><b>${money(c.parts.output)}</b></div>
      <div class="tr-row tr-total"><span>턴 합계</span><span>${money(c.total)}</span></div>
      ${c.tier?`<div class="tr-tier">장문 요금 적용: 입력 ${c.raw.toLocaleString()} &gt; ${c.tier.threshold.toLocaleString()}토큰</div>`:''}
      ${String(cfg.currency).toUpperCase()==='USD'?`<div class="tr-row"><span>현재 환율 원화 예상액</span><b>${won(c.total)}</b></div><div class="tr-muted">USD 1 = ₩${num(cfg.fx?.rate).toLocaleString('ko-KR')} · 기준 ${esc(cfg.fx?.marketDate||'')} · 갱신 ${esc(fxTime())}</div>${cfg.fx?.error?`<div class="tr-warn">환율 갱신 실패: ${esc(cfg.fx.error)}</div>`:''}`:''}
      ${configured?'':'<div class="tr-warn">단가가 0입니다. 아래에서 공급자 가격표를 입력하세요.</div>'}
      <div class="tr-muted">API 보고 input: ${c.raw.toLocaleString()} · 메시지 ${esc(m.id||'')}</div>
      <details><summary>이 모델 단가 설정 (1M 토큰당)</summary><div class="tr-preset"><label>모델 단가 프리셋<select name="preset">${presetOptions}</select></label><button data-act="load-preset">값 불러오기</button></div><label data-field="cache-ttl">Claude 캐시 쓰기 TTL<select name="cacheTtl"><option value="5m" ${p.cacheTtl!=='1h'?'selected':''}>5분</option><option value="1h" ${p.cacheTtl==='1h'?'selected':''}>1시간</option></select></label><div class="tr-muted" data-field="cache-ttl-note">실제 TTL은 Marinara의 Anthropic 연결 설정에서 별도로 선택합니다.</div><div class="tr-grid">
      <label>일반 입력<input name="input" type="number" step="any" value="${num(p.input)}"></label><label>캐시 읽기<input name="read" type="number" step="any" value="${num(p.read)}"></label>
      <label>캐시 쓰기<input name="write" type="number" step="any" value="${num(p.write)}"></label><label>출력 (추론 포함)<input name="output" type="number" step="any" value="${num(p.output)}"></label></div>
      <label>통화<input name="currency" value="${esc(cfg.currency)}"></label><label>API input 포함 관계<select name="adjustment"><option value="none" ${p.adjustment==='none'?'selected':''}>그대로 과금 (차감 없음)</option><option value="subtract-read" ${p.adjustment==='subtract-read'?'selected':''}>cache read를 input에서 차감</option><option value="subtract-both" ${p.adjustment==='subtract-both'?'selected':''}>cache read + write를 input에서 차감</option></select></label>
      <button data-act="save">저장·재계산</button> ${String(cfg.currency).toUpperCase()==='USD'?'<button data-act="fx">현재 환율 갱신</button>':''}</details>`;
    const selectedPreset=()=>PRESETS.find(item=>item.id===body.querySelector('[name=preset]').value);
    const syncCacheTtlVisibility=()=>{
      const preset=selectedPreset(), visible=String(g.provider||'').toLowerCase()==='anthropic'||preset?.write1h!=null;
      for(const element of body.querySelectorAll('[data-field^=cache-ttl]')) element.hidden=!visible;
    };
    const syncPresetWrite=()=>{
      const preset=selectedPreset();
      if(!preset) return;
      body.querySelector('[name=write]').value=String(body.querySelector('[name=cacheTtl]').value==='1h'&&preset.write1h!=null?preset.write1h:preset.write);
    };
    body.querySelector('[name=preset]').addEventListener('change',syncCacheTtlVisibility);
    body.querySelector('[name=cacheTtl]').addEventListener('change',()=>{
      if(selectedPreset()?.write1h!=null) syncPresetWrite();
    });
    syncCacheTtlVisibility();
    body.querySelector('[data-act=load-preset]').addEventListener('click',()=>{
      const preset=selectedPreset();
      if(!preset) return;
      for(const field of ['input','read','output']) body.querySelector(`[name=${field}]`).value=String(preset[field]);
      syncPresetWrite();
      body.querySelector('[name=adjustment]').value=preset.adjustment;
    });
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
  const ICON=44, EDGE=8;
  const anchor=()=>({
    x:Number.isFinite(Number(cfg.position?.x))?num(cfg.position.x):Math.max(EDGE,innerWidth-ICON-18),
    y:Number.isFinite(Number(cfg.position?.y))?num(cfg.position.y):Math.max(EDGE,innerHeight-ICON-18)
  });
  const clampAnchor=(x,y)=>({
    x:Math.min(Math.max(EDGE,Math.round(x)),Math.max(EDGE,innerWidth-ICON-EDGE)),
    y:Math.min(Math.max(EDGE,Math.round(y)),Math.max(EDGE,innerHeight-ICON-EDGE))
  });
  const placeButton=()=>{
    const a=clampAnchor(anchor().x,anchor().y);
    toggle.style.left=`${a.x}px`; toggle.style.top=`${a.y}px`; toggle.style.right='auto'; toggle.style.bottom='auto';
    return a;
  };
  const placePanel=()=>{
    const rect=toggle.getBoundingClientRect(), panelWidth=Math.min(340,innerWidth-24);
    root.style.left=`${Math.min(Math.max(12,rect.left),Math.max(12,innerWidth-panelWidth-12))}px`;
    if(rect.top>innerHeight-rect.bottom){
      const top=rect.top-root.offsetHeight-8;
      if(top<12){root.style.top='12px';root.style.bottom='auto'}
      else{root.style.top='auto';root.style.bottom=`${innerHeight-rect.top+8}px`}
    }else{
      const top=rect.bottom+8;
      if(top+root.offsetHeight>innerHeight-12){root.style.top='auto';root.style.bottom='12px'}
      else{root.style.bottom='auto';root.style.top=`${top}px`}
    }
  };
  const openPanel=()=>{
    root.hidden=false;
    placePanel();
    void refresh(false);
  };
  const closePanel=()=>{
    root.classList.remove('tr-help-open');
    root.hidden=true;
  };

  let drag=null;
  on(toggle,'pointerdown',event=>{
    if(event.button!==0&&event.pointerType==='mouse') return;
    const rect=toggle.getBoundingClientRect();
    drag={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,offsetX:event.clientX-rect.left,offsetY:event.clientY-rect.top,moved:false};
    try{toggle.setPointerCapture(event.pointerId)}catch{}
  });
  on(toggle,'pointermove',event=>{
    if(!drag||event.pointerId!==drag.pointerId) return;
    if(!drag.moved){
      if(Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)<6) return;
      drag.moved=true; toggle.dataset.dragging='true';
    }
    const a=clampAnchor(event.clientX-drag.offsetX,event.clientY-drag.offsetY);
    toggle.style.left=`${a.x}px`; toggle.style.top=`${a.y}px`; toggle.style.right='auto'; toggle.style.bottom='auto';
    if(!root.hidden) placePanel();
  });
  const endDrag=event=>{
    if(!drag||event.pointerId!==drag.pointerId) return;
    const moved=drag.moved; drag=null; delete toggle.dataset.dragging;
    try{toggle.releasePointerCapture(event.pointerId)}catch{}
    if(!moved){
      if(root.hidden) openPanel(); else closePanel();
      return;
    }
    const rect=toggle.getBoundingClientRect();
    cfg.position=clampAnchor(rect.left,rect.top);
    void storage.patch({config:cfg}).catch(()=>{});
    if(!root.hidden) placePanel();
  };
  on(toggle,'pointerup',endDrag);
  on(toggle,'pointercancel',endDrag);
  on(root.querySelector('[data-act=close]'),'click',closePanel);
  on(root.querySelector('[data-act=help]'),'click',()=>{root.classList.toggle('tr-help-open');requestAnimationFrame(placePanel)});
  on(root.querySelector('[data-act=refresh]'),'click',()=>refresh(true));
  on(document,'keydown',event=>{if(!root.hidden&&event.key==='Escape')closePanel()});
  storage.get().then(async saved=>{
    const state=saved?.value&&typeof saved.value==='object'?saved.value:saved;
    cfg={...defaults,...(state?.config||{})};
    placeButton();
    await refresh(true);
    await updateFx(false);
  }).catch(()=>{placeButton();refresh(true)});
  on(window,'resize',()=>{cfg.position=clampAnchor(anchor().x,anchor().y);placeButton();if(!root.hidden)placePanel()});
  on(window,'focus',()=>{refresh();updateFx(false)}); setInterval(()=>refresh(),2500); setInterval(()=>updateFx(false),FX_TTL);
})(marinara);
