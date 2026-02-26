// ANSI color helpers for pretty CLI output

const ESC = "\x1b[";

export const colors = {
  reset: `${ESC}0m`,
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,

  red: `${ESC}31m`,
  green: `${ESC}32m`,
  yellow: `${ESC}33m`,
  blue: `${ESC}34m`,
  magenta: `${ESC}35m`,
  cyan: `${ESC}36m`,
  white: `${ESC}37m`,

  bgRed: `${ESC}41m`,
  bgGreen: `${ESC}42m`,
  bgYellow: `${ESC}43m`,
  bgBlue: `${ESC}44m`,
  bgMagenta: `${ESC}45m`,
};

export function styled(text: string, ...styles: string[]): string {
  return styles.join("") + text + colors.reset;
}

export function banner(text: string, color: string): string {
  const line = "━".repeat(60);
  return `\n${color}${colors.bold}${line}\n  ${text}\n${line}${colors.reset}\n`;
}

export function sectionHeader(emoji: string, title: string, color: string): string {
  return `\n${color}${colors.bold}${emoji} ${title}${colors.reset}\n${"─".repeat(60)}`;
}
