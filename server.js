const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.post("/send-appointment", (req, res) => {
  console.log("DATA RECEIVED:", req.body);

  res.json({
    success: true,
    message: "Appointment received",
    data: req.body
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});