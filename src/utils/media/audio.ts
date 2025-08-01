import ffmpeg from "fluent-ffmpeg";
import path from "path";

export class AudioConverter {
  /**
   * Converts audio from any supported input format to MP3 using libmp3lame.
   * @param inputPath - Full path to the source audio file.
   * @param outputPath - Full path where the converted MP3 should be saved.
   * @returns A promise that resolves when conversion finishes.
   */
  static convertToMp3(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec("libmp3lame")
        .format("mp3")
        .on("error", (err) => {
          console.error("FFmpeg error:", err.message);
          reject(new Error(`FFmpeg failed: ${err.message}`));
        })
        .on("end", () => {
          console.log(`Conversion complete: ${path.basename(outputPath)}`);
          resolve();
        })
        .save(outputPath);
    });
  }

  static getAudioDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          return reject(err);
        }
        if (metadata && metadata.format && metadata.format.duration) {
          resolve(metadata.format.duration);
        } else {
          reject(new Error("Could not retrieve audio duration."));
        }
      });
    });
  }
}
