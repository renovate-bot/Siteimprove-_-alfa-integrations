import { Outcome } from "@siteimprove/alfa-act";
import { Element, h } from "@siteimprove/alfa-dom";
import { Response } from "@siteimprove/alfa-http";
import { Serializable } from "@siteimprove/alfa-json";
import { Map } from "@siteimprove/alfa-map";
import { None, Option } from "@siteimprove/alfa-option";
import { Err, Ok } from "@siteimprove/alfa-result";
import { Sequence } from "@siteimprove/alfa-sequence";
import { test } from "@siteimprove/alfa-test-deprecated";
import { URL } from "@siteimprove/alfa-url";

import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { SIP } from "../../dist/index.js";

import {
  makeAudit,
  makeFailed,
  makePage,
  makePayload,
  makeRule,
  timestamp,
} from "../fixtures.js";

const { Verbosity } = Serializable;

const { Metadata, S3 } = SIP;

test("Metadata.payload() creates a payload", async (t) => {
  const actual = await Metadata.payload(makeAudit(), {}, timestamp);

  t.deepEqual(actual, makePayload());
});

test("S3.payload() creates empty-ish payload", (t) => {
  const document = h.document([<span></span>]);

  const page = makePage(document);
  const actual = S3.payload("some id", makeAudit({ page }));

  t.deepEqual(actual, {
    Id: "some id",
    CheckResult: "[]",
    Aspects: JSON.stringify(page.toJSON({ verbosity: Verbosity.High })),
  });
});

test("S3.payload serialises outcomes as string", async (t) => {
  const target = <span>Hello</span>;
  const document = h.document([target]);
  const page = makePage(document);

  const rule = makeRule(1000, target);
  const actual = S3.payload(
    "some id",
    makeAudit({
      page,
      outcomes: Map.from([
        [rule.uri, Sequence.from([makeFailed(rule, target)])],
      ]),
      resultAggregates: Map.from([
        [
          "https://alfa.siteimprove.com/rules/sia-r1000",
          { failed: 1, passed: 0, cantTell: 0 },
        ],
      ]),
    })
  );

  const expected: Outcome.Failed.JSON<Element> = {
    outcome: Outcome.Value.Failed,
    rule: {
      type: "atomic",
      uri: "https://alfa.siteimprove.com/rules/sia-r1000",
      requirements: [],
      tags: [],
    },
    mode: Outcome.Mode.Automatic,
    target: Serializable.toJSON(target, { verbosity: Verbosity.Minimal }),
    expectations: [
      [
        "1",
        {
          type: "err",
          error: {
            message:
              "fake diagnostic (https://alfa.siteimprove.com/rules/sia-r1000)",
          },
        },
      ],
    ],
  };

  t.deepEqual(actual, {
    Id: "some id",
    CheckResult: JSON.stringify([expected]),
    Aspects: JSON.stringify(page.toJSON({ verbosity: Verbosity.High })),
  });
});

test("Metadata.params() creates axios config", (t) => {
  const actual = Metadata.params("url", "key");

  t.deepEqual(actual, {
    method: "post",
    maxBodyLength: Infinity,
    url: "url",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from("key").toString("base64"),
    },
  });
});
test("S3.params() creates axios config", (t) => {
  const actual = S3.params("url");

  t.deepEqual(actual, {
    method: "put",
    maxBodyLength: Infinity,
    url: "url",
    headers: { "Content-Type": "application/json" },
  });
});

test("Metadata.axiosConfig() creates an axios config", async (t) => {
  const actual = await Metadata.axiosConfig(
    makeAudit(),
    { userName: "foo@foo.com", apiKey: "bar" },
    { url: "https://foo.com", timestamp }
  );

  t.deepEqual(actual, {
    ...Metadata.params("https://foo.com", "foo@foo.com:bar"),
    data: JSON.stringify(await Metadata.payload(makeAudit(), {}, timestamp)),
  });
});
test("S3.axiosConfig() creates an axios config", (t) => {
  const page = makePage(h.document([<span></span>]));

  const actual = S3.axiosConfig(
    "some id",
    "a pre-signed S3 URL",
    makeAudit({ page })
  );

  t.deepEqual(actual, {
    ...S3.params("a pre-signed S3 URL"),
    data: new Blob(
      [JSON.stringify(S3.payload("some id", makeAudit({ page })))],
      {
        type: "application/json",
      }
    ),
  });
});

