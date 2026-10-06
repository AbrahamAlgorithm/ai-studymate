import { useEffect, useRef, useState } from 'react'

const SpeechRecognition =
    typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

/** Browser speech-to-text (Chrome, Edge, Safari). `onText` receives each final phrase. */
const useSpeechRecognition = (onText) => {
    const [listening, setListening] = useState(false)
    const recognitionRef = useRef(null)
    const onTextRef = useRef(onText)
    onTextRef.current = onText

    useEffect(() => () => recognitionRef.current?.abort(), [])

    const start = () => {
        if (!SpeechRecognition || listening) return
        const recognition = new SpeechRecognition()
        recognition.lang = navigator.language || 'en-US'
        recognition.interimResults = false
        recognition.continuous = false
        recognition.onresult = (event) => {
            const text = Array.from(event.results)
                .filter((r) => r.isFinal)
                .map((r) => r[0].transcript)
                .join(' ')
                .trim()
            if (text) onTextRef.current?.(text)
        }
        recognition.onend = () => setListening(false)
        recognition.onerror = () => setListening(false)
        recognitionRef.current = recognition
        recognition.start()
        setListening(true)
    }

    const stop = () => recognitionRef.current?.stop()

    return { supported: Boolean(SpeechRecognition), listening, start, stop }
}

export default useSpeechRecognition
