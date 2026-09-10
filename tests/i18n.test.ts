import assert from "node:assert/strict";
import test from "node:test";
import { getDictionary, translate } from "@/lib/i18n";

test("English and French dictionaries expose identical keys", () => {
  assert.deepEqual(
    Object.keys(getDictionary("en")).sort(),
    Object.keys(getDictionary("fr")).sort(),
  );
});

test("translation interpolates numeric and string placeholders", () => {
  assert.equal(
    translate("en", "publicJoinHelp", { count: 10, reward: "a coffee" }),
    "Collect 10, then a coffee. No extra app.",
  );
  assert.match(
    translate("fr", "publicJoinHelp", { count: 10, reward: "un café" }),
    /10/,
  );
});
