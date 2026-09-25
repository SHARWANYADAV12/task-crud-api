# Bonus AI Rematch Prompt

Build a JavaScript/Node.js web scraper for the Books to Scrape practice sandbox.

Target:
https://books.toscrape.com/

Scope:
- Scrape only the first 3 catalogue pages.
- Discover and visit the 60 unique book detail pages linked from those catalogue pages.
- Do not crawl the rest of the website.

For every book, first extract these raw fields:

- title
- product_url
- price_text
- availability_text
- rating_text
- description
- source_page
- fetched_at

Then normalize the data by converting `price_text` such as `£51.77` into a numeric `price_gbp` field while retaining the original `price_text`.

Requirements:

1. Use Node.js and JavaScript.
2. Use Cheerio for HTML parsing.
3. Use built-in filesystem APIs to cache downloaded HTML.
4. Use a descriptive User-Agent.
5. Use a 5-second request timeout.
6. Add at least a 500 ms delay between real network requests.
7. Never delay cache hits because they do not make network requests.
8. Reuse cached pages on repeated runs.
9. Discover the next catalogue page from the page's next link.
10. Stop after exactly 3 catalogue pages.
11. Ensure the final book URLs are unique.
12. Handle each detail page independently so one failed page does not stop the entire run.
13. Retry HTTP 5xx errors and timeouts at most once.
14. Do not retry HTTP 403 or 404 errors.
15. Validate normalized records with Zod.
16. Write valid records to `output/books.json`.
17. Write invalid records and validation errors to `output/errors.json`.
18. Make the output idempotent so repeated runs do not create duplicate records.
19. Produce `output/run-report.json` containing:
    - start_time
    - duration_seconds
    - pages_fetched
    - cache_hits
    - valid_records
    - invalid_records
    - failed_pages
20. Include a safe fake 404 test to demonstrate failure handling without stopping the run.
21. Print useful progress information during execution.
22. Keep the generated scraper isolated from my existing working scraper.

Project location:

scraper/ai-version/

Create a self-contained implementation there.

Also create a short README explaining:
- what the scraper does
- installation/run command
- schema
- caching
- politeness rules
- retry/failure handling
- limitations
- why browser automation is not necessary
- ethical considerations

Do not use browser automation unless the target genuinely requires JavaScript rendering.

The final implementation should be practical, readable, and suitable as evidence for a backend engineering internship assignment.
