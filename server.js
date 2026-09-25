require("dotenv").config();
const multer = require("multer");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("./models/User");
const { MongoStore } = require("connect-mongo");
const Memo = require("./models/Memo");

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
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: { maxAge: 1000 * 60 * 60 },
  }),
);

app.use(express.static("public"));

// ------------------------
// 画像アップロードの設定
// ------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (req, file, cb) => {
    // ユーザー名 + 元の拡張子 で保存(常に上書きされる)
    const ext = file.originalname.split(".").pop();
    cb(null, `${req.session.username}.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MBまで
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("画像ファイルのみアップロードできます"));
    }
    cb(null, true);
  },
});

// ------------------------
// プロフィール画像アップロード処理
// ------------------------
app.post(
  "/api/avatar",
  requireLogin,
  upload.single("avatar"),
  async (req, res) => {
    try {
      const avatarPath = `/uploads/${req.file.filename}`;
      await User.findOneAndUpdate(
        { username: req.session.username },
        { avatar: avatarPath },
      );
      res.json({ avatar: avatarPath });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "アップロードに失敗しました" });
    }
  },
);

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

app.get("/api/me", requireLogin, async (req, res) => {
  const user = await User.findOne({ username: req.session.username });
  res.json({ username: req.session.username, avatar: user.avatar });
});
// ------------------------
// メモ一覧取得(自分のメモだけ)
// ------------------------
app.get("/api/memos", requireLogin, async (req, res) => {
  try {
    const memos = await Memo.find({ username: req.session.username }).sort({
      createdAt: -1,
    });
    res.json(memos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "メモの取得に失敗しました" });
  }
});

// ------------------------
// メモ投稿
// ------------------------
app.post("/api/memos", requireLogin, async (req, res) => {
  const { content } = req.body;

  if (!content || content.trim() === "") {
    return res.status(400).json({ error: "内容を入力してください" });
  }

  try {
    const memo = new Memo({ username: req.session.username, content });
    await memo.save();
    res.json(memo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "メモの保存に失敗しました" });
  }
});

// ------------------------
// メモ削除
// ------------------------
app.delete("/api/memos/:id", requireLogin, async (req, res) => {
  try {
    const memo = await Memo.findById(req.params.id);

    if (!memo) {
      return res.status(404).json({ error: "メモが見つかりません" });
    }

    // 自分のメモ以外は削除できないようにする
    if (memo.username !== req.session.username) {
      return res.status(403).json({ error: "削除する権限がありません" });
    }

    await Memo.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "メモの削除に失敗しました" });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login.html");
  });
});

app.listen(PORT, () => {
  console.log(`サーバー起動: http://localhost:${PORT}`);
});
