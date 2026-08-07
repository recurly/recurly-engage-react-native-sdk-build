# How to build and run

The `@recurly/engage-react-native` library is created from the `npx create-react-native-library` tool. It generates the `example` folder for mobile devices.

The `example-tv` is created from the `npx create-expo-app [project name] -e with-tv` tool.

## Content

1. Recurly Engage SDK part 1: business logics; platform/device agnostic package **engage-core**
2. Recurly Engage SDK part 2: platform/device package **engage-react-native**
3. Example app: React Native Expo based example app **example**

## Setup react native environment

React native reference [here](https://reactnative.dev/docs/set-up-your-environment)

Tips:
1. Make sure Xcode command line tools are installed
```bash
sudo xcode-select -p # should be /Applications/Xcode.app/Contents/Developer
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer # set to correct one
sudo xcodebuild -license # accept license
```

## Build and run

1. Install libraries using Yarn(npm should work too)

```bash
yarn install
```

If you are building the example-tv (for TV devices) app for the first time

```bash
yarn tv:prebuild
```

2. Build the Recurly Engage SDK

```bash
yarn build
```

3. Run the **example** app

```bash
# Run the mobile example app
yarn example

# or, run the Android TV example app
yarn tv:android

# or, run the tvOS example app
yarn tv:tvos
```

## Installation

The SDK is published on the public npm registry — no authentication token required.

```bash
npm install @recurly/engage-core @recurly/engage-react-native
# or
yarn add @recurly/engage-core @recurly/engage-react-native
```

## Launch example-tv app in a physical Apple TV

1. make sure `expo` is installed globally. if not
```bash
npm install -g expo
```
2. go to the `example-tv` folder, and start metro. You should see something like `Metro waiting on exp://...:8081` in the terminal
```bash
npx expo start
```
3. open the xcode with the project files from the `example-tv/ios/exampletv` folder
4. from xcode, make sure the signing provisioning profile is correct
5. from xcode, run the app toward your physical device
6. then in your terminal, you will see the javascript is built and ready to use

## Common Errors

1. can't load app in an iOS simulator

error from expo, `Xcode must be fully installed before you can continue. Continue to the App Store`. make sure you have xcode and an iOS simulator running. then if it still doesn't work, run `sudo xcode-select -switch /Applications/Xcode.app` to instruct expo the Xcode location

2. android TV emulator failed to call the ping api

don't know the exact reason. you just need to delete the emulator and create a new one
