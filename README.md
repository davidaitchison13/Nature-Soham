# Nature Soham

Nature Soham is a community wildlife sightings website for Soham, Cambridgeshire. The live site is [nature-soham.org.uk](https://nature-soham.org.uk/).

## What the site includes

- A home page with information about the project and links to the site's sections.
- A sightings page for browsing records, and a form for submitting a new sighting.
- News articles published from the public `news.json` feed and displayed on the Latest News page.
- About, useful links, contact, privacy, and geolocation pages.

The site is built from HTML, CSS, and JavaScript files and is published with GitHub Pages. There is no build step. The repository's `CNAME` file connects the Pages site to its custom domain.

## Sightings data and submissions

`Database.csv` is the sightings data file. It contains a header row followed by one row per sighting, with these columns:

`SightingID`, `SpecimenType`, `Species`, `Location`, `Description`, `Date`, `TimeOfDay`, `Count`, `Weather`, `PhotoFilename`, `ObserverName`, `Email`, `Phone`, and `SubmissionTimestamp`.

Sighting details are sent through GitHub Actions. The public submission workflow forwards the CSV record to the append workflow, which adds it to `Database.csv` and commits it to `main`.

Photos can also be submitted and are held in the Nature Soham Pending Photos folders in Google Drive for review. Once a photo is approved, the `publish-approved-photo.yml` workflow adds its Google Drive link to the matching sighting's `PhotoFilename` field. Photo handling and CSV record submission use separate workflows.

The form currently displays a temporary test-style confirmation alert after submission. Review `new-sighting.html` and the workflows in `.github/workflows/` before changing the submission process.

## Latest News

The public Latest News page reads published articles from `news.json`. The news editor source is in `google-apps-script-news/`; it uses a private Google Sheet for drafts and updates the public news feed through GitHub when an editor presses Publish. See that folder's README for setup and access requirements.

## Editing and publishing

Edit the site files in this repository and commit changes to `main`; GitHub Pages publishes the site. Sighting, photo, and news automation is defined in `.github/workflows/`. Keep required repository secrets configured for those workflows, and do not put credentials in website files or this README.
