# AI Rematch — Polite Scraper

This folder contains an AI-generated version of the A9 scraper.

## Target

Books to Scrape:

https://books.toscrape.com/

The scraper is limited to the first 3 catalogue pages and their 60 unique book detail pages.

## Generated Requirements

The AI implementation was generated from the prompt stored in:

```text
PROMPT.md
The prompt specified:

- first 3 catalogue pages
- 60 unique book URLs
- raw book fields
- normalized `price_gbp`
- Cheerio parsing
- filesystem caching
- descriptive User-Agent
- 500 ms delay between real network requests
- 5-second timeout
- retry handling
- Zod validation
- duplicate prevention
- failure isolation
- run report

## Run

From the repository root:

```bash
node scraper/ai-version/index.js
