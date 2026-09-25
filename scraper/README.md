# A9 — The Polite Scraper

A small, cache-aware Node.js scraper built for the FlyRank Backend AI Engineering internship.

The scraper discovers the first three catalogue pages on Books to Scrape, visits the linked book detail pages, extracts structured data, validates the records, handles failures, and writes a run report.

## Target Classification

### Target

Books to Scrape:

https://books.toscrape.com/

Books to Scrape is a public practice sandbox intended for learning and practicing web scraping.

### Scope

This scraper is intentionally limited to:

- the first 3 catalogue pages
- 20 books per catalogue page
- 60 unique book detail pages

It does not crawl the entire website.

### Robots Check

I requested:

https://books.toscrape.com/robots.txt

The server returned:

`404 Not Found`

Therefore, no robots.txt file was found.

A missing robots.txt file is not treated as permission to scrape other websites.

## Project Structure

```text
scraper/
├── cache/
├── output/
│   ├── books.json
│   ├── errors.json
│   └── run-report.json
├── src/
│   └── index.js
├── .gitignore
└── README.md
