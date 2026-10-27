export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function firstName(name = "") {
  return name.trim().split(" ")[0] || name;
}
