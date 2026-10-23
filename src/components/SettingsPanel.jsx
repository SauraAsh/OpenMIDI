export function SettingsPanel({ options, onOptionsChange, disabled }) {
  function handlePreset(preset) {
    if (disabled) return
    if (preset === 'default') {
      onOptionsChange({
        ...options,
        onsetThreshold: 0.5,
        frameThreshold: 0.3,
        minNoteLength: 11
      })
    } else if (preset === 'vocal') {
      onOptionsChange({
        ...options,
        onsetThreshold: 0.6,
        frameThreshold: 0.35,
        minNoteLength: 14
      })
    } else if (preset === 'chords') {
      onOptionsChange({
        ...options,
        onsetThreshold: 0.4,
        frameThreshold: 0.25,
        minNoteLength: 9
      })
    }
  }

  function handleModeChange(mode) {
    if (disabled) return
    onOptionsChange({
      ...options,
      isolationMode: mode
    })
  }

  return (
    <div className="settings-card">
      <div className="isolation-mode-selector">
        <span className="setting-label-header">Fokus Transkripsi:</span>
        <div className="mode-toggle-group">
          <button
            type="button"
            className={`mode-btn ${options.isolationMode === 'instrumental' ? 'active' : ''}`}
            onClick={() => handleModeChange('instrumental')}
            disabled={disabled}
          >
            Instrumen Musik (Hilangkan Vokal)
          </button>
          <button
            type="button"
            className={`mode-btn ${options.isolationMode === 'all' ? 'active' : ''}`}
            onClick={() => handleModeChange('all')}
            disabled={disabled}
          >
            Semua Suara (Musik + Vokal)
          </button>
        </div>
      </div>

      <div className="settings-header">
        <h4 className="settings-title">Sensitivitas Deteksi Not</h4>
        <div className="presets-group">
          <button
            type="button"
            className="preset-btn"
            onClick={() => handlePreset('default')}
            disabled={disabled}
          >
            Standar
          </button>
          <button
            type="button"
            className="preset-btn"
            onClick={() => handlePreset('vocal')}
            disabled={disabled}
          >
            Melodi Solo
          </button>
          <button
            type="button"
            className="preset-btn"
            onClick={() => handlePreset('chords')}
            disabled={disabled}
          >
            Akord / Polifonik
          </button>
        </div>
      </div>

      <div className="sliders-grid">
        <div className="setting-item">
          <div className="setting-label-row">
            <span className="setting-label">Sensitivitas Onset (Awal Not)</span>
            <span className="setting-value">{options.onsetThreshold}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="0.9"
            step="0.05"
            value={options.onsetThreshold}
            disabled={disabled}
            onChange={(e) =>
              onOptionsChange({
                ...options,
                onsetThreshold: parseFloat(e.target.value)
              })
            }
          />
        </div>

        <div className="setting-item">
          <div className="setting-label-row">
            <span className="setting-label">Sensitivitas Frame (Daya Tahan Not)</span>
            <span className="setting-value">{options.frameThreshold}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="0.9"
            step="0.05"
            value={options.frameThreshold}
            disabled={disabled}
            onChange={(e) =>
              onOptionsChange({
                ...options,
                frameThreshold: parseFloat(e.target.value)
              })
            }
          />
        </div>

        <div className="setting-item">
          <div className="setting-label-row">
            <span className="setting-label">Panjang Not Minimal (Frames)</span>
            <span className="setting-value">{options.minNoteLength}</span>
          </div>
          <input
            type="range"
            min="3"
            max="30"
            step="1"
            value={options.minNoteLength}
            disabled={disabled}
            onChange={(e) =>
              onOptionsChange({
                ...options,
                minNoteLength: parseInt(e.target.value, 10)
              })
            }
          />
        </div>
      </div>
    </div>
  )
}
