import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

// gemini mixes \( \) and \[ \] with $ and $$, and remark-math only treats $$ as a block on its own lines
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

// raw html in model output is never rendered, it shows up as plain text
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

const MessageContent = ({ text }) => <Markdown text={text} />

export default MessageContent
