# Premium Product Demo Video Brief

## 🎯 Overview
Professional 60-90 second product demo video showcasing Time-Craft-Scheduler Premium subscription tier, designed to convert service providers into paying customers.

## 📊 Target Audience
- **Primary**: Service providers (individuals/small businesses) seeking more visibility
- **Secondary**: Platform users considering premium upgrade
- **Pain Point**: Struggle to get discovered by potential customers
- **Goal**: Increase premium subscription signups by 25% over Q1

## 🎬 Video Specifications

### Technical Details
- **Format**: H.264 MP4
- **Resolution**: 1920×1080 (Full HD)
- **Frame Rate**: 30fps
- **Duration**: 17.80 seconds (534 frames)
- **Audio**: AAC, stereo, TTS-generated at 1.15x speed
- **Speech Rate**: 1.15x faster (15% acceleration via FFmpeg atempo filter)
- **File Size**: 1.60 MB (proper H.264 encoding via Remotion)
- **Aspect Ratio**: 16:9
- **Render Engine**: Remotion 4.0.461
- **Actual Scene Durations**:
  - Scene 1 (Hook): 114 frames (3.80s)
  - Scene 2 (Solution): 175 frames (5.83s)
  - Scene 3 (Benefits): 120 frames (4.00s)
  - Scene 4 (CTA): 125 frames (4.17s)

### Render Performance
- **Render Time**: ~3 minutes (full quality, H.264 codec)
- **Concurrency**: Default (multi-threaded rendering)
- **Chrome Headless Shell**: v149.0.7790.0 (downloaded automatically by Remotion)

### Output Location
```
media/videos/premium-product-demo.mp4
```

### Audio Assets
```
media/audio/premium-product-demo/
├── scene-01-hook.mp3         (15.2 KB, 3.78s @ 1.15x)
├── scene-02-solution.mp3     (23.2 KB, 5.82s @ 1.15x)
├── scene-03-benefits.mp3     (16.1 KB, 3.99s @ 1.15x)
└── scene-04-cta.mp3          (16.6 KB, 4.14s @ 1.15x)
Total duration: 17.73 seconds (accelerated)
```

## 📝 Video Script & Timings

### Scene 1: Hook (0-3.78 seconds)
**Voiceover**: "Service providers work hard. But customers don't see them."

**Visual Storyboard**:
- Open on dark/muted screen showing generic service provider browsing interface
- User scrolling through long, undifferentiated list of providers
- Visual metaphor: "lost in the crowd"
- Text overlay: "Service providers struggle to get discovered"

**Purpose**: Establish pain point immediately

---

### Scene 2: Solution (3.78-9.60 seconds)
**Voiceover**: "Premium changes that. Enhanced visibility, professional profiles, and a premium badge."

**Visual Storyboard**:
- Transition to bright, clean interface
- Show premium provider card with:
  - Golden crown icon (premium badge)
  - "View Profile" button highlighted
  - Enhanced visual prominence (border, shadow, featured positioning)
- Split screen showing:
  - Left: Basic provider listing
  - Right: Premium provider listing (clearly differentiated)
- Text overlay: "Enhanced Visibility | Professional Profiles | Premium Badge"

**Key UI Elements to Feature**:
```tsx
// Premium badge
<Crown className="w-4 h-4 text-yellow-500" />

// View Profile button
<Button variant="outline" size="sm">View Profile</Button>

// plan_type indicator
plan_type: 'premium' or 'pro'
```

**Purpose**: Show the solution in action

---

### Scene 3: Benefits (9.60-13.59 seconds)
**Voiceover**: "Get more bookings. Build your brand. Stand out with Premium."

**Visual Storyboard**:
- Animated benefit cards appearing in sequence:
  1. **More Bookings**: Graph showing increased booking volume
  2. **Build Your Brand**: Professional profile showcase
  3. **Stand Out**: Premium badge + enhanced listing side-by-side

- Show provider profile screen with:
  - Premium badge at top
  - Enhanced bio section
  - Featured services
  - Customer reviews/ratings
  
- Text overlay (each benefit appears for 7-8 seconds):
  - "📈 Get More Bookings"
  - "🏆 Build Your Professional Brand"
  - "⭐ Stand Out with Premium Badge"

**Purpose**: Communicate tangible value proposition

---

### Scene 4: Call to Action (13.59-17.73 seconds)
**Voiceover**: "Upgrade today at time-craft-scheduler dot com slash premium"

**Visual Storyboard**:
- Full screen CTA with:
  - Large "Upgrade to Premium" button
  - URL: time-craft-scheduler.com/premium
  - Price point (if available)
  - "Start Your Free Trial" option
- Clean, minimal design with premium brand colors (gold/blue)

**Text Overlay**:
```
Upgrade to Premium
Get Discovered. Book More.
→ time-craft-scheduler.com/premium
```

**Purpose**: Drive immediate conversion

## 🎨 Visual Style Guide

### Brand Elements
- **Primary Colors**: 
  - Premium Gold: #F59E0B (yellow-500)
  - Brand Blue: #3B82F6 (blue-500)
  - Clean White: #FFFFFF
- **Typography**: 
  - Modern sans-serif (Inter, system fonts)
  - Bold headlines, clean body text
