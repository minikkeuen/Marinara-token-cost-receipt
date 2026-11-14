# 프리셋 가격 검증 — 2026-10-06

금액은 공식 직접 API의 Standard 텍스트 토큰 100만 개당 USD입니다. Batch/Flex/Fast/지역 할증, 저장 시간, 검색·도구·이미지·음성 별도 요금은 추가하지 않았습니다. 기존 사용자 저장 단가도 자동 변경하지 않습니다. 새 단가는 프리셋의 값 불러오기·저장으로 적용합니다.

## 변경된 기존 가격

표의 순서는 input / cache read / cache write / output입니다.

| 모델 | 이전 확장 값 | 검증 후 값 |
| --- | --- | --- |
| GPT-5.6 Sol | 5 / 0.5 / 0 / 30 | 4 / 0.4 / 5 / 20 |
| GPT-5.6 Terra | 2.5 / 0.25 / 0 / 15 | 2 / 0.2 / 2.5 / 12 |
| GPT-5.6 Luna | 1 / 0.1 / 0 / 6 | 0.2 / 0.02 / 0.25 / 1.2 |
| Gemini 3.6 Flash | 1.5 / 0.15 / 0 / 7.5 | 0.75 / 0.075 / 0 / 3.75 |
| Gemini 3.1 Flash-Lite | 0.25 / 0.025 / 0 / 1.5 | 변경 없음 |
| Kimi K3 | 3 / 0.3 / 0 / 15 | 3 / 0.3 / 3 / 15 |

