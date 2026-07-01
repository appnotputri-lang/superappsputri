export function createOpeningNumber(number: string, align: "center" | "left" | "right-center" = "center") {
  return [
    {
      type: "p",
      align,
      runs: [{ text: `Nomor : ${number}` }]
    }
  ];
}
