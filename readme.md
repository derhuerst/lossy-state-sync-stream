# lossy-state-sync-stream

**Synchronize state efficiently, over an unreliable connection.** Inspired by and modelled after the [State Synchronization Protocol (SSP) from Mosh](https://mosh.org/mosh-paper.pdf).

[![npm version](https://img.shields.io/npm/v/lossy-state-sync-stream.svg)](https://www.npmjs.com/package/lossy-state-sync-stream)
[![build status](https://api.travis-ci.org/derhuerst/lossy-state-sync-stream.svg?branch=master)](https://travis-ci.org/derhuerst/lossy-state-sync-stream)
![ISC-licensed](https://img.shields.io/github/license/derhuerst/lossy-state-sync-stream.svg)
![minimum Node.js version](https://img.shields.io/node/v/lossy-state-sync-stream.svg)
[![chat with me on Gitter](https://img.shields.io/badge/chat%20with%20me-on%20gitter-512e92.svg)](https://gitter.im/derhuerst)
[![support me via GitHub Sponsors](https://img.shields.io/badge/support%20me-donate-fa7664.svg)](https://github.com/sponsors/derhuerst)


## Use Case

From the [Mosh paper](https://mosh.org/mosh-paper.pdf):

> Mosh works to convey the most recent state of the screen from server to client at a “frame rate” chosen based on network conditions. [...]
>
> Supporting this is SSP, a lightweight secure datagram protocol to synchronize the state of abstract objects between a local node, which controls the object, and a remote host that may be only intermittently connected.

> SSP's design goals were to:
> 1. Leverage existing infrastructure for authentication and login, e.g., SSH.
> 2. Not require any privileged code.
> 3. At any time, take the action best calculated to fast-
forward the remote host to the sender’s current state.
> 4. Accommodate a roaming client whose IP address changes, without the client’s having to know that a
change has happened.
> 5. Recover from dropped or reordered packets.
> 6. Ensure confidentiality and authenticity.

### Is this the really right tool for your problem?

> A state-synchronization approach is appropriate for tasks like editing a document or using an e-mail or chat application, which [...] provide their own means of navigation through a document or chat session. But it causes trouble for a task like `cat`- ing a large file to the screen, where the user might rely on having accurate history on the scrollback buffer.

– [Mosh paper](https://mosh.org/mosh-paper.pdf)

Particularly, **consider using a different protocol** (e.g. TCP + better congestion control) if

- your state *is not* a homogenous chunk of data, but e.g. a tree
- correctness (of the synchronised state) is more important than speed for your app

Also, keep in mind that `lossy-state-sync-stream` is just in an experimental state so far.

> Applications that may be used on the Internet [...] *must* instead use mechanisms that let them operate safely under very different path conditions. Typically, this requires conservatively probing the current conditions of the Internet path they communicate over to establish a transmission behavior that it can sustain [...].
>
> These mechanisms are difficult to implement correctly. [...] **Consequently, the *recommended* alternative to the UDP usage [...] is the use of an IETF transport protocol such as [TCP](https://tools.ietf.org/html/rfc793), [Stream Control Transmission Protocol (SCTP)](https://tools.ietf.org/html/rfc4960) [...], or [Datagram Congestion Control Protocol (DCCP)](https://tools.ietf.org/html/rfc4340) [...].**
>
> [...] The TCP algorithms have been continuously improved over decades, and have reached a level of efficiency and correctness that custom application-layer mechanisms will struggle to easily duplicate.


## Installation

```shell
npm install lossy-state-sync-stream
```


## Usage

*Note:* `lossy-state-sync-stream` *does not* encrypt your state/data for transmit. Use a dedicated encryption layer for this, e.g. [DTLS](https://en.wikipedia.org/wiki/Datagram_Transport_Layer_Security) or [NOISE](https://noiseprotocol.org/noise.html).

```js
todo
```


## Related

- the [Mosh paper](https://mosh.org/mosh-paper.pdf) that this project is inspired by
- [TCP](https://en.wikipedia.org/wiki/Transmission_Control_Protocol) with [`socket.setNoDelay(true)`](https://nodejs.org/docs/latest-v10.x/api/net.html#net_socket_setnodelay_nodelay) is probably efficient enough, if you have a small state and not too many updates. You get all the TCP benefits like [path MTU discovery](https://en.wikipedia.org/wiki/Path_MTU_Discovery) out-of-the-box.
- [DTLS](https://en.wikipedia.org/wiki/Datagram_Transport_Layer_Security) is probably a better choice for encrypted (but unreliable and unordered) traffic.
- [DCCP](https://en.wikipedia.org/wiki/Datagram_Congestion_Control_Protocol) is probably a better choice for TCP-like use cases (with required order & reliability).


## Contributing

If you have a question or need support using `lossy-state-sync-stream`, please double-check your code and setup first. If you think you have found a bug or want to propose a feature, use [the issues page](https://github.com/derhuerst/lossy-state-sync-stream/issues).
