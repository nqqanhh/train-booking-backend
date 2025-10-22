import { matchesGlob } from "path";
import db from "../models/index.js";
const { PassengerProfile } = db;

//get all (admin)
const getAllPassengers = async (req, res) => {
  try {
    const passengers = await PassengerProfile.findAll();
    res.status(200).json({
      message: "OK",
      passengers,
    });
  } catch (e) {
    return res.status(500).json({
      message: "Get passengers failed: " + e.message,
    });
  }
};
//get passenger profiles
const getPassenger = async (req, res) => {
  const user = req.user;

  try {
    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }
    const passengerList = await PassengerProfile.findAll({
      where: {
        user_id: user.id,
      },
    });
    res.status(200).json({
      message: "Get passenger profiles successfully",
      passengers: passengerList,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal error: " + error.message,
      sqlMessage: error.sql,
    });
  }
};

const getOnePassenger = async (req, res) => {
  try {
    const passengerId = req.params;
    const passenger = await PassengerProfile.findOne(passengerId);
    res.status(200).json({
      message: "OK",
      passenger,
    });
  } catch (e) {
    return res.status(500).json({
      message: "Error getting passenger: " + e.message,
    });
  }
};
//create passenger profiles
const createPassengerProfile = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }
    const { fullName, id_no, dob, phone } = req.body;
    if (!fullName || !id_no || !dob || !phone)
      return res.status(400).json({
        message: "Missing credentials",
      });
    const newPassenger = {
      user_id: user.id,
      full_name: fullName,
      id_no: id_no,
      dob: dob,
      phone: phone,
    };
    await PassengerProfile.create(newPassenger);
    res.status(200).json({
      message: "create new passenger profile successfully",
      newPassenger: newPassenger,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal error: " + error.message,
      sqlMessage: error.sql,
    });
  }
};

//edit passenger profile
const updatePassengerProfile = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }
    const { passengerProfileId } = req.params;
    const { fullName, id_no, dob, phone } = req.body;
    const pickedPassenger = await PassengerProfile.findOne({
      where: {
        id: passengerProfileId,
        user_id: user.id,
      },
    });

    // Update passenger profile fields
    if (fullName) pickedPassenger.full_name = fullName;
    if (id_no) pickedPassenger.id_no = id_no;
    if (dob) pickedPassenger.dob = dob;
    if (phone) pickedPassenger.phone = phone;

    await PassengerProfile.update(
      {
        full_name: pickedPassenger.full_name,
        id_no: pickedPassenger.id_no,
        dob: pickedPassenger.dob,
        phone: pickedPassenger.phone,
      },
      {
        where: {
          id: pickedPassenger.id,
          user_id: user.id,
        },
      }
    );
    res.status(200).json({
      message: `Passenger ${pickedPassenger.full_name}'s profile updated successfully`,
      updatedPassengerProfile: pickedPassenger,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal error: " + error.message,
      sqlMessage: error.sqlMessage,
    });
  }
};

//delete passenger profiles
const deletePassengerProfile = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }
    const { passengerProfileId } = req.params;
    const pickedPassenger = await PassengerProfile.findOne({
      where: {
        id: passengerProfileId,
        user_id: user.id,
      },
    });
    if (!pickedPassenger) {
      return res.status(404).json({
        message: "This passenger doesn't exist",
      });
    }
    await PassengerProfile.destroy({ where: { id: pickedPassenger.id } });
    res.status(200).json({
      message: `Deleted passenger ${pickedPassenger.full_name} successfully`,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal error: " + error.message,
      sqlMessage: error.sql,
    });
  }
};
const passengerProfileController = {
  getAllPassengers,
  getPassenger,
  getOnePassenger,
  createPassengerProfile,
  updatePassengerProfile,
  deletePassengerProfile,
};

export default passengerProfileController;
