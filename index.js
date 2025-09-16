import express from "express";
import bodyParser from "body-parser";
import router from "./src/routes/index.js";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const PORT = process.env.PORT;
//
app.use(bodyParser.json());
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
//
app.use("/api", router);
//
app.get("/", (req, res) => {
  res.send(`App is running on PORT ${PORT}`);
});
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
