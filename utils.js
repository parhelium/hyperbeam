const crypto = require('crypto')
const b32 = require('hi-base32')
const b4a = require('b4a')
const sodium = require('sodium-universal')

const getPubKey = function (topic) {
  if (topic == undefined) {
    return { pubKey: '', easyTopic: false }
  }
  const pubKey = toBase32(crypto.createHash('sha256').update(topic).digest())
  console.log(topic, ' -> ', pubKey)
  return { pubKey, easyTopic: true }
}

const toBase32 = function (buf) {
  return b32.encode(buf).replace(/=/g, '').toLowerCase()
}

const fromBase32 = function (str) {
  return b4a.from(b32.decode.asBytes(str.toUpperCase()))
}

const randomBytes = function (length) {
  const buffer = b4a.alloc(length)
  sodium.randombytes_buf(buffer)
  return buffer
}

module.exports = {
  getPubKey,
  toBase32,
  fromBase32,
  randomBytes,
}
