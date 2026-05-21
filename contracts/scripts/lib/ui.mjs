const colorEnabled = process.stdout.isTTY && !process.env.NO_COLOR
const width = Math.max(82, Math.min(108, (process.stdout.columns || 104) - 2))
const labelWidth = 14
const valueWidth = width - labelWidth - 7

const box = {
  tl: '╭',
  tr: '╮',
  bl: '╰',
  br: '╯',
  h: '─',
  v: '│',
  l: '├',
  r: '┤',
  x: '┼',
}

function hexToRgb(hex) {
  const value = hex.replace('#', '')
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ]
}

function fg(hex) {
  const [r, g, b] = hexToRgb(hex)
  return text => colorEnabled ? `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m` : text
}

const line = fg('#3d8bff')
const muted = fg('#8bafc8')
const text = fg('#eff6ff')
const success = fg('#5ab4ff')

const stripAnsi = value => String(value).replace(/\x1b\[[0-9;]*m/g, '')
const visibleLength = value => stripAnsi(value).length

function clip(value, limit) {
  const clean = stripAnsi(value)
  if (clean.length <= limit) return clean
  return clean.slice(0, Math.max(0, limit - 3)) + '...'
}

function pad(value, limit) {
  return value + ' '.repeat(Math.max(0, limit - visibleLength(value)))
}

function cell(value, limit, style = text) {
  return pad(style(clip(String(value), limit)), limit)
}

export function panel(title, rows = [], notes = []) {
  const headerFill = Math.max(1, width - title.length - 4)
  console.log(line(box.tl + box.h + ' ') + title + line(' ' + box.h.repeat(headerFill) + box.tr))

  if (rows.length > 0) {
    console.log(line(box.l + box.h.repeat(labelWidth + 2) + box.x + box.h.repeat(valueWidth + 2) + box.r))
    for (const row of rows) {
      const valueStyle = row.status ? success : text
      console.log(
        line(box.v) + ' ' +
        cell(row.label, labelWidth, muted) + ' ' +
        line(box.v) + ' ' +
        cell(row.value, valueWidth, valueStyle) + ' ' +
        line(box.v),
      )
    }
  }

  if (notes.length > 0) {
    console.log(line(box.l + box.h.repeat(width - 2) + box.r))
    for (const note of notes) {
      console.log(line(box.v) + ' ' + cell(note, width - 4, muted) + ' ' + line(box.v))
    }
  }

  console.log(line(box.bl + box.h.repeat(width - 2) + box.br))
}

export function spacer() {
  console.log()
}

export function installErrorHandler() {
  const handle = err => {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`ERROR: ${message}`)
    process.exit(1)
  }

  process.on('uncaughtException', handle)
  process.on('unhandledRejection', handle)
}
