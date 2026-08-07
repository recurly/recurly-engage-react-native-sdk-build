---
name: engage
description: Guide for integrating the Recurly Engage React Native SDK (V2). Use when the user asks about @recurly/engage packages, PromptProvider, PromptOverlay, RecurlyInline, screenChanged, buttonClicked, PromptResult, or any Recurly Engage SDK setup.
---

# SDK Integration Skill

This skill guides Claude when helping users integrate the Recurly Engage React Native SDK V2 (version 2.x.y) into their apps. The SDK ships as two packages:

- `@recurly/engage-core` — platform-agnostic business logic (ping loop, path matching, suppression, prompt factory)
- `@recurly/engage-react-native` — React Native UI layer (components, context, device detection)

Users only import from both packages directly; `engage-core` is a peer dependency that also exposes shared types.

---

## Installation

Published on the public npm registry — no registry config or token needed.

```bash
npm install @recurly/engage-core @recurly/engage-react-native
# or
yarn add @recurly/engage-core @recurly/engage-react-native
```

---

## Core Integration Pattern

### 1. Wrap the app with `<PromptProvider>`

Place `PromptProvider` at the outermost level, before any navigation or screen components. It creates a `PromptManager` instance and pushes it into React context via `usePrompt`.

```tsx
// index.tsx or App.tsx entry point
export default function App() {
  return (
    <PromptProvider appId="YOUR_APP_ID" userId="INITIAL_USER_ID">
      <AppRoot />
    </PromptProvider>
  );
}
```

### 2. Wait for initialization, then mount `<PromptOverlay>`

`PromptManager` starts a ping loop immediately. `isInitialized()` returns `true` once the first ping response arrives. Poll with `setInterval` and clear it once ready.

`<PromptOverlay>` must sit **at the bottom** of the render tree (highest Z-order) so modal prompts appear above all other content. It renders nothing until a prompt is triggered.

```tsx
import {
  usePrompt, PromptOverlay,
  PromptAction_Font_Button, PromptAction_Font_Timer, PromptAction_Font_LegalText,
} from '@recurly/engage-react-native';
import type { PromptResult } from '@recurly/engage-core';

const AppRoot: React.FC = () => {
  const { dispatch, state: { promptMgr } } = usePrompt();
  const [isReady, setReady] = React.useState(false);

  // Optional: load custom fonts before showing prompts
  useFonts({
    buttonFont: require('../assets/fonts/MyBold.ttf'),
    otherFont:  require('../assets/fonts/MyRegular.ttf'),
  });

  React.useEffect(() => {
    if (!promptMgr) return;
    const intervalId = setInterval(() => {
      if (promptMgr.isInitialized()) {
        // Optional font dispatches — omit if not customizing fonts
        dispatch({ type: PromptAction_Font_Button,    data: 'buttonFont' });
        dispatch({ type: PromptAction_Font_Timer,     data: 'otherFont'  });
        dispatch({ type: PromptAction_Font_LegalText, data: 'otherFont'  });
        setReady(true);
        clearInterval(intervalId);
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [promptMgr]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <NavigationContainer>
      {isReady && (
        <Stack.Navigator>
          {/* screens */}
        </Stack.Navigator>
      )}
      <PromptOverlay
        onEvent={(result: PromptResult) => {
          // Handle modal prompt events here (analytics, navigation, etc.)
        }}
      />
    </NavigationContainer>
  );
};
```

---

## Triggering Prompts

### Screen change trigger

Call `promptMgr.screenChanged('screenName')` when a screen becomes active. The string must match the trigger configured in Pulse.

```tsx
// Inside any screen component
const { state: { promptMgr } } = usePrompt();

React.useEffect(() => {
  if (promptMgr) {
    promptMgr.screenChanged('home'); // matches Pulse trigger "home"
  }
}, [promptMgr]);
```

### Button / element click trigger

