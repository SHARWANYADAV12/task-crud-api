const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cheerio = require("cheerio");
const { z } = require("zod");

const START_URL =
    "https://books.toscrape.com/catalogue/page-1.html";

const BASE_DIR = path.join(__dirname);
const CACHE_DIR = path.join(BASE_DIR, "cache");
const OUTPUT_DIR = path.join(BASE_DIR, "output");

const BOOKS_FILE = path.join(OUTPUT_DIR, "books.json");
const ERRORS_FILE = path.join(OUTPUT_DIR, "errors.json");
const REPORT_FILE = path.join(OUTPUT_DIR, "run-report.json");

const USER_AGENT =
    "FlyRank-A9-AI-Rematch/1.0 (https://github.com/SHARWANYADAV12/task-crud-api)";

const sleep = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));

function cacheFileFor(url) {
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
        report.cache_hits++;

        console.log(`CACHE HIT: ${url}`);

        return {
            html: fs.readFileSync(cacheFile, "utf8"),
            fromCache: true,
            fetchedAt: fs.statSync(cacheFile).mtime.toISOString()
        };
    }

    for (let attempt = 1; attempt <= 2; attempt++) {
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
                throw new Error(`HTTP_${response.status}`);
            }

            if (response.status >= 500 && response.status <= 599) {
                if (attempt === 1) {
                    console.log(`Retrying after ${response.status}...`);
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

            const nonRetryable =
                error.message === "HTTP_403" ||
                error.message === "HTTP_404";

            if (attempt === 1 && !nonRetryable) {
                console.log(
                    `Retrying ${url} after ${error.message}...`
                );

                await sleep(500);
                continue;
            }

            throw error;
        }
    }

    throw new Error("Request failed");
}

function extractCatalogue(html, pageUrl) {
    const $ = cheerio.load(html);

    const books = [];

    $("article.product_pod h3 a").each((_, element) => {
        const href = $(element).attr("href");

        if (href) {
            books.push({
                url: new URL(href, pageUrl).href,
                sourcePage: pageUrl
            });
        }
    });

    const nextHref = $("li.next a").attr("href");

    return {
        books,
        nextUrl: nextHref
            ? new URL(nextHref, pageUrl).href
            : null
    };
}

function extractBook(html, productUrl, sourcePage, fetchedAt) {
    const $ = cheerio.load(html);

    const title =
        $("div.product_main h1").text().trim() || null;

    const priceText =
        $("div.product_main .price_color").text().trim() || null;

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

    const descriptionElement =
        $("#product_description").next("p");

    const description =
        descriptionElement.length > 0
            ? descriptionElement.text().trim() || null
            : null;

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

function normalizePrice(value) {
    if (!value) {
        return null;
    }

    const price = Number.parseFloat(
        value.replace("£", "").trim()
    );

    return Number.isFinite(price) ? price : null;
}

const schema = z.object({
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

async function discoverBooks(report) {
    let currentUrl = START_URL;

    const pages = [];
    const books = [];
    const seen = new Set();

    while (pages.length < 3 && currentUrl) {
        console.log(
            `\nCatalogue page ${pages.length + 1}/3`
        );

        try {
            const result = await fetchPage(
                currentUrl,
                report
            );

            pages.push(currentUrl);

            const parsed = extractCatalogue(
                result.html,
                currentUrl
            );

            for (const book of parsed.books) {
                if (!seen.has(book.url)) {
                    seen.add(book.url);
                    books.push(book);
                }
            }

            console.log(
                `Books found: ${parsed.books.length}`
            );

            if (
                !parsed.nextUrl ||
                pages.length === 3
            ) {
                break;
            }

            if (!result.fromCache) {
                await sleep(500);
            }

            currentUrl = parsed.nextUrl;
        } catch (error) {
            report.failed_pages.push({
                url: currentUrl,
                stage: "catalogue",
                error: error.message
            });

            break;
        }
    }

    return books;
}

async function main() {
    const start = new Date();

    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const report = {
        start_time: start.toISOString(),
        duration_seconds: 0,
        pages_fetched: 0,
        cache_hits: 0,
        valid_records: 0,
        invalid_records: 0,
        failed_pages: []
    };

    const books = await discoverBooks(report);

    console.log(
        `\nUnique book URLs: ${books.length}`
    );

    const rawRecords = [];

    for (let i = 0; i < books.length; i++) {
        const book = books[i];

        console.log(
            `Detail page ${i + 1}/${books.length}`
        );

        try {
            const result = await fetchPage(
                book.url,
                report
            );

            rawRecords.push(
                extractBook(
                    result.html,
                    book.url,
                    book.sourcePage,
                    result.fetchedAt
                )
            );

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

            console.log(
                `Failed: ${book.url}`
            );
        }
    }

    const validRecords = [];
    const errors = [];

    for (const record of rawRecords) {
        const normalized = {
            ...record,
            price_gbp: normalizePrice(
                record.price_text
            )
        };

        const result = schema.safeParse(normalized);

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

    const fakeUrl =
        "https://books.toscrape.com/catalogue/ai-rematch-404-test/index.html";

    console.log("\nTesting fake 404 URL...");

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

    report.valid_records = uniqueRecords.length;
    report.invalid_records = errors.length;

    const end = new Date();

    report.duration_seconds = Number(
        (
            (end.getTime() - start.getTime()) /
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

    console.log("\nAI Rematch complete.");
    console.log(`Valid records: ${report.valid_records}`);
    console.log(`Invalid records: ${report.invalid_records}`);
    console.log(
        `Failed pages: ${report.failed_pages.length}`
    );
}

main().catch((error) => {
    console.error("Fatal error:", error.message);
    process.exit(1);
});
