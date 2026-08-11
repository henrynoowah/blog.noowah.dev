---
title: ClaudeBot·GPTBot는 막고 AI 검색 노출은 지키기
description: 비개발팀 동료가 ClaudeBot·GPTBot 차단이 AI 답변에서 우리를 지우는 것 아니냐고 물었다. 아니다 — 하나의 AI 회사는 용도가 다른 여러 봇을 돌리고, 우리는 그중 학습용만 막는다.
pubDate: 2026-06-22
tags:
  - robots-txt
  - ai-crawlers
  - seo
  - geo
  - bot-management
draft: true
---

비개발팀 동료가 물어봤다. "`robots.txt`에서 **ClaudeBot**이랑 **GPTBot**을 막았던데,
그럼 AI 답변에서 우리가 지워지는 거 아니에요? 요즘 다들 AI 검색 최적화하는데 우리는
반대로 가는 것 같아서요."

합리적인 걱정이고, 짧은 답은 "아니다"이다 — 그 둘을 막아도 AI 검색 노출은 전혀 손해
보지 않는다. 이유는 놓치기 쉬운 구분에 있다. **하나의 AI 회사는 크롤러를 하나만 돌리지**
**않는다. 여러 개를 돌리고, 각각 하는 일이 완전히 다르다.** 우리는 그중 인용 여부와
무관한 봇만 막는다.

## 한 회사, 여러 봇

사람들이 흔히 갖는 모델은 "OpenAI = 봇 하나, Anthropic = 봇 하나, 막거나 말거나"다.
그건 틀렸다. 각 회사는 크롤러를 **용도**별로 나누고, 그중 서버 부하와 관련 있는 건
하나뿐이다.

| 용도 | 하는 일 | 우리 정책 |
| --- | --- | --- |
| **① 학습(Training)** | 모델 학습용으로 콘텐츠를 대량 수집. 검색 노출과 무관. | **차단 ✕** |
| **② 검색 색인(Search)** | AI 답변이 우리를 인용·노출하도록 색인. GEO의 핵심. | **허용 ✓** |
| **③ 사용자 요청(On-demand)** | 실제 사용자가 "이 URL 읽어줘"라고 할 때만 방문. | **허용 ✓** |

회사별로 풀어 놓으면 "봇 하나" 모델은 곧바로 무너진다.

| 회사 | 학습 (차단) | 검색 색인 (허용) | 사용자 요청 (허용) |
| --- | --- | --- | --- |
| OpenAI | `GPTBot` | `OAI-SearchBot` | `ChatGPT-User` |
| Anthropic | `ClaudeBot` | `Claude-SearchBot` | `Claude-User` |

즉 동료가 본 `ClaudeBot`과 `GPTBot`은 **학습용** 크롤러다. ChatGPT나 Claude가 답변에서
우리를 인용할지 결정하는 봇은 `OAI-SearchBot`, `Claude-SearchBot`, 그리고 `-User`
계열의 온디맨드 봇이고, 이들은 전부 허용돼 있다. 노출에 중요한 봇은 건드리지 않았다.

## 학습 봇만 막는 이유

이유는 두 가지이고, 둘 다 "AI가 싫어서"는 아니다.

- **학습과 검색은 별개의 시스템이다.** 어떤 페이지가 모델 학습 데이터에서 빠졌다고 해서,
  그 모델의 _검색_ 색인이 페이지를 찾아 인용하는 것과는 아무 상관이 없다. `GPTBot`을
  막아도 ChatGPT 답변에서 우리가 사라지지 않는다 — ChatGPT 답변의 출처는 우리가 허용한
  `OAI-SearchBot`이 만들기 때문이다. 사람들이 두려워하는 GEO 손실은 애초에 그렇게
  연결돼 있지 않다.
- **학습 봇은 부하 이력이 있다.** `GPTBot`과 `ClaudeBot`은 학습 코퍼스를 채우려 사이트를
  통째로 긁는, 공격적이고 대량이며 가치 낮은 트래픽을 일으켜 온 크롤러다. 우리가 내지
  않기로 한 비용은 바로 이것이다.

그래서 이 차단은 **노출 결정이 아니라 부하 결정**이다. 학습용 대량 수집에서만 빠지고,
AI 인용으로 이어지는 문은 전부 열어 둔다.

