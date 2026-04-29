const EXERCISEDB_API_KEY = process.env.EXPO_PUBLIC_EXERCISEDB_API_KEY;
const EXERCISEDB_BASE_URL = 'https://exercisedb.p.rapidapi.com';

const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';

const CACHE = {
  exerciseDetails: {},
  youtubeVideos: {}
};

const CATEGORY_CHANNELS = {
  Compound: ['UCe0TLA0EsQbE-MjuHXevPRg', 'UCIDbsjbf8DSyPm2lOdgNIAg'],
  Chest: ['UCe0TLA0EsQbE-MjuHXevPRg'],
  Back: ['UCe0TLA0EsQbE-MjuHXevPRg'],
  Shoulders: ['UCe0TLA0EsQbE-MjuHXevPRg'],
  Arms: ['UCe0TLA0EsQbE-MjuHXevPRg'],
  Legs: ['UCe0TLA0EsQbE-MjuHXevPRg'],
  Calves: ['UCe0TLA0EsQbE-MjuHXevPRg'],
  Core: ['UCZIIRX8rkNjVpP-oLMHpeDw'],
  Abs: ['UCZIIRX8rkNjVpP-oLMHpeDw'],
  Cardio: ['UCu4SCLX5b5WfX1Y51M5FLCA']
};

export const exerciseDBService = {
  async getExerciseDetails(exerciseName) {
    if (CACHE.exerciseDetails[exerciseName]) {
      return CACHE.exerciseDetails[exerciseName];
    }

    try {
      const response = await fetch(`${EXERCISEDB_BASE_URL}/exercises/name/${encodeURIComponent(exerciseName)}?limit=1`, {
        headers: {
          'x-rapidapi-host': 'exercisedb.p.rapidapi.com',
          'x-rapidapi-key': EXERCISEDB_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data && data.length > 0) {
        const result = {
          gifUrl: data[0].gifUrl,
          instructions: data[0].instructions || []
        };
        CACHE.exerciseDetails[exerciseName] = result;
        return result;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch from ExerciseDB:', error);
      return null;
    }
  },

  async getYouTubeVideo(exerciseName, category) {
    if (CACHE.youtubeVideos[exerciseName]) {
      return CACHE.youtubeVideos[exerciseName];
    }

    const query = `${exerciseName} proper form tutorial`;
    const channelsToTry = CATEGORY_CHANNELS[category] || [];

    try {
      for (const channelId of channelsToTry) {
        const video = await this._searchYouTube(query, channelId);
        if (video) {
          CACHE.youtubeVideos[exerciseName] = video;
          return video;
        }
      }

      // Fallback unrestricted search
      const fallbackVideo = await this._searchYouTube(query);
      if (fallbackVideo) {
        CACHE.youtubeVideos[exerciseName] = fallbackVideo;
        return fallbackVideo;
      }

      return null;
    } catch (error) {
      console.error('Failed to fetch from YouTube:', error);
      return null;
    }
  },

  async _searchYouTube(query, channelId = null) {
    let url = `${YOUTUBE_SEARCH_URL}?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`;
    if (channelId) {
      url += `&channelId=${channelId}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      return {
        videoId: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url
      };
    }
    return null;
  }
};
