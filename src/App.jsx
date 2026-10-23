import { useState } from 'react'
import { AudioUploader } from './components/AudioUploader'
import { AudioPlayer } from './components/AudioPlayer'
import { SettingsPanel } from './components/SettingsPanel'
import { PianoRoll } from './components/PianoRoll'
import { decodeAudioFile, resampleBuffer, transcribeAudio, exportToMidi } from './services/transcriber'
import './App.css'

function App() {
  const [audioFile, setAudioFile] = useState(null)
  const [audioBuffer, setAudioBuffer] = useState(null)
  const [isPreparingAudio, setIsPreparingAudio] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')
  const [notes, setNotes] = useState([])
  const [midiBlob, setMidiBlob] = useState(null)
  const [error, setError] = useState('')

  const [options, setOptions] = useState({
    onsetThreshold: 0.5,
    frameThreshold: 0.3,
    minNoteLength: 11,
    isolationMode: 'instrumental'
  })

  async function handleFileSelected(file) {
    setError('')
    setNotes([])
    setMidiBlob(null)
    setAudioFile(file)
    setIsPreparingAudio(true)
    setStatusMessage('Mendekode dan menyiapkan audio...')

    try {
      const original = await decodeAudioFile(file)
      setAudioBuffer(original)
      setStatusMessage('')
    } catch (err) {
      setError('Gagal membaca berkas audio: ' + (err.message || 'Format tidak valid.'))
      setAudioFile(null)
      setAudioBuffer(null)
    } finally {
      setIsPreparingAudio(false)
    }
  }

  async function handleStartTranscription() {
    if (!audioBuffer) return
    setIsTranscribing(true)
    setProgress(0)
    setStatusMessage('Menyiapkan pemrosesan instrumen audio...')
    setError('')

    try {
      const bufferToProcess = await resampleBuffer(audioBuffer, options.isolationMode)
      const detectedNotes = await transcribeAudio(bufferToProcess, options, (pct) => {
        setProgress(pct)
        if (pct < 30) {
          setStatusMessage('Menganalisis frekuensi nada instrumen audio...')
        } else if (pct < 80) {
          setStatusMessage(`Mendeteksi not musik polifonik (${pct}%)...`)
        } else {
          setStatusMessage('Menyusun partitur dan pitch bend...')
        }
      })

      if (!detectedNotes || detectedNotes.length === 0) {
        setError('Tidak ada nada yang terdeteksi dengan parameter saat ini. Coba turunkan sensitivitas onset.')
      } else {
        setNotes(detectedNotes)
        const songName = audioFile?.name?.replace(/\.[^/.]+$/, '') || 'music'
        const blob = exportToMidi(detectedNotes, songName)
        setMidiBlob(blob)
        setStatusMessage('Transkripsi berhasil diselesaikan!')
      }
    } catch (err) {
      setError('Terjadi kendala saat melakukan transkripsi: ' + (err.message || 'Kesalahan inferensi'))
    } finally {
      setIsTranscribing(false)
    }
  }

  function handleDownloadMidi() {
    if (!midiBlob) return
    const songName = audioFile?.name?.replace(/\.[^/.]+$/, '') || 'transcription'
    const url = URL.createObjectURL(midiBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${songName}.mid`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleDownloadJson() {
    if (!notes || notes.length === 0) return
    const songName = audioFile?.name?.replace(/\.[^/.]+$/, '') || 'transcription'
    const jsonStr = JSON.stringify(notes, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${songName}_notes.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleReset() {
    setAudioFile(null)
    setAudioBuffer(null)
    setNotes([])
    setMidiBlob(null)
    setError('')
    setProgress(0)
    setStatusMessage('')
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-badge">
          <span className="dot pulse"></span>
          Pemroses Audio AI di Peramban
        </div>
        <h1 className="app-title">
          Sound<span className="text-gradient">Mode</span>
        </h1>
        <p className="app-description">
          Transkripsi file musik (MP3 & WAV) menjadi notasi MIDI polifonik secara instan, aman, dan langsung berjalan 100% di browser Anda.
        </p>
      </header>

      <main className="app-main">
        {error && (
          <div className="alert-box error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {!audioFile && (
          <AudioUploader
            onFileSelected={handleFileSelected}
            disabled={isPreparingAudio}
          />
        )}

        {isPreparingAudio && (
          <div className="loading-card">
            <div className="spinner"></div>
            <p className="loading-text">{statusMessage}</p>
          </div>
        )}

        {audioFile && audioBuffer && (
          <div className="workspace-flow">
            <AudioPlayer
              audioFile={audioFile}
              audioBuffer={audioBuffer}
              onRemoveFile={handleReset}
            />

            <SettingsPanel
              options={options}
              onOptionsChange={setOptions}
              disabled={isTranscribing}
            />

            <div className="action-bar">
              <button
                type="button"
                className="btn-transcribe"
                onClick={handleStartTranscription}
                disabled={isTranscribing}
              >
                {isTranscribing ? (
                  <>
                    <div className="spinner-small"></div>
                    Mentranskripsi ({progress}%)...
                  </>
                ) : (
                  <>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                    Mulai Transkripsi ke MIDI
                  </>
                )}
              </button>
            </div>

            {isTranscribing && (
              <div className="progress-container">
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="progress-meta">
                  <span>{statusMessage}</span>
                  <span className="progress-pct">{progress}%</span>
                </div>
              </div>
            )}

            {notes.length > 0 && (
              <PianoRoll
                notes={notes}
                totalDuration={audioBuffer.duration}
                onDownloadMidi={handleDownloadMidi}
                onDownloadJson={handleDownloadJson}
              />
            )}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>SoundMode Audio to MIDI Transcriber • Ditenagai oleh TensorFlow.js & BasicPitch</p>
      </footer>
    </div>
  )
}

export default App