**그런데 한 가지 — `robots.txt`는 강제가 아니라 자율**
**준수다.** 문에 붙인 안내판이지 잠금장치가 아니다. 예의 바른 크롤러(Google, OpenAI,
Anthropic)는 이 파일을 읽고 따르며, `GPTBot`·`ClaudeBot`을 여기서 막으면 실제로 학습
크롤링이 멈추는 것도 바로 그래서다. 하지만 악성 스크레이퍼나 UA를 위조한 봇넷은 안내판을
아예 읽지 않고 그냥 들어온다. 즉 `robots.txt`는 \*\*자기를 밝히고 규칙을 따르는 '예의 바른'
봇\*\*만 다룰 뿐, 그 외에는 아무 효력이 없다. 이를 무시하는 트래픽에는 엣지에서의 강제가
필요하다 — 의심스러운 클라이언트를 챌린지·차단하는
[WAF](https://learn.microsoft.com/azure/web-application-firewall/afds/afds-overview)와, 어떤
UA를 사칭하든 과도한 요청량을 제한하는
[레이트 리미팅](https://learn.microsoft.com/azure/web-application-firewall/afds/waf-front-door-rate-limit)이다.
`robots.txt`는 방어의 전부가 아니라 첫 번째 계층이다 — 그리고
[어떤 크롤러도 이를 지킬 _의무_는 없다](https://developers.google.com/search/docs/crawling-indexing/robots/intro)는
점을 늘 기억해야 한다.

## 다른 사이트들은 어떻게 처리하고 있나?

선택적 차단이 특이한 선택은 아니다 — 다만 "전부 차단"이라는, 대가가 큰 대안을 일부 대형
사이트는 의도적으로 택하기도 한다. HighSEOTools가
[직접 만든 데이터셋](https://highseotools.com/blog/ai-search-visibility-geo-facts)에서
잘 알려진 8개 사이트의 실제 `robots.txt`를 가져와(2026년 7월 17일) AI 관련 UA 6종을
사이트마다 대조했다. 결과는 세 부류로 나뉜다.

- **완전 개방** — Wikipedia, GitHub은 6종 모두 허용.
- **선택적** — Medium, BBC는 일부 검색·답변 봇은 열고 일부는 막는다(우리가 택한 방식).
- **전부 차단** — Stack Overflow, NYTimes, Reddit은 검색·온디맨드 봇까지 포함해 사실상
  전부 막는다.

마지막 부류를 이해할 필요가 있다. 우리와 정반대이기 때문이다. Stack Overflow가 `GPTBot`뿐
아니라 `OAI-SearchBot`·`Claude-SearchBot`까지 막는 건 _학습_에서 빠지는 게 아니라 **인용**
**자체에서 빠지는** 선택이다.

그리고 검색 색인에서 그치지 않는다. Stack Overflow는 **온디맨드** 요청 — 사용자가 링크를
붙여넣고 "이 페이지 읽어줘"라고 할 때 어시스턴트가 보내는 요청 — 까지 막는다. 그래서
사용자가 직접 시작한 요청조차 실패한다.

![Claude Desktop이 stackoverflow.com 접근에 실패 — "Failed to fetch https://stackoverflow.com"](/uploads/stackoverflow-claude-desktop-blocked.png)

> Claude Desktop에 "can you access stackoverflow?"라고 물어도 접근하지 못한다 — 도메인
> 루트든 특정 질문 URL이든 `robots.txt`에서 요청이 거부된다.

**왜 이렇게 할까?** Stack Overflow의 경우 이는 사고가 아니라 의도된 사업적 입장이다. 자사
데이터를 [유료 라이선싱 파트너십](https://openai.com/index/api-partnership-with-stack-overflow/)과
[pay-per-crawl 모델](https://stackoverflow.blog/2026/02/26/how-pay-per-crawl-is-reshaping-data-monetization/)로
수익화하는 쪽으로 방향을 틀었고, 그 채널을 거치지 않는 AI 크롤러는 차단한다 — 인용에서
빠지는 건 AI 회사들을 유료 접근으로 유도하려고 감수한 트레이드오프다. 지렛대로는 작동하지만, 부작용은 분명하다. AI 어시스턴트가 예전엔 Stack
Overflow를 인용하다 요즘엔 다른 출처에 기대는 걸 느꼈다면 상당 부분이 이 때문이다.

우리가 하지 _않는_ 실수가 바로 이것이다. "전부 차단"과 "선택적 차단"은 설정 파일에선 거의
똑같아 보이지만 실제로는 정반대 전략이다. 인용에서 빠지는 것이 — Stack Overflow처럼 —
의도된 사업적 결정이 아니라면, 학습 봇과 함께 검색·온디맨드 봇까지 막는 건 아무 이득 없이
AI 답변에서 조용히 사라지는 것일 뿐이다. 우리는 학습만 막고, 인용 가능한 상태를 유지한다.

## 개발자로서 요청 시 검토할 것들

요청은 대개 봇 이름으로 온다 — "이거 막아 주세요", "저거 열어 주세요". 하지만 개발자
입장에서 봇 이름은 _가장 마지막에_ 반영할 대상이다. 파일을 건드리기 전에 다음을 짚는다.

- **이 봇의 실제 용도는?** 회사 공식 문서와 공개 IP 대역으로 분류한다 — 학습이면 차단해도
  안전하고, 검색·온디맨드면 차단이 곧 인용 손실이다. 이름만 던진 요청을 그대로 반영하지
  않는다.
- **요청자가 진짜 원하는 건?** "부하 줄이기"와 "AI 답변에 노출되기"는 서로 _다른_ 봇을
  건드린다. 언급된 봇 이름이 아니라 그 목적에 맞춰 바꾼다.
- **애초에 robots.txt로 될 일인가?** 위조 UA 봇넷이나 공격적 스크레이퍼라면 이 파일을
  고쳐도 소용없다 — WAF·레이트 리미팅의 영역이다. robots.txt는 자기를 밝히는 예의 바른
  봇에만 통한다.
- **민감 경로 제외가 유지되는가?** 검색 봇을 열 때 계정·결제·API 경로는 `Disallow`로 남겨,
  여는 김에 함께 노출되지 않도록 한다.
- **적용 후 검증한다.** 액세스 로그(또는 robots.txt 테스터)로 크롤러 접근이 의도대로
  바뀌었는지 확인한다 — 효력 없는 `Allow`는 잘못된 차단만큼 나쁘다.

`ClaudeBot`과 `GPTBot`을 막는 건 AI 검색에 반대하는 입장이 아니다. 오히려 그 반대다 — 이
체크리스트대로 하면, 학습용 대량 크롤링은 거절하면서 AI 인용으로 가는 모든 경로는 동시에
열어 두는 방법이 된다.
