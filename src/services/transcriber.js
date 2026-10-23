import * as tf from '@tensorflow/tfjs'
import { outputToNotesPoly, addPitchBendsToNoteEvents, noteFramesToTime } from '@spotify/basic-pitch'
import { Midi } from '@tonejs/midi'

const OUTPUT_TO_TENSOR_NAME = {
  contours: 'Identity',
  onsets: 'Identity_2',
  frames: 'Identity_1'
}
const NUM_CHANNELS = 1
const AUDIO_SAMPLE_RATE = 22050
const FFT_HOP = 256
const ANNOTATIONS_FPS = Math.floor(AUDIO_SAMPLE_RATE / FFT_HOP)
const AUDIO_WINDOW_LENGTH_SECONDS = 2
const AUDIO_N_SAMPLES = AUDIO_SAMPLE_RATE * AUDIO_WINDOW_LENGTH_SECONDS - FFT_HOP
const N_OVERLAPPING_FRAMES = 30
const N_OVERLAP_OVER_2 = Math.floor(N_OVERLAPPING_FRAMES / 2)
const OVERLAP_LENGTH_FRAMES = N_OVERLAPPING_FRAMES * FFT_HOP
const HOP_SIZE = AUDIO_N_SAMPLES - OVERLAP_LENGTH_FRAMES

function prepareData(singleChannelAudioData) {
  const wavSamples = tf.concat1d([
    tf.zeros([Math.floor(OVERLAP_LENGTH_FRAMES / 2)], 'float32'),
    tf.tensor(singleChannelAudioData)
  ])
  const framed = tf.expandDims(
    tf.signal.frame(wavSamples, AUDIO_N_SAMPLES, HOP_SIZE, true, 0),
    -1
  )
  wavSamples.dispose()
  return [framed, singleChannelAudioData.length]
}

function unwrapOutput(result) {
  const rawOutput = result.slice(
    [0, N_OVERLAP_OVER_2, 0],
    [-1, result.shape[1] - 2 * N_OVERLAP_OVER_2, -1]
  )
  const outputShape = rawOutput.shape
  const reshaped = rawOutput.reshape([outputShape[0] * outputShape[1], outputShape[2]])
  rawOutput.dispose()
  return reshaped
}

export async function decodeAudioFile(file) {
  const arrayBuffer = await file.arrayBuffer()
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  const audioCtx = new AudioContextClass()
  const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer)
  await audioCtx.close()
  return decodedBuffer
}

export async function resampleBuffer(decodedBuffer, isolationMode = 'instrumental') {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  const audioCtx = new AudioContextClass()
  const targetSampleRate = 22050

  let monoBuffer = decodedBuffer
  if (decodedBuffer.numberOfChannels >= 2) {
    const left = decodedBuffer.getChannelData(0)
    const right = decodedBuffer.getChannelData(1)
    const monoData = new Float32Array(decodedBuffer.length)

    if (isolationMode === 'instrumental') {
      for (let i = 0; i < decodedBuffer.length; i++) {
        monoData[i] = (left[i] - right[i]) * 0.707
      }
    } else {
      for (let i = 0; i < decodedBuffer.length; i++) {
        monoData[i] = (left[i] + right[i]) * 0.5
      }
    }

    monoBuffer = audioCtx.createBuffer(1, decodedBuffer.length, decodedBuffer.sampleRate)
    monoBuffer.copyToChannel(monoData, 0)
  }

  const offlineCtx = new OfflineAudioContext(
    1,
    Math.ceil(decodedBuffer.duration * targetSampleRate),
    targetSampleRate
  )

  const source = offlineCtx.createBufferSource()
  source.buffer = monoBuffer
  source.connect(offlineCtx.destination)
  source.start(0)

  const resampledBuffer = await offlineCtx.startRendering()
  await audioCtx.close()
  return resampledBuffer
}

export async function decodeAndResampleAudio(file, isolationMode = 'instrumental') {
  const decodedBuffer = await decodeAudioFile(file)
  const resampledBuffer = await resampleBuffer(decodedBuffer, isolationMode)

  return {
    originalBuffer: decodedBuffer,
    resampledBuffer,
    duration: decodedBuffer.duration
  }
}

