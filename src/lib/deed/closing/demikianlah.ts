import { createClosingDivider } from "./divider";

export interface DemikianlahConfig {
  notarisTempat: string;
  saksi1Nama?: string;
  saksi1Text: string;
  saksi2Nama?: string;
  saksi2Text: string;
  notaryName?: string;
}

export function createDemikianlah(config: DemikianlahConfig) {
  // Format exactly as Akta RUPS Tahunan
  const blocks: any[] = [
    ...createClosingDivider("DEMIKIANLAH AKTA INI"),
    {
      type: "p",
      runs: [
        {
          text: `Dibuat sebagai minuta dan dilangsungkan di ${config.notarisTempat}, pada hari dan tanggal serta jam sebagaimana disebutkan pada kepala akta ini dengan dihadiri oleh :`,
        },
      ],
    },
    {
      type: "saksi",
      num: 1,
      number: 1, // Triggers createNumberedP in AktaTemplate for RUPS LB format
      runs: [
        { text: config.saksi1Nama || "", bold: false },
        { text: config.saksi1Text },
      ],
    },
    {
      type: "saksi",
      num: 2,
      number: 2, // Triggers createNumberedP in AktaTemplate for RUPS LB format
      runs: [
        { text: config.saksi2Nama || "", bold: false },
        { text: config.saksi2Text },
      ],
      spaceAfter: false,
    },
    {
      type: "list",
      bullet: "-",
      indentTabs: 0,
      runs: [{ text: `Untuk sementara berada di ${config.notarisTempat};` }],
      spaceAfter: true,
    },
    {
      type: "p",
      runs: [{ text: "Keduanya pegawai Kantor Notaris, sebagai saksi-saksi." }]
    },
    {
      type: "p",
      runs: [
        { text: "Segera setelah akta ini dibacakan oleh saya, Notaris kepada penghadap dan saksi-saksi, maka ditanda-tanganilah akta ini oleh penghadap, saksi-saksi dan saya, Notaris. Serta penghadap membubuhkan sidik jari sebelah kanan pada lembaran tersendiri di hadapan saya, Notaris dan saksi-saksi, yang dilekatkan pada minuta akta ini." }
      ]
    },
    {
      type: "p",
      runs: [{ text: "Dilangsungkan dengan tanpa perubahan." }],
    },
    {
      type: "p",
      runs: [{ text: "Minuta Akta ini telah ditanda-tangani dengan sempurna." }],
      indentTabs: 1,
    },
    {
      type: "p",
      runs: [{ text: "Diberikan sebagai salinan yang sama bunyinya." }],
      indentTabs: 2,
      spaceAfter: true,
    },
  ];

  if (config.notaryName) {
    blocks.push({
      type: "notaris",
      domicile: config.notarisTempat,
      name: config.notaryName,
    });
  }

  return blocks;
}
