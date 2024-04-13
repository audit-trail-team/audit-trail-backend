const crypto = require('crypto');
require('dotenv').config();

const privateKey = Buffer.from(process.env.ENCRYPTION_PRIVATE_KEY, "base64");
// Key should be appropriate for the AES variant you choose: AES-256 uses a 32-byte key.
const algorithm = 'aes-256-ctr';

// Function to encrypt text
function encrypt(text, index) {
    // create buffer of length 16 with the index as the value
    const iv = Buffer.alloc(16);
    iv.writeUInt16BE(index, 0);
    const cipher = crypto.createCipheriv(algorithm, privateKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

// Function to decrypt text
function decrypt(encrypted, index) {
    // create buffer of length 16 with the index as the value
    const iv = Buffer.alloc(16);
    iv.writeUInt16BE(index, 0);
    const decipher = crypto.createDecipheriv(algorithm, privateKey, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// // Example usage
// const text = 'Hello, world!';
// const encrypted = encrypt(text, 8);
// console.log('Encrypted:', encrypted);
// const decrypted = decrypt(encrypted, 8);
// console.log('Decrypted:', decrypted);



function sha256(input) {
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 32);
}

// // Example usage
// const myString = "Hello, world!";
// const hashedString = sha256(myString);
// console.log('SHA-256 Hash:', hashedString);

module.exports = [encrypt, decrypt, sha256]

