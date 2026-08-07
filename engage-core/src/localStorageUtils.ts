import type { LocalStorage } from './types';

export class LocalStorageUtils {
  private localStorage: LocalStorage;

  constructor(localStorage: LocalStorage) {
    this.localStorage = localStorage;
  }

  get(): LocalStorage {
    return this.localStorage;
  }

  getHoldoutKey(pathId: string) {
    return `${pathId}_holdout`;
  }

  async createNewOverlayKey(pathId: string, disabledInterval?: string) {
    const sysUpSeconds = Math.floor(Date.now() / 1000);
    let value = `${sysUpSeconds},`;
    let interval;
    switch (disabledInterval) {
      case 'INF':
        interval = -1;
        break;
      case 'VISIT':
        interval = -2;
        break;
      default:
        interval = parseInt(disabledInterval ?? '0', 10) * 60;
        break;
    }
    value += interval.toString();
    await this.localStorage.createKey(pathId, value);
  }

  async isOverlayEnabled(pathId: string) {
    const value = await this.localStorage.getValue(pathId);
    if (value) {
      const components = value.split(',');
      if (components.length === 2) {
        const start = parseInt(components[0] as string, 10) || 0;
        const interval = parseInt(components[1] as string, 10) || 0;
        const sysUpSeconds = Math.floor(Date.now() / 1000);
        if (
          interval === -1 ||
          interval === -2 ||
          start + interval > sysUpSeconds
        ) {
          console.log(
            `LocalStorage: Prompt ${pathId} is blocked due to ${start + interval} and now is ${sysUpSeconds}`
          );
          return false;
        }
      }
      await this.localStorage.deleteKey(pathId);
    }
    return true;
  }

  async reset(visitOnly: boolean) {
    const keys = await this.localStorage.getAllKeys();
    let count = 0;
    for (const key of keys) {
      if (visitOnly) {
        const value = await this.localStorage.getValue(key);
        const components = value?.split(',') ?? [];
        if (components.length === 2) {
          const interval = parseInt(components[1] as string, 10) || 0;
          if (interval === -2) {
            count += 1;
            await this.localStorage.deleteKey(key);
          }
        }
      } else {
        count += 1;
        await this.localStorage.deleteKey(key);
      }
    }
    console.log(
      `LocalStorage: reset ${visitOnly ? 'VISIT' : 'ALL'} promos, total ${count}`
    );
  }

  async dump() {
    const keys = await this.localStorage.getAllKeys();
    const dumpObject: { [key: string]: any } = {};
    for (const key of keys) {
      dumpObject[key] = await this.localStorage.getValue(key);
    }
    console.log(JSON.stringify(dumpObject));
  }
}
