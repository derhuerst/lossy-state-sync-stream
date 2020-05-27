'use strict'

const debug = require('debug')('lossy-state-sync-stream:receiver')
const {Duplex} = require('stream')
const {encode: encodeVarint, decode: decodeVarint} = require('varint')
const FLAGS = require('./flags')
const VERSION = require('./version')

// todo: throttle dynamically based on path RTT
const ACK_THROTTLE = 500 // ms

const ACK_FLAGS = Buffer.from([
	(VERSION & FLAGS.VERSION)
])

const createReceiver = () => {
	let highestSeenTimestamp = -Infinity
	let highestAckedTimestamp = -Infinity
	let tLastAckSent = -Infinity
	let sendAckTimer = null

	const sendAck = () => {
		if (highestAckedTimestamp >= highestSeenTimestamp) return;

		const timestamp = highestSeenTimestamp
		debug('sending ack for', timestamp)
		receiver.push(Buffer.concat([
			Buffer.from(encodeVarint(timestamp)),
			ACK_FLAGS,
		]))
		tLastAckSent = Date.now()
		highestAckedTimestamp = timestamp
		sendAckTimer = null
	}

	const decodeMsg = (msg) => {
		const timestamp = decodeVarint(msg)
		const flags = msg.readUInt8(decodeVarint.bytes)

		if ((flags & FLAGS.VERSION) !== VERSION) {
			const err = new Error('invalid msg: unsupported version')
			err.message = msg
			throw err
		}

		const payload = msg.slice(decodeVarint.bytes + 1)
		return {timestamp, flags, payload}
	}

	const write = (msg, _, cb) => {
		const t = Date.now()
		const {
			timestamp,
			flags,
			payload,
		} = decodeMsg(msg)

		if (timestamp <= highestSeenTimestamp) return cb() // ignore msg
		highestSeenTimestamp = timestamp

		// queue new ack
		const waitFor = tLastAckSent + ACK_THROTTLE - Date.now()
		if (waitFor <= 0) sendAck()
		else if (sendAckTimer === null) {
			sendAckTimer = setInterval(sendAck, waitFor)
		}

		// no payload a.k.a. ping-only msg
		if (payload.length === 0) return cb()

		debug('received', timestamp, flags, payload)
		receiver.emit('message', payload, timestamp)
		cb()
	}

	const receiver = new Duplex({
		// readable a.k.a. receiver -> sender
		readableObjectMode: true,
		readableHighWaterMark: 1,
		read: () => {},
		// writable a.k.a. receiver -> sender
		writableObjectMode: true,
		writableHighWaterMark: 1,
		write,
	})
	receiver.senderAddress = null

	return receiver
}

module.exports = createReceiver
