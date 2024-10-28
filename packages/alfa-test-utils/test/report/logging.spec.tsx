import { h, Text } from "@siteimprove/alfa-dom";
import { Map } from "@siteimprove/alfa-map";
import { Err, Ok } from "@siteimprove/alfa-result";
import { Sequence } from "@siteimprove/alfa-sequence";
import { test } from "@siteimprove/alfa-test";

import chalk from "chalk";
import { getRuleTitle } from "../../dist/report/get-rule-title.js";

import { Logging } from "../../dist/report/logging.js";

import {
  makeAudit,
  makeFailed,
  makePage,
  makePassed,
  makeRule,
} from "../fixtures.js";

const target = <span>Hello World</span>;

const failingRule1 = makeRule(1, target);
const failingRule2 = makeRule(2, target);
const passingRule = makeRule(3, target);
const audit = makeAudit({
  page: makePage(h.document([target])),
  outcomes: Map.from([
    [failingRule1.uri, Sequence.from([makeFailed(failingRule2, target)])],
    [
      failingRule2.uri,
      Sequence.from([
        makeFailed(failingRule1, target),
        makeFailed(failingRule2, target),
      ]),
    ],
    [passingRule.uri, Sequence.from([makePassed(passingRule, target)])],
  ]),
  resultAggregates: Map.from([
    [failingRule1.uri, { failed: 3, passed: 0, cantTell: 0 }],
    [failingRule2.uri, { failed: 1, passed: 0, cantTell: 0 }],
    [passingRule.uri, { failed: 0, passed: 1, cantTell: 0 }],
  ]),
});

const filteredAggregates: Array<[string, { failed: number }]> = [
  [failingRule1.uri.split("/").pop()!, { failed: 3 }],
  [failingRule2.uri.split("/").pop()!, { failed: 1 }],
];

// Uncomment to see what to expect.
// console.log("---------------------- (correct URL)");
// Logging.fromAudit(audit, Ok.of("http://example.com")).print();
// console.log("---------------------- (no URL)");
// Logging.fromAudit(audit).print();
// console.log("---------------------- (errored URL)");
// Logging.fromAudit(audit, Err.of("foo")).print();

test(".fromAggregate() creates a Logging without page report URL", (t) => {
  const actual = Logging.fromAggregate(filteredAggregates);

  t.deepEqual(actual.toJSON(), {
    title: "Siteimprove found accessibility issues:",
    logs: [
      { title: chalk.bold(`Page - ${Logging.Defaults.Title}`), logs: [] },
      {
        title: "This page contains 2 issues.",
        logs: [
          { title: `1. ${getRuleTitle("sia-r1")} (3 occurrences)`, logs: [] },
          { title: `2. ${getRuleTitle("sia-r2")} (1 occurrence)`, logs: [] },
        ],
      },
    ],
  });
});

test(".fromAggregate() creates a Logging from errored page report URL", (t) => {
  const actual = Logging.fromAggregate(
    filteredAggregates,
    undefined,
    Err.of("foo")
  );

  t.deepEqual(actual.toJSON(), {
    title: "Siteimprove found accessibility issues:",
    logs: [
      { title: chalk.bold(`Page - ${Logging.Defaults.Title}`), logs: [] },
      {
        title: "This page contains 2 issues.",
        logs: [
          { title: `1. ${getRuleTitle("sia-r1")} (3 occurrences)`, logs: [] },
          { title: `2. ${getRuleTitle("sia-r2")} (1 occurrence)`, logs: [] },
        ],
      },
    ],
  });
});

test(".fromAggregate() creates a Logging from correct page report URL", (t) => {
  const url = "http://example.com";
  const actual = Logging.fromAggregate(
    filteredAggregates,
    undefined,
    Ok.of(url)
  );

  t.deepEqual(actual.toJSON(), {
    title: "Siteimprove found accessibility issues:",
    logs: [
      { title: chalk.bold(`Page - ${Logging.Defaults.Title}`), logs: [] },
      {
        title: `This page contains 2 issues: ${chalk.underline(url)}`,
        logs: [
          {
            title: `1. ${getRuleTitle("sia-r1")} (3 occurrences)`,
            logs: [
              {
                title: `Learn how to fix this issue: ${Logging.issueUrl(
                  url,
                  "sia-r1"
                )}`,
                logs: [],
              },
            ],
          },
          {
            title: `2. ${getRuleTitle("sia-r2")} (1 occurrence)`,
            logs: [
              {
                title: `Learn how to fix this issue: ${Logging.issueUrl(
                  url,
                  "sia-r2"
                )}`,
                logs: [],
              },
            ],
          },
        ],
      },
    ],
  });
});

test(".fromAggregate() overrides page title", (t) => {
  const actual = Logging.fromAggregate(filteredAggregates, "foo");

  t.deepEqual(actual.toJSON(), {
    title: "Siteimprove found accessibility issues:",
    logs: [
      { title: chalk.bold(`Page - foo`), logs: [] },
      {
        title: "This page contains 2 issues.",
        logs: [
          { title: `1. ${getRuleTitle("sia-r1")} (3 occurrences)`, logs: [] },
          { title: `2. ${getRuleTitle("sia-r2")} (1 occurrence)`, logs: [] },
        ],
      },
    ],
  });
});

test(".fromAudit() creates a Logging without page report URL", (t) => {
  const actual = Logging.fromAudit(audit);

  t.deepEqual(actual.toJSON(), {
    title: "Siteimprove found accessibility issues:",
    logs: [
      { title: chalk.bold(`Page - ${Logging.Defaults.Title}`), logs: [] },
      {
        title: "This page contains 2 issues.",
        logs: [
          { title: `1. ${getRuleTitle("sia-r1")} (3 occurrences)`, logs: [] },
          { title: `2. ${getRuleTitle("sia-r2")} (1 occurrence)`, logs: [] },
        ],
      },
    ],
  });
});

