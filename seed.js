require('dotenv').config();
const mongoose = require('mongoose');
const Medicine = require('./models/Medicine');

const seedData = [
  {
    name: '타이레놀이알서방정650mg',
    effect: '해열 및 진통(두통, 치통, 근육통, 생리통)에 도움을 줍니다.',
    usage: '1일 3회, 식후 30분, 1회 1정, 5일분',
    caution: '과다 복용 시 간 손상 위험이 있습니다. 음주 중 복용을 피하세요.',
    sideEffect: '메스꺼움, 구토, 간 기능 이상이 나타날 수 있습니다.',
  },
  {
    name: '세파클러캡슐250mg',
    effect: '세균성 감염증(중이염, 인후염, 기관지염, 피부감염)의 치료에 사용됩니다.',
    usage: '1일 3회, 식후 30분, 1회 1캡슐, 7일분',
    caution: '페니실린 알레르기가 있는 경우 주의가 필요합니다.',
    sideEffect: '설사, 복통, 두드러기가 나타날 수 있습니다.',
  },
  {
    name: '코대원에스시럽',
    effect: '기침, 가래 완화에 도움을 줍니다.',
    usage: '1일 3회, 식후, 1회 10mL',
    caution: '졸음을 유발할 수 있으므로 운전 전 복용을 주의하세요.',
    sideEffect: '졸음, 어지러움, 구강 건조가 나타날 수 있습니다.',
  },
  {
    name: '판콜에이내복액',
    effect: '감기로 인한 발열, 두통, 콧물, 코막힘, 재채기 완화에 사용됩니다.',
    usage: '1일 3회, 식후 30분, 1회 20mL',
    caution: '다른 감기약과 중복 복용하지 마세요.',
    sideEffect: '졸음, 위장 불편이 나타날 수 있습니다.',
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB 연결 성공');

    await Medicine.deleteMany({});
    console.log('기존 데이터 삭제 완료');

    await Medicine.insertMany(seedData);
    console.log(`테스트 데이터 ${seedData.length}건 삽입 완료`);

    seedData.forEach(m => console.log(' -', m.name));
  } catch (err) {
    console.error('오류:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
