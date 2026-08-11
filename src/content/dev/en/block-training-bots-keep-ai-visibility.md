---
title: Why We Block ClaudeBot and GPTBot — Without Losing AI Search Visibility
description: A non-dev colleague asked whether blocking ClaudeBot and GPTBot deletes us from AI answers. It doesn't — because one AI vendor runs several bots with different purposes, and we block only the training ones.
pubDate: 2026-06-22
tags:
  - robots-txt
  - ai-crawlers
  - seo
  - geo
  - bot-management
draft: true
---

A colleague from a non-dev team pinged me: "I saw we block **ClaudeBot** and **GPTBot** in
`robots.txt`. Doesn't that delete us from AI answers? Everyone's optimizing for AI search
now and we're doing the opposite?"

It's a fair worry, and the short answer is no — blocking those two costs us zero AI-search
visibility. The reason is a distinction that's easy to miss: **a single AI vendor doesn't run**
**one crawler, it runs several — and they do completely different jobs.** We block only the ones
that don't affect whether we get cited.

## One vendor, several bots

The mental model people carry is "OpenAI = one bot, Anthropic = one bot, block it or don't."
That's wrong. Each vendor splits its crawlers by **purpose**, and only one of those purposes
has anything to do with server load.

| Purpose | What it does | Our policy |
| --- | --- | --- |
| **① Training** | Collects content in bulk to train the model. Unrelated to search visibility. | **Block ✕** |
| **② Search index** | Indexes pages so AI answers can cite and surface us. The core of GEO. | **Allow ✓** |
| **③ On-demand** | Visits a page only when a real user asks the assistant to read that URL. | **Allow ✓** |

Spelled out per vendor, the "one bot" mental model falls apart immediately:

| Vendor | Training (blocked) | Search index (allowed) | On-demand (allowed) |
| --- | --- | --- | --- |
| OpenAI | `GPTBot` | `OAI-SearchBot` | `ChatGPT-User` |
| Anthropic | `ClaudeBot` | `Claude-SearchBot` | `Claude-User` |

So `ClaudeBot` and `GPTBot` — the two names my colleague saw — are the **training** crawlers.
The bots that decide whether ChatGPT or Claude cites us in an answer are `OAI-SearchBot`,
`Claude-SearchBot`, and the `-User` on-demand fetchers. Those are all allowed. We didn't touch
the ones that matter for visibility.

## We block only training

Two reasons, and neither is "we dislike AI."

- **Training and search are separate systems.** A page being absent from a model's training set
  has no effect on whether the model's _search_ index can find and cite it. Blocking `GPTBot`
  does not remove us from ChatGPT's answers, because ChatGPT's answers are sourced by
  `OAI-SearchBot`, which we allow. The GEO loss people fear simply isn't wired that way.
- **Training bots have a load history.** `GPTBot` and `ClaudeBot` are the crawlers that have
  historically hit sites with aggressive, bulk, low-value traffic — pulling everything to fill
  a training corpus. That's the actual cost we're declining to pay.

So the block is a **load decision, not a visibility decision.** We're opting out of being
bulk-harvested for training while keeping every door open that leads to an AI citation.

