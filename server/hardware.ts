import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface SystemGpuDevice {
  id: string;
  name: string;
  vendor: "NVIDIA" | "AMD" | "Intel" | "Apple" | "Other";
  vramBytes?: number;
  vramFormatted?: string;
  driverVersion?: string;
  isDiscrete: boolean;
  isNvidia: boolean;
  temperatureC?: number;
  utilizationPercent?: number;
  source: string;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "Динамическая (Shared RAM)";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

function detectVendor(name: string): "NVIDIA" | "AMD" | "Intel" | "Apple" | "Other" {
  const low = name.toLowerCase();
  if (low.includes("nvidia") || low.includes("geforce") || low.includes("quadro") || low.includes("rtx") || low.includes("gtx")) {
    return "NVIDIA";
  }
  if (low.includes("amd") || low.includes("radeon") || low.includes("ati")) {
    return "AMD";
  }
  if (low.includes("intel") || low.includes("iris") || low.includes("uhd") || low.includes("hd graphics") || low.includes("arc")) {
    return "Intel";
  }
  if (low.includes("apple") || low.includes("m1") || low.includes("m2") || low.includes("m3") || low.includes("m4")) {
    return "Apple";
  }
  return "Other";
}

function isDiscreteGpu(name: string, vendor: string): boolean {
  if (vendor === "NVIDIA") return true;
  if (vendor === "AMD") {
    const low = name.toLowerCase();
    if (low.includes("integrated") || low.includes("vega 3") || low.includes("vega 6") || low.includes("vega 7") || low.includes("vega 8") || low.includes("graphics")) {
      return false;
    }
    return true;
  }
  if (vendor === "Intel") {
    const low = name.toLowerCase();
    if (low.includes("arc a") || low.includes("discrete")) return true;
    return false;
  }
  return false;
}

export async function detectSystemGpus(): Promise<SystemGpuDevice[]> {
  const gpus: SystemGpuDevice[] = [];
  const seenNames = new Set<string>();

  // 1. Try nvidia-smi (most accurate for NVIDIA VRAM, temperature, driver)
  try {
    const { stdout } = await execAsync(
      "nvidia-smi --query-gpu=name,memory.total,driver_version,temperature.gpu,utilization.gpu --format=csv,noheader,nounits",
      { timeout: 2000 }
    );
    const lines = stdout.trim().split("\n");
    lines.forEach((line, index) => {
      const parts = line.split(",").map((s) => s.trim());
      if (parts.length >= 3 && parts[0]) {
        const rawName = parts[0];
        const memMB = parseFloat(parts[1]) || 0;
        const driver = parts[2] || "";
        const temp = parseFloat(parts[3]) || undefined;
        const util = parseFloat(parts[4]) || undefined;

        const vramBytes = memMB * 1024 * 1024;
        const cleanName = rawName.startsWith("NVIDIA ") ? rawName : `NVIDIA ${rawName}`;

        seenNames.add(cleanName.toLowerCase());
        gpus.push({
          id: `sys_nvidia_${index}`,
          name: cleanName,
          vendor: "NVIDIA",
          vramBytes,
          vramFormatted: `${(memMB / 1024).toFixed(1)} GB GDDR`,
          driverVersion: driver,
          isDiscrete: true,
          isNvidia: true,
          temperatureC: temp,
          utilizationPercent: util,
          source: "nvidia-smi",
        });
      }
    });
  } catch {
    // nvidia-smi not available or not on path, proceed with OS tools
  }

  // 2. Windows PowerShell Get-CimInstance Win32_VideoController
  if (process.platform === "win32") {
    try {
      const psCmd =
        'powershell -NoProfile -Command "Get-CimInstance Win32_VideoController | Select-Object Name, AdapterRAM, DriverVersion, Status | ConvertTo-Json"';
      const { stdout } = await execAsync(psCmd, { timeout: 3000 });
      if (stdout.trim()) {
        const parsed = JSON.parse(stdout);
        const list = Array.isArray(parsed) ? parsed : [parsed];

        list.forEach((item, index) => {
          if (item && item.Name && typeof item.Name === "string") {
            const name = item.Name.trim();
            const low = name.toLowerCase();

            // Skip virtual/remote adapters
            if (low.includes("virtual") || low.includes("rdp") || low.includes("citrix") || low.includes("basic display")) {
              return;
            }

            // If we already added this NVIDIA card via nvidia-smi, skip to avoid duplicates
            if (seenNames.has(low) || (low.includes("nvidia") && gpus.some((g) => g.vendor === "NVIDIA"))) {
              return;
            }

            seenNames.add(low);
            const vendor = detectVendor(name);
            const ram = typeof item.AdapterRAM === "number" && item.AdapterRAM > 0 ? item.AdapterRAM : undefined;

            gpus.push({
              id: `sys_win32_${index}`,
              name,
              vendor,
              vramBytes: ram,
              vramFormatted: formatBytes(ram),
              driverVersion: item.DriverVersion || undefined,
              isDiscrete: isDiscreteGpu(name, vendor),
              isNvidia: vendor === "NVIDIA",
              source: "Win32_VideoController",
            });
          }
        });
      }
    } catch {
      // PowerShell fallback
    }
  }

  // 3. Linux lspci fallback
  if (process.platform === "linux" && gpus.length === 0) {
    try {
      const { stdout } = await execAsync("lspci | grep -iE 'vga|3d|display'", { timeout: 2000 });
      const lines = stdout.trim().split("\n");
      lines.forEach((line, index) => {
        const match = line.match(/(?:controller|compatible controller):\s*(.+)$/i);
        const name = match ? match[1].trim() : line.trim();
        if (name) {
          const vendor = detectVendor(name);
          gpus.push({
            id: `sys_linux_${index}`,
            name,
            vendor,
            vramFormatted: "VRAM Linux (Dynamic)",
            isDiscrete: isDiscreteGpu(name, vendor),
            isNvidia: vendor === "NVIDIA",
            source: "lspci",
          });
        }
      });
    } catch {
      // lspci not available
    }
  }

  // 4. macOS system_profiler fallback
  if (process.platform === "darwin" && gpus.length === 0) {
    try {
      const { stdout } = await execAsync("system_profiler SPDisplaysDataType -json", { timeout: 3000 });
      const parsed = JSON.parse(stdout);
      const displays = parsed?.SPDisplaysDataType || [];
      displays.forEach((disp: any, index: number) => {
        const name = disp.sppci_model || disp._name || "Apple GPU";
        const vram = disp.spdisplays_vram || disp.spdisplays_vram_shared;
        const vendor = detectVendor(name);
        gpus.push({
          id: `sys_mac_${index}`,
          name,
          vendor,
          vramFormatted: vram ? String(vram) : "Unified Memory",
          isDiscrete: vendor === "Apple" || isDiscreteGpu(name, vendor),
          isNvidia: vendor === "NVIDIA",
          source: "system_profiler",
        });
      });
    } catch {
      // system_profiler failed
    }
  }

  return gpus;
}
