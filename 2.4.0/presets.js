function createTokenCostReceiptPresetDefinitions(){
  // Standard text-token rates per 1M tokens, verified 2026-10-06.
  // Sources and unsupported charges: PRICING-SOURCES.md.
  const PRESET_GROUPS = [
    { label:'OpenAI', items:[
      {id:'gpt-6-astra',modelId:'gpt-6-astra',label:'GPT-6 Astra',input:10,read:1,write:12.5,output:50,adjustment:'subtract-both',currency:'USD'},
      {id:'gpt-6.1-sol',label:'GPT-6.1 Sol',input:2,read:.1,write:2.5,output:10,adjustment:'subtract-both',currency:'USD'},
      {id:'gpt-6-sol',modelId:'gpt-6-sol',label:'GPT-6 Sol',input:2,read:.2,write:2.5,output:10,adjustment:'subtract-both',currency:'USD'},
      {id:'gpt-6-luna',label:'GPT-6 Luna',input:.1,read:.01,write:.125,output:.5,adjustment:'subtract-both',currency:'USD'},
      {id:'gpt-5.6-terra',label:'GPT-5.6 Terra',input:2,read:.2,write:2.5,output:12,adjustment:'subtract-both',currency:'USD'},
      // Official promotion is guaranteed at least through this date, not a fixed end date.
      {id:'gpt-5.6-sol',label:'GPT-5.6 Sol (프로모션: 최소 2026-11-21까지)',input:4,read:.4,write:5,output:20,adjustment:'subtract-both',promotionGuaranteedThrough:'2026-11-21',currency:'USD'},
      {id:'gpt-5.6-luna',label:'GPT-5.6 Luna',input:.2,read:.02,write:.25,output:1.2,adjustment:'subtract-both',currency:'USD'},
      {id:'gpt-5.5',label:'GPT-5.5',input:5,read:.5,write:0,output:30,adjustment:'subtract-read',currency:'USD'},
      {id:'gpt-5.4',label:'GPT-5.4',input:2.5,read:.25,write:0,output:15,adjustment:'subtract-read',currency:'USD'},
      {id:'gpt-5.4-mini',label:'GPT-5.4 mini',input:.75,read:.075,write:0,output:4.5,adjustment:'subtract-read',currency:'USD'},
      {id:'gpt-5.4-nano',label:'GPT-5.4 nano',input:.2,read:.02,write:0,output:1.25,adjustment:'subtract-read',currency:'USD'},
    ]},
    { label:'Anthropic', items:[
      {id:'claude-fable-5-1',modelIds:['claude-fable-5-1','claude-mythos-5-1'],label:'Claude Fable / Mythos 5.1',input:10,read:.25,write:12.5,write1h:20,output:50,adjustment:'none',currency:'USD'},
      {id:'claude-fable-5',modelIds:['claude-fable-5','claude-mythos-5'],label:'Claude Fable / Mythos 5',input:10,read:1,write:12.5,write1h:20,output:50,adjustment:'none',currency:'USD'},
      {id:'claude-opus-5-5',modelId:'claude-opus-5-5',label:'Claude Opus 5.5',input:4,read:.2,write:5,write1h:8,output:20,adjustment:'none',currency:'USD'},
      {id:'claude-opus-5',modelIds:['claude-opus-5','claude-opus-4-8','claude-opus-4-7','claude-opus-4-6','claude-opus-4-5'],label:'Claude Opus 5 / 4.5–4.8',input:5,read:.5,write:6.25,write1h:10,output:25,adjustment:'none',currency:'USD'},
      {id:'claude-sonnet-5',modelIds:['claude-sonnet-5','claude-sonnet-5-5'],label:'Claude Sonnet 5 / 5.5',input:2,read:.2,write:2.5,write1h:4,output:10,adjustment:'none',currency:'USD'},
      {id:'claude-sonnet-4-6',modelIds:['claude-sonnet-4-6','claude-sonnet-4-5'],label:'Claude Sonnet 4.5 / 4.6',input:3,read:.3,write:3.75,write1h:6,output:15,adjustment:'none',currency:'USD'},
      {id:'claude-haiku-4-5',label:'Claude Haiku 4.5',input:1,read:.1,write:1.25,write1h:2,output:5,adjustment:'none',currency:'USD'},
    ]},
    // Official calendar dates; date-only values use JavaScript's existing UTC parsing.
    { label:'Google Gemini', items:[
      {id:'gemini-3.8-flash',modelIds:['gemini-3.8-flash','gemini-3.7-flash','gemini-3.6-flash'],label:'Gemini 3.6 / 3.7 / 3.8 Flash (2026-12-31까지)',input:.75,read:.075,write:0,output:3.75,adjustment:'subtract-read',activeUntil:'2027-01-01',currency:'USD'},
      {id:'gemini-3.8-flash-standard',modelIds:['gemini-3.8-flash','gemini-3.7-flash','gemini-3.6-flash'],label:'Gemini 3.6 / 3.7 / 3.8 Flash (2027-01-01부터)',input:1.5,read:.15,write:0,output:7.5,adjustment:'subtract-read',activeFrom:'2027-01-01',currency:'USD'},
      {id:'gemini-3.5-flash',label:'Gemini 3.5 Flash',input:1.5,read:.15,write:0,output:9,adjustment:'subtract-read',currency:'USD'},
      {id:'gemini-3.1-pro-preview',label:'Gemini 3.1 Pro Preview',input:2,read:.2,write:0,output:12,adjustment:'subtract-read',currency:'USD'},
      {id:'gemini-3.5-flash-lite',label:'Gemini 3.5 Flash-Lite',input:.3,read:.03,write:0,output:2.5,adjustment:'subtract-read',currency:'USD'},
      {id:'gemini-3.1-flash-lite',label:'Gemini 3.1 Flash-Lite',input:.25,read:.025,write:0,output:1.5,adjustment:'subtract-read',currency:'USD'},
    ]},
    { label:'DeepSeek', items:[
      {id:'deepseek-v4.1-flash',modelIds:['deepseek-v4.1-flash','deepseek-v4-1-flash','deepseek-flash','deepseek-v4-flash','deepseek-v4-flash-vision-exp'],label:'DeepSeek 4.1 Flash',input:.15,read:.003,write:0,output:.6,adjustment:'subtract-read',dynamicPricing:'deepseek-v4.1',currency:'USD'},
      {id:'deepseek-v4-pro',label:'DeepSeek V4 Pro',input:.66,read:.022,write:0,output:1.98,adjustment:'subtract-read',dynamicPricing:'deepseek-v4',currency:'USD'},
    ]},
    { label:'GLM', items:[
      {id:'glm-5.3',modelIds:['glm-5.3','glm-5.2','glm-5.1'],label:'GLM-5.1 / 5.2 / 5.3',input:1.4,read:.26,write:0,output:4.4,adjustment:'subtract-read',currency:'USD'},
      {id:'glm-5.3-flash',label:'GLM-5.3 Flash',input:.15,read:.03,write:0,output:.5,adjustment:'subtract-read',currency:'USD'},
      {id:'glm-5.3-flashx',label:'GLM-5.3 FlashX',input:.37,read:.075,write:0,output:1.25,adjustment:'subtract-read',currency:'USD'},
      {id:'glm-5',label:'GLM-5',input:1,read:.2,write:0,output:3.2,adjustment:'subtract-read',currency:'USD'},
    ]},
    { label:'Kimi', items:[
      {id:'kimi-k3',label:'Kimi K3',input:3,read:.3,write:3,write1h:6,output:15,adjustment:'subtract-both',currency:'USD'},
      {id:'kimi-k2.6',label:'Kimi K2.6',input:.95,read:.16,write:0,output:4,adjustment:'subtract-read',currency:'USD'},
    ]},
  ];
  const PRESETS = PRESET_GROUPS.flatMap(group=>group.items);
  const DEEPSEEK_V4_RATES = {
    'deepseek-v4.1-flash': {offPeak:{input:.15,read:.003,write:0,output:.6},peak:{input:.30,read:.006,write:0,output:1.2}},
    'deepseek-v4-flash': {offPeak:{input:.22,read:.007,write:0,output:.66},peak:{input:.44,read:.014,write:0,output:1.32}},
    'deepseek-v4-pro': {offPeak:{input:.66,read:.022,write:0,output:1.98},peak:{input:1.32,read:.044,write:0,output:3.96}},
  };
  const DEEPSEEK_V4_LEGACY_RATES = {
    'deepseek-v4-flash': {input:.14,read:.0028,write:0,output:.28},
    'deepseek-v4-pro': {input:.435,read:.003625,write:0,output:.87},
  };
  // New V4 peak/off-peak pricing began at 2026-08-17 00:00 Beijing time.
  const DEEPSEEK_V4_TIER_START = Date.parse('2026-08-16T16:00:00Z');
  // Weekend-wide off-peak billing began at 2026-08-23 00:00 Beijing time.
  const DEEPSEEK_WEEKEND_RULE_START = Date.parse('2026-08-22T16:00:00Z');
  // Retired V4 Flash aliases switched to V4.1 Flash rates at this official instant.
  const DEEPSEEK_V41_FLASH_START = Date.parse('2026-09-10T04:00:00Z');
  return { PRESET_GROUPS, PRESETS, DEEPSEEK_V4_RATES, DEEPSEEK_V4_LEGACY_RATES, DEEPSEEK_V4_TIER_START, DEEPSEEK_WEEKEND_RULE_START, DEEPSEEK_V41_FLASH_START };
}
