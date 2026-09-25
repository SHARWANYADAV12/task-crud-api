# A9 — The Polite Scraper

## Target Classification

### Target
Books to Scrape:
https://books.toscrape.com/

Books to Scrape is a public practice sandbox created for learning and practicing web scraping.

### Scope
This scraper will collect data only from the first 3 catalogue pages and their 60 book detail pages.

### Data collected
For each book, the scraper will collect:

- title
- product_url
- price_text
- availability_text
- rating_text
- description
- source_page
- fetched_at

The cleaned records will also contain a numeric `price_gbp` field.

### Robots check
I requested:

https://books.toscrape.com/robots.txt

The server returned `404 Not Found`, so no robots file was found.

A missing robots.txt file is not treated as permission to scrape other websites.

### Why this scope is appropriate
Books to Scrape is specifically provided as a practice sandbox for learning web scraping, so this assignment limits collection to the first three catalogue pages and the linked book pages.

I will not reuse this code on another site without checking its rules and terms first.