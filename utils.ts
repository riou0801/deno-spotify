// utils.ts
export async function writeTextFile(filePath: string, content: string) {
  await Deno.writeTextFile(filePath, content);
}

export async function readTextFile(filePath: string): Promise<string> {
  return await Deno.readTextFile(filePath);
}
