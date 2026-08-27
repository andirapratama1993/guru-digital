/**
 * Crossword Builder - Algoritma pembuat TTS yang valid
 * Kata-kata saling berpotongan di huruf yang sama (connected crossword)
 */

export interface CrosswordCell {
  huruf: string
  blocked: boolean
  nomor?: number
}

interface PlacedWord {
  word: string
  row: number
  col: number
  direction: 'across' | 'down'
  clueNumber: number
}

interface Crossword {
  grid: CrosswordCell[][]
  placedWords: PlacedWord[]
  across: { nomor: number; pertanyaan: string }[]
  down: { nomor: number; pertanyaan: string }[]
  rows: number
  cols: number
}

export function buildCrossword(
  words: string[],
  clues: string[]
): Crossword {
  // Normalize: uppercase, max 12 chars, min 3 chars
  const clean = words
    .map(w => w.toUpperCase().replace(/[^A-Z]/g, ''))
    .filter(w => w.length >= 3 && w.length <= 12)
    .slice(0, 10)

  if (clean.length === 0) return buildFallback(words, clues)

  const GRID_SIZE = 15
  const grid: string[][] = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill('')
  )

  const placed: PlacedWord[] = []
  let clueCounter = 1

  // Place first word horizontally in the center
  const firstWord = clean[0]
  const startRow = Math.floor(GRID_SIZE / 2)
  const startCol = Math.floor((GRID_SIZE - firstWord.length) / 2)

  for (let i = 0; i < firstWord.length; i++) {
    grid[startRow][startCol + i] = firstWord[i]
  }
  placed.push({
    word: firstWord,
    row: startRow,
    col: startCol,
    direction: 'across',
    clueNumber: clueCounter++,
  })

  // Try to place remaining words crossing existing letters
  for (let wi = 1; wi < clean.length; wi++) {
    const word = clean[wi]
    let bestPlacement: { row: number; col: number; dir: 'across' | 'down' } | null = null

    // Try crossing with each placed word
    for (const pw of placed) {
      for (let li = 0; li < pw.word.length; li++) {
        const existingChar = pw.word[li]

        // Find positions in new word that match
        for (let wi2 = 0; wi2 < word.length; wi2++) {
          if (word[wi2] !== existingChar) continue

          let r: number, c: number
          const dir = pw.direction === 'across' ? 'down' : 'across'

          if (pw.direction === 'across') {
            // New word goes down, crossing at pw.row
            c = pw.col + li
            r = pw.row - wi2
            if (r < 0 || r + word.length > GRID_SIZE) continue
            if (c < 0 || c >= GRID_SIZE) continue
          } else {
            // New word goes across, crossing at pw.col
            r = pw.row + li
            c = pw.col - wi2
            if (c < 0 || c + word.length > GRID_SIZE) continue
            if (r < 0 || r >= GRID_SIZE) continue
          }

          if (canPlace(grid, word, r, c, dir, GRID_SIZE)) {
            bestPlacement = { row: r, col: c, dir }
            break
          }
        }
        if (bestPlacement) break
      }
      if (bestPlacement) break
    }

    if (bestPlacement) {
      const { row, col, dir } = bestPlacement
      for (let i = 0; i < word.length; i++) {
        if (dir === 'across') grid[row][col + i] = word[i]
        else grid[row + i][col] = word[i]
      }
      placed.push({ word, row, col, direction: dir, clueNumber: clueCounter++ })
    }
  }

  // Trim grid to used area + 1 padding
  let minR = GRID_SIZE, maxR = 0, minC = GRID_SIZE, maxC = 0
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c]) {
        minR = Math.min(minR, r)
        maxR = Math.max(maxR, r)
        minC = Math.min(minC, c)
        maxC = Math.max(maxC, c)
      }
    }
  }
  minR = Math.max(0, minR - 1)
  minC = Math.max(0, minC - 1)
  maxR = Math.min(GRID_SIZE - 1, maxR + 1)
  maxC = Math.min(GRID_SIZE - 1, maxC + 1)

  const rows = maxR - minR + 1
  const cols = maxC - minC + 1

  // Build final CrosswordCell grid
  const finalGrid: CrosswordCell[][] = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      huruf: grid[minR + r][minC + c] || '',
      blocked: !grid[minR + r][minC + c],
    }))
  )

  // Add clue numbers to cells
  // Recalculate clue numbers based on standard crossword rules
  let num = 1
  const acrossClues: { nomor: number; pertanyaan: string }[] = []
  const downClues: { nomor: number; pertanyaan: string }[] = []
  const cellNumbers: Record<string, number> = {}

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (finalGrid[r][c].blocked) continue

      const startsAcross =
        (c === 0 || finalGrid[r][c - 1].blocked) &&
        c + 1 < cols && !finalGrid[r][c + 1].blocked

      const startsDown =
        (r === 0 || finalGrid[r - 1][c].blocked) &&
        r + 1 < rows && !finalGrid[r + 1][c].blocked

      if (startsAcross || startsDown) {
        finalGrid[r][c].nomor = num
        cellNumbers[`${r},${c}`] = num

        if (startsAcross) {
          // Find matching placed word
          const pw = placed.find(
            p => p.direction === 'across' &&
              p.row - minR === r &&
              p.col - minC === c
          )
          const clueIdx = pw ? placed.indexOf(pw) : -1
          const clueText = clues[clueIdx] || `Mendatar: kata terkait materi (${pw?.word || ''})`
          acrossClues.push({ nomor: num, pertanyaan: clueText })
        }

        if (startsDown) {
          const pw = placed.find(
            p => p.direction === 'down' &&
              p.row - minR === r &&
              p.col - minC === c
          )
          const clueIdx = pw ? placed.indexOf(pw) : -1
          const clueText = clues[clueIdx] || `Menurun: kata terkait materi (${pw?.word || ''})`
          downClues.push({ nomor: num, pertanyaan: clueText })
        }

        num++
      }
    }
  }

  return {
    grid: finalGrid,
    placedWords: placed,
    across: acrossClues,
    down: downClues,
    rows,
    cols,
  }
}

