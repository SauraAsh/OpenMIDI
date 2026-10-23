import { useState, useRef, useEffect, useCallback } from 'react'
import { midiToNoteName } from '../services/transcriber'

export function PianoRoll({ notes, totalDuration, onDownloadMidi, onDownloadJson }) {
  const [isPlayingMidi, setIsPlayingMidi] = useState(false)
  const [currentMidiTime, setCurrentMidiTime] = useState(0)
  const canvasRef = useRef(null)
  const animFrameRef = useRef(0)
  const audioCtxRef = useRef(null)
  const playbackStartTimeRef = useRef(0)
  const pausedAtTimeRef = useRef(0)

  const minPitch = notes.length > 0 ? Math.max(21, Math.min(...notes.map((n) => n.pitchMidi)) - 2) : 36
  const maxPitch = notes.length > 0 ? Math.min(108, Math.max(...notes.map((n) => n.pitchMidi)) + 2) : 84
  const pitchRange = Math.max(12, maxPitch - minPitch + 1)

  const drawPianoRoll = useCallback((playbackCursor = 0) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height

    ctx.clearRect(0, 0, width, height)

    const pianoKeyWidth = 46
    const rollWidth = width - pianoKeyWidth
    const rowHeight = height / pitchRange
    const timeScale = totalDuration > 0 ? rollWidth / totalDuration : 100

    for (let i = 0; i < pitchRange; i++) {
      const pitch = maxPitch - i
      const y = i * rowHeight
      const isBlackKey = [1, 3, 6, 8, 10].includes(pitch % 12)

      ctx.fillStyle = isBlackKey ? '#171923' : '#1f2330'
      ctx.fillRect(pianoKeyWidth, y, rollWidth, rowHeight)

      ctx.fillStyle = '#2d3345'
      ctx.fillRect(pianoKeyWidth, y + rowHeight - 1, rollWidth, 1)

      ctx.fillStyle = isBlackKey ? '#262933' : '#e2e8f0'
      ctx.fillRect(0, y, pianoKeyWidth, rowHeight)
      ctx.strokeStyle = '#374151'
      ctx.strokeRect(0, y, pianoKeyWidth, rowHeight)

      if (pitch % 12 === 0 || rowHeight > 14) {
        ctx.fillStyle = isBlackKey ? '#94a3b8' : '#1e293b'
        ctx.font = '10px monospace'
        ctx.fillText(midiToNoteName(pitch), 4, y + rowHeight - 3)
      }
    }

    notes.forEach((note) => {
      const noteY = (maxPitch - note.pitchMidi) * rowHeight
      const noteX = pianoKeyWidth + note.startTimeSeconds * timeScale
      const noteW = Math.max(3, note.durationSeconds * timeScale)

      const hue = ((note.pitchMidi - 21) * 7) % 360
      ctx.fillStyle = `hsl(${hue}, 85%, 60%)`
      ctx.shadowColor = `hsl(${hue}, 85%, 60%)`
      ctx.shadowBlur = 4

      ctx.beginPath()
      ctx.roundRect(noteX, noteY + 1, noteW, Math.max(2, rowHeight - 2), 2)
      ctx.fill()
      ctx.shadowBlur = 0
    })

    if (totalDuration > 0) {
      const cursorX = pianoKeyWidth + playbackCursor * timeScale
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(cursorX, 0)
      ctx.lineTo(cursorX, height)
      ctx.stroke()
    }
  }, [notes, totalDuration, maxPitch, pitchRange])

  useEffect(() => {
    drawPianoRoll(currentMidiTime)
  }, [drawPianoRoll, currentMidiTime])


  function playMidiSynth() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContextClass()
    }
    const ctx = audioCtxRef.current
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const startOffset = pausedAtTimeRef.current
    playbackStartTimeRef.current = ctx.currentTime - startOffset

    const remainingNotes = notes.filter(
      (n) => n.startTimeSeconds + n.durationSeconds >= startOffset
    )

    remainingNotes.forEach((note) => {
      const noteStartAudioTime =
        playbackStartTimeRef.current + note.startTimeSeconds
      const noteDuration = Math.max(0.05, note.durationSeconds)

      if (noteStartAudioTime + noteDuration < ctx.currentTime) return

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      const freq = 440 * Math.pow(2, (note.pitchMidi - 69) / 12)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, Math.max(ctx.currentTime, noteStartAudioTime))

      const targetGain = Math.max(0.05, Math.min(0.2, note.amplitude * 0.2))
      const startTime = Math.max(ctx.currentTime, noteStartAudioTime)
      gain.gain.setValueAtTime(0.001, startTime)
      gain.gain.exponentialRampToValueAtTime(targetGain, startTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + noteDuration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + noteDuration)
    })

    setIsPlayingMidi(true)

    function updateCursor() {
      const elapsed = ctx.currentTime - playbackStartTimeRef.current
      if (elapsed >= totalDuration) {
        setIsPlayingMidi(false)
        setCurrentMidiTime(0)
        pausedAtTimeRef.current = 0
        return
      }
      setCurrentMidiTime(elapsed)
      animFrameRef.current = requestAnimationFrame(updateCursor)
    }

    animFrameRef.current = requestAnimationFrame(updateCursor)
  }

  function pauseMidiSynth() {
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    cancelAnimationFrame(animFrameRef.current)
    pausedAtTimeRef.current = currentMidiTime
    setIsPlayingMidi(false)
  }

  function toggleMidiPlayPause() {
    if (isPlayingMidi) {
      pauseMidiSynth()
    } else {
      playMidiSynth()
    }
  }

  function handleRollClick(e) {
    if (!canvasRef.current || totalDuration <= 0) return
    const rect = canvasRef.current.getBoundingClientRect()
    const pianoKeyWidth = 46
    const clickX = e.clientX - rect.left - pianoKeyWidth
    const rollWidth = rect.width - pianoKeyWidth
    const ratio = Math.max(0, Math.min(1, clickX / rollWidth))
    const targetTime = ratio * totalDuration
    
    if (isPlayingMidi) {
      pauseMidiSynth()
    }
    pausedAtTimeRef.current = targetTime
    setCurrentMidiTime(targetTime)
  }

  function formatDuration(sec) {
    const mins = Math.floor(sec / 60)
    const secs = Math.floor(sec % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="piano-roll-card">
      <div className="piano-roll-header">
        <div>
          <h3 className="section-title">Hasil Transkripsi MIDI</h3>
          <div className="stats-badges">
            <span className="badge success">{notes.length} Not Terdeteksi</span>
            <span className="badge">
              Rentang: {midiToNoteName(minPitch)} - {midiToNoteName(maxPitch)}
            </span>
            <span className="badge">Durasi: {formatDuration(totalDuration)}</span>
          </div>
        </div>

        <div className="actions-group">
          <button
            type="button"
            className="btn-synth"
            onClick={toggleMidiPlayPause}
          >
            {isPlayingMidi ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
                Jeda Preview MIDI
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Dengarkan Hasil MIDI
              </>
            )}
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={onDownloadMidi}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Ekspor File MIDI (.mid)
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={onDownloadJson}
            title="Unduh data not dalam format JSON"
          >
            JSON
          </button>
        </div>
      </div>

      <div className="canvas-wrapper" onClick={handleRollClick}>
        <canvas
          ref={canvasRef}
          width={900}
          height={320}
          className="piano-roll-canvas"
        />
      </div>
      <div className="piano-roll-footer">
        <span className="footer-hint">
          Klik pada kanvas piano roll untuk memindahkan posisi pemutaran.
        </span>
        <span className="footer-time">
          {formatDuration(currentMidiTime)} / {formatDuration(totalDuration)}
        </span>
      </div>
    </div>
  )
}
