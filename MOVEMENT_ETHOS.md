# THE MOVEMENT ETHOS — JOAF Viral Growth Build

## Movement-aligned product principles

1. **Memory preservation**  
   July stories, sacrifice records, and verified movement history must remain searchable, recoverable, and available offline.
2. **Support-first design**  
   Features should help people request, offer, and coordinate real community support (blood, food, safety, legal, medical).
3. **Real-time coordination**  
   Alerts, updates, and response workflows should feel immediate and resilient under backend degradation.
4. **Demand-driven development**  
   Phase 2 work should prioritize urgent community needs over cosmetic features.

## Feature design questions (before shipping)

- Does this feature protect the spirit of the movement and its memory?
- Does this flow encourage mutual aid instead of passive consumption?
- Can this work safely in low-connectivity and degraded backend states?
- Can abuse of this feature be limited without blocking genuine help?

## Phase 2 roadmap mapping to ethos

- **Warriors archive (Appwrite migration):** preserves memory with searchable, updateable records and offline cache.
- **Hyperlocal discovery engine:** enables district-level, real-time support coordination around alerts.
- **Retention engine (unity notifications):** nudges daily return through solidarity, prayer-time, and support-oriented messaging.
- **Verified badges/trust levels:** rewards constructive contribution while improving reliability of community-submitted content.

## Privacy, safety, and abuse resistance

- JOAF support tools must not be used to incite violence, target vulnerable people, or coordinate harmful activity.
- Keep sensitive operations server-side and secret-free on clients; use JOAF_CONFIG placeholders for deploy-time configuration.
- Prefer district-level and consent-based sharing; avoid unnecessary personal exposure in public alert content.
- Build moderation-aware trust controls (verification, abuse flagging, throttling) as core requirements, not optional polish.
