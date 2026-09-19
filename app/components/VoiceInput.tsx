'use client'

import { useEffect, useRef, useState } from 'react'

interface VoiceInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  name?: string
}

export default function VoiceInput({
  value,
  onChange,
  placeholder,
  rows = 4,
  name,
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)
  const baseValueRef = useRef<string>('')

  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setIsSupported(false)
      return
    }

    setIsSupported(true)

    const recognition = new SpeechRecognition()
    recognition.lang = 'ja-JP'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      // 現在のベース値 + 新しく確定した/途中のテキスト
      const separator = baseValueRef.current && !baseValueRef.current.endsWith('\n')
        ? (baseValueRef.current ? ' ' : '')
        : ''
      const newValue = baseValueRef.current + separator + finalTranscript + interimTranscript
      onChange(newValue)

      // 確定したものはベースに追加
      if (finalTranscript) {
        baseValueRef.current = baseValueRef.current + separator + finalTranscript
      }
    }

    recognition.onerror = (event: any) => {
      console.error('音声認識エラー:', event.error)
      if (event.error === 'not-allowed') {
        setError('マイクの使用が許可されていません。ブラウザの設定を確認してください。')
      } else if (event.error === 'no-speech') {
        setError('音声が検出されませんでした。もう一度お試しください。')
      } else {
        setError(`エラー: ${event.error}`)
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
    }
  }, [onChange])

  const toggleListening = () => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      setError(null)
      // 現在の値を保存(音声認識で上書きされないように)
      baseValueRef.current = value
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  return (
    <div className="relative">
      <textarea
        name={name}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          baseValueRef.current = e.target.value
        }}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-4 py-3 pr-14 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
      />

      {isSupported && (
        <button
          type="button"
          onClick={toggleListening}
          className={`absolute right-3 top-3 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            isListening
              ? 'bg-red-500 text-white animate-pulse shadow-lg'
              : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
          }`}
          title={isListening ? '録音停止' : '音声入力を開始'}
        >
          {isListening ? '⏹' : '🎤'}
        </button>
      )}

      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}

      {!isSupported && (
        <p className="text-gray-400 text-xs mt-1">
          ※このブラウザは音声入力に対応していません(Chrome推奨)
        </p>
      )}

      {isListening && (
        <p className="text-blue-600 text-sm mt-1 flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          録音中...話してください
        </p>
      )}
    </div>
  )
}