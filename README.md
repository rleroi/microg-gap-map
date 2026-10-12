# microG gap map

A visual map of which Google Play services features [microG](https://microg.org/) covers, which are missing, and how many people are waiting for each.

Live page: https://rleroi.github.io/microg-gap-map/

Context: Google plans to require developer registration for all Android apps from 2027 (see [Keep Android Open](https://keepandroidopen.org/)). Phones running a de-Googled Android with microG are outside that. Every gap closed in microG makes that switch easier.

## Data

Everything is in [`data.json`](data.json):

- **Status** follows the microG wiki page [Implementation status](https://github.com/microg/GmsCore/wiki/Implementation-Status).
- **Demand** is the reaction count on the matching [microG GmsCore issues](https://github.com/microg/GmsCore/issues).
- **Bounties** are taken from the linked issues.

Corrections are welcome as pull requests. Please link a source for any status change.

## Run locally

```sh
python3 -m http.server
```

Then open http://localhost:8000/. No build step.

Not affiliated with microG or Google.
