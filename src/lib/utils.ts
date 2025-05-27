export function isEmptyOrInvalidObject(obj: object) {
  return !obj || Object.keys(obj).length === 0;
}

export function isEmptyOrInvalidArray<T>(arr: T[]): boolean {
  return !arr || arr.length === 0;
}
