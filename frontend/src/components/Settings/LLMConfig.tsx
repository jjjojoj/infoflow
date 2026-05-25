import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Loader2, Eye, EyeOff, Save } from 'lucide-react';
import { testLLMConnection, getSettings, updateSettings } from '../../services/api';

type LLMProvider = 'deepseek' | 'openai' | 'ollama' | 'dashscope';

interface LLMFormState {
  provider: LLMProvider;
  deepseek_api_key: string;
  openai_api_key: string;
  openai_model: string;
  dashscope_api_key: string;
  ollama_base_url: string;
  ollama_model: string;
  temperature: number;
  max_tokens: number;
}

export default function LLMConfig() {
  const [form, setForm] = useState<LLMFormState>({
    provider: 'dashscope',
    deepseek_api_key: '',
    openai_api_key: '',
    openai_model: 'gpt-4o-mini',
    dashscope_api_key: '',
    ollama_base_url: 'http://localhost:11434',
    ollama_model: 'qwen2.5:7b',
    temperature: 0.7,
    max_tokens: 4096,
  });
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Load current LLM settings from backend
  useEffect(() => {
    getSettings().then(res => {
      const s = res.data as Record<string, any>;
      if (s.llm_provider) setForm(f => ({ ...f, provider: s.llm_provider }));
      if (s.deepseek_api_key) setForm(f => ({ ...f, deepseek_api_key: s.deepseek_api_key }));
      if (s.openai_api_key) setForm(f => ({ ...f, openai_api_key: s.openai_api_key }));
      if (s.dashscope_api_key) setForm(f => ({ ...f, dashscope_api_key: s.dashscope_api_key }));
      if (s.temperature != null) setForm(f => ({ ...f, temperature: s.temperature }));
      if (s.max_tokens != null) setForm(f => ({ ...f, max_tokens: s.max_tokens }));
    }).catch(() => {});
  }, []);

  const handleTest = async () => {
    // First save the config, then test
    setTesting(true);
    setTestResult(null);
    try {
      await updateSettings({
        llm_provider: form.provider,
        deepseek_api_key: form.deepseek_api_key,
        openai_api_key: form.openai_api_key,
        dashscope_api_key: form.dashscope_api_key,
        ollama_base_url: form.ollama_base_url,
        ollama_model: form.ollama_model,
        temperature: form.temperature,
        max_tokens: form.max_tokens,
      });
      const res = await testLLMConnection();
      const data = res.data as any;
      if (data.success) {
        setTestResult({ ok: true, msg: `连接成功 (${data.model || ''})` });
      } else {
        setTestResult({ ok: false, msg: data.error || '连接失败' });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || '网络错误';
      setTestResult({ ok: false, msg });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await updateSettings({
        llm_provider: form.provider,
        deepseek_api_key: form.deepseek_api_key,
        openai_api_key: form.openai_api_key,
        dashscope_api_key: form.dashscope_api_key,
        ollama_base_url: form.ollama_base_url,
        ollama_model: form.ollama_model,
        temperature: form.temperature,
        max_tokens: form.max_tokens,
      });
      setSaveMsg('已保存');
    } catch (err) {
      setSaveMsg('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const providers: { key: LLMProvider; label: string; desc: string }[] = [
    { key: 'dashscope', label: '阿里百练(DashScope)', desc: '通义千问系列，高性价比' },
    { key: 'deepseek', label: 'DeepSeek', desc: '高性价比国产大模型' },
    { key: 'openai', label: 'OpenAI', desc: 'GPT-4o 系列' },
    { key: 'ollama', label: 'Ollama (本地)', desc: '本地部署，无需 API Key' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">LLM 模型配置</h2>

      {/* Provider selection */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
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
        {form.provider === 'dashscope' && (
          <div>
            <label className="mb-1.5 block text-sm text-[var(--color-text-secondary)]">DashScope API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={form.dashscope_api_key}
                onChange={e => setForm(f => ({ ...f, dashscope_api_key: e.target.value }))}
                className="w-full rounded-lg border border-[#374151] bg-[#1e2d3d] px-3 py-2 pr-10 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)]"
                placeholder="sk-..."
              />
              <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">默认使用 qwen-plus 模型，性价比最优</p>
          </div>
        )}

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
          {testResult && (
            <span className={`flex items-center gap-1 text-sm ${testResult.ok ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
              {testResult.ok ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              {testResult.msg}
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
      <div className="flex items-center justify-end gap-3">
        {saveMsg && <span className="text-sm text-[var(--color-text-muted)]">{saveMsg}</span>}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-light)] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          保存配置
        </button>
      </div>
    </div>
  );
}
