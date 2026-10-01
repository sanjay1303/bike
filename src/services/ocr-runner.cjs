/**
 * Standalone Node.js OCR Runner
 * Runs Tesseract outside of Next.js bundler to avoid worker thread bundle issues.
 */

const fs = require('fs');
const sharp = require('sharp');
const { createWorker } = require('tesseract.js');

async function main() {
  const filePath = process.argv[2];
  if (!filePath || !fs.existsSync(filePath)) {
    console.log(JSON.stringify({ success: false, reading: null, error: 'File not found' }));
    process.exit(0);
  }

  try {
    const buf = fs.readFileSync(filePath);
    const meta = await sharp(buf).metadata();
    const width = meta.width || 1000;
    const height = meta.height || 1000;

    const worker = await createWorker('eng');
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789KMkm/h. ',
    });

    // Center crop
    const centerBuf = await sharp(buf)
      .extract({
        left: Math.round(width * 0.2),
        top: Math.round(height * 0.2),
        width: Math.round(width * 0.6),
        height: Math.round(height * 0.6),
      })
      .resize(1400, 1400, { fit: 'inside' })
      .toBuffer();

    let bestReading = null;
    let bestConfidence = 0;
    let rawText = '';

    for (const angle of [45, 0, -45]) {
      for (const th of [155, 125]) {
        const preprocessed = await sharp(centerBuf)
          .rotate(angle)
          .grayscale()
          .threshold(th)
          .toBuffer();

        const res = await worker.recognize(preprocessed);
        const text = res.data.text.trim();
        if (text) rawText += ' ' + text;

        const digitMatches = text.match(/\b0?([1-9]\d{1,5}(?:\.\d)?)\b/g);
        if (digitMatches) {
          for (const dm of digitMatches) {
            const cleaned = dm.replace(/^0+/, '');
            const num = parseFloat(cleaned);
            if (!isNaN(num) && num >= 1 && num <= 999999) {
              const candidate = num > 50000 && !cleaned.includes('.') ? Math.floor(num / 10) : num;
              if (bestReading === null || res.data.confidence > bestConfidence) {
                bestReading = Math.round(candidate * 10) / 10;
                bestConfidence = res.data.confidence;
              }
            }
          }
        }
      }
    }

    await worker.terminate();

    if (bestReading !== null) {
      console.log(JSON.stringify({
        success: true,
        reading: bestReading,
        confidence: Math.max(0.7, Math.min(0.95, bestConfidence / 100)),
        confidenceLabel: bestConfidence > 60 ? 'HIGH' : 'MEDIUM',
        rawText: rawText.slice(0, 200),
      }));
    } else {
      console.log(JSON.stringify({
        success: false,
        reading: null,
        confidence: 0,
        confidenceLabel: 'NONE',
        errorMessage: 'Could not detect digits with confidence'
      }));
    }
  } catch (err) {
    console.log(JSON.stringify({
      success: false,
      reading: null,
      error: err.message
    }));
  }
}

main();
