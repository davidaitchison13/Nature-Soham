const NEWS_FEED_URL = "news.json";

document.addEventListener("DOMContentLoaded", loadNews);

async function loadNews() {
    const status = document.getElementById("news-status");
    const list = document.getElementById("news-list");

    try {
        const response = await fetch(NEWS_FEED_URL, { cache: "no-store" });
        if (!response.ok) throw new Error(`News feed returned ${response.status}`);

        const data = await response.json();
        const posts = Array.isArray(data.posts) ? data.posts : [];
        posts.sort((a, b) => {
            const dateDifference = parsePostDateTime(b.date) - parsePostDateTime(a.date);
            return Number.isNaN(dateDifference) || dateDifference === 0
                ? String(b.date || "").localeCompare(String(a.date || ""))
                : dateDifference;
        });

        list.replaceChildren();
        if (posts.length === 0) {
            status.textContent = "There are no news posts yet. Please check back soon.";
            return;
        }

        for (const post of posts) list.append(createNewsArticle(post));
        status.textContent = `${posts.length} ${posts.length === 1 ? "news post" : "news posts"}`;
    } catch (error) {
        console.error("Could not load the Nature Soham news feed.", error);
        status.textContent = "The latest news could not be loaded just now. Please try again later.";
    }
}

function createNewsArticle(post) {
    const article = document.createElement("article");
    article.className = "news-card";

    const heading = document.createElement("h2");
    heading.textContent = String(post.title || "News update");
    article.append(heading);

    const date = document.createElement("time");
    date.className = "news-date";
    date.dateTime = String(post.date || "");
    const postDate = String(post.date || "");
    const parsedDate = parsePostDateTime(postDate);
    if (Number.isNaN(parsedDate)) {
        date.textContent = postDate;
    } else {
        const dateOptions = { day: "numeric", month: "long", year: "numeric" };
        const dateText = new Intl.DateTimeFormat("en-GB", dateOptions).format(new Date(parsedDate));
        const timeMatch = postDate.match(/T(\d{2}):(\d{2})/);
        date.textContent = timeMatch
            ? `${dateText} at ${new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(parsedDate))}`
            : dateText;
    }
    article.append(date);

    if (post.imageUrl && isHttpsUrl(post.imageUrl)) {
        const image = document.createElement("img");
        image.className = "news-image";
        image.src = post.imageUrl;
        image.alt = String(post.imageAlt || "");
        image.loading = "lazy";
        article.append(image);
    }

    if (post.summary) {
        const summary = document.createElement("p");
        summary.className = "news-summary";
        summary.textContent = String(post.summary);
        article.append(summary);
    }

    const body = Array.isArray(post.body) ? post.body : [];
    for (const paragraphText of body) {
        if (!String(paragraphText || "").trim()) continue;
        const paragraph = document.createElement("p");
        paragraph.textContent = String(paragraphText);
        article.append(paragraph);
    }

    return article;
}

function parsePostDateTime(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);
    if (!match) return NaN;
    const [, year, month, day, hours = "00", minutes = "00"] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes));
    if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 ||
        date.getDate() !== Number(day) || date.getHours() !== Number(hours) || date.getMinutes() !== Number(minutes)) return NaN;
    return date.getTime();
}

function isHttpsUrl(value) {
    try {
        return new URL(value, window.location.href).protocol === "https:";
    } catch {
        return false;
    }
}
