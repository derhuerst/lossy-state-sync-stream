'use strict'

const {encode: encodeVarint, decode: decodeVarint} = require('varint')
const VERSION = require('./version')

const T0 = Date.parse('2020-05-27')
const getTimestamp = () => Date.now() - T0

const encodeMsg = (seq = null, payload = null) => {
	const chunks = [
		Buffer.from(encodeVarint(VERSION)),
		// Buffer.from(encodeVarint(getTimestamp())),
	]
	if (seq !== null) chunks.push(Buffer.from(encodeVarint(seq)))
	if (payload !== null) chunks.push(payload)
	return Buffer.concat(chunks)
}

const decodeMsg = (msg) => {
	let offset = 0

	const version = decodeVarint(msg, offset)
	offset += decodeVarint.bytes
	if (version !== VERSION) {
		const err = new Error('invalid msg: unsupported version')
		err.message = msg
		throw err
	}

	// const timestamp = decodeVarint(msg, offset)
	// offset += decodeVarint.bytes
	const seq = decodeVarint(msg, offset)
	offset += decodeVarint.bytes
	const payload = msg.slice(offset)

	return {seq, payload}
}

module.exports = {
	getTimestamp,
	encodeMsg,
	decodeMsg,
}
