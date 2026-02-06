# Black Times - 4X Space Strategy Game

## Overview
A browser-based 4X space strategy game built with TypeScript, Three.js, and vanilla CSS. Players explore a procedurally generated galaxy, colonize planets, research technology, build fleets, engage in diplomacy, and compete for victory.

## Tech Stack
- **Language**: TypeScript
- **Rendering**: Three.js (WebGL)
- **Build**: Vite
- **Styling**: Vanilla CSS (custom properties / design tokens)
- **Architecture**: Event-driven (EventBus), service-oriented

## Current Features
- Splash screen with animated particle background
- Main menu with New Game / Load Game / Settings
- New game setup with race selection and lore display (8 playable races)
- Procedural galaxy generation (spiral, elliptical, ring shapes)
- Star system view with planet rendering
- Colony management (population, buildings, build queue)
- Research tree (6 tech categories)
- Ship design system (4 hull sizes, modular components)
- Fleet management and movement via warp lanes
- Auto-resolved combat system
- Diplomacy (treaties, proposals, war/peace)
- 4 victory conditions (Conquest, Diplomatic, Technological, Score)
- AI opponents with personality-driven behavior
- Save/Load system (localStorage)
- Settings screen (graphics, hotkeys)
- Toast notification system

## Completed Tasks
- [x] Race Lore & Identity System (8 races with full lore, traits, leaders, visuals)
- [x] Race selection UI in New Game Setup
- [x] AI players use proper race data
- [x] Lore Intro Screen (cinematic story crawl between New Game and Galaxy view)
- [x] Build menu animation fix (GPU-accelerated scale+fade, backdrop overlay)
- [x] Anti-aliasing graphics option (toggle in Settings, renderer recreation)
- [x] Frustum culling for stars (50-70% draw call reduction when zoomed in)
- [x] LOD system for stars (3 detail levels based on camera distance)
- [x] Fleet icon instancing (single draw call for all fleet icons)
- [x] Planet name labels in system view (size-aware positioning below planets)
- [x] Fog of War & Galaxy Exploration (home star + 2 hops visible, fleets reveal)
- [x] Camera zoom to home star on first galaxy entry

## Next Up (Recommended)
- [ ] Random Event System (mid-game narrative events with player choices)
- [ ] Turn Summary Screen (end-of-turn report)
- [ ] Combat Reports (post-battle overlay with narrative)
- [ ] Fleet Management Screen (ViewMode.FLEET exists but has no UI)
- [ ] Planet Special Resources integration (existing data, unused in gameplay)
- [ ] Encyclopedia / Codex Screen
- [ ] UI debouncing for Colony screen (reduce re-renders on slider changes)
