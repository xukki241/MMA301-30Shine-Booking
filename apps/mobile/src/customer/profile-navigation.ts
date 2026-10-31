export const profileDestination = (hasToken: boolean) =>
  hasToken ? "/(customer)/profile" : "/login?next=profile";

export const customerLanding = (next?: string) =>
  next === "profile" ? "/(customer)/profile" :
  next === "book" ? "/(customer)/book" : "/(customer)/home";
