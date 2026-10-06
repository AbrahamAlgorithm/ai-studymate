import { memo, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

// Models often write LaTeX as \( … \) / \[ … \]; remark-math expects $ / $$.
// A line holding only $$…$$ is meant as a display equation, but remark-math
// only treats $$ as a block when the fences sit on their own lines.
const normaliseMath = (text) =>
    (text || '')
        .replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => `$$${m}$$`)
        .replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => `$${m}$`)
        .replace(/^([ \t]*)\$\$([^\n]+?)\$\$[ \t]*$/gm, (_, indent, m) => `${indent}$$\n${indent}${m.trim()}\n${indent}$$`)

const components = {
    a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
    table: ({ node: _node, ...props }) => (
        <div className="md-table-wrap"><table {...props} /></div>
    ),
}

/** Renders model output as Markdown + LaTeX. Raw HTML in the text is not rendered. */
export const Markdown = memo(function Markdown({ text, className = 'md' }) {
    return (
        <div className={className}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={components}
            >
                {normaliseMath(text)}
            </ReactMarkdown>
        </div>
    )
})

const REVEAL_TICK_MS = 24
const REVEAL_TICKS = 60 // ~1.5s regardless of answer length

/** Markdown that types itself out once when a fresh answer arrives. */
const MessageContent = ({ text, animate = false, onRevealed }) => {
    const [shown, setShown] = useState(animate ? 0 : (text || '').length)
    const onRevealedRef = useRef(onRevealed)
    onRevealedRef.current = onRevealed

    useEffect(() => {
        const full = (text || '').length
        if (!animate) {
            setShown(full)
            return
        }
        const step = Math.max(4, Math.ceil(full / REVEAL_TICKS))
        let n = 0
        let finished = false
        const id = setInterval(() => {
            n = Math.min(full, n + step)
            setShown(n)
            if (n >= full) {
                clearInterval(id)
                finished = true
                onRevealedRef.current?.()
            }
        }, REVEAL_TICK_MS)
        return () => {
            clearInterval(id)
            // Interrupted (e.g. the user switched sessions): don't replay it later.
            if (!finished) onRevealedRef.current?.()
        }
    }, [text, animate])

    const visible = shown >= (text || '').length ? text : (text || '').slice(0, shown)
    return <Markdown text={visible} />
}

export default MessageContent
