import db from "../models/index.js";

const { Sequelize, SeatTemplate, SeatTemplateSeat } = db;

const createTemplate = async (req, res) => {
  try {
    const { name, meta_json } = req.body || {};
    if (!name?.trim())
      return res.status(400).json({ message: "name is required" });

    const tpl = await SeatTemplate.create({
      name: name.trim(),
      meta_json: meta_json ?? null,
    });
    res.status(201).json({
      message: "template created successfully",
      template: tpl,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal error: " + error.message,
      sqlMessage: error.sql,
    });
  }
};

const getTemplateList = async (req, res) => {
  try {
    const { q = "", limit = 20, offset = 0 } = req.query;
    const where = q ? { name: { [Sequelize.Op.like]: `%${q}%` } } : undefined;

    const { rows, count } = await SeatTemplate.findAndCountAll({
      where,
      limit: +limit,
      offset: +offset,
      order: [["id", "DESC"]],
    });

    return res.json({ items: rows, total: count });
  } catch (error) {
    res.status(500).json({
      message: "Internal error: " + error.message,
      sqlMessage: error.sql,
    });
  }
};

const getTemplateDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const tpl = await SeatTemplate.findByPk(id);
    if (!tpl) return res.status(404).json({ message: "Template not found" });
    const seats = await SeatTemplateSeat.findAll({
      where: { template_id: id },
      order: [
        ["pos_row", "ASC"],
        ["pos_col", "ASC"],
      ],
    });
    res.status(200).json({
      template: tpl,
      seats,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal error: " + error.message,
      sqlMessage: error.sql,
    });
  }
};

const updateSeatTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, rows, cols } = req.body;
    if (!rows || !cols) {
      return res.status(400).json({ message: "rows & cols required" });
    }
    // const [count] = await SeatTemplate.update(
    //   { name: name, meta_json: meta_json },
    //   { where: { id } }
    // );
    // if (!count) return res.status(404).json({ message: "Template not found" });
    const tpl = await SeatTemplate.findByPk(id);
    if (!tpl) return res.status(404).json({ message: "Template not found" });
    tpl.meta_json = { ...(tpl.meta_json || {}), rows, cols };
    await tpl.save();
    res.status(201).json({
      message: "Template updated",
      template: tpl,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal error: " + error.message,
      sqlMessage: error.sql,
    });
  }
  ``;
};

const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const count = await SeatTemplate.destroy({ where: { id } });
    if (!count) return res.status(404).json({ message: "Template not found" });
    res.json({ message: "Template deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Internal error: " + error.message,
      sqlMessage: error.sql,
    });
  }
};

const upsertTemplateSeats = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const rows = Array.isArray(req.body) ? req.body : [];
    if (!rows.length) {
      await t.rollback();
      return res.status(400).json({
        message: "Body must be a non-empty array",
      });
    }
    //validate
    for (const r of rows) {
      if (
        !r.seat_code ||
        r.pos_row == null ||
        r.pos_col == null ||
        r.base_price == null ||
        !r.seat_class
      ) {
        await t.rollback();
        return res.status(400).json({
          message:
            "each seat requires seat_code, seat_class, base_price, pos_row, pos_col",
        });
      }
    }
    //payload
    const payload = rows.map((r) => ({
      template_id: +id,
      seat_code: String(r.seat_code).trim(),
      seat_class: String(r.seat_class).toLowerCase(),
      base_price: r.base_price,
      pos_row: r.pos_row,
      pos_col: r.pos_col,
    }));

    //bulk upsert
    // MySQL: updateOnDuplicate hoạt động khi có unique key (uk_tpl_code)
    await SeatTemplateSeat.bulkCreate(payload, {
      transaction: t,
      updateOnDuplicate: ["seat_class", "base_pice", "pos_row", "pos_col"],
    });

    await t.commit();

    //return danh sach seat moi nhat
    const seats = await SeatTemplateSeat.findAll({
      where: {
        template_id: id,
      },
      order: [
        ["pos_row", "ASC"],
        ["pos_col", "ASC"],
      ],
    });

    res.status(201).json({
      message: "Seat upserted sucesssfully",
      count: seats.length,
      seats: seats,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal error: " + error.message,
      sqlMessage: error.sqlMessage,
    });
  }
};

const updateOneSeat = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const seatId = Number(req.params.seatId);

    if (!Number.isFinite(id) || !Number.isFinite(seatId)) {
      return res.status(400).json({ message: "Invalid id/seatId" });
    }
    const [count] = await SeatTemplateSeat.update(
      {
        seat_class: req.body?.seat_class,
        base_price: req.body?.base_price,
        pos_row: req.body?.pos_row,
        pos_col: req.body?.pos_col,
      },
      { where: { template_id: id, id: seatId } }
    );
    if (!count) return res.status(404).json({ message: "Seat not found" });
    const seat = await SeatTemplateSeat.findOne({
      where: { template_id: id, id: seatId },
    });
    res.status(200).json({
      message: "Update seat successfully",
      updatedSeat: seat,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal error: " + error.message,
      sqlMessage: error.sqlMessage,
    });
  }
};
const deleteOneSeat = async (req, res) => {
  try {
    const { id, seatId } = req.params;
    const count = await SeatTemplateSeat.destroy({
      where: { template_id: id, id: seatId },
    });
    if (!count)
      return res.status(404).json({
        message: "Seat not found",
      });
    res.status(200).json({
      message: "Seat deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal error: " + error.message,
      sqlMessage: error.sqlMessage,
    });
  }
};
const seatTemplateController = {
  createTemplate,
  getTemplateList,
  getTemplateDetail,
  updateSeatTemplate,
  deleteTemplate,
  upsertTemplateSeats,
  updateOneSeat,
  deleteOneSeat,
};

export default seatTemplateController;
