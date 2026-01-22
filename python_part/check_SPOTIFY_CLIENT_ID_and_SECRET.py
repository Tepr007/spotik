from spotipy.oauth2 import SpotifyClientCredentials
import spotipy
import sys

if __name__ == "__main__":
    args = sys.argv
    SPOTIFY_CLIENT_ID = args[1]
    SPOTIFY_CLIENT_SECRET = args[2]

    try:
        auth_manager = SpotifyClientCredentials(
            client_id=SPOTIFY_CLIENT_ID,
            client_secret=SPOTIFY_CLIENT_SECRET
        )

        # попытка получить токен сразу
        token = auth_manager.get_access_token()
        print(1)
    except spotipy.oauth2.SpotifyOauthError:
        print(0)