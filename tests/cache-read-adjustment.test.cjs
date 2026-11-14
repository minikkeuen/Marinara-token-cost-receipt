const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {harness, source} = require('./metadata-lazy.test.cjs');
const tick = () => new Promise(resolve => setImmediate(resolve));
const copy = value => JSON.parse(JSON.stringify(value));
const near = (actual, expected) => assert.ok(Math.abs(actual-expected)<1e-12, `${actual} != ${expected}`);

(async()=>{
  const definitions=harness().h.PRESETS;
  const targets=definitions.filter(p=>/^(gemini-|glm-)/.test(p.id));
  assert.equal(targets.length,12);
  const freshFx={rate:1300,updatedAt:Date.parse('2026-10-06T01:00:00Z')};
  let checks=0;
  for(const preset of targets){
    assert.equal(preset.adjustment,'subtract-read');
    const provider=preset.id.startsWith('gemini-')?'google':'zai';
    const model=preset.modelIds?.[0]||preset.id;
    const key=`${provider}::${model}`;
    const g={provider,model,tokensPrompt:1000,tokensCachedPrompt:800,tokensCacheWritePrompt:0,tokensCompletion:50};
    const base={input:preset.input,read:preset.read,write:preset.write,output:preset.output,currency:'USD',cacheTtl:'5m'};
    // Old defaults and custom profiles have identical storage schema, with no provenance.
    for(const profile of [
      {...base,adjustment:'none'},
      {...base,input:7.25,read:.4,output:11,adjustment:'none'},
      {...base,input:7.25,read:.4,output:11,adjustment:'subtract-read'},
    ]){
      const profiles={[key]:profile,'openai::gpt-5.5':{input:9,read:2,write:0,output:20,adjustment:'subtract-read'}};
      const saved={config:{profiles:copy(profiles),fxRates:{USD:freshFx,CNY:freshFx}}};
      const t=harness(source,saved);
      await tick();
      assert.deepEqual(copy(t.h.getConfig().profiles),profiles,'startup must preserve all saved profiles');
      assert.equal(t.storageWrites.length,0,'startup must not migrate saved profiles');
      assert.equal(t.calls.length,0);
      const before=t.h.compute(g,t.h.profileFor(g));
      const ordinary=profile.adjustment==='subtract-read'?200:1000;
      near(before.total,(ordinary*profile.input+800*profile.read+50*profile.output)/1e6);
      if(profile.adjustment==='none'){
        near(before.total-(200*profile.input+800*profile.read+50*profile.output)/1e6,800*profile.input/1e6);
      }
      // Existing UI reload/save repairs a legacy profile only upon explicit user action.
      t.h.renderActual({id:'test'},g,'screen');
      const body=t.h.body;
      body.querySelector('[name=preset]').value=preset.id;
      body.querySelector('[name=cacheTtl]').value='5m';
      body.querySelector('[data-act=load-preset]').listeners.get('click')();
      assert.equal(body.querySelector('[name=adjustment]').value,'subtract-read');
      assert.deepEqual(copy(t.h.getConfig().profiles),profiles,'loading form values alone must not mutate storage');
      await body.querySelector('[data-act=save]').listeners.get('click')();
      const after=t.h.compute(g,t.h.profileFor(g));
      assert.equal(after.ordinary,200);
      near(after.total,(200*preset.input+800*preset.read+50*preset.output)/1e6);
      assert.equal(t.storageWrites.length,1);
      assert.deepEqual(t.storageWrites[0].config.profiles[key],{...base,adjustment:'subtract-read'});
      assert.deepEqual(t.storageWrites[0].config.profiles['openai::gpt-5.5'],profiles['openai::gpt-5.5']);
      checks++;
    }
    // First application without an existing model profile uses the same load/save route.
    const t=harness(source,{config:{fxRates:{USD:freshFx,CNY:freshFx}}});
    await tick();
    t.h.renderActual({id:'new'},g,'peek');
    t.h.body.querySelector('[name=preset]').value=preset.id;
    t.h.body.querySelector('[name=cacheTtl]').value='5m';
    t.h.body.querySelector('[data-act=load-preset]').listeners.get('click')();
    await t.h.body.querySelector('[data-act=save]').listeners.get('click')();
    for(const read of [0,800,1000]){
      const result=t.h.compute({...g,tokensCachedPrompt:read},t.h.profileFor(g));
      near(result.total,((1000-read)*preset.input+read*preset.read+50*preset.output)/1e6);
      checks++;
    }
  }
  // Optional pre-change snapshot proves that every unrelated preset and runtime line is unchanged.
  if(process.argv[2]){
    const beforePresets=fs.readFileSync(path.join(process.argv[2],'presets.js'),'utf8');
    const beforeEntry=fs.readFileSync(path.join(process.argv[2],'extension.js'),'utf8');
    const old=harness(beforePresets+'\n'+beforeEntry).h.PRESETS;
    for(let i=0;i<old.length;i++){
      const expected=copy(old[i]);
      if(/^(gemini-|glm-)/.test(expected.id))expected.adjustment='subtract-read';
      assert.deepEqual(copy(definitions[i]),expected);
    }
    const entry=fs.readFileSync(path.join(__dirname,'../extension.js'),'utf8');
    const withoutHelp=text=>text.replace(/  function renderHelp\(\)\{[\s\S]*?\n  function renderSettings/, '  function renderSettings');
    assert.equal(withoutHelp(entry),withoutHelp(beforeEntry),'runtime changes are limited to help text');
  }
  console.log(`PASS: 10 corrected presets; ${checks} cache cost checks; legacy/custom profiles preserved; actual load/save repairs; unrelated profiles unchanged.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
