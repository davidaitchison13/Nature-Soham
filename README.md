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

The submission form sends its CSV record through GitHub Actions. The public submission workflow forwards it to the append workflow, which adds the row to `Database.csv` and commits it to `main`.

**Current limitation:** the form's photo picker is not yet connected to an upload process, so selecting an image does not store it with the sighting. The form also still displays a temporary test-style confirmation alert after submission. Review `new-sighting.html` and the workflows in `.github/workflows/` before changing this process.

## Latest News

The public Latest News page reads published articles from `news.json`. The news editor source is in `google-apps-script-news/`; it uses a private Google Sheet for drafts and updates the public news feed through GitHub when an editor presses Publish. See that folder's README for setup and access requirements.

## Editing and publishing

Edit the site files in this repository and commit changes to `main`; GitHub Pages publishes the site. Sighting and news automation is defined in `.github/workflows/`. Keep required repository secrets configured for those workflows, and do not put credentials in website files or this README.
