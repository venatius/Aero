# Aero

A touchless gesture-control app that lets you control presentations, music, or photos with hand gestures via webcam. Runs entirely locally in your browser or desktop app (no network calls at runtime).

## Gesture Cheat Sheet

| Action       | Gesture                      | Mode Support               |
|--------------|------------------------------|----------------------------|
| **Cycle Mode**| Closed Fist                 | All Modes                  |
| **Next/Right**| Swipe Right (Open Palm)     | Slides, Music, Photos      |
| **Prev/Left** | Swipe Left (Open Palm)      | Slides, Music, Photos      |
| **Play/Pause**| Palm Hold (Open Palm still) | Music                      |
| **Volume/Zoom**| Pinch & Drag (Thumb+Index) | Music (Vol), Photos (Zoom) |

## Monorepo Structure

- `packages/core`: The pure web code (MediaPipe vision, gesture state machine, Pill UI).
- `apps/desktop`: Electron app wrapper (uses Core, adds always-on-top overlay and OS key bindings).
- `apps/web`: Web/PWA demo (uses Core, installs as PWA).

## Running Locally

1. `npm install` at the root.
2. Core package demo: `npm run dev --workspace=@aero/core`
3. Web App demo: `npm run dev --workspace=@aero/web`
4. Desktop App: `npm run dev --workspace=@aero/desktop`

## Desktop App OS Setup

The desktop app requires certain tools or permissions depending on your OS to inject keystrokes:
- **macOS**: Prompts for Accessibility permissions on first use of AppleScript.
- **Windows**: Uses PowerShell (built-in).
- **Linux**: Requires `xdotool` for keystrokes and `playerctl` for media controls (X11). Wayland may limit global keystrokes.

## Building

Desktop builds (nsis, dmg, AppImage):
```bash
npm run dist --workspace=@aero/desktop
```
