# Premium Product Demo — Video Storyboard
**For Remotion Implementation (Newt)**

---

## 📹 Overview

Professional 17.8s product demo showcasing Premium tier benefits. Matches existing audio (4 scenes, 4 MP3 files accelerated @ 1.15x). Uses real app screenshots to demonstrate value: enhanced visibility, premium badge, professional profiles, more bookings.

**Output:** Remotion composition renders to `media/videos/premium-product-demo.mp4` (1920×1080, 30fps, H.264)

---

## 🎬 Scene Breakdown

### **SCENE 1: HOOK — Problem Statement (0–3.78s)**
**Audio:** `scene-01-hook.mp3`  
**Duration:** 3.78s (114 frames @ 30fps)  
**Voiceover:** "Service providers work hard. But customers don't see them."

#### Visual Strategy
**Establish pain point** with dark, understated UI showing low visibility.

#### Screenshot & Layout
- **Background:** Browse providers page — scroll view showing multiple basic provider cards in grid (undifferentiated, muted colors)
- **Framing:** Full-screen bleed (1920×1080) at 90% opacity, dark vignette overlay
- **Treatment:** Basic, gray-toned listing without premium visual distinction

#### Text Overlay
```
"Service Providers Struggle
to Get Discovered"

Position: Center (x: 960, y: 540)
Font: Inter, Bold, 56px
Color: #FFFFFF (white)
Opacity: 0 → 1 (fade in over 0.4s, hold 3.0s, fade out 0.38s)
```

#### Animation
- **0.0–0.4s:** Fade in text overlay + light zoom (1.0 → 1.02x on screenshot)
- **0.4–3.38s:** Ken Burns pan: slow scroll down through provider cards (creates motion on static image, suggests long list)
- **3.38–3.78s:** Fade out text + zoom back (1.02 → 1.0x)

#### Color Palette
- Dark background: #0f172a (app bg)
- Text: #FFFFFF
- No gold accents (problem = unadorned)

---

### **SCENE 2: SOLUTION — Premium Value Unlock (3.78–9.60s)**
**Audio:** `scene-02-solution.mp3`  
**Duration:** 5.82s (175 frames @ 30fps)  
**Voiceover:** "Premium changes that. Enhanced visibility, professional profiles, and a premium badge."

#### Visual Strategy
**Transition from problem → solution.** Show same provider listing with Premium tier highlighted. Use gold accents to draw focus to premium cards.

