import { useState, useRef, useEffect } from 'react'

export function AudioPlayer({ audioFile, audioBuffer, onRemoveFile }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)
  const canvasRef = useRef(null)

  const audioUrl = useRef('')

  useEffect(() => {
    if (audioFile) {
      audioUrl.current = URL.createObjectURL(audioFile)
      if (audioRef.current) {
        audioRef.current.src = audioUrl.current
      }
    }
    return () => {
      if (audioUrl.current) {
        URL.revokeObjectURL(audioUrl.current)
      }
    }
  }, [audioFile])

  useEffect(() => {
    if (!audioBuffer || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height

    ctx.clearRect(0, 0, width, height)

    const rawData = audioBuffer.getChannelData(0)
    const samples = 200
    const blockSize = Math.floor(rawData.length / samples)
    const filteredData = []

    for (let i = 0; i < samples; i++) {
      let blockStart = blockSize * i
      let sum = 0
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[blockStart + j] || 0)
      }
      filteredData.push(sum / blockSize)
    }

    const multiplier = Math.pow(Math.max(...filteredData), -1)
    const barWidth = width / samples

    filteredData.forEach((val, i) => {
      const barHeight = Math.max(4, (val * multiplier) * (height / 2))
      const x = i * barWidth
      const y = (height - barHeight) / 2
      
      const progressRatio = currentTime / (duration || 1)
      const currentRatio = i / samples
      if (currentRatio <= progressRatio) {
        ctx.fillStyle = '#a855f7'
      } else {
        ctx.fillStyle = '#4b5563'
      }

      ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight)
    })
  }, [audioBuffer, currentTime, duration])

  function handlePlayPause() {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  function handleTimeUpdate() {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  function handleLoadedMetadata() {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  function handleEnded() {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  function handleWaveformClick(e) {
    if (!canvasRef.current || !audioRef.current || !duration) return
    const rect = canvasRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percent = Math.max(0, Math.min(1, clickX / rect.width))
    const targetTime = percent * duration
    audioRef.current.currentTime = targetTime
    setCurrentTime(targetTime)
  }

  function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  function formatFileSize(bytes) {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  return (
    <div className="audio-player-card">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
      <div className="audio-player-header">
        <div className="audio-info">
          <div className="audio-title">{audioFile?.name}</div>
          <div className="audio-meta">
            {formatFileSize(audioFile?.size)} • {formatTime(duration)}
          </div>
        </div>
        <button
          type="button"
          className="btn-text danger"
          onClick={onRemoveFile}
          title="Ganti berkas musik"
        >
          Ganti Musik
        </button>
      </div>

      <div className="waveform-container" onClick={handleWaveformClick}>
        <canvas ref={canvasRef} width={800} height={80} className="waveform-canvas" />
      </div>

      <div className="player-controls">
        <button
          type="button"
          className="btn-play"
          onClick={handlePlayPause}
          aria-label={isPlaying ? 'Jeda' : 'Putar'}
        >
          {isPlaying ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>

        <div className="time-display">
          <span>{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  )
}