이전 확장 값이 공식 역사적 요금임을 보장하지 않습니다. 위 값은 현재 공식 자료에서 검증했습니다. [GPT-5.6 Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol), [Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra), [Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna), [Gemini 가격](https://ai.google.dev/gemini-api/docs/pricing), [Kimi 가격](https://platform.kimi.ai/docs/pricing/chat).

## 프리셋 목록 추가 정리

- `GPT 6.0`의 내부 ID와 exact match는 `gpt-6-astra`입니다. 공식 GPT-6 Astra와 단가(input/read/write/output: 10/1/12.5/50)가 일치하므로 표시명만 `GPT-6 Astra`로 변경했습니다. 기존 GPT-6 일반명 fallback과 모든 가격·계산 규칙은 유지합니다. [공식 모델 문서](https://developers.openai.com/api/docs/models/gpt-6-astra).
- 아래 추가 이력 중 GLM-4.5/4.6/4.7 통합 프리셋과 GLM-4.7 FlashX, Kimi K2.7 Code 및 Code HighSpeed는 현재 목록에서 제거했습니다. 기존 사용자 저장 프로필은 삭제하거나 마이그레이션하지 않습니다.

## 추가 및 통합

- OpenAI: GPT-6.1 Sol은 2 / 0.1 / 2.5 / 10, GPT-6 Luna는 0.1 / 0.01 / 0.125 / 0.5로 추가했습니다. GPT-6 Sol은 cache read가 0.2이므로 GPT-6.1 Sol과 합치지 않았습니다. [GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [GPT-6 Sol](https://developers.openai.com/api/docs/models/gpt-6-sol).
- Anthropic: Fable/Mythos 5.1, Mythos 5, Sonnet 5.5, Haiku 4.5, Opus 4.5, Sonnet 4.5를 추가했습니다. 같은 가격의 Fable/Mythos 5.1, Fable/Mythos 5, Opus 5/4.5–4.8, Sonnet 5/5.5, Sonnet 4.5/4.6을 각각 묶었습니다. cache read와 5m/1h write도 모두 비교했습니다. 동일 가격인 Sonnet 5의 날짜별 중복은 제거했습니다. [공식 가격표](https://platform.claude.com/docs/en/about-claude/pricing).
- Google: Gemini 3.6/3.7/3.8 Flash를 묶고, Flash-Lite 3.5를 0.3 / 0.03 / 0 / 2.5로 추가했습니다. 개별 모델 ID와 기존 3.1/3.5 데이터는 유지했습니다. [공식 가격표](https://ai.google.dev/gemini-api/docs/pricing).
- GLM: 5.1/5.2/5.3을 묶었습니다. 5.3 Flash(0.15 / 0.03 / 0 / 0.5), FlashX(0.37 / 0.075 / 0 / 1.25), GLM-5(1 / 0.2 / 0 / 3.2), 4.5/4.6/4.7 공통 프리셋(0.6 / 0.11 / 0 / 2.2), 4.7 FlashX(0.07 / 0.01 / 0 / 0.4)를 추가했습니다. 저장 요금은 기간 미정의 임시 무료이며, 토큰당 write 과금과 구분합니다. [공식 가격표](https://docs.z.ai/guides/overview/pricing).
- Kimi: K2.7 Code(0.95 / 0.19 / 0 / 4), HighSpeed(1.9 / 0.38 / 0 / 8)를 추가했습니다. K2.6은 cache read가 0.16이므로 합치지 않았습니다. K3의 1h write는 6입니다. Kimi 가격표의 표 데이터는 웹 텍스트 도구에서 누락되어 공식 HTML의 내장 표 데이터까지 확인했습니다. [공식 가격표](https://platform.kimi.ai/docs/pricing/chat), [캐시 usage](https://platform.kimi.ai/docs/guide/context-caching).

## 기간 및 역사적 가격

- GPT-5.6 Sol의 현재 프로모션은 **최소 2026-11-21까지** 보장됩니다. 확정 종료일·후속 가격을 추측하지 않고 설명과 `promotionGuaranteedThrough`에 보존했습니다. [공식 모델 문서](https://developers.openai.com/api/docs/models/gpt-5.6-sol).
- Gemini 3.6/3.7/3.8 Flash는 2026-12-31까지 프로모션, 2027-01-01부터 1.5 / 0.15 / 0 / 7.5입니다. 기존 `activeFrom`/`activeUntil`을 사용합니다. 공식 문서는 날짜만 제공하므로 시간대는 확정할 수 없습니다. 날짜만 저장하며 기존 JavaScript 날짜 파싱에 따라 UTC 자정에서 전환합니다. 이는 확장의 경계 처리이며 공식 청구 시각을 검증했다는 뜻은 아닙니다. 기존 저장 단가를 자동 갱신하거나 과거 Gemini 메시지에 역사적 단가를 자동 적용하는 기능은 추가하지 않았습니다. [공식 가격표](https://ai.google.dev/gemini-api/docs/pricing).
- DeepSeek V4 Flash의 과거 고정 요금, 기존 피크/오프피크, 주말 규칙 및 V4 Pro 데이터는 유지합니다. `deepseek-flash`는 V4.1 Flash에 연결합니다. 기존 V4 Flash/Flash Vision Exp 이름은 2026-09-10 04:00 UTC부터 V4.1 Flash 요금으로 연결하되, 이전 메시지는 기존 요금표로 계산합니다. 현재 가격표·업데이트는 V4 Pro 서비스와 기존 요금 유지가 확인되므로 오래된 출시 공지의 Pro 종료 예고를 적용하지 않았습니다. [현재 가격](https://api-docs.deepseek.com/quick_start/pricing/), [업데이트](https://api-docs.deepseek.com/updates/), [변경 시점](https://api-docs.deepseek.com/news/news260910/).

## cache read/write 계산 확인

- `compute()`는 `tokensPrompt`, `tokensCachedPrompt`, `tokensCacheWritePrompt`, `tokensCompletion`을 읽습니다. write 비용은 write 토큰 × 프리셋 write 단가 × 기존 장문 배율 / 1,000,000입니다. 프리셋은 값 불러오기·저장 이후 사용자 프로필에 연결됩니다.
- OpenAI Chat Completions/Responses는 input 합계에 read/write가 포함되며 Marinara도 `cache_write_tokens`를 저장합니다. GPT-5.6 이상 프리셋은 기존 `subtract-both`를 사용합니다. 이전 모델은 write 추가 요금이 없으므로 `write:0`, `subtract-read`를 유지합니다. [공식 캐시 문서](https://developers.openai.com/api/docs/guides/prompt-caching).
- Anthropic은 Marinara가 저장하는 input에 read/write가 포함되지 않아 `none`을 유지합니다. 기존 `write1h` 선택으로 5m/1h 단가를 적용합니다. [공식 prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching).
- Kimi K3의 OpenAI 형식 usage도 read/write를 포함하므로 기존 `subtract-both`를 사용합니다. K2.6/K2.7 Code는 write가 없습니다. 기존 `write1h` 선택 경로를 재사용하며 TTL 제어의 Claude 전용 문구는 이번 범위에서 변경하지 않았습니다. [공식 캐시 문서](https://platform.kimi.ai/docs/guide/context-caching).
- Gemini/GLM의 `write:0`은 저장 시간 요금을 토큰당 write로 변환하지 않는다는 뜻입니다. 두 공급자의 공식 usage는 input에 cache read를 포함하므로 프리셋을 `adjustment:'subtract-read'`로 교정했습니다. 기존 저장 프로필에는 프리셋 출처·사용자 수정 여부가 없어 자동 변경하지 않습니다. 공식 API 사용 시 프리셋을 다시 불러와 저장하거나 차감 방식만 변경해 저장해야 합니다. [GLM usage·청구 예시](https://docs.z.ai/guides/capabilities/cache).
- Google Gemini 직접 API의 `candidatesTokenCount`와 `thoughtsTokenCount`는 별도 값이며, 둘 모두 기존 output 단가로 과금됩니다. 저장된 `generationInfo.provider === 'google'`로 직접 API를 확인한 경우에만 `tokensCompletion + tokensReasoning`을 적용합니다. 모델명 추정, OpenRouter, OpenAI-compatible 및 `google_vertex` 경로에는 이번 합산 규칙을 적용하지 않습니다. 화면 경로는 클릭 시 기존 `/messages` 캐시의 저장 usage를 보완 사용하고, provider·model·prompt·completion·cache read가 일치하는 유효한 reasoning만 반영합니다. 가격과 기존 장문·기간 규칙은 유지합니다. [공식 usage](https://ai.google.dev/api/generate-content.md#UsageMetadata), [공식 가격표](https://ai.google.dev/gemini-api/docs/pricing).
- 사용자가 승인한 기존 장문 분기 교정: GPT-6.1 Sol에도 >272K 분기를 적용하고, GPT-5.6의 write 배율을 1에서 2로 교정했습니다. 산술식·fallback·저장소·metadata 조회 방식은 유지했습니다. [OpenAI 가격표](https://developers.openai.com/api/docs/pricing).


## 2026-11-14 pricing update (v3.1.0)

USD per one million text tokens. These presets use the provider's direct Standard API tier and are estimates only.

- OpenAI GPT-6.1 Terra: input $1, cached read $0.05, cache write $1.25, output $5; prompt beyond 272K multiplies input/cache rates 2x and output 1.5x. https://developers.openai.com/api/docs/pricing
- Anthropic Fable/Mythos 5.2: input $8, cache read $0.20, 5m write $10, 1h write $16, output $40. Haiku 5.5: input $0.10, cache read $0.01, 5m write $0.125, 1h write $0.20, output $0.50, with 5x for prompt longer than 100K. https://platform.claude.com/docs/en/about-claude/pricing
- Google Carbon/Argon: before 2026-12-01 input $2, cached read $0.10, output $10; from 2026-12-01 input $4, read $0.20, output $20. Hydrogen: input $1.50, read $0.075, output $7.50. https://ai.google.dev/gemini-api/docs/pricing
- Kimi K3.1 Pro: input $2, cache read $0.20, 5m write $2, 1h write $4, output $10; Highspeed input $4, read $0.20, write $4/$8, output $20. K2.7 Code input $0.95, read $0.19, output $4; Highspeed input $1.90, read $0.38, output $8. https://platform.moonshot.ai/

Exclude Batch/Flex/Vertex billing, cache storage, audio/image tariffs, and account-specific discounts. Saved custom model profiles are retained.
