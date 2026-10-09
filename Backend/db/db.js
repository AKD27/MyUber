const mongoose = require('mongoose');
const { dbConnect } = require('../config/env');

async function connectToDb() {
    await mongoose.connect(dbConnect, { serverSelectionTimeoutMS: 15000 });
    console.log('Connected to DB');
}

module.exports = connectToDb;
