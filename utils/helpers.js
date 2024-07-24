const bcrypt = require("bcryptjs");
const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        console.log(error.message);
    }
};

async function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

async function generateUniqueOrderID() {
    const randomPart = await getRandomNumber(100000, 999999);

    const currentDate = new Date();

    // Format the date as YYYYMMDD
    const datePart = currentDate.toISOString().slice(0, 10).replace(/-/g, "");

    // Combine the date and random number with "ID"
    const orderID = `ID_${randomPart}${datePart}`;

    return orderID;
}

module.exports = {
    securePassword,
    generateUniqueOrderID
}