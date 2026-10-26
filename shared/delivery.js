// Shared by the storefront and Worker; the server recalculates every order.
export function deliveryFee(city) {
  const normalized = String(city || "")
    .trim()
    .toLocaleLowerCase("fr-MA");
  return normalized === "casablanca" ? 20 : 35;
}
