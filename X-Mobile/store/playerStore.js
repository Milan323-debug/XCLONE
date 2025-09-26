import { create } from 'zustand'
import { Audio } from 'expo-av'

export const usePlayerStore = create((set, get) => {
  const soundRef = { current: null }

  const playTrack = async (track, queue = null, index = 0) => {
    try {
      // stop previous
      if (soundRef.current) {
        try { await soundRef.current.unloadAsync(); } catch (e) {}
        soundRef.current = null
      }

      const { sound } = await Audio.Sound.createAsync({ uri: track.url }, { shouldPlay: true })
      soundRef.current = sound

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status) return

        // update shared playback state (position, duration, playing)
        try {
          const isPlaying = !!status.isPlaying
          const position = typeof status.positionMillis === 'number' ? status.positionMillis : get().position || 0
          const duration = typeof status.durationMillis === 'number' ? status.durationMillis : get().duration || 0
          set({ isPlaying, position, duration })
        } catch (e) {
          // swallow
        }

        if (status.didJustFinish) {
          // auto play next after 1 second, respecting repeat and shuffle
          setTimeout(() => {
            const q = get().queue || []
            const idx = get().index
            const repeatMode = get().repeatMode
            const shuffle = get().shuffle
            const currentTrack = get().current

            if (repeatMode === 'one' && currentTrack) {
              // replay same track
              playTrack(currentTrack, q, idx)
              return
            }

            if (shuffle && q && q.length > 0) {
              // pick a random index (avoid same when possible)
              let nextIdx = idx
              if (q.length === 1) nextIdx = 0
              else {
                while (nextIdx === idx) {
                  nextIdx = Math.floor(Math.random() * q.length)
                }
              }
              playTrack(q[nextIdx], q, nextIdx)
              return
            }

            if (q && q.length > 0 && idx != null && idx + 1 < q.length) {
              const next = q[idx + 1]
              playTrack(next, q, idx + 1)
            } else {
              // finished
              set({ isPlaying: false, current: null, position: 0 })
            }
          }, 1000)
        }
      })

      set({ current: track, isPlaying: true, queue: queue || [track], index: index })
    } catch (e) {
      console.warn('player playTrack error', e)
    }
  }

  const pause = async () => {
    try {
      if (soundRef.current) await soundRef.current.pauseAsync()
      set({ isPlaying: false })
    } catch (e) { console.warn('pause error', e) }
  }

  const resume = async () => {
    try {
      if (soundRef.current) await soundRef.current.playAsync()
      set({ isPlaying: true })
    } catch (e) { console.warn('resume error', e) }
  }

  const stop = async () => {
    try {
      if (soundRef.current) { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); soundRef.current = null }
      set({ isPlaying: false, current: null, queue: [], index: null, position: 0, duration: 0 })
    } catch (e) { console.warn('stop error', e) }
  }

  const seek = async (millis) => {
    try {
      if (soundRef.current && typeof millis === 'number') {
        await soundRef.current.setPositionAsync(Math.max(0, Math.floor(millis)))
        set({ position: Math.max(0, Math.floor(millis)) })
      }
    } catch (e) { console.warn('seek error', e) }
  }

  const setShuffle = (val) => set({ shuffle: !!val })
  const setRepeatMode = (mode) => set({ repeatMode: mode })

  const next = async () => {
    const q = get().queue || []
    const idx = get().index
    const shuffle = get().shuffle
    if (shuffle && q && q.length > 0) {
      let nextIdx = idx
      if (q.length === 1) nextIdx = 0
      else {
        while (nextIdx === idx) {
          nextIdx = Math.floor(Math.random() * q.length)
        }
      }
      playTrack(q[nextIdx], q, nextIdx)
      return
    }

    if (q && idx != null && idx + 1 < q.length) {
      playTrack(q[idx + 1], q, idx + 1)
    }
  }

  const previous = async () => {
    const q = get().queue || []
    const idx = get().index
    if (q && idx != null && idx - 1 >= 0) {
      playTrack(q[idx - 1], q, idx - 1)
    }
  }

  return {
    current: null,
    isPlaying: false,
    position: 0,
    duration: 0,
    shuffle: false,
    repeatMode: 'off', // 'off' | 'one' | 'all' (all not implemented specially here)
    queue: [],
    index: null,
    playTrack,
    pause,
    resume,
    stop,
    next,
    previous,
    seek,
    setShuffle,
    setRepeatMode,
  }
})
