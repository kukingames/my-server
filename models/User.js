const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, default: null }, // 追加:画像ファイル名
});

module.exports = mongoose.model("User", userSchema);
