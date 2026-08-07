import { PixelRatio } from 'react-native';
import {
  gDeviceInfo,
  setGlobalDeviceInfo,
  getImageCompositeFieldName,
  modalAlignment,
  dp,
} from '../utils';
import type { DeviceInfo } from '@recurly/engage-core';

// ── setGlobalDeviceInfo / gDeviceInfo ─────────────────────────────────

describe('setGlobalDeviceInfo', () => {
  const original: DeviceInfo = { ...gDeviceInfo };

  afterEach(() => {
    // restore default
    setGlobalDeviceInfo(original);
  });

  it('updates gDeviceInfo with a shallow copy', () => {
    const info: DeviceInfo = {
      device_manufacturer: 'Apple',
      device_model: 'iPhone 15',
      device_type: 'ios',
      device_category: 'iphone',
      device_form: 'phone',
    };
    setGlobalDeviceInfo(info);

    expect(gDeviceInfo).toEqual(info);
    // should be a copy, not the same reference
    expect(gDeviceInfo).not.toBe(info);
  });
});

// ── getImageCompositeFieldName ────────────────────────────────────────

describe('getImageCompositeFieldName', () => {
  afterEach(() => {
    setGlobalDeviceInfo({
      device_manufacturer: 'unknown',
      device_model: 'unknown',
      device_type: 'unknown',
      device_category: 'unknown',
      device_form: 'phone',
    });
  });

  it('builds field name from device_type and device_category', () => {
    setGlobalDeviceInfo({
      device_manufacturer: 'Apple',
      device_model: 'iPhone 15',
      device_type: 'ios',
      device_category: 'iphone',
      device_form: 'phone',
    });
    expect(getImageCompositeFieldName()).toBe(
      'rf_settings_bg_image_ios_iphone_composite'
    );
  });

  it('works for android tablet', () => {
    setGlobalDeviceInfo({
      device_manufacturer: 'Samsung',
      device_model: 'Galaxy Tab',
      device_type: 'android_os',
      device_category: 'tablet',
      device_form: 'tablet',
    });
    expect(getImageCompositeFieldName()).toBe(
      'rf_settings_bg_image_android_os_tablet_composite'
    );
  });

  it('uses defaults when gDeviceInfo is unchanged', () => {
    expect(getImageCompositeFieldName()).toBe(
      'rf_settings_bg_image_unknown_unknown_composite'
    );
  });
});

// ── modalAlignment ────────────────────────────────────────────────────

describe('modalAlignment', () => {
  it('returns center alignment for default/unknown position', () => {
    const result = modalAlignment('center');
    expect(result).toEqual({
      justifyContent: 'center',
      alignItems: 'center',
    });
  });

  it('top_center', () => {
    const result = modalAlignment('top_center', 0, 20);
    expect(result).toEqual({
      justifyContent: 'flex-start',
      alignItems: 'center',
      marginTop: 20,
    });
  });

  it('bottom_center', () => {
    const result = modalAlignment('bottom_center', 0, 15);
    expect(result).toEqual({
      justifyContent: 'flex-end',
      alignItems: 'center',
      marginBottom: 15,
    });
  });

  it('top_left with offsets', () => {
    const result = modalAlignment('top_left', 10, 20);
    expect(result).toEqual({
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      marginTop: 20,
      marginLeft: 10,
    });
  });

  it('top_right with offsets', () => {
    const result = modalAlignment('top_right', 10, 20);
    expect(result).toEqual({
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      marginTop: 20,
      marginRight: 10,
    });
  });

  it('bottom_left with offsets', () => {
    const result = modalAlignment('bottom_left', 5, 10);
    expect(result).toEqual({
      justifyContent: 'flex-end',
      alignItems: 'flex-start',
      marginBottom: 10,
      marginLeft: 5,
    });
  });

  it('bottom_right with offsets', () => {
    const result = modalAlignment('bottom_right', 5, 10);
    expect(result).toEqual({
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      marginBottom: 10,
      marginRight: 5,
    });
  });

  it('defaults offsets to 0 when omitted', () => {
    const result = modalAlignment('top_left');
    expect(result).toEqual({
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      marginTop: 0,
      marginLeft: 0,
    });
  });
});

// ── dp ────────────────────────────────────────────────────────────────

describe('dp', () => {
  const original: DeviceInfo = { ...gDeviceInfo };

  afterEach(() => {
    setGlobalDeviceInfo(original);
    jest.restoreAllMocks();
  });

  it('divides logical pixels by PixelRatio', () => {
    jest.spyOn(PixelRatio, 'get').mockReturnValue(2);
    expect(dp(100)).toBe(50);
  });

  it('returns 0 when called with no argument', () => {
    jest.spyOn(PixelRatio, 'get').mockReturnValue(3);
    expect(dp()).toBe(0);
  });

  it('handles PixelRatio of 1', () => {
    jest.spyOn(PixelRatio, 'get').mockReturnValue(1);
    expect(dp(200)).toBe(200);
  });

  it('handles fractional PixelRatio', () => {
    jest.spyOn(PixelRatio, 'get').mockReturnValue(1.5);
    expect(dp(300)).toBeCloseTo(200);
  });

  it('divides by 2 for android_tv to align with 1080p', () => {
    setGlobalDeviceInfo({
      device_manufacturer: 'Sony',
      device_model: 'Bravia',
      device_type: 'android_tv',
      device_category: 'tv',
      device_form: 'tv',
    });
    expect(dp(200)).toBe(100);
  });

  it('returns lp unchanged for Apple TV (tv_os)', () => {
    setGlobalDeviceInfo({
      device_manufacturer: 'Apple',
      device_model: 'tvOS',
      device_type: 'tv_os',
      device_category: 'tv',
      device_form: 'tv',
    });
    expect(dp(200)).toBe(200);
  });
});
