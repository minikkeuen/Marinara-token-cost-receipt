const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {harness, source} = require('./metadata-lazy.test.cjs');
const packageDir = path.join(__dirname, '../2.4.0');
const entry = fs.readFileSync(path.join(packageDir, 'extension.js'), 'utf8');
const presets = fs.readFileSync(path.join(packageDir, 'presets.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(packageDir, 'manifest.json'), 'utf8'));
assert.deepEqual(manifest.config.jsPath, ['presets.js','extension.js']);
assert.equal(manifest.config.version, '3.0.9');
const names = presets.match(/  return \{ (.+) \};/)[1];
const definitions = presets.slice(presets.indexOf('{\n')+2, presets.lastIndexOf('  return {'));
const baseline = entry.replace('  const { '+names+' } = createTokenCostReceiptPresetDefinitions();\n', definitions);
assert.ok(!baseline.includes('createTokenCostReceiptPresetDefinitions'), 'inlined control has no factory reference');
const old = harness(baseline), updated = harness(source);
for (const key of names.split(', ')) assert.equal(JSON.stringify(updated.h[key]),JSON.stringify(old.h[key]),key);
assert.equal(updated.h.PRESETS.length,old.h.PRESETS.length);
for(const preset of updated.h.PRESETS) assert.ok(updated.h.PRESET_GROUPS.some(group=>group.items.includes(preset)), 'flat list retains the same object references');
let prices=0, matches=0, ui=0;
for(const model of ['deepseek-v4-pro','deepseek-v4-flash','deepseek-v4.1-flash','deepseek/deepseek-v4-pro']) {
  for(let time=Date.parse('2026-08-01T00:00:00Z');time<Date.parse('2026-10-10T00:00:00Z');time+=3600000) {
    const g={model,provider:'deepseek',tokensPrompt:1200,tokensCachedPrompt:300,tokensCacheWritePrompt:100,tokensCompletion:450,messageTimestamp:time};
    const p={input:2,read:1,write:3,output:4,adjustment:'none'};
    assert.equal(JSON.stringify(updated.h.compute(g,p)),JSON.stringify(old.h.compute(g,p)));prices++;
  }
}
const models=[...old.h.PRESETS.map(p=>p.modelId||p.id),'unknown','gpt-6-astra-2026','gpt-5.6-2026','gemini-3.1-pro-2026','gpt-5.4-pro','gpt-5.4-mini-2026','claude-sonnet-5-2026'];
for(const model of models) for(const prefix of ['', 'openai/', 'anthropic/', 'google/']) {
  const g={model:prefix+model,provider:'unknown',tokensPrompt:300000,tokensCompletion:1000,tokensCachedPrompt:300};
  assert.equal(JSON.stringify(updated.h.currentPreset(g)),JSON.stringify(old.h.currentPreset(g)));matches++;
  for(const source of ['screen','peek']) {
    old.h.renderActual({id:'a'},g,source);updated.h.renderActual({id:'a'},g,source);
    assert.equal(updated.h.body.innerHTML,old.h.body.innerHTML);ui++;
  }
}
for(const p of old.h.PRESETS) for(const time of ['2026-08-16T15:59:59Z','2026-08-17T01:00:00Z','2026-08-23T01:00:00Z','2026-08-31T23:59:59Z','2026-09-01T00:00:00Z']) {
  assert.equal(JSON.stringify(updated.h.effectivePreset(p,Date.parse(time))),JSON.stringify(old.h.effectivePreset(p,Date.parse(time))));
  assert.equal(updated.h.presetIsActive(p,Date.parse(time)),old.h.presetIsActive(p,Date.parse(time)));
}
for(const source of ['message-createdAt','current-time-estimate']) {
  const g={model:'deepseek-v4-pro',provider:'deepseek',messageTimestamp:Date.parse('2026-10-06T01:00:00Z'),messageTimestampSource:source,tokensPrompt:1000,tokensCompletion:100};
  old.h.renderActual({id:'a'},g,'screen');updated.h.renderActual({id:'a'},g,'screen');assert.equal(updated.h.body.innerHTML,old.h.body.innerHTML);ui++;
}
for(const method of ['renderHelp','renderSettings']) {old.h[method]();updated.h[method]();assert.equal(updated.h.body.innerHTML,old.h.body.innerHTML);ui++;}
assert.equal(old.h.deepSeekPricingForUsage({model:'deepseek-v4-pro'}),updated.h.deepSeekPricingForUsage({model:'deepseek-v4-pro'}));
console.log(`PASS: exact definitions and unchanged functionality; ${old.h.PRESETS.length} presets; ${prices} cost results; ${matches} model matches/fallbacks; ${ui} UI snapshots; active-date/TTL/dynamic-price rules.`);
