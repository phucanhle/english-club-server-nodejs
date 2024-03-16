const coursesRouter = require("express").Router();
const { connectSQLite } = require("../database");
const db = connectSQLite();

// Lấy một khóa học theo ID
coursesRouter.get("/one/:id", (req, res) => {
    const courseId = req.params.id;
    db.get("SELECT * FROM courses WHERE id = ?", [courseId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: "Course not found" });
        }
        res.json(row);
    });
});

// Lấy tất cả các khóa học
coursesRouter.get("/", (req, res) => {
    db.all("SELECT * FROM courses", (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Tạo một course
coursesRouter.post("/", (req, res) => {
    const { nameCourse, startDate, endDate, priceCourse } = req.body;
    if (!nameCourse || !startDate || !endDate || !priceCourse) {
        return res.status(400).json({ message: "Vui lòng cung cấp đầy đủ thông tin." });
    }

    db.run(
        "INSERT INTO courses (nameCourse, startDate, endDate, priceCourse) VALUES (?, ?, ?, ?)",
        [nameCourse, startDate, endDate, priceCourse],
        (err) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: "Khóa học mới đã được tạo thành công." });
        },
    );
});

// Cập nhật thông tin của một khóa học
coursesRouter.patch("/update/:id", (req, res) => {
    const courseId = req.params.id;
    const { nameCourse, startDate, endDate, priceCourse } = req.body;

    // Kiểm tra xem các trường thông tin cần thiết đã được cung cấp hay không
    if (!nameCourse && !startDate && !endDate && !priceCourse) {
        return res.status(400).json({ message: "Vui lòng cung cấp ít nhất một trường thông tin để cập nhật." });
    }

    // Thực hiện truy vấn để cập nhật thông tin khóa học dựa trên các trường được cung cấp
    let updateQuery = "UPDATE courses SET";
    const values = [];
    if (nameCourse) {
        updateQuery += " nameCourse = ?,";
        values.push(nameCourse);
    }
    if (startDate) {
        updateQuery += " startDate = ?,";
        values.push(startDate);
    }
    if (endDate) {
        updateQuery += " endDate = ?,";
        values.push(endDate);
    }
    if (priceCourse) {
        updateQuery += " priceCourse = ?,";
        values.push(priceCourse);
    }
    // Xóa dấu phẩy cuối cùng
    updateQuery = updateQuery.slice(0, -1);
    // Thêm điều kiện cho truy vấn
    updateQuery += " WHERE id = ?";
    values.push(courseId);

    db.run(updateQuery, values, (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Khóa học đã được cập nhật thành công." });
    });
});

// Xóa một khóa học theo ID
coursesRouter.delete("/delete/:id", (req, res) => {
    const courseId = req.params.id;

    // Thực hiện truy vấn để xóa khóa học theo ID
    db.run("DELETE FROM courses WHERE id = ?", [courseId], (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Khóa học đã được xóa thành công." });
    });
});

// Danh sách học viên đã mua từ sale
coursesRouter.get("/sale/:saleId", (req, res) => {
    const { saleId } = req.params;
    const sql = `SELECT users.id AS user_id, 
                        users.fullName, 
                        users.phone, 
                        users.email, 
                        users.address, 
                        courses.endDate, 
                        courses.nameCourse, 
                        courses.priceCourse
                FROM course_enrollments
                JOIN users ON course_enrollments.user_id = users.id
                JOIN courses ON course_enrollments.course_id = courses.id
                WHERE course_enrollments.sale_id = ?`;

    db.all(sql, saleId, (err, rows) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Internal server error" });
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: "No records found for the provided saleId" });
        }
        res.status(200).json(rows);
    });
});

coursesRouter.post("/extend-course", (req, res) => {
    const { userId, courseId } = req.body;
    const queryFindDoubleCourse = `SELECT count(*) AS count FROM course_enrollments WHERE user_id = ? AND course_id = ?`;
    db.get(queryFindDoubleCourse, [userId, courseId], (err, row) => {
        if (err) return res.status(202).json({ message: "Lỗi khi tìm" });
        if (row && row.count > 0) {
            return res.status(203).json({ message: "Người dùng đã đăng ký khóa học này" });
        }

        const queryInsertCourse = `INSERT INTO course_enrollments (user_id, course_id) VALUES (?, ?)`;
        db.run(queryInsertCourse, [userId, courseId], (err) => {
            if (err) return res.status(202).json({ message: "Lỗi khi thêm khóa học" });

            return res.status(200).json({ message: "Thêm khóa học thành công" });
        });
    });
});

module.exports = coursesRouter;
