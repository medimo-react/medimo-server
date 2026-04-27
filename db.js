const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB 연결 성공')
  } catch (err) {
    console.error('MongoDB 연결 실패', err.message);
    process.exit(1); //연결 실패시 서버 종료
  }
};

module.exports = connectDB;