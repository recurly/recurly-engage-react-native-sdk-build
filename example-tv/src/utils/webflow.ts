import type { Movie } from '../types';

const BaseUrl = 'https://api.webflow.com/v2';
const BearerToken =
  'Bearer c405ed357f5046964ad69f1b5f45df7da5a03913af05cf685612a724bd5e48ed';

interface Thumbnail {
  url: string;
}

interface MovieItem {
  // This is the structure inside 'fieldData'
  'name': string;
  'director': string;
  'duration': string;
  'short-description': string;
  'thumbnail-image': Thumbnail;
  'thumbnail-landscape': Thumbnail;
  'thumbnail-portrait': Thumbnail;
  // ... other properties
}

interface Item {
  id: string;
  fieldData: MovieItem;
}

interface ApiResponse {
  items: Item[];
}

const getJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`); // Throw error for non-2xx status codes
  }
  const json = await response.json();
  return json;
};

export const getAllCategory = async () => {
  const response = await fetch(
    `${BaseUrl}/collections/635c3e79a327a5864dd7a7cc/items`,
    {
      headers: {
        'Authorization': BearerToken,
        'Content-Type': 'application/json',
      },
    }
  );
  const json = await getJson(response);
  return json;
};

export const getAllMovies = async (): Promise<Movie[]> => {
  const response = await fetch(
    `${BaseUrl}/collections/635c3e79a327a596b2d7a7cd/items`,
    {
      headers: {
        'Authorization': BearerToken,
        'Content-Type': 'application/json',
      },
    }
  );

  const json: ApiResponse = await getJson<ApiResponse>(response);
  const movies = json.items.map((item) => {
    let movieItem = item.fieldData;
    const movie: Movie = {
      id: item.id,
      title: movieItem.name,
      directors: [movieItem.director],
      shortDescriptionLine2: movieItem.duration,
      description: movieItem['short-description'],
      hdPosterLandscape: movieItem['thumbnail-image'].url,
      sdPoster: movieItem['thumbnail-landscape'].url,
      hdPosterPortrait: movieItem['thumbnail-portrait'].url,
    };
    return movie;
  });
  return movies;
};
