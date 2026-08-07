# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
yarn install

# Build engage-core first, then the RN SDK
yarn build

# Run tests
yarn test

# Run a single test file
yarn test src/__tests__/index.test.tsx

# Type check
yarn typecheck

# Lint
yarn lint

# Clean built output
yarn clean

# Run mobile example app (starts Metro)
yarn example

# TV example apps
yarn tv:prebuild     # only needed first time
yarn tv:android
yarn tv:tvos

# Release (bumps version, tags, publishes)
yarn release
```

The library is built with `react-native-builder-bob` (`yarn prepare` / `bob build`), outputting CommonJS, ESM, and TypeScript declaration files to `lib/`.

Publishing goes to the public npm registry (`https://registry.npmjs.org`). No authentication token is required to install the published packages.

## Architecture

This repo is a **Yarn workspace monorepo** with three main packages:

### 1. `engage-core/` — platform-agnostic business logic
Pure TypeScript library. Contains:
- `PromptCore` — base class with API calls, session logic, prompt filtering
- `PromptApi` — HTTP API layer (impressions, goals, dismiss, etc.)
- `localStorageUtils` — key-value storage abstraction (injected via constructor)
- `types.ts` — shared types: `PathItem`, `PromptResult`, `PromptResultCode`, `PathType`, `DeviceInfo`, etc.

Must be built (`npm run build` inside `engage-core/`) before the RN SDK, since the RN SDK depends on `@recurly/engage-core`.

### 2. `src/` — React Native SDK (`@recurly/engage-react-native`)
Builds on top of `engage-core`. Key files:

| File | Role |
|---|---|
| `PromptManager.tsx` | Extends `PromptCore`; detects device info; provides `PromptOverlay` render function |
| `usePrompt.tsx` | React context + reducer; holds `promptMgr`, `buttonFont`, `timerFont`, `legalTextFont` |
| `PromptDialog.tsx` | Modal dialog prompt type |
| `PromptInterstitial.tsx` | Full-screen interstitial prompt |
| `PromptBottomBanner.tsx` | Bottom banner prompt |
| `PromptVideoDialog.tsx` | Video modal prompt |
| `RecurlyInline.tsx` | Inline zone display (non-modal, embedded in app layout) |
| `Components.tsx` | Shared UI primitives: `CloseBar` (countdown timer + close button), `CustomButton`, `SafeAreaContainer` |
| `utils.ts` | `gDeviceInfo` global, `getImageCompositeFieldName`, `modalAlignment`, `logicPixelToDevicePixel` |
| `index.tsx` | Public exports for the SDK |

**Data flow:**
1. Host app creates a `PromptManager` (wraps `PromptCore`) and dispatches it via `PromptAction_Init` into `usePrompt` context.
2. `PromptOverlay` watches for a `PathItem`, applies a delay, then renders the correct prompt component based on `path_type` (`MODAL`, `BOTTOM_BANNER`, `INTERSTITIAL`, `VIDEO`).
3. Each prompt component reads params via `extractModalParams` from `@recurly/engage-core`, runs a countdown timer, calls `promptMgr.getApi()` for impression/goal/dismiss events, then calls `close(PromptResult)` to signal the host.

**Platform differences handled throughout the codebase:**
- `Platform.isTV` — hides the close button on TV; adds `marginRight` to the timer
- Amazon Fire TV runs as `Platform.OS === 'kepler'` — treated as `android_tv` with `tv` form factor
- `dp` normalizes TV pixel densities (Android TV ÷2, Apple TV ×1) to match Roku 1920×1080 coordinate space
- Background images are selected per device via `getImageCompositeFieldName()` which constructs field names like `rf_settings_bg_image_ios_iphone_2x_composite`

### 3. `example/`, `example-tv/`, `example-vega/` — example apps
- `example/` — standard React Native (Expo) mobile app
- `example-tv/` — Expo TV app (Apple TV / Android TV); uses `expo start` + Xcode for physical device
- `example-vega/` — Amazon Fire TV (Vega/kepler) example

## Key Conventions

- All prompt UI components receive `{ path: PathItem, close: (result: PromptResult) => void }` props.
- `PromptResult` always flows back through `preparePromptResult({ ...result, path })` before being passed to `close`.
- `promptMgr?.getLocalStorage().createNewOverlayKey(id, rf_settings_timeout_interval)` must be called before every `closeModal` that isn't an impression (dismiss, timeout, button press).
- Font overrides (`buttonFont`, `timerFont`, `legalTextFont`) come from `usePrompt()` state and are applied as `...(font ? { fontFamily: font } : {})`.
- `CloseBar` (in `Components.tsx`) is the shared component for the countdown timer + close button row. It accepts `params: ModalParameters | InlineParams`, a `close(reason)` callback, and an optional `external: ExternalStyles` override for colors/sizes. The close button is automatically hidden on `Platform.isTV`.
