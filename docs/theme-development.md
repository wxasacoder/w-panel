# W-Panel Theme Development Guide

## Overview

W-Panel uses a CSS-variable-based theme system. Each theme defines a set of CSS custom properties that control the visual appearance of cards, groups, text, and effects. Themes can be built-in or installed as external packages.

## Theme Architecture

Themes work by overriding CSS custom properties on the `:root` element. When a user selects a theme, W-Panel applies the corresponding set of variables, and all components automatically update their appearance.

## CSS Variables Reference

### Card Appearance

| Variable | Description | Example |
|----------|-------------|---------|
| `--card-bg` | Card background color/opacity | `rgba(255, 255, 255, 0.12)` |
| `--card-border` | Card border style | `1px solid rgba(255, 255, 255, 0.25)` |
| `--card-shadow` | Card box-shadow | `0 8px 32px rgba(0, 0, 0, 0.12)` |
| `--card-radius` | Card border radius | `20px` |
| `--card-backdrop-blur` | Backdrop blur amount | `40px` |
| `--card-hover-transform` | Transform on card hover | `translateY(-2px) scale(1.02)` |
| `--card-hover-shadow` | Shadow on card hover | `0 12px 40px rgba(0, 0, 0, 0.18)` |

### Typography & Colors

| Variable | Description | Example |
|----------|-------------|---------|
| `--group-title-color` | Group heading text color | `rgba(255, 255, 255, 0.9)` |
| `--group-title-font` | Group heading font shorthand | `600 1.1rem -apple-system, sans-serif` |
| `--text-primary` | Primary text color | `rgba(255, 255, 255, 0.95)` |
| `--text-secondary` | Secondary/muted text color | `rgba(255, 255, 255, 0.6)` |
| `--accent-color` | Primary accent color | `#007AFF` |

### Background & Effects

| Variable | Description | Example |
|----------|-------------|---------|
| `--bg-overlay` | Background overlay color | `rgba(0, 0, 0, 0.15)` |
| `--glass-reflection` | Glass reflection gradient overlay | `linear-gradient(135deg, ...)` or `none` |

### User-Controlled Variables

These are set by the user through the Settings panel and should be respected by themes:

| Variable | Description |
|----------|-------------|
| `--user-card-opacity` | User-defined card opacity (0-1) |
| `--user-blur-level` | User-defined blur level |

## Creating a Theme

### 1. Theme Structure

A theme is a TypeScript/JavaScript module that exports a `ThemeVars` object:

```typescript
// my-theme/index.ts
export const themeVars = {
  '--card-bg': 'rgba(255, 255, 255, 0.12)',
  '--card-border': '1px solid rgba(255, 255, 255, 0.25)',
  '--card-shadow': '0 8px 32px rgba(0, 0, 0, 0.12)',
  '--card-radius': '20px',
  '--card-backdrop-blur': '40px',
  '--card-hover-transform': 'translateY(-2px) scale(1.02)',
  '--card-hover-shadow': '0 12px 40px rgba(0, 0, 0, 0.18)',
  '--group-title-color': 'rgba(255, 255, 255, 0.9)',
  '--group-title-font': "600 1.1rem -apple-system, sans-serif",
  '--text-primary': 'rgba(255, 255, 255, 0.95)',
  '--text-secondary': 'rgba(255, 255, 255, 0.6)',
  '--bg-overlay': 'rgba(0, 0, 0, 0.15)',
  '--accent-color': '#007AFF',
  '--glass-reflection': 'none',
}

export const themeInfo = {
  id: 'my-custom-theme',
  name: 'My Custom Theme',
  description: 'A beautiful custom theme',
  author: 'Your Name',
}
```

### 2. Theme Registration

To register a built-in theme, add it to `frontend/src/composables/useTheme.ts`:

```typescript
import { themeVars as myThemeVars } from '../themes/my-theme'

const themes: Record<string, ThemeVars> = {
  'liquid-glass': liquidGlassVars,
  'flat': flatVars,
  'my-custom-theme': myThemeVars,  // Add here
}
```

And register the theme info in `internal/themes/themes.go`:

```go
var builtInThemes = []ThemeInfo{
    // ... existing themes
    {
        ID:          "my-custom-theme",
        Name:        "My Custom Theme",
        Description: "A beautiful custom theme",
        Author:      "Your Name",
        BuiltIn:     true,
    },
}
```

## Example: Dark Neon Theme

Here's a complete example of a dark neon-style theme:

```typescript
export const darkNeonVars = {
  '--card-bg': 'rgba(15, 15, 35, 0.85)',
  '--card-border': '1px solid rgba(100, 100, 255, 0.2)',
  '--card-shadow': '0 4px 24px rgba(80, 80, 255, 0.1), inset 0 1px 0 rgba(100, 100, 255, 0.15)',
  '--card-radius': '16px',
  '--card-backdrop-blur': '30px',
  '--card-hover-transform': 'translateY(-3px)',
  '--card-hover-shadow': '0 8px 32px rgba(80, 80, 255, 0.2), inset 0 1px 0 rgba(100, 100, 255, 0.25)',
  '--group-title-color': 'rgba(180, 180, 255, 0.9)',
  '--group-title-font': "700 1.1rem 'JetBrains Mono', monospace",
  '--text-primary': 'rgba(220, 220, 255, 0.95)',
  '--text-secondary': 'rgba(150, 150, 200, 0.6)',
  '--bg-overlay': 'rgba(5, 5, 20, 0.7)',
  '--accent-color': '#7C5CFF',
  '--glass-reflection': 'linear-gradient(135deg, rgba(100,100,255,0.1) 0%, transparent 50%)',
}
```

## Tips

1. **Test with both light and dark backgrounds** - Users can upload custom background images
2. **Respect user opacity settings** - Cards use `--user-card-opacity` set by the user
3. **Glass reflection** - Set to `none` for non-glass themes, use a gradient for glass effects
4. **Performance** - Heavy `backdrop-filter` values can impact performance on lower-end devices; consider using lighter blur values
5. **Accessibility** - Ensure sufficient contrast between text and card backgrounds
