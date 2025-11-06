export const normalizePayload = (input) => {
  let obj = input;
  if (typeof input === "string") {
    try {
      obj = JSON.parse(input);
    } catch {
      /* keep string */
    }
  }
  if (typeof obj === "object" && obj) {
    const sorted = Object.keys(obj)
      .sort()
      .reduce((acc, k) => ((acc[k] = obj[k]), acc), {});
    return JSON.stringify(sorted);
  }
  return String(input || "");
};
