'use strict';

/**
 * Incremental log reader — Strategy C from the indexing design.
 *
 * Two distinct shapes here:
 *
 *   1. Session log incremental read: track `last_read_offset` per
 *      session per file; on each conductor turn read only NEW bytes.
 *      Typical delta: <500 bytes.
 *
 *   2. History.md tail read: never read the full file. Return the
 *      newest N entries (entries are separated by `\n---\n`).
 *
 * Offsets persist at <eco>/swarms/<id>/.offsets.json. Keyed by absolute
 * file path → byte offset.
 */

const fs = require('fs');
const path = require('path');

const manifestLib = require('./manifest');

const OFFSETS_FILENAME = '.offsets.json';
const ENTRY_DELIMITER = '\n---\n';

function offsetsPath(ecosystemRoot, swarmId) {
  return path.join(manifestLib.swarmDir(ecosystemRoot, swarmId), OFFSETS_FILENAME);
}

function loadOffsets(ecosystemRoot, swarmId) {
  const file = offsetsPath(ecosystemRoot, swarmId);
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_e) {
    return {};
  }
}

function saveOffsets(ecosystemRoot, swarmId, offsets) {
  manifestLib.ensureSwarmLayout(ecosystemRoot, swarmId);
  const file = offsetsPath(ecosystemRoot, swarmId);
  return manifestLib.withLock(file, () => {
    fs.writeFileSync(file, JSON.stringify(offsets, null, 2) + '\n', 'utf8');
    return file;
  });
}

/**
 * Read NEW bytes appended to `filePath` since the last call. Returns
 * { delta: string, newOffset: number }. If `filePath` doesn't exist
 * yet, returns { delta: '', newOffset: 0 }.
 *
 * If the file shrunk (e.g. truncated/rotated) we reset to 0 and read
 * from the start.
 */
function readDelta(filePath, lastOffset) {
  if (!fs.existsSync(filePath)) return { delta: '', newOffset: 0 };
  const size = fs.statSync(filePath).size;
  if (lastOffset == null || lastOffset > size) {
    const all = fs.readFileSync(filePath, 'utf8');
    return { delta: all, newOffset: size };
  }
  if (lastOffset === size) {
    return { delta: '', newOffset: size };
  }
  const fd = fs.openSync(filePath, 'r');
  try {
    const length = size - lastOffset;
    const buf = Buffer.alloc(length);
    fs.readSync(fd, buf, 0, length, lastOffset);
    return { delta: buf.toString('utf8'), newOffset: size };
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Persistent variant: reads delta + updates the swarm's offsets file.
 */
function readDeltaPersistent(ecosystemRoot, swarmId, filePath) {
  const offsets = loadOffsets(ecosystemRoot, swarmId);
  const last = offsets[filePath] || 0;
  const { delta, newOffset } = readDelta(filePath, last);
  if (newOffset !== last) {
    offsets[filePath] = newOffset;
    saveOffsets(ecosystemRoot, swarmId, offsets);
  }
  return { delta, newOffset, previousOffset: last };
}

/**
 * Read the last `n` entries from a history.md-style append-only file.
 * Entries are separated by `\n---\n`. Returns an array of entry strings
 * (newest last). When the file is empty, returns []. When fewer than
 * `n` entries exist, returns all available.
 */
function tailHistory(filePath, n) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8');
  if (raw.length === 0) return [];
  const parts = raw.split(ENTRY_DELIMITER).map((s) => s.trim()).filter((s) => s.length > 0);
  if (parts.length <= n) return parts;
  return parts.slice(parts.length - n);
}

module.exports = {
  OFFSETS_FILENAME,
  ENTRY_DELIMITER,
  offsetsPath,
  loadOffsets,
  saveOffsets,
  readDelta,
  readDeltaPersistent,
  tailHistory,
};
