# AI vs Me — Polite Scraper Comparison

## Purpose

This document compares my original A9 implementation with the AI-generated rematch implementation.

The original scraper was built stage-by-stage according to the assignment requirements. The AI version was generated separately from a detailed engineering prompt and kept isolated inside:

```text
scraper/ai-version/
## Target and Scope

Both implementations target the Books to Scrape practice website:

https://books.toscrape.com/

The scope is limited to:

- first 3 catalogue pages
- 20 books per catalogue page
- 60 unique book detail pages

The scraper extracts book information and produces validated JSON output.

## Original Implementation

The original implementation was developed incrementally through the A9 assignment stages.

It includes:

- catalogue page discovery
- book URL discovery
- HTML caching
- Cheerio parsing
- detail-page extraction
- price normalization
- Zod validation
- duplicate prevention
- failure isolation
- retry handling
- fake 404 testing
- run-report generation

The original implementation remains in:

```text
scraper/src/index.js
## AI Implementation

The AI-generated implementat

ion was created separately and placed in:

```text
scraper/ai-version/index.js
The AI version was generated from:

```text
scraper/ai-version/PROMPT.md
This kept the AI experiment isolated from the original working implementation.

## Similarities

Both implementations:

- use Node.js
- use Cheerio
- process the first 3 catalogue pages
- discover 60 unique book URLs
- visit the 60 book detail pages
- cache downloaded HTML
- use a descriptive User-Agent
- use a request timeout
- wait between real network requests
- retry timeout and 5xx failures once
- do not retry 403 or 404 responses
- extract the required raw fields
- normalize prices into `price_gbp`
- validate records with Zod
- prevent duplicate records
- isolate individual page failures
- generate JSON output
- generate a run report
- test an intentional fake 404 URL

## Differences

The original implementation was developed stage-by-stage while completing the A9 assignment.

The AI implementation was generated from one detailed engineering prompt and placed in an isolated directory.

The original version contains the assignment's incremental development history and evidence.

The AI version demonstrates how an AI-generated solution approaches the same requirements from the beginning.

The two implementations therefore solve the same problem using similar technical requirements, but they were developed through different workflows.

## AI Run Evidence

The AI implementation was run successfully.

First run:

```text
Catalogue pages: 3
Unique book URLs: 60
Detail pages: 60
Valid records: 60
Invalid records: 0
Failed pages: 1
The failed page was an intentional fake 404 URL used to verify failure handling.

The second run produced cache hits for all catalogue and detail pages:

```text
Catalogue pages: 3
Unique book URLs: 60
Detail pages: 60
Valid records: 60
Invalid records: 0
Failed pages: 1
The second run showed `CACHE HIT` for all previously downloaded pages, demonstrating that the cache is reused instead of downloading the same pages again.

The fake 404 was captured as:

```text
Expected failure captured: HTTP_404
The run completed successfully despite that failure.

## What I Learned

The AI rematch showed that generating code is only one part of solving a backend engineering problem.

The generated implementation still needed to be:

- executed
- tested against the real target
- checked against the requirements
- compared with the original implementation
- verified using actual output
- tested with an intentional failure

The comparison also showed the value of isolating AI-generated code instead of replacing a working implementation with unverified generated code.

## Prompt Improvement

One improvement I would make to the original AI prompt is to require explicit evidence checkpoints.

The improved requirement would be:

> After implementation, run the scraper twice and record the important checkpoints from both runs, including catalogue discovery, unique URL count, valid and invalid records, failed pages, and cache hits. Also verify that an intentional 404 does not stop the complete run.

This makes the AI-generated solution easier to verify and gives stronger evidence that the implementation actually works instead of only appearing correct from code inspection.

## Final Comparison

The original implementation was built manually and incrementally.

The AI implementation was generated separately and then tested against the same core requirements.

The rematch demonstrates that AI can accelerate implementation, but engineering judgment is still required to define requirements, verify behavior, test failures, inspect outputs, and compare the result with an independently developed solution.

## Conclusion

The AI version successfully completed the same scraping scope as the original implementation:

```text
3 catalogue pages
60 unique book pages
60 valid records
0 invalid records
1 intentional failed page
The AI-generated code remains isolated in `scraper/ai-version/` so the original assignment implementation remains unchanged.
