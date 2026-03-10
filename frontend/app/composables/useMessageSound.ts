import bipSound from '~/assets/BIP.wav'

let audioBuffer: AudioBuffer | null = null
let audioContext: AudioContext | null = null

export const useMessageSound = () => {
  const unlock = async () => {
    if (!import.meta.client) return
    try {
      const ctx = audioContext || new AudioContext()
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }
      if (!audioBuffer) {
        const response = await fetch(bipSound)
        const arrayBuffer = await response.arrayBuffer()
        audioBuffer = await ctx.decodeAudioData(arrayBuffer)
      }
      audioContext = ctx
    } catch {
      // Ignore
    }
  }

  const play = async () => {
    if (!import.meta.client) return
    try {
      const ctx = audioContext || new AudioContext()
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }
      if (!audioBuffer) {
        const response = await fetch(bipSound)
        const arrayBuffer = await response.arrayBuffer()
        audioBuffer = await ctx.decodeAudioData(arrayBuffer)
      }
      audioContext = ctx

      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      const gain = ctx.createGain()
      gain.gain.value = 0.6
      source.connect(gain)
      gain.connect(ctx.destination)
      source.start(0)
    } catch {
      // Ignore
    }
  }

  return { play, unlock }
}
