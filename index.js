// https://dbdiagram.io/d/train-booking-db-68c7b36b841b2935a68f6084
/*
npx sequelize-cli init
npx sequelize-cli model:generate --name users --attributes full-name:string,email:string,phone:string,password_hash:string,role:string,status:string
npx sequelize-cli db:migrate
npx sequelize-cli model:generate --name routes --attributes origin:string,destination:string,distance_km:decimal,eta_minutes:integer,status:boolean,created_at:date,updated_at:date
npx sequelize-cli model:generate --name seat_templates --attributes name:string,meta_json:JSON
*/
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

//
app.use(express.json());
express.urlencoded({ extended: true });
//
app.get("/", (req, res) => {
  res.send(`App is running on PORT ${PORT}`);
});
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
