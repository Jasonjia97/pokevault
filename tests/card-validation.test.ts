import { describe, expect, it } from "vitest";
import { validateCardValues } from "../client/cardValidation";

const sets = [{ id: "set-1" }];

describe("card form validation", () => {
  it("requires a nonblank card name and a selected set", () => {
    expect(
      validateCardValues({ name: "   ", set_id: "", purchase_price: "0" }, sets),
    ).toEqual({
      name: "Enter a card name.",
      set_id: "Choose one of your sets.",
    });
  });

  it.each(["-1", "1.234", "abc", "100000000"])(
    "rejects invalid price %s",
    (purchase_price) => {
      expect(
        validateCardValues(
          { name: "Pikachu", set_id: "set-1", purchase_price },
          sets,
        ).purchase_price,
      ).toBe("Enter a nonnegative price with no more than two decimal places.");
    },
  );

  it.each(["", "0", "12.5", "99999999.99"])(
    "accepts valid price %s",
    (purchase_price) => {
      expect(
        validateCardValues(
          { name: "Pikachu", set_id: "set-1", purchase_price },
          sets,
        ),
      ).toEqual({});
    },
  );
});
