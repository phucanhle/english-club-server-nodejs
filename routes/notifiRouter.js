const notifiRouter = require("express").Router();
const { connectSQLite } = require("../database");
const db = connectSQLite();

// Lấy tất cả thông báo của student
notifiRouter.get("/:userId", (req, res) => {
    const { userId } = req.params;
    console.log(userId);
    const sql = `SELECT *
    FROM notification
    JOIN LessonScores ON topic_id = userReceivedId
    WHERE user_id = ?`;

    db.all(sql, [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!rows) {
            return res.status(202).json({ msg: "Không tìm thấy" });
        }
        res.json(rows);
    });
});

// Lấy tất cả thông báo teacher đã gửi
notifiRouter.get("/teachers/:userId", (req, res) => {
    const { userId } = req.params;
    const sql = `SELECT * FROM notification where userSentId = ?`;

    db.all(sql, [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!rows) {
            return res.status(202).json({ msg: "Không tìm thấy" });
        }
        res.json(rows);
    });
});

// Route để tạo thông báo cho user
notifiRouter.post("/", (req, res) => {
    const { title, userSent, userReceivedId, date, content } = req.body;

    if (!title || !userSent || !date || !content) {
        return res.status(400).json({ error: "Missing fields" });
    }

    const sql = `INSERT INTO notification (title, userSentId, userReceivedId, date, content) VALUES (?, ?, ?, ?, ?)`;

    db.run(sql, [title, userSent, userReceivedId, date, content], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json({ message: "Notification created successfully", id: this.lastID });
    });
});

module.exports = notifiRouter;
