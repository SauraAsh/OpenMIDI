import { useState, useRef } from 'react'

export function AudioUploader({ onFileSelected, disabled }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)

  function handleDragOver(e) {
    e.preventDefault()
    if (!disabled) {
      setIsDragOver(true)
    }
  }

  function handleDragLeave(e) {
    e.preventDefault()
    setIsDragOver(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDragOver(false)
    if (disabled) return
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      validateAndPassFile(files[0])
    }
  }

  function handleFileInputChange(e) {
    const files = e.target.files
    if (files && files.length > 0) {
      validateAndPassFile(files[0])
    }
  }

  function validateAndPassFile(file) {
    const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/flac', 'audio/x-m4a', 'audio/m4a']
    const hasAudioExtension = /\.(wav|mp3|ogg|flac|m4a)$/i.test(file.name)
    if (validTypes.includes(file.type) || hasAudioExtension) {
      onFileSelected(file)
    } else {
      alert('Format berkas tidak didukung. Harap pilih berkas audio seperti WAV atau MP3.')
    }
  }

  return (
    <div
      className={`uploader-zone ${isDragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/wav,audio/mpeg,audio/mp3,audio/ogg,audio/flac,audio/m4a,.wav,.mp3,.ogg,.flac,.m4a"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
        disabled={disabled}
      />
      <div className="uploader-icon-box">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      </div>
      <h3 className="uploader-title">Tarik & Lepas File Musik di Sini</h3>
      <p className="uploader-subtitle">
        Atau klik untuk memilih berkas dari komputer Anda
      </p>
      <div className="uploader-badges">
        <span className="badge">WAV</span>
        <span className="badge">MP3</span>
        <span className="badge">OGG</span>
        <span className="badge">FLAC</span>
        <span className="badge">M4A</span>
      </div>
    </div>
  )
}
