import { isMeaningfulChange, measureChange } from '../src/perception/changeGate';

const CELLS = 32 * 18;
const base = Array<number>(CELLS).fill(32);

function changed(indices: number[], value = 96): number[] {
  const next = [...base];
  for (const i of indices) next[i] = value;
  return next;
}

const typedCommand = changed([500, 501, 502, 503, 504]);
const cursorBlink = changed([520], 255);
const noisyTerminalOutput = changed(Array.from({ length: 40 }, (_, i) => 420 + i), 112);

const oldAvgOnlyWouldMiss = measureChange(base, typedCommand).avg < 10;
const catchesTypedCommand = isMeaningfulChange(base, typedCommand);
const ignoresCursorBlink = !isMeaningfulChange(base, cursorBlink);
const catchesTerminalOutput = isMeaningfulChange(base, noisyTerminalOutput);

console.log(`typed command: avg=${measureChange(base, typedCommand).avg.toFixed(2)} hot=${measureChange(base, typedCommand).hotCells}`);
console.log(`cursor blink:  avg=${measureChange(base, cursorBlink).avg.toFixed(2)} hot=${measureChange(base, cursorBlink).hotCells}`);
console.log(`terminal out:  avg=${measureChange(base, noisyTerminalOutput).avg.toFixed(2)} hot=${measureChange(base, noisyTerminalOutput).hotCells}`);

const ok = oldAvgOnlyWouldMiss && catchesTypedCommand && ignoresCursorBlink && catchesTerminalOutput;
console.log(`\n${ok ? 'PASS' : 'FAIL'} — change gate catches short typed commands without cursor noise`);
process.exit(ok ? 0 : 1);
