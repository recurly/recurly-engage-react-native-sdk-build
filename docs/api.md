# React Native

Configuration guide for the Recurly Engage React Native SDK, enabling prompt rendering and event tracking in your React Native applications.

## Overview

The Recurly Engage React Native SDK provides components and APIs to render configured prompts—modals (popups, bottom banners, interstitials) and inline views—and handle related user interaction events in React Native apps.

### Key benefits

- Cross-platform UI: Seamlessly display modals and inline prompts on both iOS and Android via React Native.
- Built-in interaction handling: Automatically track impressions, clicks, dismissals, and other user events.
- Customizable rendering: Use prebuilt components or implement your own views based on prompt metadata.

### Key details

The Recurly Engage React Native SDK provides:

- A prompt manager for initialization and user ID management
- Hooks and components for displaying modal prompts and inline prompts
- APIs for reporting user interactions (impression, goal, decline, dismiss, timeout, holdout)

## Install the SDK

The SDK is published on the public npm registry — no registry configuration or authentication token is required.

Using npm

```bash
npm install @recurly/engage-core
npm install @recurly/engage-react-native
```

or yarn

```bash
yarn add @recurly/engage-core
yarn add @recurly/engage-react-native
```

## Initialize Engage

Initialize the SDK in your AppRoot using the `<PromptProvider>` component at the top of you app node.

Then, pull the SDK to check it has been initialized using the `usePrompt` hook and the `promptMgr.isInitialized()` method.

Finally place a `<PromptOverlay />` component at the bottom of your app node. This will render any modal (interstitial, popoup, bottom banner) prompts that are triggered. And since it is at the bottom of you app node, it will have the highest Z-order to show itself.

```javascript
// Initialize the SDK at the top of your app node
export default function App() {
  return (
    <PromptProvider appId="YOUR_APP_ID" userId="INITIAL_USER_ID">
      <AppRoot />
    </PromptProvider>
  );
}

// pull the SDK to check it has been initialized
const AppRoot: React.FC = () => {
  const {
    dispatch,
    state: { promptMgr },
  } = usePrompt();
  const [isReady, setReady] = React.useState(false);

  React.useEffect(() => {
    if (!promptMgr) return;
    const intervalId = setInterval(() => {
      if (promptMgr.isInitialized()) {
        setReady(true);
        clearInterval(intervalId);
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [promptMgr]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <NavigationContainer>
      {isReady && (
        <Stack.Navigator screenOptions={{ headerShown: true }}>
          <Stack.Screen />
          <Stack.Screen />
          ...
        </Stack.Navigator>
      )}
      <PromptOverlay
        onEvent={(result: PromptResult) => {
          // TODO: handle the result
        }}
      />
    </NavigationContainer>
  );
}

// (optional) You can load the SDK with specific fonts for various parts of the prompts
const AppRoot: React.FC = () => {
  ...
  useFonts({
    buttonFont: require('../assets/fonts/AllProDisplayC-Bold.ttf'),
    otherFont: require('../assets/fonts/AllProDisplayC-Regular.ttf'),
  });

  React.useEffect(() => {
    if (!promptMgr) return;
    const intervalId = setInterval(() => {
      if (promptMgr.isInitialized()) {
        dispatch({
          type: PromptAction_Font_Button,
          data: 'buttonFont',
        });
        dispatch({
          type: PromptAction_Font_Timer,
          data: 'otherFont',
        });
        dispatch({
          type: PromptAction_Font_LegalText,
          data: 'otherFont',
        });
        setReady(true);
        clearInterval(intervalId);
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [promptMgr]); // eslint-disable-line react-hooks/exhaustive-deps

  ...
}
```

## Set UserId

You may change the userID after the SDK has been initialized, for example, when the user authenticates mid session. Note that it may take several seconds for the user's prompts to refresh.

```javascript
promptMgr.setUserId(userId);
```

## Render modal prompts

Interstitial, Popup and Bottom Banner modals may be triggered upon entering a screen and/or the user registering a click on an element. Add the following code to screens that are eligible to show a modal.

Use the `promptMgr.screenChanged('home')` method for entering a screen with a screen name (customer defined string; example: "home")

Use the `promptMgr.buttonClicked('clickId')` method for registering a click on an element (customer defined string; example: a button with an id as "clickId")

