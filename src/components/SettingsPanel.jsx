export function SettingsPanel({ options, onOptionsChange, disabled }) {
  function handlePreset(preset) {
    if (disabled) return
    if (preset === 'high') {
      onOptionsChange({
        ...options,
        onsetThreshold: 0.38,
        frameThreshold: 0.22,
        minNoteLength: 5
      })
    } else if (preset === 'balanced') {
      onOptionsChange({
        ...options,
        onsetThreshold: 0.45,
        frameThreshold: 0.28,
        minNoteLength: 7
      })
    } else if (preset === 'lead') {
      onOptionsChange({
        ...options,
        onsetThreshold: 0.6,
        frameThreshold: 0.35,
        minNoteLength: 12
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
        <span className="setting-label-header">Karakter Sinyal Audio:</span>
        <div className="mode-toggle-group">
          <button
            type="button"
            className={`mode-btn ${options.isolationMode === 'all' ? 'active' : ''}`}
            onClick={() => handleModeChange('all')}
            disabled={disabled}
          >
            Semua Musik (Harmoni & Bass Lengkap)
          </button>
          <button
            type="button"
            className={`mode-btn ${options.isolationMode === 'instrumental' ? 'active' : ''}`}
            onClick={() => handleModeChange('instrumental')}
            disabled={disabled}
          >
            Instrumen Saja (Redam Vokal Tengah)
          </button>
        </div>
      </div>

      <div className="settings-header">
        <h4 className="settings-title">Preset Kualitas & Sensitivitas</h4>
        <div className="presets-group">
          <button
            type="button"
            className={`preset-btn ${options.onsetThreshold === 0.38 && options.minNoteLength === 5 ? 'active' : ''}`}
            onClick={() => handlePreset('high')}
            disabled={disabled}
          >
            Presisi Tinggi (Akord & Harmoni)
          </button>
          <button
            type="button"
            className={`preset-btn ${options.onsetThreshold === 0.45 && options.minNoteLength === 7 ? 'active' : ''}`}
            onClick={() => handlePreset('balanced')}
            disabled={disabled}
          >
            Seimbang
          </button>
          <button
            type="button"
            className={`preset-btn ${options.onsetThreshold === 0.6 && options.minNoteLength === 12 ? 'active' : ''}`}
            onClick={() => handlePreset('lead')}
            disabled={disabled}
          >
            Hanya Melodi Utama
          </button>
        </div>
      </div>

      <div className="sliders-grid">
        <div className="setting-item">
          <div className="setting-label-row">
            <span className="setting-label">Sensitivitas Onset (Deteksi Awal Not)</span>
            <span className="setting-value">{options.onsetThreshold}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="0.9"
            step="0.02"
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
            <span className="setting-label">Sensitivitas Frame (Ketahanan Sustain)</span>
            <span className="setting-value">{options.frameThreshold}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="0.9"
            step="0.02"
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
