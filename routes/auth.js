const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// 회원가입
router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: '이메일, 비밀번호, 이름을 모두 입력해주세요.' });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ message: '이미 사용 중인 이메일입니다.' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password: hashed, name });

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({ token, user: { id: user._id, email: user.email, name: user.name } });
});

// 로그인
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: '이메일과 비밀번호를 입력해주세요.' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

  res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
});

module.exports = router;
