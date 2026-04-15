# Cost Breakdown - Phase 1 Implementation

## Services Costs (Monthly)

### 1. **Notifications (Email + SMS)**

#### Email Sending
| Service | Cost | Volume |
|---------|------|--------|
| **Resend** | Free | 100 emails/day |
| **SendGrid** | Free tier | 100 emails/day |
| **AWS SES** | $0.10 per 1000 | Pay-as-you-go |
| **Mailgun** | Free tier | 100 emails/day |

*Estimate: Booking confirmation + 24h reminder = 2 emails per booking*
- 50 bookings/day = 100 emails/day → **FREE** (under free tier)
- 500 bookings/day = 1000 emails/day → **$0.10/day** = $3/month

#### SMS Sending
| Service | Cost | Notes |
|---------|------|-------|
| **Twilio** | $0.0075 per SMS | + $1/month account |
| **AWS SNS** | $0.00645 per SMS | Pay-as-you-go |
| **Vonage** | $0.0065 per SMS | Volume discounts |

*Estimate: 1 SMS per booking (24h reminder)*
- 50 bookings/day = 50 SMS/day = $11.50/month
- 500 bookings/day = 500 SMS/day = $115/month

**Total Email+SMS: $0-200/month** (depends on scale)

---

### 2. **Payment Processing (Stripe Deposits)**

| Item | Cost |
|------|------|
| Stripe account setup | Free |
| Per transaction fee | 2.9% + $0.30 |
| Monthly fee | $0 |
| Example: $10 deposit | $0.59 per transaction |

*Estimate for deposits:*
- 50 bookings/day × $10 deposit = $500/day × 2.9% + $0.30 = $19.80/day = **$594/month**
- 500 bookings/day × $10 deposit = $5000/day × 2.9% + $0.30 = $175/day = **$5,250/month**

**Or: Use "test mode" without deposits** for MVP (no cost, no revenue capture)

---

### 3. **Search/Filters + Reviews**
- **Cost: $0** (built with code, no external services)

---

### 4. **Guest Profiles**
- **Cost: $0** (database only, already have Supabase)

---

## Supabase Costs (Currently)

| Tier | Cost | Includes |
|------|------|----------|
| **Free** | $0 | 500MB storage, 2GB bandwidth, 50k requests |
| **Pro** | $25/month | 8GB storage, 100GB bandwidth, auto-scale |
| **Business** | $599/month | Dedicated resources |

*Current usage likely under Free tier*

**If you add 1000s of appointments:**
- Pro tier: $25/month

---

## Development Costs (One-time)

| Feature | Effort | Cost (dev time) |
|---------|--------|-----------------|
| Email notifications | 4-6 hours | ~$200-400 |
| SMS integration | 2-3 hours | ~$100-200 |
| Stripe deposits | 6-8 hours | ~$300-500 |
| Review system (if broken) | 2-4 hours | ~$100-200 |
| Search filters | 6-8 hours | ~$300-500 |
| Guest profiles | 4-6 hours | ~$200-400 |
| **Total Phase 1** | ~30-40 hours | **~$1,200-2,200** |

---

## Cost Summary

### MVP (No payment, no SMS)
```
Email notifications (Resend free tier)    $0
Search/Filters                            $0
Review system                             $0
Guest profiles                            $0
Supabase Pro (optional)                   $25/month
─────────────────────────────────────────────
TOTAL                                     $25/month
+ One-time dev: ~$800-1200
```

### Lite (With email + optional SMS)
```
Email + SMS for 50 bookings/day           $12/month
Stripe (5% avg per $10 deposit)           $15/month
Supabase Pro                              $25/month
─────────────────────────────────────────────
TOTAL                                     $52/month
+ One-time dev: ~$1200-1600
```

### Full (1000+ bookings/day)
```
Email + SMS for 500+ bookings/day         $150-300/month
Stripe (5% of deposits)                   $150-500/month
Supabase Pro or Business                  $25-599/month
─────────────────────────────────────────────
TOTAL                                     $325-1400/month
+ One-time dev: ~$1200-1600
```

---

## Cheapest Approach (MVP)

### Cost: $800-1200 one-time + $0-25/month

1. **Use free services only:**
   - Resend for email (100/day free)
   - No SMS initially (add later)
   - No payments (launch without deposits)

2. **Skip complex features:**
   - Simple search filter (no complex sorting)
   - Basic reviews (ReviewSection likely works)
   - Simple guest profile (just stored bookings)

3. **Built yourself:**
   - Email notifications: ~4 hours
   - Search filters: ~6 hours
   - Total: ~15-20 hours dev work = $500-800

**MVP Cost: ~$600-1000 one-time, $0/month**

---

## ROI Calculation

### Assumptions
- 100 bookings/month
- $50 average service price
- 20% no-show rate (industry standard)

**Without deposits:**
- Revenue: $5,000/month
- Lost to no-shows: $1,000/month
- Net: $4,000/month

**With $10 deposit:**
- Deposit revenue: $1,000/month
- No-show reduction: 5% instead of 20% (99% ROI!)
- Extra revenue from prevented no-shows: $750/month
- Deposit fees: -$50/month
- Net: $4,700/month
- **Extra profit: $700/month**

**ROI: $700/month profit >> $1200 dev cost**
**Payback: ~1.7 months** ✅

---

## Recommended Path

### Week 1: MVP (Free)
1. Email confirmations (Resend free)
2. Search filters (code only)
3. Estimate: $400-600 dev

**Cost: $400-600 + $0/month**

### Week 2-3: Add Deposits (If MVP works)
1. Stripe integration
2. $10 deposit holds
3. Estimate: $300-400 dev

**Cost: $300-400 + $15/month**

### Week 4+: Add SMS (If revenue grows)
1. Twilio SMS
2. Estimate: $200-300 dev

**Cost: $200-300 + $50-100/month**

---

## Questions to Decide

1. **Start with deposits or test without?**
   - Without: Cheaper initially, may have high no-shows
   - With: Higher upfront cost, but better margins

2. **SMS or just email?**
   - Email only: $0/month
   - Both: $50-150/month (better no-show reduction)

3. **How many bookings/month do you have?**
   - <100: Stay free tier
   - 100-1000: Pro tier ($25/month)
   - 1000+: Business or dedicated

---

## TL;DR

| Option | Cost | Effort |
|--------|------|--------|
| **Free MVP** | $0/month + $600 dev | Low |
| **Basic** | $25/month + $1000 dev | Medium |
| **Full** | $50-200/month + $1600 dev | High |

**Best to start:** Free MVP (email only) = $600 dev, $0/month, 1-2 weeks.
**Then add deposits** after validating demand.