function canPlace(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dir: 'across' | 'down',
  size: number
): boolean {
  // Check bounds
  if (dir === 'across' && col + word.length > size) return false
  if (dir === 'down' && row + word.length > size) return false

  // Check before and after word
  if (dir === 'across') {
    if (col > 0 && grid[row][col - 1]) return false
    if (col + word.length < size && grid[row][col + word.length]) return false
  } else {
    if (row > 0 && grid[row - 1][col]) return false
    if (row + word.length < size && grid[row + word.length][col]) return false
  }

  let intersections = 0
  for (let i = 0; i < word.length; i++) {
    const r = dir === 'down' ? row + i : row
    const c = dir === 'across' ? col + i : col
    const existing = grid[r][c]

    if (existing) {
      if (existing !== word[i]) return false
      intersections++
    } else {
      // Check adjacent cells (perpendicular) don't have letters (would create invalid words)
      if (dir === 'across') {
        if (r > 0 && grid[r - 1][c]) return false
        if (r < size - 1 && grid[r + 1][c]) return false
      } else {
        if (c > 0 && grid[r][c - 1]) return false
        if (c < size - 1 && grid[r][c + 1]) return false
      }
    }
  }

  // Must intersect at least once with existing words (except first word)
  return intersections >= 1
}

function buildFallback(words: string[], clues: string[]): Crossword {
  // Simple fallback: 2 words in a cross pattern
  const w1 = (words[0] || 'MATERI').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10)
  const w2 = (words[1] || 'PELAJARAN').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10)

  const size = Math.max(w1.length, w2.length) + 2
  const grid: CrosswordCell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ huruf: '', blocked: true }))
  )

  // Place w1 horizontally in middle
  const midR = Math.floor(size / 2)
  for (let i = 0; i < w1.length; i++) {
    grid[midR][i + 1] = { huruf: w1[i], blocked: false, nomor: i === 0 ? 1 : undefined }
  }

  // Place w2 vertically crossing w1 at first shared letter
  let crossCol = -1
  for (let i = 0; i < w1.length; i++) {
    for (let j = 0; j < w2.length; j++) {
      if (w1[i] === w2[j]) { crossCol = i + 1; break }
    }
    if (crossCol >= 0) break
  }
  if (crossCol < 0) crossCol = Math.floor(w1.length / 2) + 1

  const startRow = midR - Math.floor(w2.length / 2)
  for (let i = 0; i < w2.length; i++) {
    const r = startRow + i
    if (r >= 0 && r < size) {
      grid[r][crossCol] = {
        huruf: w2[i],
        blocked: false,
        nomor: i === 0 ? 2 : undefined,
      }
    }
  }
  grid[midR][crossCol].nomor = undefined // intersection - keep w1 numbering

  return {
    grid,
    placedWords: [],
    across: [{ nomor: 1, pertanyaan: clues[0] || `Mendatar: ${w1}` }],
    down: [{ nomor: 2, pertanyaan: clues[1] || `Menurun: ${w2}` }],
    rows: size,
    cols: size,
  }
}
