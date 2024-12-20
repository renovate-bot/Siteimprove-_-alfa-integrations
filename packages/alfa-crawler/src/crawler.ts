import { Element, Node } from "@siteimprove/alfa-dom";
import type { Frontier } from "@siteimprove/alfa-frontier";
import type { Mapper } from "@siteimprove/alfa-mapper";
import type { Result } from "@siteimprove/alfa-result";
import type { Screenshot } from "@siteimprove/alfa-scraper";
import { Scraper } from "@siteimprove/alfa-scraper";
import { URL } from "@siteimprove/alfa-url";
import type { Page } from "@siteimprove/alfa-web";

const { isElement } = Element;

/**
 * @public
 */
export class Crawler {
  public static async of(
    scraper: Promise<Scraper> = Scraper.of()
  ): Promise<Crawler> {
    return new Crawler(await scraper);
  }

  public static async with<T>(
    mapper: Mapper<Crawler, Promise<T>>,
    scraper?: Promise<Scraper>
  ): Promise<T> {
    const crawler = await this.of(scraper);

    try {
      return await mapper(crawler);
    } finally {
      await crawler.close();
    }
  }

  private readonly _scraper: Scraper;

  protected constructor(scraper: Scraper) {
    this._scraper = scraper;
  }

  /**
   * Start crawling the specified frontier.
   *
   * @remarks
   * Crawling stops once the frontier has no additional URLs in queue.
   */
  public async *crawl(
    frontier: Frontier,
    options: Crawler.crawl.Options = {}
  ): AsyncIterable<Result<Page, [URL, string]>> {
    while (frontier.hasWaiting()) {
      // The loop condition ensures we can dequeue something.
      const url = frontier.dequeue().getUnsafe();

      const result = await this._scraper.scrape(url, {
        ...options,
        screenshot: options.screenshot?.(url),
      });

      if (result.isOk()) {
        frontier.complete(url);

        for (const page of result) {
          if (!page.response.url.equals(url)) {
            frontier.redirect(url, page.response.url);
          }

          for (const url of urls(page)) {
            frontier.enqueue(url);
          }
        }
      } else {
        frontier.error(url);
      }

      yield result.mapErr((error) => [url, error]);
    }
  }

  /**
   * Close the crawler and its associated scraper.
   */
  public async close(): Promise<void> {
    await this._scraper.close();
  }
}

/**
 * @public
 */
export namespace Crawler {
  export namespace crawl {
    export interface Options
      extends Omit<Scraper.scrape.Options, "screenshot"> {
      screenshot?: Mapper<URL, Screenshot>;
    }
  }
}

function* urls(page: Page): Iterable<URL> {
  for (const node of page.document.descendants(Node.composedNested)) {
    if (isElement(node) && node.name === "a") {
      yield* node
        .attribute("href")
        .map((href) => URL.parse(href.value, page.response.url).getUnsafe());
    }
  }
}