```javascript
// Example a screen
import {
  usePrompt, // Prompt state management
} from '@recurly/engage-react-native';

// Example: trigger when entering the "home" screen
export default function HomeScreen() {
  const {
    dispatch,
    state: { promptMgr },
  } = usePrompt();

  React.useEffect(() => {
    if (promptMgr) {
      promptMgr.screenChanged('home');
    }
  }, [promptMgr]);

  return (
    // Example: trigger when a button is clicked
    <TouchableOpacity
      onPress={async () => {
        if (promptMgr) {
          promptMgr.buttonClicked('clickId');
        }
      }}
    >Hello</TouchableOpacity>
  );
}
```

## Render inline prompts

You may utilize the RecurlyInline view to render an inline prompt, if one is available for the current user. Note the inline prompt will scale to fit within its container.

```javascript
<RecurlyInline
  zoneId="myZoneId" // ZoneID as specified in Pulse
  closeButtonColor="#000000" // Hex color for close button, if enabled
  closeButtonBgColor="#FFFFFF" // Hex background color for close button
  closeButtonSize="20" // Close button height and width, in pixels
  timerFontSize="14" // Countdown timer font size, if enabled
  timerFontColor="#FFFFFF" // Countdown timer font hex color
  focusStyle={{
    borderWidth: 2,
    borderColor: '#ff0000',
    borderRadius: 5,
  }}
  onEvent={(result) => {}}
/>
```

## Custom prompt rendering

You may opt to render prompts utilizing the prompt metadata in cases where the desired rendering is different than that produced by the Recurly Engage SDK.

The app should report Prompt interactions via the provided functions on the prompt object.

```javascript

// Example: Retrieve all available prompts of specified type. See PathType values below. Use this if trigger criteria is to be ignored.
let prompts = promptMgr.getPrompts(PathType.ALL);

// Example: Retrieve all available prompts of specified type and trigger criteria (screenName `homeScreen`)
let prompts = promptMgr.getTriggerablePrompts('home_screen','*', PathType.ALL );

// Example: Retrieve all available prompts of specified type and trigger criteria (screenName `homeScreen` and clickId `add_to_watchlist`)
let prompts = promptMgr.getTriggerablePrompts('home_screen','add_to_watchlist', PathType.ALL );

// Access prompt properties (See below for Prompt interface details)
prompt.button1
prompt.button2
prompt.button3
prompt.inAppSku
promot.deeplink
prompt.deviceMeta

// Report prompt interactions — each method calls the Engage API and returns a
// PromptResult whose code reflects the interaction (e.g. DISMISS for dismiss()).
// Use the return value to drive your own analytics in the custom rendering path.
const result = await prompt.dismiss();
// result.code === PromptResultCode.DISMISS

prompt.impression() // → PromptResultCode.IMPRESSION
prompt.goal()       // → PromptResultCode.BUTTON1
prompt.goal2()      // → PromptResultCode.BUTTON2
prompt.decline()    // → PromptResultCode.BUTTON3
prompt.dismiss()    // → PromptResultCode.DISMISS
prompt.timeout()    // → PromptResultCode.TIMEOUT
prompt.holdout()    // → PromptResultCode.HOLDOUT
// All methods return PromptResultCode.ERROR on API failure.

/*
PathType values:
  PathType.ALL = -1
  PathType.MODAL = 2 // Referenced as Popup within Pulse
  PathType.HORIZONTAL = 5
  PathType.TEXT = 7
  PathType.VERTICAL = 8
  PathType.TILE = 9
  PathType.INTERSTITIAL = 10
  PathType.BOTTOM_BANNER = 13

PromptResultCode values:
  // Success codes
  OK = 1,
  // Error codes
  ERROR = -100,
  NOT_APPLICABLE = -101,
  DISABLED = -102,
  SUPPRESSED = -103,
  // Interactions
  IMPRESSION = 100,
  BUTTON1 = 101, // CLICK
  BUTTON2 = 102, // CLICK2
  BUTTON3 = 103, // DECLINE
  DISMISS = 110,
  TIMEOUT = 111,
  HOLDOUT = 120

interface Prompt {
  id: string;
  type: PathType;
  actions: Action;
  actionGroupId?: string;
  inAppSku?: string;
  deviceMeta?: { [key: string]: any };
  deeplink?: { [key: string]: any };
  button1?: ModalButton;
  button2?: ModalButton;
  button3?: ModalButton;
  buttonBorderRadius: number;
  buttonBorderColor: string;
  buttonBorderThickness: number;
  countDownPrompt: string;
  countDownPromptColor: string;
  countDownPromptFontSize: number;
  countDownPromptInvisible: boolean;
  countDown: number;
  horizontalPoster?: string;
  impression: () => Promise<PromptResult>;
  dismiss: () => Promise<PromptResult>;
  timeout: () => Promise<PromptResult>;
  holdout: () => Promise<PromptResult>;
  goal: () => Promise<PromptResult>;
  goal2: () => Promise<PromptResult>;
  decline: () => Promise<PromptResult>;
}

interface ModalButton {
  label?: string;
  textColor?: string;
  textHightlightColor?: string;
  bgColor?: string;
}
*/
```

