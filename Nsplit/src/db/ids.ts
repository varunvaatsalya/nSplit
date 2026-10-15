const CODE_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** 24-char hex, same shape as a MongoDB ObjectId. */
export const OBJECT_ID = /^[a-f0-9]{24}$/;

/**
 * Ids are generated on the device in ObjectId format so the server stores records
 * under the very same id and sync never has to map ids.
 * Pure JS: Hermes release builds lack Web Crypto.
 */
export function createId() {
  const seconds = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, '0');
  let random = '';
  for (let i = 0; i < 16; i += 1) {
    random += ((Math.random() * 16) | 0).toString(16);
  }
  return seconds + random;
}

export function createGroupCode(length = 9) {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}
