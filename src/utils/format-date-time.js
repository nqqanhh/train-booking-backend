export  function parseTod(tod) {
  const [h, m] = String(tod).split(":").map(Number);
  if (
    Number.isNaN(h) ||
    Number.isNaN(m) ||
    h < 0 ||
    h > 23 ||
    m < 0 ||
    m > 59
  ) {
    throw new Error("Invalid time-of-day (expected HH:mm)");
  }
  return { h, m };
}

export  function  parseYMD(ymd) {
  return new Date(`${ymd}T00:00:00`);
}

// util format yyyymmdd cho vehicle_no template nếu cần
export  function yyyymmdd(d) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}${m}${day}`;
}