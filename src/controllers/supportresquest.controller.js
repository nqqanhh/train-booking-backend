import db from "../models/index.js";

const { SupportRequest } = db;

export const getAllRequests = async (req, res) => {
  try {
    const supReq = await SupportRequest.findAll();
    res.status(200).json({
      message: "OK",
      supReq,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal error: " + error.message });
  }
};

export const sendSuportRequest = async (req, res) => {
  try {
    const { subject, message } = req.body;
    const newReq = {
      user_id: req.user.id,
      subject,
      message,
      status: "unread",
    };
    await SupportRequest.create(newReq);
    res.status(200).json({
      message: "OK",
      newReq,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal error: " + error.message,
    });
  }
};

