---
title: "Mitigating Distributed Bots with Azure WAF: An Operations Retrospective"
description: "An Azure WAF operations retrospective on combining server logs, Bot Manager, JA4 fingerprints, and JavaScript Challenge to mitigate bots precisely."
pubDate: 2026-08-10
tags: ["azure", "waf", "security", "bot-management"]
draft: true
---

When bot traffic grows, blocking it is the most visible response. But broad IP or
country blocks are risky for a global service: they can exclude legitimate users and
useful crawlers along with the automation we want to stop.

This response focused on Azure Front Door WAF. The goal was not to challenge
everything that looked bot-like. It was to apply a JavaScript Challenge only when several
independent signals pointed to automation.

This post deliberately omits service addresses, policy identifiers, exact fingerprint
values, and internal configuration. It focuses on the observations that shaped the WAF
policy and on the checks used to validate both protection and false-positive risk.

## The article that sharpened the approach

GeekNews's Korean summary of
[“A Year Fighting Scrapers on a 1.5 Million Page Website”](https://news.hada.io/topic?id=32244)
was especially helpful in framing this work. Its main value was not a vendor-specific
configuration, but a practical model for treating scraper traffic as an observability
and product-quality problem—not just a cost problem.

Four ideas from the article became the working criteria for the WAF response:

1. **Trust server and edge logs before client analytics.** Analytics tools that depend
   on JavaScript execution can miss most automated requests.
2. **Do not identify attackers by IP address alone.** Residential proxies and browser
   automation rotate addresses too quickly for per-IP rate limits to be sufficient.
3. **Prefer a challenge to a block where people may be mixed into the traffic.** It can
   filter automation while preserving a path for ordinary browsers.
4. **Use challenge solve rate as a false-positive signal.** A high solve rate may mean
   the policy is challenging real users; a very low one adds evidence that the target
   is automated.

The source article used a different WAF product, but its operating loop—observe, apply
a narrow challenge, then validate against solve rate and legitimate-user metrics—maps
directly to Azure WAF.

## Remove log noise before tuning the WAF

Before changing the WAF, we fixed malformed asset URLs and invalid API requests caused
by runtime configuration that was not ready. That work was not a WAF result; it was
baseline cleanup so product defects would not be mixed with attack traffic in the logs.

That cleanup made precise WAF tuning possible. If the application keeps generating broken requests,
attack traffic and product defects become mixed in the WAF logs. The result is usually
an overly broad policy and unnecessary friction for real users.

## Measured results: WAF effects only

We do not publish absolute request volumes or detailed policy values for the company
service. The table below reports only the traffic observations for the segment that
overlapping signals classified as eligible for a WAF challenge.

The values below are from the **targeted non-browser JA4 group** where overlapping
signals justified a challenge, not from the whole service. The first row compares the
same 30-minute snapshot; the second covers the first 24 hours after enforcement.

| Metric | Before | After | Interpretation |
| --- | --- | --- | --- |
| 30-minute traffic for the targeted group | 6,633 total / 4,088 content-reaching `200` responses | 2,117 total / 0 content-reaching `200` responses / 2,117 403-or-challenge responses | All requests moved to challenge before a content response |
| JavaScript Challenge outcome (first 24 hours) | Challenge not applied | 7,408 issued / 0 passed | Supports the conclusion that the target was automated |
| 4xx rate for legitimate-user cohorts | Baseline | No meaningful increase | Monitors false positives and user friction |

These are not results for all bot traffic or the whole service. The useful question is
whether the targeted automation stopped reaching content and legitimate-user metrics
remained stable at the same time.

## JA4 separated the page-loading source of GA pollution

GA and Azure WAF do not measure the same traffic. GA sees events sent by tags that run in
the browser, while Azure WAF sees edge traffic before a request reaches a page or origin.
That means “GA has traffic that Azure does not” should not automatically be read as a WAF
failure.

In this case, we isolated Front Door requests that received a content `200`, then analyzed
them together by JA4, user agent, geographic distribution, and requests per IP. A single
JA4 appearing across many user agents and regions while making unusually few requests per
IP was a strong signal of residential-proxy automation rotating both UA and IP.

That analysis led to the WAF rule. After JS Challenge was applied to the targeted JA4 group,
content-reaching `200` responses fell to zero. The bots could no longer receive page HTML,
so they also lost the path that would execute a GA tag. In other words, WAF addressed the
**page-loading bot traffic that was polluting GA**.

GA events with no corresponding Azure edge traffic remain outside WAF's scope. Measurement
Protocol ghost spam, events from another hostname, and analytics-processing delay require
separate handling. For those cases, use GA hostname and engagement-based segmentation while
keeping Front Door logs as the source of truth for server-side traffic.

The first WAF task was therefore not creating a rule. It was correlating the following
signals over the same time windows:

- Azure Front Door access-log route, status code, cache state, and origin reachability;
- WAF rule type, match condition, and action;
- Bot Manager classification;
- user-agent behavior and JA4/TLS client fingerprint; and
- success and 4xx rates for legitimate-user cohorts.

This makes more useful questions possible than “Which IP sent too many requests?” Even
when every request comes from a new IP, it may still share a non-browser fingerprint,
a bot classification, and an anomalous request pattern.

## Design the policy in stages, not as one big block

Azure Front Door WAF's Bot Manager applies managed classifications for good, bad, and
unknown bots. `Unknown` is not automatically equivalent to “block this request.” It may
include a new crawler, required integration traffic, or a legitimate browser with unusual
characteristics.

We separated the policy into this sequence:

1. **Block only high-confidence abusive signals** at the highest priority. Temporary
   emergency blocks belong here as well.
2. **Explicitly allow verified crawlers** and traffic required for service operation.
   These exceptions are a design input, not an afterthought.
3. **Observe unknown bot classifications in logs first.** Move only the segment that
   repeatedly overlaps with other suspicious signals to JS Challenge.
4. **Use JA4/TLS client fingerprints as a supporting signal.** Exclude broad fingerprints
   shared by normal browsers and consider only narrow patterns that consistently behave
   like non-browser clients.

This is pseudoconfiguration, not a deployable policy:

```yaml
rules:
  - name: block-confirmed-abuse
    match: confirmed-abuse-signal
    action: Block

  - name: allow-verified-crawlers
    match: verified-crawler
    action: Allow

  - name: challenge-overlapping-bot-signals
    match:
      bot-classification: unknown-or-suspicious
      client-fingerprint: non-browser-pattern
    action: JSChallenge
```

The important constraint is that we did not challenge on `Unknown` alone. An action that
can affect user experience required at least two aligned signals: managed classification,
client characteristics, or the observed request pattern. That reduces the chance that a
single imperfect signal defines the whole policy.

## Why JavaScript Challenge was the first enforcement action

A block is decisive, but costly to reverse. JavaScript Challenge validates browser behavior
before a request reaches content. An ordinary browser can complete the short verification;
a simple HTTP client or some headless automation is much more likely to stop there.

It was the appropriate first action for two reasons:

- **Protect global user access.** We did not need a blanket block over a country, carrier,
  or broad IP range to reduce automated traffic.
- **Create a safe learning loop.** Challenge outcomes show whether the rule is reaching
  its intended target before the next adjustment.

We did not challenge every automated-looking request. Each Bot Manager rule category was
examined in logs first. Some categories can include legitimate crawlers or framework
traffic, so they remained in observation mode. Only segments that also overlapped with
non-browser fingerprints were moved to challenge enforcement.

## ClientHello and JA4 are supporting signals

`ClientHello` is the first TLS negotiation message a client sends when it starts an HTTPS
connection. It advertises supported TLS versions, cipher suites, extensions, and ALPN;
the server uses that information to select a compatible connection. JA4 normalizes these
TLS characteristics into a fingerprint of client behavior.

User agents are easy to imitate; reproducing the behavior of an entire TLS stack is a
higher bar. That makes JA4 a useful additional axis when looking at distributed proxies
and automation. It is not a person or device identifier, and ordinary browsers can share
the same fingerprint.

It is not a perfect human-versus-bot label, though. A broad fingerprint can be shared by
ordinary browsers. We used four guardrails:

- consider a fingerprint only after it recurs in logs alongside non-browser behavior;
- exclude it if it appears in a meaningful legitimate-user cohort;
- start with JS Challenge, not a permanent block; and
- compare challenge outcomes with legitimate-user response rates after every change.

The WAF should not be treated as a system that perfectly recognizes bots. It is a layer
that combines imperfect signals to reduce risk, and every policy must be narrow enough to
adjust or roll back when observation changes.

## Treat challenge solve rate as a policy-quality metric

The most practical lesson from the GeekNews article was using solve rate as a **false-positive
indicator**, not merely a security statistic. We interpreted Azure Front Door WAF JavaScript
Challenge metrics through that lens:

- `Issued`: a new challenge was sent;
- `Passed`: the client completed the calculation and responded;
- `Valid`: the client presented a previously valid challenge cookie; and
- `Blocked`: the challenge was not completed.

An increase in `Issued` was never enough to call the policy successful. We evaluated the
ratio of `Passed` and `Valid`, the downstream content-response flow, and 4xx rates for
legitimate-user cohorts together. If solve rates rise unexpectedly or a user cohort's error
rate worsens, the correct response is to narrow the conditions or return the rule to log
mode.

In this case, suspicious traffic shifted from content requests to challenges while
legitimate-user metrics remained stable. That was the meaningful outcome—not simply a
larger count of security actions.

## Operating principles that remain

This work reinforced that a WAF is not a one-time, finished blocking policy. It is an
operating system that needs continuous observation and adjustment.

- **Keep server logs as the source of truth.** Client analytics may not explain bot traffic.
- **Record the reason and rollback condition for every rule.** A policy should state what
  it protects against and which signal would make it unsafe to retain.
- **Treat broad blocks as a last resort.** Where humans may be present, begin with a narrow
  challenge and observation mode.
- **Handle exceptions early.** Verified crawlers and operationally required traffic should
  be defined before enforcement starts.
- **Measure the cost of the defense itself.** A challenge can affect performance and user
  journeys, so its operational cost belongs in the dashboard too.

## Closing thought

Bot mitigation was not a matter of blocking more traffic. It was a matter of becoming more
precise about what we could know. The GeekNews article was a valuable starting point for
thinking concretely about traffic outside analytics, the limits of IP-based controls, and
the meaning of challenge solve rate.

For this response, we first removed application-generated noise, then combined Azure WAF Bot
Manager, JA4/TLS fingerprints, verified-crawler exceptions, and JavaScript Challenge.
That made it possible to filter automation before content delivery without broad blocks,
and to validate each policy change against legitimate-user metrics. The next iteration
starts the same way: observe, apply narrowly, measure, and adjust.
