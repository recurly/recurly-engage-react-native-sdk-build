# @recurly/engage-core

Platform-agnostic TypeScript business logic layer for the Recurly Engage SDK — prompt fetching, path matching, suppression, and event reporting. This package alone does not render any UI; it powers platform-specific SDKs like [`@recurly/engage-react-native`](https://www.npmjs.com/package/@recurly/engage-react-native).

## Installation

Published on the public npm registry — no registry configuration or authentication token required.

```bash
npm install @recurly/engage-core
# or
yarn add @recurly/engage-core
```

Most apps consume this as a dependency of a platform SDK (e.g. `@recurly/engage-react-native`) rather than installing it directly.

## What it provides

- A prompt manager core (`PromptCore`) handling the ping loop, path/trigger matching, and suppression logic
- An HTTP API layer for impressions, goals, dismissals, and other prompt interaction events
- Shared types used across all Recurly Engage platform SDKs (`PathItem`, `PromptResult`, `PromptResultCode`, `PathType`, `DeviceInfo`, etc.)

## Documentation

See the [Recurly Engage React Native SDK docs](https://github.com/recurly/recurly-engage-react-native-sdk-build) for full integration guides and code samples.
