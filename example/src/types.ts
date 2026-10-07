import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import { PixelRatio } from 'react-native';

export interface Movie {
  id: string;
  title: string;
  directors: string[];
  shortDescriptionLine2: string;
  description: string;
  hdPosterLandscape: string;
  hdPosterPortrait: string;
  sdPoster: string;
}

type RootStackParamList = {
  MovieDetail: { movie: Movie };
  DevTools: undefined;
  DevInlinePreview: { zoneId: string };
  DevBlankScreen: { screenName: string };
};

export type HomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'MovieDetail' | 'DevTools'
>;

export type MovieDetailScreenRouteProp = RouteProp<
  RootStackParamList,
  'MovieDetail'
>;

export type DevToolsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'DevTools'
>;

export type DevInlinePreviewScreenRouteProp = RouteProp<
  RootStackParamList,
  'DevInlinePreview'
>;

export type DevBlankScreenRouteProp = RouteProp<
  RootStackParamList,
  'DevBlankScreen'
>;

export const logicPixelToDevicePixel = (lp: number = 0) => {
  return lp / PixelRatio.get();
};
