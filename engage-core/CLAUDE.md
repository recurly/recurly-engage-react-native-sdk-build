# CLAUDE.md — engage-core

Platform-agnostic TypeScript library that powers `@recurly/engage-react-native`. Published as `@recurly/engage-core`.

## Commands

```bash
# Build (outputs to dist/)
npm run build

# Pack for local inspection
npm run pack
```

Build uses `tsc` directly (no bundler). Output goes to `dist/` as plain JS + `.d.ts` files.

## Source Files

| File | Role |
|---|---|
| `src/types.ts` | All shared types and enums: `PathItem`, `Action`, `PromptResult`, `PromptResultCode`, `PathType`, `DeviceInfo`, `ModalParameters`, `VideoModalParameters`, `InlineParams`, `Prompt`, `LocalStorage`, etc. |
| `src/PromptCore.ts` | Main business logic class. Handles ping loop, path matching, suppression, holdout, param extraction, and the `Prompt` object factory. Also exports free functions: `extractModalParams`, `extractVideoModalParams`, `extractInlineParams`, `preparePromptResult`, `decodeDeeplink`. |
| `src/PromptApi.ts` | HTTP layer. Wraps all REST calls to `https://conduit.redfast.com`: `ping`, `impression`, `dismiss`, `goal`, `holdout`, `goalResetAll`, `customTrack`. Manages ETag caching and anonymous user ID. |
| `src/localStorageUtils.ts` | `LocalStorageUtils` wrapper around the injected `LocalStorage` interface. Manages overlay suppression keys (`createNewOverlayKey`, `isOverlayEnabled`, `reset`, `dump`). |
| `src/index.ts` | Re-exports everything public. |

## Architecture

### PromptCore

Instantiated with `(appId, userId, device: DeviceInfo, localStorage: LocalStorage)`. Starts a ping loop immediately on construction.

Key methods:
- `onScreenChanged(screenName)` — updates current screen, returns `CandidatePathItem` (matched path + delay, or a result code)
- `onButtonClicked(clickId)` — same as above but triggered by a click element
- `onInlineClicked(pathId, actionGroupId)` — fires `goal` for an inline zone tap
- `onInlineViewed(pathId, actionGroupId)` — fires `impression` for an inline zone view
- `getInlines(type)` — returns matching inline `PathItem[]` by zone id / `InlineType`
- `getPrompt(id)` / `getPrompts(type, zoneId?)` / `getTriggerablePrompts(...)` — return `Prompt` objects with bound API call methods
- `getMeta()` — merges `rf_metadata` from all `INVISIBLE` paths into one object
- `customTrack(customFieldId)` — fires a custom tracking event
- `resetGoal()` — clears local suppression keys and calls `goalResetAll` on the server
- `enablePrompt(enabled)` — gates all prompts on/off
- `setUserId(userId)` / `getUserId()`
- `setPrivacyConsentCategories(categories)` / `getPrivacyConsentCategories()` — gates prompt eligibility by `PrivacyConsentCategory`; see below

### Param extraction functions

| Function | Purpose |
|---|---|
| `extractModalParams(path, screenW, screenH)` | Parses `Action` fields into a typed `ModalParameters` object |
| `extractVideoModalParams(path, screenW, screenH)` | Extends `extractModalParams` with video-specific fields → `VideoModalParameters` |
| `extractInlineParams(path, os, deviceType)` | Parses tile/inline zone fields → `InlineParams` |
| `preparePromptResult({ code, path, value, meta })` | Builds a `PromptResult` with `promptMeta` populated from `PathItem` |
| `decodeDeeplink(deeplinkString)` | Parses `key=value&...` deeplink string into a plain object |

### LocalStorageUtils suppression intervals

`createNewOverlayKey(pathId, disabledInterval)` stores `"<unix_ts>,<interval>"`. Interval values:
- `-1` → `INF` (permanently suppressed)
- `-2` → `VISIT` (suppressed for the session)
- `N` → suppressed for `N * 60` seconds

### PathType enum

`MODAL=2`, `VIDEO=6`, `INTERSTITIAL=10`, `BOTTOM_BANNER=13`, `INVISIBLE=1`, `ALL=-1`, and others.

### PromptResultCode enum

Error range: `ERROR=-100`, `NOT_APPLICABLE=-101`, `DISABLED=-102`, `SUPPRESSED=-103`.
Interaction range: `IMPRESSION=100`, `BUTTON1=101`, `BUTTON2=102`, `BUTTON3=103`, `DISMISS=110`, `TIMEOUT=111`, `HOLDOUT=120`.

### Privacy consent filtering

`PathItem.consent_categories?: string[]` (configured in Pulse) is matched against the categories set via `setPrivacyConsentCategories(categories: PrivacyConsentCategory[])`. `matchPrivacyConsentCategories(path)` (private) is called from `getPath()` (screen/click triggering), `getInlines()`, `path2Prompt()`/`getPrompts()`:
- No categories set (`privacyConsentCategories === undefined`) → every path matches (filtering is off by default).
- Categories set → a path matches only if its `consent_categories` is an exact set match (same length, same values, order-independent) of the configured categories. A path with no `consent_categories` never matches once categories are set.
- In `getPath()`, a path blocked by consent (or holdout/suppression) doesn't short-circuit the whole lookup — it falls back to `NOT_APPLICABLE` and the loop continues to the next candidate path.
- `PrivacyConsentCategory` enum (`strictlyNecessary`, `performance`, `functional`, `targeting`) lives in `types.ts`.

## Key Conventions

- `LocalStorage` is an interface injected by the host (React Native, web, etc.) — never imported from a concrete module.
- All `PromptCore` public methods swallow exceptions and return a typed error result (`PromptResultCode.ERROR`) rather than throwing.
- Ping uses ETag caching; a `304` response means no change and returns `null`.
- Ping interval starts at 60 s, doubles on error, caps at `MaxPingBackoffSeconds` (3084 s ≈ 51 min).
- `rf_settings_timeout_interval` values: `INF`, `VISIT`, or a number (minutes).