export async function transcribeAudio(resampledBuffer, options = {}, onProgress = () => {}) {
  const {
    onsetThreshold = 0.5,
    frameThreshold = 0.3,
    minNoteLength = 11,
    inferOnsets = true,
    maxFreq = null,
    minFreq = null
  } = options

  const model = await tf.loadGraphModel('/model/model.json')

  let singleChannelAudioData
  if (resampledBuffer instanceof Float32Array) {
    singleChannelAudioData = resampledBuffer
  } else {
    if (resampledBuffer.sampleRate !== AUDIO_SAMPLE_RATE) {
      throw new Error(`Sample rate audio tidak sesuai: ${resampledBuffer.sampleRate}, harus ${AUDIO_SAMPLE_RATE}`)
    }
    if (resampledBuffer.numberOfChannels !== NUM_CHANNELS) {
      throw new Error(`Audio harus mono 1 kanal.`)
    }
    singleChannelAudioData = resampledBuffer.getChannelData(0)
  }

  const [reshapedInput, audioOriginalLength] = prepareData(singleChannelAudioData)
  const nOutputFramesOriginal = Math.floor(audioOriginalLength * (ANNOTATIONS_FPS / AUDIO_SAMPLE_RATE))
  let calculatedFrames = 0

  const frames = []
  const onsets = []
  const contours = []

  const totalBatches = reshapedInput.shape[0]

  for (let i = 0; i < totalBatches; ++i) {
    onProgress(Math.round((i / totalBatches) * 100))
    await tf.nextFrame()

    const singleBatch = tf.slice(reshapedInput, i, 1)
    const results = model.execute(singleBatch, [
      OUTPUT_TO_TENSOR_NAME.frames,
      OUTPUT_TO_TENSOR_NAME.onsets,
      OUTPUT_TO_TENSOR_NAME.contours
    ])
    singleBatch.dispose()

    let unwrappedFrames = unwrapOutput(results[0])
    let unwrappedOnsets = unwrapOutput(results[1])
    let unwrappedContours = unwrapOutput(results[2])
    results[0].dispose()
    results[1].dispose()
    results[2].dispose()

    const calculatedFramesTmp = unwrappedFrames.shape[0]
    if (calculatedFrames >= nOutputFramesOriginal) {
      unwrappedFrames.dispose()
      unwrappedOnsets.dispose()
      unwrappedContours.dispose()
      continue
    }

    if (calculatedFramesTmp + calculatedFrames >= nOutputFramesOriginal) {
      const framesToOutput = nOutputFramesOriginal - calculatedFrames
      const slicedF = unwrappedFrames.slice([0, 0], [framesToOutput, -1])
      const slicedO = unwrappedOnsets.slice([0, 0], [framesToOutput, -1])
      const slicedC = unwrappedContours.slice([0, 0], [framesToOutput, -1])
      unwrappedFrames.dispose()
      unwrappedOnsets.dispose()
      unwrappedContours.dispose()
      unwrappedFrames = slicedF
      unwrappedOnsets = slicedO
      unwrappedContours = slicedC
    }
    calculatedFrames += calculatedFramesTmp

    const batchFrames = await unwrappedFrames.array()
    const batchOnsets = await unwrappedOnsets.array()
    const batchContours = await unwrappedContours.array()

    unwrappedFrames.dispose()
    unwrappedOnsets.dispose()
    unwrappedContours.dispose()

    frames.push(...batchFrames)
    onsets.push(...batchOnsets)
    contours.push(...batchContours)
  }

  reshapedInput.dispose()
  onProgress(100)

  const rawNotes = outputToNotesPoly(
    frames,
    onsets,
    onsetThreshold,
    frameThreshold,
    minNoteLength,
    inferOnsets,
    maxFreq,
    minFreq
  )

  const notesWithBends = addPitchBendsToNoteEvents(contours, rawNotes)
  const timedNotes = noteFramesToTime(notesWithBends)

  return timedNotes
}

export function exportToMidi(notes, songTitle = 'Transcribed Music') {
  const midi = new Midi()
  const track = midi.addTrack()
  track.name = songTitle

  notes.forEach((note) => {
    track.addNote({
      midi: note.pitchMidi,
      time: note.startTimeSeconds,
      duration: note.durationSeconds,
      velocity: Math.max(0.1, Math.min(1.0, note.amplitude))
    })

    if (Array.isArray(note.pitchBends) && note.pitchBends.length > 0) {
      note.pitchBends.forEach((bend, i) => {
        track.addPitchBend({
          time: note.startTimeSeconds + (i * note.durationSeconds) / note.pitchBends.length,
          value: bend
        })
      })
    }
  })

  const midiArray = midi.toArray()
  return new Blob([midiArray], { type: 'audio/midi' })
}

export function midiToNoteName(midiNumber) {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(midiNumber / 12) - 1
  const noteIndex = midiNumber % 12
  return `${noteNames[noteIndex]}${octave}`
}
