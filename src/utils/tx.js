// src/utils/tx.js
export async function withTx(sequelize, fn) {
  const t = await sequelize.transaction();
  try {
    const res = await fn(t);
    await t.commit();
    return res;
  } catch (err) {
    try {
      await t.rollback();
    } catch {}
    throw err;
  }
}

// Tránh throw nếu transaction đã finished
export async function safeRollback(t) {
  try {
    if (t && !t.finished) await t.rollback();
  } catch {}
}
