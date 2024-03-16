const express = require("express");
const topicRouter = express.Router();
const { connectSQLite } = require("../database");
const db = connectSQLite();
const checkEncounter = (topic_id, user_id) => {
    return new Promise((resolve, reject) => {
        const queryCheckClass = `SELECT name FROM Topics WHERE id = ?`;
        db.get(queryCheckClass, [topic_id], (err, row) => {
            if (err) reject(err);
            if (!row || row.name !== "Encounter") {
                resolve(false);
            } else {
                const queryGetClass = `SELECT * FROM LessonScores JOIN Topics ON Topics.id = LessonScores.topic_id 
                                       WHERE user_id = ? AND (name = 'Social Club' OR name = 'Complementary Class') 
                                       AND attended = 0;`;
                db.all(queryGetClass, [user_id], (err, rows) => {
                    if (err) reject(err);
                    if (!rows || rows.length === 0) {
                        resolve(false);
                    }

                    let count = {};
                    rows.forEach(function (row) {
                        if (count[row.name]) {
                            count[row.name]++;
                        } else {
                            count[row.name] = 1;
                        }
                    });

                    if (count["Complementary Class"] >= 3 && count["Social Club"] >= 3) {
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            }
        });
    });
};

// Tạo một lớp học
topicRouter.post("/", (req, res) => {
    const { teacherId, className, maxStudent, location, topic, level, date, timeStart, timeEnd } = req.body;

    if (!teacherId || !className || !maxStudent || !location || !topic || !level || !date || !timeStart || !timeEnd) {
        console.log(req.body);
        return res.status(400).json({ error: "Vui lòng cung cấp đủ thông tin." });
    }

    // Kiểm tra xem có lớp học nào khác trong cùng một ngày có thời gian trùng khớp không
    db.get(
        "SELECT id FROM Topics WHERE date = ? AND ((timeStart BETWEEN ? AND ?) OR (timeEnd BETWEEN ? AND ?))",
        [date, timeStart, timeEnd, timeStart, timeEnd],
        (err, row) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "Đã xảy ra lỗi khi kiểm tra giờ." });
            }

            if (row) {
                return res.status(400).json({ error: "Lớp học đã tồn tại trong khoảng thời gian này." });
            }

            const sql = `
            INSERT INTO Topics (name, max_students, location, lesson_details, min_level, date, timeStart, timeEnd, teacher_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

            const values = [className, maxStudent, location, topic, level, date, timeStart, timeEnd, teacherId];

            db.run(sql, values, function (err) {
                if (err) {
                    console.error("Error creating class:", err.message);
                    return res.status(500).json({ error: "Đã xảy ra lỗi khi tạo lớp học." });
                }

                const classId = this.lastID;
                return res.status(201).json({ id: classId, message: "Lớp học đã được tạo thành công." });
            });
        },
    );
});

// Sửa lớp học
topicRouter.patch("/update/:id", (req, res) => {
    const classId = req.params.id;
    const { name, max_students, location, lesson_details, min_level, date, timeStart, timeEnd } = req.body;

    // Xây dựng câu lệnh SQL và mảng giá trị dựa trên các trường có được truyền vào
    let sql = `UPDATE Topics SET `;
    const values = [];
    const updateFields = [];

    if (name) {
        updateFields.push("name = ?");
        values.push(name);
    }
    if (max_capacity) {
        updateFields.push("max_students = ?");
        values.push(max_students);
    }
    if (location) {
        updateFields.push("location = ?");
        values.push(location);
    }
    if (lesson_details) {
        updateFields.push("lesson_details = ?");
        values.push(lesson_details);
    }
    if (min_level) {
        updateFields.push("min_level = ?");
        values.push(min_level);
    }
    if (date) {
        updateFields.push("date = ?");
        values.push(date);
    }
    if (timeStart) {
        updateFields.push("timeStart = ?");
        values.push(timeStart);
    }
    if (timeEnd) {
        updateFields.push("timeEnd = ?");
        values.push(timeEnd);
    }

    // Kiểm tra xem có trường nào được cập nhật không
    if (updateFields.length === 0) {
        return res.status(400).json({ error: "Không có trường nào được cập nhật." });
    }

    sql += updateFields.join(", ");
    sql += ` WHERE id = ?`;
    values.push(classId);

    db.run(sql, values, function (err) {
        if (err) {
            console.error("Error updating class:", err.message);
            return res.status(500).json({ error: "Đã xảy ra lỗi khi cập nhật thông tin lớp học." });
        }

        return res.status(200).json({ message: "Thông tin lớp học đã được cập nhật thành công." });
    });
});

// Xem một lớp học
topicRouter.get("/one/:id", (req, res) => {
    const classId = req.params.id;

    const sql = `
        SELECT * FROM Topics WHERE id = ?
    `;

    db.get(sql, [classId], (err, row) => {
        if (err) {
            console.error("Error retrieving class:", err.message);
            return res.status(500).json({ error: "Đã xảy ra lỗi khi truy vấn thông tin lớp học." });
        }

        if (!row) {
            return res.status(404).json({ error: "Không tìm thấy lớp học." });
        }

        return res.status(200).json(row);
    });
});

// Xem tất cả các lớp học
topicRouter.get("/", (req, res) => {
    const sql = `
        SELECT * FROM Topics
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Error retrieving classes:", err.message);
            return res.status(500).json({ error: "Đã xảy ra lỗi khi truy vấn danh sách lớp học." });
        }

        return res.status(200).json(rows);
    });
});

