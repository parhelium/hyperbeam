#!/usr/bin/env node

const Hyperbeam = require('./')
const utils = require('./utils.js')
const readline = require('readline')
const { create } = require('domain')

if (process.argv.includes('-h') || process.argv.includes('--help')) {
  console.error('Usage: hyperbeam [passphrase]')
  console.error('')
  console.error('  Creates a 1-1 end-to-end encrypted network pipe.')
  console.error('  If a passphrase is not supplied, will create a new phrase and begin listening.')
  process.exit(1)
}

let { pubKey, easyTopic } = utils.getPubKey(process.argv[2])

let beam = createBeam(pubKey, process.argv.includes('-r'))
let safeBeam

function createBeam(key, options) {
  let _beam
  try {
    _beam = new Hyperbeam(key, options)
    pubKey = _beam.key
  } catch (e) {
    if (e.constructor.name === 'PassphraseError') {
      console.error(e.message)
      console.error(
        '(If you are attempting to create a new pipe, do not provide a phrase and hyperbeam will generate one for you.)'
      )
      process.exit(1)
    } else {
      throw e
    }
  }

  if (_beam.announce) {
    console.error('[hyperbeam] Run hyperbeam ' + pubKey + ' to connect')
    console.error('[hyperbeam] To restart this side of the pipe with the same key add -r to the above')
  } else {
    console.error('[hyperbeam] Connecting pipe...')
  }

  _beam.on('remote-address', function ({ host, port }) {
    if (!host) console.error('[hyperbeam] Could not detect remote address')
    else console.error('[hyperbeam] Joined the DHT - remote address is ' + host + ':' + port)
  })

  _beam.on('connected', function () {
    console.error('[hyperbeam] Success! Encrypted tunnel established to remote peer')
    // if pubKey was generated from passphrase
    // send new random pubKey for safe communication channel and reconnect
    if (easyTopic && process.argv.includes('-r')) {
      const safePubKey = utils.toBase32(utils.randomBytes(32))

      console.error('[hyperbeam] Sending safe pubKey to remote peer!')
      utils.sendMsg('key:' + safePubKey + '\n', _beam, process)

      setTimeout(() => {
        beam.end()
        beam.destroy()
        beam.on('close', function () {})
      }, 5000)

      setTimeout(() => {
        safeBeam = createBeam(safePubKey, true)
      }, 200)
      
    } else if (easyTopic && !process.argv.includes('-r')) {
      console.error('[hyperbeam] Waiting for safe pubKey from peer')

      const rl = readline.createInterface({
        input: _beam,
      })

      rl.on('line', function (line) {
        let safePubKey = line.split(':')[1]
        console.error('[hyperbeam] Received safe pubKey: ', safePubKey)

        safeBeam = createBeam(safePubKey, false)

        setTimeout(() => {
          beam.end()
          beam.destroy()
          beam.on('close', function () {})
        }, 5000)
      })
    }
  })

  _beam.on('error', function (e) {
    console.error('[hyperbeam] Error:', e.message)
    closeASAP()
  })

  _beam.on('end', () => _beam.end())

  process.stdin.pipe(_beam).pipe(process.stdout)
  if (typeof process.stdin.unref === 'function') process.stdin.unref()

  process.once('SIGINT', () => {
    if (!_beam.connected) closeASAP()
    else _beam.end()
  })

  return _beam
}

function closeASAP() {
  console.error('[hyperbeam] Shutting down beam...')

  const timeout = setTimeout(() => process.exit(1), 2000)
  beam.destroy()
  beam.on('close', function () {
    clearTimeout(timeout)
  })
}
