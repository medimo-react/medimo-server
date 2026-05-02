require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');

const medicineRouter = require('./routes/medicine');
const scanRouter = require('./routes/scan');
const authRouter = require('./routes/auth');
const bookmarkRouter = require('./routes/bookmark');
const durRouter = require("./routes/dur");
const summaryRouter = require("./routes/summary");
const analysisRouter = require('./routes/analysis');

const app = express();

connectDB();

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://192.168.200.102:5173',
  process.env.CLIENT_URL,
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('CORS 허용되지 않은 origin입니다.'));
    },
  })
);
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/medicine', medicineRouter);
app.use('/api/scan', scanRouter);
app.use('/api/bookmarks', bookmarkRouter);
app.use("/api/dur", durRouter);
app.use("/api/summary", summaryRouter);
app.use('/api/analysis', analysisRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));