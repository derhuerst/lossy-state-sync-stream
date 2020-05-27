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
	let queuedMsg = null
	let tLastPayloadSent = -Infinity
	let sendOrPingTimer = null

	const sendOrPing = () => {
		const timestamp = queuedMsg === null
			? Date.now() - T0
			: queuedMsg[0]
		const payload = queuedMsg === null
			? null
			: queuedMsg[1]
		const msg = encodeMsg(timestamp, payload)

		if (payload) debug('sending payload', timestamp, payload)
		else debug('sending ping', timestamp)
		sender.push(msg)

		if (payload) tLastPayloadSent = Date.now()
		queuedMsg = null
		sendOrPingTimer = setTimeout(sendOrPing, THROTTLE)
	}

	const handleReceiverMessage = (msg, _, cb) => {
		// todo
		cb()
	}

	const send = (payload) => {
		if (!Buffer.isBuffer(payload)) {
			throw new TypeError('payload must be a Buffer')
		}
		if (payload.length === 0) {
			throw new TypeError('payload must not be empty')
		}

		const timestamp = Date.now() - T0
		queuedMsg = [timestamp, payload]

		if (Date.now() > tLastPayloadSent + THROTTLE) {
			// A ping has been sent recently, but not a payload.
			clearTimeout(sendOrPingTimer)
			sendOrPingTimer = null
			sendOrPing()
		}
	}

	sendOrPingTimer = setTimeout(sendOrPing, 0)
	const final = (cb) => { // todo: do this on destroy as well?
		clearTimeout(sendOrPingTimer)
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
		write: handleReceiverMessage,
		final,
	})
	sender.send = send
	return sender
}

module.exports = createSender
