import type {StackNavigationProp} from '@amazon-devices/react-navigation__stack';
import type {RouteProp} from '@amazon-devices/react-navigation__native';
import {Platform, PixelRatio} from 'react-native';

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
  MovieDetail: {movie: Movie};
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
  if (Platform.OS === 'android') {
    return (lp / PixelRatio.get()) * (3840 / 1920);
  } else {
    return lp;
  }
};
