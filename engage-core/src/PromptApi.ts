import type { ActionsData, DeviceInfo, Holdout } from './types';

const BaseUrl = 'https://conduit.redfast.com';

const getJson = async <T>(
  response: Response,
  ignore = false
): Promise<T | null> => {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`); // Throw error for non-2xx status codes
  }
  if (ignore) return null;
  const json = await response.json();
  return json;
};

const sanitizeObj = (
  obj: { [key: string]: string | undefined } = {}
): { [key: string]: string } => {
  return Object.keys(obj).reduce<{ [key: string]: string }>((sum, key) => {
    const val = obj[key];
    if (val) {
      sum[key] = val;
    }
    return sum;
  }, {});
};

export class PromptApi {
  private anonymousId: string;
  private etag?: string;
  private device: DeviceInfo;
  private appId: string;
  private userId: string;

  constructor(appId: string, userId: string, device: DeviceInfo) {
    this.appId = appId;
    this.userId = userId;
    this.device = device;
    this.etag = '';
    this.anonymousId = '';
  }

  getDevice() {
    return this.device;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  getUserId() {
    return this.userId;
  }

  private checkUserId() {
    if (!this.userId && !this.anonymousId) {
      throw new Error('user id is not provided');
    }
  }

  private commonHeader(): { [key: string]: string } {
    const header = sanitizeObj({
      'Accept': 'application/json',
      'USER-ID': this.userId,
      'ANONYMOUS-USER-ID': this.anonymousId,
    });
    return header;
  }

  private buildUserParams(params: { [key: string]: string | undefined }): {
    [key: string]: string;
  } {
    const sanitized = sanitizeObj(params);
    return {
      ...this.device,
      ...sanitized,
      id: this.appId,
      send_ts: Date.now().toString(),
    };
  }

  private async loggedFetch(url: string, options: { [key: string]: any } = {}) {
    const { method } = options;
    console.log(JSON.stringify({ url, method }, null, 2));
    return fetch(url, options);
  }

  private buildUrl(
    restApi: string,
    params: { [key: string]: string | undefined }
  ): string {
    const searchParams = new URLSearchParams();
    const sanitized = sanitizeObj(params);
    Object.keys(sanitized).forEach((key) => {
      searchParams.append(key, sanitized[key] as string);
    });
    const url = `${BaseUrl}/${restApi}`;
    const queryString = searchParams.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  async ping(pingParams: {
    [key: string]: string;
  }): Promise<ActionsData | null> {
    const httpHeader = this.commonHeader();
    if (this.etag) {
      httpHeader['If-None-Match'] = this.etag;
    }
    const url = this.buildUrl(
      'ping',
      this.buildUserParams({
        ...pingParams,
      })
    );
    const response = await this.loggedFetch(url, {
      method: 'GET',
      headers: httpHeader,
    });
    this.etag = response.headers.get('etag') ?? this.etag;
    if (response.status === 304) {
      return null;
    }
    const json = (await getJson<ActionsData>(response)) as ActionsData;
    if (json.anonymous_user_id) {
      this.anonymousId = json.anonymous_user_id;
    }
    return json;
  }

  async customTrack(customFieldId: string): Promise<void> {
    this.checkUserId();
    const url = this.buildUrl(
      'ping',
      this.buildUserParams({
        type: 'custom',
        custom_field_id: encodeURIComponent(customFieldId),
      })
    );
    const response = await this.loggedFetch(url, {
      method: 'GET',
      headers: this.commonHeader(),
    });
    await getJson(response, true);
  }

  async impression(pathId: string, actionGroupId?: string): Promise<void> {
    this.checkUserId();
    const url = this.buildUrl(
      `paths/${pathId}/impression`,
      this.buildUserParams({
        action_group_id: actionGroupId,
      })
    );
    const response = await this.loggedFetch(url, {
      method: 'GET',
      headers: this.commonHeader(),
    });
    await getJson(response, true);
  }

  async dismiss(
    pathId: string,
    reason: string,
    actionGroupId?: string
  ): Promise<void> {
    this.checkUserId();
    const url = this.buildUrl(
      `paths/${pathId}/dismiss`,
      this.buildUserParams({
        action_group_id: actionGroupId,
        click: reason,
      })
    );
    const response = await this.loggedFetch(url, {
      method: 'GET',
      headers: this.commonHeader(),
    });
    await getJson(response, true);
  }

  async goal(
    pathId: string,
    actionGroupId?: string,
    actionType?: string,
    acceptType?: string,
    surveySelection?: string
  ): Promise<void> {
    this.checkUserId();
    const url = this.buildUrl(
      `paths/${pathId}/goal`,
      this.buildUserParams({
        action_group_id: actionGroupId,
        action_type: actionType, // ignored by server
        accept_type: acceptType,
        survey_input_value: surveySelection,
      })
    );
    const response = await this.loggedFetch(url, {
      method: 'GET',
      headers: this.commonHeader(),
    });
    await getJson(response, true);
  }

  async holdout(pathId: string, actionGroupId?: string): Promise<Holdout> {
    this.checkUserId();
    const url = this.buildUrl(
      `paths/${pathId}/holdout`,
      this.buildUserParams({
        action_group_id: actionGroupId,
      })
    );
    const response = await this.loggedFetch(url, {
      method: 'GET',
      headers: this.commonHeader(),
    });
    const json = (await getJson<Holdout>(response)) as Holdout;
    return json;
  }

  async goalResetAll(): Promise<void> {
    this.checkUserId();
    const url = this.buildUrl(
      `paths/goal_reset_all`,
      this.buildUserParams({
        client_reset_complete: 'true',
      })
    );
    const response = await this.loggedFetch(url, {
      method: 'GET',
      headers: this.commonHeader(),
    });
    await getJson(response, true);
  }
}
