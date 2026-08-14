import { customAlphabet } from "nanoid";

const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const GROUP_CODE_LENGTH = 9;

export const createGroupCode = customAlphabet(ALPHABET, GROUP_CODE_LENGTH);
