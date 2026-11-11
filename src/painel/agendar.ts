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
