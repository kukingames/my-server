require("dotenv").config();
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("./models/User");

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDBに接続
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDBに接続しました"))
  .catch((err) => console.error("MongoDB接続エラー:", err));

app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 },
  }),
);

app.use(express.static("public"));

// 新規登録処理
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.send(
        'そのユーザー名は既に使われています。<a href="/register.html">戻る</a>',
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.send('登録が完了しました。<a href="/login.html">ログインする</a>');
  } catch (err) {
    console.error(err);
    res.status(500).send("登録中にエラーが発生しました。");
  }
});

// ログイン処理
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.send(
        'ユーザー名またはパスワードが違います。<a href="/login.html">戻る</a>',
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.send(
        'ユーザー名またはパスワードが違います。<a href="/login.html">戻る</a>',
      );
    }

    req.session.username = username;
    res.redirect("/mypage.html");
  } catch (err) {
    console.error(err);
    res.status(500).send("ログイン中にエラーが発生しました。");
  }
});

function requireLogin(req, res, next) {
  if (!req.session.username) {
    return res.redirect("/login.html");
  }
  next();
}

app.get("/api/me", requireLogin, (req, res) => {
  res.json({ username: req.session.username });
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login.html");
  });
});

app.listen(PORT, () => {
  console.log(`サーバー起動: http://localhost:${PORT}`);
});
