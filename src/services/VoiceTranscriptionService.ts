import * as FileSystem from 'expo-file-system/legacy'
import { Audio } from 'expo-av'
import Constants from 'expo-constants'

const HUGGINGFACE_API_KEY = Constants.expoConfig?.extra?.HUGGINGFACE_API_KEY
const WHISPER_MODEL_URL = Constants.expoConfig?.extra?.WHISPER_MODEL_URL || 'https://router.huggingface.co/hf-inference'
const HF_ROUTER_BASE = 'https://router.huggingface.co/hf-inference'

export class VoiceTranscriptionService {
  private recording: Audio.Recording | null = null
  private isRecording = false

  constructor() {
    // Clean up any stale recordings on initialization
    this.globalCleanup().catch(error => console.warn('Global cleanup failed:', error))
  }

  private async globalCleanup(): Promise<void> {
    try {
      // Reset audio mode to default
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      })
      
      // Wait a bit for system to reset
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (error) {
      console.warn('Global cleanup error:', error)
    }
  }

  async requestPermissions() {
    const { granted } = await Audio.requestPermissionsAsync()
    
    if (!granted) {
      throw new Error('Audio recording permission not granted')
    }
    
    // Configure audio mode with minimal settings for better compatibility
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })
    } catch (audioModeError) {
      console.warn('Failed to set audio mode:', audioModeError)
      // Continue anyway, this might not be critical
    }
  }

  async startRecording(maxRetries = 2) {
    
    await this.forceStopRecording()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    let attempt = 0
    
    while (attempt < maxRetries) {
      try {
        this.isRecording = false
        
        await this.requestPermissions()
        
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY,
          undefined,
          -1
        )
        
        this.recording = recording
        await new Promise(resolve => setTimeout(resolve, 300))
                
        let initialStatus
        try {
          initialStatus = await recording.getStatusAsync()
        } catch (statusError) {
          
          initialStatus = { isRecording: false }
        }
        
        // Only start if not already recording
        if (!initialStatus.isRecording) {
          await recording.startAsync()
          
          // Verify it started
          const verifyStatus = await recording.getStatusAsync()
          
          if (!verifyStatus.isRecording) {
            throw new Error(`Recording failed to start - verification shows isRecording: ${verifyStatus.isRecording}`)
          }
        } else {
          
        }
        
        const finalStatus = await recording.getStatusAsync()
        
        if (!finalStatus.isRecording) {
          throw new Error(`Final verification failed - recording is not active`)
        }
        
        // Only set isRecording to true AFTER successful start and verification
        this.isRecording = true
        return // Success - exit the retry loop
        
      } catch (error: unknown) {
        
        this.isRecording = false
        if (this.recording) {
          try {
            const status = await this.recording.getStatusAsync()
            if (status.isRecording) {
              await this.recording.stopAndUnloadAsync()
            }

          } catch {}
          this.recording = null
        }
        
        attempt++
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        } else {
          throw new Error(`Failed to start recording after ${maxRetries} attempts`)
        }
      }
    }
  }

  async stopRecording(): Promise<string> {
    if (!this.recording) {
      this.isRecording = false
      return ''
    }

    try {      
      // Check if recording is actually recording before trying to stop
      let status
      try {
        status = await this.recording.getStatusAsync()
      } catch (statusError) {
        console.warn('Could not get recording status:', statusError)
        status = { isRecording: this.isRecording } // Use our state as fallback
      }
      
      if (status.isRecording) {
        await this.recording.stopAndUnloadAsync()
      }
      
      this.isRecording = false

      // Get recording URI - handle case where getURI might fail
      let uri: string | null = null
      try {
        uri = this.recording.getURI()
      } catch {}
      
      if (!uri) {
        console.log('No recording URI available')
        this.recording = null
        return ''
      }

      const transcription = await this.transcribeAudio(uri)
      
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true })
      } catch {}
      
      this.recording = null
      return transcription
      
    } catch {
      this.recording = null
      this.isRecording = false
      return ''
    }
  }

  private async transcribeAudio(audioUri: string): Promise<string> {
    try {
      if (!HUGGINGFACE_API_KEY || HUGGINGFACE_API_KEY === 'hf_example_key_replace_with_real_key') {
        return '[Voice message - transcription service not configured]'
      }
      const primaryEndpoint = `${HF_ROUTER_BASE}/models/openai/whisper-large-v3`
      console.log('[VoiceTranscriptionService] Whisper upload', {
        endpoint: primaryEndpoint,
        inputUri: audioUri,
        hasKey: !!HUGGINGFACE_API_KEY,
      })
      const lower = audioUri.toLowerCase()
      const contentTypes = lower.endsWith('.m4a')
        ? ['audio/m4a', 'audio/x-m4a', 'audio/mpeg']
        : lower.endsWith('.mp3')
        ? ['audio/mpeg']
        : (lower.endsWith('.wav') || lower.endsWith('.wave'))
        ? ['audio/wav', 'audio/x-wav', 'audio/wave']
        : lower.endsWith('.ogg')
        ? ['audio/ogg']
        : lower.endsWith('.webm')
        ? ['audio/webm', 'audio/webm;codecs=opus']
        : (lower.endsWith('.3gp') || lower.endsWith('.3gpp'))
        ? ['audio/3gpp']
        : ['application/octet-stream']

      let lastFailure: { status: number; body: string } | null = null
      for (const ct of contentTypes) {
        console.log('[VoiceTranscriptionService] Whisper try content-type', { ct })
        const uploadPrimary = await FileSystem.uploadAsync(primaryEndpoint, audioUri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
            'Content-Type': ct,
          },
        })
        if (uploadPrimary.status >= 200 && uploadPrimary.status < 300) {
          const json = JSON.parse(uploadPrimary.body || '{}')
          const text = json.text || json.transcription || ''
          return text
        }
        lastFailure = { status: uploadPrimary.status, body: uploadPrimary.body || '' }
        console.error('[VoiceTranscriptionService] Whisper primary failed', lastFailure)
      }

      const fallbackEndpoint = `${HF_ROUTER_BASE}/models/openai/whisper-large-v3-turbo`
      console.log('[VoiceTranscriptionService] Whisper upload fallback', {
        endpoint: fallbackEndpoint,
        inputUri: audioUri,
      })
      for (const ct of contentTypes) {
        console.log('[VoiceTranscriptionService] Whisper fallback try content-type', { ct })
        const uploadFallback = await FileSystem.uploadAsync(fallbackEndpoint, audioUri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
            'Content-Type': ct,
          },
        })
        if (uploadFallback.status >= 200 && uploadFallback.status < 300) {
          const fbJson = JSON.parse(uploadFallback.body || '{}')
          const fbText = fbJson.text || fbJson.transcription || ''
          return fbText
        }
        console.error('[VoiceTranscriptionService] Whisper fallback failed', {
          status: uploadFallback.status,
          body: uploadFallback.body || ''
        })
      }
      throw new Error(`Transcription failed: ${lastFailure?.status || 400}`)
    } catch (error: any) {
      return `[Voice message - transcription failed: ${error?.message || 'Unknown error'}]`
    }
  }

  getIsRecording(): boolean {
    return this.isRecording
  }

  async forceStopRecording(): Promise<void> {
    try {
      if (this.recording) {
        try {
          const status = await this.recording.getStatusAsync()
          if (status.isRecording) {
            await this.recording.stopAndUnloadAsync()
          }
        } catch {}
      }
    } catch {}
    finally {
      this.isRecording = false
      this.recording = null
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }
}

export const voiceTranscriptionService = new VoiceTranscriptionService()
