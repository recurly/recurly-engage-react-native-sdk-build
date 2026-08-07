import { PromptApi } from '../PromptApi';
import type { ActionsData, DeviceInfo, Holdout } from '../types';

const mockDevice: DeviceInfo = {
  device_manufacturer: 'Apple',
  device_model: 'iPhone 14',
  device_type: 'ios',
  device_category: 'iphone',
  device_form: 'phone',
};

function makeOkResponse(body: any = {}, etag: string | null = null): Response {
  return {
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue(body),
    headers: { get: jest.fn().mockReturnValue(etag) },
  } as unknown as Response;
}

function makeErrorResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: jest.fn(),
    headers: { get: jest.fn().mockReturnValue(null) },
  } as unknown as Response;
}

function make304Response(): Response {
  return {
    ok: false,
    status: 304,
    json: jest.fn(),
    headers: { get: jest.fn().mockReturnValue(null) },
  } as unknown as Response;
}

describe('PromptApi', () => {
  let api: PromptApi;
  let fetchMock: jest.Mock;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.fn();
    (globalThis as any).fetch = fetchMock;
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    api = new PromptApi('app-123', 'user-abc', mockDevice);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  // ── getDevice ──────────────────────────────────────────────────────────────

  describe('getDevice()', () => {
    it('returns the DeviceInfo passed to the constructor', () => {
      expect(api.getDevice()).toBe(mockDevice);
    });
  });

  // ── getUserId / setUserId ──────────────────────────────────────────────────

  describe('getUserId() / setUserId()', () => {
    it('returns the initial userId', () => {
      expect(api.getUserId()).toBe('user-abc');
    });

    it('returns the updated userId after setUserId', () => {
      api.setUserId('new-user');
      expect(api.getUserId()).toBe('new-user');
    });
  });

  // ── ping ──────────────────────────────────────────────────────────────────

  describe('ping()', () => {
    it('returns null for 304 Not Modified (before calling getJson)', async () => {
      fetchMock.mockResolvedValue(make304Response());
      await expect(api.ping({})).resolves.toBeNull();
    });

    it('returns ActionsData on 200 when anonymous_user_id is absent', async () => {
      const data: ActionsData = { paths: [] };
      fetchMock.mockResolvedValue(makeOkResponse(data));
      await expect(api.ping({})).resolves.toEqual(data);
    });

    it('sets anonymousId when anonymous_user_id is present in response', async () => {
      const data: ActionsData = { anonymous_user_id: 'anon-xyz' };
      fetchMock.mockResolvedValue(makeOkResponse(data));
      await api.ping({});
      const header = (api as any).commonHeader();
      expect(header['ANONYMOUS-USER-ID']).toBe('anon-xyz');
    });

    it('adds If-None-Match header in subsequent requests when etag is set', async () => {
      fetchMock.mockResolvedValueOnce(makeOkResponse({}, 'first-etag'));
      await api.ping({});

      fetchMock.mockResolvedValueOnce(makeOkResponse({}));
      await api.ping({});

      const [, secondOptions] = fetchMock.mock.calls[1];
      expect(secondOptions.headers['If-None-Match']).toBe('first-etag');
    });

    it('does not include If-None-Match on the very first request (etag is empty)', async () => {
      fetchMock.mockResolvedValue(makeOkResponse({}));
      await api.ping({});
      const [, firstOptions] = fetchMock.mock.calls[0];
      expect(firstOptions.headers['If-None-Match']).toBeUndefined();
    });

    it('preserves existing etag when response header returns null (nullish coalescing)', async () => {
      fetchMock.mockResolvedValueOnce(makeOkResponse({}, 'saved-etag'));
      await api.ping({});

      // second ping: no new etag from server
      fetchMock.mockResolvedValueOnce(makeOkResponse({}));
      await api.ping({});

      // third ping: etag should still be 'saved-etag'
      fetchMock.mockResolvedValueOnce(makeOkResponse({}));
      await api.ping({});
      const [, thirdOptions] = fetchMock.mock.calls[2];
      expect(thirdOptions.headers['If-None-Match']).toBe('saved-etag');
    });

    it('throws when the response is not ok', async () => {
      fetchMock.mockResolvedValue(makeErrorResponse(500));
      await expect(api.ping({})).rejects.toThrow('HTTP error! status: 500');
    });
  });

  // ── checkUserId (tested through public methods) ────────────────────────────

  describe('checkUserId() — branch coverage via public methods', () => {
    it('throws when both userId and anonymousId are empty', async () => {
      const emptyApi = new PromptApi('app-123', '', mockDevice);
      await expect(emptyApi.impression('path-1')).rejects.toThrow(
        'user id is not provided'
      );
    });

    it('passes when userId is non-empty (anonymousId empty)', async () => {
      fetchMock.mockResolvedValue(makeOkResponse());
      await expect(api.impression('path-1')).resolves.toBeUndefined();
    });

    it('passes when userId is empty but anonymousId is set via ping', async () => {
      const emptyApi = new PromptApi('app-123', '', mockDevice);
      fetchMock.mockResolvedValueOnce(
        makeOkResponse({ anonymous_user_id: 'anon-xyz' })
      );
      await emptyApi.ping({});

      fetchMock.mockResolvedValueOnce(makeOkResponse());
      await expect(emptyApi.impression('path-1')).resolves.toBeUndefined();
    });
  });

  // ── customTrack ───────────────────────────────────────────────────────────

  describe('customTrack()', () => {
    it('makes a GET request with type=custom and custom_field_id', async () => {
      fetchMock.mockResolvedValue(makeOkResponse());
      await api.customTrack('my-event');
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain('type=custom');
      expect(url).toContain('custom_field_id=my-event');
      expect(options.method).toBe('GET');
    });

    it('throws when both userId and anonymousId are empty', async () => {
      const emptyApi = new PromptApi('app-123', '', mockDevice);
      await expect(emptyApi.customTrack('event')).rejects.toThrow(
        'user id is not provided'
      );
    });

    it('throws when the response is not ok', async () => {
      fetchMock.mockResolvedValue(makeErrorResponse(403));
      await expect(api.customTrack('event')).rejects.toThrow(
        'HTTP error! status: 403'
      );
    });
  });

  // ── impression ────────────────────────────────────────────────────────────

  describe('impression()', () => {
    it('makes a GET request to paths/{pathId}/impression', async () => {
      fetchMock.mockResolvedValue(makeOkResponse());
      await api.impression('path-1');
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain('paths/path-1/impression');
      expect(options.method).toBe('GET');
    });

    it('includes action_group_id in the URL when provided', async () => {
      fetchMock.mockResolvedValue(makeOkResponse());
      await api.impression('path-1', 'group-1');
      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain('action_group_id=group-1');
    });

    it('throws when both userId and anonymousId are empty', async () => {
      const emptyApi = new PromptApi('app-123', '', mockDevice);
      await expect(emptyApi.impression('path-1')).rejects.toThrow(
        'user id is not provided'
      );
    });

    it('throws when the response is not ok', async () => {
      fetchMock.mockResolvedValue(makeErrorResponse(500));
      await expect(api.impression('path-1')).rejects.toThrow(
        'HTTP error! status: 500'
      );
    });
  });

  // ── dismiss ───────────────────────────────────────────────────────────────

  describe('dismiss()', () => {
    it('makes a GET request to paths/{pathId}/dismiss with click reason', async () => {
      fetchMock.mockResolvedValue(makeOkResponse());
      await api.dismiss('path-1', 'close');
      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain('paths/path-1/dismiss');
      expect(url).toContain('click=close');
    });

    it('includes action_group_id when provided', async () => {
      fetchMock.mockResolvedValue(makeOkResponse());
      await api.dismiss('path-1', 'timeout', 'group-1');
      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain('action_group_id=group-1');
    });

    it('throws when both userId and anonymousId are empty', async () => {
      const emptyApi = new PromptApi('app-123', '', mockDevice);
      await expect(emptyApi.dismiss('path-1', 'close')).rejects.toThrow(
        'user id is not provided'
      );
    });

    it('throws when the response is not ok', async () => {
      fetchMock.mockResolvedValue(makeErrorResponse(500));
      await expect(api.dismiss('path-1', 'close')).rejects.toThrow(
        'HTTP error! status: 500'
      );
    });
  });

  // ── goal ──────────────────────────────────────────────────────────────────

  describe('goal()', () => {
    it('makes a GET request to paths/{pathId}/goal', async () => {
      fetchMock.mockResolvedValue(makeOkResponse());
      await api.goal('path-1');
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain('paths/path-1/goal');
      expect(options.method).toBe('GET');
    });

    it('includes all optional params when provided', async () => {
      fetchMock.mockResolvedValue(makeOkResponse());
      await api.goal('path-1', 'group-1', 'accept', 'primary');
      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain('action_group_id=group-1');
      expect(url).toContain('action_type=accept');
      expect(url).toContain('accept_type=primary');
    });

    it('throws when both userId and anonymousId are empty', async () => {
      const emptyApi = new PromptApi('app-123', '', mockDevice);
      await expect(emptyApi.goal('path-1')).rejects.toThrow(
        'user id is not provided'
      );
    });

    it('throws when the response is not ok', async () => {
      fetchMock.mockResolvedValue(makeErrorResponse(500));
      await expect(api.goal('path-1')).rejects.toThrow(
        'HTTP error! status: 500'
      );
    });
  });

  // ── holdout ───────────────────────────────────────────────────────────────

  describe('holdout()', () => {
    it('returns Holdout data from the response', async () => {
      const holdoutData: Holdout = { success: true };
      fetchMock.mockResolvedValue(makeOkResponse(holdoutData));
      await expect(api.holdout('path-1')).resolves.toEqual(holdoutData);
    });

    it('includes action_group_id when provided', async () => {
      fetchMock.mockResolvedValue(makeOkResponse({ success: false }));
      await api.holdout('path-1', 'group-1');
      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain('action_group_id=group-1');
    });

    it('throws when both userId and anonymousId are empty', async () => {
      const emptyApi = new PromptApi('app-123', '', mockDevice);
      await expect(emptyApi.holdout('path-1')).rejects.toThrow(
        'user id is not provided'
      );
    });

    it('throws when the response is not ok', async () => {
      fetchMock.mockResolvedValue(makeErrorResponse(500));
      await expect(api.holdout('path-1')).rejects.toThrow(
        'HTTP error! status: 500'
      );
    });
  });

  // ── goalResetAll ──────────────────────────────────────────────────────────

  describe('goalResetAll()', () => {
    it('makes a GET request to paths/goal_reset_all with client_reset_complete=true', async () => {
      fetchMock.mockResolvedValue(makeOkResponse());
      await api.goalResetAll();
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain('paths/goal_reset_all');
      expect(url).toContain('client_reset_complete=true');
      expect(options.method).toBe('GET');
    });

    it('throws when both userId and anonymousId are empty', async () => {
      const emptyApi = new PromptApi('app-123', '', mockDevice);
      await expect(emptyApi.goalResetAll()).rejects.toThrow(
        'user id is not provided'
      );
    });

    it('throws when the response is not ok', async () => {
      fetchMock.mockResolvedValue(makeErrorResponse(500));
      await expect(api.goalResetAll()).rejects.toThrow(
        'HTTP error! status: 500'
      );
    });
  });

  // ── private helpers ───────────────────────────────────────────────────────

  describe('buildUrl() — empty params branch (no query string)', () => {
    it('returns URL without "?" when all params are filtered out by sanitizeObj', () => {
      const url = (api as any).buildUrl('some/endpoint', {});
      expect(url).toBe('https://conduit.redfast.com/some/endpoint');
      expect(url).not.toContain('?');
    });

    it('handles undefined params (triggers sanitizeObj default {} parameter branch)', () => {
      // Passing undefined at runtime triggers the `obj = {}` default in sanitizeObj
      const url = (api as any).buildUrl('some/endpoint', undefined);
      expect(url).toBe('https://conduit.redfast.com/some/endpoint');
    });
  });

  describe('loggedFetch() — default options branch', () => {
    it('uses empty object when options argument is omitted', async () => {
      fetchMock.mockResolvedValue(makeOkResponse());
      await (api as any).loggedFetch('https://conduit.redfast.com/ping');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://conduit.redfast.com/ping',
        {}
      );
    });
  });

  describe('commonHeader() — sanitizeObj branch coverage', () => {
    it('includes USER-ID when userId is set, excludes ANONYMOUS-USER-ID when empty', () => {
      const header = (api as any).commonHeader();
      expect(header['USER-ID']).toBe('user-abc');
      expect(header['ANONYMOUS-USER-ID']).toBeUndefined();
    });

    it('excludes USER-ID when empty, includes ANONYMOUS-USER-ID when set', async () => {
      const emptyApi = new PromptApi('app-123', '', mockDevice);
      fetchMock.mockResolvedValue(
        makeOkResponse({ anonymous_user_id: 'anon-xyz' })
      );
      await emptyApi.ping({});
      const header = (emptyApi as any).commonHeader();
      expect(header['USER-ID']).toBeUndefined();
      expect(header['ANONYMOUS-USER-ID']).toBe('anon-xyz');
    });
  });

  // ── buildUserParams ──────────────────────────────────────────────────────

  describe('buildUserParams()', () => {
    it('merges device info, appId, and send_ts into params', () => {
      const now = Date.now();
      const result = (api as any).buildUserParams({ foo: 'bar' });
      expect(result).toMatchObject({
        device_manufacturer: 'Apple',
        device_model: 'iPhone 14',
        device_type: 'ios',
        device_category: 'iphone',
        device_form: 'phone',
        id: 'app-123',
        foo: 'bar',
      });
      expect(Number(result.send_ts)).toBeGreaterThanOrEqual(now);
    });

    it('strips undefined values from params via sanitizeObj', () => {
      const result = (api as any).buildUserParams({
        present: 'yes',
        absent: undefined,
      });
      expect(result.present).toBe('yes');
      expect(result).not.toHaveProperty('absent');
    });
  });

  // ── ping — additional edge cases ────────────────────────────────────────

  describe('ping() — additional edge cases', () => {
    it('includes custom pingParams in the URL', async () => {
      fetchMock.mockResolvedValue(makeOkResponse({}));
      await api.ping({ page: 'home', section: 'hero' });
      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain('page=home');
      expect(url).toContain('section=hero');
    });

    it('always includes common header Accept in requests', async () => {
      fetchMock.mockResolvedValue(makeOkResponse({}));
      await api.ping({});
      const [, options] = fetchMock.mock.calls[0];
      expect(options.headers.Accept).toBe('application/json');
    });

    it('preserves etag through a 304 response cycle', async () => {
      // First ping sets etag
      fetchMock.mockResolvedValueOnce(makeOkResponse({}, 'etag-1'));
      await api.ping({});

      // Second ping returns 304 with no new etag
      const resp304 = make304Response();
      fetchMock.mockResolvedValueOnce(resp304);
      await api.ping({});

      // Third ping should still use etag-1
      fetchMock.mockResolvedValueOnce(makeOkResponse({}));
      await api.ping({});
      const [, thirdOptions] = fetchMock.mock.calls[2];
      expect(thirdOptions.headers['If-None-Match']).toBe('etag-1');
    });

    it('updates etag when server sends a new one', async () => {
      fetchMock.mockResolvedValueOnce(makeOkResponse({}, 'etag-1'));
      await api.ping({});

      fetchMock.mockResolvedValueOnce(makeOkResponse({}, 'etag-2'));
      await api.ping({});

      fetchMock.mockResolvedValueOnce(makeOkResponse({}));
      await api.ping({});
      const [, thirdOptions] = fetchMock.mock.calls[2];
      expect(thirdOptions.headers['If-None-Match']).toBe('etag-2');
    });
  });

  // ── customTrack — URL encoding ──────────────────────────────────────────

  describe('customTrack() — URL encoding', () => {
    it('double-encodes special characters (encodeURIComponent + URLSearchParams)', async () => {
      fetchMock.mockResolvedValue(makeOkResponse());
      await api.customTrack('field/name');
      const [url] = fetchMock.mock.calls[0];
      // encodeURIComponent('field/name') → 'field%2Fname'
      // then URLSearchParams encodes the '%' → 'field%252Fname'
      expect(url).toContain('custom_field_id=field%252Fname');
    });
  });

  // ── impression — omitting optional params ───────────────────────────────

  describe('impression() — optional params', () => {
    it('omits action_group_id from URL when not provided', async () => {
      fetchMock.mockResolvedValue(makeOkResponse());
      await api.impression('path-1');
      const [url] = fetchMock.mock.calls[0];
      expect(url).not.toContain('action_group_id');
    });
  });

  // ── dismiss — partial optional params ───────────────────────────────────

  describe('dismiss() — partial optional params', () => {
    it('omits action_group_id when not provided but includes click reason', async () => {
      fetchMock.mockResolvedValue(makeOkResponse());
      await api.dismiss('path-1', 'user_close');
      const [url] = fetchMock.mock.calls[0];
      expect(url).not.toContain('action_group_id');
      expect(url).toContain('click=user_close');
    });
  });

  // ── goal — partial optional params ──────────────────────────────────────

  describe('goal() — partial optional params', () => {
    it('includes only action_group_id when other optional params are omitted', async () => {
      fetchMock.mockResolvedValue(makeOkResponse());
      await api.goal('path-1', 'group-1');
      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain('action_group_id=group-1');
      expect(url).not.toContain('action_type');
      expect(url).not.toContain('accept_type');
    });

    it('omits all optional params when none are provided', async () => {
      fetchMock.mockResolvedValue(makeOkResponse());
      await api.goal('path-1');
      const [url] = fetchMock.mock.calls[0];
      expect(url).not.toContain('action_group_id');
      expect(url).not.toContain('action_type');
      expect(url).not.toContain('accept_type');
    });
  });

  // ── holdout — success: false ────────────────────────────────────────────

  describe('holdout() — failure case', () => {
    it('returns Holdout with success: false', async () => {
      const holdoutData: Holdout = { success: false };
      fetchMock.mockResolvedValue(makeOkResponse(holdoutData));
      await expect(api.holdout('path-1')).resolves.toEqual({ success: false });
    });
  });

  // ── network errors (fetch rejects) ─────────────────────────────────────

  describe('network errors', () => {
    it('propagates network error from ping', async () => {
      fetchMock.mockRejectedValue(new TypeError('Network request failed'));
      await expect(api.ping({})).rejects.toThrow('Network request failed');
    });

    it('propagates network error from customTrack', async () => {
      fetchMock.mockRejectedValue(new TypeError('Network request failed'));
      await expect(api.customTrack('field')).rejects.toThrow(
        'Network request failed'
      );
    });

    it('propagates network error from impression', async () => {
      fetchMock.mockRejectedValue(new TypeError('Network request failed'));
      await expect(api.impression('path-1')).rejects.toThrow(
        'Network request failed'
      );
    });

    it('propagates network error from goalResetAll', async () => {
      fetchMock.mockRejectedValue(new TypeError('Network request failed'));
      await expect(api.goalResetAll()).rejects.toThrow(
        'Network request failed'
      );
    });
  });

  // ── loggedFetch — console logging ───────────────────────────────────────

  describe('loggedFetch() — logging', () => {
    it('logs the url and method to console', async () => {
      fetchMock.mockResolvedValue(makeOkResponse());
      await api.ping({});
      expect(consoleSpy).toHaveBeenCalled();
      const loggedJson = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(loggedJson.url).toContain('https://conduit.redfast.com/ping');
      expect(loggedJson.method).toBe('GET');
    });
  });
});