## Actions
When a user interacts with the primary prompt CTA, a result callback includes various metadata associated with the Prompt to determine the client-side action that should take place.

```javaScript
// Data schema of the result callback
interface PromptResult {
  code: PromptResultCode;
  value?: { [key: string]: any };
  meta?: { [key: string]: any };
  promptMeta?: {
    promptName: string;
    promptID: string;
    promptVariationName: string;
    promptVariationID: string;
    promptExperimentName: string;
    promptExperimentID: string;
    buttonLabel: string;
  };
}
```

## Analytics Callback Example

```javascript
<RecurlyInline
  zoneId="myZoneId" // ZoneID as specified in Pulse
  closeButtonColor="#000000" // Hex color for close button, if enabled
  closeButtonBgColor="#FFFFFF" // Hex background color for close button
  closeButtonSize="20" // Close button height and width, in pixels
  timerFontSize="14" // Countdown timer font size, if enabled
  timerFontColor="#FFFFFF" // Countdown timer font hex color
  onEvent={(result) => {
    const getEventName = (code: PromptResultCode) => {
      switch (code) {
        case PromptResultCode.IMPRESSION:
          return 'Engage Impression';
        case PromptResultCode.BUTTON1:
          return 'Engage Click';
        case PromptResultCode.BUTTON2:
          return 'Engage Click2';
        case PromptResultCode.BUTTON3:
          return 'Engage Decline';
        case PromptResultCode.DISMISS:
          return 'Engage Dismiss';
        case PromptResultCode.TIMEOUT:
          return 'Engage Timeout';
        case PromptResultCode.HOLDOUT:
          return 'Engage Holdout';
        default:
          return 'Engage Event';
      }
    };

    const analyticsData = {
      name: getEventName(result.code),
      data: {
        ...result.promptMeta,
        timestamp: new Date().toISOString()
      }
    };
    console.log('ANALYTICS:', JSON.stringify(analyticsData, null, 2));
    /* Example:
      ANALYTICS: {
        "name": "Engage Click",
        "data": {
          "promptName": "My Prompt Name",
          "promptID": "438c8eec-1111-1111-1111-2222",
          "promptVariationName": "Varation 2",
          "promptVariationID": "438c8eec-1111-1111-1111-2222",
          "promptExperimentName": "My Experiment",
          "promptExperimentID": "438c8eec-1111-1111-1111-3333",
          "promptType": 5,
          "buttonLabel": "Sign me up",
          "timestamp": "2025-02-12T05:41:28.365Z"
        }
      }
    */

    // Send Payload to Analytics
  }}
/>

// Perform the same for modals
{displayPrompt(showModal, pathItem, (result) => {
  // utilize same analytics code above
  setShowModal(false);
})}
```

## Deeplink

You can add a Deeplink to a Prompt within Pulse.. When the user invokes the CTA, you can utilize the Deeplink to send the user to a specific location within the app.

```javascript
{
  "code": 0,
  "meta": {
    "meta": {},
    "deeplink": "redflix://test123"
  },
}
```

## Custom metadata

Custom key-value pairs can be added to an item via Pulse. These values may be used to perform an action that is not the typical media asset deep link, like sending the user to a registration screen or performing an operation on behalf of the user.

```javascript
{
  "code": 0,
  "meta": {
    "meta": {
      "keyName1": "foo",
      "keyName2": "bar",
      "differentKey": "baz"
    },
  },
}
```

## Send usage tracking event

Your app can send custom track events using the SDK. If configured as a tracker within Pulse, these custom events can be used to target prompts at specific sets of users.

```javascript
promptMgr.customTrack(customFieldId);
```

## Debugging

You may reset the current user's prompt status, such that previously suppressed prompts will now be made available.

```javascript
promptMgr.resetGoal();
```