test("Metadata.payload() uses site ID if provided", async (t) => {
  const actual = await Metadata.payload(
    makeAudit(),
    { siteID: "12345" },
    timestamp
  );

  t.deepEqual(actual, makePayload({ SiteId: "12345" }));
});

test("Metadata.payload() uses test name if provided", async (t) => {
  const actual = await Metadata.payload(
    makeAudit(),
    { testName: "test name" },
    timestamp
  );

  t.deepEqual(actual, makePayload({ TestName: "test name" }));
});

test("Metadata.payload() includes commit information if provided", async (t) => {
  for (const commitInformation of [
    { BranchName: "hello", Origin: "somewhere" },
    Option.of({ BranchName: "hello", Origin: "somewhere" }),
    Ok.of({ BranchName: "hello", Origin: "somewhere" }),
  ]) {
    const actual = await Metadata.payload(
      makeAudit(),
      { commitInformation },
      timestamp
    );

    t.deepEqual(
      actual,
      makePayload({
        CommitInformation: { BranchName: "hello", Origin: "somewhere" },
      })
    );
  }

  for (const commitInformation of [undefined, None, Err.of("invalid")]) {
    const actual = await Metadata.payload(
      makeAudit(),
      { commitInformation },
      timestamp
    );

    t.deepEqual(actual, makePayload());
  }
});

test("Metadata.payload() builds test name from commit information", async (t) => {
  const actual = await Metadata.payload(
    makeAudit(),
    {
      commitInformation: { BranchName: "hello", Origin: "somewhere" },
      testName: (commit) => `On branch ${commit.BranchName}`,
    },
    timestamp
  );

  t.deepEqual(
    actual,
    makePayload({
      CommitInformation: { BranchName: "hello", Origin: "somewhere" },
      TestName: "On branch hello",
    })
  );
});

test("Metadata.payload() uses explicit title if provided", async (t) => {
  const actual = await Metadata.payload(
    makeAudit(),
    { pageTitle: "page title" },
    timestamp
  );

  t.deepEqual(actual, makePayload({ PageTitle: "page title" }));
});

test("Metadata.payload() uses page's title if it exists", async (t) => {
  const page = makePage(h.document([<title>Hello</title>, <span></span>]));

  const actual = await Metadata.payload(makeAudit({ page }), {}, timestamp);

  t.deepEqual(actual, makePayload({ PageTitle: "Hello" }));
});

test("Metadata.payload() uses explicit title over page's title", async (t) => {
  const page = makePage(h.document([<title>ignored</title>, <span></span>]));

  const actual = await Metadata.payload(
    makeAudit({ page }),
    { pageTitle: "page title" },
    timestamp
  );

  t.deepEqual(actual, makePayload({ PageTitle: "page title" }));
});

test("Metadata.payload() builds page title from the page if specified", async (t) => {
  const page = makePage(h.document([<span>Hello</span>]));

  const actual = await Metadata.payload(
    makeAudit({ page }),
    { pageTitle: (page) => page.document.toString() },
    timestamp
  );

  t.deepEqual(
    actual,
    makePayload({ PageTitle: "#document\n  <span>\n    Hello\n  </span>" })
  );
});

test("Metadata.payload() uses explicit URL if provided", async (t) => {
  const actual = await Metadata.payload(
    makeAudit(),
    { pageURL: "page URL" },
    timestamp
  );

  t.deepEqual(actual, makePayload({ PageUrl: "page URL" }));
});

test("Metadata.payload() uses page's response's URL if it exists", async (t) => {
  const page = makePage(
    h.document([<span></span>]),
    Response.of(URL.parse("https://siteimprove.com/").getUnsafe(), 200)
  );

  const actual = await Metadata.payload(makeAudit({ page }), {}, timestamp);

  t.deepEqual(actual, makePayload({ PageUrl: "https://siteimprove.com/" }));
});

