'use strict'

const debug = require('debug')('lossy-state-sync-stream:receiver')
const {Duplex} = require('stream')
const {encode: encodeVarint, decode: decodeVarint} = require('varint')
const FLAGS = require('./flags')
const VERSION = require('./version')

// todo: throttle dynamically based on path RTT
const ACK_THROTTLE = 500 // ms

const ACK_FLAGS = Buffer.from([
	VERSION & FLAGS.VERSION
])

const createReceiver = () => {
	let highestSeenTimestamp = -Infinity
	let tLastAckSent = -Infinity
	let sendAckTimer = null

	const sendAck = () => {
		debug('sending ack for', highestSeenTimestamp)
		receiver.push(Buffer.concat([
			Buffer.from(encodeVarint(highestSeenTimestamp)),
			ACK_FLAGS,
		]))
		tLastAckSent = Date.now()
	}

	const write = (msg, _, cb) => {
		const t = Date.now()

		const seq = decodeVarint(msg)
		if (seq <= highestSeenTimestamp) return cb() // ignore msg
		highestSeenTimestamp = seq

		const flags = msg.readUInt8(decodeVarint.bytes)
		if ((flags & FLAGS.VERSION) !== VERSION) {
			return cb(new Error('invalid msg: unsupported version'))
		}

		// cancel previously queued ack
		if (sendAckTimer !== null) {
			clearInterval(sendAckTimer)
			sendAckTimer = null
		}
		// send or queue new ack
		const waitFor = tLastAckSent + ACK_THROTTLE - Date.now()
		if (waitFor <= 0) sendAck()
		else sendAckTimer = setInterval(sendAck, waitFor)

		// ping only, don't process payload
		if ((flags & FLAGS.PING) !== 0) return cb()

		const payload = msg.slice(decodeVarint.bytes + 1)
		debug('received', seq, flags, payload)
		// todo: ack?
		receiver.push(payload)
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
