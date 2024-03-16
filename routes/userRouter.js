const bcrypt = require("bcrypt");
const SibApiV3Sdk = require("@getbrevo/brevo");
const router = require("express").Router();
const { connectSQLite } = require("../database");
const multer = require("multer");
const path = require("path");
const db = connectSQLite();
const storage = multer.memoryStorage(); // Store files in memory as buffers
const upload = multer({ storage: storage });

async function sendConfirmationEmail(email, fullName, generatedPassword) {
    let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    let apiKey = apiInstance.authentications["apiKey"];
    apiKey.apiKey = "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";

    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = "[English.] - Xác nhận thông tin đăng kí";
    sendSmtpEmail.htmlContent = `<html><body>
                                    <p>Chào ${fullName}, chào mừng bạn đến với khóa học của English.,
                                    chúng ta sẽ đồng hành với nhau trong thời gian tới. <strong>English.</strong> gửi bạn
                                    tài khoản đăng nhập học viên như sau:</p>
                                    <p>Tài khoản : ${email}</p>
                                    <p>Mật khẩu : ${generatedPassword}</p>
                                    <p>Chúc bạn học thật tốt!</p>
                                    <p>-------</p>
                                    <p><strong>English.</strong></p>
                                    </body></html>`;
    sendSmtpEmail.sender = { name: "Khoa Nam", email: "nam@english.com" };
    sendSmtpEmail.to = [{ email: email, name: fullName }];
    sendSmtpEmail.headers = { "Some-Custom-Name": "unique-id-1234" };
    sendSmtpEmail.params = { parameter: "My param value", subject: "New Subject" };

    try {
        await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log("Confirmation email sent successfully.");
    } catch (error) {
        console.error("Error sending confirmation email:", error);
        throw new Error("Error sending confirmation email");
    }
}
// Tạo một người dùng mới
router.post("/register", async (req, res) => {
    try {
        const { fullName, email, phone, address, birthday, initialLevel, course, role, saleId } = req.body;

        // Validation
        if (!fullName || !email || !phone || !address || !birthday || !initialLevel || !role) {
            return res.status(400).json({ error: "All fields are required." });
        }
        // Generate random password
        const generatedPassword = Math.random().toString(36).slice(-8);
        // Hash password
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);
        // Insert user into database
        const insertUserQuery =
            "INSERT INTO users (fullName, email, phone, address, role, birthday, level, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        const userValues = [fullName, email, phone, address, role, birthday, initialLevel, hashedPassword];

        db.run(insertUserQuery, userValues, async function (err) {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: "Error when adding." });
            }
            const userId = this.lastID;

            // Insert user enrollment into course_enrollments table
            const insertEnrollmentQuery =
                "INSERT INTO course_enrollments (course_id, user_id, sale_id) VALUES (?, ?, ?)";

            const enrollmentValues = [course, userId, saleId];

            const saveEnroll = await db.run(insertEnrollmentQuery, enrollmentValues);
            if (saveEnroll) {
                await sendConfirmationEmail(email, fullName, generatedPassword);
            } else {
                return res.status(500).json({ message: "Lỗi thêm." });
            }
            res.status(201).json({ message: "User registered successfully" });
        });
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ error: "An error occurred during registration." });
    }
});
// Lấy một người dùng theo ID
router.get("/one/:id", (req, res) => {
    const userId = req.params.id;
    db.get("SELECT * FROM users WHERE id = ?", [userId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(row);
    });
});
// Lấy tất cả người dùng có vai trò là "students"
router.get("/students", (req, res) => {
    const sql = `SELECT users.id AS user_id, 
                        users.fullName, 
                        users.phone, 
                        users.email, 
                        users.address, 
                        courses.startDate, 
                        courses.endDate, 
                        courses.nameCourse, 
                        courses.priceCourse
                FROM course_enrollments
                JOIN users ON course_enrollments.user_id = users.id
                JOIN courses ON course_enrollments.course_id = courses.id
                WHERE role = 'students'`;
    db.all(sql, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});
// Đăng nhập
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    // Kiểm tra dữ liệu đầu vào
    if (!email || !password) {
        return res.status(400).json({ message: "Vui lòng cung cấp email và password." });
    }

    // Truy vấn người dùng từ cơ sở dữ liệu
    db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(401).json({ error: "Email không tồn tại" });
        }

        // So sánh mật khẩu
        bcrypt.compare(password, row.password, (err, result) => {
            if (err) {
                return res.status(500).json({ message: err.message });
            }

            if (!result) {
                return res.status(401).json({ message: "Mật khẩu không đúng" });
            }

            // Trả về thông tin người dùng
            res.status(200).json({
                id: row.id,
                fullName: row.fullName,
                email: row.email,
                phone: row.phone,
                address: row.address,
                role: row.role,
                birthday: row.birthday,
                level: row.level,
            });
        });
    });
});
// Cập nhật thông tin của một người dùng
router.patch("/update/:id", (req, res) => {
    const userId = req.params.id;
    const { fullName, email, phone, address, role, birthday, level, password } = req.body;
    let updateQuery = "UPDATE users SET ";
    let values = [];
    if (fullName !== undefined) {
        updateQuery += " fullName = ?,";
        values.push(fullName);
    }
    if (email !== undefined) {
        updateQuery += " email = ?,";
        values.push(email);
    }
    if (phone !== undefined) {
        updateQuery += " phone = ?,";
        values.push(phone);
    }
    if (address !== undefined) {
        updateQuery += " address = ?,";
        values.push(address);
    }
    if (role !== undefined) {
        updateQuery += " role = ?,";
        values.push(role);
    }
    if (birthday !== undefined) {
        updateQuery += " birthday = ?,";
        values.push(birthday);
    }
    if (level !== undefined) {
        updateQuery += " level = ?,";
        values.push(level);
    }
    if (password !== undefined) {
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            updateQuery += " password = ?,";
            values.push(hash);
            updateQuery = updateQuery.slice(0, -1); // Remove the last comma
            updateQuery += " WHERE id = ?";
            values.push(userId);
            db.run(updateQuery, values, function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: "User updated successfully" });
            });
        });
    } else {
        updateQuery = updateQuery.slice(0, -1); // Remove the last comma
        updateQuery += " WHERE id = ?";
        values.push(userId);
        db.run(updateQuery, values, function (err) {
            if (err) {
                console.log(err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: "User updated successfully" });
        });
    }
});
// Cập nhật mật khẩu
router.patch("/update/password/:id", (req, res) => {
    const userId = req.params.id;
    const { old_password, password } = req.body;

    if (!old_password || !password) {
        return res.status(400).json({ error: "Missing password fields" });
    }
    if (old_password === password) {
        return res.status(400).json({ error: "New password equal old p  assword" });
    }

    const getUserQuery = "SELECT password FROM users WHERE id = ?";
    const userValues = [userId];

    db.get(getUserQuery, userValues, (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!row) {
            return res.status(404).json({ error: "User not found" });
        }

        bcrypt.compare(old_password, row.password, (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (!result) {
                return res.status(400).json({ error: "Old password is incorrect" });
            }

            // Hash the new password
            bcrypt.hash(password, 10, (err, hashedPassword) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                // Update the password in the database
                const updateQuery = "UPDATE users SET password = ? WHERE id = ?";
                const values = [hashedPassword, userId];

                db.run(updateQuery, values, (err) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    res.json({ message: "Password updated successfully" });
                });
            });
        });
    });
});
// Xóa một người dùng theo ID
router.delete("/delete/:id", (req, res) => {
    const userId = req.params.id;
    db.run("DELETE FROM users WHERE id = ?", [userId], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "User deleted successfully" });
    });
});
//  Cập nhật avatar
router.post("/upload-avatar", upload.single("avatar"), (req, res) => {
    const { userId } = req.body;
    const avatarData = req.file.buffer;

    if (!userId || !avatarData) {
        return res.status(400).json({ error: "User id and avatar data are required" });
    }

    // Kiểm tra xem userId đã tồn tại trong cơ sở dữ liệu chưa
    const checkUserIdQuery = "SELECT COUNT(*) AS count FROM user_images WHERE user_id = ?";
    db.get(checkUserIdQuery, [userId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const userExists = row.count > 0;

        // Nếu userId đã tồn tại, ghi đè dữ liệu avatar
        if (userExists) {
            const updateQuery = "UPDATE user_images SET avatar = ? WHERE user_id = ?";
            db.run(updateQuery, [avatarData, userId], (err) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                return res.status(200).json({ message: "Avatar updated successfully" });
            });
        } else {
            // Nếu userId chưa tồn tại, thêm mới
            const insertQuery = "INSERT INTO user_images (user_id, avatar) VALUES (?, ?)";
            db.run(insertQuery, [userId, avatarData], (err) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                return res.status(200).json({ message: "Avatar uploaded successfully" });
            });
        }
    });
});
// Lấy Avatar
router.get("/avatar/:user_id", (req, res) => {
    const userId = req.params.user_id;

    const selectQuery = "SELECT avatar FROM user_images WHERE user_id = ?";
    const values = [userId];

    db.get(selectQuery, values, (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!row || !row.avatar) {
            return res.status(404).json({ error: "Avatar not found" });
        }

        // Set appropriate headers for image response
        res.set("Content-Type", "image/jpeg"); // Assuming JPEG format, adjust if necessary

        // Send the avatar data as response
        res.send(row.avatar);
    });
});

router.get("/", (req, res) => {
    const queySelect = `SELECT * FROM users`;
    db.all(queySelect, [], (err, rows) => {
        if (err) return res.status(200).json({ message: "Lỗi khi tìm" });
        if (!rows || rows.length === 0) return res.status(200).json({ message: "Lỗi khi tìm" });
        res.status(200).json(rows);
    });
});
module.exports = router;
