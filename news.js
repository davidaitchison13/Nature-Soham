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
        posts.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

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
    const parsedDate = new Date(`${post.date}T12:00:00`);
    date.textContent = Number.isNaN(parsedDate.getTime())
        ? String(post.date || "")
        : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(parsedDate);
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

function isHttpsUrl(value) {
    try {
        return new URL(value, window.location.href).protocol === "https:";
    } catch {
        return false;
    }
}
