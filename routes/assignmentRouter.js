const assignmentRouter = require("express").Router();
const { connectSQLite } = require("../database");
const db = connectSQLite();

// Lấy danh sách bài tập của học viên
assignmentRouter.get("/:userId", (req, res) => {
    const userId = req.params.userId;

    const sql = `
        SELECT *
        FROM student_assignments st
        JOIN assignments a on a.assignment_id = st.assignment_id 
        WHERE student_id = ?
    `;

    db.all(sql, [userId], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: "Internal server error" });
        }

        if (rows.length === 0) {
            return res.status(202).json({ message: "Không tìm thấy bài tập cho học sinh này" });
        }

        res.status(200).json(rows);
    });
});
// Lấy danh sách bài tập của giảng viên
assignmentRouter.get("/teacher/:teacherId", (req, res) => {
    const { teacherId } = req.params;

    const sql = `
    SELECT a.*, c.deadline
    FROM assignments a
    LEFT JOIN student_assignments c ON a.assignment_id = c.assignment_id
    WHERE a.teacher = ?
    `;

    db.all(sql, [teacherId], (err, rows) => {
        if (err) {
            return res.status(500).json({ msg: "Lỗi trong quá trình tìm" });
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ msg: "Không tìm thấy." });
        }
        res.status(200).json(rows);
    });
});

// Lấy danh sách học viên trong bài tập
assignmentRouter.get("/list-students/:assignmentId", (req, res) => {
    const { assignmentId } = req.params;
    const sql = `SELECT student_id, fullName, phone, submission
    FROM student_assignments st
    JOIN users ON users.id = st.student_id
    JOIN assignments a on a.assignment_id = st.assignment_id
    WHERE a.assignment_id = ?`;

    db.all(sql, [assignmentId], (err, rows) => {
        if (err) return res.status(203).json({ message: "Lỗi khi lấy dữ liệu" });
        if (!rows) return res.status(202).json({ message: "Không tìm thấy" });
        res.status(201).json(rows);
    });
});
// Thêm bài tập
assignmentRouter.post("/", (req, res) => {
    const { title, content, type, teacherId, submit } = req.body;

    console.log(req.body);
    const sql = `
        INSERT INTO assignments (title, content, type,  teacher, submit_link)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.run(sql, [title, content, type, teacherId, submit], function (err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: "Internal server error" });
        }

        res.status(201).json({ message: "Thêm bài tập thành công. " });
    });
});

assignmentRouter.post("/give", (req, res) => {
    const { classId, assignmentId, deadline } = req.body;
    console.log(req.body);
    if (!classId || !assignmentId || !deadline) {
        return res.status(203).json({ message: "Thiếu dữ liệu" });
    }

    const queryGetStudentInClass = `SELECT user_id
                FROM LessonScores
                WHERE topic_id = ?`;

    db.all(queryGetStudentInClass, [classId], (err, rows) => {
        if (err) return res.status(202).json({ message: "Lỗi khi tìm danh sách học viên" });
        if (!rows || rows.length === 0) return res.status(203).json({ message: "Lớp chưa có học sinh" });

        rows.forEach((row, index) => {
            const query = `INSERT INTO student_assignments (student_id, assignment_id, deadline) VALUES (?, ?, ?)`;

            db.run(query, [row.user_id, assignmentId, deadline], (err) => {
                if (err) {
                    console.error("Lỗi khi lưu:", err);
                    if (index === rows.length - 1) {
                        return res.status(204).json({ message: "Lỗi khi lưu" });
                    }
                }
                if (index === rows.length - 1) {
                    return res.status(201).json({ message: "Giao bài tập thành công." });
                }
            });
        });
    });
});

// Cập nhật nộp bài tập
assignmentRouter.patch("/:assignmentId", (req, res) => {
    const listStudent = req.body;
    const { assignmentId } = req.params;

    listStudent.forEach((item) => {
        const { studentId, value } = item;
        const sql = `UPDATE student_assignments SET submission = ? WHERE assignment_id = ? AND student_id = ?`;

        db.run(sql, [value, assignmentId, studentId], (err) => {
            if (err) {
                console.error(err.message);
                return res.status(500).json({ error: "Lỗi khi cập nhật" });
            }
            res.status(200).json({ message: "Cập nhật trạng thái thành công." });
        });
    });
});

module.exports = assignmentRouter;
