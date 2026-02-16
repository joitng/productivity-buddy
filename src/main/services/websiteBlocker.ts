import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { app } from 'electron';
import * as path from 'path';

const execAsync = promisify(exec);

const HOSTS_PATH = '/etc/hosts';
const BEGIN_MARKER = '# BEGIN PRODUCTIVITY-BUDDY-BLOCK';
const END_MARKER = '# END PRODUCTIVITY-BUDDY-BLOCK';

// Default distraction sites used in "whitelist only" mode
const DEFAULT_DISTRACTION_DOMAINS = [
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'reddit.com',
  'tiktok.com',
  'youtube.com',
  'netflix.com',
  'twitch.tv',
  'discord.com',
  'snapchat.com',
  'pinterest.com',
  'tumblr.com',
  'linkedin.com',
  'buzzfeed.com',
  '9gag.com',
  'imgur.com',
  'hulu.com',
  'disneyplus.com',
  'amazon.com',
  'ebay.com',
  'etsy.com',
  'news.ycombinator.com',
  'threads.net',
  'bsky.app',
  'mastodon.social',
];

let isCurrentlyBlocking = false;

function expandDomains(domains: string[]): string[] {
  const expanded: Set<string> = new Set();
  for (const domain of domains) {
    const clean = domain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '');
    if (!clean) continue;
    expanded.add(clean);
    if (!clean.startsWith('www.')) {
      expanded.add(`www.${clean}`);
    }
  }
  return Array.from(expanded);
}

function buildHostsEntries(domains: string[]): string {
  const expanded = expandDomains(domains);
  const lines = expanded.map((d) => `127.0.0.1 ${d}`);
  return `${BEGIN_MARKER}\n${lines.join('\n')}\n${END_MARKER}`;
}

function removeBlockEntries(hostsContent: string): string {
  const beginIdx = hostsContent.indexOf(BEGIN_MARKER);
  const endIdx = hostsContent.indexOf(END_MARKER);
  if (beginIdx === -1 || endIdx === -1) return hostsContent;

  const before = hostsContent.substring(0, beginIdx);
  const after = hostsContent.substring(endIdx + END_MARKER.length);
  // Clean up extra newlines
  return (before + after).replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

async function writeHostsWithSudo(content: string): Promise<void> {
  // Write to a temp file first, then use osascript to move it with admin privileges
  const tmpPath = path.join(app.getPath('temp'), 'productivity-buddy-hosts-tmp');
  fs.writeFileSync(tmpPath, content);

  const script = `do shell script "cp ${tmpPath} ${HOSTS_PATH} && dscacheutil -flushcache && killall -HUP mDNSResponder" with administrator privileges`;
  await execAsync(`osascript -e '${script}'`);

  // Clean up temp file
  try {
    fs.unlinkSync(tmpPath);
  } catch {
    // ignore
  }
}

export async function enableBlocking(domains: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    if (domains.length === 0) {
      return { success: true };
    }

    const currentHosts = fs.readFileSync(HOSTS_PATH, 'utf-8');
    // Remove any existing block entries first
    const cleanHosts = removeBlockEntries(currentHosts);
    const newEntries = buildHostsEntries(domains);
    const newHosts = cleanHosts.trimEnd() + '\n\n' + newEntries + '\n';

    await writeHostsWithSudo(newHosts);
    isCurrentlyBlocking = true;
    console.log(`[WebsiteBlocker] Blocking ${domains.length} domains`);
    return { success: true };
  } catch (error) {
    console.error('[WebsiteBlocker] Failed to enable blocking:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function disableBlocking(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isCurrentlyBlocking) {
      // Check if markers exist anyway (e.g., from a previous crashed session)
      const currentHosts = fs.readFileSync(HOSTS_PATH, 'utf-8');
      if (!currentHosts.includes(BEGIN_MARKER)) {
        return { success: true };
      }
    }

    const currentHosts = fs.readFileSync(HOSTS_PATH, 'utf-8');
    const cleanHosts = removeBlockEntries(currentHosts);

    await writeHostsWithSudo(cleanHosts);
    isCurrentlyBlocking = false;
    console.log('[WebsiteBlocker] Blocking disabled');
    return { success: true };
  } catch (error) {
    console.error('[WebsiteBlocker] Failed to disable blocking:', error);
    return { success: false, error: (error as Error).message };
  }
}

export function isBlocking(): boolean {
  if (isCurrentlyBlocking) return true;
  // Also check the hosts file directly
  try {
    const content = fs.readFileSync(HOSTS_PATH, 'utf-8');
    return content.includes(BEGIN_MARKER);
  } catch {
    return false;
  }
}

export function getDefaultDistractionDomains(): string[] {
  return [...DEFAULT_DISTRACTION_DOMAINS];
}
