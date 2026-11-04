const CSV_DOWNLOAD_PATH = "/api/cards/export.csv";
const CSV_FILENAME = "pokevault-cards.csv";

export async function downloadCardsCsv(): Promise<void> {
  const response = await fetch(CSV_DOWNLOAD_PATH, {
    credentials: "same-origin",
    headers: { Accept: "text/csv" },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(body?.error ?? "The CSV download could not be completed.");
  }

  if (!response.headers.get("content-type")?.toLowerCase().includes("text/csv")) {
    throw new Error("The server did not return a CSV file.");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = CSV_FILENAME;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
