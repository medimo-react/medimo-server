require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');

const medicineRouter = require('./routes/medicine');
const scanRouter = require('./routes/scan');
const authRouter = require('./routes/auth');
const bookmarkRouter = require('./routes/bookmark');

const app = express();

connectDB();

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/medicine', medicineRouter);
app.use('/api/scan', scanRouter);
app.use('/api/bookmarks', bookmarkRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));