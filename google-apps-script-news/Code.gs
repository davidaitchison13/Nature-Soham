const NEWS_HEADERS = [
  "PostID", "Title", "Date", "Summary", "Body", "ImageFileID", "ImageAlt", "Status", "UpdatedAt"
];
const NEWS_REPO_OWNER = "davidaitchison13";
const NEWS_REPO_NAME = "Nature-Soham";
const NEWS_BRANCH = "main";

function doGet() {
  requireEditor_();
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("Nature Soham News Editor")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

/** Run once from the Apps Script editor while signed in to the Nature Soham account. */
function setupNewsStore() {
  const properties = PropertiesService.getScriptProperties();
  const ownerEmail = String(Session.getEffectiveUser().getEmail() || "").trim().toLowerCase();
  if (!ownerEmail) throw new Error("Run setup while signed in to the Google account that owns the Nature Soham editor.");
  let spreadsheetId = properties.getProperty("NEWS_SPREADSHEET_ID");
  let folderId = properties.getProperty("NEWS_PHOTO_FOLDER_ID");

  if (!spreadsheetId) {
    const spreadsheet = SpreadsheetApp.create("Nature Soham News Posts");
    const sheet = spreadsheet.getSheets()[0];
    sheet.setName("Posts");
    sheet.getRange(1, 1, 1, NEWS_HEADERS.length).setValues([NEWS_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange("A:I").setNumberFormat("@");
    spreadsheetId = spreadsheet.getId();
    properties.setProperty("NEWS_SPREADSHEET_ID", spreadsheetId);
  }

  if (!folderId) {
    const folder = DriveApp.createFolder("Nature Soham News Photos");
    folderId = folder.getId();
    properties.setProperty("NEWS_PHOTO_FOLDER_ID", folderId);
  }

  properties.setProperty("NEWS_ALLOWED_EMAILS", ownerEmail);
  Logger.log("News store ready. Spreadsheet: https://docs.google.com/spreadsheets/d/%s/edit", spreadsheetId);
  Logger.log("News photo folder: https://drive.google.com/drive/folders/%s", folderId);
}

function listNewsPosts() {
  requireEditor_();
  const sheet = getPostsSheet_();
  const values = sheet.getDataRange().getDisplayValues();
  return values.slice(1).filter(row => row[0]).map(row => ({
    id: row[0], title: row[1], date: row[2], summary: row[3], body: row[4],
    imageFileId: row[5], imageAlt: row[6], status: row[7], updatedAt: row[8]
  })).sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function saveNewsDraft(formData) {
  requireEditor_();
  const clean = validateNewsData_(formData);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getPostsSheet_();
    const rows = sheet.getDataRange().getDisplayValues();
    let rowIndex = clean.id ? rows.findIndex((row, index) => index > 0 && row[0] === clean.id) : -1;
    const postId = rowIndex > 0 ? clean.id : Utilities.getUuid();
    let imageFileId = rowIndex > 0 ? rows[rowIndex][5] : "";
    const wasPublished = rowIndex > 0 && rows[rowIndex][7] === "published";
    const previousImageFileId = wasPublished ? rows[rowIndex][5] : "";

    if (wasPublished) removePublicNewsPost_(postId, rows[rowIndex][1]);
    if (previousImageFileId) makeNewsImagePrivate_(previousImageFileId);
    if (clean.imageBase64) imageFileId = saveNewsImage_(clean);

    const values = [[
      postId, clean.title, clean.date, clean.summary, clean.body, imageFileId,
      clean.imageAlt, "draft", new Date().toISOString()
    ]];

    if (rowIndex > 0) {
      sheet.getRange(rowIndex + 1, 1, 1, NEWS_HEADERS.length).setValues(values);
    } else {
      sheet.appendRow(values[0]);
      rowIndex = sheet.getLastRow() - 1;
    }

    return {
      id: postId,
      status: "draft",
      message: wasPublished ? "Saved for later and removed from the website." : "Draft saved. It has not been published."
    };
  } finally {
    lock.releaseLock();
  }
}

function setNewsPostStatus(postId, status) {
  requireEditor_();
  const nextStatus = String(status || "").trim().toLowerCase();
  if (["draft", "unpublished", "archived"].indexOf(nextStatus) < 0) {
    throw new Error("Choose Saved for Later, Unpublished or Archived.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getPostsSheet_();
    const rows = sheet.getDataRange().getDisplayValues();
    const rowIndex = rows.findIndex((row, index) => index > 0 && row[0] === String(postId));
    if (rowIndex < 1) throw new Error("That article could not be found. Refresh the list and try again.");

    const row = rows[rowIndex];
    const wasPublished = row[7] === "published";
    if (wasPublished) {
      removePublicNewsPost_(row[0], row[1]);
      if (row[5]) makeNewsImagePrivate_(row[5]);
    }
    sheet.getRange(rowIndex + 1, 8, 1, 2).setValues([[nextStatus, new Date().toISOString()]]);
    const labels = { draft: "Saved for later", unpublished: "Unpublished", archived: "Archived" };
    return {
      id: row[0], status: nextStatus,
      message: wasPublished ? "Removed from the website and marked " + labels[nextStatus] + "." : "Marked " + labels[nextStatus] + "."
    };
  } finally {
    lock.releaseLock();
  }
}

function publishNewsPost(postId) {
  requireEditor_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getPostsSheet_();
    const rows = sheet.getDataRange().getDisplayValues();
    const rowIndex = rows.findIndex((row, index) => index > 0 && row[0] === String(postId));
    if (rowIndex < 1) throw new Error("That draft could not be found. Refresh the list and try again.");

    const row = rows[rowIndex];
    if (!row[1] || !row[2] || !row[3] || !row[4]) {
      throw new Error("Add a title, date, short introduction and article before publishing.");
    }

    let imageUrl = "";
    if (row[5]) {
      const photo = DriveApp.getFileById(row[5]);
      photo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      imageUrl = "https://drive.google.com/thumbnail?id=" + encodeURIComponent(row[5]) + "&sz=w1600";
    }

    const post = {
      id: row[0], title: row[1], date: row[2], summary: row[3],
      body: String(row[4]).split(/\n\s*\n/).map(text => text.trim()).filter(Boolean),
      imageUrl, imageAlt: row[6] || ""
    };

    const changed = updatePublicNews_(post);
    sheet.getRange(rowIndex + 1, 8, 1, 2).setValues([["published", new Date().toISOString()]]);
    return {
      id: post.id,
      status: "published",
      message: changed ? "Published. The website will update automatically." : "This post is already published and up to date."
    };
  } finally {
    lock.releaseLock();
  }
}

function validateNewsData_(formData) {
  const data = formData || {};
  const title = String(data.title || "").trim();
  const date = String(data.date || "").trim();
  const summary = String(data.summary || "").trim();
  const body = String(data.body || "").trim();
  const imageAlt = String(data.imageAlt || "").trim();
  if (!title || title.length > 160) throw new Error("Enter a title of up to 160 characters.");
  const dateTimeMatch = date.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}):(\d{2}))?$/);
  if (!dateTimeMatch || isNaN(Date.parse(dateTimeMatch[1] + "T12:00:00Z")) ||
      (dateTimeMatch[2] && (Number(dateTimeMatch[2]) > 23 || Number(dateTimeMatch[3]) > 59))) {
    throw new Error("Choose a valid date and time for this news post.");
  }
  if (!summary || summary.length > 500) throw new Error("Enter a short introduction of up to 500 characters.");
  if (!body || body.length > 30000) throw new Error("Enter the article text (up to 30,000 characters).");
  if (imageAlt.length > 250) throw new Error("Keep the photo description under 250 characters.");

  const imageData = String(data.imageData || "");
  let imageBase64 = "";
  let imageMimeType = "";
  if (imageData) {
    const match = imageData.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) throw new Error("Choose a JPG, PNG, WebP or GIF image.");
    if (match[2].length > 5600000) throw new Error("Please choose an image smaller than 4 MB.");
    imageMimeType = match[1];
    imageBase64 = match[2];
    if (!imageAlt) throw new Error("Add a short description for the photo.");
  }

  return {
    id: String(data.id || "").trim(), title, date, summary, body, imageAlt,
    imageBase64, imageMimeType, imageName: String(data.imageName || "news-photo")
  };
}

