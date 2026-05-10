---
name: ChineseLearning
description: A tactile, modern calligraphy studio for HSK learners.
colors:
  primary: "#7e480a"
  primary-hover: "#3a1b00"
  neutral-bg: "#efe7db"
  neutral-surface: "#faf6f0"
  text: "#3a1b00"
  text-muted: "#be9672"
  border: "#c8ac89"
  success: "#16a34a"
  reward-gold: "#ca8a04"
  reward-vibrant: "#7e22ce"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.1
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "8px"
  md: "12px"
  lg: "20px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "8px 20px"
  card:
    backgroundColor: "{colors.neutral-surface}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: ChineseLearning

## 1. Overview

**Creative North Star: "The Calligraphy Workshop"**

ChineseLearning is designed as a modern, tactile studio for the digital calligrapher. It balances the focused minimalism of a clean workspace with the creative warmth of traditional learning tools. The interface avoids the sterile feel of "AI-generated" templates and the dry rigidity of academic portals, opting instead for a natural, encouraging experience that celebrates the beauty of Hanzi.

**Key Characteristics:**
- **Studio Warmth**: A grounded palette of parchment and timber that feels inviting and premium.
- **Tactile Feedback**: Surfaces that respond to interaction with physical-feeling motion and depth.
- **Rewarding Clarity**: Minimalist learning views that burst into vibrant color and motion to celebrate student progress.
- **Focused Simplicity**: A reduction of cognitive load through generous spacing and restrained information density.

## 2. Colors

The palette is anchored in natural materials—ink, wood, and parchment—supplemented by a vibrant "Reward Palette" for celebration.

### Primary
- **Gilded Timber** (#7e480a / oklch(41.4% 0.088 64)): The primary accent used for active states, primary actions, and brand presence. It evokes the warmth of polished wood.

### Neutral
- **Soft Sand** (#efe7db): The global background color, providing a warm, low-strain canvas for long study sessions.
- **Studio White** (#faf6f0): The surface color for cards and elevated containers, offering subtle contrast against the background.
- **Deep Ink** (#3a1b00): The primary text color, ensuring high legibility with a softer edge than pure black.

### Reward Palette
- **Achievement Gold** (#ca8a04): Used for mastery states and high-tier rewards.
- **Creative Pulse** (#7e22ce): A vibrant purple for discovery and "Aha!" moments.

**The Rarity Rule.** Vibrant reward colors are forbidden in the standard learning UI. They appear only as a response to achievement, ensuring they remain meaningful and "special."

## 3. Typography

**Display Font:** Inter (system-ui)
**Body Font:** Inter (system-ui)

**Character:** Clean, modern, and highly legible. The system relies on weight contrast and generous line height to create hierarchy without needing multiple typefaces.

### Hierarchy
- **Display** (700, clamp(2rem, 5vw, 3.5rem), 1.1): Used for hero headlines and major section titles.
- **Title** (600, 1.25rem, 1.3): Used for card headers and modal titles.
- **Body** (400, 16px, 1.5): The standard for all learning content and instructional text.
- **Label** (500, 0.75rem, 1, uppercase): Used for chips, small badges, and secondary metadata.

## 4. Elevation

The system is **Tactile & Bouncy**. Depth is structural, used to signify interactivity and create a physical sense of "pressing" or "lifting" surfaces.

### Shadow Vocabulary
- **Studio Shadow** (`0 4px 12px rgba(58, 27, 0, 0.1)`): The default state for cards and interactive containers.
- **Lifted State** (`0 12px 24px -10px rgba(58, 27, 0, 0.2)`): Used on hover to create a "bouncy" sense of elevation.

**The Response Rule.** Surfaces are never elevated without purpose. Elevation is a response to user focus or interaction, reinforcing the tactile nature of the "Workshop."

## 5. Components

### Buttons
- **Shape:** Rounded (8px radius)
- **Primary:** Gilded Timber background with white text. High-contrast and confident.
- **Hover:** Deepens to Deep Ink with a subtle scale-up transition.

### Cards
- **Corner Style:** Large radii (20px)
- **Background:** Studio White with a Gilded Timber border (1px).
- **Behavior:** Should use the "Bouncy" hover effect, translating -4px on the Y-axis.

### Progress Indicators
- **Style:** Uses Gilded Timber for tracks, but switches to Achievement Gold or Creative Pulse upon completion or mastery.

## 6. Do's and Don'ts

### Do:
- **Do** use large, generous border radii (20px) for main content containers to maintain a friendly, soft feel.
- **Do** use `var(--color-bg)` for the global background to maintain the "Soft Sand" warmth.
- **Do** celebrate success with the "Success Pop" animation and Reward Palette.

### Don't:
- **Don't** use pure black (#000) or pure white (#fff); always use Deep Ink and Studio White.
- **Don't** use "SaaS-cliché" gradient text or glassmorphism as a default; keep the studio feel grounded.
- **Don't** use small, "cramped" line heights (keep body at 1.5).
- **Don't** use academic or government-style "cluttered" grids; prioritize whitespace.
