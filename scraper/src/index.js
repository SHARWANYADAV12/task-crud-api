const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cheerio = require("cheerio");

const START_URL = "https://books.toscrape.com/catalogue/page-1.html";

const CACHE_DIR = path.join(__dirname, "..", "cache");

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function cacheFileFor(url) {
    if (url === START_URL) {
        return path.join(CACHE_DIR, "catalogue-page-1.html");
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
            fromCache: true,
            fetchedAt: fs.statSync(cacheFile).mtime.toISOString()
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
            fromCache: false,
            fetchedAt: new Date().toISOString()
        };
    } finally {
        clearTimeout(timeout);
    }
}

function getBookUrls(html, sourcePage) {
    const $ = cheerio.load(html);
    const books = [];

    $("article.product_pod h3 a").each((_, element) => {
        const href = $(element).attr("href");

        if (href) {
            books.push({
                url: new URL(href, sourcePage).href,
                sourcePage
            });
        }
    });

    return books;
}

function getNextPageUrl(html, currentUrl) {
    const $ = cheerio.load(html);
    const nextHref = $("li.next a").attr("href");

    if (!nextHref) {
        return null;
    }

    return new URL(nextHref, currentUrl).href;
}

async function discoverBooks() {
    let currentUrl = START_URL;
    const cataloguePages = [];
    const books = [];
    const seenUrls = new Set();

    while (cataloguePages.length < 3 && currentUrl) {
        console.log(
            `\nProcessing catalogue page ${cataloguePages.length + 1}`
        );

        const result = await fetchPage(currentUrl);

        cataloguePages.push(currentUrl);

        const pageBooks = getBookUrls(result.html, currentUrl);

        for (const book of pageBooks) {
            if (!seenUrls.has(book.url)) {
                seenUrls.add(book.url);
                books.push(book);
            }
        }

        console.log(`Books found on this page: ${pageBooks.length}`);

        const nextUrl = getNextPageUrl(result.html, currentUrl);

        if (!nextUrl || cataloguePages.length === 3) {
            break;
        }

        if (!result.fromCache) {
            await sleep(500);
        }

        currentUrl = nextUrl;
    }

    return books;
}

function extractBookDetails(html, productUrl, sourcePage, fetchedAt) {
    const $ = cheerio.load(html);

    const title = $("div.product_main h1").text().trim() || null;
    const priceText = $("div.product_main .price_color").text().trim() || null;
    const availabilityText =
        $("div.product_main .availability").text().replace(/\s+/g, " ").trim() || null;
    const ratingText =
        $("div.product_main .star-rating").attr("class")?.replace("star-rating", "").trim() || null;

    let description = null;

    const descriptionElement = $("#product_description").next("p");

    if (descriptionElement.length > 0) {
        description = descriptionElement.text().trim() || null;
    }

    return {
        title,
        product_url: productUrl,
        price_text: priceText,
        availability_text: availabilityText,
        rating_text: ratingText,
        description,
        source_page: sourcePage,
        fetched_at: fetchedAt
    };
}

async function main() {
    const books = await discoverBooks();

    console.log(`\nUnique book URLs discovered: ${books.length}`);

    const records = [];

    for (let i = 0; i < books.length; i++) {
        const book = books[i];

        console.log(`\nFetching detail page ${i + 1}/${books.length}`);

        const result = await fetchPage(book.url);

        const record = extractBookDetails(
            result.html,
            book.url,
            book.sourcePage,
            result.fetchedAt
        );

        records.push(record);

        if (!result.fromCache && i < books.length - 1) {
            await sleep(500);
        }
    }

    console.log("\nFirst full raw record:");
    console.log(JSON.stringify(records[0], null, 2));

    console.log(`\ndetail_pages=${records.length}`);
}

main().catch((error) => {
    console.error("Error:", error.message);
    process.exit(1);
});