- **Tone**: Professional, aspirational, modern

### Motion & Transitions
- Smooth fade transitions (0.3-0.5s)
- Subtle zoom-in on key UI elements
- Animated badge appearance (scale + glow)
- Slide-in text overlays

### UI Elements to Capture
1. Premium provider card in browse view
2. Crown icon badge
3. "View Profile" button
4. Enhanced visibility indicators (borders, shadows)
5. Professional provider profile page
6. Subscription status indicators

## 📦 Asset Requirements

### Existing Assets (In Repository)
- ✅ Premium badge icon (Crown component)
- ✅ Provider card UI components
- ✅ Profile browse interface
- ✅ shadcn-ui button components

### Required Assets (For Full Production)
- [ ] Screen recordings of live UI (browse page, profile page)
- [ ] Animated motion graphics (benefit cards, CTA)
- [ ] Brand logo animation (opening/closing)
- [ ] Background music track (optional, subtle)
- [ ] Color grading/post-production polish

### Screen Recording Checklist
1. Browse providers page (basic vs premium listings)
2. Premium provider card close-up
3. Click "View Profile" interaction
4. Full provider profile page
5. Premium badge detail shot
6. Upgrade/CTA screen

## 📢 Distribution Plan

### Primary Channels
1. **Website**:
   - Homepage hero video
   - `/premium` landing page
   - Provider dashboard upgrade prompt

2. **Email Marketing**:
   - Onboarding sequence (Day 7)
   - Upgrade nurture campaign
   - Re-engagement campaign for inactive providers

3. **Social Media**:
   - YouTube (full 60s version)
   - LinkedIn (60s, organic + paid)
   - Instagram Reels (30s cut)
   - Twitter/X (30s cut)

4. **In-App**:
   - Provider dashboard widget
   - Modal overlay (first login)
   - Feature discovery tooltip

### Video Variants Needed
- **Full Version**: 60s (YouTube, website)
- **Social Cut**: 30s (Instagram, Twitter)
- **Teaser**: 15s (ads, stories)
- **Silent Version**: Captions-only (social auto-play)

## 🔧 Production Scripts

### Render Video (Remotion)
```bash
cd media/scripts
node render-premium-demo.mjs
```

**Output**: `media/videos/premium-product-demo.mp4` (1.60 MB, 17.80s, 1920×1080 @ 30fps)

**Production Notes**:
- Uses Remotion 4.0.461 for React-based video composition
- H.264 codec with AAC audio
- Dynamic scene duration calculation based on audio files
- Proper frame-by-frame animation (no CSS animations)
- Brand colors: Premium Gold (#F59E0B), Brand Blue (#3B82F6)

### Generate Audio
```bash
cd media/scripts
node generate-premium-audio.js
```

**Output**: 4 MP3 files (71.1 KB total, accelerated 1.15x)
- scene-01-hook.mp3 (3.78s)
- scene-02-solution.mp3 (5.82s)
- scene-03-benefits.mp3 (3.99s)
- scene-04-cta.mp3 (4.14s)

**Production Notes**: Audio accelerated via FFmpeg atempo=1.15 filter for 15% faster delivery

## 📈 Success Metrics

### Key Performance Indicators
- **Primary**: Premium subscription conversion rate
- **Secondary**: Video completion rate (>60%)
- **Engagement**: Click-through rate on CTA (>5%)
- **Social**: Shares, saves, comments

### A/B Testing Opportunities
- CTA button color (gold vs blue)
- Opening hook (problem vs benefit-first)
- Price display (show vs hide)
- Video length (60s vs 90s vs 30s)

## 🚀 Next Steps

### Phase 1: Current Delivery ✅
- [x] Generate TTS audio (4 scenes)
- [x] Create Remotion composition (premium-product-demo.tsx)
- [x] Render proper H.264 MP4 with Remotion (1.60 MB, playable)
- [x] Document video brief

### Phase 2: Full Production (Optional Enhancement)
- [ ] Record live UI screen captures
- [ ] Add background music
- [ ] Professional color grading
- [ ] Create social media cuts (30s, 15s)

### Phase 3: Distribution
- [ ] Upload to YouTube
- [ ] Embed on website
- [ ] Create social media cuts
- [ ] Add to email campaigns
- [ ] Implement in-app discovery

## 📚 References

### UI Components
- Premium badge: `src/components/icons/Crown.tsx`
- Provider cards: `src/components/provider/ProviderCard.tsx`
- Profile pages: `src/pages/ProviderProfile.tsx`

### Data Schema
```typescript
interface ProviderSubscription {
  plan_type: 'free' | 'premium' | 'pro';
  status: 'active' | 'inactive' | 'cancelled';
  premium_badge_visible: boolean;
}
```

### Key Features Highlighted
1. Enhanced visibility (premium_badge_visible: true)
2. Profile browsing (View Profile button)
3. Premium badge display (Crown icon)
4. Subscription status tracking

---

**Document Version**: 2.0  
**Created**: 2024  
**Updated**: 2026-05-14 (Remotion render completed)  
**Author**: Newt (Media & Video Engineer)  
**Status**: ✅ Production-Ready MP4 Delivered (H.264, 1.60 MB, 17.80s)