Call `promptMgr.buttonClicked('clickId')` when the user taps a specific element. The string must match the click ID configured in Pulse.

```tsx
<TouchableOpacity onPress={() => promptMgr?.buttonClicked('purchase')}>
  <Text>Purchase</Text>
</TouchableOpacity>
```

Both methods return `void` — the matched prompt (if any) is automatically dispatched to `PromptOverlay` via the shared context.

---

## Inline Prompts

Use `<RecurlyInline>` to embed a non-modal prompt directly in the layout. It scales to fit its container.

```tsx
import { RecurlyInline } from '@recurly/engage-react-native';

<RecurlyInline
  zoneId="my-banner-zone"      // matches rf_settings_zone_id in Pulse
  closeButtonColor="#000000"
  closeButtonBgColor="#FFFFFF"
  closeButtonSize="20"         // px, string
  timerFontSize="14"           // px, string
  timerFontColor="#FFFFFF"
  focusStyle={{                // TV focus ring (optional)
    borderWidth: 2,
    borderColor: '#ff0000',
    borderRadius: 5,
  }}
  onEvent={(result) => {
    // same PromptResult shape as PromptOverlay
  }}
/>
```

The `zoneId` prop corresponds to the Zone ID field in Pulse. On multi-platform apps, pass a platform-specific zone ID:

```tsx
zoneId={Platform.OS === 'ios' ? 'ios-banner' : 'android-banner'}
```

---

## Custom Prompt Rendering

When the built-in UI components don't fit the design, retrieve prompt metadata directly and render your own UI.

```tsx
import { PathType } from '@recurly/engage-core';

// All prompts of a given type (ignores trigger criteria)
const prompts = promptMgr.getPrompts(PathType.ALL);

// Prompts that match specific trigger criteria
const prompts = await promptMgr.getTriggerablePrompts(
  'home_screen',    // screenName — use '*' to match any
  '*',              // clickId    — use '*' to match any
  PathType.ALL      // type filter
);

// Access prompt metadata
const prompt = prompts[0];
prompt.button1?.label
prompt.button2?.label
prompt.button3?.label
prompt.inAppSku
prompt.deeplink        // decoded key-value object
prompt.deviceMeta      // rf_metadata object

// Report interactions — each returns Promise<PromptResult>
await prompt.impression();  // shown to user
await prompt.goal();        // primary CTA clicked
await prompt.goal2();       // secondary CTA clicked
await prompt.decline();     // decline button clicked
await prompt.dismiss();     // close button tapped
await prompt.timeout();     // countdown expired
await prompt.holdout();     // user is in control group — don't show
```

**PathType values:**
| Name | Value |
|---|---|
| `PathType.ALL` | -1 |
| `PathType.MODAL` | 2 |
| `PathType.HORIZONTAL` | 5 |
| `PathType.TEXT` | 7 |
| `PathType.VERTICAL` | 8 |
| `PathType.TILE` | 9 |
| `PathType.INTERSTITIAL` | 10 |
| `PathType.BOTTOM_BANNER` | 13 |

---

## Handling Prompt Results (`PromptResult`)

`PromptResult` is returned by `PromptOverlay.onEvent`, `RecurlyInline.onEvent`, and all `Prompt` interaction methods.

```ts
interface PromptResult {
  code: PromptResultCode;
  value?: { [key: string]: any };  // deeplink key-value pairs on BUTTON1/BUTTON2
  meta?:  { [key: string]: any };  // rf_metadata (custom key-value pairs)
  promptMeta?: {
    promptName: string;
    promptID: string;
    promptVariationName: string;
    promptVariationID: string;
    promptExperimentName: string;
    promptExperimentID: string;
    promptType: number;            // PathType value
    buttonLabel: string;           // set for BUTTON1/BUTTON2/BUTTON3
  };
}
```

