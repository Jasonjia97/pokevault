import { afterEach, expect, it, vi } from "vitest";
import { downloadCardsCsv } from "../client/csvDownload";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("fetches the authenticated same-origin CSV and downloads it as a Blob", async () => {
  const blob = new Blob(["Card Name\r\nPikachu\r\n"], { type: "text/csv" });
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    headers: new Headers({ "content-type": "text/csv; charset=utf-8" }),
    blob: vi.fn().mockResolvedValue(blob),
  });
  const link = {
    href: "",
    download: "",
    style: { display: "" },
    click: vi.fn(),
    remove: vi.fn(),
  };
  const documentMock = {
    createElement: vi.fn(() => link),
    body: { appendChild: vi.fn() },
  };
  const windowMock = {
    setTimeout: (callback: TimerHandler) => {
      if (typeof callback === "function") callback();
      return 1;
    },
  };

  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("document", documentMock);
  vi.stubGlobal("window", windowMock);
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:pokevault-export");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

  await downloadCardsCsv();

  expect(fetchMock).toHaveBeenCalledWith("/api/cards/export.csv", {
    credentials: "same-origin",
    headers: { Accept: "text/csv" },
  });
  expect(documentMock.createElement).toHaveBeenCalledWith("a");
  expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
  expect(link.href).toBe("blob:pokevault-export");
  expect(link.download).toBe("pokevault-cards.csv");
  expect(documentMock.body.appendChild).toHaveBeenCalledWith(link);
  expect(link.click).toHaveBeenCalledOnce();
  expect(link.remove).toHaveBeenCalledOnce();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:pokevault-export");
});
