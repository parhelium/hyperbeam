const crypto = require('crypto')
const b32 = require('hi-base32')
module.exports = function( topic ) {
    if (topic == undefined){
        return "";
    }
    const pubkey =  toBase32(crypto.createHash('sha256').update(topic).digest())
    console.log(topic , " -> ", pubkey)
    return pubkey
}

function toBase32 (buf) {
    return b32.encode(buf).replace(/=/g, '').toLowerCase()
}