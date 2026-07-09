import { FormatToken } from "../notaryWrapper";

export type Block =
  | {
      type: "p";
      runs: FormatToken[];
      align?: "left" | "center" | "right" | "right-center" | "both";
      indent?: boolean;
      indentTabs?: number;
      spaceAfter?: boolean;
      number?: number;
      subNumber?: number | string;
      kbliDesc?: boolean;
    }
  | {
      type: "list";
      bullet: string;
      runs: FormatToken[];
      spaceAfter?: boolean;
      number?: number;
      indentTabs?: number;
      indentStyle?: "keputusan";
    }
  | {
      type: "shareholder-list";
      bullet: string;
      name: string;
      sharesText: string;
      rpText: string;
    }
  | {
      type: "management-list";
      name: string;
      position: string;
    }
  | { type: "divider"; text: string }
  | { type: "saksi"; number: number; runs: FormatToken[]; spaceAfter?: boolean }
  | {
      type: "participantSigs";
      participants: any[];
    }
  | {
      type: "table";
      headers: string[];
      rows: (FormatToken[] | string)[][];
      widths?: number[];
    }
  | { type: "br" }
  | { type: "pageBreak" }
  | { type: "static"; content: string };
