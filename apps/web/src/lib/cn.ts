export type ClassValue = string | number | null | false | undefined | ClassValue[];

export function cn(...values: ClassValue[]): string {
  const classes: string[] = [];
  const walk = (value: ClassValue) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    classes.push(String(value));
  };
  values.forEach(walk);
  return classes.join(" ");
}
