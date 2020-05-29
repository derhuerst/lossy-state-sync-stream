'use strict'

const debug = require('debug')('lossy-state-sync-stream:receiver')
const {Duplex} = require('stream')
const {encode: encodeVarint, decode: decodeVarint} = require('varint')
const {encodeMsg, decodeMsg} = require('./encoding')

const createReceiver = () => {
	let highestSeenSeq = -Infinity
	let highestAckedSeq = -Infinity

	const handleSenderMessage = (msg, _, cb) => {
		const t = Date.now()
		const {
			seq,
			payload,
		} = decodeMsg(msg)

		if (seq <= highestSeenSeq) return cb() // ignore msg
		highestSeenSeq = seq

		if (seq >= highestAckedSeq) {
			debug('sending ack for', seq)
			receiver.push(encodeMsg(seq))
			highestAckedSeq = seq
		}

		// no payload a.k.a. ping-only msg
		if (payload.length === 0) return cb()

		debug('received', seq, payload)
		receiver.emit('message', payload)
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
		write: handleSenderMessage,
	})
	receiver.senderAddress = null

	return receiver
}

module.exports = createReceiver
