const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cheerio = require("cheerio");

const BASE_URL = "https://books.toscrape.com/";
const START_URL = "https://books.toscrape.com/catalogue/page-1.html";

const CACHE_DIR = path.join(__dirname, "..", "cache");
const FIRST_PAGE_CACHE = path.join(CACHE_DIR, "catalogue-page-1.html");

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function cacheFileFor(url) {
    if (url === START_URL) {
        return FIRST_PAGE_CACHE;
    }

    const hash = crypto
        .createHash("sha256")
        .update(url)
        .digest("hex")
        .slice(0, 16);

    return path.join(CACHE_DIR, `${hash}.html`);
}

async function fetchPage(url) {
    const cacheFile = cacheFileFor(url);

    if (fs.existsSync(cacheFile)) {
        const html = fs.readFileSync(cacheFile, "utf8");

        console.log(`CACHE HIT: ${url}`);

        return {
            html,
            fromCache: true
        };
    }

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, 5000);

    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent":
                    "FlyRankInternship-A9/1.0 (https://github.com/SHARWANYADAV12/task-crud-api)"
            },
            signal: controller.signal
        });

        if (response.status !== 200) {
            throw new Error(`Fetch failed with status ${response.status}`);
        }

        const html = await response.text();

        fs.mkdirSync(CACHE_DIR, { recursive: true });
        fs.writeFileSync(cacheFile, html);

        console.log(`FETCH: ${url}`);

        return {
            html,
            fromCache: false
        };
    } finally {
        clearTimeout(timeout);
    }
}

function getBookUrls(html, sourcePage) {
    const $ = cheerio.load(html);
    const urls = [];

    $("article.product_pod h3 a").each((_, element) => {
        const href = $(element).attr("href");

        if (href) {
            const absoluteUrl = new URL(href, sourcePage).href;
            urls.push(absoluteUrl);
        }
    });

    return urls;
}

function getNextPageUrl(html, currentUrl) {
    const $ = cheerio.load(html);
    const nextHref = $("li.next a").attr("href");

    if (!nextHref) {
        return null;
    }

    return new URL(nextHref, currentUrl).href;
}

async function discoverPages() {
    let currentUrl = START_URL;
    const cataloguePages = [];
    const bookUrls = new Set();

    while (cataloguePages.length < 3 && currentUrl) {
        console.log(
            `\nProcessing catalogue page ${cataloguePages.length + 1}`
        );

        const result = await fetchPage(currentUrl);

        cataloguePages.push(currentUrl);

        const pageBookUrls = getBookUrls(result.html, currentUrl);

        for (const bookUrl of pageBookUrls) {
            bookUrls.add(bookUrl);
        }

        console.log(`Books found on this page: ${pageBookUrls.length}`);

        const nextUrl = getNextPageUrl(result.html, currentUrl);

        if (!nextUrl || cataloguePages.length === 3) {
            break;
        }

        if (!result.fromCache) {
            await sleep(500);
        }

        currentUrl = nextUrl;
    }

    console.log("\nCatalogue pages discovered:");

    cataloguePages.forEach((url, index) => {
        console.log(`${index + 1}. ${url}`);
    });

    console.log(`\nUnique book URLs discovered: ${bookUrls.size}`);
}

discoverPages().catch((error) => {
    console.error("Error:", error.message);
    process.exit(1);
});
