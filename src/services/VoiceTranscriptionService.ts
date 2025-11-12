import * as FileSystem from 'expo-file-system'
import { Audio } from 'expo-av'
import Constants from 'expo-constants'

const HUGGINGFACE_API_KEY = Constants.expoConfig?.extra?.HUGGINGFACE_API_KEY
const WHISPER_MODEL_URL = Constants.expoConfig?.extra?.WHISPER_MODEL_URL || 'https://api-inference.huggingface.co/models/openai/whisper-large-v3'

export class VoiceTranscriptionService {
  private recording: Audio.Recording | null = null
  private isRecording = false

  async requestPermissions() {
    const { granted } = await Audio.requestPermissionsAsync()
    if (!granted) {
      throw new Error('Audio recording permission not granted')
    }
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    })
  }

  async startRecording() {
    await this.requestPermissions()
    
    this.recording = new Audio.Recording()
    await this.recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
    await this.recording.startAsync()
    this.isRecording = true
  }

  async stopRecording(): Promise<string> {
    if (!this.recording || !this.isRecording) {
      throw new Error('No active recording')
    }

    await this.recording.stopAndUnloadAsync()
    this.isRecording = false

    const uri = this.recording.getURI()
    if (!uri) {
      throw new Error('Failed to get recording URI')
    }

    const transcription = await this.transcribeAudio(uri)
    
    // Clean up the recording file
    await FileSystem.deleteAsync(uri, { idempotent: true })
    
    this.recording = null
    return transcription
  }

  private async transcribeAudio(audioUri: string): Promise<string> {
    try {
      // Read the audio file
      const audioData = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      const response = await fetch(WHISPER_MODEL_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: audioData,
        }),
      })

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`)
      }

      const result = await response.json()
      return result.text || ''
    } catch (error) {
      console.error('Transcription error:', error)
      throw new Error('Failed to transcribe audio')
    }
  }

  getIsRecording(): boolean {
    return this.isRecording
  }
}

export const voiceTranscriptionService = new VoiceTranscriptionService()