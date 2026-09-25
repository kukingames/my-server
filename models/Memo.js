const mongoose = require("mongoose");

const memoSchema = new mongoose.Schema({
  username: { type: String, required: true },
  content: { type: String, required: true },
  isPublic: { type: Boolean, default: false }, // 追加:公開するかどうか
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Memo", memoSchema);
