'use strict'

const {encode: encodeVarint} = require('varint')
const debug = require('debug')('lossy-state-sync-stream:sender')
const {Duplex} = require('stream')
const LRU = require('lru')
const movingAverage = require('live-moving-average')
const {getTimestamp, encodeMsg, decodeMsg} = require('./encoding')

const createSender = () => {
	let currentSeq = 0
	let queuedMsg = null // [seq, payload]
	let tLastPayloadSent = -Infinity
	const lastSentMsgs = new LRU(300) // seq => timestamp
	const rtt = movingAverage(10, 500) // 10 items, pre-filled with 500ms
	let sendOrPingTimer = null

	// todo: re-transmit queued msg if no ack received
	const sendOrPing = () => {
		const seq = queuedMsg === null ? currentSeq++ : queuedMsg[0]
		const payload = queuedMsg === null ? null : queuedMsg[1]

		if (payload) debug('sending payload', seq, payload)
		else debug('sending ping', seq)
		sender.push(encodeMsg(seq, payload))

		if (payload) tLastPayloadSent = Date.now()
		lastSentMsgs.set(seq, getTimestamp())
		queuedMsg = null
		sendOrPingTimer = setTimeout(sendOrPing, rtt.get())
	}

	const handleReceiverMessage = (ackMsg, _, cb) => {
		const {seq} = decodeMsg(ackMsg)
		const tSent = lastSentMsgs.get(seq)
		if (Number.isInteger(tSent)) {
			rtt.push(getTimestamp() - tSent)
			sender.emit('round-trip-time', rtt.get())
		}
		cb()
	}

	const send = (payload) => {
		if (!Buffer.isBuffer(payload)) {
			throw new TypeError('payload must be a Buffer')
		}
		if (payload.length === 0) {
			throw new TypeError('payload must not be empty')
		}

		queuedMsg = [currentSeq++, payload]

		if (Date.now() > tLastPayloadSent + rtt) {
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
