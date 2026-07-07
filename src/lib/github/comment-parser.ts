/**
 * Strips out Markdown blockquotes (lines starting with '>') and surrounding thread metadata 
 * to isolate only the new text the developer typed.
 */
export function parseDeveloperReply(commentBody: string): string {
  const lines = commentBody.split('\n');
  const cleanLines = lines.filter((line) => {
    const trimmed = line.trim();
    // Strip lines starting with '>' (blockquotes)
    if (trimmed.startsWith('>')) {
      return false;
    }
    // Strip empty lines or thread divider lines
    return true;
  });
  return cleanLines.join('\n').trim();
}
