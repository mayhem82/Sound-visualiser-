// A real, from-scratch QR Code encoder (ISO/IEC 18004) -- no external
// library. Every "Copy as JSON"/"Copy a tag" feature across this suite
// used to end with "paste it into any free QR generator", which meant
// the QR-scanning half of each feature was only ever testable with help
// from a site this app has no control over. This closes that gap: real
// Reed-Solomon error correction, real module placement, real masking,
// generated entirely client-side.
//
// Supports byte mode only (every payload in this suite is JSON/ASCII
// text, and byte mode is universally correct for that -- just slightly
// less bit-efficient than numeric/alphanumeric mode for suitable data,
// which isn't worth the extra complexity here). Versions 1-40, EC levels
// L/M/Q/H, automatic smallest-version selection, ECI/Kanji not
// implemented (unneeded for ASCII/UTF-8 JSON).
(function (global) {
  "use strict";

  // ---- GF(256) arithmetic (primitive polynomial 0x11D, generator 2) ----
  const GF_EXP = new Uint8Array(512);
  const GF_LOG = new Uint8Array(256);
  (function buildGfTables() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11D;
    }
    for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }

  // Reed-Solomon generator polynomial for `degree` EC codewords, as an
  // array of coefficients (highest degree first), monic.
  function rsGeneratorPoly(degree) {
    let poly = [1];
    for (let i = 0; i < degree; i++) {
      const next = new Array(poly.length + 1).fill(0);
      for (let j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], GF_EXP[i]);
      }
      poly = next;
    }
    return poly;
  }

  // Computes `ecLen` error-correction codewords for a block of data
  // codewords, via polynomial division in GF(256).
  function rsEncode(dataCodewords, ecLen) {
    const gen = rsGeneratorPoly(ecLen);
    const remainder = new Uint8Array(ecLen);
    for (let i = 0; i < dataCodewords.length; i++) {
      const factor = dataCodewords[i] ^ remainder[0];
      remainder.copyWithin(0, 1);
      remainder[ecLen - 1] = 0;
      if (factor !== 0) {
        for (let j = 0; j < ecLen; j++) {
          remainder[j] ^= gfMul(gen[j + 1], factor);
        }
      }
    }
    return Array.from(remainder);
  }

  // ---- Version/EC-level tables (ISO/IEC 18004 Table 7 + Table 9) ----
  // For each version (index 0 = version 1) and EC level, in order
  // [L, M, Q, H]: total data codewords available, and the block
  // structure as [ecCodewordsPerBlock, group1Blocks, group1DataLen,
  // group2Blocks, group2DataLen] (group2 fields 0 when only one group).
  const EC_BLOCK_INFO = {
    L: [
      [7, 1, 19], [10, 1, 34], [15, 1, 55], [20, 1, 80], [26, 1, 108],
      [18, 2, 68], [20, 2, 78], [24, 2, 97], [30, 2, 116], [18, 2, 68, 2, 69],
      [20, 4, 81], [24, 2, 92, 2, 93], [26, 4, 107], [30, 3, 115, 1, 116], [22, 5, 87, 1, 88],
      [24, 5, 98, 1, 99], [28, 1, 107, 5, 108], [30, 5, 120, 1, 121], [28, 3, 113, 4, 114], [28, 3, 107, 5, 108],
      [28, 4, 116, 4, 117], [28, 2, 111, 7, 112], [30, 4, 121, 5, 122], [30, 6, 117, 4, 118], [26, 8, 106, 4, 107],
      [28, 10, 114, 2, 115], [30, 8, 122, 4, 123], [30, 3, 117, 10, 118], [30, 7, 116, 7, 117], [30, 5, 115, 10, 116],
      [30, 13, 115, 3, 116], [30, 17, 115], [30, 17, 115, 1, 116], [30, 13, 115, 6, 116], [30, 12, 121, 7, 122],
      [30, 6, 121, 14, 122], [30, 17, 122, 4, 123], [30, 4, 122, 18, 123], [30, 20, 117, 4, 118], [30, 19, 118, 6, 119],
    ],
    M: [
      [10, 1, 16], [16, 1, 28], [26, 1, 44], [18, 2, 32], [24, 2, 43],
      [16, 4, 27], [18, 4, 31], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37], [26, 4, 43, 1, 44],
      [30, 1, 50, 4, 51], [22, 6, 36, 2, 37], [22, 8, 37, 1, 38], [24, 4, 40, 5, 41], [24, 5, 41, 5, 42],
      [28, 7, 45, 3, 46], [28, 10, 46, 1, 47], [26, 9, 43, 4, 44], [26, 3, 44, 11, 45], [26, 3, 41, 13, 42],
      [26, 17, 42], [28, 17, 46], [28, 4, 47, 14, 48], [28, 6, 45, 14, 46], [28, 8, 47, 13, 48],
      [28, 19, 46, 4, 47], [28, 22, 45, 3, 46], [28, 3, 45, 23, 46], [28, 21, 45, 7, 46], [28, 19, 47, 10, 48],
      [28, 2, 46, 29, 47], [28, 10, 46, 23, 47], [28, 14, 46, 21, 47], [28, 14, 46, 23, 47], [28, 12, 47, 26, 48],
      [28, 6, 47, 34, 48], [28, 29, 46, 14, 47], [28, 13, 46, 32, 47], [28, 40, 47, 7, 48], [28, 18, 47, 31, 48],
    ],
    Q: [
      [13, 1, 13], [22, 1, 22], [18, 2, 17], [26, 2, 24], [18, 2, 15, 2, 16],
      [24, 4, 19], [18, 2, 14, 4, 15], [22, 4, 18, 2, 19], [20, 4, 16, 4, 17], [24, 6, 19, 2, 20],
      [28, 4, 22, 4, 23], [26, 4, 20, 6, 21], [24, 8, 20, 4, 21], [20, 11, 16, 5, 17], [30, 5, 24, 7, 25],
      [24, 15, 19, 2, 20], [28, 1, 22, 15, 23], [28, 17, 22, 1, 23], [26, 17, 21, 4, 22], [30, 15, 24, 5, 25],
      [28, 17, 22, 6, 23], [30, 7, 24, 16, 25], [30, 11, 24, 14, 25], [30, 11, 24, 16, 25], [30, 7, 24, 22, 25],
      [28, 28, 22, 6, 23], [30, 8, 23, 26, 24], [30, 4, 24, 31, 25], [30, 1, 23, 37, 24], [30, 15, 24, 25, 25],
      [30, 42, 24, 1, 25], [30, 10, 24, 35, 25], [30, 29, 24, 19, 25], [30, 44, 24, 7, 25], [30, 39, 24, 14, 25],
      [30, 46, 24, 10, 25], [30, 49, 24, 10, 25], [30, 48, 24, 14, 25], [30, 43, 24, 22, 25], [30, 34, 24, 34, 25],
    ],
    H: [
      [17, 1, 9], [28, 1, 16], [22, 2, 13], [16, 4, 9], [22, 2, 11, 2, 12],
      [28, 4, 15], [26, 4, 13, 1, 14], [26, 4, 14, 2, 15], [24, 4, 12, 4, 13], [28, 6, 15, 2, 16],
      [24, 3, 12, 8, 13], [28, 7, 14, 4, 15], [22, 12, 11, 4, 12], [24, 11, 12, 5, 13], [24, 11, 12, 7, 13],
      [30, 3, 15, 13, 16], [28, 2, 14, 17, 15], [28, 2, 14, 19, 15], [26, 9, 13, 16, 14], [28, 15, 15, 10, 16],
      [30, 19, 16, 6, 17], [24, 34, 13], [30, 16, 15, 14, 16], [30, 30, 16, 2, 17], [30, 22, 15, 13, 16],
      [30, 33, 16, 4, 17], [30, 12, 15, 28, 16], [30, 11, 15, 31, 16], [30, 19, 15, 26, 16], [30, 23, 15, 25, 16],
      [30, 23, 15, 28, 16], [30, 19, 15, 35, 16], [30, 11, 15, 46, 16], [30, 59, 16, 1, 17], [30, 22, 15, 41, 16],
      [30, 2, 15, 64, 16], [30, 24, 15, 46, 16], [30, 42, 15, 32, 16], [30, 10, 15, 67, 16], [30, 20, 15, 61, 16],
    ],
  };

  // Character-count-indicator bit length by version range, byte mode.
  function charCountBits(version) {
    if (version <= 9) return 8;
    return 16;
  }

  function totalDataCodewords(version, ecLevel) {
    const info = EC_BLOCK_INFO[ecLevel][version - 1];
    const [, g1n, g1len, g2n, g2len] = info;
    return g1n * g1len + (g2n || 0) * (g2len || 0);
  }

  // Alignment pattern center coordinates per version (ISO 18004 Table E.1).
  const ALIGNMENT_POSITIONS = [
    [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
    [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54],
    [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74],
    [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90], [6, 28, 50, 72, 94],
    [6, 26, 50, 74, 98], [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114],
    [6, 34, 62, 90, 118], [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134],
    [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154],
    [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170],
  ];

  // BCH(15,5) format-info error correction, generator 0x537, XOR mask
  // 0x5412 -- ISO 18004 Annex C.
  function formatBits(ecLevel, maskPattern) {
    const ecIndicator = { L: 1, M: 0, Q: 3, H: 2 }[ecLevel]; // ISO 18004 Table 25
    const data = (ecIndicator << 3) | maskPattern; // 5 bits
    let d = data << 10;
    const gen = 0b10100110111;
    for (let i = 4; i >= 0; i--) {
      if (d & (1 << (i + 10))) d ^= gen << i;
    }
    const bits = (data << 10) | d;
    return bits ^ 0b101010000010010;
  }

  // BCH(18,6) version-info error correction -- ISO 18004 Annex D, only
  // needed for version >= 7.
  function versionBits(version) {
    let d = version << 12;
    const gen = 0b1111100100101;
    for (let i = 5; i >= 0; i--) {
      if (d & (1 << (i + 12))) d ^= gen << i;
    }
    return (version << 12) | d;
  }

  function encodeBitStream(text, version, dataCodewordCount) {
    const bytes = [];
    // UTF-8 encode -- correct for arbitrary JSON text, not just ASCII.
    for (let i = 0; i < text.length; i++) {
      const code = text.codePointAt(i);
      if (code > 0xFFFF) i++; // consumed a surrogate pair
      if (code < 0x80) bytes.push(code);
      else if (code < 0x800) bytes.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F));
      else if (code < 0x10000) bytes.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
      else bytes.push(0xF0 | (code >> 18), 0x80 | ((code >> 12) & 0x3F), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
    }

    const bits = [];
    const pushBits = (value, len) => { for (let i = len - 1; i >= 0; i--) bits.push((value >> i) & 1); };

    pushBits(0b0100, 4); // byte mode indicator
    pushBits(bytes.length, charCountBits(version));
    for (const b of bytes) pushBits(b, 8);

    const capacityBits = dataCodewordCount * 8;
    // Terminator: up to 4 zero bits, but never past capacity.
    for (let i = 0; i < 4 && bits.length < capacityBits; i++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);

    const codewords = [];
    for (let i = 0; i < bits.length; i += 8) {
      let v = 0;
      for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
      codewords.push(v);
    }
    const padBytes = [0xEC, 0x11];
    let p = 0;
    while (codewords.length < dataCodewordCount) { codewords.push(padBytes[p % 2]); p++; }
    return codewords;
  }

  function pickVersion(text, ecLevel) {
    // Encode against each version's own char-count-indicator width until
    // one actually fits -- byte length in UTF-8, not JS string length.
    let byteLength = 0;
    for (let i = 0; i < text.length; i++) {
      const code = text.codePointAt(i);
      if (code > 0xFFFF) i++;
      byteLength += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
    }
    for (let version = 1; version <= 40; version++) {
      const dataCodewords = totalDataCodewords(version, ecLevel);
      const headerBits = 4 + charCountBits(version);
      const capacityBits = dataCodewords * 8;
      if (headerBits + byteLength * 8 <= capacityBits) return version;
    }
    return null; // text too long for any QR version at this EC level
  }

  function buildBlocks(codewords, version, ecLevel) {
    const info = EC_BLOCK_INFO[ecLevel][version - 1];
    const [ecLen, g1n, g1len, g2n, g2len] = info;
    const blocks = [];
    let offset = 0;
    for (let i = 0; i < g1n; i++) {
      const data = codewords.slice(offset, offset + g1len);
      offset += g1len;
      blocks.push({ data, ec: rsEncode(data, ecLen) });
    }
    for (let i = 0; i < (g2n || 0); i++) {
      const data = codewords.slice(offset, offset + g2len);
      offset += g2len;
      blocks.push({ data, ec: rsEncode(data, ecLen) });
    }
    return blocks;
  }

  function interleave(blocks) {
    const maxData = Math.max(...blocks.map((b) => b.data.length));
    const ecLen = blocks[0].ec.length;
    const out = [];
    for (let i = 0; i < maxData; i++) {
      for (const b of blocks) if (i < b.data.length) out.push(b.data[i]);
    }
    for (let i = 0; i < ecLen; i++) {
      for (const b of blocks) out.push(b.ec[i]);
    }
    return out;
  }

  // ---- Matrix construction ----
  function makeMatrix(size) {
    const m = [];
    const reserved = [];
    for (let i = 0; i < size; i++) { m.push(new Uint8Array(size)); reserved.push(new Uint8Array(size)); }
    return { size, m, reserved };
  }

  function setModule(grid, r, c, dark, isReserved) {
    grid.m[r][c] = dark ? 1 : 0;
    if (isReserved) grid.reserved[r][c] = 1;
  }

  function drawFinderPattern(grid, r0, c0) {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = r0 + dr, c = c0 + dc;
        if (r < 0 || r >= grid.size || c < 0 || c >= grid.size) continue;
        const inRing = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6 && (dr === 0 || dr === 6 || dc === 0 || dc === 6);
        const inCore = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        const dark = inRing || inCore;
        setModule(grid, r, c, dark, true);
      }
    }
  }

  function drawAlignmentPattern(grid, r0, c0) {
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const ring = Math.max(Math.abs(dr), Math.abs(dc));
        setModule(grid, r0 + dr, c0 + dc, ring !== 1, true);
      }
    }
  }

  function drawFunctionPatterns(grid, version) {
    const size = grid.size;
    drawFinderPattern(grid, 0, 0);
    drawFinderPattern(grid, 0, size - 7);
    drawFinderPattern(grid, size - 7, 0);

    // Timing patterns.
    for (let i = 8; i < size - 8; i++) {
      setModule(grid, 6, i, i % 2 === 0, true);
      setModule(grid, i, 6, i % 2 === 0, true);
    }

    // Alignment patterns -- skip any that would overlap a finder pattern.
    const positions = ALIGNMENT_POSITIONS[version - 1];
    for (const r of positions) {
      for (const c of positions) {
        const nearFinder = (r < 9 && c < 9) || (r < 9 && c > size - 9) || (r > size - 9 && c < 9);
        if (!nearFinder) drawAlignmentPattern(grid, r, c);
      }
    }

    // Dark module (always present, position fixed by spec).
    setModule(grid, size - 8, 8, true, true);

    // Reserve format-info areas (content filled in later, once mask is chosen).
    for (let i = 0; i < 9; i++) {
      if (i !== 6) { grid.reserved[8][i] = 1; grid.reserved[i][8] = 1; }
    }
    for (let i = 0; i < 8; i++) {
      grid.reserved[8][size - 1 - i] = 1;
      grid.reserved[size - 1 - i][8] = 1;
    }
    grid.reserved[size - 8][8] = 1;

    // Reserve version-info areas (version >= 7).
    if (version >= 7) {
      for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) {
        grid.reserved[r][size - 11 + c] = 1;
        grid.reserved[size - 11 + c][r] = 1;
      }
    }
  }

  function placeData(grid, codewords) {
    const bits = [];
    for (const b of codewords) for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
    let bitIndex = 0;
    const size = grid.size;
    let upward = true;
    for (let colPair = size - 1; colPair > 0; colPair -= 2) {
      // Column 6 is the timing column -- shift the LOOP VARIABLE itself
      // left by one so every later pair shifts too (20,18,...,8,5,3,1),
      // not just the one pair that would otherwise land on it.
      if (colPair === 6) colPair = 5;
      for (let i = 0; i < size; i++) {
        const row = upward ? size - 1 - i : i;
        for (const c of [colPair, colPair - 1]) {
          if (grid.reserved[row][c]) continue;
          const bit = bitIndex < bits.length ? bits[bitIndex] : 0;
          grid.m[row][c] = bit;
          bitIndex++;
        }
      }
      upward = !upward;
    }
  }

  // The 8 standard mask pattern predicates (return true = flip this module).
  const MASK_FNS = [
    (r, c) => (r + c) % 2 === 0,
    (r) => r % 2 === 0,
    (r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
  ];

  function applyMask(grid, maskIndex, dataOnlyOriginal) {
    const fn = MASK_FNS[maskIndex];
    const size = grid.size;
    const out = [];
    for (let r = 0; r < size; r++) {
      out.push(new Uint8Array(size));
      for (let c = 0; c < size; c++) {
        const v = dataOnlyOriginal[r][c];
        out[r][c] = grid.reserved[r][c] ? v : (v ^ (fn(r, c) ? 1 : 0));
      }
    }
    return out;
  }

  function penaltyScore(matrix, size) {
    let score = 0;
    // Rule 1: runs of 5+ same-color modules, per row and column.
    for (let r = 0; r < size; r++) {
      let run = 1;
      for (let c = 1; c < size; c++) {
        if (matrix[r][c] === matrix[r][c - 1]) run++;
        else { if (run >= 5) score += 3 + (run - 5); run = 1; }
      }
      if (run >= 5) score += 3 + (run - 5);
    }
    for (let c = 0; c < size; c++) {
      let run = 1;
      for (let r = 1; r < size; r++) {
        if (matrix[r][c] === matrix[r - 1][c]) run++;
        else { if (run >= 5) score += 3 + (run - 5); run = 1; }
      }
      if (run >= 5) score += 3 + (run - 5);
    }
    // Rule 2: 2x2 blocks of the same colour.
    for (let r = 0; r < size - 1; r++) {
      for (let c = 0; c < size - 1; c++) {
        const v = matrix[r][c];
        if (v === matrix[r][c + 1] && v === matrix[r + 1][c] && v === matrix[r + 1][c + 1]) score += 3;
      }
    }
    // Rule 3: finder-like 1:1:3:1:1 patterns with 4 light modules on either side.
    const patternA = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    const patternB = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    const matches = (arr, i, pat) => {
      for (let k = 0; k < pat.length; k++) if (arr[i + k] !== pat[k]) return false;
      return true;
    };
    for (let r = 0; r < size; r++) {
      const row = matrix[r];
      for (let c = 0; c <= size - 11; c++) {
        if (matches(row, c, patternA) || matches(row, c, patternB)) score += 40;
      }
    }
    for (let c = 0; c < size; c++) {
      const col = []; for (let r = 0; r < size; r++) col.push(matrix[r][c]);
      for (let r = 0; r <= size - 11; r++) {
        if (matches(col, r, patternA) || matches(col, r, patternB)) score += 40;
      }
    }
    // Rule 4: overall dark-module ratio deviation from 50%.
    let dark = 0;
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) dark += matrix[r][c];
    const percent = (dark * 100) / (size * size);
    score += Math.floor(Math.abs(percent - 50) / 5) * 10;
    return score;
  }

  function encode(text, options) {
    const ecLevel = (options && options.ecLevel) || "M";
    if (!EC_BLOCK_INFO[ecLevel]) throw new Error("Invalid EC level: " + ecLevel);
    const version = pickVersion(text, ecLevel);
    if (version === null) throw new Error("Text too long to encode as a QR code, even at the lowest EC level.");

    const dataCodewordCount = totalDataCodewords(version, ecLevel);
    const dataCodewords = encodeBitStream(text, version, dataCodewordCount);
    const blocks = buildBlocks(dataCodewords, version, ecLevel);
    const allCodewords = interleave(blocks);

    const size = 17 + 4 * version;
    const grid = makeMatrix(size);
    drawFunctionPatterns(grid, version);
    placeData(grid, allCodewords);

    // Snapshot the modules laid down so far (data + function patterns,
    // pre-mask) -- masking XORs only the non-reserved (data) modules,
    // reading from this original so each mask candidate starts fresh.
    const original = grid.m.map((row) => row.slice());

    let best = null, bestScore = Infinity, bestMask = 0;
    for (let maskIndex = 0; maskIndex < 8; maskIndex++) {
      const candidate = applyMask(grid, maskIndex, original);
      const score = penaltyScore(candidate, size);
      if (score < bestScore) { bestScore = score; best = candidate; bestMask = maskIndex; }
    }

    // Format info (EC level + chosen mask), placed in the two reserved
    // bands -- ISO 18004 Figure 25's exact bit-to-cell mapping (this is
    // NOT a simple ascending/descending run in either band; verified
    // cell-by-cell against an independent reference implementation
    // after an earlier, more "obvious-looking" version of this mapping
    // turned out to place several bits at the wrong cells).
    const fBits = formatBits(ecLevel, bestMask);
    for (let i = 0; i < 15; i++) {
      const bit = (fBits >> i) & 1;
      if (i < 6) best[i][8] = bit;
      else if (i < 8) best[i + 1][8] = bit;
      else best[size - 15 + i][8] = bit;

      if (i < 8) best[8][size - i - 1] = bit;
      else if (i < 9) best[8][7] = bit;
      else best[8][15 - i - 1] = bit;
    }
    best[size - 8][8] = 1; // dark module -- always set, never a format bit

    if (version >= 7) {
      const vBits = versionBits(version);
      for (let i = 0; i < 18; i++) {
        const bit = (vBits >> i) & 1;
        const row = Math.floor(i / 3), col = i % 3;
        best[row][size - 11 + col] = bit;
        best[size - 11 + col][row] = bit;
      }
    }

    return { size, version, ecLevel, maskPattern: bestMask, modules: best };
  }

  function toSvgString(qr, options) {
    const opts = options || {};
    const moduleSize = opts.moduleSize || 4;
    const margin = opts.margin === undefined ? 4 : opts.margin;
    const dark = opts.darkColor || "#000000";
    const light = opts.lightColor || "#ffffff";
    const dim = (qr.size + margin * 2) * moduleSize;
    let path = "";
    for (let r = 0; r < qr.size; r++) {
      for (let c = 0; c < qr.size; c++) {
        if (qr.modules[r][c]) {
          const x = (c + margin) * moduleSize, y = (r + margin) * moduleSize;
          path += `M${x},${y}h${moduleSize}v${moduleSize}h${-moduleSize}z`;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="${dim}" height="${dim}" shape-rendering="crispEdges">` +
      `<rect width="${dim}" height="${dim}" fill="${light}"/>` +
      `<path d="${path}" fill="${dark}"/></svg>`;
  }

  function toCanvas(qr, canvas, options) {
    const opts = options || {};
    const moduleSize = opts.moduleSize || 4;
    const margin = opts.margin === undefined ? 4 : opts.margin;
    const dark = opts.darkColor || "#000000";
    const light = opts.lightColor || "#ffffff";
    const dim = (qr.size + margin * 2) * moduleSize;
    canvas.width = dim;
    canvas.height = dim;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, dim, dim);
    ctx.fillStyle = dark;
    for (let r = 0; r < qr.size; r++) {
      for (let c = 0; c < qr.size; c++) {
        if (qr.modules[r][c]) ctx.fillRect((c + margin) * moduleSize, (r + margin) * moduleSize, moduleSize, moduleSize);
      }
    }
    return canvas;
  }

  const QRCodeGen = { encode, toSvgString, toCanvas };
  if (typeof module !== "undefined" && module.exports) module.exports = QRCodeGen;
  if (global) global.QRCodeGen = QRCodeGen;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