function saveNewsImage_(data) {
  const bytes = Utilities.base64Decode(data.imageBase64);
  const blob = Utilities.newBlob(bytes, data.imageMimeType, sanitizeImageName_(data.imageName));
  const folder = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty("NEWS_PHOTO_FOLDER_ID"));
  return folder.createFile(blob).getId();
}

function sanitizeImageName_(name) {
  const clean = String(name || "news-photo").replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 100);
  return clean || "news-photo";
}

function updatePublicNews_(post) {
  const token = PropertiesService.getScriptProperties().getProperty("GITHUB_CONTENTS_TOKEN");
  if (!token) throw new Error("The site publishing connection has not been configured yet.");

  const apiUrl = "https://api.github.com/repos/" + NEWS_REPO_OWNER + "/" + NEWS_REPO_NAME + "/contents/news.json?ref=" + NEWS_BRANCH;
  const headers = {
    Authorization: "Bearer " + token,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  const currentResponse = UrlFetchApp.fetch(apiUrl, { method: "get", headers, muteHttpExceptions: true });
  if (currentResponse.getResponseCode() !== 200) {
    throw new Error("Could not read the site news file from GitHub (HTTP " + currentResponse.getResponseCode() + ").");
  }

  const currentFile = JSON.parse(currentResponse.getContentText());
  const currentJson = Utilities.newBlob(Utilities.base64Decode(String(currentFile.content || "").replace(/\s/g, ""))).getDataAsString("UTF-8");
  const news = JSON.parse(currentJson);
  const posts = Array.isArray(news.posts) ? news.posts : [];
  const existingIndex = posts.findIndex(item => item.id === post.id);
  if (existingIndex >= 0 && JSON.stringify(posts[existingIndex]) === JSON.stringify(post)) return false;
  if (existingIndex >= 0) posts[existingIndex] = post;
  else posts.push(post);
  posts.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  const updatedContent = JSON.stringify({ posts }, null, 2) + "\n";
  const updateResponse = UrlFetchApp.fetch(
    "https://api.github.com/repos/" + NEWS_REPO_OWNER + "/" + NEWS_REPO_NAME + "/contents/news.json",
    {
      method: "put",
      contentType: "application/json",
      headers,
      payload: JSON.stringify({
        message: "Publish news post: " + post.title.slice(0, 72),
        content: Utilities.base64Encode(updatedContent, Utilities.Charset.UTF_8),
        sha: currentFile.sha,
        branch: NEWS_BRANCH
      }),
      muteHttpExceptions: true
    }
  );

  const code = updateResponse.getResponseCode();
  if (code !== 200 && code !== 201) {
    const detail = code === 409 ? "The news file changed during publishing. Please try Publish again." :
      "GitHub could not publish the news post (HTTP " + code + ").";
    throw new Error(detail);
  }
  return true;
}

function removePublicNewsPost_(postId, title) {
  const token = PropertiesService.getScriptProperties().getProperty("GITHUB_CONTENTS_TOKEN");
  if (!token) throw new Error("The site publishing connection has not been configured yet.");

  const apiUrl = "https://api.github.com/repos/" + NEWS_REPO_OWNER + "/" + NEWS_REPO_NAME + "/contents/news.json?ref=" + NEWS_BRANCH;
  const headers = {
    Authorization: "Bearer " + token,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  const currentResponse = UrlFetchApp.fetch(apiUrl, { method: "get", headers, muteHttpExceptions: true });
  if (currentResponse.getResponseCode() !== 200) {
    throw new Error("Could not read the site news file from GitHub (HTTP " + currentResponse.getResponseCode() + ").");
  }

  const currentFile = JSON.parse(currentResponse.getContentText());
  const currentJson = Utilities.newBlob(Utilities.base64Decode(String(currentFile.content || "").replace(/\s/g, ""))).getDataAsString("UTF-8");
  const news = JSON.parse(currentJson);
  const posts = Array.isArray(news.posts) ? news.posts : [];
  const remaining = posts.filter(item => item.id !== String(postId));
  if (remaining.length === posts.length) return false;

  const updateResponse = UrlFetchApp.fetch(
    "https://api.github.com/repos/" + NEWS_REPO_OWNER + "/" + NEWS_REPO_NAME + "/contents/news.json",
    {
      method: "put",
      contentType: "application/json",
      headers,
      payload: JSON.stringify({
        message: "Unpublish news post: " + String(title || "").slice(0, 72),
        content: Utilities.base64Encode(JSON.stringify({ posts: remaining }, null, 2) + "\n", Utilities.Charset.UTF_8),
        sha: currentFile.sha,
        branch: NEWS_BRANCH
      }),
      muteHttpExceptions: true
    }
  );

  const code = updateResponse.getResponseCode();
  if (code !== 200 && code !== 201) {
    const detail = code === 409 ? "The news file changed during the update. Please try again." :
      "GitHub could not update the published news file (HTTP " + code + ").";
    throw new Error(detail);
  }
  return true;
}

function makeNewsImagePrivate_(imageFileId) {
  DriveApp.getFileById(imageFileId).setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);
}

function getPostsSheet_() {
  const id = PropertiesService.getScriptProperties().getProperty("NEWS_SPREADSHEET_ID");
  if (!id) throw new Error("Run setupNewsStore from the Apps Script editor first.");
  const sheet = SpreadsheetApp.openById(id).getSheetByName("Posts");
  if (!sheet) throw new Error("The Posts sheet is missing from the news store.");
  return sheet;
}

function requireEditor_() {
  const email = String(Session.getActiveUser().getEmail() || "").trim().toLowerCase();
  const configured = PropertiesService.getScriptProperties().getProperty("NEWS_ALLOWED_EMAILS") || "";
  const allowed = configured.split(",").map(item => item.trim().toLowerCase()).filter(Boolean);
  if (!email || !allowed.includes(email)) {
    throw new Error("Please sign in with an authorised Nature Soham Google account to use the news editor.");
  }
}
