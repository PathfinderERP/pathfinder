import { exec } from "child_process";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly set FFmpeg path if provided in .env
if (process.env.FFMPEG_PATH) {
    ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
} else if (process.platform === 'win32') {
    // Try common Windows locations if not in PATH
    const commonPaths = [
        'C:\\ffmpeg\\bin\\ffmpeg.exe',
        path.join(__dirname, '../../ffmpeg/bin/ffmpeg.exe'),
        path.join(__dirname, '../../bin/ffmpeg.exe')
    ];
    for (const p of commonPaths) {
        if (fs.existsSync(p)) {
            ffmpeg.setFfmpegPath(p);
            break;
        }
    }
}

// CONFIGURATION
// Assuming whisper.cpp is in the backend root
const WHISPER_PATH = path.join(__dirname, "../whisper.cpp");
const MODEL_PATH = path.join(WHISPER_PATH, "models/ggml-base.en.bin");
// On Windows, the executable might be main.exe or in a specific build folder
const EXECUTABLE = process.platform === 'win32'
    ? (fs.existsSync(path.join(WHISPER_PATH, "whisper-cli.exe"))
        ? path.join(WHISPER_PATH, "whisper-cli.exe")
        : path.join(WHISPER_PATH, "main.exe"))
    : (fs.existsSync(path.join(WHISPER_PATH, "whisper-cli"))
        ? path.join(WHISPER_PATH, "whisper-cli")
        : path.join(WHISPER_PATH, "main"));

if (!fs.existsSync(EXECUTABLE)) {
    console.warn(`WARNING: Whisper executable not found at ${EXECUTABLE}. Local transcription will fail.`);
}

/**
 * 1. Convert MP3/Audio to 16kHz WAV (Required by Whisper.cpp)
 */
const convertToWav = (inputPath, outputPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .audioChannels(1)         // Audio Channels: 1 (Mono)
            .audioFrequency(16000)    // Audio Rate: 16kHz
            .on("end", () => resolve(outputPath))
            .on("error", (err) => reject(err))
            .save(outputPath);
    });
};

/**
 * 2. Run Whisper on the WAV file
 */
const runWhisper = (wavPath) => {
    return new Promise((resolve, reject) => {
        // Command: ./main -m models/ggml-base.en.bin -f file.wav -otxt
        const command = `"${EXECUTABLE}" -m "${MODEL_PATH}" -f "${wavPath}" --output-txt`;
        console.log("Executing Whisper Command:", command);

        exec(command, (error, stdout, stderr) => {
            if (stdout) console.log("Whisper STDOUT:", stdout);
            if (stderr) console.error("Whisper STDERR:", stderr);

            if (error) {
                console.error("Whisper Exec Error:", error);
                return reject(error);
            }

            // Whisper.cpp usually saves output to file.wav.txt
            const resultPath = wavPath + ".txt";

            if (fs.existsSync(resultPath)) {
                const text = fs.readFileSync(resultPath, "utf8");
                console.log("Transcription result found in file.");
                // Cleanup: Delete the text file
                fs.unlinkSync(resultPath);
                resolve(text);
            } else {
                console.log("No result file found, using STDOUT.");
                // Fallback to stdout if no file created
                resolve(stdout);
            }
        });
    });
};

/**
 * MAIN FUNCTION: Orchestrates the whole process
 */
export const transcribeLocal = async (audioBuffer, originalName) => {
    // Use a unique name for temporary files
    const tempId = Date.now();
    const tempInputPath = path.join(__dirname, `../temp_input_${tempId}_${originalName}`);
    const wavPath = path.join(__dirname, `../temp_output_${tempId}.wav`);

    try {
        // Write buffer to temp file
        fs.writeFileSync(tempInputPath, audioBuffer);

        console.log("Converting to WAV...");
        await convertToWav(tempInputPath, wavPath);

        console.log("Transcribing with Whisper.cpp...");
        const text = await runWhisper(wavPath);

        // Cleanup: Delete temp files
        if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
        if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);

        return text.trim();
    } catch (error) {
        console.error("Transcription Failed:", error);
        // Cleanup on error
        if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
        if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
        throw error;
    }
};
