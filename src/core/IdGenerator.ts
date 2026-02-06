let counter = 0;

export function generateId(prefix: string): string {
  counter++;
  return `${prefix}_${counter.toString(36)}_${Date.now().toString(36)}`;
}

export function resetIdCounter(): void {
  counter = 0;
}
