export const profileDestination = (hasToken: boolean) =>
  hasToken ? "/customer-profile" : "/login?next=profile";

export const addressDestination = (hasToken: boolean) =>
  hasToken ? "/customer-profile?section=address" : "/login?next=address";

export const customerLanding = (next?: string) =>
  next === "address" ? "/customer-profile?section=address" :
  next === "profile" ? "/customer-profile" :
  next === "book" ? "/(customer)/book" : "/(customer)/home";