**PromptResultCode values:**
| Code | Value | Meaning |
|---|---|---|
| `OK` | 1 | Generic success |
| `ERROR` | -100 | Unexpected error |
| `NOT_APPLICABLE` | -101 | No matching prompt found |
| `DISABLED` | -102 | Prompts disabled via `enablePrompt(false)` |
| `SUPPRESSED` | -103 | Prompt suppressed by interval |
| `IMPRESSION` | 100 | Prompt shown to user |
| `BUTTON1` | 101 | Primary CTA clicked |
| `BUTTON2` | 102 | Secondary CTA clicked |
| `BUTTON3` | 103 | Decline button clicked |
| `DISMISS` | 110 | Close button tapped |
| `TIMEOUT` | 111 | Countdown timer expired |
| `HOLDOUT` | 120 | User in control group |

### Analytics example

```tsx
const getEventName = (code: PromptResultCode): string => {
  switch (code) {
    case PromptResultCode.IMPRESSION: return 'Prompt Impression';
    case PromptResultCode.BUTTON1:    return 'Prompt Click';
    case PromptResultCode.BUTTON2:    return 'Prompt Click2';
    case PromptResultCode.BUTTON3:    return 'Prompt Decline';
    case PromptResultCode.DISMISS:    return 'Prompt Dismiss';
    case PromptResultCode.TIMEOUT:    return 'Prompt Timeout';
    case PromptResultCode.HOLDOUT:    return 'Prompt Holdout';
    default:                          return 'Prompt Event';
  }
};

// In onEvent callback:
onEvent={(result) => {
  myAnalytics.track(getEventName(result.code), {
    ...result.promptMeta,
    timestamp: new Date().toISOString(),
  });
}}
```

---

## Deeplink & Custom Metadata

### Deeplink

When a prompt has a deeplink configured, `result.value` contains a decoded key-value object on `BUTTON1` / `BUTTON2` events:

```ts
// result.value from onEvent
{ "url": "myapp://screen/detail" }

// Navigate based on deeplink
if (result.code === PromptResultCode.BUTTON1 && result.value?.url) {
  Linking.openURL(result.value.url);
}
```

### Custom metadata (`rf_metadata`)

Custom key-value pairs set in Pulse appear in `result.meta`:

```ts
// result.meta
{ "plan": "premium", "offer": "50off" }
```

---

## Additional APIs

### Change user ID (e.g. after login)

```ts
promptMgr.setUserId(authenticatedUserId);
// Allow a few seconds for the prompt list to refresh for the new user
```

### Custom tracking events

```ts
// Fire a custom event — must be configured as a tracker in Pulse
await promptMgr.customTrack('genres');
```

### Reset prompt suppression (debug / testing)

Clears local suppression keys and resets server-side goal state so previously suppressed prompts become eligible again.

```ts
await promptMgr.resetGoal();
```

### Invisible prompt metadata

```ts
// Retrieve merged rf_metadata from all INVISIBLE-type paths
const meta = promptMgr.getMeta();
```

---

## Common Mistakes to Avoid

1. **Calling `screenChanged` before `isInitialized()`** — the call is safe (it won't throw) but no prompt will be matched because the path list hasn't loaded yet. Always wait for `isInitialized()` before routing to the first screen.

2. **Placing `<PromptOverlay>` before screen components** — it must be last in the render tree to sit above all other UI via Z-order.

3. **Omitting `<PromptProvider>` at the root** — `usePrompt()` will throw if called outside the provider tree.

4. **Calling `getTriggerablePrompts` without `await`** — it is async (checks holdout and suppression state in local storage).

5. **Using the same zone ID across different inline zones** — each `<RecurlyInline>` instance should have a unique `zoneId` matching its Pulse configuration.

6. **Not reporting `impression` for custom rendering** — if using `getPrompts` / `getTriggerablePrompts`, you are responsible for calling `prompt.impression()` when the prompt is shown and `prompt.holdout()` when the user is in the control group.
