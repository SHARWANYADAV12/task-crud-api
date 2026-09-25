const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cheerio = require("cheerio");
const { z } = require("zod");

const START_URL = "https://books.toscrape.com/catalogue/page-1.html";

const CACHE_DIR = path.join(__dirname, "..", "cache");
const OUTPUT_DIR = path.join(__dirname, "..", "output");

const BOOKS_FILE = path.join(OUTPUT_DIR, "books.json");
const ERRORS_FILE = path.join(OUTPUT_DIR, "errors.json");
const REPORT_FILE = path.join(OUTPUT_DIR, "run-report.json");

const USER_AGENT =
    "FlyRankInternship-A9/1.0 (https://github.com/SHARWANYADAV12/task-crud-api)";

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

async function fetchPage(url, report) {
    const cacheFile = cacheFileFor(url);

    if (fs.existsSync(cacheFile)) {
        const html = fs.readFileSync(cacheFile, "utf8");

        report.cache_hits++;

        console.log(`CACHE HIT: ${url}`);

        return {
            html,
            fromCache: true,
            fetchedAt: fs.statSync(cacheFile).mtime.toISOString()
        };
    }

    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const controller = new AbortController();

        const timeout = setTimeout(() => {
            controller.abort();
        }, 5000);

        try {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": USER_AGENT
                },
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (response.status === 403 || response.status === 404) {
                throw new Error(
                    `NON_RETRYABLE_HTTP_${response.status}`
                );
            }

            if (response.status >= 500 && response.status <= 599) {
                if (attempt < maxAttempts) {
                    console.log(
                        `Retrying ${url} after HTTP ${response.status}...`
                    );
                    await sleep(500);
                    continue;
                }

                throw new Error(`HTTP_${response.status}`);
            }

            if (response.status !== 200) {
                throw new Error(`HTTP_${response.status}`);
            }

            const html = await response.text();

            fs.mkdirSync(CACHE_DIR, { recursive: true });
            fs.writeFileSync(cacheFile, html);

            report.pages_fetched++;

            console.log(`FETCH: ${url}`);

            return {
                html,
                fromCache: false,
                fetchedAt: new Date().toISOString()
            };
        } catch (error) {
            clearTimeout(timeout);

            const isNonRetryable =
                error.message.includes("NON_RETRYABLE_HTTP_403") ||
                error.message.includes("NON_RETRYABLE_HTTP_404");

            const isAbort = error.name === "AbortError";

            if (attempt < maxAttempts && !isNonRetryable) {
                console.log(
                    `Retrying ${url} after ${isAbort ? "timeout" : error.message}...`
                );

                await sleep(500);
                continue;
            }

            throw error;
        }
    }

    throw new Error("Request failed");
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

async function discoverBooks(report) {
    let currentUrl = START_URL;

    const cataloguePages = [];
    const books = [];
    const seenUrls = new Set();

    while (cataloguePages.length < 3 && currentUrl) {
        console.log(
            `\nProcessing catalogue page ${cataloguePages.length + 1}`
        );

        try {
            const result = await fetchPage(currentUrl, report);

            cataloguePages.push(currentUrl);

            const pageBooks = getBookUrls(
                result.html,
                currentUrl
            );

            for (const book of pageBooks) {
                if (!seenUrls.has(book.url)) {
                    seenUrls.add(book.url);
                    books.push(book);
                }
            }

            console.log(
                `Books found on this page: ${pageBooks.length}`
            );

            const nextUrl = getNextPageUrl(
                result.html,
                currentUrl
            );

            if (!nextUrl || cataloguePages.length === 3) {
                break;
            }

            if (!result.fromCache) {
                await sleep(500);
            }

            currentUrl = nextUrl;
        } catch (error) {
            report.failed_pages.push({
                url: currentUrl,
                stage: "catalogue",
                error: error.message
            });

            console.error(
                `Catalogue page failed: ${currentUrl}`
            );

            break;
        }
    }

    return books;
}

