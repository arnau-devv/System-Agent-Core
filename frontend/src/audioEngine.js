const audioCtx = new AudioContext()

function createChannel(volume) {
    const gain = audioCtx.createGain()
    gain.gain.value = volume
    gain.connect(audioCtx.destination)
    return gain
}
const channels = {
    ui:   createChannel(0.8),
    apps: createChannel(1.0),
    // añadir más cuando los necesites
}


async function playSound(filePath, channel = 'ui') {
    const arrayBuffer = await fetch(filePath).then(r => r.arrayBuffer())
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)

    const source = audioCtx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(channels[channel])
    source.start()
}

function setVolume(channel, value) {
    if (channels[channel]) channels[channel].gain.value = value
}

module.exports = { playSound, setVolume }