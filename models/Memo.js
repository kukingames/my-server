const mongoose = require("mongoose");

const memoSchema = new mongoose.Schema({
  username: { type: String, required: true }, // 誰が投稿したか
  content: { type: String, required: true }, // メモの内容
  createdAt: { type: Date, default: Date.now }, // 投稿日時
});

module.exports = mongoose.model("Memo", memoSchema);
