function isAdmin(req, res, next) {
    // Xác định role được gửi qua req
    const userId = req.userId;
    db.get("SELECT * FROM users WHERE id = ?", [userId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row || row.role !== "admin") {
            return res.status(403).json({ error: "Access denied. Admin role required." });
        }
        // Nếu người dùng có vai trò admin, tiếp tục thực hiện các yêu cầu tiếp theo
        next();
    });
}

module.exports = isAdmin;
