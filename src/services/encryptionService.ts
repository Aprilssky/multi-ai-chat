import CryptoJS from 'crypto-js';

const STORAGE_SALT = 'multi-ai-chat-v1';

/**
 * AES 加密 API Key
 */
export function encryptApiKey(apiKey: string, password: string): string {
  return CryptoJS.AES.encrypt(apiKey, password + STORAGE_SALT).toString();
}

/**
 * AES 解密 API Key
 */
export function decryptApiKey(encryptedKey: string, password: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedKey, password + STORAGE_SALT);
  return bytes.toString(CryptoJS.enc.Utf8);
}
