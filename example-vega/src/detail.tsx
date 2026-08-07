import {View, FlatList, Text, Image, StyleSheet, Button} from 'react-native';
import {useRoute} from '@amazon-devices/react-navigation__native';
import type {MovieDetailScreenRouteProp} from './types';
import type {ImageURISource} from 'react-native';
import React from 'react';
import {usePrompt} from '@recurly/engage-react-native';
import {PathType} from '@recurly/engage-core';

const Separator = () => <View style={styles.separator} />;

interface Row {
  id: string;
  height?: number;
  image?: ImageURISource;
}

export default function MovieDetailScreen() {
  const {movie} = useRoute<MovieDetailScreenRouteProp>().params;
  const [detailRow] = React.useState<Row[]>([
    {
      id: '-2',
    },
    {
      id: '-1',
    },
    {
      id: '0',
      height: 200,
      image: require('../assets/description1.png'),
    },
    {
      id: '1',
      height: 250,
      image: require('../assets/description2.png'),
    },
    {
      id: '2',
      height: 400,
      image: require('../assets/description3.png'),
    },
    {
      id: '3',
      height: 300,
      image: require('../assets/description4.png'),
    },
    {
      id: '4',
      height: 400,
      image: require('../assets/description5.png'),
    },
  ]);
  const {
    dispatch,
    state: {promptMgr},
  } = usePrompt();

  React.useEffect(() => {
    if (promptMgr) {
      (async () => {
        promptMgr.screenChanged('detail');

        // test the getTriggerablePrompts and getPrompts APIs
        let prompts = promptMgr.getPrompts(PathType.BOTTOM_BANNER);
        prompts = await promptMgr.getTriggerablePrompts(
          'genres',
          '*',
          PathType.ALL
        );
        if (prompts.length > 0) {
          prompts[0]?.impression();
        }
      })();
    }
  }, [promptMgr, dispatch]);

  return (
    <View style={styles.container}>
      <Image source={{uri: movie.sdPoster}} style={styles.movieImage} />
      <Separator />
      <Button
        title="Purchase"
        onPress={() => promptMgr?.buttonClicked('purchase')}
      />
      <Separator />
      <Button title="Rent" onPress={() => promptMgr?.buttonClicked('rent')} />
      <Separator />
      <Button
        title="Wizard"
        onPress={() => promptMgr?.buttonClicked('wizard')}
      />
      <Separator />
      <FlatList
        data={detailRow}
        keyExtractor={(item) => item.id}
        renderItem={({item}) => {
          switch (item.id) {
            case '-2':
              return (
                <View>
                  <Text style={styles.title}>{movie.title}</Text>
                  <Text style={styles.description}>{movie.description}</Text>
                  <Text />
                </View>
              );
            case '-1':
              return (
                <View>
                  <Text style={styles.description}>Duration: 1 hr 49 mins</Text>
                  <Text style={styles.description}>
                    Director: {movie.directors}
                  </Text>
                  <Text />
                </View>
              );
            default:
              return (
                <Image
                  source={item.image!}
                  style={{...styles.imageRow, height: item.height}}
                  resizeMode="stretch"
                />
              );
          }
        }}
        ItemSeparatorComponent={Separator}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
    paddingBottom: 40,
  },
  movieImage: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'left',
  },
  imageRow: {
    width: '100%',
    borderRadius: 10,
  },
  separator: {
    // Style your separator
    height: 10, // Adjust height for spacing
    width: '100%',
    backgroundColor: 'transparent', // Or a color if you want a visible line
  },
});
