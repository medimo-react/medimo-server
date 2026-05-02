const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String },
    normalizedName: { type: String, default: "" },
    engName: { type: String, default: "" },
    category: { type: String },
    dosage: { type: String },

    folder: {
      type: [String],
      default: ["기타"],
    },

    starred: { type: Boolean, default: false },
    warning: { type: Boolean, default: false },
    date: { type: String },
  },
  { id: false }
);

const userSchema = new mongoose.Schema(
  {
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:  { type: String, required: true },
    name:      { type: String, required: true, trim: true },
    bookmarks: [bookmarkSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema, 'user');
