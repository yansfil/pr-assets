# pr-assets

Screenshots referenced from pull request bodies in Hoyeon's repositories.
GitHub's CLI cannot upload user attachments, so an agent that opens a pull request puts its screenshots here and links them with `?raw=true`.

## Layout

```text
<repository>/<topic-slug>/<head-sha7>/<file>.png
```

The head SHA makes every path unique, so a new head never overwrites an image GitHub's proxy has cached.

## Rules

- Nothing here is ever deleted or rewritten; a pull request body keeps pointing at its image for as long as the pull request exists.
- Everything here is public. An image is cropped to the product surface it shows, never a whole screen, and never carries a user name, host name, home directory, or a project that is not a fixture.
- Uploads come from `prd_ship.js screenshots` in the sasu ship skill, one file per commit through the Contents API; a path that already exists is left alone.