function extractBookDetails(
    html,
    productUrl,
    sourcePage,
    fetchedAt
) {
    const $ = cheerio.load(html);

    const title =
        $("div.product_main h1").text().trim() || null;

    const priceText =
        $("div.product_main .price_color")
            .text()
            .trim() || null;

    const availabilityText =
        $("div.product_main .availability")
            .text()
            .replace(/\s+/g, " ")
            .trim() || null;

    const ratingText =
        $("div.product_main .star-rating")
            .attr("class")
            ?.replace("star-rating", "")
            .trim() || null;

    let description = null;

    const descriptionElement =
        $("#product_description").next("p");

    if (descriptionElement.length > 0) {
        description =
            descriptionElement.text().trim() || null;
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

function normalizePrice(priceText) {
    if (!priceText) {
        return null;
    }

    const cleaned = priceText.replace("£", "").trim();

    const price = Number.parseFloat(cleaned);

    return Number.isFinite(price) ? price : null;
}

const bookSchema = z.object({
    title: z.string().min(1),
    product_url: z.string().url(),
    price_text: z.string().min(1),
    price_gbp: z.number().nonnegative(),
    availability_text: z.string().min(1),
    rating_text: z.string().min(1),
    description: z.string().nullable(),
    source_page: z.string().url(),
    fetched_at: z.string().datetime()
});

async function main() {
    const startTime = new Date();

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const report = {
        start_time: startTime.toISOString(),
        duration_seconds: 0,
        pages_fetched: 0,
        cache_hits: 0,
        valid_records: 0,
        invalid_records: 0,
        failed_pages: []
    };

    const books = await discoverBooks(report);

    console.log(
        `\nUnique book URLs discovered: ${books.length}`
    );

    const rawRecords = [];

    for (let i = 0; i < books.length; i++) {
        const book = books[i];

        console.log(
            `\nFetching detail page ${i + 1}/${books.length}`
        );

        try {
            const result = await fetchPage(
                book.url,
                report
            );

            const record = extractBookDetails(
                result.html,
                book.url,
                book.sourcePage,
                result.fetchedAt
            );

            rawRecords.push(record);

            if (
                !result.fromCache &&
                i < books.length - 1
            ) {
                await sleep(500);
            }
        } catch (error) {
            report.failed_pages.push({
                url: book.url,
                stage: "detail",
                error: error.message
            });

            console.error(
                `Failed detail page: ${book.url}`
            );
        }
    }

    /*
     * Stage 5 failure test:
     * This fake URL should fail with 404.
     * It must not stop the rest of the run.
     */
    const fakeUrl =
        "https://books.toscrape.com/catalogue/this-book-does-not-exist-404-test/index.html";

    console.log("\nTesting failure handling with fake URL:");

    try {
        await fetchPage(fakeUrl, report);
    } catch (error) {
        report.failed_pages.push({
            url: fakeUrl,
            stage: "failure-test",
            error: error.message
        });

        console.log(
            `Expected failure captured: ${error.message}`
        );
    }

    const validRecords = [];
    const errors = [];

    for (const record of rawRecords) {
        const normalizedRecord = {
            ...record,
            price_gbp: normalizePrice(record.price_text)
        };

        const result =
            bookSchema.safeParse(normalizedRecord);

        if (result.success) {
            validRecords.push(result.data);
        } else {
            errors.push({
                record,
                errors: result.error.issues
            });
        }
    }

    const uniqueRecords = Array.from(
        new Map(
            validRecords.map((record) => [
                record.product_url,
                record
            ])
        ).values()
    );

    report.valid_records = uniqueRecords.length;
    report.invalid_records = errors.length;

    const endTime = new Date();

    report.duration_seconds =
        Number(
            (
                (endTime.getTime() -
                    startTime.getTime()) /
                1000
            ).toFixed(2)
        );

    fs.writeFileSync(
        BOOKS_FILE,
        JSON.stringify(uniqueRecords, null, 2)
    );

    fs.writeFileSync(
        ERRORS_FILE,
        JSON.stringify(errors, null, 2)
    );

    fs.writeFileSync(
        REPORT_FILE,
        JSON.stringify(report, null, 2)
    );

    console.log("\nStage 5 run complete.");
    console.log(
        `Pages fetched: ${report.pages_fetched}`
    );
    console.log(
        `Cache hits: ${report.cache_hits}`
    );
    console.log(
        `Valid records: ${report.valid_records}`
    );
    console.log(
        `Invalid records: ${report.invalid_records}`
    );
    console.log(
        `Failed pages: ${report.failed_pages.length}`
    );
    console.log(
        `Saved: ${REPORT_FILE}`
    );
}

main().catch((error) => {
    console.error("Fatal error:", error.message);
    process.exit(1);
});
