<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@siteimprove/alfa-test-utils](./alfa-test-utils.md) &gt; [Logging](./alfa-test-utils.logging.md) &gt; [Options](./alfa-test-utils.logging.options.md)

## Logging.Options interface


**Signature:**

```typescript
interface Options 
```

## Properties

<table><thead><tr><th>

Property


</th><th>

Modifiers


</th><th>

Type


</th><th>

Description


</th></tr></thead>
<tbody><tr><td>

[pageTitle?](./alfa-test-utils.logging.options.pagetitle.md)


</td><td>


</td><td>

string \| ((page: Page) =&gt; string)


</td><td>

_(Optional)_ The title of the page, or a function to build it from the audited page. Defaults to the content of the first `<title>` element, if any.


</td></tr>
</tbody></table>