**One caveat, and it's the important one: `robots.txt` is honored, not enforced.** It's a
sign on the door, not a lock. Well-behaved crawlers — Google, OpenAI, Anthropic — read it and
obey it, which is exactly why blocking `GPTBot` and `ClaudeBot` there actually stops their
training crawl. But a malicious scraper or a forged-user-agent botnet doesn't read the sign at
all; it walks straight in. So `robots.txt` handles the _polite_ bots — the ones that identify
themselves and follow the rules — and nothing else. For the traffic that ignores it, you need
enforcement at the edge: a [WAF](https://learn.microsoft.com/azure/web-application-firewall/afds/afds-overview)
to challenge or block suspicious clients, and
[rate limiting](https://learn.microsoft.com/azure/web-application-firewall/afds/waf-front-door-rate-limit)
to cap abusive request volume regardless of what UA they claim. `robots.txt` is the first
layer, not the whole defense — and it's [worth remembering that no crawler is _obligated_ to
respect it](https://developers.google.com/search/docs/crawling-indexing/robots/intro).

## How other sites handle it

Selective blocking isn't a niche choice — but "block everything" is a real, and costly,
alternative that some large sites have picked on purpose. HighSEOTools published an
[original dataset](https://highseotools.com/blog/ai-search-visibility-geo-facts) that fetched
the live `robots.txt` of eight well-known sites (17 July 2026) and checked six AI-relevant
user-agents against each. The results fall into three camps:

- **Fully open** — Wikipedia, GitHub allow all six user-agents.
- **Selective** — Medium, BBC let some search/answer bots through while blocking others (the
  approach we take).
- **Block everything** — Stack Overflow, NYTimes, Reddit block essentially all of them,
  including the search and on-demand bots.

That last camp is the one to understand, because it's the opposite of what we do. When Stack
Overflow blocks not just `GPTBot` but `OAI-SearchBot` and `Claude-SearchBot` too, it isn't
opting out of _training_ — it's opting out of **being cited at all**.

And it goes further than the search index. Stack Overflow also blocks the **on-demand** fetch —
the request an assistant makes when _you_ paste a link and ask it to read that page. So even a
direct, user-initiated fetch fails:

![Claude Desktop failing to fetch stackoverflow.com — "Failed to fetch https://stackoverflow.com"](/uploads/stackoverflow-claude-desktop-blocked.png)

> Ask Claude Desktop "can you access stackoverflow?" and it can't — the fetch is refused at
> `robots.txt`, both for the domain root and for a specific question URL.

**Why would a site do that?** For Stack Overflow it's a deliberate business stance, not an
accident. They've moved to monetize their corpus through
[paid data-licensing partnerships](https://openai.com/index/api-partnership-with-stack-overflow/)
and a [pay-per-crawl model](https://stackoverflow.blog/2026/02/26/how-pay-per-crawl-is-reshaping-data-monetization/),
and block AI crawlers that don't go through those channels — being uncitable is the trade they
chose to push AI companies toward paid access. It works as leverage, but the side effect is
concrete: if you've noticed assistants leaning on other sources where they used to quote Stack
Overflow, this is a large part of why.

That's exactly the mistake we're _not_ making. "Block everything" and "block selectively" look
almost identical in a config file and are opposite strategies in practice. Unless being
uncitable is a deliberate business decision — as it is for Stack Overflow — blocking the search
and on-demand bots along with the training bot just quietly removes you from AI answers for no
gain. We block training; we stay citable.

## What to check when a request lands on you

Requests arrive as bot names — "block this," "open that." As the developer, the name is the
_last_ thing to act on. Before you touch the file, run through these:

- **What's the bot's actual purpose?** Classify it against the vendor's docs and published IP
  ranges — training → blocking is safe, search/on-demand → blocking costs citations. Never
  apply a name-only request ("just add GPTBot") as-is.
- **What is the requester actually trying to do?** "Reduce load" and "get us into AI answers"
  touch _different_ bots. Match the change to the goal, not to whichever bot name they happened
  to mention.
- **Is `robots.txt` even the right layer?** If it's a forged-UA botnet or an aggressive
  scraper, editing this file does nothing — that's a WAF / rate-limit problem. `robots.txt`
  only works on polite, self-identifying bots.
- **Do the sensitive-path exclusions still hold?** When you open a search bot, keep
  account/payment/API paths `Disallow`ed so you don't expose them on the way in.
- **Verify after applying.** Check the access logs (or a robots.txt tester) that the crawler's
  access actually changed the way you intended — an `Allow` that never takes effect is as bad
  as a wrong block.

Blocking `ClaudeBot` and `GPTBot` isn't a stance against AI search. It's the opposite — done
with this checklist, it's what lets us decline bulk training crawls _and_ keep every path to an
AI citation open at the same time.
