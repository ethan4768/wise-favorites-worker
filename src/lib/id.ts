import {customAlphabet} from 'nanoid'

// noinspection SpellCheckingInspection
const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 10)

export function randomId(): string {
  return nanoid(8)
}