test(".fromAudit() creates a Logging from errored page report URL", (t) => {
  const actual = Logging.fromAudit(audit, Err.of("foo"));

  t.deepEqual(actual.toJSON(), {
    title: "Siteimprove found accessibility issues:",
    logs: [
      { title: chalk.bold(`Page - ${Logging.Defaults.Title}`), logs: [] },
      {
        title: "This page contains 2 issues.",
        logs: [
          { title: `1. ${getRuleTitle("sia-r1")} (3 occurrences)`, logs: [] },
          { title: `2. ${getRuleTitle("sia-r2")} (1 occurrence)`, logs: [] },
        ],
      },
    ],
  });
});

test(".fromAudit() creates a Logging from correct page report URL", (t) => {
  const url = "http://example.com";
  const actual = Logging.fromAudit(audit, Ok.of(url));

  t.deepEqual(actual.toJSON(), {
    title: "Siteimprove found accessibility issues:",
    logs: [
      { title: chalk.bold(`Page - ${Logging.Defaults.Title}`), logs: [] },
      {
        title: `This page contains 2 issues: ${chalk.underline(url)}`,
        logs: [
          {
            title: `1. ${getRuleTitle("sia-r1")} (3 occurrences)`,
            logs: [
              {
                title: `Learn how to fix this issue: ${Logging.issueUrl(
                  url,
                  "sia-r1"
                )}`,
                logs: [],
              },
            ],
          },
          {
            title: `2. ${getRuleTitle("sia-r2")} (1 occurrence)`,
            logs: [
              {
                title: `Learn how to fix this issue: ${Logging.issueUrl(
                  url,
                  "sia-r2"
                )}`,
                logs: [],
              },
            ],
          },
        ],
      },
    ],
  });
});

test(".fromAudit() overrides title with a string", (t) => {
  const actual = Logging.fromAudit(audit, Err.of("foo"), { pageTitle: "foo" });

  t.deepEqual(actual.toJSON(), {
    title: "Siteimprove found accessibility issues:",
    logs: [
      { title: chalk.bold(`Page - foo`), logs: [] },
      {
        title: "This page contains 2 issues.",
        logs: [
          { title: `1. ${getRuleTitle("sia-r1")} (3 occurrences)`, logs: [] },
          { title: `2. ${getRuleTitle("sia-r2")} (1 occurrence)`, logs: [] },
        ],
      },
    ],
  });
});

test(".fromAudit() overrides title with a function", (t) => {
  const actual = Logging.fromAudit(audit, Err.of("foo"), {
    pageTitle: (page) =>
      page.document.descendants().find(Text.isText).getUnsafe().data,
  });

  t.deepEqual(actual.toJSON(), {
    title: "Siteimprove found accessibility issues:",
    logs: [
      { title: chalk.bold(`Page - Hello World`), logs: [] },
      {
        title: "This page contains 2 issues.",
        logs: [
          { title: `1. ${getRuleTitle("sia-r1")} (3 occurrences)`, logs: [] },
          { title: `2. ${getRuleTitle("sia-r2")} (1 occurrence)`, logs: [] },
        ],
      },
    ],
  });
});

test(".fromAudit() Uses the page title as default", (t) => {
  const target = <span>Hello World</span>;
  const audit = makeAudit({
    page: makePage(h.document([<title>Hello</title>, target])),
    outcomes: Map.from([
      [failingRule1.uri, Sequence.from([makeFailed(failingRule2, target)])],
      [
        failingRule2.uri,
        Sequence.from([
          makeFailed(failingRule1, target),
          makeFailed(failingRule2, target),
        ]),
      ],
      [passingRule.uri, Sequence.from([makePassed(passingRule, target)])],
    ]),
    resultAggregates: Map.from([
      [failingRule1.uri, { failed: 3, passed: 0, cantTell: 0 }],
      [failingRule2.uri, { failed: 1, passed: 0, cantTell: 0 }],
      [passingRule.uri, { failed: 0, passed: 1, cantTell: 0 }],
    ]),
  });

  const actual = Logging.fromAudit(audit, Err.of("foo"));

  t.deepEqual(actual.toJSON(), {
    title: "Siteimprove found accessibility issues:",
    logs: [
      { title: chalk.bold(`Page - Hello`), logs: [] },
      {
        title: "This page contains 2 issues.",
        logs: [
          { title: `1. ${getRuleTitle("sia-r1")} (3 occurrences)`, logs: [] },
          { title: `2. ${getRuleTitle("sia-r2")} (1 occurrence)`, logs: [] },
        ],
      },
    ],
  });
});

test(".fromAudit() creates a Logging from a serialised audit", (t) => {
  const url = "http://example.com";
  const actual = Logging.fromAudit(audit.toJSON(), Ok.of(url));

  t.deepEqual(actual.toJSON(), {
    title: "Siteimprove found accessibility issues:",
    logs: [
      { title: chalk.bold(`Page - ${Logging.Defaults.Title}`), logs: [] },
      {
        title: `This page contains 2 issues: ${chalk.underline(url)}`,
        logs: [
          {
            title: `1. ${getRuleTitle("sia-r1")} (3 occurrences)`,
            logs: [
              {
                title: `Learn how to fix this issue: ${Logging.issueUrl(
                  url,
                  "sia-r1"
                )}`,
                logs: [],
              },
            ],
          },
          {
            title: `2. ${getRuleTitle("sia-r2")} (1 occurrence)`,
            logs: [
              {
                title: `Learn how to fix this issue: ${Logging.issueUrl(
                  url,
                  "sia-r2"
                )}`,
                logs: [],
              },
            ],
          },
        ],
      },
    ],
  });
});