// Xem tất cả các lớp học và điểm
topicRouter.get("/topic-and-scores", (req, res) => {
    const sql = `
    SELECT * FROM Topics, LessonScores
    WHERE Topics.id = LessonScores.topic_id 
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Error retrieving classes:", err.message);
            return res.status(500).json({ error: "Đã xảy ra lỗi khi truy vấn danh sách lớp học." });
        }

        return res.status(200).json(rows);
    });
});

// Xóa lớp học
topicRouter.delete("/delete/:id", (req, res) => {
    const classId = req.params.id;

    const sql = `
        DELETE FROM Topics WHERE id = ?
    `;

    db.run(sql, [classId], function (err) {
        if (err) {
            console.error("Error deleting class:", err.message);
            return res.status(500).json({ error: "Đã xảy ra lỗi khi xóa lớp học." });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: "Không tìm thấy lớp học để xóa." });
        }

        return res.status(204).send();
    });
});

//Đặt lớp học
topicRouter.post("/booking", (req, res) => {
    const { topicId, userId, bookingDate } = req.body;

    db.get("SELECT * FROM LessonScores WHERE topic_id = ? AND user_id = ?", [topicId, userId], (err, row) => {
        if (row) return res.status(202).json({ message: "Học sinh đã đặt lịch cho lớp học này trước đó" });
            db.get(
            `SELECT max_students, (SELECT COUNT(*) FROM LessonScores WHERE topic_id = ?) AS bookingsCount FROM Topics WHERE id = ?`,
            [topicId, topicId],
            (err, row) => {
                if (err) return res.status(500).json({ message: "Lỗi" });
                const { bookingsCount, max_students } = row;
                if (bookingsCount >= max_students) {
                    return res.status(202).json({ message: "Lớp học đã đầy" });
                }

                db.get(
                    `
                        SELECT users.id, users.level 
                        FROM users
                        JOIN levelsGroup ON users.level = levelsGroup.id
                        WHERE levelsGroup.grouplv = (SELECT min_level FROM Topics WHERE id = ?) AND users.id = ?
                    `,
                    [topicId, userId],
                    (err, row) => {
                        if (err) return res.status(500).json({ message: "Lỗi" });
                        if (!row) return res.status(202).json({ message: "Học viên không đủ điều kiện" });

                        checkEncounter(topicId, userId).then((isEncounter) => {
                            if (isEncounter)
                                return res.status(202).json({ message: "Không đủ điều kiện đăng kí Encounter" });
                            else {
                                db.run(
                                    "INSERT INTO LessonScores (topic_id, user_id, booking_date) VALUES (?, ?, ?)",
                                    [topicId, userId, bookingDate],
                                    (err) => {
                                        if (err) return res.status(500).json({ message: "Lỗi" });
                                        res.status(201).json({ message: "Đặt lịch thành công" });
                                    },
                                );
                            }
                        });
                    },
                );
            },
        );
    });
});

// Lấy danh sách học viên chưa đăng kí
topicRouter.get("/not-booking/:topicId/:minLevel", (req, res) => {
    const { topicId, minLevel } = req.params;
    const sql = `SELECT id, fullName, phone, level FROM users
    WHERE role = 'students' AND id NOT IN (SELECT user_id FROM LessonScores WHERE topic_id = ?)
    AND level IN (SELECT level FROM levelsGroup WHERE grouplv = ?)`;
    db.all(sql, [topicId, minLevel], (err, rows) => {
        if (err) {
            return res.status(500).json({ msg: "Lỗi khi tìm" });
        }
        if (!rows || rows.length === 0) {
            return res.status(202).json({ msg: "Không tìm thấy" });
        }
        res.status(201).json(rows);
    });
});
// Cập nhật điểm
topicRouter.post("/update-score", (req, res) => {
    const { topicId, userId, score } = req.body;

    // Kiểm tra xem chủ đề có phải là "Encounter" hay không
    db.get("SELECT name FROM Topics WHERE id = ? AND name = 'Encounter'", [topicId], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Đã xảy ra lỗi" });
        }

        if (!row) {
            return res.status(400).json({ message: "Chỉ có thể cập nhật điểm cho lớp Encounter" });
        }

        db.run(
            "UPDATE LessonScores SET score = ? WHERE topic_id = ? AND user_id = ?",
            [score, topicId, userId],
            (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ message: "Đã xảy ra lỗi" });
                }
                // Kiểm tra điểm sau khi cập nhật
                if (score > 70) {
                    // Tăng cấp độ của người dùng
                    db.run("UPDATE Users SET level = level + 1 WHERE id = ? AND role = 'students'", [userId], (err) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).json({ message: "Đã xảy ra lỗi trong quá trình tăng cấp độ" });
                        }
                        res.status(200).json({ message: "Cập nhật điểm và tăng cấp độ thành công" });
                    });
                } else {
                    res.status(200).json({ message: "Cập nhật điểm thành công" });
                }
            },
        );
    });
});

// Điểm danh học sinh
topicRouter.patch("/update-attended/:topicId", (req, res) => {
    const { topicId } = req.params;
    const listStudent = req.body;

    listStudent.forEach((item) => {
        const { studentId, value } = item;
        const sql = `UPDATE LessonScores SET attended = ? WHERE topic_id = ? AND user_id = ?`;
        db.run(sql, [value, topicId, studentId], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Đã xảy ra lỗi" });
            }
            res.status(200).json({ message: "Cập nhật thành công" });
        });
    });
});

// Lấy danh sách lớp học có tên học viên
topicRouter.get("/student/:userId", (req, res) => {
    const { userId } = req.params;

    const sql = `SELECT * FROM Topics, LessonScores
    WHERE Topics.id = LessonScores.topic_id AND user_id = ?`;
    const values = [userId];

    db.all(sql, values, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Đã xảy ra lỗi" });
        }
        if (!rows) {
            return res.status(400).json({ message: "Không có lớp" });
        }
        res.status(200).json(rows);
    });
});

// Lấy số học viên hiện tại trong lớp
topicRouter.get("/count/:topicId", (req, res) => {
    const { topicId } = req.params;

    const sql = `SELECT Count(user_id) as current_students FROM LessonScores
    WHERE topic_id = ?`;
    const values = [topicId];

    db.get(sql, values, (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Đã xảy ra lỗi" });
        }
        if (!row) {
            return res.status(400).json({ message: "Không có lớp" });
        }
        res.status(200).json(row);
    });
});

// Lấy danh sách học viên trong lớp của giảng viên
topicRouter.get("/teacher/:teacherId/topic/:topicsId", (req, res) => {
    const { teacherId, topicsId } = req.params;
    const sql = `
        SELECT  users.id, fullName, phone, attended
        FROM LessonScores, Topics, users
        WHERE LessonScores.topic_id = Topics.id AND users.id = LessonScores.user_id 
        AND teacher_id = ? and topic_id = ?
    `;

    db.all(sql, [teacherId, topicsId], (err, rows) => {
        if (err) {
            return res.status(500).json({ msg: "Xảy ra lỗi trong quá trình tìm." });
        }
        if (!rows) {
            return res.status(202).json({ msg: "Không tìm thấy học sinh nào trong lớp." });
        }
        res.status(201).json(rows);
    });
});

// Lấy danh sách học viên chưa nhập điểm
topicRouter.get("/teacher-score/:teacherId", (req, res) => {
    const { teacherId } = req.params;

    const sql = `
        SELECT users.id, fullName, Topics.id AS topicId, name, Topics.date, score, timeStart, lesson_details
        FROM Topics
        INNER JOIN LessonScores ON Topics.id = LessonScores.topic_id
        INNER JOIN users ON users.id = LessonScores.user_id
        WHERE teacher_id = ? AND score IS NULL AND Topics.name LIKE '%Encounter%' AND attended = 1
    `;

    db.all(sql, [teacherId], (err, rows) => {
        if (err) {
            return res.status(500).json({ msg: "Xảy ra lỗi trong quá trình tìm." });
        }
        if (!rows || rows.length === 0) {
            return res.status(202).json({ msg: "Không tìm thấy học sinh nào trong lớp." });
        }
        res.status(201).json(rows);
    });
});

module.exports = topicRouter;