test("Metadata.payload() uses explicit URL over page's URL", async (t) => {
  const page = makePage(
    h.document([<span></span>]),
    Response.of(URL.parse("https://siteimprove.com/").getUnsafe(), 200)
  );

  const actual = await Metadata.payload(
    makeAudit({ page }),
    { pageURL: "page URL" },
    timestamp
  );

  t.deepEqual(actual, makePayload({ PageUrl: "page URL" }));
});

test("Metadata.payload() builds page URL from the page if specified", async (t) => {
  const page = makePage(h.document([<span>Hello</span>]));

  const actual = await Metadata.payload(
    makeAudit({ page }),
    { pageURL: (page) => page.response.status.toString() },
    timestamp
  );

  t.deepEqual(actual, makePayload({ PageUrl: "200" }));
});

test("Metadata.payload() includes global durations", async (t) => {
  const actual = await Metadata.payload(
    makeAudit({
      durations: {
        common: { cascade: 1, "aria-tree": 2, total: 3 },
        rules: {},
      },
    }),
    {},
    timestamp
  );

  t.deepEqual(
    actual,
    makePayload({ Durations: { Cascade: 1, AriaTree: 2, Total: 3 } })
  );
});

test("Metadata.payload() includes rule durations in aggregates", async (t) => {
  const actual = await Metadata.payload(
    makeAudit({
      resultAggregates: Map.from([
        ["foo", { failed: 1, passed: 1, cantTell: 0 }],
        ["bar", { failed: 2, passed: 2, cantTell: 0 }],
      ]),
      durations: {
        common: { cascade: 1, "aria-tree": 1, total: 1 },
        rules: {
          foo: { applicability: 2, expectation: 2, total: 2 },
          bar: { applicability: 3, expectation: 3, total: 3 },
        },
      },
    }),
    {},
    timestamp
  );

  t.deepEqual(
    actual,
    makePayload({
      Durations: { Cascade: 1, AriaTree: 1, Total: 1 },
      ResultAggregates: [
        {
          RuleId: "foo",
          Failed: 1,
          Passed: 1,
          CantTell: 0,
          Durations: { Applicability: 2, Expectation: 2, Total: 2 },
        },
        {
          RuleId: "bar",
          Failed: 2,
          Passed: 2,
          CantTell: 0,
          Durations: { Applicability: 3, Expectation: 3, Total: 3 },
        },
      ],
    })
  );
});

// Somehow, importing axios-mock-adapter breaks typing.
// Requiring it is fine, but not allowed in an ESM file.
// @ts-ignore
const mock = new MockAdapter(axios);

// Everything will be mocked after that, use mock.restore() if needed.
mock.onPost(SIP.Defaults.URL).reply(200, {
  pageReportUrl: "a page report URL",
  preSignedUrl: "a S3 URL",
  id: "hello",
});

mock.onPut("a S3 URL").reply(200);

test(".upload connects to Siteimprove Intelligence Platform", async (t) => {
  const page = makePage(h.document([<span></span>]));

  const actual = await SIP.upload(makeAudit({ page }), {
    userName: "foo@foo.com",
    apiKey: "bar",
    siteID: "12345",
  });

  t.deepEqual(actual.toJSON(), { type: "ok", value: "a page report URL" });
});

test(".upload returns an error on missing user name", async (t) => {
  const page = makePage(h.document([<span></span>]));

  const actual = await SIP.upload(makeAudit({ page }), {
    apiKey: "bar",
    siteID: "12345",
  });

  t(actual.isErr());
});

test(".upload returns an error on missing API key", async (t) => {
  const page = makePage(h.document([<span></span>]));

  const actual = await SIP.upload(makeAudit({ page }), {
    userName: "foo@foo.com",
    siteID: "12345",
  });

  t(actual.isErr());
});

test(".upload returns an error on missing site ID", async (t) => {
  const page = makePage(h.document([<span></span>]));

  const actual = await SIP.upload(makeAudit({ page }), {
    userName: "foo@foo.com",
    apiKey: "bar",
  });

  t(actual.isErr());
});
