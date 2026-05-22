import { useState } from 'react';
import { Wifi, WifiOff, Loader2, Eye, EyeOff } from 'lucide-react';

type LLMProvider = 'deepseek' | 'openai' | 'ollama';

interface LLMFormState {
  provider: LLMProvider;
  deepseek_api_key: string;
  openai_api_key: string;
  openai_model: string;
  ollama_base_url: string;
  ollama_model: string;
  temperature: number;
  max_tokens: number;
}

export default function LLMConfig() {
  const [form, setForm] = useState<LLMFormState>({
    provider: 'deepseek',
    deepseek_api_key: 'sk-*********************',
    openai_api_key: '',
    openai_model: 'gpt-4o-mini',
    ollama_base_url: 'http://localhost:11434',
    ollama_model: 'qwen2.5:7b',
    temperature: 0.7,
    max_tokens: 4096,
  });
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleTest = () => {
    setTesting(true);
    setTestResult(null);
    setTimeout(() => {
      setTesting(false);
      setTestResult('success');
    }, 1500);
  };

  const providers: { key: LLMProvider; label: string; desc: string }[] = [
    { key: 'deepseek', label: 'DeepSeek', desc: '高性价比国产大模型' },
    { key: 'openai', label: 'OpenAI', desc: 'GPT-4o 系列' },
    { key: 'ollama', label: 'Ollama (本地)', desc: '本地部署，无需 API Key' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">LLM 模型配置</h2>

      {/* Provider selection */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {providers.map(p => (
          <button
            key={p.key}
            onClick={() => setForm(f => ({ ...f, provider: p.key }))}
            className={`rounded-xl border p-4 text-left transition ${form.provider === p.key ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]' : 'border-[#374151] bg-[var(--color-bg-surface)] hover:border-[var(--color-accent-light)]/50'}`}
          >
            <span className="text-sm font-medium text-[var(--color-text-primary)]">{p.label}</span>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">{p.desc}</p>
          </button>
        ))}
      </div>

      {/* Provider-specific config */}
      <div className="rounded-xl border border-[#374151] bg-[var(--color-bg-surface)] p-5 space-y-4">
        {form.provider === 'deepseek' && (
          <div>
            <label className="mb-1.5 block text-sm text-[var(--color-text-secondary)]">DeepSeek API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={form.deepseek_api_key}
                onChange={e => setForm(f => ({ ...f, deepseek_api_key: e.target.value }))}
                className="w-full rounded-lg border border-[#374151] bg-[#1e2d3d] px-3 py-2 pr-10 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)]"
                placeholder="sk-..."
              />
              <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        {form.provider === 'openai' && (
          <>
            <div>
              <label className="mb-1.5 block text-sm text-[var(--color-text-secondary)]">OpenAI API Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={form.openai_api_key}
                  onChange={e => setForm(f => ({ ...f, openai_api_key: e.target.value }))}
                  className="w-full rounded-lg border border-[#374151] bg-[#1e2d3d] px-3 py-2 pr-10 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)]"
                  placeholder="sk-..."
                />
                <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-[var(--color-text-secondary)]">模型</label>
              <select
                value={form.openai_model}
                onChange={e => setForm(f => ({ ...f, openai_model: e.target.value }))}
                className="w-full rounded-lg border border-[#374151] bg-[#1e2d3d] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)]"
              >
                <option value="gpt-4o-mini">gpt-4o-mini</option>
                <option value="gpt-4o">gpt-4o</option>
              </select>
            </div>
          </>
        )}

        {form.provider === 'ollama' && (
          <>
            <div>
              <label className="mb-1.5 block text-sm text-[var(--color-text-secondary)]">Base URL</label>
              <input
                value={form.ollama_base_url}
                onChange={e => setForm(f => ({ ...f, ollama_base_url: e.target.value }))}
                className="w-full rounded-lg border border-[#374151] bg-[#1e2d3d] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)]"
                placeholder="http://localhost:11434"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-[var(--color-text-secondary)]">模型名称</label>
              <input
                value={form.ollama_model}
                onChange={e => setForm(f => ({ ...f, ollama_model: e.target.value }))}
                className="w-full rounded-lg border border-[#374151] bg-[#1e2d3d] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)]"
                placeholder="qwen2.5:7b"
              />
            </div>
          </>
        )}

        {/* Test connection */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-2 rounded-lg bg-[var(--color-bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[#2a3f52] disabled:opacity-50"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
            测试连接
          </button>
          {testResult === 'success' && (
            <span className="flex items-center gap-1 text-sm text-[var(--color-success)]">
              <Wifi className="h-4 w-4" /> 连接成功
            </span>
          )}
          {testResult === 'error' && (
            <span className="flex items-center gap-1 text-sm text-[var(--color-danger)]">
              <WifiOff className="h-4 w-4" /> 连接失败
            </span>
          )}
        </div>
      </div>

      {/* Advanced settings */}
      <div className="rounded-xl border border-[#374151] bg-[var(--color-bg-surface)] p-5">
        <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm font-medium text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]">
          {showAdvanced ? '▾' : '▸'} 高级设置
        </button>
        {showAdvanced && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
                <span>Temperature</span>
                <span className="text-xs text-[var(--color-text-muted)]">{form.temperature}</span>
              </label>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={form.temperature}
                onChange={e => setForm(f => ({ ...f, temperature: Number(e.target.value) }))}
                className="w-full accent-[var(--color-accent)]"
              />
              <div className="flex justify-between text-[10px] text-[var(--color-text-muted)]">
                <span>精确</span><span>创意</span>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-[var(--color-text-secondary)]">Max Tokens</label>
              <input
                type="number"
                value={form.max_tokens}
                onChange={e => setForm(f => ({ ...f, max_tokens: Number(e.target.value) }))}
                className="w-full rounded-lg border border-[#374151] bg-[#1e2d3d] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)]"
                min={256}
                max={32000}
                step={256}
              />
            </div>
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex justify-end gap-2">
        <button className="rounded-lg border border-[#374151] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-elevated)]">取消</button>
        <button className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-light)]">保存配置</button>
      </div>
    </div>
  );
}
