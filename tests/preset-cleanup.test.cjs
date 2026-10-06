const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {harness,source}=require('./metadata-lazy.test.cjs');
const copy=x=>JSON.parse(JSON.stringify(x));
const removed=['glm-4.7','glm-4.7-flashx','kimi-k2.7-code','kimi-k2.7-code-highspeed'];
const modelsRemoved=['glm-4.5','glm-4.6','glm-4.7','glm-4.7-flashx','kimi-k2.7-code','kimi-k2.7-code-highspeed'];
(async()=>{
  const t=harness();
  assert.equal(t.h.PRESETS.length,32);
  for(const id of removed)assert.ok(!t.h.PRESETS.some(p=>p.id===id));
  for(const model of modelsRemoved)for(const suffix of ['', '-2026-10-01']){
    assert.equal(t.h.currentPreset({model:model+suffix}),null);
  }
  const kept=['gpt-6-astra','gpt-6-sol','gpt-6.1-sol','gpt-6-luna','glm-5','glm-5.1','glm-5.2','glm-5.3','glm-5.3-flash','glm-5.3-flashx','kimi-k3','kimi-k2.6'];
  for(const model of kept){
    const expected=['glm-5.1','glm-5.2'].includes(model)?'glm-5.3':model;
    for(const prefix of ['', 'openai/', 'anthropic/', 'google/'])assert.equal(t.h.currentPreset({model:prefix+model})?.id,expected);
  }
  const astra=t.h.PRESETS.find(p=>p.id==='gpt-6-astra');
  assert.equal(astra.label,'GPT-6 Astra');assert.equal(astra.modelId,'gpt-6-astra');
  // Existing users can still use removed models' stored profiles, with identical cost results.
  const profiles={};
  for(const model of modelsRemoved)profiles[`custom::${model}`]={input:2,read:.2,write:3,output:4,adjustment:'subtract-read',currency:'USD',cacheTtl:'5m'};
  const stamp=Date.parse('2026-10-06T01:00:00Z');
  const saved={config:{profiles,fxRates:{USD:{rate:1300,updatedAt:stamp},CNY:{rate:180,updatedAt:stamp}}}};
  const user=harness(source,saved);await new Promise(r=>setImmediate(r));
  assert.deepEqual(copy(user.h.getConfig().profiles),profiles);assert.equal(user.storageWrites.length,0);
  for(const model of modelsRemoved){
    const g={provider:'custom',model,tokensPrompt:1000,tokensCachedPrompt:800,tokensCacheWritePrompt:10,tokensCompletion:200};
    const result=user.h.compute(g,user.h.profileFor(g));
    assert.ok(Math.abs(result.total-(200*2+800*.2+10*3+200*4)/1e6)<1e-12);
  }
  if(process.argv[2]){
    const oldEntry=fs.readFileSync(path.join(process.argv[2],'extension.js'),'utf8');
    assert.equal(fs.readFileSync(path.join(__dirname,'../2.4.0/extension.js'),'utf8'),oldEntry,'all runtime logic remains byte identical');
    const old=harness(fs.readFileSync(path.join(process.argv[2],'presets.js'),'utf8')+'\n'+oldEntry);
    const expected=copy(old.h.PRESETS).filter(p=>!removed.includes(p.id));
    expected.find(p=>p.id==='gpt-6-astra').label='GPT-6 Astra';
    assert.deepEqual(copy(t.h.PRESETS),expected,'no other preset fields change');
    for(const model of [...kept,'gpt-6','gpt-6.0','gpt-6.0-unlisted','gpt-6-astra-2026-09-01','gpt-6-sol-2026-09-01','gpt-6.1-sol-2026-09-01','gpt-6-luna-2026-09-01']){
      const g={provider:'openai',model,tokensPrompt:300000,tokensCachedPrompt:800,tokensCacheWritePrompt:10,tokensCompletion:200,tokensReasoning:500};
      assert.equal(t.h.currentPreset(g)?.id,old.h.currentPreset(g)?.id,'existing matching/fallback unchanged');
      assert.equal(JSON.stringify(t.h.compute(g,t.h.currentPreset(g))),JSON.stringify(old.h.compute(g,old.h.currentPreset(g))));
    }
  }
  console.log('PASS: 32 presets; only four removed rows and Astra label changed; exact model IDs/grouped aliases preserved; runtime/fallback/prices unchanged; removed-model user profiles retained.');
})().catch(e=>{console.error(e);process.exitCode=1;});
