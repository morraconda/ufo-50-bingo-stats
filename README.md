# UFO Bingo Stats Dashboard

Simple static dashboard for GitHub Pages.

## What it shows

For any selected `Player` + `Game` combination, it calculates the proportion of:

- goals completed by the selected player
- goals completed by the other player in that match
- goals not completed by anyone

The calculation uses rows from `UFO 50 Bingo S3 stats - Data.csv` where:

- `Game` matches the selected game
- selected player appears as either `Player 1` or `Player 2`

## Run locally

Because browsers block `fetch()` from local file URLs, run a local web server:

```bash
python -m http.server 8000
```

Then open:

[http://localhost:8000](http://localhost:8000)

## Deploy to GitHub Pages

1. Push these files to a GitHub repository.
2. In GitHub, open **Settings** -> **Pages**.
3. Set **Source** to **Deploy from a branch**.
4. Select the branch (usually `main`) and `/ (root)` folder.
5. Save. GitHub Pages will publish `index.html`.
