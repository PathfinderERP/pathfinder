import CryptoJS from 'crypto-js';

const publicKey = "6368616e676520746869732070617373776f726420746f206120736563726574";
const ciphertext = "2affbc8d485b11299dc5369101774b26c91dbd100ac15333d051982968950c235d6a5566";

try {
    const keyBytes = CryptoJS.enc.Hex.parse(publicKey);
    const iv = CryptoJS.enc.Hex.parse(ciphertext.substring(0, 32));
    const encrypted = ciphertext.substring(32);
    const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: CryptoJS.enc.Hex.parse(encrypted) },
        keyBytes,
        { iv: iv, padding: CryptoJS.pad.NoPadding, mode: CryptoJS.mode.CFB }
    );
    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
    console.log("Decrypted SipSecret:", decryptedText);
} catch (e) {
    console.error("Error decrypting:", e);
}
