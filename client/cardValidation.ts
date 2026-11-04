export type CardValidationInput = {
  name: string;
  set_id: string;
  purchase_price: string;
};

export type CardValidationField = keyof CardValidationInput;
export type CardValidationErrors = Partial<Record<CardValidationField, string>>;

export function validateCardValues(
  values: CardValidationInput,
  sets: Array<{ id: string }>,
): CardValidationErrors {
  const errors: CardValidationErrors = {};

  if (!values.name.trim()) {
    errors.name = "Enter a card name.";
  } else if (values.name.trim().length > 200) {
    errors.name = "Card names must be 200 characters or fewer.";
  }

  if (!sets.some((set) => set.id === values.set_id)) {
    errors.set_id = "Choose one of your sets.";
  }

  const price = values.purchase_price.trim();
  if (price && !/^\d{1,8}(?:\.\d{1,2})?$/.test(price)) {
    errors.purchase_price =
      "Enter a nonnegative price with no more than two decimal places.";
  }

  return errors;
}
