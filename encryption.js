const crypto = require('crypto');

// Key should be appropriate for the AES variant you choose: AES-256 uses a 32-byte key.
const key = crypto.randomBytes(32); // Generate a secure random key
const algorithm = 'aes-256-ctr';

// Function to encrypt text
function encrypt(text, index) {
    // create buffer of length 16 with the index as the value
    const iv = Buffer.alloc(16);
    iv.writeUInt16BE(index, 0);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return {
        content: encrypted,
        iv: iv.toString('hex')  // We will need the IV for decryption, so it needs to be stored with the ciphertext
    };
}

// Function to decrypt text
function decrypt(encryptedObject) {
    const iv = Buffer.from(encryptedObject.iv, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedObject.content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Example usage
const text = 'Hello, world!';
const encrypted = encrypt(text, 8);
console.log('Encrypted:', encrypted.content);
const decrypted = decrypt(encrypted);
console.log('Decrypted:', decrypted);



function sha256(input) {
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 32);
}

// Example usage
const myString = "Hello, world!";
const hashedString = sha256(myString);
console.log('SHA-256 Hash:', hashedString);