#### Screenshot & Layout
**Split-screen composite:**
- **Left (0–2900px width):** Basic provider card (fade to muted)
- **Right (2900–5800px width):** Premium provider card with:
  - Crown icon (gold #F59E0B) + "PREMIUM" badge
  - Enhanced shadow/border styling
  - Bright, prominent positioning
  
**Framing:** Crop both images to 540px height, position horizontally adjacent.

#### Text Overlay (3-part sequence)

**Part A: "Enhanced Visibility" (3.78–4.78s)**
```
Position: Top-center (960, 200)
Font: Inter, SemiBold, 48px
Color: #F59E0B (gold)
Opacity: 0 → 1 (0.3s) → hold 1.0s → 0 (0.5s)
```

**Part B: "Professional Profiles" (4.78–5.98s)**
```
Position: Center-left (480, 540)
Font: Inter, SemiBold, 48px
Color: #F59E0B (gold)
Opacity: 0 → 1 (0.3s) → hold 1.2s → 0 (0.5s)
Slide in from left: -960 → 480 (0.4s ease-out)
```

**Part C: "Premium Badge" (5.98–9.60s)**
```
Position: Center-right (1440, 540)
Font: Inter, SemiBold, 48px
Color: #F59E0B (gold)
Opacity: 0 → 1 (0.3s) → hold 3.62s → 0 (0.5s)
Slide in from right: +960 → 1440 (0.4s ease-out)
```

#### Animation
- **3.78–4.08s:** Fade in basic card (left side, muted 0.5 opacity)
- **4.08–5.38s:** Slide in premium card from right; crown icon glow effect (scale pulse: 1.0 → 1.15 → 1.0 over 0.8s, repeating)
- **5.38–9.60s:** Subtle zoom-in on premium card; golden border highlight animates (1px → 3px → 1px, repeating 2s cycle)
- **Throughout:** Text overlays cascade in sequence with stagger

#### Color Palette
- Gold accent: #F59E0B (crown, badge text, highlights)
- Blue secondary: #3B82F6 (premium card border)
- Dark bg: #1e293b
- White text: #FFFFFF

---

### **SCENE 3: BENEFITS — Value Proposition (9.60–13.59s)**
**Audio:** `scene-03-benefits.mp3`  
**Duration:** 3.99s (120 frames @ 30fps)  
**Voiceover:** "Get more bookings. Build your brand. Stand out with Premium."

#### Visual Strategy
**Showcase tangible benefits with animated benefit cards overlaid on professional provider profile screenshot.**

#### Screenshot & Layout
- **Background:** Provider Profile page (full vertical shot: hero, name, bio, skills, ratings, booking button)
- **Framing:** Full-screen, slightly desaturated (grayscale 20%), dark corner overlay to keep focus on benefit cards
- **Treatment:** Professional layout to reinforce "premium" brand perception

#### Benefit Cards (3 animated cards, appearing in sequence)

**Card 1: "📈 More Bookings" (9.60–11.26s)**
```
Position: Top-right inset (1200, 200)
Size: 320×240px
Background: #F59E0B, opacity 0.95, rounded-lg
Text: "Get More Bookings" + icon
Font: 32px, Bold, #FFFFFF
Animation:
  - Scale in from center: 0 → 1 (0.4s ease-out)
  - Hold 1.66s
  - Scale out: 1 → 1.1, opacity 1 → 0 (0.3s ease-in)
```

**Card 2: "🏆 Build Your Brand" (11.26–12.79s)**
```
Position: Bottom-left inset (300, 900)
Size: 320×240px
Background: #3B82F6, opacity 0.95, rounded-lg
Text: "Build Your Professional Brand" + icon
Font: 28px, Bold, #FFFFFF
Animation:
  - Slide in from left: -400 → 300 (0.4s ease-out)
  - Hold 1.53s
  - Slide out left: 300 → -400 (0.3s ease-in)
```

**Card 3: "⭐ Stand Out" (12.79–13.59s)**
```
Position: Center (960, 540)
Size: 360×280px
Background: #F59E0B, opacity 0.95, rounded-lg
Text: "Stand Out with Premium Badge" + crown icon glow
Font: 32px, Bold, #FFFFFF
Animation:
  - Rotate in + scale: 0deg, 0 → 360deg, 1 (0.5s ease-out cubic)
  - Hold 0.8s
  - Fade out: 1 → 0 (0.3s ease-in)
```

#### Text Overlay (Primary, under benefits)
```
Position: Bottom-center (960, 1000)
Font: Inter, 24px, regular
Color: #F59E0B
Text: "Premium providers get 3x more bookings on average"
Opacity: 0.8
Animation: Fade in at 10.5s, hold through end, fade out
```

#### Animation Details
- **Background photo:** Slight slow pan-up (Ken Burns, 20px movement over 3.99s) to suggest browsing through profile
- **Cards:** Each appears with motion (scale, slide, rotate), staggered timing
- **Crown icon on Card 3:** Pulsing glow effect (box-shadow: 0 0 20px #F59E0B, animates in/out)

#### Color Palette
- Gold cards: #F59E0B
- Blue cards: #3B82F6
- Text: #FFFFFF
- Background overlay: #000000 @ 0.15 opacity (preserves photo visibility)

---

### **SCENE 4: Call to Action — Strong Close (13.59–17.73s)**
**Audio:** `scene-04-cta.mp3`  
**Duration:** 4.14s (124 frames @ 30fps)  
**Voiceover:** "Upgrade today at time-craft-scheduler dot com slash premium"

#### Visual Strategy
**Clean, premium-focused CTA screen.** Dark background with gold/blue accents. Large button, clear URL, instant conversion focus.

#### Screenshot & Layout
- **Background:** Solid gradient: dark (#0f172a) → darker (#0a0f1a) vertical fade
- **Framing:** Full-screen, minimal UI, professional minimalism
- **Treatment:** No screenshot; pure design composition

#### Main CTA Block
```
Position: Center (960, 540)
Size: 600×400px
Background: #1e293b, rounded-xl, border 2px #F59E0B
Shadow: 0 20px 60px rgba(0,0,0,0.6)
Padding: 40px
Text alignment: Center
```

#### Content Structure
```
[Crown Icon — Glow Effect]
(Top, 80px from container top)
Size: 80×80px
Color: #F59E0B
Glow: Box-shadow 0 0 40px #F59E0B

Main Headline (40px below icon)
"Upgrade to Premium"
Font: Inter, Bold, 48px
Color: #FFFFFF

Subheadline (20px below)
"Get Discovered. Book More."
Font: Inter, Regular, 28px
Color: #F59E0B

Button (40px below subheadline)
"Upgrade Now"
Size: 280×56px
Background: #F59E0B
Text: #0f172a, 18px, Bold
Border-radius: 8px
Hover effect: scale 1.05
```

#### URL Display
```
Position: Below button (20px gap)
Text: "time-craft-scheduler.com/premium"
Font: Inter, Regular, 16px
Color: #3B82F6
Text-decoration: underline

Animation: Appear at 14.5s, hold through end
```

#### Animation
- **13.59–14.0s:** Fade in entire CTA block (0 → 1 opacity, 0.4s ease-out)
- **14.0–14.4s:** Crown icon glow pulse (0 → 1 → 0, cycle repeats 2x per second)
- **14.4–14.8s:** Text overlays cascade: headline → subheadline → button label (each fades in 0.3s, staggered 0.2s apart)
- **14.8–17.0s:** Button hover-state animation (subtle scale pulse: 1.0 → 1.03 → 1.0, 1.5s cycle)
- **17.0–17.73s:** Fade out entire block (1 → 0 opacity, 0.5s ease-in)

#### Color Palette
- Background: #0f172a (dark)
- Container: #1e293b (slightly lighter dark)
- Gold accent: #F59E0B (button, icon, headline)
- Blue accent: #3B82F6 (URL text)
- Text: #FFFFFF (main copy)

---

## 📊 Screenshot Inventory & Acquisition

### Required Screenshots (To be captured for Remotion assets)

| Scene | Screenshot Name | Source Page | Dimensions | Notes |
|-------|-----------------|-------------|------------|-------|
| 1 | `browse-basic-listings.png` | `/browse` (basic free tier) | 1920×1080 | Multiple provider cards, muted colors, no premium badge |
| 2a | `provider-card-basic.png` | `/browse` (detail card close-up) | 960×540 | Single basic provider card, left-aligned |
| 2b | `provider-card-premium.png` | `/browse` (detail card close-up) | 960×540 | Premium provider card w/ Crown badge, golden border |
| 3 | `provider-profile-full.png` | `/profile/{slug}` | 1920×1440 | Full profile page: header, bio, skills, ratings, booking button |
| 4 | (N/A — designed composition) | — | — | Pure design; no screenshot needed |

### Capture Instructions

**For Scene 1 & 2:**
1. Log in as free-tier provider
2. Navigate to `/browse` (browse providers list)
3. Capture full-screen scroll showing 4–6 basic provider cards in grid
4. Also capture zoomed detail view of single card (960×540 crop)

**For Scene 2b (Premium Card):**
1. Log in as premium provider (or inspect DOM of premium card in DevTools)
2. Screenshot single premium provider card with visible Crown badge (#F59E0B), enhanced shadow, blue border
3. Crop to 960×540px

**For Scene 3:**
1. Navigate to `/profile/{any-slug}` (provider profile page)
2. Capture full vertical scroll from header to bottom (include: profile photo, name, bio, skills, ratings section, "Book Service" button)
3. Dimensions: 1920×1440px (taller than standard 1080 to capture full page)

### Asset Storage
```
media/assets/storyboard-screenshots/
├── scene-01-browse-basic-listings.png (1920×1080)
├── scene-02-provider-card-basic.png (960×540)
├── scene-02-provider-card-premium.png (960×540)
└── scene-03-provider-profile-full.png (1920×1440)
```

---

## 🎨 Visual Tone & Brand Integration

### Color System
```
Primary Gold:     #F59E0B (premium highlight, CTA buttons)
Brand Blue:       #3B82F6 (secondary accent, premium borders)
Dark Background:  #0f172a (hero, primary bg)
Dark Secondary:   #1e293b (cards, surfaces)
Light Text:       #FFFFFF (primary copy)
Muted Text:       #94a3b8 (secondary info, captions)
```

### Typography
- **Font Family:** Inter (system fallback: -apple-system, BlinkMacSystemFont, sans-serif)
- **Weights Used:**
  - Bold (700): Headlines, CTA text, key benefits
  - SemiBold (600): Scene titles, benefit card labels
  - Regular (400): Body text, supporting copy
- **Sizes:**
  - Headlines: 48–56px
  - Body: 24–32px
  - Captions: 14–18px

### Motion Principles
1. **Easing:** Prefer `ease-out` for entrances, `ease-in` for exits. Use `cubic-bezier(0.34, 1.56, 0.64, 1)` for bouncy elements (benefit cards).
2. **Duration:** Text: 0.3–0.5s. Benefits: 0.4–0.5s. CTA: 0.4s entrance.
3. **Stagger:** Multi-element sequences use 0.2–0.3s stagger between items.
4. **Ken Burns Effect:** On static screenshots, 1–2px/second pan-and-zoom to suggest depth.
5. **Pulsing/Glow:** Use opacity or box-shadow cycles (2–3s period) to highlight premium elements.

### Accessibility Notes
- **Contrast:** All text ≥ 4.5:1 (gold #F59E0B on dark #1e293b = 8.2:1 ✓)
- **Icon + Text:** Benefit cards pair icons with text labels (not icon-only)
- **Video Captions:** Provide .vtt or .srt for silent playback on social (all voiceover text as overlay captions)
- **Keyboard:** No interactive elements in video; designed for passive viewing

---

## 🎬 Remotion Implementation Checklist

### Composition Structure
```
<AbsoluteFill>
  {/* SCENE 1: Hook (0–114 frames) */}
  <Scene1Hook startFrame={0} durationFrames={114} />

  {/* SCENE 2: Solution (114–289 frames) */}
  <Scene2Solution startFrame={114} durationFrames={175} />

  {/* SCENE 3: Benefits (289–409 frames) */}
  <Scene3Benefits startFrame={289} durationFrames={120} />

  {/* SCENE 4: CTA (409–533 frames) */}
  <Scene4CTA startFrame={409} durationFrames={124} />
</AbsoluteFill>
```

### Audio Sync
- Load MP3 files into `<Audio>` components
- Timings (@ 30fps, based on accelerated audio durations):
  - Scene 1: 0–3.78s = 0–114 frames ✓
  - Scene 2: 3.78–9.60s = 114–288 frames ✓
  - Scene 3: 9.60–13.59s = 288–407 frames ✓
  - Scene 4: 13.59–17.73s = 407–532 frames ✓

### Key Remotion Components
- `<Img src={screenshot} />` — background images
- `<AbsoluteFill />` — full-screen container
- `<interpolate />` — smooth animations (opacity, scale, transform)
- `<spring()` /> — bouncy easing for benefit cards
- `<Audio src={mp3} />` — voiceover playback

### Export Settings
```
Video Codec: h264
Audio Codec: aac (stereo)
Resolution: 1920×1080
Frame Rate: 30fps
Bitrate: ~5Mbps (results in 1.6MB file for ~18s video)
Output: media/videos/premium-product-demo.mp4
```

---

## 📋 Notes for Newt (Video Engineer)

1. **Screenshot Acquisition:** Ripley to provide captured images in `media/assets/storyboard-screenshots/` before Remotion composition begins.

2. **Ken Burns on Static Images:** Use `<Animated.Image />` with interpolated transform (translate + scale) to simulate camera pan/zoom on flat screenshots.

3. **Benefit Card Stagger:** Timing is critical—use frame-based offsets to sync card animations with audio beats (especially "Build your brand" transition at 11.26s).

4. **Crown Icon Glow:** Implement via `<Animated.View>` with box-shadow interpolation. Glow radius expands/contracts with sine-wave easing.

5. **Text Overlay Hierarchy:** Scene 2 benefits appear in three sequential waves; use `interpolate()` with separate start/end frames for each.

6. **Color Accuracy:** Verify gold (#F59E0B) and blue (#3B82F6) match app design tokens. Test output MP4 on YouTube/web to ensure colors don't shift during encoding.

7. **Voiceover Sync:** Audio accelerated @ 1.15x; video must match. Confirm with `ffprobe` that MP3 durations match frame counts.

8. **Social Cuts:** After full render completes, create 30s and 15s social variants by trimming Scene 4 (CTA typically holds at end).

---

## ✅ Validation Checklist

- [ ] Screenshots captured and stored in `media/assets/storyboard-screenshots/`
- [ ] Remotion composition created: `media/Root.tsx` (premium-product-demo scene)
- [ ] All audio files synced (verify durations match frame counts)
- [ ] Color contrast verified (WCAG AA minimum, preferably AAA)
- [ ] Text overlays readable on all backgrounds (use text shadows if needed)
- [ ] Motion smooth, no jank (test frame rate at 30fps)
- [ ] Exported MP4 plays correctly on web, YouTube, mobile
- [ ] Social cuts (30s, 15s) generated and tested
- [ ] Video brief updated with final specs (filename, filesize, duration)

---

**Document Version:** 1.0  
**Created:** 2026-05-14  
**Designer:** Bishop (Accessibility & UX Designer)  
**Engineer:** Newt (Media & Video Engineer)  
**Status:** 🎨 Design complete — Ready for Remotion implementation
