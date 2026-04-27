const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const auth = require('../middleware/auth');

// 북마크 목록 조회
router.get('/', auth, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const bookmarks = user.bookmarks || [];

    const populated = await Promise.all(
      bookmarks.map(async (b) => {
        const med = await Medicine.findById(b.id).lean();
        const obj = b.toObject();
        return {
          ...obj,
          name:     med?.name     || obj.name     || '',
          engName:  med?.normalizedName || obj.engName  || '',
          category: med?.effect   || obj.category || '',
          dosage:   med?.dosage   || obj.dosage   || '',
          warning:  Array.isArray(med?.sideEffect) && med.sideEffect.length > 0,
        };
      })
    );

    return res.json(populated);
  } catch (error) {
    console.error('북마크 목록 조회 에러:', error);
    return res.status(500).json({ message: '서버 오류' });
  }
});

// 북마크 추가
router.post('/', auth, async (req, res) => {
  try {
    const { id, folder = '기타' } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'id가 필요합니다.' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: '유효하지 않은 id입니다.' });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    const medicine = await Medicine.findById(id);

    if (!medicine) {
      return res.status(404).json({ message: '약 정보를 찾을 수 없습니다.' });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const exists = user.bookmarks.some((bookmark) => bookmark.id === String(medicine._id));

    if (exists) {
      return res.status(409).json({ message: '이미 북마크한 약입니다.' });
    }

    const now = new Date();
    const date = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

    const bookmarkData = {
      id:       String(medicine._id),
      name:     medicine.name || '',
      engName:  medicine.normalizedName || '',
      category: medicine.effect || '',
      dosage:   medicine.dosage || '',
      folder,
      starred:  false,
      warning:  Array.isArray(medicine.sideEffect) && medicine.sideEffect.length > 0,
      date,
    };

    user.bookmarks.push(bookmarkData);
    await user.save();

    return res.status(201).json({
      message: '북마크 추가 성공',
      bookmarks: user.bookmarks,
    });
  } catch (error) {
    console.error('북마크 추가 에러:', error);
    return res.status(500).json({ message: '서버 오류' });
  }
});

// 북마크 삭제
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const beforeLength = user.bookmarks.length;

    user.bookmarks = user.bookmarks.filter(
      (bookmark) => bookmark.id !== req.params.id
    );

    if (beforeLength === user.bookmarks.length) {
      return res.status(404).json({ message: '북마크를 찾을 수 없습니다.' });
    }

    await user.save();

    return res.json({
      message: '북마크 삭제 성공',
      bookmarks: user.bookmarks,
    });
  } catch (error) {
    console.error('북마크 삭제 에러:', error);
    return res.status(500).json({ message: '서버 오류' });
  }
});

// 폴더 이동 / 즐겨찾기 토글
router.patch('/:id', auth, async (req, res) => {
  try {
    const { folder, starred } = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const bookmark = user.bookmarks.find((b) => b.id === req.params.id);

    if (!bookmark) {
      return res.status(404).json({ message: '북마크를 찾을 수 없습니다.' });
    }

    if (folder !== undefined) bookmark.folder = folder;
    if (starred !== undefined) bookmark.starred = starred;

    await user.save();

    return res.json({
      message: '북마크 수정 성공',
      bookmarks: user.bookmarks,
    });
  } catch (error) {
    console.error('북마크 수정 에러:', error);
    return res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;
