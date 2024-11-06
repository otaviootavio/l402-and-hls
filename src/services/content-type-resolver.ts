import { type IContentTypeResolver } from "../types";

export class ContentTypeResolver implements IContentTypeResolver {
  getContentType(filePath: string): string {
    if (filePath.endsWith(".m3u8")) {
      return "application/vnd.apple.mpegurl";
    } else if (filePath.endsWith(".ts")) {
      return "video/MP2T";
    }
    return "application/octet-stream";
  }
}
