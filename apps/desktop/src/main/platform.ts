import { exec } from 'child_process';
import { platform } from 'os';

export interface PlatformAdapter {
  sendKey(key: 'left' | 'right' | 'up' | 'down' | 'space'): void;
  mediaPlayPause(): void;
  mediaNext(): void;
  mediaPrev(): void;
  setVolume(percent: number): void;
}

class WindowsAdapter implements PlatformAdapter {
  private runPowerShell(command: string) {
    exec(`powershell -NoProfile -Command "${command}"`, (err, stdout, stderr) => {
      if (err) console.error("PowerShell Error:", err);
    });
  }

  sendKey(key: string) {
    const keyCodes: Record<string, string> = {
      'left': '{LEFT}',
      'right': '{RIGHT}',
      'up': '{UP}',
      'down': '{DOWN}',
      'space': ' '
    };
    const c = keyCodes[key];
    if (c) {
      this.runPowerShell(`
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.SendKeys]::SendWait('${c}')
      `);
    }
  }

  mediaPlayPause() {
    this.runPowerShell(`
      $code = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, uint dwExtraInfo);'
      $kb = Add-Type -MemberDefinition $code -Name "KB" -Namespace "Win32" -PassThru
      $kb::keybd_event(0xB3, 0, 0, 0)
    `);
  }

  mediaNext() {
    this.runPowerShell(`
      $code = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, uint dwExtraInfo);'
      $kb = Add-Type -MemberDefinition $code -Name "KB" -Namespace "Win32" -PassThru
      $kb::keybd_event(0xB0, 0, 0, 0)
    `);
  }

  mediaPrev() {
    this.runPowerShell(`
      $code = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, uint dwExtraInfo);'
      $kb = Add-Type -MemberDefinition $code -Name "KB" -Namespace "Win32" -PassThru
      $kb::keybd_event(0xB1, 0, 0, 0)
    `);
  }

  setVolume(percent: number) {
    // Basic approximate volume adjust on Windows (sends vol up/down keys)
    // A more precise one requires CoreAudio, but keeping it simple without native modules:
    // This is difficult without native modules. Let's just do a series of Volume Up / Volume Down.
    // We'll skip absolute volume for now or use a hack.
    console.log("Set volume not fully implemented on Windows without native module. Value:", percent);
  }
}

class MacAdapter implements PlatformAdapter {
  private runOsa(script: string) {
    exec(`osascript -e '${script}'`, (err) => {
      if (err) console.error("AppleScript Error:", err);
    });
  }

  sendKey(key: string) {
    const keyCodes: Record<string, string> = {
      'left': '123',
      'right': '124',
      'down': '125',
      'up': '126',
      'space': '49'
    };
    if (keyCodes[key]) {
      this.runOsa(`tell application "System Events" to key code ${keyCodes[key]}`);
    }
  }

  mediaPlayPause() {
    this.runOsa(`tell application "System Events" to key code 100`);
  }

  mediaNext() {
    this.runOsa(`tell application "System Events" to key code 101`);
  }

  mediaPrev() {
    this.runOsa(`tell application "System Events" to key code 98`);
  }

  setVolume(percent: number) {
    const vol = Math.floor(percent * 100);
    this.runOsa(`set volume output volume ${vol}`);
  }
}

class LinuxAdapter implements PlatformAdapter {
  sendKey(key: string) {
    const keyCodes: Record<string, string> = {
      'left': 'Left',
      'right': 'Right',
      'up': 'Up',
      'down': 'Down',
      'space': 'space'
    };
    if (keyCodes[key]) {
      exec(`xdotool key ${keyCodes[key]}`);
    }
  }

  mediaPlayPause() {
    exec(`playerctl play-pause`);
  }

  mediaNext() {
    exec(`playerctl next`);
  }

  mediaPrev() {
    exec(`playerctl previous`);
  }

  setVolume(percent: number) {
    // Assuming PulseAudio or PipeWire
    const vol = Math.floor(percent * 100);
    exec(`pactl set-sink-volume @DEFAULT_SINK@ ${vol}%`);
  }
}

export function getPlatformAdapter(): PlatformAdapter {
  const p = platform();
  if (p === 'win32') return new WindowsAdapter();
  if (p === 'darwin') return new MacAdapter();
  return new LinuxAdapter();
}
