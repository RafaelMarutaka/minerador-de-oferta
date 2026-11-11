/**
 * Runs the collector once a day by itself.
 *
 * On Windows that is a task in the Task Scheduler, created and removed with
 * `schtasks`, the Windows tool for it. Elsewhere it prints the cron line.
 */

import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const rodar = promisify(execFile);
export const NOME_TAREFA = "Minerador de Oferta";

export function horarioValido(texto: string): string | undefined {
  const m = texto.trim().match(/^(\d{1,2})(?:[:h](\d{2}))?h?$/i);
  if (!m) return undefined;
  const h = Number(m[1]);
  const min = Number(m[2] ?? "0");
  if (h > 23 || min > 59) return undefined;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** The command the scheduler runs: this Node, this file, `coletar --log`. */
export function comandoColeta(): { node: string; script: string } {
  return { node: process.execPath, script: fileURLToPath(new URL("../minerador.js", import.meta.url)) };
}

export function argumentosSchtasks(horario: string, cmd = comandoColeta()): string[] {
  return ["/Create", "/TN", NOME_TAREFA, "/TR", `"${cmd.node}" "${cmd.script}" coletar --log`, "/SC", "DAILY", "/ST", horario, "/F"];
}

export async function agendar(horario: string): Promise<string> {
  if (process.platform !== "win32") {
    const [h, m] = horario.split(":");
    const cmd = comandoColeta();
    return `Fora do Windows, adicione esta linha no crontab (crontab -e):\n${Number(m)} ${Number(h)} * * * "${cmd.node}" "${cmd.script}" coletar --log`;
  }
  await rodar("schtasks", argumentosSchtasks(horario), { windowsHide: true });
  return `Agendado: todo dia às ${horario} o minerador coleta sozinho (com o PC ligado). O histórico fica no arquivo coletas.log.`;
}

export async function desagendar(): Promise<string> {
  if (process.platform !== "win32") return "Fora do Windows, remova a linha do minerador no crontab (crontab -e).";
  try {
    await rodar("schtasks", ["/Delete", "/TN", NOME_TAREFA, "/F"], { windowsHide: true });
    return "Coleta automática desligada.";
  } catch {
    return "Não havia coleta automática agendada.";
  }
}

/**
 * The PowerShell that makes a desktop shortcut opening the panel. Paths go in
 * through environment variables, so no quoting of user folders is needed.
 */
export const SCRIPT_ATALHO = [
  "$desktop = [Environment]::GetFolderPath('Desktop')",
  "$caminho = Join-Path $desktop 'Minerador de Oferta.lnk'",
  "$s = (New-Object -ComObject WScript.Shell).CreateShortcut($caminho)",
  "$s.TargetPath = $env:MINERADOR_NODE",
  "$s.Arguments = '\"' + $env:MINERADOR_SCRIPT + '\" painel'",
  "$s.WorkingDirectory = $env:USERPROFILE",
  "$s.WindowStyle = 7",
  "$s.Description = 'Abre o painel do Minerador de Oferta'",
  "$s.Save()",
  "Write-Output $caminho",
].join("; ");

export async function criarAtalho(): Promise<string> {
  if (process.platform !== "win32") return "O atalho na área de trabalho é só pro Windows. Aqui, rode: minerador painel";
  const { node, script } = comandoColeta();
  // -EncodedCommand (UTF-16LE base64) avoids every Windows quoting rule on the way in.
  const codificado = Buffer.from(SCRIPT_ATALHO, "utf16le").toString("base64");
  const { stdout } = await rodar("powershell", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", codificado], {
    windowsHide: true,
    env: { ...process.env, MINERADOR_NODE: node, MINERADOR_SCRIPT: script },
  });
  return `Atalho criado: ${stdout.trim()}\nÉ só dar dois cliques em "Minerador de Oferta" na área de trabalho pra abrir o painel.`;
}
