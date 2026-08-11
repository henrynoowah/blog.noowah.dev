---
title: "Blocking Distributed Bots Without Broad Blocks: An Azure WAF Operations Log"
description: "Per-rule Bot Manager analysis, the ALPN trap in JA4 fingerprints, JavaScript Challenge, and untangling GA contamination — an Azure WAF operations log on filtering bots precisely without broad blocks."
pubDate: 2026-08-10
tags: ["azure", "waf", "security", "bot-management"]
draft: true
---

When bot traffic grows, blocking it is the most visible response. But for a global
medical-tourism service, broad IP or country blocks lose real patients and useful crawlers
along with the automation. So the goal here was not to challenge everything that *looked*
bot-like — it was to switch to a JavaScript Challenge **only where several signals
overlapped**.

The starting point was the GeekNews case
["99% of our traffic was bots"](https://news.hada.io/topic?id=32244). Prompted by "isn't
our site the same?", I measured Front Door access logs and confirmed the bot problem was
real. This post is what came next — an operations record of filtering those bots precisely,
without broad blocks, using the Azure Front Door WAF.

## Reading the WAF effect only

Instead of absolute request volumes and policy internals, I look only at the logs for the
**target non-browser JA4 group** classified as Challenge because several signals overlapped.
The first row compares the same 30-minute snapshot; the second, the first 24 hours after
applying.

| Metric | Before | After | Reading |
| --- | --- | --- | --- |
| Target group, 30-min traffic | 6,633 total / content `200` 4,088 | 2,117 total / content `200` 0 | All switched to Challenge before reaching content |
| JS Challenge (first 24h) | Not applied | 7,408 issued / 0 passed | Supports that the target is automation |
| Legit-user 4xx rate | Baseline | No meaningful rise | Watch false positives and friction together |

What matters is not the block count itself, but confirming — **separately** — that the
target automation never reached the content path, and that legit-user metrics held.

## Bot Manager: the "biggest bot group" was actually on our side

Azure Front Door's `Microsoft_BotManagerRuleSet 1.1` classifies bots into GoodBots /
BadBots / UnknownBots. The UnknownBots group was detecting 150k/day but only on `Log`, so
my first instinct was "just bump the whole thing to JSChallenge." **That was wrong.**

I joined the WAF log and the access log on `trackingReference` to see, by UA and unique IP,
what each sub-rule actually catches.

| Rule | Rule description (role) | Count/day | Real identity | JSChallenge |
| --- | --- | --- | --- | --- |
| **Bot300700** | Other bots | **115,040** | 🚫 Claude-SearchBot (#1) · **our own `Next.js Middleware`** · ChatGPT-User · PerplexityBot · Slackbot, etc. | ❌ Forbidden |
| **Bot300600** | Unknown bots (threat intel) | 26,452 | Forged-Chrome-UA botnet (request:IP = 1:1, residential-proxy signature) | ✅ Core target |
| Bot300200 | Crawler / attack tools & frameworks | 24 | HeadlessChrome, `colly` scraper | ✅ OK |
| Bot300100 | Unspecified identity | 3,387 | Empty UA | ⚠️ Low risk |
| Bot300300 | General-purpose HTTP clients / SDKs | 215 | curl, python-requests, Go-http-client | ⚠️ After checking internal integrations |

Here came the second reversal. **The biggest-looking bucket, Bot300700 (115k), was exactly
the one never to touch.** Its top entry was Claude-SearchBot, and next was **our own Next.js
middleware**. Challenging it would kill AI-search visibility and break SSR. The original
premise — "all 150k UnknownBots are malicious" — flipped right here: the actual malicious
botnet was **Bot300600 (~26k)**.

The heuristic was simple. **Requests ≈ unique IPs (1:1)** means a botnet rotating IPs;
**many requests but very few unique IPs** means a legit crawler hitting hard from a declared
source. So I bumped only `Bot300600` and `Bot300200` to `JSChallenge`, and kept the largest,
`Bot300700`, on `Log`.

## Priority conflict: a Block rule that never fired

Azure Front Door evaluates custom rules in ascending priority, and `Allow` / `Block` /
`CAPTCHA` / `JSChallenge` are all **terminating** — evaluation stops at the first match.
There was a silent bug here.

- A lower-priority `suspiciousIp` rule was applying **CAPTCHA** to a broad range (`/16`), and
- a higher-priority `blockBotIPs` rule was applying **Block** to a narrow range nested inside it (`/24`).
- Since `/24 ⊂ /16`, the broad CAPTCHA rule won first, so the **Block never fired.**

Another important trap — `Allow` skips the entire managed ruleset. So if a bot creates an
account and gets a session cookie, it hits the auth `Allow` rule and bypasses the whole WAF.
To prevent that, `blockBotIPs` must sit **ahead of every Allow/Challenge**. I redesigned the
priorities to lift the block-IP rule to the top and switched `suspiciousIp` from CAPTCHA to
JSChallenge. The range overlap resolved itself in the process.

## JA4 fingerprints: the most common bot fingerprint overlapped with real users

UA and IP are forged, but the TLS handshake reveals the client's real TLS stack.
`ClientHello` is the first TLS negotiation message a client sends when opening an HTTPS
connection, carrying supported TLS versions, cipher suites, extensions, and ALPN. JA4 is a
normalized fingerprint of those. After confirming AFD custom rules officially support
`matchVariable: "JA4"` + `operator: "ClientFingerprint"`, I moved to fingerprint-based rules.

First I clustered only requests that loaded a real page with 200, by JA4. When one
fingerprint spans hundreds of UAs and hundreds of countries, it's a single bot toolkit.

| JA4 | Unique IPs | UA types | Countries | Loads/IP | Verdict |
| --- | --- | --- | --- | --- | --- |
| `t13d1516h2_8daaf6152771_d8a2da3f94cd` | 60,922 | **242** | **181** | 1.18 | 🔴 Botnet ringleader |
| `t13d131000_f57a46bbacb6_e7c285222651` | 32,172 | 26 | 9 | 1.51 | 🔴 Botnet |
| `t13d311100_1d947a95fc68_92851bcf5a44` | 10,566 | **645** | 116 | 1.72 | 🔴 Botnet |
| `t13d1011h2_61a7ad8aa9b6_…` | 44 | 5 | 1 | **349** | 🟢 Legit crawler |

Here was the second reversal. **Blocking the most common ringleader fingerprint `…h2` on its
own would false-positive real users.** The `h2`/`h1` at the end of a JA4 is the negotiated
ALPN, and sending ALPN is what real browsers do. That fingerprint is a plain Chrome
fingerprint, so it overlapped with real Hong Kong users (~24 loads/IP). So I excluded it.

> **ALPN (Application-Layer Protocol Negotiation)** is a TLS extension that lets the client
> and server agree, during the TLS handshake, on which application protocol to use (e.g.
> HTTP/2 `h2`, HTTP/1.1 `http/1.1`). Real browsers always include an ALPN list in
> `ClientHello` to negotiate HTTP/2. Simple HTTP libraries and script clients, by contrast,
> often send no ALPN at all — and then the JA4 ends in `00` instead of `h2`/`h1`.

The safe target is **ALPN-less (`…00`) non-browser fingerprints**. Real browsers always send
ALPN, so `…00` is a scripted client and never overlaps with real users. I added a custom rule
applying `JSChallenge` to the two fingerprints `t13d131000_…` and `t13d311100_…` (after the
allow cluster, before `suspiciousIp`).

```json
{
  "name": "challengeNonBrowserBotnetJA4",
  "priority": 250,
  "action": "JSChallenge",
  "matchConditions": [{
    "matchVariable": "JA4",
    "operator": "ClientFingerprint",
    "matchValue": [
      "t13d131000_f57a46bbacb6_e7c285222651",
      "t13d311100_1d947a95fc68_92851bcf5a44"
    ]
  }]
}
```

Result: those two fingerprints' content `200`s went from 4,000/30 min to **0**, with 0
challenge passes. It cut through UA/IP forgery while producing zero false positives on real
browsers.

## Using the challenge solve rate as a false-positive metric

The most practical hint from the GeekNews piece was using solve rate not as a security number
but as a **false-positive detector**. I read the JS Challenge metrics the same way.

- `Issued`: newly issued challenges
- `Passed`: requests that completed the computation
- `Valid`: requests presenting a previously issued valid cookie
- `Blocked`: requests that failed to complete the challenge

A rising `Issued` alone was not treated as success. In practice the bot-targeting rules held
at **0 passes**, while I watched false positives in real-user markets at the same time.

| Country | Total | `200` | `403` | 403 rate |
| --- | --- | --- | --- | --- |
| Hong Kong | 4,547 | 3,671 | 113 | 2.5% |
| Korea (South) | 1,368 | 1,016 | 4 | 0.3% |

The 403 rate in real-user markets stayed extremely low = **no false positives**. If pass
rates ran higher than expected, or a particular segment's error rate rose, the right move is
to narrow the rule further or revert it to log mode.

## A side thread: why GA overflows with traffic that Azure doesn't see

During the response I had to explain a phenomenon: "GA shows lots of traffic, but Azure's
real traffic is low." The key is that **the two measure different things.**

- **GA = client-side (browser) measurement.** gtag sends **directly** from the browser to
  `google-analytics.com`, so it never passes through Front Door at all.
- **Azure = edge-side (server) measurement.** The WAF blocks requests before they reach the
  page.

So what fills GA? A residential-proxy botnet that **actually loads pages with 200** and runs
the GA tag — site-transiting traffic, not off-site ghost spam. The evidence matched the two
earlier analyses exactly: per-country loads/IP ≈ 1.0 (botnet rotation), and a single JA4
spanning 242 UAs / 181 countries (a synthetic client).

The cleanup path became clear too. GA can't see JA4, so it gets split out via an
**engagement-based filter + GTM `navigator.webdriver` suppression**, and **no country
blocks** — because in medical tourism the real-patient source countries overlap with the bot
countries. And the source of truth for actual traffic is not GA but the **Front Door /
App Insights server logs.**

## Principles that remain

Going through this, I confirmed again that a WAF is not a one-shot "finished block policy"
but an operations system you keep tuning.

- **Don't assume the biggest bucket is the enemy.** The largest bot group was in fact our own
  middleware and legit crawlers. Exceptions (verified crawlers, our own traffic) are the
  starting point of the policy, not an afterthought.
- **Don't trust a single signal.** UA is forged, and broad JA4s overlap with real users. Only
  when two or more of managed classification, request pattern, and TLS fingerprint overlapped
  did I apply an action that could affect user experience.
- **Broad blocks are the last resort.** When humans might be mixed in, start with a narrow
  Challenge and observe mode, and verify with the solve rate and real-user metrics.

Bot defense wasn't a problem of "block more," but of narrowing down "what we can be sure of."
Observe first, apply narrowly, look at the results, and tune again.
