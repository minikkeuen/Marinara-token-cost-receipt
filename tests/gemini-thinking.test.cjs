const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {harness,source}=require('./metadata-lazy.test.cjs');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);
const model='gemini-3.8-flash';
const usage=(provider='google',extra={})=>({provider,model,tokensPrompt:1000,tokensCachedPrompt:800,tokensCompletion:200,tokensReasoning:500,...extra});
const meta=(id,g=usage(),date='2026-10-06T01:00:00Z')=>({id,createdAt:date,extra:JSON.stringify({generationInfo:g})});
function message(t,id,conversation=false){
  const [m,b]=t.message(id,model,conversation);
  m.labels[0].attrs.title=`${model} · 1000 → 200 tok · cache hit 800`;
  return [m,b];
}
function cost(t,index=0){
  const g=t.rendered[index].g;
  return t.h.compute(g,t.h.currentPreset(g));
}
function dateAlreadyKnown(m,id){
  Object.assign(m.dataset,{tokenReceiptChatId:'A',tokenReceiptMessageId:id,tokenReceiptCreatedAt:'2026-10-06T01:00:00Z'});
}
(async()=>{
  // Native Google evidence from messages completes screen usage without fetching the full prompt.
  const t=harness(),[a,ba]=message(t,'a'),[b,bb]=message(t,'b');
  for(let i=0;i<100;i++){t.mutate();t.classChange()}
  await tick();assert.equal(t.calls.length,0);
  t.setResponder(()=>[meta('a'),{...meta('b'),extra:{generationInfo:usage()}}]);
  await t.h.openReceipt(a,ba);
  assert.equal(t.calls.length,1);assert.match(t.calls[0].url,/\/messages$/);
  assert.equal(t.rendered[0].source,'screen');assert.equal(cost(t).out,700);
  near(cost(t).parts.input,.00015);near(cost(t).parts.read,.00006);
  near(cost(t).parts.output,.002625);near(cost(t).total,.002835);
  await t.h.openReceipt(b,bb);assert.equal(cost(t,1).out,700);
  assert.equal(t.calls.length,1,'same-chat cache is reused');
  for(let i=0;i<100;i++)t.mutate();assert.equal(t.calls.length,1);
  const [missing,bMissing]=message(t,'missing');
  await t.h.openReceipt(missing,bMissing);await t.h.openReceipt(missing,bMissing);
  assert.equal(cost(t,2).out,200);assert.equal(t.calls.length,1,'missing must not force refresh');
  t.advance(15001);await t.h.openReceipt(a,ba);assert.equal(t.calls.length,2,'TTL refresh happens only on click');

  // Peek carries actual provider before the legacy provider inference. No extra messages request for thinking.
  for(const provider of ['google','openrouter','openai','custom','unknown',undefined,'google_vertex']){
    const p=harness(),[m,button]=message(p,'p',true);dateAlreadyKnown(m,'p');
    p.setResponder(url=>url.endsWith('/peek-prompt')?{generationInfo:usage(provider,{provider})}:[meta('p',usage(provider,{provider}))]);
    await p.h.openReceipt(m,button);
    assert.equal(cost(p).out,provider==='google'?700:200,provider||'absent provider');
    assert.equal(p.rendered[0].g.generationProvider,provider);
    assert.equal(p.calls.filter(c=>c.url.endsWith('/peek-prompt')).length,1);
    assert.equal(p.calls.filter(c=>c.url.endsWith('/messages')).length,provider===undefined||provider==='unknown'?1:0);
  }
  // When peek lacks provider/reasoning, matching saved generation can supply it; no guessing.
  for(const fields of [{provider:undefined},{tokensReasoning:null},{tokensReasoning:undefined}]){
    const p=harness(),[m,button]=message(p,'p',true);
    p.setResponder(url=>url.endsWith('/peek-prompt')?{generationInfo:usage('google',fields)}:[meta('p')]);
    await p.h.openReceipt(m,button);assert.equal(cost(p).out,700);
    assert.equal(p.calls.length,2,'one peek and existing lazy metadata request');
  }
  // Existing RP fallback obtains complete peek usage when the screen has no tooltip.
  {
    const p=harness(source,{config:{sources:{rpPeekFallback:true}}});await tick();
    const [m,button]=message(p,'p');m.labels=[];
    p.setResponder(url=>url.endsWith('/peek-prompt')?{generationInfo:usage()}:[meta('p')]);
    await p.h.openReceipt(m,button);
    assert.equal(p.rendered[0].source,'peek');assert.equal(cost(p).out,700);
  }
  // A Gemini name never establishes native API provenance; stale or invalid counters are not merged.
  for(const g of [usage('openrouter'),usage('openai'),usage('custom'),usage(undefined,{provider:undefined}),
    usage('google',{tokensReasoning:null}),usage('google',{tokensReasoning:-1}),
    usage('google',{tokensReasoning:'500'}),usage('google',{tokensCompletion:201}),
    usage('google',{tokensPrompt:1001}),usage('google',{tokensCachedPrompt:799}),usage('google',{model:'gemini-3.5-flash'})]){
    const p=harness(),[m,button]=message(p,'p');p.setResponder(()=>[meta('p',g)]);
    await p.h.openReceipt(m,button);assert.equal(cost(p).out,200);
    assert.equal(p.rendered[0].g.tokensReasoning,undefined);
  }
  {
    const p=harness(),[m,button]=message(p,'p');p.setResponder(()=>[{id:'p',extra:'invalid JSON'}]);
    await p.h.openReceipt(m,button);await p.h.openReceipt(m,button);
    assert.equal(cost(p).out,200);assert.equal(p.calls.length,1);
  }
  // Reasoning does not depend on createdAt being present, and missing dates are never rendered as epoch dates.
  {
    const p=harness(),[m,button]=message(p,'p');p.setResponder(()=>[meta('p',usage(),null)]);
    await p.h.openReceipt(m,button);assert.equal(cost(p).out,700);
    assert.equal(m.name.nextElementSibling.textContent,'');
  }
  // Zero thinking, cache/write amounts, existing promotion rates, and long-context threshold remain intact.
  for(const preset of t.h.PRESETS.filter(p=>p.id.startsWith('gemini-'))){
    const g={...usage(),model:preset.modelIds?.[0]||preset.id,tokensCacheWritePrompt:50};
    const original=t.h.compute(g,{...preset,write:3});
    const zero=t.h.compute({...g,geminiDirectApi:true,tokensReasoning:0},{...preset,write:3});
    assert.equal(JSON.stringify(zero),JSON.stringify(original));
    const corrected=t.h.compute({...g,geminiDirectApi:true},{...preset,write:3});
    for(const field of ['input','read','write'])assert.equal(corrected.parts[field],original.parts[field]);
    near(corrected.parts.output-original.parts.output,500*original.rates.output/1e6);
  }
  for(const prompt of [200000,200001]){
    const g={...usage(),model:'gemini-3.1-pro-preview',tokensPrompt:prompt,geminiDirectApi:true};
    const c=t.h.compute(g,t.h.currentPreset(g));
    assert.equal(c.out,700);assert.equal(c.rates.output,prompt===200000?12:18);
    near(c.parts.output,700*c.rates.output/1e6);
  }
  // Concurrent clicks deduplicate the metadata request and never render the first stale receipt.
  {
    const p=harness(),[a,ba]=message(p,'a'),[b,bb]=message(p,'b');
    let resolve;p.setResponder(()=>new Promise(r=>{resolve=r}));
    const first=p.h.openReceipt(a,ba),second=p.h.openReceipt(b,bb);
    assert.equal(p.calls.length,1);resolve([meta('a'),meta('b')]);await Promise.all([first,second]);
    assert.equal(p.rendered.length,1);assert.equal(p.rendered[0].m.id,'b');assert.equal(cost(p).out,700);
  }
  for(const action of ['close','switch']){
    const p=harness(),[m,button]=message(p,'p');let resolve;
    p.setResponder(()=>new Promise(r=>{resolve=r}));const pending=p.h.openReceipt(m,button);
    if(action==='close')p.h.closePanel();else p.setChat('B');
    resolve([meta('p')]);await pending;assert.equal(p.rendered.length,0);
  }
  // Optional snapshot checks every supported non-Google transport against pre-fix compute results.
  if(process.argv[2]){
    const before=fs.readFileSync(path.join(process.argv[2],'presets.js'),'utf8')+'\n'+fs.readFileSync(path.join(process.argv[2],'extension.js'),'utf8');
    const old=harness(before);
    for(const provider of ['openai','anthropic','openrouter','zai','zhipu','moonshot','deepseek','custom','google_vertex']){
      for(const name of [model,'gpt-6.1-sol','claude-sonnet-5','glm-5.3','kimi-k3','deepseek-v4-pro']){
        const g={...usage(provider),model:name,tokensCacheWritePrompt:50,messageTimestamp:Date.parse('2026-10-06T01:00:00Z')};
        const preset=t.h.currentPreset(g)||{input:2,read:1,write:3,output:4,adjustment:'none'};
        assert.equal(JSON.stringify(t.h.compute(g,preset)),JSON.stringify(old.h.compute(g,preset)));
      }
    }
    assert.equal(fs.readFileSync(path.join(process.argv[2],'presets.js'),'utf8'),fs.readFileSync(path.join(__dirname,'../2.4.0/presets.js'),'utf8'));
  }
  console.log('PASS: native Google thinking via screen/messages and peek; zero thinking; cache/write invariance; long-context tiers; explicit provenance; proxy exclusion; no guessed reasoning; lazy TTL/dedup/stale responses; unchanged other providers and presets.');
})().catch(error=>{console.error(error);process.exitCode=1;});
