import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toCsv } from './csv.ts'

test('quotes commas, quotes and newlines; empty for null', () => {
  assert.equal(toCsv([['Name', 'Note'], ['Lee, Sam', 'said "hi"'], ['a\nb', null]]),
    'Name,Note\r\n"Lee, Sam","said ""hi"""\r\n"a\nb",\r\n')
})

test('defuses spreadsheet formulas in attendee-typed cells', () => {
  assert.equal(toCsv([['=HYPERLINK("x")', '+1', '-2', '@SUM(A1)', 'ok']]),
    `"'=HYPERLINK(""x"")",'+1,'-2,'@SUM(A1),ok\r\n`)
})
