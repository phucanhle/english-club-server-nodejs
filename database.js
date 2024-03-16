const mongoose = require("mongoose");
const sqlite3 = require("sqlite3");
const config = require("./config");

const connectMongoDB = async () => {
    try {
        await mongoose.connect(config.mongoURI);
        console.log("MongoDB connected");
    } catch (error) {
        console.error("MongoDB connection error:", error);
    }
};

const connectSQLite = () => {
    const db = new sqlite3.Database(config.sqliteURI, (err) => {
        if (err) {
            console.error("SQLite connection error:", err.message);
        }
    });
    return db;
};

module.exports = {
    connectMongoDB,
    connectSQLite,
};
