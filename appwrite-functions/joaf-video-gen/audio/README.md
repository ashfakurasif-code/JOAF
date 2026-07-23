# Audio Files (Optional)

These MP3 files are optional background audio for video reels.
Currently video generation uses `audio_style: "none"` by default.

To add real audio:
1. Place MP3 files here: upbeat.mp3, emotional.mp3, dramatic.mp3
2. Max size: ~500KB per file to stay within 512MB function RAM limit
3. Duration: match your VIDEO_DURATION setting (default 15s)
4. Format: MP3, 44100Hz, stereo or mono

The current placeholder files (36 bytes) are intentionally empty.
The video generation code checks file size before using audio.
