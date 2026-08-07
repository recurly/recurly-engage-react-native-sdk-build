import { LocalStorageUtils } from '../localStorageUtils';
import type { LocalStorage } from '../types';

const makeLocalStorage = (): jest.Mocked<LocalStorage> => ({
  createKey: jest.fn().mockResolvedValue(undefined),
  getValue: jest.fn().mockResolvedValue(null),
  deleteKey: jest.fn().mockResolvedValue(undefined),
  hasKey: jest.fn().mockResolvedValue(false),
  getAllKeys: jest.fn().mockResolvedValue([]),
});

describe('LocalStorageUtils', () => {
  let mockStorage: jest.Mocked<LocalStorage>;
  let utils: LocalStorageUtils;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    mockStorage = makeLocalStorage();
    utils = new LocalStorageUtils(mockStorage);
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('get()', () => {
    it('returns the underlying LocalStorage instance', () => {
      expect(utils.get()).toBe(mockStorage);
    });
  });

  describe('getHoldoutKey()', () => {
    it('appends _holdout to the pathId', () => {
      expect(utils.getHoldoutKey('my-path')).toBe('my-path_holdout');
    });
  });

  describe('createNewOverlayKey()', () => {
    it('stores interval -1 for INF', async () => {
      await utils.createNewOverlayKey('path1', 'INF');
      expect(mockStorage.createKey).toHaveBeenCalledWith(
        'path1',
        expect.stringMatching(/,-1$/)
      );
    });

    it('stores interval -2 for VISIT', async () => {
      await utils.createNewOverlayKey('path1', 'VISIT');
      expect(mockStorage.createKey).toHaveBeenCalledWith(
        'path1',
        expect.stringMatching(/,-2$/)
      );
    });

    it('converts numeric interval string to seconds (minutes * 60)', async () => {
      await utils.createNewOverlayKey('path1', '5');
      expect(mockStorage.createKey).toHaveBeenCalledWith(
        'path1',
        expect.stringMatching(/,300$/)
      );
    });

    it('defaults to 0 when disabledInterval is undefined', async () => {
      await utils.createNewOverlayKey('path1');
      expect(mockStorage.createKey).toHaveBeenCalledWith(
        'path1',
        expect.stringMatching(/,0$/)
      );
    });
  });

  describe('isOverlayEnabled()', () => {
    it('returns true without calling deleteKey when no value is stored', async () => {
      mockStorage.getValue.mockResolvedValue(null);
      expect(await utils.isOverlayEnabled('path1')).toBe(true);
      expect(mockStorage.deleteKey).not.toHaveBeenCalled();
    });

    it('deletes key and returns true when value has no comma (wrong format)', async () => {
      mockStorage.getValue.mockResolvedValue('badvalue');
      expect(await utils.isOverlayEnabled('path1')).toBe(true);
      expect(mockStorage.deleteKey).toHaveBeenCalledWith('path1');
    });

    it('returns false for INF (-1) interval without deleting key', async () => {
      const start = Math.floor(Date.now() / 1000);
      mockStorage.getValue.mockResolvedValue(`${start},-1`);
      expect(await utils.isOverlayEnabled('path1')).toBe(false);
      expect(mockStorage.deleteKey).not.toHaveBeenCalled();
    });

    it('returns false for VISIT (-2) interval without deleting key', async () => {
      const start = Math.floor(Date.now() / 1000);
      mockStorage.getValue.mockResolvedValue(`${start},-2`);
      expect(await utils.isOverlayEnabled('path1')).toBe(false);
      expect(mockStorage.deleteKey).not.toHaveBeenCalled();
    });

    it('returns false when still within the disabled interval', async () => {
      const start = Math.floor(Date.now() / 1000) - 100; // 100 seconds ago
      const interval = 300; // 5 minutes; start + interval > now
      mockStorage.getValue.mockResolvedValue(`${start},${interval}`);
      expect(await utils.isOverlayEnabled('path1')).toBe(false);
      expect(mockStorage.deleteKey).not.toHaveBeenCalled();
    });

    it('deletes key and returns true when disabled interval has expired', async () => {
      const start = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago
      const interval = 300; // 5 minutes; start + interval < now
      mockStorage.getValue.mockResolvedValue(`${start},${interval}`);
      expect(await utils.isOverlayEnabled('path1')).toBe(true);
      expect(mockStorage.deleteKey).toHaveBeenCalledWith('path1');
    });

    it('treats non-numeric start/interval as 0 (|| 0 fallback)', async () => {
      // 'abc,xyz' → start=0, interval=0 → 0+0 <= now → deleteKey, return true
      mockStorage.getValue.mockResolvedValue('abc,xyz');
      expect(await utils.isOverlayEnabled('path1')).toBe(true);
      expect(mockStorage.deleteKey).toHaveBeenCalledWith('path1');
    });
  });

  describe('reset()', () => {
    it('deletes all keys when visitOnly is false', async () => {
      mockStorage.getAllKeys.mockResolvedValue(['key1', 'key2']);
      await utils.reset(false);
      expect(mockStorage.deleteKey).toHaveBeenCalledWith('key1');
      expect(mockStorage.deleteKey).toHaveBeenCalledWith('key2');
      expect(mockStorage.deleteKey).toHaveBeenCalledTimes(2);
    });

    it('does nothing when there are no keys', async () => {
      mockStorage.getAllKeys.mockResolvedValue([]);
      await utils.reset(false);
      expect(mockStorage.deleteKey).not.toHaveBeenCalled();
    });

    it('only deletes VISIT (-2) keys when visitOnly is true', async () => {
      mockStorage.getAllKeys.mockResolvedValue([
        'key1',
        'key2',
        'key3',
        'key4',
      ]);
      mockStorage.getValue
        .mockResolvedValueOnce(null) // key1: null → components = [], skip
        .mockResolvedValueOnce('badvalue') // key2: no comma → length 1, skip
        .mockResolvedValueOnce('0,-2') // key3: VISIT → delete
        .mockResolvedValueOnce('0,-1'); // key4: INF → skip
      await utils.reset(true);
      expect(mockStorage.deleteKey).toHaveBeenCalledTimes(1);
      expect(mockStorage.deleteKey).toHaveBeenCalledWith('key3');
    });

    it('skips non-VISIT keys when visitOnly is true', async () => {
      mockStorage.getAllKeys.mockResolvedValue(['key1']);
      mockStorage.getValue.mockResolvedValue('0,300');
      await utils.reset(true);
      expect(mockStorage.deleteKey).not.toHaveBeenCalled();
    });

    it('treats non-numeric interval as 0 (|| 0 fallback) and skips when visitOnly is true', async () => {
      mockStorage.getAllKeys.mockResolvedValue(['key1']);
      mockStorage.getValue.mockResolvedValue('0,xyz'); // interval = NaN || 0 = 0, not -2 → skip
      await utils.reset(true);
      expect(mockStorage.deleteKey).not.toHaveBeenCalled();
    });
  });

  describe('dump()', () => {
    it('logs all keys and their values as a JSON string', async () => {
      mockStorage.getAllKeys.mockResolvedValue(['key1', 'key2']);
      mockStorage.getValue
        .mockResolvedValueOnce('value1')
        .mockResolvedValueOnce('value2');
      await utils.dump();
      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({ key1: 'value1', key2: 'value2' })
      );
    });

    it('logs an empty object when storage is empty', async () => {
      mockStorage.getAllKeys.mockResolvedValue([]);
      await utils.dump();
      expect(consoleSpy).toHaveBeenCalledWith('{}');
    });
  });
});
