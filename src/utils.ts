import type { DeviceInfo } from '@recurly/engage-core';
import { PixelRatio } from 'react-native';

export let gDeviceInfo: DeviceInfo = {
  device_manufacturer: 'unknown',
  device_model: 'unknown',
  device_type: 'unknown',
  device_category: 'unknown',
  device_form: 'phone',
};

export const setGlobalDeviceInfo = (deviceInfo: DeviceInfo) => {
  gDeviceInfo = { ...deviceInfo };
};

export const getImageCompositeFieldName = () => {
  const os = gDeviceInfo.device_type;
  const deviceType = gDeviceInfo.device_category;
  return `rf_settings_bg_image_${os}_${deviceType}_composite`;
};

export const modalAlignment = (
  modalPosition: string,
  offsetX = 0,
  offsetY = 0
) => {
  let justifyContent = 'center';
  let alignItems = 'center';
  const css: {
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
  } = {};
  switch (modalPosition) {
    case 'top_center':
      justifyContent = 'flex-start';
      alignItems = 'center';
      css.marginTop = offsetY;
      break;
    case 'bottom_center':
      justifyContent = 'flex-end';
      alignItems = 'center';
      css.marginBottom = offsetY;
      break;
    case 'top_left':
      justifyContent = 'flex-start';
      alignItems = 'flex-start';
      css.marginTop = offsetY;
      css.marginLeft = offsetX;
      break;
    case 'top_right':
      justifyContent = 'flex-start';
      alignItems = 'flex-end';
      css.marginTop = offsetY;
      css.marginRight = offsetX;
      break;
    case 'bottom_left':
      justifyContent = 'flex-end';
      alignItems = 'flex-start';
      css.marginBottom = offsetY;
      css.marginLeft = offsetX;
      break;
    case 'bottom_right':
      justifyContent = 'flex-end';
      alignItems = 'flex-end';
      css.marginBottom = offsetY;
      css.marginRight = offsetX;
      break;
    default:
      break;
  }
  return { ...css, justifyContent, alignItems };
};

export const dp = (lp: number = 0) => {
  if (gDeviceInfo.device_form === 'tv') {
    // for tv and to align with Roku (1920*1080), we don't use pixel density
    if (gDeviceInfo.device_type === 'android_tv') {
      // android tv's pixel density is 4.0, so we divide by 2 to align with 1080p
      return lp / 2;
    } else {
      // for apple tv's pixel density is 2, pefectly aligns with 1080p
      return lp;
    }
  }
  return lp / PixelRatio.get();
};
