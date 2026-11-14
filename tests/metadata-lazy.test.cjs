const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const packageDir = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(packageDir, 'manifest.json'), 'utf8'));
const source = [].concat(manifest.config.jsPath).map(file => fs.readFileSync(path.join(packageDir, file), 'utf8')).join('\n\n');
class Element {
  constructor(attrs = {}) { this.attrs = attrs; this.dataset = {}; this.children = []; this.isConnected = true; this.textContent = ''; this.className = ''; this.value = ''; this.hidden = false; this.parts = new Map(); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  removeAttribute(k) { delete this.attrs[k]; }
  append(el) { this.children.push(el); }
  insertBefore(el) { this.children.push(el); }
  addEventListener(event, handler) { if (!this.listeners) this.listeners = new Map(); this.listeners.set(event, handler); }
  removeEventListener(event) { this.listeners?.delete(event); }
  remove() { this.isConnected = false; }
  matches(s) { return s === '[data-message-id]' && !!this.attrs['data-message-id']; }
  closest(s) { return s.includes('ChatArea.Conversation') && this.conversation ? this : null; }
  querySelector(s) {
    if (s.startsWith('[name=') && this.parts.has('.tr-body')) return this.parts.get('.tr-body').querySelector(s);
    if (s === '.mari-message-actions') return this.actions;
    if (s === '.mari-message-name') return this.name;
    if (s.includes('message-button')) return this.children.find(el => el.className.includes('message-button')) || null;
    if (!this.parts.has(s)) this.parts.set(s, new Element());
    return this.parts.get(s);
  }
  querySelectorAll(s) { return s === '[title]' ? (this.labels || []) : []; }
}
function deferred() { let resolve, reject; const promise = new Promise((a,b) => {resolve=a;reject=b;}); return {promise,resolve,reject}; }
const tick = () => new Promise(resolve => setImmediate(resolve));
function harness(runtimeSource = source, savedState) {
  let chat = 'A', now = Date.parse('2026-10-06T01:00:00Z');
  const messages = [], calls = [], rendered = [], errors = [], storageWrites = [];
  let responder = () => [];
  const doc = { head:new Element(), body:new Element(), getElementById:()=>null, createElement:()=>new Element(),
    querySelectorAll(s) {
      if (s === '[data-chat-id]') return [{children:[{classList:{contains:()=>true}}],getAttribute:()=>chat}];
      if (s === '[data-message-id]') return messages;
      if (s.includes('message-button')) return messages.map(m=>m.actions.children[0]).filter(Boolean);
      return [];
    }, addEventListener(){}, removeEventListener(){} };
  class Clock extends Date { static now() { return now; } }
  let observer;
  const sandbox = { Element, HTMLElement:Element, HTMLButtonElement:Element, Node:Element, document:doc,
    window:new Element(), innerWidth:400, Date:Clock, AbortController, requestAnimationFrame:()=>{},
    performance:{getEntriesByType:()=>[]}, MutationObserver:class { constructor(cb){this.cb=cb;observer=this;} observe(){} disconnect(){} },
    fetch:async (url, options) => {calls.push({url,options}); const result=await responder(url,options);return {ok:true,text:async()=>JSON.stringify(result)};},
    marinara:{extension:{id:'test'},onCleanup(){},storage:{get:()=>savedState===undefined?new Promise(()=>{}):Promise.resolve(savedState),patch:async value=>{storageWrites.push(JSON.parse(JSON.stringify(value)));}}} };
  const injection = `
    const renderActual=render;
    render=(m,g,source)=>globalThis.rendered.push({m,g,source});
    showError=(message,detail)=>globalThis.errors.push({message,detail});
    globalThis.hooks={openReceipt,closePanel,decorateWithin,loadChatMessageMetadata,deepSeekPricingAt,deepSeekPricingForUsage,compute,profileFor,getConfig:()=>cfg,chatMessageCaches,observer,renderActual,body,PRESET_GROUPS,PRESETS,DEEPSEEK_V4_RATES,DEEPSEEK_V4_LEGACY_RATES,DEEPSEEK_V4_TIER_START,DEEPSEEK_WEEKEND_RULE_START,currentPreset,effectivePreset,presetIsActive,renderHelp,renderSettings,DEEPSEEK_V41_FLASH_START:typeof DEEPSEEK_V41_FLASH_START==='undefined'?undefined:DEEPSEEK_V41_FLASH_START};
  `;
  sandbox.rendered=rendered; sandbox.errors=errors;
  vm.runInNewContext(runtimeSource.replace('})(marinara);',injection+'})(marinara);'),sandbox);
  function message(id, model='deepseek-v4-pro', conversation=false) {
    const m=new Element({'data-message-id':id,'data-message-role':'assistant'});
    m.conversation=conversation; m.actions=new Element(); m.name=new Element();m.name.nextElementSibling=new Element();
    m.labels=[new Element({title:`${model} · 1000 → 200 tok · cache hit 100`})];
    messages.push(m); sandbox.hooks.decorateWithin(m);
    return [m,m.actions.children[0]];
  }
  return {h:sandbox.hooks,calls,rendered,errors,storageWrites,message,messages,
    setChat:v=>chat=v,setResponder:v=>responder=v,advance:ms=>now+=ms,
    mutate:()=>observer.cb([{type:'childList',addedNodes:[new Element()]}]),
    classChange:()=>observer.cb([{type:'attributes',attributeName:'class',target:new Element(),addedNodes:[]}])};
}
module.exports = {harness, source};
if (require.main === module) (async()=>{
  {
    const t=harness(); const [a,ba]=t.message('a');const [b,bb]=t.message('b');
    for(let i=0;i<100;i++) t.mutate();
    await tick();assert.equal(t.calls.length,0,'rendering/streaming/DOM mutations must not fetch');
    t.setResponder(()=>[{id:'a',createdAt:'2026-08-17T01:00:00Z'},{id:'b',createdAt:'2026-08-23T01:00:00Z'}]);
    await t.h.openReceipt(a,ba);assert.equal(t.calls.length,1);assert.match(t.calls[0].url,/chats\/A\/messages$/);
    assert.equal(t.rendered[0].g.messageTimestamp,Date.parse('2026-08-17T01:00:00Z'));
    assert.match(a.name.nextElementSibling.textContent,/08\.17/);assert.match(b.name.nextElementSibling.textContent,/08\.23/);
    await t.h.openReceipt(b,bb); assert.equal(t.calls.length,1);
    const [c,bc]=t.message('c'); await t.h.openReceipt(c,bc);await t.h.openReceipt(c,bc);
    assert.equal(t.calls.length,1,'missing metadata must not bypass TTL');assert.equal(t.rendered.at(-1).g.messageTimestampSource,'current-time-estimate');
    t.advance(15001);t.setResponder(()=>[{id:'c',createdAt:'2026-10-06T01:00:00Z'}]);
    await t.h.openReceipt(c,bc);assert.equal(t.calls.length,2,'expired cache is refreshed only on click');
    t.mutate();assert.equal(t.calls.length,2);
  }
  {
    const t=harness();const [a,ba]=t.message('a');const [b,bb]=t.message('b');const d=deferred();t.setResponder(()=>d.promise);
    const first=t.h.openReceipt(a,ba), second=t.h.openReceipt(b,bb);
    assert.equal(t.calls.length,1,'rapid clicks share metadata request');
    d.resolve([{id:'a',createdAt:'2026-08-17T01:00:00Z'},{id:'b',createdAt:'2026-08-23T01:00:00Z'}]);
    await Promise.all([first,second]);assert.deepEqual(t.rendered.map(r=>r.m.id),['b']);
  }
  for(const action of ['close','chat','detach','reopen']) {
    const t=harness();const [a,ba]=t.message('a');const d=deferred();t.setResponder(()=>d.promise);
    const first=t.h.openReceipt(a,ba);
    if(action==='close')t.h.closePanel();
    if(action==='chat'){t.setChat('B');t.classChange();t.setChat('A');t.classChange();}
    if(action==='detach'){a.isConnected=false;t.mutate();}
    let second;
    if(action==='reopen'){t.h.closePanel();second=t.h.openReceipt(a,ba);}
    d.resolve([{id:'a',createdAt:'2026-08-17T01:00:00Z'}]);await first;if(second)await second;
    assert.equal(t.rendered.length,action==='reopen'?1:0,`${action}: stale completion must not render`);
  }
  {
    const t=harness();const [a,ba]=t.message('a');t.setResponder(()=>{throw new Error('offline');});
    await t.h.openReceipt(a,ba);await t.h.openReceipt(a,ba);
    assert.equal(t.calls.length,1);assert.equal(t.rendered.length,2);assert.equal(t.errors.length,0);
    assert.equal(t.rendered[0].g.messageTimestampSource,'current-time-estimate');
    assert.equal(t.rendered[0].g.messageTimestamp,Date.parse('2026-10-06T01:00:00Z'));
    assert.equal(t.h.deepSeekPricingForUsage(t.rendered[0].g).period,'peak');
    t.h.renderActual({id:'a'},t.rendered[0].g,'screen');
    assert.match(t.h.body.innerHTML,/메시지 작성 시각 확인 실패.*현재 요금 기준 추정값/);
    assert.equal(t.h.deepSeekPricingForUsage({model:'deepseek-v4-pro'}),null);
    t.advance(15001);t.setResponder(()=>[{id:'a',createdAt:'2026-08-17T01:00:00Z'}]);await t.h.openReceipt(a,ba);
    assert.equal(t.rendered.length,3,'retry works after failed-attempt TTL');
    assert.equal(t.rendered.at(-1).g.messageTimestampSource,'message-createdAt');
    t.h.renderActual({id:'a'},t.rendered.at(-1).g,'screen');
    assert.doesNotMatch(t.h.body.innerHTML,/현재 요금 기준 추정값/);
  }
  {
    const t=harness();const [a,ba]=t.message('a');const d=deferred();t.setResponder(url=>url.includes('/A/')?d.promise:[{id:'b',createdAt:'2026-08-23T01:00:00Z'}]);
    const first=t.h.openReceipt(a,ba);t.setChat('B');t.classChange();const [b,bb]=t.message('b');await t.h.openReceipt(b,bb);
    d.resolve([{id:'a',createdAt:'2026-08-17T01:00:00Z'}]);await first;
    assert.deepEqual(t.rendered.map(r=>r.m.id),['b']);
    assert.equal(t.h.chatMessageCaches.get('B').byId.has('b'),true);
    t.setChat('A');t.classChange();await t.h.openReceipt(a,ba);assert.equal(t.calls.length,2,'per-chat cache survives out-of-order completion');
  }
  {
    const t=harness();const [a,ba]=t.message('a','gpt-5.6-sol',true);
    t.setResponder(url=>url.includes('peek-prompt')?{generationInfo:{model:'gpt-5.6-sol',provider:'openai',tokensPrompt:1000,tokensCompletion:200}}:[{id:'a',createdAt:'2026-08-17T01:00:00Z'}]);
    await t.h.openReceipt(a,ba);assert.equal(t.calls.length,2);assert.match(t.calls[0].url,/peek-prompt/);
    assert.equal(JSON.parse(t.calls[0].options.body).messageId,'a');assert.equal(t.rendered[0].source,'peek');
    assert.equal(a.name.nextElementSibling.textContent,'','conversation timestamps are untouched');
  }
  {
    const t=harness();const [a,ba]=t.message('a','gpt-5.6-sol');t.setResponder(()=>[]);await t.h.openReceipt(a,ba);
    assert.equal(t.rendered.length,1,'non-time-dependent cost remains available without metadata');
  }
  {
    const t=harness();const [a,ba]=t.message('a','gpt-5.6-sol',true);const [b,bb]=t.message('b','gpt-5.6-sol',true);
    const d=deferred();t.setResponder((url,options)=>url.includes('peek-prompt')?(JSON.parse(options.body).messageId==='a'?d.promise:{generationInfo:{model:'gpt-5.6-sol'}}):[{id:'b',createdAt:'2026-08-23T01:00:00Z'}]);
    const first=t.h.openReceipt(a,ba);await t.h.openReceipt(b,bb);d.reject(new Error('old peek failed'));await first;
    assert.deepEqual(t.rendered.map(r=>r.m.id),['b']);assert.equal(t.errors.length,0);
    assert.equal(ba.getAttribute('aria-busy'),null);
  }
  {
    const t=harness();const [a,ba]=t.message('a');t.setResponder(()=>[{id:'a',createdAt:'2026-08-17T01:00:00Z'}]);
    await t.h.openReceipt(a,ba);a.setAttribute('data-message-id','reused');t.mutate();
    await t.h.openReceipt(a,ba);assert.equal(t.rendered.length,2);assert.equal(t.rendered.at(-1).g.messageTimestampSource,'current-time-estimate','reused DOM must not inherit old timestamp');
    t.advance(15001);t.mutate();assert.equal(t.calls.length,1,'expired cache must not refresh on mutation');
  }
  const t=harness();
  const cases=[['2026-08-16T15:59:59Z','legacy'],['2026-08-17T01:00:00Z','peak'],['2026-08-17T04:00:00Z','off-peak'],['2026-08-17T06:00:00Z','peak'],['2026-08-17T10:00:00Z','off-peak'],['2026-08-23T01:00:00Z','off-peak']];
  for(const [time,period] of cases)assert.equal(t.h.deepSeekPricingAt('deepseek-v4-pro',Date.parse(time)).period,period);
  assert.equal(t.h.deepSeekPricingAt('deepseek-v4-pro',Date.parse('2026-08-23T01:00:00Z')).weekend,true);
  console.log('PASS: no background requests; first click; TTL/negative cache; in-flight sharing; RP dates; stale contexts; failed dates; chat isolation; screen/peek paths; DeepSeek time boundaries.');
})();
