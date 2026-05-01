import mammoth from 'mammoth'
import * as XLSX from 'xlsx'

const TOKEN_SPLIT = /[\s,;|]+/

function normKey(s: string): string {
  return s.trim().toUpperCase()
}

/** Split pasted or file text into raw tokens, then dedupe (first casing kept). */
export function parsePhcodesFromFreeText(text: string): string[] {
  const raw = text
    .split(/\r?\n/)
    .flatMap((line) => line.split(TOKEN_SPLIT))
    .map((s) => s.trim())
    .filter(Boolean)
  return dedupePhcodes(raw)
}

export function dedupePhcodes(codes: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of codes) {
    const k = normKey(c)
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(c.trim())
  }
  return out
}

export async function parsePhcodesFromDocx(
  arrayBuffer: ArrayBuffer,
): Promise<string[]> {
  const { value } = await mammoth.extractRawText({ arrayBuffer })
  return parsePhcodesFromFreeText(value)
}

export function parsePhcodesFromExcel(arrayBuffer: ArrayBuffer): string[] {
  const wb = XLSX.read(arrayBuffer, { type: 'array' })
  const raw: string[] = []
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    if (!ws) continue
    const rows = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: '',
      raw: false,
    }) as unknown[][]
    for (const row of rows) {
      if (!Array.isArray(row)) continue
      for (const cell of row) {
        if (cell == null || cell === '') continue
        const s = String(cell)
        raw.push(
          ...s
            .split(TOKEN_SPLIT)
            .map((t) => t.trim())
            .filter(Boolean),
        )
      }
    }
  }
  return dedupePhcodes(raw)
}
