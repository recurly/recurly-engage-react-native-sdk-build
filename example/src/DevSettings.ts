import AsyncStorage from '@react-native-async-storage/async-storage';

// Values baked into the example app by default (see App.tsx).
export const DefaultAppId = '6b233605-b981-4d6d-8b45-efa7fc402388';
export const DefaultUserId = '123';

export enum DevEnvironment {
  Production = 'production',
  Staging = 'staging',
}

const ProductionBaseUrl = undefined; // falls back to the SDK's built-in default
const StagingBaseUrl = 'https://conduit.redfastlabs.com';

export const baseUrlForEnvironment = (
  env: DevEnvironment
): string | undefined =>
  env === DevEnvironment.Staging ? StagingBaseUrl : ProductionBaseUrl;

export interface DevSettingsValue {
  appIdOverride: string;
  userIdOverride: string;
  environment: DevEnvironment;
}

const emptySettings: DevSettingsValue = {
  appIdOverride: '',
  userIdOverride: '',
  environment: DevEnvironment.Production,
};

const StorageKey = '@recurly/example/dev-settings';

export async function loadDevSettings(): Promise<DevSettingsValue> {
  try {
    const raw = await AsyncStorage.getItem(StorageKey);
    if (!raw) return emptySettings;
    return { ...emptySettings, ...JSON.parse(raw) };
  } catch (error) {
    console.error('Failed to load dev settings', error);
    return emptySettings;
  }
}

export async function saveDevSettings(
  settings: DevSettingsValue
): Promise<void> {
  await AsyncStorage.setItem(StorageKey, JSON.stringify(settings));
}

export async function clearDevSettings(): Promise<void> {
  await AsyncStorage.removeItem(StorageKey);
}

export function effectiveAppId(settings: DevSettingsValue): string {
  return settings.appIdOverride.trim() || DefaultAppId;
}

export function effectiveUserId(settings: DevSettingsValue): string {
  return settings.userIdOverride.trim() || DefaultUserId;
}
