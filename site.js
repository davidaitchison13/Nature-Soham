const SITE_UNDER_CONSTRUCTION = true;

document.addEventListener("DOMContentLoaded", () => {
    if (SITE_UNDER_CONSTRUCTION !== true) return;

    const nav = document.querySelector(".main-nav");
    if (!nav || document.querySelector(".construction-notice")) return;

    const notice = document.createElement("aside");
    notice.className = "construction-notice";
    notice.setAttribute("aria-label", "Website status");

    const heading = document.createElement("strong");
    heading.textContent = "Under Construction";

    const message = document.createElement("p");
    message.textContent =
        "We’re still building Nature Soham. Some pages and features may change.";

    notice.append(heading, message);
    nav.insertAdjacentElement("afterend", notice);
});
