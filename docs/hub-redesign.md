# Members hub redesign — "premium library + command centre"

Goal: a member opens the hub and thinks *"this is way better than I expected."*
Principle: **value first** — every screen answers a question a member actually has.

## What members come for
1. **What's next?** — the next live call, when it is *in my time*, one tap to join / add to calendar.
2. **What did I miss?** — the recorded calls, quickly, without leaving the hub.
3. **Who should I know?** — directory + map, searchable.
4. **Where's that thing?** — one search across everything.

## What we found (real data, 2026-10-14)
- All 44 recordings are YouTube links → real thumbnails (44/44 have 1280×720) and in-hub playback are free.
- 36/44 recordings have rich descriptions → show them (they are the "what we covered").
- 23 past events match a recording by date → link a past call to its replay.
- 14/17 members have a photo + bio → the directory and a "faces" strip can look alive.
- Mobile Home crushed two feature cards side by side; the first screen offered no immediate value.

## Changes
| Area | Change |
|---|---|
| Recordings | Thumbnail library: featured latest, grid, in-hub player (deep-linkable `?v=`), prev/next, full description. |
| Home | Command centre: greeting + next-call card with live countdown and local-time, "since your last visit", latest recordings rail, bulletin, community pulse (members, calls, hours, faces, map teaser). |
| Calendar | Next-call hero, grouped by month, past calls collapsed with **Watch recording** links, times shown in the member's timezone. |
| Search | ⌘K / "/" command palette across recordings, events, resources, links, members. |
| Directory | Specialty filters with counts, deep-linkable search. |
| System | Consistent card language, shimmer skeletons, subtle motion (respects reduced-motion), focus rings. |

## Not changing
Brand tokens (colours, fonts), data model, sign-in, admin, URLs.
