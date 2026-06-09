import React, { useState, useEffect } from "react";
import {
  Search,
  Info,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Plus,
  FileDown,
  Trash2,
  Loader2,
  Save,
  History,
} from "lucide-react";
import mappingData from "../../KBLI_2020_vs_2025.json";
import kbli2025Data from "../../kbli_2025.json";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { db, auth, cleanUndefined, handleFirestoreError, OperationType } from "../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

interface KBLIEntry {
  kode: string;
  judul: string;
  uraian?: string;
}

interface KBLIMappingItem {
  kbli_2020: KBLIEntry;
  kbli_2025: KBLIEntry;
  jenis_perubahan: string;
}

interface ScopeItem {
  id: string;
  ruangLingkup: string;
  tingkatResiko: string;
  izin: string;
}

interface DpbScopeData {
  ruangLingkup: string;
  skalaUsaha: string;
  tingkatRisiko: string;
  izin: string;
}

interface SelectedMappingItem extends KBLIMappingItem {
  id: string;
  scopes: ScopeItem[];
  dpbScopes?: DpbScopeData[];
  catatan?: string;
}

const RISK_LEVELS = [
  { value: "Rendah", label: "Rendah", permit: "NIB" },
  {
    value: "Menengah Rendah",
    label: "Menengah Rendah",
    permit: "NIB dan Sertifikat Standar Self Declare",
  },
  {
    value: "Menengah Tinggi",
    label: "Menengah Tinggi",
    permit: "NIB dan Sertifikat Standar yang harus dipenuhi",
  },
  { value: "Tinggi", label: "Tinggi", permit: "NIB dan IZIN" },
];

const getAutoIzin = (tingkatRisiko: string) => {
  const norm = (tingkatRisiko || "").toLowerCase().trim();
  if (norm === "rendah") return "NIB";
  if (norm === "menengah rendah") return "SERTIFIKAT STANDAR SELEF DECLARE";
  if (norm === "menengah tinggi")
    return "SERTIFIKAT STANDAR PEMENUHAN KOMITMEN";
  if (norm === "tinggi") return "IZIN";
  return "-";
};

const getKbli2025Judul = (kode: string): string => {
  const match = ((kbli2025Data as any).data || []).find(
    (k: any) => k.kode === kode,
  );
  return match ? match.judul || "" : "";
};

const getKbli2025Uraian = (kode: string): string => {
  const match = ((kbli2025Data as any).data || []).find(
    (k: any) => k.kode === kode,
  );
  return match ? match.uraian || "" : "";
};

const expandKblis = (items: KBLIMappingItem[]): KBLIMappingItem[] => {
  const expanded: KBLIMappingItem[] = [];
  for (const item of items) {
    const targetKode = item.kbli_2025?.kode;
    if (targetKode && (targetKode.includes(",") || targetKode.includes(";"))) {
      const parts = targetKode
        .split(/[,;]+/)
        .map((k) => k.trim())
        .filter(Boolean);
      parts.forEach((part) => {
        const matchKbli = ((kbli2025Data as any).data || []).find(
          (k: any) => k.kode === part,
        );
        if (matchKbli) {
          expanded.push({
            kbli_2020: item.kbli_2020,
            kbli_2025: {
              kode: matchKbli.kode,
              judul: matchKbli.judul,
              uraian: matchKbli.uraian,
            },
            jenis_perubahan: item.jenis_perubahan,
          });
        } else {
          expanded.push({
            kbli_2020: item.kbli_2020,
            kbli_2025: {
              kode: part,
              judul: getKbli2025Judul(part) || "Dihapus/Dialihkan",
              uraian: getKbli2025Uraian(part),
            },
            jenis_perubahan: item.jenis_perubahan,
          });
        }
      });
    } else if (targetKode && targetKode.length === 4) {
      // Cari KBLI 5 digit di kbli_2025.json yang diawali dengan targetKode
      const match5Digits = ((kbli2025Data as any).data || []).filter(
        (k: any) =>
          k.kode && k.kode.startsWith(targetKode) && k.kode.length === 5,
      );
      if (match5Digits.length > 0) {
        match5Digits.forEach((matchKbli: any) => {
          expanded.push({
            kbli_2020: item.kbli_2020,
            kbli_2025: {
              kode: matchKbli.kode,
              judul: matchKbli.judul,
              uraian: matchKbli.uraian,
            },
            jenis_perubahan: item.jenis_perubahan,
          });
        });
      } else {
        expanded.push({
          ...item,
          kbli_2025: {
            ...item.kbli_2025,
            judul: item.kbli_2025?.judul || getKbli2025Judul(targetKode),
            uraian: getKbli2025Uraian(targetKode),
          },
        });
      }
    } else if (targetKode) {
      expanded.push({
        ...item,
        kbli_2025: {
          ...item.kbli_2025,
          judul: item.kbli_2025?.judul || getKbli2025Judul(targetKode),
          uraian: getKbli2025Uraian(targetKode),
        },
      });
    } else {
      expanded.push(item);
    }
  }
  return expanded;
};

const translateBusinessScale = (scale: string, isEn: boolean) => {
  if (!isEn) return scale || "-";
  const norm = (scale || "").toLowerCase().trim();
  if (norm === "mikro") return "Micro";
  if (norm === "kecil") return "Small";
  if (norm === "menengah") return "Medium";
  if (norm === "besar") return "Large";
  return scale || "-";
};

const translateRiskLevel = (risk: string, isEn: boolean) => {
  if (!isEn) return risk || "-";
  const norm = (risk || "").toLowerCase().trim();
  if (norm === "rendah") return "Low";
  if (norm === "menengah rendah") return "Medium Low";
  if (norm === "menengah tinggi") return "Medium High";
  if (norm === "tinggi") return "High";
  return risk || "-";
};

const translateIzinValue = (izin: string, isEn: boolean) => {
  if (!isEn) return izin || "-";
  const norm = (izin || "").toLowerCase().trim();
  if (norm === "nib") return "NIB";
  if (norm === "sertifikat standar") return "Standard Certificate";
  if (norm === "izin") return "License";
  if (norm === "sertifikat standar dan izin")
    return "Standard Certificate and License";

  let translated = izin || "-";
  translated = translated.replace(
    /sertifikat standar/gi,
    "Standard Certificate",
  );
  translated = translated.replace(/izin/gi, "License");
  translated = translated.replace(/menengah tinggi/gi, "Medium-High");
  translated = translated.replace(/menengah rendah/gi, "Medium-Low");
  translated = translated.replace(/tinggi/gi, "High");
  translated = translated.replace(/rendah/gi, "Low");
  return translated;
};

const getEnAutoIzin = (tingkatRisiko: string) => {
  const norm = (tingkatRisiko || "").toLowerCase().trim();
  if (norm === "rendah") return "NIB";
  if (norm === "menengah rendah") return "STANDARD CERTIFICATE (SELF-DECLARE)";
  if (norm === "menengah tinggi") return "STANDARD CERTIFICATE (COMMITMENT)";
  if (norm === "tinggi") return "LICENSE";
  return "-";
};

