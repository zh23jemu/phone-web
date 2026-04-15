const CP1252_BYTE_MAP = {
    0x20AC: 0x80,
    0x201A: 0x82,
    0x0192: 0x83,
    0x201E: 0x84,
    0x2026: 0x85,
    0x2020: 0x86,
    0x2021: 0x87,
    0x02C6: 0x88,
    0x2030: 0x89,
    0x0160: 0x8A,
    0x2039: 0x8B,
    0x0152: 0x8C,
    0x017D: 0x8E,
    0x2018: 0x91,
    0x2019: 0x92,
    0x201C: 0x93,
    0x201D: 0x94,
    0x2022: 0x95,
    0x2013: 0x96,
    0x2014: 0x97,
    0x02DC: 0x98,
    0x2122: 0x99,
    0x0161: 0x9A,
    0x203A: 0x9B,
    0x0153: 0x9C,
    0x017E: 0x9E,
    0x0178: 0x9F
};

export function decodeUtf8Bytes(bytes) {
    let result = '';

    for (let i = 0; i < bytes.length; i += 1) {
        const byte1 = bytes[i];

        if (byte1 < 0x80) {
            result += String.fromCharCode(byte1);
            continue;
        }

        if ((byte1 & 0xe0) === 0xc0 && i + 1 < bytes.length) {
            const byte2 = bytes[i + 1];
            result += String.fromCharCode(((byte1 & 0x1f) << 6) | (byte2 & 0x3f));
            i += 1;
            continue;
        }

        if ((byte1 & 0xf0) === 0xe0 && i + 2 < bytes.length) {
            const byte2 = bytes[i + 1];
            const byte3 = bytes[i + 2];
            result += String.fromCharCode(
                ((byte1 & 0x0f) << 12) |
                ((byte2 & 0x3f) << 6) |
                (byte3 & 0x3f)
            );
            i += 2;
            continue;
        }

        if ((byte1 & 0xf8) === 0xf0 && i + 3 < bytes.length) {
            const byte2 = bytes[i + 1];
            const byte3 = bytes[i + 2];
            const byte4 = bytes[i + 3];
            const codePoint =
                ((byte1 & 0x07) << 18) |
                ((byte2 & 0x3f) << 12) |
                ((byte3 & 0x3f) << 6) |
                (byte4 & 0x3f);
            result += String.fromCodePoint(codePoint);
            i += 3;
            continue;
        }

        throw new Error(`invalid-utf8-byte:${byte1}`);
    }

    return result;
}

export function fixGarbledText(text) {
    if (typeof text !== 'string' || !text) {
        return text;
    }

    try {
        const bytes = Array.from(text).map(char => {
            const code = char.charCodeAt(0);
            if (code <= 0xff) {
                return code;
            }
            if (CP1252_BYTE_MAP[code] !== undefined) {
                return CP1252_BYTE_MAP[code];
            }
            throw new Error(`unsupported-char:${code}`);
        });

        const decoded = decodeUtf8Bytes(bytes);
        return decoded || text;
    } catch (error) {
        return text;
    }
}
