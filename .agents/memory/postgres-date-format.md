---
name: PostgreSQL date API format
description: Keep card acquisition dates compatible with HTML date inputs and JSON APIs.
---

PostgreSQL `DATE` values returned by the Node PostgreSQL driver may serialize
through JSON as midnight UTC timestamps. Format date-only API fields as
`YYYY-MM-DD` rather than passing the JavaScript `Date` through unchanged.

**Why:** The timestamp string is not a valid value for an HTML `input[type=date]`
and differs from a date-only API value.

**How to apply:** When returning PostgreSQL `DATE` columns to the client, use a
date-only SQL format or an explicit serializer, and assert the exact format in
API tests.
