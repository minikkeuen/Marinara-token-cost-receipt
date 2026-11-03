const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {harness,source}=require('./metadata-lazy.test.cjs');
const t=harness();
const unitFields=['input','read','write','output','write1h'];
const prices={
  'gpt-6-astra':[10,1,12.5,50], 'gpt-6.1-sol':[2,.1,2.5,10], 'gpt-6-sol':[2,.2,2.5,10], 'gpt-6-luna':[.1,.01,.125,.5],
  'gpt-5.6-sol':[4,.4,5,20], 'gpt-5.6-terra':[2,.2,2.5,12], 'gpt-5.6-luna':[.2,.02,.25,1.2],
  'gpt-5.5':[5,.5,0,30], 'gpt-5.4':[2.5,.25,0,15], 'gpt-5.4-mini':[.75,.075,0,4.5], 'gpt-5.4-nano':[.2,.02,0,1.25],
  'claude-fable-5-1':[10,.25,12.5,50,20], 'claude-fable-5':[10,1,12.5,50,20], 'claude-opus-5-5':[4,.2,5,20,8],
  'claude-opus-5':[5,.5,6.25,25,10], 'claude-sonnet-5':[2,.2,2.5,10,4], 'claude-sonnet-4-6':[3,.3,3.75,15,6], 'claude-haiku-4-5':[1,.1,1.25,5,2],
  'gemini-4-argon':[2,.1,0,10], 'gemini-4-argon-standard':[4,.2,0,20],
  'gemini-3.8-flash':[.75,.075,0,3.75], 'gemini-3.8-flash-standard':[1.5,.15,0,7.5], 'gemini-3.5-flash':[1.5,.15,0,9],
  'gemini-3.1-pro-preview':[2,.2,0,12], 'gemini-3.5-flash-lite':[.3,.03,0,2.5], 'gemini-3.1-flash-lite':[.25,.025,0,1.5],
  'deepseek-v4.1-flash':[.15,.003,0,.6], 'deepseek-v4-pro':[.66,.022,0,1.98],
  'glm-5.3':[1.4,.26,0,4.4], 'glm-5.3-flash':[.15,.03,0,.5], 'glm-5.3-flashx':[.37,.075,0,1.25],
  'glm-5':[1,.2,0,3.2],
  'kimi-k3':[3,.3,3,15,6], 'kimi-k2.6':[.95,.16,0,4],
};
let matching=0,costs=0;
function near(actual,expected) {assert.ok(Math.abs(actual-expected)<1e-10,`${actual} != ${expected}`);}
for(const p of t.h.PRESETS) {
  assert.ok(prices[p.id],p.id);
  prices[p.id].forEach((value,i)=>assert.equal(p[unitFields[i]],value,`${p.id}.${unitFields[i]}`));
  const provider=p.id.startsWith('gpt-')?'openai':p.id.startsWith('claude-')?'anthropic':p.id.startsWith('gemini-')?'google':p.id.startsWith('glm-')?'zhipu':p.id.startsWith('kimi-')?'moonshot':'deepseek';
  if(!t.h.presetIsActive(p))continue;
  for(const model of p.modelIds||[p.modelId||p.id]) {
    // Preserve the existing namespace normalization (DeepSeek/GLM/Kimi matching is not expanded).
    for(const prefix of ['', 'openai/', 'anthropic/', 'google/']) {
      assert.equal(t.h.currentPreset({model:prefix+model})?.id,p.id,model);matching++;
    }
    const g={model,provider,tokensPrompt:1200,tokensCachedPrompt:300,tokensCacheWritePrompt:200,tokensCompletion:450};
    const result=t.h.compute(g,p);
    const ordinary=p.adjustment==='subtract-both'?700:p.adjustment==='subtract-read'?900:1200;
    near(result.parts.input,ordinary*p.input/1e6);
    near(result.parts.read,300*p.read/1e6);near(result.parts.write,200*p.write/1e6);near(result.parts.output,450*p.output/1e6);
    near(result.total,(ordinary*p.input+300*p.read+200*p.write+450*p.output)/1e6);costs++;
  }
  // Exercise the actual preset button and existing TTL selector handlers.
  t.h.renderActual({id:'x'},{model:p.modelIds?.[0]||p.modelId||p.id,provider},'screen');
  const body=t.h.body;body.querySelector('[name=preset]').value=p.id;
  body.querySelector('[name=cacheTtl]').value='5m';body.querySelector('[data-act=load-preset]').listeners.get('click')();
  const loaded=p.dynamicPricing?{...p,...(p.id==='deepseek-v4-pro'?{input:1.32,read:.044,write:0,output:3.96}:{input:.30,read:.006,write:0,output:1.2})}:p;
  for(const field of ['input','read','write','output','currency','adjustment'])assert.equal(body.querySelector(`[name=${field}]`).value,String(loaded[field]));
  if(p.write1h!=null){body.querySelector('[name=cacheTtl]').value='1h';body.querySelector('[name=cacheTtl]').listeners.get('change')();assert.equal(body.querySelector('[name=write]').value,String(p.write1h));}
}
// Expected groups retain every individual model ID and only one displayed option.
for(const [model,id] of Object.entries({'gemini-3.6-flash':'gemini-3.8-flash','gemini-3.7-flash':'gemini-3.8-flash','glm-5.1':'glm-5.3','glm-5.2':'glm-5.3','claude-opus-4-5':'claude-opus-5','claude-opus-4-6':'claude-opus-5','claude-opus-4-7':'claude-opus-5','claude-opus-4-8':'claude-opus-5','claude-sonnet-5-5':'claude-sonnet-5','claude-mythos-5-1':'claude-fable-5-1'}))assert.equal(t.h.currentPreset({model:model+'-2026-09-28'})?.id,id);
assert.ok(!t.h.PRESETS.some(p=>p.id==='claude-sonnet-5-until-2026-08-31'));
assert.equal(t.h.currentPreset({model:'unknown'}),null);
assert.equal(t.h.currentPreset({model:'gpt-6.0-unlisted'})?.id,'gpt-6-astra');
assert.equal(t.h.currentPreset({model:'gpt-5.6'})?.id,'gpt-5.6-sol');
assert.equal(t.h.currentPreset({model:'gemini-3.1-pro-other'})?.id,'gemini-3.1-pro-preview');
assert.equal(t.h.currentPreset({model:'gpt-5.4-pro'}),null);
assert.equal(t.h.currentPreset({model:'gpt-5.5-pro'}),null);
assert.equal(t.h.currentPreset({model:'gpt-6-luna-2026-07-01'})?.id,'gpt-6-luna');
assert.equal(t.h.currentPreset({model:'gpt-6.1-sol-2026-09-10'})?.id,'gpt-6.1-sol');
const promo=t.h.PRESETS.find(p=>p.id==='gemini-3.8-flash'),standard=t.h.PRESETS.find(p=>p.id==='gemini-3.8-flash-standard');
assert.equal(t.h.presetIsActive(promo,Date.parse('2026-12-31T23:59:59Z')),true);
assert.equal(t.h.presetIsActive(promo,Date.parse('2027-01-01T00:00:00Z')),false);
assert.equal(t.h.presetIsActive(standard,Date.parse('2027-01-01T00:00:00Z')),true);
const future=harness();future.advance(Date.parse('2027-01-01T00:00:00Z')-Date.parse('2026-10-06T01:00:00Z'));
for(const model of ['gemini-3.6-flash','gemini-3.7-flash','gemini-3.8-flash'])assert.equal(future.h.currentPreset({model})?.id,standard.id);
assert.equal(t.h.PRESETS.find(p=>p.id==='gpt-5.6-sol').promotionGuaranteedThrough,'2026-11-21');
assert.equal(t.h.PRESETS.find(p=>p.id==='gpt-5.6-sol').activeUntil,undefined,'no guessed promotion end');
// Approved corrections: retain the same threshold and multipliers; include 6.1 and double 5.6 writes.
for(const model of ['gpt-6.1-sol','gpt-6-sol','gpt-6-astra','gpt-6-luna','gpt-5.6-sol','gpt-5.6-terra','gpt-5.6-luna']) {
  const p=t.h.currentPreset({model});const short=t.h.compute({model,provider:'openai',tokensPrompt:272000,tokensCachedPrompt:100,tokensCacheWritePrompt:200,tokensCompletion:300},p);
  const long=t.h.compute({model,provider:'openai',tokensPrompt:272001,tokensCachedPrompt:100,tokensCacheWritePrompt:200,tokensCompletion:300},p);
  assert.equal(short.tier,null);assert.equal(long.tier.threshold,272000);
  for(const field of ['input','read','write'])assert.equal(long.rates[field],short.rates[field]*2);
  assert.equal(long.rates.output,short.rates.output*1.5);costs+=2;
}
// Official Flash rerouting instant; existing historic tables/Pro behavior must stay available.
for(const model of ['deepseek-v4-flash','deepseek-v4-flash-vision-exp']) {
  assert.equal(t.h.deepSeekPricingAt(model,Date.parse('2026-09-10T03:59:59Z')).input,.44);
  assert.equal(t.h.deepSeekPricingAt(model,Date.parse('2026-09-10T04:00:00Z')).input,.15);
  assert.equal(t.h.deepSeekPricingAt(model,Date.parse('2026-08-01T00:00:00Z')).input,.14);
}
assert.equal(t.h.deepSeekPricingAt('deepseek-flash',Date.parse('2026-10-06T01:00:00Z')).input,.30);
assert.equal(t.h.deepSeekPricingAt('deepseek-v4-pro',Date.parse('2026-10-06T01:00:00Z')).input,1.32);
if(process.argv[2]) {
  const old=harness(fs.readFileSync(process.argv[2],'utf8'));
  for(const model of ['deepseek-v4-pro','deepseek-v4-flash','deepseek-v4.1-flash','deepseek/deepseek-v4-pro'])for(let time=Date.parse('2026-08-01T00:00:00Z');time<Date.parse('2026-10-10T00:00:00Z');time+=3600000) {
    if(model==='deepseek-v4-flash'&&time>=Date.parse('2026-09-10T04:00:00Z'))continue;
    const g={model,provider:'deepseek',messageTimestamp:time,tokensPrompt:1200,tokensCachedPrompt:300,tokensCacheWritePrompt:200,tokensCompletion:450};const p={input:2,read:1,write:3,output:4,adjustment:'none'};
    assert.equal(JSON.stringify(t.h.compute(g,p)),JSON.stringify(old.h.compute(g,p)));costs++;
  }
  function withoutPriceConnections(text){
    let code=text.slice(text.indexOf('((marinara) =>'));
    code=code.replace(/  const \{ PRESET_GROUPS[^\n]+\n/, '  // preset definitions connection\n');
    for(const [start,end] of [['deepSeekModelId','isDeepSeekWeekendBeijing'],['deepSeekPricingAt','deepSeekPricingForUsage'],['currentPreset','tierFor'],['tierFor','compute']]){
      const a=code.indexOf('  function '+start),b=code.indexOf('  function '+end,a);
      code=code.slice(0,a)+'  // '+start+' price connection\n'+code.slice(b);
    }
    return code;
  }
  assert.equal(withoutPriceConnections(source),withoutPriceConnections(fs.readFileSync(process.argv[2],'utf8')), 'non-price behavior and compute formula remain byte identical');
}
console.log(`PASS: ${t.h.PRESETS.length} verified preset rows; ${matching} model matches; ${costs} cost checks; actual load/TTL handlers; grouped aliases; promotions; unchanged fallbacks; approved long-context corrections; historical DeepSeek boundaries.`);
