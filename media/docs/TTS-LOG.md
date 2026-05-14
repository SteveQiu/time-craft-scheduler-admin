# TTS API Usage Log

**Owner:** Newt (Media & Video Engineer)  
**Last Updated:** 2026-05-14

Track TTS API calls, costs, and cache hits to stay within free tier limits.

---

## Summary

| Provider | Monthly Limit | Used This Month | Remaining |
|----------|---------------|-----------------|-----------|
| ElevenLabs | 10,000 chars | 0 | 10,000 |
| Google Cloud TTS | 1,000,000 chars | 0 | 1,000,000 |
| Azure TTS | 500,000 chars | 0 | 500,000 |

---

## Call Log

| Date | Composition | Scene | Provider | Chars | Duration (s) | Cost | Cache Hit | Notes |
|------|-------------|-------|----------|-------|--------------|------|-----------|-------|
| *Example* | lemon-squeezy-intro | scene-01 | ElevenLabs | 180 | 12.3 | $0 (free) | No | Initial generation |
| *Example* | lemon-squeezy-intro | scene-01 | ElevenLabs | 180 | 12.3 | $0 | **Yes** | Re-render (cached) |

---

## Instructions

Append entries to this log when running `scripts/generate-audio.ts`. Format:

```
| YYYY-MM-DD | composition-id | scene-id | provider | char-count | duration | cost | Yes/No | notes |
```

**Cache hit:** Audio file already exists, no API call made.

**Cost calculation:**
- ElevenLabs free tier: 10k chars/month (≈5-7 min audio)
- Google Cloud TTS: 1M chars/month (≈500+ min audio)
- Azure TTS: 0.5M chars/month (≈250+ min audio)

Reset monthly counters at the start of each month.
