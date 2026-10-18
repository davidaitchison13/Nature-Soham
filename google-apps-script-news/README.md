# Nature Soham News Editor

This folder contains the source for a separate Google Apps Script web app. The editor saves drafts and optional photos in a private Google Sheet and Drive folder. Publishing updates `news.json` in the Nature-Soham repository; the existing GitHub Pages deployment then refreshes the public website.

## Initial setup

1. Create a new standalone Apps Script project while signed in to the Nature Soham Google account and copy `Code.gs` and `Index.html` into it. Keep this project separate from the photo-intake script.
2. Run `setupNewsStore()` once from the Apps Script editor. Authorize the requested Sheets and Drive access. The function creates the private posts spreadsheet and photo folder and stores their IDs in Script Properties.
3. Create a GitHub fine-grained personal access token limited to the `davidaitchison13/Nature-Soham` repository with **Contents: Read and write**. In Apps Script project settings, add a Script Property named `GITHUB_CONTENTS_TOKEN` with that token as its value. Never add the token to this repository or the HTML file.
4. Deploy as a web app that **executes as the user accessing it** and requires a signed-in Google account. The server checks the account email against `NEWS_ALLOWED_EMAILS`. If the editor will sign in with a different account, add that address to this property after setup and give it access to the posts spreadsheet and image folder.
5. Share the web-app URL with the editor and bookmark it. Drafts stay private. Pressing **Publish** makes the chosen photo viewable by link and commits the post to `news.json` on `main`.

The `news.json` file is the public feed used by `news.html`. Post text is rendered as text rather than HTML. The publisher takes a script lock and replaces a post by its stable ID, so retrying a publish does not create a second copy.

## Important deployment check

Apps Script web-app access choices can differ by account type. Before handing this to the editor, deploy a test version and confirm that the editor signs in with the expected Google account and that `Session.getActiveUser().getEmail()` returns that address. Do not make the web app anonymous. Use a token restricted to this repository only.
