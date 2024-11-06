import path from "path";
import type { IPlaylistRewriter } from "../types";

export class PlaylistRewriter implements IPlaylistRewriter {
  rewrite(content: string, proxyPath: string, currentPath: string): string {
    const lines = content.split("\n");
    const newLines = lines.map((line) => {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith("#") || !trimmedLine) {
        return line;
      }

      if (trimmedLine.startsWith("http")) {
        return line;
      }

      if (trimmedLine.endsWith(".m3u8") || trimmedLine.endsWith(".ts")) {
        const currentDir = path.dirname(currentPath);
        const relativePath = path
          .join(currentDir, trimmedLine)
          .replace(/\\/g, "/");
        return `${proxyPath}/${relativePath}`;
      }

      return line;
    });

    return newLines.join("\n");
  }
}
