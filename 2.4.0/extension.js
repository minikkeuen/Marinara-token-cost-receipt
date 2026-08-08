((marinara) => {
  "use strict";

  if (!marinara?.extension?.id || !marinara.storage) {
    throw new Error("Token Cost Receipt requires Marinara Engine 2.4.0 full-page extension access");
  }

  const storage = marinara.storage;
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
  const MESSAGE_BUTTON = `${ROOT}-message-button`;
  if (document.getElementById(ROOT)) return;
  addStyle(`
.${MESSAGE_BUTTON}[aria-busy="true"]{cursor:wait;opacity:.45}.${MESSAGE_BUTTON} svg{pointer-events:none}
#${ROOT}[hidden]{display:none} #${ROOT}{position:fixed;z-index:9998;display:flex;flex-direction:column;width:min(360px,calc(100vw - 24px));max-height:min(78vh,640px);color:var(--foreground,#eee);background:var(--card,var(--background,#171717));border:1px solid var(--border,#444);border-radius:12px;box-shadow:0 14px 42px color-mix(in srgb,#050312 55%,transparent);font:12px/1.45 system-ui,sans-serif;overflow:hidden}
#${ROOT} *{box-sizing:border-box} #${ROOT} .tr-head{display:flex;flex:0 0 auto;align-items:center;gap:6px;padding:9px 10px 9px 12px;border-bottom:1px solid var(--border,#444);font-weight:700} #${ROOT} .tr-head span{margin-right:auto} #${ROOT} button{border:1px solid var(--border,#555);background:var(--secondary,#292929);color:inherit;border-radius:7px;padding:5px 8px;cursor:pointer;font:inherit} #${ROOT} .tr-icon-btn{display:grid;width:28px;height:28px;place-items:center;border-color:transparent;background:transparent;padding:0;font-size:15px} #${ROOT} .tr-icon-btn:hover,#${ROOT} .tr-icon-btn[aria-pressed="true"]{border-color:var(--border,#555);background:var(--secondary,#292929)} #${ROOT} .tr-icon-btn:focus-visible{outline:2px solid var(--primary,#ffb3d9);outline-offset:1px} #${ROOT} .tr-body{min-height:0;flex:1;padding:12px;overflow:auto;overscroll-behavior:contain} #${ROOT} .tr-muted{opacity:.67} #${ROOT} .tr-title{font-size:13px;font-weight:700;word-break:break-all;margin-bottom:8px} #${ROOT} .tr-row{display:flex;justify-content:space-between;gap:12px;padding:3px 0} #${ROOT} .tr-usage{display:grid;grid-template-columns:minmax(0,1fr) 82px auto;align-items:baseline;gap:8px} #${ROOT} .tr-tokens{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap} #${ROOT} .tr-total{border-top:1px solid var(--border,#444);margin-top:7px;padding-top:8px;font-weight:800;font-size:14px} #${ROOT} details{margin-top:10px;border-top:1px solid var(--border,#444);padding-top:8px} #${ROOT} input,#${ROOT} select{width:100%;margin:3px 0 7px;padding:6px;border:1px solid var(--border,#555);border-radius:7px;background:var(--background,#181818);color:inherit} #${ROOT} input[type="checkbox"]{width:16px;height:16px;margin:0;accent-color:var(--primary,#ffb3d9)} #${ROOT} .tr-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 8px} #${ROOT} .tr-preset{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:8px;margin:8px 0} #${ROOT} .tr-preset select{margin-bottom:0} #${ROOT} .tr-preset button{min-height:31px;white-space:nowrap} #${ROOT} label{display:block;font-size:11px;opacity:.82} #${ROOT} .tr-toggle{display:flex;align-items:flex-start;gap:9px;padding:8px 0;border-bottom:1px solid color-mix(in srgb,var(--border,#444) 60%,transparent)} #${ROOT} .tr-toggle span{display:grid;gap:2px} #${ROOT} .tr-toggle small{color:var(--muted-foreground,#aaa);font-size:10px;line-height:1.35} #${ROOT} .tr-settings-title{margin:0 0 5px;font-size:13px} #${ROOT} .tr-settings-actions{display:flex;gap:7px;margin-top:10px} #${ROOT} .tr-help h3{margin:0 0 8px;font-size:13px} #${ROOT} .tr-help h4{margin:12px 0 4px;font-size:12px} #${ROOT} .tr-help ol,#${ROOT} .tr-help ul{margin:4px 0;padding-left:18px} #${ROOT} .tr-help li{margin:5px 0} #${ROOT} .tr-help-note{margin-top:10px;padding:8px;border:1px solid var(--border,#444);border-radius:8px;background:color-mix(in srgb,var(--secondary,#292929) 55%,transparent)} #${ROOT} .tr-warn{color:#f5b84b;margin-top:8px} #${ROOT} .tr-error{color:var(--destructive,#ff6b9d)} #${ROOT} .tr-tier{margin:7px 0 3px;padding:7px 8px;border:1px solid color-mix(in srgb,#f5b84b 38%,var(--border,#444));border-radius:8px;background:color-mix(in srgb,#f5b84b 8%,var(--background,#171717));color:#f5c66d;font-weight:650}
@media(max-width:520px){#${ROOT}{left:12px!important;right:12px!important;bottom:calc(12px + env(safe-area-inset-bottom))!important;top:auto!important;width:auto;max-height:70vh}}
  `);
  const root = addElement(document.body, 'section', { id:ROOT, hidden:'', role:'dialog', 'aria-label':'메시지 토큰 영수증' });
  if (!root) return;
  root.innerHTML = `<div class="tr-head"><span>메시지 영수증</span><button type="button" class="tr-icon-btn" data-act="help" title="사용법" aria-label="사용법" aria-pressed="false">?</button><button type="button" class="tr-icon-btn" data-act="settings" title="조회 방식 설정" aria-label="조회 방식 설정" aria-pressed="false">⚙</button><button type="button" class="tr-icon-btn" data-act="close" title="닫기" aria-label="닫기">×</button></div><div class="tr-body"><div class="tr-muted">메시지의 영수증 아이콘을 눌러 주세요.</div></div>`;
  const body = root.querySelector('.tr-body');
  const defaults = { currency:'USD', input:0, read:0, write:0, output:0, adjustment:'none', cacheTtl:'5m', profiles:{}, fx:null, sources:{rpScreen:true,rpPeekFallback:false,conversationPeek:true} };
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
  let cfg = { ...defaults }, lastReceipt = null, anchorButton = null, activeRequest = null, panelView = 'receipt';
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
    if(panelView==='settings') renderSettings();
    else if(lastReceipt) render(lastReceipt.message,lastReceipt.usage,lastReceipt.source);
  }
  function activeSidebarChatId(){
    for(const row of document.querySelectorAll('[data-chat-id]')){
      const active=[...row.children].some(child=>child.classList?.contains('mari-chrome-accent-progress'));
      if(active) return row.getAttribute('data-chat-id');
    }
    return null;
  }
  function latestRequestedChatId(){
    for(const entry of performance.getEntriesByType('resource').slice().reverse()){
      const m=entry.name.match(/\/api\/chats\/([^/?]+)\/messages(?:[/?]|$)/);
      if(m) return decodeURIComponent(m[1]);
    }
    return null;
  }
  function currentChatId(){
    return activeSidebarChatId()||latestRequestedChatId();
  }
  function inferProvider(model){
    const value=String(model||'').toLowerCase();
    if(value.startsWith('claude-')||value.startsWith('anthropic/')) return 'anthropic';
    if(value.startsWith('gemini-')||value.startsWith('google/')) return 'google';
    if(value.startsWith('deepseek-')||value.startsWith('deepseek/')) return 'deepseek';
    if(value.startsWith('glm-')||value.startsWith('zhipu/')) return 'zhipu';
    if(value.startsWith('kimi-')||value.startsWith('moonshot/')) return 'moonshot';
    if(/^(?:gpt-|o\d|chatgpt-)/.test(value)||value.startsWith('openai/')) return 'openai';
    return 'unknown';
  }
  const parseTokenNumber = value => {
    const digits=String(value??'').replace(/[^0-9.-]/g,'');
    return digits&&Number.isFinite(Number(digits))?Number(digits):null;
  };
  function usageFromScreen(messageElement){
    const label=[...messageElement.querySelectorAll('[title]')]
      .map(element=>element.getAttribute('title')||'')
      .find(value=>/\d[\d,.]*\s*→\s*(?:\d[\d,.]*|\?)\s*tok/i.test(value));
    if(!label) return null;
    const tokenMatch=label.match(/([\d,.]+)\s*→\s*([\d,.]+|\?)\s*tok/i);
    const model=String(label.split('·')[0]||'').trim();
    const tokensPrompt=parseTokenNumber(tokenMatch?.[1]);
    const tokensCompletion=parseTokenNumber(tokenMatch?.[2]);
    if(!model||tokensPrompt==null||tokensCompletion==null) return null;
    return {
      provider:inferProvider(model), model,
      tokensPrompt, tokensCompletion,
      tokensCachedPrompt:parseTokenNumber(label.match(/cache\s+hit\s+([\d,.]+)/i)?.[1])||0,
      tokensCacheWritePrompt:parseTokenNumber(label.match(/cache\s+write\s+([\d,.]+)/i)?.[1])||0,
    };
  }
  function profileFor(g){
    const key=`${g.provider||''}::${g.model||''}`;
    const byModel=Object.entries(cfg.profiles||{}).find(([savedKey])=>savedKey.endsWith(`::${g.model||''}`))?.[1];
    return { key, ...(cfg.profiles[key]||byModel||cfg) };
  }
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
    await storage.patch({config:cfg});
    if(lastReceipt) render(lastReceipt.message,lastReceipt.usage,lastReceipt.source);
  }
  function setPanelView(view){
    panelView=view;
    root.querySelector('[data-act=help]').setAttribute('aria-pressed',String(view==='help'));
    root.querySelector('[data-act=settings]').setAttribute('aria-pressed',String(view==='settings'));
  }
  function renderReceiptOrIdle(){
    if(lastReceipt) render(lastReceipt.message,lastReceipt.usage,lastReceipt.source);
    else{
      setPanelView('receipt');
      body.innerHTML='<div class="tr-muted">메시지의 영수증 아이콘을 눌러 주세요.</div>';
      requestAnimationFrame(placePanel);
    }
  }
  function render(m,g,source){
    setPanelView('receipt');
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
      <div class="tr-muted">기록된 input: ${c.raw.toLocaleString()} · 메시지 ${esc(m.id||'')}</div>
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
    body.querySelector('details')?.addEventListener('toggle',()=>requestAnimationFrame(placePanel));
  }
  function renderHelp(){
    setPanelView('help');
    body.innerHTML=`<div class="tr-help"><h3>간단 설정</h3><ol><li>모델 가격표에서 <b>100만 토큰당 가격 (1M)</b>을 입력합니다.</li><li>가격표에 없는 항목은 <b>0</b>으로 둡니다.</li><li>아래에서 차감 방식을 고르고 저장합니다.</li></ol><h4>메시지별 영수증</h4><ul><li>AI 메시지 아래의 영수증 아이콘을 누르면 해당 메시지 한 건의 예상 비용을 확인합니다.</li><li><b>RP 화면 정보:</b> 화면 표시값 사용 (데이터 사용 없음)</li><li><b>Peek Prompt:</b> 메시지의 전체 프롬프트 1회 조회 (데이터 사용)</li><li>조회 방식은 톱니바퀴 버튼에서 선택합니다.</li></ul><h4>뭘 고르나요?</h4><ul><li><b>캐시 읽기가 0:</b> 그대로 과금</li><li><b>Claude 공식 API:</b> 그대로 과금</li><li><b>OpenAI·DeepSeek 공식 API:</b> cache read 차감</li><li><b>Gemini·GLM·OpenRouter:</b> 우선 그대로 과금</li></ul><div class="tr-help-note">OpenRouter는 <b>OpenRouter 가격표</b>를 사용하세요.</div><div class="tr-muted" style="margin-top:10px">표시 금액은 입력한 토큰 단가를 기준으로 계산한 예상액입니다.</div></div>`;
    requestAnimationFrame(placePanel);
  }
  function renderSettings(){
    setPanelView('settings');
    const sources={...defaults.sources,...(cfg.sources||{})};
    body.innerHTML=`<h3 class="tr-settings-title">조회 방식</h3>
      <label class="tr-toggle"><input type="checkbox" name="rpScreen" ${sources.rpScreen?'checked':''}><span><b>RP 화면 정보</b><small>화면 표시값 사용 (데이터 사용 없음)</small></span></label>
      <label class="tr-toggle"><input type="checkbox" name="rpPeekFallback" ${sources.rpPeekFallback?'checked':''}><span><b>RP Peek Prompt 보완</b><small>메시지의 전체 프롬프트 1회 조회 (데이터 사용)</small></span></label>
      <label class="tr-toggle"><input type="checkbox" name="conversationPeek" ${sources.conversationPeek?'checked':''}><span><b>대화모드 Peek Prompt</b><small>메시지의 전체 프롬프트 1회 조회 (데이터 사용)</small></span></label>
      <div class="tr-settings-actions"><button type="button" data-act="save-sources">저장</button>${String(cfg.currency).toUpperCase()==='USD'?'<button type="button" data-act="fx">환율 수동 갱신</button>':''}</div>
      <div class="tr-muted" style="margin-top:8px">환율: ${num(cfg.fx?.rate)?`USD 1 = ₩${num(cfg.fx.rate).toLocaleString('ko-KR')} · ${esc(fxTime())}`:'저장된 환율 없음'}</div>`;
    body.querySelector('[data-act=save-sources]').addEventListener('click',async()=>{
      cfg.sources={rpScreen:body.querySelector('[name=rpScreen]').checked,rpPeekFallback:body.querySelector('[name=rpPeekFallback]').checked,conversationPeek:body.querySelector('[name=conversationPeek]').checked};
      await storage.patch({config:cfg});
      body.querySelector('[data-act=save-sources]').textContent='저장됨';
    });
    body.querySelector('[data-act=fx]')?.addEventListener('click',async()=>{
      body.querySelector('[data-act=fx]').textContent='갱신 중…';
      await updateFx(true);
    });
    requestAnimationFrame(placePanel);
  }
  function placePanel(){
    if(root.hidden||!anchorButton?.isConnected||innerWidth<=520) return;
    const rect=anchorButton.getBoundingClientRect(), panelWidth=Math.min(360,innerWidth-24);
    root.style.right='auto'; root.style.bottom='auto';
    root.style.left=`${Math.min(Math.max(12,rect.left-panelWidth/2+rect.width/2),Math.max(12,innerWidth-panelWidth-12))}px`;
    const below=rect.bottom+8;
    if(below+root.offsetHeight<=innerHeight-12) root.style.top=`${below}px`;
    else root.style.top=`${Math.max(12,rect.top-root.offsetHeight-8)}px`;
  }
  function closePanel(){
    activeRequest?.abort(); activeRequest=null;
    root.hidden=true; setPanelView('receipt'); lastReceipt=null; anchorButton=null;
    for(const button of document.querySelectorAll(`.${MESSAGE_BUTTON}[aria-expanded="true"]`)) button.setAttribute('aria-expanded','false');
  }
  function showError(message,detail=''){
    setPanelView('receipt');
    body.innerHTML=`<div class="tr-error"><b>${esc(message)}</b></div>${detail?`<div class="tr-muted" style="margin-top:7px">${esc(detail)}</div>`:''}`;
    requestAnimationFrame(placePanel);
  }
  async function usageFromPeek(messageId){
    const chatId=currentChatId();
    if(!chatId) throw new Error('현재 채팅 ID를 찾지 못했습니다. 채팅을 다시 선택해 주세요.');
    activeRequest?.abort();
    const request=new AbortController();
    activeRequest=request;
    try{
      const data=await apiFetch(`/chats/${encodeURIComponent(chatId)}/peek-prompt`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messageId}),signal:request.signal});
      if(!data?.generationInfo) throw new Error('이 메시지에는 저장된 generationInfo가 없습니다.');
      const usage={...data.generationInfo};
      if(!usage.provider||usage.provider==='custom'||usage.provider==='unknown') usage.provider=inferProvider(usage.model);
      return usage;
    }finally{
      if(activeRequest===request) activeRequest=null;
    }
  }
  async function openReceipt(messageElement,button){
    activeRequest?.abort(); activeRequest=null;
    for(const other of document.querySelectorAll(`.${MESSAGE_BUTTON}[aria-expanded="true"]`)) other.setAttribute('aria-expanded','false');
    anchorButton=button; button.setAttribute('aria-expanded','true');
    root.hidden=false; setPanelView('receipt'); lastReceipt=null;
    body.innerHTML='<div class="tr-muted">토큰 사용량을 읽는 중…</div>';
    requestAnimationFrame(placePanel);
    const messageId=messageElement.getAttribute('data-message-id');
    const isConversation=Boolean(messageElement.closest('[data-component="ChatArea.Conversation"]'));
    const sources={...defaults.sources,...(cfg.sources||{})};
    try{
      let usage=null, source='';
      if(!isConversation&&sources.rpScreen){ usage=usageFromScreen(messageElement); if(usage) source='screen'; }
      const allowPeek=isConversation?sources.conversationPeek:sources.rpPeekFallback;
      if(!usage&&allowPeek){ button.setAttribute('aria-busy','true'); try{usage=await usageFromPeek(messageId);source='peek'}finally{button.removeAttribute('aria-busy')} }
      if(root.hidden||anchorButton!==button) return;
      if(!usage){
        showError(isConversation?'대화모드 Peek Prompt 조회가 꺼져 있습니다.':'화면에서 모델·토큰 정보를 찾지 못했습니다.',isConversation?'설정에서 대화모드 Peek Prompt를 켜 주세요.':'Marinara의 모델명·토큰 사용량 표시를 켜거나 RP Peek Prompt 보완을 허용해 주세요.');
        return;
      }
      lastReceipt={message:{id:messageId},usage,source};
      render(lastReceipt.message,usage,source);
      requestAnimationFrame(placePanel);
    }catch(error){
      if(error?.name==='AbortError') return;
      showError('영수증 정보를 불러오지 못했습니다.',error?.message||String(error));
    }
  }
  const RECEIPT_LABEL='이 메시지의 토큰 영수증';
  const RECEIPT_ICON='<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-receipt-text" aria-hidden="true"><path d="M4 2v20l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2V2l-2 2-2-2-2 2-2-2-2 2-2-2-2 2Z"/><path d="M16 8h-6"/><path d="M16 12h-6"/><path d="M13 16h-3"/></svg>';
  function decorateMessage(messageElement){
    if(!(messageElement instanceof Element)||messageElement.getAttribute('data-message-role')!=='assistant') return;
    const actions=messageElement.querySelector('.mari-message-actions');
    if(!actions||actions.querySelector(`.${MESSAGE_BUTTON}`)) return;
    const button=document.createElement('button');
    const referenceButton=[...actions.children].find(element=>element instanceof HTMLButtonElement);
    const fallbackClass='inline-flex h-[1.7em] w-[1.7em] shrink-0 items-center justify-center rounded-md p-0 text-[0.8125rem] leading-none transition-all active:scale-90 text-foreground/40 hover:bg-foreground/10 hover:text-foreground/70';
    button.type='button'; button.className=`${MESSAGE_BUTTON} ${referenceButton?.className||fallbackClass}`; button.innerHTML=RECEIPT_ICON;
    button.title=RECEIPT_LABEL; button.setAttribute('aria-label',RECEIPT_LABEL); button.setAttribute('aria-expanded','false'); button.setAttribute('aria-controls',ROOT);
    button.tabIndex=actions.getAttribute('aria-hidden')==='true'?-1:0;
    button.addEventListener('click',event=>{
      event.preventDefault(); event.stopPropagation();
      if(!root.hidden&&anchorButton===button){closePanel();return}
      void openReceipt(messageElement,button);
    });
    actions.insertBefore(button,actions.lastElementChild||null);
  }
  function decorateWithin(node){
    if(!(node instanceof Element)) return;
    if(node.matches('[data-message-id]')) decorateMessage(node);
    const owner=node.matches('.mari-message-actions')?node.closest('[data-message-id]'):null;
    if(owner) decorateMessage(owner);
    for(const message of node.querySelectorAll('[data-message-id]')) decorateMessage(message);
  }
  const observer=new MutationObserver(records=>{
    for(const record of records){
      if(record.type==='attributes'&&record.target instanceof Element){
        const button=record.target.querySelector(`.${MESSAGE_BUTTON}`);
        if(button) button.tabIndex=record.target.getAttribute('aria-hidden')==='true'?-1:0;
      }
      for(const node of record.addedNodes) decorateWithin(node);
    }
  });
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-hidden']});
  marinara.onCleanup(()=>{observer.disconnect();activeRequest?.abort();document.querySelectorAll(`.${MESSAGE_BUTTON}`).forEach(button=>button.remove())});
  on(root.querySelector('[data-act=close]'),'click',closePanel);
  on(root.querySelector('[data-act=help]'),'click',()=>{
    if(panelView==='help') renderReceiptOrIdle();
    else renderHelp();
  });
  on(root.querySelector('[data-act=settings]'),'click',()=>{
    if(panelView==='settings') renderReceiptOrIdle();
    else renderSettings();
  });
  on(document,'keydown',event=>{if(!root.hidden&&event.key==='Escape')closePanel()});
  on(document,'pointerdown',event=>{if(!root.hidden&&event.target instanceof Node&&!root.contains(event.target)&&!event.target.closest?.(`.${MESSAGE_BUTTON}`))closePanel()},true);
  on(window,'resize',placePanel);
  storage.get().then(saved=>{
    const state=saved?.value&&typeof saved.value==='object'?saved.value:saved;
    const savedConfig=state?.config||{};
    cfg={...defaults,...savedConfig,sources:{...defaults.sources,...(savedConfig.sources||{})}};
  }).catch(()=>{});
  decorateWithin(document.body);
})(marinara);
