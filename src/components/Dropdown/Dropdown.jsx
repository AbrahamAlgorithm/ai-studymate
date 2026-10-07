import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './Dropdown.css'

const GAP = 6
const EDGE = 8

const Chevron = () => (
    <svg className="dropdown-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m6 9 6 6 6-6" />
    </svg>
)

const Check = () => (
    <svg className="dropdown-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
    </svg>
)

const Dropdown = ({ label, value, options, onChange }) => {
    const id = useId()
    const [open, setOpen] = useState(false)
    const [active, setActive] = useState(0)
    const [host, setHost] = useState(null)
    const triggerRef = useRef(null)
    const menuRef = useRef(null)

    const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value))
    const optionId = (i) => `${id}-option-${i}`

    // goes inside .home-container so it still picks up the theme colors
    const show = () => {
        setHost(triggerRef.current.closest('.home-container') || document.body)
        setActive(selectedIndex)
        setOpen(true)
    }

    const hide = useCallback((refocus) => {
        setOpen(false)
        if (refocus) triggerRef.current?.focus()
    }, [])

    const choose = (index) => {
        if (options[index].value !== value) onChange(options[index].value)
        hide(true)
    }

    // fixed so the scrolling area can't clip it, flips up when there's no room below
    const place = useCallback(() => {
        const trigger = triggerRef.current
        const menu = menuRef.current
        if (!trigger || !menu) return
        const r = trigger.getBoundingClientRect()
        menu.style.minWidth = `${r.width}px`
        const below = window.innerHeight - r.bottom - GAP - EDGE
        const above = r.top - GAP - EDGE
        const up = menu.scrollHeight > below && above > below
        menu.style.left = `${Math.max(EDGE, Math.min(r.left, window.innerWidth - EDGE - menu.offsetWidth))}px`
        menu.style.top = up ? '' : `${r.bottom + GAP}px`
        menu.style.bottom = up ? `${window.innerHeight - r.top + GAP}px` : ''
        menu.style.maxHeight = `${up ? above : below}px`
        menu.dataset.side = up ? 'top' : 'bottom'
    }, [])

    useLayoutEffect(() => {
        if (!open) return
        place()
        const onScroll = (e) => {
            if (!menuRef.current?.contains(e.target)) place()
        }
        window.addEventListener('resize', place)
        window.addEventListener('scroll', onScroll, true)
        return () => {
            window.removeEventListener('resize', place)
            window.removeEventListener('scroll', onScroll, true)
        }
    }, [open, place])

    useEffect(() => {
        if (!open) return
        const onPointerDown = (e) => {
            if (!triggerRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) hide(false)
        }
        document.addEventListener('pointerdown', onPointerDown)
        return () => document.removeEventListener('pointerdown', onPointerDown)
    }, [open, hide])

    useEffect(() => {
        if (open) menuRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
    }, [open, active])

    // focus never leaves the button, the arrows just move the highlight like a native select
    const onKeyDown = (e) => {
        const last = options.length - 1
        if (!open) {
            if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
                e.preventDefault()
                show()
            }
            return
        }
        switch (e.key) {
            case 'ArrowDown': setActive((i) => Math.min(last, i + 1)); break
            case 'ArrowUp': setActive((i) => Math.max(0, i - 1)); break
            case 'Home': setActive(0); break
            case 'End': setActive(last); break
            case 'Enter':
            case ' ': choose(active); break
            case 'Escape': hide(true); break
            case 'Tab': hide(false); return
            default: {
                if (e.key.length !== 1) return
                const starts = (o) => String(o.label).toLowerCase().startsWith(e.key.toLowerCase())
                const next = options.findIndex((o, i) => i > active && starts(o))
                const first = options.findIndex(starts)
                if (first === -1) return
                setActive(next !== -1 ? next : first)
            }
        }
        e.preventDefault()
    }

    return (
        <div className="dropdown">
            <span id={`${id}-label`} className="dropdown-label">{label}</span>
            <button
                ref={triggerRef}
                type="button"
                role="combobox"
                className={`dropdown-trigger${open ? ' open' : ''}`}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? `${id}-list` : undefined}
                aria-labelledby={`${id}-label`}
                aria-activedescendant={open ? optionId(active) : undefined}
                onClick={() => (open ? hide(false) : show())}
                onKeyDown={onKeyDown}
                // firefox still fires a click from space on keyup, which would reopen it
                onKeyUp={(e) => { if (e.key === ' ') e.preventDefault() }}
            >
                <span className="dropdown-value">{options[selectedIndex]?.label}</span>
                <Chevron />
            </button>
            {open && host && createPortal(
                <ul ref={menuRef} id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`} className="dropdown-menu">
                    {options.map((opt, i) => (
                        <li
                            key={String(opt.value)}
                            id={optionId(i)}
                            role="option"
                            aria-selected={i === selectedIndex}
                            className={`dropdown-option${i === active ? ' active' : ''}`}
                            onPointerMove={() => { if (i !== active) setActive(i) }}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => choose(i)}
                        >
                            {opt.label}
                            {i === selectedIndex && <Check />}
                        </li>
                    ))}
                </ul>,
                host,
            )}
        </div>
    )
}

export default Dropdown
