import db from "../../models/index.js";
const { Order, OrderItem, Ticket } = db;

const getMyOrder = async (req, res) => {
  const orders = await Order.findAll({
    where: {
      user_id: req.user.id,
    },
    order: [["id", "DESC"]],
    include: [{ model: OrderItem, as: "order_items" }],
  });
  res.status(200).json({
    message: "OK",
    items: orders,
  });
};

const getMyTicket = async (req, res) => {
  const tickets = await Ticket.findAll({
    include: [
      {
        model: OrderItem,
        as: "order_items",
        include: [
          { model: Order, as: "order", where: { user_id: req.user.id } },
        ],
      },
    ],
  });
  res.status(200).json({
    message: "OK",
    items: tickets,
  });
};

const myController = { getMyOrder, getMyTicket };
export default myController;
