const mongoose = require('mongoose');

const analysisRecordSchema = new mongoose.Schema(
  {
    userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    candidates:     [{ type: String }],
    medicineCount:  { type: Number, default: 0 },
    cautionCount:   { type: Number, default: 0 }, // durList가 있는 약품 수
    medicineResults: [{ type: mongoose.Schema.Types.Mixed }],
    isPinned:       { type: Boolean, default: false },
    pinnedAt:       { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AnalysisRecord', analysisRecordSchema, 'analysisRecord');
