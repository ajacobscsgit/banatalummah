# Events videos

Place the Events hero video in this folder as either or both:

- `events-hero.webm`
- `events-hero.mp4`

Place the Moments community video as either or both:

- `community-highlights.webm`
- `community-highlights.mp4`

Each video uses its matching poster in `assets/images/events/`. The page tries
WebM first and MP4 second; it does not fall back to videos used on other pages.
These paths are configured in `js/events-data.js`.

Videos use native controls. The hero autoplays muted when motion is allowed and
respects reduced-motion settings; the community video never autoplays. Use
compressed, captioned clips where possible.
