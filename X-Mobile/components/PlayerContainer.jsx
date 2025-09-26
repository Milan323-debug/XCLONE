import React, { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, PanResponder, Image, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLORS } from '../constants/colors'
import { usePlayerStore } from '../store/playerStore'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const MINI_HEIGHT = 72
const TAB_BAR_HEIGHT = 28
const THUMB_SIZE = 13

export default function PlayerContainer() {
  const { current, isPlaying, pause, resume, stop, previous, next, position, duration, seek } = usePlayerStore()
  const insets = useSafeAreaInsets()
  const anim = useRef(new Animated.Value(0)).current // 0 mini, 1 full
  const pan = useRef(new Animated.Value(0)).current
  const [expanded, setExpanded] = useState(false)
  const [seeking, setSeeking] = useState(false)
  const [seekPos, setSeekPos] = useState(0)
  const progressWidth = useRef(1)
  const miniProgressWidth = useRef(1)

  const progressPanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (e, gs) => {
      setSeeking(true)
      const { locationX } = e.nativeEvent
      const w = progressWidth.current || 1
      const percent = Math.max(0, Math.min(1, locationX / w))
      setSeekPos(percent * (duration || 1))
    },
    onPanResponderMove: (e, gs) => {
      const { locationX } = e.nativeEvent
      const w = progressWidth.current || 1
      const percent = Math.max(0, Math.min(1, locationX / w))
      setSeekPos(percent * (duration || 1))
    },
    onPanResponderRelease: async (e, gs) => {
      setSeeking(false)
      try {
        await seek(seekPos)
      } catch (err) { console.warn('seek fail', err) }
    },
  })).current

  useEffect(() => {
    // reset to mini when track finished/cleared
    if (!current) collapse()
  }, [current])

  const expand = () => {
    setExpanded(true)
    Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }).start()
  }
  const collapse = () => {
    Animated.timing(anim, { toValue: 0, duration: 240, useNativeDriver: true }).start(() => setExpanded(false))
  }

  // pan responder to allow swipe down to collapse when expanded
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 6,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) pan.setValue(gs.dy)
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 120) {
          pan.setValue(0)
          collapse()
        } else {
          Animated.timing(pan, { toValue: 0, duration: 150, useNativeDriver: true }).start()
        }
      },
    })
  ).current

  if (!current) return null

  const baseBottom = TAB_BAR_HEIGHT + (insets.bottom || 0) - 18

  // animated styles
  const fullTranslateY = anim.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_HEIGHT, 0] })
  const miniOpacity = anim.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' })
  const fullOpacity = anim.interpolate({ inputRange: [0.6, 1], outputRange: [0, 1], extrapolate: 'clamp' })

  const panStyle = {
    transform: [
      { translateY: Animated.add(pan, Animated.multiply(anim, 0)) },
    ],
  }

  const formatTime = (ms) => {
    if (!ms || ms <= 0) return '0:00'
    const total = Math.floor(ms / 1000)
    const minutes = Math.floor(total / 60)
    const seconds = total % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // progress used for UI (from store unless currently scrubbing)
  const progress = seeking ? (seekPos / (duration || 1)) : ((duration > 0) ? (position / duration) : 0)

  return (
    <View style={styles.root} pointerEvents="box-none">
      {/* Mini Bar */}
      <Animated.View style={[styles.miniContainer, { bottom: baseBottom, opacity: miniOpacity, transform: [{ translateY: anim.interpolate({ inputRange: [0,1], outputRange: [0, -8] }) }] }]}> 
        <TouchableOpacity activeOpacity={0.9} style={styles.miniInner} onPress={expand}>
          {/* optional artwork */}
          {current.artworkUrl ? (
            <Image source={{ uri: current.artworkUrl }} style={styles.miniArtPlaceholder} />
          ) : (
            <View style={styles.miniArtPlaceholder} />
          )}
          <View style={styles.miniInfo}>
            <Text style={styles.title} numberOfLines={1}>{current.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{current.artist}</Text>
            {/* mini progress bar */}
            <View
              style={styles.miniProgressWrap}
              onLayout={(e) => { miniProgressWidth.current = e.nativeEvent.layout.width }}
              onStartShouldSetResponder={() => true}
              onResponderGrant={(e) => {
                // immediate tap-to-seek on mini bar
                try {
                  const { locationX } = e.nativeEvent
                  const w = miniProgressWidth.current || 1
                  const percent = Math.max(0, Math.min(1, locationX / w))
                  const target = percent * (duration || 1)
                  // update UI briefly
                  setSeekPos(target)
                  setSeeking(true)
                  // perform seek
                  seek(target).catch((err) => console.warn('mini seek fail', err)).finally(() => setSeeking(false))
                } catch (err) { console.warn('mini seek', err) }
              }}
            >
              <View style={[styles.miniProgress, { width: `${Math.max(0, Math.min(100, progress * 100))}%` }]} />
            </View>
          </View>
          <TouchableOpacity onPress={() => (isPlaying ? pause() : resume())} style={styles.miniPlayBtnSmall}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color={COLORS.white} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>

      {/* Full Screen Overlay */}
      <Animated.View
        style={[
          styles.fullContainer,
          { transform: [{ translateY: Animated.add(fullTranslateY, pan) }], opacity: fullOpacity },
        ]}
        {...(expanded ? panResponder.panHandlers : {})}
      >
        <View style={styles.fullHeader}>
          <TouchableOpacity onPress={collapse} style={{ padding: 8 }}>
            <Ionicons name="chevron-down" size={28} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.fullContent}>
          {current.artworkUrl ? (
            <Image source={{ uri: current.artworkUrl }} style={styles.fullArtPlaceholder} />
          ) : (
            <View style={styles.fullArtPlaceholder} />
          )}
          <Text style={styles.fullTitle}>{current.title}</Text>
          <Text style={styles.fullArtist}>{current.artist}</Text>

          {/* progress + times */}
          <View style={styles.progressContainer}>
            <Text style={styles.timeText}>{formatTime(seeking ? seekPos : position)}</Text>
            <View
              style={styles.progressBarWrap}
              onLayout={(e) => { progressWidth.current = e.nativeEvent.layout.width }}
              onStartShouldSetResponder={() => true}
              onResponderGrant={(e) => {
                // immediate tap-to-seek on full progress bar
                try {
                  const { locationX } = e.nativeEvent
                  const w = progressWidth.current || 1
                  const percent = Math.max(0, Math.min(1, locationX / w))
                  const target = percent * (duration || 1)
                  setSeekPos(target)
                  setSeeking(true)
                  seek(target).catch((err) => console.warn('full seek fail', err)).finally(() => setSeeking(false))
                } catch (err) { console.warn('full seek', err) }
              }}
            >
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.max(0, Math.min(100, progress * 100))}%` }]} />
              </View>
              {/* visible thumb */}
              <View pointerEvents="none" style={[styles.progressThumbContainer, { left: Math.max(0, Math.min(progressWidth.current - THUMB_SIZE, (progress * (progressWidth.current )) - THUMB_SIZE / 2)) }]}>
                <View style={styles.progressThumb} />
              </View>
              {/* pan responder area for seeking when expanded */}
              {expanded && (
                <View style={StyleSheet.absoluteFill} {...progressPanResponder.panHandlers} />
              )}
            </View>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity onPress={previous} style={styles.ctrlBtn}><Ionicons name="play-skip-back" size={28} color={COLORS.text} /></TouchableOpacity>
            <TouchableOpacity onPress={() => (isPlaying ? pause() : resume())} style={[styles.ctrlBtn, styles.playBigBtn]}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={30} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity onPress={next} style={styles.ctrlBtn}><Ionicons name="play-skip-forward" size={28} color={COLORS.text} /></TouchableOpacity>
          </View>

        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  miniContainer: {
    position: 'absolute',
    left: 9,
    right: 9,
    height: MINI_HEIGHT,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: Platform.OS === 'ios' ? 0.08 : 0.12,
    shadowRadius: 6,
    elevation: 10,
  },
  miniInner: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  miniArtPlaceholder: { width: 48, height: 48, borderRadius: 6, backgroundColor: '#e6e6e6' },
  miniInfo: { flex: 1, marginLeft: 15, justifyContent: 'center' , marginRight: 12 , flexShrink: 1 , marginBottom: 0 ,},
  title: { fontWeight: '700', color: COLORS.text },
  artist: { color: COLORS.textLight, marginTop: 4 },
  miniPlayBtnSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' , borderWidth: 1 , borderColor: "#008080"},

  miniProgressWrap: { height: 4, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  miniProgress: { height: 4, backgroundColor: COLORS.primary },

  progressContainer: { width: '90%', marginTop: 18, flexDirection: 'row', alignItems: 'center' },
  timeText: { color: COLORS.textLight, width: 40, textAlign: 'center', fontSize: 12 },
  progressBarWrap: { flex: 1, paddingHorizontal: 8, justifyContent: 'center' },
  progressBarBg: { height: 6, backgroundColor: COLORS.border, borderRadius: 6, overflow: 'hidden' },
  progressBarFill: { height: 6, backgroundColor: COLORS.primary },
  progressThumbContainer: { position: 'absolute', top: -3, width: THUMB_SIZE, height: THUMB_SIZE, alignItems: 'center', justifyContent: 'center' },
  progressThumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: THUMB_SIZE / 2, backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.primary },

  fullContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    backgroundColor: COLORS.card,
    zIndex: 20,
  },
  fullHeader: { height: 64, justifyContent: 'center', paddingHorizontal: 12 },
  fullContent: { flex: 1, alignItems: 'center', paddingTop: 12 },
  fullArtPlaceholder: { width: SCREEN_HEIGHT * 0.45, height: SCREEN_HEIGHT * 0.45, borderRadius: 8, backgroundColor: '#e6e6e6' },
  fullTitle: { marginTop: 18, fontSize: 22, fontWeight: '700', color: COLORS.text },
  fullArtist: { marginTop: 6, color: COLORS.textLight },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', width: '80%', marginTop: 24 },
  ctrlBtn: { padding: 12 },
  playBigBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
})
