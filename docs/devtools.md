# Dev Tools — React Native

> **INTERNAL — DO NOT PUBLISH.** Engineering-only documentation for the Expo example app. Dev Tools is not part of the published npm packages (`@recurly/engage-core`, `@recurly/engage-react-native`) and must never appear on the public docs site. Do not copy default app/user id literals from `DevSettings.ts` into any externally shared material.

---

## Overview

Dev Tools is a testing panel built into the **Expo example app** (`example/`) that lets QA and engineering exercise SDK behavior without touching source code:

- Override the SDK config (`appId`, `userId`, API environment) at runtime
- Fire any configured prompt on demand (by list selection or raw path id)
- Preview inline prompts by zone id
- Simulate `screenChanged` / `buttonClicked` triggers
- Preview what prompt (if any) targets an arbitrary screen name via a blank screen

The panel itself lives entirely in the example app (`example/src/`). It is **not** present in `example-tv/` or `example-vega/`. The only SDK-side dependency is the optional `baseUrl` parameter (see [SDK changes](#sdk-changes)).

---

## Accessing the panel

The Home screen has an **"Open Dev Tools" footer button** that calls `navigation.navigate('DevTools')`. `DevTools`, `DevInlinePreview`, and `DevBlankScreen` are ordinary screens registered in the stack navigator (`app.tsx`).

---

## Panel sections

`DevToolsScreen` is a `ScrollView` with five sections:

### 1. SDK Config
- Read-only display of the **active App ID** (what `effectiveAppId(settings)` resolves to for the current form state, including unsaved edits; shows `…` until `promptMgr` exists)
- `App ID override` / `User ID override` text inputs — empty means "use the `DefaultAppId` / `DefaultUserId` constants from `DevSettings.ts`"
- Environment toggle buttons — **production** / **staging** (`DevEnvironment`). `baseUrlForEnvironment` maps the enum to a base URL: production passes `undefined` (SDK built-in default), staging passes the internal staging URL, which lives only in `DevSettings.ts`
- **Save and restart** — persists overrides, alerts with the effective IDs + environment, then on OK calls the `DevRestartContext` restart callback
- **Clear overrides** — removes the stored settings, reloads defaults into the form, alerts with the default App ID, then on OK restarts the SDK

### 2. Show Prompt
- **Refresh list** queries `promptMgr.getPrompts(type)` for `MODAL`, `INTERSTITIAL`, `BOTTOM_BANNER`, `HORIZONTAL` (via the `PROMPT_TYPES` table, which also supplies the badge colors), sorted by prompt name. The list is also loaded automatically when `promptMgr` becomes available
- Each row shows a type badge, prompt name, and prompt id; tapping fires it via `promptMgr.showPrompt(prompt)`
- A **HORIZONTAL** prompt with an `rf_settings_zone_id` navigates to the inline preview instead
- **Show prompt by id** input + **Show** button: paste a raw path id to fire it via `promptMgr.getPrompt(id)`; unknown ids show a "Prompt not found" alert

### 3. Inline Preview
- Zone id input + **Preview** → `DevInlinePreviewScreen`
- Inline prompts render directly in the view hierarchy (not via `PromptOverlay`), so they can't be fired like modal prompts; the preview screen embeds `RecurlyInline` with `key={zoneId}` exactly as a real screen would, and logs each `onEvent` result to the console (tagged `source: 'dev-inline-preview'`)

### 4. Simulate Trigger
- **Fire screenChanged** — calls `promptMgr.screenChanged(screenName)`
- **Fire buttonClicked** — calls `promptMgr.buttonClicked(buttonId)`

Both take effect immediately; matched prompts render through the app's `PromptOverlay`. Empty inputs are ignored.

### 5. Test Screen (Blank screen)
Named **Blank screen** in the UI.
- Screen-name input + **Open** → `DevBlankScreen`
- The blank screen fires `promptMgr.screenChanged(screenName)` on mount, so any prompt configured for that screen name renders over it

---

## Persistence & restart

**Persistence:** `AsyncStorage`, single JSON key `@recurly/example/dev-settings` holding `{ appIdOverride, userIdOverride, environment }`. `loadDevSettings` / `saveDevSettings` / `clearDevSettings` handle storage (load falls back to empty defaults on a missing key or parse error); `effectiveAppId` / `effectiveUserId` apply the trim-and-fall-back-to-default logic. Only the SDK Config section persists; everything else is transient.

**Restart semantics — unique to RN:** the native SDKs require a full app relaunch after a config change, but React Native can remount. "Save and restart" calls the `restartSdk` function provided through `DevRestartContext` (`app.tsx`), which:

1. Reloads the persisted settings
2. Bumps an `instanceKey`, remounting `<PromptProvider key={instanceKey}>` with the new `appId` / `userId` / `baseUrl`

`PromptProvider`'s remount constructs a fresh `PromptManager` — a hot SDK restart with no app relaunch. `App` renders nothing until the initial settings load completes. Prompt firing / trigger simulation / inline preview need no restart at all.

---

## SDK changes

No Dev Tools-specific code lives in the SDK. The one SDK-side hook it relies on is the optional `baseUrl` argument, threaded `PromptProvider` prop → `PromptManager` constructor → `PromptCore` constructor → `PromptApi` (`this.baseUrl = baseUrl ?? BaseUrl`). Omitted means the built-in default. Everything else Dev Tools calls is existing public API (see [`api.md`](./api.md)).

---

## File map

| File | Role |
|---|---|
| `example/src/DevToolsScreen.tsx` | The panel (5-section ScrollView) |
| `example/src/DevSettings.ts` | AsyncStorage persistence, defaults, `DevEnvironment` + `baseUrlForEnvironment`, effective-value helpers |
| `example/src/DevBlankScreen.tsx` | Blank preview screen firing `screenChanged` on mount |
| `example/src/DevInlinePreviewScreen.tsx` | `RecurlyInline` zone preview screen |
| `example/src/app.tsx` | Stack registration, `DevRestartContext`, `PromptProvider` remount-on-restart |
| `example/src/home.tsx` | "Open Dev Tools" entry point |
| `example/src/types.ts` | Navigation prop / route param types for the Dev screens |
| `src/PromptManager.tsx`, `engage-core/src/PromptCore.ts`, `engage-core/src/PromptApi.ts` | Optional `baseUrl` plumbing |

SDK APIs exercised: `getPrompts(type)`, `getPrompt(id)`, `showPrompt(prompt)`, `screenChanged(screen)`, `buttonClicked(id)`, `RecurlyInline`, `PromptOverlay`.

Unrelated: `example/src/DevMenu.tsx` ("Dev: Consent Categories" on the Home screen) is a separate debug panel that toggles `PrivacyConsentCategory` values at runtime and re-fires `screenChanged`. It is not part of Dev Tools and is not persisted.

---

## Troubleshooting

- **Prompt list empty ("No prompts loaded yet.")** — `promptMgr` isn't ready or has no prompts for the current config; check the App ID/environment, then tap **Refresh list**.
- **"Prompt not found"** — `getPrompt(id)` returned null for that id under the active App ID/environment.
- **Settings edits have no effect** — they only apply after **Save and restart** (and tapping OK in the alert).
- **Inline preview shows nothing** — the zone id must match an `rf_settings_zone_id` for the active config; events are logged to the console.
- **Settings look corrupt** — **Clear overrides** removes the storage key.
