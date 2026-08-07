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
};

export type HomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'MovieDetail'
>;

export type MovieDetailScreenRouteProp = RouteProp<
  RootStackParamList,
  'MovieDetail'
>;

export const logicPixelToDevicePixel = (lp: number = 0) => {
  return lp / PixelRatio.get();
};
