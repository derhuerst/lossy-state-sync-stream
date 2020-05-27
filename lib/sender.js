'use strict'

const {encode: encodeVarint} = require('varint')
const debug = require('debug')('lossy-state-sync-stream:sender')
const {Duplex} = require('stream')
const FLAGS = require('./flags')
const VERSION = require('./version')

const T0 = Date.parse('2020-05-27')

// todo: throttle dynamically based on path RTT
const THROTTLE = 500 // ms

const encodeMsg = (timestamp, payload = null) => {
	const chunks = [
		Buffer.from(encodeVarint(timestamp)),
		Buffer.from([ // flags
			(VERSION & FLAGS.VERSION)
		]),
	]
	if (payload !== null) chunks.push(payload)
	return Buffer.concat(chunks)
}

const createSender = () => {
	let tLastPayloadSent = -Infinity
	let sendTimer = null

	const write = (payload, _, cb) => {
		if (!Buffer.isBuffer(payload)) {
			return cb(new TypeError('payload must be a Buffer'))
		}
		if (payload.length === 0) {
			return cb(new TypeError('payload must not be empty'))
		}

		const timestamp = Date.now() - T0
		const send = () => {
			debug('sending payload', timestamp, payload)
			sender.push(encodeMsg(timestamp, payload))
			tLastPayloadSent = Date.now()
		}

		// cancel previously queued message
		if (sendTimer !== null) {
			clearInterval(sendTimer)
			sendTimer = null
		}
		// send or queue new message
		const waitFor = tLastPayloadSent + THROTTLE - Date.now()
		if (waitFor <= 0) send()
		else sendTimer = setInterval(send, waitFor)
		cb()
	}

	const keepalive = () => {
		if (Date.now() > tLastPayloadSent + THROTTLE) {
			const timestamp = Date.now()
			debug('sending ping', timestamp)
			sender.push(encodeMsg(timestamp, null))
		}
		setTimeout(keepalive, THROTTLE)
	}
	const keepaliveTimer = setTimeout(keepalive, THROTTLE)

	const final = (cb) => { // todo: do this on destroy as well?
		clearTimeout(keepaliveTimer)
		cb()
	}

	const sender = new Duplex({
		// readable a.k.a. receiver -> sender
		readableObjectMode: true,
		readableHighWaterMark: 1,
		read: () => {},
		// writable a.k.a. receiver -> sender
		writableObjectMode: true,
		writableHighWaterMark: 1,
		write,
		final,
	})
	return sender
}

module.exports = createSender