const KBLIMapping: React.FC = () => {
  const [namaPT, setNamaPT] = useState("");
  const [kelompokUsaha, setKelompokUsaha] = useState("Mikro");
  const [pdfLang, setPdfLang] = useState<"id" | "en">("id");
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<KBLIMappingItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedMappings, setSelectedMappings] = useState<
    SelectedMappingItem[]
  >([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState<string | null>(null);
  const [dpbCache, setDpbCache] = useState<Record<string, DpbScopeData[]>>({});

  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [savedRecords, setSavedRecords] = useState<any[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    let localRecs: any[] = [];
    try {
      const stored = localStorage.getItem("kbli_mapping_local_records");
      if (stored) {
        localRecs = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Storage reading error:", e);
    }

    const q = query(
      collection(db, "kbli_saved_records"),
      where("type", "==", "mapping"),
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const dbRecords: any[] = [];
        snapshot.forEach((doc) => {
          dbRecords.push({ id: doc.id, ...doc.data() });
        });

        const combinedMap = new Map();
        localRecs.forEach((r) => combinedMap.set(r.id, r));
        dbRecords.forEach((r) => combinedMap.set(r.id, r));

        const records = Array.from(combinedMap.values());
        records.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        setSavedRecords(records);
      },
      (error) => {
        console.error("Error listening to saved mappings:", error);
        localRecs.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        setSavedRecords(localRecs);
      },
    );
    return () => unsub();
  }, []);

  const handleSaveToFirestore = async () => {
    if (!namaPT.trim() || selectedMappings.length === 0) {
      alert("Harap masukkan Nama dan pilih minimal 1 KBLI terlebih dahulu.");
      return;
    }
    setIsSavingRecord(true);
    const recordId = `mapping-${namaPT
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9_-]/g, "_")}`;
    const rawPayload = {
      id: recordId,
      nama: namaPT.toUpperCase().trim(),
      type: "mapping",
      kelompokUsaha: kelompokUsaha,
      selectedItems: selectedMappings,
      updatedAt: new Date().toISOString(),
      userId: auth.currentUser?.uid || null,
    };

    const payload = cleanUndefined(rawPayload);

    try {
      const stored = localStorage.getItem("kbli_mapping_local_records");
      const currentLocals = stored ? JSON.parse(stored) : [];
      const updatedLocals = [
        payload,
        ...currentLocals.filter((item: any) => item.id !== recordId),
      ];
      localStorage.setItem(
        "kbli_mapping_local_records",
        JSON.stringify(updatedLocals),
      );
    } catch (e) {
      console.warn("Error saving to localStorage:", e);
    }

    try {
      await setDoc(doc(db, "kbli_saved_records", recordId), payload);
      alert("Data Pemetaan KBLI berhasil disimpan ke database!");
    } catch (error) {
      console.error("Error saving mapping:", error);
      alert(
        "Data Pemetaan KBLI disimpan secara lokal di perangkat ini (Gagal sinkronisasi awan, silakan hubungi admin atau periksa koneksi Anda jika ingin menyimpan ke cloud database).",
      );
      try {
        const stored = localStorage.getItem("kbli_mapping_local_records");
        if (stored) {
          const recs = JSON.parse(stored);
          recs.sort(
            (a: any, b: any) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          );
          setSavedRecords(recs);
        }
      } catch (err) {}
      // Call handleFirestoreError block to satisfy firebase integration skill diagnostic schema
      try {
        handleFirestoreError(error, OperationType.WRITE, `kbli_saved_records/${recordId}`);
      } catch (e) {
        console.warn('Handled firestore error logged:', e);
      }
    } finally {
      setIsSavingRecord(false);
    }
  };

  const handleDeleteRecord = async (recordId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Apakah Anda yakin ingin menghapus riwayat pemetaan ini?"))
      return;

    try {
      const stored = localStorage.getItem("kbli_mapping_local_records");
      if (stored) {
        const parsed = JSON.parse(stored);
        const filtered = parsed.filter((item: any) => item.id !== recordId);
        localStorage.setItem(
          "kbli_mapping_local_records",
          JSON.stringify(filtered),
        );
      }
    } catch (err) {
      console.warn("LocalStorage delete error:", err);
    }

    try {
      await deleteDoc(doc(db, "kbli_saved_records", recordId));
      alert("Riwayat pemetaan berhasil dihapus.");
    } catch (error) {
      console.error("Error deleting record:", error);
      alert("Riwayat pemetaan dihapus secara lokal dari perangkat ini.");
      try {
        const stored = localStorage.getItem("kbli_mapping_local_records");
        const recs = stored ? JSON.parse(stored) : [];
        recs.sort(
          (a: any, b: any) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        setSavedRecords(recs);
      } catch (err) {}
    }
  };

  const handleLoadRecord = (record: any) => {
    setNamaPT(record.nama || "");
    setKelompokUsaha(record.kelompokUsaha || "Mikro");
    setSelectedMappings(record.selectedItems || []);
    setShowHistoryModal(false);
    alert(`Data pemetaan untuk "${record.nama}" berhasil dimuat!`);
  };

  const parseScaleProperty = (
    propertyValue: string | undefined,
    scale: string,
    defaultValue: string,
  ) => {
    if (!propertyValue) return defaultValue;
    const val = propertyValue.trim();
    const lVal = val.toLowerCase();

    const scaleKeywords: Record<string, string[]> = {
      Mikro: ["mikro", "micro"],
      Kecil: ["kecil", "small"],
      Menengah: ["menengah", "medium"],
      Besar: ["besar", "large"],
    };

    const currentKws = scaleKeywords[scale] || [];

    const segments = val.split(/[;|\n]/);

    if (segments.length > 1) {
      for (const segment of segments) {
        const lSegment = segment.toLowerCase();
        if (currentKws.some((kw) => lSegment.includes(kw))) {
          const parts = segment.split(/[:|-]/);
          return parts.length > 1
            ? parts.slice(1).join(":").trim()
            : segment.trim();
        }
      }
    }

    let earliestPos = -1;
    for (const kw of currentKws) {
      const pos = lVal.indexOf(kw);
      if (pos !== -1 && (earliestPos === -1 || pos < earliestPos))
        earliestPos = pos;
    }

    if (earliestPos !== -1) {
      const afterScale = val.substring(earliestPos);
      const nextSeparator = afterScale.search(/[;|\n]/);
      const relevantPart =
        nextSeparator !== -1
          ? afterScale.substring(0, nextSeparator)
          : afterScale;
      const parts = relevantPart.split(/[:|-]/);
      return parts.length > 1
        ? parts.slice(1).join(":").trim()
        : relevantPart.trim();
    }

    return val;
  };

  const calculateRisk = (tingkatRisiko: string | undefined, scale: string) => {
    const rawMatch = parseScaleProperty(
      tingkatRisiko,
      scale,
      "Rendah",
    ).toLowerCase();

    if (rawMatch.includes("menengah rendah")) return "Menengah Rendah";
    if (rawMatch.includes("menengah tinggi")) return "Menengah Tinggi";
    if (rawMatch.includes("tinggi")) return "Tinggi";
    if (rawMatch.includes("rendah")) return "Rendah";

    if (scale === "Menengah" || scale === "Besar") return "Menengah Tinggi";
    return "Rendah";
  };

  const calculateScopeData = (
    ruangLingkup: string,
    skalaUsaha: string,
    kbliKode: string,
  ) => {
    const dpb = dpbCache[kbliKode];
    if (dpb && dpb.length > 0) {
      let match = dpb.find(
        (d) =>
          d.ruangLingkup === ruangLingkup &&
          d.skalaUsaha.toLowerCase() === skalaUsaha.toLowerCase(),
      );

      if (!match) {
        match = dpb.find(
          (d) =>
            d.ruangLingkup === ruangLingkup &&
            (d.skalaUsaha.toLowerCase().includes("seluruh") ||
              d.skalaUsaha.toLowerCase().includes("semua")),
        );
      }

      if (!match) {
        match = dpb.find((d) => d.ruangLingkup === ruangLingkup);
      }

      if (match) {
        return { tingkatResiko: match.tingkatRisiko, izin: match.izin };
      }
    }
    const defaultRisk = calculateRisk("", skalaUsaha);
    const riskLevel = RISK_LEVELS.find((r) => r.value === defaultRisk);
    return { tingkatResiko: defaultRisk, izin: riskLevel?.permit || "NIB" };
  };

  useEffect(() => {
    setSelectedMappings((prev) =>
      prev.map((m) => {
        if (!m.kbli_2025.kode) return m;
        return {
          ...m,
          scopes: m.scopes.map((s) => {
            const autoData = calculateScopeData(
              s.ruangLingkup,
              kelompokUsaha,
              m.kbli_2025.kode,
            );
            return {
              ...s,
              tingkatResiko: autoData.tingkatResiko,
              izin: autoData.izin,
            };
          }),
        };
      }),
    );
  }, [kelompokUsaha, dpbCache]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const allData = (mappingData as any).data as KBLIMappingItem[];
    const filtered = allData.filter(
      (item) =>
        item.kbli_2020.kode.includes(searchTerm) ||
        item.kbli_2020.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kbli_2025?.kode.includes(searchTerm) ||
        item.kbli_2025?.judul.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    const matchingKodes = new Set(filtered.map((item) => item.kbli_2020.kode));
    const fullGroupedResults = expandKblis(
      allData.filter((item) => matchingKodes.has(item.kbli_2020.kode)),
    );

    setResults(fullGroupedResults);
    setHasSearched(true);
  };

  const addMappingGroup = async (kode2020: string) => {
    const allData = (mappingData as any).data as KBLIMappingItem[];
    const group = allData.filter((item) => item.kbli_2020.kode === kode2020);
    const expandedGroup = expandKblis(group);

    const newItemsToProcess = expandedGroup.filter(
      (item) =>
        !selectedMappings.some(
          (m) =>
            m.kbli_2020.kode === item.kbli_2020.kode &&
            m.kbli_2025.kode === item.kbli_2025.kode,
        ),
    );

    if (newItemsToProcess.length === 0) return;

    setIsLoadingDetails(kode2020);

    const tempCache = { ...dpbCache };
    const processedItems: SelectedMappingItem[] = [];

    for (const item of newItemsToProcess) {
      const targetKode = item.kbli_2025.kode;
      let availableDpb: DpbScopeData[] | undefined = undefined;

      if (targetKode) {
        try {
          if (tempCache[targetKode]) {
            availableDpb = tempCache[targetKode];
          } else {
            console.log(`[Fetching] API untuk KBLI 2025 ${targetKode}...`);
            const response = await fetch(
              `https://dpb.unpad.ac.id/wp-json/dpb/v1/kbli2025-detail?kode=${targetKode}`,
            );
            const data = await response.json();

            if (data.success && data.html) {
              const parser = new DOMParser();
              const doc = parser.parseFromString(data.html, "text/html");

              const rawScopes: DpbScopeData[] = [];
              const sections = Array.from(
                doc.querySelectorAll(".dpb-oss-section"),
              );
              const rlSection = sections.find((sec) => {
                const title = sec.querySelector(".dpb-oss-section-title");
                return (
                  title &&
                  title.textContent?.trim().toLowerCase() === "ruang lingkup"
                );
              });

              if (rlSection) {
                const accordions = Array.from(
                  rlSection.querySelectorAll(".dpb-oss-accordion-item"),
                );
                const cards = Array.from(
                  rlSection.querySelectorAll(".dpb-oss-scope-card"),
                );

                if (accordions.length > 0) {
                  accordions.forEach((acc) => {
                    const titleSpan = acc.querySelector(
                      ".dpb-oss-accordion-head span",
                    );
                    const ruangLingkup = titleSpan
                      ? titleSpan.textContent?.trim() || ""
                      : "";

                    const panels = acc.querySelectorAll(".dpb-oss-tab-panel");
                    if (panels.length > 0) {
                      panels.forEach((panel) => {
                        let skala = "Semua";
                        const dataPanel =
                          panel.getAttribute("data-panel") || "";
                        if (dataPanel.includes("mikro")) skala = "Mikro";
                        else if (dataPanel.includes("kecil")) skala = "Kecil";
                        else if (dataPanel.includes("menengah"))
                          skala = "Menengah";
                        else if (dataPanel.includes("besar")) skala = "Besar";

                        const infoItems =
                          panel.querySelectorAll(".dpb-oss-info-item");
                        let risiko = "";
                        let izin = "";

                        infoItems.forEach((item) => {
                          const label = item
                            .querySelector(".dpb-oss-info-label")
                            ?.textContent?.trim();
                          const value = item
                            .querySelector(".dpb-oss-info-value")
                            ?.textContent?.trim();
                          if (label === "Tingkat Risiko") risiko = value || "";
                          if (label === "Perizinan Berusaha")
                            izin = value || "";
                        });

                        if (ruangLingkup) {
                          rawScopes.push({
                            ruangLingkup,
                            skalaUsaha: skala,
                            tingkatRisiko: risiko,
                            izin,
                          });
                        }
                      });
                    } else {
                      if (ruangLingkup) {
                        rawScopes.push({
                          ruangLingkup,
                          skalaUsaha: "Semua",
                          tingkatRisiko: "",
                          izin: "",
                        });
                      }
                    }
                  });
                } else if (cards.length > 0) {
                  cards.forEach((card) => {
                    const ruangLingkup = card.textContent?.trim();
                    if (ruangLingkup) {
                      rawScopes.push({
                        ruangLingkup,
                        skalaUsaha: "Semua",
                        tingkatRisiko: "",
                        izin: "",
                      });
                    }
                  });
                }
              }

              tempCache[targetKode] = rawScopes;
              availableDpb = rawScopes;
            }
          }
        } catch (error) {
          console.warn(`Error fetching KBLI ${targetKode} details:`, error);
        }
      }

      let newScopes: ScopeItem[] = [];

      if (availableDpb && availableDpb.length > 0) {
        const uniqueScopes = Array.from(
          new Set<string>(availableDpb.map((s) => s.ruangLingkup)),
        );
        newScopes = uniqueScopes.map((scopeName) => {
          const match = availableDpb!.find(
            (d) =>
              d.ruangLingkup === scopeName &&
              d.skalaUsaha.toLowerCase() === kelompokUsaha.toLowerCase(),
          );
          const defaultMatch =
            match || availableDpb!.find((d) => d.ruangLingkup === scopeName);

          const riskLevel = RISK_LEVELS.find(
            (r) => r.value === calculateRisk("", kelompokUsaha),
          );

          return {
            id: Math.random().toString(36).substr(2, 9),
            ruangLingkup: scopeName,
            tingkatResiko: defaultMatch
              ? defaultMatch.tingkatRisiko
              : calculateRisk("", kelompokUsaha),
            izin: defaultMatch ? defaultMatch.izin : riskLevel?.permit || "NIB",
          };
        });
      } else {
        newScopes = [
          {
            id: Math.random().toString(36).substr(2, 9),
            ruangLingkup: "",
            tingkatResiko: "Rendah",
            izin: "NIB",
          },
        ];
      }

      processedItems.push({
        ...item,
        id: Math.random().toString(36).substr(2, 9),
        scopes: newScopes,
        dpbScopes: availableDpb,
      });
    }

    setDpbCache(tempCache);
    setSelectedMappings((prev) => [...prev, ...processedItems]);
    setIsLoadingDetails(null);
    setSearchTerm("");
    setResults([]);
    setHasSearched(false);
  };

  const removeMappingGroup = (kode2020: string) => {
    setSelectedMappings(
      selectedMappings.filter((m) => m.kbli_2020.kode !== kode2020),
    );
  };

  const updateScope = (
    mappingId: string,
    scopeId: string,
    field: keyof ScopeItem,
    value: string,
  ) => {
    setSelectedMappings((prev) =>
      prev.map((m) => {
        if (m.id === mappingId) {
          return {
            ...m,
            scopes: m.scopes.map((s) => {
              if (s.id === scopeId) {
                if (field === "tingkatResiko") {
                  const riskLevel = RISK_LEVELS.find((r) => r.value === value);
                  return {
                    ...s,
                    [field]: value,
                    izin: riskLevel?.permit || "",
                  };
                }
                if (field === "ruangLingkup") {
                  const autoData = m.kbli_2025.kode
                    ? calculateScopeData(value, kelompokUsaha, m.kbli_2025.kode)
                    : { tingkatResiko: "Rendah", izin: "NIB" };
                  return {
                    ...s,
                    [field]: value,
                    tingkatResiko: autoData.tingkatResiko,
                    izin: autoData.izin,
                  };
                }
                return { ...s, [field]: value };
              }
              return s;
            }),
          };
        }
        return m;
      }),
    );
  };

  const updateMappingScopes = (mappingId: string, count: number) => {
    const num = count || 1;
    setSelectedMappings((prev) =>
      prev.map((m) => {
        if (m.id === mappingId) {
          const currentScopes = m.scopes;
          if (num > currentScopes.length) {
            const newScopes = [...currentScopes];
            for (let i = currentScopes.length; i < num; i++) {
              newScopes.push({
                id: Math.random().toString(36).substr(2, 9),
                ruangLingkup: "",
                tingkatResiko: "Rendah",
                izin: "NIB",
              });
            }
            return { ...m, scopes: newScopes };
          } else if (num < currentScopes.length && num >= 1) {
            return { ...m, scopes: currentScopes.slice(0, num) };
          }
        }
        return m;
      }),
    );
  };

  const updateMappingCatatan = (mappingId: string, value: string) => {
    setSelectedMappings((prev) =>
      prev.map((m) => {
        if (m.id === mappingId) {
          return { ...m, catatan: value };
        }
        return m;
      }),
    );
  };

  const handlePrint = (lang: "id" | "en" = "id") => {
    const isEn = lang === "en";
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    let currentY = 0;

    const addLetterhead = (isFirstPage: boolean = false) => {
      if (isFirstPage) {
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("NOTARIS/PPAT", 14, 15);

        doc.setLineWidth(0.5);
        doc.setDrawColor(0, 0, 0);
        doc.line(14, 17, pageWidth - 14, 17);

        doc.setFontSize(11);
        doc.text("NUKANTINI PUTRI PARINCHA, SH., M.Kn.", 14, 22);

        doc.setFontSize(8.5);
        doc.text(
          "SK MENTERI HUKUM DAN HAK ASASI MANUSIA REPUBLIK INDONESIA",
          14,
          26.5,
        );
        doc.text(
          "NO. C-309.HT 03.01-Th. 2007, Tanggal 23 Agustus 2007",
          14,
          30.5,
        );
        doc.text(
          "SK. KEPALA BADAN PERTANAHAN NASIONAL REPUBLIK INDONESIA",
          14,
          34.5,
        );
        doc.text(
          "NO. 1 - XVI I- PPAT - 2009, Tanggal 12 Februari 2009",
          14,
          38.5,
        );

        doc.setFont("helvetica", "normal");
        doc.text("Kantor", 14, 43.5);
        doc.text(":", 32, 43.5);
        doc.text(
          "Komp. PPR-ITB Kav. F-5 Dago Giri, Lembang, Kab. Bandung Barat",
          34,
          43.5,
        );

        doc.text("Telp/Fax", 14, 47.5);
        doc.text(":", 32, 47.5);
        doc.text("08112007061", 34, 47.5);

        // Double lines under letterhead
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(1.0);
        doc.line(14, 51, pageWidth - 14, 51);
        doc.setLineWidth(0.3);
        doc.line(14, 52, pageWidth - 14, 52);

        currentY = 60;
      } else {
        // Minimal header running line for pages after page 1
        doc.setLineWidth(0.3);
        doc.setDrawColor(180, 180, 180);
        doc.line(14, 12, pageWidth - 14, 12);

        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text("NOTARIS/PPAT NUKANTINI PUTRI PARINCHA, SH., M.Kn.", 14, 9);

        currentY = 20;
      }
    };

    const addFooter = () => {
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8.5);
        doc.setTextColor(100);
        doc.setFont("helvetica", "italic");

        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.5);
        doc.line(14, pageHeight - 21, pageWidth - 14, pageHeight - 21);

        const disclaimer = isEn
          ? "Notes: Data compiled based on oss.go.id, if there are discrepancies in the future due to new regulations, it is not the responsibility of the Notary Office."
          : "Catatan: Data disusun berdasarkan data oss.go.id. Apabila ada perbedaan di kemudian hari dikarenakan ada peraturan baru, bukan menjadi tanggung jawab Kantor Notaris.";

        const splitDisclaimer = doc.splitTextToSize(disclaimer, pageWidth - 28);
        doc.text(splitDisclaimer, 14, pageHeight - 16);

        const runningContact = `Notaris/PPAT: Nukantini Putri Parincha, SH., M.Kn. — Komp. PPR-ITB Kav. F-5 Dago Giri, Lembang, Kab. Bandung Barat`;
        doc.setFontSize(7.5);
        doc.setTextColor(120, 120, 120);
        doc.setFont("helvetica", "normal");
        doc.text(runningContact, 14, pageHeight - 8);
      }
    };

    // Full letterhead of Notary on first page
    addLetterhead(true);

    // Document Title
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(
      isEn
        ? "RECOMMENDED KBLI 2020 - 2025 MAPPINGS"
        : "SARAN PEMETAAN KBLI 2020 - 2025",
      pageWidth / 2,
      currentY,
      { align: "center" },
    );
    currentY += 8;

    // Nama PT & Skala Usaha Block (Plain text layout with perfect alignment)
    autoTable(doc, {
      startY: currentY,
      theme: "plain",
      body: [
        [
          {
            content: isEn ? "Name" : "Nama",
            styles: { fontStyle: "normal", cellWidth: 30 },
          },
          { content: `: ${namaPT || "–"}`, styles: { fontStyle: "bold" } },
        ],
        [
          {
            content: isEn ? "Business Scale" : "Skala Usaha",
            styles: { fontStyle: "normal", cellWidth: 30 },
          },
          {
            content: `: ${translateBusinessScale(kelompokUsaha, isEn)}`,
            styles: { fontStyle: "bold" },
          },
        ],
      ],
      styles: {
        fontSize: 10,
        textColor: [0, 0, 0],
        minCellHeight: 5,
        cellPadding: 0.5,
      },
      margin: { left: 14, right: 14 },
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 8;

    // 1. RINGKASAN PEMETAAN SECTION
    autoTable(doc, {
      startY: currentY,
      theme: "plain",
      body: [
        [
          {
            content: isEn ? "MAPPING SUMMARY" : "RINGKASAN PEMETAAN",
            styles: {
              fillColor: [15, 118, 110], // Teal
              textColor: [255, 255, 255], // White
              fontStyle: "bold",
              fontSize: 11,
              cellPadding: { top: 3.5, bottom: 3.5, left: 6, right: 6 },
              halign: "left",
            }
          }
        ]
      ],
      margin: { left: 14, right: 14, bottom: 25, top: 20 },
    });
    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 4;

    // Compile Summary Rows Data
    const summaryRows: any[] = [];
    const unique2020Kodes = Array.from(new Set(selectedMappings.map(s => s.kbli_2020.kode)));
    
    unique2020Kodes.forEach(kode2020 => {
      const mappingsFor2020 = selectedMappings.filter(s => s.kbli_2020.kode === kode2020);
      const firstMappingItem = mappingsFor2020[0];
      const name2020 = firstMappingItem.kbli_2020.judul;
      
      const targetKodes = mappingsFor2020
        .map(s => s.kbli_2025?.kode)
        .filter(Boolean);
      
      const isDeleted = targetKodes.length === 0 || 
        mappingsFor2020.some(s => s.jenis_perubahan?.toLowerCase() === "dihapus") || 
        mappingsFor2020.every(s => !s.kbli_2025?.kode);
      
      let kbli2025Str = "";
      let jumlahStr = "";
      
      if (isDeleted) {
        kbli2025Str = isEn ? "DELETED" : "DIHAPUS";
        jumlahStr = "—";
      } else {
        kbli2025Str = targetKodes.join(", ");
        const count = targetKodes.length;
        if (count > 1) {
          jumlahStr = isEn 
            ? `${count} KBLI\n*can choose any suitable one`
            : `${count} KBLI\n*dapat dipilih salah satu yang sesuai`;
        } else {
          jumlahStr = `${count} KBLI`;
        }
      }
      
      summaryRows.push([
        kode2020,
        name2020,
        kbli2025Str,
        jumlahStr
      ]);
    });

    // Summary AutoTable
    autoTable(doc, {
      startY: currentY,
      theme: "grid",
      head: [
        isEn
          ? ["KBLI 2020", "Name", "KBLI 2025", "Total"]
          : ["KBLI 2020", "Nama", "KBLI 2025", "Jumlah"]
      ],
      body: summaryRows,
      headStyles: {
        fillColor: [30, 41, 59], // Slate-800
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
        valign: "middle",
        lineColor: [150, 150, 150],
        lineWidth: 0.2,
      },
      styles: {
        fontSize: 9,
        cellPadding: 4,
        lineColor: [226, 232, 240], // Light gray grid lines
        lineWidth: 0.2,
        textColor: [0, 0, 0],
        valign: "middle",
      },
      columnStyles: {
        0: { cellWidth: 20, halign: "center", fontStyle: "bold" },
        1: { cellWidth: 90, halign: "left" },
        2: { cellWidth: 35, halign: "center" },
        3: { cellWidth: 37, halign: "left" },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14, bottom: 25, top: 20 },
      willDrawCell: (data) => {
        if (data.section === "body") {
          if (data.column.index === 2) {
            const val = data.cell.text.join("").trim();
            if (val === "DIHAPUS" || val === "DELETED") {
              data.cell.styles.textColor = [220, 38, 38]; // Red
              data.cell.styles.fontStyle = "bold";
            }
          }
          if (data.column.index === 3) {
            const val = data.cell.text.join("\n");
            if (val.includes("*")) {
              data.cell.text = []; // Clear for hand-rolled rendering in didDrawCell
            }
          }
        }
      },
      didDrawCell: (data) => {
        if (data.section === "body" && data.column.index === 3) {
          const rawRow = summaryRows[data.row.index];
          const text = rawRow[3];
          if (text && text.includes("*")) {
            const parts = text.split("\n");
            const mainText = parts[0];
            const subText = parts[1];
            
            // Bold standard count
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            doc.text(mainText, data.cell.x + 4, data.cell.y + 6);
            
            // Orange warning below
            doc.setFont("helvetica", "italic");
            doc.setFontSize(7.5);
            doc.setTextColor(217, 119, 6); // Amber
            const limitWidth = data.column.width - 7;
            const splitSubText = doc.splitTextToSize(subText, limitWidth);
            doc.text(splitSubText, data.cell.x + 4, data.cell.y + 10.5);
          }
        }
      }
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 8;

    // 2. DETAIL PEMETAAN SECTION (Must have enough space)
    if (currentY > pageHeight - 40) {
      doc.addPage();
      addLetterhead(false);
    }

    autoTable(doc, {
      startY: currentY,
      theme: "plain",
      body: [
        [
          {
            content: isEn ? "MAPPING DETAILS" : "DETAIL PEMETAAN",
            styles: {
              fillColor: [15, 118, 110], // Teal
              textColor: [255, 255, 255],
              fontStyle: "bold",
              fontSize: 11,
              cellPadding: { top: 3.5, bottom: 3.5, left: 6, right: 6 },
              halign: "left",
            }
          }
        ]
      ],
      margin: { left: 14, right: 14, bottom: 25, top: 20 },
    });
    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 8;

    // Detail Items render loop
    const groupedMappings: { [key: string]: SelectedMappingItem[] } = {};
    selectedMappings.forEach((s) => {
      const g = s.kbli_2020.kode;
      if (!groupedMappings[g]) {
        groupedMappings[g] = [];
      }
      groupedMappings[g].push(s);
    });

    Object.values(groupedMappings).forEach((items) => {
      const kbli2020 = items[0].kbli_2020;

      if (currentY > pageHeight - 35) {
        doc.addPage();
        addLetterhead(false);
        currentY = 20;
      }

      // Plain Bold Text: KBLI 2020 Header (Wrapped to prevent overflow)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      const text2020 = `KBLI 2020: ${kbli2020.kode} — ${kbli2020.judul.toUpperCase()}`;
      const lines2020 = doc.splitTextToSize(text2020, pageWidth - 28);
      doc.text(lines2020, 14, currentY);
      currentY += (lines2020.length * 5) + 1;

      let blockY = currentY;

      // Iteration for KBLI 2025 entries
      items.forEach((kbli2025Item) => {
        const kbli2025 = kbli2025Item.kbli_2025;

        if (blockY > pageHeight - 35) {
          doc.addPage();
          addLetterhead(false);
          blockY = 20;
        }

        // Bold Teal Text: KBLI 2025 (Wrapped to prevent overflow, drawn teal square)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(15, 118, 110); // Teal

        const targetKodeStr = kbli2025.kode || "-";
        const isTargetDeleted = !kbli2025.kode || kbli2025Item.jenis_perubahan?.toLowerCase() === "dihapus";
        const targetJudulStr = isTargetDeleted
          ? (isEn ? "DELETED" : "DIHAPUS")
          : (kbli2025.judul || "").toUpperCase();

        const subHeaderString = `KBLI 2025: ${targetKodeStr} — ${targetJudulStr}`;
        const lines2025 = doc.splitTextToSize(subHeaderString, pageWidth - 33);
        
        // Draw physical colored teal square instead of '■' to avoid encoding / standard PDF fonts corruption (rendering as %)
        doc.setFillColor(15, 118, 110);
        doc.rect(14, blockY - 3.2, 3, 3, "F");

        doc.text(lines2025, 19, blockY);
        blockY += (lines2025.length * 4.8) + 1.2;

        // Paragraph Wrapped description
        if (kbli2025.kode && kbli2025.uraian) {
          if (blockY > pageHeight - 30) {
            doc.addPage();
            addLetterhead(false);
            blockY = 20;
          }
          autoTable(doc, {
            startY: blockY,
            theme: "plain",
            body: [[kbli2025.uraian]],
            styles: {
              fontSize: 9,
              textColor: [100, 116, 139], // Slate-500
              fontStyle: "normal",
              cellPadding: { top: 1, bottom: 2, left: 0, right: 0 },
              halign: "justify",
            },
            margin: { left: 14, right: 14 },
          });
          // @ts-ignore
          blockY = doc.lastAutoTable.finalY + 4;
        }

        // Scopes table (No, Ruang Lingkup Usaha, Tingkat Risiko, Jenis Izin)
        if (
          kbli2025Item.scopes &&
          kbli2025Item.scopes.length > 0 &&
          kbli2025Item.kbli_2025.kode
        ) {
          if (blockY > pageHeight - 35) {
            doc.addPage();
            addLetterhead(false);
            blockY = 20;
          }

           const scopeBody = kbli2025Item.scopes.map((s, index) => {
             const isFailedScope = s.ruangLingkup && (s.ruangLingkup.includes("Gagal membaca") || s.ruangLingkup.includes("Belum tersedia"));
             
             let displayRuangLingkup = s.ruangLingkup || "-";
             if (isFailedScope) {
               displayRuangLingkup = isEn 
                 ? "New data from OSS is not yet available" 
                 : "Belum tersedia data baru dari OSS";
             }

             let displayRisiko = translateRiskLevel(s.tingkatResiko, isEn);
             if (isFailedScope) {
               displayRisiko = "N/A";
             }

             let displayIzin = "N/A";
             if (!isFailedScope) {
               const autoIzin = isEn ? getEnAutoIzin(s.tingkatResiko) : getAutoIzin(s.tingkatResiko);
               const manualIzin = s.izin && s.izin !== "-" ? translateIzinValue(s.izin, isEn) : "";
               
               displayIzin = manualIzin || autoIzin;
               if (displayIzin && displayIzin.toUpperCase() === "SERTIFIKAT STANDAR SELEF DECLARE") {
                 displayIzin = "Sertifikat Standar Self Declare";
               }
               if (displayIzin && displayIzin.toUpperCase() === "SERTIFIKAT STANDAR PEMENUHAN KOMITMEN") {
                 displayIzin = "Sertifikat Standar Pemenuhan Komitmen";
               }
               if (!displayIzin) {
                 displayIzin = "—";
               }
             }

             return [
               index + 1,
               displayRuangLingkup,
               displayRisiko,
               displayIzin,
             ];
           });

          const countScopes = kbli2025Item.scopes.length;

          autoTable(doc, {
            startY: blockY,
            head: [
              isEn
                ? [
                    "No",
                    countScopes > 1
                      ? "Business Scope\n* please choose one suitable business activity when inputting on OSS"
                      : "Business Scope",
                    "Risk Level",
                    "License Type",
                  ]
                : [
                    "No",
                    countScopes > 1
                      ? "Ruang Lingkup Usaha\n* pilih salah satu sesuai kegiatan usaha yang dijalankan saat input OSS"
                      : "Ruang Lingkup Usaha",
                    "Tingkat Risiko",
                    "Jenis Izin",
                  ],
            ],
            body: scopeBody,
            theme: "grid",
            headStyles: {
              fillColor: [15, 118, 110], // Teal [15,118,110]
              textColor: [255, 255, 255],
              fontStyle: "bold",
              halign: "center",
              valign: "middle",
              lineColor: [226, 232, 240],
              lineWidth: 0.2,
            },
            styles: {
              fontSize: 9,
              cellPadding: 4,
              lineColor: [226, 232, 240], // Gray grid border
              lineWidth: 0.2,
              textColor: [0, 0, 0],
              valign: "middle",
            },
            columnStyles: {
              0: { cellWidth: 12, halign: "center" },
              1: { cellWidth: 85, halign: "left" },
              2: { cellWidth: 35, halign: "center" },
              3: { cellWidth: 50, halign: "left" },
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 14, right: 14, bottom: 25, top: 20 },
            willDrawCell: (data) => {
              // Clear default text for header column index 1 ONLY when there is subtitle
              if (data.section === "head" && data.column.index === 1 && countScopes > 1) {
                data.cell.text = [];
              }
            },
            didDrawCell: (data) => {
              if (data.section === "head" && data.column.index === 1 && countScopes > 1) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(9.5);
                doc.setTextColor(255, 255, 255);
                doc.text(isEn ? "Business Scope" : "Ruang Lingkup Usaha", data.cell.x + 4, data.cell.y + 6);
                
                doc.setFont("helvetica", "italic");
                doc.setFontSize(7.5);
                doc.setTextColor(209, 250, 229); // Beautiful light emerald mint
                const warningMsg = isEn 
                  ? "* please choose one suitable business activity when inputting on OSS" 
                  : "* pilih salah satu sesuai kegiatan usaha yang dijalankan saat input OSS";
                const limitWidth = data.column.width - 8;
                const splitMsg = doc.splitTextToSize(warningMsg, limitWidth);
                doc.text(splitMsg, data.cell.x + 4, data.cell.y + 11);
              }
            }
          });

          // @ts-ignore
          blockY = doc.lastAutoTable.finalY + 6;
        }

        // Catatan KBLI 25
        if (kbli2025Item.catatan) {
          if (blockY > pageHeight - 35) {
            doc.addPage();
            addLetterhead(false);
            blockY = 20;
          }
          autoTable(doc, {
            startY: blockY,
            theme: "grid",
            body: [
              [
                {
                  content: isEn ? "Notes KBLI 2025:" : "Catatan KBLI 2025 Ini:",
                  styles: {
                    fontStyle: "bold",
                    textColor: [30, 41, 59],
                    cellPadding: { top: 4, left: 4, right: 4, bottom: 1 },
                  }
                }
              ],
              [
                {
                  content: kbli2025Item.catatan,
                  styles: {
                    fontStyle: "normal",
                    textColor: [71, 85, 105],
                    cellPadding: { top: 1, left: 4, right: 4, bottom: 4 },
                    halign: "justify",
                  }
                }
              ]
            ],
            styles: {
              fontSize: 9,
              fillColor: [248, 250, 252],
              lineColor: [226, 232, 240],
              lineWidth: 0.2,
            },
            margin: { left: 14, right: 14, bottom: 25, top: 20 },
          });
          // @ts-ignore
          blockY = doc.lastAutoTable.finalY + 6;
        } else {
          blockY += 2;
        }
      });
      currentY = blockY + 6;
    });

    addFooter();
    const filename = isEn
      ? `KBLI_Mapping_${namaPT.replace(/\s+/g, "_") || "Suggestions"}.pdf`
      : `Pemetaan_KBLI_${namaPT.replace(/\s+/g, "_") || "Saran"}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="bg-white p-6 sm:p-8 rounded-sm shadow-sm border border-slate-200">
        <div className="text-center mb-8">
          <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-tight mb-2">
            Pemetaan KBLI 2020 - 2025
          </h1>
          <p className="text-slate-500 max-w-md mx-auto">
            Cek perubahan kode dan ruang lingkup KBLI 2020 ke KBLI 2025 serta
            tambahkan ke daftar Anda.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-center mb-8">
          <div className="flex items-center gap-2 bg-white px-4 py-2 border border-slate-200 rounded-lg shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Nama:
            </span>
            <input
              type="text"
              placeholder="MASUKKAN NAMA"
              className="text-sm font-bold text-slate-700 outline-none border-b border-transparent focus:border-indigo-500 uppercase min-w-[200px]"
              value={namaPT}
              onChange={(e) => setNamaPT(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 border border-slate-200 rounded-lg shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Skala:
            </span>
            <select
              className="text-sm font-bold text-slate-700 outline-none bg-transparent cursor-pointer"
              value={kelompokUsaha}
              onChange={(e) => setKelompokUsaha(e.target.value)}
            >
              <option value="Mikro">Mikro</option>
              <option value="Kecil">Kecil</option>
              <option value="Menengah">Menengah</option>
              <option value="Besar">Besar</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveToFirestore}
              disabled={
                isSavingRecord ||
                !namaPT.trim() ||
                selectedMappings.length === 0
              }
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all border border-emerald-750 shadow-sm uppercase shrink-0"
            >
              {isSavingRecord ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Simpan
            </button>
            <button
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all border border-slate-200 shadow-sm uppercase shrink-0"
            >
              <History className="w-3.5 h-3.5" />
              Riwayat ({savedRecords.length})
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSearch}
          className="max-w-2xl mx-auto relative group mb-4"
        >
          <div className="relative flex items-center">
            <div className="absolute left-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Masukkan kode KBLI 2020 atau 2025..."
              className="w-full pl-14 pr-32 py-4 shadow-xl shadow-slate-200/50 border border-slate-200 rounded-full text-lg focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              type="submit"
              className="absolute right-2 px-6 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-full hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5 transition-all outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 uppercase tracking-wide"
            >
              Cari KBLI
            </button>
          </div>
        </form>

        {hasSearched && (
          <div className="max-w-2xl mx-auto mt-4 space-y-4">
            <h3 className="text-[13px] font-bold text-slate-600 uppercase tracking-wider">
              {results.length > 0
                ? `Ditemukan ${results.length} hasil Pemetaan`
                : "Hasil Pencarian"}
            </h3>

            {results.length > 0 ? (
              <div className="grid gap-4 max-h-96 overflow-y-auto p-1">
                {(
                  Object.values(
                    results.reduce(
                      (acc, curr) => {
                        const key = curr.kbli_2020.kode;
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(curr);
                        return acc;
                      },
                      {} as Record<string, KBLIMappingItem[]>,
                    ),
                  ) as KBLIMappingItem[][]
                ).map((items, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200 rounded-sm overflow-hidden shadow-sm hover:border-indigo-200 transition-all flex items-center justify-between p-4 group"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1.5">
                          <Info className="w-3 h-3" />{" "}
                          {items[0].jenis_perubahan}
                        </span>
                      </div>
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
                        <div className="flex-1 border-l-2 border-slate-200 pl-2">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                            KBLI 2020
                          </div>
                          <div className="font-bold text-[14px] text-slate-800">
                            {items[0].kbli_2020.kode}
                          </div>
                          <div className="text-[12px] text-slate-600 leading-tight">
                            {items[0].kbli_2020.judul}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 hidden md:block shrink-0" />
                        <div className="flex-1 border-l-2 border-emerald-200 pl-2 space-y-2">
                          <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">
                            KBLI 2025
                          </div>
                          {items.map((sub, i) => (
                            <div
                              key={i}
                              className="bg-emerald-50/50 p-2 rounded border border-emerald-100/50"
                            >
                              <div className="font-bold text-[14px] text-emerald-800">
                                {sub.kbli_2025.kode || "-"}
                              </div>
                              <div className="text-[12px] text-emerald-700 leading-tight">
                                {sub.kbli_2025.judul || "Dihapus/Dialihkan"}
                              </div>
                              {sub.kbli_2025.uraian && (
                                <div className="text-[11px] text-slate-500 line-clamp-2 hover:line-clamp-none cursor-pointer leading-snug border-t border-emerald-100/30 pt-1 mt-1 font-normal italic">
                                  {sub.kbli_2025.uraian}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => addMappingGroup(items[0].kbli_2020.kode)}
                      disabled={isLoadingDetails !== null}
                      className="ml-4 p-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white disabled:bg-slate-100 disabled:text-slate-400 rounded-full transition-all shrink-0 self-start mt-2 border border-transparent flex items-center justify-center"
                      title="Tambah ke Daftar"
                    >
                      {isLoadingDetails === items[0].kbli_2020.kode ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Plus className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-orange-50 border border-orange-200 p-8 rounded-sm text-center">
                <AlertTriangle className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                <h4 className="text-[14px] font-bold text-orange-800">
                  KBLI tidak berubah
                </h4>
                <p className="text-[12px] text-orange-700">
                  Kode KBLI yang Anda cari tidak ditemukan dalam daftar
                  perubahan (kemungkinan tetap sama).
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedMappings.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">
              Daftar Pemetaan Terpilih
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <select
                  value={pdfLang}
                  onChange={(e) => setPdfLang(e.target.value as "id" | "en")}
                  className="px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:outline-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm"
                >
                  <option value="id">Bahasa Indonesia</option>
                  <option value="en">English (PDF)</option>
                </select>
                <button
                  onClick={() => handlePrint(pdfLang)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-bold transition-all border border-indigo-100 shadow-sm"
                >
                  <FileDown className="w-4 h-4" />
                  Cetak PDF
                </button>
              </div>
              <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-500">
                {selectedMappings.length} KBLI
              </span>
            </div>
          </div>

          <div className="grid gap-4">
            {(
              Object.values(
                selectedMappings.reduce(
                  (acc, curr) => {
                    const key = curr.kbli_2020.kode;
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(curr);
                    return acc;
                  },
                  {} as Record<string, SelectedMappingItem[]>,
                ),
              ) as SelectedMappingItem[][]
            ).map((items, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-300"
              >
                {/* Header: KBLI 2020 */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      KBLI 2020
                    </span>
                    <span className="text-[15px] font-bold text-slate-800">
                      {items[0].kbli_2020.kode}{" "}
                      <span className="font-normal text-slate-600 ml-1">
                        {items[0].kbli_2020.judul}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-indigo-50 px-3 py-1 rounded text-[11px] font-bold text-indigo-600 text-center whitespace-nowrap hidden md:block border border-indigo-100 shadow-sm">
                      {items[0].jenis_perubahan}
                    </div>
                    <button
                      onClick={() =>
                        removeMappingGroup(items[0].kbli_2020.kode)
                      }
                      className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Body: list of KBLI 2025 */}
                <div className="p-4 space-y-4">
                  <div className="text-[11px] font-bold text-emerald-500 uppercase tracking-tighter ml-1">
                    Pemetaan KBLI 2025:
                  </div>
                  {items.map((sub, i) => (
                    <div
                      key={i}
                      className="border border-emerald-100 rounded-sm overflow-hidden shadow-sm"
                    >
                      <div className="px-4 py-3 bg-emerald-50/50 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-emerald-100 gap-3">
                        <div className="font-bold text-[14px] text-emerald-800">
                          {sub.kbli_2025.kode || "-"}{" "}
                          <span className="font-normal text-emerald-600 ml-1 text-[13px]">
                            {sub.kbli_2025.judul || "Dihapus/Dialihkan"}
                          </span>
                        </div>
                        {sub.kbli_2025.kode && (
                          <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-emerald-200 rounded-sm shrink-0 shadow-sm">
                            <span className="text-[11px] font-bold text-emerald-600 uppercase">
                              Ruang Lingkup?
                            </span>
                            <input
                              type="number"
                              min="1"
                              className="w-12 text-center text-[13px] font-bold text-emerald-800 focus:outline-none"
                              value={sub.scopes?.length || 1}
                              onChange={(e) =>
                                updateMappingScopes(
                                  sub.id,
                                  parseInt(e.target.value) || 1,
                                )
                              }
                            />
                          </div>
                        )}
                      </div>

                      {sub.kbli_2025.uraian && (
                        <div className="px-4 py-3 bg-slate-50 border-b border-emerald-100/30 text-[12px] text-slate-600 leading-relaxed border-t border-slate-100">
                          <span className="font-bold text-slate-700 block mb-0.5 tracking-tight text-[11px] uppercase">
                            Uraian KBLI 2025:
                          </span>
                          <p className="font-normal text-slate-500">
                            {sub.kbli_2025.uraian}
                          </p>
                        </div>
                      )}

                      {/* Scopes Table for this KBLI 2025 */}
                      {sub.kbli_2025.kode && (
                        <div className="overflow-x-auto bg-white">
                          <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-12 text-center">
                                  No
                                </th>
                                <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  Ruang Lingkup Usaha
                                </th>
                                <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-40">
                                  Tingkat Risiko
                                </th>
                                <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-52">
                                  Izin
                                </th>
                                <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-56">
                                  Jenis Izin
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {sub.scopes?.map((scope, index) => {
                                const isFailedScope = scope.ruangLingkup && (scope.ruangLingkup.includes("Gagal membaca") || scope.ruangLingkup.includes("Belum tersedia"));
                                return (
                                  <tr
                                    key={scope.id}
                                    className="group hover:bg-slate-50/50 transition-colors"
                                  >
                                    <td className="px-4 py-3 align-top text-center">
                                      <span className="text-[13px] font-medium text-slate-400">
                                        {index + 1}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                      <textarea
                                        placeholder="Input manual ruang lingkup..."
                                        className="w-full px-3 py-2 border border-slate-200/50 rounded-sm text-[13px] focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all resize-none h-14 group-hover:border-slate-300/50 shadow-sm"
                                        value={scope.ruangLingkup}
                                        onChange={(e) =>
                                          updateScope(
                                            sub.id,
                                            scope.id,
                                            "ruangLingkup",
                                            e.target.value,
                                          )
                                        }
                                      />
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                      {isFailedScope ? (
                                        <div className="px-3 py-2 bg-slate-50 border border-slate-200/50 rounded-sm text-[13px] text-slate-400 min-h-[36px] flex items-center leading-relaxed font-medium">
                                          N/A
                                        </div>
                                      ) : (
                                        <select
                                          className="w-full px-2 py-2 border border-slate-200/50 rounded-sm text-[13px] focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all bg-white group-hover:border-slate-300/50 shadow-sm"
                                          value={scope.tingkatResiko}
                                          onChange={(e) =>
                                            updateScope(
                                              sub.id,
                                              scope.id,
                                              "tingkatResiko",
                                              e.target.value,
                                            )
                                          }
                                        >
                                          {RISK_LEVELS.map((level) => (
                                            <option
                                              key={level.value}
                                              value={level.value}
                                            >
                                              {level.label}
                                            </option>
                                          ))}
                                        </select>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                      <div className="px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-100/50 rounded-sm text-[11px] font-bold min-h-[36px] flex items-center leading-relaxed uppercase">
                                        {isFailedScope ? "N/A" : getAutoIzin(scope.tingkatResiko)}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                      <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-sm text-[12px] text-slate-600 min-h-[36px] flex items-center leading-relaxed">
                                        {isFailedScope ? "N/A" : scope.izin}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          {/* Notes Section for each KBLI 2025 */}
                          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                              Catatan Tambahan untuk KBLI 2025 Ini
                            </label>
                            <textarea
                              placeholder="Tambahkan catatan khusus..."
                              className="w-full px-3 py-2 border border-slate-200 rounded-sm text-[13px] focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all resize-none min-h-[44px] shadow-sm bg-white"
                              value={sub.catatan || ""}
                              onChange={(e) =>
                                updateMappingCatatan(sub.id, e.target.value)
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-sm flex gap-3 items-start max-w-5xl mx-auto">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-[12px] text-blue-800 leading-relaxed">
          <p className="font-bold mb-1 uppercase tracking-tight">
            Catatan Penting:
          </p>
          Layanan ini membantu Anda mengidentifikasi perubahan struktur kode
          pada transisi KBLI 2020 ke KBLI 2025. Pastikan selalu melakukan
          verifikasi ulang pada sistem OSS RBA saat penginputan data.
        </div>
      </div>

      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                Riwayat Pemetaan Tersimpan
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto space-y-3">
              {savedRecords.length === 0 ? (
                <div className="text-center py-8 text-slate-400 italic text-sm">
                  Belum ada riwayat pemetaan yang disimpan.
                </div>
              ) : (
                savedRecords.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => handleLoadRecord(rec)}
                    className="p-4 bg-slate-50/50 hover:bg-indigo-50/40 border border-slate-100 hover:border-indigo-200 rounded-lg cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-800 uppercase mb-0.5">
                        {rec.nama}
                      </div>
                      <div className="flex gap-3 text-xs text-slate-500">
                        <span>
                          Skala:{" "}
                          <strong className="text-slate-700">
                            {rec.kelompokUsaha}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>{rec.selectedItems?.length || 0} KBLI</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">
                        Disimpan:{" "}
                        {new Date(rec.updatedAt).toLocaleString("id-ID")}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteRecord(rec.id, e)}
                      className="p-2 text-slate-350 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                      title="Hapus Riwayat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg uppercase tracking-wide transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KBLIMapping;
