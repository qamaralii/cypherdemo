interface Props {
  visible: boolean;
  onClose: () => void;
}

const shortcuts = [
  { key: 'Space', action: 'Pause / Resume' },
  { key: '\u2190 \u2192', action: 'Previous / Next scene' },
  { key: 'R', action: 'Replay from start' },
  { key: 'F', action: 'Toggle fullscreen' },
  { key: '?', action: 'Toggle this help' },
  { key: 'Esc', action: 'Close help' },
  { key: '1', action: 'Human teams: start' },
  { key: '2', action: 'Human teams: end summary' },
  { key: '3', action: 'Social Media Agent' },
  { key: '4', action: 'Orchestrator plan' },
  { key: '5', action: 'Identification Agent' },
  { key: '6', action: 'RCA Agent' },
  { key: '7', action: 'Decision options' },
  { key: '8', action: 'Recall approval' },
  { key: '9', action: 'Workflow outcome' },
];

export function HostControls({ visible, onClose }: Props) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 backdrop-blur-sm">
      <div className="bg-navy-light border border-cream/10 rounded-2xl p-6 sm:p-8 max-w-sm w-[90vw] shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-cream text-lg font-semibold">Controls</h2>
          <button
            className="text-cream/60 hover:text-cream transition-colors cursor-pointer text-2xl leading-none"
            onClick={onClose}
            aria-label="Close help"
          >
            &times;
          </button>
        </div>
        <div className="space-y-3">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between">
              <kbd className="bg-cream/10 text-cream text-sm px-3 py-1 rounded font-mono">
                {s.key}
              </kbd>
              <span className="text-cream/70 text-sm">{s.action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
