export function createOpeningTitle(config: {
  title: string;
  subtitle?: string;
  companyName?: string;
  align?: "center" | "left" | "right-center";
}) {
  const blocks: any[] = [];
  
  if (config.title) {
    blocks.push({
      type: "p",
      align: config.align || "center",
      runs: [{ text: config.title, bold: true }]
    });
  }
  if (config.subtitle) {
    blocks.push({
      type: "p",
      align: config.align || "center",
      runs: [{ text: config.subtitle, bold: true }]
    });
  }
  if (config.companyName) {
    blocks.push({
      type: "p",
      align: config.align || "center",
      runs: [{ text: config.companyName, bold: true }]
    });
  }
  
  return blocks;
}
